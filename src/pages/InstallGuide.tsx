import { useState } from 'react';
import { Button } from '../components/Button';

export function InstallGuide() {
  const [platform, setPlatform] = useState<'android' | 'ios'>('android');

  return (
    <div className="install-guide">
      <div className="install-hero">
        <img src="/inAppiPicture.png" alt="AgriMarket" className="install-hero-image" />
        <h2>Install AgriMarket</h2>
        <p className="install-subtitle">
          Get the full app experience with offline access, faster loading, and easy access from your home screen.
        </p>
      </div>

      <div className="platform-selector">
        <button
          className={`platform-btn ${platform === 'android' ? 'active' : ''}`}
          onClick={() => setPlatform('android')}
        >
          Android / Chrome
        </button>
        <button
          className={`platform-btn ${platform === 'ios' ? 'active' : ''}`}
          onClick={() => setPlatform('ios')}
        >
          iOS / Safari
        </button>
      </div>

      {platform === 'android' && (
        <div className="install-steps">
          <h3>Install on Android (Chrome)</h3>

          <div className="install-step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h4>Open Chrome Browser</h4>
              <p>Navigate to AgriMarket website using Google Chrome on your Android device.</p>
            </div>
          </div>

          <div className="install-step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h4>Tap the Menu</h4>
              <p>Tap the three dots (⋮) in the top-right corner of Chrome.</p>
            </div>
          </div>

          <div className="install-step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h4>Add to Home Screen</h4>
              <p>Select "Add to Home screen" or "Install app" from the menu.</p>
            </div>
          </div>

          <div className="install-step">
            <div className="step-number">4</div>
            <div className="step-content">
              <h4>Confirm Installation</h4>
              <p>Tap "Add" or "Install" to confirm. The AgriMarket icon will appear on your home screen.</p>
            </div>
          </div>

          <div className="install-step">
            <div className="step-number">5</div>
            <div className="step-content">
              <h4>Launch the App</h4>
              <p>Tap the AgriMarket icon on your home screen to open the app. It works just like a native app!</p>
            </div>
          </div>

          <div className="install-benefits">
            <h4>Benefits:</h4>
            <ul>
              <li>Works offline - create listings without internet</li>
              <li>Faster loading times</li>
              <li>No app store required</li>
              <li>Automatic updates</li>
              <li>Less data usage</li>
            </ul>
          </div>
        </div>
      )}

      {platform === 'ios' && (
        <div className="install-steps">
          <h3>Install on iPhone/iPad (Safari)</h3>

          <div className="install-step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h4>Open Safari Browser</h4>
              <p>Navigate to AgriMarket website using Safari on your iPhone or iPad.</p>
              <p className="note">Note: This feature only works in Safari, not Chrome or other browsers on iOS.</p>
            </div>
          </div>

          <div className="install-step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h4>Tap the Share Button</h4>
              <p>Tap the share icon (square with arrow pointing up) at the bottom of the screen.</p>
            </div>
          </div>

          <div className="install-step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h4>Add to Home Screen</h4>
              <p>Scroll down and tap "Add to Home Screen" in the share menu.</p>
            </div>
          </div>

          <div className="install-step">
            <div className="step-number">4</div>
            <div className="step-content">
              <h4>Customize the Name</h4>
              <p>You can edit the name if you want, then tap "Add" in the top-right corner.</p>
            </div>
          </div>

          <div className="install-step">
            <div className="step-number">5</div>
            <div className="step-content">
              <h4>Launch the App</h4>
              <p>Find the AgriMarket icon on your home screen and tap it to open the app.</p>
            </div>
          </div>

          <div className="install-benefits">
            <h4>Benefits:</h4>
            <ul>
              <li>Works offline - create listings without internet</li>
              <li>Appears like a native app</li>
              <li>No App Store download needed</li>
              <li>Saves storage space</li>
              <li>Always up to date</li>
            </ul>
          </div>
        </div>
      )}

      <div className="install-troubleshoot">
        <h3>Troubleshooting</h3>
        <div className="troubleshoot-item">
          <h4>Don't see the install option?</h4>
          <p>Make sure you're using a supported browser (Chrome on Android, Safari on iOS) and have a stable internet connection.</p>
        </div>
        <div className="troubleshoot-item">
          <h4>App won't open?</h4>
          <p>Try clearing your browser cache and reinstalling the app.</p>
        </div>
        <div className="troubleshoot-item">
          <h4>Need help?</h4>
          <p>The app works just as well in your regular browser. No installation required!</p>
        </div>
      </div>

      <div className="install-cta">
        <Button onClick={() => window.history.back()}>
          Back to AgriMarket
        </Button>
      </div>
    </div>
  );
}
