/** Map Hotelbeds / provider English errors to Arabic user copy. */
export function humanizeHotelSearchError(message: string): string {
  const m = String(message || "").trim();
  if (/quota has been exceeded/i.test(m)) {
    return "تم تجاوز حد طلبات مزود الفنادق التجريبي مؤقتًا. أعد المحاولة بعد قليل، أو حدّث الصفحة إن كانت النتائج محفوظة.";
  }
  if (/too many requests|rate limit/i.test(m)) {
    return "طلبات كثيرة جدًا. انتظر لحظات ثم أعد المحاولة.";
  }
  if (/checkIn must be prior to checkOut/i.test(m)) {
    return "تاريخ المغادرة يجب أن يكون بعد تاريخ الوصول.";
  }
  return m || "فشل البحث عن الفنادق";
}
