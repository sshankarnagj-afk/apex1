"""
Main Workshop Agent Controller.
Coordinates natural language understanding, multi-step tool execution,
deterministic validation guardrails, budget ledger, and human escalation.
"""

import os
import re
import time
import json
import uuid
from typing import Dict, Any, List, Optional
from .models import (
    Part, ExtractedRequirements, ValidationResult, ToolCallRecord,
    AgentDecision, AgentResponse
)
from .tools import WorkshopTools
from .budget import BudgetManager, BudgetExceededError
from .validator import DeterministicValidator


class WorkshopAgentController:
    """Agent controller for Smart Workshop Parts Assistant."""

    def __init__(self, tools: Optional[WorkshopTools] = None, budget_limit_usd: float = 0.050):
        self.tools = tools or WorkshopTools()
        self.budget_limit_usd = budget_limit_usd

    def extract_requirements(self, text: str) -> ExtractedRequirements:
        """
        Extracts technical requirements (voltage, connector, power, category) from natural language.
        Combines pattern-based semantic extraction with unit normalization.
        """
        raw = text.strip()
        t_lower = raw.lower()

        # 1. Voltage extraction (e.g. 24V, 24 V, 24 volt, 24-volt, 12VDC, 5V)
        voltage_v: Optional[float] = None
        v_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:v(?:olts?|dc)?)\b', t_lower)
        if v_match:
            try:
                voltage_v = float(v_match.group(1))
            except ValueError:
                pass

        # 2. Power & Current extraction (e.g. 60W, 150 watt, 2.5A, 10 amps)
        power_w: Optional[float] = None
        current_a: Optional[float] = None

        p_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:w(?:atts?)?)\b', t_lower)
        if p_match:
            try:
                power_w = float(p_match.group(1))
            except ValueError:
                pass

        a_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:a(?:mps?|mperes?)?)\b', t_lower)
        if a_match:
            try:
                current_a = float(a_match.group(1))
            except ValueError:
                pass

        if power_w is None and voltage_v is not None and current_a is not None:
            power_w = round(voltage_v * current_a, 2)

        # 3. Connector type extraction
        connector_type: Optional[str] = None
        if "jst" in t_lower or "jst-xh" in t_lower or "jst xh" in t_lower:
            connector_type = "JST-XH 4-Pin"
        elif "xt60" in t_lower:
            connector_type = "XT60"
        elif "xt90" in t_lower:
            connector_type = "XT90"
        elif "screw" in t_lower or "terminal block" in t_lower:
            connector_type = "Screw Terminal 2-Pin"
        elif "molex" in t_lower or "micro-fit" in t_lower or "microfit" in t_lower:
            connector_type = "Molex Micro-Fit 2-Pin"
        elif "usb-c" in t_lower or "type-c" in t_lower or "usb c" in t_lower:
            connector_type = "USB-C PD"
        elif "barrel" in t_lower or "5.5x2.1" in t_lower or "dc jack" in t_lower:
            connector_type = "Barrel 5.5x2.1mm"
        elif "m12" in t_lower:
            connector_type = "M12 4-Pin"

        # 4. Category inference
        category: Optional[str] = None
        if any(k in t_lower for k in ["motor", "stepper", "nema", "bipolar"]):
            category = "Motor"
        elif any(k in t_lower for k in ["power supply", "psu", "din-rail", "adapter", "buck", "regulator", "converter"]):
            category = "Power Supply"
        elif any(k in t_lower for k in ["driver", "controller", "esc", "foc"]):
            category = "Driver"
        elif any(k in t_lower for k in ["solenoid", "valve", "pneumatic", "hydraulic"]):
            category = "Solenoid"
        elif any(k in t_lower for k in ["esp32", "microcontroller", "mcu", "arduino"]):
            category = "Microcontroller"
        elif any(k in t_lower for k in ["sensor", "proximity", "inductive"]):
            category = "Sensor"

        # Identify missing mandatory fields
        missing: List[str] = []
        if voltage_v is None:
            missing.append("voltage")
        if connector_type is None:
            missing.append("connector_type")
        if power_w is None and current_a is None and category in ("Power Supply", "Driver", "Motor"):
            missing.append("power_or_current")

        return ExtractedRequirements(
            raw_request=raw,
            category=category,
            voltage_v=voltage_v,
            connector_type=connector_type,
            power_w=power_w,
            current_a=current_a,
            missing_fields=missing,
            confidence=0.95 if not missing else 0.65
        )

    def process_request(
        self,
        customer_request: str,
        clarification_context: Optional[Dict[str, Any]] = None
    ) -> AgentResponse:
        """
        Executes the agentic lifecycle:
        1. Extract & validate requirements
        2. Check for missing critical info -> ask_clarification
        3. Inspect catalogue via tool
        4. Verify stock via tool
        5. Run deterministic compatibility validation
        6. Dispatch part OR escalate to human
        7. Record budget, evidence hash, and execution logs
        """
        request_id = f"REQ-{str(uuid.uuid4())[:8].upper()}"
        budget = BudgetManager(initial_budget_usd=self.budget_limit_usd)
        thought_steps: List[str] = []

        thought_steps.append(f"Received customer request: '{customer_request}'")

        # Step 1: Extract requirements
        requirements = self.extract_requirements(customer_request)

        # Merge clarification context if provided (multi-turn resolution)
        if clarification_context:
            thought_steps.append("Incorporating customer clarification feedback...")
            if "voltage_v" in clarification_context and clarification_context["voltage_v"]:
                requirements.voltage_v = float(clarification_context["voltage_v"])
                if "voltage" in requirements.missing_fields:
                    requirements.missing_fields.remove("voltage")
            if "connector_type" in clarification_context and clarification_context["connector_type"]:
                requirements.connector_type = str(clarification_context["connector_type"])
                if "connector_type" in requirements.missing_fields:
                    requirements.missing_fields.remove("connector_type")
            if "power_w" in clarification_context and clarification_context["power_w"]:
                requirements.power_w = float(clarification_context["power_w"])
                if "power_or_current" in requirements.missing_fields:
                    requirements.missing_fields.remove("power_or_current")

        thought_steps.append(
            f"Extracted requirements: Voltage={requirements.voltage_v}V, "
            f"Connector={requirements.connector_type}, Power={requirements.power_w}W, "
            f"Category={requirements.category}"
        )

        # Rule 8: If critical fields are missing and no clarification was provided, ask clarification!
        if len(requirements.missing_fields) > 0:
            missing_str = ", ".join(requirements.missing_fields)
            thought_steps.append(f"Incomplete request: missing {missing_str}. Calling ask_clarification.")

            t_start = time.time()
            clarify_q = f"Could you clarify the required {missing_str} for your {requirements.category or 'component'}?"
            clarify_res = self.tools.ask_clarification(clarify_q, requirements.missing_fields)
            budget.record_call(
                tool_name="ask_clarification",
                arguments={"question": clarify_q, "missing_fields": requirements.missing_fields},
                result=clarify_res,
                execution_ms=int((time.time() - t_start) * 1000)
            )

            decision = AgentDecision(
                action_type="ask_clarification",
                reason=f"Customer request lacks mandatory specifications: {missing_str}.",
                missing_or_failed_items=requirements.missing_fields,
                risk_level="low"
            )

            return AgentResponse(
                request_id=request_id,
                customer_request=customer_request,
                status="clarification_needed",
                requirements=requirements,
                candidate_parts=[],
                selected_part=None,
                validation_result=None,
                decision=decision,
                tool_calls=budget.records,
                budget_used_usd=budget.total_spent_usd,
                budget_remaining_usd=budget.remaining_budget_usd,
                evidence_hash=budget.compute_evidence_hash(),
                thought_steps=thought_steps
            )

        # Step 2: Tool Calling - inspect_catalogue
        thought_steps.append("Calling inspect_catalogue to query matching candidate parts...")
        t_start = time.time()
        candidates_raw = self.tools.inspect_catalogue(
            category=requirements.category,
            voltage_filter=requirements.voltage_v,
            connector_filter=requirements.connector_type,
            max_power=requirements.power_w
        )
        budget.record_call(
            tool_name="inspect_catalogue",
            arguments={
                "category": requirements.category,
                "voltage_filter": requirements.voltage_v,
                "connector_filter": requirements.connector_type,
                "max_power": requirements.power_w
            },
            result={"candidate_count": len(candidates_raw), "part_ids": [p["id"] for p in candidates_raw]},
            execution_ms=int((time.time() - t_start) * 1000)
        )

        candidate_parts = [Part(**p) for p in candidates_raw]
        thought_steps.append(f"Found {len(candidate_parts)} candidate part(s): {[p.id for p in candidate_parts]}")

        # If zero candidates found in catalogue -> Escalate to human
        if not candidate_parts:
            thought_steps.append("No parts matched specifications in catalogue. Escalating to human specialist.")
            t_start = time.time()
            esc_res = self.tools.escalate_to_human(
                reason=f"No catalogue part matches {requirements.voltage_v}V, connector '{requirements.connector_type}', category {requirements.category}.",
                missing_or_failed_items=["No catalogue match found"],
                risk_level="medium"
            )
            budget.record_call(
                tool_name="escalate_to_human",
                arguments={"reason": esc_res["reason"], "risk_level": "medium"},
                result=esc_res,
                execution_ms=int((time.time() - t_start) * 1000)
            )

            decision = AgentDecision(
                action_type="refer_to_human",
                reason=esc_res["reason"],
                missing_or_failed_items=["No matching SKU in inventory"],
                risk_level="medium"
            )

            return AgentResponse(
                request_id=request_id,
                customer_request=customer_request,
                status="referred_to_human",
                requirements=requirements,
                candidate_parts=[],
                selected_part=None,
                validation_result=None,
                decision=decision,
                tool_calls=budget.records,
                budget_used_usd=budget.total_spent_usd,
                budget_remaining_usd=budget.remaining_budget_usd,
                evidence_hash=budget.compute_evidence_hash(),
                thought_steps=thought_steps
            )

        # Step 3: Evaluate candidates (verify_stock & validate_compatibility)
        chosen_part: Optional[Part] = None
        chosen_validation: Optional[ValidationResult] = None

        for candidate in candidate_parts:
            thought_steps.append(f"Evaluating candidate {candidate.id} ({candidate.name})...")

            # Verify stock
            t_start = time.time()
            stock_info = self.tools.verify_stock(candidate.id)
            budget.record_call(
                tool_name="verify_stock",
                arguments={"part_id": candidate.id},
                result=stock_info,
                execution_ms=int((time.time() - t_start) * 1000)
            )

            if not stock_info["can_dispatch"]:
                thought_steps.append(f"Candidate {candidate.id} has 0 stock in warehouse. Skipping automated dispatch.")
                continue

            # Deterministic compatibility validation
            t_start = time.time()
            val_raw = self.tools.validate_compatibility(
                part_id=candidate.id,
                requested_voltage=requirements.voltage_v,
                requested_connector=requirements.connector_type,
                requested_power_w=requirements.power_w,
                category=requirements.category
            )
            budget.record_call(
                tool_name="validate_compatibility",
                arguments={
                    "part_id": candidate.id,
                    "requested_voltage": requirements.voltage_v,
                    "requested_connector": requirements.connector_type,
                    "requested_power_w": requirements.power_w
                },
                result=val_raw,
                execution_ms=int((time.time() - t_start) * 1000)
            )

            val_res = ValidationResult(**val_raw)
            if val_res.compatible:
                thought_steps.append(f"Candidate {candidate.id} PASSED all deterministic compatibility invariants!")
                chosen_part = candidate
                chosen_validation = val_res
                break
            else:
                thought_steps.append(f"Candidate {candidate.id} FAILED compatibility: {val_res.failure_reasons}")

        # Step 4: Decision Rendering
        # Rule 7: Never dispatch an incompatible or unverified part!
        if chosen_part and chosen_validation and chosen_validation.compatible:
            thought_steps.append(f"All invariants verified. Executing dispatch_part for {chosen_part.id}...")
            t_start = time.time()
            dsp_res = self.tools.dispatch_part(
                part_id=chosen_part.id,
                order_notes=f"Auto-dispatched for workshop order: '{customer_request}'",
                verification_token=chosen_validation.verification_token or ""
            )
            budget.record_call(
                tool_name="dispatch_part",
                arguments={
                    "part_id": chosen_part.id,
                    "verification_token": chosen_validation.verification_token
                },
                result=dsp_res,
                execution_ms=int((time.time() - t_start) * 1000)
            )

            decision = AgentDecision(
                action_type="dispatch",
                part_id=chosen_part.id,
                reason=f"Part {chosen_part.name} perfectly satisfies voltage ({chosen_part.voltage_nominal_v}V), connector ({chosen_part.connector_type}), and power requirements.",
                risk_level="none",
                verification_token=chosen_validation.verification_token,
                warehouse_slip=dsp_res.get("warehouse_slip")
            )
            status = "dispatched"
        else:
            # Escalation to human
            reason = "Automated dispatch rejected: "
            if any(p.stock_quantity == 0 for p in candidate_parts):
                reason += "Matching component is out of stock in warehouse. "
            else:
                reason += "No candidate part passed all deterministic voltage, connector, or power criteria. "

            thought_steps.append(f"Safety guard triggered. Escalating to human: {reason}")
            t_start = time.time()
            esc_res = self.tools.escalate_to_human(
                reason=reason,
                missing_or_failed_items=[reason],
                risk_level="high" if any("HAZARD" in str(c) for c in thought_steps) else "medium"
            )
            budget.record_call(
                tool_name="escalate_to_human",
                arguments={"reason": reason, "risk_level": "medium"},
                result=esc_res,
                execution_ms=int((time.time() - t_start) * 1000)
            )

            decision = AgentDecision(
                action_type="refer_to_human",
                part_id=candidate_parts[0].id if candidate_parts else None,
                reason=reason,
                missing_or_failed_items=["Deterministic safety checks failed or stock unavailable"],
                risk_level="medium"
            )
            status = "referred_to_human"

        return AgentResponse(
            request_id=request_id,
            customer_request=customer_request,
            status=status,
            requirements=requirements,
            candidate_parts=candidate_parts,
            selected_part=chosen_part,
            validation_result=chosen_validation,
            decision=decision,
            tool_calls=budget.records,
            budget_used_usd=budget.total_spent_usd,
            budget_remaining_usd=budget.remaining_budget_usd,
            evidence_hash=budget.compute_evidence_hash(),
            thought_steps=thought_steps
        )
