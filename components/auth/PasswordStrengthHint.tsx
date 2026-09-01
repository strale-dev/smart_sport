"use client";

import { cn } from "@/lib/utils";
import { AUTH_PASSWORD_MIN, getPasswordStrength } from "@/lib/auth/schema";

type PasswordStrengthHintProps = {
  password: string;
  className?: string;
};

export function PasswordStrengthHint({
  password,
  className,
}: PasswordStrengthHintProps) {
  const strength = getPasswordStrength(password);

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-muted-foreground text-xs">
        At least {AUTH_PASSWORD_MIN} characters with one letter and one number.
      </p>
      {password.length > 0 ? (
        <div className="space-y-1">
          <div className="flex gap-1">
            {[0, 1, 2, 3].map((index) => (
              <span
                key={index}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  strength.score > index ? "bg-primary" : "bg-muted"
                )}
              />
            ))}
          </div>
          <p className="text-muted-foreground text-xs">{strength.label}</p>
        </div>
      ) : null}
    </div>
  );
}
