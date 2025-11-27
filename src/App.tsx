import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Home } from './pages/Home';
import { CreateListing } from './pages/CreateListing';
import { BrowseListings } from './pages/BrowseListings';
import { InstallGuide } from './pages/InstallGuide';
import { Investors } from './pages/Investors';
import { Signup } from './pages/Signup';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Onboarding } from './pages/Onboarding';
import { MyListings } from './pages/MyListings';
import { GetStarted } from './pages/GetStarted';
import { PaymentSettings } from './pages/PaymentSettings';
import { Escrow } from './pages/Escrow';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="browse" element={<BrowseListings />} />
          <Route path="install" element={<InstallGuide />} />
          <Route path="investors" element={<Investors />} />
          <Route path="get-started" element={<GetStarted />} />
          <Route path="signup" element={<Signup />} />
          <Route path="login" element={<Login />} />

          <Route
            path="create"
            element={
              <ProtectedRoute>
                <CreateListing />
              </ProtectedRoute>
            }
          />
          <Route
            path="dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="my-listings"
            element={
              <ProtectedRoute>
                <MyListings />
              </ProtectedRoute>
            }
          />
          <Route
            path="onboarding"
            element={
              <ProtectedRoute>
                <Onboarding />
              </ProtectedRoute>
            }
          />
          <Route
            path="payment-settings"
            element={
              <ProtectedRoute>
                <PaymentSettings />
              </ProtectedRoute>
            }
          />
          <Route path="escrow" element={<Escrow />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
