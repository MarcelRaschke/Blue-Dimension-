import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ChunkLoader, disposeChunkObject } from '../chunks/ChunkLoader';
import { ChunkStreamer } from '../chunks/ChunkStreamer';
import { chunkSetCenter, worldToChunkCoord } from '../chunks/grid';
import type { ChunkManifest } from '../chunks/manifest';
import { createHud, type HudState } from '../ui/hud';

export interface ViewerOptions {
  manifest: ChunkManifest;
  loadRadiusChunks: number;
  maxConcurrentLoads: number;
  showGridHelper: boolean;
  showHud: boolean;
}

/** Bootstraps the Three.js scene and wires the chunk streamer to it. Not unit-tested (needs WebGL); keep logic here thin. */
export class Viewer {
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly controls: OrbitControls;
  private readonly streamer: ChunkStreamer;
  private readonly loader = new ChunkLoader();
  private readonly clock = new THREE.Clock();
  private readonly updateHud: ((state: HudState) => void) | null;
  private frameCount = 0;
  private fps = 0;
  private fpsAccumulator = 0;

  constructor(
    viewportEl: HTMLElement,
    hudEl: HTMLElement | null,
    private readonly options: ViewerOptions,
  ) {
    this.scene.background = new THREE.Color(0x05030a);
    this.scene.fog = new THREE.Fog(0x05030a, options.manifest.chunkSize.x * 2, options.manifest.chunkSize.x * 8);

    // Center on the chunks the manifest actually lists, not on (0,0) —
    // tiles can start anywhere in the grid (the shipped sample is at r64/c0).
    const center = chunkSetCenter(options.manifest.chunks, options.manifest.chunkSize);

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 10000);
    this.camera.position.set(
      center.x,
      options.manifest.chunkSize.x * 0.75,
      center.z + options.manifest.chunkSize.z * 1.5,
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    viewportEl.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(center.x, 0, center.z);
    this.controls.enableDamping = true;

    this.scene.add(new THREE.HemisphereLight(0x8899ff, 0x120a1f, 0.9));
    const sun = new THREE.DirectionalLight(0xff00c8, 1.1);
    sun.position.set(1, 1.5, 1);
    this.scene.add(sun);

    if (options.showGridHelper) {
      for (const entry of options.manifest.chunks) {
        const helper = new THREE.GridHelper(options.manifest.chunkSize.x, 8, 0xff00c8, 0x2a1030);
        helper.position.set(
          entry.col * options.manifest.chunkSize.x + options.manifest.chunkSize.x / 2,
          0,
          entry.row * options.manifest.chunkSize.z + options.manifest.chunkSize.z / 2,
        );
        this.scene.add(helper);
      }
    }

    this.updateHud = options.showHud && hudEl ? createHud(hudEl) : null;

    this.streamer = new ChunkStreamer({
      manifest: options.manifest,
      loadRadiusChunks: options.loadRadiusChunks,
      maxConcurrentLoads: options.maxConcurrentLoads,
      loadChunk: (entry) => this.loader.load(entry, options.manifest.chunkSize),
      onChunkLoaded: (_key, object) => this.scene.add(object),
      onChunkUnloaded: (_key, object) => {
        this.scene.remove(object);
        disposeChunkObject(object);
      },
      onChunkLoadError: (key, error) => console.error(`[chunk-viewer] failed to load chunk ${key}`, error),
    });

    window.addEventListener('resize', this.handleResize);
  }

  start(): void {
    this.renderer.setAnimationLoop(this.tick);
  }

  dispose(): void {
    this.renderer.setAnimationLoop(null);
    window.removeEventListener('resize', this.handleResize);
    this.renderer.dispose();
  }

  private readonly handleResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  private readonly tick = (): void => {
    const delta = this.clock.getDelta();
    this.fpsAccumulator += delta;
    this.frameCount += 1;
    if (this.fpsAccumulator >= 0.5) {
      this.fps = this.frameCount / this.fpsAccumulator;
      this.frameCount = 0;
      this.fpsAccumulator = 0;
    }

    this.controls.update();
    this.streamer.update(this.camera.position.x, this.camera.position.z);

    if (this.updateHud) {
      const cell = worldToChunkCoord(this.camera.position.x, this.camera.position.z, this.options.manifest.chunkSize);
      this.updateHud({
        loaded: this.streamer.loadedKeys.length,
        pending: this.streamer.pendingKeys.length,
        totalChunks: this.options.manifest.chunks.length,
        cameraRow: cell.row,
        cameraCol: cell.col,
        cameraX: this.camera.position.x,
        cameraY: this.camera.position.y,
        cameraZ: this.camera.position.z,
        fps: this.fps,
      });
    }

    this.renderer.render(this.scene, this.camera);
  };
}
