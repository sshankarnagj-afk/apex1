import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  MinusCircle,
  ChevronDown,
  ChevronRight,
  Terminal,
  Cpu,
  Layers,
  Wrench,
  ShieldCheck,
  Search,
  HelpCircle,
  PackageCheck,
  ArrowRight
} from 'lucide-react';
import { WorkflowStage, StageStatus } from '../types/smartparts';

interface AgentWorkflowVisualizerProps {
  stages: WorkflowStage[];
  requestId?: string;
  customerRequest?: string;
}

const STAGE_ICONS: Record<number, React.ReactNode> = {
  1: <Layers className="w-4 h-4" />,
  2: <Cpu className="w-4 h-4" />,
  3: <Search className="w-4 h-4" />,
  4: <AlertTriangle className="w-4 h-4" />,
  5: <HelpCircle className="w-4 h-4" />,
  6: <Wrench className="w-4 h-4" />,
  7: <Terminal className="w-4 h-4" />,
  8: <PackageCheck className="w-4 h-4" />,
  9: <ShieldCheck className="w-4 h-4" />,
  10: <CheckCircle2 className="w-4 h-4" />,
};

export const AgentWorkflowVisualizer: React.FC<AgentWorkflowVisualizerProps> = ({
  stages,
  requestId,
  customerRequest,
}) => {
  const [expandedStage, setExpandedStage] = useState<number | null>(null);

  const getStatusBadge = (status: StageStatus) => {
    switch (status) {
      case 'completed':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-800/80 px-2 py-0.5 rounded">
            <CheckCircle2 className="w-3 h-3" />
            COMPLETED
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-red-400 bg-red-950/70 border border-red-800/80 px-2 py-0.5 rounded">
            <XCircle className="w-3 h-3" />
            FAILED / REJECTED
          </span>
        );
      case 'running':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-amber-400 bg-amber-950/70 border border-amber-800/80 px-2 py-0.5 rounded animate-pulse">
            <Clock className="w-3 h-3" />
            RUNNING
          </span>
        );
      case 'skipped':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono text-slate-500 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
            <MinusCircle className="w-3 h-3" />
            SKIPPED
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono text-slate-600 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
            PENDING
          </span>
        );
    }
  };

  const totalTimeMs = stages.reduce((acc, s) => acc + (s.elapsed_ms || 0), 0);
  const totalToolCalls = stages.reduce((acc, s) => acc + (s.tool_calls ? s.tool_calls.length : 0), 0);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-slate-100">10-Stage Agent Execution Workflow</h3>
          </div>
          {customerRequest && (
            <p className="text-xs font-mono text-slate-400 mt-1 line-clamp-1">
              Evaluating: <span className="text-slate-200">"{customerRequest}"</span>
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          {requestId && <span className="text-slate-500">{requestId}</span>}
          <div className="flex items-center gap-2 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
            <span className="text-slate-400">Total Latency:</span>
            <span className="text-amber-400 font-bold">{totalTimeMs}ms</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400">Tools:</span>
            <span className="text-emerald-400 font-bold">{totalToolCalls}</span>
          </div>
        </div>
      </div>

      {/* 10-Stage Pipeline Flow */}
      <div className="space-y-2">
        {stages.map((stage) => {
          const isExpanded = expandedStage === stage.stage_id;
          const hasDetails = (stage.tool_calls && stage.tool_calls.length > 0) || stage.warnings || stage.result;

          return (
            <div
              key={stage.stage_id}
              className={`rounded-lg border transition-colors ${
                stage.status === 'completed'
                  ? 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
                  : stage.status === 'failed'
                  ? 'border-red-900/60 bg-red-950/20'
                  : stage.status === 'skipped'
                  ? 'border-slate-800/60 bg-slate-950/40 opacity-70'
                  : 'border-slate-800 bg-slate-950'
              }`}
            >
              {/* Stage Summary Row */}
              <div
                onClick={() => hasDetails && setExpandedStage(isExpanded ? null : stage.stage_id)}
                className={`p-3 flex items-center justify-between gap-3 text-xs ${hasDetails ? 'cursor-pointer hover:bg-slate-900/50' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                      stage.status === 'completed'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : stage.status === 'failed'
                        ? 'bg-red-950 text-red-400 border border-red-800'
                        : stage.status === 'skipped'
                        ? 'bg-slate-900 text-slate-600 border border-slate-800'
                        : 'bg-slate-900 text-amber-400 border border-slate-800'
                    }`}
                  >
                    {stage.stage_id}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200">{stage.name}</span>
                      {stage.elapsed_ms !== undefined && (
                        <span className="text-[10px] font-mono text-slate-500">
                          {stage.elapsed_ms}ms
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{stage.explanation}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {stage.tool_calls && stage.tool_calls.length > 0 && (
                    <span className="hidden sm:inline-block text-[10px] font-mono text-amber-400 bg-amber-950/40 border border-amber-800/40 px-1.5 py-0.5 rounded">
                      {stage.tool_calls.length} Tool Call{stage.tool_calls.length > 1 ? 's' : ''}
                    </span>
                  )}
                  {getStatusBadge(stage.status)}
                  {hasDetails && (
                    <button className="text-slate-500 hover:text-slate-300 transition">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Expandable Details Drawer */}
              {isExpanded && hasDetails && (
                <div className="px-4 pb-3 pt-1 border-t border-slate-800/60 bg-slate-900/40 space-y-2 text-xs font-mono">
                  {/* Tool Invocations */}
                  {stage.tool_calls && stage.tool_calls.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] text-amber-400 uppercase tracking-wider font-bold">
                        Tool Invocations Made:
                      </span>
                      {stage.tool_calls.map((tc, tcIdx) => (
                        <div key={tcIdx} className="p-2 bg-slate-950 rounded border border-slate-800 space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-amber-400 font-bold">tool: {tc.tool_name}()</span>
                            <span className="text-slate-400">${tc.cost_usd.toFixed(4)} deducted</span>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            <span className="text-slate-500">Args:</span> {JSON.stringify(tc.arguments)}
                          </div>
                          <div className="text-[10px] text-slate-300">
                            <span className="text-slate-500">Output:</span> {JSON.stringify(tc.result)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Warnings / Uncertainty Flags */}
                  {stage.warnings && stage.warnings.length > 0 && (
                    <div className="p-2 bg-amber-950/30 border border-amber-800/50 rounded text-amber-300 text-[11px] space-y-1">
                      <div className="flex items-center gap-1 font-bold">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        <span>Warnings & Uncertainty Flags:</span>
                      </div>
                      <ul className="list-disc pl-4 space-y-0.5">
                        {stage.warnings.map((w, wIdx) => (
                          <li key={wIdx}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Result Payload */}
                  {stage.result && (
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                        Stage Output Data:
                      </span>
                      <pre className="p-2 bg-slate-950 rounded border border-slate-800 text-[10px] text-slate-300 overflow-x-auto">
                        {JSON.stringify(stage.result, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
