export interface SceneTiming {
  order: number;
  audioDuration: number;
  visualDuration: number;
  start: number;
  end: number;
}

const VISUAL_PADDING_SECONDS = 0.3;

export function calculateSceneTimings(audioDurations: Array<{ order: number; duration: number }>): SceneTiming[] {
  let cursor = 0;
  return audioDurations.map(({ order, duration }) => {
    if (!Number.isFinite(duration) || duration <= 0) throw new Error("Scene audio duration must be positive.");
    const visualDuration = duration + VISUAL_PADDING_SECONDS;
    const timing = { order, audioDuration: duration, visualDuration, start: cursor, end: cursor + visualDuration };
    cursor = timing.end;
    return timing;
  });
}
