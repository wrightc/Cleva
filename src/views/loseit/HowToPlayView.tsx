export function HowToPlayView() {
  const exampleChain = ['ABRIDGED', 'BRIDGED', 'RIDGED', 'RIDGE', 'RIDE', 'RID', 'ID'];
  const year = new Date().getFullYear();

  return (
    <div className="view">
      <h1 className="view-title">How to Play</h1>

      <div className="how-to-play">
        <section className="how-to-section">
          <h2>The Goal</h2>
          <p>
            Each day you're given an <strong>8-letter word</strong>. Your goal is to reduce it to a
            two-letter word by removing one letter at a time — where every step must form a valid
            English word.
          </p>
        </section>

        <section className="how-to-section">
          <h2>Example</h2>
          <div className="how-to-chain">
            {exampleChain.map((word, i) => (
              <span key={i} className="how-to-chain__item">
                <span className="how-to-chain__word">{word}</span>
                {i < exampleChain.length - 1 && (
                  <span className="how-to-chain__arrow" aria-hidden="true"> → </span>
                )}
              </span>
            ))}
          </div>
          <p className="how-to-note">
            ABRIDGED → BRIDGED (remove A) → RIDGED (remove B) → RIDGE (remove D) →
            RIDE (remove G) → RID (remove E) → ID (remove R)
          </p>
        </section>

        <section className="how-to-section">
          <h2>Rules</h2>
          <ul className="how-to-rules">
            <li>Remove <strong>exactly one letter</strong> per step, from any position.</li>
            <li>Each resulting word must be a <strong>valid English word</strong>.</li>
            <li>You may <strong>not</strong> add letters, rearrange letters, or skip steps.</li>
            <li>There may be multiple valid solution paths — any correct path is accepted.</li>
            <li>A new puzzle is available every day at <strong>midnight Eastern time</strong>.</li>
          </ul>
        </section>

        <section className="how-to-section">
          <h2>Scoring</h2>
          <p>
            Your score is your <strong>solve time</strong>. The timer starts when the puzzle loads.
            Faster is better! Ties are broken by fewer extra steps, then earlier submission.
          </p>
          <p>
            The minimum number of steps is always <strong>6</strong> (to go from 8 letters to 2).
          </p>
        </section>

        <section className="how-to-section">
          <h2>Tips</h2>
          <ul className="how-to-rules">
            <li>Think ahead — consider what words can follow from the current word.</li>
            <li>Short, common words (3–4 letters) are often the easiest links in a chain.</li>
            <li>If you're stuck, try removing a less common letter first.</li>
          </ul>
        </section>
      </div>

      <footer className="how-to-legal">
        <p>
          <strong>LoseIt</strong> is a free-to-play word puzzle game produced by{' '}
          <strong>Cleva.Me Games</strong>. No purchase is necessary. This game involves no
          wagering, gambling, or monetary rewards of any kind. Leaderboard scores are for
          entertainment purposes only and carry no cash value.
        </p>
        <p>
          Player names submitted to the leaderboard are stored publicly. Do not submit personal
          information as your display name. Cleva.Me Games reserves the right to remove any
          name at its discretion.
        </p>
        <p>
          This game is provided "as is" without warranty of any kind. Cleva.Me Games is not
          responsible for any interruptions in service, loss of data, or other issues arising
          from use of this application.
        </p>
        <p>
          &copy; {year} Cleva.Me Games. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
