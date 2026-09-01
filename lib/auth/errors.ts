const MESSAGE_BY_CODE: Record<string, string> = {
  invalid_credentials: "Invalid email or password.",
  email_not_confirmed: "Confirm your email before signing in.",
  user_already_exists: "An account with this email already exists.",
  over_email_send_rate_limit:
    "Too many emails sent. Try again in a few minutes.",
  over_request_rate_limit: "Too many attempts. Try again in a few minutes.",
  weak_password: "Password is too weak. Use at least 8 characters.",
  same_password: "New password must be different from the current one.",
  otp_expired: "This link has expired. Request a new one.",
  flow_state_expired: "This link has expired. Request a new one.",
  signup_disabled: "Sign up is currently disabled.",
  callback: "Could not complete sign-in. Try again.",
};

const MESSAGE_BY_SNIPPET: Array<[string, string]> = [
  ["email not confirmed", MESSAGE_BY_CODE.email_not_confirmed],
  ["invalid login credentials", MESSAGE_BY_CODE.invalid_credentials],
  ["user already registered", MESSAGE_BY_CODE.user_already_exists],
  ["already registered", MESSAGE_BY_CODE.user_already_exists],
];

export function mapAuthError(
  error: { code?: string; message?: string } | string | null | undefined
): string {
  if (!error) {
    return "Something went wrong. Please try again.";
  }

  if (typeof error === "string") {
    return mapFromMessage(error);
  }

  if (error.code && MESSAGE_BY_CODE[error.code]) {
    return MESSAGE_BY_CODE[error.code];
  }

  return mapFromMessage(error.message ?? "");
}

function mapFromMessage(message: string): string {
  const lower = message.toLowerCase();
  const match = MESSAGE_BY_SNIPPET.find(([snippet]) => lower.includes(snippet));
  if (match) {
    return match[1];
  }

  if (message.trim().length > 0) {
    return message;
  }

  return "Something went wrong. Please try again.";
}
