import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PhoneInput from 'react-phone-number-input';
import { useAuth } from '../contexts/AuthContext';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { ButtonSpinner } from '../components/ButtonSpinner';
import { showSuccess, showError, showLoading, dismissToast } from '../utils/toast';
import 'react-phone-number-input/style.css';

export function Signup() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    phone: ''
  });

  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
    phone?: string;
  }>({});

  const validatePassword = (password: string) => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    return null;
  };

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      newErrors.password = passwordError;
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.phone) {
      newErrors.phone = 'Phone number is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    const toastId = showLoading('Creating your account...');

    try {
      const { user, error } = await signUp(
        formData.email,
        formData.password,
        formData.phone
      );

      dismissToast(toastId);

      if (error) {
        showError(error.message || 'Failed to create account');
        return;
      }

      if (user) {
        showSuccess('Account created successfully!');
        navigate('/dashboard');
      }
    } catch (err) {
      dismissToast(toastId);
      showError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1>Create Your Account</h1>
          <p>Join AgriMarket and start selling your produce</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <Input
            label="Email Address"
            type="email"
            required
            value={formData.email}
            onChange={(e) => {
              setFormData({ ...formData, email: e.target.value });
              if (errors.email) setErrors({ ...errors, email: undefined });
            }}
            error={errors.email}
            placeholder="your@email.com"
          />

          <div className="form-group">
            <label className="form-label">
              Phone Number
              <span className="required">*</span>
            </label>
            <PhoneInput
              international
              defaultCountry="NG"
              value={formData.phone}
              onChange={(value) => {
                setFormData({ ...formData, phone: value || '' });
                if (errors.phone) setErrors({ ...errors, phone: undefined });
              }}
              className="phone-input"
            />
            {errors.phone && <span className="error-text">{errors.phone}</span>}
          </div>

          <div className="password-input-wrapper">
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              required
              value={formData.password}
              onChange={(e) => {
                setFormData({ ...formData, password: e.target.value });
                if (errors.password) setErrors({ ...errors, password: undefined });
              }}
              error={errors.password}
              placeholder="Create a strong password"
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>

          <Input
            label="Confirm Password"
            type={showPassword ? 'text' : 'password'}
            required
            value={formData.confirmPassword}
            onChange={(e) => {
              setFormData({ ...formData, confirmPassword: e.target.value });
              if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined });
            }}
            error={errors.confirmPassword}
            placeholder="Confirm your password"
          />

          <div className="password-requirements">
            <p>Password must contain:</p>
            <ul>
              <li className={formData.password.length >= 8 ? 'met' : ''}>
                At least 8 characters
              </li>
              <li className={/[A-Z]/.test(formData.password) ? 'met' : ''}>
                One uppercase letter
              </li>
              <li className={/[a-z]/.test(formData.password) ? 'met' : ''}>
                One lowercase letter
              </li>
              <li className={/[0-9]/.test(formData.password) ? 'met' : ''}>
                One number
              </li>
            </ul>
          </div>

          <Button type="submit" disabled={loading} className="auth-submit">
            {loading ? <><ButtonSpinner /> Creating account...</> : 'Create Account'}
          </Button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="auth-link">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
