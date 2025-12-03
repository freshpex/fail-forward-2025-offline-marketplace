import { InputHTMLAttributes, useRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  /** If true, select the whole input value when focused (useful for number fields) */
  selectOnFocus?: boolean;
}

export function Input({ label, error, className = '', selectOnFocus, onFocus, ...props }: InputProps) {
  const ref = useRef<HTMLInputElement | null>(null);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // If selectOnFocus is enabled or the input is a number, select the value for quick replacement
    const shouldSelect = selectOnFocus ?? props.type === 'number';
    if (shouldSelect && ref.current) {
      try {
        ref.current.select();
      } catch {
        // ignore selection errors in older browsers
      }
    }

    if (onFocus) onFocus(e);
  };

  return (
    <div className="form-group">
      <label className="form-label">
        {label}
        {props.required && <span className="required">*</span>}
      </label>
      <input
        ref={ref}
        className={`form-input ${error ? 'error' : ''} ${className}`}
        onFocus={handleFocus}
        {...props}
      />
      {error && <span className="error-text">{error}</span>}
    </div>
  );
}
