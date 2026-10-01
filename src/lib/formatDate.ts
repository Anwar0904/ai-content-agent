export function formatDate(
  date?: Date | string | null,
): string {
  if (!date) {
    return "—";
  }

  const parsedDate =
    date instanceof Date
      ? date
      : new Date(date);

  if (
    Number.isNaN(
      parsedDate.getTime(),
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    },
  ).format(parsedDate);
}

export function formatDateTime(
  date?: Date | string | null,
): string {
  if (!date) {
    return "—";
  }

  const parsedDate =
    date instanceof Date
      ? date
      : new Date(date);

  if (
    Number.isNaN(
      parsedDate.getTime(),
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    },
  ).format(parsedDate);
}

export function formatRelativeDate(
  date?: Date | string | null,
): string {
  if (!date) {
    return "—";
  }

  const parsedDate =
    date instanceof Date
      ? date
      : new Date(date);

  if (
    Number.isNaN(
      parsedDate.getTime(),
    )
  ) {
    return "—";
  }

  const difference =
    parsedDate.getTime() -
    Date.now();

  const minutes = Math.round(
    difference / 60_000,
  );

  if (Math.abs(minutes) < 60) {
    if (Math.abs(minutes) <= 1) {
      return "Just now";
    }

    return new Intl.RelativeTimeFormat(
      "en",
      {
        numeric: "auto",
      },
    ).format(
      minutes,
      "minute",
    );
  }

  const hours = Math.round(
    difference / 3_600_000,
  );

  if (Math.abs(hours) < 24) {
    return new Intl.RelativeTimeFormat(
      "en",
      {
        numeric: "auto",
      },
    ).format(
      hours,
      "hour",
    );
  }

  const days = Math.round(
    difference / 86_400_000,
  );

  if (Math.abs(days) < 7) {
    return new Intl.RelativeTimeFormat(
      "en",
      {
        numeric: "auto",
      },
    ).format(
      days,
      "day",
    );
  }

  return formatDate(parsedDate);
}