// Wrapper de MindAR (image tracking).
//
// Importante: este wrapper SOLO se ocupa del tracking. La reproducción del
// vídeo y audio histórico se controla desde React (ARPage), porque la
// experiencia de turismo continúa aunque se pierda el tracking de la
// imagen — y porque preferimos un overlay grande sobre la cámara en
// lugar de un plano AR diminuto anclado a la fachada.

import { MindARThree } from "mind-ar/dist/mindar-image-three.prod.js";

export interface StartMindARArgs {
  container: HTMLElement;
  targetImageUrl: string;
  onTargetFound?: () => void;
  onTargetLost?: () => void;
}

export async function startMindAR(args: StartMindARArgs): Promise<() => Promise<void>> {
  // Limpiar restos de mounts anteriores (HMR, cleanup incompleto, etc.).
  while (args.container.firstChild) {
    args.container.removeChild(args.container.firstChild);
  }

  const mindar = new MindARThree({
    container: args.container,
    imageTargetSrc: args.targetImageUrl,
  });

  const { renderer, scene, camera } = mindar;
  // Permite que el <video> de la cámara (debajo del canvas) sea visible.
  renderer.setClearColor(0x000000, 0);

  const anchor = mindar.addAnchor(0);
  anchor.onTargetFound = () => args.onTargetFound?.();
  anchor.onTargetLost = () => args.onTargetLost?.();

  let disposed = false;
  const cleanup = async () => {
    if (disposed) return;
    disposed = true;
    anchor.onTargetFound = undefined;
    anchor.onTargetLost = undefined;
    renderer.setAnimationLoop(null);
    try {
      await mindar.stop();
    } catch {
      // MindAR.stop() assumes its controller exists, even after a failed start.
    } finally {
      for (const video of args.container.querySelectorAll("video")) {
        const stream = video.srcObject as MediaStream | null;
        stream?.getTracks().forEach((track) => track.stop());
        video.srcObject = null;
      }
      renderer.dispose();
      args.container.replaceChildren();
    }
  };

  try {
    await mindar.start();
    renderer.setAnimationLoop(() => renderer.render(scene, camera));
  } catch (error) {
    await cleanup();
    throw error;
  }

  return cleanup;
}
