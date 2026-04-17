import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import SplashPage from './pages/SplashPage';
import AppShell from './layouts/AppShell';
import TerminalPage from './pages/TerminalPage';
import LeaderboardPage from './pages/LeaderboardPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Splash Landing Page */}
        <Route path="/" element={<SplashPage />} />

        {/* Protected App Routes */}
        <Route path="/app" element={<AppShell />}>
          <Route path="terminal" element={<TerminalPage />} />
          <Route path="leaderboard" element={<LeaderboardPage />} />
          
          {/* Default redirect for /app */}
          <Route index element={<Navigate to="terminal" replace />} />
        </Route>

        {/* Catch-all redirect to / */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
