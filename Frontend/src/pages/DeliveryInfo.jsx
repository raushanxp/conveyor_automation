import { useState } from "react";
import { Printer } from "lucide-react";
import Layout from "../components/Layout";
import { Link } from "react-router-dom";

/* ── Dummy Data ── */
const deliveryItems = [
  { name: "SKU 3423",     sub: "Standard Packaging", type: "BOX", qty: 102, packed: 0 },
  { name: "PO-2024-1235", sub: "Warehouse B",        type: "BOX", qty: 102, packed: 0 },
  { name: "PO-2024-1235", sub: "Warehouse B",        type: "BOX", qty: 102, packed: 0 },
  { name: "PO-2024-1235", sub: "Warehouse B",        type: "BOX", qty: 102, packed: 0 },
  { name: "PO-2024-1235", sub: "Warehouse B",        type: "BOX", qty: 102, packed: 0 },
  { name: "PO-2024-1236", sub: "Warehouse A",        type: "BOX", qty: 85,  packed: 0 },
  { name: "PO-2024-1237", sub: "Warehouse C",        type: "BOX", qty: 60,  packed: 0 },
  { name: "SKU 4891",     sub: "Standard Packaging", type: "BOX", qty: 120, packed: 0 },
  { name: "PO-2024-1238", sub: "Warehouse B",        type: "BOX", qty: 102, packed: 0 },
  { name: "PO-2024-1239", sub: "Warehouse A",        type: "BOX", qty: 75,  packed: 0 },
  { name: "SKU 5523",     sub: "Express Packaging",  type: "BOX", qty: 50,  packed: 0 },
  { name: "PO-2024-1240", sub: "Warehouse C",        type: "BOX", qty: 102, packed: 0 },
  { name: "PO-2024-1241", sub: "Warehouse B",        type: "BOX", qty: 90,  packed: 0 },
  { name: "PO-2024-1242", sub: "Warehouse A",        type: "BOX", qty: 102, packed: 0 },
  { name: "SKU 6610",     sub: "Standard Packaging", type: "BOX", qty: 110, packed: 0 },
  { name: "PO-2024-1243", sub: "Warehouse C",        type: "BOX", qty: 102, packed: 0 },
  { name: "PO-2024-1244", sub: "Warehouse B",        type: "BOX", qty: 65,  packed: 0 },
  { name: "PO-2024-1245", sub: "Warehouse A",        type: "BOX", qty: 102, packed: 0 },
  { name: "SKU 7723",     sub: "Express Packaging",  type: "BOX", qty: 80,  packed: 0 },
  { name: "PO-2024-1246", sub: "Warehouse C",        type: "BOX", qty: 102, packed: 0 },
  { name: "PO-2024-1247", sub: "Warehouse B",        type: "BOX", qty: 95,  packed: 0 },
  { name: "PO-2024-1248", sub: "Warehouse A",        type: "BOX", qty: 102, packed: 0 },
  { name: "SKU 8834",     sub: "Standard Packaging", type: "BOX", qty: 70,  packed: 0 },
  { name: "PO-2024-1249", sub: "Warehouse C",        type: "BOX", qty: 102, packed: 0 },
  { name: "PO-2024-1250", sub: "Warehouse B",        type: "BOX", qty: 55,  packed: 0 },
];

const ITEMS_PER_PAGE = 5;

/* ── Grey Box Icon (table rows) ── */
const GreyBoxIcon = () => (
  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M21 8L12 3L3 8M21 8V16L12 21M21 8L12 13M3 8V16L12 21M3 8L12 13M12 13V21"
        stroke="#9CA3AF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </div>
);

/* ── Indigo Box Icon (stat cards) ── */
const IndigoBoxIcon = () => (
  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M21 8L12 3L3 8M21 8V16L12 21M21 8L12 13M3 8V16L12 21M3 8L12 13M12 13V21"
        stroke="#6366F1"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </div>
);

/* ── Table Row ── */
const TableRow = ({ name, sub, type, qty, packed }) => (
  <tr className="border-b border-gray-100 last:border-0">
    <td className="px-6 py-4">
      <div className="flex items-center gap-3">
        <GreyBoxIcon />
        <div>
          <p className="text-sm font-semibold text-gray-800">{name}</p>
          <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
        </div>
      </div>
    </td>
    <td className="px-6 py-4">
      <span className="bg-[#E0E7FF] text-[#432DD7] text-xs font-semibold px-3 py-1.5 rounded-lg shadow">
        {type}
      </span>
    </td>
    <td className="px-6 py-4 text-sm text-gray-700">{qty}</td>
    <td className="px-6 py-4 text-sm text-gray-700">{packed}</td>
  </tr>
);

/* ── DeliveryInfo Page ── */
const DeliveryInfo = () => {
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(deliveryItems.length / ITEMS_PER_PAGE);
  const paginated = deliveryItems.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  return (
    <Layout>

      {/* ── PO Header Card ── */}
      <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center justify-between mb-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="7" height="7" rx="1" stroke="#374151" strokeWidth="2" />
              <rect x="14" y="3" width="7" height="7" rx="1" stroke="#374151" strokeWidth="2" />
              <rect x="3" y="14" width="7" height="7" rx="1" stroke="#374151" strokeWidth="2" />
              <rect x="14" y="14" width="3" height="3" fill="#374151" rx="0.5" />
              <rect x="18" y="14" width="3" height="3" fill="#374151" rx="0.5" />
              <rect x="14" y="18" width="3" height="3" fill="#374151" rx="0.5" />
              <rect x="18" y="18" width="3" height="3" fill="#374151" rx="0.5" />
            </svg>
          </div>
          <div>
            <h2 className="text-[15px] font-bold text-gray-900">PO-2024-1234</h2>
            <p className="text-xs text-gray-400 mt-0.5">Delivery Information</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 border border-gray-200 bg-white text-gray-600 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            <Printer size={14} />
            Print Label
          </button>
          <Link to="/scan" className="bg-red-500  hover:bg-red-600 text-white text-sm font-bold px-6 py-2 rounded-lg transition-colors shadow-sm">
            Start Inwarding
          </Link>
        </div>
      </div>

      {/* ── Stat Cards — 4 separate white cards ── */}
      <div className="grid grid-cols-4 gap-4 mb-4">

        {/* Total Items */}
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-5 flex items-start justify-between shadow-sm">
          <div>
            <p className="text-sm text-gray-500">Total Items</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">120</p>
          </div>
          <IndigoBoxIcon />
        </div>

        {/* Cartons Packed */}
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-5 flex items-start justify-between shadow-sm">
          <div>
            <p className="text-sm text-gray-500">Cartons Packed</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">
              0{" "}
              <span className="text-sm font-normal text-gray-400">of 6</span>
            </p>
            <p className="text-xs text-gray-400 mt-0.5">estimated</p>
          </div>
          <IndigoBoxIcon />
        </div>

        {/* Completed */}
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-5 flex items-start justify-between shadow-sm">
          <div>
            <p className="text-sm text-gray-500">Completed</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">05/12/2025</p>
          </div>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#D1FAE5" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="18" rx="2" stroke="#10B981" strokeWidth="2" />
              <path d="M3 9H21" stroke="#10B981" strokeWidth="2" />
              <path d="M8 2V6M16 2V6" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
              <path d="M8 13L11 16L16 11" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* Status */}
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-5 flex items-start justify-between shadow-sm">
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">Pending</p>
          </div>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#FEF3C7" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="#F59E0B" strokeWidth="2" />
              <path d="M9 12L11 14L15 10" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

      </div>

      {/* ── Delivery Table ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">

        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
          <button className="border border-gray-200 bg-white text-sm font-medium text-gray-700 px-4 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
            Delivery Items
          </button>
          <span className="text-sm text-gray-400">Showing 2 items</span>
        </div>

        {/* Table */}
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              {["PRODUCT DETAILS", "TYPE", "REQUESTED QTY", "PACKED QTY"].map((h) => (
                <th
                  key={h}
                  className="px-6 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map((item, i) => (
              <TableRow key={i} {...item} />
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
          <span className="text-sm text-gray-400">
            Showing page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="border border-gray-200 bg-white text-sm font-medium text-gray-700 px-4 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="border border-gray-200 bg-white text-sm font-medium text-gray-700 px-4 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>

    </Layout>
  );
};

export default DeliveryInfo;