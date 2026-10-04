export function pathFromPoints(points: { x: number; y: number }[], close = true): string {
  const first = points[0];
  if (!first) return '';
  let d = `M ${first.x.toFixed(2)} ${first.y.toFixed(2)}`;
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    if (p) d += ` L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
  }
  if (close) d += ' Z';
  return d;
}
