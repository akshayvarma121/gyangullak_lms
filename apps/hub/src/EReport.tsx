import { useState, useEffect } from 'react';
import { Button, Card } from '@chalk/ui';
import { initDb } from './db/store';
import { supabase } from './supabase';
import { generateReport, calculateMastery } from '@chalk/core';

interface StudentNode {
  id: string;
  first_name: string;
  class_name: string;
}

interface Guardian {
  id: string;
  student_id: string;
  phone_number: string;
  has_consent: number;
  consent_timestamp: string | null;
}

interface SkillMastery {
  student_id: string;
  skill_id: string;
  attempts: number;
  correct: number;
}

interface SkillNode {
  id: string;
  name: string;
}

export function EReport() {
  const [students, setStudents] = useState<StudentNode[]>([]);
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [masteryData, setMasteryData] = useState<SkillMastery[]>([]);
  const [skills, setSkills] = useState<SkillNode[]>([]);
  const [lang, setLang] = useState<'en' | 'hi'>('hi');
  const [sentList, setSentList] = useState<Record<string, boolean>>({});

  const [editingGuardian, setEditingGuardian] = useState<string | null>(null);
  const [editPhone, setEditPhone] = useState('');
  const [editConsent, setEditConsent] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const db = await initDb();
    const st = await db.select<StudentNode[]>('SELECT id, first_name, class_name FROM roster ORDER BY first_name ASC');
    const gd = await db.select<Guardian[]>('SELECT * FROM guardians');
    const ma = await db.select<SkillMastery[]>('SELECT * FROM skill_mastery');
    const sk = await db.select<SkillNode[]>('SELECT id, name FROM skills');
    
    setStudents(st);
    setGuardians(gd);
    setMasteryData(ma);
    setSkills(sk);
  };

  const getStudentWeekData = (studentId: string, studentName: string) => {
    // In a real app we'd filter by recent events. For MVP we use all mastery data.
    const studentMastery = masteryData.filter(m => m.student_id === studentId);
    let quizCount = 0;
    let pointsEarned = 0; // We don't have points in mastery, just mocked here
    
    let bestSkill = null;
    let bestPct = -1;
    let worstSkill = null;
    let worstPct = 101;

    for (const m of studentMastery) {
      quizCount += m.attempts;
      // Mock points based on correct answers
      pointsEarned += m.correct * 10;

      const result = calculateMastery(m.attempts, m.correct);
      if (result.status !== 'not_enough_data') {
        const skillName = skills.find(s => s.id === m.skill_id)?.name || 'Skill';
        if (result.percentage > bestPct) {
          bestPct = result.percentage;
          bestSkill = skillName;
        }
        if (result.percentage < worstPct) {
          worstPct = result.percentage;
          worstSkill = skillName;
        }
      }
    }

    // Don't flag as worst if it's actually mastered
    if (worstPct >= 0.8) worstSkill = null;
    // Don't flag as best if it's needs_attention
    if (bestPct < 0.5) bestSkill = null;

    return {
      studentName,
      quizCount,
      pointsEarned,
      strongSkill: bestSkill,
      weakSkill: worstSkill
    };
  };

  const saveGuardian = async (studentId: string) => {
    try {
      setLoading(true);
      const db = await initDb();
      const existing = guardians.find(g => g.student_id === studentId);
      
      const newGuardian = {
        id: existing ? existing.id : crypto.randomUUID(),
        student_id: studentId,
        phone_number: editPhone,
        has_consent: editConsent ? 1 : 0,
        consent_timestamp: editConsent ? new Date().toISOString() : null
      };

      // Ensure phone is valid digits (basic)
      if (!/^\d+$/.test(editPhone)) {
        throw new Error('Phone must be digits only');
      }

      // Save to Supabase (must be online to edit for now, per D-06 style)
      // If we wanted offline edit we'd queue an event, but guardians aren't ledger events.
      // We will try Supabase first.
      const { error } = await supabase
        .from('guardians')
        .upsert({
           id: newGuardian.id,
           student_id: newGuardian.student_id,
           phone_number: newGuardian.phone_number,
           has_consent: newGuardian.has_consent === 1,
           consent_timestamp: newGuardian.consent_timestamp
        }, { onConflict: 'student_id' });
        
      if (error) {
        console.error("Supabase upsert failed, saving offline only for now:", error);
        alert("Failed to sync guardian to server. Please check internet.");
      }

      // Save locally
      await db.execute('DELETE FROM guardians WHERE student_id = $1', [studentId]);
      await db.execute(
        'INSERT INTO guardians (id, student_id, phone_number, has_consent, consent_timestamp) VALUES ($1, $2, $3, $4, $5)',
        [newGuardian.id, newGuardian.student_id, newGuardian.phone_number, newGuardian.has_consent, newGuardian.consent_timestamp]
      );
      
      setEditingGuardian(null);
      loadData();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteGuardian = async (studentId: string) => {
    if (!window.confirm('Remove guardian number?')) return;
    try {
      const db = await initDb();
      await supabase.from('guardians').delete().eq('student_id', studentId);
      await db.execute('DELETE FROM guardians WHERE student_id = $1', [studentId]);
      loadData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="ui-p-4 ui-flex-col ui-gap-6">
      <div className="ui-flex ui-justify-between ui-items-center no-print">
        <h2 className="ui-text-2xl ui-font-bold">e-Report Weekly Summary</h2>
        <div className="ui-flex ui-gap-4">
          <Button onClick={() => setLang(lang === 'en' ? 'hi' : 'en')} variant="secondary">
            Language: {lang === 'en' ? 'English' : 'हिंदी'}
          </Button>
          <Button onClick={handlePrintPDF}>Print PDF (Without WhatsApp)</Button>
        </div>
      </div>

      <div className="ui-flex-col ui-gap-4">
        {students.map(student => {
          const g = guardians.find(gd => gd.student_id === student.id);
          const data = getStudentWeekData(student.id, student.first_name);
          const report = generateReport(data);
          const msg = lang === 'en' ? report.en : report.hi;
          const isSent = sentList[student.id];

          // For printing, we want to show the message nicely.
          return (
            <Card key={student.id} className={`ui-flex-col ui-gap-2 ${isSent ? 'ui-opacity-75 ui-bg-gray-50' : ''}`}>
              <div className="ui-flex ui-justify-between ui-items-center no-print">
                <h3 className="ui-text-xl ui-font-bold">{student.first_name} ({student.class_name})</h3>
                <div className="ui-flex ui-items-center ui-gap-4">
                  {editingGuardian === student.id ? (
                    <div className="ui-flex ui-gap-2 ui-items-center">
                      <input 
                        className="ui-border ui-p-1" 
                        placeholder="Phone 91..." 
                        value={editPhone} 
                        onChange={e => setEditPhone(e.target.value)} 
                      />
                      <label className="ui-flex ui-items-center ui-gap-1 ui-text-sm">
                        <input type="checkbox" checked={editConsent} onChange={e => setEditConsent(e.target.checked)} />
                        Consent
                      </label>
                      <Button disabled={loading} onClick={() => saveGuardian(student.id)} className="ui-p-1">Save</Button>
                      <Button disabled={loading} onClick={() => setEditingGuardian(null)} variant="secondary" className="ui-p-1">Cancel</Button>
                    </div>
                  ) : g ? (
                    <div className="ui-flex ui-gap-2 ui-items-center">
                      <span className="ui-text-sm">Phone: {g.phone_number} {g.has_consent === 1 ? '✅' : '❌'}</span>
                      <Button onClick={() => { setEditPhone(g.phone_number); setEditConsent(g.has_consent === 1); setEditingGuardian(student.id); }} variant="secondary" className="ui-p-1 ui-text-xs">Edit</Button>
                      <Button onClick={() => deleteGuardian(student.id)} variant="secondary" className="ui-text-red-600 ui-p-1 ui-text-xs">Remove</Button>
                    </div>
                  ) : (
                    <Button onClick={() => { setEditPhone('91'); setEditConsent(false); setEditingGuardian(student.id); }} variant="secondary" className="ui-p-1 ui-text-xs">Add Guardian</Button>
                  )}
                </div>
              </div>

              {/* Print version header */}
              <div className="ui-hidden print:ui-block ui-mb-4">
                <h2 className="ui-text-2xl ui-font-bold">Progress Report: {student.first_name}</h2>
                <hr className="ui-my-2" />
              </div>

              <div className="ui-p-4 ui-bg-blue-50 ui-rounded ui-whitespace-pre-wrap">
                {msg}
              </div>

              <div className="ui-flex ui-justify-end ui-gap-4 ui-mt-2 no-print">
                {g && g.has_consent === 1 && (
                  <Button 
                    onClick={() => window.open(`https://wa.me/${g.phone_number}?text=${encodeURIComponent(msg)}`, '_blank')}
                    className="ui-bg-green-600"
                  >
                    Open in WhatsApp
                  </Button>
                )}
                {(!g || g.has_consent === 0) && (
                  <div className="ui-text-red-500 ui-text-sm ui-self-center">No consent / missing number</div>
                )}
                <label className="ui-flex ui-items-center ui-gap-2 ui-cursor-pointer">
                  <input type="checkbox" checked={!!isSent} onChange={(e) => setSentList({ ...sentList, [student.id]: e.target.checked })} />
                  Mark as Sent
                </label>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
