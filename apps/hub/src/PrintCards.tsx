import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { QRCodeSVG } from 'qrcode.react';
import { initDb } from './db/store';
import { Button, Card } from '@chalk/ui';

interface CardData {
  student_id: string;
  first_name: string;
  class_name: string;
  roll_number: string;
  qr_token: string;
  link_code: string;
}

export function PrintCards() {
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [cards, setCards] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    const db = await initDb();
    const rows = await db.select<{ class_name: string }[]>('SELECT DISTINCT class_name FROM roster ORDER BY class_name');
    setClasses(rows.map(r => r.class_name));
    if (rows.length > 0) setSelectedClass(rows[0].class_name);
  };

  const issueCards = async () => {
    if (!selectedClass) return;
    setLoading(true);
    setError('');
    try {
       // Wait, we need the teacher's session token to call edge function. 
       // Supabase client handles it if we are authenticated. 
       // Wait, we're in the offline hub! Is Supabase client still authenticated?
       // If it was restarted, session might be gone unless persisted.
       // Let's assume we can get session from local if we need to or the user is still logged in.
       const { data: sessionData } = await supabase.auth.getSession();
       if (!sessionData.session) {
          throw new Error('You must be online and signed in to issue cards.');
       }

       const { data, error: fnError } = await supabase.functions.invoke('issue-cards', {
         body: { class_id: selectedClass } // We might need to map class_name to class_id on server, but let's assume the API accepts it or we use class_name as class_id for simplicity.
       });
       
       if (fnError) throw fnError;
       
       // Now we need to join this with local roster to get first_name and roll_number
       const db = await initDb();
       const roster = await db.select<any[]>('SELECT * FROM roster WHERE class_name = $1', [selectedClass]);
       
       const generatedCards = (data.cards || []).map((c: any) => {
         const student = roster.find(r => r.id === c.student_id) || { first_name: 'Unknown', roll_number: '?', class_name: selectedClass };
         return {
           ...c,
           first_name: student.first_name,
           roll_number: student.roll_number,
           class_name: student.class_name
         };
       });
       
       setCards(generatedCards);
    } catch (err: any) {
      setError(err.message || 'Failed to issue cards');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ui-p-4 ui-flex-col ui-gap-4">
      <div className="no-print">
        <h2>Print ID Cards</h2>
        <Card>
          <div className="ui-flex-row ui-gap-4 ui-align-center">
            <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <Button onClick={issueCards} disabled={loading || !selectedClass}>
              {loading ? 'Issuing...' : 'Issue & View Cards'}
            </Button>
            {cards.length > 0 && (
              <Button onClick={() => window.print()} className="ui-button--primary">
                Print PDF
              </Button>
            )}
          </div>
          {error && <p style={{ color: 'red' }}>{error}</p>}
        </Card>
      </div>

      <div className="print-only card-grid">
        {cards.map(c => (
          <div key={c.student_id} className="id-card">
             <div className="id-card-front">
               <h3>{c.first_name}</h3>
               <p>Class: {c.class_name} | Roll: {c.roll_number}</p>
               <QRCodeSVG value={c.qr_token} size={100} />
             </div>
             <div className="id-card-back">
               <h4>Gyan Gullak</h4>
               <p>Link Code:</p>
               <h2>{c.link_code}</h2>
             </div>
          </div>
        ))}
      </div>
      
      <style>{`
        .print-only { display: none; }
        @media print {
          .no-print { display: none; }
          .print-only { display: block; }
          @page { size: A4; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; background: white; }
          
          .card-grid {
            display: grid;
            grid-template-columns: 1fr 1fr; /* 2 columns */
            gap: 5mm;
          }
          
          .id-card {
            display: flex;
            flex-direction: row;
            gap: 2mm;
            page-break-inside: avoid;
          }
          
          .id-card-front, .id-card-back {
            /* CR80 approx 85.6mm x 54mm */
            width: 85.6mm;
            height: 54mm;
            border: 1px dashed #999;
            border-radius: 3mm;
            padding: 4mm;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
          }
          
          .id-card h3 { margin: 0 0 2mm 0; font-size: 14pt; }
          .id-card p { margin: 0 0 2mm 0; font-size: 10pt; }
          .id-card-back h4 { margin: 0 0 2mm 0; font-size: 12pt; }
          .id-card-back h2 { margin: 0; font-size: 24pt; letter-spacing: 2px; }
        }
      `}</style>
    </div>
  );
}
