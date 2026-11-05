import React, { useState } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  AlertTriangle,
  CheckCircle2,
  Package,
  Layers,
  Wrench,
  ShieldCheck,
  Zap,
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { Part } from '../types/smartparts';

interface InventoryCatalogueProps {
  parts: Part[];
  onUpdateStock: (partId: string, currentStock: number, delta: number) => void;
  onSelectPartForTest?: (part: Part) => void;
}

export const InventoryCatalogue: React.FC<InventoryCatalogueProps> = ({
  parts,
  onUpdateStock,
  onSelectPartForTest,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortField, setSortField] = useState<keyof Part>('id');
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const categories = ['all', ...Array.from(new Set(parts.map((p) => p.category)))];

  // Filtering & Sorting
  const filteredParts = parts
    .filter((p) => {
      if (categoryFilter !== 'all' && p.category.toLowerCase() !== categoryFilter.toLowerCase()) return false;
      if (statusFilter !== 'all' && p.verification_status !== statusFilter) return false;
      if (inStockOnly && p.stock_quantity <= 0) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.id.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          p.connector_type.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.bin_location.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortAsc ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });

  const totalPages = Math.ceil(filteredParts.length / pageSize) || 1;
  const paginatedParts = filteredParts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSort = (field: keyof Part) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-400" />
            <span>Workshop Parts Catalogue & Inventory Desk</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time workshop inventory tracking, verification statuses, and physical stock controls
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-400">Total Catalogue Items:</span>
          <span className="text-amber-400 font-bold bg-slate-950 px-2 py-1 rounded border border-slate-800">
            {parts.length} SKUs
          </span>
        </div>
      </div>

      {/* Controls: Search, Filters, In-stock Toggle */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search SKU, name, connector..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
          />
        </div>

        {/* Category Filter */}
        <div>
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono capitalize"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                Category: {c}
              </option>
            ))}
          </select>
        </div>

        {/* Verification Status Filter */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono"
          >
            <option value="all">Verification: All</option>
            <option value="Verified">Verified</option>
            <option value="Needs Verification">Needs Verification</option>
            <option value="Uncertain">Uncertain (Audit Overdue)</option>
          </select>
        </div>

        {/* In-Stock Toggle */}
        <div className="flex items-center px-3 bg-slate-950 border border-slate-800 rounded-lg">
          <label className="flex items-center gap-2 cursor-pointer text-slate-300">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => {
                setInStockOnly(e.target.checked);
                setCurrentPage(1);
              }}
              className="rounded bg-slate-900 border-slate-700 text-amber-400 focus:ring-0"
            />
            <span>In-Stock Only (&gt; 0)</span>
          </label>
        </div>
      </div>

      {/* Main Table */}
      <div className="border border-slate-800 rounded-lg overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[11px] border-b border-slate-800">
            <tr>
              <th
                onClick={() => handleSort('id')}
                className="p-3 cursor-pointer hover:text-slate-200 transition"
              >
                <div className="flex items-center gap-1">
                  <span>Part ID</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort('name')}
                className="p-3 cursor-pointer hover:text-slate-200 transition"
              >
                <div className="flex items-center gap-1">
                  <span>Part Title</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="p-3">Category</th>
              <th
                onClick={() => handleSort('voltage_nominal_v')}
                className="p-3 cursor-pointer hover:text-slate-200 transition"
              >
                <div className="flex items-center gap-1">
                  <span>Voltage</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="p-3">Connector</th>
              <th className="p-3">Power</th>
              <th
                onClick={() => handleSort('stock_quantity')}
                className="p-3 cursor-pointer hover:text-slate-200 transition"
              >
                <div className="flex items-center gap-1">
                  <span>Available Stock</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="p-3">Audit Status</th>
              <th className="p-3 text-right">Controls</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 font-mono text-slate-300">
            {paginatedParts.map((part) => {
              const isLowStock = part.stock_quantity > 0 && part.stock_quantity < 5;
              const isOutOfStock = part.stock_quantity === 0;
              const isUncertain = part.verification_status === 'Uncertain';

              return (
                <tr key={part.id} className="hover:bg-slate-800/30 transition">
                  <td className="p-3 font-bold text-amber-400">{part.id}</td>
                  <td className="p-3 font-sans font-medium text-slate-100 max-w-xs">
                    <button
                      onClick={() => setSelectedPart(part)}
                      className="text-left hover:text-amber-400 hover:underline transition truncate block w-full"
                    >
                      {part.name}
                    </button>
                    <span className="text-[10px] text-slate-500 font-mono block">Bin: {part.bin_location}</span>
                  </td>
                  <td className="p-3 text-slate-400">{part.category}</td>
                  <td className="p-3 text-slate-200">
                    {part.voltage_nominal_v}V
                    <span className="text-[10px] text-slate-500 block">({part.voltage_min_v}V–{part.voltage_max_v}V)</span>
                  </td>
                  <td className="p-3 text-slate-300">{part.connector_type}</td>
                  <td className="p-3 text-slate-200">{part.power_rating_w}W</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          isOutOfStock
                            ? 'bg-red-950 text-red-400 border border-red-800'
                            : isLowStock
                            ? 'bg-amber-950 text-amber-400 border border-amber-800'
                            : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        }`}
                      >
                        {part.stock_quantity} units
                      </span>
                      {isLowStock && (
                        <span title="Low stock warning" className="text-amber-400">
                          ⚠️
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="space-y-0.5">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                          part.verification_status === 'Verified'
                            ? 'text-emerald-400 bg-emerald-950/60'
                            : part.verification_status === 'Uncertain'
                            ? 'text-amber-400 bg-amber-950/60'
                            : 'text-slate-400 bg-slate-800'
                        }`}
                      >
                        {part.verification_status}
                      </span>
                      {isUncertain && (
                        <span className="text-[10px] text-amber-500/80 block">Audit overdue</span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setSelectedPart(part)}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] transition cursor-pointer"
                      >
                        Inspect
                      </button>
                      <button
                        onClick={() => onUpdateStock(part.id, part.stock_quantity, -1)}
                        disabled={part.stock_quantity <= 0}
                        title="Decrement stock"
                        className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold disabled:opacity-30 cursor-pointer"
                      >
                        -
                      </button>
                      <button
                        onClick={() => onUpdateStock(part.id, part.stock_quantity, 1)}
                        title="Increment stock"
                        className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination & Status Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-slate-400 pt-2 border-t border-slate-800">
        <div>
          Showing {paginatedParts.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
          {Math.min(currentPage * pageSize, filteredParts.length)} of {filteredParts.length} parts
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 bg-slate-950 border border-slate-800 rounded hover:bg-slate-800 disabled:opacity-40 transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 bg-slate-950 border border-slate-800 rounded hover:bg-slate-800 disabled:opacity-40 transition cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Part Details Modal / Drawer (Section 7 Requirement) */}
      {selectedPart && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-xl w-full p-6 space-y-4 shadow-2xl animate-in fade-in duration-150">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-mono text-amber-400 font-bold">{selectedPart.id}</span>
                <h3 className="text-base font-bold text-slate-100 mt-0.5">{selectedPart.name}</h3>
                <span className="text-xs text-slate-400">{selectedPart.category} · Bin {selectedPart.bin_location}</span>
              </div>
              <button
                onClick={() => setSelectedPart(null)}
                className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-slate-950 rounded-lg text-xs font-mono">
              <div>
                <span className="text-slate-500 block text-[10px]">NOMINAL VOLTAGE</span>
                <span className="text-slate-200 font-bold">{selectedPart.voltage_nominal_v}V</span>
                <span className="text-[10px] text-slate-500 block">({selectedPart.voltage_min_v}V - {selectedPart.voltage_max_v}V)</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">POWER RATING</span>
                <span className="text-slate-200 font-bold">{selectedPart.power_rating_w}W</span>
                <span className="text-[10px] text-slate-500 block">({selectedPart.current_draw_a}A continuous)</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">CONNECTOR</span>
                <span className="text-slate-200 font-bold">{selectedPart.connector_type}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">INVENTORY STATUS</span>
                <span className={`font-bold ${selectedPart.stock_quantity > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {selectedPart.stock_quantity} available
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">AUDIT STATUS</span>
                <span className="text-slate-200">{selectedPart.verification_status}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">LAST AUDIT</span>
                <span className="text-slate-200">{selectedPart.last_updated}</span>
              </div>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div>
                <span className="text-slate-400 font-bold block mb-1">Pinout & Polarity Wiring:</span>
                <p className="p-2 bg-slate-950 rounded border border-slate-800 text-slate-300">
                  {selectedPart.pinout_polarity}
                </p>
              </div>

              <div>
                <span className="text-slate-400 font-bold block mb-1">Technical Summary & Tolerances:</span>
                <p className="p-2 bg-slate-950 rounded border border-slate-800 text-slate-300">
                  {selectedPart.spec_summary}
                </p>
              </div>

              <div>
                <span className="text-slate-400 font-bold block mb-1">Compliance & Safety Certifications:</span>
                <p className="text-slate-400">{selectedPart.safety_cert}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setSelectedPart(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
