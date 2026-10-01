"use client";

import {
  AlertCircle,
  Check,
  Clapperboard,
  FileText,
  LoaderCircle,
  Sparkles,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useRef,
  useState,
  type FormEvent,
} from "react";

import {
  DEFAULT_VIDEO_TEMPLATE_ID,
  VIDEO_TEMPLATE_IDS,
} from "@/constants/statuses";
import {
  campaignFormSchema,
  durationToRange,
  type CampaignFormInput,
} from "@/schemas/campaign.schema";

interface FormValues {
  title: string;
  topic: string;
  audience: string;
  videoCount: string;
  style: CampaignFormInput["style"];
  templateId: CampaignFormInput["templateId"];
  duration: CampaignFormInput["duration"];
}

type FieldName = keyof FormValues;
type FieldErrors = Partial<Record<FieldName, string>>;

const initialValues: FormValues = {
  title: "",
  topic: "",
  audience: "",
  videoCount: "3",
  style: "Educational",
  templateId: DEFAULT_VIDEO_TEMPLATE_ID,
  duration: "30-45",
};

const STYLE_OPTIONS: Array<{
  value: CampaignFormInput["style"];
  label: string;
  description: string;
}> = [
  {
    value: "Educational",
    label: "Educational",
    description: "Teach or explain a topic clearly.",
  },
  {
    value: "Listicle",
    label: "Listicle",
    description: "Present several useful points or recommendations.",
  },
  {
    value: "News / Updates",
    label: "News / Updates",
    description: "Share current developments or announcements.",
  },
  {
    value: "Tutorial",
    label: "Tutorial",
    description: "Walk viewers through a process step by step.",
  },
  {
    value: "Storytelling",
    label: "Storytelling",
    description: "Use narrative structure to keep attention.",
  },
  {
    value: "Promotional",
    label: "Promotional",
    description: "Highlight a product, service, or offer.",
  },
];

function getFieldErrors(error: unknown): FieldErrors {
  if (
    !error ||
    typeof error !== "object" ||
    !("fields" in error)
  ) {
    return {};
  }

  const fields = error.fields;

  if (!fields || typeof fields !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(fields).filter(
      ([field, message]) =>
        typeof field === "string" &&
        typeof message === "string",
    ),
  ) as FieldErrors;
}

function getTemplateLabel(templateId: string): string {
  switch (templateId) {
    case "BIG_HOOK":
      return "Big Hook";

    case "IMAGE_EXPLAINER":
      return "Image Explainer";

    case "TOP_5":
      return "Top 5";

    default:
      return templateId;
  }
}

function getTemplateDescription(templateId: string): string {
  switch (templateId) {
    case "BIG_HOOK":
      return "Start with a strong opening designed to capture attention quickly.";

    case "IMAGE_EXPLAINER":
      return "Use visual scenes with concise explanations.";

    case "TOP_5":
      return "Create a structured list-style video.";

    default:
      return "Choose how the video should be structured.";
  }
}

export function CampaignForm() {
  const router = useRouter();

  const [values, setValues] =
    useState<FormValues>(initialValues);

  const [fieldErrors, setFieldErrors] =
    useState<FieldErrors>({});

  const [generalError, setGeneralError] =
    useState("");

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const submitLock = useRef(false);

  function updateField(
    field: FieldName,
    value: string,
  ) {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));

    setFieldErrors((current) => ({
      ...current,
      [field]: undefined,
    }));

    setGeneralError("");
  }

  async function submit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (submitLock.current) {
      return;
    }

    setGeneralError("");
    setFieldErrors({});

    const parsed =
      campaignFormSchema.safeParse({
        ...values,
        videoCount: Number(values.videoCount),
      });

    if (!parsed.success) {
      const errors: FieldErrors = {};

      for (const issue of parsed.error.issues) {
        const field = issue.path[0];

        if (
          typeof field === "string" &&
          !errors[field as FieldName]
        ) {
          errors[field as FieldName] =
            issue.message;
        }
      }

      setFieldErrors(errors);

      const firstInvalidField =
        document.querySelector<HTMLElement>(
          '[aria-invalid="true"]',
        );

      window.setTimeout(() => {
        firstInvalidField?.focus();
      }, 0);

      return;
    }

    submitLock.current = true;
    setIsSubmitting(true);

    try {
      const response = await fetch(
        "/api/campaigns",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            title: parsed.data.title,
            topic: parsed.data.topic,
            audience: parsed.data.audience,
            videoCount:
              parsed.data.videoCount,
            style: parsed.data.style,
            templateId:
              parsed.data.templateId,
            ...durationToRange(
              parsed.data.duration,
            ),
          }),
        },
      );

      const result: unknown =
        await response.json();

      if (!response.ok) {
        const apiError =
          result &&
          typeof result === "object" &&
          "error" in result
            ? result.error
            : null;

        const apiFields =
          getFieldErrors(apiError);

        if (
          response.status === 400 &&
          Object.keys(apiFields).length > 0
        ) {
          setFieldErrors(apiFields);
        }

        setGeneralError(
          apiError &&
            typeof apiError === "object" &&
            "message" in apiError &&
            typeof apiError.message ===
              "string"
            ? apiError.message
            : "We couldn't create the campaign. Please try again.",
        );

        return;
      }

      router.push(
        "/campaigns?created=1",
      );
    } catch {
      setGeneralError(
        "We couldn't create the campaign. Check your connection and try again.",
      );
    } finally {
      submitLock.current = false;
      setIsSubmitting(false);
    }
  }

  function errorProps(
    field: FieldName,
  ) {
    const id = `campaign-${field}`;
    const errorId = `${id}-error`;

    return {
      id,
      "aria-invalid": Boolean(
        fieldErrors[field],
      ),
      "aria-describedby":
        fieldErrors[field]
          ? errorId
          : undefined,
    } as const;
  }

  return (
    <form
      noValidate
      onSubmit={submit}
      className="space-y-6"
    >
      {/* -------------------------------------------------------------- */}
      {/* Campaign basics                                                */}
      {/* -------------------------------------------------------------- */}

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-5 py-5 sm:px-6">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700">
              <FileText
                aria-hidden="true"
                size={17}
              />
            </span>

            <div>
              <h2 className="text-base font-semibold text-zinc-950">
                Campaign basics
              </h2>

              <p className="mt-1 text-sm leading-6 text-zinc-500">
                Define what this campaign is about and who it should reach.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <Field
            label="Campaign name"
            hint="Give this campaign a clear internal name so you can find it later."
            error={fieldErrors.title}
            errorId="campaign-title-error"
          >
            <input
              {...errorProps("title")}
              autoComplete="off"
              className={inputClass(
                Boolean(fieldErrors.title),
              )}
              maxLength={100}
              name="title"
              onChange={(event) =>
                updateField(
                  "title",
                  event.target.value,
                )
              }
              placeholder="e.g. AI Tools for Developers"
              value={values.title}
            />
          </Field>

          <Field
            label="Topic"
            hint="Describe the subject you want the generated videos to focus on."
            error={fieldErrors.topic}
            errorId="campaign-topic-error"
          >
            <textarea
              {...errorProps("topic")}
              className={`${inputClass(
                Boolean(fieldErrors.topic),
              )} min-h-28 resize-y`}
              maxLength={200}
              name="topic"
              onChange={(event) =>
                updateField(
                  "topic",
                  event.target.value,
                )
              }
              placeholder="e.g. Practical AI tools developers can use to code faster and work more efficiently."
              value={values.topic}
            />
          </Field>

          <Field
            label="Target audience"
            hint="Be specific. This helps the generated content use the right language and level of detail."
            error={fieldErrors.audience}
            errorId="campaign-audience-error"
          >
            <div className="relative">
              <Users
                aria-hidden="true"
                size={16}
                className="pointer-events-none absolute left-3 top-3.5 text-zinc-400"
              />

              <input
                {...errorProps("audience")}
                className={`${inputClass(
                  Boolean(
                    fieldErrors.audience,
                  ),
                )} pl-10`}
                maxLength={100}
                name="audience"
                onChange={(event) =>
                  updateField(
                    "audience",
                    event.target.value,
                  )
                }
                placeholder="e.g. Junior and mid-level software developers"
                value={values.audience}
              />
            </div>
          </Field>
        </div>
      </section>

      {/* -------------------------------------------------------------- */}
      {/* Video setup                                                    */}
      {/* -------------------------------------------------------------- */}

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-5 py-5 sm:px-6">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700">
              <Clapperboard
                aria-hidden="true"
                size={17}
              />
            </span>

            <div>
              <h2 className="text-base font-semibold text-zinc-950">
                Video setup
              </h2>

              <p className="mt-1 text-sm leading-6 text-zinc-500">
                Choose how many videos to create and how they should look.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
          <Field
            label="Number of videos"
            hint="You can create between 1 and 5 videos in this campaign."
            error={
              fieldErrors.videoCount
            }
            errorId="campaign-videoCount-error"
          >
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map(
                (count) => {
                  const selected =
                    Number(
                      values.videoCount,
                    ) === count;

                  return (
                    <button
                      key={count}
                      type="button"
                      aria-pressed={selected}
                      onClick={() =>
                        updateField(
                          "videoCount",
                          String(count),
                        )
                      }
                      className={`min-h-11 rounded-lg border text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 ${
                        selected
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
                      }`}
                    >
                      {count}
                    </button>
                  );
                },
              )}
            </div>

            <input
              {...errorProps(
                "videoCount",
              )}
              type="hidden"
              name="videoCount"
              value={values.videoCount}
            />
          </Field>

          <Field
            label="Target duration"
            hint="Choose the approximate length for each generated video."
            error={
              fieldErrors.duration
            }
            errorId="campaign-duration-error"
          >
            <select
              {...errorProps("duration")}
              className={inputClass(
                Boolean(
                  fieldErrors.duration,
                ),
              )}
              name="duration"
              onChange={(event) =>
                updateField(
                  "duration",
                  event.target.value,
                )
              }
              value={values.duration}
            >
              <option value="15-30">
                15–30 seconds
              </option>

              <option value="30-45">
                30–45 seconds
              </option>

              <option value="45-60">
                45–60 seconds
              </option>
            </select>
          </Field>
        </div>
      </section>

      {/* -------------------------------------------------------------- */}
      {/* Creative direction                                             */}
      {/* -------------------------------------------------------------- */}

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-5 py-5 sm:px-6">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700">
              <Sparkles
                aria-hidden="true"
                size={17}
              />
            </span>

            <div>
              <h2 className="text-base font-semibold text-zinc-950">
                Creative direction
              </h2>

              <p className="mt-1 text-sm leading-6 text-zinc-500">
                Set the tone and structure used to shape your videos.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6 p-5 sm:p-6">
          <fieldset>
            <legend className="text-sm font-semibold text-zinc-900">
              Video style
            </legend>

            <p className="mt-1 text-sm text-zinc-500">
              Choose the type of presentation that best fits this campaign.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {STYLE_OPTIONS.map(
                (option) => {
                  const selected =
                    values.style ===
                    option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={
                        selected
                      }
                      onClick={() =>
                        updateField(
                          "style",
                          option.value,
                        )
                      }
                      className={`relative rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 ${
                        selected
                          ? "border-zinc-900 bg-zinc-50"
                          : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-sm font-semibold text-zinc-900">
                          {option.label}
                        </span>

                        {selected && (
                          <span className="flex size-5 items-center justify-center rounded-full bg-zinc-900 text-white">
                            <Check
                              aria-hidden="true"
                              size={12}
                            />
                          </span>
                        )}
                      </div>

                      <p className="mt-1.5 text-xs leading-5 text-zinc-500">
                        {
                          option.description
                        }
                      </p>
                    </button>
                  );
                },
              )}
            </div>

            <input
              {...errorProps("style")}
              type="hidden"
              name="style"
              value={values.style}
            />

            {fieldErrors.style && (
              <p
                id="campaign-style-error"
                className="mt-2 flex items-center gap-1.5 text-xs font-medium text-red-600"
              >
                <AlertCircle
                  aria-hidden="true"
                  size={13}
                />
                {
                  fieldErrors.style
                }
              </p>
            )}
          </fieldset>

          <fieldset>
            <legend className="text-sm font-semibold text-zinc-900">
              Video template
            </legend>

            <p className="mt-1 text-sm text-zinc-500">
              Select the structure used when generating each video.
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {VIDEO_TEMPLATE_IDS.map(
                (templateId) => {
                  const selected =
                    values.templateId ===
                    templateId;

                  return (
                    <button
                      key={templateId}
                      type="button"
                      aria-pressed={
                        selected
                      }
                      onClick={() =>
                        updateField(
                          "templateId",
                          templateId,
                        )
                      }
                      className={`relative rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 ${
                        selected
                          ? "border-zinc-900 bg-zinc-50"
                          : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-sm font-semibold text-zinc-900">
                          {getTemplateLabel(
                            templateId,
                          )}
                        </span>

                        {selected && (
                          <span className="flex size-5 items-center justify-center rounded-full bg-zinc-900 text-white">
                            <Check
                              aria-hidden="true"
                              size={12}
                            />
                          </span>
                        )}
                      </div>

                      <p className="mt-1.5 text-xs leading-5 text-zinc-500">
                        {getTemplateDescription(
                          templateId,
                        )}
                      </p>
                    </button>
                  );
                },
              )}
            </div>

            <input
              {...errorProps(
                "templateId",
              )}
              type="hidden"
              name="templateId"
              value={values.templateId}
            />

            {fieldErrors.templateId && (
              <p
                id="campaign-templateId-error"
                className="mt-2 flex items-center gap-1.5 text-xs font-medium text-red-600"
              >
                <AlertCircle
                  aria-hidden="true"
                  size={13}
                />
                {
                  fieldErrors.templateId
                }
              </p>
            )}
          </fieldset>
        </div>
      </section>

      {/* -------------------------------------------------------------- */}
      {/* Summary                                                        */}
      {/* -------------------------------------------------------------- */}

      <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-zinc-900">
          Campaign summary
        </h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryItem
            label="Videos"
            value={values.videoCount}
          />

          <SummaryItem
            label="Duration"
            value={`${values.duration.replace(
              "-",
              "–",
            )} sec`}
          />

          <SummaryItem
            label="Style"
            value={values.style}
          />

          <SummaryItem
            label="Template"
            value={getTemplateLabel(
              values.templateId,
            )}
          />
        </div>
      </section>

      {generalError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5"
        >
          <AlertCircle
            aria-hidden="true"
            size={17}
            className="mt-0.5 shrink-0 text-red-700"
          />

          <div>
            <p className="text-sm font-semibold text-red-900">
              Campaign could not be created
            </p>

            <p className="mt-0.5 text-sm text-red-700">
              {generalError}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 border-t border-zinc-200 pt-5 sm:flex-row sm:items-center sm:justify-end">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() =>
            router.push("/campaigns")
          }
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <LoaderCircle
                aria-hidden="true"
                className="animate-spin"
                size={15}
              />
              Creating campaign...
            </>
          ) : (
            <>
              <Sparkles
                aria-hidden="true"
                size={15}
              />
              Create campaign
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  error,
  errorId,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  errorId: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-zinc-900">
        {label}
      </label>

      {hint && (
        <p className="mt-1 text-xs leading-5 text-zinc-500">
          {hint}
        </p>
      )}

      <div className="mt-2">
        {children}
      </div>

      {error && (
        <p
          id={errorId}
          className="mt-2 flex items-center gap-1.5 text-xs font-medium text-red-600"
        >
          <AlertCircle
            aria-hidden="true"
            size={13}
          />
          {error}
        </p>
      )}
    </div>
  );
}

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
        {label}
      </dt>

      <dd className="mt-1 text-sm font-semibold text-zinc-800">
        {value}
      </dd>
    </div>
  );
}

function inputClass(
  hasError: boolean,
): string {
  return [
    "w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition",
    "placeholder:text-zinc-400",
    "focus:ring-2 focus:ring-zinc-900/10",
    hasError
      ? "border-red-300 focus:border-red-500"
      : "border-zinc-200 focus:border-zinc-400",
  ].join(" ");
}