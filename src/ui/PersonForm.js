import { AGING, POPULATION } from '../config.js';
import { Sex } from '../agents/Sex.js';
import { el } from './dom.js';

const SEXES = { male: Sex.MALE, female: Sex.FEMALE };

/** Karakter ekleme formu: doldurulan alanlar kullanılır, boş kalanlar rastgele belirlenir. */
export class PersonForm {
  constructor(onAdd) {
    this.name = el('input', { type: 'text', placeholder: 'Ad', maxlength: '20', 'aria-label': 'Ad' });
    this.surname = el('input', { type: 'text', placeholder: 'Soyad', maxlength: '20', 'aria-label': 'Soyad' });
    this.age = el('input', { type: 'number', placeholder: 'Yaş', min: String(AGING.ADULT_AGE), max: String(POPULATION.MAX_ADDED_AGE), 'aria-label': 'Yaş' });
    this.sex = el(
      'select',
      { 'aria-label': 'Cinsiyet' },
      el('option', { value: '', text: 'Cinsiyet: rastgele' }),
      el('option', { value: 'male', text: 'Erkek' }),
      el('option', { value: 'female', text: 'Kadın' }),
    );
    this.root = el(
      'form',
      {
        class: 'person-form',
        onSubmit: (e) => {
          e.preventDefault();
          onAdd(this.#details());
          this.root.reset();
        },
      },
      this.name,
      this.surname,
      this.age,
      this.sex,
      el('button', { type: 'submit', title: 'Boş bırakılan alanlar rastgele belirlenir', text: '+ Karakter ekle' }),
    );
  }

  /** Boş alan `undefined` kalır; yaş yetişkinlik sınırları içine çekilir. */
  #details() {
    const age = this.age.value === '' ? undefined : Math.min(POPULATION.MAX_ADDED_AGE, Math.max(AGING.ADULT_AGE, Math.floor(Number(this.age.value))));
    return {
      name: this.name.value.trim() || undefined,
      surname: this.surname.value.trim() || undefined,
      age,
      sex: SEXES[this.sex.value],
    };
  }
}
