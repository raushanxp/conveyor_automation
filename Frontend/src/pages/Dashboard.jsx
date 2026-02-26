import { useState, useEffect } from "react";
import { Upload, Clock, CheckCircle, Calendar } from "lucide-react";
import Layout from "../components/Layout";
import axios from "axios";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom"; // 🟢 IMPORT ADDED

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
// 🟢 ADDED onClick prop and cursor-pointer class
const TableRow = ({ id, sub, status, itemCount, date, onClick }) => (
  <tr 
    onClick={onClick} 
    className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors cursor-pointer"
  >
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

    {/* No Of Items Count */}
    <td className="px-6 py-5">
      <div className="flex items-center gap-2">
        <BoxSVG size={14} color="#9CA3AF" />
        <span className="text-sm text-gray-800 font-bold">
          {itemCount} <span className="text-xs font-normal text-gray-500">Products</span>
        </span>
      </div>
    </td>

    {/* Order Date */}
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
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const navigate = useNavigate(); // 🟢 ADDED NAVIGATE

  // Fetch data from API on component mount
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = localStorage.getItem("token");
        
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const currentDate = `${year}-${month}-${day}`;

        const payload = {
          from_date: "2025-01-10",
          to_date: currentDate
        };

        const res = await axios.post(
          "http://wmsbeta.luxkutumb.info/api/sap/getPurchaseOrderByDate", 
          payload, 
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        if (res.data.status === "success") {
          const apiData = res.data.data;
          const dataArray = Array.isArray(apiData) ? apiData : [apiData];
          
          const formattedOrders = dataArray.map((order) => {
            let finalCount = 0;
            if (order.items) {
              if (Array.isArray(order.items)) {
                finalCount = order.items.length;
              } else if (typeof order.items === 'string') {
                try { finalCount = JSON.parse(order.items).length; } catch (e) { finalCount = 0; }
              } else if (typeof order.items === 'object') {
                finalCount = Object.keys(order.items).length;
              }
            }

            // We also keep the raw order data to pass to the next screen if needed
            return {
              id: order.id, 
              sub: `PO: ${order.order_code}`, 
              status: order.order_status,
              itemCount: finalCount, 
              date: order.order_date,
              rawOrder: order // 🟢 Saving the raw object 
            };
          });

          setOrders(formattedOrders);
        } else {
          toast.error(res.data.message || "Failed to fetch orders");
        }
      } catch (err) {
        console.error("Error fetching orders:", err);
        toast.error("Network error while fetching orders.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  // 🟢 Handle Row Click Function
  const handleRowClick = (order) => {
    // Navigates to /po-details and silently passes the raw order data
    navigate("/po-details", { state: { orderData: order.rawOrder } });
  };

  const totalPages = Math.max(1, Math.ceil(orders.length / ITEMS_PER_PAGE));
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
          value={orders.filter(o => o.status === "Pending").length || "0"}
          iconBg="#FEE2E2"
          icon={<Clock size={22} color="#EF4444" />}
        />
        <StatCard
          label="Currently Picking"
          value={orders.filter(o => o.status === "Picking").length || "0"}
          iconBg="#EEF2FF"
          icon={<BoxSVG size={22} color="#6366F1" />}
        />
        <StatCard
          label="Completed"
          value={orders.filter(o => o.status === "Completed").length || "0"}
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
          <span className="text-sm text-gray-400">Showing {orders.length} Purchase Orders</span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {["ORDER ID", "STATUS", "NO OF ITEMS", "ORDER DATE"].map((h) => (
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
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-sm text-gray-500">
                    Loading orders...
                  </td>
                </tr>
              ) : paginated.length > 0 ? (
                // 🟢 Added onClick to the rendered rows
                paginated.map((order, i) => (
                  <TableRow 
                    key={i} 
                    {...order} 
                    onClick={() => handleRowClick(order)} 
                  />
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-sm text-gray-500">
                    No orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

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
              disabled={page === totalPages || totalPages === 0}
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