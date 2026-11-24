import { HashRouter, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/Layout';
import AboutPage from './pages/AboutPage';
import ConditionPage from './pages/ConditionPage';
import ExercisePage from './pages/ExercisePage';
import ExercisesPage from './pages/ExercisesPage';
import GuidePage from './pages/GuidePage';
import GuidesPage from './pages/GuidesPage';
import HomePage from './pages/HomePage';
import MenuPage from './pages/MenuPage';
import MusclePage from './pages/MusclePage';
import MusclesPage from './pages/MusclesPage';
import NotFoundPage from './pages/NotFoundPage';
import RegionPage from './pages/RegionPage';
import { useTheme } from './lib/useTheme';

export default function App() {
  useTheme(); // keep <html data-theme> in sync with the saved preference
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="region/:id" element={<RegionPage />} />
          <Route path="condition/:id" element={<ConditionPage />} />
          <Route path="muscles" element={<MusclesPage />} />
          <Route path="muscle/:id" element={<MusclePage />} />
          <Route path="exercises" element={<ExercisesPage />} />
          <Route path="exercise/:id" element={<ExercisePage />} />
          <Route path="menu" element={<MenuPage />} />
          <Route path="guides" element={<GuidesPage />} />
          <Route path="guide/:id" element={<GuidePage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
