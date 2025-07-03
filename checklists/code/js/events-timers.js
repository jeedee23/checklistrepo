// ─── events-timers.js ─────────────────────────────────────────────

import { sharedState } from './constants.js';

export function setupInactivityMonitor() {
  ['mousemove', 'keydown', 'click', 'scroll'].forEach(evt =>
    document.addEventListener(evt, resetInactivityTimer)
  );
  resetInactivityTimer();
}

function resetInactivityTimer() {
  if (sharedState.inactivityTimer) clearTimeout(sharedState.inactivityTimer);
  sharedState.inactivityTimer = setTimeout(showInactivityPopup, 15 * 60 * 1000);
}

function showInactivityPopup() {
  let overlay = document.getElementById('inactivityOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'inactivityOverlay';
    Object.assign(overlay.style, {
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 9999
    });
    overlay.innerHTML = `
      <div style="background:#fff;padding:2em;border-radius:8px;text-align:center;">
        <p>You have been inactive for over 15 minutes.</p>
        <button id="inactReload">Reload</button>
        <button id="inactLogout">Logout</button>
      </div>`;
    document.body.appendChild(overlay);

    document.getElementById('inactReload').addEventListener('click', () => location.reload());
    document.getElementById('inactLogout').addEventListener('click', () => {
      sharedState.currentUser = null;
      sharedState.readyForEdits = false;
      sharedState.isDirty = false;
      document.getElementById('identityOverlay').style.display = 'flex';
      overlay.remove();
    });
  }
}
