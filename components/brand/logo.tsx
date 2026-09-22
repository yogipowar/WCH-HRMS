import Image from "next/image";
import { COMPANY_NAME, LOGO_PATH } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  priority?: boolean;
}

export function BrandLogo({ className, priority }: LogoProps) {
  return (
    <Image
      src={LOGO_PATH}
      alt={`${COMPANY_NAME} logo`}
      width={640}
      height={160}
      priority={priority}
      className={cn("h-10 w-auto max-w-full object-contain object-left", className)}
    />
  );
}
