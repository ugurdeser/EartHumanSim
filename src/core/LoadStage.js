/**
 * Gezegeni kurmanın aşamaları, sırasıyla; `share`: yükleme çubuğundaki payı (toplam 1).
 * Dünya kurulumu (WorldBuilder) ilk üçünü, ekranın hazırlığı (Game) son üçünü bildirir.
 */
export const LoadStage = Object.freeze({
  TERRAIN: Object.freeze({ id: 'terrain', label: 'Arazi ve denizler oluşuyor', share: 0.1 }),
  ATMOSPHERE: Object.freeze({ id: 'atmosphere', label: 'Atmosfer ısınıyor: bir yıllık iklim', share: 0.45 }),
  FEATURES: Object.freeze({ id: 'features', label: 'Göller, madenler ve canlılar yerleşiyor', share: 0.07 }),
  OVERVIEW: Object.freeze({ id: 'overview', label: 'Bitki örtüsü boyanıyor', share: 0.22 }),
  CLOUDS: Object.freeze({ id: 'clouds', label: 'Bulutlar dokunuyor', share: 0.1 }),
  SCREEN: Object.freeze({ id: 'screen', label: 'Ekran kartı hazırlanıyor', share: 0.06 }),
});

const ORDER = Object.values(LoadStage);

/** Aşamanın içindeki ilerlemeden (0..1) bütün kurulumun ilerlemesi (0..1). */
export const overallProgress = (stage, progress) => {
  const before = ORDER.slice(0, ORDER.indexOf(stage)).reduce((sum, s) => sum + s.share, 0);
  return before + stage.share * Math.min(1, Math.max(0, progress));
};

/** Ekranın çizilebilmesi için olay döngüsüne bir anlığına bırakır. */
export const breathe = () => new Promise((resolve) => setTimeout(resolve, 0));

/** Bir üreteci parça parça çalıştırır; her parçadan sonra ilerlemeyi bildirip ekrana nefes aldırır. */
export const runInSteps = async (generator, stage, onProgress) => {
  let result = generator.next();
  while (!result.done) {
    onProgress(stage, result.value);
    await breathe();
    result = generator.next();
  }
  onProgress(stage, 1);
  return result.value;
};
