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
    const connectionError = error instanceof FacebookConnectionError ? error : null;
    const status = connectionError?.code === "reauthorization_required" ? 401 : connectionError?.code === "permission_required" ? 403 : 503;
    return NextResponse.json({ error: { code: connectionError?.code ?? "unavailable", message: connectionError?.message ?? "Facebook couldn't be reached. Try again." } }, { status });
  }
}
