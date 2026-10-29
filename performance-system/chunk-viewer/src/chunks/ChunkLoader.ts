import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { formatChunkFilename, type ChunkSize } from './grid';
import type { ChunkManifestEntry } from './manifest';

/**
 * Loads a single chunk tile and prepares it for the scene.
 *
 * Source tiles carry POSITION + COLOR_0 but no normals and no material
 * (trimesh export), so normals are computed client-side and a flat-shaded,
 * vertex-colored material is applied here rather than trusting the file.
 */
export class ChunkLoader {
  private readonly gltfLoader = new GLTFLoader();

  async load(entry: ChunkManifestEntry, chunkSize: ChunkSize): Promise<THREE.Object3D> {
    const gltf = await this.gltfLoader.loadAsync(entry.url);
    const root = gltf.scene;

    root.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        node.geometry.computeVertexNormals();
        node.material = new THREE.MeshStandardMaterial({
          vertexColors: true,
          flatShading: true,
          side: THREE.DoubleSide,
          roughness: 0.9,
          metalness: 0.0,
        });
      }
    });

    root.position.set(entry.col * chunkSize.x, 0, entry.row * chunkSize.z);
    root.name = formatChunkFilename(entry.row, entry.col);
    return root;
  }
}

export function disposeChunkObject(object: THREE.Object3D): void {
  object.traverse((node) => {
    if (node instanceof THREE.Mesh) {
      node.geometry.dispose();
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      for (const material of materials) {
        material.dispose();
      }
    }
  });
}
