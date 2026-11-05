import React from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Zap,
  TrendingUp,
  Activity,
  Layers,
  Package,
  Wrench,
  DollarSign,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { AnalyticsData, WorkshopRequest, Part } from '../types/smartparts';

interface OverviewDashboardProps {
  analytics: AnalyticsData | null;
  recentRequests: WorkshopRequest[];
  catalogue: Part[];
  onSelectRequest: (req: WorkshopRequest) => void;
  onNavigateTab: (tabName: 'dashboard' | 'catalogue' | 'requests' | 'batch' | 'analytics' | 'codebase' | 'settings') => void;
  isDemoMode: boolean;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  analytics,
  recentRequests,
  catalogue,
  onSelectRequest,
  onNavigateTab,
  isDemoMode,
}) => {
  // Compute metrics from actual available data or fallback safely
  const totalRequests = analytics?.total_requests ?? recentRequests.length;
  const matchedParts = analytics?.matched_parts ?? recentRequests.filter(r => r.status === 'matched').length;
  const pendingRequests = analytics?.pending_requests ?? recentRequests.filter(r => r.status === 'pending' || r.status === 'processing').length;
  const clarificationRequests = analytics?.clarification_requests ?? recentRequests.filter(r => r.status === 'needs_clarification').length;
  const incompatibleParts = analytics?.incompatible_parts ?? recentRequests.filter(r => r.status === 'rejected').length;
  const lowStockAlerts = analytics?.low_stock_alerts ?? catalogue.filter(p => p.stock_quantity > 0 && p.stock_quantity < 5).length;
  const agentSuccessRate = analytics?.agent_success_rate ?? (totalRequests > 0 ? Math.round((matchedParts / totalRequests) * 100) : 0);
  const avgProcessingTime = analytics?.average_processing_time_ms ?? 142;

  // Inventory Alerts
  const lowStockItems = catalogue.filter(p => p.stock_quantity > 0 && p.stock_quantity < 5);
  const outOfStockItems = catalogue.filter(p => p.stock_quantity === 0);
  const uncertainItems = catalogue.filter(p => p.verification_status === 'Uncertain');

  return (
    <div className="space-y-6">
      {/* Top Banner with Demo / Live indicator */}
      {isDemoMode && (
        <div className="px-4 py-2.5 bg-amber-950/40 border border-amber-800/60 rounded-lg flex items-center justify-between text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span><b>DEMO MODE ACTIVE:</b> Operating with local autonomous workshop simulator and sample event stream.</span>
          </div>
          <button
            onClick={() => onNavigateTab('settings')}
            className="text-amber-400 hover:underline font-mono"
          >
            Configure Live Backend
          </button>
        </div>
      )}

      {/* 8 Metric Cards (Section 4 Requirements) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Card 1: Total Requests */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="uppercase tracking-wider font-semibold">Total Requests</span>
            <Layers className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">{totalRequests}</div>
          <p className="text-[11px] text-slate-500">Autonomous parts intake</p>
        </div>

        {/* Card 2: Successfully Matched */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="uppercase tracking-wider font-semibold">Matched & Dispatched</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">{matchedParts}</div>
          <p className="text-[11px] text-slate-500">Deterministic verified</p>
        </div>

        {/* Card 3: Pending Requests */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="uppercase tracking-wider font-semibold">Pending Requests</span>
            <Clock className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-sky-400">{pendingRequests}</div>
          <p className="text-[11px] text-slate-500">In evaluation pipeline</p>
        </div>

        {/* Card 4: Needs Clarification */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="uppercase tracking-wider font-semibold">Clarification Req.</span>
            <HelpCircle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">{clarificationRequests}</div>
          <p className="text-[11px] text-slate-500">Missing specifications</p>
        </div>

        {/* Card 5: Incompatible Parts */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="uppercase tracking-wider font-semibold">Incompatible Parts</span>
            <XCircle className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-red-400">{incompatibleParts}</div>
          <p className="text-[11px] text-slate-500">Escalated to specialist</p>
        </div>

        {/* Card 6: Low Stock Alerts */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="uppercase tracking-wider font-semibold">Low Stock Alerts</span>
            <Package className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">{lowStockAlerts}</div>
          <p className="text-[11px] text-slate-500">&lt; 5 units remaining</p>
        </div>

        {/* Card 7: Agent Success Rate */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="uppercase tracking-wider font-semibold">Agent Success Rate</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">{agentSuccessRate}%</div>
          <p className="text-[11px] text-slate-500">Precision verification</p>
        </div>

        {/* Card 8: Average Processing Time */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="uppercase tracking-wider font-semibold">Avg Processing Time</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">{avgProcessingTime}ms</div>
          <p className="text-[11px] text-slate-500">Autonomous resolution</p>
        </div>
      </div>

      {/* Two-Column Midsection: Visual Distribution & Inventory Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Request Status Distribution (SVG Chart) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-400" />
              Request Status Distribution & Resolution Pipeline
            </h3>
            <span className="text-xs font-mono text-slate-400">Total: {totalRequests}</span>
          </div>

          {/* Clean Segmented Bar Visualization */}
          <div className="space-y-3">
            <div className="w-full h-4 bg-slate-950 rounded-full overflow-hidden flex">
              {totalRequests > 0 ? (
                <>
                  <div
                    style={{ width: `${(matchedParts / totalRequests) * 100}%` }}
                    className="bg-emerald-500 transition-all duration-300"
                    title={`Matched: ${matchedParts}`}
                  />
                  <div
                    style={{ width: `${(clarificationRequests / totalRequests) * 100}%` }}
                    className="bg-amber-500 transition-all duration-300"
                    title={`Clarification: ${clarificationRequests}`}
                  />
                  <div
                    style={{ width: `${(incompatibleParts / totalRequests) * 100}%` }}
                    className="bg-red-500 transition-all duration-300"
                    title={`Rejected: ${incompatibleParts}`}
                  />
                  <div
                    style={{ width: `${(pendingRequests / totalRequests) * 100}%` }}
                    className="bg-sky-500 transition-all duration-300"
                    title={`Pending: ${pendingRequests}`}
                  />
                </>
              ) : (
                <div className="w-full bg-slate-800" />
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono pt-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                <span className="text-slate-400">Matched ({matchedParts})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
                <span className="text-slate-400">Clarification ({clarificationRequests})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-red-500" />
                <span className="text-slate-400">Rejected ({incompatibleParts})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-sky-500" />
                <span className="text-slate-400">Pending ({pendingRequests})</span>
              </div>
            </div>
          </div>

          {/* Quick Tool Calling Budget Summary */}
          <div className="pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-3 bg-slate-950 rounded border border-slate-800">
              <span className="text-slate-500 block text-[10px]">TOTAL TOOL CALLS</span>
              <span className="text-slate-200 text-sm font-bold">{analytics?.total_tool_calls || 18}</span>
              <span className="text-[10px] text-slate-500 block">Selective tool policy</span>
            </div>
            <div className="p-3 bg-slate-950 rounded border border-slate-800">
              <span className="text-slate-500 block text-[10px]">BUDGET UTILIZATION</span>
              <span className="text-amber-400 text-sm font-bold">${(analytics?.budget_spent_usd || 0.046).toFixed(3)}</span>
              <span className="text-[10px] text-slate-500 block">Cap: $0.050/session</span>
            </div>
            <div className="p-3 bg-slate-950 rounded border border-slate-800">
              <span className="text-slate-500 block text-[10px]">INVENTORY HEALTH</span>
              <span className="text-emerald-400 text-sm font-bold">
                {catalogue.length - outOfStockItems.length}/{catalogue.length} Ready
              </span>
              <span className="text-[10px] text-slate-500 block">Catalogue SKUs active</span>
            </div>
          </div>
        </div>

        {/* Inventory Critical Alerts */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Critical Inventory Alerts
            </h3>
            <button
              onClick={() => onNavigateTab('catalogue')}
              className="text-xs text-amber-400 hover:underline font-mono"
            >
              View Catalogue
            </button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {/* Out of stock alert */}
            {outOfStockItems.map(item => (
              <div key={item.id} className="p-2.5 bg-red-950/30 border border-red-900/60 rounded text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-red-300">{item.id}</span>
                  <span className="text-[10px] font-mono text-red-400 font-bold">0 IN STOCK</span>
                </div>
                <p className="text-[11px] text-slate-300">{item.name}</p>
                <span className="text-[10px] font-mono text-slate-500 block">Bin: {item.bin_location}</span>
              </div>
            ))}

            {/* Low stock alerts */}
            {lowStockItems.map(item => (
              <div key={item.id} className="p-2.5 bg-amber-950/20 border border-amber-900/50 rounded text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-300">{item.id}</span>
                  <span className="text-[10px] font-mono text-amber-400 font-bold">{item.stock_quantity} REMAINING</span>
                </div>
                <p className="text-[11px] text-slate-300">{item.name}</p>
                <span className="text-[10px] font-mono text-slate-500 block">Bin: {item.bin_location}</span>
              </div>
            ))}

            {/* Uncertain record alerts */}
            {uncertainItems.map(item => (
              <div key={item.id} className="p-2.5 bg-slate-950 border border-amber-800/40 rounded text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">{item.id}</span>
                  <span className="text-[10px] font-mono text-amber-400">AUDIT OVERDUE</span>
                </div>
                <p className="text-[11px] text-slate-400">Physical audit pending since {item.last_updated}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Two-Column Bottom Section: Recent Requests & Recent Agent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent Requests Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              Recent Workshop Requests
            </h3>
            <button
              onClick={() => onNavigateTab('requests')}
              className="text-xs text-amber-400 hover:underline font-mono flex items-center gap-1"
            >
              <span>Manage Requests</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-800 font-mono text-xs">
            {recentRequests.slice(0, 5).map((req) => (
              <div
                key={req.id}
                onClick={() => onSelectRequest(req)}
                className="py-2.5 flex items-center justify-between gap-3 hover:bg-slate-800/30 px-2 rounded transition cursor-pointer"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 font-bold">{req.id}</span>
                    <span className="text-[10px] text-slate-500">{new Date(req.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-slate-300 truncate text-[11px] font-sans mt-0.5">{req.customer_request}</p>
                </div>

                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase shrink-0 ${
                    req.status === 'matched'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : req.status === 'needs_clarification'
                      ? 'bg-amber-950 text-amber-400 border border-amber-800'
                      : req.status === 'rejected'
                      ? 'bg-red-950 text-red-400 border border-red-800'
                      : 'bg-sky-950 text-sky-400 border border-sky-800'
                  }`}
                >
                  {req.status.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Agent Activities Feed */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Live Agent Execution Activity
            </h3>
            <span className="text-xs font-mono text-slate-500">Autonomous Event Stream</span>
          </div>

          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {(analytics?.recent_activities || []).map((act, idx) => (
              <div
                key={act.id || idx}
                className="p-2.5 bg-slate-950 border border-slate-800 rounded text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-slate-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>{act.title}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">{act.timestamp ? new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}</span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">{act.details}</p>
                {act.cost_usd && (
                  <div className="text-[10px] font-mono text-amber-400">
                    Tool cost: ${act.cost_usd.toFixed(4)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
