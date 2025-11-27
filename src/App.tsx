import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { CreateListing } from './pages/CreateListing';
import { BrowseListings } from './pages/BrowseListings';
import { InstallGuide } from './pages/InstallGuide';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="create" element={<CreateListing />} />
          <Route path="browse" element={<BrowseListings />} />
          <Route path="install" element={<InstallGuide />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
