/**
 * A word in the status bar that goes by itself: what a chord did when
 * nothing else on screen says so, such as the terminal's new size, or that
 * nothing is waiting. One at a time; a new word replaces the last.
 */

export const FLASH_MS = 1500;

export const flash = $state({ text: null as string | null });

let timer: ReturnType<typeof setTimeout> | null = null;

export function say(text: string) {
  flash.text = text;
  if (timer !== null) clearTimeout(timer);
  timer = setTimeout(() => {
    flash.text = null;
    timer = null;
  }, FLASH_MS);
}

/** Test seam. */
export function resetFlash() {
  if (timer !== null) clearTimeout(timer);
  timer = null;
  flash.text = null;
}
