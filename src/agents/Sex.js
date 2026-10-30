import { COLORS } from '../config.js';

export const Sex = Object.freeze({
  MALE: Object.freeze({ id: 'male', label: 'Erkek', symbol: '♂', color: COLORS.MALE }),
  FEMALE: Object.freeze({ id: 'female', label: 'Kadın', symbol: '♀', color: COLORS.FEMALE }),
});
