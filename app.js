// ---------- Utilità per formattare ore/minuti ----------
function toHM(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

function diffHM(min1, min2) {
  let diff = min1 - min2;
  let sign = diff >= 0 ? "+" : "-";
  diff = Math.abs(diff);
  return `${sign}${Math.floor(diff / 60)}h ${String(diff % 60).padStart(2, "0")}m`;
}

// ---------- Variabili ----------
const recordsBody = document.getElementById("records");
const toggleBtn = document.getElementById("toggleBtn");
const monthPicker = document.getElementById("monthPicker");
const summaryHours = document.getElementById("summaryHours");
const summaryFerie = document.getElementById("summaryFerie");
const summaryPermessi = document.getElementById("summaryPermessi");
const summary104 = document.getElementById("summary104");
const recupero = document.getElementById("recupero");

const absenceBtn = document.getElementById("absenceBtn");
const absenceModal = document.getElementById("absenceModal");
const absenceDate = document.getElementById("absenceDate");
const absenceType = document.getElementById("absenceType");
const absenceHours = document.getElementById("absenceHours");
const saveAbsence = document.getElementById("saveAbsence");
const closeAbsence = document.getElementById("closeAbsence");

let data = JSON.parse(localStorage.getItem("timetracker-data") || "{}");

// ---------- Funzioni ----------
function save() {
  localStorage.setItem("timetracker-data", JSON.stringify(data));
}

function render() {
  const ym = monthPicker.value;
  if (!ym) return;
  recordsBody.innerHTML = "";

  let totOre = 0;
  let giorniLavorati = 0;
  let ferie = 0, permessi = 0, ore104 = 0;

  (data[ym] || []).forEach((rec, idx) => {
    let tr = document.createElement("tr");
    let dIn = rec.in ? new Date(rec.in) : null;
    let dOut = rec.out ? new Date(rec.out) : null;

    let dur = "—";
    let deltaStr = "—";

    if (dOut && dIn) {
      let diffMinutes = Math.round((dOut - dIn) / 60000);
      if (diffMinutes >= 360) diffMinutes -= 60; // pausa pranzo
      dur = toHM(diffMinutes);
      totOre += diffMinutes;
      giorniLavorati++;
      deltaStr = diffHM(diffMinutes, 480);
    }

    // assenze
    if (rec.absence) {
      if (rec.absence.type === "ferie") ferie++;
      if (rec.absence.type === "permesso") permessi += rec.absence.hours || 0;
      if (rec.absence.type === "104") ore104 += rec.absence.hours || 0;
    }

    tr.innerHTML = `
      <td>${rec.date}</td>
      <td contenteditable="true" data-field="in">${dIn ? dIn.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}) : ""}</td>
      <td contenteditable="true" data-field="out">${dOut ? dOut.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}) : ""}</td>
      <td>${dur}</td>
      <td>${deltaStr}</td>
      <td>${rec.absence ? rec.absence.type : ""}</td>
      <td>
        <button class="delBtn" data-idx="${idx}">Cancella</button>
      </td>
    `;
    recordsBody.appendChild(tr);
  });

  summaryHours.textContent = toHM(totOre);
  summaryFerie.textContent = ferie;
  summaryPermessi.textContent = permessi;
  summary104.textContent = ore104;

  let standardMinutes = giorniLavorati * 480;
  recupero.textContent = `Δ mese: ${diffHM(totOre, standardMinutes)}`;
}

function addRecordInOut() {
  const ym = monthPicker.value;
  if (!ym) return alert("Seleziona un mese!");

  let today = new Date();
  let dateStr = today.toISOString().slice(0, 10);
  if (!data[ym]) data[ym] = [];

  let rec = data[ym].find(r => r.date === dateStr && !r.out && !r.absence);
  if (rec) {
    rec.out = today.toISOString();
    toggleBtn.textContent = "Tocca per Entrare";
  } else {
    data[ym].push({date: dateStr, in: today.toISOString()});
    toggleBtn.textContent = "Tocca per Uscire";
  }
  save();
  render();
}

function addAbsence() {
  const ym = monthPicker.value;
  if (!ym) return alert("Seleziona un mese!");

  let dateStr = absenceDate.value;
  if (!dateStr) return;

  if (!data[ym]) data[ym] = [];
  data[ym].push({
    date: dateStr,
    absence: {
      type: absenceType.value,
      hours: absenceType.value === "ferie" ? null : parseFloat(absenceHours.value) || 0
    }
  });

  save();
  render();
  absenceModal.style.display = "none";
}

function deleteRecord(idx) {
  const ym = monthPicker.value;
  if (!ym) return;
  if (confirm("Sei sicuro di voler cancellare questa riga?")) {
    data[ym].splice(idx, 1);
    save();
    render();
  }
}

function exportCSV() {
  const ym = monthPicker.value;
  if (!ym) return;
  let rows = [["Data","Entrata","Uscita","Durata","Delta","Tipo assenza"]];
  (data[ym] || []).forEach(rec => {
    let dIn = rec.in ? new Date(rec.in).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}) : "";
    let dOut = rec.out ? new Date(rec.out).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}) : "";
    let diffMinutes = (rec.in && rec.out) ? Math.round((new Date(rec.out)-new Date(rec.in))/60000) : "";
    if (diffMinutes >= 360) diffMinutes -= 60;
    let dur = diffMinutes ? toHM(diffMinutes) : "";
    let deltaStr = diffMinutes ? diffHM(diffMinutes,480) : "";
    rows.push([rec.date,dIn,dOut,dur,deltaStr,rec.absence?rec.absence.type:""]);
  });

  let csv = rows.map(r=>r.join(",")).join("\n");
  let blob = new Blob([csv], {type:"text/csv"});
  let url = URL.createObjectURL(blob);
  let a = document.createElement("a");
  a.href = url;
  a.download = `timetracker-${ym}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------- Eventi ----------
toggleBtn.addEventListener("click", addRecordInOut);
absenceBtn.addEventListener("click", () => absenceModal.style.display = "block");
closeAbsence.addEventListener("click", () => absenceModal.style.display = "none");
saveAbsence.addEventListener("click", addAbsence);
document.getElementById("export").addEventListener("click", exportCSV);
document.getElementById("clearMonth").addEventListener("click", () => {
  const ym = monthPicker.value;
  if (ym && confirm("Vuoi cancellare tutti i dati di questo mese?")) {
    data[ym] = [];
    save();
    render();
  }
});

// delega per cancellazione e modifica manuale
recordsBody.addEventListener("click", e => {
  if (e.target.classList.contains("delBtn")) {
    deleteRecord(e.target.dataset.idx);
  }
});

recordsBody.addEventListener("blur", e => {
  if (e.target.dataset.field) {
    const ym = monthPicker.value;
    const idx = [...recordsBody.children].indexOf(e.target.parentNode);
    let rec = data[ym][idx];
    let timeStr = e.target.textContent.trim();
    if (timeStr) {
      let [h,m] = timeStr.split(":");
      let dateObj = new Date(rec.date);
      dateObj.setHours(h, m);
      rec[e.target.dataset.field] = dateObj.toISOString();
    } else {
      rec[e.target.dataset.field] = null;
    }
    save();
    render();
  }
}, true);

// ---------- Init ----------
let now = new Date();
monthPicker.value = now.toISOString().slice(0,7);
render();
