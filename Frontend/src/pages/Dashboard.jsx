import { useState } from "react";
import { Upload, Clock, CheckCircle, Calendar } from "lucide-react";
import Layout from "../components/Layout";

/* ── Dummy Data ── */
const orders = [
  { id: "PO-2024-1235", sub: "Warehouse B", status: "Picking", items: 45, date: "05/12/2025" },
  { id: "PO-2024-1235", sub: "Warehouse B", status: "Picking", items: 45, date: "05/12/2025" },
  { id: "PO-2024-1235", sub: "Warehouse B", status: "Picking", items: 45, date: "05/12/2025" },
  { id: "PO-2024-1235", sub: "Warehouse B", status: "Picking", items: 45, date: "05/12/2025" },
  { id: "PO-2024-1235", sub: "Warehouse B", status: "Picking", items: 45, date: "05/12/2025" },
  { id: "PO-2024-1236", sub: "Warehouse A", status: "Picking", items: 30, date: "06/12/2025" },
  { id: "PO-2024-1237", sub: "Warehouse C", status: "Picking", items: 60, date: "06/12/2025" },
  { id: "PO-2024-1238", sub: "Warehouse B", status: "Picking", items: 20, date: "07/12/2025" },
  { id: "PO-2024-1239", sub: "Warehouse A", status: "Picking", items: 55, date: "07/12/2025" },
  { id: "PO-2024-1240", sub: "Warehouse C", status: "Picking", items: 40, date: "08/12/2025" },
  { id: "PO-2024-1241", sub: "Warehouse B", status: "Picking", items: 75, date: "08/12/2025" },
  { id: "PO-2024-1242", sub: "Warehouse A", status: "Picking", items: 45, date: "09/12/2025" },
  { id: "PO-2024-1243", sub: "Warehouse C", status: "Picking", items: 90, date: "09/12/2025" },
  { id: "PO-2024-1244", sub: "Warehouse B", status: "Picking", items: 35, date: "10/12/2025" },
  { id: "PO-2024-1245", sub: "Warehouse A", status: "Picking", items: 50, date: "10/12/2025" },
  { id: "PO-2024-1246", sub: "Warehouse C", status: "Picking", items: 45, date: "11/12/2025" },
  { id: "PO-2024-1247", sub: "Warehouse B", status: "Picking", items: 65, date: "11/12/2025" },
  { id: "PO-2024-1248", sub: "Warehouse A", status: "Picking", items: 45, date: "12/12/2025" },
  { id: "PO-2024-1249", sub: "Warehouse C", status: "Picking", items: 80, date: "12/12/2025" },
  { id: "PO-2024-1250", sub: "Warehouse B", status: "Picking", items: 45, date: "13/12/2025" },
  { id: "PO-2024-1251", sub: "Warehouse A", status: "Picking", items: 25, date: "13/12/2025" },
  { id: "PO-2024-1252", sub: "Warehouse C", status: "Picking", items: 45, date: "14/12/2025" },
  { id: "PO-2024-1253", sub: "Warehouse B", status: "Picking", items: 70, date: "14/12/2025" },
  { id: "PO-2024-1254", sub: "Warehouse A", status: "Picking", items: 45, date: "15/12/2025" },
  { id: "PO-2024-1255", sub: "Warehouse C", status: "Picking", items: 55, date: "15/12/2025" },
];

const ITEMS_PER_PAGE = 5;

/* ── Shared 3D Box SVG — used everywhere ── */
const BoxSVG = ({ size = 16, color = "#6366F1" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M21 8L12 3L3 8M21 8V16L12 21M21 8L12 13M3 8V16L12 21M3 8L12 13M12 13V21"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/* ── Box Icon with grey bg — used in table ORDER ID rows ── */
const BoxIcon = () => (
  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
    <BoxSVG size={16} color="#9CA3AF" />
  </div>
);

/* ── QR-style icon for page header ── */
const QRIcon = () => (
  <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="7" height="7" rx="1" stroke="#374151" strokeWidth="2" />
      <rect x="14" y="3" width="7" height="7" rx="1" stroke="#374151" strokeWidth="2" />
      <rect x="3" y="14" width="7" height="7" rx="1" stroke="#374151" strokeWidth="2" />
      <rect x="14" y="14" width="3" height="3" fill="#374151" rx="0.5" />
      <rect x="18" y="14" width="3" height="3" fill="#374151" rx="0.5" />
      <rect x="14" y="18" width="3" height="3" fill="#374151" rx="0.5" />
      <rect x="18" y="18" width="3" height="3" fill="#374151" rx="0.5" />
    </svg>
  </div>
);

/* ── Stat Card ── */
const StatCard = ({ label, value, iconBg, icon }) => (
  <div className="bg-white rounded-2xl border border-gray-100 px-6 py-5 flex items-center justify-between flex-1 shadow-sm">
    <div>
      <p className="text-sm text-gray-500 mb-2">{label}</p>
      <p className="text-4xl font-bold text-gray-900">{value}</p>
    </div>
    <div
      className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
      style={{ background: iconBg }}
    >
      {icon}
    </div>
  </div>
);

/* ── Table Row ── */
const TableRow = ({ id, sub, status, items, date }) => (
  <tr className="border-b border-gray-100 last:border-0">

    {/* Order ID */}
    <td className="px-6 py-5">
      <div className="flex items-center gap-3">
        <BoxIcon />
        <div>
          <p className="text-sm font-bold text-gray-900">{id}</p>
          <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
        </div>
      </div>
    </td>

    {/* Status */}
    <td className="px-6 py-5">
      <span className="bg-blue-50 text-blue-500 text-xs font-semibold px-3 py-1.5 rounded-md">
        {status}
      </span>
    </td>

    {/* Items Details — box icon + count */}
    <td className="px-6 py-5">
      <div className="flex items-center gap-2">
        <BoxSVG size={14} color="#9CA3AF" />
        <span className="text-sm text-gray-800">
          <span className="font-semibold">{items}</span> Items
        </span>
      </div>
    </td>

    {/* Delivery Date */}
    <td className="px-6 py-5">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Calendar size={14} className="text-gray-400" />
        {date}
      </div>
    </td>
  </tr>
);

/* ── Dashboard ── */
const Dashboard = () => {
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(orders.length / ITEMS_PER_PAGE);
  const paginated = orders.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <Layout>

      {/* ── Page Header ── */}
      <div className="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex items-center justify-between mb-4 shadow-sm">
        <div className="flex items-center gap-3">
          <QRIcon />
          <div>
            <h1 className="text-[15px] font-bold text-gray-900 leading-tight">Delivery List</h1>
            <p className="text-xs text-gray-400 mt-0.5">Manage and track all outward shipments.</p>
          </div>
        </div>
        <button className="flex items-center gap-2 border border-gray-200 bg-white text-gray-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
          <Upload size={14} />
          Export
        </button>
      </div>

      {/* ── Stat Cards ── */}
      <div className="flex gap-4 mb-4">
        <StatCard
          label="Pending Orders"
          value="12"
          iconBg="#FEE2E2"
          icon={<Clock size={22} color="#EF4444" />}
        />
        <StatCard
          label="Currently Picking"
          value="5"
          iconBg="#EEF2FF"
          icon={<BoxSVG size={22} color="#6366F1" />}
        />
        <StatCard
          label="Completed"
          value="28"
          iconBg="#D1FAE5"
          icon={<CheckCircle size={22} color="#10B981" />}
        />
      </div>

      {/* ── Orders Table ── */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">

        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
          <button className="border border-gray-300 bg-white text-sm font-medium text-gray-700 px-4 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
            Active
          </button>
          <span className="text-sm text-gray-400">Showing 5 orders</span>
        </div>

        {/* Table */}
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              {["ORDER ID", "STATUS", "ITEMS DETAILS", "DELIVERY DATE"].map((h) => (
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
            {paginated.map((order, i) => (
              <TableRow key={i} {...order} />
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

export default Dashboard;