interface Props {
  size?: number;
  className?: string;
}

/**
 * The GDG chevron mark: two arrowheads forming < >, each built from two
 * rounded bars in the Google palette.
 */
export default function GdgMark({ size = 32, className = "" }: Props) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      fill="none"
      strokeWidth="13"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M44 24 L20 50" stroke="#EA4335" />
      <path d="M20 50 L44 76" stroke="#4285F4" />
      <path d="M56 24 L80 50" stroke="#34A853" />
      <path d="M80 50 L56 76" stroke="#FBBC04" />
    </svg>
  );
}
