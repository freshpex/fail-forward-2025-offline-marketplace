import { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="form-group">
      <label className="form-label">
        {label}
        {props.required && <span className="required">*</span>}
      </label>
      <input
        className={`form-input ${error ? 'error' : ''} ${className}`}
        {...props}
      />
      {error && <span className="error-text">{error}</span>}
    </div>
  );
}
