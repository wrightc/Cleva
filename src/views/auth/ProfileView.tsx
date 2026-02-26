import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

export function ProfileView() {
  const { user, profile, loading, signOut, setDisplayName } = useAuth();
  const navigate = useNavigate();

  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const [available, setAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!loading && !user) navigate('/sign-in', { replace: true });
  }, [user, loading, navigate]);

  // Debounced availability check when editing name
  useEffect(() => {
    if (!editing) return;
    const trimmed = newName.trim();
    if (trimmed.length < 2 || !/^[a-zA-Z0-9 ]+$/.test(trimmed)) {
      setAvailable(null);
      return;
    }
    // Don't flag current name as unavailable
    if (profile && trimmed.toLowerCase() === profile.display_name.toLowerCase()) {
      setAvailable(true);
      return;
    }

    setChecking(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .ilike('display_name', trimmed)
        .limit(1);
      setAvailable(!data || data.length === 0);
      setChecking(false);
    }, 400);

    return () => clearTimeout(debounceRef.current);
  }, [newName, editing, profile]);

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newName.trim();
    if (trimmed.length < 2 || trimmed.length > 20) { setError('Name must be 2-20 characters'); return; }
    if (!/^[a-zA-Z0-9 ]+$/.test(trimmed)) { setError('Only letters, numbers, and spaces allowed'); return; }
    if (available === false) { setError('This name is already taken'); return; }

    setError('');
    setSaving(true);
    try {
      await setDisplayName(trimmed);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update name');
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    navigate('/', { replace: true });
  }

  if (loading) {
    return (
      <div className="view view--centered">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="view">
      <div className="auth-card">
        <h1 className="auth-title">Profile</h1>

        <div className="profile-field">
          <span className="profile-label">Email</span>
          <span className="profile-value">{user.email}</span>
        </div>

        <div className="profile-field">
          <span className="profile-label">Display Name</span>
          {!editing ? (
            <div className="profile-name-row">
              <span className="profile-value">{profile?.display_name ?? 'Not set'}</span>
              <button
                className="btn btn--secondary"
                onClick={() => { setNewName(profile?.display_name ?? ''); setEditing(true); setError(''); }}
                style={{ padding: '6px 16px', fontSize: '0.85rem' }}
              >
                Change
              </button>
            </div>
          ) : (
            <form onSubmit={handleSaveName} className="profile-name-edit">
              <div className="name-check-wrap">
                <input
                  type="text"
                  className="auth-input"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  maxLength={20}
                  autoFocus
                />
                {newName.trim().length >= 2 && (
                  <span className={`name-availability ${checking ? 'name-availability--checking' : available ? 'name-availability--available' : available === false ? 'name-availability--taken' : ''}`}>
                    {checking ? 'Checking...' : available ? 'Available' : available === false ? 'Taken' : ''}
                  </span>
                )}
              </div>
              {error && <p className="auth-error">{error}</p>}
              <div className="profile-name-actions">
                <button type="submit" className="btn btn--primary" disabled={saving || available === false} style={{ padding: '8px 20px', fontSize: '0.9rem' }}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button type="button" className="btn btn--secondary" onClick={() => setEditing(false)} style={{ padding: '8px 20px', fontSize: '0.9rem' }}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        <button className="btn btn--secondary btn--large" onClick={handleSignOut}>
          Sign Out
        </button>
      </div>
    </div>
  );
}
