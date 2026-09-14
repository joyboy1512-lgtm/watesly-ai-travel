export type FamilyMember = {
  id: string;
  title?: string | null;
  firstName: string;
  lastName: string;
  birthDate?: string | null;
  nationality?: string | null;
  passportNumber?: string | null;
  passportExpiry?: string | null;
  relation?: string | null;
};

export const FAMILY_SELECTION_KEY = "wg_family_selection";

export function isoDate(value?: string | Date | null): string {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  try {
    return value.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

export function memberAgeYears(birthDate?: string | null): number | null {
  const iso = isoDate(birthDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const born = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(born.getTime())) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - born.getUTCFullYear();
  const month = now.getUTCMonth() - born.getUTCMonth();
  if (month < 0 || (month === 0 && now.getUTCDate() < born.getUTCDate())) {
    age -= 1;
  }
  return age;
}

export function memberKind(
  birthDate?: string | null,
): "adult" | "child" | "infant" {
  const age = memberAgeYears(birthDate);
  if (age == null) return "adult";
  if (age < 2) return "infant";
  if (age < 12) return "child";
  return "adult";
}

export function loadFamilySelection(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(FAMILY_SELECTION_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

export function saveFamilySelection(ids: string[]) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(FAMILY_SELECTION_KEY, JSON.stringify(ids));
}

export function countsFromMembers(members: FamilyMember[]) {
  let adults = 0;
  let children = 0;
  let infants = 0;
  for (const member of members) {
    const kind = memberKind(member.birthDate);
    if (kind === "infant") infants += 1;
    else if (kind === "child") children += 1;
    else adults += 1;
  }
  return {
    adults: Math.max(1, adults || (children || infants ? 1 : 1)),
    children,
    infants,
  };
}

export function displayName(member: FamilyMember) {
  return `${member.firstName} ${member.lastName}`.trim();
}
