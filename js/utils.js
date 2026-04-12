/**
 * utils.js — Funzioni di utilità condivise tra tutti i moduli
 */

/** Legge e trimma il valore di un campo input per id */
function v(id) {
  return document.getElementById(id).value.trim();
}

/** Escape HTML per prevenire XSS quando si inserisce testo nell'innerHTML */
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Restituisce la data di oggi in formato YYYY-MM-DD */
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Formatta una data ISO (YYYY-MM-DD) in formato leggibile italiano.
 * Usa T12:00:00 per evitare problemi di timezone.
 */
function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso + 'T12:00:00').toLocaleDateString('it-IT', {
    weekday: 'short', day: 'numeric', month: 'long'
  });
}

/** Mappa valore valutazione → etichetta leggibile con stelle */
const VALUTAZIONE_LABELS = {
  eccellente:    '⭐⭐⭐⭐⭐ Eccellente',
  molto_buono:   '⭐⭐⭐⭐ Molto buono',
  buono:         '⭐⭐⭐ Buono',
  sufficiente:   '⭐⭐ Sufficiente',
  da_migliorare: '⭐ Da migliorare',
};

function valutazioneLabel(val) {
  return VALUTAZIONE_LABELS[val] || '';
}

/** Mostra / nasconde un messaggio di errore */
function setErr(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg || '';
  el.hidden = !msg;
}

/** Mette un bottone in stato di caricamento e lo ripristina */
function setBtnLoading(id, isLoading, originalLabel) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.disabled  = isLoading;
  btn.textContent = isLoading ? '...' : originalLabel;
}

/**
 * Mostra la schermata con l'id indicato, nasconde tutte le altre.
 * Usa la classe CSS .active e l'attributo hidden.
 */
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(el => {
    el.classList.remove('active');
    el.hidden = true;
  });
  const target = document.getElementById(name + '-screen');
  if (target) {
    target.hidden = false;
    target.classList.add('active');
  }
  window.scrollTo(0, 0);
}
