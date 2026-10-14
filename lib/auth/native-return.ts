/** Opens the installed APK from a Chrome Custom Tab without loading a custom scheme as a web page. */
export function androidAppIntentUrl(query: string) {
  const fallback = `${window.location.origin}/login?native=1`;
  return (
    `intent://oauth?${query}#Intent;` +
    "scheme=wchhrms;" +
    "package=com.webcreatehub.hrms;" +
    `S.browser_fallback_url=${encodeURIComponent(fallback)};` +
    "end"
  );
}
