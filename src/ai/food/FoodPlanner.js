import { FishingProvider } from './FishingProvider.js';
import { ForageProvider } from './ForageProvider.js';
import { HomeStorageProvider } from './HomeStorageProvider.js';
import { HuntingProvider } from './HuntingProvider.js';

/**
 * Yiyecek stratejileri arasından en düşük maliyetliyi seçer.
 * Yeni bir yöntem (ör. tarım) eklemek için PROVIDERS listesine bir sınıf eklemek yeterli.
 */
const PROVIDERS = Object.freeze([new HomeStorageProvider(), new ForageProvider(), new FishingProvider(), new HuntingProvider()]);

export class FoodPlanner {
  /** @param {{excludeHome?: boolean}} options İstif için yuvadan almak anlamsız. */
  static bestAcquisition(person, world, { excludeHome = false } = {}) {
    let best = null;
    for (const provider of PROVIDERS) {
      if (excludeHome && provider.id === 'home') continue;
      const plan = provider.plan(person, world);
      if (plan && (!best || plan.cost < best.cost)) best = plan;
    }
    return best?.action ?? null;
  }
}
