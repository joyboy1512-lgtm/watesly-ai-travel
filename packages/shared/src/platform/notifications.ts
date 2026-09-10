export type CustomerNotificationChannel = "in_app" | "email" | "whatsapp" | "push";

export type CustomerNotification = {
  id: string;
  customerId: string;
  type:
    | "booking_confirmed"
    | "payment_confirmed"
    | "flight_changed"
    | "hotel_confirmed"
    | "price_drop"
    | "deal"
    | "points"
    | "reward"
    | "general";
  title: string;
  body: string;
  read: boolean;
  channels: CustomerNotificationChannel[];
  createdAt: string;
  href?: string;
};

export function createNotification(
  partial: Omit<CustomerNotification, "id" | "read" | "createdAt"> & {
    id?: string;
    read?: boolean;
    createdAt?: string;
  },
): CustomerNotification {
  return {
    id: partial.id || `ntf_${Date.now().toString(36)}`,
    customerId: partial.customerId,
    type: partial.type,
    title: partial.title,
    body: partial.body,
    read: partial.read ?? false,
    channels: partial.channels?.length ? partial.channels : ["in_app"],
    createdAt: partial.createdAt || new Date().toISOString(),
    href: partial.href,
  };
}
