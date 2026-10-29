import { fetchChunkManifest } from './chunks/manifest';
import { Viewer } from './scene/Viewer';

const manifestUrl = import.meta.env.VITE_CHUNK_MANIFEST_URL ?? '/chunks/manifest.json';
const loadRadiusChunks = Number(import.meta.env.VITE_CHUNK_LOAD_RADIUS ?? 2);
const maxConcurrentLoads = Number(import.meta.env.VITE_CHUNK_MAX_CONCURRENT_LOADS ?? 4);
const showGridHelper = (import.meta.env.VITE_SHOW_GRID_HELPER ?? 'true') !== 'false';
const showHud = (import.meta.env.VITE_SHOW_HUD ?? 'true') !== 'false';

async function bootstrap(): Promise<void> {
  const viewportEl = document.getElementById('viewport');
  const hudEl = document.getElementById('hud');
  if (!viewportEl) throw new Error('#viewport element missing from index.html');

  const manifest = await fetchChunkManifest(manifestUrl);

  const viewer = new Viewer(viewportEl, hudEl, {
    manifest,
    loadRadiusChunks,
    maxConcurrentLoads,
    showGridHelper,
    showHud,
  });

  viewer.start();
}

bootstrap().catch((error) => {
  console.error('[chunk-viewer] failed to start', error);
  const hudEl = document.getElementById('hud');
  if (hudEl) hudEl.textContent = `Failed to start chunk viewer:\n${String(error)}`;
});
