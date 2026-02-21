import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Header } from './components/Header';
import { GameView } from './views/GameView';
import { ResultView } from './views/ResultView';
import { LeaderboardView } from './views/LeaderboardView';
import { HowToPlayView } from './views/HowToPlayView';
import { useTrippy } from './hooks/useTrippy';

function App() {
  const { trippy, toggle } = useTrippy();

  return (
    <BrowserRouter>
      <div className="app">
        <Header trippy={trippy} onToggleTrippy={toggle} />
        <main className="main">
          <Routes>
            <Route path="/" element={<GameView />} />
            <Route path="/result" element={<ResultView />} />
            <Route path="/leaderboard" element={<LeaderboardView />} />
            <Route path="/how-to-play" element={<HowToPlayView />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
