import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?:        ReactNode;
  emoji?:       string;
  title:        string;
  description?: string;
  action?:      { label: string; onClick: () => void };
  className?:   string;
}

export function EmptyState({ icon, emoji, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 text-center px-4", className)}>
      {emoji ? (
        <p className="text-5xl mb-4">{emoji}</p>
      ) : icon ? (
        <div className="text-gray-300 mb-4">{icon}</div>
      ) : null}
      <p className="font-semibold text-gray-700 mb-1">{title}</p>
      {description && <p className="text-sm text-gray-400 max-w-xs">{description}</p>}
      {action && (
        <Button variant="outline" size="sm" className="mt-4" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}