import { initDb, dbStore, setSetting } from './db/store';
import { getCredential } from './credentials';
import { supabase } from './supabase';

export async function performHubSync() {
  const db = await initDb();
  const deviceId = await getCredential('gyangullak_hub', 'device_id');
  if (!deviceId) throw new Error('Device ID not found. Setup incomplete.');

  const { data: session } = await supabase.auth.getSession();
  if (!session?.session) throw new Error('Not authenticated with internet. Cannot sync.');

  // 1. Sync Push
  const pendingEvents = await dbStore.listUnsynced(50);
  if (pendingEvents.length > 0) {
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_id: deviceId, events: pendingEvents }),
    });
    
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Sync push failed');
    }
    
    const data = await res.json();
    const syncedIds = data.results.map((r: any) => r.id);
    await dbStore.markSynced(syncedIds);
  }

  // 2. Sync Pull
  const pullRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-pull`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_id: deviceId, cursor: 0 }),
  });

  if (!pullRes.ok) {
    const err = await pullRes.json();
    throw new Error(err.error || 'Sync pull failed');
  }

  const pullData = await pullRes.json();
  
  // Update Roster
  if (pullData.roster) {
    await db.execute('DELETE FROM roster');
    for (const s of pullData.roster) {
      await db.execute(
        'INSERT INTO roster (id, first_name, class_name, roll_number, confirmed_balance) VALUES ($1, $2, $3, $4, $5)',
        [s.id, s.first_name, s.class_name, s.roll_no || s.roll_number, s.confirmed_balance]
      );
    }
  }

  // Update Catalog
  if (pullData.catalog) {
    await db.execute('DELETE FROM catalog');
    for (const c of pullData.catalog) {
      await db.execute(
        'INSERT INTO catalog (id, name, description, points_cost, stock) VALUES ($1, $2, $3, $4, $5)',
        [c.id, c.name, c.description || '', c.cost_points, c.stock]
      );
    }
  }

  // Update Skills
  if (pullData.skills) {
    await db.execute('DELETE FROM skills');
    for (const sk of pullData.skills) {
      await db.execute('INSERT INTO skills (id, name) VALUES ($1, $2)', [sk.id, sk.name]);
    }
  }

  // Update Skill Mastery
  if (pullData.skill_mastery) {
    await db.execute('DELETE FROM skill_mastery');
    for (const m of pullData.skill_mastery) {
      await db.execute(
        'INSERT INTO skill_mastery (student_id, skill_id, attempts, correct, last_attempt) VALUES ($1, $2, $3, $4, $5)',
        [m.student_id, m.skill_id, m.attempts, m.correct, m.last_attempt]
      );
    }
  }

  // Update Points History
  if (pullData.points_history) {
    await db.execute('DELETE FROM points_history');
    for (const ph of pullData.points_history) {
      await db.execute(
        'INSERT INTO points_history (id, student_id, delta, reason, created_at) VALUES ($1, $2, $3, $4, $5)',
        [ph.id, ph.student_id, ph.delta, ph.reason, ph.created_at]
      );
    }
  }

  // Update Guardians
  if (pullData.guardians) {
    await db.execute('DELETE FROM guardians');
    for (const g of pullData.guardians) {
      await db.execute(
        'INSERT INTO guardians (id, student_id, phone_number, has_consent, consent_timestamp) VALUES ($1, $2, $3, $4, $5)',
        [g.id, g.student_id, g.phone_number, g.has_consent ? 1 : 0, g.consent_timestamp]
      );
    }
  }

  await setSetting('last_synced_at', new Date().toISOString());
  return true;
}
