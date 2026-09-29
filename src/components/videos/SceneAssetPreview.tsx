"use client";

import Image from "next/image";
import { useState } from "react";

export function SceneAssetPreview({ assetPath, order }: { assetPath?: string; order: number }) {
  const [unavailable, setUnavailable] = useState(!assetPath);

  if (unavailable || !assetPath) {
    return <div className="scene-asset-unavailable">Asset unavailable</div>;
  }

  return (
    <Image
      alt={`Visual asset for scene ${String(order).padStart(2, "0")}`}
      className="video-detail-scene-image"
      height={180}
      onError={() => setUnavailable(true)}
      src={assetPath}
      width={120}
    />
  );
}