/**
 * api.js — Comunicazione con il backend Google Apps Script
 *
 * Tutte le chiamate passano per questa funzione.
 * Apps Script non supporta preflight CORS, quindi NON si imposta
 * il Content-Type: la fetch usa text/plain di default e funziona.
 */
async function api(action, data = {}) {
  if (!API_URL || API_URL.startsWith('INSERISCI')) {
    throw new Error(
      'URL API non configurato.\n' +
      'Apri js/config.js e inserisci l\'URL del tuo Apps Script.'
    );
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    body:   JSON.stringify({ action, ...data }),
    // NB: nessun Content-Type header → evita il preflight CORS con Apps Script
  });

  if (!response.ok) {
    throw new Error(`Errore HTTP ${response.status}: ${response.statusText}`);
  }

  const result = await response.json();

  if (result.error) {
    throw new Error(result.error);
  }

  return result;
}
