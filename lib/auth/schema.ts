import { z } from "zod";

export const AUTH_EMAIL_MAX = 320;
export const AUTH_PASSWORD_MIN = 8;
export const AUTH_PASSWORD_MAX = 72;
export const AUTH_DISPLAY_NAME_MIN = 2;
export const AUTH_DISPLAY_NAME_MAX = 80;

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address")
  .max(AUTH_EMAIL_MAX, "Email is too long");

export const displayNameSchema = z
  .string()
  .trim()
  .min(AUTH_DISPLAY_NAME_MIN, "Display name must be at least 2 characters")
  .max(AUTH_DISPLAY_NAME_MAX, "Display name is too long")
  .regex(
    /^[\p{L}\p{N}][\p{L}\p{N} ._'-]*$/u,
    "Use letters, numbers, spaces, and . _ ' - only"
  );

export const passwordSchema = z
  .string()
  .min(
    AUTH_PASSWORD_MIN,
    `Password must be at least ${AUTH_PASSWORD_MIN} characters`
  )
  .max(
    AUTH_PASSWORD_MAX,
    `Password must be at most ${AUTH_PASSWORD_MAX} characters`
  )
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/\d/, "Include at least one number");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const signupSchema = z
  .object({
    displayName: displayNameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
    acceptTerms: z.boolean().refine((value) => value === true, {
      message: "Accept the Terms and Privacy Policy to continue",
    }),
    marketingOptIn: z.boolean().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const resetPasswordSchema = z.object({
  email: emailSchema,
});

export const updatePasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type LoginValues = z.infer<typeof loginSchema>;
export type SignupValues = z.infer<typeof signupSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
export type UpdatePasswordValues = z.infer<typeof updatePasswordSchema>;

export type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4;
  label: "Too weak" | "Weak" | "Fair" | "Good" | "Strong";
};

export function getPasswordStrength(password: string): PasswordStrength {
  if (password.length === 0) {
    return { score: 0, label: "Too weak" };
  }

  let score = 0;
  if (password.length >= AUTH_PASSWORD_MIN) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Za-z]/.test(password) && /\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  const labels: PasswordStrength["label"][] = [
    "Too weak",
    "Weak",
    "Fair",
    "Good",
    "Strong",
  ];

  const clamped = Math.min(score, 4) as PasswordStrength["score"];
  return { score: clamped, label: labels[clamped] };
}
