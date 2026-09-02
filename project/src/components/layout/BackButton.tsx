import { useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  label?: string;
};

export function BackButton({ className, label = "Back" }: Props) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.history.back()}
      className={cn(
        "btn-ghost inline-flex items-center gap-2 min-h-[44px] -ml-2 px-3 rounded-lg",
        "text-sm text-muted-foreground hover:text-foreground touch-manipulation",
        className,
      )}
    >
      <ArrowLeft className="w-4 h-4 shrink-0" />
      {label}
    </button>
  );
}
