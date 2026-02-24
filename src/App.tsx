import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Header } from './components/Header';
import { HomePage } from './views/HomePage';
import { GameView as LoseItGameView } from './views/loseit/GameView';
import { ResultView as LoseItResultView } from './views/loseit/ResultView';
import { LeaderboardView as LoseItLeaderboardView } from './views/loseit/LeaderboardView';
import { HowToPlayView as LoseItHowToPlayView } from './views/loseit/HowToPlayView';
import { GameView as DLGameView } from './views/dead-letters/GameView';
import { ResultView as DLResultView } from './views/dead-letters/ResultView';
import { LeaderboardView as DLLeaderboardView } from './views/dead-letters/LeaderboardView';
import { HowToPlayView as DLHowToPlayView } from './views/dead-letters/HowToPlayView';
import { useTrippy } from './hooks/useTrippy';

function App() {
  const { trippy, toggle } = useTrippy();

  return (
    <BrowserRouter>
      <div className="app">
        <Header trippy={trippy} onToggleTrippy={toggle} />
        <main className="main">
          <Routes>
            {/* Home */}
            <Route path="/" element={<HomePage />} />

            {/* LoseIt */}
            <Route path="/loseit" element={<LoseItGameView />} />
            <Route path="/loseit/result" element={<LoseItResultView />} />
            <Route path="/loseit/leaderboard" element={<LoseItLeaderboardView />} />
            <Route path="/loseit/how-to-play" element={<LoseItHowToPlayView />} />

            {/* Dead Letters */}
            <Route path="/dead-letters" element={<DLGameView />} />
            <Route path="/dead-letters/result" element={<DLResultView />} />
            <Route path="/dead-letters/leaderboard" element={<DLLeaderboardView />} />
            <Route path="/dead-letters/how-to-play" element={<DLHowToPlayView />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
