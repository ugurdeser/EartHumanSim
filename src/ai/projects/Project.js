/**
 * Yaratmak güdüsünün yürütebileceği bir proje (soyut).
 * `priority` 0 ise proje şu an anlamsız/uygulanamaz.
 * `createAction` bir sonraki adımı (malzeme toplama ya da asıl iş) döndürür;
 * asıl iş bittiğinde `onWorkDone()` çağrılır (güdünün rahatlaması için).
 */
export class Project {
  constructor(name) {
    if (new.target === Project) throw new Error('Project soyut bir sınıftır');
    this.name = name;
  }

  priority(_person, _world) {
    return 0;
  }

  createAction(_person, _world, _onWorkDone) {
    return null;
  }
}
