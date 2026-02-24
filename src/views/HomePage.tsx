import { Link } from 'react-router-dom';

export function HomePage() {
  return (
    <div className="view view--home">
      <h1 className="home-title">Cleva.Me Games</h1>
      <p className="home-subtitle">Daily word puzzles — a new challenge every day</p>

      <div className="home-games">
        <Link to="/loseit" className="game-card">
          <h2 className="game-card__title">LoseIt</h2>
          <p className="game-card__description">
            Remove letters one at a time to shrink a word down to two letters.
            Every step must form a valid English word.
          </p>
          <span className="game-card__cta btn btn--primary">Play LoseIt</span>
        </Link>

        <Link to="/dead-letters" className="game-card">
          <h2 className="game-card__title">Dead Letters</h2>
          <p className="game-card__description">
            Unscramble the consonants to reveal the hidden word.
            The vowels have been removed — can you put the pieces back together?
          </p>
          <span className="game-card__cta btn btn--primary">Play Dead Letters</span>
        </Link>
      </div>
    </div>
  );
}
