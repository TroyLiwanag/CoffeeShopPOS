import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { usePos } from "@/lib/pos-store";
import { canAccessRoute } from "@/lib/permissions";
import { useDeliveryLock } from "@/lib/delivery-lock-context";
import { FullScreenLoader } from "@/components/Loader";

export function PermissionGate({
  path,
  children,
}: {
  path: string;
  children: React.ReactNode;
}) {
  const { user, hydrated } = usePos();
  const navigate = useNavigate();
  const { isRouteLocked } = useDeliveryLock();
  const deliveryLocked = isRouteLocked(path);
  const allowed =
    !!user && canAccessRoute(path, user.permissions, user.role) && !deliveryLocked;

  useEffect(() => {
    if (!hydrated || !user) return;
    if (!allowed) {
      navigate({ to: "/pos" });
    }
  }, [hydrated, user, allowed, navigate]);

  if (!hydrated) return <FullScreenLoader label="Loading" />;
  if (!user) return null;
  if (!allowed) return null;

  return <>{children}</>;
}
