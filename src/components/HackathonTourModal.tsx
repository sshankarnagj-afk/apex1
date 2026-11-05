import React, { useState } from 'react';
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle2,
  Bot,
  Zap,
  Layers,
  Wrench,
  DollarSign,
  TrendingUp,
  Package
} from 'lucide-react';

interface HackathonTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tabName: 'dashboard' | 'catalogue' | 'requests' | 'batch' | 'analytics' | 'codebase' | 'settings') => void;
}

const TOUR_STEPS = [
  {
    step: 1,
    title: '1. Overview Dashboard',
    tagline: 'High-Level Operational Command',
    description: 'Welcome judges! SmartParts is an enterprise-grade Agentic AI Parts Desk. The Overview Dashboard surfaces real-time metrics: matched parts, clarification rates, budget usage, and critical inventory alerts.',
    tab: 'dashboard' as const,
    highlight: 'Observe the 8 core operational KPIs and status distribution.',
  },
  {
    step: 2,
    title: '2. SmartParts AI Assistant',
    tagline: 'Conversational Workshop Intake',
    description: 'Workshop technicians submit requests in plain English. Click the floating bottom-right chatbot anytime to converse with SmartParts AI, examine parsed specs, and ask for part recommendations.',
    tab: 'dashboard' as const,
    highlight: 'Notice the intelligent natural language understanding and structured result cards.',
  },
  {
    step: 3,
    title: '3. Natural Language Parts Request',
    tagline: 'Linguistic Ingestion',
    description: 'Engineers rarely speak in exact SKUs. They ask for "a 24V stepper motor with a JST-XH connector drawing around 60W". SmartParts extracts entities, voltages, and connectors automatically.',
    tab: 'requests' as const,
    highlight: 'Test any of the 6 benchmark scenario buttons in the Requests tab.',
  },
  {
    step: 4,
    title: '4. Extracted Technical Specifications',
    tagline: 'Deterministic Entity Mapping',
    description: 'The agent extracts voltage limits, canonical connector families, and calculates power headroom before deciding which tools to call.',
    tab: 'requests' as const,
    highlight: 'Notice how voltages and connector pins are canonicalized deterministically.',
  },
  {
    step: 5,
    title: '5. Clarification Question Loop',
    tagline: 'Proactive Safety Dialogue',
    description: 'If a technician omits voltage or connector details (e.g. "replacement pneumatic solenoid valve"), the agent does NOT guess. It calls ask_clarification and pauses for the missing parameters.',
    tab: 'requests' as const,
    highlight: 'Try preset #2 to see the clarification dialog in action.',
  },
  {
    step: 6,
    title: '6. Completed Request Submission',
    tagline: 'ReAct Agent Trigger',
    description: 'With all specifications intact, the agent enters the autonomous ReAct evaluation pipeline.',
    tab: 'requests' as const,
    highlight: 'Click "Evaluate & Dispatch" to launch the agent.',
  },
  {
    step: 7,
    title: '7. Agent Decision Workflow (10 Stages)',
    tagline: 'Hackathon Core Feature',
    description: 'Inspect the full 10-stage execution pipeline: from Request Received and Natural Language Understanding, through Compatibility Analysis, Inventory Verification, and Final Recommendation.',
    tab: 'requests' as const,
    highlight: 'Every stage displays real elapsed milliseconds and tool outputs.',
  },
  {
    step: 8,
    title: '8. Selective Tool Calling & Budget',
    tagline: 'Budget-Aware Intelligence',
    description: 'To prevent unnecessary tool spam and cloud costs, the agent only invokes tools when needed. Each tool call is debited from the $0.050 session budget with an immutable audit hash.',
    tab: 'analytics' as const,
    highlight: 'Check the Tool Budget Allocation chart in Analytics.',
  },
  {
    step: 9,
    title: '9. Inventory Verification & Uncertainty',
    tagline: 'Handling Outdated Records',
    description: 'The agent cross-references warehouse bins and alerts the operator if physical stock audits are outdated (>90 days old, like MOT-12V-005) or out-of-stock.',
    tab: 'catalogue' as const,
    highlight: 'Notice the Verification Status column in the Catalogue.',
  },
  {
    step: 10,
    title: '10. Compatibility & Warehouse Slip',
    tagline: 'Rule 7 & 8 Deterministic Guardrail',
    description: 'Only 100% verified parts with valid cryptographic tokens (VRF-XXXXXXXX) receive official warehouse dispatch authorization slips. Incompatible requests escalate to human specialists.',
    tab: 'requests' as const,
    highlight: 'Inspect the generated Warehouse Dispatch Slip.',
  },
  {
    step: 11,
    title: '11. Live Batch Engine & Analytics',
    tagline: 'Live Hackathon Demonstration',
    description: 'Run all 6 benchmark requests simultaneously against the 12-part workshop inventory in Live Batch, and review comprehensive analytics and tool utilization metrics.',
    tab: 'batch' as const,
    highlight: 'Run the Live Hackathon Batch button to see multi-request evaluation!',
  },
];

export const HackathonTourModal: React.FC<HackathonTourModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  if (!isOpen) return null;

  const current = TOUR_STEPS[currentStepIndex];

  const handleNext = () => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      const nextIdx = currentStepIndex + 1;
      setCurrentStepIndex(nextIdx);
      onNavigateTab(TOUR_STEPS[nextIdx].tab);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      const prevIdx = currentStepIndex - 1;
      setCurrentStepIndex(prevIdx);
      onNavigateTab(TOUR_STEPS[prevIdx].tab);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-amber-500/80 rounded-xl max-w-xl w-full p-6 space-y-5 shadow-2xl shadow-amber-500/10 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-slate-100">SmartParts Hackathon Presentation Guide</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator & Content */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-amber-400 font-bold uppercase">{current.tagline}</span>
            <span className="text-slate-400">Step {current.step} of {TOUR_STEPS.length}</span>
          </div>

          <h2 className="text-lg font-bold text-slate-100">{current.title}</h2>
          <p className="text-xs text-slate-300 leading-relaxed">{current.description}</p>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-amber-300 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>Judge Focus: {current.highlight}</span>
          </div>
        </div>

        {/* Step Dots */}
        <div className="flex items-center justify-center gap-1.5 py-1">
          {TOUR_STEPS.map((s, idx) => (
            <button
              key={s.step}
              onClick={() => {
                setCurrentStepIndex(idx);
                onNavigateTab(s.tab);
              }}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                idx === currentStepIndex ? 'w-6 bg-amber-400' : 'w-2 bg-slate-700 hover:bg-slate-500'
              }`}
            />
          ))}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <button
            onClick={handlePrev}
            disabled={currentStepIndex === 0}
            className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 disabled:opacity-30 transition flex items-center gap-1 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <button
            onClick={handleNext}
            className="px-5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-lg transition flex items-center gap-1.5 cursor-pointer"
          >
            <span>{currentStepIndex === TOUR_STEPS.length - 1 ? 'Finish Tour' : 'Next Step'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
