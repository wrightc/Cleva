import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function AuthCallbackView() {
  const { user, loading, needsDisplayName } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate('/sign-in', { replace: true });
    } else if (needsDisplayName) {
      navigate('/choose-name', { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  }, [user, loading, needsDisplayName, navigate]);

  return (
    <div className="view view--centered">
      <div className="loading-spinner" />
      <p className="loading-text">Completing sign-in...</p>
    </div>
  );
}
