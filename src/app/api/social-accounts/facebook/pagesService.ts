import { getServerEnv } from "@/lib/env";
import { decryptToken } from "@/lib/security/tokenEncryption";
import SocialAccount from "@/models/SocialAccount";
import { fetchFacebookPages, getFacebookUserAccessToken } from "@/services/social/facebookOAuth";

type Page = { id: string; name: string; tasks?: string[]; accessToken: string };

export type FacebookConnectionErrorCode = "not_configured" | "reauthorization_required" | "permission_required" | "unavailable";

export class FacebookConnectionError extends Error {
  constructor(readonly code: FacebookConnectionErrorCode, message: string) {
    super(message);
  }
}

async function loadFacebookPages(): Promise<Page[]> {
  const env = getServerEnv();
  const version = env.META_GRAPH_API_VERSION || "v26.0";
  if (!/^v\d+\.\d+$/.test(version)) throw new FacebookConnectionError("not_configured", "Facebook OAuth isn't configured for this workspace.");
  try {
    const accessToken = await getFacebookUserAccessToken();
    return await fetchFacebookPages(accessToken, version);
  } catch (error) {
    if (error instanceof FacebookConnectionError) throw error;
    const message = error instanceof Error ? error.message : "";
    if (message.includes("isn't connected") || message.includes("isn't configured")) {
      throw new FacebookConnectionError("not_configured", "Connect Facebook to this workspace before adding a Page.");
    }
    if (message.includes("authorization has expired")) {
      throw new FacebookConnectionError("reauthorization_required", "Facebook authorization has expired. Reconnect Facebook to continue publishing.");
    }
    if (message.includes("permissions")) {
      throw new FacebookConnectionError("permission_required", "Facebook Page permissions are missing. Reconnect Facebook and grant the requested permissions.");
    }
    throw new FacebookConnectionError("unavailable", "Facebook couldn't be reached. Try again.");
  }
}

// Only imported by server route handlers and the publisher. Never return Meta's raw response or a Page token to a client.
export async function discoverFacebookPages(): Promise<Omit<Page, "accessToken">[]> {
  return (await loadFacebookPages()).map(({ id, name, tasks }) => ({ id, name, ...(tasks ? { tasks } : {}) }));
}

export async function findFacebookPage(pageId: string) {
  return (await loadFacebookPages()).find((page) => page.id === pageId) ?? null;
}

export async function getFacebookPageAccessToken(pageId: string): Promise<string> {
  const account = await SocialAccount.findOne({ platform: "facebook", accountId: pageId })
    .select("+accessTokenEncrypted")
    .lean();
  if (account?.accessTokenEncrypted) return decryptToken(account.accessTokenEncrypted);
  const page = await findFacebookPage(pageId);
  if (!page) throw new FacebookConnectionError("permission_required", "This Facebook Page isn't available to the current Facebook connection. Reconnect Facebook and grant Page permissions.");
  return page.accessToken;
}
