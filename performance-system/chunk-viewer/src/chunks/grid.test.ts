import { describe, expect, it } from 'vitest';
import {
  chunkDistance,
  chunkKey,
  chunkSetCenter,
  chunkWorldOrigin,
  formatChunkFilename,
  parseChunkFilename,
  worldToChunkCoord,
} from './grid';

describe('parseChunkFilename', () => {
  it('extracts row and column from a well-formed chunk filename', () => {
    expect(parseChunkFilename('chunk_r00064_c00000.glb')).toEqual({ row: 64, col: 0 });
  });

  it('is case-insensitive on the extension', () => {
    expect(parseChunkFilename('chunk_r00001_c00002.GLB')).toEqual({ row: 1, col: 2 });
  });

  it('returns null for an unrelated filename', () => {
    expect(parseChunkFilename('scene.glb')).toBeNull();
    expect(parseChunkFilename('chunk_r1_c2.gltf')).toBeNull();
  });
});

describe('formatChunkFilename', () => {
  it('round-trips through parseChunkFilename', () => {
    const name = formatChunkFilename(64, 0);
    expect(name).toBe('chunk_r00064_c00000.glb');
    expect(parseChunkFilename(name)).toEqual({ row: 64, col: 0 });
  });
});

describe('chunkWorldOrigin / worldToChunkCoord', () => {
  const size = { x: 256, z: 256 };

  it('places chunk (0,0) at the world origin', () => {
    expect(chunkWorldOrigin(0, 0, size)).toEqual({ x: 0, z: 0 });
  });

  it('places chunk (row=64, col=0) at z=16384', () => {
    expect(chunkWorldOrigin(64, 0, size)).toEqual({ x: 0, z: 16384 });
  });

  it('is the inverse of worldToChunkCoord at a chunk origin', () => {
    const coord = { row: 5, col: 9 };
    const origin = chunkWorldOrigin(coord.row, coord.col, size);
    expect(worldToChunkCoord(origin.x, origin.z, size)).toEqual(coord);
  });

  it('floors toward the containing cell for points inside a chunk', () => {
    expect(worldToChunkCoord(300, 10, size)).toEqual({ row: 0, col: 1 });
    expect(worldToChunkCoord(-10, -10, size)).toEqual({ row: -1, col: -1 });
  });
});

describe('chunkKey', () => {
  it('is unique per (row, col) pair and stable', () => {
    expect(chunkKey(64, 0)).toBe('64:0');
    expect(chunkKey(64, 0)).toBe(chunkKey(64, 0));
    expect(chunkKey(0, 64)).not.toBe(chunkKey(64, 0));
  });
});

describe('chunkSetCenter', () => {
  const size = { x: 256, z: 256 };

  it('falls back to the grid origin cell for an empty manifest', () => {
    expect(chunkSetCenter([], size)).toEqual({ x: 128, z: 128 });
  });

  it('centers on the single chunk a manifest with only that tile lists', () => {
    // Regression guard: the viewer must not assume chunk (0,0) exists just
    // because it's the grid origin — the shipped sample sits at row 64.
    expect(chunkSetCenter([{ row: 64, col: 0 }], size)).toEqual({ x: 128, z: 64 * 256 + 128 });
  });

  it('averages the centers of several chunks', () => {
    const center = chunkSetCenter(
      [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
      ],
      size,
    );
    expect(center).toEqual({ x: 256, z: 128 });
  });
});

describe('chunkDistance', () => {
  it('is zero for the same cell', () => {
    expect(chunkDistance({ row: 1, col: 1 }, { row: 1, col: 1 })).toBe(0);
  });

  it('is the Chebyshev (ring) distance, not Euclidean', () => {
    expect(chunkDistance({ row: 0, col: 0 }, { row: 2, col: 1 })).toBe(2);
    expect(chunkDistance({ row: 0, col: 0 }, { row: 3, col: 3 })).toBe(3);
  });
});
