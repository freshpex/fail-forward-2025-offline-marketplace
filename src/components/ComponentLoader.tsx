import { LoadingSpinner } from './LoadingSpinner';

interface ComponentLoaderProps {
  overlay?: boolean;
  message?: string;
  size?: 'small' | 'medium' | 'large';
}

export function ComponentLoader({ overlay = false, message, size = 'medium' }: ComponentLoaderProps) {
  return (
    <div
      className={`component-loader ${overlay ? 'component-loader-overlay' : ''}`.trim()}
      role="status"
      aria-live="polite"
      aria-label={message || 'Loading content'}
    >
      <LoadingSpinner size={size} />
      {message && <p className="component-loader-message">{message}</p>}
    </div>
  );
}
