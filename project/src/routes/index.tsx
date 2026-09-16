import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { usePos, type User } from "@/lib/pos-store";
import { DotsLoader, FullScreenLoader } from "@/components/Loader";
import { toast } from "sonner";
import { Eye, EyeOff, ShieldCheck, UserCheck, Clock, ArrowRight, X, Coffee } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: LoginScreen,
});

function LoginScreen() {
  const { user, login, logout, hydrated } = usePos();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [authenticatedUser, setAuthenticatedUser] = useState<User | null>(null);

  // If already authenticated and modal is not shown, redirect to dashboard
  useEffect(() => {
    if (user && !confirmModalOpen && !authenticatedUser) {
      navigate({ to: "/dashboard" });
    }
  }, [user, confirmModalOpen, authenticatedUser, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    const toastId = toast.loading("Verifying station credentials…");
    const result = await login(email.trim(), password);
    setLoading(false);

    if (result.ok) {
      toast.success("Credentials verified! Please confirm your station shift.", { id: toastId });
      setConfirmModalOpen(true);
    } else {
      const msg = result.message || "Invalid email or password.";
      toast.error(msg, { id: toastId });
      setErr(msg);
    }
  };

  const handleEnterStation = () => {
    setConfirmModalOpen(false);
    toast.success(`Welcome to Café Corazon, ${user?.fullname || "Staff"}! 👋`);
    navigate({ to: "/dashboard" });
  };

  const handleCancelLogin = async () => {
    setConfirmModalOpen(false);
    await logout();
    setPassword("");
  };

  if (!hydrated) return <FullScreenLoader label="Warming the espresso machine" />;

  const activeUser = authenticatedUser || user;

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: "linear-gradient(135deg, var(--cream), var(--background))" }}
    >
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-28 h-28 rounded-full bg-card flex items-center justify-center shadow-lg overflow-hidden border-4 border-card">
            <img
              src="/cafe-corazon-logo.png"
              alt="Cafe Corazon logo"
              className="w-full h-full object-contain p-1"
              onError={(e) => {
                e.currentTarget.src = "/logo.svg";
              }}
            />
          </div>
          <h1 className="font-display text-3xl mt-4 text-foreground">Cafe Corazon</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in to your station</p>
        </div>

        <form onSubmit={submit} className="bg-card rounded-2xl shadow-xl p-8 space-y-5 border">
          <div>
            <label className="text-sm font-medium text-foreground">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              autoComplete="email"
              className="mt-2 w-full px-4 py-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Password</label>
            <div className="relative mt-2">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                className={cn(
                  "w-full px-4 py-3 pr-12 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring text-foreground",
                  !showPassword && password ? "tracking-widest" : "",
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition p-1"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <div className="mt-2 text-right">
              <Link
                to="/forgot-password"
                search={email.trim() ? { email: email.trim() } : {}}
                className="text-sm text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          </div>
          {err && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
              {err}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-80 touch-manipulation active:scale-95 shadow-md"
          >
            {loading ? (
              <>
                Brewing <DotsLoader className="text-primary-foreground" />
              </>
            ) : (
              "Log in"
            )}
          </button>
        </form>
      </div>

      {/* Interactive Station & Shift Login Confirmation Modal */}
      {confirmModalOpen && activeUser && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 modal-backdrop animate-fade-in"
          onClick={() => {}}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="modal-panel relative w-full max-w-md bg-card rounded-2xl border p-6 shadow-2xl space-y-5 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-3.5">
              <div className="flex items-center gap-2.5 text-accent">
                <ShieldCheck className="w-6 h-6 shrink-0" />
                <h2 className="font-display text-xl font-bold">Station Shift Login</h2>
              </div>
              <button
                type="button"
                onClick={handleCancelLogin}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-accent/10 border border-accent/30 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-accent text-accent-foreground font-display text-xl font-bold flex items-center justify-center shrink-0 shadow-md">
                    {activeUser.fullname.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-lg font-bold text-foreground truncate">
                      {activeUser.fullname}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary text-primary-foreground uppercase tracking-wider">
                        {activeUser.role}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">{activeUser.email}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-accent/20 text-xs text-muted-foreground space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Clock className="w-3.5 h-3.5 text-accent" /> Shift Start Time:
                    </span>
                    <strong className="text-foreground font-mono">{new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Coffee className="w-3.5 h-3.5 text-accent" /> Assigned Station:
                    </span>
                    <strong className="text-foreground">Main Counter POS & Management</strong>
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Please confirm to enter your station shift and start processing transactions.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleCancelLogin}
                className="w-full sm:w-auto px-4 py-3 rounded-xl border bg-card hover:bg-muted text-xs font-semibold touch-manipulation active:scale-95 transition-transform"
              >
                Switch Account
              </button>
              <button
                type="button"
                onClick={handleEnterStation}
                className="w-full sm:flex-1 py-3 rounded-xl bg-accent text-accent-foreground text-sm font-bold shadow-md hover:opacity-90 touch-manipulation active:scale-95 transition-transform inline-flex items-center justify-center gap-2"
              >
                Enter Station <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
