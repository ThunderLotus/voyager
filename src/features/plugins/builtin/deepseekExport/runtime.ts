import { startExportButton } from '@/pages/content/export';

let active = false;
let generation = 0;
let cleanup: (() => void) | null = null;
let lifecycleController: AbortController | null = null;

/** Native lifecycle bridge for the voyager.deepseek-export builtin plugin. */
export function startDeepSeekExportPlugin(): void {
  if (active) return;

  active = true;
  const currentGeneration = ++generation;
  const controller = new AbortController();
  lifecycleController = controller;
  void startExportButton({ signal: controller.signal })
    .then((nextCleanup) => {
      if (!active || currentGeneration !== generation) {
        nextCleanup();
        return;
      }
      cleanup = nextCleanup;
    })
    .catch(() => {
      if (currentGeneration === generation) active = false;
    });
}

export function stopDeepSeekExportPlugin(): void {
  active = false;
  generation++;
  lifecycleController?.abort();
  lifecycleController = null;
  cleanup?.();
  cleanup = null;
}
