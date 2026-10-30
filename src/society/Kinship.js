/** Akrabalık ilişkileri ve Türkçe akrabalık adları. */
export class Kinship {
  static childWord(person) {
    return person.isFemale ? 'Kızı' : 'Oğlu';
  }

  static siblingWord(person) {
    return person.isFemale ? 'Kız kardeşi' : 'Erkek kardeşi';
  }

  /** Anne, baba, eş, çocuklar ve kardeşler. */
  static closeRelatives(person) {
    return [...new Set([person.mother, person.father, person.partner, ...person.children, ...person.siblings].filter(Boolean))];
  }

  /** `person`, `relative`'in nesi? (ör. "Annesi", "Oğlu", "Eşi") */
  static describe(person, relative) {
    if (relative.mother === person) return 'Annesi';
    if (relative.father === person) return 'Babası';
    if (person.partner === relative || relative.partner === person) return 'Eşi';
    if (relative.children.includes(person)) return Kinship.childWord(person);
    if (relative.siblings.includes(person)) return Kinship.siblingWord(person);
    return 'Yakını';
  }
}
