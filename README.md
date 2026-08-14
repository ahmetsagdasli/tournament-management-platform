# Tournament Management Platform

A small full-stack tournament platform built with React, TypeScript, Node.js, Express, and PostgreSQL.

The project is intentionally compact. Its main engineering focus is correctness around authentication, validation, database constraints, and concurrent tournament registration.

## Scope

Roles:

- USER: register, login, browse tournaments, view details, register, view own registrations.
- ADMIN: login, create tournaments, update tournaments, view registered players.

No payments, brackets, scheduling engine, notifications, teams, or real-time features are included.

## Architecture

```text
React SPA
  -> Axios + Authorization: Bearer token
  -> Express API
      -> middleware: helmet, cors, json, authenticate, authorize, validate
      -> routes: endpoint composition
      -> controllers: HTTP only
      -> services: business rules and SQL
      -> errors: AppError and central error handler
  -> PostgreSQL
```

Layer rules:

- Controllers do not contain SQL or business rules.
- Services do not know about `req`, `res`, or HTTP status codes.
- Routes compose middleware and controllers.
- Services throw `AppError`; the error handler maps it to the response envelope.
- There is no repository layer because three tables and direct SQL are clearer here.

## Database

```text
users 1 -> many registrations
tournaments 1 -> many registrations
users many -> many tournaments through registrations
```

Tables:

- `users`: UUID primary key, lowercase unique email, bcrypt password hash, role check.
- `tournaments`: UUID primary key, max player check, status check.
- `registrations`: UUID primary key, foreign keys, unique `(user_id, tournament_id)`.

Key choices:

- UUIDs avoid guessable sequential IDs.
- `CHECK` constraints are used instead of Postgres enums to keep future migrations simple.
- Unique constraints are explicitly named so the error handler can map them safely.
- `COUNT(*)::int` is used because `pg` returns bigint counts as strings.
- No denormalized `registered_count`; the database remains the source of truth.

## Registration Concurrency

`POST /api/tournaments/:id/register` uses a transaction:

```text
BEGIN
  SELECT id, status, max_players
  FROM tournaments
  WHERE id = $1
  FOR UPDATE

  SELECT COUNT(*)::int
  FROM registrations
  WHERE tournament_id = $1

  INSERT INTO registrations (user_id, tournament_id)
  VALUES ($1, $2)
COMMIT
```

The `FOR UPDATE` lock is taken on the tournament row before counting registrations. This serializes registration attempts for the same tournament only. Different tournaments can still register in parallel.

Two invariants use two mechanisms:

- No duplicate registration: unique constraint.
- Capacity not exceeded: row lock plus count inside the transaction.

Alternatives considered:

- `SERIALIZABLE`: correct, but needs retry handling for `40001`.
- Unique constraint alone: prevents duplicates, not capacity overflow.
- Denormalized counter: works, but creates a second source of truth.
- Advisory locks or Redis locks: unnecessary when PostgreSQL already owns the data and can lock the row.

To verify the lock, remove `FOR UPDATE` in `backend/src/services/registrationService.ts` and run:

```bash
cd backend
npm test -- concurrency.test.ts
```

The capacity test should fail because concurrent requests can overbook the tournament.

## API

All errors use:

```json
{ "error": { "code": "CODE", "message": "Human message", "details": [] } }
```

Endpoints:

| Method | Path | Auth |
|---|---|---|
| GET | `/health` | Public |
| POST | `/api/auth/register` | Public |
| POST | `/api/auth/login` | Public |
| GET | `/api/auth/me` | Authenticated |
| GET | `/api/tournaments` | Public |
| GET | `/api/tournaments/:id` | Public |
| POST | `/api/tournaments` | ADMIN |
| PATCH | `/api/tournaments/:id` | ADMIN |
| DELETE | `/api/tournaments/:id` | ADMIN |
| GET | `/api/tournaments/:id/registrations` | ADMIN |
| POST | `/api/tournaments/:id/register` | Authenticated |
| GET | `/api/me/registrations` | Authenticated |

`DELETE /api/tournaments/:id` returns `409 HAS_REGISTRATIONS` if any user is registered, so a tournament's registration history is never silently wiped out. Status transitions remain one-directional (`OPEN` to `CLOSED` to `COMPLETED`, no reopening); deleting is the only way to remove a tournament that shouldn't have been created.

## Security Notes

Implemented:

- bcrypt password hashing.
- Parameterized SQL only.
- Zod `.strict()` validation for request bodies.
- Role hardcoded to `USER` in registration.
- Identity taken from JWT, not request body.
- Identical login error for unknown email and wrong password.
- Dummy bcrypt compare for unknown users to reduce timing differences.
- Helmet, disabled `x-powered-by`, 10kb JSON body limit.
- Zod-validated environment variables.

Deliberately not implemented:

- No rate limiting. In production this should sit at a reverse proxy or use `express-rate-limit`.
- Token is stored in `localStorage`. This is vulnerable to XSS. httpOnly cookies are safer but require CSRF handling.
- No refresh token. Access tokens expire after 2 hours and users log in again.

`ProtectedRoute` is only UX. A user can alter frontend state in DevTools; the backend still enforces authorization.

## Local Setup

Start PostgreSQL:

```bash
docker compose up -d
```

Create backend env:

```bash
cp backend/.env.example backend/.env
```

Install and migrate:

```bash
cd backend
npm install
npm run migrate -- up
npm run seed:admin
```

Start the backend:

```bash
npm run dev
```

Start the frontend:

```bash
cd frontend
npm install
npm run dev
```

Frontend: `http://localhost:5173`

Backend: `http://localhost:4000`

Default admin from `.env.example`:

- Email: `admin@example.com`
- Password: `AdminPass123`

## Tests

Tests run against a real PostgreSQL database named `tournament_test`.

```bash
docker compose up -d
cd backend
npm test
```

The Jest global setup refuses to run if `TEST_DATABASE_URL` does not point to a database ending in `_test`.

## Technology Choices

| Choice | Why | Simpler alternative |
|---|---|---|
| Express | Small explicit HTTP layer | Node `http`, but less ergonomic |
| CommonJS backend | Avoids TS plus ESM plus Jest config tax | ESM, but more config here |
| Raw `pg` | Makes locks and transactions visible | ORM, but it hides the core lesson |
| node-pg-migrate | Standard migration table and CLI | Hand SQL scripts, but no migration tracking |
| Zod | Runtime validation and parsed values | Manual checks, but less consistent |
| JWT | Simple stateless auth | Server sessions, but needs session storage |
| React Context | Enough for auth state | Redux, unnecessary for this state size |
| Plain CSS | Keeps visual layer understandable | UI library, but more dependency surface |
