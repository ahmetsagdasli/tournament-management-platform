// Small inline spinner + label, used by every page while its data fetch
// (via useApi) is in flight.
export function LoadingState({ label = 'Loading...' }: { label?: string }): JSX.Element {
  return (
    <div className="loading-state">
      <span />
      {label}
    </div>
  );
}
