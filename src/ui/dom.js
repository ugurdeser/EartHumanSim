/** Küçük DOM yardımcısı: el('div', { class: 'x', text: 'y' }, ...children) */
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'style') Object.assign(node.style, value);
    else if (key.startsWith('on')) node.addEventListener(key.slice(2).toLowerCase(), value);
    else node.setAttribute(key, value);
  }
  for (const child of children.flat()) {
    if (child != null) node.append(child);
  }
  return node;
}

/** Yüzen pencereyi başlığından sürükler (başlıktaki butonlar hariç). */
export function startWindowDrag(e, root) {
  if (e.target.closest('button')) return;
  e.preventDefault();
  const startX = e.clientX - root.offsetLeft;
  const startY = e.clientY - root.offsetTop;
  const parent = root.parentElement;
  const onMove = (ev) => {
    const maxX = parent.clientWidth - root.offsetWidth;
    const maxY = parent.clientHeight - 40;
    root.style.left = `${Math.min(maxX, Math.max(0, ev.clientX - startX))}px`;
    root.style.top = `${Math.min(maxY, Math.max(0, ev.clientY - startY))}px`;
    root.style.right = 'auto';
  };
  const onUp = () => {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
  };
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
}

export const percent = (value) => `${Math.round(value * 100)}%`;

/** Yılı okunur yazar: "8 ay" / "12 yıl". */
export const formatAge = (years) => (years < 1 ? `${Math.round(years * 12)} ay` : `${Math.floor(years)} yıl`);
