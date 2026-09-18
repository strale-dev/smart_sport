type PitchMarkingsProps = {
  className?: string;
};

/** Vertical pitch markings in FIFA proportions (68 × 105). */
export function PitchMarkings({ className }: PitchMarkingsProps) {
  const stroke = "currentColor";
  const sw = 0.35;

  return (
    <svg
      viewBox="0 0 68 105"
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <pattern
          id="pitch-stripes"
          width="68"
          height="10.5"
          patternUnits="userSpaceOnUse"
        >
          <rect width="68" height="10.5" fill="rgba(255,255,255,0.02)" />
          <rect y="10.5" width="68" height="10.5" fill="rgba(0,0,0,0.04)" />
        </pattern>
      </defs>
      <rect x="0" y="0" width="68" height="105" fill="url(#pitch-stripes)" />
      <rect
        x="1"
        y="1"
        width="66"
        height="103"
        fill="none"
        stroke={stroke}
        strokeWidth={sw}
      />
      <line
        x1="1"
        y1="52.5"
        x2="67"
        y2="52.5"
        stroke={stroke}
        strokeWidth={sw}
      />
      <circle
        cx="34"
        cy="52.5"
        r="9.15"
        fill="none"
        stroke={stroke}
        strokeWidth={sw}
      />
      <circle cx="34" cy="52.5" r="0.6" fill={stroke} />
      <rect
        x="13.84"
        y="1"
        width="40.32"
        height="16.5"
        fill="none"
        stroke={stroke}
        strokeWidth={sw * 0.9}
      />
      <rect
        x="24.84"
        y="1"
        width="18.32"
        height="5.5"
        fill="none"
        stroke={stroke}
        strokeWidth={sw * 0.9}
      />
      <rect
        x="13.84"
        y="87.5"
        width="40.32"
        height="16.5"
        fill="none"
        stroke={stroke}
        strokeWidth={sw * 0.9}
      />
      <rect
        x="24.84"
        y="98"
        width="18.32"
        height="5.5"
        fill="none"
        stroke={stroke}
        strokeWidth={sw * 0.9}
      />
      <circle cx="34" cy="12" r="0.6" fill={stroke} />
      <circle cx="34" cy="93" r="0.6" fill={stroke} />
      <path
        d="M 13.84 22.5 A 9.15 9.15 0 0 0 24.84 22.5"
        fill="none"
        stroke={stroke}
        strokeWidth={sw * 0.9}
      />
      <path
        d="M 54.16 22.5 A 9.15 9.15 0 0 1 43.16 22.5"
        fill="none"
        stroke={stroke}
        strokeWidth={sw * 0.9}
      />
      <path
        d="M 13.84 82.5 A 9.15 9.15 0 0 1 24.84 82.5"
        fill="none"
        stroke={stroke}
        strokeWidth={sw * 0.9}
      />
      <path
        d="M 54.16 82.5 A 9.15 9.15 0 0 0 43.16 82.5"
        fill="none"
        stroke={stroke}
        strokeWidth={sw * 0.9}
      />
      <rect x="0" y="46" width="2" height="13" fill={stroke} opacity="0.5" />
      <rect x="66" y="46" width="2" height="13" fill={stroke} opacity="0.5" />
      <path
        d="M 1 1 A 1.5 1.5 0 0 1 2.5 2.5"
        fill="none"
        stroke={stroke}
        strokeWidth={sw * 0.7}
      />
      <path
        d="M 67 1 A 1.5 1.5 0 0 0 65.5 2.5"
        fill="none"
        stroke={stroke}
        strokeWidth={sw * 0.7}
      />
      <path
        d="M 1 104 A 1.5 1.5 0 0 0 2.5 102.5"
        fill="none"
        stroke={stroke}
        strokeWidth={sw * 0.7}
      />
      <path
        d="M 67 104 A 1.5 1.5 0 0 1 65.5 102.5"
        fill="none"
        stroke={stroke}
        strokeWidth={sw * 0.7}
      />
    </svg>
  );
}
