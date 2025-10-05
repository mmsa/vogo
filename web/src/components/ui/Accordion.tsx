import { ReactNode, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccordionProps {
  children: ReactNode;
}

export function Accordion({ children }: AccordionProps) {
  return <div className="space-y-3">{children}</div>;
}

interface AccordionItemProps {
  title: string;
  description?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

export function AccordionItem({
  title,
  description,
  children,
  defaultOpen = false,
}: AccordionItemProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-card">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
      >
        <div>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
            {title}
          </h3>
          {description && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
              {description}
            </p>
          )}
        </div>
        <ChevronDown
          className={cn(
            "w-5 h-5 text-zinc-500 transition-transform",
            isOpen && "transform rotate-180"
          )}
        />
      </button>
      {isOpen && (
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3 animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
}
