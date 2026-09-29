import type { VideoTemplateId } from "@/constants/statuses";
import type { Video, VideoScene } from "@/types/video";
import { parseVideoTemplateId } from "@/templates/types";

function escapeFfmpegText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'")
    .replace(/,/g, "\\,");
}

function textOverlay(
  text: string,
  options: {
    fontSize: number;
    x: string;
    y: number;
    color?: string;
    boxColor?: string;
    boxBorder?: number;
  },
): string {
  const color = options.color ?? "white";
  const boxColor = options.boxColor ?? "black@0.55";
  const boxBorder = options.boxBorder ?? 12;

  return [
    "drawtext=text='" + escapeFfmpegText(text) + "'",
    "fontcolor=" + color,
    "fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "fontsize=" + String(options.fontSize),
    "x=" + options.x,
    "y=" + String(options.y),
    "box=1",
    "boxcolor=" + boxColor,
    "boxborderw=" + String(boxBorder),
    "line_spacing=6",
  ].join(":");
}

export function validateVideoTemplate(video: Pick<Video, "templateId" | "scenes">): VideoTemplateId {
  const templateId = parseVideoTemplateId(video.templateId);

  if (templateId === "TOP_5") {
    if (video.scenes.length !== 5) {
      throw new Error("Template TOP_5 requires exactly 5 scenes.");
    }

    const orders = [...video.scenes].map((scene) => Number(scene.order)).sort((left, right) => left - right);
    if (orders.some((order, index) => order !== index + 1)) {
      throw new Error("Template TOP_5 scenes must be ordered 01 through 05.");
    }
  }

  return templateId;
}

export function buildTemplateSceneFilter({
  templateId,
  video,
  scene,
  isOpeningScene,
}: {
  templateId: VideoTemplateId;
  video: Pick<Video, "hook" | "title">;
  scene: VideoScene;
  isOpeningScene: boolean;
}): string {
  switch (templateId) {
    case "BIG_HOOK": {
      if (!isOpeningScene) return "";
      return textOverlay(video.hook, {
        fontSize: 78,
        x: "(w-text_w)/2",
        y: 118,
        color: "white",
        boxColor: "black@0.62",
        boxBorder: 18,
      });
    }
    case "IMAGE_EXPLAINER": {
      return textOverlay(video.title, {
        fontSize: 52,
        x: "(w-text_w)/2",
        y: 110,
        color: "white",
        boxColor: "black@0.56",
        boxBorder: 12,
      });
    }
    case "TOP_5": {
      const numberValue = String(scene.order).padStart(2, "0");
      return [
        textOverlay("TOP 5", {
          fontSize: 50,
          x: "(w-text_w)/2",
          y: 126,
          color: "white",
          boxColor: "black@0.6",
          boxBorder: 14,
        }),
        textOverlay(numberValue, {
          fontSize: 82,
          x: "(w-text_w)/2",
          y: 220,
          color: "white",
          boxColor: "black@0.6",
          boxBorder: 16,
        }),
      ].join(",");
    }
    default:
      return "";
  }
}
