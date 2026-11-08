import './styles.css';
import { Game } from './core/Game.js';
import { LoadingScreen } from './ui/start/LoadingScreen.js';
import { StartScreen } from './ui/start/StartScreen.js';
import { PlanetSettings } from './world/PlanetSettings.js';

const canvas = document.getElementById('world');
const sidebar = document.getElementById('sidebar');

/** Gezegeni yükleme ekranı eşliğinde kurar ve oyunu başlatır. */
const launch = async (planet, elevation = null) => {
  const loading = new LoadingScreen(document.body, elevation);
  try {
    const game = await Game.create({ canvas, sidebar, planet, onProgress: (stage, progress) => loading.update(stage, progress) });
    loading.close();
    game.start();
  } catch (error) {
    console.error(error);
    loading.fail(error);
  }
};

// ?seed=… ile açılırsa (geliştirme) başlangıç ekranı atlanır, varsayılan ayarlarla kurulur.
const params = new URLSearchParams(window.location.search);
if (params.has('seed')) launch(new PlanetSettings({ seed: Number(params.get('seed')) }));
else new StartScreen(document.body, PlanetSettings.load(), launch);
