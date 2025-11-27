import { Link } from 'react-router-dom';
import { Button } from '../components/Button';

export function GetStarted() {
  return (
    <div className="signup-page">
      <div className="signup-container">
        <h1>Get Started with AgriMarket</h1>
        <p className="signup-subtitle">
          No registration required! AgriMarket works instantly without creating an account.
        </p>

        <div className="signup-options">
          <div className="signup-option">
            <div className="option-icon">🌾</div>
            <h2>I'm a Farmer</h2>
            <p>Start selling your produce directly to buyers</p>
            <Link to="/create">
              <Button variant="primary">Create Listing</Button>
            </Link>
          </div>

          <div className="signup-option">
            <div className="option-icon">🛒</div>
            <h2>I'm a Buyer</h2>
            <p>Browse fresh produce from local farmers</p>
            <Link to="/browse">
              <Button variant="primary">Browse Listings</Button>
            </Link>
          </div>
        </div>

        <div className="signup-benefits">
          <h3>Why AgriMarket?</h3>
          <div className="benefits-grid">
            <div className="benefit-item">
              <span className="benefit-icon">✓</span>
              <p>No account required - start immediately</p>
            </div>
            <div className="benefit-item">
              <span className="benefit-icon">✓</span>
              <p>Works offline - no internet needed</p>
            </div>
            <div className="benefit-item">
              <span className="benefit-icon">✓</span>
              <p>Direct contact between farmers and buyers</p>
            </div>
            <div className="benefit-item">
              <span className="benefit-icon">✓</span>
              <p>Reference prices for informed decisions</p>
            </div>
            <div className="benefit-item">
              <span className="benefit-icon">✓</span>
              <p>Low data usage - optimized for 2G/3G</p>
            </div>
            <div className="benefit-item">
              <span className="benefit-icon">✓</span>
              <p>Free to use - no hidden fees</p>
            </div>
          </div>
        </div>

        <div className="install-cta">
          <h3>Install as an App</h3>
          <p>Get the best experience by installing AgriMarket on your device</p>
          <Link to="/install">
            <Button variant="secondary">Installation Guide</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
