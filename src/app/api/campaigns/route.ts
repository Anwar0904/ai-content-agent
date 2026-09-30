import { NextResponse } from "next/server";
import {
  createCampaign,
  parseCreateCampaignInput,
} from "@/services/campaigns/campaignService";

function validationFields(issues: Array<{ path: PropertyKey[]; message: string }>) {
  return issues.reduce<Record<string, string>>((fields, issue) => {
    const field = issue.path[0];
    if (typeof field === "string" && !fields[field]) {
      fields[field] =
        field === "videoCount"
          ? "Number of videos must be between 1 and 5."
          : field === "style"
            ? "Please select a valid video style."
            : field === "duration" || field === "durationMin" || field === "durationMax"
              ? "Please select a valid duration."
              : issue.message;
    }
    return fields;
  }, {});
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: { message: "Request body must be valid JSON.", fields: {} },
      },
      { status: 400 },
    );
  }

  const parsed = parseCreateCampaignInput(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: "Invalid campaign data.",
          fields: validationFields(parsed.error.issues),
        },
      },
      { status: 400 },
    );
  }

  try {
    const campaign = await createCampaign(parsed.data);
    return NextResponse.json({ success: true, data: campaign }, { status: 201 });
  } catch (error) {
    console.error(
      "Campaign creation failed:",
      error instanceof Error ? error.message : "Unknown server error",
    );
    return NextResponse.json(
      {
        success: false,
        error: { message: "Something went wrong while creating the campaign." },
      },
      { status: 500 },
    );
  }
}