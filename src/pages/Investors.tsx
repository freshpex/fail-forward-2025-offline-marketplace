import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { AnimatedCounter } from '../components/AnimatedCounter';
import { useScrollReveal } from '../hooks/useScrollReveal';
import '../styles/home-investors.css';

export function Investors() {
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
    <div className="investors-page">
      <section className="investor-hero" data-animate>
        <h1>Investment Opportunity in Agricultural Technology</h1>
        <p className="subtitle">
          Transforming smallholder farming through offline-first digital infrastructure
        </p>
      </section>

      <section className="problem-section" data-animate>
        <h2>The Problem</h2>
        <div className="problem-details">
          <div className="problem-item" data-animate>
            <h3>Market Inefficiency</h3>
            <p>
              80% of Nigerian farmers are smallholders relying on agriculture for their livelihood,
              yet they are trapped in low-income cycles due to limited market access and lack of
              real-time pricing information.
            </p>
          </div>
          <div className="problem-item" data-animate>
            <h3>Connectivity Challenges</h3>
            <p>
              Internet unreliability in rural areas forces dependence on exploitative middlemen,
              leading to income losses, market inefficiencies, and significant post-harvest waste.
            </p>
          </div>
          <div className="problem-item" data-animate>
            <h3>Technology Gap</h3>
            <p>
              Existing marketplace solutions require constant connectivity, excluding millions of
              farmers who need access to markets the most.
            </p>
          </div>
        </div>
      </section>

      <section className="solution-section" data-animate>
        <h2>Our Solution</h2>
        <p className="solution-intro">
          AgriMarket is a low-data digital marketplace that functions in poor connectivity
          environments, connecting smallholder farmers directly to buyers.
        </p>
        <div className="solution-features">
          <div className="solution-feature" data-animate>
            <div className="feature-icon">
              <img
                src="/assets/offline-to-online.jpg"
                alt="Offline to online transition"
                loading="lazy"
                decoding="async"
              />
            </div>
            <h3>Offline-First Technology</h3>
            <p>
              Progressive Web App that works without internet. Farmers create listings offline,
              which automatically sync when connectivity is available.
            </p>
          </div>
          <div className="solution-feature" data-animate>
            <div className="feature-icon">
              <img
                src="/assets/real-time-pricing.jpg"
                alt="Real-time pricing dashboard"
                loading="lazy"
                decoding="async"
              />
            </div>
            <h3>Real-Time Pricing</h3>
            <p>
              Access to reference market prices empowers farmers to negotiate fairly and
              make informed decisions about when and where to sell.
            </p>
          </div>
          <div className="solution-feature" data-animate>
            <div className="feature-icon">
              <img
                src="/assets/direct-connection.jpg"
                alt="Direct buyer and farmer connection"
                loading="lazy"
                decoding="async"
              />
            </div>
            <h3>Direct Connections</h3>
            <p>
              Eliminating middlemen allows farmers to retain more earnings while buyers
              access produce directly at fair prices.
            </p>
          </div>
        </div>
      </section>

      <section className="market-section" data-animate>
        <h2>Market Opportunity</h2>
        <div className="market-stats">
          <div className="market-stat" data-animate>
            <div className="stat-large">
              <AnimatedCounter
                value={150}
                formatter={(val) => `$${Math.round(val)}B USD`}
              />
            </div>
            <p>Agricultural market opportunity in sub-Saharan Africa</p>
          </div>
          <div className="market-stat" data-animate>
            <div className="stat-large">
              <AnimatedCounter
                value={200}
                formatter={(val) => `${Math.round(val)}M+`}
              />
            </div>
            <p>Potential users across Africa&apos;s smallholder farming population</p>
          </div>
          <div className="market-stat" data-animate>
            <div className="stat-large">
              <AnimatedCounter
                value={3}
                decimals={1}
                formatter={(val) => `${val.toFixed(1)}B`}
              />
            </div>
            <p>Underconnected users globally who could benefit from offline-first tech</p>
          </div>
        </div>
      </section>

      <section className="traction-section" data-animate>
        <h2>Impact & Traction</h2>
        <div className="traction-grid">
          <div className="traction-card" data-animate>
            <h3>Proven Model</h3>
            <p>
              Studies show that direct market access reduces post-harvest waste by up to 30%
              and increases farmer income by 25-40%.
            </p>
          </div>
          <div className="traction-card" data-animate>
            <h3>Scalable Technology</h3>
            <p>
              PWA architecture requires no app store distribution, minimal data usage, and
              works on any smartphone, ensuring rapid adoption in emerging markets.
            </p>
          </div>
          <div className="traction-card" data-animate>
            <h3>Social Impact</h3>
            <p>
              Direct contribution to UN Sustainable Development Goals: Zero Hunger, Decent Work,
              Reduced Inequalities, and Sustainable Communities.
            </p>
          </div>
        </div>
      </section>

      <section className="business-model" data-animate>
        <h2>Business Model</h2>
        <div className="revenue-streams">
          <div className="revenue-item" data-animate>
            <h3>Transaction Fees</h3>
            <p>Small percentage on completed transactions between farmers and buyers</p>
          </div>
          <div className="revenue-item" data-animate>
            <h3>Premium Features</h3>
            <p>Advanced analytics, priority listings, and bulk buyer subscriptions</p>
          </div>
          <div className="revenue-item" data-animate>
            <h3>Data Insights</h3>
            <p>Aggregated market intelligence for agricultural organizations and governments</p>
          </div>
          <div className="revenue-item" data-animate>
            <h3>Partnership Programs</h3>
            <p>Integration with cooperatives, logistics providers, and financial services</p>
          </div>
        </div>
      </section>

      <section className="team-section" data-animate>
        <h2>Why Now?</h2>
        <div className="timing-factors">
          <div className="timing-item" data-animate>
            <h4>Technology Maturity</h4>
            <p>
              Progressive Web Apps now provide native-like experiences with offline capabilities,
              making sophisticated mobile solutions accessible without app stores.
            </p>
          </div>
          <div className="timing-item" data-animate>
            <h4>Smartphone Penetration</h4>
            <p>
              Mobile phone ownership in Africa has surpassed 60%, with smartphones becoming
              increasingly affordable in rural areas.
            </p>
          </div>
          <div className="timing-item" data-animate>
            <h4>Market Demand</h4>
            <p>
              COVID-19 accelerated digital adoption in agriculture, with farmers and buyers
              actively seeking direct connection platforms.
            </p>
          </div>
          <div className="timing-item" data-animate>
            <h4>Policy Support</h4>
            <p>
              Governments and international organizations are prioritizing agricultural
              digitalization and smallholder farmer support programs.
            </p>
          </div>
        </div>
      </section>

      <section className="investment-ask" data-animate>
        <h2>Investment Opportunity</h2>
        <div className="ask-details">
          <p>
            We are seeking investment to scale operations, expand to additional markets,
            and enhance platform capabilities.
          </p>
          <div className="use-of-funds">
            <h3>Use of Funds</h3>
            <ul>
              <li data-animate>Market expansion across West and East Africa</li>
              <li data-animate>Technology development and platform enhancements</li>
              <li data-animate>Farmer onboarding and education programs</li>
              <li data-animate>Partnerships with cooperatives and agricultural organizations</li>
              <li data-animate>Team expansion in product, engineering, and operations</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="contact-section" data-animate>
        <h2>Let&apos;s Connect</h2>
        <p>
          Interested in learning more about this opportunity to create impact at scale?
        </p>
        <div className="contact-actions">
          <a href="mailto:epekipoluenoch@gmail.com">
            <Button variant="primary">Get In Touch</Button>
          </a>
          <Link to="/signup">
            <Button variant="secondary">Try the Platform</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
