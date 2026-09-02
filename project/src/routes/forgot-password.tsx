import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, KeyRound, Lock, Mail, ShieldCheck, Info } from "lucide-react";
import { DotsLoader } from "@/components/Loader";
import {
  requestPasswordReset,
  resetPasswordWithCode,
} from "@/lib/auth-api";
import { toast } from "sonner";
import axios from "axios";

type ForgotSearch = {
  email?: string;
};

export const Route = createFileRoute("/forgot-password")({
  validateSearch: (search: Record<string, unknown>): ForgotSearch => ({
    email: typeof search.email === "string" ? search.email : undefined,
  }),
  component: ForgotPasswordScreen,
});

type Step = "request" | "reset" | "done";

function ForgotPasswordScreen() {
  const navigate = useNavigate();
  const { email: initialEmail } = Route.useSearch();
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState(initialEmail || "");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [noticeMessage, setNoticeMessage] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialEmail) setEmail(initialEmail);
  }, [initialEmail]);

  const apiError = (error: unknown, fallback: string) => {
    if (axios.isAxiosError(error)) {
      return (error.response?.data as { message?: string })?.message || fallback;
    }
    return fallback;
  };

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!email.trim()) {
      setErr("Please enter your registered email address.");
      return;
    }
    setLoading(true);
    const toastId = toast.loading("Generating verification code…");
    try {
      const result = await requestPasswordReset(email.trim());
      const msg =
        result.message ||
        "Your verification code has been generated. Please contact your administrator to obtain the code.";
      toast.success("Verification code requested.", { id: toastId });
      setNoticeMessage(msg);
      setStep("reset");
    } catch (error) {
      const message = apiError(error, "Could not generate verification code.");
      toast.error(message, { id: toastId });
      setErr(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");

    if (!email.trim()) {
      setErr("Please enter your registered email address.");
      return;
    }
    if (!/^\d{6}$/.test(code.trim())) {
      setErr("Please enter a valid 6-digit numeric verification code.");
      return;
    }
    if (newPassword.length < 6) {
      setErr("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErr("Passwords do not match.");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Updating password…");
    try {
      const result = await resetPasswordWithCode(email.trim(), code.trim(), newPassword);
      toast.success(result.message || "Password updated successfully!", { id: toastId });
      setStep("done");
    } catch (error) {
      const message = apiError(error, "Could not reset password.");
      toast.error(message, { id: toastId });
      setErr(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 py-10"
      style={{ background: "linear-gradient(135deg, var(--cream), var(--background))" }}
    >
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-full bg-card flex items-center justify-center shadow-lg border-4 border-card">
            <KeyRound className="w-9 h-9 text-primary" />
          </div>
          <h1 className="font-display text-3xl mt-4 text-foreground">Reset Password</h1>
          <p className="text-sm text-muted-foreground mt-1 text-center">
            {step === "request" && "Enter your registered email to request a reset code from your admin."}
            {step === "reset" && "Enter your email, admin-provided 6-digit code, and new password."}
            {step === "done" && "Your password has been successfully updated."}
          </p>
        </div>

        <div className="bg-card rounded-2xl shadow-xl p-8 border space-y-5">
          {step === "request" && (
            <form onSubmit={handleRequestCode} className="space-y-5">
              <div>
                <label className="text-sm font-medium text-foreground">Registered Email</label>
                <div className="relative mt-2">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="staff@example.com"
                    autoComplete="email"
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              {err && <ErrorBox message={err} />}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-80"
              >
                {loading ? (
                  <>
                    Requesting <DotsLoader className="text-primary-foreground" />
                  </>
                ) : (
                  "Request Verification Code"
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setStep("reset")}
                  className="text-xs text-primary hover:underline"
                >
                  Already have a code from your administrator? Reset now
                </button>
              </div>
            </form>
          )}

          {step === "reset" && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              {noticeMessage && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-foreground space-y-1.5 flex gap-3 items-start">
                  <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-primary">Verification Code Generated</p>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                      {noticeMessage}
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-foreground">Registered Email</label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="staff@example.com"
                    autoComplete="email"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">6-Digit Verification Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  autoComplete="one-time-code"
                  required
                  className="mt-1.5 w-full px-4 py-2.5 rounded-lg border border-input bg-background text-center text-xl tracking-[0.3em] font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Obtain this 6-digit code from your system administrator. Code expires in 10 minutes.
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">New Password</label>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-sm tracking-widest focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  className="mt-1.5 w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm tracking-widest focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {err && <ErrorBox message={err} />}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-80"
              >
                {loading ? (
                  <>
                    Updating Password <DotsLoader className="text-primary-foreground" />
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" /> Reset Password
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setErr("");
                  setStep("request");
                }}
                className="w-full text-xs text-muted-foreground hover:text-foreground text-center"
              >
                Request code for a different email
              </button>
            </form>
          )}

          {step === "done" && (
            <div className="space-y-5 text-center">
              <div className="mx-auto w-14 h-14 rounded-full bg-accent/15 flex items-center justify-center">
                <ShieldCheck className="w-7 h-7 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-foreground">Password Reset Complete!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  You can now sign in to your station using your new password.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate({ to: "/" })}
                className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition"
              >
                Back to Sign In
              </button>
            </div>
          )}
        </div>

        {step !== "done" && (
          <Link
            to="/"
            className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Sign In
          </Link>
        )}
      </div>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
      {message}
    </div>
  );
}
