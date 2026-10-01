import type { TournamentStatus } from '../types/api';

// Renders a tournament's status as a colored pill. The lowercased status
// doubles as the CSS class name (`.open` / `.closed` / `.completed` in
// styles.css), so adding a new status here only needs a matching class.
export function StatusBadge({ status }: { status: TournamentStatus }): JSX.Element {
  return <span className={`badge ${status.toLowerCase()}`}>{status}</span>;
}
