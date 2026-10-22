-- Additive ETL metadata only. Existing production tables are intentionally untouched.
begin;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    full_name text check (char_length(full_name) <= 120),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create table public.saved_connections (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null check (char_length(btrim(name)) between 1 and 120),
    connection_type text not null check (connection_type in ('source','target')),
    db_type text not null check (db_type in ('postgresql','mysql','oracle')),
    host text not null check (char_length(host) between 1 and 255),
    port integer check (port between 1 and 65535),
    database text not null check (char_length(database) between 1 and 120),
    "user" text not null check (char_length("user") between 1 and 120),
    service_name text check (char_length(service_name) <= 120),
    transport text not null default 'direct' check (transport in ('direct','agent')),
    version integer not null default 1 check (version > 0),
    last_tested_at timestamptz,
    last_test_status text check (last_test_status in ('success','error')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (user_id, id)
);
create index saved_connections_owner_type_date on public.saved_connections (user_id,connection_type,created_at desc,id);
create table private.connection_secrets (
    connection_id uuid primary key references public.saved_connections(id) on delete cascade,
    encrypted_password text not null check (char_length(encrypted_password) <= 16384),
    key_version text not null check (char_length(key_version) between 1 and 40),
    cipher_version text not null check (cipher_version = 'fernet-v1'),
    updated_at timestamptz not null default now()
);
create table public.pipeline_executions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    request_id uuid not null,
    request_fingerprint text not null check (char_length(request_fingerprint) = 64),
    status text not null default 'running' check (status in ('running','success','error','unknown')),
    source_connection_id uuid,
    target_connection_id uuid,
    source_label text check (char_length(source_label) <= 120),
    target_label text check (char_length(target_label) <= 120),
    source_type text,
    target_type text,
    table_name text not null check (char_length(table_name) between 1 and 255),
    table_type text not null check (table_type in ('dimension','fact')),
    if_exists text check (if_exists in ('append','replace','fail')),
    destination_total_rows bigint check (destination_total_rows >= 0),
    rows_extracted bigint check (rows_extracted >= 0),
    rows_written bigint check (rows_written >= 0),
    started_at timestamptz not null default now(),
    finished_at timestamptz,
    duration_ms bigint check (duration_ms >= 0),
    error_code text check (char_length(error_code) <= 80),
    error_message text check (char_length(error_message) <= 400),
    execution_summary jsonb not null default '{}'::jsonb check (octet_length(execution_summary::text) <= 4096),
    unique (user_id,request_id),
    foreign key (user_id,source_connection_id) references public.saved_connections(user_id,id) on delete set null (source_connection_id),
    foreign key (user_id,target_connection_id) references public.saved_connections(user_id,id) on delete set null (target_connection_id)
);
create index pipeline_executions_owner_date on public.pipeline_executions (user_id,started_at desc,id desc);
create index pipeline_executions_source_connection on public.pipeline_executions(source_connection_id) where source_connection_id is not null;
create index pipeline_executions_target_connection on public.pipeline_executions(target_connection_id) where target_connection_id is not null;

alter table public.profiles enable row level security;
alter table public.saved_connections enable row level security;
alter table private.connection_secrets enable row level security;
alter table public.pipeline_executions enable row level security;
revoke all on public.profiles, public.saved_connections, public.pipeline_executions from public, anon, authenticated, service_role;
revoke all on private.connection_secrets from public, anon, authenticated, service_role;
grant select on public.profiles,public.saved_connections,public.pipeline_executions to authenticated;
grant update(full_name) on public.profiles to authenticated;
grant select,insert,update,delete on public.profiles,public.saved_connections,public.pipeline_executions,private.connection_secrets to service_role;

create policy profiles_read_self on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy profiles_update_self on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy connections_read_self on public.saved_connections for select to authenticated using ((select auth.uid()) = user_id);
create policy executions_read_self on public.pipeline_executions for select to authenticated using ((select auth.uid()) = user_id);

create function private.etl_profile_created() returns trigger language plpgsql security definer set search_path = '' as $$
begin
    insert into public.profiles(id,full_name)
    values (new.id,left(new.raw_user_meta_data->>'full_name',120)) on conflict(id) do nothing;
    return new;
end;
$$;
revoke all on function private.etl_profile_created() from public,anon,authenticated;
create trigger etl_auth_user_created after insert on auth.users for each row execute function private.etl_profile_created();
insert into public.profiles(id,full_name)
select id,left(raw_user_meta_data->>'full_name',120) from auth.users on conflict(id) do nothing;

create function private.etl_touch_profile() returns trigger language plpgsql security invoker set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
revoke all on function private.etl_touch_profile() from public,anon,authenticated;
create trigger etl_profile_updated before update on public.profiles for each row execute function private.etl_touch_profile();

-- No user JWT executes this function; the backend provides the already verified subject/session.
create function public.etl_session_active(p_user_id uuid,p_session_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
    select exists (
        select 1 from auth.sessions s join auth.users u on u.id=s.user_id
        where s.id=p_session_id and s.user_id=p_user_id
          and (s.not_after is null or s.not_after > now())
          and (u.banned_until is null or u.banned_until <= now()) and u.deleted_at is null
    );
$$;

create function public.etl_connection_save(p_user_id uuid,p_connection_id uuid,p_version integer,p_metadata jsonb,p_secret jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare c public.saved_connections; v_id uuid;
begin
    if p_connection_id is null then
        if p_secret is null then raise sqlstate 'PT409' using message='Secret required'; end if;
        insert into public.saved_connections(user_id,name,connection_type,db_type,host,port,database,"user",service_name,transport,last_tested_at,last_test_status)
        values (p_user_id,p_metadata->>'name',p_metadata->>'connection_type',p_metadata->>'db_type',
                p_metadata->>'host',(p_metadata->>'port')::integer,p_metadata->>'database',p_metadata->>'user',
                p_metadata->>'service_name',p_metadata->>'transport',now(),'success') returning * into c;
    else
        select * into c from public.saved_connections where id=p_connection_id and user_id=p_user_id for update;
        if not found then raise sqlstate 'PT404' using message='Connection unavailable'; end if;
        if c.version <> p_version then raise sqlstate 'PT409' using message='Version conflict'; end if;
        update public.saved_connections set
            name=p_metadata->>'name',db_type=p_metadata->>'db_type',host=p_metadata->>'host',
            port=(p_metadata->>'port')::integer,database=p_metadata->>'database',"user"=p_metadata->>'user',
            service_name=p_metadata->>'service_name',transport=p_metadata->>'transport',version=version+1,updated_at=now(),
            last_tested_at=case when p_secret is null then last_tested_at else now() end,
            last_test_status=case when p_secret is null then last_test_status else 'success' end
        where id=p_connection_id and user_id=p_user_id returning * into c;
    end if;
    if p_secret is not null then
        insert into private.connection_secrets(connection_id,encrypted_password,key_version,cipher_version)
        values(c.id,p_secret->>'encrypted_password',p_secret->>'key_version',p_secret->>'cipher_version')
        on conflict(connection_id) do update set encrypted_password=excluded.encrypted_password,
            key_version=excluded.key_version,cipher_version=excluded.cipher_version,updated_at=now();
    end if;
    return to_jsonb(c);
end;
$$;
create function public.etl_connection_secret(p_user_id uuid,p_connection_id uuid,p_version integer)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare result jsonb; actual_version integer;
begin
    select version into actual_version from public.saved_connections where id=p_connection_id and user_id=p_user_id for share;
    if not found then raise sqlstate 'PT404' using message='Connection unavailable'; end if;
    if actual_version <> p_version then raise sqlstate 'PT409' using message='Version conflict'; end if;
    select to_jsonb(s) into result from private.connection_secrets s where s.connection_id=p_connection_id;
    return result;
end;
$$;
create function public.etl_connection_delete(p_user_id uuid,p_connection_id uuid,p_version integer)
returns void language plpgsql security invoker set search_path = '' as $$
declare actual_version integer;
begin
    select version into actual_version from public.saved_connections where id=p_connection_id and user_id=p_user_id for update;
    if not found then raise sqlstate 'PT404' using message='Connection unavailable'; end if;
    if actual_version <> p_version then raise sqlstate 'PT409' using message='Version conflict'; end if;
    delete from public.saved_connections where id=p_connection_id and user_id=p_user_id;
end;
$$;
create function public.etl_connection_tested(p_user_id uuid,p_connection_id uuid,p_version integer,p_status text)
returns void language plpgsql security invoker set search_path = '' as $$
begin
    if p_status not in ('success','error') then raise sqlstate 'PT409' using message='Invalid status'; end if;
    update public.saved_connections set last_tested_at=now(),last_test_status=p_status
    where id=p_connection_id and user_id=p_user_id and version=p_version;
    if not found then raise sqlstate 'PT409' using message='Version conflict'; end if;
end;
$$;
create function public.etl_claim_execution(p_user_id uuid,p_request_id uuid,p_fingerprint text,p_metadata jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare e public.pipeline_executions; inserted boolean;
begin
    insert into public.pipeline_executions(user_id,request_id,request_fingerprint,source_connection_id,target_connection_id,
        source_label,target_label,source_type,target_type,table_name,table_type,if_exists)
    values(p_user_id,p_request_id,p_fingerprint,(p_metadata->>'source_connection_id')::uuid,
        (p_metadata->>'target_connection_id')::uuid,p_metadata->>'source_label',p_metadata->>'target_label',
        p_metadata->>'source_type',p_metadata->>'target_type',p_metadata->>'table_name',p_metadata->>'table_type',p_metadata->>'if_exists')
    on conflict(user_id,request_id) do nothing returning * into e;
    inserted := found;
    if not inserted then
        select * into e from public.pipeline_executions where user_id=p_user_id and request_id=p_request_id;
        if e.request_fingerprint <> p_fingerprint then raise sqlstate 'PT409' using message='Idempotency conflict'; end if;
    end if;
    return to_jsonb(e) || jsonb_build_object('claimed',inserted);
end;
$$;
create function public.etl_finish_execution(p_user_id uuid,p_id uuid,p_status text,p_total bigint,p_duration bigint)
returns void language plpgsql security invoker set search_path = '' as $$
begin
    if p_status not in ('success','error','unknown') then raise sqlstate 'PT409' using message='Invalid status'; end if;
    update public.pipeline_executions set status=p_status,finished_at=now(),duration_ms=p_duration,
        destination_total_rows=case when p_status='success' then p_total else null end,
        error_code=case when p_status='unknown' then 'result_unconfirmed' when p_status='error' then 'rejected' else null end,
        error_message=case when p_status='unknown' then 'No se pudo confirmar el resultado; revisa el destino antes de repetir.' else null end
    where id=p_id and user_id=p_user_id and status in ('running','unknown');
end;
$$;
create function public.etl_reconcile_executions(p_user_id uuid,p_max_seconds integer)
returns void language plpgsql security invoker set search_path = '' as $$
begin
    if p_max_seconds < 300 or p_max_seconds > 86400 then raise sqlstate 'PT409' using message='Invalid duration'; end if;
    update public.pipeline_executions set status='unknown',error_code='process_interrupted',
        error_message='El proceso no confirmó su fin; revisa el destino antes de repetir.'
    where user_id=p_user_id and status='running' and started_at < now()-make_interval(secs=>p_max_seconds);
end;
$$;
create function public.etl_monitoring_metrics(p_from timestamptz default null,p_to timestamptz default null,p_status text default null)
returns jsonb language sql stable security invoker set search_path = '' as $$
    select jsonb_build_object('attempts',count(*),'successes',count(*) filter(where status='success'),
        'errors',count(*) filter(where status='error'),'unknown',count(*) filter(where status='unknown'),
        'running',count(*) filter(where status='running'),
        'average_ms',avg(duration_ms) filter(where status in ('success','error')),
        'success_rate',count(*) filter(where status='success')::numeric /
            nullif(count(*) filter(where status in ('success','error')),0))
    from public.pipeline_executions where user_id=(select auth.uid())
        and (p_from is null or started_at>=p_from) and (p_to is null or started_at<p_to)
        and (p_status is null or status=p_status);
$$;

-- Operator-only maintenance. Dry-run by default; no scheduler is enabled here.
create function public.etl_metadata_maintenance(p_apply boolean default false,p_retention_days integer default 90)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare stale bigint; expired bigint;
begin
    if p_retention_days < 1 or p_retention_days > 3650 then raise sqlstate 'PT409' using message='Invalid retention'; end if;
    select count(*) into stale from public.pipeline_executions where status='running' and started_at<now()-interval '1 hour';
    select count(*) into expired from public.pipeline_executions where status<>'running' and started_at<now()-make_interval(days=>p_retention_days);
    if p_apply then
        update public.pipeline_executions set status='unknown',error_code='process_interrupted',
            error_message='El proceso no confirmó su fin; revisa el destino antes de repetir.'
            where status='running' and started_at<now()-interval '1 hour';
        delete from public.pipeline_executions where status<>'running' and started_at<now()-make_interval(days=>p_retention_days);
    end if;
    return jsonb_build_object('applied',p_apply,'stale_running',stale,'expired_executions',expired);
end;
$$;
create function public.etl_rotation_batch(p_active_version text,p_after uuid default null,p_limit integer default 100)
returns jsonb language sql stable security invoker set search_path = '' as $$
    select coalesce(jsonb_agg(to_jsonb(batch)),'[]'::jsonb) from (
        select s.*,c.user_id,c.version as connection_version from private.connection_secrets s
        join public.saved_connections c on c.id=s.connection_id
        where s.key_version<>p_active_version and (p_after is null or s.connection_id>p_after)
        order by s.connection_id limit least(greatest(p_limit,1),100)
    ) batch;
$$;
create function public.etl_rotate_secret(p_user_id uuid,p_connection_id uuid,p_version integer,p_old_key_version text,p_secret jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
begin
    perform 1 from public.saved_connections where id=p_connection_id and user_id=p_user_id and version=p_version for update;
    if not found then raise sqlstate 'PT409' using message='Connection changed'; end if;
    update private.connection_secrets set encrypted_password=p_secret->>'encrypted_password',key_version=p_secret->>'key_version',
        cipher_version=p_secret->>'cipher_version',updated_at=now()
    where connection_id=p_connection_id and key_version=p_old_key_version;
    if not found then raise sqlstate 'PT409' using message='Key version changed'; end if;
end;
$$;

-- Restrict only the newly created signatures; no global privilege changes.
do $$
declare f record;
begin
    for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
             where n.nspname='public' and p.proname in (
                'etl_session_active','etl_connection_save','etl_connection_secret','etl_connection_delete',
                'etl_connection_tested','etl_claim_execution','etl_finish_execution','etl_reconcile_executions','etl_monitoring_metrics',
                'etl_metadata_maintenance','etl_rotation_batch','etl_rotate_secret')
    loop
        execute format('revoke all on function %s from public,anon,authenticated',f.signature);
        execute format('grant execute on function %s to service_role',f.signature);
    end loop;
end;
$$;
grant execute on function public.etl_monitoring_metrics(timestamptz,timestamptz,text) to authenticated;
commit;
