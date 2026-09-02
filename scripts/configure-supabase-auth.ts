import fs from "node:fs";
import path from "node:path";

import { loadLocalEnvForScripts } from "@/lib/env/load-local";

const PROJECT_REF = "zovobemlpqoclyjhvkpw";
const API_BASE = "https://api.supabase.com/v1";

type AuthConfigPatch = Record<string, string | number | boolean>;

function isRealResendKey(key: string | undefined): boolean {
  return (
    !!key &&
    key.startsWith("re_") &&
    key.length > 20 &&
    !key.includes("your_api")
  );
}

function readTemplate(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

async function getAccessToken(): Promise<string> {
  const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
  if (token) {
    return token;
  }

  throw new Error(
    "SUPABASE_ACCESS_TOKEN is missing. Create one at https://supabase.com/dashboard/account/tokens and add it to .env.local"
  );
}

async function patchAuthConfig(
  token: string,
  body: AuthConfigPatch
): Promise<void> {
  const response = await fetch(
    `${API_BASE}/projects/${PROJECT_REF}/config/auth`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Auth config PATCH failed (${response.status}): ${text}`);
  }
}

async function main() {
  loadLocalEnvForScripts();

  const token = await getAccessToken();
  const resendKey = process.env.RESEND_API_KEY;
  const googleClientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
  const googleClientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://scorence.app";

  const patch: AuthConfigPatch = {
    site_url: siteUrl,
    uri_allow_list:
      "http://127.0.0.1:3000/api/auth/callback,http://localhost:3000/api/auth/callback,http://127.0.0.1:3000/api/auth/callback/recovery,http://localhost:3000/api/auth/callback/recovery,https://scorence.app/api/auth/callback,https://scorence.app/api/auth/callback/recovery",
    mailer_autoconfirm: false,
    mailer_subjects_confirmation: "Confirm your Scorence account",
    mailer_subjects_recovery: "Reset your Scorence password",
    mailer_templates_confirmation_content: readTemplate(
      "supabase/templates/confirmation.html"
    ),
    mailer_templates_recovery_content: readTemplate(
      "supabase/templates/recovery.html"
    ),
  };

  if (isRealResendKey(resendKey)) {
    Object.assign(patch, {
      external_email_enabled: true,
      smtp_host: "smtp.resend.com",
      smtp_port: 465,
      smtp_user: "resend",
      smtp_pass: resendKey,
      smtp_admin_email: "hello@scorence.app",
      smtp_sender_name: "Scorence",
      smtp_max_frequency: 30,
    });
    console.log("Applying Resend SMTP (hello@scorence.app)…");
  } else {
    console.warn(
      "Skipping SMTP: set a real RESEND_API_KEY in .env.local (re_…, verified domain)."
    );
  }

  if (googleClientId && googleClientSecret) {
    Object.assign(patch, {
      external_google_enabled: true,
      external_google_client_id: googleClientId,
      external_google_secret: googleClientSecret,
      external_google_skip_nonce_check: true,
    });
    console.log("Applying Google OAuth credentials…");
  } else {
    Object.assign(patch, {
      external_google_enabled: false,
    });
    console.warn(
      "Google OAuth left disabled: set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET in .env.local"
    );
  }

  await patchAuthConfig(token, patch);
  console.log("Supabase auth config updated for project", PROJECT_REF);
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
