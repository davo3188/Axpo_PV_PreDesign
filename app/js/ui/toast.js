// Non-blocking messages, bottom right.
let box = null;
export function toast(text, kind = '', ms = 6000) {
  box = box || document.getElementById('toast');
  if (!box) return;
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.textContent = text;
  box.appendChild(el);
  while (box.children.length > 4) box.firstChild.remove();
  setTimeout(() => el.remove(), ms);
}
