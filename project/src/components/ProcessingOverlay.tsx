import { Check, AlertCircle } from "lucide-react";
import { BeansSpinner } from "@/components/Loader";
import { cn } from "@/lib/utils";

export type ProcessingState = "idle" | "processing" | "success" | "error";

type Props = {
  state: ProcessingState;
  processingLabel?: string;
  successLabel?: string;
  errorLabel?: string;
  className?: string;
};

export function ProcessingOverlay({
  state,
  processingLabel = "Processing…",
  successLabel = "Done!",
  errorLabel = "Something went wrong",
  className,
}: Props) {
  if (state === "idle") return null;

  return (
    <div
      className={cn(
        "absolute inset-0 z-30 flex flex-col items-center justify-center rounded-2xl",
        "bg-card/95 backdrop-blur-md animate-fade-in",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      {state === "processing" && (
        <>
          <BeansSpinner size={52} />
          <p className="mt-5 font-display text-lg text-foreground">{processingLabel}</p>
          <p className="text-sm text-muted-foreground mt-1">Please wait…</p>
        </>
      )}
      {state === "success" && (
        <>
          <div className="w-16 h-16 rounded-full bg-success/15 flex items-center justify-center animate-scale-in">
            <Check className="w-9 h-9 text-success" strokeWidth={2.5} />
          </div>
          <p className="mt-5 font-display text-xl text-foreground">{successLabel}</p>
          <p className="text-sm text-muted-foreground mt-1">All set</p>
        </>
      )}
      {state === "error" && (
        <>
          <div className="w-16 h-16 rounded-full bg-destructive/15 flex items-center justify-center animate-scale-in">
            <AlertCircle className="w-9 h-9 text-destructive" strokeWidth={2.5} />
          </div>
          <p className="mt-5 font-display text-lg text-foreground">{errorLabel}</p>
          <p className="text-sm text-muted-foreground mt-1">Please try again</p>
        </>
      )}
    </div>
  );
}
