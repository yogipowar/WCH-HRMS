import type { ReactNode } from "react";

function greetingName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const title = parts[0]?.replace(/\./g, "") ?? "";
  if (parts.length >= 2 && /^(mr|mrs|ms|dr)$/i.test(title)) {
    const titled = parts[0].endsWith(".") ? parts[0] : `${parts[0]}.`;
    return `${titled} ${parts[1]}`;
  }
  if (parts.length >= 2 && /^agency$/i.test(title)) {
    return parts[1];
  }
  return parts[0] ?? fullName;
}

export function DashboardGreeting({
  name,
  subtitle,
  actions,
}: {
  name: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  const firstName = greetingName(name);
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-[1.75rem] font-semibold tracking-tight text-foreground">Namaste, {firstName}!</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle ?? "We hope you’re having a great day."}</p>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div> : null}
    </div>
  );
}
