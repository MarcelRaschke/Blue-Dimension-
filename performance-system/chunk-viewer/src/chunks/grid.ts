/**
 * Chunk-grid coordinate math.
 *
 * Chunk size is read from the manifest rather than hard-coded here: it was
 * inferred from a single sample tile (chunk_r00064_c00000.glb, bounding box
 * 256x279x256) and must be confirmed against the source pipeline once more
 * tiles exist. Row maps to world Z (northing), column to world X (easting).
 */

export interface ChunkSize {
  x: number;
  z: number;
}

export interface ChunkCoord {
  row: number;
  col: number;
}

const FILENAME_PATTERN = /^chunk_r(\d+)_c(\d+)\.glb$/i;

export function chunkKey(row: number, col: number): string {
  return `${row}:${col}`;
}

export function parseChunkFilename(filename: string): ChunkCoord | null {
  const match = FILENAME_PATTERN.exec(filename);
  if (!match) return null;
  return { row: parseInt(match[1], 10), col: parseInt(match[2], 10) };
}

export function formatChunkFilename(row: number, col: number): string {
  const pad = (n: number) => String(n).padStart(5, '0');
  return `chunk_r${pad(row)}_c${pad(col)}.glb`;
}

export function chunkWorldOrigin(row: number, col: number, size: ChunkSize): { x: number; z: number } {
  return { x: col * size.x, z: row * size.z };
}

export function worldToChunkCoord(x: number, z: number, size: ChunkSize): ChunkCoord {
  return { row: Math.floor(z / size.z), col: Math.floor(x / size.x) };
}

/** Chebyshev distance, i.e. the ring index of `b` around `a` on a square grid. */
export function chunkDistance(a: ChunkCoord, b: ChunkCoord): number {
  return Math.max(Math.abs(a.row - b.row), Math.abs(a.col - b.col));
}

/**
 * World-space center of a set of chunks (e.g. everything in the manifest),
 * so the camera can start somewhere that actually has geometry instead of
 * assuming chunk (0,0) exists. Falls back to the grid origin for an empty set.
 */
export function chunkSetCenter(chunks: ChunkCoord[], size: ChunkSize): { x: number; z: number } {
  if (chunks.length === 0) return { x: size.x / 2, z: size.z / 2 };
  const sum = chunks.reduce(
    (acc, { row, col }) => {
      const origin = chunkWorldOrigin(row, col, size);
      return { x: acc.x + origin.x + size.x / 2, z: acc.z + origin.z + size.z / 2 };
    },
    { x: 0, z: 0 },
  );
  return { x: sum.x / chunks.length, z: sum.z / chunks.length };
}
