import { useState, useMemo, useEffect } from "react";
import Layout from "../components/Layout";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";

const ITEMS_PER_PAGE = 8;

const PO_COLORS = [
  { bg: "bg-indigo-100", text: "text-indigo-700", dot: "bg-indigo-500", border: "border-indigo-200", light: "bg-indigo-50" },
  { bg: "bg-violet-100", text: "text-violet-700", dot: "bg-violet-500", border: "border-violet-200", light: "bg-violet-50" },
  { bg: "bg-sky-100",    text: "text-sky-700",    dot: "bg-sky-500",    border: "border-sky-200",    light: "bg-sky-50"    },
  { bg: "bg-teal-100",   text: "text-teal-700",   dot: "bg-teal-500",   border: "border-teal-200",   light: "bg-teal-50"   },
  { bg: "bg-pink-100",   text: "text-pink-700",   dot: "bg-pink-500",   border: "border-pink-200",   light: "bg-pink-50"   },
];

/* ── Icons ── */
const GreyBoxIcon = () => (
  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M21 8L12 3L3 8M21 8V16L12 21M21 8L12 13M3 8V16L12 21M3 8L12 13M12 13V21" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </div>
);

const IndigoBoxIcon = () => (
  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M21 8L12 3L3 8M21 8V16L12 21M21 8L12 13M3 8V16L12 21M3 8L12 13M12 13V21" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </div>
);

/* ── Loading Skeleton ── */
const LoadingSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-8 bg-gray-100 rounded-lg mb-4 w-1/3" />
    <div className="grid grid-cols-3 gap-3 mb-4">
      {[...Array(3)].map((_, i) => <div key={i} className="bg-gray-100 rounded-xl h-20" />)}
    </div>
    <div className="grid grid-cols-4 gap-4 mb-4">
      {[...Array(4)].map((_, i) => <div key={i} className="bg-gray-100 rounded-xl h-24" />)}
    </div>
    <div className="bg-gray-100 rounded-xl h-64" />
  </div>
);

/* ── PO Summary mini card ── */
const POSummaryCard = ({ order, colorConfig, index }) => {
  let itemCount = 0;
  if (order.items) {
    let parsed = order.items;
    if (typeof parsed === "string") { try { parsed = JSON.parse(parsed); } catch { parsed = []; } }
    itemCount = Array.isArray(parsed) ? parsed.length : 0;
  }

  return (
    <div className={`bg-white rounded-xl border ${colorConfig.border} px-4 py-3.5 flex items-center justify-between shadow-sm`}>
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg ${colorConfig.bg} flex items-center justify-center shrink-0`}>
          <span className={`text-xs font-bold ${colorConfig.text}`}>{index + 1}</span>
        </div>
        <div>
          <p className={`text-sm font-bold ${colorConfig.text}`}>PO-{order.order_code}</p>
          <p className="text-xs text-gray-400 mt-0.5">{order.order_date}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500 font-medium">{itemCount} items</span>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${colorConfig.bg} ${colorConfig.text}`}>
          {order.order_status}
        </span>
      </div>
    </div>
  );
};

/* ── Table Row ── */
const TableRow = ({ name, sku, type, qty, received_qty, pending_qty, packed, poCode, colorConfig }) => (
  <tr className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
    <td className="px-6 py-4">
      <div className="flex items-center gap-3">
        <GreyBoxIcon />
        <div>
          <p className="text-[13px] font-semibold text-gray-800 line-clamp-1" title={name}>{name}</p>
          <p className="text-xs text-gray-500 mt-0.5">SKU: {sku}</p>
        </div>
      </div>
    </td>
    <td className="px-6 py-4">
      <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${colorConfig.bg} ${colorConfig.text}`}>
        {poCode}
      </span>
    </td>
    <td className="px-6 py-4">
      <span className="bg-[#E0E7FF] text-[#432DD7] text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm">
        {type}
      </span>
    </td>
    <td className="px-6 py-4 text-sm font-semibold text-gray-700">{qty}</td>
    <td className="px-6 py-4 text-sm font-semibold text-emerald-600">{received_qty}</td>
    <td className="px-6 py-4">
      {(() => {
        const isFullyReceived = pending_qty === 0;
        const hasPartial = received_qty > 0 && pending_qty > 0;
        return (
          <span className={`text-sm font-semibold ${
            isFullyReceived ? "text-emerald-600" : hasPartial ? "text-amber-500" : "text-gray-700"
          }`}>
            {pending_qty}
          </span>
        );
      })()}
    </td>
    <td className="px-6 py-4">
      <span className={`text-sm font-semibold ${
        packed >= pending_qty && pending_qty > 0 ? "text-emerald-600"
        : packed >= qty && qty > 0 ? "text-emerald-600"
        : packed > 0 ? "text-blue-500"
        : "text-gray-700"
      }`}>
        {packed}
      </span>
    </td>
  </tr>
);

/* ── MultiPOInfo Page ── */
const MultiPOInfo = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Accepts poIds (array of numeric ids) — same pattern as DeliveryInfo
  const poIds = location.state?.poIds || [];

  const [ordersData, setOrdersData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [activePOFilter, setActivePOFilter] = useState("All");

  /* ── Fetch all POs in one request ── */
  useEffect(() => {
    if (poIds.length === 0) {
      setLoading(false);
      return;
    }

    const fetchOrders = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.post(
          `${import.meta.env.VITE_BASE_URL}/purchase-order-by-ids`,
          { po_ids: poIds },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (res.data.status === "success") {
          const data = Array.isArray(res.data.data) ? res.data.data : [res.data.data];
          setOrdersData(data);
        } else {
          toast.error(res.data.message || "Failed to fetch order details");
        }
      } catch (err) {
        console.error(err);
        toast.error("Network error while fetching order details.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []); // eslint-disable-line

  /* ── Build combined delivery items ── */
  const allDeliveryItems = useMemo(() => {
    const items = [];
    ordersData.forEach((order, orderIdx) => {
      const colorConfig = PO_COLORS[orderIdx % PO_COLORS.length];

      const packedCounts = (() => {
        try {
          const stored = localStorage.getItem(`packed_${order.order_code}`);
          return stored ? JSON.parse(stored) : {};
        } catch { return {}; }
      })();

      let parsedItems = order.items;
      if (typeof parsedItems === "string") {
        try { parsedItems = JSON.parse(parsedItems); } catch { parsedItems = []; }
      }
      if (!Array.isArray(parsedItems)) parsedItems = [];

      parsedItems.forEach((item) => {
        items.push({
          name:         item.name         || "Unknown Product",
          sku:          item.sku          || "N/A",
          type:         item.uom          || "PCS",   // ← same as DeliveryInfo
          qty:          item.qty          || 0,
          received_qty: item.received_qty || 0,
          pending_qty:  item.pending_qty  || 0,
          packed:       packedCounts[item.sku] || 0,
          poCode:       `PO-${order.order_code}`,
          orderCode:    order.order_code,
          colorConfig,
          orderIdx,
        });
      });
    });
    return items;
  }, [ordersData]);

  /* ── Filter by PO ── */
  const filteredItems = useMemo(() => {
    if (activePOFilter === "All") return allDeliveryItems;
    return allDeliveryItems.filter((item) => item.poCode === activePOFilter);
  }, [allDeliveryItems, activePOFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));
  const paginated  = filteredItems.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  /* ── Aggregate stats ── */
  const totalQty     = allDeliveryItems.reduce((s, i) => s + i.qty, 0);
  const totalReceived = allDeliveryItems.reduce((s, i) => s + i.received_qty, 0);
  const totalPending  = allDeliveryItems.reduce((s, i) => s + i.pending_qty, 0);
  const totalPacked   = allDeliveryItems.reduce((s, i) => s + i.packed, 0);

  const handleStartInwarding = () => {
    navigate("/scan", {
      state: { multiMode: true, poIds },
    });
  };

  if (loading) {
    return <Layout><div className="p-6"><LoadingSkeleton /></div></Layout>;
  }

  if (ordersData.length === 0) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <p className="text-lg font-semibold">No orders found</p>
          <p className="text-sm mt-1">Go back and select POs from the dashboard.</p>
          <button onClick={() => navigate("/")} className="mt-4 text-sm text-indigo-600 font-semibold hover:underline">
            ← Back to Dashboard
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* ── Header ── */}
      <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center justify-between mb-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <h2 className="text-[15px] font-bold text-gray-900">
              Multi-PO Inward — {ordersData.length} Purchase Orders
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {ordersData.map((o) => `PO-${o.order_code}`).join(", ")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-sm font-medium text-gray-600 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            ← Back
          </button>
          <button
            onClick={handleStartInwarding}
            className="bg-red-500 hover:bg-red-600 text-white text-sm font-bold px-6 py-2 rounded-lg transition-colors shadow-sm"
          >
            Start Inwarding
          </button>
        </div>
      </div>

      {/* ── PO Summary Cards ── */}
      <div
        className="grid gap-3 mb-4"
        style={{ gridTemplateColumns: `repeat(${Math.min(ordersData.length, 3)}, 1fr)` }}
      >
        {ordersData.map((order, idx) => (
          <POSummaryCard
            key={order.order_code}
            order={order}
            colorConfig={PO_COLORS[idx % PO_COLORS.length]}
            index={idx}
          />
        ))}
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-4 gap-4 mb-4">

        <div className="bg-white rounded-xl border border-gray-200 px-5 py-5 flex items-start justify-between shadow-sm">
          <div>
            <p className="text-sm text-gray-500">Total POs</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{ordersData.length}</p>
            <p className="text-xs text-gray-400 mt-0.5">combined</p>
          </div>
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 px-5 py-5 flex items-start justify-between shadow-sm">
          <div>
            <p className="text-sm text-gray-500">Total Items</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{allDeliveryItems.length}</p>
            <p className="text-xs text-gray-400 mt-0.5">across all POs</p>
          </div>
          <IndigoBoxIcon />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 px-5 py-5 flex items-start justify-between shadow-sm">
          <div>
            <p className="text-sm text-gray-500">Total Quantity</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{totalQty}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              <span className="text-emerald-500 font-semibold">{totalReceived} received</span>
              {" · "}
              <span className="text-amber-500 font-semibold">{totalPending} pending</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#D1FAE5" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="18" rx="2" stroke="#10B981" strokeWidth="2"/>
              <path d="M3 9H21" stroke="#10B981" strokeWidth="2"/>
              <path d="M8 2V6M16 2V6" stroke="#10B981" strokeWidth="2" strokeLinecap="round"/>
              <path d="M8 13L11 16L16 11" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 px-5 py-5 flex items-start justify-between shadow-sm">
          <div>
            <p className="text-sm text-gray-500">Packed So Far</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{totalPacked}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {totalQty > 0 ? `${Math.round((totalPacked / totalQty) * 100)}% done` : "0% done"}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#FEF3C7" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="#F59E0B" strokeWidth="2"/>
              <path d="M9 12L11 14L15 10" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

      </div>

      {/* ── Combined Items Table ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">

        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => { setActivePOFilter("All"); setPage(1); }}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                activePOFilter === "All"
                  ? "bg-gray-800 text-white border-gray-800"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              All Items
            </button>
            {ordersData.map((order, idx) => {
              const cc = PO_COLORS[idx % PO_COLORS.length];
              const poLabel = `PO-${order.order_code}`;
              return (
                <button
                  key={order.order_code}
                  onClick={() => { setActivePOFilter(poLabel); setPage(1); }}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                    activePOFilter === poLabel
                      ? `${cc.bg} ${cc.text} ${cc.border}`
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {poLabel}
                </button>
              );
            })}
          </div>
          <span className="text-sm text-gray-400">
            Showing {filteredItems.length} of {allDeliveryItems.length} products
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {["PRODUCT DETAILS", "PO", "TYPE", "TOTAL QTY", "RECEIVED QTY", "PENDING QTY", "PACKED QTY"].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-sm text-gray-500">
                    No items found.
                  </td>
                </tr>
              ) : (
                paginated.map((item, i) => (
                  <TableRow key={`${item.orderCode}-${item.sku}-${i}`} {...item} />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
          <span className="text-sm text-gray-400">Page {page} of {totalPages}</span>
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

export default MultiPOInfo;