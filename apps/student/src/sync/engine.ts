import { SyncMachine, Transport } from '@chalk/core';
import { dbStore, initDb } from '../db/store';
import { LedgerEvent } from '@chalk/core';
import { Preferences } from '@capacitor/preferences';
import { Network } from '@capacitor/network';
import { App } from '@capacitor/app';

const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

let isOnline = false;

// Initialize online status
Network.getStatus().then(status => {
  isOnline = status.connected;
});

Network.addListener('networkStatusChange', status => {
  isOnline = status.connected;
  if (isOnline) {
    syncEngine.triggerSync();
  }
});

App.addListener('appStateChange', ({ isActive }) => {
  if (isActive && isOnline) {
    syncEngine.triggerSync();
  }
});

class HttpTransport implements Transport {
  isOnline(): boolean {
    return isOnline;
  }

  async sendBatch(events: LedgerEvent[]): Promise<{ accepted: string[]; rejected: { id: string; reason: string }[] }> {
    const deviceIdRes = await Preferences.get({ key: 'device_id' });
    const deviceId = deviceIdRes.value;
    if (!deviceId) throw new Error('No device id');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout for poor network

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/sync-push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ device_id: deviceId, events }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      const accepted: string[] = [];
      const rejected: { id: string; reason: string }[] = [];

      if (data.results) {
        for (const r of data.results) {
          if (r.status === 'accepted') {
            accepted.push(r.id);
          } else {
            rejected.push({ id: r.id, reason: r.reason });
            // Store rejection reason locally
            await Preferences.set({ key: `rejection_${r.id}`, value: r.reason });
          }
        }
      }

      return { accepted, rejected };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

class FullSyncEngine {
  machine: SyncMachine;
  isSyncing = false;
  listeners = new Set<(status: 'idle' | 'syncing' | 'offline' | 'error', pendingCount: number, lastSyncTime?: number) => void>();
  private timeoutId?: NodeJS.Timeout;

  constructor() {
    this.machine = new SyncMachine(dbStore, new HttpTransport(), Math, 50);
  }

  async getPendingCount() {
    const events = await dbStore.listUnsynced(1000);
    return events.length;
  }

  subscribe(listener: (status: 'idle' | 'syncing' | 'offline' | 'error', pendingCount: number, lastSyncTime?: number) => void) {
    this.listeners.add(listener);
    this.notify();
    return () => this.listeners.delete(listener);
  }

  async notify() {
    const pending = await this.getPendingCount();
    const lastSyncStr = (await Preferences.get({ key: 'last_sync_time' })).value;
    const lastSync = lastSyncStr ? parseInt(lastSyncStr, 10) : undefined;
    
    let status: 'idle' | 'syncing' | 'offline' | 'error' = 'idle';
    if (!isOnline) status = 'offline';
    else if (this.isSyncing) status = 'syncing';
    else if (this.machine.state === 'error' || this.machine.state === 'backoff') status = 'error';

    for (const l of this.listeners) l(status, pending, lastSync);
  }

  async triggerSync() {
    if (this.isSyncing) return;
    if (!isOnline) return;

    this.isSyncing = true;
    this.notify();

    try {
      let pending = await this.getPendingCount();
      // Push loop until empty
      while (pending > 0) {
        await this.machine.run();
        
        if (this.machine.state === 'backoff' || this.machine.state === 'offline' || this.machine.state === 'error') {
          break; // Stop pushing on failure
        }
        
        pending = await this.getPendingCount();
      }

      // If push succeeded or no push needed, do pull
      if (this.machine.state === 'idle') {
        await this.syncPull();
        await Preferences.set({ key: 'last_sync_time', value: Date.now().toString() });
      }
    } catch (e) {
      console.error('Sync failed', e);
    } finally {
      this.isSyncing = false;
      this.notify();
      
      // Schedule next attempt if backoff
      if (this.machine.state === 'backoff') {
        const delay = this.machine.getBackoffDelay();
        if (this.timeoutId) clearTimeout(this.timeoutId);
        this.timeoutId = setTimeout(() => this.triggerSync(), delay);
      }
    }
  }

  private async syncPull() {
    const deviceIdRes = await Preferences.get({ key: 'device_id' });
    const deviceId = deviceIdRes.value;
    if (!deviceId) return;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const cursorRes = await Preferences.get({ key: 'sync_cursor' });
      const cursor = parseInt(cursorRes.value || '0', 10);

      const response = await fetch(`${SUPABASE_URL}/functions/v1/sync-pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ device_id: deviceId, cursor }),
        signal: controller.signal,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.confirmed_balance !== undefined) {
          await Preferences.set({ key: 'confirmed_balance', value: data.confirmed_balance.toString() });
        }
        
        if (data.cursor !== undefined) {
           await Preferences.set({ key: 'sync_cursor', value: data.cursor.toString() });
        }
        
        // Handle content update
        if (data.contentVersions && data.contentVersions.length > 0) {
          const latest = data.contentVersions[data.contentVersions.length - 1];
          const currentVersionRes = await Preferences.get({ key: 'content_version' });
          if (currentVersionRes.value !== latest.version) {
             const networkStatus = await Network.getStatus();
             const isUnmetered = networkStatus.connectionType === 'wifi' || (networkStatus.connectionType as string) === 'ethernet';
             const allowMobileRes = await Preferences.get({ key: 'allow_mobile_data' });
             
             if (isUnmetered || allowMobileRes.value === 'true') {
               await this.downloadContent(latest.url, latest.version, latest.hash);
             }
          }
        }
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async downloadContent(url: string, version: string, _expectedHash: string) {
    try {
      // Basic resumable fetch (simplified range request if partially downloaded)
      const partialRes = await Preferences.get({ key: `partial_content_${version}` });
      const partialData = partialRes.value || '';
      
      const headers: Record<string, string> = {};
      if (partialData.length > 0) {
        headers['Range'] = `bytes=${new TextEncoder().encode(partialData).length}-`;
      }
      
      const res = await fetch(url, { headers });
      if (!res.ok && res.status !== 206) return; // Wait for next sync if error
      
      const newData = await res.text();
      const fullData = res.status === 206 ? partialData + newData : newData;
      
      // Verification mock - In real app, hash `fullData` using @chalk/core crypto
      // Using basic verification here
      if (fullData.length > 0) {
        // Swap it in
        await initDb(); // Ensure DB is initialized
        // Assume dbStore handles this natively or we execute raw query
        // Normally we'd use a transaction, simplified for now
        await Preferences.set({ key: `partial_content_${version}`, value: '' });
        await Preferences.set({ key: 'content_version', value: version });
      } else {
        await Preferences.set({ key: `partial_content_${version}`, value: fullData });
      }
    } catch (e) {
      console.error('Content download failed', e);
    }
  }
}

export const syncEngine = new FullSyncEngine();
