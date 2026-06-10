import { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from './context/AuthContext';
import Login from './components/Login';
import Register from './components/Register';
import Hub from './components/Hub';
import Dashboard from './components/Dashboard';
import SignDocument from './components/SignDocument';
import PublicSignDocument from './components/PublicSignDocument';
import PublicDocumentSign from './components/PublicDocumentSign';
import PublicDocumentView from './components/PublicDocumentView';
import Converter from './components/Converter';
import Layout from './components/Layout';
import Splash from './components/Splash';
import SafeFolder from './components/SafeFolder';
import Particles from './components/Particles';

function PrivateRoute({ children }: { children: React.ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  return user ? children : <Navigate to="/login" />;
}

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const navigate = useNavigate();

  const handleLogoClick = () => {
    navigate('/');
    setShowSplash(true);
  };

  // Check if current path is a public signing route — these bypass splash entirely
  const isPublicRoute = window.location.pathname.startsWith('/sign/public/') || window.location.pathname.startsWith('/doc/') || window.location.pathname.startsWith('/view/');

  return (
    <>
      <Particles count={60} />

      {/* Public routes always render immediately, no splash */}
      {isPublicRoute ? (
        <Routes>
          <Route path="/sign/public/:token" element={<PublicSignDocument />} />
          <Route path="/doc/:token" element={<PublicDocumentSign />} />
          <Route path="/view/:token" element={<PublicDocumentView />} />
        </Routes>
      ) : (
        <>
          <AnimatePresence>
            {showSplash && (
              <motion.div
                key="splash"
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.6, ease: 'easeInOut' }}
              >
                <Splash onEnter={() => {
                  navigate('/');
                  setShowSplash(false);
                }} />
              </motion.div>
            )}
          </AnimatePresence>

          {!showSplash && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/sign/public/:token" element={<PublicSignDocument />} />
                <Route path="/doc/:token" element={<PublicDocumentSign />} />
                <Route path="/" element={
                  <PrivateRoute>
                    <Layout onLogoClick={handleLogoClick}>
                      <Hub />
                    </Layout>
                  </PrivateRoute>
                } />
                <Route path="/dashboard" element={
                  <PrivateRoute>
                    <Layout onLogoClick={handleLogoClick}>
                      <Dashboard />
                    </Layout>
                  </PrivateRoute>
                } />
                <Route path="/sign/:id" element={
                  <PrivateRoute>
                    <Layout onLogoClick={handleLogoClick}>
                      <SignDocument />
                    </Layout>
                  </PrivateRoute>
                } />
                <Route path="/convert" element={
                  <PrivateRoute>
                    <Layout onLogoClick={handleLogoClick}>
                      <Converter />
                    </Layout>
                  </PrivateRoute>
                } />
                <Route path="/safe" element={
                  <PrivateRoute>
                    <Layout onLogoClick={handleLogoClick}>
                      <SafeFolder />
                    </Layout>
                  </PrivateRoute>
                } />
              </Routes>
            </motion.div>
          )}
        </>
      )}
    </>
  );
}

export default App;
