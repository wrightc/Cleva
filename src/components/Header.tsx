import { NavLink } from 'react-router-dom';

interface HeaderProps {
  trippy: boolean;
  onToggleTrippy: () => void;
}

export function Header({ trippy, onToggleTrippy }: HeaderProps) {
  return (
    <header className="header">
      <div className="header-inner">
        <NavLink to="/" className="header-title">
          LoseIt
        </NavLink>
        <nav className="header-nav">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Play
          </NavLink>
          <NavLink to="/leaderboard" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Leaderboard
          </NavLink>
          <NavLink to="/how-to-play" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            How to Play
          </NavLink>
        </nav>
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
