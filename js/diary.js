/**
 * diary.js — Schermata diario dello studente
 *
 * Gestisce la lista voci, il form inserimento/modifica
 * e il modal di conferma eliminazione.
 */

// ─── Stato ───────────────────────────────────────────────────────────────
let entries     = [];   // voci del diario (array)
let editingId   = null; // id della voce in modifica, null se nuova
let deleteTarget = null; // id della voce da eliminare

// ─── Render principale ────────────────────────────────────────────────────
function renderDiary() {
  document.getElementById('diary-name').textContent =
    student.nome + ' ' + student.cognome;
  document.getElementById('diary-meta').textContent =
    'Classe ' + student.classe + ' · ' + student.azienda;
  document.getElementById('diary-tutor').textContent =
    '👤 Tutor: ' + (student.tutor || '—');

  renderEntries();
}

function renderEntries() {
  const totalOre = entries.reduce((sum, e) => sum + (parseFloat(e.ore) || 0), 0);
  document.getElementById('stat-days').textContent  = entries.length;
  document.getElementById('stat-hours').textContent = totalOre + 'h';

  const list = document.getElementById('entries-list');

  if (!entries.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📝</div>
        <p>Nessuna giornata registrata</p>
        <p>Aggiungi la prima registrazione con il bottone qui sopra</p>
      </div>`;
    return;
  }

  list.innerHTML = entries.map(e => buildEntryCard(e)).join('');
}

function buildEntryCard(e) {
  const valBadge = e.valutazione
    ? `<span class="badge badge-val" data-val="${esc(e.valutazione)}">${esc(valutazioneLabel(e.valutazione))}</span>`
    : '';

  const notePart = e.note
    ? `<p class="entry-note">📌 ${esc(e.note)}</p>`
    : '';

  return `
    <div class="entry-card">
      <div class="entry-header">
        <div class="entry-body">
          <div class="entry-badges">
            <span class="badge badge-green">📅 ${esc(fmtDate(e.data))}</span>
            <span class="badge badge-teal">🕐 ${esc(String(e.ore))}h</span>
            ${valBadge}
          </div>
          <p class="entry-text">${esc(e.attivita)}</p>
          ${notePart}
        </div>
        <div class="entry-actions">
          <button class="icon-btn" onclick="openEditForm('${esc(String(e.id))}')" title="Modifica">✏️</button>
          <button class="icon-btn" onclick="showDeleteModal('${esc(String(e.id))}')"  title="Elimina">🗑️</button>
        </div>
      </div>
    </div>`;
}

// ─── Form inserimento / modifica ──────────────────────────────────────────
function openAddForm() {
  editingId = null;
  document.getElementById('form-title').textContent      = 'Nuova registrazione';
  document.getElementById('form-submit-btn').textContent = 'Salva';
  document.getElementById('form-data').value             = todayISO();
  document.getElementById('form-attivita').value         = '';
  document.getElementById('form-ore').value              = '';
  document.getElementById('form-valutazione').value      = '';
  document.getElementById('form-note').value             = '';
  setErr('form-error', '');

  document.getElementById('entry-form').hidden = false;
  document.getElementById('add-btn').hidden    = true;
  document.getElementById('form-attivita').focus();
}

function openEditForm(entryId) {
  const entry = entries.find(e => String(e.id) === String(entryId));
  if (!entry) return;

  editingId = entryId;
  document.getElementById('form-title').textContent      = 'Modifica registrazione';
  document.getElementById('form-submit-btn').textContent = 'Salva modifiche';
  document.getElementById('form-data').value             = entry.data;
  document.getElementById('form-attivita').value         = entry.attivita;
  document.getElementById('form-ore').value              = entry.ore;
  document.getElementById('form-valutazione').value      = entry.valutazione || '';
  document.getElementById('form-note').value             = entry.note || '';
  setErr('form-error', '');

  document.getElementById('entry-form').hidden = false;
  document.getElementById('add-btn').hidden    = true;
  document.getElementById('form-attivita').focus();
}

function closeForm() {
  document.getElementById('entry-form').hidden = true;
  document.getElementById('add-btn').hidden    = false;
  editingId = null;
}

async function submitForm() {
  const data        = document.getElementById('form-data').value;
  const attivita    = document.getElementById('form-attivita').value.trim();
  const ore         = parseFloat(document.getElementById('form-ore').value);
  const valutazione = document.getElementById('form-valutazione').value;
  const note        = document.getElementById('form-note').value.trim();

  // Validazione
  if (!data)     { setErr('form-error', 'Inserisci la data.');              return; }
  if (!attivita) { setErr('form-error', 'Descrivi le attività svolte.');    return; }
  if (isNaN(ore) || ore <= 0 || ore > 24) {
    setErr('form-error', 'Le ore devono essere un valore tra 0.5 e 24.');   return;
  }

  setErr('form-error', '');
  const label = editingId ? 'Salva modifiche' : 'Salva';
  setBtnLoading('form-submit-btn', true, label);

  try {
    if (editingId) {
      // Aggiorna voce esistente
      await api('updateEntry', {
        studentId: student.id,
        entryId:   editingId,
        data, attivita, ore, valutazione, note,
      });
      const idx = entries.findIndex(e => String(e.id) === String(editingId));
      if (idx !== -1) {
        entries[idx] = { ...entries[idx], data, attivita, ore, valutazione, note };
      }
    } else {
      // Nuova voce
      const res = await api('addEntry', {
        studentId: student.id,
        data, attivita, ore, valutazione, note,
      });
      entries.unshift({
        id: res.entryId, studentId: student.id,
        data, attivita, ore, valutazione, note,
      });
    }

    // Ordina per data decrescente
    entries.sort((a, b) => String(b.data).localeCompare(String(a.data)));
    renderEntries();
    closeForm();

  } catch (err) {
    setErr('form-error', 'Errore: ' + err.message);
  }

  setBtnLoading('form-submit-btn', false, label);
}

// ─── Modal eliminazione voce ──────────────────────────────────────────────
function showDeleteModal(entryId) {
  deleteTarget = entryId;
  const modal  = document.getElementById('delete-modal');
  modal.hidden = false;
  modal.classList.add('open');
}

function closeDeleteModal() {
  const modal  = document.getElementById('delete-modal');
  modal.classList.remove('open');
  modal.hidden = true;
  deleteTarget = null;
}

async function confirmDeleteEntry() {
  if (!deleteTarget) return;
  const targetId = deleteTarget;
  closeDeleteModal();

  try {
    await api('deleteEntry', { studentId: student.id, entryId: targetId });
    entries = entries.filter(e => String(e.id) !== String(targetId));
    renderEntries();
  } catch (err) {
    alert('Errore durante l\'eliminazione: ' + err.message);
  }
}
