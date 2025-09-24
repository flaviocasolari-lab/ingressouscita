// Riferimenti agli elementi della UI
const btn = document.getElementById("toggleBtn");
const tbody = document.getElementById("records");
const exportBtn = document.getElementById("export");
const monthPicker = document.getElementById("monthPicker");
const clearMonthBtn = document.getElementById("clearMonth");
const summaryHours = document.getElementById("summaryHours");
const summaryFerie = document.getElementById("summaryFerie");
const summaryPermessi = document.getElementById("summaryPermessi");
const summary104 = document.getElementById("summary104");

// Modal assenze
const absenceBtn = document.getElementById("absenceBtn");
const absenceModal = document.getElementById("absenceModal");
const saveAbsence = document.getElementById("saveAbsence");
const closeAbsence = document.getElementById("closeAbsence");
const absenceDate = document.getElementById("absenceDate");
const absenceType = document.getElementById("absenceType");
const absenceHours = document.getElementById("absenceHours");

// Dati salvati: { "YYYY-MM": [ {type, dateIn, dateOut, date, hours} ] }
let data = JSON.parse(localStorage.getItem("timeData") || "{}");
let currentMonth = new Date().toISOString().slice(0, 7);
monthPicker.value = currentMonth;

function saveData() {
  localStorage.setItem("timeData", JSON.stringify(data));
}

function backupMonth(month) {
  const key = "timeData_backup_" + month;
  if (!localStorage.getItem(key)) {
    localStorage.setItem(key, JSON.stringify(data[month] || []));
  }
}

// Disegna tabella e riepilogo
function render() {
  tbody.innerHTML = "";
  let entries = data[currentMonth] || [];
  let totOre = 0, ferie = 0, permessi = 0, legge104 = 0;

  entries.forEach((e, idx) => {
    const tr = document.createElement("tr");
    if (e.type === "work") {
      const dIn = new Date(e.dateIn);
      const dOut = e.dateOut ? new Date(e.dateOut) : null;
      const dur = dOut ? ((dOut - dIn) / 3600000).toFixed(2) : "";
      if (dur) totOre += parseFloat(dur);
      tr.innerHTML = `
        <td>${dIn.toLocaleDateString()}</td>
        <td>${dIn.toLocaleTimeString()}</td>
        <td>${dOut ? dOut.toLocaleTimeString() : "—"}</td>
        <td>${dur}</td>
        <td>Lavoro</td>
        <td><button class="delBtn" onclick="deleteEntry(${idx})">❌</button></td>
      `;
    } else if (e.type === "ferie") {
      ferie++;
      tr.innerHTML = `
        <td>${e.date}</td><td>—</td><td>—</td><td>—</td>
        <td>Ferie</td><td><button class="delBtn" onclick="deleteEntry(${idx})">❌</button></td>`;
    } else if (e.type === "permesso") {
      permessi += e.hours;
      tr.innerHTML = `
        <td>${e.date}</td><td>—</td><td>—</td><td>${e.hours}</td>
        <td>Permesso</td><td><button class="delBtn" onclick="deleteEntry(${idx})">❌</button></td>`;
    } else if (e.type === "104") {
      legge104 += e.hours;
      tr.innerHTML = `
        <td>${e.date}</td><td>—</td><td>—</td><td>${e.hours}</td>
        <td>104</td><td><button class="delBtn" onclick="deleteEntry(${idx})">❌</button></td>`;
    }
    tbody.appendChild(tr);
  });

  summaryHours.textContent = totOre.toFixed(2);
  summaryFerie.textContent = ferie;
  summaryPermessi.textContent = permessi;
  summary104.textContent = legge104;

  if (entries.length &&
      entries[entries.length - 1].type === "work" &&
      !entries[entries.length - 1].dateOut) {
    const lastIn = new Date(entries[entries.length - 1].dateIn);
    btn.textContent = "Tocca per Uscire (Entrata: " + lastIn.toLocaleTimeString() + ")";
  } else {
    btn.textContent = "Tocca per Entrare";
  }
}

// Cancella riga
window.deleteEntry = function(index) {
  if (!confirm("Sei sicuro di voler cancellare questa voce?")) return;
  backupMonth(currentMonth);
  let entries = data[currentMonth] || [];
  if (index >= 0 && index < entries.length) {
    entries.splice(index, 1);
    data[currentMonth] = entries;
    saveData();
    render();
  }
};

// Ingresso/Uscita
btn.addEventListener("click", () => {
  let entries = data[currentMonth] || [];
  const now = new Date();
  if (entries.length && entries[entries.length - 1].type === "work" &&
      !entries[entries.length - 1].dateOut) {
    entries[entries.length - 1].dateOut = now;
  } else {
    entries.push({ type: "work", dateIn: now });
  }
  data[currentMonth] = entries;
  saveData();
  render();
});

// Cambio mese
monthPicker.addEventListener("change", () => {
  currentMonth = monthPicker.value;
  render();
});

// Esporta CSV
exportBtn.addEventListener("click", () => {
  let entries = data[currentMonth] || [];
  let csv = "Data,Entrata,Uscita,Durata,Tipo\n";
  entries.forEach(e => {
    if (e.type === "work") {
      const dIn = new Date(e.dateIn);
      const dOut = e.dateOut ? new Date(e.dateOut) : null;
      const dur = dOut ? ((dOut - dIn) / 3600000).toFixed(2) : "";
      csv += `${dIn.toLocaleDateString()},${dIn.toLocaleTimeString()},${dOut ? dOut.toLocaleTimeString() : ""},${dur},Lavoro\n`;
    } else if (e.type === "ferie") {
      csv += `${e.date},,,,Ferie\n`;
    } else if (e.type === "permesso") {
      csv += `${e.date},,,,Permesso (${e.hours}h)\n`;
    } else if (e.type === "104") {
      csv += `${e.date},,,,104 (${e.hours}h)\n`;
    }
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `timetracker_${currentMonth}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

// Cancella mese
clearMonthBtn.addEventListener("click", () => {
  if (!confirm("Vuoi cancellare tutti i dati di questo mese? Verrà creato un backup.")) return;
  backupMonth(currentMonth);
  data[currentMonth] = [];
  saveData();
  render();
});

// Modal assenze
absenceBtn.addEventListener("click", () => { absenceModal.style.display = "block"; });
closeAbsence.addEventListener("click", () => { absenceModal.style.display = "none"; });

saveAbsence.addEventListener("click", () => {
  const date = absenceDate.value;
  const type = absenceType.value;
  const hours = parseFloat(absenceHours.value) || 0;
  if (!date) { alert("Seleziona una data"); return; }

  let entry = { type, date };
  if (type === "permesso" || type === "104") entry.hours = hours;

  data[currentMonth] = data[currentMonth] || [];
  data[currentMonth].push(entry);
  saveData();
  absenceModal.style.display = "none";
  render();
});

// Avvio
render();
