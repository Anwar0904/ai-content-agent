import {
  DEFAULT_VIDEO_TEMPLATE_ID,
  VIDEO_TEMPLATE_IDS,
  type VideoTemplateId,
} from "@/constants/statuses";

export const VIDEO_TEMPLATE_LABELS: Record<VideoTemplateId, string> = {
  BIG_HOOK: "Big Hook",
  IMAGE_EXPLAINER: "Image Explainer",
  TOP_5: "Top 5",
};

export function isVideoTemplateId(value: unknown): value is VideoTemplateId {
  return typeof value === "string" && VIDEO_TEMPLATE_IDS.includes(value as VideoTemplateId);
}

export function parseVideoTemplateId(value?: string | null): VideoTemplateId {
  if (value === undefined || value === null || value === "") {
    return DEFAULT_VIDEO_TEMPLATE_ID;
  }

  if (!isVideoTemplateId(value)) {
    throw new Error(`Unknown template: ${value}`);
  }

  return value;
}

export function getVideoTemplateLabel(value?: string | null): string {
  const templateId = parseVideoTemplateId(value);
  return VIDEO_TEMPLATE_LABELS[templateId];
}
