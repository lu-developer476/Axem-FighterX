/** @typedef {{ x: number, y: number, w: number, h: number }} Rect */

/** @param {Rect} a @param {Rect} b */
export const rectsOverlap = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/** Centro del área en común entre dos rectángulos que se superponen. */
export const overlapCenter = (a, b) => {
  const left = Math.max(a.x, b.x);
  const right = Math.min(a.x + a.w, b.x + b.w);
  const top = Math.max(a.y, b.y);
  const bottom = Math.min(a.y + a.h, b.y + b.h);
  return { x: (left + right) / 2, y: (top + bottom) / 2 };
};
