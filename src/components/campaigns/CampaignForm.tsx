"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { DEFAULT_VIDEO_TEMPLATE_ID, VIDEO_TEMPLATE_IDS } from "@/constants/statuses";
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

function getFieldErrors(error: unknown): FieldErrors {
  if (!error || typeof error !== "object" || !("fields" in error)) return {};
  const fields = error.fields;
  if (!fields || typeof fields !== "object") return {};

  return Object.fromEntries(
    Object.entries(fields).filter(([field, message]) =>
      typeof field === "string" && typeof message === "string",
    ),
  ) as FieldErrors;
}

export function CampaignForm() {
  const router = useRouter();
  const [values, setValues] = useState<FormValues>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLock = useRef(false);

  function updateField(field: FieldName, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setGeneralError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLock.current) return;

    setGeneralError("");
    setFieldErrors({});

    const parsed = campaignFormSchema.safeParse({
      ...values,
      videoCount: Number(values.videoCount),
    });

    if (!parsed.success) {
      const errors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === "string" && !errors[field as FieldName]) {
          errors[field as FieldName] = issue.message;
        }
      }
      setFieldErrors(errors);
      return;
    }

    submitLock.current = true;
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: parsed.data.title,
          topic: parsed.data.topic,
          audience: parsed.data.audience,
          videoCount: parsed.data.videoCount,
          style: parsed.data.style,
          templateId: parsed.data.templateId,
          ...durationToRange(parsed.data.duration),
        }),
      });
      const result: unknown = await response.json();

      if (!response.ok) {
        const apiError =
          result && typeof result === "object" && "error" in result
            ? result.error
            : null;
        const apiFields = getFieldErrors(apiError);
        if (response.status === 400 && Object.keys(apiFields).length > 0) {
          setFieldErrors(apiFields);
        }
        setGeneralError(
          apiError && typeof apiError === "object" && "message" in apiError && typeof apiError.message === "string"
            ? apiError.message
            : "Something went wrong while creating the campaign.",
        );
        return;
      }

      router.push("/campaigns?created=1");
    } catch {
      setGeneralError("Something went wrong while creating the campaign. Please try again.");
    } finally {
      submitLock.current = false;
      setIsSubmitting(false);
    }
  }

  function errorProps(field: FieldName) {
    const id = `campaign-${field}`;
    const errorId = `${id}-error`;
    return {
      id,
      "aria-invalid": Boolean(fieldErrors[field]),
      "aria-describedby": fieldErrors[field] ? errorId : undefined,
    } as const;
  }

  return (
    <form className="form-panel" noValidate onSubmit={submit}>
      <section className="form-section">
        <h2 className="form-section-title">Campaign details</h2>
        <div className="form-grid">
          <label className="form-field full-width" htmlFor="campaign-title">
            <span className="form-label">Campaign name</span>
            <input
              {...errorProps("title")}
              className="form-control"
              maxLength={100}
              name="title"
              onChange={(event) => updateField("title", event.target.value)}
              placeholder="e.g. AI Tools for Developers"
              value={values.title}
            />
            {fieldErrors.title && <span className="form-error" id="campaign-title-error">{fieldErrors.title}</span>}
          </label>
          <label className="form-field full-width" htmlFor="campaign-topic">
            <span className="form-label">Topic</span>
            <input
              {...errorProps("topic")}
              className="form-control"
              maxLength={200}
              name="topic"
              onChange={(event) => updateField("topic", event.target.value)}
              placeholder="What should this campaign cover?"
              value={values.topic}
            />
            {fieldErrors.topic && <span className="form-error" id="campaign-topic-error">{fieldErrors.topic}</span>}
          </label>
          <label className="form-field full-width" htmlFor="campaign-audience">
            <span className="form-label">Audience</span>
            <input
              {...errorProps("audience")}
              className="form-control"
              maxLength={100}
              name="audience"
              onChange={(event) => updateField("audience", event.target.value)}
              placeholder="Who is this content for?"
              value={values.audience}
            />
            {fieldErrors.audience && <span className="form-error" id="campaign-audience-error">{fieldErrors.audience}</span>}
          </label>
          <label className="form-field" htmlFor="campaign-videoCount">
            <span className="form-label">Number of videos</span>
            <input
              {...errorProps("videoCount")}
              className="form-control"
              max={20}
              min={1}
              name="videoCount"
              onChange={(event) => updateField("videoCount", event.target.value)}
              type="number"
              value={values.videoCount}
            />
            <span className="form-hint">Choose between 1 and 20 videos.</span>
            {fieldErrors.videoCount && <span className="form-error" id="campaign-videoCount-error">Number of videos must be between 1 and 20.</span>}
          </label>
        </div>
      </section>

      <section className="form-section">
        <h2 className="form-section-title">Creative direction</h2>
        <div className="form-grid">
          <label className="form-field" htmlFor="campaign-style">
            <span className="form-label">Video style</span>
            <select
              {...errorProps("style")}
              className="form-control"
              name="style"
              onChange={(event) => updateField("style", event.target.value)}
              value={values.style}
            >
              <option>Educational</option>
              <option>Listicle</option>
              <option>News / Updates</option>
              <option>Tutorial</option>
              <option>Storytelling</option>
              <option>Promotional</option>
            </select>
            {fieldErrors.style && <span className="form-error" id="campaign-style-error">Please select a valid video style.</span>}
          </label>
          <label className="form-field" htmlFor="campaign-templateId">
            <span className="form-label">Video Template</span>
            <select
              {...errorProps("templateId")}
              className="form-control"
              name="templateId"
              onChange={(event) => updateField("templateId", event.target.value)}
              value={values.templateId}
            >
              {VIDEO_TEMPLATE_IDS.map((templateId) => (
                <option key={templateId} value={templateId}>
                  {templateId === "BIG_HOOK" ? "Big Hook" : templateId === "IMAGE_EXPLAINER" ? "Image Explainer" : "Top 5"}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field" htmlFor="campaign-duration">
            <span className="form-label">Duration</span>
            <select
              {...errorProps("duration")}
              className="form-control"
              name="duration"
              onChange={(event) => updateField("duration", event.target.value)}
              value={values.duration}
            >
              <option value="15-30">15–30 seconds</option>
              <option value="30-45">30–45 seconds</option>
              <option value="45-60">45–60 seconds</option>
            </select>
            <span className="form-hint">Choose the target length for each video.</span>
            {fieldErrors.duration && <span className="form-error" id="campaign-duration-error">Please select a valid duration.</span>}
          </label>
        </div>
      </section>

      {generalError && <div className="form-alert" role="alert">{generalError}</div>}

      <div className="form-footer">
        <button className="secondary-link" disabled={isSubmitting} onClick={() => router.push("/campaigns")} type="button">
          Cancel
        </button>
        <button className="primary-link" disabled={isSubmitting} type="submit">
          {isSubmitting && <LoaderCircle aria-hidden="true" className="button-spinner" size={14} />}
          {isSubmitting ? "Creating..." : "Create campaign"}
        </button>
      </div>
    </form>
  );
}