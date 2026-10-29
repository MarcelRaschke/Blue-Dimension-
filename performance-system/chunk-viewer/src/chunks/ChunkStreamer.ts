import type { Object3D } from 'three';
import { chunkKey, worldToChunkCoord, type ChunkSize } from './grid';
import type { ChunkManifest, ChunkManifestEntry } from './manifest';

export interface ChunkStreamerOptions {
  manifest: ChunkManifest;
  /** Ring radius, in chunk cells, to keep loaded around the focus point. */
  loadRadiusChunks: number;
  /** Caps simultaneous in-flight loads so a sudden pan doesn't fire 50 requests at once. */
  maxConcurrentLoads?: number;
  loadChunk: (entry: ChunkManifestEntry) => Promise<Object3D>;
  onChunkLoaded: (key: string, object: Object3D) => void;
  /** Receives ownership of `object` for scene removal and geometry/material disposal. */
  onChunkUnloaded: (key: string, object: Object3D) => void;
  onChunkLoadError?: (key: string, error: unknown) => void;
}

/**
 * Keeps a square window of chunks loaded around a moving focus point
 * (typically the camera) and evicts everything outside it. Framework-agnostic:
 * it only knows about chunk keys and the callbacks it's given, so it can be
 * unit-tested without a WebGL context.
 */
export class ChunkStreamer {
  private readonly chunkSize: ChunkSize;
  private readonly byKey: Map<string, ChunkManifestEntry>;
  private readonly loaded = new Map<string, Object3D>();
  private readonly pending = new Set<string>();
  private readonly maxConcurrentLoads: number;
  private neededKeys = new Set<string>();

  constructor(private readonly options: ChunkStreamerOptions) {
    this.chunkSize = options.manifest.chunkSize;
    this.byKey = new Map(options.manifest.chunks.map((entry) => [chunkKey(entry.row, entry.col), entry]));
    this.maxConcurrentLoads = options.maxConcurrentLoads ?? 4;
  }

  get loadedKeys(): string[] {
    return [...this.loaded.keys()];
  }

  get pendingKeys(): string[] {
    return [...this.pending];
  }

  /** Recomputes the needed window around (focusX, focusZ) and loads/unloads to match it. */
  update(focusX: number, focusZ: number): void {
    const center = worldToChunkCoord(focusX, focusZ, this.chunkSize);
    const radius = this.options.loadRadiusChunks;
    const needed = new Set<string>();

    for (let dRow = -radius; dRow <= radius; dRow++) {
      for (let dCol = -radius; dCol <= radius; dCol++) {
        const key = chunkKey(center.row + dRow, center.col + dCol);
        if (this.byKey.has(key)) needed.add(key);
      }
    }
    this.neededKeys = needed;

    for (const [key, object] of this.loaded) {
      if (!needed.has(key)) {
        this.loaded.delete(key);
        this.options.onChunkUnloaded(key, object);
      }
    }

    for (const key of needed) {
      if (this.loaded.has(key) || this.pending.has(key)) continue;
      if (this.pending.size >= this.maxConcurrentLoads) break;

      const entry = this.byKey.get(key);
      if (!entry) continue;

      this.pending.add(key);
      this.options
        .loadChunk(entry)
        .then((object) => {
          this.pending.delete(key);
          // The focus may have moved on while this load was in flight.
          if (!this.neededKeys.has(key)) {
            this.options.onChunkUnloaded(key, object);
            return;
          }
          this.loaded.set(key, object);
          this.options.onChunkLoaded(key, object);
        })
        .catch((error) => {
          this.pending.delete(key);
          this.options.onChunkLoadError?.(key, error);
        });
    }
  }
}
