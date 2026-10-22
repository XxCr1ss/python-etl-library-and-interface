import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

let db;
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const SESSION = '33333333-3333-4333-8333-333333333333';
const metadata = { name: 'Test source', connection_type: 'source', db_type: 'postgresql', host: 'db.example.com', port: 5432,
  database: 'example', user: 'etl', service_name: null, transport: 'direct' };
const secret = { encrypted_password: 'synthetic-ciphertext', key_version: 'v1', cipher_version: 'fernet-v1' };
let connection;
async function role(name, subject, operation) {
  await db.exec(`set role ${name}`);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [subject ?? '']);
  try { return await operation(); } finally { await db.exec('reset role'); }
}
before(async () => {
  db = new PGlite();
  // Only the Supabase Auth contracts needed by the migration, with no network.
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}',banned_until timestamptz,deleted_at timestamptz);
    create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),not_after timestamptz);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema public,auth to anon,authenticated,service_role;
    grant execute on function auth.uid() to anon,authenticated,service_role;
    alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
    alter default privileges in schema public grant execute on functions to anon,authenticated,service_role;`);
  const files = (await readdir(new URL('../migrations/', import.meta.url))).filter(f => f.endsWith('.sql')).sort();
  for (const file of files) await db.exec(await readFile(new URL('../migrations/' + file, import.meta.url), 'utf8'));
  await db.query('insert into auth.users(id) values($1),($2)', [A, B]);
  await db.query('insert into auth.sessions(id,user_id) values($1,$2)', [SESSION, A]);
  connection = await role('service_role', null, async () => (await db.query(
    'select public.etl_connection_save($1,null,null,$2::jsonb,$3::jsonb) as value', [A, metadata, secret])).rows[0].value);
});
after(async () => { await db?.close(); });

test('migration creates profiles without exposing secrets', async () => {
  assert.equal((await db.query('select count(*)::int as n from public.profiles')).rows[0].n, 2);
  const columns = (await db.query("select column_name from information_schema.columns where table_name='saved_connections'")).rows;
  assert.ok(!columns.some(c => /password|secret|cipher/.test(c.column_name)));
  assert.equal((await db.query("select has_table_privilege('service_role','public.saved_connections','TRUNCATE') as allowed")).rows[0].allowed, false);
});
test('RLS isolates A and B and anon has no access', async () => {
  assert.equal((await role('authenticated', A, () => db.query('select id from public.saved_connections'))).rows.length, 1);
  assert.equal((await role('authenticated', B, () => db.query('select id from public.saved_connections'))).rows.length, 0);
  await assert.rejects(role('anon', null, () => db.query('select * from public.saved_connections')), /permission denied/);
  await assert.rejects(role('authenticated', A, () => db.query('select * from private.connection_secrets')), /permission denied/);
});
test('users cannot forge metrics or mutate connection ownership', async () => {
  await assert.rejects(role('authenticated', A, () => db.query('update public.saved_connections set user_id=$1', [B])), /permission denied/);
  await assert.rejects(role('authenticated', A, () => db.query("insert into public.pipeline_executions default values")), /permission denied/);
  await assert.rejects(role('authenticated', A, () => db.query('update public.profiles set id=$1', [B])), /permission denied/);
  await role('authenticated', A, () => db.query("update public.profiles set full_name='Changed' where id=$1", [A]));
});
test('RPCs deny user execution and enforce owner and version internally', async () => {
  await assert.rejects(role('authenticated', A, () => db.query('select public.etl_connection_secret($1,$2,1)', [A, connection.id])), /permission denied/);
  await assert.rejects(role('service_role', null, () => db.query('select public.etl_connection_secret($1,$2,1)', [B, connection.id])), /Connection unavailable/);
  await assert.rejects(role('service_role', null, () => db.query('select public.etl_connection_secret($1,$2,2)', [A, connection.id])), /Version conflict/);
  const value = await role('service_role', null, () => db.query('select public.etl_connection_secret($1,$2,1) as value', [A, connection.id]));
  assert.equal(value.rows[0].value.encrypted_password, secret.encrypted_password);
});
test('key rotation is service-only, version checked, and preserves connection metadata', async () => {
  await assert.rejects(role('authenticated', A, () => db.query("select public.etl_rotation_batch('v2')")), /permission denied/);
  const batch = await role('service_role', null, () => db.query("select public.etl_rotation_batch('v2') as value"));
  assert.equal(batch.rows[0].value[0].key_version, 'v1');
  const rotated = { encrypted_password: 'new-synthetic-ciphertext', key_version: 'v2', cipher_version: 'fernet-v1' };
  await role('service_role', null, () => db.query('select public.etl_rotate_secret($1,$2,1,$3,$4::jsonb)', [A, connection.id, 'v1', rotated]));
  const row = (await db.query('select version from public.saved_connections where id=$1', [connection.id])).rows[0];
  assert.equal(row.version, 1);
  assert.equal((await role('service_role', null, () => db.query("select public.etl_rotation_batch('v2') as value"))).rows[0].value.length, 0);
  await assert.rejects(role('service_role', null, () => db.query('select public.etl_rotate_secret($1,$2,1,$3,$4::jsonb)', [A, connection.id, 'v1', rotated])), /Key version changed/);
});
test('retention dry-run does not delete history and public users cannot operate maintenance', async () => {
  await assert.rejects(role('authenticated', A, () => db.query('select public.etl_metadata_maintenance()')), /permission denied/);
  const maintenance = await role('service_role', null, () => db.query('select public.etl_metadata_maintenance() as value'));
  assert.equal(maintenance.rows[0].value.applied, false);
});
test('revoked session cannot be used even with a still-signed token', async () => {
  const active = () => role('service_role', null, () => db.query('select public.etl_session_active($1,$2) as active', [A, SESSION]));
  assert.equal((await active()).rows[0].active, true);
  await db.query('delete from auth.sessions where id=$1', [SESSION]);
  assert.equal((await active()).rows[0].active, false);
});
test('claim is idempotent, forbids another owner reference, preserves history on delete', async () => {
  const request = '44444444-4444-4444-8444-444444444444';
  const data = { table_name: 'result', table_type: 'dimension', if_exists: 'append', source_connection_id: connection.id };
  const claim = (owner=A, hash='a'.repeat(64)) => role('service_role', null, () => db.query(
    'select public.etl_claim_execution($1,$2,$3,$4::jsonb) as value', [owner, request, hash, data]));
  const first = (await claim()).rows[0].value;
  assert.equal(first.claimed, true);
  assert.equal((await claim()).rows[0].value.claimed, false);
  await assert.rejects(claim(A, 'b'.repeat(64)), /Idempotency conflict/);
  await assert.rejects(claim(B), /foreign key constraint/);
  await role('service_role', null, () => db.query('select public.etl_finish_execution($1,$2,$3,$4,$5)', [A, first.id, 'success', 12, 350]));
  const metrics = await role('authenticated', B, () => db.query('select public.etl_monitoring_metrics() as value'));
  assert.equal(metrics.rows[0].value.attempts, 0);
  await role('service_role', null, () => db.query('select public.etl_connection_delete($1,$2,1)', [A, connection.id]));
  assert.equal((await db.query('select count(*)::int as n from private.connection_secrets')).rows[0].n, 0);
  assert.equal((await db.query('select source_connection_id from public.pipeline_executions')).rows[0].source_connection_id, null);
});
