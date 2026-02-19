import { NavLink } from 'react-router-dom';

export function Header() {
  return (
    <header className="header">
      <div className="header-inner">
        <NavLink to="/" className="header-title">
          The Shrinking Word
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
      </div>
    </header>
  );
}
