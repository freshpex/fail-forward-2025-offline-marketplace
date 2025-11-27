import { Link } from 'react-router-dom';
import { Button } from '../components/Button';

export function Home() {
  return (
    <div className="home">
      <div className="hero">
        <h2 className="hero-title">Connect Farmers with Buyers</h2>
        <p className="hero-subtitle">
          AgriMarket helps smallholder farmers list their produce and connect with buyers,
          even when offline. Your listings sync automatically when you're back online.
        </p>
        <div className="hero-actions">
          <Link to="/create">
            <Button variant="primary">Sell Your Produce</Button>
          </Link>
          <Link to="/browse">
            <Button variant="secondary">Browse Listings</Button>
          </Link>
        </div>
      </div>
      <div className="features">
        <div className="feature">
          <h3>Offline First</h3>
          <p>Create listings without internet. They'll sync when you're connected.</p>
        </div>
        <div className="feature">
          <h3>Simple & Fast</h3>
          <p>Quick listing form optimized for mobile and low-data connections.</p>
        </div>
        <div className="feature">
          <h3>Direct Contact</h3>
          <p>Buyers can reach you directly via phone to discuss your produce.</p>
        </div>
      </div>
    </div>
  );
}
