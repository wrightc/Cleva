import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Header } from './components/Header';
import { HomePage } from './views/HomePage';
import { GameView as DropItGameView } from './views/dropit/GameView';
import { ResultView as DropItResultView } from './views/dropit/ResultView';
import { LeaderboardView as DropItLeaderboardView } from './views/dropit/LeaderboardView';
import { HowToPlayView as DropItHowToPlayView } from './views/dropit/HowToPlayView';
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

            {/* DropIt */}
            <Route path="/dropit" element={<DropItGameView />} />
            <Route path="/dropit/result" element={<DropItResultView />} />
            <Route path="/dropit/leaderboard" element={<DropItLeaderboardView />} />
            <Route path="/dropit/how-to-play" element={<DropItHowToPlayView />} />

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
