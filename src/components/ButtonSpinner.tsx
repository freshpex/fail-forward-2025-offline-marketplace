interface ButtonSpinnerProps {
  className?: string;
}

export function ButtonSpinner({ className = '' }: ButtonSpinnerProps) {
  return (
    <span
      className={`button-spinner ${className}`.trim()}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </span>
  );
}
