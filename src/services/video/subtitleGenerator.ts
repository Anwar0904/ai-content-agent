import type { VideoScene } from "@/types/video";
import type { SceneTiming } from "@/services/video/timing";

function assTime(
  seconds: number,
): string {
  const centiseconds =
    Math.max(
      0,
      Math.round(
        seconds * 100,
      ),
    );

  const hours =
    Math.floor(
      centiseconds /
        360000,
    );

  const minutes =
    Math.floor(
      (centiseconds %
        360000) /
        6000,
    );

  const remainder =
    centiseconds % 6000;

  const secondsPart =
    Math.floor(
      remainder / 100,
    );

  return `${hours}:${String(
    minutes,
  ).padStart(2, "0")}:${String(
    secondsPart,
  ).padStart(2, "0")}.${String(
    centiseconds % 100,
  ).padStart(2, "0")}`;
}

function escapeAss(
  text: string,
): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/[{}]/g, "")
    .replace(/\r?\n/g, " ")
    .trim();
}

function chunkWords(
  text: string,
  maxWords = 8,
): string[] {
  const words =
    text
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  const result: string[] =
    [];

  for (
    let index = 0;
    index < words.length;
    index += maxWords
  ) {
    result.push(
      words
        .slice(
          index,
          index +
            maxWords,
        )
        .join(" "),
    );
  }

  return result.length
    ? result
    : [text.trim()];
}

export function buildAssSubtitles(
  scenes: VideoScene[],
  timings: SceneTiming[],
): string {
  const events: string[] =
    [];

  scenes.forEach(
    (scene, index) => {
      const timing =
        timings[index];

      if (!timing) {
        return;
      }

      const parts =
        chunkWords(
          scene.narration,
        );

      const sceneSpeechEnd =
        timing.start +
        timing.audioDuration;

      const totalCharacters =
        parts.reduce(
          (sum, part) =>
            sum +
            Math.max(
              1,
              part.length,
            ),
          0,
        ) || 1;

      let cursor =
        timing.start;

      parts.forEach(
        (
          part,
          partIndex,
        ) => {
          const isLast =
            partIndex ===
            parts.length - 1;

          const proportionalDuration =
            timing.audioDuration *
            (Math.max(
              1,
              part.length,
            ) /
              totalCharacters);

          const next = isLast
            ? sceneSpeechEnd
            : Math.min(
                sceneSpeechEnd,
                cursor +
                  proportionalDuration,
              );

          if (
            next <= cursor
          ) {
            return;
          }

          events.push(
            `Dialogue: 0,${assTime(
              cursor,
            )},${assTime(
              next,
            )},Default,,0,0,0,,${escapeAss(
              part,
            )}`,
          );

          cursor = next;
        },
      );
    },
  );

  return [
    "[Script Info]",
    "ScriptType: v4.00+",
    "PlayResX: 1080",
    "PlayResY: 1920",
    "WrapStyle: 2",
    "ScaledBorderAndShadow: yes",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    "Style: Default,DejaVu Sans,48,&H00FFFFFF,&H00FFFFFF,&H00141414,&HB0000000,0,0,0,0,100,100,0,0,1,3,1,2,90,90,220,1",
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ...events,
    "",
  ].join("\n");
}