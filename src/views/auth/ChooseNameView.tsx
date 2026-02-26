import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getSupabase } from '../../lib/supabase';

export function ChooseNameView() {
  const { user, loading, needsDisplayName, setDisplayName } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [available, setAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Redirect if not logged in or already has name
  useEffect(() => {
    if (loading) return;
    if (!user) { navigate('/sign-in', { replace: true }); return; }
    if (!needsDisplayName) { navigate('/', { replace: true }); }
  }, [user, loading, needsDisplayName, navigate]);

  // Debounced availability check
  useEffect(() => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setAvailable(null);
      return;
    }
    if (!/^[a-zA-Z0-9 ]+$/.test(trimmed)) {
      setAvailable(null);
      return;
    }

    setChecking(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const { data } = await getSupabase()
        .from('profiles')
        .select('id')
        .ilike('display_name', trimmed)
        .limit(1);

      setAvailable(!data || data.length === 0);
      setChecking(false);
    }, 400);

    return () => clearTimeout(debounceRef.current);
  }, [name]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();

    if (trimmed.length < 2 || trimmed.length > 20) {
      setError('Name must be 2-20 characters');
      return;
    }
    if (!/^[a-zA-Z0-9 ]+$/.test(trimmed)) {
      setError('Only letters, numbers, and spaces allowed');
      return;
    }
    if (available === false) {
      setError('This name is already taken');
      return;
    }

    setError('');
    setSaving(true);
    try {
      await setDisplayName(trimmed);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save name');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="view view--centered">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="view">
      <div className="auth-card">
        <h1 className="auth-title">Choose a Display Name</h1>
        <p className="auth-message">
          This name will appear on leaderboards and is reserved just for you.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="auth-label" htmlFor="display-name">Display Name</label>
          <div className="name-check-wrap">
            <input
              id="display-name"
              type="text"
              className="auth-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              placeholder="2-20 characters"
              autoComplete="nickname"
              autoFocus
            />
            {name.trim().length >= 2 && (
              <span className={`name-availability ${checking ? 'name-availability--checking' : available ? 'name-availability--available' : available === false ? 'name-availability--taken' : ''}`}>
                {checking ? 'Checking...' : available ? 'Available' : available === false ? 'Taken' : ''}
              </span>
            )}
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button
            type="submit"
            className="btn btn--primary btn--large"
            disabled={saving || available === false || name.trim().length < 2}
          >
            {saving ? 'Saving...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
