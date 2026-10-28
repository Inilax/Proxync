// Cross-platform keyboard event helpers for Windows, Linux, and macOS.
// Ensures consistent primary modifier handling (Cmd on Mac, Ctrl on Linux/Windows)
// and resilient physical/logical key resolution.

export const isMac =
  typeof navigator !== 'undefined' &&
  (/Mac|iPod|iPhone|iPad/i.test(navigator.platform) ||
    /Macintosh|Mac OS X/i.test(navigator.userAgent));

/**
 * Checks whether the platform-appropriate primary modifier key is pressed.
 * - macOS: Meta (⌘ Command), falling back to Control.
 * - Linux / Windows: Ctrl only. Avoids Super/Meta on Linux which is intercepted by GNOME/KDE.
 */
export function isPrimaryModifier(e: KeyboardEvent): boolean {
  return isMac ? (e.metaKey || e.ctrlKey) : e.ctrlKey;
}

/**
 * Resilient key matching supporting both logical `key` and physical `code`.
 * Handles localized keyboard layouts (AZERTY, QWERTZ) and macOS Option/Alt dead-keys.
 */
export function isKey(e: KeyboardEvent, key: string, code?: string): boolean {
  if (e.key.toLowerCase() === key.toLowerCase()) return true;
  if (code && e.code === code) return true;
  return false;
}

/**
 * Checks if the event target is an active editable element.
 */
export function isInputFocused(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
}

/**
 * Handles deletion keys across PC and Mac keyboards.
 * MacBook keyboards emit 'Backspace' for the physical key labeled 'delete'.
 */
export function isDeleteKey(e: KeyboardEvent): boolean {
  if (e.key === 'Delete' || e.code === 'Delete') return true;
  if (isMac && (e.key === 'Backspace' || e.code === 'Backspace')) return true;
  return false;
}
