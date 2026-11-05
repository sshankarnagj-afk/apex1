import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  X,
  Send,
  RotateCcw,
  Sparkles,
  Bot,
  User,
  AlertTriangle,
  CheckCircle2,
  Clock,
  HelpCircle,
  Package,
  Layers,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { apiService } from '../services/api';
import { ChatMessage, Part } from '../types/smartparts';

interface SmartPartsChatbotProps {
  onSelectPart?: (part: Part) => void;
  onRequestViewDetails?: (specs: any) => void;
}

const WELCOME_MESSAGE = "Hello! I'm SmartParts AI Assistant. I can help you find compatible workshop parts, check technical specifications, verify stock availability, and resolve unclear parts requests. What are you looking for today?";

const SUGGESTED_PROMPTS = [
  "Find a 12V motor with a 5-pin connector.",
  "Check available inventory for 24V stepper motors.",
  "Find a 24V DIN-rail power supply with screw terminals.",
  "Need a 12V pneumatic solenoid valve with Molex Micro-Fit.",
  "Help me identify missing specifications in my order."
];

export const SmartPartsChatbot: React.FC<SmartPartsChatbotProps> = ({ onSelectPart, onRequestViewDetails }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: WELCOME_MESSAGE,
      suggested_replies: [
        "Find a 12V motor with a 5-pin connector.",
        "Check available inventory.",
        "Help me identify missing specifications."
      ]
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await apiService.sendChatMessage(text);
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: response.reply,
        specs: response.specs,
        matchedParts: response.matchedParts,
        clarification_needed: response.clarification_needed,
        suggested_replies: response.suggested_replies,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          sender: 'assistant',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `⚠️ I encountered an error communicating with the parts desk controller: ${err.message || 'Connection failure'}. You can continue in offline DEMO mode.`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: WELCOME_MESSAGE,
        suggested_replies: [
          "Find a 12V motor with a 5-pin connector.",
          "Check available inventory.",
          "Help me identify missing specifications."
        ]
      }
    ]);
  };

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold p-3.5 rounded-full shadow-lg shadow-amber-400/20 flex items-center gap-2.5 transition-all duration-200 cursor-pointer group"
          title="Open SmartParts AI Assistant"
        >
          <div className="relative">
            <Bot className="w-5 h-5 text-slate-950" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-950 animate-pulse" />
          </div>
          <span className="text-xs font-semibold pr-1 hidden sm:inline">Ask SmartParts AI</span>
        </button>
      )}

      {/* Slide-out Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[95vw] sm:w-[440px] h-[620px] max-h-[85vh] bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          
          {/* Header */}
          <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 shadow-sm">
                <Bot className="w-4 h-4 text-slate-950" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold text-slate-100 tracking-tight">SmartParts AI Desk</h3>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-800/60">
                    ONLINE
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Agentic parts triage & inventory verifier</p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-slate-400">
              <button
                onClick={handleClearChat}
                title="Start New Conversation"
                className="p-1.5 hover:text-slate-200 hover:bg-slate-800 rounded transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close Chat"
                className="p-1.5 hover:text-slate-200 hover:bg-slate-800 rounded transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'assistant' && (
                  <div className="w-6 h-6 rounded bg-amber-400/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5 border border-amber-400/30">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}

                <div className={`max-w-[85%] space-y-2`}>
                  {/* Bubble */}
                  <div
                    className={`p-3 rounded-lg text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-amber-400 text-slate-950 font-medium rounded-tr-none'
                        : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-none font-mono whitespace-pre-wrap'
                    }`}
                  >
                    {msg.text}
                  </div>

                  {/* Extracted Specifications Chip */}
                  {msg.specs && (msg.specs.voltage_v || msg.specs.connector_type) && (
                    <div className="p-2.5 bg-slate-950/90 border border-slate-800 rounded text-[11px] font-mono text-slate-300 space-y-1">
                      <div className="text-[10px] uppercase text-amber-400 font-bold flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        <span>Parsed Specifications</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1 pt-1 text-[10px]">
                        <div>
                          <span className="text-slate-500 block">VOLT</span>
                          <span className={msg.specs.voltage_v ? 'text-slate-200' : 'text-red-400 font-bold'}>
                            {msg.specs.voltage_v ? `${msg.specs.voltage_v}V` : 'MISSING'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">CONN</span>
                          <span className={msg.specs.connector_type ? 'text-slate-200' : 'text-red-400 font-bold'}>
                            {msg.specs.connector_type || 'MISSING'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">POWER</span>
                          <span className="text-slate-200">
                            {msg.specs.power_w ? `${msg.specs.power_w}W` : 'Unspecified'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Matching Part Result Cards (Section 5 Requirement) */}
                  {msg.matchedParts && msg.matchedParts.length > 0 && (
                    <div className="space-y-2 pt-1">
                      {msg.matchedParts.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-100 text-xs">{item.part.name}</span>
                              </div>
                              <span className="text-[10px] font-mono text-amber-400">{item.part.id}</span>
                            </div>
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase shrink-0 ${
                                item.compatibility_status === 'Compatible'
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                  : item.compatibility_status === 'Needs Verification'
                                  ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                  : item.compatibility_status === 'Out of Stock'
                                  ? 'bg-red-950 text-red-400 border border-red-800'
                                  : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              {item.compatibility_status}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-1 text-[10px] font-mono bg-slate-900/60 p-1.5 rounded text-slate-300">
                            <div>
                              <span className="text-slate-500 block">ELECTRICAL</span>
                              <span>{item.part.voltage_nominal_v}V · {item.part.power_rating_w}W</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block">CONNECTOR</span>
                              <span className="truncate block">{item.part.connector_type}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block">STOCK & BAY</span>
                              <span className={item.part.stock_quantity > 0 ? 'text-emerald-400' : 'text-red-400'}>
                                {item.part.stock_quantity} in {item.part.bin_location}
                              </span>
                            </div>
                          </div>

                          <p className="text-[11px] text-slate-300 leading-snug">{item.explanation}</p>

                          {/* Inventory Verification & Uncertainty Badge */}
                          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-900 text-[10px] font-mono">
                            <span className="flex items-center gap-1 text-slate-400">
                              <Package className="w-3 h-3 text-slate-500" />
                              <span>Audit: {item.part.verification_status} ({item.part.last_updated})</span>
                            </span>
                            {item.uncertainty_flag && (
                              <span className="text-amber-400 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                <span>{item.uncertainty_flag}</span>
                              </span>
                            )}
                          </div>

                          {onSelectPart && (
                            <button
                              onClick={() => onSelectPart(item.part)}
                              className="w-full mt-1 py-1 text-[11px] text-amber-400 hover:text-amber-300 bg-slate-900 hover:bg-slate-800 rounded font-medium transition flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <span>Inspect Component Technical Sheet</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Suggested Replies */}
                  {msg.suggested_replies && msg.suggested_replies.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {msg.suggested_replies.map((sug, sIdx) => (
                        <button
                          key={sIdx}
                          onClick={() => handleSendMessage(sug)}
                          className="px-2 py-1 text-[11px] text-slate-300 hover:text-slate-100 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded transition text-left cursor-pointer"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {msg.sender === 'user' && (
                  <div className="w-6 h-6 rounded bg-slate-800 text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}

            {/* Loading / Typing Indicator */}
            {isLoading && (
              <div className="flex gap-2.5 justify-start items-center">
                <div className="w-6 h-6 rounded bg-amber-400/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-400/30">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-400 text-xs font-mono flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                  <span className="text-[11px] text-slate-400 pl-1">Extracting specifications & verifying inventory...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggested Prompts Accordion */}
          <div className="px-3 py-1.5 bg-slate-950 border-t border-slate-800 overflow-x-auto flex gap-1.5 no-scrollbar">
            {SUGGESTED_PROMPTS.slice(0, 3).map((prompt, pIdx) => (
              <button
                key={pIdx}
                onClick={() => handleSendMessage(prompt)}
                disabled={isLoading}
                className="whitespace-nowrap px-2 py-0.5 text-[10px] font-mono text-slate-400 hover:text-amber-400 bg-slate-900 border border-slate-800 rounded transition cursor-pointer disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="e.g. Find a 12V motor with a 5-pin connector..."
              disabled={isLoading}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono disabled:opacity-50"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={isLoading || !inputValue.trim()}
              className="p-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg transition disabled:opacity-40 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
