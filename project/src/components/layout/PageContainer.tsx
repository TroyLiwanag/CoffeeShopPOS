import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  className?: string;
  /** Wider layout for tables/dashboards */
  wide?: boolean;
  /** Full width without max constraint */
  full?: boolean;
};

export function PageContainer({ children, className, wide, full }: Props) {
  return (
    <div
      className={cn(
        "page-container w-full py-5 sm:py-6 lg:py-8 animate-fade-up",
        wide && "page-container--wide",
        full && "max-w-none",
        className,
      )}
    >
      {children}
    </div>
  );
}
