/**
 * auth.js — Login studente, registrazione e login docente
 *
 * Stato condiviso con diary.js e admin.js tramite variabili globali.
 */

// ─── Stato globale ────────────────────────────────────────────────────────
let student   = null;   // profilo studente loggato (usato anche in diary.js)
let loginData = {};     // dati parziali dello step 1 (classe, nome, cognome, stageCode)

// ─── Tab switcher ─────────────────────────────────────────────────────────
function switchTab(tab) {
  // Aggiorna i bottoni tab
  document.querySelectorAll('.tab-btn').forEach((btn, i) => {
    btn.classList.toggle('active', ['student', 'admin'][i] === tab);
  });

  // Mostra/nascondi i pannelli
  document.getElementById('tab-s1').hidden    = (tab !== 'student');
  document.getElementById('tab-s2').hidden    = true;
  document.getElementById('tab-admin').hidden = (tab !== 'admin');

  // Pulisci errori
  setErr('s1-error', '');
  setErr('admin-error', '');
}

// ─── Login studente – Step 1: cerca studente esistente ────────────────────
async function loginStep1() {
  const stageCode = v('s1-code');
  const classe    = v('s1-classe');
  const nome      = v('s1-nome');
  const cognome   = v('s1-cognome');

  if (!stageCode || !classe || !nome || !cognome) {
    setErr('s1-error', 'Compila tutti i campi.');
    return;
  }

  setErr('s1-error', '');
  setBtnLoading('s1-btn', true, 'Accedi →');

  try {
    const res = await api('findStudent', { stageCode, classe, nome, cognome });

    if (res.found) {
      // Studente già registrato: carica il diario e vai alla schermata
      student = res.student;
      const diary = await api('getEntries', { studentId: student.id });
      entries = diary.entries || [];
      renderDiary();
      showScreen('diary');
    } else {
      // Nuovo studente: passa allo step 2
      loginData = { stageCode, classe, nome, cognome };
      document.getElementById('s2-recap').innerHTML =
        `<span>Classe: <strong>${esc(classe)}</strong></span>` +
        `<span>Nome: <strong>${esc(nome)} ${esc(cognome)}</strong></span>`;
      document.getElementById('tab-s1').hidden = true;
      document.getElementById('tab-s2').hidden = false;
      document.getElementById('s2-azienda').focus();
    }

  } catch (err) {
    setErr('s1-error', err.message);
  }

  setBtnLoading('s1-btn', false, 'Accedi →');
}

function backToStep1() {
  document.getElementById('tab-s2').hidden = true;
  document.getElementById('tab-s1').hidden = false;
  setErr('s2-error', '');
}

// ─── Login studente – Step 2: prima registrazione ─────────────────────────
async function loginStep2() {
  const azienda = v('s2-azienda');
  const tutor   = v('s2-tutor');

  if (!azienda) { setErr('s2-error', 'Inserisci il nome dell\'azienda.'); return; }
  if (!tutor)   { setErr('s2-error', 'Inserisci il nome del tutor aziendale.'); return; }

  setErr('s2-error', '');
  setBtnLoading('s2-btn', true, 'Registrati ✓');

  try {
    const res = await api('registerStudent', { ...loginData, azienda, tutor });
    student = res.student;
    entries = [];
    renderDiary();
    showScreen('diary');
  } catch (err) {
    setErr('s2-error', err.message);
  }

  setBtnLoading('s2-btn', false, 'Registrati ✓');
}

// ─── Login docente ─────────────────────────────────────────────────────────
async function adminLogin() {
  const pwd = document.getElementById('admin-pwd').value;
  if (!pwd) { setErr('admin-error', 'Inserisci la password.'); return; }

  setErr('admin-error', '');
  setBtnLoading('admin-btn', true, 'Accedi come docente →');

  try {
    const res = await api('adminLogin', { password: pwd });
    adminStudents = res.students  || [];
    adminDiaries  = res.diaries   || [];
    adminPassword = pwd;
    renderAdmin();
    showScreen('admin');
  } catch (err) {
    setErr('admin-error', err.message);
  }

  setBtnLoading('admin-btn', false, 'Accedi come docente →');
}

// ─── Logout (condiviso) ───────────────────────────────────────────────────
function logout() {
  student       = null;
  entries       = [];
  adminStudents = [];
  adminDiaries  = [];
  selectedClass = null;
  adminPassword = '';
  loginData     = {};

  // Reset form login
  document.getElementById('admin-pwd').value = '';

  showScreen('login');
}
