import { useState, useEffect, useMemo } from "react";
import {
  Clock,
  CheckCircle,
  Calendar,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  Layers,
  CheckSquare,
} from "lucide-react";
import Layout from "../components/Layout";
import axios from "axios";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";

/* ─────────────────────────────────────────────
   Shared SVG / Icons
───────────────────────────────────────────── */
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

const BoxIcon = () => (
  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
    <BoxSVG size={16} color="#9CA3AF" />
  </div>
);

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

/* ─────────────────────────────────────────────
   Stat Card
───────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────
   Sort Icon Helper
───────────────────────────────────────────── */
const SortIcon = ({ sorted }) => {
  if (!sorted) return <ArrowUpDown size={13} className="text-gray-300 ml-1 inline" />;
  if (sorted === "asc") return <ArrowUp size={13} className="text-indigo-500 ml-1 inline" />;
  return <ArrowDown size={13} className="text-indigo-500 ml-1 inline" />;
};

/* ─────────────────────────────────────────────
   Status Badge
───────────────────────────────────────────── */
const statusConfig = {
  Pending: { bg: "bg-amber-50", text: "text-amber-600" },
  Picking: { bg: "bg-blue-50", text: "text-blue-500" },
  Completed: { bg: "bg-emerald-50", text: "text-emerald-600" },
};

const StatusBadge = ({ status }) => {
  const cfg = statusConfig[status] || { bg: "bg-gray-100", text: "text-gray-500" };
  return (
    <span className={`${cfg.bg} ${cfg.text} text-xs font-semibold px-3 py-1.5 rounded-md`}>
      {status}
    </span>
  );
};

/* ─────────────────────────────────────────────
   Column Helper
───────────────────────────────────────────── */
const columnHelper = createColumnHelper();

/* ─────────────────────────────────────────────
   Multi-PO Selection Banner
───────────────────────────────────────────── */
const SelectionBanner = ({ count, onClear, onStartInwarding, onViewInfo }) => (
  <div className="flex items-center justify-between bg-indigo-600 text-white rounded-xl px-5 py-3 mb-3 shadow-md animate-in fade-in slide-in-from-top-2 duration-200">
    <div className="flex items-center gap-3">
      <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
        <CheckSquare size={15} />
      </div>
      <span className="text-sm font-bold">
        {count} PO{count > 1 ? "s" : ""} selected
      </span>
      <span className="text-indigo-200 text-xs font-medium">
        • Multi-PO inward mode
      </span>
    </div>
    <div className="flex items-center gap-2">
      <button
        onClick={onViewInfo}
        className="text-xs font-bold px-4 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition-colors border border-white/20"
      >
        View Combined Info
      </button>
      <button
        onClick={onStartInwarding}
        className="text-xs font-bold px-4 py-1.5 rounded-lg bg-white hover:bg-indigo-50 text-indigo-700 transition-colors shadow-sm"
      >
        Start Multi-PO Inward →
      </button>
      <button
        onClick={onClear}
        className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/15 hover:bg-white/25 transition-colors ml-1"
        title="Clear selection"
      >
        <X size={14} />
      </button>
    </div>
  </div>
);

/* ─────────────────────────────────────────────
   Dashboard
───────────────────────────────────────────── */
const Dashboard = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // ── Filters state ──
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showDateFilter, setShowDateFilter] = useState(false);

  // ── Multi-selection state ──
  const [selectedOrderIds, setSelectedOrderIds] = useState(new Set());

  /* ── Fetch ── */
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = localStorage.getItem("token");
        const today = new Date();
        const currentDate = today.toISOString().split("T")[0];

        const res = await axios.post(
          "http://wmsbeta.luxkutumb.info/api/sap/getPurchaseOrderByDate",
          { from_date: "2025-01-10", to_date: currentDate },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (res.data.status === "success") {
          const apiData = res.data.data;
          const dataArray = Array.isArray(apiData) ? apiData : [apiData];

          const formattedOrders = dataArray.map((order) => {
            let finalCount = 0;
            if (order.items) {
              if (Array.isArray(order.items)) finalCount = order.items.length;
              else if (typeof order.items === "string") {
                try { finalCount = JSON.parse(order.items).length; } catch { finalCount = 0; }
              } else if (typeof order.items === "object") {
                finalCount = Object.keys(order.items).length;
              }
            }
            return {
              id: order.id,
              orderId: String(order.id),
              orderCode: order.order_code,
              poCode: `PO: ${order.order_code}`,
              status: order.order_status,
              itemCount: finalCount,
              date: order.order_date,
              rawOrder: order,
            };
          });

          setOrders(formattedOrders);
        } else {
          toast.error(res.data.message || "Failed to fetch orders");
        }
      } catch (err) {
        console.error(err);
        toast.error("Network error while fetching orders.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  /* ── Row click — single PO flow ── */
  const handleRowClick = (order, e) => {
    // Don't navigate if clicking the checkbox
    if (e.target.type === "checkbox" || e.target.closest("[data-checkbox]")) return;
    // If in selection mode, toggle selection instead of navigating
    if (selectedOrderIds.size > 0) {
      toggleSelection(order.id);
      return;
    }
    navigate("/po-details", { state: { orderData: order.rawOrder } });
  };

  /* ── Selection helpers ── */
  const toggleSelection = (id) => {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedOrders = useMemo(
    () => orders.filter((o) => selectedOrderIds.has(o.id)),
    [orders, selectedOrderIds]
  );

  const handleStartMultiInward = () => {
    if (selectedOrders.length < 1) return;
    navigate("/scan", {
      state: {
        multiMode: true,
        ordersData: selectedOrders.map((o) => o.rawOrder),
      },
    });
  };

  const handleViewMultiInfo = () => {
    if (selectedOrders.length < 1) return;
    navigate("/multi-po-info", {
      state: {
        ordersData: selectedOrders.map((o) => o.rawOrder),
      },
    });
  };

  /* ── Apply date + status filter ── */
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== "All" && o.status !== statusFilter) return false;
      if (fromDate && o.date < fromDate) return false;
      if (toDate && o.date > toDate) return false;
      return true;
    });
  }, [orders, statusFilter, fromDate, toDate]);

  /* ── Columns ── */
  const columns = useMemo(
    () => [
      // Checkbox column
      columnHelper.display({
        id: "select",
        header: () => null,
        cell: (info) => {
          const row = info.row.original;
          const isSelected = selectedOrderIds.has(row.id);
          return (
            <div
              data-checkbox="true"
              className="flex items-center justify-center"
              onClick={(e) => {
                e.stopPropagation();
                toggleSelection(row.id);
              }}
            >
              <div
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-indigo-500 border-indigo-500"
                    : "border-gray-300 hover:border-indigo-400"
                }`}
              >
                {isSelected && (
                  <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                    <path d="M1 4.5L4 7.5L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </div>
          );
        },
        enableSorting: false,
        size: 44,
      }),

      // Hidden column for search
      columnHelper.accessor("orderCode", {
        id: "orderCode",
        header: () => null,
        enableSorting: false,
        cell: () => null,
      }),

      columnHelper.accessor("orderId", {
        id: "orderId",
        header: "ORDER ID",
        enableSorting: true,
        cell: (info) => {
          const row = info.row.original;
          const isSelected = selectedOrderIds.has(row.id);
          return (
            <div className="flex items-center gap-3">
              <BoxIcon />
              <div>
                <p className={`text-sm font-bold ${isSelected ? "text-indigo-700" : "text-gray-900"}`}>
                  {row.orderId}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{row.poCode}</p>
              </div>
            </div>
          );
        },
      }),
      columnHelper.accessor("status", {
        header: "STATUS",
        enableSorting: true,
        cell: (info) => <StatusBadge status={info.getValue()} />,
      }),
      columnHelper.accessor("itemCount", {
        header: "NO OF ITEMS",
        enableSorting: true,
        cell: (info) => (
          <div className="flex items-center gap-2">
            <BoxSVG size={14} color="#9CA3AF" />
            <span className="text-sm text-gray-800 font-bold">
              {info.getValue()}{" "}
              <span className="text-xs font-normal text-gray-500">Products</span>
            </span>
          </div>
        ),
      }),
      columnHelper.accessor("date", {
        header: "ORDER DATE",
        enableSorting: true,
        cell: (info) => (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar size={14} className="text-gray-400" />
            {info.getValue()}
          </div>
        ),
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedOrderIds]
  );

  /* ── Custom global filter ── */
  const customGlobalFilter = (row, _columnId, filterValue) => {
    const q = String(filterValue).toLowerCase();
    const { orderId, orderCode, poCode, status, date, itemCount } = row.original;
    return [orderId, orderCode, poCode, status, date, String(itemCount)].some(
      (val) => String(val ?? "").toLowerCase().includes(q)
    );
  };

  /* ── Table instance ── */
  const table = useReactTable({
    data: filteredOrders,
    columns,
    state: { globalFilter, sorting, columnVisibility: { orderCode: false } },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: customGlobalFilter,
    initialState: { pagination: { pageSize: 5 } },
  });

  const clearDateFilter = () => {
    setFromDate("");
    setToDate("");
    setShowDateFilter(false);
  };

  const hasDateFilter = fromDate || toDate;

  /* ── Stats ── */
  const pendingCount = orders.filter((o) => o.status === "Pending").length;
  const pickingCount = orders.filter((o) => o.status === "Picking").length;
  const completedCount = orders.filter((o) => o.status === "Completed").length;

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
        <p className="text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5">
          Tip: check rows to select multiple POs for combined inward
        </p>
      </div>

      {/* ── Stat Cards ── */}
      <div className="flex gap-4 mb-4">
        <StatCard
          label="Pending Orders"
          value={pendingCount || "0"}
          iconBg="#FEE2E2"
          icon={<Clock size={22} color="#EF4444" />}
        />
        <StatCard
          label="Currently Picking"
          value={pickingCount || "0"}
          iconBg="#EEF2FF"
          icon={<BoxSVG size={22} color="#6366F1" />}
        />
        <StatCard
          label="Completed"
          value={completedCount || "0"}
          iconBg="#D1FAE5"
          icon={<CheckCircle size={22} color="#10B981" />}
        />
      </div>

      {/* ── Multi-PO Selection Banner ── */}
      {selectedOrderIds.size > 0 && (
        <SelectionBanner
          count={selectedOrderIds.size}
          onClear={() => setSelectedOrderIds(new Set())}
          onStartInwarding={handleStartMultiInward}
          onViewInfo={handleViewMultiInfo}
        />
      )}

      {/* ── Orders Table ── */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">

        {/* ── Toolbar ── */}
        <div className="flex flex-wrap items-center gap-3 px-6 py-3 border-b border-gray-100">

          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search PO, ID, date…"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="w-full pl-8 pr-8 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all"
            />
            {globalFilter && (
              <button
                onClick={() => setGlobalFilter("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Status filter pills */}
          <div className="flex gap-1.5">
            {["All", "Pending", "Picking", "Completed"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                  statusFilter === s
                    ? "bg-indigo-500 text-white border-indigo-500"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Date filter toggle */}
          <div className="relative">
            <button
              onClick={() => setShowDateFilter((v) => !v)}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                hasDateFilter
                  ? "bg-indigo-50 text-indigo-600 border-indigo-200"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              <Filter size={13} />
              Date Filter
              {hasDateFilter && (
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block" />
              )}
            </button>

            {showDateFilter && (
              <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg p-4 z-20 min-w-[280px]">
                <p className="text-xs font-bold text-gray-600 mb-3 uppercase tracking-wide">
                  Filter by Date Range
                </p>
                <div className="flex flex-col gap-2">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">From</label>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">To</label>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
                    />
                  </div>
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={clearDateFilter}
                      className="flex-1 text-xs font-semibold py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => setShowDateFilter(false)}
                      className="flex-1 text-xs font-semibold py-1.5 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <span className="ml-auto text-sm text-gray-400 shrink-0">
            {table.getFilteredRowModel().rows.length} / {orders.length} orders
          </span>
        </div>

        {/* ── Table ── */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-gray-100">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      className={`px-6 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider select-none ${
                        header.column.getCanSort()
                          ? "cursor-pointer hover:text-gray-600 transition-colors"
                          : ""
                      }`}
                      style={header.id === "select" ? { width: 44, padding: "12px 8px 12px 20px" } : {}}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <SortIcon sorted={header.column.getIsSorted()} />
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-10 text-center text-sm text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-indigo-300 border-t-indigo-500 rounded-full animate-spin" />
                      Loading orders…
                    </div>
                  </td>
                </tr>
              ) : table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row) => {
                  const isSelected = selectedOrderIds.has(row.original.id);
                  return (
                    <tr
                      key={row.id}
                      onClick={(e) => handleRowClick(row.original, e)}
                      className={`border-b border-gray-100 last:border-0 transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-indigo-50/60 hover:bg-indigo-50/80"
                          : "hover:bg-indigo-50/40"
                      }`}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className="px-6 py-5"
                          style={cell.column.id === "select" ? { padding: "12px 8px 12px 20px" } : {}}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-10 text-center text-sm text-gray-400">
                    No orders match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Rows per page:</span>
            <select
              value={table.getState().pagination.pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-100"
            >
              {[5, 10, 20, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          <span className="text-sm text-gray-400">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {Math.max(1, table.getPageCount())}
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors"
            >
              <ChevronsLeft size={14} />
            </button>
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={14} />
            </button>
            <button
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors"
            >
              <ChevronsRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;