type OrientationPermission = "granted" | "denied";
type OrientationEventConstructor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<OrientationPermission>;
};

export const GYRO_PERMISSION_KEY = "gyro_permission";
export const GYRO_PERMISSION_EVENT = "gyro-permission-change";

export function getStoredGyroPermission(): OrientationPermission | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(GYRO_PERMISSION_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

export function storeGyroPermission(value: OrientationPermission) {
  try {
    window.localStorage.setItem(GYRO_PERMISSION_KEY, value);
  } catch {
    // El permiso sigue siendo válido para la sesión aunque el storage esté bloqueado.
  }
  window.dispatchEvent(new Event(GYRO_PERMISSION_EVENT));
}

export function getOrientationPermissionRequest(): (() => Promise<OrientationPermission>) | null {
  if (typeof DeviceOrientationEvent === "undefined") return null;
  const constructor = DeviceOrientationEvent as OrientationEventConstructor;
  return constructor.requestPermission?.bind(constructor) ?? null;
}
