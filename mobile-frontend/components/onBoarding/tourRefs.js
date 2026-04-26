// components/tourRefs.js
const _refs = {};

export function registerTourRef(key, ref) {
  if (ref) _refs[key] = ref;
}

export function measureTourRef(key) {
  return new Promise((resolve) => {
    const ref = _refs[key];
    if (!ref) return resolve(null);
    setTimeout(() => {
      ref.measureInWindow?.((x, y, width, height) => {
        resolve(width > 0 && height > 0 ? { x, y, width, height } : null);
      });
    }, 150);
  });
}
