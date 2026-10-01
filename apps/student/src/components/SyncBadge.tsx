import { useEffect, useState } from 'react';
import { syncEngine } from '../sync/engine';
import { useTranslation } from '../i18n/Context';

export function SyncBadge() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<'idle' | 'syncing' | 'offline' | 'error'>('idle');
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<number | undefined>();
  const [rejections, setRejections] = useState<string[]>([]);

  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((s, p, l) => {
      setStatus(s);
      setPendingCount(p);
      setLastSyncTime(l);
      
      // Load rejections
      import('@capacitor/preferences').then(({ Preferences }) => {
        Preferences.keys().then(res => {
          const rKeys = res.keys.filter(k => k.startsWith('rejection_'));
          Promise.all(rKeys.map(k => Preferences.get({ key: k }))).then(values => {
             const reasons = values.map(v => v.value).filter(Boolean) as string[];
             // Deduplicate reasons
             setRejections(Array.from(new Set(reasons)));
          });
        });
      });
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const handleSyncNow = () => {
    syncEngine.triggerSync();
  };

  let badgeText = '';
  let badgeColor = '#4caf50'; // green for synced

  if (status === 'offline') {
    badgeText = t('status_offline') || 'Offline';
    badgeColor = '#9e9e9e'; // grey
  } else if (status === 'syncing') {
    badgeText = t('status_syncing') || 'Syncing...';
    badgeColor = '#2196f3'; // blue
  } else if (status === 'error') {
    badgeText = t('status_error') || 'Needs attention';
    badgeColor = '#f44336'; // red
  } else if (pendingCount > 0) {
    badgeText = t('status_pending').replace('{n}', pendingCount.toString()) || `Pending ${pendingCount}`;
    badgeColor = '#ff9800'; // orange
  } else {
    badgeText = t('status_synced') || 'Synced';
  }

  const timeStr = lastSyncTime 
    ? new Date(lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    : (t('never') || 'Never');

  return (
    <div className="ui-flex-col ui-gap-2">
      <div className="ui-card ui-flex-row ui-align-center ui-gap-4" style={{ padding: '8px' }}>
        <div style={{
          width: '12px', height: '12px', borderRadius: '50%', backgroundColor: badgeColor
        }} />
        <div className="ui-flex-col">
          <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{badgeText}</span>
          <span style={{ fontSize: '12px', color: '#666' }}>{t('last_sync') || 'Last sync'}: {timeStr}</span>
        </div>
        <button 
          className="ui-button ui-button--secondary" 
          style={{ marginLeft: 'auto', padding: '4px 8px', fontSize: '12px' }}
          onClick={handleSyncNow}
          disabled={status === 'syncing' || status === 'offline'}
        >
          {t('sync_now') || 'Sync Now'}
        </button>
      </div>
      {rejections.length > 0 && (
        <div className="ui-card" style={{ padding: '8px', backgroundColor: '#fff3e0' }}>
          {rejections.map((r, i) => {
             const friendlyReason = r === 'already counted' ? (t('already_counted') || r) : r;
             return (
               <p key={i} style={{ color: '#ff9800', fontSize: '12px', margin: 0 }}>
                 ⚠ {friendlyReason}
               </p>
             );
          })}
        </div>
      )}
    </div>
  );
}
