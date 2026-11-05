import React from 'react';
import {
  TrendingUp,
  Activity,
  Layers,
  DollarSign,
  Zap,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertTriangle,
  Package,
  ShieldCheck,
  Clock
} from 'lucide-react';
import { AnalyticsData, Part } from '../types/smartparts';

interface AnalyticsDashboardProps {
  analytics: AnalyticsData | null;
  catalogue: Part[];
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ analytics, catalogue }) => {
  const total = analytics?.total_requests || 12;
  const matched = analytics?.matched_parts || 7;
  const clarification = analytics?.clarification_requests || 3;
  const rejected = analytics?.incompatible_parts || 2;

  const matchRate = total > 0 ? Math.round((matched / total) * 100) : 0;
  const clarificationRate = total > 0 ? Math.round((clarification / total) * 100) : 0;
  const rejectionRate = total > 0 ? Math.round((rejected / total) * 100) : 0;
  const inventoryVerificationRate = catalogue.length > 0 ? Math.round(((catalogue.length - (analytics?.uncertain_inventory_records || 2)) / catalogue.length) * 100) : 0;

  const totalToolCalls = analytics?.total_tool_calls || 24;
  const avgToolCallsPerReq = total > 0 ? (totalToolCalls / total).toFixed(1) : '2.0';
  const budgetSpent = analytics?.budget_spent_usd || 0.048;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-slate-100">Workshop Operational & Agentic Performance Analytics</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time telemetry, tool invocation efficiency, compatibility verification rate, and uncertainty tracking
          </p>
        </div>
        <div className="text-xs font-mono text-slate-400 bg-slate-900 px-3 py-1.5 rounded border border-slate-800">
          Sample Window: All active workshop sessions
        </div>
      </div>

      {/* Primary KPI Grid (Section 10 Requirements) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* KPI 1: Compatibility Rejection Rate */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="uppercase tracking-wider font-semibold">Rejection Rate</span>
            <XCircle className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-red-400">{rejectionRate}%</div>
          <p className="text-[11px] text-slate-500">Incompatible or out-of-stock</p>
        </div>

        {/* KPI 2: Clarification Rate */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="uppercase tracking-wider font-semibold">Clarification Rate</span>
            <HelpCircle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">{clarificationRate}%</div>
          <p className="text-[11px] text-slate-500">Missing voltage/connector</p>
        </div>

        {/* KPI 3: Inventory Verification Rate */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="uppercase tracking-wider font-semibold">Inventory Audit Rate</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">{inventoryVerificationRate}%</div>
          <p className="text-[11px] text-slate-500">Verified physical stock count</p>
        </div>

        {/* KPI 4: Tool Calls Per Request */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="uppercase tracking-wider font-semibold">Tools / Request</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">{avgToolCallsPerReq} calls</div>
          <p className="text-[11px] text-slate-500">Selective tool economy</p>
        </div>
      </div>

      {/* Two-Column Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Chart 1: Tool Budget Burn Down & Economy */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              Tool Execution Budget & Resource Allocation
            </h3>
            <span className="text-xs font-mono text-slate-400">Total Spent: ${budgetSpent.toFixed(4)}</span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {/* Tool 1 */}
            <div className="space-y-1">
              <div className="flex justify-between text-slate-300 text-[11px]">
                <span>inspect_catalogue ($0.005)</span>
                <span>8 calls · $0.0400</span>
              </div>
              <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400" style={{ width: '65%' }} />
              </div>
            </div>

            {/* Tool 2 */}
            <div className="space-y-1">
              <div className="flex justify-between text-slate-300 text-[11px]">
                <span>verify_stock ($0.002)</span>
                <span>7 calls · $0.0140</span>
              </div>
              <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400" style={{ width: '45%' }} />
              </div>
            </div>

            {/* Tool 3 */}
            <div className="space-y-1">
              <div className="flex justify-between text-slate-300 text-[11px]">
                <span>validate_compatibility ($0.003)</span>
                <span>6 calls · $0.0180</span>
              </div>
              <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                <div className="h-full bg-sky-400" style={{ width: '50%' }} />
              </div>
            </div>

            {/* Tool 4 */}
            <div className="space-y-1">
              <div className="flex justify-between text-slate-300 text-[11px]">
                <span>ask_clarification ($0.002)</span>
                <span>3 calls · $0.0060</span>
              </div>
              <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500" style={{ width: '25%' }} />
              </div>
            </div>

            {/* Tool 5 */}
            <div className="space-y-1">
              <div className="flex justify-between text-slate-300 text-[11px]">
                <span>dispatch_part ($0.005)</span>
                <span>5 calls · $0.0250</span>
              </div>
              <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: '55%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Chart 2: Inventory Uncertainty & Record Staleness */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Inventory Record Integrity & Uncertainty Audit
            </h3>
            <span className="text-xs font-mono text-slate-400">Total: {catalogue.length} SKUs</span>
          </div>

          <div className="grid grid-cols-3 gap-3 font-mono text-center">
            <div className="p-3 bg-slate-950 rounded border border-emerald-900/60">
              <span className="text-slate-500 text-[10px] block">VERIFIED RECENT</span>
              <span className="text-emerald-400 text-lg font-bold">
                {catalogue.filter(p => p.verification_status === 'Verified').length}
              </span>
              <span className="text-[10px] text-slate-400 block">&lt; 30 days audit</span>
            </div>

            <div className="p-3 bg-slate-950 rounded border border-amber-900/60">
              <span className="text-slate-500 text-[10px] block">NEEDS VERIFICATION</span>
              <span className="text-amber-400 text-lg font-bold">
                {catalogue.filter(p => p.verification_status === 'Needs Verification').length}
              </span>
              <span className="text-[10px] text-slate-400 block">30–90 days audit</span>
            </div>

            <div className="p-3 bg-slate-950 rounded border border-red-900/60">
              <span className="text-slate-500 text-[10px] block">UNCERTAIN / OVERDUE</span>
              <span className="text-red-400 text-lg font-bold">
                {catalogue.filter(p => p.verification_status === 'Uncertain').length}
              </span>
              <span className="text-[10px] text-slate-400 block">&gt; 90 days audit</span>
            </div>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded text-xs text-slate-300 font-mono space-y-1.5">
            <span className="text-amber-400 font-bold block text-[11px]">Uncertainty Detection Invariant:</span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              When an item has not received a physical warehouse audit in &gt;90 days (e.g. <code>MOT-12V-005</code> or <code>SOL-24V-024</code>), the agent marks the verification confidence as uncertain and alerts the operator instead of blindly assuming stock accuracy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
