import { Button } from '../components/Button';

export function Escrow() {
  return (
    <div className="escrow-page">
      <div className="container">
        <div className="escrow-hero">
          <div className="hero-badge">Coming Soon</div>
          <h1 className="escrow-title">AgriMarket Escrow</h1>
          <p className="escrow-subtitle">
            Secure transactions that protect both buyers and sellers
          </p>
        </div>

        <div className="escrow-content">
          <div className="intro-section">
            <p className="intro-text">
              We are building a secure escrow system to protect both buyers and
              sellers during transactions. For now, all purchases happen directly
              between buyer and seller.
            </p>
          </div>

          <div className="how-it-works-section">
            <h2>How Escrow Will Work</h2>
            <div className="steps-grid">
              <div className="escrow-step">
                <div className="step-number">1</div>
                <h3>Buyer Places Order</h3>
                <p>
                  Buyer commits to purchase and funds are held securely in escrow
                </p>
              </div>

              <div className="escrow-step">
                <div className="step-number">2</div>
                <h3>Seller Ships Product</h3>
                <p>
                  Seller prepares and ships the produce, updating tracking info
                </p>
              </div>

              <div className="escrow-step">
                <div className="step-number">3</div>
                <h3>Buyer Confirms Receipt</h3>
                <p>
                  Buyer inspects the product and confirms satisfaction
                </p>
              </div>

              <div className="escrow-step">
                <div className="step-number">4</div>
                <h3>Payment Released</h3>
                <p>
                  Funds are released to seller once buyer confirms delivery
                </p>
              </div>
            </div>
          </div>

          <div className="benefits-section">
            <h2>Escrow Benefits</h2>
            <div className="benefits-grid">
              <div className="benefit-card">
                <div className="benefit-icon">🔒</div>
                <h3>Buyer Protection</h3>
                <p>
                  Your money is safe until you confirm you've received quality
                  produce as described
                </p>
              </div>

              <div className="benefit-card">
                <div className="benefit-icon">✓</div>
                <h3>Seller Confidence</h3>
                <p>
                  Know that the buyer has committed funds before you ship your
                  products
                </p>
              </div>

              <div className="benefit-card">
                <div className="benefit-icon">⚖️</div>
                <h3>Dispute Resolution</h3>
                <p>
                  Built-in mediation process to handle disagreements fairly and
                  transparently
                </p>
              </div>

              <div className="benefit-card">
                <div className="benefit-icon">📱</div>
                <h3>Real-time Updates</h3>
                <p>
                  Track every step of your transaction from order to delivery
                </p>
              </div>

              <div className="benefit-card">
                <div className="benefit-icon">💰</div>
                <h3>Low Fees</h3>
                <p>
                  Competitive transaction fees that support platform development
                </p>
              </div>

              <div className="benefit-card">
                <div className="benefit-icon">🌐</div>
                <h3>Works Offline</h3>
                <p>
                  Escrow updates sync automatically when you're back online
                </p>
              </div>
            </div>
          </div>

          <div className="faq-section">
            <h2>Frequently Asked Questions</h2>
            <div className="faq-list">
              <div className="faq-item">
                <h4>When will escrow be available?</h4>
                <p>
                  We're actively developing the escrow system and expect to launch
                  it in the coming months. Sign up for notifications below to be
                  among the first to know.
                </p>
              </div>

              <div className="faq-item">
                <h4>How much will escrow cost?</h4>
                <p>
                  We plan to charge a small percentage fee (typically 2-3%) split
                  between buyer and seller to maintain the secure platform.
                </p>
              </div>

              <div className="faq-item">
                <h4>What happens if there's a dispute?</h4>
                <p>
                  Our mediation team will review evidence from both parties and
                  make a fair decision based on our marketplace policies.
                </p>
              </div>

              <div className="faq-item">
                <h4>Is my money safe in escrow?</h4>
                <p>
                  Yes. Funds are held in secure, regulated bank accounts and only
                  released according to the transaction agreement.
                </p>
              </div>
            </div>
          </div>

          <div className="cta-section">
            <h2>Want to be notified when escrow launches?</h2>
            <p>Join our waiting list and get early access</p>
            <Button className="btn-notify-large">
              🔔 Notify Me When Ready
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
