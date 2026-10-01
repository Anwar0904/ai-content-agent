import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { encryptToken } from "@/lib/security/tokenEncryption";
import SocialAccount from "@/models/SocialAccount";
import { findFacebookPage, FacebookConnectionError } from "../pagesService";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (typeof body?.pageId !== "string" || !/^\d{1,32}$/.test(body.pageId)) {
    return NextResponse.json({ error: { message: "Invalid Facebook Page ID." } }, { status: 400 });
  }
  try {
    const page = await findFacebookPage(body.pageId);
    if (!page) return NextResponse.json({ error: { message: "This Facebook Page is not available to the connected Facebook account." } }, { status: 403 });
    await connectDB();
    const account = await SocialAccount.findOneAndUpdate(
      { platform: "facebook", accountId: page.id },
      { $set: { accountName: page.name, accessTokenEncrypted: encryptToken(page.accessToken), status: "connected" } },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
    ).select("accountId accountName status platform createdAt updatedAt").lean();
    return NextResponse.json({ account: { id: account._id.toString(), accountId: account.accountId, accountName: account.accountName, platform: account.platform, status: account.status, createdAt: account.createdAt, updatedAt: account.updatedAt } });
  } catch (error) {
    const connectionError = error instanceof FacebookConnectionError ? error : null;
    const status = connectionError?.code === "reauthorization_required" ? 401 : connectionError?.code === "permission_required" ? 403 : 503;
    return NextResponse.json({ error: { code: connectionError?.code ?? "unavailable", message: connectionError?.message ?? "We couldn't add this Facebook Page. Try again." } }, { status });
  }
}
