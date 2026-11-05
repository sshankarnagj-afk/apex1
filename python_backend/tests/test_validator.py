"""
Unit tests for deterministic validation rules in Smart Workshop Parts Assistant.
Tests voltage boundaries, connector canonicalization, power headroom, stock, and hazard detection.
"""

import pytest
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agent.models import Part, ExtractedRequirements
from agent.validator import DeterministicValidator


@pytest.fixture
def sample_stepper():
    return Part(
        id="MOT-24V-001",
        name="NEMA 23 Bipolar Stepper Motor",
        category="Motor",
        voltage_nominal_v=24.0,
        voltage_min_v=20.0,
        voltage_max_v=28.0,
        current_draw_a=2.8,
        power_rating_w=67.2,
        connector_type="JST-XH 4-Pin",
        pinout_polarity="A+, A-, B+, B-",
        stock_quantity=5,
        price_usd=38.50,
        bin_location="BAY-A-14",
        safety_cert="CE, RoHS",
        spec_summary="1.9Nm torque"
    )


@pytest.fixture
def sample_psu():
    return Part(
        id="PSU-24V-150",
        name="Industrial DIN-Rail PSU 24V 150W",
        category="Power Supply",
        voltage_nominal_v=24.0,
        voltage_min_v=22.0,
        voltage_max_v=26.0,
        current_draw_a=6.25,
        power_rating_w=150.0,
        connector_type="Screw Terminal 2-Pin",
        pinout_polarity="V+, V-",
        stock_quantity=3,
        price_usd=64.00,
        bin_location="BAY-B-02",
        safety_cert="UL, CE",
        spec_summary="91% efficiency"
    )


def test_perfect_compatibility(sample_stepper):
    req = ExtractedRequirements(
        raw_request="Need 24V stepper with JST-XH connector and 60W power",
        category="Motor",
        voltage_v=24.0,
        connector_type="JST-XH 4-Pin",
        power_w=60.0
    )
    result = DeterministicValidator.validate(req, sample_stepper)
    assert result.compatible is True
    assert len(result.failure_reasons) == 0
    assert result.verification_token is not None
    assert result.verification_token.startswith("VRF-")


def test_voltage_out_of_bounds(sample_stepper):
    req = ExtractedRequirements(
        raw_request="Need 12V motor with JST-XH connector",
        category="Motor",
        voltage_v=12.0,
        connector_type="JST-XH 4-Pin",
        power_w=50.0
    )
    result = DeterministicValidator.validate(req, sample_stepper)
    assert result.compatible is False
    assert any("Voltage mismatch" in reason for reason in result.failure_reasons)


def test_connector_incompatibility(sample_stepper):
    req = ExtractedRequirements(
        raw_request="Need 24V motor with XT60 connector",
        category="Motor",
        voltage_v=24.0,
        connector_type="XT60",
        power_w=60.0
    )
    result = DeterministicValidator.validate(req, sample_stepper)
    assert result.compatible is False
    assert any("Connector incompatibility" in reason for reason in result.failure_reasons)


def test_power_supply_headroom_requirement(sample_psu):
    # Customer asks for 140W load.
    # PSU rated 150W. With 15% headroom, minimum required capacity is 140 * 1.15 = 161W.
    # So 150W is insufficient!
    req = ExtractedRequirements(
        raw_request="Need 24V PSU with screw terminals for 140W load",
        category="Power Supply",
        voltage_v=24.0,
        connector_type="Screw Terminal 2-Pin",
        power_w=140.0
    )
    result = DeterministicValidator.validate(req, sample_psu)
    assert result.compatible is False
    assert any("headroom" in reason for reason in result.failure_reasons)


def test_out_of_stock_prevents_dispatch(sample_stepper):
    sample_stepper.stock_quantity = 0
    req = ExtractedRequirements(
        raw_request="Need 24V motor",
        category="Motor",
        voltage_v=24.0,
        connector_type="JST-XH 4-Pin",
        power_w=60.0
    )
    result = DeterministicValidator.validate(req, sample_stepper)
    assert result.compatible is False
    assert any("out of stock" in reason for reason in result.failure_reasons)


def test_high_voltage_hazard_triggers_escalation(sample_stepper):
    req = ExtractedRequirements(
        raw_request="Need 72V motor with JST-XH",
        category="Motor",
        voltage_v=72.0,
        connector_type="JST-XH 4-Pin",
        power_w=100.0
    )
    result = DeterministicValidator.validate(req, sample_stepper)
    assert result.compatible is False
    assert result.safety_warning is not None
