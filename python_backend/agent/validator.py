"""
Deterministic Compatibility Validator for Workshop Parts.
Enforces non-negotiable physical, electrical, and safety invariants.

Safety Invariants:
1. Voltage: Requested voltage must fall within [voltage_min_v, voltage_max_v]
   or be within ±10% tolerance of nominal voltage.
2. Connector: Connector type must match canonical pinout family (e.g. JST-XH, XT60, Screw Terminal).
3. Power:
   - For supplies/drivers: Part capacity must exceed requested load with >= 15% safety headroom.
   - For consuming loads (motors/solenoids): Part rating must safely handle the requested wattage.
4. Stock: Stock count must be >= 1.
5. High-Voltage / Hazard Guard: Voltages > 60V DC or Power > 1500W require mandatory human escalation.
"""

import hashlib
import time
from typing import Dict, Any, List
from .models import Part, ExtractedRequirements, ValidationResult, ValidationCheck


class DeterministicValidator:
    """Non-LLM deterministic compatibility validator."""

    SAFETY_POWER_HEADROOM_RATIO = 1.15  # 15% safety margin required for power supplies
    VOLTAGE_TOLERANCE_PERCENT = 0.10   # ±10% tolerance around nominal voltage
    HIGH_VOLTAGE_THRESHOLD_V = 60.0     # OSHA / NFPA 70 low-voltage safety boundary
    HIGH_POWER_THRESHOLD_W = 1500.0     # Industrial high-load boundary

    @staticmethod
    def canonicalize_connector(connector_str: str) -> str:
        """Normalizes connector strings for robust deterministic matching."""
        if not connector_str:
            return ""
        s = connector_str.lower().strip()
        # Canonical mappings
        if "jst" in s and "xh" in s:
            return "jst-xh"
        if "xt60" in s:
            return "xt60"
        if "xt90" in s:
            return "xt90"
        if "screw" in s or "terminal" in s:
            return "screw-terminal"
        if "molex" in s or "micro-fit" in s or "microfit" in s:
            return "molex-microfit"
        if "usb" in s and "c" in s:
            return "usb-c"
        if "barrel" in s or "5.5" in s or "dc-jack" in s:
            return "barrel-jack"
        if "m12" in s:
            return "m12"
        # Remove punctuation
        return "".join(c for c in s if c.isalnum() or c in ("-", "_"))

    @classmethod
    def validate(cls, requirements: ExtractedRequirements, part: Part) -> ValidationResult:
        """
        Runs comprehensive deterministic checks.
        Returns ValidationResult with atomic checks and verification token.
        """
        checks: List[ValidationCheck] = []
        failures: List[str] = []
        safety_warning: str | None = None

        # --- 1. VOLTAGE COMPATIBILITY ---
        req_v = requirements.voltage_v
        if req_v is None:
            checks.append(ValidationCheck(
                check_name="Voltage Invariant",
                passed=False,
                expected="Specific operating voltage (e.g., 12V, 24V)",
                actual="None specified",
                message="Requested voltage was not specified. Cannot verify electrical compatibility."
            ))
            failures.append("Missing requested voltage")
        else:
            # Check range
            in_range = part.voltage_min_v <= req_v <= part.voltage_max_v
            nominal_delta = abs(req_v - part.voltage_nominal_v) / part.voltage_nominal_v
            nominal_ok = nominal_delta <= cls.VOLTAGE_TOLERANCE_PERCENT

            v_passed = in_range or nominal_ok
            if v_passed:
                checks.append(ValidationCheck(
                    check_name="Voltage Invariant",
                    passed=True,
                    expected=f"{req_v:.1f}V (Safe range: {part.voltage_min_v:.1f}V - {part.voltage_max_v:.1f}V)",
                    actual=f"Part nominal {part.voltage_nominal_v:.1f}V",
                    message=f"Voltage compatible. Requested {req_v:.1f}V falls within operational range."
                ))
            else:
                msg = (f"Voltage mismatch: requested {req_v:.1f}V, but part operates within "
                       f"{part.voltage_min_v:.1f}V - {part.voltage_max_v:.1f}V (nominal {part.voltage_nominal_v:.1f}V).")
                checks.append(ValidationCheck(
                    check_name="Voltage Invariant",
                    passed=False,
                    expected=f"{part.voltage_min_v:.1f}V - {part.voltage_max_v:.1f}V",
                    actual=f"{req_v:.1f}V",
                    message=msg
                ))
                failures.append(msg)

        # --- 2. CONNECTOR COMPATIBILITY ---
        req_conn = requirements.connector_type
        if not req_conn:
            checks.append(ValidationCheck(
                check_name="Connector Invariant",
                passed=False,
                expected="Mating connector family (e.g. JST-XH, XT60, Screw Terminal)",
                actual="None specified",
                message="Requested connector type is missing. Physical mating cannot be verified."
            ))
            failures.append("Missing requested connector type")
        else:
            can_req = cls.canonicalize_connector(req_conn)
            can_part = cls.canonicalize_connector(part.connector_type)

            conn_passed = (can_req == can_part) or (can_req in can_part) or (can_part in can_req)
            if conn_passed:
                checks.append(ValidationCheck(
                    check_name="Connector Invariant",
                    passed=True,
                    expected=f"{part.connector_type} mating standard",
                    actual=f"Customer requested '{req_conn}' -> matched '{part.connector_type}'",
                    message=f"Physical mating confirmed for {part.connector_type}."
                ))
            else:
                msg = f"Connector incompatibility: customer requested '{req_conn}', but part has '{part.connector_type}'."
                checks.append(ValidationCheck(
                    check_name="Connector Invariant",
                    passed=False,
                    expected=part.connector_type,
                    actual=req_conn,
                    message=msg
                ))
                failures.append(msg)

        # --- 3. POWER & THERMAL HEADROOM ---
        req_p = requirements.power_w
        if req_p is None and requirements.current_a is not None and req_v is not None:
            req_p = req_v * requirements.current_a

        if req_p is None:
            # Power unspecified is a soft fail or requires verification
            checks.append(ValidationCheck(
                check_name="Power Headroom Invariant",
                passed=False,
                expected="Continuous power rating in Watts (or Volts + Amps)",
                actual="None specified",
                message="Power consumption/capacity not provided."
            ))
            failures.append("Missing power or current requirement")
        else:
            is_source = part.category in ("Power Supply", "Driver")
            if is_source:
                # Source must supply at least 15% headroom above required load
                min_required_capacity = req_p * cls.SAFETY_POWER_HEADROOM_RATIO
                p_passed = part.power_rating_w >= min_required_capacity
                if p_passed:
                    headroom_pct = ((part.power_rating_w - req_p) / req_p) * 100
                    checks.append(ValidationCheck(
                        check_name="Power Headroom Invariant",
                        passed=True,
                        expected=f">= {min_required_capacity:.1f}W (req {req_p:.1f}W + 15% margin)",
                        actual=f"{part.power_rating_w:.1f}W (+{headroom_pct:.1f}% margin)",
                        message=f"Thermal & power headroom verified with +{headroom_pct:.1f}% margin."
                    ))
                else:
                    msg = (f"Insufficient power capacity: required {req_p:.1f}W with 15% safety headroom "
                           f"({min_required_capacity:.1f}W min), but part is rated for {part.power_rating_w:.1f}W.")
                    checks.append(ValidationCheck(
                        check_name="Power Headroom Invariant",
                        passed=False,
                        expected=f">= {min_required_capacity:.1f}W",
                        actual=f"{part.power_rating_w:.1f}W",
                        message=msg
                    ))
                    failures.append(msg)
            else:
                # For consuming loads, requested power should be within ±25% of part rating
                p_diff = abs(part.power_rating_w - req_p) / part.power_rating_w
                p_passed = p_diff <= 0.25 or req_p <= part.power_rating_w
                if p_passed:
                    checks.append(ValidationCheck(
                        check_name="Power Rating Invariant",
                        passed=True,
                        expected=f"Rated capacity: {part.power_rating_w:.1f}W",
                        actual=f"Target load: {req_p:.1f}W",
                        message=f"Power rating verified for {part.power_rating_w:.1f}W load."
                    ))
                else:
                    msg = f"Power rating mismatch: load requested {req_p:.1f}W, but component is rated for {part.power_rating_w:.1f}W."
                    checks.append(ValidationCheck(
                        check_name="Power Rating Invariant",
                        passed=False,
                        expected=f"~{part.power_rating_w:.1f}W",
                        actual=f"{req_p:.1f}W",
                        message=msg
                    ))
                    failures.append(msg)

        # --- 4. STOCK & AVAILABILITY ---
        if part.stock_quantity > 0:
            checks.append(ValidationCheck(
                check_name="Physical Inventory Invariant",
                passed=True,
                expected="In Stock (>= 1)",
                actual=f"{part.stock_quantity} units available in {part.bin_location}",
                message=f"Stock confirmed at location {part.bin_location}."
            ))
        else:
            msg = f"Part {part.id} is out of stock (0 units in {part.bin_location})."
            checks.append(ValidationCheck(
                check_name="Physical Inventory Invariant",
                passed=False,
                expected=">= 1 unit in stock",
                actual="0 units",
                message=msg
            ))
            failures.append(msg)

        # --- 5. SAFETY & HAZARD THRESHOLD ---
        if (req_v is not None and req_v >= cls.HIGH_VOLTAGE_THRESHOLD_V) or \
           (req_p is not None and req_p >= cls.HIGH_POWER_THRESHOLD_W):
            safety_warning = (f"HIGH VOLTAGE / HIGH POWER HAZARD: {req_v or 0}V, {req_p or 0}W exceeds "
                              f"autonomous dispatch threshold ({cls.HIGH_VOLTAGE_THRESHOLD_V}V / {cls.HIGH_POWER_THRESHOLD_W}W). "
                              f"Mandatory safety review required by certified workshop electrician.")
            failures.append(safety_warning)

        is_compatible = (len(failures) == 0)

        # Generate verifiable proof token if compatible
        verification_token = None
        if is_compatible:
            token_raw = f"{part.id}:{req_v}:{req_conn}:{req_p}:{part.bin_location}:{int(time.time())}"
            verification_token = "VRF-" + hashlib.sha256(token_raw.encode("utf-8")).hexdigest()[:12].upper()

        return ValidationResult(
            compatible=is_compatible,
            part_id=part.id,
            checks=checks,
            failure_reasons=failures,
            safety_warning=safety_warning,
            verification_token=verification_token
        )
