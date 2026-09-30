import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import SocialAccount from "@/models/SocialAccount";
import { discoverFacebookPages, FacebookConnectionError } from "../pagesService";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (typeof body?.pageId !== "string" || !/^\d{1,32}$/.test(body.pageId)) {
    return NextResponse.json({ error: { message: "Invalid Facebook Page ID." } }, { status: 400 });
  }
  try {
    const page = (await discoverFacebookPages()).find((candidate) => candidate.id === body.pageId);
    if (!page) return NextResponse.json({ error: { message: "This Facebook Page is not available to the configured account." } }, { status: 403 });
    await connectDB();
    const account = await SocialAccount.findOneAndUpdate(
      { platform: "facebook", accountId: page.id },
      { $set: { accountName: page.name, status: "connected" } },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
    ).select("accountId accountName status platform").lean();
    return NextResponse.json({ account: { id: account._id.toString(), accountId: account.accountId, accountName: account.accountName, platform: account.platform, status: account.status } });
  } catch (error) {
    return NextResponse.json({ error: { message: error instanceof FacebookConnectionError ? error.message : "Unable to connect Facebook Page." } }, { status: 503 });
  }
}
