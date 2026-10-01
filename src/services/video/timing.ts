import type { VideoScene } from "@/types/video";

export interface SceneTiming {
  order: number;

  /**
   * Approximate amount of narration audio belonging to this scene.
   */
  audioDuration: number;

  /**
   * How long the scene visual stays on screen.
   */
  visualDuration: number;

  start: number;
  end: number;
}

const MIN_SCENE_DURATION_SECONDS =
  0.75;

function narrationWeight(
  text: string,
): number {
  const normalized =
    text.trim();

  if (!normalized) {
    return 1;
  }

  const words =
    normalized
      .split(/\s+/)
      .filter(Boolean);

  /*
   * Word count is more stable than pure character count
   * for approximate spoken timing.
   */
  return Math.max(
    1,
    words.length,
  );
}

export function calculateSceneTimingsFromNarration({
  scenes,
  totalAudioDuration,
}: {
  scenes: VideoScene[];
  totalAudioDuration: number;
}): SceneTiming[] {
  if (
    !Number.isFinite(
      totalAudioDuration,
    ) ||
    totalAudioDuration <= 0
  ) {
    throw new Error(
      "Narration audio duration must be positive.",
    );
  }

  if (
    scenes.length === 0
  ) {
    return [];
  }

  const weights =
    scenes.map((scene) =>
      narrationWeight(
        scene.narration,
      ),
    );

  const totalWeight =
    weights.reduce(
      (sum, weight) =>
        sum + weight,
      0,
    );

  let cursor = 0;

  return scenes.map(
    (scene, index) => {
      const isLast =
        index ===
        scenes.length - 1;

      let duration = isLast
        ? totalAudioDuration -
          cursor
        : totalAudioDuration *
          (weights[index] /
            totalWeight);

      duration = Math.max(
        MIN_SCENE_DURATION_SECONDS,
        duration,
      );

      /*
       * Never extend the final scene beyond the narration.
       */
      if (isLast) {
        duration = Math.max(
          0.01,
          totalAudioDuration -
            cursor,
        );
      }

      const start =
        cursor;

      const end =
        isLast
          ? totalAudioDuration
          : Math.min(
              totalAudioDuration,
              start + duration,
            );

      cursor = end;

      return {
        order:
          scene.order,

        audioDuration:
          end - start,

        visualDuration:
          end - start,

        start,
        end,
      };
    },
  );
}

/**
 * Retained for compatibility with any other code that still
 * supplies individually measured scene audio.
 */
export function calculateSceneTimings(
  audioDurations: Array<{
    order: number;
    duration: number;
  }>,
): SceneTiming[] {
  let cursor = 0;

  return audioDurations.map(
    ({
      order,
      duration,
    }) => {
      if (
        !Number.isFinite(
          duration,
        ) ||
        duration <= 0
      ) {
        throw new Error(
          "Scene audio duration must be positive.",
        );
      }

      const start =
        cursor;

      const end =
        start +
        duration;

      cursor = end;

      return {
        order,
        audioDuration:
          duration,
        visualDuration:
          duration,
        start,
        end,
      };
    },
  );
}