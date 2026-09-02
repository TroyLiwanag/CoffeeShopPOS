import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import { fmt } from "@/lib/pos-store";
import { cn } from "@/lib/utils";

export type SalesChartPoint = {
  label: string;
  fullLabel: string;
  revenue: number;
  orders: number;
};

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "oklch(0.45 0.06 45)",
  },
} satisfies ChartConfig;

type Props = {
  data: SalesChartPoint[];
  emptyMessage?: string;
};

export function SalesTrendChart({ data, emptyMessage = "No sales in this period yet." }: Props) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const hasData = data.length > 0;
  const dense = data.length > 8;

  useEffect(() => {
    setSelectedIndex(null);
  }, [data]);

  const selected = selectedIndex !== null && data[selectedIndex] ? data[selectedIndex] : null;

  if (!hasData) {
    return (
      <div className="flex h-[280px] sm:h-[320px] items-center justify-center rounded-xl border border-dashed bg-muted/20">
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  const handleBarSelect = (index: number) => {
    setSelectedIndex((prev) => (prev === index ? null : index));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 min-h-[4.5rem]">
        {selected ? (
          <div className="text-sm rounded-xl border bg-muted/40 px-4 py-2.5 w-full sm:w-auto animate-fade-in">
            <div className="font-medium text-foreground">{selected.fullLabel}</div>
            <div className="text-primary font-semibold mt-0.5">Revenue: {fmt(selected.revenue)}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {selected.orders} order{selected.orders === 1 ? "" : "s"}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground py-2">
            Tap or click a bar to see revenue for that day
          </p>
        )}
      </div>

      <ChartContainer
        config={chartConfig}
        className="h-[280px] sm:h-[320px] w-full aspect-auto touch-manipulation"
      >
        <BarChart
          data={data}
          margin={{ top: 12, right: 8, left: 4, bottom: dense ? 8 : 0 }}
          onClick={(state) => {
            if (state?.activeTooltipIndex != null && typeof state.activeTooltipIndex === "number") {
              handleBarSelect(state.activeTooltipIndex);
            }
          }}
        >
          <CartesianGrid vertical={false} strokeDasharray="4 4" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            interval={dense ? "preserveStartEnd" : 0}
            angle={dense ? -40 : 0}
            textAnchor={dense ? "end" : "middle"}
            height={dense ? 56 : 32}
            fontSize={11}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            width={56}
            fontSize={11}
            tickFormatter={(v) => {
              const n = Number(v);
              if (n >= 1000) return `₱${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
              return `₱${n}`;
            }}
          />
          <ChartTooltip
            cursor={{ fill: "oklch(0.72 0.12 60 / 0.12)" }}
            trigger="click"
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0].payload as SalesChartPoint;
              return (
                <div className="rounded-lg border border-border/50 bg-background px-3 py-2.5 text-xs shadow-xl min-w-40">
                  <div className="font-medium text-foreground">{row.fullLabel}</div>
                  <div className="text-sm font-semibold text-primary mt-1">{fmt(row.revenue)}</div>
                  <div className="text-muted-foreground mt-0.5">
                    {row.orders} order{row.orders === 1 ? "" : "s"}
                  </div>
                </div>
              );
            }}
          />
          <Bar dataKey="revenue" radius={[6, 6, 0, 0]} maxBarSize={dense ? 40 : 52} minPointSize={4}>
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  selectedIndex === index
                    ? "oklch(0.72 0.12 60)"
                    : "var(--color-revenue)"
                }
                className={cn(
                  "cursor-pointer transition-opacity",
                  selectedIndex === index ? "opacity-100" : "opacity-85 hover:opacity-100",
                )}
                onClick={() => handleBarSelect(index)}
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
}
