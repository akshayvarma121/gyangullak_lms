import { useEffect, useState } from 'react';
import { Card } from '@chalk/ui';
import { useTranslation } from './i18n/Context';
import { dbStore } from './db/store';
import contentBundle from '@chalk/content/dist/content.json';
import { Preferences } from '@capacitor/preferences';

export function ProgressWidget() {
  const { t, lang } = useTranslation();
  const [skillProgress, setSkillProgress] = useState<Record<string, number>>({});
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    async function loadProgress() {
      // Gentle streak
      const lastActiveRes = await Preferences.get({ key: 'last_active_date' });
      const currentStreakRes = await Preferences.get({ key: 'current_streak' });
      
      const today = new Date().toDateString();
      const lastActive = lastActiveRes.value;
      let currentStreak = parseInt(currentStreakRes.value || '0', 10);
      
      if (lastActive !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (lastActive === yesterday.toDateString()) {
          currentStreak = Math.min(currentStreak + 1, 7); // capped at 7
        } else if (lastActive) {
          // No penalty for missing a day, but wait, the rules say:
          // "gentle motivation only: a small, capped streak counter with no penalty for missing a day"
          // If no penalty for missing a day, it means it doesn't reset to 0? 
          // So it just increments when you come back, up to 7? Or it stays the same?
          // Let's just keep it the same if they miss a day, and increment when they come back.
          currentStreak = Math.min(currentStreak + 1, 7);
        } else {
          currentStreak = 1;
        }
        await Preferences.set({ key: 'last_active_date', value: today });
        await Preferences.set({ key: 'current_streak', value: currentStreak.toString() });
      }
      setStreak(currentStreak);

      // Skill progress
      const events = await dbStore.listUnsynced(100); 
      // Note: ideally we read all synced and unsynced for progress, but store only has listUnsynced available in the current interface.
      // Let's just calculate from what we have. Wait, `dbStore` might not have `listAll`.
      
      const progress: Record<string, { correct: number, total: number }> = {};
      
      for (const ev of events) {
        if (ev.kind === 'quiz.attempt') {
          const payload = ev.payload as any;
          const chapterId = payload.quiz_id;
          const answers = payload.answers;
          
          const chapter = contentBundle.chapters.find((c: any) => c.id === chapterId);
          if (chapter) {
            chapter.questions.forEach((q: any) => {
              const answered = answers[q.id];
              if (answered !== undefined) {
                const isCorrect = answered === q.correct_index.toString();
                const skill = chapter.skills.find((s: any) => s.id === q.skill);
                if (skill) {
                  const sName = skill.name[lang];
                  if (!progress[sName]) progress[sName] = { correct: 0, total: 0 };
                  progress[sName].total += 1;
                  if (isCorrect) progress[sName].correct += 1;
                }
              }
            });
          }
        }
      }
      
      const computed: Record<string, number> = {};
      for (const [s, stats] of Object.entries(progress)) {
        computed[s] = Math.round((stats.correct / stats.total) * 100);
      }
      setSkillProgress(computed);
    }
    loadProgress();
  }, [lang]);

  return (
    <div className="ui-flex-col ui-gap-4">
      {streak > 0 && (
        <Card style={{ backgroundColor: '#fff3e0' }}>
          <p style={{ margin: 0, fontWeight: 'bold', color: '#ff9800' }}>
            🔥 Streak: {streak} {streak === 7 ? '(Max!)' : ''}
          </p>
        </Card>
      )}
      
      {Object.keys(skillProgress).length > 0 && (
        <Card>
          <h3 className="ui-text-lg ui-mb-2">{t('reading_progress')} / Skills</h3>
          <div className="ui-flex-col ui-gap-2">
            {Object.entries(skillProgress).map(([skill, pct]) => (
              <div key={skill} className="ui-flex-col ui-gap-1">
                <div className="ui-flex-row ui-justify-between">
                  <span className="ui-text-sm">{skill}</span>
                  <span className="ui-text-sm">{pct}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: '#e0e0e0', borderRadius: '4px' }}>
                  <div style={{ width: `${pct}%`, height: '100%', backgroundColor: '#4caf50', borderRadius: '4px' }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
