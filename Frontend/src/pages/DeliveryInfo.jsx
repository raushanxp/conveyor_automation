import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";

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
const TableRow = ({ name, sku, type, qty, received_qty, pending_qty, packed }) => {
  const isFullyReceived = pending_qty === 0;
  const hasPartial = received_qty > 0 && pending_qty > 0;

  return (
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
        <span className="bg-[#E0E7FF] text-[#432DD7] text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm">
          {type}
        </span>
      </td>
      <td className="px-6 py-4 text-sm font-semibold text-gray-700">{qty}</td>
      <td className="px-6 py-4 text-sm font-semibold text-emerald-600">{received_qty}</td>
      <td className="px-6 py-4">
        <span className={`text-sm font-semibold ${
          isFullyReceived
            ? "text-emerald-600"
            : hasPartial
            ? "text-amber-500"
            : "text-gray-700"
        }`}>
          {pending_qty}
        </span>
      </td>
      <td className="px-6 py-4">
        <span className={`text-sm font-semibold ${
          packed >= pending_qty && pending_qty > 0
            ? "text-emerald-600"
            : packed >= qty && qty > 0
            ? "text-emerald-600"
            : packed > 0
            ? "text-blue-500"
            : "text-gray-700"
        }`}>
          {packed}
        </span>
      </td>
    </tr>
  );
};

/* ── Loading Skeleton ── */
const LoadingSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-8 bg-gray-100 rounded-lg mb-4 w-1/3" />
    <div className="grid grid-cols-4 gap-4 mb-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-gray-100 rounded-xl h-24" />
      ))}
    </div>
    <div className="bg-gray-100 rounded-xl h-64" />
  </div>
);

/* ── DeliveryInfo Page ── */
const DeliveryInfo = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Receive an array of numeric PO ids from Dashboard navigation state
  const poIds = location.state?.poIds || [];

  const [ordersData, setOrdersData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const isMulti = poIds.length > 1;

  /* ── Fetch PO details from purchase-order-by-ids ── */
  useEffect(() => {
    if (poIds.length === 0) {
      setLoading(false);
      return;
    }

    const fetchOrderDetails = async () => {
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

    fetchOrderDetails();
  }, []); // eslint-disable-line

  // For single PO display — use the first order
  const primaryOrder = ordersData[0] || null;

  // ── Read packed counts from localStorage (written by Scanning page on each successful sync) ──
  // Key format: "packed_<po_code>" — same key written in Scanning.jsx handleSync
  const packedCounts = (() => {
    try {
      const poCode = primaryOrder?.order_code || "unknown";
      const stored = localStorage.getItem(`packed_${poCode}`);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  })();

  // ── Build flat list of all delivery items across all POs ──
  const deliveryItems = (() => {
    const items = [];
    ordersData.forEach((order) => {
      let parsedItems = order.items;
      if (typeof parsedItems === "string") {
        try { parsedItems = JSON.parse(parsedItems); } catch { parsedItems = []; }
      }
      if (!Array.isArray(parsedItems)) parsedItems = [];

      parsedItems.forEach((item) => {
        // packed comes from localStorage — 0 if nothing synced yet for this SKU
        const packed = packedCounts[item.sku] || 0;
        items.push({
          name:         item.name         || "Unknown Product",
          sku:          item.sku          || "N/A",
          type:         item.uom          || "PCS",
          qty:          item.qty          || 0,
          received_qty: item.received_qty || 0,
          pending_qty:  item.pending_qty  || 0,
          packed,
          orderCode: order.order_code,
        });
      });
    });
    return items;
  })();

  // Total quantity across all POs
  const totalQuantity = ordersData.reduce((sum, order) => {
    const qty = parseFloat(order.total_requested_qty || 0);
    return sum + (isNaN(qty) ? 0 : qty);
  }, 0);

  // Total already received across all items
  const totalReceived = deliveryItems.reduce((sum, item) => sum + (item.received_qty || 0), 0);

  // Total pending across all items
  const totalPending = deliveryItems.reduce((sum, item) => sum + (item.pending_qty || 0), 0);

  const handleStartInwarding = () => {
    // Pass only the PO ids to Scanning — it will fetch its own data
    if (isMulti) {
      navigate("/scan", {
        state: { multiMode: true, poIds },
      });
    } else {
      navigate("/scan", {
        state: { multiMode: false, poIds },
      });
    }
  };

  const totalPages = Math.max(1, Math.ceil(deliveryItems.length / ITEMS_PER_PAGE));
  const paginated  = deliveryItems.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  if (loading) {
    return (
      <Layout>
        <div className="p-6">
          <LoadingSkeleton />
        </div>
      </Layout>
    );
  }

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
            {isMulti ? (
              <>
                <h2 className="text-[15px] font-bold text-gray-900">
                  {ordersData.length} Purchase Orders
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {ordersData.map((o) => `PO-${o.order_code}`).join(", ")}
                </p>
              </>
            ) : (
              <>
                <h2 className="text-[15px] font-bold text-gray-900">
                  {primaryOrder ? `PO-${primaryOrder.order_code}` : "No Order Selected"}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">Delivery Information</p>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleStartInwarding}
            className="bg-red-500 hover:bg-red-600 text-white text-sm font-bold px-6 py-2 rounded-lg transition-colors shadow-sm"
          >
            Start Inwarding
          </button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-4 gap-4 mb-4">

        {/* Total Items */}
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-5 flex items-start justify-between shadow-sm">
          <div>
            <p className="text-sm text-gray-500">Total Items</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{deliveryItems.length}</p>
          </div>
          <IndigoBoxIcon />
        </div>

        {/* Total Quantity */}
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-5 flex items-start justify-between shadow-sm">
          <div>
            <p className="text-sm text-gray-500">Total Quantity</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">
              {totalQuantity > 0 ? totalQuantity.toFixed(0) : "0"}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              <span className="text-emerald-500 font-semibold">{totalReceived} received</span>
              {" · "}
              <span className="text-amber-500 font-semibold">{totalPending} pending</span>
            </p>
          </div>
          <IndigoBoxIcon />
        </div>

        {/* Order Date */}
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-5 flex items-start justify-between shadow-sm">
          <div>
            <p className="text-sm text-gray-500">Order Date</p>
            <p className="text-[22px] font-bold text-gray-900 mt-2">
              {isMulti
                ? (ordersData[0]?.order_date || "--/--/----")
                : (primaryOrder?.order_date || "--/--/----")}
            </p>
            {isMulti && ordersData.length > 1 && (
              <p className="text-xs text-gray-400 mt-0.5">Earliest order</p>
            )}
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
            {isMulti ? (
              <div className="flex flex-wrap gap-1 mt-1">
                {[...new Set(ordersData.map((o) => o.order_status))].map((s) => (
                  <span key={s} className="text-sm font-bold text-gray-900">{s}</span>
                ))}
              </div>
            ) : (
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {primaryOrder?.order_status || "..."}
              </p>
            )}
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
          <span className="text-sm text-gray-400">Showing {deliveryItems.length} products</span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {["PRODUCT DETAILS", "TYPE", "TOTAL QTY", "RECEIVED QTY", "PENDING QTY", "PACKED QTY"].map((h) => (
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
              {deliveryItems.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-sm text-gray-500">
                    {poIds.length > 0 ? "No items found for this order." : "No order selected. Go back to the dashboard."}
                  </td>
                </tr>
              ) : (
                paginated.map((item, i) => <TableRow key={i} {...item} />)
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

export default DeliveryInfo;