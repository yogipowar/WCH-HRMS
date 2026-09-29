const handoffs = new Map<string, { credential: string; expiresAt: number }>();

const TTL_MS = 2 * 60 * 1000;

function pruneHandoffs() {
  const now = Date.now();
  for (const [id, entry] of handoffs) {
    if (entry.expiresAt <= now) handoffs.delete(id);
  }
}

export function createGoogleHandoff(credential: string) {
  pruneHandoffs();
  const id = crypto.randomUUID().replace(/-/g, "");
  handoffs.set(id, { credential, expiresAt: Date.now() + TTL_MS });
  return id;
}

export function takeGoogleHandoff(id: string) {
  pruneHandoffs();
  const entry = handoffs.get(id);
  if (!entry) return null;
  handoffs.delete(id);
  if (entry.expiresAt <= Date.now()) return null;
  return entry.credential;
}
