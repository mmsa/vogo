import { Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./hooks/use-theme";
import { AppHeader } from "./components/AppHeader";
import { AppShell } from "./components/AppShell";
import Dashboard from "./pages/Dashboard";
import Memberships from "./pages/Memberships";
import Benefits from "./pages/Benefits";
import Recommendations from "./pages/Recommendations";

function App() {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 transition-colors">
        <AppHeader />
        <AppShell>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/memberships" element={<Memberships />} />
            <Route path="/benefits" element={<Benefits />} />
            <Route path="/recommendations" element={<Recommendations />} />
          </Routes>
        </AppShell>
      </div>
    </ThemeProvider>
  );
}

export default App;
