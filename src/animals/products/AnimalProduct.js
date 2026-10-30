/**
 * Bir hayvandan elde edilen ürün (soyut). Her hayvanın kendi ürün örnekleri vardır
 * (stok durum tutar). Kimin, hangi aletle alabileceğini ürün bilmez; o insan tarafının işi.
 */
export class AnimalProduct {
  constructor(item) {
    if (new.target === AnimalProduct) throw new Error('AnimalProduct soyut bir sınıftır');
    this.item = item; // ItemType
  }

  update(_animal, _world, _dt) {}

  /** Doğada büyümüş bir hayvan için başlangıç durumu (0..1 doluluk). */
  prefill(_animal, _fraction) {}

  /** Hayvan canlıyken şu an alınabilecek adet. */
  available(_animal, _world) {
    return 0;
  }

  /** Canlı hayvandan en fazla `limit` adet alır; alınan adedi döndürür. */
  harvest(_animal, _world, _limit = Infinity) {
    return 0;
  }

  /** Hayvan kesilince/avlanınca çıkan adet. */
  slaughterYield(_animal) {
    return 0;
  }

  /** Ürünün hayvanı soğuktan koruması (°C), ör. yapağı. */
  get insulation() {
    return 0;
  }
}
