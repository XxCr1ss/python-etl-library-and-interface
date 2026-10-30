"""Application authorization/crypto contracts. No real Auth or remote database."""
import asyncio
import json
import time
from types import SimpleNamespace
from uuid import UUID

import jwt
import pytest
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import HTTPException

from services import auth_service, connection_service, connection_security, monitoring_service
from services.crypto_service import CredentialCipher
from services.auth_service import Identity

A = '11111111-1111-4111-8111-111111111111'
B = '22222222-2222-4222-8222-222222222222'
CID = '33333333-3333-4333-8333-333333333333'
SID = '44444444-4444-4444-8444-444444444444'
RID = '55555555-5555-4555-8555-555555555555'


@pytest.fixture
def crypto(monkeypatch):
    monkeypatch.setenv('CREDENTIAL_ENCRYPTION_KEY', Fernet.generate_key().decode())
    monkeypatch.setenv('CREDENTIAL_ENCRYPTION_KEY_VERSION', 'v1')
    return CredentialCipher()


def test_cipher_empty_corruption_and_rotation(crypto, monkeypatch):
    secret = crypto.encrypt('')
    assert secret['encrypted_password'] != '' and crypto.decrypt(secret) == ''
    with pytest.raises(HTTPException) as failure:
        crypto.decrypt({**secret, 'encrypted_password': 'altered'})
    assert failure.value.status_code == 503
    old_key = crypto.keys['v1']
    previous_key = __import__('os').environ['CREDENTIAL_ENCRYPTION_KEY']
    monkeypatch.setenv('CREDENTIAL_ENCRYPTION_KEY', Fernet.generate_key().decode())
    monkeypatch.setenv('CREDENTIAL_ENCRYPTION_KEY_VERSION', 'v2')
    monkeypatch.setenv('CREDENTIAL_ENCRYPTION_PREVIOUS_KEYS', json.dumps({'v1': previous_key}))
    rotated = CredentialCipher()
    assert rotated.decrypt(secret) == ''
    assert rotated.encrypt('next')['key_version'] == 'v2'
    monkeypatch.setenv('CREDENTIAL_ENCRYPTION_PREVIOUS_KEYS', '{}')
    with pytest.raises(HTTPException): CredentialCipher().decrypt(secret)


def test_signed_jwt_rejects_wrong_project_expiry_audience_and_anon(monkeypatch):
    monkeypatch.setenv('SUPABASE_URL', 'https://project.example')
    monkeypatch.setenv('SUPABASE_PUBLISHABLE_KEY', 'synthetic-publishable')
    monkeypatch.delenv('SUPABASE_JWT_ISSUER', raising=False)
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    monkeypatch.setattr(auth_service, 'jwks_client', lambda _: SimpleNamespace(
        get_signing_key_from_jwt=lambda token: SimpleNamespace(key=key.public_key())))
    claims = {'sub': A, 'session_id': SID, 'role': 'authenticated', 'iss': 'https://project.example/auth/v1',
              'aud': 'authenticated', 'iat': int(time.time()), 'exp': int(time.time())+120}
    def verify(changes):
        return asyncio.run(auth_service.verify_token(jwt.encode({**claims, **changes}, key, algorithm='RS256')))
    assert verify({}).user_id == A
    for invalid in [{'iss': 'https://other.example/auth/v1'}, {'aud': 'other'}, {'exp': 1}, {'is_anonymous': True}, {'role': 'service_role'}]:
        with pytest.raises(HTTPException) as failure: verify(invalid)
        assert failure.value.status_code == 401
    with pytest.raises(HTTPException): asyncio.run(auth_service.verify_token('invalid'))


@pytest.fixture
def cloud(monkeypatch, crypto):
    from api.routes import connections, monitoring
    state = {'active': True, 'claims': {}, 'rpc_calls': [], 'fail_finish': False}
    row = {'id': CID, 'user_id': A, 'name': 'Source', 'connection_type': 'source', 'db_type': 'postgresql',
           'host': 'db.example.com', 'port': 5432, 'database': 'test', 'user': 'reader', 'service_name': None,
           'transport': 'direct', 'version': 1, 'last_tested_at': None, 'last_test_status': None,
           'created_at': '2026-10-21T00:00:00Z', 'updated_at': '2026-10-21T00:00:00Z'}
    state['row'] = row
    encrypted = crypto.encrypt('synthetic-secret')
    class Fake:
        def __init__(self, token=None): self.token = token
        async def read(self, table, params):
            owner = A if self.token == 'token-a' else B
            assert params['user_id'] == 'eq.'+owner
            return [row] if owner == A else []
        async def rpc(self, name, body):
            state['rpc_calls'].append((name,body))
            if name == 'etl_session_active': return state['active']
            if name == 'etl_connection_secret':
                assert body['p_user_id'] == A and body['p_connection_id'] == CID
                return encrypted
            if name == 'etl_claim_execution':
                old = state['claims'].get(body['p_request_id'])
                if old:
                    if old['fingerprint'] != body['p_fingerprint']: raise HTTPException(409,'conflict')
                    return {'id': RID, 'status': 'success', 'claimed': False}
                state['claims'][body['p_request_id']] = {'fingerprint': body['p_fingerprint']}
                return {'id': RID, 'claimed': True}
            if name == 'etl_finish_execution':
                if state['fail_finish']: raise HTTPException(503,'unavailable')
                return None
            if name == 'etl_connection_save': return row
            return None
    async def verify(token):
        if token not in ('token-a','token-b'): raise HTTPException(401,'invalid')
        return Identity(A if token == 'token-a' else B, token, SID)
    async def pin(config): return config
    monkeypatch.setattr(auth_service, 'verify_token', verify)
    monkeypatch.setattr(connection_service, 'pin_connection', pin)
    for module in (auth_service, connection_service, monitoring_service, connections, monitoring):
        monkeypatch.setattr(module,'gateway',lambda token=None: Fake(token))
    monkeypatch.setattr(connection_security.limits, 'windows', __import__('collections').OrderedDict())
    monkeypatch.setattr(connection_security.limits, 'running', set())
    return state


def test_create_and_update_connections_encrypt_secrets_and_recheck_changes(client, cloud, monkeypatch, crypto):
    from services import load_service
    tested = []
    def check(config):
        tested.append(config)
        return {'status': 'success'}
    monkeypatch.setattr(load_service, 'test_target_connection', check)
    headers = {'Authorization': 'Bearer token-a'}
    body = {key: cloud['row'][key] for key in ('name', 'connection_type', 'db_type', 'host', 'port', 'database', 'user', 'service_name', 'transport')}
    response = client.post('/api/v1/connections', json={**body, 'password': 'new-secret'}, headers=headers)
    assert response.status_code == 201, response.text
    assert tested[-1]['password'] == 'new-secret'
    save = [body for name, body in cloud['rpc_calls'] if name == 'etl_connection_save'][-1]
    assert crypto.decrypt(save['p_secret']) == 'new-secret'
    assert 'password' not in save['p_metadata'] and 'new-secret' not in response.text
    count = len(tested)
    response = client.request('PATCH', '/api/v1/connections/'+CID, json={'version': 1, 'name': 'Renamed'}, headers=headers)
    assert response.status_code == 200 and len(tested) == count
    response = client.request('PATCH', '/api/v1/connections/'+CID, json={'version': 1, 'database': 'changed'}, headers=headers)
    assert response.status_code == 200 and tested[-1]['password'] == 'synthetic-secret'
    response = client.request('PATCH', '/api/v1/connections/'+CID, json={'version': 1, 'password': 'replacement'}, headers=headers)
    assert response.status_code == 200 and tested[-1]['password'] == 'replacement'
    count = len(tested)
    response = client.request('PATCH', '/api/v1/connections/'+CID, json={'version': 2, 'database': 'stale'}, headers=headers)
    assert response.status_code == 409 and len(tested) == count


def test_failed_connection_is_not_saved_and_releases_operation_slot(client, cloud, monkeypatch):
    from services import load_service
    def fail(config): raise RuntimeError('driver private detail')
    monkeypatch.setattr(load_service, 'test_target_connection', fail)
    body = {key: cloud['row'][key] for key in ('name', 'connection_type', 'db_type', 'host', 'database', 'user')}
    response = client.post('/api/v1/connections', json={**body, 'password': 'never-return'}, headers={'Authorization': 'Bearer token-a'})
    assert response.status_code == 400
    assert 'driver private detail' not in response.text and 'never-return' not in response.text
    assert not any(name == 'etl_connection_save' for name, _ in cloud['rpc_calls'])
    assert not connection_security.limits.running


def test_guest_bad_token_and_owner_isolation(client, cloud):
    assert client.get('/api/v1/connections').status_code == 401
    assert client.get('/api/v1/connections',headers={'Authorization':'Bearer invalid'}).status_code == 401
    assert client.get('/api/v1/connections',headers={'Authorization':'Bearer token-b'}).json() == {'items':[]}
    result = client.get('/api/v1/connections?user_id='+B,headers={'Authorization':'Bearer token-a'})
    item = result.json()['items'][0]
    assert item['id'] == CID and item['has_password']
    assert 'password' not in item and 'encrypted_password' not in item and 'user_id' not in item
    assert client.post('/api/v1/connections/'+CID+'/test?version=1',headers={'Authorization':'Bearer token-b'}).status_code == 404


def test_revocation_and_reference_override_rejected_before_database(client, cloud):
    ref = {'connection_id':CID,'connection_version':1}
    cloud['active'] = False
    assert client.post('/api/v1/extract/database',json=ref,headers={'Authorization':'Bearer token-a'}).status_code == 401
    assert not any(name=='etl_connection_secret' for name,_ in cloud['rpc_calls'])
    cloud['active'] = True
    assert client.post('/api/v1/extract/database',json={**ref,'host':'another.example'},headers={'Authorization':'Bearer token-a'}).status_code == 422
    assert client.post('/api/v1/extract/database',json=ref).status_code == 401


def test_saved_references_resolved_in_primary_and_secondary_sources(client, cloud, monkeypatch):
    from services import transform_service
    captured = {}
    async def preview(source, steps, limit):
        captured.update(source=source, steps=steps)
        return {'status':'success','columns':[],'dtypes':{},'preview_data':[],'total_rows':0}
    monkeypatch.setattr(transform_service,'process_transform_preview',preview)
    source = {'type':'database','connection_id':CID,'connection_version':1,'table_name':'example'}
    response = client.post('/api/v1/transform/preview',json={'source':source,'steps':[{'type':'union','params':{'secondary_source':source}}]},headers={'Authorization':'Bearer token-a'})
    assert response.status_code == 200
    assert captured['source']['password'] == 'synthetic-secret'
    assert captured['steps'][0]['params']['secondary_source']['password'] == 'synthetic-secret'
    assert 'synthetic-secret' not in response.text


def test_idempotent_load_claim_and_monitoring_failure_never_repeat_write(client,cloud,monkeypatch):
    from services import load_service
    writes=[]
    async def execute(**kwargs):
        writes.append(kwargs)
        return {'status':'success','table_name':'result','table_type':'dimension','total_rows':12,'preview_data':[],'message':'Done'}
    monkeypatch.setattr(load_service,'execute_load',execute)
    body={'request_id':RID,'source':{'type':'date_dimension','start_year':2024,'end_year':2024},'recipe':[],
          'target_connection':{'db_type':'postgresql','host':'example','database':'db','user':'u','password':''},
          'load_config':{'table_name':'result','table_type':'dimension','if_exists':'append'}}
    headers={'Authorization':'Bearer token-a'}
    cloud['fail_finish']=True
    first=client.post('/api/v1/load/execute',json=body,headers=headers)
    assert first.status_code == 200 and first.json()['monitoring_pending'] is True
    duplicate=client.post('/api/v1/load/execute',json=body,headers=headers)
    assert duplicate.status_code == 202 and duplicate.json()['execution_id']==RID
    assert len(writes)==1
    conflict=client.post('/api/v1/load/execute',json={**body,'load_config':{**body['load_config'],'table_name':'different'}},headers=headers)
    assert conflict.status_code == 409 and len(writes)==1
    claim=next(body for name,body in cloud['rpc_calls'] if name=='etl_claim_execution')
    assert 'password' not in json.dumps(claim) and 'preview_data' not in json.dumps(claim)


def test_http_cancellation_does_not_release_an_accepted_write_slot(cloud):
    from api.routes.load import LoadExecutionReq
    req=LoadExecutionReq.model_validate({'request_id':RID,'source':{'type':'date_dimension','start_year':2024,'end_year':2024},'recipe':[],
        'target_connection':{'db_type':'postgresql','host':'example','database':'db','user':'u','password':''},
        'load_config':{'table_name':'result','table_type':'dimension','if_exists':'append'}})
    async def run():
        started,release=asyncio.Event(),asyncio.Event()
        writes=[]
        async def operation():
            writes.append(1);started.set();await release.wait()
            return {'status':'success','total_rows':12}
        caller=asyncio.create_task(monitoring_service.run_monitored(Identity(A,'token-a',SID),req,operation))
        await started.wait();caller.cancel()
        with pytest.raises(asyncio.CancelledError):await caller
        assert 'load:'+A in connection_security.limits.running
        release.set()
        await asyncio.gather(*list(monitoring_service._accepted_tasks))
        assert 'load:'+A not in connection_security.limits.running
        assert len(writes)==1
        assert any(name=='etl_finish_execution' and payload['p_status']=='success' for name,payload in cloud['rpc_calls'])
    asyncio.run(run())


def test_unpaired_agent_and_private_egress_are_blocked(monkeypatch):
    monkeypatch.setattr(connection_security.socket,'getaddrinfo',lambda *a,**k:[(None,None,None,None,('127.0.0.1',5432))])
    with pytest.raises(HTTPException) as failure: connection_security.public_address('example.com',5432)
    assert failure.value.status_code==400
    with pytest.raises(HTTPException) as failure:
        asyncio.run(connection_security.pin_connection({'use_agent':True}))
    assert failure.value.status_code==409


def test_saved_agent_needs_current_owner_before_ciphertext_read(client, cloud):
    cloud['row']['transport']='agent'
    cloud['row']['host']='localhost'
    response=client.post('/api/v1/extract/database',json={'connection_id':CID,'connection_version':1,'runtime_agent_id':'other-agent'},headers={'Authorization':'Bearer token-a'})
    assert response.status_code==403
    assert not any(name=='etl_connection_secret' for name,_ in cloud['rpc_calls'])


def test_decrypted_password_is_redacted_from_driver_failures(client,cloud,monkeypatch):
    from services import extract_service
    def failed(**kwargs): raise ValueError('Driver rejected synthetic-secret')
    monkeypatch.setattr(extract_service,'get_database_metadata',failed)
    response=client.post('/api/v1/extract/database',json={'connection_id':CID,'connection_version':1},headers={'Authorization':'Bearer token-a'})
    assert response.status_code==400
    assert 'synthetic-secret' not in response.text


def test_public_hosting_does_not_read_server_files_through_etl(client,monkeypatch):
    monkeypatch.setenv('ETL_PUBLIC_EGRESS_ONLY','true')
    response=client.post('/api/v1/transform/preview',json={'source':{'type':'file','filepath':'/etc/passwd'},'steps':[]})
    assert response.status_code==400


def test_feature_switch_cannot_be_bypassed_with_a_saved_reference(client,cloud,monkeypatch):
    monkeypatch.setenv('ETL_SAVED_CONNECTIONS_ENABLED','false')
    assert client.get('/api/v1/connections',headers={'Authorization':'Bearer token-a'}).status_code==503
    response=client.post('/api/v1/extract/database',json={'connection_id':CID,'connection_version':1},headers={'Authorization':'Bearer token-a'})
    assert response.status_code==503
    assert not any(name=='etl_connection_secret' for name,_ in cloud['rpc_calls'])


@pytest.mark.parametrize('engine', ['postgresql','mysql','oracle'])
def test_password_punctuation_cannot_change_the_pinned_driver_destination(monkeypatch,engine):
    import etl.extractors.db_extractor as module
    captured={}
    class Connection:
        def __enter__(self): return self
        def __exit__(self,*args): pass
    def factory(url,**kwargs):
        captured['url']=url
        return SimpleNamespace(connect=lambda:Connection())
    monkeypatch.setattr(module,'create_engine',factory)
    extractor=module.DB_Extractor(db_type=engine,host='8.8.8.8',user='user@name',password='p@ss:/?#[]%=value',database='db?host=localhost',service_name='orcl.example')
    extractor.connect()
    assert captured['url'].host=='8.8.8.8'
    assert captured['url'].password=='p@ss:/?#[]%=value'
    assert captured['url'].username=='user@name'
