import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { SOCIAL_PLATFORMS, type SocialPlatform } from "@/constants/statuses";
import { getFacebookOAuthConfig } from "@/services/social/facebookOAuth";

const stateCookie = "meta-facebook-oauth-state";

function isSocialPlatform(value: string): value is SocialPlatform {
  return (SOCIAL_PLATFORMS as readonly string[]).includes(value);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ platform: string }> },
) {
  const { platform } = await params;
  if (!isSocialPlatform(platform)) {
    return new Response("Unsupported social platform.", { status: 400 });
  }
  if (platform !== "facebook" && process.env.NODE_ENV === "production") {
    return new Response("Instagram is not available as a production connection.", { status: 404 });
  }

  if (platform === "instagram") redirect(`/api/social-accounts/oauth/${platform}/callback`);

  let config;
  try {
    config = getFacebookOAuthConfig();
  } catch {
    return NextResponse.redirect(new URL("/social-accounts?facebookOAuth=not-configured", _request.url));
  }

  const state = randomBytes(32).toString("base64url");
  const authorizationUrl = new URL(`https://www.facebook.com/${config.graphVersion}/dialog/oauth`);
  authorizationUrl.searchParams.set("client_id", config.appId);
  authorizationUrl.searchParams.set("redirect_uri", config.redirectUri);
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("scope", "pages_show_list,pages_read_engagement,pages_manage_posts");
  authorizationUrl.searchParams.set("state", state);
  authorizationUrl.searchParams.set("auth_type", "rerequest");

  const response = NextResponse.redirect(authorizationUrl);
  response.cookies.set(stateCookie, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return response;
}
