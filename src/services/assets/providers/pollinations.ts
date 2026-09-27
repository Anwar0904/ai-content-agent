import type { AssetProvider, AssetRequest, AssetResult } from "@/services/assets/types";

const ENDPOINT = "https://gen.pollinations.ai/image/";
const REQUEST_TIMEOUT = 45000;

function isImage(buffer: Buffer, contentType: string | null): boolean {
  const type = contentType?.split(";")[0].toLowerCase();
  return type === "image/png" || type === "image/jpeg" || type === "image/webp" || buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) || buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
}

export const pollinationsProvider: AssetProvider = {
  async getAsset(input: AssetRequest): Promise<AssetResult> {
    const apiKey = process.env.POLLINATIONS_API_KEY;
    if (!apiKey) throw new Error("Pollinations is not configured.");
    const model = process.env.POLLINATIONS_IMAGE_MODEL || "flux";
    const url = `${ENDPOINT}${encodeURIComponent(input.visualPrompt)}?model=${encodeURIComponent(model)}&width=768&height=1365&nologo=true`;

    let response: Response;
    try {
      response = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      });
    } catch {
      throw new Error("Pollinations request timed out.");
    }
    if (!response.ok) throw new Error(`Pollinations request failed with status ${response.status}.`);
    const contentType = response.headers.get("content-type");
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length || !isImage(buffer, contentType)) throw new Error("Pollinations returned invalid image data.");
    return { buffer, mimeType: contentType?.split(";")[0] || "image/png", provider: "pollinations", type: "ai" };
  },
};
