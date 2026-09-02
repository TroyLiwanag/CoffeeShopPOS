/**
 * Full-delivery release — all modules are always unlocked.
 */

export function isDeliveryUnlocked(): boolean {
  return true;
}

export function isPartialDelivery(): boolean {
  return false;
}

export function setDeliveryUnlocked(_unlocked: boolean): void {
  // no-op — full release is always unlocked
}

export function getRouteBase(path: string): string {
  const base = "/" + path.replace(/^\/+/, "").split("/")[0];
  return base === "/" ? "" : base;
}

export function isAdvancedRoute(_path: string): boolean {
  return false;
}

export function isRouteDeliveryLocked(_path: string): boolean {
  return false;
}
