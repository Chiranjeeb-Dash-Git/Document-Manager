import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FileSignature, LogOut, LayoutDashboard } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Layout({ children, onLogoClick }: { children: React.ReactNode, onLogoClick?: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="cin-layout">
      <nav className="cin-nav">
        <div 
          className="cin-brand" 
          onClick={onLogoClick} 
          style={{ cursor: onLogoClick ? 'pointer' : 'default' }}
        >
          <div className="cin-brand-icon">
            <FileSignature />
          </div>
          <span>Home</span>
        </div>
        <div className="cin-nav-right">
          <Link to="/" className="cin-nav-link">
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Link>
          <Link to="/convert" className="cin-nav-link">
            <FileSignature className="w-4 h-4" />
            Tools
          </Link>
          <div className="cin-nav-user">
            <span className="cin-nav-greeting">
              Hello, <strong>{user?.name}</strong>
            </span>
            <button onClick={handleLogout} className="cin-logout-btn">
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </nav>
      <motion.main
        className="cin-main"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="cin-container">
          {children}
        </div>
      </motion.main>
    </div>
  );
}
