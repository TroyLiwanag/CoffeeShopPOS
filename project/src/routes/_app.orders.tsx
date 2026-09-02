import { createFileRoute, Link } from "@tanstack/react-router";
import { usePos, fmt, formatOrderNumber } from "@/lib/pos-store";
import { PageContainer } from "@/components/layout/PageContainer";

export const Route = createFileRoute("/_app/orders")({
  component: OrdersScreen,
});

function OrdersScreen() {
  const { orders } = usePos();
  return (
    <PageContainer>
      <h1 className="font-display text-responsive-3xl mb-4 sm:mb-6">Recent Orders</h1>
      {orders.length === 0 ? (
        <div className="bg-card rounded-2xl border p-12 text-center text-muted-foreground">
          No orders yet today.
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(o => (
            <Link key={o.id} to="/receipt/$id" params={{ id: o.id }}
                  className="block bg-card rounded-xl border p-4 sm:p-5 hover-card touch-manipulation">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                <div>
                  <div className="font-display text-lg">Order #{formatOrderNumber(o.number, o.createdAt)}</div>
                  <div className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleString()} · {o.cashier} · {o.method}</div>
                  <div className="text-sm mt-2 text-muted-foreground">
                    {o.items.map(i => `${i.qty}× ${i.product.name}`).join(", ")}
                  </div>
                </div>
                <div className="font-display text-xl text-primary">{fmt(o.total)}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
