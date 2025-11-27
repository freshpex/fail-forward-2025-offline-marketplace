interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  className?: string;
}

export function LoadingSpinner({ size = 'medium', color, className = '' }: LoadingSpinnerProps) {
  const sizeClass = size === 'small' ? 'spinner-small' : size === 'large' ? 'spinner-large' : '';
  const colorStyle = color ? { borderTopColor: color } : {};

  return (
    <div
      className={`loading-spinner ${sizeClass} ${className}`.trim()}
      style={colorStyle}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}
