import { NavLink, useLocation } from 'react-router-dom';

interface HeaderProps {
  trippy: boolean;
  onToggleTrippy: () => void;
}

type GameContext = { prefix: string; name: string } | null;

function useGameContext(): GameContext {
  const { pathname } = useLocation();
  if (pathname.startsWith('/loseit')) return { prefix: '/loseit', name: 'LoseIt' };
  if (pathname.startsWith('/dead-letters')) return { prefix: '/dead-letters', name: 'Dead Letters' };
  return null;
}

export function Header({ trippy, onToggleTrippy }: HeaderProps) {
  const game = useGameContext();

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
        <button
          className={`trippy-toggle${trippy ? ' trippy-toggle--on' : ''}`}
          onClick={onToggleTrippy}
          title={trippy ? 'Switch to normal mode' : 'Go trippy'}
          aria-pressed={trippy}
        >
          🌈
        </button>
      </div>
    </header>
  );
}
