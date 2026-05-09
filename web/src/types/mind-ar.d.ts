// MindAR no publica tipos; declaramos lo que usamos.
declare module "mind-ar/dist/mindar-image-three.prod.js" {
  import type { Group, Scene, Camera, WebGLRenderer } from "three";

  export class MindARThree {
    constructor(opts: { container: HTMLElement; imageTargetSrc: string });

    renderer: WebGLRenderer;
    scene: Scene;
    camera: Camera;

    start(): Promise<void>;
    stop(): Promise<void>;
    addAnchor(targetIndex: number): {
      group: Group;
      onTargetFound?: () => void;
      onTargetLost?: () => void;
    };
  }
}
