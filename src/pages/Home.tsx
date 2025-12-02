import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { AnimatedCounter } from '../components/AnimatedCounter';
import { useScrollReveal } from '../hooks/useScrollReveal';
import '../styles/home-investors.css';

export function Home() {
  useScrollReveal();

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (prefersReducedMotion) {
      document
        .querySelectorAll<HTMLElement>('[data-animate]')
        .forEach((element) => element.classList.add('is-visible'));
    }

    return undefined;
  }, []);

  return (
    <div className="landing-page">
      <div className="tagline-ribbon" data-animate>
        Built for emerging markets • Works offline • Inclusive by design
      </div>

      <section className="hero-section" data-animate>
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
          <div className="hero-image-wrapper" data-animate>
            <img
              src="/assets/herosection.png"
              alt="Farmer using mobile marketplace"
              className="hero-image"
              width={600}
              height={350}
              decoding="async"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      <section className="how-it-works" data-animate>
        <h2 className="section-title">How It Works</h2>
        <p className="section-subtitle">Simple steps to connect with buyers</p>
        <div className="steps-grid">
          <div className="step-card" data-animate>
            <div className="step-number">1</div>
            <h3>Create Listing</h3>
            <p>List your produce with quantity, price, and location. Works offline or online.</p>
          </div>
          <div className="step-card" data-animate>
            <div className="step-number">2</div>
            <h3>Sync When Online</h3>
            <p>Your listings automatically sync to the marketplace when you reconnect.</p>
          </div>
          <div className="step-card" data-animate>
            <div className="step-number">3</div>
            <h3>Connect to Buyers</h3>
            <p>Buyers see your produce and contact you directly to negotiate and purchase.</p>
          </div>
        </div>
      </section>

      <section className="why-matters" data-animate>
        <div className="why-content">
          <h2 className="section-title">Why This Matters</h2>
          <div className="problems-grid">
            <div className="problem-card" data-animate>
              <div className="problem-icon">
                <img
                  src="/assets/market-access.jpg"
                  alt="Farmer accessing broader market"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <h3>Market Access</h3>
              <p>80% of Nigerian farmers are smallholders stuck in low-income cycles due to limited market access and unreliable internet.</p>
            </div>
            <div className="problem-card" data-animate>
              <div className="problem-icon">
                <img
                  src="/assets/middle-man.png"
                  alt="Direct connections without middlemen"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <h3>No Middlemen</h3>
              <p>Direct connections eliminate exploitative middlemen, allowing farmers to retain more of their earnings and buyers to pay fair prices.</p>
            </div>
            <div className="problem-card" data-animate>
              <div className="problem-icon">
                <img
                  src="/assets/waste.jpg"
                  alt="Reducing post-harvest waste"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <h3>Reduced Waste</h3>
              <p>Better market visibility means less post-harvest waste, ensuring more produce reaches consumers efficiently.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="for-farmers" data-animate>
        <div className="content-split">
          <div className="content-text" data-animate>
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
            <div className="visual-placeholder" data-animate>
              <img
                src="/assets/bottom.png"
                alt="Farmer preparing produce for sale"
                width={450}
                height={300}
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="for-investors" data-animate>
        <div className="investor-content">
          <h2 className="section-title">For Investors</h2>
          <p className="section-subtitle">Unlocking opportunity in agricultural markets</p>
          <div className="investor-grid">
            <div className="investor-stat">
              <div className="stat-number">
                <AnimatedCounter value={80} suffix="%" />
              </div>
              <div className="stat-label">Smallholder farmers in Nigeria</div>
            </div>
            <div className="investor-stat">
              <div className="stat-number">
                <AnimatedCounter
                  value={150}
                  formatter={(val) => `$${Math.round(val)}B USD`}
                />
              </div>
              <div className="stat-label">Agricultural market opportunity</div>
            </div>
            <div className="investor-stat">
              <div className="stat-number">
                <AnimatedCounter
                  value={200}
                  formatter={(val) => `${Math.round(val)}M+`}
                />
              </div>
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
