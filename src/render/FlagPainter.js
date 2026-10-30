/** Bayrağı noktalar halinde çizer: topluluk kartı ve penceresi aynı çizimi kullanır. */
export class FlagPainter {
  /** (x, y) sol üst köşe, `dot` noktalar arası uzaklık (bağlamın biriminde). */
  static draw(ctx, flag, x, y, dot) {
    const radius = dot * 0.55;
    for (const cell of flag.cells) {
      ctx.fillStyle = cell.color;
      ctx.beginPath();
      ctx.arc(x + (cell.x + 0.5) * dot, y + (cell.y + 0.5) * dot, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
