"""
Smart Workshop Parts Assistant - Modern Streamlit Dashboard.
Implements all 8 required dashboard sections:
1. Customer request input
2. Extracted technical requirements
3. Available parts catalogue
4. Agent decision process
5. Tool usage and remaining budget
6. Compatibility verification results
7. Dispatch or human referral status
8. Evidence and activity logs
"""

import streamlit as st
import json
import os
import sys

# Ensure local imports work
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from agent.controller import WorkshopAgentController
from agent.tools import WorkshopTools
from agent.validator import DeterministicValidator

st.set_page_config(
    page_title="Smart Workshop Parts Assistant",
    page_icon="⚙️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom industrial dark theme styling
st.markdown("""
<style>
    .reportview-container {
        background: #0f172a;
        color: #f8fafc;
    }
    .metric-card {
        background-color: #1e293b;
        border: 1px solid #334155;
        border-radius: 8px;
        padding: 14px 18px;
        margin-bottom: 12px;
    }
    .metric-value {
        font-family: monospace;
        font-size: 1.5rem;
        font-weight: 700;
        color: #38bdf8;
    }
    .metric-label {
        font-size: 0.85rem;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }
    .badge-pass {
        color: #22c55e;
        background-color: rgba(34, 197, 94, 0.1);
        border: 1px solid rgba(34, 197, 94, 0.3);
        padding: 4px 8px;
        border-radius: 4px;
        font-weight: 600;
        font-family: monospace;
    }
    .badge-fail {
        color: #ef4444;
        background-color: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.3);
        padding: 4px 8px;
        border-radius: 4px;
        font-weight: 600;
        font-family: monospace;
    }
    .dispatch-slip {
        background: #111827;
        border: 2px dashed #22c55e;
        border-radius: 8px;
        padding: 20px;
        font-family: monospace;
        color: #e2e8f0;
    }
    .referral-slip {
        background: #1c1917;
        border: 2px dashed #f59e0b;
        border-radius: 8px;
        padding: 20px;
        font-family: monospace;
        color: #fed7aa;
    }
</style>
""", unsafe_allow_html=True)

# Initialize session state tools & controller
if "tools" not in st.session_state:
    st.session_state.tools = WorkshopTools()
if "controller" not in st.session_state:
    st.session_state.controller = WorkshopAgentController(tools=st.session_state.tools)
if "last_response" not in st.session_state:
    st.session_state.last_response = None
if "current_request_text" not in st.session_state:
    st.session_state.current_request_text = "I need a 24V stepper motor with a JST-XH connector drawing around 60W for our CNC axis."

# --- Sidebar: Presets and Catalogue Inventory Management ---
with st.sidebar:
    st.title("⚙️ Workshop Control")
    st.caption("Agentic Parts Verification Engine v1.0")

    st.subheader("Test Scenarios")
    scenarios = {
        "1. Perfect Match (24V Stepper)": "I need a 24V stepper motor with a JST-XH connector drawing around 60W for our CNC axis.",
        "2. Missing Voltage (Clarification)": "We need a replacement pneumatic solenoid valve with a Molex Micro-Fit connector for station B.",
        "3. Missing Connector (Clarification)": "Please dispatch a 24V industrial power supply rated for at least 120W.",
        "4. Out of Stock (24V Solenoid)": "Need a 24V hydraulic solenoid valve with Molex Micro-Fit 2-Pin drawing 24W.",
        "5. Power Headroom Mismatch": "Need a 24V DIN-rail power supply to power a 180W continuous load with screw terminals.",
        "6. High Voltage Safety Hazard": "Urgent: Need a 72V 2500W motor driver with XT90 connectors for heavy tractor testing."
    }

    selected_scenario = st.selectbox("Load Benchmark Request:", list(scenarios.keys()))
    if st.button("Apply Preset"):
        st.session_state.current_request_text = scenarios[selected_scenario]
        st.session_state.last_response = None

    st.divider()

    st.subheader("Live Inventory Control")
    st.caption("Adjust stock to test out-of-stock guardrails")
    all_parts = st.session_state.tools.get_all_parts()
    selected_part_id = st.selectbox("Select Part SKU:", [p.id for p in all_parts])
    target_part = st.session_state.tools.parts_db[selected_part_id]
    new_stock = st.number_input("Stock Quantity:", min_value=0, max_value=100, value=target_part.stock_quantity)
    if st.button("Update Inventory"):
        st.session_state.tools.update_stock(selected_part_id, new_stock)
        st.success(f"Stock for {selected_part_id} updated to {new_stock}!")

# Main Header
st.title("Smart Workshop Parts Assistant")
st.markdown("Automated natural language parts triage, deterministic electrical validation, and stock verification.")

# Tabbed Layout for Dashboard
tab_dashboard, tab_catalogue, tab_audit = st.tabs(["🚀 Agent Operations Dashboard", "📦 Parts Catalogue", "📜 Full Audit Trail"])

with tab_dashboard:
    # ----------------------------------------------------
    # SECTION 1: Customer Request Input
    # ----------------------------------------------------
    st.markdown("### 1. Customer Request Input")
    col_input, col_action = st.columns([4, 1])

    with col_input:
        user_request = st.text_area(
            "Natural Language Workshop Request:",
            value=st.session_state.current_request_text,
            height=85,
            help="Describe component requirements including voltage, connector, and power"
        )

    with col_action:
        st.write("")
        st.write("")
        run_agent = st.button("⚡ Process Request", type="primary", use_container_width=True)
        clear_btn = st.button("Clear", use_container_width=True)
        if clear_btn:
            st.session_state.last_response = None
            st.rerun()

    # Clarification Feedback Dialog if previous run asked clarification
    if st.session_state.last_response and st.session_state.last_response.status == "clarification_needed":
        st.warning(f"⚠️ **Agent Asked Clarification:** {st.session_state.last_response.decision.reason}")
        missing = st.session_state.last_response.requirements.missing_fields

        with st.expander("Provide Clarification Specifications", expanded=True):
            col_c1, col_c2, col_c3 = st.columns(3)
            c_voltage = col_c1.number_input("Clarified Voltage (V):", value=24.0) if "voltage" in missing else None
            c_connector = col_c2.selectbox("Clarified Connector:", ["JST-XH 4-Pin", "Molex Micro-Fit 2-Pin", "XT60", "Screw Terminal 2-Pin", "USB-C PD", "Barrel 5.5x2.1mm"]) if "connector_type" in missing else None
            c_power = col_c3.number_input("Clarified Power (W):", value=24.0) if "power_or_current" in missing else None

            if st.button("Submit Clarification"):
                clarif_dict = {}
                if c_voltage is not None:
                    clarif_dict["voltage_v"] = c_voltage
                if c_connector is not None:
                    clarif_dict["connector_type"] = c_connector
                if c_power is not None:
                    clarif_dict["power_w"] = c_power

                with st.spinner("Re-evaluating with customer clarification..."):
                    st.session_state.last_response = st.session_state.controller.process_request(
                        customer_request=user_request,
                        clarification_context=clarif_dict
                    )
                st.rerun()

    # Execute agent on click
    if run_agent:
        with st.spinner("Agent running: inspecting catalogue, verifying stock & validating invariants..."):
            st.session_state.last_response = st.session_state.controller.process_request(user_request)

    resp = st.session_state.last_response

    if resp:
        st.divider()

        # ----------------------------------------------------
        # SECTION 2 & 5: Extracted Requirements & Budget
        # ----------------------------------------------------
        col_req, col_budget = st.columns([3, 2])

        with col_req:
            st.markdown("### 2. Extracted Technical Requirements")
            req = resp.requirements
            c1, c2, c3, c4 = st.columns(4)
            c1.metric("Category", req.category or "Unknown")
            c2.metric("Voltage", f"{req.voltage_v} V" if req.voltage_v else "MISSING")
            c3.metric("Connector", req.connector_type or "MISSING")
            c4.metric("Power", f"{req.power_w} W" if req.power_w else "MISSING")

            if req.missing_fields:
                st.error(f"Missing mandatory fields: {', '.join(req.missing_fields)}")
            else:
                st.success("All primary electrical and mechanical requirements extracted.")

        with col_budget:
            st.markdown("### 5. Tool Usage & Remaining Budget")
            b_spent = resp.budget_used_usd
            b_rem = resp.budget_remaining_usd
            b_total = b_spent + b_rem

            cb1, cb2, cb3 = st.columns(3)
            cb1.metric("Initial Budget", f"${b_total:.3f}")
            cb2.metric("Spent", f"${b_spent:.3f}")
            cb3.metric("Remaining", f"${b_rem:.3f}", delta=f"-${b_spent:.3f}")

            progress_val = min(1.0, max(0.0, b_spent / b_total))
            st.progress(progress_val, text=f"Budget Consumed: {progress_val*100:.1f}%")

            with st.expander(f"Tool Ledger ({len(resp.tool_calls)} calls recorded)"):
                for tc in resp.tool_calls:
                    st.write(f"• **Step {tc.step_id}**: `{tc.tool_name}` — Cost: `${tc.cost_usd:.4f}` ({tc.execution_ms}ms)")

        st.divider()

        # ----------------------------------------------------
        # SECTION 4 & 6: Decision Process & Compatibility Results
        # ----------------------------------------------------
        col_proc, col_compat = st.columns([1, 1])

        with col_proc:
            st.markdown("### 4. Agent Decision Process")
            for idx, step in enumerate(resp.thought_steps, 1):
                st.markdown(f"**Step {idx}:** {step}")

        with col_compat:
            st.markdown("### 6. Compatibility Verification Results")
            if resp.validation_result:
                val = resp.validation_result
                if val.compatible:
                    st.success("✅ **Deterministic Invariants Passed 100%**")
                else:
                    st.error("❌ **Deterministic Invariant Violations Detected**")

                for chk in val.checks:
                    icon = "✅" if chk.passed else "❌"
                    st.markdown(f"**{icon} {chk.check_name}**")
                    st.caption(f"Expected: {chk.expected} | Actual: {chk.actual}")
                    st.write(chk.message)

                if val.verification_token:
                    st.info(f"Verification Signature: `{val.verification_token}`")
            else:
                st.info("No single candidate proceeded to final deterministic validation check.")

        st.divider()

        # ----------------------------------------------------
        # SECTION 7: Dispatch or Human Referral Status
        # ----------------------------------------------------
        st.markdown("### 7. Dispatch or Human Referral Status")

        if resp.status == "dispatched":
            slip = resp.decision.warehouse_slip or {}
            st.markdown(f"""
            <div class="dispatch-slip">
                <h3 style="color: #22c55e; margin-top: 0;">📦 DISPATCH AUTHORIZED</h3>
                <p><b>Order ID:</b> {slip.get('dispatch_id', 'DSP-AUTO')}</p>
                <p><b>Dispatched Component:</b> {slip.get('part_name')} (<b>SKU:</b> {slip.get('part_id')})</p>
                <p><b>Warehouse Storage Location:</b> <span style="background: #334155; padding: 2px 6px; border-radius: 4px;">{slip.get('bin_location')}</span></p>
                <p><b>Electrical Match:</b> {slip.get('voltage')} | <b>Connector:</b> {slip.get('connector')} | <b>Rated Power:</b> {slip.get('power')}</p>
                <p><b>Verification Token:</b> <code>{slip.get('verification_token')}</code></p>
                <p><b>Compliance:</b> {slip.get('safety_cert')}</p>
                <p><b>Notes:</b> {slip.get('order_notes')}</p>
            </div>
            """, unsafe_allow_html=True)

        elif resp.status == "referred_to_human":
            st.markdown(f"""
            <div class="referral-slip">
                <h3 style="color: #f59e0b; margin-top: 0;">👤 ESCALATED TO HUMAN TECHNICIAN</h3>
                <p><b>Escalation Reason:</b> {resp.decision.reason}</p>
                <p><b>Risk Tier:</b> <span style="text-transform: uppercase; font-weight: bold;">{resp.decision.risk_level}</span></p>
                <p><b>Failed Checks / Missing Invariants:</b></p>
                <ul>
                    {"".join(f"<li>{item}</li>" for item in resp.decision.missing_or_failed_items)}
                </ul>
                <p><i>Rule 7 strictly enforced: An unverified or incompatible part will never be dispatched automatically.</i></p>
            </div>
            """, unsafe_allow_html=True)
        else:
            st.info(f"Status: **{resp.status.upper()}** - Pending user clarification input.")

        st.divider()

        # ----------------------------------------------------
        # SECTION 8: Evidence and Activity Logs
        # ----------------------------------------------------
        st.markdown("### 8. Evidence & Activity Logs")
        col_ev1, col_ev2 = st.columns([1, 1])
        with col_ev1:
            st.markdown(f"**Cryptographic Evidence Hash:** `{resp.evidence_hash}`")
            st.caption("Verifiable SHA-256 ledger checksum over all tool calls, arguments, and costs.")
        with col_ev2:
            st.download_button(
                "📥 Download Audit Trail (JSON)",
                data=json.dumps(resp.model_dump(), indent=2),
                file_name=f"audit_trail_{resp.request_id}.json",
                mime="application/json"
            )

        with st.expander("View Raw Audit JSON Payload"):
            st.json(resp.model_dump())

# ----------------------------------------------------
# SECTION 3: Available Parts Catalogue Tab
# ----------------------------------------------------
with tab_catalogue:
    st.markdown("### 3. Available Parts Catalogue")
    parts = st.session_state.tools.get_all_parts()

    col_f1, col_f2 = st.columns([2, 2])
    cat_filter = col_f1.multiselect("Filter Category:", list(set(p.category for p in parts)))
    in_stock_only = col_f2.checkbox("Show In-Stock Only")

    display_parts = parts
    if cat_filter:
        display_parts = [p for p in display_parts if p.category in cat_filter]
    if in_stock_only:
        display_parts = [p for p in display_parts if p.stock_quantity > 0]

    st.write(f"Displaying **{len(display_parts)}** of **{len(parts)}** catalogue parts:")

    table_data = []
    for p in display_parts:
        table_data.append({
            "SKU": p.id,
            "Name": p.name,
            "Category": p.category,
            "Nominal V": f"{p.voltage_nominal_v}V",
            "Connector": p.connector_type,
            "Power": f"{p.power_rating_w}W",
            "Stock": f"{p.stock_quantity} units",
            "Bin Location": p.bin_location,
            "Price": f"${p.price_usd:.2f}",
            "Certification": p.safety_cert
        })
    st.dataframe(table_data, use_container_width=True)

with tab_audit:
    st.markdown("### Tamper-Evident System Audit Trail")
    if resp:
        st.write(f"Session Request ID: `{resp.request_id}`")
        st.write(f"Total Tool Invocations: `{len(resp.tool_calls)}`")
        st.write(f"Cryptographic Hash: `{resp.evidence_hash}`")
        st.table([{
            "Step": tc.step_id,
            "Tool": tc.tool_name,
            "Arguments": str(tc.arguments),
            "Cost": f"${tc.cost_usd:.4f}",
            "Latency": f"{tc.execution_ms}ms",
            "Timestamp": tc.timestamp
        } for tc in resp.tool_calls])
    else:
        st.info("Execute a parts request to generate live audit logs.")
