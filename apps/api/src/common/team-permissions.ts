import { ALL_PERMISSION_CODES, ROLE_PERMISSIONS } from "@watesly-travel/shared";
import { asRecord, asSettings } from "./org-settings";

export type PermissionOverride = {
  grant?: string[];
  revoke?: string[];
};

export type TeamSettings = {
  permissionOverrides?: Record<string, PermissionOverride>;
  invitations?: TeamInvitation[];
};

export type TeamInvitation = {
  id: string;
  email: string;
  name: string;
  roleCode: string;
  grant?: string[];
  revoke?: string[];
  token: string;
  expiresAt: string;
  createdBy: string;
  createdAt: string;
};

export function readTeamSettings(orgSettings: unknown): TeamSettings {
  const settings = asSettings(orgSettings);
  const team = asRecord(settings.team);
  const rawOverrides = asRecord(team.permissionOverrides);
  const permissionOverrides: Record<string, PermissionOverride> = {};
  for (const [id, value] of Object.entries(rawOverrides)) {
    const row = asRecord(value);
    permissionOverrides[id] = {
      grant: Array.isArray(row.grant) ? row.grant.map(String) : [],
      revoke: Array.isArray(row.revoke) ? row.revoke.map(String) : [],
    };
  }
  const invitations = Array.isArray(team.invitations)
    ? (team.invitations as TeamInvitation[])
    : [];
  return { permissionOverrides, invitations };
}

export function writeTeamSettings(
  orgSettings: Record<string, unknown>,
  team: TeamSettings,
): Record<string, unknown> {
  return {
    ...orgSettings,
    team,
  };
}

export function sanitizePermissionCodes(codes?: string[] | null): string[] {
  const allowed = new Set(ALL_PERMISSION_CODES);
  return Array.from(
    new Set((codes || []).map((code) => String(code).trim()).filter((code) => allowed.has(code))),
  );
}

export function mergePermissions(
  roleCode: string,
  rolePermissions: string[],
  override?: PermissionOverride | null,
): string[] {
  if (roleCode === "owner") {
    return [...(ROLE_PERMISSIONS.owner || ALL_PERMISSION_CODES)];
  }
  const grant = sanitizePermissionCodes(override?.grant);
  const revoke = new Set(sanitizePermissionCodes(override?.revoke));
  const merged = new Set([...rolePermissions, ...grant]);
  for (const code of revoke) merged.delete(code);
  if (roleCode !== "owner") merged.delete("pricing.override");
  return Array.from(merged);
}

export function overrideForMembership(
  orgSettings: unknown,
  membershipId: string,
): PermissionOverride | undefined {
  return readTeamSettings(orgSettings).permissionOverrides?.[membershipId];
}
