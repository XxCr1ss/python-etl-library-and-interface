# Supabase accounts, saved connections and monitoring

This branch prepares the application and an additive migration. **The connected Supabase project is production: no remote migrations or configuration changes were applied.** Existing tables `prueba`, `test`, `dim_prueba` have RLS disabled. Review their intended access separately before publicly releasing Auth; this migration deliberately does not alter those tables.

## Local checks

Run from the repository root:

```sh
npm --prefix supabase ci
npm --prefix supabase test
npm --prefix frontend ci
npm --prefix frontend run typecheck
npm --prefix frontend run lint
npm --prefix frontend run test:run
python -m pytest backend/tests -m "not integration" -q
```

The SQL suite runs actual PostgreSQL via PGlite in memory, with an isolated Supabase Auth contract and real anon/authenticated/service_role roles. It has no remote credentials and never connects to production. A full local Supabase stack additionally requires Docker. Before deployment, validate the migration against that stack or a separate staging project, including real Auth signup/email, PostgREST grants/RPCs and JWT verification.

The CLI created `supabase/migrations/20261022021059_etl_identity_connections_monitoring.sql`. It creates profiles, connection metadata, private ciphertext, execution history, owner-scoped policies and restricted RPCs. Do not paste it piecemeal into the production SQL Editor; review and deploy it as a versioned migration. No project is linked by this branch.

## Environment configuration

Examples: `frontend/.env.example` and `backend/.env.example`. Variables alone do not apply the migration. The backend reads its process environment; configure variables in Render or load them with your local runner. Keep local values out of Git.

**Vercel:** Root Directory `frontend`. Set `NEXT_PUBLIC_API_URL=https://<render-service>/api/v1`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. These values are public and fixed during build. Production and Preview must use different Supabase environments. Redeploy after changing them.

**Render:** repository root, build `pip install -r requirements.txt`, start `uvicorn backend.main:app --host 0.0.0.0 --port $PORT --workers 1`, health `/api/v1/health`. Set Supabase URL, publishable key, secret key, JWT issuer/audience, Fernet key/version and exact `CORS_ORIGINS`. The agent broker and concurrency controls are single-process. Do not add workers/replicas without shared state and routing.

Generate a Fernet key locally using `cryptography.fernet.Fernet.generate_key()` and place its value directly in the secret manager. Do not send it in chat or commit terminal output. Keep a separate restricted backup. Never regenerate on deployment: old ciphertext requires the original key. For rotation, deploy the new active key/version and previous keys in `CREDENTIAL_ENCRYPTION_PREVIOUS_KEYS`, then review a dry run with `python backend/scripts/metadata_admin.py rotate` and recipher with the same command plus `--apply` only in an authorized environment before retiring old keys. The tool never prints passwords or ciphertext and skips concurrent edits; rotation is not automatic.

New `sb_secret_...` keys are preferred; legacy `SUPABASE_SERVICE_ROLE_KEY` is only a compatibility fallback. Neither is a JWT signing key or a Fernet key. Runtime uses Data API/RPC HTTPS, not a PostgreSQL password or a personal Management API token.

**Supabase Auth:** enable email/password, confirmation and suitable password/rate-limit settings. Configure SMTP for external users. Set Site URL to the canonical frontend and allow only appropriate `/auth/callback`, `/auth/confirm`, `/reset-password` URLs. Default PKCE links use callback. Custom token-hash templates use confirm; recovery must carry the recovery type. Confirm signup/recovery with real staging emails. Keep `private` outside exposed Data API schemas. Prefer asymmetric JWT signing; legacy HS256 is verified through Auth.

**GitHub:** ordinary CI needs no remote secrets. If Actions later deploys migrations, put a scoped `SUPABASE_ACCESS_TOKEN` and required `SUPABASE_DB_PASSWORD` in protected environments; `SUPABASE_PROJECT_ID` is a variable. Do not duplicate runtime Fernet/secret keys when deployment uses Vercel/Render's Git integration. No production secrets in fork PRs.

## Behavior and operational boundaries

- Rollback switches: `ETL_SAVED_CONNECTIONS_ENABLED=false` blocks saved-connection APIs and reference resolution; `ETL_MONITORING_ENABLED=false` blocks monitoring and authenticated loads before any write. Neither deletes data nor turns an authenticated request into a guest. Users can explicitly log out to use manual guest ETL.
- Guest ETL works without Supabase configuration. Invalid supplied JWTs are rejected, never silently treated as guest. Logged-in loads require a client request ID and are recorded by the backend.
- Saved connections use public destinations with DNS validation/IP pinning and encrypted server-side passwords. Private networks use the local agent. Saved passwords require an agent paired with the current Auth session and socket generation. Generate a five-minute single-use code in the UI, start the updated agent with `--pair` (`--allow-load` for writes), and paste the code into its hidden prompt. Reconnection requires a new code; restarting the backend invalidates all in-memory pairings. Legacy unpaired guest agents never receive saved passwords.
- The new resolver handles extraction, preview, nested joins/unions, the diagram and loading. The separate analytics workspace continues using manual read credentials; it cannot export a saved password by copying the load target.
- Account changes remount the workspace, clear local form passwords, pipeline credentials, history/caches and diagram bindings, and discard pending responses. Authenticated pipeline snapshots use owner-tagged schema v2; they are not restored under another account or guest, even if storage deletion fails. Existing guest snapshots remain schema v1 and are not imported into accounts.
- Duplicate authenticated requests return HTTP 202 with the original execution ID/status; they never rerun a write. Consult the dashboard after network failures. No distributed transaction or exactly-once claim is made for external databases.
- The UI displays attempts, confirmed success rate and duration, with `unknown` for unconfirmed writes. Destination total is not summed as rows inserted.
- Stale running attempts become unknown after one hour when history is read. Loads are request-bound, not durable jobs. A confirmed load with failed metadata finalization returns `monitoring_pending`; only metadata is retried. Never repeat the load automatically.
- Proposed retention is 90 days. Review `python backend/scripts/metadata_admin.py maintenance` (dry run); schedule it with `--apply --retention-days 90` only after confirming policy/backups. Until scheduled, no automatic deletion is enabled. The UI describes retention as planned.
- Security advisors must be checked after staging deployment. Restore database plus Fernet key in an isolated environment before release. Roll back application changes without dropping metadata tables or deleting old keys.

## Release checklist

1. Create/identify staging; do not point previews or E2E tests at production.
2. Apply and verify versioned migrations there, including signup trigger/backfill, grants, private schema and session-state RPC.
3. Configure Auth/SMTP/redirects and application environment variables; validate signup, recovery, logout, A/B isolation, in-situ save and a real ETL load.
4. Resolve the pre-existing production RLS findings with policies appropriate to those tables.
5. Review rate/egress limits, backup/rotation/retention and authenticated agent pairing.
6. Approve a separate production deployment: schema, backend, then frontend. This branch does not deploy automatically.

`npm audit` also reports pre-existing frontend dependency advisories, including a critical advisory affecting the unchanged Next.js 14.2.35 dependency. Resolve the framework/dependency security baseline before releasing public accounts. This branch preserves the existing Next.js major version and does not run a forced dependency upgrade.

References: [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [API keys](https://supabase.com/docs/guides/getting-started/api-keys), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [PAT scopes](https://supabase.com/docs/guides/platform/personal-access-tokens).

The operator tools are prepared but were not executed against production. Pairing and rate/concurrency state remain in memory, so a backend restart requires re-pairing. Idempotency depends on retained execution records; retention is not a distributed exactly-once guarantee.

Read-only MCP inventory confirmed PostgreSQL 17.6 and the Auth columns used by the session-state RPC. The final remote migration list is still empty. Local SQL checks do not replace staging checks of Auth SMTP and PostgREST behavior.
