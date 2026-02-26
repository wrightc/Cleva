import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function SignUpView() {
  const { signUpWithEmail, signInWithGoogle, signInWithApple } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await signUpWithEmail(email, password);
      setCheckEmail(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign up');
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

  if (checkEmail) {
    return (
      <div className="view">
        <div className="auth-card">
          <h1 className="auth-title">Check Your Email</h1>
          <p className="auth-message">
            We sent a confirmation link to <strong>{email}</strong>.
            Click the link in your email to finish signing up, then come back and sign in.
          </p>
          <Link to="/sign-in" className="btn btn--secondary btn--large">
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="view">
      <div className="auth-card">
        <h1 className="auth-title">Create Account</h1>

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
          <label className="auth-label" htmlFor="signup-email">Email</label>
          <input
            id="signup-email"
            type="email"
            className="auth-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          <label className="auth-label" htmlFor="signup-password">Password</label>
          <input
            id="signup-password"
            type="password"
            className="auth-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
          />

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="btn btn--primary btn--large" disabled={loading}>
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/sign-in" className="auth-link">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
