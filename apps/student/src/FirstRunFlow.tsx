import { useState } from 'react';
import { useTranslation } from './i18n/Context';
import { Button, Card } from '@chalk/ui';
import { Camera } from '@capacitor/camera';
import { useNavigate } from 'react-router-dom';
import { Preferences } from '@capacitor/preferences';
import { generateKeypair } from '@chalk/core';

export function FirstRunFlow() {
  const { t, setLang } = useTranslation();
  const [step, setStep] = useState<1 | 2>(1);
  const [fallback, setFallback] = useState(false);
  const [linkCode, setLinkCode] = useState('');
  const navigate = useNavigate();

  const handleLang = (l: 'hi' | 'en') => {
    setLang(l);
    setStep(2);
  };

  const handleScan = async () => {
    try {
      const permission = await Camera.requestPermissions();
      if (permission.camera !== 'granted') {
        setFallback(true);
        return;
      }
      setFallback(true);
    } catch (err) {
      setFallback(true);
    }
  };

  const handleSubmitCode = async () => {
    try {
      const keys = generateKeypair();
      await Preferences.set({ key: 'device_key', value: keys.privateKey });
      await Preferences.set({ key: 'student_id', value: linkCode });
      
      // Queue device.claim (handled in App context or here)
      
      navigate('/home', { replace: true });
    } catch (err) {
      console.error(err);
      alert(t('error_occurred'));
    }
  };

  if (step === 1) {
    return (
      <div className="ui-flex-col ui-items-center ui-justify-center ui-min-h-screen ui-p-4 ui-gap-6">
        <h1 className="ui-text-2xl">{t('choose_language')}</h1>
        <Button onClick={() => handleLang('hi')}>{t('hindi')}</Button>
        <Button onClick={() => handleLang('en')}>{t('english')}</Button>
      </div>
    );
  }

  return (
    <div className="ui-flex-col ui-items-center ui-justify-center ui-min-h-screen ui-p-4 ui-gap-6">
      <Card className="ui-flex-col ui-items-center ui-gap-4 ui-text-center">
        <h2 className="ui-text-xl">{t('scan_id_card')}</h2>
        {!fallback ? (
          <>
            <Button onClick={handleScan}>{t('scan_id_card')}</Button>
            <Button variant="secondary" onClick={() => setFallback(true)}>{t('type_link_code')}</Button>
          </>
        ) : (
          <div className="ui-flex-col ui-gap-2">
            <input 
              type="text" 
              value={linkCode}
              onChange={e => setLinkCode(e.target.value)}
              placeholder={t('code_placeholder')}
              style={{ border: '2px solid var(--c-surface)', padding: '8px', borderRadius: '4px', fontSize: '1rem' }}
            />
            <Button onClick={handleSubmitCode}>{t('continue')}</Button>
          </div>
        )}
      </Card>
    </div>
  );
}
