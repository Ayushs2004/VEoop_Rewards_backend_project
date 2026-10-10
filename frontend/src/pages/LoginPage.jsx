import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Key, Mail, User, ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';

export const LoginPage = () => {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        await register({ email, password, name });
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoUser = () => {
    setIsRegister(false);
    setEmail('demo@veloop.test');
    setPassword('Password123!');
    setError(null);
  };

  const fillDemoAdmin = () => {
    setIsRegister(false);
    setEmail('admin@veloop.test');
    setPassword('AdminPass123!');
    setError(null);
  };

  return (
    <div style={{ maxWidth: '440px', margin: '4rem auto', padding: '0 1rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div
          style={{
            width: '54px',
            height: '54px',
            margin: '0 auto 1rem',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 25px rgba(99, 102, 241, 0.4)'
          }}
        >
          <Sparkles size={28} color="#fff" />
        </div>
        <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>VELoop Rewards</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Demonstration Wallet & Verified Payout System
        </p>
      </div>

      <div className="glass-card">
        {/* 1-Click Quick Demo Login */}
        <div style={{ marginBottom: '1.5rem', background: 'rgba(255, 255, 255, 0.03)', padding: '0.85rem', borderRadius: '0.75rem', border: '1px dashed var(--border-color)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ShieldCheck size={14} color="#8b5cf6" />
            1-Click Quick Demo Access
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={fillDemoUser}
              style={{ fontSize: '0.8rem', padding: '0.5rem' }}
            >
              Demo User (25k VEs)
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={fillDemoAdmin}
              style={{ fontSize: '0.8rem', padding: '0.5rem', color: '#ec4899' }}
            >
              Admin Demo
            </button>
          </div>
        </div>

        {error && <div className="alert-banner error">{error}</div>}

        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
          <button
            type="button"
            onClick={() => { setIsRegister(false); setError(null); }}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: 'transparent',
              color: !isRegister ? '#8b5cf6' : 'var(--text-muted)',
              borderBottom: !isRegister ? '2px solid #8b5cf6' : 'none',
              fontWeight: 600
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsRegister(true); setError(null); }}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: 'transparent',
              color: isRegister ? '#8b5cf6' : 'var(--text-muted)',
              borderBottom: isRegister ? '2px solid #8b5cf6' : 'none',
              fontWeight: 600
            }}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              placeholder="xyz@email.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder=""
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {isRegister && (
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Must be 8–15 characters with uppercase, lowercase, number & special symbol.
              </span>
            )}
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width: '100%', marginTop: '0.5rem' }}
          >
            {loading ? 'Authenticating...' : isRegister ? 'Register & Open Wallet' : 'Sign In'}
            <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};
