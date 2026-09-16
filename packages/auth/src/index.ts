/** Shared auth permission helpers (API owns JWT issuance). */
export function hasPermission(
  permissions: string[] | undefined,
  required: string,
): boolean {
  return Boolean(permissions?.includes(required));
}

export function hasAnyPermission(
  permissions: string[] | undefined,
  required: string[],
): boolean {
  return required.some((code) => hasPermission(permissions, code));
}
