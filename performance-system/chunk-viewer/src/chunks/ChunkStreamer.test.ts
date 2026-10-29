import type { Object3D } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { ChunkStreamer } from './ChunkStreamer';
import type { ChunkManifest, ChunkManifestEntry } from './manifest';

function makeManifest(chunks: Array<{ row: number; col: number }>): ChunkManifest {
  return {
    chunkSize: { x: 256, z: 256 },
    chunks: chunks.map(({ row, col }) => ({ row, col, url: `/chunks/chunk_r${row}_c${col}.glb` })),
  };
}

/** A manually-resolvable load, so tests can control exactly when a "network" load completes. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const fakeObject = (): Object3D => ({}) as Object3D;

describe('ChunkStreamer', () => {
  it('requests only chunks inside the load radius that exist in the manifest', () => {
    const manifest = makeManifest([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 5, col: 5 }, // out of range, should never be requested
    ]);
    const loadChunk = vi.fn((_entry: ChunkManifestEntry) => new Promise<Object3D>(() => {}));

    const streamer = new ChunkStreamer({
      manifest,
      loadRadiusChunks: 1,
      loadChunk,
      onChunkLoaded: vi.fn(),
      onChunkUnloaded: vi.fn(),
    });

    streamer.update(0, 0); // focus at chunk (0,0)

    const requestedKeys = loadChunk.mock.calls.map(([entry]) => `${entry.row}:${entry.col}`);
    expect(requestedKeys.sort()).toEqual(['0:0', '0:1']);
  });

  it('marks a chunk loaded once its load resolves', async () => {
    const manifest = makeManifest([{ row: 0, col: 0 }]);
    const object = fakeObject();
    const onChunkLoaded = vi.fn();

    const streamer = new ChunkStreamer({
      manifest,
      loadRadiusChunks: 0,
      loadChunk: () => Promise.resolve(object),
      onChunkLoaded,
      onChunkUnloaded: vi.fn(),
    });

    streamer.update(0, 0);
    await new Promise((r) => setTimeout(r, 0));

    expect(onChunkLoaded).toHaveBeenCalledWith('0:0', object);
    expect(streamer.loadedKeys).toEqual(['0:0']);
  });

  it('unloads chunks that fall outside the window after the focus moves', async () => {
    const manifest = makeManifest([
      { row: 0, col: 0 },
      { row: 0, col: 10 },
    ]);
    const onChunkUnloaded = vi.fn();

    const streamer = new ChunkStreamer({
      manifest,
      loadRadiusChunks: 0,
      loadChunk: () => Promise.resolve(fakeObject()),
      onChunkLoaded: vi.fn(),
      onChunkUnloaded,
    });

    streamer.update(0, 0); // loads (0,0)
    await new Promise((r) => setTimeout(r, 0));
    expect(streamer.loadedKeys).toEqual(['0:0']);

    streamer.update(10 * 256, 0); // focus jumps to chunk (0,10)
    await new Promise((r) => setTimeout(r, 0));

    expect(onChunkUnloaded).toHaveBeenCalledWith('0:0', expect.anything());
    expect(streamer.loadedKeys).toEqual(['0:10']);
  });

  it('never has more in-flight loads than maxConcurrentLoads', () => {
    const manifest = makeManifest([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 0, col: 3 },
      { row: 0, col: 4 },
    ]);
    const loadChunk = vi.fn().mockReturnValue(new Promise(() => {})); // never resolves

    const streamer = new ChunkStreamer({
      manifest,
      loadRadiusChunks: 2,
      maxConcurrentLoads: 2,
      loadChunk,
      onChunkLoaded: vi.fn(),
      onChunkUnloaded: vi.fn(),
    });

    streamer.update(0, 0);

    expect(loadChunk).toHaveBeenCalledTimes(2);
    expect(streamer.pendingKeys).toHaveLength(2);
  });

  it('starts further loads once earlier ones free up a concurrency slot', async () => {
    const manifest = makeManifest([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
    ]);
    const first = deferred<Object3D>();
    const loadChunk = vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValue(new Promise(() => {}));

    const streamer = new ChunkStreamer({
      manifest,
      loadRadiusChunks: 2,
      maxConcurrentLoads: 1,
      loadChunk,
      onChunkLoaded: vi.fn(),
      onChunkUnloaded: vi.fn(),
    });

    streamer.update(0, 0);
    expect(loadChunk).toHaveBeenCalledTimes(1);

    first.resolve(fakeObject());
    await new Promise((r) => setTimeout(r, 0));

    streamer.update(0, 0);
    expect(loadChunk).toHaveBeenCalledTimes(2);
  });

  it('discards a chunk that finished loading after the focus moved away from it', async () => {
    const manifest = makeManifest([
      { row: 0, col: 0 },
      { row: 0, col: 10 },
    ]);
    const slowOriginal = deferred<Object3D>();
    const originalObject = fakeObject();
    const onChunkLoaded = vi.fn();
    const onChunkUnloaded = vi.fn();

    const streamer = new ChunkStreamer({
      manifest,
      loadRadiusChunks: 0,
      // The second update() starts a second load for (0,10); never resolve
      // that one so this test only observes what happens to the first.
      loadChunk: (entry) => (entry.row === 0 && entry.col === 0 ? slowOriginal.promise : new Promise(() => {})),
      onChunkLoaded,
      onChunkUnloaded,
    });

    streamer.update(0, 0); // starts loading (0,0)
    streamer.update(10 * 256, 0); // focus moves away before the load resolves

    slowOriginal.resolve(originalObject);
    await new Promise((r) => setTimeout(r, 0));

    expect(onChunkLoaded).not.toHaveBeenCalledWith('0:0', expect.anything());
    expect(onChunkUnloaded).toHaveBeenCalledWith('0:0', originalObject);
    expect(streamer.loadedKeys).toEqual([]);
  });

  it('reports load failures without marking the chunk loaded', async () => {
    const manifest = makeManifest([{ row: 0, col: 0 }]);
    const onChunkLoadError = vi.fn();
    const error = new Error('network error');

    const streamer = new ChunkStreamer({
      manifest,
      loadRadiusChunks: 0,
      loadChunk: () => Promise.reject(error),
      onChunkLoaded: vi.fn(),
      onChunkUnloaded: vi.fn(),
      onChunkLoadError,
    });

    streamer.update(0, 0);
    await new Promise((r) => setTimeout(r, 0));

    expect(onChunkLoadError).toHaveBeenCalledWith('0:0', error);
    expect(streamer.loadedKeys).toEqual([]);
    expect(streamer.pendingKeys).toEqual([]);
  });
});
