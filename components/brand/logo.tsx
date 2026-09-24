import Image from "next/image";
import { COMPANY_NAME, FAVICON_PATH, LOGO_PATH } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  priority?: boolean;
  compact?: boolean;
}

export function BrandLogo({ className, priority, compact = false }: LogoProps) {
  return (
    <Image
      src={compact ? FAVICON_PATH : LOGO_PATH}
      alt={`${COMPANY_NAME} logo`}
      width={compact ? 128 : 640}
      height={compact ? 128 : 160}
      priority={priority}
      className={cn(
        compact
          ? "size-8 object-contain"
          : "h-10 w-auto max-w-full object-contain object-left",
        className,
      )}
    />
  );
}
