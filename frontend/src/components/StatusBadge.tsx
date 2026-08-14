import type { TournamentStatus } from '../types/api';

export function StatusBadge({ status }: { status: TournamentStatus }): JSX.Element {
  return <span className={`badge ${status.toLowerCase()}`}>{status}</span>;
}
