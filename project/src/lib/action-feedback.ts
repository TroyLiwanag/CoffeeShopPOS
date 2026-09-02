import { toast } from "sonner";

export type FeedbackMessages = {
  loading: string;
  success: string;
  error?: string;
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function extractErrorMessage(err: unknown, fallback?: string): string {
  if (typeof err === "object" && err !== null) {
    const axiosErr = err as {
      response?: { data?: { message?: string; error?: string } };
      message?: string;
    };
    if (axiosErr.response?.data?.message) {
      return String(axiosErr.response.data.message);
    }
    if (axiosErr.response?.data?.error) {
      return String(axiosErr.response.data.error);
    }
    if (axiosErr.message && axiosErr.message !== "Network Error") {
      return axiosErr.message;
    }
  }
  if (typeof err === "string" && err.trim()) {
    return err;
  }
  return fallback || "Something went wrong. Please try again.";
}

/** Toast-based loading → success/error for exports, saves, deletes, etc. */
export async function withActionFeedback<T>(
  fn: () => Promise<T>,
  messages: FeedbackMessages,
  options?: { successPauseMs?: number },
): Promise<T> {
  const id = toast.loading(messages.loading);
  try {
    const result = await fn();
    toast.success(messages.success, { id, duration: 2800 });
    if (options?.successPauseMs) await delay(options.successPauseMs);
    return result;
  } catch (err) {
    const msg = extractErrorMessage(err, messages.error);
    toast.error(msg, { id, duration: 4500 });
    throw err;
  }
}

/** Fire-and-forget variant (does not rethrow). */
export async function withActionFeedbackSafe<T>(
  fn: () => Promise<T>,
  messages: FeedbackMessages,
): Promise<T | undefined> {
  try {
    return await withActionFeedback(fn, messages);
  } catch {
    return undefined;
  }
}
