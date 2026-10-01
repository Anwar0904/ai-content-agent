"use client";
import type { ElementType } from "react";
import {
  AlertTriangle,
  CheckCircle2,

  RadioTower,
  ShieldCheck,
} from "lucide-react";
import {FaFacebook, FaInstagram} from "react-icons/fa"

import type { SocialAccountRow } from "@/services/dashboard/dashboardData";

import { FacebookPages } from "./FacebookPages";

export function SocialAccountsManager({
  accounts,
  oauthStatus,
  startWithAdd = false,
}: {
  accounts: SocialAccountRow[];
  oauthStatus?: string;
  startWithAdd?: boolean;
}) {
  const facebookAccounts =
    accounts.filter(
      (account) =>
        account.platform ===
        "facebook",
    );

  const connectedAccounts =
    accounts.filter(
      (account) =>
        account.status ===
        "connected",
    );

  const attentionAccounts =
    accounts.filter(
      (account) =>
        account.status ===
          "expired" ||
        account.status ===
          "reauthorization_required",
    );

  const connectedFacebook =
    facebookAccounts.filter(
      (account) =>
        account.status ===
          "connected" &&
        /^\d+$/.test(
          account.accountId,
        ),
    );

  return (
    <div className="space-y-7">
      {/* -------------------------------------------------------------- */}
      {/* Overview                                                      */}
      {/* -------------------------------------------------------------- */}

      <section
        aria-label="Social account overview"
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        <OverviewCard
          icon={RadioTower}
          label="Destinations"
          value={
            connectedAccounts.length
          }
          note="Available for publishing"
        />

        <OverviewCard
          icon={FaFacebook}
          label="Facebook Pages"
          value={
            connectedFacebook.length
          }
          note="Connected Pages"
        />

        <OverviewCard
          icon={ShieldCheck}
          label="Connection health"
          value={
            attentionAccounts.length ===
            0
              ? "Good"
              : `${attentionAccounts.length}`
          }
          note={
            attentionAccounts.length ===
            0
              ? "No action required"
              : "Needs attention"
          }
          good={
            attentionAccounts.length ===
            0
          }
          warning={
            attentionAccounts.length >
            0
          }
        />

        <OverviewCard
          icon={CheckCircle2}
          label="Publishing"
          value={
            connectedAccounts.length >
            0
              ? "Ready"
              : "Setup"
          }
          note={
            connectedAccounts.length >
            0
              ? "Destinations available"
              : "Connect an account"
          }
          good={
            connectedAccounts.length >
            0
          }
        />
      </section>

      {/* -------------------------------------------------------------- */}
      {/* Guidance                                                      */}
      {/* -------------------------------------------------------------- */}

      {connectedAccounts.length ===
        0 && (
        <section className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
            <RadioTower
              aria-hidden="true"
              size={17}
            />
          </span>

          <div>
            <h2 className="text-sm font-semibold text-blue-950">
              Connect your first publishing destination
            </h2>

            <p className="mt-1 text-sm leading-6 text-blue-700">
              Connect Facebook, choose the Page you manage, and it will become available when publishing approved videos.
            </p>
          </div>
        </section>
      )}

      {attentionAccounts.length >
        0 && (
        <section className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <AlertTriangle
            aria-hidden="true"
            size={17}
            className="mt-0.5 shrink-0 text-amber-700"
          />

          <div>
            <h2 className="text-sm font-semibold text-amber-950">
              A connection needs attention
            </h2>

            <p className="mt-1 text-sm leading-6 text-amber-800">
              Reconnect the affected Facebook account before trying to publish through it.
            </p>
          </div>
        </section>
      )}

      {/* -------------------------------------------------------------- */}
      {/* Facebook                                                      */}
      {/* -------------------------------------------------------------- */}

      <FacebookPages
        accounts={accounts}
        oauthStatus={oauthStatus}
        startWithAdd={startWithAdd}
      />

      {/* -------------------------------------------------------------- */}
      {/* Instagram development state                                   */}
      {/* -------------------------------------------------------------- */}

      {process.env.NODE_ENV !==
        "production" && (
        <section className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-zinc-600 shadow-sm ring-1 ring-zinc-200">
              <FaInstagram
                aria-hidden="true"
                size={18}
              />
            </span>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold text-zinc-950">
                  Instagram
                </h2>

                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                  Test mode
                </span>
              </div>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
                Instagram publishing is currently using the development mock provider. It does not publish to a real Instagram account.
              </p>

              <p className="mt-2 text-xs text-zinc-400">
                This development destination is intentionally separated from real connected accounts.
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function OverviewCard({
  icon: Icon,
  label,
  value,
  note,
  good = false,
  warning = false,
}: {
  icon: ElementType;
  label: string;
  value: string | number;
  note: string;
  good?: boolean;
  warning?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm sm:p-5 ${
        warning
          ? "border-amber-200 bg-amber-50"
          : good
            ? "border-emerald-200 bg-emerald-50"
            : "border-zinc-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={`text-xs font-medium ${
            warning
              ? "text-amber-700"
              : good
                ? "text-emerald-700"
                : "text-zinc-500"
          }`}
        >
          {label}
        </span>

        <Icon
          aria-hidden="true"
          size={15}
          className={
            warning
              ? "text-amber-600"
              : good
                ? "text-emerald-600"
                : "text-zinc-400"
          }
        />
      </div>

      <strong
        className={`mt-3 block text-2xl font-semibold tracking-tight ${
          warning
            ? "text-amber-950"
            : good
              ? "text-emerald-950"
              : "text-zinc-950"
        }`}
      >
        {value}
      </strong>

      <p
        className={`mt-1 text-xs ${
          warning
            ? "text-amber-700"
            : good
              ? "text-emerald-700"
              : "text-zinc-500"
        }`}
      >
        {note}
      </p>
    </div>
  );
}