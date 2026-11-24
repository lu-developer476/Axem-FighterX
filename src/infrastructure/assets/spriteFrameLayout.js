/**
 * Lays out precomputed sprite crops in uniform cells, aligned by feet or center.
 */
export function layoutSequence(frames, { anchor = 'feet' } = {}) {
  const baseline = Math.max(...frames.map((frame) => frame.y + frame.h));
  const pivotOf = (frame) => (anchor === 'feet' ? frame.pivotX ?? Math.round(frame.w / 2) : Math.round(frame.w / 2));
  const anchorX = Math.max(...frames.map(pivotOf));
  const reach = Math.max(...frames.map((frame) => frame.w - pivotOf(frame)));
  const dropOf = (frame) => (anchor === 'feet' ? baseline - (frame.y + frame.h) : 0);
  const cellHeight = Math.max(...frames.map((frame) => frame.h + dropOf(frame)));

  return {
    cellWidth: anchorX + reach,
    cellHeight,
    placements: frames.map((frame) => ({
      x: anchorX - pivotOf(frame),
      y: anchor === 'feet'
        ? cellHeight - frame.h - dropOf(frame)
        : Math.round((cellHeight - frame.h) / 2),
    })),
  };
}
