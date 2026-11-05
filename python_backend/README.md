# Smart Workshop Parts Assistant ⚙️

An Agentic AI application designed for workshop automation. The assistant ingests natural language customer requests, extracts physical and electrical specifications (voltage, connector type, power headroom), executes multi-step tool calls, deterministically verifies compatibility, enforces tool execution budgets, and authorizes warehouse dispatch or escalates to human specialists.

---

## 🏛️ Architecture Overview

```
Customer Request (Natural Language)
               │
               ▼
   [Workshop Agent Controller]
   ├── 1. NLU Parameter Extraction (Voltage, Connector, Power)
   ├── 2. Completeness Check ────► [Tool: ask_clarification] (if missing)
   ├── 3. Candidate Query    ────► [Tool: inspect_catalogue]
   ├── 4. Stock Inspection   ────► [Tool: verify_stock]
   ├── 5. Safety Invariants  ────► [Tool: validate_compatibility] (Deterministic Non-LLM)
   │                                   ├─ Voltage: ±10% / min-max range
   │                                   ├─ Connector: Canonical pinout match
   │                                   ├─ Power Headroom: ≥ 15% safety margin
   │                                   └─ Stock: ≥ 1 unit & High-voltage hazard check
   ▼
[Decision Engine]
   ├─ If 100% Verified & In-Stock ──► [Tool: dispatch_part] -> Generates Warehouse Slip & Token
   └─ If Incompatible / 0 Stock  ──► [Tool: escalate_to_human] -> Generates Technician Ticket
```

---

## 🛠️ Tool Protocol

1. `inspect_catalogue(category, voltage_filter, connector_filter, max_power)`
   Queries catalogue candidates. Cost: **$0.005**
2. `verify_stock(part_id)`
   Checks physical warehouse bin and available quantity. Cost: **$0.002**
3. `validate_compatibility(part_id, requested_voltage, requested_connector, requested_power_w)`
   Runs deterministic physical and electrical checks. Cost: **$0.003**
4. `ask_clarification(question, missing_fields)`
   Queries the user when critical parameters are missing. Cost: **$0.002**
5. `dispatch_part(part_id, order_notes, verification_token)`
   Decrements stock and produces an official packing slip. Cost: **$0.005**
6. `escalate_to_human(reason, missing_or_failed_items, risk_level)`
   Opens a technician ticket with risk assessment. Cost: **$0.002**

---

## 🚀 Running Locally

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Run the FastAPI Backend
```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```
Interactive API docs available at: `http://localhost:8000/docs`

### 3. Run the Streamlit Dashboard
```bash
streamlit run streamlit_app.py
```
Open your browser at `http://localhost:8501` to view all 8 dashboard sections.

### 4. Run Automated Test Suite
```bash
pytest tests/ -v
```
