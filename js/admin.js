/**
 * admin.js — Pannello docente: visualizzazione classi, studenti, export Excel
 */

// ─── Stato ───────────────────────────────────────────────────────────────
let adminStudents = [];   // tutti gli studenti
let adminDiaries  = [];   // tutte le voci (tutti gli studenti)
let adminStageDates = []; // date stage per classe dal foglio "Date Stage"
let selectedClass = null; // classe correntemente visualizzata nel dettaglio
let adminPassword = '';   // password admin (necessaria per deleteStudent)

// ─── Render pannello admin ────────────────────────────────────────────────
function renderAdmin() {
  const nStudents = adminStudents.length;
  const nClasses  = new Set(adminStudents.map(s => s.classe)).size;

  document.getElementById('admin-summary').textContent =
    `${nStudents} studenti · ${nClasses} ${nClasses === 1 ? 'classe' : 'classi'}`;

  const classi = groupByClass();
  const keys   = Object.keys(classi).sort();
  const list   = document.getElementById('admin-classes-list');

  if (!keys.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🏫</div>
        <p>Nessuno studente registrato</p>
      </div>`;
    return;
  }

  list.innerHTML = keys.map(classe => {
    const dates   = getStageDatesForClass(classe);
    const periodo = dates
      ? `📅 ${fmtDateIT(dates.dataInizio)} → ${fmtDateIT(dates.dataFine)}`
      : '📅 Periodo non configurato nel foglio "Date Stage"';
    const isNow   = dates ? isActiveToday(dates) : false;
    const pill    = isNow
      ? `<span class="stage-pill stage-pill--active">In corso</span>`
      : (dates ? `<span class="stage-pill">Programmato</span>` : '');

    return `
      <div class="class-card">
        <div>
          <h3>Classe ${esc(classe)} ${pill}</h3>
          <p>${classi[classe].length} ${classi[classe].length === 1 ? 'studente' : 'studenti'}</p>
          <p class="stage-period">${esc(periodo)}</p>
        </div>
        <div class="class-actions">
          <button class="btn btn-secondary btn-sm"
                  onclick="openClassDetail('${esc(classe)}')">Dettagli</button>
          <button class="btn btn-primary btn-sm"
                  onclick="exportClass('${esc(classe)}')">📥 Excel</button>
        </div>
      </div>`;
  }).join('');
}

// ─── Utilità dati ─────────────────────────────────────────────────────────
function groupByClass() {
  return adminStudents.reduce((acc, s) => {
    if (!acc[s.classe]) acc[s.classe] = [];
    acc[s.classe].push(s);
    return acc;
  }, {});
}

function diaryByStudent() {
  return adminDiaries.reduce((acc, d) => {
    if (!acc[d.studentId]) acc[d.studentId] = [];
    acc[d.studentId].push(d);
    return acc;
  }, {});
}

/** Cerca le date di stage per una classe (case-insensitive) */
function getStageDatesForClass(classe) {
  if (!adminStageDates) return null;
  const norm = classe.trim().toLowerCase();
  return adminStageDates.find(d => d.classe.toLowerCase() === norm) || null;
}

/** Formatta YYYY-MM-DD → gg/mm/aaaa */
function fmtDateIT(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/** Restituisce true se oggi è dentro il periodo di stage */
function isActiveToday(dates) {
  if (!dates || !dates.dataInizio || !dates.dataFine) return false;
  const today = new Date().toISOString().slice(0, 10);
  return today >= dates.dataInizio && today <= dates.dataFine;
}

// ─── Dettaglio classe ─────────────────────────────────────────────────────
function openClassDetail(classe) {
  selectedClass = classe;
  document.getElementById('detail-title').textContent = 'Classe ' + classe;

  document.getElementById('admin-classes-view').style.display = 'none';
  document.getElementById('admin-class-detail').hidden        = false;

  renderClassDetail(classe);
}

function renderClassDetail(classe) {
  const classi    = groupByClass();
  const byStudent = diaryByStudent();
  const students  = (classi[classe] || [])
    .sort((a, b) => a.cognome.localeCompare(b.cognome));

  document.getElementById('admin-students-list').innerHTML = students.map(s => {
    const diary   = byStudent[s.id] || [];
    const totOre  = diary.reduce((sum, d) => sum + (parseFloat(d.ore) || 0), 0);

    return `
      <div class="student-row">
        <div class="student-row-info">
          <h4>${esc(s.cognome)} ${esc(s.nome)}</h4>
          <p>${esc(s.azienda)} · Tutor: ${esc(s.tutor || '—')}</p>
        </div>
        <div class="student-row-stats">
          <div class="hours">${totOre}h</div>
          <div class="days">${diary.length} giorni</div>
        </div>
        <button class="icon-btn"
                onclick="deleteStudentConfirm('${esc(String(s.id))}', '${esc(s.nome + ' ' + s.cognome)}')"
                title="Elimina studente">🗑️</button>
      </div>`;
  }).join('');
}

function backToClasses() {
  selectedClass = null;
  document.getElementById('admin-class-detail').hidden        = true;
  document.getElementById('admin-classes-view').style.display = '';
}

// ─── Elimina studente ─────────────────────────────────────────────────────
async function deleteStudentConfirm(studentId, name) {
  if (!confirm(`Eliminare ${name} e tutti i suoi dati del diario? L'operazione non è reversibile.`)) return;

  try {
    await api('deleteStudent', { password: adminPassword, studentId });
    adminStudents = adminStudents.filter(s => String(s.id) !== String(studentId));
    adminDiaries  = adminDiaries.filter(d => String(d.studentId) !== String(studentId));
    renderAdmin();
    if (selectedClass) renderClassDetail(selectedClass);
  } catch (err) {
    alert('Errore: ' + err.message);
  }
}

// ─── Export Excel ──────────────────────────────────────────────────────────
function exportCurrentClass() {
  if (selectedClass) exportClass(selectedClass);
}

function exportClass(classe) {
  const classi    = groupByClass();
  const byStudent = diaryByStudent();
  const students  = (classi[classe] || [])
    .sort((a, b) => a.cognome.localeCompare(b.cognome));

  if (!students.length) {
    alert('Nessuno studente trovato per la classe ' + classe + '.');
    return;
  }

  const wb = XLSX.utils.book_new();

  for (const s of students) {
    const diary   = (byStudent[s.id] || [])
      .sort((a, b) => String(a.data).localeCompare(String(b.data)));
    const totalOre = diary.reduce((sum, d) => sum + (parseFloat(d.ore) || 0), 0);

    const rows = [
      ['DIARIO DI BORDO — STAGE AZIENDALE'],
      [],
      ['Nome:',          s.nome,    '',  'Cognome:',          s.cognome],
      ['Classe:',        s.classe,  '',  'Azienda:',          s.azienda],
      ['Tutor aziendale:', s.tutor || '—', '', 'Totale ore:', totalOre],
      [],
      ['Data', 'Attività svolte', 'Ore', 'Valutazione', 'Note'],
      ...diary.map(d => [
        d.data,
        d.attivita,
        parseFloat(d.ore) || 0,
        valutazioneLabel(d.valutazione) || '—',
        d.note || '',
      ])
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
      { wch: 14 },  // Data
      { wch: 55 },  // Attività
      { wch: 6  },  // Ore
      { wch: 18 },  // Valutazione
      { wch: 30 },  // Note
    ];

    // Nome foglio: max 31 caratteri (limite Excel)
    const sheetName = `${s.cognome} ${s.nome}`.slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  XLSX.writeFile(wb, `Diari_Stage_Classe${classe}.xlsx`);
}
