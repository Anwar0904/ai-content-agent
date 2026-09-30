import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import SocialAccount from "@/models/SocialAccount";
import { discoverFacebookPages, FacebookConnectionError } from "../pagesService";

export async function GET() {
  try {
    const pages = await discoverFacebookPages();
    await connectDB();
    const accounts = await SocialAccount.find({ platform: "facebook", status: "connected" }).select("accountId").lean();
    const connected = new Set(accounts.map((account) => account.accountId));
    return NextResponse.json({ pages: pages.map((page) => ({ ...page, connected: connected.has(page.id) })) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: { message: error instanceof FacebookConnectionError ? error.message : "Unable to load Facebook Pages." } }, { status: 503 });
  }
}
