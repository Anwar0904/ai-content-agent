import { isValidObjectId } from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import SocialAccount from "@/models/SocialAccount";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ success: false, error: { message } }, { status });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ accountId: string }> },
) {
  const { accountId } = await params;
  if (!accountId || !isValidObjectId(accountId)) return errorResponse("Invalid social account ID.", 400);

  try {
    await connectDB();
    const account = await SocialAccount.findByIdAndUpdate(
      accountId,
      { $set: { status: "expired" } },
      { new: true, runValidators: true },
    ).select("platform accountName accountId status username profileUrl createdAt updatedAt").lean();
    if (!account) return errorResponse("Social account not found.", 404);
    return NextResponse.json({
      success: true,
      data: {
        id: account._id.toString(),
        platform: account.platform,
        accountName: account.accountName,
        accountId: account.accountId,
        status: account.status,
        username: account.username,
        profileUrl: account.profileUrl,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
      },
    });
  } catch (error) {
    console.error("Social account disconnect failed:", { accountId, error });
    return errorResponse("Social account could not be disconnected.", 500);
  }
}
