export function HowToPlayView() {
  const year = new Date().getFullYear();

  return (
    <div className="view">
      <h1 className="view-title">How to Play</h1>

      <div className="how-to-play">
        <section className="how-to-section">
          <h2>The Goal</h2>
          <p>
            Each day, the vowels are stripped from a hidden English word, and the remaining
            <strong> consonants are scrambled</strong>. Your job is to put the consonants back in
            the order they appear in the original word. The answer slots represent <strong>only
            the consonant positions</strong> — you don't need to guess where the vowels go.
          </p>
        </section>

        <section className="how-to-section">
          <h2>Example</h2>
          <div className="dl-example">
            <div className="dl-example__target">
              Hidden word: <strong>STR<span className="dl-vowel-highlight">E</span>NGTH</strong>
            </div>
            <div className="dl-example__consonants">
              You see (scrambled): <strong>G — T — N — H — S — R — T</strong>
            </div>
            <div className="dl-example__answer">
              Correct answer: <strong>S — T — R — N — G — T — H</strong>
            </div>
            <p className="dl-example__note">
              The vowel "E" has been removed — you only arrange the 7 consonants. The game tells
              you the word has 1 vowel as a clue to help you think of what word it could be.
            </p>
          </div>
        </section>

        <section className="how-to-section">
          <h2>Rules</h2>
          <ul className="how-to-rules">
            <li><strong>Drag consonants</strong> into the answer slots, or tap to select and place.</li>
            <li>Each slot is a <strong>consonant position</strong> — don't leave gaps for vowels.</li>
            <li>You'll be told how many <strong>vowels the word has</strong> as a clue.</li>
            <li>Submit your answer when all slots are filled.</li>
            <li>You have <strong>unlimited guesses</strong>, but each wrong guess after the first adds a <strong>15-second penalty</strong>.</li>
            <li>You can use one <strong>hint</strong> to reveal a consonant in its correct position, with a <strong>30-second penalty</strong>.</li>
            <li>A new puzzle is available every day at <strong>midnight Eastern time</strong>.</li>
          </ul>
        </section>

        <section className="how-to-section">
          <h2>Scoring</h2>
          <p>
            Your score is your <strong>total time</strong> (raw solve time + penalties). Lower is better!
          </p>
          <ul className="how-to-rules">
            <li>First wrong guess: no penalty</li>
            <li>Each additional wrong guess: <strong>+15 seconds</strong></li>
            <li>Using a hint: <strong>+30 seconds</strong></li>
          </ul>
        </section>

        <section className="how-to-section">
          <h2>Tips</h2>
          <ul className="how-to-rules">
            <li>Look for common consonant patterns like TH, ST, CH, SH, or NG.</li>
            <li>Consider what vowels might fit between the consonants.</li>
            <li>Start with letters you're most confident about and build outward.</li>
          </ul>
        </section>
      </div>

      <footer className="how-to-legal">
        <p>
          <strong>Dead Letters</strong> is a free-to-play word puzzle game produced by{' '}
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
