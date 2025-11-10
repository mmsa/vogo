import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { icon: 28, text: "text-sm" },
  md: { icon: 32, text: "text-base" },
  lg: { icon: 48, text: "text-xl" },
  xl: { icon: 64, text: "text-2xl" },
};

export function Logo({ size = "md", showText = true, className }: LogoProps) {
  const { icon: iconSize, text: textSize } = sizeMap[size];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Logo Icon */}
      <div className="relative flex-shrink-0" style={{ width: iconSize, height: iconSize }}>
        <img
          src="/logo.png"
          alt="vogoplus.app"
          className="w-full h-full object-contain"
          style={{ width: iconSize, height: iconSize }}
        />
      </div>

      {/* Text */}
      {showText && (
        <span className={cn("font-bold text-zinc-900 dark:text-zinc-100", textSize)}>
          vogoplus.app
        </span>
      )}
    </div>
  );
}

