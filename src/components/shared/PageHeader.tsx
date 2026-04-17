import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ title, description, icon, actions }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6 md:mb-8">
      <div className="flex items-start gap-3 md:gap-4 min-w-0">
        {icon && (
          <div className="hidden sm:flex h-11 w-11 rounded-2xl gradient-primary items-center justify-center glow-primary shadow-lg flex-shrink-0">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight truncate">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground/75 mt-1 line-clamp-2">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}
