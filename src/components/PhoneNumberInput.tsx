import type { ComponentProps } from 'react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

type PhoneInputProps = ComponentProps<typeof PhoneInput>;

interface Props extends Omit<PhoneInputProps, 'value' | 'onChange'> {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
}

export function PhoneNumberInput({ label, value, onChange, error, required, ...rest }: Props) {
  return (
    <div className="form-group">
      <label className="form-label">
        {label}
        {required && <span className="required">*</span>}
      </label>
      <PhoneInput
        international
        countryCallingCodeEditable={false}
        defaultCountry="NG"
        value={value}
        onChange={(val) => onChange(val ?? '')}
        {...rest}
      />
      {error && <span className="error-text">{error}</span>}
    </div>
  );
}
