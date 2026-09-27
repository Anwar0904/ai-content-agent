export interface AssetRequest {
  visualPrompt: string;
  preferredType: "ai" | "stock";
}

export interface AssetResult {
  buffer: Buffer;
  mimeType: string;
  provider: "pollinations" | "pexels" | "local";
  type: "ai" | "stock" | "local";
  sourceUrl?: string;
  credit?: string;
}

export interface AssetProvider {
  getAsset(input: AssetRequest): Promise<AssetResult>;
}
