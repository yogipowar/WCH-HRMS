export const PROJECT_REQUIREMENTS = [
  { id: "child-theme", label: "Child theme" },
  { id: "elementor-layout", label: "Layout setting for elementor" },
  { id: "site-details", label: "Site details in setting" },
  { id: "favicon", label: "Favicon" },
  { id: "google-review", label: "Google review plugin" },
  { id: "not-found-page", label: "404 page design" },
  { id: "insta-feed", label: "Insta feed section" },
  { id: "seo-plugin", label: "SEO plugin and setup" },
  { id: "shopify-seo", label: "Shopify SEO setup" },
  { id: "google-site-kit", label: "Google site kit" },
  { id: "smtp", label: "SMTP" },
  { id: "page-speed", label: "Page speed insight" },
  { id: "form-message-layout", label: "Form message body layout design" },
  { id: "form-check", label: "Form check" },
  { id: "floating-whatsapp", label: "Floating whatsapp" },
  { id: "client-admin-user", label: "Client admin user" },
  { id: "search-console", label: "Google search console" },
  { id: "google-analytics", label: "Google analytics" },
  { id: "google-business", label: "Google business profile" },
  { id: "sitemap", label: "Site map" },
  { id: "shipping-return", label: "Shipping and Return policy page" },
  { id: "privacy-policy", label: "Privacy policy" },
  { id: "terms", label: "Terms and condition page" },
] as const;

export type ProjectRequirementId = (typeof PROJECT_REQUIREMENTS)[number]["id"];

const REQUIREMENT_IDS = new Set<string>(PROJECT_REQUIREMENTS.map((item) => item.id));

export function knownRequirementIds(ids: string[]) {
  if (!Array.isArray(ids)) return [];
  const unique: string[] = [];
  for (const id of ids) {
    if (REQUIREMENT_IDS.has(id) && !unique.includes(id)) unique.push(id);
  }
  return unique;
}

export function requirementLabel(id: string) {
  return PROJECT_REQUIREMENTS.find((item) => item.id === id)?.label ?? id;
}

export const PROJECT_STATUSES = ["UPCOMING", "ONGOING", "UNDER_TESTING", "COMPLETED"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  UPCOMING: "Upcoming",
  ONGOING: "Ongoing",
  UNDER_TESTING: "Under testing",
  COMPLETED: "Completed",
};

export const PROJECT_STATUS_COLOR: Record<ProjectStatus, string> = {
  UPCOMING: "#87909e",
  ONGOING: "#3b82f6",
  UNDER_TESTING: "#f59e0b",
  COMPLETED: "#22c55e",
};

export function asProjectStatus(value: unknown): ProjectStatus {
  const status = String(value ?? "");
  return PROJECT_STATUSES.includes(status as ProjectStatus) ? (status as ProjectStatus) : "UPCOMING";
}
