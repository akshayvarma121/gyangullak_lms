import React, { useEffect, useState } from 'react';
import { initDb } from './db/store';
import { Card } from '@chalk/ui';

interface Student {
  id: string;
  first_name: string;
  class_name: string;
  roll_number: string;
}

export function Roster() {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [importErrors, setImportErrors] = useState<string[]>([]);
  
  useEffect(() => {
    loadRoster();
  }, []);

  const loadRoster = async () => {
    const db = await initDb();
    const rows = await db.select<Student[]>('SELECT * FROM roster ORDER BY class_name, roll_number');
    setStudents(rows);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const rows = text.split('\n').map(r => r.trim()).filter(Boolean);
    if (rows.length < 2) {
       setImportErrors(["File is empty or missing headers"]);
       return;
    }
    
    // Assume header: first_name, class_name, roll_number
    const headers = rows[0].split(',').map(h => h.trim().toLowerCase());
    const dataRows = rows.slice(1);
    
    const errors: string[] = [];
    const validStudents: Student[] = [];
    const rollSet = new Set<string>();

    dataRows.forEach((row, i) => {
      const cols = row.split(',').map(c => c.trim());
      const first_name = cols[headers.indexOf('first_name')] || '';
      const class_name = cols[headers.indexOf('class_name')] || '';
      const roll_number = cols[headers.indexOf('roll_number')] || '';
      
      const lineNum = i + 2;
      if (!first_name) errors.push(`Row ${lineNum}: Missing name`);
      if (!class_name) errors.push(`Row ${lineNum}: Missing class`);
      if (!roll_number) errors.push(`Row ${lineNum}: Missing roll number`);
      
      if (roll_number && rollSet.has(roll_number)) {
        errors.push(`Row ${lineNum}: Duplicate roll number ${roll_number}`);
      }
      if (roll_number) rollSet.has(roll_number) ? null : rollSet.add(roll_number);

      if (first_name && class_name && roll_number && !errors.some(e => e.startsWith(`Row ${lineNum}:`))) {
        validStudents.push({ id: crypto.randomUUID(), first_name, class_name, roll_number });
      }
    });

    setImportErrors(errors);

    if (validStudents.length > 0) {
      const db = await initDb();
      for (const s of validStudents) {
        await db.execute(
          `INSERT OR REPLACE INTO roster (id, first_name, class_name, roll_number) VALUES ($1, $2, $3, $4)`,
          [s.id, s.first_name, s.class_name, s.roll_number]
        );
      }
      loadRoster();
    }
    // reset file input
    e.target.value = '';
  };

  const filtered = students.filter(s => 
    s.first_name.toLowerCase().includes(search.toLowerCase()) || 
    s.roll_number.includes(search)
  );

  return (
    <div className="ui-p-4 ui-flex-col ui-gap-4">
      <div className="ui-flex-row ui-justify-between ui-align-center">
        <h2>Roster</h2>
        <div className="ui-flex-row ui-gap-2">
          <input 
            style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            placeholder="Search name or roll number..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
          <div>
             <input type="file" accept=".csv" id="csv-upload" style={{display: 'none'}} onChange={handleFileUpload} />
             <label htmlFor="csv-upload" className="ui-button ui-button--primary" style={{cursor: 'pointer'}}>
               Import CSV
             </label>
          </div>
        </div>
      </div>
      
      {importErrors.length > 0 && (
        <Card style={{ backgroundColor: '#fee2e2', borderColor: '#ef4444' }}>
           <h4 style={{ color: '#b91c1c', marginTop: 0 }}>Import Errors</h4>
           <ul style={{ color: '#b91c1c', fontSize: '14px', margin: 0, paddingLeft: '20px' }}>
             {importErrors.map((err, i) => <li key={i}>{err}</li>)}
           </ul>
        </Card>
      )}

      <Card>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #ddd' }}>
              <th className="ui-p-2">Roll No</th>
              <th className="ui-p-2">Name</th>
              <th className="ui-p-2">Class</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id} style={{ borderBottom: '1px solid #eee' }}>
                <td className="ui-p-2">{s.roll_number}</td>
                <td className="ui-p-2">{s.first_name}</td>
                <td className="ui-p-2">{s.class_name}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={3} className="ui-p-4 ui-text-center">No students found</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
