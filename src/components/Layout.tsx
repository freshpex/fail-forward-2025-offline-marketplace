import { Link, Outlet } from 'react-router-dom';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { InstallPrompt } from './InstallPrompt';

export function Layout() {
  const isOnline = useOnlineStatus();

  return (
    <div className="app">
      <header className="header">
        <div className="container">
          <h1 className="logo">
            <Link to="/">AgriMarket</Link>
          </h1>
          <nav className="nav">
            <Link to="/create" className="nav-link">Sell Produce</Link>
            <Link to="/browse" className="nav-link">Browse</Link>
            <Link to="/install" className="nav-link install-link">Install</Link>
          </nav>
        </div>
        {!isOnline && (
          <div className="offline-banner">
            Offline Mode - Changes will sync when online
          </div>
        )}
      </header>
      <InstallPrompt />
      <main className="main">
        <div className="container">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
