const BACK_VOWELS = 'aıou';
const FRONT_VOWELS = 'eiöü';
const VOWELS = BACK_VOWELS + FRONT_VOWELS;
const HARD_CONSONANTS = 'fsthşçkp';

/** Özel isimlere ünlü uyumuna uygun hâl ekleri getirir: Can'a, Ali'yi, Ece'nin, Mert'ten. */
export class Turkish {
  static #letters(word) {
    return word.toLocaleLowerCase('tr').replace(/[^a-zçğıöşü]/g, '');
  }

  static #lastVowel(word) {
    const letters = Turkish.#letters(word);
    for (let i = letters.length - 1; i >= 0; i--) {
      if (VOWELS.includes(letters[i])) return letters[i];
    }
    return 'e';
  }

  static #endsWithVowel(word) {
    return VOWELS.includes(Turkish.#letters(word).slice(-1));
  }

  static #isBack(word) {
    return BACK_VOWELS.includes(Turkish.#lastVowel(word));
  }

  /** Dört yönlü ünlü: ı / i / u / ü */
  static #narrow(word) {
    return { a: 'ı', ı: 'ı', o: 'u', u: 'u', e: 'i', i: 'i', ö: 'ü', ü: 'ü' }[Turkish.#lastVowel(word)];
  }

  /** Yönelme: -(y)a / -(y)e */
  static dative(name) {
    const buffer = Turkish.#endsWithVowel(name) ? 'y' : '';
    return `${name}'${buffer}${Turkish.#isBack(name) ? 'a' : 'e'}`;
  }

  /** Belirtme: -(y)ı / -(y)i / -(y)u / -(y)ü */
  static accusative(name) {
    const buffer = Turkish.#endsWithVowel(name) ? 'y' : '';
    return `${name}'${buffer}${Turkish.#narrow(name)}`;
  }

  /** İlgi: -(n)ın / -(n)in / -(n)un / -(n)ün */
  static genitive(name) {
    const buffer = Turkish.#endsWithVowel(name) ? 'n' : '';
    return `${name}'${buffer}${Turkish.#narrow(name)}n`;
  }

  /** Ayrılma: -dan / -den / -tan / -ten */
  static ablative(name) {
    const hard = HARD_CONSONANTS.includes(Turkish.#letters(name).slice(-1));
    return `${name}'${hard ? 't' : 'd'}${Turkish.#isBack(name) ? 'a' : 'e'}n`;
  }
}
