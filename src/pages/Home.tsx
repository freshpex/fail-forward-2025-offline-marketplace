import { Link } from 'react-router-dom';
import { Button } from '../components/Button';

export function Home() {
  return (
    <div className="landing-page">
      <div className="tagline-ribbon">
        Built for emerging markets • Works offline • Inclusive by design
      </div>

      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-headline">
            Empowering Smallholder Farmers Through Offline Access to Markets
          </h1>
          <p className="hero-subheadline">
            Buy and sell farm produce even without internet connecting rural farmers to opportunity.
          </p>
          <div className="hero-cta">
            <Link to="/signup">
              <Button variant="primary" className="cta-primary">Get Started</Button>
            </Link>
            <Link to="/investors">
              <Button variant="secondary" className="cta-secondary">Investor Overview</Button>
            </Link>
          </div>
        </div>
        <div className="hero-visual">
          <svg viewBox="0 0 600 400" className="hero-illustration">
            <defs>
              <linearGradient id="skyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#87CEEB" />
                <stop offset="100%" stopColor="#98D8C8" />
              </linearGradient>
            </defs>
            <rect width="600" height="400" fill="url(#skyGradient)" />
            <ellipse cx="300" cy="350" rx="280" ry="50" fill="#6B8E23" opacity="0.3" />
            <ellipse cx="300" cy="340" rx="250" ry="40" fill="#556B2F" opacity="0.4" />
            <rect x="100" y="200" width="120" height="150" fill="#8B4513" rx="5" />
            <path d="M 100 200 L 160 150 L 220 200 Z" fill="#DC143C" />
            <rect x="130" y="240" width="30" height="40" fill="#FFD700" />
            <rect x="170" y="240" width="20" height="30" fill="#87CEEB" />
            <circle cx="500" cy="80" r="40" fill="#FFD700" opacity="0.8" />
            <path d="M 320 280 Q 330 250 340 280" fill="none" stroke="#228B22" strokeWidth="3" />
            <circle cx="325" cy="285" r="8" fill="#32CD32" />
            <circle cx="335" cy="285" r="8" fill="#32CD32" />
            <path d="M 360 270 Q 370 240 380 270" fill="none" stroke="#228B22" strokeWidth="3" />
            <circle cx="365" cy="275" r="8" fill="#FF6347" />
            <circle cx="375" cy="275" r="8" fill="#FF6347" />
            <rect x="420" y="260" width="60" height="80" fill="#8B4513" rx="3" />
            <rect x="435" y="280" width="15" height="20" fill="#4682B4" />
            <rect x="455" y="280" width="15" height="20" fill="#4682B4" />
            <rect x="440" y="310" width="25" height="30" fill="#654321" />
            <path d="M 50 320 L 80 280 L 110 320 Z" fill="#228B22" />
            <path d="M 500 300 L 530 260 L 560 300 Z" fill="#2E8B57" />
          </svg>
        </div>
      </section>

      <section className="how-it-works">
        <h2 className="section-title">How It Works</h2>
        <p className="section-subtitle">Simple steps to connect with buyers</p>
        <div className="steps-grid">
          <div className="step-card">
            <div className="step-number">1</div>
            <h3>Create Listing</h3>
            <p>List your produce with quantity, price, and location. Works offline or online.</p>
          </div>
          <div className="step-card">
            <div className="step-number">2</div>
            <h3>Sync When Online</h3>
            <p>Your listings automatically sync to the marketplace when you reconnect.</p>
          </div>
          <div className="step-card">
            <div className="step-number">3</div>
            <h3>Connect to Buyers</h3>
            <p>Buyers see your produce and contact you directly to negotiate and purchase.</p>
          </div>
        </div>
      </section>

      <section className="why-matters">
        <div className="why-content">
          <h2 className="section-title">Why This Matters</h2>
          <div className="problems-grid">
            <div className="problem-card">
              <div className="problem-icon">🌍</div>
              <h3>Market Access</h3>
              <p>80% of Nigerian farmers are smallholders stuck in low-income cycles due to limited market access and unreliable internet.</p>
            </div>
            <div className="problem-card">
              <div className="problem-icon">💰</div>
              <h3>No Middlemen</h3>
              <p>Direct connections eliminate exploitative middlemen, allowing farmers to retain more of their earnings and buyers to pay fair prices.</p>
            </div>
            <div className="problem-card">
              <div className="problem-icon">🗑️</div>
              <h3>Reduced Waste</h3>
              <p>Better market visibility means less post-harvest waste, ensuring more produce reaches consumers efficiently.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="for-farmers">
        <div className="content-split">
          <div className="content-text">
            <h2 className="section-title">For Farmers</h2>
            <div className="feature-list">
              <div className="feature-item">
                <span className="feature-check">✓</span>
                <div>
                  <h4>Offline Listing Creation</h4>
                  <p>Create and save listings without internet. Everything syncs automatically when you're connected.</p>
                </div>
              </div>
              <div className="feature-item">
                <span className="feature-check">✓</span>
                <div>
                  <h4>Low Data Usage</h4>
                  <p>Optimized for 2G/3G networks with minimal data consumption. Works in rural areas with poor connectivity.</p>
                </div>
              </div>
              <div className="feature-item">
                <span className="feature-check">✓</span>
                <div>
                  <h4>Easy-to-Use Interface</h4>
                  <p>Simple, mobile-friendly design requiring no technical expertise. List your produce in under 2 minutes.</p>
                </div>
              </div>
              <div className="feature-item">
                <span className="feature-check">✓</span>
                <div>
                  <h4>Real-Time Pricing</h4>
                  <p>Access reference prices for your crops to make informed decisions and negotiate fairly.</p>
                </div>
              </div>
            </div>
            <Link to="/create">
              <Button variant="primary">Start Selling</Button>
            </Link>
          </div>
          <div className="content-visual">
            <div className="visual-placeholder">
              <svg viewBox="0 0 300 300" className="farmer-illustration">
                <circle cx="150" cy="150" r="140" fill="#F5F5DC" opacity="0.3" />
                <rect x="120" y="180" width="60" height="80" fill="#FFB84D" rx="5" />
                <circle cx="150" cy="140" r="30" fill="#8B4513" />
                <rect x="130" y="170" width="40" height="10" fill="#2d5016" />
                <rect x="110" y="190" width="25" height="50" fill="#FFB84D" />
                <rect x="165" y="190" width="25" height="50" fill="#FFB84D" />
                <rect x="135" y="260" width="12" height="30" fill="#654321" />
                <rect x="153" y="260" width="12" height="30" fill="#654321" />
                <circle cx="135" cy="135" r="3" fill="#000" />
                <circle cx="165" cy="135" r="3" fill="#000" />
                <path d="M 140 150 Q 150 155 160 150" fill="none" stroke="#000" strokeWidth="2" />
                <path d="M 120 110 Q 150 90 180 110" fill="#2d5016" />
                <rect x="70" y="200" width="30" height="40" fill="#228B22" rx="3" />
                <circle cx="75" cy="195" r="8" fill="#FF6347" />
                <circle cx="95" cy="195" r="8" fill="#FF6347" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      <section className="for-investors">
        <div className="investor-content">
          <h2 className="section-title">For Investors</h2>
          <p className="section-subtitle">Unlocking opportunity in agricultural markets</p>
          <div className="investor-grid">
            <div className="investor-stat">
              <div className="stat-number">80%</div>
              <div className="stat-label">Smallholder farmers in Nigeria</div>
            </div>
            <div className="investor-stat">
              <div className="stat-number">$150B USD</div>
              <div className="stat-label">Agricultural market opportunity</div>
            </div>
            <div className="investor-stat">
              <div className="stat-number">200M+</div>
              <div className="stat-label">Potential users across Africa</div>
            </div>
          </div>
          <div className="investor-features">
            <h3>Impact at Scale</h3>
            <ul>
              <li>Addressing real market inefficiencies in emerging economies</li>
              <li>Offline-first technology for 3 billion underconnected users globally</li>
              <li>Proven model reducing post-harvest waste by 30%</li>
              <li>Direct social impact on smallholder farmer livelihoods</li>
            </ul>
          </div>
          <Link to="/investors">
            <Button variant="primary">Learn More</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
