import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api, { getApiErrorMessage } from '../api';
import { useAuth } from '../context/AuthContext';
import { FileSignature } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/register', { name, email, password });
      login(res.data.token, res.data.user);
      navigate('/');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Registration failed'));
    }
  };

  return (
    <div className="cin-auth-page">
      <motion.div
        className="cin-auth-card"
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="cin-auth-header">
          <motion.div
            className="cin-auth-icon"
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
          >
            <FileSignature />
          </motion.div>
          <h1 className="cin-auth-title">Create Account</h1>
          <p className="cin-auth-desc">Sign up to start signing documents</p>
        </div>

        {error && <div className="cin-error">{error}</div>}

        <form onSubmit={handleSubmit} className="cin-form">
          <div>
            <label>Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <motion.button 
            type="submit" 
            className="cin-submit-btn"
            whileHover={{ scale: 1.02, boxShadow: '0 0 20px rgba(139, 92, 246, 0.4)' }}
            whileTap={{ scale: 0.98 }}
          >
            Create Account
          </motion.button>
        </form>
        <p className="cin-auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}
