from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field, ConfigDict
from services.auth_service import Identity, active_user
from services.agent_pairing import issue
from services.connection_security import limits

router = APIRouter()


class PairRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    agent_id: str = Field(min_length=1, max_length=120, pattern=r"^[A-Za-z0-9_-]+$")


@router.post("/pair")
async def pair(body: PairRequest, identity: Identity = Depends(active_user)):
    limits.check("pair:"+identity.user_id,10)
    return {"code": issue(body.agent_id, identity), "expires_in": 300}
