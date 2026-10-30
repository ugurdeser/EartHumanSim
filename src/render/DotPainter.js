/** Tüm nesneler nokta olarak çizilir; bu yardımcı tek noktadan çizimi sağlar. */
export class DotPainter {
  static dot(ctx, x, y, radius, fill) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  static ring(ctx, x, y, radius, stroke, lineWidth) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  /** Aynı renkteki çok sayıda noktayı tek path'te çizer (performans). */
  static batch(ctx, items, fill, radiusOf) {
    if (items.length === 0) return;
    ctx.fillStyle = fill;
    ctx.beginPath();
    for (const item of items) {
      const r = radiusOf(item);
      ctx.moveTo(item.position.x + r, item.position.y);
      ctx.arc(item.position.x, item.position.y, r, 0, Math.PI * 2);
    }
    ctx.fill();
  }
}
