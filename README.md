# SmartParts – Agentic AI Workshop Parts Desk ⚙️

An enterprise-grade Agentic AI application that manages workshop spare parts requests using natural language understanding, selective tool calling, deterministic compatibility validation (voltage, connector type, power headroom), and stock verification with uncertainty handling.

---

## 🚀 Key Highlights & Hackathon Features

1. **SmartParts AI Chatbot (Floating Assistant)**:
   - Floating widget with conversation history, suggested technical prompts, typing indicator, and structured part cards.
   - Accurately parses voltages, connectors, and power ratings; detects missing specifications; asks targeted clarification questions; and highlights uncertain or outdated inventory records.

2. **10-Stage Agent Execution Visualizer**:
   - Live visualization of the autonomous Python controller workflow:
     1. Request Received
     2. Natural Language Understanding
     3. Requirement Extraction
     4. Missing Information Detection
     5. Clarification (Selective)
     6. Compatibility Analysis
     7. Tool Selection
     8. Inventory Verification
     9. Uncertainty Assessment
     10. Final Recommendation
   - Displays real elapsed milliseconds, selective tool calls, returned outputs, and warnings.

3. **Deterministic Compatibility Validation Engine**:
   - Non-LLM mathematical and physical validation enforcing strict workshop invariants:
     - **Voltage Match**: Tolerance $\pm 10\%$ of nominal or falling within $[V_{min}, V_{max}]$.
     - **Connector Family**: Canonical pinout mapping (`JST-XH`, `XT60`, `XT90`, `Screw Terminal`, `Molex Micro-Fit`, `USB-C PD`, `Barrel 5.5x2.1mm`, `M12`, `5-Pin DIN`).
     - **Power Headroom**: $\ge 15\%$ safety margin for drivers/power supplies.
     - **Stock Check**: Rejects automated dispatch if physical stock $\le 0$.
     - **Hazard Boundary**: Flags high-voltage ($>60\text{V DC}$) or high-power ($>1500\text{W}$) requests for human escalation.

4. **Live Batch Processing Engine**:
   - Real-time simulation of 6 benchmark workshop requests against the 12-part inventory catalogue.
   - Tracks selective tool economy, budget utilization, and displays pass/fail outcomes.

5. **Operational Analytics Dashboard**:
   - Real-time KPIs calculated from live requests: Total Requests, Matched Parts, Clarification Rate, Rejection Rate, Inventory Verification Rate, and Tool Budget Burn Down.

6. **Judge Presentation Tour**:
   - Integrated 11-step interactive tour guiding hackathon judges through the complete demonstration journey.

---

## 🏛️ System Architecture

```
Workshop Operator / User Request (Natural Language)
              │
              ├──► Floating SmartParts AI Chatbot
              └──► REST API (/api/requests, /api/chat)
                          │
                          ▼
            [Agentic AI Controller (Python ReAct)]
            ├── 1. NLU Parameter Extractor (Voltage, Connector, Power)
            ├── 2. Completeness Check ────► Tool: ask_clarification
            ├── 3. Candidate Search   ────► Tool: inspect_catalogue
            ├── 4. Stock Check        ────► Tool: verify_stock
            ├── 5. Invariant Gate     ────► Tool: validate_compatibility (Deterministic)
            │                                  ├─ Voltage: ±10% / safe range
            │                                  ├─ Connector: canonical family
            │                                  ├─ Power Headroom: ≥ 15% margin
            │                                  └─ Stock & Overvoltage cutoff
            ▼
     [Decision Engine]
            ├─ 100% Verified & In-Stock ──► Tool: dispatch_part -> Official Warehouse Slip
            └─ Incompatible / Out-of-Stock ─► Tool: escalate_to_human -> Specialist Ticket
```

---

## 📡 Backend API Contract

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service health, model status, and live/demo mode |
| `POST` | `/api/chat` | Conversational message with technical spec extraction & cards |
| `POST` | `/api/requests` | Submit parts request; executes 10-stage workflow |
| `GET` | `/api/requests` | List all historical requests with status filtering |
| `GET` | `/api/requests/{id}` | Full request details and 10-stage trace |
| `GET` | `/api/inventory` | Inventory records with audit status and low-stock flags |
| `GET` | `/api/inventory/{id}` | Detailed component specifications and pinouts |
| `POST` | `/api/batch/process` | Run multi-scenario batch benchmark |
| `GET` | `/api/agent/activity` | Live stream of recent agent execution events |
| `GET` | `/api/analytics` | Dynamically calculated workshop operational statistics |

---

## 🛠️ Tool Protocol & Budget Pricing

| Tool Name | Incurred Cost | Purpose |
| :--- | :--- | :--- |
| `inspect_catalogue` | **$0.005** | Query matching parts by voltage, connector, or category |
| `verify_stock` | **$0.002** | Check bin location and quantity available |
| `validate_compatibility` | **$0.003** | Deterministic physical and electrical validation |
| `ask_clarification` | **$0.002** | Prompt technician when critical parameters are missing |
| `dispatch_part` | **$0.005** | Authorize dispatch and generate packing slip |
| `escalate_to_human` | **$0.002** | Refer incompatible or hazardous requests to human |

---

## 💻 Running the Application

### 1. Web Application (Full-Stack Express + React)
```bash
# Start development server on port 3000
npm run dev
```

### 2. Standalone Python FastAPI Backend
```bash
cd python_backend
pip install -r requirements.txt
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```
Interactive OpenAPI documentation will be accessible at: `http://localhost:8000/docs`

### 3. Streamlit Dashboard
```bash
streamlit run python_backend/streamlit_app.py
```

### 4. Running Automated Tests
```bash
pytest python_backend/tests/ -v
```

---

## ⚙️ Environment Secrets & Configuration

- `GEMINI_API_KEY`: Injected automatically via AI Studio Secrets for Gemini 3.8 Flash NLU.
- `APP_URL`: Self-referential URL provided by Cloud Run.
- Standalone DEMO mode can be toggled at any time from the in-app Settings page.
