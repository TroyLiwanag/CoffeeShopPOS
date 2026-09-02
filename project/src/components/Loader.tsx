/**
 * Coffee-themed loading animations for Cafe Corazon.
 *
 * - <CoffeeCupLoader />  : animated steaming cup (splash / page loading)
 * - <BeansSpinner />     : circular beans orbiting (inline spinner)
 * - <DotsLoader />       : 3 bouncing dots (button-friendly)
 * - <Skeleton />         : shimmer placeholder
 * - <FullScreenLoader /> : centered overlay with the coffee cup + label
 */

import { cn } from "@/lib/utils";

export function CoffeeCupLoader({ size = 72 }: { size?: number }) {
  return (
    <div className="relative inline-flex flex-col items-center" style={{ width: size }}>
      {/* steam */}
      <div className="relative h-8 w-full flex justify-center gap-1.5">
        {[0, 0.4, 0.8].map((d, i) => (
          <span
            key={i}
            className="block w-1.5 rounded-full bg-accent/70"
            style={{
              height: 14,
              animation: `steam 1.8s ease-in-out ${d}s infinite`,
              transformOrigin: "bottom center",
            }}
          />
        ))}
      </div>

      {/* cup */}
      <div
        className="relative"
        style={{ animation: "cup-bob 2.2s ease-in-out infinite" }}
      >
        <div
          className="relative rounded-b-[28px] rounded-t-md bg-primary shadow-lg overflow-hidden"
          style={{ width: size, height: size * 0.72 }}
        >
          {/* coffee fill */}
          <div
            className="absolute inset-x-0 bottom-0 bg-accent"
            style={{ animation: "pour-fill 2.4s ease-in-out infinite alternate" }}
          />
          {/* rim */}
          <div className="absolute inset-x-2 top-1 h-1.5 rounded-full bg-cream/40" />
        </div>
        {/* handle */}
        <div
          className="absolute top-1/4 -right-3 border-4 border-primary rounded-full"
          style={{ width: size * 0.32, height: size * 0.4 }}
        />
        {/* saucer */}
        <div
          className="mx-auto -mt-1 h-1.5 rounded-full bg-espresso/40"
          style={{ width: size * 1.2 }}
        />
      </div>
    </div>
  );
}

export function BeansSpinner({ size = 64 }: { size?: number }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="absolute top-1/2 left-1/2 -ml-1.5 -mt-1.5 block w-3 h-3 rounded-full bg-accent"
          style={{
            animation: `bean-spin 1.2s linear infinite`,
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
      <span className="absolute inset-0 m-auto block w-2 h-2 rounded-full bg-primary" />
    </div>
  );
}

export function DotsLoader({ className }: { className?: string }) {
  return (
    <span className={cn("dot-loader inline-flex items-center", className)}>
      <span /><span /><span />
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-md", className)} />;
}

export function FullScreenLoader({ label = "Brewing your screen…" }: { label?: string }) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 animate-fade-up"
      style={{ background: "linear-gradient(135deg, var(--cream), var(--background))" }}
    >
      <CoffeeCupLoader size={88} />
      <div className="font-display text-2xl text-primary">Cafe Corazon</div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {label} <DotsLoader className="text-accent" />
      </div>
    </div>
  );
}
