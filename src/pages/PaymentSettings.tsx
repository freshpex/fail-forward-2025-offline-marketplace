import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Button } from '../components/Button';

const NIGERIAN_BANKS = [
  { value: '', label: 'Select Bank' },
  { value: 'access', label: 'Access Bank' },
  { value: 'gtb', label: 'Guaranty Trust Bank' },
  { value: 'firstbank', label: 'First Bank of Nigeria' },
  { value: 'uba', label: 'United Bank for Africa' },
  { value: 'zenith', label: 'Zenith Bank' },
  { value: 'fidelity', label: 'Fidelity Bank' },
  { value: 'union', label: 'Union Bank' },
  { value: 'sterling', label: 'Sterling Bank' },
  { value: 'stanbic', label: 'Stanbic IBTC Bank' },
  { value: 'fcmb', label: 'First City Monument Bank' },
  { value: 'ecobank', label: 'Ecobank Nigeria' },
  { value: 'wema', label: 'Wema Bank' },
  { value: 'polaris', label: 'Polaris Bank' },
  { value: 'providus', label: 'Providus Bank' },
];

export function PaymentSettings() {
  return (
    <div className="payment-settings-page">
      <div className="container">
        <div className="page-header">
          <h1>Payment Settings</h1>
          <div className="coming-soon-badge">Coming Soon</div>
        </div>

        <p className="page-description">
          Sellers will soon be able to receive payments directly through the
          platform. This feature is currently in development.
        </p>

        <div className="payment-form-section">
          <div className="feature-preview-card">
            <div className="preview-icon">💳</div>
            <h2>Bank Account Details</h2>
            <p className="preview-subtitle">
              Link your bank account to receive payments securely
            </p>

            <form className="payment-form">
              <Input
                label="Account Holder Name"
                type="text"
                disabled
                placeholder="Full name as it appears on bank account"
              />

              <Input
                label="Account Number"
                type="text"
                disabled
                placeholder="10-digit account number"
                maxLength={10}
              />

              <Select
                label="Bank Name"
                disabled
                options={NIGERIAN_BANKS}
                value=""
                onChange={() => {}}
              />

              <div className="form-divider">
                <span>Alternative Payment Methods</span>
              </div>

              <Input
                label="Mobile Money Number (Optional)"
                type="tel"
                disabled
                placeholder="e.g., +234 803 123 4567"
              />

              <div className="feature-highlights">
                <div className="highlight-item">
                  <span className="highlight-icon">🔒</span>
                  <span>Bank-level security</span>
                </div>
                <div className="highlight-item">
                  <span className="highlight-icon">⚡</span>
                  <span>Instant transfers</span>
                </div>
                <div className="highlight-item">
                  <span className="highlight-icon">📊</span>
                  <span>Transaction history</span>
                </div>
              </div>

              <Button disabled className="btn-disabled-preview">
                Save Payment Details
              </Button>
            </form>
          </div>

          <div className="info-sidebar">
            <div className="info-card">
              <h3>Why add payment details?</h3>
              <ul>
                <li>Receive payments directly in your account</li>
                <li>Automatic payment processing</li>
                <li>Secure escrow protection</li>
                <li>Built-in dispute resolution</li>
              </ul>
            </div>

            <div className="info-card timeline-card">
              <h3>Development Timeline</h3>
              <div className="timeline-item">
                <span className="timeline-status completed">✓</span>
                <span>Marketplace launch</span>
              </div>
              <div className="timeline-item">
                <span className="timeline-status completed">✓</span>
                <span>Offline capability</span>
              </div>
              <div className="timeline-item">
                <span className="timeline-status in-progress">⏳</span>
                <span>Payment integration</span>
              </div>
              <div className="timeline-item">
                <span className="timeline-status upcoming">○</span>
                <span>Escrow system</span>
              </div>
            </div>

            <div className="info-card notify-card">
              <h3>Get Notified</h3>
              <p>We'll notify you when payment features are ready.</p>
              <Button className="btn-notify">
                🔔 Notify Me
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
