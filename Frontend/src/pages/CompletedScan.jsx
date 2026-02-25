import { useState } from "react";
import { Printer, CheckCircle, RefreshCcw, Search, ChevronRight, Calendar, Package, ScanLine } from "lucide-react";
import Layout from "../components/Layout";

/* ── Dummy Data ── */
const items = [
  { sku: "SKU 3423", type: "BOX",    status: "In Progress", request: 102, packed: 85  },
  { sku: "SKU 3425", type: "BOX",    status: "Completed",   request: 18,  packed: 18  },
  { sku: "SKU 3428", type: "PALLET", status: "Pending",     request: 5,   packed: 0   },
  { sku: "SKU 3430", type: "BOX",    status: "In Progress", request: 45,  packed: 2   },
  { sku: "SKU 8821", type: "BOX",    status: "Pending",     request: 12,  packed: 0   },
  { sku: "SKU 3431", type: "BOX",    status: "Completed",   request: 30,  packed: 30  },
  { sku: "SKU 3432", type: "PALLET", status: "In Progress", request: 8,   packed: 3   },
  { sku: "SKU 3433", type: "BOX",    status: "Pending",     request: 20,  packed: 0   },
];

/* ── Custom SVG Icons ── */
const QRCodeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <rect x="4" y="4" width="6" height="6" rx="1.5" stroke="#6B7280" strokeWidth="2" />
    <rect x="14" y="4" width="6" height="6" rx="1.5" stroke="#6B7280" strokeWidth="2" />
    <rect x="4" y="14" width="6" height="6" rx="1.5" stroke="#6B7280" strokeWidth="2" />
    <circle cx="17" cy="17" r="1.5" fill="#6B7280" />
    <circle cx="17" cy="13" r="1" fill="#6B7280" />
    <circle cx="13" cy="17" r="1" fill="#6B7280" />
  </svg>
);

const ClipboardIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
    <path d="M9 14h6"></path>
    <path d="M9 10h6"></path>
  </svg>
);

/* ── Badges ── */
const StatusBadge = ({ status }) => {
  const styles = {
    "In Progress": "bg-[#edf4ff] text-[#3b82f6]",
    "Completed":   "bg-[#ecfdf5] text-[#10b981]",
    "Pending":     "bg-[#f1f5f9] text-[#64748b]",
  };
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded w-max ${styles[status]}`}>
      {status}
    </span>
  );
};

const TypeBadge = ({ type }) => (
  <span className="bg-[#f1f5f9] text-[#64748b] text-[11px] font-medium px-2 py-0.5 rounded w-max">
    {type}
  </span>
);

const ITEMS_PER_PAGE = 5;

/* ── CompletedScan Page ── */
const CompletedScan = () => {
  const [tab, setTab]       = useState("pack");
  const [search, setSearch] = useState("");
  const [page, setPage]     = useState(1);

  const filtered   = items.filter(i => i.sku.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated  = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <Layout>
      <div className="w-full px-4 pb-10">
        
        {/* ── Top Header ── */}
        <div className="bg-white rounded-2xl border border-gray-200 px-5 py-3.5 flex items-center justify-between mb-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[#f8f9fc] rounded-xl flex items-center justify-center shrink-0">
              <QRCodeIcon />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-gray-900 leading-tight">PO-2024-1234</h2>
              <p className="text-[12px] text-gray-500 mt-0.5">Delivery Information</p>
            </div>
          </div>
          <button className="flex items-center gap-2 border border-gray-200 bg-white text-gray-700 text-[13px] font-medium px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
            <Printer size={15} />
            Print Label
          </button>
        </div>

        {/* ── Main Layout ── */}
        <div className="flex items-start gap-5">

          {/* ════ LEFT COLUMN: Info Card ════ */}
          <div className="w-[420px] shrink-0 bg-white rounded-[20px] border border-gray-200 p-4 shadow-[0_4px_16px_rgba(0,0,0,0.02)] flex flex-col gap-4">
            
            {/* Purple Banner */}
            <div className="rounded-[16px] p-5 relative overflow-hidden bg-gradient-to-br from-[#4F39F6] to-[#9810FA]">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-4 backdrop-blur-sm">
                <ClipboardIcon />
              </div>
              <h3 className="text-white font-semibold text-[16px] leading-tight mb-1">
                Delivery<br />Information
              </h3>
              <p className="text-white/80 text-[12px]">Order #SO-2024-1234</p>
              
              <div className="absolute top-5 right-5 bg-white/20 backdrop-blur-md border border-white/10 text-white text-[11px] font-medium px-3 py-1 rounded-full">
                Picking
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#f8f9fa] rounded-[16px] p-4 flex flex-col justify-center">
                <p className="text-[11px] text-[#8492a6] font-medium uppercase tracking-wider mb-1">Items</p>
                <p className="text-[24px] font-bold text-gray-900 leading-none">120</p>
              </div>
              <div className="bg-[#f8f9fa] rounded-[16px] p-4 flex flex-col justify-center">
                <p className="text-[11px] text-[#8492a6] font-medium uppercase tracking-wider mb-1">Cartons</p>
                <p className="text-[24px] font-bold text-gray-900 leading-none">20</p>
              </div>
            </div>

            {/* Delivery Date */}
            <div className="bg-[#f8f9fa] rounded-[16px] p-4 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-white p-1.5 rounded-md shadow-sm border border-gray-100">
                  <Calendar size={12} className="text-[#8492a6]" />
                </div>
                <p className="text-[11px] text-[#8492a6] font-medium uppercase tracking-wider">Delivery Date</p>
              </div>
              <p className="text-[14px] font-semibold text-gray-900">05/12/2025</p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2.5 mt-2">
              <button className="w-full flex items-center justify-center gap-2 bg-[#f00e23] hover:bg-[#d80c1f] text-white text-[14px] font-semibold py-3 rounded-[12px] transition-colors shadow-[0_4px_12px_rgba(240,14,35,0.25)]">
                <CheckCircle size={16} strokeWidth={2} />
                Complete Process
              </button>
              <button className="w-full flex items-center justify-center gap-2 bg-[#f00e23] hover:bg-[#d80c1f] text-white text-[14px] font-semibold py-3 rounded-[12px] transition-colors shadow-[0_4px_12px_rgba(240,14,35,0.25)]">
                <ScanLine size={16} strokeWidth={2} />
                Scan Again
              </button>
            </div>
          </div>

          {/* ════ RIGHT COLUMN: Content ════ */}
          <div className="flex-1 flex flex-col gap-4">
            
            {/* Progress Bar Header */}
            <div className="bg-white border border-gray-200 rounded-[16px] px-5 py-3.5 flex items-center gap-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
              <span className="text-[11px] font-medium text-[#8492a6] uppercase tracking-wider shrink-0">
                Picking Progress
              </span>
              <div className="flex-1 h-2 bg-[#f1f5f9] rounded-full overflow-hidden">
                <div className="h-full bg-[#00c875] rounded-full" style={{ width: "51%" }} />
              </div>
              <span className="text-[13px] font-semibold text-gray-900 shrink-0">
                105 / 204
              </span>
            </div>

            {/* Items Panel */}
            <div className="bg-white rounded-[20px] border border-gray-200 overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.02)] flex flex-col min-h-[500px]">
              
              {/* Tabs */}
              <div className="flex px-4 pt-2">
                <button
                  onClick={() => setTab("pack")}
                  className={`flex-1 py-4 text-[13px] font-medium text-center border-b-2 transition-colors ${
                    tab === "pack" ? "border-[#00c875] text-gray-900" : "border-transparent text-[#8492a6] hover:text-gray-600"
                  }`}
                >
                  Items to Pack (5)
                </button>
                <button
                  onClick={() => setTab("packed")}
                  className={`flex-1 py-4 text-[13px] font-medium text-center border-b-2 transition-colors ${
                    tab === "packed" ? "border-[#00c875] text-gray-900" : "border-transparent text-[#8492a6] hover:text-gray-600"
                  }`}
                >
                  Packed Cartons (20)
                </button>
              </div>

              {/* Search */}
              <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Scan SKU or search..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    className="w-full pl-10 pr-4 py-2.5 text-[13px] font-normal border border-gray-200 rounded-[10px] outline-none placeholder:text-gray-400 focus:border-indigo-300 transition-colors"
                  />
                </div>
                <button className="w-[46px] h-[42px] bg-[#f8f9fc] border border-gray-200 rounded-[10px] flex items-center justify-center shrink-0 hover:bg-gray-100 transition-colors" />
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                {paginated.map((item, i) => (
                  <div key={i} className="flex items-center gap-5 px-5 py-4 hover:bg-gray-50 transition-colors group">
                    
                    {/* Icon */}
                    <div className="w-11 h-11 rounded-[10px] bg-[#f8f9fc] border border-gray-100 flex items-center justify-center shrink-0">
                      <Package size={20} className="text-[#94a3b8]" strokeWidth={1.5} />
                    </div>
                    
                    {/* SKU & Badges (Vertically Stacked) */}
                    <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                      <p className="text-[14px] font-semibold text-gray-900">{item.sku}</p>
                      <div className="flex items-center gap-2">
                        <TypeBadge type={item.type} />
                        <StatusBadge status={item.status} />
                      </div>
                    </div>
                    
                    {/* Stats */}
                    <div className="flex items-center gap-8 text-center shrink-0 mr-4">
                      <div className="flex flex-col items-center">
                        <p className="text-[10px] text-[#8492a6] font-medium uppercase tracking-wider mb-0.5">Request</p>
                        <p className="text-[15px] font-semibold text-gray-900">{item.request}</p>
                      </div>
                      <div className="flex flex-col items-center">
                        <p className="text-[10px] text-[#8492a6] font-medium uppercase tracking-wider mb-0.5">Packed</p>
                        <p className="text-[15px] font-semibold text-gray-900">{item.packed}</p>
                      </div>
                    </div>
                    
                    {/* Chevron */}
                    <ChevronRight size={18} className="text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" />
                  </div>
                ))}
              </div>

            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
};

export default CompletedScan;