import type { AssetProvider, AssetRequest, AssetResult } from "@/services/assets/types";

interface PexelsPhoto {
  width?: number;
  height?: number;
  photographer?: string;
  photographer_url?: string;
  url?: string;
  src?: { large2x?: string; large?: string; portrait?: string; original?: string };
}

function searchQuery(prompt: string): string {
  const words = prompt.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((word) => word.length > 3);
  return words.slice(0, 7).join(" ") || "creative technology workspace";
}

export const pexelsProvider: AssetProvider = {
  async getAsset(input: AssetRequest): Promise<AssetResult> {
    const apiKey = process.env.PEXELS_API_KEY;
    if (!apiKey) throw new Error("Pexels is not configured.");
    const url = new URL("https://api.pexels.com/v1/search");
    url.searchParams.set("query", searchQuery(input.visualPrompt));
    url.searchParams.set("orientation", "portrait");
    url.searchParams.set("per_page", "5");
    const response = await fetch(url, { headers: { Authorization: apiKey }, signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`Pexels request failed with status ${response.status}.`);
    const payload = (await response.json()) as { photos?: PexelsPhoto[] };
    const photo = (payload.photos || []).filter((candidate) => candidate.width && candidate.height && candidate.height >= candidate.width && candidate.src).sort((left, right) => (right.height || 0) - (left.height || 0))[0];
    const sourceUrl = photo?.src?.portrait || photo?.src?.large2x || photo?.src?.large || photo?.src?.original;
    if (!photo || !sourceUrl) throw new Error("Pexels returned no suitable portrait photo.");
    const imageResponse = await fetch(sourceUrl, { signal: AbortSignal.timeout(20000) });
    if (!imageResponse.ok) throw new Error(`Pexels image download failed with status ${imageResponse.status}.`);
    const buffer = Buffer.from(await imageResponse.arrayBuffer());
    const mimeType = imageResponse.headers.get("content-type")?.split(";")[0] || "image/jpeg";
    if (!buffer.length || !mimeType.startsWith("image/")) throw new Error("Pexels returned invalid image data.");
    const credit = photo.photographer ? `Photo by ${photo.photographer}${photo.photographer_url ? ` (${photo.photographer_url})` : ""}` : undefined;
    return { buffer, mimeType, provider: "pexels", type: "stock", sourceUrl: photo.url, credit };
  },
};
