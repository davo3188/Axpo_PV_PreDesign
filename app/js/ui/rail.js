// Left rail: the workflow steps (0 Terrain … 4b 3D, Electrical kept open). Clicking the active step again folds
// the side panel away to give the map more room.
const KEY = 'pvp.step';
let current = null;

export function initRail() {
  const rail = document.getElementById('rail');
  rail.addEventListener('click', e => {
    const b = e.target.closest('button[data-step]');
    if (!b) return;
    if (b.dataset.step === current && !document.body.classList.contains('side-off')) {
      document.body.classList.add('side-off');
      return;
    }
    showStep(b.dataset.step);
  });
  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch {}
  showStep(saved && document.querySelector(`#side .step[data-step="${saved}"]`) ? saved : 'areas');
}

export function showStep(step) {
  current = step;
  document.body.classList.remove('side-off');
  document.querySelectorAll('#rail button[data-step]').forEach(b => {
    const on = b.dataset.step === step;
    b.classList.toggle('on', on);
    if (on) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
  });
  document.querySelectorAll('#side .step').forEach(s => { s.hidden = s.dataset.step !== step; });
  const side = document.getElementById('side');
  if (side) side.scrollTop = 0;
  try { localStorage.setItem(KEY, step); } catch {}
}
