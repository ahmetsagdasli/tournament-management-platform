import type { ApiError } from '../types/api';

export function ErrorMessage({ error }: { error: ApiError | null }): JSX.Element | null {
  if (!error) {
    return null;
  }

  return (
    <div className="notice error">
      <strong>{error.message}</strong>
      {error.details.length > 0 ? (
        <ul>
          {error.details.map((detail, index) => (
            <li key={index}>{formatDetail(detail)}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function formatDetail(detail: unknown): string {
  if (typeof detail === 'string') {
    return detail;
  }

  if (typeof detail === 'object' && detail !== null) {
    const value = detail as { message?: unknown; path?: unknown };
    const message = typeof value.message === 'string' ? value.message : 'Invalid value';

    if (Array.isArray(value.path) && value.path.length > 0) {
      return `${value.path.join('.')}: ${message}`;
    }

    return message;
  }

  return 'Invalid value';
}
