/**
 * Uyuyan nesneleri uyanma zamanına göre tutan öncelik kuyruğu (ikili yığın).
 * Bir nesne yeniden kurulduğunda ya da iptal edildiğinde eski kaydı silinmez; kayıt
 * nesnenin `wakeToken` değeriyle eşleşmiyorsa sırası gelince sessizce atlanır.
 */
export class Scheduler {
  #heap = [];

  get size() {
    return this.#heap.length;
  }

  /** `item`'ı `time` anında uyandırmak üzere kurar (önceki kurulumu geçersiz kılar). */
  schedule(item, time) {
    item.wakeToken = (item.wakeToken ?? 0) + 1;
    this.#push({ time, item, token: item.wakeToken });
  }

  cancel(item) {
    item.wakeToken = (item.wakeToken ?? 0) + 1;
  }

  /** Bir sonraki geçerli uyanma anı (yoksa Infinity). */
  get nextTime() {
    while (this.#heap.length && !this.#isValid(this.#heap[0])) this.#pop();
    return this.#heap.length ? this.#heap[0].time : Infinity;
  }

  /** Zamanı gelmiş her geçerli kayıt için `callback(item)` çağırır. */
  popDue(now, callback) {
    while (this.#heap.length && this.#heap[0].time <= now) {
      const entry = this.#pop();
      if (this.#isValid(entry)) callback(entry.item);
    }
  }

  #isValid(entry) {
    return entry.token === entry.item.wakeToken;
  }

  #push(entry) {
    const heap = this.#heap;
    heap.push(entry);
    let i = heap.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (heap[parent].time <= entry.time) break;
      heap[i] = heap[parent];
      i = parent;
    }
    heap[i] = entry;
  }

  #pop() {
    const heap = this.#heap;
    const top = heap[0];
    const last = heap.pop();
    if (heap.length === 0) return top;
    let i = 0;
    const n = heap.length;
    for (;;) {
      const left = 2 * i + 1;
      if (left >= n) break;
      const right = left + 1;
      const child = right < n && heap[right].time < heap[left].time ? right : left;
      if (heap[child].time >= last.time) break;
      heap[i] = heap[child];
      i = child;
    }
    heap[i] = last;
    return top;
  }
}
