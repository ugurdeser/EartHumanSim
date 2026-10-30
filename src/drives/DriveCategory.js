export const DriveCategory = Object.freeze({
  ENVIRONMENTAL: Object.freeze({ id: 'environmental', label: 'Çevresel Güdüler' }),
  PHYSIOLOGICAL: Object.freeze({ id: 'physiological', label: 'Fizyolojik Güdüler' }),
  REPRODUCTIVE: Object.freeze({ id: 'reproductive', label: 'Üreme ile İlişkili Güdüler' }),
  PSYCHOLOGICAL: Object.freeze({ id: 'psychological', label: 'Psikolojik Güdüler' }),
  SOCIAL: Object.freeze({ id: 'social', label: 'Sosyal Güdüler' }),
});

export const CATEGORY_ORDER = [
  DriveCategory.ENVIRONMENTAL,
  DriveCategory.PHYSIOLOGICAL,
  DriveCategory.REPRODUCTIVE,
  DriveCategory.PSYCHOLOGICAL,
  DriveCategory.SOCIAL,
];
