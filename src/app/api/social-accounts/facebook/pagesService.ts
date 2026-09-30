import { getServerEnv } from "@/lib/env";

type Page = { id: string; name: string; tasks?: string[] };

export class FacebookConnectionError extends Error {}

// Only imported by server route handlers. Never return Meta's raw response.
export async function discoverFacebookPages(): Promise<Page[]> {
  const env = getServerEnv();
  if (!env.META_USER_ACCESS_TOKEN) {
    throw new FacebookConnectionError("Facebook connection is not configured on the server.");
  }
  const version = env.META_GRAPH_API_VERSION || "v26.0";
  if (!/^v\d+\.\d+$/.test(version)) {
    throw new FacebookConnectionError("Facebook connection is not configured on the server.");
  }
  try {
    const pages = new Map<string, Page>();
    let after: string | undefined;
    const cursors = new Set<string>();
    do {
      const url = new URL(`https://graph.facebook.com/${version}/me/accounts`);
      url.searchParams.set("fields", "id,name,tasks");
      if (after) url.searchParams.set("after", after);
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${env.META_USER_ACCESS_TOKEN}` },
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
      const body = await response.json();
      if (!response.ok || body.error || !Array.isArray(body.data)) throw new Error();
      for (const page of body.data) {
        if (typeof page.id !== "string" || !/^\d+$/.test(page.id) || typeof page.name !== "string") throw new Error();
        pages.set(page.id, {
          id: page.id,
          name: page.name,
          ...(Array.isArray(page.tasks) ? { tasks: page.tasks.filter((task: unknown): task is string => typeof task === "string") } : {}),
        });
      }
      after = body.paging?.next ? body.paging?.cursors?.after : undefined;
      if (body.paging?.next && (typeof after !== "string" || !after || cursors.has(after))) throw new Error();
      if (after) cursors.add(after);
    } while (after);
    return [...pages.values()];
  } catch {
    throw new FacebookConnectionError("Unable to load Facebook Pages.");
  }
}
