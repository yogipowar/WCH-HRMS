import type { ReactNode } from "react";

function greetingName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2 && /^(agency|mr|mrs|ms|dr)$/i.test(parts[0])) {
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
        <h1 className="text-[1.75rem] font-semibold tracking-tight text-foreground">Hello, {firstName}!</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle ?? "We hope you’re having a great day."}</p>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div> : null}
    </div>
  );
}
