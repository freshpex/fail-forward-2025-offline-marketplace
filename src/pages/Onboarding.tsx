import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';

export function Onboarding() {
  const navigate = useNavigate();

  return (
    <div className="onboarding-page">
      <div className="onboarding-container">
        <h1>Welcome to AgriMarket!</h1>
        <p>Your account has been created successfully.</p>

        <div className="onboarding-steps">
          <div className="onboarding-step">
            <div className="step-icon">✓</div>
            <h3>Account Created</h3>
            <p>You're now part of the AgriMarket community</p>
          </div>

          <div className="onboarding-step">
            <div className="step-icon">📱</div>
            <h3>Works Offline</h3>
            <p>Create listings even without internet</p>
          </div>

          <div className="onboarding-step">
            <div className="step-icon">🌾</div>
            <h3>Start Selling</h3>
            <p>List your produce and connect with buyers</p>
          </div>
        </div>

        <Button onClick={() => navigate('/dashboard')} variant="primary">
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}
