/** Tuvali istenen piksel boyuna getirir (boyut aynıysa dokunmaz: içeriği silinmez). */
export const fitCanvas = (canvas, width, height) => {
  if (canvas.width === width && canvas.height === height) return canvas;
  canvas.width = width;
  canvas.height = height;
  return canvas;
};
