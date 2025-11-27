import { useState, useEffect } from 'react';
import { Button } from './Button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isInWebAppiOS = (window.navigator as any).standalone === true;

    if (isStandalone || isInWebAppiOS) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      const lastDismissed = localStorage.getItem('pwa-prompt-dismissed');
      const daysSinceDismissed = lastDismissed
        ? (Date.now() - parseInt(lastDismissed)) / (1000 * 60 * 60 * 24)
        : 999;

      if (daysSinceDismissed > 7) {
        setTimeout(() => setShowPrompt(true), 3000);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;

    if (choiceResult.outcome === 'accepted') {
      setShowPrompt(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
  };

  if (isInstalled || !showPrompt) return null;

  return (
    <div className="install-prompt">
      <div className="install-prompt-content">
        <div className="install-prompt-icon">
          <img src="/icons/icon-72x72.png" alt="AgriMarket" />
        </div>
        <div className="install-prompt-text">
          <h4>Install AgriMarket</h4>
          <p>Get quick access and work offline</p>
        </div>
        <div className="install-prompt-actions">
          <Button onClick={handleInstall} className="install-btn-small">
            Install
          </Button>
          <button onClick={handleDismiss} className="dismiss-btn">
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
