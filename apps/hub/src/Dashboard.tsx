import { useState, useEffect } from 'react';
import { initDb, getSetting } from './db/store';
import { calculateMastery } from '@chalk/core';
import { Card, Button } from '@chalk/ui';

interface StudentNode {
  id: string;
  first_name: string;
  class_name: string;
}

interface SkillNode {
  id: string;
  name: string;
}

interface MasteryRow {
  student_id: string;
  skill_id: string;
  attempts: number;
  correct: number;
  last_attempt: string;
}

interface PointsHistoryRow {
  id: string;
  student_id: string;
  delta: number;
  reason: string;
  created_at: string;
}

export function Dashboard() {
  const [students, setStudents] = useState<StudentNode[]>([]);
  const [skills, setSkills] = useState<SkillNode[]>([]);
  const [masteryData, setMasteryData] = useState<MasteryRow[]>([]);
  const [pointsHistory, setPointsHistory] = useState<PointsHistoryRow[]>([]);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const db = await initDb();
    const st = await db.select<StudentNode[]>('SELECT id, first_name, class_name FROM roster ORDER BY first_name ASC');
    const sk = await db.select<SkillNode[]>('SELECT id, name FROM skills ORDER BY name ASC');
    const ma = await db.select<MasteryRow[]>('SELECT * FROM skill_mastery');
    const ph = await db.select<PointsHistoryRow[]>('SELECT * FROM points_history ORDER BY created_at DESC');
    const ls = await getSetting('last_synced_at');
    
    setStudents(st);
    setSkills(sk);
    setMasteryData(ma);
    setPointsHistory(ph);
    setLastSynced(ls);
  };

  const getMastery = (studentId: string, skillId: string) => {
    const record = masteryData.find(m => m.student_id === studentId && m.skill_id === skillId);
    if (!record) return { attempts: 0, correct: 0 };
    return record;
  };

  const isStale = lastSynced ? (Date.now() - new Date(lastSynced).getTime() > 24 * 60 * 60 * 1000) : true;

  // Calculate Needs Attention List
  const needsAttentionList: { studentName: string, skillName: string, text: string, studentId: string }[] = [];
  
  if (students.length > 0 && skills.length > 0) {
    for (const student of students) {
      for (const skill of skills) {
        const { attempts, correct } = getMastery(student.id, skill.id);
        const result = calculateMastery(attempts, correct);
        
        if (result.status === 'needs_attention') {
          needsAttentionList.push({
            studentName: student.first_name,
            skillName: skill.name,
            text: `Struggling with ${skill.name} (${correct} correct out of ${attempts} attempts).`,
            studentId: student.id
          });
        }
      }
    }
  }

  const exportCsv = () => {
    let csv = 'Student,Class,' + skills.map(s => `"${s.name}"`).join(',') + '\n';
    
    for (const student of students) {
      let row = `"${student.first_name}","${student.class_name}"`;
      for (const skill of skills) {
        const { attempts, correct } = getMastery(student.id, skill.id);
        const result = calculateMastery(attempts, correct);
        
        // Include text/numbers
        let text = result.status === 'not_enough_data' ? 'No Data' : `${Math.round(result.percentage * 100)}% (${correct}/${attempts})`;
        row += `,"${text}"`;
      }
      csv += row + '\n';
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'skill_matrix.csv';
    a.click();
  };
  
  const studentDrilldown = students.find(s => s.id === selectedStudent);
  const studentPointsHistory = pointsHistory.filter(ph => ph.student_id === selectedStudent);

  return (
    <div className="ui-p-4 ui-flex-col ui-gap-4">
      {selectedStudent && studentDrilldown && (
        <div className="ui-fixed ui-inset-0 ui-bg-black ui-bg-opacity-50 ui-flex ui-items-center ui-justify-center ui-z-50">
          <Card className="ui-w-full ui-max-w-2xl ui-max-h-screen ui-overflow-y-auto">
            <div className="ui-flex ui-justify-between ui-items-center ui-mb-4">
              <h3 className="ui-text-2xl ui-font-bold">{studentDrilldown.first_name}'s Drill-down</h3>
              <Button onClick={() => setSelectedStudent(null)} className="ui-bg-gray-500">Close</Button>
            </div>
            
            <h4 className="ui-text-lg ui-font-bold ui-mt-4 ui-mb-2">Skill Summary</h4>
            <div className="ui-grid ui-grid-cols-2 ui-gap-2">
              {skills.map(skill => {
                 const { attempts, correct } = getMastery(selectedStudent, skill.id);
                 const result = calculateMastery(attempts, correct);
                 if (result.status === 'not_enough_data') return null;
                 return (
                   <div key={skill.id} className="ui-p-2 ui-border ui-rounded ui-bg-gray-50">
                     <span className="ui-font-bold">{skill.name}</span>: {Math.round(result.percentage * 100)}% ({correct}/{attempts})
                     <div className="ui-text-xs ui-text-gray-500">{result.status.replace('_', ' ')}</div>
                   </div>
                 );
              })}
            </div>
            
            <h4 className="ui-text-lg ui-font-bold ui-mt-4 ui-mb-2">Recent Points History</h4>
            {studentPointsHistory.length > 0 ? (
              <table className="ui-w-full ui-text-left">
                <thead>
                  <tr className="ui-border-b">
                    <th className="ui-py-1">Date</th>
                    <th className="ui-py-1">Reason</th>
                    <th className="ui-py-1">Delta</th>
                  </tr>
                </thead>
                <tbody>
                  {studentPointsHistory.map(ph => (
                    <tr key={ph.id} className="ui-border-b">
                      <td className="ui-py-1 ui-text-sm">{new Date(ph.created_at).toLocaleString()}</td>
                      <td className="ui-py-1 ui-text-sm">{ph.reason}</td>
                      <td className={`ui-py-1 ui-font-bold ${ph.delta > 0 ? 'ui-text-green-600' : 'ui-text-red-600'}`}>
                        {ph.delta > 0 ? `+${ph.delta}` : ph.delta}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="ui-text-sm ui-text-gray-500">No recent points history available.</p>
            )}
          </Card>
        </div>
      )}

      <div className="ui-flex ui-justify-between ui-items-center">
        <h2 className="ui-text-2xl ui-font-bold">Skill Mastery Dashboard</h2>
        
        <div className="ui-flex ui-gap-4 ui-items-center">
          <div className="ui-text-sm">
            Last Synced: <span className={isStale ? 'ui-text-red-600 ui-font-bold' : ''}>
              {lastSynced ? new Date(lastSynced).toLocaleString() : 'Never'}
            </span>
            {isStale && <div className="ui-text-xs ui-text-red-600">Data may be stale! Please sync.</div>}
          </div>
          <Button onClick={exportCsv}>Export CSV</Button>
        </div>
      </div>

      {needsAttentionList.length > 0 && (
        <Card className="ui-bg-red-50 ui-border-red-200">
          <h3 className="ui-text-lg ui-font-bold ui-text-red-900 ui-mb-2">⚠️ Needs Attention</h3>
          <ul className="ui-list-disc ui-pl-5 ui-text-red-800">
            {needsAttentionList.map((item, idx) => (
              <li key={idx} className="ui-mb-1">
                <button className="ui-underline ui-font-bold hover:ui-text-red-900" onClick={() => setSelectedStudent(item.studentId)}>
                  {item.studentName}
                </button>: {item.text}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="ui-overflow-x-auto ui-border ui-rounded">
        <table className="ui-min-w-full ui-text-left ui-border-collapse">
          <thead>
            <tr className="ui-bg-gray-100 ui-border-b">
              <th className="ui-p-2 ui-border-r ui-sticky ui-left-0 ui-bg-gray-100 ui-z-10">Student</th>
              {skills.map(s => (
                <th key={s.id} className="ui-p-2 ui-border-r ui-font-normal ui-min-w-[120px]">{s.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map(student => (
              <tr key={student.id} className="ui-border-b hover:ui-bg-gray-50">
                <td className="ui-p-2 ui-border-r ui-sticky ui-left-0 ui-bg-white ui-font-medium ui-z-10">
                  <button className="ui-underline ui-text-blue-600 hover:ui-text-blue-800" onClick={() => setSelectedStudent(student.id)}>
                    {student.first_name}
                  </button> <span className="ui-text-xs ui-text-gray-500">({student.class_name})</span>
                </td>
                {skills.map(skill => {
                  const { attempts, correct } = getMastery(student.id, skill.id);
                  const result = calculateMastery(attempts, correct);
                  
                  let bgColor = 'ui-bg-gray-100'; // not enough data
                  let textColor = 'ui-text-gray-600';
                  let icon = '➖';
                  
                  if (result.status === 'mastered') {
                    bgColor = 'ui-bg-green-100';
                    textColor = 'ui-text-green-800';
                    icon = '✅';
                  } else if (result.status === 'needs_practice') {
                    bgColor = 'ui-bg-yellow-100';
                    textColor = 'ui-text-yellow-800';
                    icon = '⚠️';
                  } else if (result.status === 'needs_attention') {
                    bgColor = 'ui-bg-red-100';
                    textColor = 'ui-text-red-800';
                    icon = '🚨';
                  }

                  return (
                    <td key={skill.id} className={`ui-p-2 ui-border-r ${bgColor} ${textColor} ui-text-center`}>
                      <div className="ui-font-bold ui-flex ui-items-center ui-justify-center ui-gap-1">
                        {icon} {result.status === 'not_enough_data' ? '-' : `${Math.round(result.percentage * 100)}%`}
                      </div>
                      {result.status !== 'not_enough_data' && (
                        <div className="ui-text-xs ui-opacity-75">
                          {correct}/{attempts}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {students.length === 0 && <div className="ui-p-4 ui-text-center">No students found. Please sync roster.</div>}
        {skills.length === 0 && students.length > 0 && <div className="ui-p-4 ui-text-center">No skills mapped yet. Please author content and sync.</div>}
      </div>
    </div>
  );
}
