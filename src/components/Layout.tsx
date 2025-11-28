import { Link, Outlet, useLocation } from 'react-router-dom';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useAuth } from '../contexts/AuthContext';
import { InstallPrompt } from './InstallPrompt';
import { UserDropdown } from './UserDropdown';
import { Footer } from './Footer';

export function Layout() {
  const isOnline = useOnlineStatus();
  const { user } = useAuth();
  const location = useLocation();
  const isLandingPage = location.pathname === '/';

  return (
    <div className="app">
      <header className="header">
        <div className="container header-container">
          <h1 className="logo">
            <Link to="/">AgriMarket</Link>
          </h1>
          <nav className="nav">
            <Link to="/browse" className="nav-link">Browse</Link>
            {user && <Link to="/create" className="nav-link">Sell Produce</Link>}
            <Link to="/investors" className="nav-link">Investors</Link>
            {!user && <Link to="/login" className="nav-link nav-link-login">Sell Produce</Link>}
            {!user && <Link to="/signup" className="nav-link nav-link-signup">Sign Up</Link>}
            {user && <UserDropdown />}
          </nav>
        </div>
        {!isOnline && (
          <div className="offline-banner">
            Offline Mode - Changes will sync when online
          </div>
        )}
      </header>
      <InstallPrompt />
      <main className={`main ${isLandingPage ? 'landing' : ''}`}>
        {isLandingPage ? <Outlet /> : (
          <div className="container">
            <Outlet />
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
