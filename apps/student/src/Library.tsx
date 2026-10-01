import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from './i18n/Context';
import { Card, Button } from '@chalk/ui';
import contentBundle from '@chalk/content/dist/content.json';
import { Preferences } from '@capacitor/preferences';

export function Library() {
  const { t, lang } = useTranslation();
  const navigate = useNavigate();
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);

  const chapters = contentBundle.chapters;

  if (selectedLesson && selectedChapter) {
    const chapter = chapters.find(c => c.id === selectedChapter);
    const lesson = chapter?.lessons.find(l => l.id === selectedLesson);
    
    if (!lesson) return null;

    const handleBack = () => {
      setSelectedLesson(null);
    };

    return (
      <div className="ui-p-4 ui-flex-col ui-gap-4">
        <Button variant="secondary" onClick={handleBack}>&larr; {t('back')}</Button>
        <Card>
          <h2 className="ui-text-2xl ui-mb-4">{lesson.title[lang]}</h2>
          <p className="ui-text-lg" style={{ lineHeight: '1.6' }}>{lesson.content[lang]}</p>
        </Card>
      </div>
    );
  }

  if (selectedChapter) {
    const chapter = chapters.find(c => c.id === selectedChapter);
    if (!chapter) return null;

    const handleBack = () => setSelectedChapter(null);

    return (
      <div className="ui-p-4 ui-flex-col ui-gap-4">
        <Button variant="secondary" onClick={handleBack}>&larr; {t('back')}</Button>
        <h2 className="ui-text-2xl">{chapter.title[lang]}</h2>
        <div className="ui-flex-col ui-gap-2">
          {chapter.lessons.map(lesson => (
            <Card key={lesson.id} onClick={() => setSelectedLesson(lesson.id)} className="ui-cursor-pointer">
              <h3 className="ui-text-xl">{lesson.title[lang]}</h3>
            </Card>
          ))}
        </div>
        {chapter.questions && chapter.questions.length > 0 && (
          <Button onClick={() => navigate(`/quiz/${chapter.id}`)}>{t('start_quiz')}</Button>
        )}
      </div>
    );
  }

  return (
    <div className="ui-p-4 ui-flex-col ui-gap-4">
      <h2 className="ui-text-2xl">{t('library')}</h2>
      <div className="ui-flex-col ui-gap-2">
        {chapters.map(chapter => (
          <Card key={chapter.id} onClick={() => setSelectedChapter(chapter.id)} className="ui-cursor-pointer">
            <h3 className="ui-text-xl">{chapter.title[lang]}</h3>
            <p>{chapter.subject}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
