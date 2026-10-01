import { useEffect, useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { FirstRunFlow } from './FirstRunFlow';
import { useTranslation } from './i18n/Context';
import { Preferences } from '@capacitor/preferences';
import { SyncBadge, Card } from '@chalk/ui';

import { brandConfig } from '@chalk/brand';

function Home() {
  const { t, lang } = useTranslation();
  return (
    <div className="ui-p-4 ui-flex-col ui-gap-4">
      <div className="ui-flex-row ui-justify-between ui-items-center">
        <h1 className="ui-text-2xl">{brandConfig.productName[lang]}</h1>
        <SyncBadge state="offline" />
      </div>
      <Card>
        <h2 className="ui-text-xl ui-mb-2">{t('welcome')}</h2>
        <p style={{ margin: 0 }}>{t('offline_mode')}</p>
      </Card>
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
      <Route path="/*" element={<Home />} />
    </Routes>
  );
}
