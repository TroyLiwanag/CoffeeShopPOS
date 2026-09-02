import api from "@/lib/api";

export type AttendanceRecord = {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  workDate: string;
  clockIn: string | null;
  clockOut: string | null;
  hoursWorked: number;
  overtimeHours: number;
  notes: string;
  status: "scheduled" | "clocked_in" | "completed";
};

export type MyAttendanceStatus = {
  workDate: string;
  status: "not_clocked_in" | "clocked_in" | "completed";
  record: AttendanceRecord | null;
};

export async function fetchMyAttendanceStatus(): Promise<MyAttendanceStatus> {
  const { data } = await api.get<MyAttendanceStatus>("/attendance/my-status");
  return data;
}

export async function fetchAttendanceList(days = 14, userId?: string): Promise<AttendanceRecord[]> {
  const params: { days: number; userId?: string } = { days };
  if (userId) params.userId = userId;
  const { data } = await api.get<AttendanceRecord[]>("/attendance", { params });
  return data;
}

export async function clockIn(userId?: string, force = false): Promise<AttendanceRecord> {
  const body = userId ? { userId, ...(force ? { force: true } : {}) } : force ? { force: true } : {};
  const { data } = await api.post<AttendanceRecord>("/attendance/clock-in", body);
  return data;
}

export async function clockOut(userId?: string): Promise<AttendanceRecord> {
  const { data } = await api.post<AttendanceRecord>("/attendance/clock-out", userId ? { userId } : {});
  return data;
}

export async function deleteAttendance(id: string): Promise<void> {
  await api.delete(`/attendance/${id}`);
}
