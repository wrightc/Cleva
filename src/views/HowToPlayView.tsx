export function HowToPlayView() {
  const exampleChain = ['STRANGE', 'STRANG', 'TRANG', 'RANG', 'RAN', 'AN', 'A'];

  return (
    <div className="view">
      <h1 className="view-title">How to Play</h1>

      <div className="how-to-play">
        <section className="how-to-section">
          <h2>The Goal</h2>
          <p>
            Each day you're given a <strong>7-letter word</strong>. Your goal is to reduce it to a
            single letter by removing one letter at a time — where every step must form a valid
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
            STRANGE → STRANG (remove E) → TRANG (remove S) → RANG (remove T) → RAN (remove G) →
            AN (remove R) → A (remove N)
          </p>
        </section>

        <section className="how-to-section">
          <h2>Rules</h2>
          <ul className="how-to-rules">
            <li>Remove <strong>exactly one letter</strong> per step, from any position.</li>
            <li>Each resulting word must be a <strong>valid English word</strong>.</li>
            <li>You may <strong>not</strong> add letters, rearrange letters, or skip steps.</li>
            <li>There may be multiple valid solution paths — any correct path is accepted.</li>
            <li>The puzzle resets every day at <strong>midnight UTC</strong>.</li>
          </ul>
        </section>

        <section className="how-to-section">
          <h2>Scoring</h2>
          <p>
            Your score is your <strong>solve time</strong>. The timer starts when the puzzle loads.
            Faster is better! Ties are broken by fewer extra steps, then earlier submission.
          </p>
          <p>
            The minimum number of steps is always <strong>6</strong> (to go from 7 letters to 1).
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
    </div>
  );
}
