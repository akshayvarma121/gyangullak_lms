import { useEffect, useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { FirstRunFlow } from './FirstRunFlow';
import { useTranslation } from './i18n/Context';
import { Preferences } from '@capacitor/preferences';
import { SyncBadge } from './components/SyncBadge';
import { Library } from './Library';
import { QuizRunner } from './QuizRunner';
import { ResultsScreen } from './ResultsScreen';

import { ProgressWidget } from './ProgressWidget';

import { brandConfig } from '@chalk/brand';

function Home() {
  const { lang } = useTranslation();
  return (
    <div className="ui-p-4 ui-flex-col ui-gap-4">
      <div className="ui-flex-row ui-justify-between ui-items-center">
        <h1 className="ui-text-2xl">{brandConfig.productName[lang]}</h1>
      </div>
      <SyncBadge />
      <ProgressWidget />
      <Library />
    </div>
  );
}

export function App() {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Preferences.get({ key: 'student_id' }).then((res) => {
      if (!res.value) {
        navigate('/setup', { replace: true });
      }
      setLoading(false);
    });
  }, [navigate]);

  if (loading) return null;

  return (
    <Routes>
      <Route path="/setup" element={<FirstRunFlow />} />
      <Route path="/home" element={<Home />} />
      <Route path="/quiz/:chapterId" element={<QuizRunner />} />
      <Route path="/results/:chapterId" element={<ResultsScreen />} />
      <Route path="/*" element={<Home />} />
    </Routes>
  );
}
