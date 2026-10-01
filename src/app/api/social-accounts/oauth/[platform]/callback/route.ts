import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { SOCIAL_PLATFORMS, type SocialPlatform } from "@/constants/statuses";
import { connectDB } from "@/lib/db/mongoose";
import { encryptToken } from "@/lib/security/tokenEncryption";
import SocialAccount from "@/models/SocialAccount";
import MetaOAuthConnection from "@/models/MetaOAuthConnection";
import { exchangeFacebookAuthorizationCode, fetchFacebookPages, getFacebookOAuthConfig } from "@/services/social/facebookOAuth";

function isSocialPlatform(value: string): value is SocialPlatform {
  return (SOCIAL_PLATFORMS as readonly string[]).includes(value);
}

const stateCookie = "meta-facebook-oauth-state";

const mockAccounts = {
  instagram: { accountId: "mock-instagram-account", accountName: "Mock Instagram Account", username: "mock_account" },
} as const;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ platform: string }> },
) {
  const { platform } = await params;
  if (!isSocialPlatform(platform)) return new Response("Unsupported social platform.", { status: 400 });
  if (platform === "facebook") return completeFacebookOAuth(request);
  if (process.env.NODE_ENV === "production") {
    return new Response("Provider authorization is not configured for this account.", { status: 501 });
  }

  try {
    await connectDB();
    const mockAccount = mockAccounts[platform];
    await SocialAccount.findOneAndUpdate(
      { platform, accountId: mockAccount.accountId },
      { $set: { accountName: mockAccount.accountName, username: mockAccount.username, status: "connected" } },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
    );
  } catch (error) {
    console.error("Local social account connection failed:", { platform, error });
    redirect("/social-accounts?error=connect");
  }

  redirect(`/social-accounts?connected=${platform}`);
}

async function completeFacebookOAuth(request: Request) {
  const url = new URL(request.url);
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(stateCookie)?.value;
  const receivedState = url.searchParams.get("state");
  cookieStore.delete(stateCookie);

  const localUrl = (query: string, status = 303) => {
    const response = NextResponse.redirect(new URL(`/social-accounts?${query}`, request.url), status);
    response.cookies.delete(stateCookie);
    return response;
  };

  if (!expectedState || !receivedState) return localUrl("facebookOAuth=invalid-state");
  const expected = Buffer.from(expectedState);
  const received = Buffer.from(receivedState);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return localUrl("facebookOAuth=invalid-state");
  if (url.searchParams.has("error")) return localUrl("facebookOAuth=denied");

  const code = url.searchParams.get("code");
  if (!code) return localUrl("facebookOAuth=failed");

  try {
    const config = getFacebookOAuthConfig();
    const authorization = await exchangeFacebookAuthorizationCode(code, config);
    const pages = await fetchFacebookPages(authorization.accessToken, config.graphVersion);
    await connectDB();
    await MetaOAuthConnection.findOneAndUpdate(
      { provider: "facebook" },
      { $set: { userAccessTokenEncrypted: encryptToken(authorization.accessToken), expiresAt: authorization.expiresAt } },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
    );

    const availablePageIds = pages.map((page) => page.id);
    await SocialAccount.updateMany(
      { platform: "facebook", status: "connected", accountId: { $nin: availablePageIds } },
      { $set: { status: "expired" }, $unset: { accessTokenEncrypted: "", expiresAt: "" } },
    );

    await Promise.all(pages.map((page) => SocialAccount.updateOne(
      { platform: "facebook", accountId: page.id, status: { $ne: "disconnected" } },
      { $set: { accountName: page.name, accessTokenEncrypted: encryptToken(page.accessToken), status: "connected", expiresAt: authorization.expiresAt } },
    )));

    return localUrl("facebookOAuth=connected&addPage=1");
  } catch {
    return localUrl("facebookOAuth=failed");
  }
}
