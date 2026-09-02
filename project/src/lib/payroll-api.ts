import api from "@/lib/api";

export type PayrollUser = {
  id: string;
  fullname: string;
  email: string;
  role: "admin" | "staff";
  status: string;
  hourlyRate: number;
  rateUpdatedAt?: string;
  regularHours: number;
  overtimeHours: number;
  hoursSource: "attendance" | "estimated";
  daysRecorded: number;
};

export async function fetchPayrollOverview(days = 7): Promise<PayrollUser[]> {
  const { data } = await api.get<PayrollUser[]>("/payroll/overview", { params: { days } });
  return data;
}

export async function savePayrollRates(
  rates: Array<{ userId: string; hourlyRate: number }>,
  days = 7,
): Promise<PayrollUser[]> {
  const { data } = await api.put<PayrollUser[]>("/payroll/rates", { rates }, { params: { days } });
  return data;
}
