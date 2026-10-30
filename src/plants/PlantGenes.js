/** Tüm bitkilerde bulunan genler; türler bunlara kendi genlerini ekler. */
export const plantGenes = (...extra) =>
  Object.freeze([
    { id: 'vigor', name: 'Büyüme hızı' },
    { id: 'stature', name: 'Boy' },
    { id: 'fertility', name: 'Tohum verimi' },
    { id: 'longevity', name: 'Ömür' },
    ...extra,
  ]);

/** Config'teki tür ayarlarını Plant'ın beklediği profile çevirir. */
export const speciesProfile = (config, { name, layer, genes, seedSeasons, germination }) =>
  Object.freeze({
    name,
    layer,
    genes,
    seedSeasons,
    germination,
    radius: config.RADIUS,
    maturity: config.MATURITY,
    lifespan: config.LIFESPAN,
    seedsPerYear: config.SEEDS_PER_YEAR,
    seedRadius: config.SEED_RADIUS,
    pollenRadius: config.POLLEN_RADIUS,
    spacing: config.SPACING,
    waterMargin: config.WATER_MARGIN,
    mortality: { seedling: config.MORTALITY.SEEDLING, adult: config.MORTALITY.ADULT, old: config.MORTALITY.OLD },
  });
