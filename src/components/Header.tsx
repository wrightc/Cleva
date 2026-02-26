import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface HeaderProps {
  trippy: boolean;
  onToggleTrippy: () => void;
}

type GameContext = { prefix: string; name: string } | null;

function useGameContext(): GameContext {
  const { pathname } = useLocation();
  if (pathname.startsWith('/dropit')) return { prefix: '/dropit', name: 'DropIt' };
  if (pathname.startsWith('/dead-letters')) return { prefix: '/dead-letters', name: 'Dead Letters' };
  return null;
}

export function Header({ trippy, onToggleTrippy }: HeaderProps) {
  const game = useGameContext();
  const { user, profile, loading } = useAuth();

  return (
    <header className="header">
      <div className="header-inner">
        <NavLink to="/" className="header-title">
          Cleva.Me
        </NavLink>
        {game && (
          <>
            <nav className="header-nav">
              <NavLink
                to={game.prefix}
                end
                className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
              >
                Play
              </NavLink>
              <NavLink
                to={`${game.prefix}/leaderboard`}
                className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
              >
                Leaderboard
              </NavLink>
              <NavLink
                to={`${game.prefix}/how-to-play`}
                className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
              >
                How to Play
              </NavLink>
            </nav>
          </>
        )}
        <div className="header-right">
          {!loading && (
            user ? (
              <NavLink to="/profile" className="header-user">
                {profile?.display_name ?? 'Set Name'}
              </NavLink>
            ) : (
              <NavLink to="/sign-in" className="header-signin">
                Sign In
              </NavLink>
            )
          )}
          <button
            className={`trippy-toggle${trippy ? ' trippy-toggle--on' : ''}`}
            onClick={onToggleTrippy}
            title={trippy ? 'Switch to normal mode' : 'Go trippy'}
            aria-pressed={trippy}
          >
            🌈
          </button>
        </div>
      </div>
    </header>
  );
}
