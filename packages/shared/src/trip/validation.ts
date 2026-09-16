import type { TripContactDraft, TripServiceKind, TripTravelerDraft } from "./types";

const EN_NAME = /^[A-Za-z\s'-]+$/;

export function validateServicesSelected(services: TripServiceKind[]): string | null {
  if (!services.length) return "اختر خدمة واحدة على الأقل للمتابعة.";
  return null;
}

export function validateTraveler(t: TripTravelerDraft, index: number): Record<string, string> {
  const errors: Record<string, string> = {};
  const prefix = `traveler_${index}`;
  if (!t.firstNameEn.trim()) errors[`${prefix}_firstNameEn`] = "الاسم الأول مطلوب";
  else if (!EN_NAME.test(t.firstNameEn.trim())) {
    errors[`${prefix}_firstNameEn`] = "استخدم أحرفًا إنجليزية كما في الجواز";
  }
  if (!t.lastNameEn.trim()) errors[`${prefix}_lastNameEn`] = "اسم العائلة مطلوب";
  else if (!EN_NAME.test(t.lastNameEn.trim())) {
    errors[`${prefix}_lastNameEn`] = "استخدم أحرفًا إنجليزية كما في الجواز";
  }
  if (!t.dateOfBirth) errors[`${prefix}_dob`] = "تاريخ الميلاد مطلوب";
  if (!t.passportNumber.trim()) errors[`${prefix}_passport`] = "رقم الجواز مطلوب";
  if (!t.passportExpiry) errors[`${prefix}_passportExpiry`] = "تاريخ انتهاء الجواز مطلوب";
  return errors;
}

export function validateContact(c: TripContactDraft): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!c.phone.trim()) errors.phone = "رقم الهاتف مطلوب";
  if (!c.email.trim()) errors.email = "البريد الإلكتروني مطلوب";
  if (c.email !== c.emailConfirm) errors.emailConfirm = "البريد غير متطابق";
  return errors;
}

export function mergeValidationErrors(
  ...maps: Array<Record<string, string>>
): Record<string, string> {
  return Object.assign({}, ...maps);
}

export function firstErrorField(errors: Record<string, string>): string | null {
  const keys = Object.keys(errors);
  return keys.length ? (keys[0] ?? null) : null;
}
