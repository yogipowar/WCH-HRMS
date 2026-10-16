import { formatNavCount } from "@/lib/nav/badges";
import { cn } from "@/lib/utils";

export function NavCount({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold leading-none text-primary-foreground tabular-nums",
        className,
      )}
    >
      {formatNavCount(count)}
    </span>
  );
}
