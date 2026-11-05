"""
FastAPI Backend for Smart Workshop Parts Assistant.
Provides RESTful APIs for agent execution, deterministic validation,
catalogue queries, and stock adjustments.
"""

import os
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Support both package imports and standalone python execution
try:
    from ..agent.models import (
        Part, ExtractedRequirements, ValidationResult, AgentResponse
    )
    from ..agent.controller import WorkshopAgentController
    from ..agent.tools import WorkshopTools, TOOL_DEFINITIONS
    from ..agent.validator import DeterministicValidator
except ImportError:
    import sys
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from agent.models import (
        Part, ExtractedRequirements, ValidationResult, AgentResponse
    )
    from agent.controller import WorkshopAgentController
    from agent.tools import WorkshopTools, TOOL_DEFINITIONS
    from agent.validator import DeterministicValidator

app = FastAPI(
    title="Smart Workshop Parts Assistant API",
    description="Agentic workshop automation API with deterministic physical/electrical validation and budget tracking",
    version="1.0.0"
)

# Enable CORS for frontend clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Shared tools instance
tools_instance = WorkshopTools()
agent_controller = WorkshopAgentController(tools=tools_instance)


class RequestPayload(BaseModel):
    request: str = Field(..., example="I need a 24V stepper motor with a JST-XH connector drawing around 60W for our CNC axis.")
    budget_limit_usd: Optional[float] = Field(default=0.050, ge=0.01, le=1.0)


class ClarificationPayload(BaseModel):
    original_request: str
    clarification_answers: Dict[str, Any] = Field(..., example={"voltage_v": 24.0, "connector_type": "JST-XH 4-Pin"})
    budget_limit_usd: Optional[float] = 0.050


class StockUpdatePayload(BaseModel):
    part_id: str
    quantity: int = Field(..., ge=0)


class DirectValidatePayload(BaseModel):
    part_id: str
    requested_voltage: float
    requested_connector: str
    requested_power_w: float
    category: Optional[str] = None


@app.get("/health", tags=["System"])
def health_check():
    """System health check and inventory stats."""
    all_parts = tools_instance.get_all_parts()
    in_stock_count = sum(1 for p in all_parts if p.stock_quantity > 0)
    return {
        "status": "healthy",
        "service": "Smart Workshop Parts Assistant",
        "total_parts_in_catalogue": len(all_parts),
        "in_stock_parts_count": in_stock_count,
        "default_budget_per_session_usd": 0.050
    }


@app.get("/api/catalogue", response_model=List[Part], tags=["Catalogue"])
def get_catalogue(
    category: Optional[str] = Query(None, description="Filter by category"),
    min_voltage: Optional[float] = Query(None, description="Min nominal voltage"),
    max_voltage: Optional[float] = Query(None, description="Max nominal voltage"),
    in_stock_only: bool = Query(False, description="Filter only parts with quantity > 0")
):
    """Retrieves all fictional workshop parts matching query parameters."""
    parts = tools_instance.get_all_parts()
    filtered: List[Part] = []
    for p in parts:
        if category and category.lower() not in p.category.lower():
            continue
        if min_voltage is not None and p.voltage_nominal_v < min_voltage:
            continue
        if max_voltage is not None and p.voltage_nominal_v > max_voltage:
            continue
        if in_stock_only and p.stock_quantity <= 0:
            continue
        filtered.append(p)
    return filtered


@app.post("/api/catalogue/stock", tags=["Catalogue"])
def update_catalogue_stock(payload: StockUpdatePayload):
    """Adjusts physical stock level for a given SKU (enables testing out-of-stock scenarios)."""
    success = tools_instance.update_stock(payload.part_id, payload.quantity)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Part SKU {payload.part_id} not found in inventory."
        )
    return {
        "success": True,
        "part_id": payload.part_id,
        "new_stock_quantity": payload.quantity,
        "message": f"Stock for {payload.part_id} updated to {payload.quantity} units."
    }


@app.post("/api/validate", response_model=ValidationResult, tags=["Deterministic Validation"])
def validate_part(payload: DirectValidatePayload):
    """Directly invokes the non-LLM deterministic compatibility validator."""
    part = tools_instance.parts_db.get(payload.part_id)
    if not part:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Part {payload.part_id} not found in catalogue."
        )

    req = ExtractedRequirements(
        raw_request="Direct API validation test",
        category=payload.category or part.category,
        voltage_v=payload.requested_voltage,
        connector_type=payload.requested_connector,
        power_w=payload.requested_power_w
    )

    result = DeterministicValidator.validate(req, part)
    return result


@app.post("/api/agent/process", response_model=AgentResponse, tags=["Agent Execution"])
def process_customer_request(payload: RequestPayload):
    """
    Main entry point for processing natural language customer requests.
    Executes ReAct tool calling, deterministic validation, budget deductions, and audit logging.
    """
    if not payload.request or not payload.request.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Customer request cannot be empty."
        )

    controller = WorkshopAgentController(
        tools=tools_instance,
        budget_limit_usd=payload.budget_limit_usd or 0.050
    )
    response = controller.process_request(payload.request)
    return response


@app.post("/api/agent/clarify", response_model=AgentResponse, tags=["Agent Execution"])
def resolve_clarification(payload: ClarificationPayload):
    """
    Continues an in-flight request after the customer answers clarification questions.
    """
    controller = WorkshopAgentController(
        tools=tools_instance,
        budget_limit_usd=payload.budget_limit_usd or 0.050
    )
    response = controller.process_request(
        customer_request=payload.original_request,
        clarification_context=payload.clarification_answers
    )
    return response


@app.get("/api/tools", tags=["Tools Protocol"])
def list_tool_definitions():
    """Returns the organizer's supplied tool protocol schemas."""
    return {
        "protocol_version": "1.0",
        "tools": TOOL_DEFINITIONS
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
