"""
Budget and Tool Usage Ledger.
Enforces cost limits per session and maintains a tamper-evident audit record.
"""

import time
import hashlib
import json
from typing import Dict, Any, List
from .models import ToolCallRecord


class BudgetExceededError(Exception):
    """Raised when an agent tool call would exceed remaining session budget."""
    pass


class BudgetManager:
    """Tracks financial and computation budget for tool calling."""

    # Default tool invocation pricing (in USD)
    DEFAULT_TOOL_COSTS: Dict[str, float] = {
        "inspect_catalogue": 0.005,
        "verify_stock": 0.002,
        "validate_compatibility": 0.003,
        "ask_clarification": 0.002,
        "dispatch_part": 0.005,
        "escalate_to_human": 0.002
    }

    def __init__(self, initial_budget_usd: float = 0.050):
        self.initial_budget_usd = initial_budget_usd
        self.remaining_budget_usd = initial_budget_usd
        self.total_spent_usd = 0.0
        self.records: List[ToolCallRecord] = []
        self._step_counter = 0

    def check_can_afford(self, tool_name: str) -> bool:
        """Returns True if the tool invocation does not breach the budget."""
        cost = self.DEFAULT_TOOL_COSTS.get(tool_name, 0.003)
        return self.remaining_budget_usd >= cost

    def record_call(self, tool_name: str, arguments: Dict[str, Any], result: Any, execution_ms: int) -> ToolCallRecord:
        """
        Deducts tool cost, increments counter, and records invocation evidence.
        """
        cost = self.DEFAULT_TOOL_COSTS.get(tool_name, 0.003)
        if self.remaining_budget_usd < cost:
            raise BudgetExceededError(
                f"Tool '{tool_name}' costs ${cost:.4f}, but only ${self.remaining_budget_usd:.4f} remains in budget!"
            )

        self._step_counter += 1
        self.remaining_budget_usd = round(self.remaining_budget_usd - cost, 6)
        self.total_spent_usd = round(self.total_spent_usd + cost, 6)

        record = ToolCallRecord(
            step_id=self._step_counter,
            tool_name=tool_name,
            arguments=arguments,
            result=result,
            cost_usd=cost,
            timestamp=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            execution_ms=execution_ms
        )
        self.records.append(record)
        return record

    def compute_evidence_hash(self) -> str:
        """Computes a SHA-256 fingerprint over all tool executions for audit validation."""
        payload = [
            {
                "step": r.step_id,
                "tool": r.tool_name,
                "args": r.arguments,
                "cost": r.cost_usd,
                "timestamp": r.timestamp
            }
            for r in self.records
        ]
        serialized = json.dumps(payload, sort_keys=True)
        return hashlib.sha256(serialized.encode("utf-8")).hexdigest()

    def get_summary(self) -> Dict[str, Any]:
        """Returns a snapshot of budget usage."""
        tool_counts: Dict[str, int] = {}
        for r in self.records:
            tool_counts[r.tool_name] = tool_counts.get(r.tool_name, 0) + 1

        return {
            "initial_budget_usd": self.initial_budget_usd,
            "spent_usd": self.total_spent_usd,
            "remaining_usd": self.remaining_budget_usd,
            "total_calls": len(self.records),
            "tool_counts": tool_counts,
            "evidence_hash": self.compute_evidence_hash()
        }
