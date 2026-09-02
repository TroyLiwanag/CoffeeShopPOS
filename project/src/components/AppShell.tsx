import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { usePos, getExpirationStatus, type Ingredient } from "@/lib/pos-store";
import { fetchPromos, getPromoExpirationStatus, type Promo } from "@/lib/promo-api";
import { fetchMenuItems, type MenuItem } from "@/lib/menu-api";
import { toast } from "sonner";
import {
  Home, Package, BarChart3, Users, Settings, LogOut, Receipt,
  Wallet, FileSearch, Menu, Coffee, X, Clock, Tag, KeyRound, Bell, AlertTriangle,
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { FullScreenLoader } from "@/components/Loader";
import { BackButton } from "@/components/layout/BackButton";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { withActionFeedbackSafe } from "@/lib/action-feedback";
import { useDeliveryLock } from "@/lib/delivery-lock-context";
import { hasPermission } from "@/lib/permissions";
import type { Permissions } from "@/lib/permissions";
import { cn } from "@/lib/utils";

type NavItem = {
  to: string;
  label: string;
  icon: typeof Home;
  permission: keyof Permissions | null;
  adminOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { to: "/pos", label: "POS", icon: Home, permission: "canViewDashboard" },
  { to: "/orders", label: "Orders", icon: Receipt, permission: "canManageOrders" },
  { to: "/menu", label: "Product", icon: Coffee, permission: "canManageMenu" },
  { to: "/inventory", label: "Inventory", icon: Package, permission: "canManageInventory" },
  { to: "/promos", label: "Promos", icon: Tag, permission: "canManagePromos" },
  { to: "/reports", label: "Reports", icon: BarChart3, permission: "canManageReports" },
  { to: "/attendance", label: "Attendance", icon: Clock, permission: "canViewDashboard" },
  { to: "/payroll", label: "Payroll", icon: Wallet, permission: "canManageSales" },
  { to: "/employees", label: "Employees", icon: Users, permission: "canManageUsers" },
  { to: "/verification-codes", label: "Verification Codes", icon: KeyRound, permission: "manage_verification_codes" },
  { to: "/audit", label: "Audit Log", icon: FileSearch, permission: null, adminOnly: true },
  { to: "/settings", label: "Settings", icon: Settings, permission: "canManageSettings" },
];

function NavLinks({
  nav,
  pathname,
  onNavigate,
}: {
  nav: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      {nav.map((item) => {
        const Icon = item.icon;
        const active = pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 px-4 py-3.5 min-h-[48px] rounded-xl text-sm font-medium",
              "transition-all duration-200 touch-manipulation",
              active
                ? "bg-accent text-accent-foreground shadow-md scale-[1.02]"
                : "hover:bg-white/10 hover:translate-x-0.5",
            )}
          >
            <Icon className="w-5 h-5 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

export function AppShell() {
  const { user, logout, settings, hydrated, ingredients } = usePos();
  const { isRouteLocked } = useDeliveryLock();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [navOpen, setNavOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const [promos, setPromos] = useState<Promo[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

  const canPromos = hasPermission(user?.permissions, user?.role || "", "canManagePromos");
  const canInventory = hasPermission(user?.permissions, user?.role || "", "canManageInventory");
  const canMenu =
    hasPermission(user?.permissions, user?.role || "", "canManageMenu") ||
    hasPermission(user?.permissions, user?.role || "", "canManageProducts");

  const refreshAlertData = useCallback(() => {
    if (!user) return;
    if (canPromos) {
      fetchPromos()
        .then((data) => setPromos(data || []))
        .catch(() => {});
    } else {
      setPromos([]);
    }
    if (canMenu) {
      fetchMenuItems()
        .then((data) => setMenuItems(data || []))
        .catch(() => {});
    } else {
      setMenuItems([]);
    }
  }, [user, canPromos, canMenu]);

  useEffect(() => {
    refreshAlertData();
  }, [refreshAlertData, pathname, notifOpen]);

  const expiredList = canInventory
    ? ingredients.filter((i: Ingredient) => getExpirationStatus(i.batchNo)?.type === "expired")
    : [];
  const expiringList = canInventory
    ? ingredients.filter((i: Ingredient) => getExpirationStatus(i.batchNo)?.type === "expiring")
    : [];
  const lowStockList = canInventory
    ? ingredients.filter((i: Ingredient) => (i.stock / (i.min || 1)) * 100 <= 30)
    : [];

  const expiredPromos = canPromos
    ? promos.filter((p: Promo) => {
        const st = getPromoExpirationStatus(p.end_date);
        return st?.type === "expired" || p.status === "Expired";
      })
    : [];

  const expiringPromos = canPromos
    ? promos.filter((p: Promo) => {
        const st = getPromoExpirationStatus(p.end_date);
        return st?.type === "expiring" && p.status !== "Expired";
      })
    : [];

  const outOfStockProducts = canMenu
    ? menuItems.filter((item: MenuItem) => Number(item.stock) <= 0 || item.status === "unavailable")
    : [];

  const totalAlerts =
    expiredList.length +
    expiringList.length +
    lowStockList.length +
    expiredPromos.length +
    expiringPromos.length +
    outOfStockProducts.length;

  const isPosFlow =
    pathname.startsWith("/pos");
  const isReceiptFlow = pathname.startsWith("/receipt");
  const hideAppChrome = isReceiptFlow;

  useEffect(() => {
    if (hydrated && user === null) navigate({ to: "/" });
  }, [user, navigate, hydrated]);

  useEffect(() => {
    if (!user || !hydrated) return;

    if (canInventory && expiredList.length > 0) {
      toast.error(`⚠️ Inventory Alert: ${expiredList.length} item(s) EXPIRED!`, {
        description: expiredList.map((i) => `${i.name} (${getExpirationStatus(i.batchNo)?.label})`).join(", "),
        duration: 7000,
      });
    }

    if (canInventory && expiringList.length > 0) {
      toast.warning(`⏰ Inventory Warning: ${expiringList.length} item(s) expiring within a week!`, {
        description: expiringList.map((i) => `${i.name} (${getExpirationStatus(i.batchNo)?.label})`).join(", "),
        duration: 7000,
      });
    }

    if (canPromos && expiredPromos.length > 0) {
      toast.error(`⚠️ Promo Alert: ${expiredPromos.length} promo(s) EXPIRED!`, {
        description: expiredPromos.map((p) => `${p.promo_name} (${getPromoExpirationStatus(p.end_date)?.label || "Expired"})`).join(", "),
        duration: 7000,
      });
    }

    if (canPromos && expiringPromos.length > 0) {
      toast.warning(`⏰ Promo Warning: ${expiringPromos.length} promo(s) expiring within a week!`, {
        description: expiringPromos.map((p) => `${p.promo_name} (${getPromoExpirationStatus(p.end_date)?.label})`).join(", "),
        duration: 7000,
      });
    }

    if (canMenu && outOfStockProducts.length > 0) {
      toast.error(`⚠️ Product Alert: ${outOfStockProducts.length} product(s) OUT OF STOCK!`, {
        description: outOfStockProducts.map((p) => p.name).join(", "),
        duration: 7000,
      });
    }
  }, [
    user?.id,
    hydrated,
    canPromos,
    canInventory,
    canMenu,
    expiredPromos.length,
    expiringPromos.length,
    expiredList.length,
    expiringList.length,
    outOfStockProducts.length,
  ]);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = navOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [navOpen]);

  useEffect(() => {
    if (!user) return;
    if (isRouteLocked(pathname)) {
      navigate({ to: "/pos" });
    }
  }, [user, pathname, isRouteLocked, navigate]);

  if (!hydrated) return <FullScreenLoader label="Warming the espresso machine" />;
  if (!user) return null;

  const nav = NAV_ITEMS.filter((item) => {
    if (isRouteLocked(item.to)) return false;
    if (item.adminOnly) return user.role === "admin";
    if (!item.permission) return true;
    return hasPermission(user.permissions, user.role, item.permission);
  });

  const sidebarContent = (
    <>
      <div className="px-4 py-5 lg:px-6 lg:py-7 border-b border-white/10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-card/90 flex items-center justify-center shrink-0 shadow-lg overflow-hidden border border-white/20">
            <img
              src="/cafe-corazon-logo.png"
              alt="Cafe Corazon logo"
              className="w-full h-full object-contain p-1"
              onError={(e) => {
                e.currentTarget.src = "/logo.svg";
              }}
            />
          </div>
          <div className="min-w-0">
            <div className="font-display text-base lg:text-lg leading-tight truncate">
              {settings.shopName}
            </div>
            <div className="text-xs opacity-70 mt-0.5 capitalize">{user.role}</div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setNavOpen(false)}
            className="lg:hidden p-2.5 rounded-lg hover:bg-white/10 touch-manipulation"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto overscroll-contain">
        <NavLinks nav={nav} pathname={pathname} onNavigate={() => setNavOpen(false)} />
      </nav>
      <div className="p-3 border-t border-white/10 safe-bottom">
        <div className="px-4 py-2 text-xs opacity-70 truncate">{user.fullname}</div>
        {user.role === "staff" && (
          <button
            type="button"
            onClick={() => {
              setNavOpen(false);
              setLogoutConfirmOpen(true);
            }}
            className="w-full flex items-center gap-3 px-4 py-3.5 min-h-[48px] rounded-xl text-sm font-medium text-red-300 hover:bg-red-500/20 hover:text-red-200 transition-colors touch-manipulation"
          >
            <LogOut className="w-5 h-5 shrink-0" /> Logout
          </button>
        )}
      </div>
    </>
  );

  return (
    <div
      className={cn(
        "flex min-h-[100dvh] overflow-x-hidden",
        hideAppChrome ? "bg-white" : "bg-background",
      )}
    >
      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          navOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
        onClick={() => setNavOpen(false)}
        aria-hidden
      />

      {/* Sidebar */}
      {!hideAppChrome && (
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-[min(280px,88vw)] bg-primary text-primary-foreground flex flex-col",
            "shadow-2xl transition-transform duration-300 ease-out will-change-transform",
            "lg:static lg:translate-x-0 lg:w-56 xl:w-60 lg:shadow-none",
            navOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          {sidebarContent}
        </aside>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 h-[100dvh] max-h-[100dvh]">
        {!hideAppChrome && (
          <header className={cn(
            "sticky top-0 z-30 glass-bar border-b safe-top shrink-0",
            isPosFlow && "lg:hidden",
          )}>
            <div className="page-container flex items-center gap-3 py-3 sm:py-4">
              <button
                type="button"
                onClick={() => setNavOpen(true)}
                className="lg:hidden flex items-center justify-center w-11 h-11 rounded-xl border bg-card/80 hover:bg-muted shadow-sm touch-manipulation transition-transform active:scale-95"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              {!isPosFlow && <BackButton className="flex-1 sm:flex-none" />}
              {isPosFlow && (
                <div className="flex-1 min-w-0 lg:hidden">
                  <div className="font-display text-base truncate">{settings.shopName}</div>
                  <div className="text-xs text-muted-foreground capitalize">{user.role}</div>
                </div>
              )}

              <div className="relative ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setNotifOpen(!notifOpen)}
                  className="relative p-2.5 rounded-xl border bg-card/80 hover:bg-muted shadow-sm touch-manipulation transition-transform active:scale-95"
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5 text-foreground" />
                  {totalAlerts > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[11px] font-bold animate-pulse">
                      {totalAlerts}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 top-12 z-50 w-80 sm:w-96 rounded-2xl border bg-card p-4 shadow-xl animate-scale-in">
                    <div className="flex items-center justify-between border-b pb-2 mb-3">
                      <div className="font-display font-semibold text-base flex items-center gap-2">
                        <Bell className="w-4 h-4 text-accent" /> Alerts & Notifications
                      </div>
                      <span className="text-xs text-muted-foreground">{totalAlerts} active</span>
                    </div>

                    <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                      {totalAlerts === 0 ? (
                        <div className="text-sm text-muted-foreground text-center py-4">
                          No active expiration or stock alerts.
                        </div>
                      ) : (
                        <>
                          {/* Red Critical Alerts */}
                          {expiredList.map((i) => {
                            const st = getExpirationStatus(i.batchNo);
                            return (
                              <Link
                                key={`exp-${i.id}`}
                                to="/inventory"
                                onClick={() => setNotifOpen(false)}
                                className="flex items-center justify-between p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-xs hover:bg-destructive/20 transition-all touch-manipulation"
                              >
                                <div className="flex items-center gap-2 font-medium text-destructive">
                                  <AlertTriangle className="w-4 h-4 shrink-0" />
                                  <span>{i.name}</span>
                                </div>
                                <span className="font-semibold px-2 py-0.5 rounded bg-destructive text-destructive-foreground">
                                  {st?.label}
                                </span>
                              </Link>
                            );
                          })}

                          {expiredPromos.map((p) => {
                            const st = getPromoExpirationStatus(p.end_date);
                            return (
                              <Link
                                key={`promo-exp-${p.id}`}
                                to="/promos"
                                onClick={() => setNotifOpen(false)}
                                className="flex items-center justify-between p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-xs hover:bg-destructive/20 transition-all touch-manipulation"
                              >
                                <div className="flex items-center gap-2 font-medium text-destructive">
                                  <Tag className="w-4 h-4 shrink-0" />
                                  <span>Promo: {p.promo_name}</span>
                                </div>
                                <span className="font-semibold px-2 py-0.5 rounded bg-destructive text-destructive-foreground">
                                  {st?.label || "Expired"}
                                </span>
                              </Link>
                            );
                          })}

                          {outOfStockProducts.map((p) => (
                            <Link
                              key={`prod-out-${p.id}`}
                              to="/menu"
                              onClick={() => setNotifOpen(false)}
                              className="flex items-center justify-between p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-xs hover:bg-destructive/20 transition-all touch-manipulation"
                            >
                              <div className="flex items-center gap-2 font-medium text-destructive">
                                <Coffee className="w-4 h-4 shrink-0" />
                                <span>Product: {p.name}</span>
                              </div>
                              <span className="font-semibold px-2 py-0.5 rounded bg-destructive text-destructive-foreground">
                                Out of Stock
                              </span>
                            </Link>
                          ))}

                          {/* Orange Warning Alerts */}
                          {expiringList.map((i) => {
                            const st = getExpirationStatus(i.batchNo);
                            return (
                              <Link
                                key={`expiring-${i.id}`}
                                to="/inventory"
                                onClick={() => setNotifOpen(false)}
                                className="flex items-center justify-between p-2.5 rounded-xl bg-warning/10 border border-warning/20 text-xs hover:bg-warning/20 transition-all touch-manipulation"
                              >
                                <div className="flex items-center gap-2 font-medium text-warning">
                                  <Clock className="w-4 h-4 shrink-0" />
                                  <span>{i.name}</span>
                                </div>
                                <span className="font-semibold px-2 py-0.5 rounded bg-warning/20 text-warning">
                                  {st?.label}
                                </span>
                              </Link>
                            );
                          })}

                          {expiringPromos.map((p) => {
                            const st = getPromoExpirationStatus(p.end_date);
                            return (
                              <Link
                                key={`promo-expiring-${p.id}`}
                                to="/promos"
                                onClick={() => setNotifOpen(false)}
                                className="flex items-center justify-between p-2.5 rounded-xl bg-warning/10 border border-warning/20 text-xs hover:bg-warning/20 transition-all touch-manipulation"
                              >
                                <div className="flex items-center gap-2 font-medium text-warning">
                                  <Tag className="w-4 h-4 shrink-0" />
                                  <span>Promo: {p.promo_name}</span>
                                </div>
                                <span className="font-semibold px-2 py-0.5 rounded bg-warning/20 text-warning">
                                  {st?.label}
                                </span>
                              </Link>
                            );
                          })}

                          {lowStockList.map((i) => (
                            <Link
                              key={`low-${i.id}`}
                              to="/inventory"
                              onClick={() => setNotifOpen(false)}
                              className="flex items-center justify-between p-2.5 rounded-xl bg-warning/10 border border-warning/20 text-xs hover:bg-warning/20 transition-all touch-manipulation"
                            >
                              <div className="flex items-center gap-2 font-medium text-warning">
                                <Package className="w-4 h-4 shrink-0" />
                                <span>{i.name}</span>
                              </div>
                              <span className="font-semibold px-2 py-0.5 rounded bg-warning/20 text-warning">
                                Low Stock ({i.stock} {i.unit})
                              </span>
                            </Link>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>
        )}

        <main
          className={cn(
            "flex-1 min-h-0 overflow-x-hidden",
            isPosFlow ? "flex flex-col min-h-0 overflow-hidden" : "overflow-y-auto",
          )}
        >
          <Outlet />
        </main>
      </div>

      <ConfirmDeleteModal
        open={logoutConfirmOpen}
        title="Log out"
        message="Are you sure???"
        detail="You will need to sign in again to use the app."
        confirmLabel="Log out"
        onClose={() => setLogoutConfirmOpen(false)}
        onConfirm={async () => {
          await withActionFeedbackSafe(
            async () => {
              await logout();
              navigate({ to: "/" });
            },
            {
              loading: "Signing out…",
              success: "Signed out.",
            },
          );
        }}
      />
    </div>
  );
}
