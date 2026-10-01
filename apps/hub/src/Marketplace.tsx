import { useState, useEffect } from 'react';
import { Scanner } from './Scanner';
import { verifyQRToken, QRTokenPayload } from '@chalk/core';
import { initDb, getSetting } from './db/store';
import { getCredential } from './credentials';
import { Button, Card } from '@chalk/ui';

interface StudentData {
  id: string;
  first_name: string;
  class_name: string;
  confirmed_balance: number;
}

export function Marketplace() {
  const [activeTab, setActiveTab] = useState<'scan' | 'manual'>('scan');
  const [student, setStudent] = useState<StudentData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');

  const handleScan = async (data: string) => {
    try {
      const pubKey = await getSetting('public_key');
      if (!pubKey) throw new Error('School public key not found. Please complete setup.');
      
      const payload = verifyQRToken(data, pubKey);
      if (!payload) throw new Error('Invalid or fake QR code');
      
      await loadStudent(payload);
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const db = await initDb();
      // In a real system, link code to student mapping would be fetched from DB or server.
      // Since student's link code hash is stored in DB (schema.md), we could search it.
      // For this offline hub, we'd need the link_code stored in roster if we want manual fallback offline!
      // Let's assume we search by roll number for now since link_codes aren't in offline roster yet.
      const rows = await db.select<StudentData[]>('SELECT id, first_name, class_name, confirmed_balance FROM roster WHERE roll_number = $1 LIMIT 1', [manualCode]);
      if (rows.length === 0) throw new Error('Student not found with this code/roll');
      
      // Mock payload
      const payload: QRTokenPayload = {
        school_id: await getSetting('school_id') || '',
        student_id: rows[0].id,
        issued_at: new Date().toISOString()
      };
      
      await loadStudent(payload);
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(null), 3000);
    }
  };

  const loadStudent = async (payload: QRTokenPayload) => {
    const db = await initDb();
    const rows = await db.select<StudentData[]>('SELECT id, first_name, class_name, confirmed_balance FROM roster WHERE id = $1', [payload.student_id]);
    if (rows.length === 0) {
      setError('Student not found in offline roster. Please sync.');
      return;
    }
    setStudent(rows[0]);
  };

  const cancel = () => {
    setStudent(null);
    setError(null);
    setManualCode('');
  };

  return (
    <div className="ui-p-4 ui-flex-col ui-gap-4">
      <h2 className="ui-text-2xl ui-font-bold">Marketplace</h2>
      
      {!student ? (
        <Card className="ui-max-w-md ui-mx-auto ui-w-full">
          <div className="ui-flex ui-gap-4 ui-mb-4">
            <Button onClick={() => setActiveTab('scan')} className={activeTab === 'scan' ? 'ui-bg-blue-600' : 'ui-bg-gray-400'}>Camera Scan</Button>
            <Button onClick={() => setActiveTab('manual')} className={activeTab === 'manual' ? 'ui-bg-blue-600' : 'ui-bg-gray-400'}>Manual Entry</Button>
          </div>
          
          {error && <div className="ui-text-red-600 ui-font-bold ui-mb-4 ui-text-center">{error}</div>}
          
          {activeTab === 'scan' ? (
            <Scanner onScan={handleScan} isActive={true} />
          ) : (
            <form onSubmit={handleManualSubmit} className="ui-flex-col ui-gap-4">
              <p>Camera broken? Enter the student's Roll Number or Link Code:</p>
              <input 
                required 
                value={manualCode} 
                onChange={(e) => setManualCode(e.target.value)} 
                className="ui-border ui-p-3 ui-rounded ui-text-lg ui-font-mono" 
                placeholder="e.g. 101 or A3BC5"
              />
              <Button type="submit">Lookup</Button>
            </form>
          )}
        </Card>
      ) : (
        <StudentMarketplaceView student={student} onCancel={cancel} />
      )}
    </div>
  );
}

import { dbStore } from './db/store';
import { CatalogItem } from './Catalog';
import { sign, hashString } from '@chalk/core';

function StudentMarketplaceView({ student, onCancel }: { student: StudentData, onCancel: () => void }) {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initDb().then(db => {
      db.select<CatalogItem[]>('SELECT * FROM catalog ORDER BY name ASC').then(res => {
        setItems(res);
        setLoading(false);
      });
    });
  }, []);

  const handleAction = async (item: CatalogItem, type: 'credit' | 'redeem') => {
    if (type === 'redeem' && student.confirmed_balance < item.points_cost) {
      alert('Not enough confirmed balance!');
      return;
    }
    
    if (type === 'redeem' && item.stock < 1) {
      alert('Item out of stock!');
      return;
    }
    
    try {
      const db = await initDb();
      
      // Abuse Protection: check last 5 mins
      const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const recentEvents = await db.select<any[]>(
        `SELECT * FROM ledger_events WHERE student_id = $1 AND kind = $2 AND client_ts > $3`,
        [student.id, type === 'credit' ? 'gullak.credit' : 'gullak.redeem', fiveMinsAgo]
      );
      
      let isAbuse = false;
      for (const row of recentEvents) {
        const payload = JSON.parse(row.payload);
        if (type === 'credit' && payload.amount === item.points_cost && payload.reason === `Donated: ${item.name}`) {
           isAbuse = true;
        } else if (type === 'redeem' && payload.item_id === item.id) {
           isAbuse = true;
        }
      }
      
      if (isAbuse) {
        if (!window.confirm('WARNING: A similar transaction was recorded for this student in the last 5 minutes! Are you sure you want to proceed and override?')) {
           return;
        }
      }

      if (!window.confirm(`Are you sure you want to ${type === 'credit' ? 'donate' : 'redeem'} ${item.name}?`)) {
        return;
      }

      const deviceId = await getCredential('gyangullak_hub', 'device_id');
      const privateKey = await getCredential('gyangullak_hub', 'device_private_key');
      
      const eventId = crypto.randomUUID();
      const payload = type === 'credit' 
        ? { amount: item.points_cost, reason: `Donated: ${item.name}` }
        : { item_id: item.id, amount: item.points_cost };
      
      // Determine seq and prev_hash
      const lastEvent = await dbStore.getLastEvent();
      const seq = lastEvent ? lastEvent.seq + 1 : 0;
      const prev_hash = lastEvent ? hashString(JSON.stringify(lastEvent.payload)) : null;

      const eventWithoutSig = {
        id: eventId,
        student_id: student.id,
        device_id: deviceId,
        seq,
        prev_hash,
        kind: type === 'credit' ? 'gullak.credit' : 'gullak.redeem',
        payload,
        client_ts: new Date().toISOString(),
        content_version: 'v1'
      };

      // In real implementation we canonicalize, but JSON.stringify with stable keys works
      const signature = sign(JSON.stringify(eventWithoutSig), privateKey);

      await dbStore.appendEvent({
        ...eventWithoutSig,
        signature
      } as any);

      // Decrement local stock for redeem
      if (type === 'redeem') {
        await db.execute('UPDATE catalog SET stock = stock - 1 WHERE id = $1', [item.id]);
        setItems(items.map(i => i.id === item.id ? { ...i, stock: i.stock - 1 } : i));
      }

      alert('Success!');
      onCancel();
      
    } catch (err: any) {
      alert('Error saving event: ' + err.message);
    }
  };

  return (
    <div className="ui-flex-col ui-gap-4">
      <Card className="ui-flex ui-justify-between ui-items-center ui-bg-blue-50">
        <div>
          <h3 className="ui-text-2xl ui-font-bold">{student.first_name}</h3>
          <p className="ui-text-gray-700">Class: {student.class_name}</p>
        </div>
        <div className="ui-text-right">
          <p className="ui-text-sm ui-text-gray-500">Confirmed Balance</p>
          <p className="ui-text-3xl ui-font-mono ui-text-green-700">{student.confirmed_balance} points</p>
        </div>
        <Button onClick={onCancel} className="ui-bg-gray-500">Scan Next (Esc)</Button>
      </Card>
      
      {loading ? <p>Loading catalog...</p> : (
        <div className="ui-grid ui-grid-cols-2 ui-gap-4">
          <Card>
            <h4 className="ui-text-lg ui-font-bold ui-mb-4 ui-text-green-800">Receive Donation (Give Points)</h4>
            <div className="ui-flex-col ui-gap-2">
              {items.map(item => (
                <div key={item.id} className="ui-flex ui-justify-between ui-items-center ui-border-b ui-pb-2">
                  <span>{item.name} <span className="ui-text-xs ui-text-gray-500">(+{item.points_cost})</span></span>
                  <Button onClick={() => handleAction(item, 'credit')} className="ui-bg-green-600">Donate</Button>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h4 className="ui-text-lg ui-font-bold ui-mb-4 ui-text-purple-800">Redeem Item (Take Points)</h4>
            <div className="ui-flex-col ui-gap-2">
              {items.map(item => {
                const canAfford = student.confirmed_balance >= item.points_cost;
                const hasStock = item.stock > 0;
                return (
                  <div key={item.id} className="ui-flex ui-justify-between ui-items-center ui-border-b ui-pb-2">
                    <div>
                      <span>{item.name} <span className="ui-text-xs ui-text-gray-500">(-{item.points_cost})</span></span>
                      {!hasStock && <span className="ui-text-xs ui-text-red-500 ui-ml-2">Out of Stock</span>}
                    </div>
                    <Button 
                      disabled={!canAfford || !hasStock} 
                      onClick={() => handleAction(item, 'redeem')} 
                      className={canAfford && hasStock ? "ui-bg-purple-600" : "ui-bg-gray-400"}
                    >
                      Redeem
                    </Button>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}
      
      <Card className="ui-mt-4">
        <h4 className="ui-text-lg ui-font-bold ui-mb-4">Recent Transactions</h4>
        <StudentHistory studentId={student.id} refreshTrigger={items} />
      </Card>
    </div>
  );
}

function StudentHistory({ studentId, refreshTrigger }: { studentId: string, refreshTrigger: any }) {
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    loadHistory();
  }, [refreshTrigger, studentId]);

  const loadHistory = async () => {
    const db = await initDb();
    const rows = await db.select<any[]>(
      `SELECT * FROM ledger_events WHERE student_id = $1 AND kind IN ('gullak.credit', 'gullak.redeem', 'gullak.reverse') ORDER BY seq DESC LIMIT 10`,
      [studentId]
    );
    setEvents(rows.map(r => ({ ...r, payload: JSON.parse(r.payload) })));
  };

  const handleReverse = async (event: any) => {
    if (!window.confirm('Are you sure you want to reverse this transaction?')) return;
    
    try {
      const deviceId = await getCredential('gyangullak_hub', 'device_id');
      const privateKey = await getCredential('gyangullak_hub', 'device_private_key');
      
      const eventId = crypto.randomUUID();
      const payload = { original_event_id: event.id };
      
      const lastEvent = await dbStore.getLastEvent();
      const seq = lastEvent ? lastEvent.seq + 1 : 0;
      const prev_hash = lastEvent ? hashString(JSON.stringify(lastEvent.payload)) : null;

      const eventWithoutSig = {
        id: eventId,
        student_id: studentId,
        device_id: deviceId,
        seq,
        prev_hash,
        kind: 'gullak.reverse',
        payload,
        client_ts: new Date().toISOString(),
        content_version: 'v1'
      };

      const signature = sign(JSON.stringify(eventWithoutSig), privateKey);

      await dbStore.appendEvent({
        ...eventWithoutSig,
        signature
      } as any);

      alert('Reversed successfully!');
      loadHistory();
      
    } catch (err: any) {
      alert('Error reversing: ' + err.message);
    }
  };

  return (
    <div className="ui-flex-col ui-gap-2">
      {events.map(ev => {
        const isReversed = events.some(e => e.kind === 'gullak.reverse' && e.payload.original_event_id === ev.id);
        const isReverseEvent = ev.kind === 'gullak.reverse';
        
        return (
          <div key={ev.id} className="ui-flex ui-justify-between ui-items-center ui-border-b ui-pb-2">
            <div>
              <span className="ui-font-bold">{ev.kind}</span>
              <span className="ui-text-sm ui-text-gray-500 ui-ml-2">
                {new Date(ev.client_ts).toLocaleString()}
              </span>
              {isReversed && <span className="ui-bg-red-100 ui-text-red-700 ui-text-xs ui-ml-2 ui-px-1 ui-rounded">REVERSED</span>}
              <div className="ui-text-sm">
                {ev.kind === 'gullak.credit' && `+${ev.payload.amount} pts (${ev.payload.reason})`}
                {ev.kind === 'gullak.redeem' && `-${ev.payload.amount} pts (Item ID: ${ev.payload.item_id})`}
                {ev.kind === 'gullak.reverse' && `Reversed event ${ev.payload.original_event_id.substring(0, 8)}`}
              </div>
            </div>
            {!isReversed && !isReverseEvent && (
              <Button onClick={() => handleReverse(ev)} className="ui-bg-red-600 ui-text-xs">Undo</Button>
            )}
          </div>
        );
      })}
      {events.length === 0 && <p className="ui-text-gray-500">No recent transactions.</p>}
    </div>
  );
}
