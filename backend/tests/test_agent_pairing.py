import asyncio
import json
import pytest
from fastapi import HTTPException
from services.auth_service import Identity
from services import agent_pairing
from services.agent_manager import AgentManager, agent_manager
from services.connection_service import prepare_config

A = Identity('11111111-1111-4111-8111-111111111111','a','22222222-2222-4222-8222-222222222222')
B = Identity('33333333-3333-4333-8333-333333333333','b','44444444-4444-4444-8444-444444444444')

@pytest.fixture(autouse=True)
def pairing_state(monkeypatch):
    monkeypatch.setattr(agent_pairing,'pending',__import__('collections').OrderedDict())
    monkeypatch.setattr(agent_manager,'paired_owners',{})
    token=agent_pairing.agent_bindings.set({})
    yield
    agent_pairing.agent_bindings.reset(token)

def test_one_time_pair_code_is_hashed_and_bound_to_issuer():
    code=agent_pairing.issue('agent-example',A)
    assert code not in repr(agent_pairing.pending)
    assert agent_pairing.consume('agent-example','wrong') is None
    assert agent_pairing.consume('agent-example',code)==(A.user_id,A.session_id)
    assert agent_pairing.consume('agent-example',code) is None

def test_expired_pair_code_does_not_connect(monkeypatch):
    code=agent_pairing.issue('agent-example',A)
    real=agent_pairing.time.monotonic
    monkeypatch.setattr(agent_pairing.time,'monotonic',lambda:real()+301)
    assert agent_pairing.consume('agent-example',code) is None

def test_owner_session_and_socket_generation_checked_before_secret_resolution():
    socket=object();agent_manager.register_agent('agent-example',socket)
    generation=agent_manager.connection_id('agent-example')
    agent_manager.paired_owners['agent-example']=(A.user_id,A.session_id,generation)
    with pytest.raises(HTTPException): agent_pairing.authorize('agent-example',B)
    with pytest.raises(HTTPException): agent_pairing.authorize('agent-example',Identity(A.user_id,'a',B.session_id))
    agent_pairing.authorize('agent-example',A)
    assert agent_pairing.agent_bindings.get()['agent-example']==generation
    result=asyncio.run(prepare_config({'db_type':'postgresql','host':'localhost','transport':'agent','runtime_agent_id':'agent-example'},A))
    assert result['use_agent'] and result['host']=='localhost'
    agent_manager.unregister_agent('agent-example',socket)
    agent_manager.register_agent('agent-example',object())
    with pytest.raises(HTTPException): agent_pairing.authorize('agent-example',A)

def test_broker_rejects_generation_replacement_and_unbound_callers():
    async def run():
        manager=AgentManager()
        class Socket:
            async def send_json(self,message):
                manager.resolve_request(message['request_id'],{'request_id':message['request_id'],'status':'success','data':{}},'agent',self)
        socket=Socket();manager.register_agent('agent',socket)
        generation=manager.connection_id('agent')
        manager.paired_owners['agent']=(A.user_id,A.session_id,generation)
        with pytest.raises(ValueError): await manager.send_command_and_wait('agent','get_metadata',{})
        agent_pairing.agent_bindings.set({'agent':generation})
        assert (await manager.send_command_and_wait('agent','get_metadata',{}))['status']=='success'
        manager.unregister_agent('agent',socket);manager.register_agent('agent',Socket())
        with pytest.raises(ValueError): await manager.send_command_and_wait('agent','get_metadata',{})
    asyncio.run(run())
