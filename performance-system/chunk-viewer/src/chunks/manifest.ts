import type { ChunkSize } from './grid';

export interface ChunkManifestEntry {
  row: number;
  col: number;
  url: string;
}

export interface ChunkManifest {
  chunkSize: ChunkSize;
  chunks: ChunkManifestEntry[];
}

export function isChunkManifest(value: unknown): value is ChunkManifest {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<ChunkManifest>;
  return (
    typeof candidate.chunkSize === 'object' &&
    candidate.chunkSize !== null &&
    typeof candidate.chunkSize.x === 'number' &&
    typeof candidate.chunkSize.z === 'number' &&
    Array.isArray(candidate.chunks)
  );
}

export async function fetchChunkManifest(url: string): Promise<ChunkManifest> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch chunk manifest from ${url}: ${response.status} ${response.statusText}`);
  }
  const data = await response.json();
  if (!isChunkManifest(data)) {
    throw new Error(`Malformed chunk manifest at ${url}`);
  }
  return data;
}
