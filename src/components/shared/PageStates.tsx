import { Loader2, Inbox, AlertCircle } from "lucide-react";

export function LoadingState({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
      <div className="relative">
        <div className="h-12 w-12 rounded-2xl gradient-primary flex items-center justify-center glow-primary">
          <Loader2 className="h-6 w-6 animate-spin text-white" />
        </div>
      </div>
      <p className="mt-4 text-sm text-muted-foreground/75">{message}</p>
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
      <div className="h-16 w-16 rounded-2xl bg-card/60 border border-border/30 flex items-center justify-center mb-5">
        <Inbox className="h-7 w-7 text-muted-foreground/50" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-1.5 text-sm text-muted-foreground/70 max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message = "Something went wrong", onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
      <div className="h-16 w-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mb-5">
        <AlertCircle className="h-7 w-7 text-destructive/70" />
      </div>
      <p className="text-sm text-foreground/80">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-3 text-sm text-primary hover:text-primary/80 font-medium transition-colors">
          Try again
        </button>
      )}
    </div>
  );
}
