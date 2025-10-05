import { ReactNode, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "./Button";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={() => onOpenChange(false)}
      />

      {/* Dialog */}
      <div className="relative bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-scale-in">
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "px-6 py-5 border-b border-zinc-200 dark:border-zinc-800",
        className
      )}
    >
      {children}
    </div>
  );
}

export function DialogTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
      {children}
    </h2>
  );
}

export function DialogDescription({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{children}</p>
  );
}

export function DialogContent({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("px-6 py-6 overflow-y-auto", className)}>{children}</div>
  );
}

export function DialogFooter({ children }: { children: ReactNode }) {
  return (
    <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-3">
      {children}
    </div>
  );
}

export function DialogClose({ onClose }: { onClose: () => void }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="absolute top-4 right-4 w-8 h-8 p-0 rounded-full"
      onClick={onClose}
    >
      <X className="w-5 h-5" />
    </Button>
  );
}
