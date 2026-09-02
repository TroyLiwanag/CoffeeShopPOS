import api from "@/lib/api";

export type Promo = {
  id: number;
  promo_name: string;
  description: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  eligible_customer: string;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  status: "Active" | "Inactive" | "Expired" | "Scheduled" | "Disabled";
  created_by_name: string;
  usage_count?: number;
  created_at: string;
  updated_at: string;
};

export type PromoHistory = {
  id: number;
  promo_id: number | null;
  promo_name: string;
  action: string;
  performed_by_name: string;
  order_number: number | null;
  created_at: string;
};

export type PromoStats = {
  totalPromos: number;
  activePromos: number;
  expiredPromos: number;
  usageToday: number;
};

export async function fetchPromos(): Promise<Promo[]> {
  const { data } = await api.get<Promo[]>("/promos");
  return data;
}

export async function fetchPromoHistory(): Promise<PromoHistory[]> {
  const { data } = await api.get<PromoHistory[]>("/promos/history");
  return data;
}

export async function fetchPromoStats(): Promise<PromoStats> {
  const { data } = await api.get<PromoStats>("/promos/stats");
  return data;
}

export async function createPromo(data: Partial<Promo>): Promise<Promo> {
  const { data: resData } = await api.post<Promo>("/promos", data);
  return resData;
}

export async function updatePromo(id: number, data: Partial<Promo>): Promise<Promo> {
  const { data: resData } = await api.put<Promo>(`/promos/${id}`, data);
  return resData;
}

export async function deletePromo(id: number): Promise<{ message: string }> {
  const { data: resData } = await api.delete<{ message: string }>(`/promos/${id}`);
  return resData;
}

export type PromoExpirationStatus =
  | { type: "expired"; daysPast: number; label: string }
  | { type: "expiring"; daysLeft: number; label: string }
  | { type: "valid"; daysLeft: number; label: string }
  | null;

export function getPromoExpirationStatus(endDateStr?: string | null): PromoExpirationStatus {
  if (!endDateStr || !endDateStr.trim()) return null;
  const dateObj = new Date(endDateStr);
  if (isNaN(dateObj.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(dateObj);
  target.setHours(0, 0, 0, 0);

  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { type: "expired", daysPast: Math.abs(diffDays), label: `Expired ${Math.abs(diffDays)}d ago` };
  }
  if (diffDays === 0) {
    return { type: "expiring", daysLeft: 0, label: "Expires Today" };
  }
  if (diffDays === 1) {
    return { type: "expiring", daysLeft: 1, label: "Expires Tomorrow (1d)" };
  }
  if (diffDays <= 7) {
    return { type: "expiring", daysLeft: diffDays, label: `Expires in ${diffDays} days` };
  }
  return { type: "valid", daysLeft: diffDays, label: endDateStr };
}
