"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getShopSession, shopFetch } from "@/lib/shop-session";
import { useShopI18n } from "@/components/shop/ShopI18nProvider";
import {
  displayName,
  isoDate,
  loadFamilySelection,
  memberKind,
  saveFamilySelection,
  type FamilyMember,
} from "@/lib/family-travelers";

type Props = {
  mode: "multi" | "single";
  onPick?: (member: FamilyMember) => void;
  onSelectionChange?: (members: FamilyMember[]) => void;
};

function normalizeMember(row: FamilyMember): FamilyMember {
  return {
    ...row,
    birthDate: isoDate(row.birthDate) || null,
    passportExpiry: isoDate(row.passportExpiry) || null,
  };
}

export function FamilyTravelerPicker({ mode, onPick, onSelectionChange }: Props) {
  const { t } = useShopI18n();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const loggedIn = Boolean(getShopSession());

  useEffect(() => {
    if (!getShopSession()) {
      setReady(true);
      return;
    }
    shopFetch<{ travelers: FamilyMember[] }>("/shop/me")
      .then((me) => {
        const rows = (me.travelers || []).map(normalizeMember);
        setMembers(rows);
        const stored = loadFamilySelection().filter((id) =>
          rows.some((row) => row.id === id),
        );
        setSelected(stored);
        onSelectionChange?.(rows.filter((row) => stored.includes(row.id)));
      })
      .catch(() => undefined)
      .finally(() => setReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once when the picker mounts
  }, []);

  if (!ready) return null;

  if (!loggedIn) {
    return (
      <div className="wg-family-picker">
        <p className="wg-family-picker-title">{t("familyList")}</p>
        <Link className="wg-family-signin" href="/account/login">
          {t("signInForFamily")}
        </Link>
      </div>
    );
  }

  if (!members.length) {
    return (
      <div className="wg-family-picker">
        <p className="wg-family-picker-title">{t("familyList")}</p>
        <p className="wg-family-empty">{t("noFamilyYet")}</p>
        <Link className="wg-family-signin" href="/account">
          {t("addFamilyMember")}
        </Link>
      </div>
    );
  }

  function toggle(member: FamilyMember) {
    if (mode === "single") {
      onPick?.(member);
      return;
    }
    const next = selected.includes(member.id)
      ? selected.filter((id) => id !== member.id)
      : [...selected, member.id];
    setSelected(next);
    saveFamilySelection(next);
    onSelectionChange?.(members.filter((row) => next.includes(row.id)));
  }

  return (
    <div className="wg-family-picker">
      <p className="wg-family-picker-title">{t("pickFromFamily")}</p>
      <div className="wg-family-list">
        {members.map((member) => {
          const kind = memberKind(member.birthDate);
          const on = selected.includes(member.id);
          return (
            <button
              key={member.id}
              type="button"
              className={`wg-family-chip${on || mode === "single" ? (on ? " on" : "") : ""}`}
              onClick={() => toggle(member)}
            >
              <strong>{displayName(member)}</strong>
              <span>
                {kind === "child"
                  ? t("children")
                  : kind === "infant"
                    ? t("infants")
                    : t("adults")}
                {member.passportNumber ? ` · ${member.passportNumber}` : ""}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
