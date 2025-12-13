# © QuranChain™ | Dar Al-Nas™
# Founder: Omar Mohammad Abunadi
# Ownership Signature Enforced

"""FastAPI interface for Founder operations."""

from decimal import Decimal
from typing import Dict

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

from .ai import OmarAi

app = FastAPI(title="QuranChain Founder Interface", version="1.0.0")
omarai = OmarAi()


class TransactionRequest(BaseModel):
    amount: Decimal = Field(..., gt=0)
    currency: str = Field(default="USD")
    source: str
    destination: str
    purpose: str
    asset: str
    chain: str
    fee_bps: int = Field(default=50, ge=0, le=1000)
    metadata: Dict[str, str] | None = None


class DecisionRequest(BaseModel):
    note: str | None = None


class RejectionRequest(BaseModel):
    reason: str


def founder_token(x_founder_token: str = Header(..., alias="X-Founder-Token")) -> str:
    return x_founder_token


@app.post("/transactions/prepare", response_model=Dict[str, str])
def prepare_transaction(request: TransactionRequest) -> Dict[str, str]:
    try:
        record = omarai.build_intent(
            amount=request.amount,
            currency=request.currency,
            source=request.source,
            destination=request.destination,
            purpose=request.purpose,
            asset=request.asset,
            chain=request.chain,
            fee_bps=request.fee_bps,
            metadata=request.metadata or {},
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(exc))
    return {"transaction_id": record.id, "status": record.status.value, "net": record.metadata.get("net", "0")}


@app.post("/transactions/{transaction_id}/approve", response_model=Dict[str, str])
def approve_transaction(transaction_id: str, payload: DecisionRequest, token: str = Depends(founder_token)) -> Dict[str, str]:
    try:
        record = omarai.approve(token=token, transaction_id=transaction_id, note=payload.note)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(exc))
    return {"transaction_id": record.id, "status": record.status.value}


@app.post("/transactions/{transaction_id}/reject", response_model=Dict[str, str])
def reject_transaction(transaction_id: str, payload: RejectionRequest, token: str = Depends(founder_token)) -> Dict[str, str]:
    try:
        record = omarai.reject(token=token, transaction_id=transaction_id, reason=payload.reason)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(exc))
    return {"transaction_id": record.id, "status": record.status.value}


@app.get("/treasury/report", response_model=Dict[str, Dict[str, str]])
def treasury_report(token: str = Depends(founder_token)) -> Dict[str, Dict[str, str]]:
    try:
        omarai.authority._assert_founder(token)  # noqa: SLF001
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=401, detail=str(exc))
    return omarai.treasury.snapshot()


@app.post("/kill-switch/engage", response_model=Dict[str, str])
def engage_kill_switch(payload: RejectionRequest, token: str = Depends(founder_token)) -> Dict[str, str]:
    try:
        state = omarai.authority.engage_kill_switch(token, payload.reason)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(exc))
    return {"status": "engaged", "reason": state.get("reason", "")}


@app.post("/kill-switch/release", response_model=Dict[str, str])
def release_kill_switch(payload: DecisionRequest, token: str = Depends(founder_token)) -> Dict[str, str]:
    try:
        state = omarai.authority.release_kill_switch(token, payload.note)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(exc))
    return {"status": "released", "note": state.get("note", "")}


@app.get("/transactions", response_model=Dict[str, Dict[str, str]])
def list_transactions(token: str = Depends(founder_token)) -> Dict[str, Dict[str, str]]:
    try:
        omarai.authority._assert_founder(token)  # noqa: SLF001
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=401, detail=str(exc))
    data: Dict[str, Dict[str, str]] = {}
    for record in omarai.transactions.list_records():
        data[record.id] = {
            "status": record.status.value,
            "net": record.metadata.get("net", "0"),
            "destination": record.intent.destination,
            "chain": record.intent.chain,
        }
    return data


@app.get("/audit/verify", response_model=Dict[str, bool])
def verify_audit(token: str = Depends(founder_token)) -> Dict[str, bool]:
    try:
        omarai.authority._assert_founder(token)  # noqa: SLF001
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=401, detail=str(exc))
    return {"valid": omarai.audit.verify()}


def build_api() -> FastAPI:
    return app
