import { validateImageBuffer } from "@/services/assets/assetStorage";
import { AssetProviderError, type AssetProvider, type AssetRequest, type AssetResult } from "@/services/assets/types";

const ENDPOINT = "https://gen.pollinations.ai/image/";
const REQUEST_TIMEOUT = 45000;

export const pollinationsProvider: AssetProvider = {
  async getAsset(input: AssetRequest): Promise<AssetResult> {
    const apiKey = process.env.POLLINATIONS_API_KEY;
    if (!apiKey) throw new AssetProviderError("Pollinations is not configured.");
    const model = process.env.POLLINATIONS_IMAGE_MODEL || "flux";
    const url = `${ENDPOINT}${encodeURIComponent(input.visualPrompt)}?model=${encodeURIComponent(model)}&width=768&height=1365&nologo=true`;

    let response: Response;
    try {
      response = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      });
    } catch {
      throw new AssetProviderError("Pollinations request timed out.");
    }
    if (!response.ok) throw new AssetProviderError(`Pollinations request failed with status ${response.status}.`);
    const contentType = response.headers.get("content-type");
    const buffer = Buffer.from(await response.arrayBuffer());
    try {
      validateImageBuffer(buffer, contentType?.split(";")[0] || "image/png");
    } catch {
      throw new AssetProviderError("Pollinations returned invalid image data.");
    }
    return { buffer, mimeType: contentType?.split(";")[0] || "image/png", provider: "pollinations", type: "ai" };
  },
};
