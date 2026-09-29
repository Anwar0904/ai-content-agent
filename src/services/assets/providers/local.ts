import type { AssetProvider, AssetResult } from "@/services/assets/types";

const FALLBACK_PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");

export const localProvider: AssetProvider = {
  async getAsset(): Promise<AssetResult> {
    return { buffer: FALLBACK_PNG, mimeType: "image/png", provider: "local", type: "local" };
  },
};
