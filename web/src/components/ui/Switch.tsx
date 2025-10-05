import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface SwitchProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onChange, disabled, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        role="switch"
        aria-checked={checked}
        type="button"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "bg-primary" : "bg-zinc-200 dark:bg-zinc-700",
          className
        )}
        {...props}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm",
            checked ? "translate-x-6" : "translate-x-1"
          )}
        />
      </button>
    );
  }
);
Switch.displayName = "Switch";

export { Switch };
