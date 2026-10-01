"use client";

import { Camera } from "lucide-react";
import { FacebookPages } from "./FacebookPages";
import type { SocialAccountRow } from "@/services/dashboard/dashboardData";

export function SocialAccountsManager({ accounts, oauthStatus, startWithAdd }: { accounts: SocialAccountRow[]; oauthStatus?: string; startWithAdd?: boolean }) {
  return (
    <div className="social-accounts-manager">
      <FacebookPages accounts={accounts} oauthStatus={oauthStatus} startWithAdd={startWithAdd} />
      {process.env.NODE_ENV !== "production" && (
        <section className="test-provider" aria-labelledby="instagram-test-title">
          <span className="platform-mark"><Camera aria-hidden="true" size={18} /></span>
          <div>
            <div className="test-provider-heading"><h2 id="instagram-test-title">Instagram</h2><span>TEST MODE</span></div>
            <p>This is a mock publishing destination for development only. It is not connected to Instagram and cannot publish to a real account.</p>
          </div>
        </section>
      )}
    </div>
  );
}
