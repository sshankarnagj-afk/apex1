"""
Tool implementations and schema declarations for the Smart Workshop Parts Assistant.
Adheres strictly to the supplied tool protocol.
"""

import json
import os
import time
from typing import List, Dict, Any, Optional
from .models import Part, ExtractedRequirements, ValidationResult
from .validator import DeterministicValidator
from .budget import BudgetManager


class WorkshopTools:
    """Concrete implementations of workshop tools."""

    def __init__(self, catalogue_path: Optional[str] = None):
        if not catalogue_path:
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            catalogue_path = os.path.join(base_dir, "data", "catalogue.json")
            if not os.path.exists(catalogue_path):
                # Fallback to src/data/catalogue.json
                catalogue_path = os.path.join(os.path.dirname(base_dir), "src", "data", "catalogue.json")

        self.catalogue_path = catalogue_path
        self.parts_db: Dict[str, Part] = {}
        self.reload_catalogue()

    def reload_catalogue(self):
        """Loads catalogue from disk."""
        if os.path.exists(self.catalogue_path):
            with open(self.catalogue_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                self.parts_db = {item["id"]: Part(**item) for item in data}
        else:
            self.parts_db = {}

    def get_all_parts(self) -> List[Part]:
        return list(self.parts_db.values())

    def update_stock(self, part_id: str, new_quantity: int) -> bool:
        if part_id in self.parts_db:
            self.parts_db[part_id].stock_quantity = max(0, new_quantity)
            return True
        return False

    # --- Tool 1: inspect_catalogue ---
    def inspect_catalogue(
        self,
        category: Optional[str] = None,
        voltage_filter: Optional[float] = None,
        connector_filter: Optional[str] = None,
        max_power: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """
        Inspects the fictional parts catalogue matching physical/electrical criteria.
        """
        candidates: List[Part] = []
        for part in self.parts_db.values():
            # Category match
            if category and category.lower() not in part.category.lower() and part.category.lower() not in category.lower():
                continue
            # Voltage match (within range or ±15%)
            if voltage_filter is not None:
                delta = abs(part.voltage_nominal_v - voltage_filter) / part.voltage_nominal_v
                in_range = part.voltage_min_v <= voltage_filter <= part.voltage_max_v
                if not in_range and delta > 0.15:
                    continue
            # Connector match
            if connector_filter:
                req_conn = DeterministicValidator.canonicalize_connector(connector_filter)
                part_conn = DeterministicValidator.canonicalize_connector(part.connector_type)
                if req_conn and req_conn not in part_conn and part_conn not in req_conn:
                    continue
            # Power check
            if max_power is not None and part.power_rating_w < max_power * 0.7:
                continue

            candidates.append(part)

        return [p.model_dump() for p in candidates]

    # --- Tool 2: verify_stock ---
    def verify_stock(self, part_id: str) -> Dict[str, Any]:
        """
        Verifies real-time bin location, physical quantity, and reservation status.
        """
        part = self.parts_db.get(part_id)
        if not part:
            return {
                "part_id": part_id,
                "found": False,
                "stock_quantity": 0,
                "status": "NOT_FOUND",
                "message": f"Part ID {part_id} does not exist in inventory system."
            }

        status = "AVAILABLE" if part.stock_quantity > 0 else "OUT_OF_STOCK"
        return {
            "part_id": part.id,
            "name": part.name,
            "found": True,
            "stock_quantity": part.stock_quantity,
            "bin_location": part.bin_location,
            "status": status,
            "can_dispatch": part.stock_quantity > 0,
            "message": f"{part.stock_quantity} units available at warehouse location {part.bin_location}."
        }

    # --- Tool 3: validate_compatibility ---
    def validate_compatibility(
        self,
        part_id: str,
        requested_voltage: Optional[float],
        requested_connector: Optional[str],
        requested_power_w: Optional[float],
        category: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes strict deterministic compatibility checks for voltage, connector, and power headroom.
        """
        part = self.parts_db.get(part_id)
        if not part:
            return {
                "compatible": False,
                "part_id": part_id,
                "error": f"Part {part_id} not found."
            }

        req = ExtractedRequirements(
            raw_request="Validation call",
            category=category or part.category,
            voltage_v=requested_voltage,
            connector_type=requested_connector,
            power_w=requested_power_w
        )

        res = DeterministicValidator.validate(req, part)
        return res.model_dump()

    # --- Tool 4: ask_clarification ---
    def ask_clarification(self, question: str, missing_fields: List[str]) -> Dict[str, Any]:
        """
        Pauses dispatch to ask the user a clarification question when critical specs are missing.
        """
        return {
            "status": "CLARIFICATION_REQUIRED",
            "question": question,
            "missing_fields": missing_fields,
            "requires_user_input": True
        }

    # --- Tool 5: dispatch_part ---
    def dispatch_part(
        self,
        part_id: str,
        order_notes: str,
        verification_token: str
    ) -> Dict[str, Any]:
        """
        Finalizes physical dispatch. Requires a valid deterministic verification token.
        Decrements warehouse inventory and generates packing slip.
        """
        part = self.parts_db.get(part_id)
        if not part:
            return {"success": False, "error": f"Part {part_id} not found."}

        if not verification_token or not verification_token.startswith("VRF-"):
            return {
                "success": False,
                "error": "SECURITY REJECTION: Cannot dispatch without valid deterministic verification token."
            }

        if part.stock_quantity <= 0:
            return {
                "success": False,
                "error": f"DISPATCH ABORTED: Part {part_id} is out of stock in {part.bin_location}."
            }

        # Decrement stock safely
        part.stock_quantity -= 1

        slip = {
            "dispatch_id": f"DSP-{int(time.time())}-{part.id}",
            "part_id": part.id,
            "part_name": part.name,
            "bin_location": part.bin_location,
            "voltage": f"{part.voltage_nominal_v}V",
            "connector": part.connector_type,
            "power": f"{part.power_rating_w}W",
            "verification_token": verification_token,
            "safety_cert": part.safety_cert,
            "order_notes": order_notes,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
            "status": "DISPATCH_AUTHORIZED"
        }
        return {"success": True, "warehouse_slip": slip}

    # --- Tool 6: escalate_to_human ---
    def escalate_to_human(
        self,
        reason: str,
        missing_or_failed_items: List[str],
        risk_level: str = "medium"
    ) -> Dict[str, Any]:
        """
        Escalates ambiguous, incompatible, out-of-stock, or hazardous requests to a human engineer.
        """
        ticket_id = f"ESC-{int(time.time())}"
        return {
            "escalated": True,
            "ticket_id": ticket_id,
            "reason": reason,
            "missing_or_failed_items": missing_or_failed_items,
            "risk_level": risk_level,
            "action_required": "Workshop Technician / Electrical Engineer Review",
            "message": f"Escalated to human technician (Ticket #{ticket_id}): {reason}"
        }


# LLM Tool Definitions (JSON Schema for Gemini / OpenAI / LangChain)
TOOL_DEFINITIONS = [
    {
        "name": "inspect_catalogue",
        "description": "Inspects the workshop parts catalogue for candidate components matching category, voltage, connector, or power criteria.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "category": {
                    "type": "STRING",
                    "description": "Component family: Motor, Power Supply, Driver, Solenoid, Microcontroller, Sensor"
                },
                "voltage_filter": {
                    "type": "NUMBER",
                    "description": "Target nominal operating voltage in Volts (e.g., 12.0, 24.0)"
                },
                "connector_filter": {
                    "type": "STRING",
                    "description": "Target connector type (e.g., 'JST-XH', 'XT60', 'Screw Terminal')"
                },
                "max_power": {
                    "type": "NUMBER",
                    "description": "Expected power consumption or capacity in Watts"
                }
            }
        }
    },
    {
        "name": "verify_stock",
        "description": "Checks warehouse inventory, bin storage location, and available physical quantity for a specific part SKU.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "part_id": {
                    "type": "STRING",
                    "description": "The exact SKU/part_id (e.g. 'MOT-24V-001', 'PSU-24V-150')"
                }
            },
            "required": ["part_id"]
        }
    },
    {
        "name": "validate_compatibility",
        "description": "Runs strict deterministic non-LLM checks for voltage range, connector mating, and power safety headroom. Returns PASS/FAIL and verification token.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "part_id": {
                    "type": "STRING",
                    "description": "Part ID to validate"
                },
                "requested_voltage": {
                    "type": "NUMBER",
                    "description": "Voltage requested by customer in Volts"
                },
                "requested_connector": {
                    "type": "STRING",
                    "description": "Connector type requested by customer"
                },
                "requested_power_w": {
                    "type": "NUMBER",
                    "description": "Power in Watts requested or drawn by load"
                }
            },
            "required": ["part_id", "requested_voltage", "requested_connector"]
        }
    },
    {
        "name": "ask_clarification",
        "description": "Prompts customer with a specific clarifying question when critical voltage, connector, or power parameters are missing or ambiguous.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "question": {
                    "type": "STRING",
                    "description": "Clear, concise technical clarification question to ask the user"
                },
                "missing_fields": {
                    "type": "ARRAY",
                    "items": {"type": "STRING"},
                    "description": "List of missing fields: voltage, connector, power, etc."
                }
            },
            "required": ["question", "missing_fields"]
        }
    },
    {
        "name": "dispatch_part",
        "description": "Authorizes automated warehouse dispatch and generates packing slip. REQUIRES valid verification token and stock > 0.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "part_id": {
                    "type": "STRING",
                    "description": "Verified compatible part ID"
                },
                "order_notes": {
                    "type": "STRING",
                    "description": "Packing notes or customer job order reference"
                },
                "verification_token": {
                    "type": "STRING",
                    "description": "The cryptographic verification token output by validate_compatibility"
                }
            },
            "required": ["part_id", "order_notes", "verification_token"]
        }
    },
    {
        "name": "escalate_to_human",
        "description": "Escalates an incompatible, out-of-stock, high-voltage hazardous, or conflicting request to a workshop specialist.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "reason": {
                    "type": "STRING",
                    "description": "Detailed justification for human intervention"
                },
                "missing_or_failed_items": {
                    "type": "ARRAY",
                    "items": {"type": "STRING"},
                    "description": "List of failed compatibility checks or missing attributes"
                },
                "risk_level": {
                    "type": "STRING",
                    "enum": ["low", "medium", "high", "critical"],
                    "description": "Safety and operational risk tier"
                }
            },
            "required": ["reason", "missing_or_failed_items"]
        }
    }
]
