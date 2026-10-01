import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from './i18n/Context';
import { Card, Button } from '@chalk/ui';
import contentBundle from '@chalk/content/dist/content.json';
import { Preferences } from '@capacitor/preferences';

export function QuizRunner() {
  const { chapterId } = useParams<{ chapterId: string }>();
  const { t, lang } = useTranslation();
  const navigate = useNavigate();

  const chapter = contentBundle.chapters.find(c => c.id === chapterId);
  const questions = chapter?.questions || [];

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showExplanation, setShowExplanation] = useState(false);
  const [isFinished] = useState(false);

  // Resume state
  useEffect(() => {
    Preferences.get({ key: `quiz_state_${chapterId}` }).then(res => {
      if (res.value) {
        const state = JSON.parse(res.value);
        setCurrentIdx(state.currentIdx || 0);
        setAnswers(state.answers || {});
      }
    });
  }, [chapterId]);

  // Save state
  useEffect(() => {
    Preferences.set({
      key: `quiz_state_${chapterId}`,
      value: JSON.stringify({ currentIdx, answers })
    });
  }, [currentIdx, answers, chapterId]);

  if (!chapter || questions.length === 0) {
    return <div className="ui-p-4">{t('error_occurred')}</div>;
  }

  if (isFinished) {
    return (
      <div className="ui-p-4 ui-flex-col ui-gap-4">
        <h2 className="ui-text-2xl">{t('synced') /* using as finished for now */}</h2>
        <Button onClick={() => navigate('/home')}>{t('home')}</Button>
      </div>
    );
  }

  const q = questions[currentIdx];
  const answeredOption = answers[q.id];

  const handleOptionClick = (optIdx: number) => {
    if (showExplanation) return;
    setAnswers(prev => ({ ...prev, [q.id]: optIdx.toString() }));
    setShowExplanation(true);
  };

  const handleNext = async () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setShowExplanation(false);
    } else {
      await finishQuiz();
    }
  };

  const finishQuiz = async () => {
    try {
      const studentIdRes = await Preferences.get({ key: 'student_id' });
      const deviceKeyRes = await Preferences.get({ key: 'device_key' });
      // In real life, device_id needs to be stored, here we fallback to a random uuid
      let deviceIdRes = await Preferences.get({ key: 'device_id' });
      if (!deviceIdRes.value) {
        deviceIdRes.value = crypto.randomUUID();
        await Preferences.set({ key: 'device_id', value: deviceIdRes.value });
      }

      if (!studentIdRes.value || !deviceKeyRes.value) {
        throw new Error('Missing keys');
      }

      // We don't have getEventHash exposed directly unless we import it, wait getSignableMessage doesn't hash
      // Actually we just import hashString from core maybe, or we use getEventHash.

      // We will redirect to results screen, which will build the event. 
      // Actually let's just pass answers to result screen, and let it build the event.
      await Preferences.remove({ key: `quiz_state_${chapterId}` });
      navigate(`/results/${chapterId}`, { state: { answers } });
    } catch (e) {
      console.error(e);
      alert(t('error_occurred'));
    }
  };

  const isCorrect = answeredOption === q.correct_index.toString();

  return (
    <div className="ui-p-4 ui-flex-col ui-gap-4">
      <div className="ui-flex-row ui-justify-between">
        <span>{chapter.title[lang]}</span>
        <span>{currentIdx + 1} / {questions.length}</span>
      </div>
      
      <Card>
        <h3 className="ui-text-xl ui-mb-4">{q.text[lang]}</h3>
        <div className="ui-flex-col ui-gap-2">
          {q.options.map((opt, idx) => {
            const isSelected = answeredOption === idx.toString();
            let style = {};
            if (showExplanation) {
              if (idx === q.correct_index) style = { backgroundColor: '#4caf50', color: 'white' };
              else if (isSelected) style = { backgroundColor: '#f44336', color: 'white' };
            } else if (isSelected) {
              style = { backgroundColor: '#e0e0e0' };
            }

            return (
              <Button 
                key={idx} 
                variant="secondary"
                style={style}
                onClick={() => handleOptionClick(idx)}
                disabled={showExplanation}
              >
                {opt[lang]}
              </Button>
            );
          })}
        </div>
      </Card>

      {showExplanation && (
        <Card style={{ backgroundColor: isCorrect ? '#e8f5e9' : '#ffebee' }}>
          <h4 className="ui-mb-2">{isCorrect ? '✓ ' + t('continue') : '✗ ' + t('continue')}</h4>
          <p>{q.explanation[lang]}</p>
        </Card>
      )}

      {showExplanation && (
        <Button onClick={handleNext}>
          {currentIdx < questions.length - 1 ? t('continue') : 'Finish'}
        </Button>
      )}
    </div>
  );
}
