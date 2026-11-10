# Movie Memory

A small full-stack application for remembering your favorite movie and discovering a fact about it. Built for the SWE take-home exercise with **Variant A: backend-focused caching and correctness**.

Sign in with Google, choose a favorite movie, update it from the dashboard, and see your profile and an AI-generated fact on your dashboard. The fact is stored in PostgreSQL and reused for 60 seconds. The interface works on desktop and mobile.

**Stack:** TypeScript, Next.js App Router, React, Tailwind CSS, PostgreSQL, Prisma, Auth.js with Google OAuth, OpenAI Responses API, and Vitest.

## Prerequisites

- Node.js **20.9+** (Node 22 LTS is a good choice), npm, and Git.
- PostgreSQL 16+; the included Docker Compose configuration is the easiest local option. Install and start Docker Desktop if using it.
- A Google OAuth **Web application** client ID and client secret.
- An OpenAI API key with access to the configured model. API calls may incur charges.

## Setup: Windows PowerShell

1. Extract the project and open PowerShell in its folder:

   ```powershell
   cd path\to\movie-memory
   npm ci
   ```

2. Start the local database and create a local environment file:

   ```powershell
   docker compose up -d
   Copy-Item .env.example .env
   ```

   Open `.env` in an editor. The provided `DATABASE_URL` matches the Compose database. If port 55432 is already taken, change the host port in `compose.yaml` and in `DATABASE_URL`.

3. Set these values in `.env`:

   | Variable | Value |
   | --- | --- |
   | `DATABASE_URL` | Local PostgreSQL URL from the example, or your own PostgreSQL URL |
   | `AUTH_SECRET` | A new random secret; generate one with the command below |
   | `AUTH_URL` | `http://localhost:3000` for this local setup |
   | `AUTH_GOOGLE_ID` | Google OAuth web client ID |
   | `AUTH_GOOGLE_SECRET` | Google OAuth client secret |
   | `OPENAI_API_KEY` | Your OpenAI API key |
   | `OPENAI_MODEL` | Defaults to `gpt-4o-mini`; use a model your key can access |

   ```powershell
   node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
   ```

   Copy the output into `AUTH_SECRET`. Never commit `.env` or send its values to a reviewer. `.env.example` contains placeholders only.

4. Configure Google sign-in in [Google Cloud Console](https://console.cloud.google.com/):

   - Configure the OAuth consent screen and add your own Google account as a test user if the app is in testing mode.
   - Create an OAuth client of type **Web application**.
   - Add `http://localhost:3000` as an authorized JavaScript origin and `http://localhost:3000/api/auth/callback/google` as an authorized redirect URI.
   - Put the client ID and secret in `.env`.

   Use the same host consistently: `localhost` and `127.0.0.1` are different origins. For a hosted deployment, configure its HTTPS origin and callback in Google Cloud, set `AUTH_URL` to that origin, and use a new secure `AUTH_SECRET`.

5. Generate the Prisma client, apply the checked-in migration, and start the application:

   ```powershell
   npm run db:generate
   npm run db:migrate
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000). Sign in, choose a movie, and visit the dashboard. To stop the app, press `Ctrl+C`. To stop PostgreSQL, run `docker compose down`. This retains the database volume.

On macOS/Linux, the commands are the same except use `cp .env.example .env` to copy the environment file. A separately installed PostgreSQL server is also fine: create a database and update `DATABASE_URL`.

## Architecture overview

```mermaid
flowchart LR
    Browser["Browser"] --> App["Next.js app"]
    App --> Auth["Google OAuth / Auth.js"]
    App --> DB[("PostgreSQL / Prisma")]
    App --> AI["OpenAI API"]
```

- **App and authentication:** `app/` contains server-rendered pages, onboarding server action, and the fact API. Auth.js manages Google OAuth and database-backed sessions. Protected pages check the session on the server. First-time users go to `/onboarding`; returning users go to `/dashboard`.
- **Data:** Auth.js `User`, `Account`, and `Session` tables store identity and sessions. `User.favoriteMovie` is the current favorite movie, set during onboarding and editable from the dashboard. `MovieFact` stores the user, movie title, content, and creation time, indexed by user/movie/newest timestamp. Deleting a user cascades to associated accounts, sessions, and facts.
- **Authorization:** The fact endpoint obtains the user ID only from the server session and reads that user's movie from PostgreSQL. It does not accept a user ID or title from the request. Every fact lookup is scoped to both user and movie. Onboarding and the dashboard movie-edit action update only the authenticated user's record and validate/trim input on the server.
- **Cache:** If the latest fact for that user and movie is **less than 60 seconds old**, it is returned without calling OpenAI. Exactly 60 seconds old is expired. PostgreSQL supplies the timestamp used to check age, avoiding disagreement between app-server clocks.
- **Concurrent requests:** An atomic, conditional update claims a **30-second lease** on the user row. After claiming it, the owner checks the cache again to close the read/claim race. Other requests poll briefly for the result instead of generating concurrently. A random token fences the final write: only the current, unexpired owner can store a fact and release the lease. The OpenAI request has an 8-second timeout and no SDK retries. The external call runs outside a database transaction; only the final ownership check and insert share a short transaction.
- **Failures:** If the AI request fails, return the latest saved fact for that user and movie, even if stale. Without one, return a friendly `503` error. A crashed owner’s lease expires; another request can retry later. Polling is bounded to about 10 seconds. All API responses containing facts are marked `private, no-store`.

The cache is backed by the shared database, so separate app processes coordinate. A bounded lease and timeout reduce duplicate calls, but cannot promise exactly-once billing: a provider may continue processing a timed-out request after the app stops waiting. Fencing prevents a late worker from overwriting a newer result. The database is a dependency and polling creates load under a large burst; see [system design notes](docs/SYSTEM_DESIGN.md).

### Main API

`POST /api/fact` is same-origin and session-protected. It accepts no user ID or movie in the body. It returns `{ fact, createdAt, source }`, where `source` is `generated`, `cache`, or `stale`; errors use a safe `{ error }` response. A POST is used because a cache miss can call OpenAI and create a row. Cross-origin requests are rejected. Login and logout use Auth.js server actions.

### Security and operational choices

- Movie titles are trimmed, required, limited to 120 characters, and checked for control characters on the server. Displayed text is escaped by React.
- No secrets use the `NEXT_PUBLIC_` prefix. The fact API checks request origin, and Auth.js/Next.js handle sign-in and server-action protections. User-controlled IDs are never used as authorization.
- Restrict database access and use TLS in production. The standard Auth.js adapter stores OAuth account tokens in PostgreSQL; protect backups and avoid logging tokens or personal data. The app logs only generic failure events.
- AI-generated statements may be incorrect. The prompt asks the model to acknowledge uncertainty, but this app does not independently verify facts.
- For production, put the app behind a trusted proxy that validates `Host`, configure `AUTH_URL` and HTTPS, manage secrets securely, and add rate limits, quotas, monitoring, and retention/deletion policies. Do not expose the local Compose database to the internet.

## Tests and checks

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

The unit tests cover the 60-second boundary, cache-read race, concurrent generation, fallback, lease fencing, validation, request origin, isolation from other users, and authenticated movie editing. PostgreSQL integration tests are **skipped by default** unless `TEST_DATABASE_URL` equals `DATABASE_URL`. To run them with a separate disposable database using the included Compose service:

```powershell
docker compose exec db createdb -U postgres moviememory_test
$env:DATABASE_URL = 'postgresql://postgres:postgres@localhost:55432/moviememory_test?schema=public'
$env:TEST_DATABASE_URL = $env:DATABASE_URL
npm run db:migrate
npm test
Remove-Item Env:TEST_DATABASE_URL
Remove-Item Env:DATABASE_URL
```

The test database must already exist. The integration tests create and remove uniquely named test users. Re-running `createdb` reports an error if it already exists; in that case continue with the remaining commands. GitHub Actions runs these checks with a disposable PostgreSQL service. A real Google login and real OpenAI call still require valid credentials.

## Tradeoffs and next two hours

- **Why Variant A:** It demonstrates backend correctness, data isolation, failure handling, and coordination across instances, all relevant to a production service.
- **Simplicity:** PostgreSQL is already required, so a database lease avoids adding Redis or a queue. A single lease per user is conservative; different movies for the same user would wait for each other. A small dashboard edit form is included as an extra; Variant A remains the selected backend-focused extension.
- **Scale:** Polling is fine for a small exercise, but creates extra reads during bursts. With more time, add request and cost limits, observable metrics/alerts, retention policy, backoff or a queue/notification mechanism, and load tests. Consider stale-while-revalidate if freshness requirements permit.
- **Reliability:** With two more hours, add browser end-to-end tests against real test OAuth credentials and an isolated OpenAI test project, better failure telemetry, and graceful handling for database outages. Verify generated facts against a trusted movie-data source if accuracy becomes important.
- **Dependencies:** Auth.js v5 is a beta release. Prisma 6 is pinned; an npm override updates its `deepmerge-ts` transitive dependency to address a reported vulnerability. Revalidate the override when upgrading Prisma. The November 2026 audit reported a moderate advisory in `minimatch` through the development-only lint toolchain; the production dependency audit reported no vulnerabilities. Monitor the toolchain for a compatible fix.

[AI usage](AI_USAGE.md) · [Interview guide](docs/INTERVIEW_GUIDE.md) · [Submission notes](SUBMISSION.md) · [GitHub upload steps](docs/GITHUB_UPLOAD.md)
