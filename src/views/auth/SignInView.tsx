import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function SignInView() {
  const { signInWithEmail, signInWithGoogle, signInWithApple } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmail(email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    try { await signInWithGoogle(); } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed');
    }
  }

  async function handleApple() {
    try { await signInWithApple(); } catch (err) {
      setError(err instanceof Error ? err.message : 'Apple sign-in failed');
    }
  }

  return (
    <div className="view">
      <div className="auth-card">
        <h1 className="auth-title">Sign In</h1>

        <div className="auth-oauth">
          <button className="oauth-btn oauth-btn--google" onClick={handleGoogle} type="button">
            Continue with Google
          </button>
          <button className="oauth-btn oauth-btn--apple" onClick={handleApple} type="button">
            Continue with Apple
          </button>
        </div>

        <div className="auth-divider"><span>or</span></div>

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="auth-label" htmlFor="signin-email">Email</label>
          <input
            id="signin-email"
            type="email"
            className="auth-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          <label className="auth-label" htmlFor="signin-password">Password</label>
          <input
            id="signin-password"
            type="password"
            className="auth-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="btn btn--primary btn--large" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="auth-footer">
          Don't have an account? <Link to="/sign-up" className="auth-link">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
