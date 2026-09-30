import { redirect } from "next/navigation";
import { SOCIAL_PLATFORMS, type SocialPlatform } from "@/constants/statuses";
import { connectDB } from "@/lib/db/mongoose";
import SocialAccount from "@/models/SocialAccount";

function isSocialPlatform(value: string): value is SocialPlatform {
  return (SOCIAL_PLATFORMS as readonly string[]).includes(value);
}

const mockAccounts = {
  facebook: { accountId: "mock-facebook-page", accountName: "Mock Facebook Page", username: "mock_page" },
  instagram: { accountId: "mock-instagram-account", accountName: "Mock Instagram Account", username: "mock_account" },
} as const;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ platform: string }> },
) {
  const { platform } = await params;
  if (!isSocialPlatform(platform)) return new Response("Unsupported social platform.", { status: 400 });

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
