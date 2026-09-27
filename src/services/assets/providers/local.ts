import type { AssetProvider, AssetResult } from "@/services/assets/types";

const FALLBACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="768" height="1365" viewBox="0 0 768 1365"><rect width="768" height="1365" fill="#e9eeea"/><path d="M0 1030 250 760l170 150 120-180 228 300v335H0z" fill="#315b49" opacity=".22"/><circle cx="384" cy="470" r="145" fill="#c77a57" opacity=".55"/><text x="384" y="720" text-anchor="middle" fill="#315b49" font-family="sans-serif" font-size="34">Studio fallback</text></svg>`;

export const localProvider: AssetProvider = {
  async getAsset(): Promise<AssetResult> {
    return { buffer: Buffer.from(FALLBACK_SVG), mimeType: "image/svg+xml", provider: "local", type: "local" };
  },
};
