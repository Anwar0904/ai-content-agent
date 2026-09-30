import { redirect } from "next/navigation";
import { SOCIAL_PLATFORMS, type SocialPlatform } from "@/constants/statuses";

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

  // Local shell only: the callback simulates the provider response without network access.
  redirect(`/api/social-accounts/oauth/${platform}/callback`);
}
