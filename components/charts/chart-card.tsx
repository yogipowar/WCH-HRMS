import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ChartCard({
  title,
  children,
  actions,
  className,
  contentClassName = "h-64",
}: {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <Card className={cn("flex min-h-0 flex-col", className)}>
      <CardHeader className={actions ? "flex flex-row items-center justify-between gap-3" : undefined}>
        <CardTitle className="text-base">{title}</CardTitle>
        {actions}
      </CardHeader>
      <CardContent className={cn("min-h-0", contentClassName)}>{children}</CardContent>
    </Card>
  );
}
