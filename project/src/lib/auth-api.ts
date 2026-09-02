import api from "@/lib/api";

export async function requestPasswordReset(email: string) {
  const { data } = await api.post<{
    message: string;
    devMode?: boolean;
    devCode?: string;
  }>("/auth/forgot-password", { email: email.trim() });
  return data;
}

export async function verifyResetCode(email: string, code: string) {
  const { data } = await api.post<{ message: string }>("/auth/verify-reset-code", {
    email: email.trim(),
    code: code.trim(),
  });
  return data;
}

export async function resetPasswordWithCode(
  email: string,
  code: string,
  newPassword: string,
) {
  const { data } = await api.post<{ message: string }>("/auth/reset-password", {
    email: email.trim(),
    code: code.trim(),
    newPassword,
  });
  return data;
}

export type VerificationCodeItem = {
  id: number;
  staffName: string;
  email: string;
  code: string | null;
  status: "Active" | "Used" | "Expired";
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
  generatedBy: string;
  userId: number;
};

export async function fetchVerificationCodes(params?: {
  search?: string;
  status?: string;
  sort?: string;
}) {
  const { data } = await api.get<VerificationCodeItem[]>("/verification-codes", { params });
  return data;
}

export async function adminGenerateVerificationCode(email: string) {
  const { data } = await api.post<{
    message: string;
    code: string;
    id: number;
    staffName: string;
    email: string;
    expiresAt: string;
  }>("/verification-codes/generate", { email: email.trim() });
  return data;
}

export async function markVerificationCodeUsed(id: number) {
  const { data } = await api.put<{ message: string; email: string; staffName: string }>(
    `/verification-codes/${id}/used`,
  );
  return data;
}

export async function deleteVerificationCode(id: number) {
  const { data } = await api.delete<{ message: string }>(`/verification-codes/${id}`);
  return data;
}

export async function deleteVerificationCodes(ids: number[]) {
  const { data } = await api.delete<{ message: string }>("/verification-codes/bulk", {
    data: { ids },
  });
  return data;
}

export async function deleteAllVerificationCodes() {
  const { data } = await api.delete<{ message: string }>("/verification-codes/all");
  return data;
}
