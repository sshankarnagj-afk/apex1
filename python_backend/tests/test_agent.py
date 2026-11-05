"""
Integration tests for WorkshopAgentController.
Tests agent decision flow, tool budget deductions, clarification loop, and guardrails.
"""

import pytest
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agent.controller import WorkshopAgentController
from agent.tools import WorkshopTools


@pytest.fixture
def agent():
    tools = WorkshopTools()
    return WorkshopAgentController(tools=tools, budget_limit_usd=0.050)


def test_agent_dispatches_compatible_part(agent):
    prompt = "I need a 24V stepper motor with a JST-XH connector drawing around 60W for our CNC axis."
    resp = agent.process_request(prompt)

    assert resp.status == "dispatched"
    assert resp.selected_part is not None
    assert resp.selected_part.id == "MOT-24V-001"
    assert resp.validation_result.compatible is True
    assert resp.decision.action_type == "dispatch"
    assert resp.budget_used_usd > 0
    assert resp.budget_remaining_usd < 0.050
    assert resp.evidence_hash is not None


def test_agent_asks_clarification_when_voltage_missing(agent):
    prompt = "We need a pneumatic solenoid valve with a Molex Micro-Fit connector for station B."
    resp = agent.process_request(prompt)

    assert resp.status == "clarification_needed"
    assert resp.decision.action_type == "ask_clarification"
    assert "voltage" in resp.requirements.missing_fields
    assert len(resp.tool_calls) == 1
    assert resp.tool_calls[0].tool_name == "ask_clarification"


def test_agent_resolves_after_clarification(agent):
    prompt = "We need a pneumatic solenoid valve with a Molex Micro-Fit connector for station B."
    clarification = {"voltage_v": 12.0, "power_w": 18.0}
    resp = agent.process_request(prompt, clarification_context=clarification)

    assert resp.status == "dispatched"
    assert resp.selected_part.id == "SOL-12V-018"
    assert resp.decision.action_type == "dispatch"


def test_agent_escalates_when_out_of_stock(agent):
    # SOL-24V-024 is out of stock in catalogue.json (stock = 0)
    prompt = "Need a 24V hydraulic solenoid valve with Molex Micro-Fit 2-Pin drawing 24W."
    resp = agent.process_request(prompt)

    assert resp.status == "referred_to_human"
    assert resp.decision.action_type == "refer_to_human"
    assert any("out of stock" in msg.lower() for msg in resp.decision.missing_or_failed_items or [resp.decision.reason.lower()])
