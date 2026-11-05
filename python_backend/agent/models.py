"""
Pydantic data models for Smart Workshop Parts Assistant.
Defines schemas for parts, customer requirements, tool calls, and agent outcomes.
"""

from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field


class Part(BaseModel):
    """Represents a workshop component in the catalogue."""
    id: str = Field(..., description="Unique part SKU identifier")
    name: str = Field(..., description="Descriptive component title")
    category: str = Field(..., description="Component family: Motor, Power Supply, Driver, Solenoid, etc.")
    voltage_nominal_v: float = Field(..., description="Nominal operating voltage in Volts")
    voltage_min_v: float = Field(..., description="Minimum rated safe voltage in Volts")
    voltage_max_v: float = Field(..., description="Maximum rated safe voltage in Volts")
    current_draw_a: float = Field(..., description="Continuous current draw/capacity in Amperes")
    power_rating_w: float = Field(..., description="Continuous power rating in Watts")
    connector_type: str = Field(..., description="Physical mating connector specification")
    pinout_polarity: str = Field(..., description="Pinout wiring polarity guide")
    stock_quantity: int = Field(..., ge=0, description="Available inventory count")
    price_usd: float = Field(..., ge=0, description="Unit cost in USD")
    bin_location: str = Field(..., description="Warehouse storage location")
    safety_cert: str = Field(..., description="Safety compliance standards: CE, UL, RoHS, etc.")
    spec_summary: str = Field(..., description="Key technical highlights and tolerances")


class ExtractedRequirements(BaseModel):
    """Structured technical parameters parsed from natural language request."""
    raw_request: str = Field(..., description="Original customer prompt")
    category: Optional[str] = Field(None, description="Inferred part category")
    voltage_v: Optional[float] = Field(None, description="Target requested voltage in Volts")
    voltage_min_v: Optional[float] = Field(None, description="Minimum acceptable voltage")
    voltage_max_v: Optional[float] = Field(None, description="Maximum acceptable voltage")
    connector_type: Optional[str] = Field(None, description="Target connector standard")
    power_w: Optional[float] = Field(None, description="Target power rating in Watts")
    current_a: Optional[float] = Field(None, description="Target current draw in Amperes")
    missing_fields: List[str] = Field(default_factory=list, description="Mandatory parameters absent in request")
    confidence: float = Field(default=1.0, ge=0.0, le=1.0, description="Extraction confidence score")
    notes: Optional[str] = Field(None, description="Parsing notes or warnings")


class ValidationCheck(BaseModel):
    """Individual deterministic invariant check result."""
    check_name: str
    passed: bool
    expected: str
    actual: str
    message: str


class ValidationResult(BaseModel):
    """Aggregate deterministic compatibility output."""
    compatible: bool
    part_id: str
    checks: List[ValidationCheck] = Field(default_factory=list)
    failure_reasons: List[str] = Field(default_factory=list)
    safety_warning: Optional[str] = None
    verification_token: Optional[str] = None


class ToolCallRecord(BaseModel):
    """Audit log entry for a single tool invocation."""
    step_id: int
    tool_name: str
    arguments: Dict[str, Any]
    result: Any
    cost_usd: float
    timestamp: str
    execution_ms: int


class AgentDecision(BaseModel):
    """Final decision rendered by the agent."""
    action_type: Literal["dispatch", "refer_to_human", "ask_clarification"]
    part_id: Optional[str] = None
    reason: str
    missing_or_failed_items: List[str] = Field(default_factory=list)
    risk_level: Literal["none", "low", "medium", "high", "critical"] = "none"
    verification_token: Optional[str] = None
    warehouse_slip: Optional[Dict[str, Any]] = None


class AgentResponse(BaseModel):
    """Complete response payload for a workshop parts request."""
    request_id: str
    customer_request: str
    status: Literal["dispatched", "referred_to_human", "clarification_needed"]
    requirements: ExtractedRequirements
    candidate_parts: List[Part] = Field(default_factory=list)
    selected_part: Optional[Part] = None
    validation_result: Optional[ValidationResult] = None
    decision: AgentDecision
    tool_calls: List[ToolCallRecord] = Field(default_factory=list)
    budget_used_usd: float
    budget_remaining_usd: float
    evidence_hash: str
    thought_steps: List[str] = Field(default_factory=list)
