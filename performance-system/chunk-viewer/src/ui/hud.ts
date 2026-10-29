export interface HudState {
  loaded: number;
  pending: number;
  totalChunks: number;
  cameraRow: number;
  cameraCol: number;
  cameraX: number;
  cameraY: number;
  cameraZ: number;
  fps: number;
}

export function createHud(container: HTMLElement): (state: HudState) => void {
  return (state: HudState) => {
    container.textContent = [
      'BLUE DIMENSION — CHUNK VIEWER',
      `fps        ${state.fps.toFixed(0)}`,
      `chunks     ${state.loaded}/${state.totalChunks} loaded, ${state.pending} pending`,
      `grid cell  r${state.cameraRow} c${state.cameraCol}`,
      `camera     x=${state.cameraX.toFixed(1)} y=${state.cameraY.toFixed(1)} z=${state.cameraZ.toFixed(1)}`,
      '',
      'drag: orbit · scroll: zoom · right-drag: pan',
    ].join('\n');
  };
}
