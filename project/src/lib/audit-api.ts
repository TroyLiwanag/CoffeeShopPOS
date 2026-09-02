import api from "@/lib/api";

export type AuditLog = {
  id: number;
  userId: number | null;
  userName: string;
  actionType: string;
  moduleName: string;
  description: string | null;
  ipAddress: string | null;
  deviceInfo: string | null;
  deviceLabel: string;
  createdAt: string;
};

export type AuditFilters = {
  page?: number;
  limit?: number;
  search?: string;
  module?: string;
  userId?: string;
  actionType?: string;
  period?: "all" | "today" | "week" | "month" | "custom";
  dateFrom?: string;
  dateTo?: string;
};

export async function fetchAuditLogs(filters: AuditFilters = {}) {
  const { data } = await api.get("/audit", { params: filters });
  return data as {
    data: AuditLog[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  };
}

export async function fetchAuditModules() {
  const { data } = await api.get<string[]>("/audit/modules");
  return data;
}

export async function fetchAuditUsers() {
  const { data } = await api.get<{ id: number | null; name: string }[]>("/audit/users");
  return data;
}

export async function deleteAuditLog(id: number) {
  await api.delete(`/audit/${id}`);
}

export function getExportCsvUrl(filters: AuditFilters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== "" && v !== "all") params.set(k, String(v));
  });
  const token = localStorage.getItem("auth_token");
  const base = api.defaults.baseURL || "http://localhost:5000/api";
  const qs = params.toString();
  return `${base}/audit/export/csv?${qs}${token ? `&_=${Date.now()}` : ""}`;
}

export async function downloadAuditCsv(filters: AuditFilters = {}) {
  const { data } = await api.get("/audit/export/csv", {
    params: filters,
    responseType: "blob",
  });
  const url = URL.createObjectURL(new Blob([data], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `audit-log-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function openAuditPdf(filters: AuditFilters = {}) {
  const { data } = await api.get("/audit/export/pdf", {
    params: filters,
    responseType: "text",
  });
  const win = window.open("", "_blank");
  if (win) {
    win.document.write(data);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  }
}
