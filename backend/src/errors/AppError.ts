export type ErrorCode =
  | 'ALREADY_REGISTERED'
  | 'CAPACITY_BELOW_REGISTRATIONS'
  | 'EMAIL_TAKEN'
  | 'FORBIDDEN'
  | 'HAS_REGISTRATIONS'
  | 'INTERNAL_ERROR'
  | 'INVALID_CREDENTIALS'
  | 'INVALID_STATUS_TRANSITION'
  | 'NOT_FOUND'
  | 'TOURNAMENT_FULL'
  | 'TOURNAMENT_NOT_OPEN'
  | 'UNAUTHORIZED'
  | 'VALIDATION_ERROR';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly details: unknown[] = [],
  ) {
    super(message);
    this.name = 'AppError';
  }
}
