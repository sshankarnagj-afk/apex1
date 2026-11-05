import React, { useState } from 'react';
import {
  Layers,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  HelpCircle,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Package,
  FileText,
  UserCheck,
  ChevronRight,
  X,
  Zap,
  RefreshCw
} from 'lucide-react';
import { WorkshopRequest, RequestStatus } from '../types/smartparts';
import { AgentWorkflowVisualizer } from './AgentWorkflowVisualizer';

interface RequestManagerProps {
  requests: WorkshopRequest[];
  onSubmitNewRequest: (text: string) => Promise<void>;
  selectedRequest: WorkshopRequest | null;
  onSelectRequest: (req: WorkshopRequest | null) => void;
  isLoading: boolean;
}

export const RequestManager: React.FC<RequestManagerProps> = ({
  requests,
  onSubmitNewRequest,
  selectedRequest,
  onSelectRequest,
  isLoading,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [newRequestText, setNewRequestText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filterTabs = [
    { id: 'all', label: 'All Requests', count: requests.length },
    { id: 'matched', label: 'Matched', count: requests.filter((r) => r.status === 'matched').length },
    { id: 'needs_clarification', label: 'Needs Clarification', count: requests.filter((r) => r.status === 'needs_clarification').length },
    { id: 'rejected', label: 'Rejected', count: requests.filter((r) => r.status === 'rejected').length },
    { id: 'pending', label: 'Pending', count: requests.filter((r) => r.status === 'pending' || r.status === 'processing').length },
  ];

  const filteredRequests = requests.filter((req) => {
    if (filterStatus !== 'all' && req.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        req.id.toLowerCase().includes(q) ||
        req.customer_request.toLowerCase().includes(q) ||
        (req.selected_part?.name || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleCreateRequest = async () => {
    if (!newRequestText.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubmitNewRequest(newRequestText);
      setNewRequestText('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Submit New Request Box */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Submit Workshop Parts Order to Agent Desk</span>
          </h3>
          <span className="text-xs font-mono text-slate-500">Autonomous ReAct Triage Pipeline</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="e.g. I need a 24V stepper motor with JST-XH connector drawing 60W for our CNC axis..."
            value={newRequestText}
            onChange={(e) => setNewRequestText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateRequest()}
            disabled={isSubmitting || isLoading}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono disabled:opacity-50"
          />
          <button
            onClick={handleCreateRequest}
            disabled={isSubmitting || isLoading || !newRequestText.trim()}
            className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-lg transition flex items-center justify-center gap-2 shrink-0 disabled:opacity-40 cursor-pointer"
          >
            {isSubmitting || isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4 fill-current" />
            )}
            <span>Evaluate & Dispatch</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-medium">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1.5 rounded transition cursor-pointer flex items-center gap-1.5 ${
                filterStatus === tab.id
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${filterStatus === tab.id ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64 text-xs">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search request ID or text..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
          />
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[11px] border-b border-slate-800">
            <tr>
              <th className="p-3">Request ID</th>
              <th className="p-3">Customer Order Prompt</th>
              <th className="p-3">Extracted Requirements</th>
              <th className="p-3">Status</th>
              <th className="p-3">Matched Component</th>
              <th className="p-3">Cost / Budget</th>
              <th className="p-3 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 font-mono text-slate-300">
            {filteredRequests.map((req) => {
              const reqSpecs = req.requirements || {};
              const hasMissing = reqSpecs.missing_fields && reqSpecs.missing_fields.length > 0;

              return (
                <tr
                  key={req.id}
                  onClick={() => onSelectRequest(req)}
                  className="hover:bg-slate-800/40 transition cursor-pointer"
                >
                  <td className="p-3 font-bold text-amber-400 whitespace-nowrap">
                    {req.id}
                    <span className="text-[10px] text-slate-500 font-normal block">
                      {new Date(req.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </td>

                  <td className="p-3 max-w-sm font-sans font-medium text-slate-200">
                    <p className="line-clamp-2 leading-relaxed">{req.customer_request}</p>
                  </td>

                  <td className="p-3 whitespace-nowrap">
                    <div className="space-y-0.5 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500">Volt:</span>
                        <span className={reqSpecs.voltage_v ? 'text-slate-200 font-bold' : 'text-red-400'}>
                          {reqSpecs.voltage_v ? `${reqSpecs.voltage_v}V` : 'MISSING'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500">Conn:</span>
                        <span className={reqSpecs.connector_type ? 'text-slate-300' : 'text-red-400'}>
                          {reqSpecs.connector_type || 'MISSING'}
                        </span>
                      </div>
                      {hasMissing && (
                        <span className="text-[10px] text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Missing: {reqSpecs.missing_fields.join(', ')}</span>
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="p-3 whitespace-nowrap">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
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
                  </td>

                  <td className="p-3 max-w-xs truncate">
                    {req.selected_part ? (
                      <div>
                        <span className="text-slate-100 font-sans font-medium block truncate">
                          {req.selected_part.name}
                        </span>
                        <span className="text-[10px] text-amber-400">
                          {req.selected_part.id} · Bin {req.selected_part.bin_location}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-500 italic">None dispatched</span>
                    )}
                  </td>

                  <td className="p-3 whitespace-nowrap text-slate-400">
                    <span className="text-amber-400 font-bold">${req.budget_spent_usd.toFixed(4)}</span>
                    <span className="text-[10px] text-slate-500 block">Spent</span>
                  </td>

                  <td className="p-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectRequest(req);
                      }}
                      className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded transition"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Selected Request Detail Drawer (Section 8 Requirement) */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl animate-in fade-in duration-150">
            {/* Drawer Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-amber-400 font-bold">{selectedRequest.id}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase font-mono ${
                      selectedRequest.status === 'matched'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : selectedRequest.status === 'needs_clarification'
                        ? 'bg-amber-950 text-amber-400 border border-amber-800'
                        : 'bg-red-950 text-red-400 border border-red-800'
                    }`}
                  >
                    {selectedRequest.status.replace('_', ' ')}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-100 font-sans mt-1">
                  "{selectedRequest.customer_request}"
                </h3>
              </div>
              <button
                onClick={() => onSelectRequest(null)}
                className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Warehouse Slip if Dispatched */}
            {selectedRequest.warehouse_slip && (
              <div className="p-4 rounded-lg border-2 border-dashed border-emerald-500/80 bg-emerald-950/20 font-mono text-xs space-y-2">
                <div className="flex items-center justify-between text-emerald-400 font-bold">
                  <span>OFFICIAL DISPATCH AUTHORIZATION SLIP</span>
                  <span>{selectedRequest.warehouse_slip.dispatch_id}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-slate-300 pt-1">
                  <div>
                    <span className="text-slate-500 block text-[10px]">PART ID</span>
                    <span className="font-bold text-slate-100">{selectedRequest.warehouse_slip.part_id}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">BIN LOCATION</span>
                    <span className="font-bold text-amber-400">{selectedRequest.warehouse_slip.bin_location}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">ELECTRICAL</span>
                    <span>{selectedRequest.warehouse_slip.voltage} · {selectedRequest.warehouse_slip.power}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">VERIFICATION SIGNATURE</span>
                    <span className="text-emerald-400 font-bold">{selectedRequest.warehouse_slip.verification_token}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 10-Stage Agent Execution Workflow for this Request */}
            <AgentWorkflowVisualizer
              stages={selectedRequest.stages || []}
              requestId={selectedRequest.id}
              customerRequest={selectedRequest.customer_request}
            />

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => onSelectRequest(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded transition"
              >
                Close Request Viewer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
