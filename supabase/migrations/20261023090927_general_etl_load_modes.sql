-- Extend the existing monitoring contract; no grants, RLS or ownership changes.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

alter table public.pipeline_executions
    drop constraint if exists pipeline_executions_if_exists_check;
alter table public.pipeline_executions
    add constraint pipeline_executions_if_exists_check
    check (if_exists in ('append', 'replace', 'fail', 'reload', 'schema_only')) not valid;
alter table public.pipeline_executions
    validate constraint pipeline_executions_if_exists_check;
commit;
