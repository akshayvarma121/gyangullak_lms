import { Button } from './Button';

interface StateProps {
  icon: string;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export function State({ icon, title, description, actionText, onAction }: StateProps) {
  return (
    <div className="ui-state">
      <div className="ui-state-icon">{icon}</div>
      <h2 className="ui-state-title">{title}</h2>
      <p className="ui-state-desc">{description}</p>
      {actionText && onAction && (
        <Button onClick={onAction}>{actionText}</Button>
      )}
    </div>
  );
}

export function ErrorState(props: Omit<StateProps, 'icon'>) {
  return <State icon="❌" {...props} />;
}

export function EmptyState(props: Omit<StateProps, 'icon'>) {
  return <State icon="📭" {...props} />;
}
