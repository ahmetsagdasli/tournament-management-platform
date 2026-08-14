export function LoadingState({ label = 'Loading...' }: { label?: string }): JSX.Element {
  return (
    <div className="loading-state">
      <span />
      {label}
    </div>
  );
}
