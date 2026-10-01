import "server-only";
import { connectDB } from "@/lib/db/mongoose";
import { getServerEnv } from "@/lib/env";
import { decryptToken } from "@/lib/security/tokenEncryption";
import MetaOAuthConnection from "@/models/MetaOAuthConnection";

export type FacebookOAuthConfig = {
  appId: string;
  appSecret: string;
  redirectUri: string;
  graphVersion: string;
};

export type FacebookPageCredential = {
  id: string;
  name: string;
  accessToken: string;
  tasks: string[];
};

type TokenResponse = { access_token?: unknown; expires_in?: unknown; error?: unknown };
type PageResponse = {
  data?: unknown;
  error?: { code?: unknown };
  paging?: { next?: unknown; cursors?: { after?: unknown } };
};

export function getFacebookOAuthConfig(): FacebookOAuthConfig {
  const env = getServerEnv();
  if (!env.META_APP_ID || !env.META_APP_SECRET || !env.META_OAUTH_REDIRECT_URI || !env.META_TOKEN_ENCRYPTION_KEY) {
    throw new Error("Facebook OAuth isn't configured for this workspace.");
  }
  const graphVersion = env.META_GRAPH_API_VERSION || "v26.0";
  if (!/^v\d+\.\d+$/.test(graphVersion)) throw new Error("Facebook OAuth isn't configured for this workspace.");
  const redirectUri = new URL(env.META_OAUTH_REDIRECT_URI);
  if (process.env.NODE_ENV === "production" && redirectUri.protocol !== "https:") {
    throw new Error("Facebook OAuth requires an HTTPS callback URL in production.");
  }
  return { appId: env.META_APP_ID, appSecret: env.META_APP_SECRET, redirectUri: redirectUri.toString(), graphVersion };
}

async function getGraph<T>(url: URL, parameters: URLSearchParams): Promise<T> {
  const requestUrl = new URL(url);
  parameters.forEach((value, key) => requestUrl.searchParams.set(key, value));
  let response: Response;
  try {
    response = await fetch(requestUrl, {
      method: "GET",
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error("Facebook couldn't be reached. Try again.");
  }
  const payload = await response.json().catch(() => null) as (T & TokenResponse) | null;
  if (!response.ok || !payload || payload.error || typeof payload.access_token !== "string" || payload.access_token.length > 8192) {
    throw new Error("Facebook authorization could not be completed. Check the Meta app configuration and try again.");
  }
  return payload;
}

export async function exchangeFacebookAuthorizationCode(code: string, config = getFacebookOAuthConfig()) {
  if (!code || code.length > 4096) throw new Error("Facebook authorization could not be completed.");
  const endpoint = new URL(`https://graph.facebook.com/${config.graphVersion}/oauth/access_token`);
  const shortLived = await getGraph<TokenResponse>(endpoint, new URLSearchParams({
    client_id: config.appId,
    client_secret: config.appSecret,
    redirect_uri: config.redirectUri,
    code,
  }));
  const exchange = await getGraph<TokenResponse>(endpoint, new URLSearchParams({
    client_id: config.appId,
    client_secret: config.appSecret,
    grant_type: "fb_exchange_token",
    fb_exchange_token: shortLived.access_token as string,
  }));
  const expiresIn = typeof exchange.expires_in === "number" && Number.isFinite(exchange.expires_in) && exchange.expires_in > 0
    ? exchange.expires_in
    : undefined;
  return {
    accessToken: exchange.access_token as string,
    expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : undefined,
  };
}

export async function getFacebookUserAccessToken() {
  await connectDB();
  const connection = await MetaOAuthConnection.findOne({ provider: "facebook" })
    .select("+userAccessTokenEncrypted expiresAt")
    .lean();
  if (connection?.userAccessTokenEncrypted) return decryptToken(connection.userAccessTokenEncrypted);

  const legacyToken = getServerEnv().META_USER_ACCESS_TOKEN;
  if (legacyToken) return legacyToken;
  throw new Error("Facebook isn't connected to this workspace.");
}

export async function fetchFacebookPages(accessToken: string, graphVersion = getFacebookOAuthConfig().graphVersion): Promise<FacebookPageCredential[]> {
  const pages = new Map<string, FacebookPageCredential>();
  let after: string | undefined;
  const cursors = new Set<string>();
  do {
    const url = new URL(`https://graph.facebook.com/${graphVersion}/me/accounts`);
    url.searchParams.set("fields", "id,name,tasks,access_token");
    url.searchParams.set("limit", "100");
    if (after) url.searchParams.set("after", after);
    let response: Response;
    try {
      response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      throw new Error("Facebook couldn't be reached. Try again.");
    }
    const body = await response.json().catch(() => null) as PageResponse | null;
    if (!response.ok || !body || body.error || !Array.isArray(body.data)) {
      throw new Error(body?.error?.code === 190
        ? "Facebook authorization has expired. Reconnect Facebook to continue publishing."
        : "Facebook Pages could not be loaded. Check the requested permissions and try again.");
    }
    for (const entry of body.data as Record<string, unknown>[]) {
      if (typeof entry.id !== "string" || !/^\d+$/.test(entry.id) || typeof entry.name !== "string" || typeof entry.access_token !== "string") continue;
      pages.set(entry.id, {
        id: entry.id,
        name: entry.name,
        accessToken: entry.access_token,
        tasks: Array.isArray(entry.tasks) ? entry.tasks.filter((task): task is string => typeof task === "string") : [],
      });
    }
    if (body.paging?.next) {
      const cursor = body.paging.cursors?.after;
      if (typeof cursor !== "string" || !cursor || cursors.has(cursor)) throw new Error("Facebook returned an invalid Page list.");
      cursors.add(cursor);
      after = cursor;
    } else {
      after = undefined;
    }
  } while (after);
  return [...pages.values()];
}