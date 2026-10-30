import './styles.css';
import { Game } from './core/Game.js';

const params = new URLSearchParams(window.location.search);
const seed = params.has('seed') ? Number(params.get('seed')) : Date.now();

const game = new Game({
  canvas: document.getElementById('world'),
  sidebar: document.getElementById('sidebar'),
  seed,
});
game.start();
