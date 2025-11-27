import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/Button';

export function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <h1>Welcome to AgriMarket</h1>
        <p>Hello, {user?.email}!</p>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Create Listing</h3>
          <p>List your produce for sale</p>
          <Link to="/create">
            <Button variant="primary">New Listing</Button>
          </Link>
        </div>

        <div className="dashboard-card">
          <h3>My Listings</h3>
          <p>View and manage your listings</p>
          <Link to="/my-listings">
            <Button variant="secondary">View Listings</Button>
          </Link>
        </div>

        <div className="dashboard-card">
          <h3>Browse Market</h3>
          <p>Explore available produce</p>
          <Link to="/browse">
            <Button variant="secondary">Browse</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
