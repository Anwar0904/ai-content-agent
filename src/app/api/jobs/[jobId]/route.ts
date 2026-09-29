import { isValidObjectId } from "mongoose";
import { NextResponse } from "next/server";
import { getJob } from "@/services/jobs/jobService";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  if (!jobId || !isValidObjectId(jobId)) {
    return NextResponse.json({ success: false, error: { message: "Invalid job ID." } }, { status: 400 });
  }

  try {
    const job = await getJob(jobId);
    if (!job) return NextResponse.json({ success: false, error: { message: "Job not found." } }, { status: 404 });
    return NextResponse.json({ success: true, data: { job } });
  } catch (error) {
    console.error("Failed to load job:", { jobId, error });
    return NextResponse.json({ success: false, error: { message: "Job status couldn't be loaded." } }, { status: 500 });
  }
}