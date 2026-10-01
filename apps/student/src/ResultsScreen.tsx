import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from './i18n/Context';
import { Card, Button } from '@chalk/ui';
import contentBundle from '@chalk/content/dist/content.json';
import { scoreAttempt } from '@chalk/core';
import { Preferences } from '@capacitor/preferences';
import { dbStore } from './db/store';
import { sign, getEventHash, getSignableMessage } from '@chalk/core';

export function ResultsScreen() {
  const { chapterId } = useParams<{ chapterId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { t, lang } = useTranslation();
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function processResult() {
      try {
        const answers = location.state?.answers;
        if (!answers || !chapterId) throw new Error('Missing state');

        const chapter = contentBundle.chapters.find((c: any) => c.id === chapterId);
        if (!chapter) throw new Error('Chapter not found');

        const questions = chapter.questions.map((q: any) => ({
          question_id: q.id,
          correct_option: q.correct_index.toString(),
        }));

        const score = scoreAttempt(questions, answers, {
          pass_mark_percent: 80,
          base_points: 10,
          reattempt_points: 2,
        }, true);

        // Build event
        const studentIdRes = await Preferences.get({ key: 'student_id' });
        const deviceKeyRes = await Preferences.get({ key: 'device_key' });
        let deviceIdRes = await Preferences.get({ key: 'device_id' });
        
        if (!deviceIdRes.value) {
          deviceIdRes.value = crypto.randomUUID();
          await Preferences.set({ key: 'device_id', value: deviceIdRes.value });
        }

        if (!studentIdRes.value || !deviceKeyRes.value) {
          throw new Error('Device not claimed');
        }

        // We only save to DB if we haven't already. Let's just create it and save.
        // To be idempotent in UI, ideally we check if it's already saved, but for now we just do it once.
        const lastEvent = await dbStore.getLastEvent();
        const seq = lastEvent ? lastEvent.seq + 1 : 0;
        const prevHash = lastEvent ? getEventHash(lastEvent) : null;

        const eventUnsigned = {
          id: crypto.randomUUID(),
          student_id: studentIdRes.value,
          device_id: deviceIdRes.value,
          seq,
          prev_hash: prevHash,
          kind: 'quiz.attempt' as const,
          payload: {
            quiz_id: chapterId,
            answers,
          },
          client_ts: new Date().toISOString(),
          content_version: contentBundle.version.toString(),
        };

        const signature = sign(getSignableMessage(eventUnsigned), deviceKeyRes.value);
        const signedEvent = { ...eventUnsigned, signature };

        await dbStore.appendEvent(signedEvent);

        // Determine skills
        const skillsMastered: string[] = [];
        const skillsNeedPractice: string[] = [];

        chapter.questions.forEach((q: any) => {
          const isCorrect = answers[q.id] === q.correct_index.toString();
          const skill = chapter.skills.find((s: any) => s.id === q.skill);
          if (skill) {
            if (isCorrect && !skillsMastered.includes(skill.name[lang])) {
              skillsMastered.push(skill.name[lang]);
            } else if (!isCorrect && !skillsNeedPractice.includes(skill.name[lang])) {
              skillsNeedPractice.push(skill.name[lang]);
            }
          }
        });

        // Remove mastered from need practice and vice versa (simple logic)
        setResult({
          score,
          skillsMastered,
          skillsNeedPractice: skillsNeedPractice.filter(s => !skillsMastered.includes(s))
        });
      } catch (err: any) {
        setError(err.message);
      }
    }

    processResult();
  }, [chapterId, location.state, lang]);

  if (error) {
    return <div className="ui-p-4">{t('error_occurred')}: {error}</div>;
  }

  if (!result) {
    return <div className="ui-p-4">Loading...</div>;
  }

  return (
    <div className="ui-p-4 ui-flex-col ui-gap-4">
      <Card>
        <h2 className="ui-text-2xl ui-mb-2">{t('results')}</h2>
        <p className="ui-text-xl">{Math.round(result.score.percent)}%</p>
        <p>{result.score.passed ? t('passed') : t('keep_trying')}</p>
        <p className="ui-mt-2" style={{ color: '#ff9800', fontWeight: 'bold' }}>
          {result.score.pointsEarned > 0 ? `+${result.score.pointsEarned} ${t('points_pending')}` : `0 ${t('points_pending')}`}
        </p>
      </Card>

      {result.skillsMastered.length > 0 && (
        <Card>
          <h3 className="ui-text-lg ui-mb-2">{t('skills_mastered')}</h3>
          <ul style={{ paddingLeft: '20px', margin: 0 }}>
            {result.skillsMastered.map((s: string, i: number) => <li key={i}>{s}</li>)}
          </ul>
        </Card>
      )}

      {result.skillsNeedPractice.length > 0 && (
        <Card>
          <h3 className="ui-text-lg ui-mb-2">{t('needs_practice')}</h3>
          <ul style={{ paddingLeft: '20px', margin: 0 }}>
            {result.skillsNeedPractice.map((s: string, i: number) => <li key={i}>{s}</li>)}
          </ul>
        </Card>
      )}

      <Button onClick={() => navigate('/home')}>{t('home')}</Button>
    </div>
  );
}
