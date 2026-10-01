"use client";

import { ImageOff } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

export function SceneAssetPreview({
  assetPath,
  order,
}: {
  assetPath?: string;
  order: number;
}) {
  const [
    unavailable,
    setUnavailable,
  ] = useState(!assetPath);

  if (
    unavailable ||
    !assetPath
  ) {
    return (
      <div className="flex aspect-[2/3] w-full items-center justify-center rounded-xl bg-zinc-100 text-zinc-400 sm:w-[120px]">
        <div className="text-center">
          <ImageOff
            aria-hidden="true"
            size={20}
            className="mx-auto"
          />

          <span className="mt-2 block text-[11px] font-medium">
            Asset unavailable
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-zinc-100 sm:w-[120px]">
      <Image
        alt={`Visual asset for scene ${String(
          order,
        ).padStart(2, "0")}`}
        fill
        sizes="(max-width: 640px) 100vw, 120px"
        className="object-cover"
        onError={() =>
          setUnavailable(true)
        }
        src={assetPath}
      />
    </div>
  );
}