import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { showSuccess, showError } from '../utils/toast';

export function UserDropdown() {
  const { user, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const userInitial = user?.email?.charAt(0).toUpperCase() || 'U';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
      showSuccess('Logged out successfully');
      navigate('/');
      setIsOpen(false);
    } catch (error) {
      showError('Failed to log out');
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="user-dropdown" ref={dropdownRef}>
      <button
        className="user-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="user-avatar">{userInitial}</span>
        <span className="user-email">{user?.email}</span>
        <span className="dropdown-arrow">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="dropdown-menu" role="menu">
          <Link
            to="/dashboard"
            className="dropdown-item"
            onClick={() => setIsOpen(false)}
            role="menuitem"
          >
            My Dashboard
          </Link>
          <Link
            to="/my-listings"
            className="dropdown-item"
            onClick={() => setIsOpen(false)}
            role="menuitem"
          >
            My Listings
          </Link>
          <div className="dropdown-divider" />
          <Link
            to="/payment-settings"
            className="dropdown-item"
            onClick={() => setIsOpen(false)}
            role="menuitem"
          >
            Payment Settings
          </Link>
          <Link
            to="/escrow"
            className="dropdown-item dropdown-item-coming-soon"
            onClick={() => setIsOpen(false)}
            role="menuitem"
          >
            Escrow <span className="badge-mini">Coming Soon</span>
          </Link>
          <div className="dropdown-divider" />
          <button
            className="dropdown-item"
            onClick={handleLogout}
            disabled={loggingOut}
            role="menuitem"
          >
            {loggingOut ? 'Logging out...' : 'Logout'}
          </button>
        </div>
      )}
    </div>
  );
}
