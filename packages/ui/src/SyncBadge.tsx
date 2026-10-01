export interface SyncBadgeProps {
  state: 'synced' | 'pending' | 'offline';
  count?: number;
}

export function SyncBadge({ state, count = 0 }: SyncBadgeProps) {
  let text = '';
  let icon = '';
  
  if (state === 'synced') {
    text = 'Synced';
    icon = '✓';
  } else if (state === 'pending') {
    text = `${count} Pending`;
    icon = '↻';
  } else {
    text = 'Offline';
    icon = '⚠';
  }

  return (
    <div className={`ui-sync-badge ui-sync-badge--${state}`}>
      <span>{icon}</span>
      <span>{text}</span>
    </div>
  );
}
