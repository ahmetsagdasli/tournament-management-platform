import { Link } from 'react-router-dom';

export function EmptyState({
  title,
  message,
  actionLabel,
  actionOnClick,
  actionTo,
}: {
  title: string;
  message: string;
  actionLabel?: string;
  actionOnClick?: () => void;
  actionTo?: string;
}): JSX.Element {
  return (
    <section className="empty-state">
      <h2>{title}</h2>
      <p>{message}</p>
      {actionLabel && actionTo ? (
        <Link className="button-link secondary-link" to={actionTo}>
          {actionLabel}
        </Link>
      ) : null}
      {actionLabel && actionOnClick ? (
        <button className="button-secondary" onClick={actionOnClick}>
          {actionLabel}
        </button>
      ) : null}
    </section>
  );
}
