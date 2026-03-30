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
  Info,
  Truck,
  Building2,
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

const SortIcon = ({ sorted }) => {
  if (!sorted) return <ArrowUpDown size={13} className="text-gray-300 ml-1 inline" />;
  if (sorted === "asc") return <ArrowUp size={13} className="text-indigo-500 ml-1 inline" />;
  return <ArrowDown size={13} className="text-indigo-500 ml-1 inline" />;
};

const statusConfig = {
  Pending:   { bg: "bg-amber-50",   text: "text-amber-600"   },
  Partial:   { bg: "bg-blue-50",    text: "text-blue-500"    },
  Completed: { bg: "bg-emerald-50", text: "text-emerald-600" },
};

const StatusBadge = ({ status }) => {
  const displayStatus = status === "Picking" ? "Partial" : status;
  const cfg = statusConfig[displayStatus] || { bg: "bg-gray-100", text: "text-gray-500" };
  return (
    <span className={`${cfg.bg} ${cfg.text} text-xs font-semibold px-3 py-1.5 rounded-md`}>
      {displayStatus}
    </span>
  );
};

const columnHelper = createColumnHelper();

const SelectionBanner = ({ count, selectedOrders, onClear, onStartInwarding, onViewInfo, onStartSingle }) => {
  const isSingle = count === 1;
  const order = isSingle ? selectedOrders[0] : null;

  return (
    <div
      className={`rounded-xl px-5 py-3 mb-3 shadow-md border transition-all ${
        isSingle ? "bg-white border-indigo-200" : "bg-indigo-600 border-indigo-600"
      }`}
    >
      {isSingle ? (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
              <CheckSquare size={16} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 leading-tight">PO-{order?.orderCode}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {order?.date} · {order?.status === "Picking" ? "Partial" : order?.status}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onViewInfo}
              className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Info size={13} />
              View Details
            </button>
            <button
              onClick={onStartSingle}
              className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-sm"
            >
              <Truck size={13} />
              Start Inwarding
            </button>
            <button
              onClick={onClear}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors ml-1"
              title="Clear selection"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0">
              <Layers size={16} className="text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-white leading-tight">{count} POs selected</p>
                <span className="text-[10px] font-bold bg-white/20 text-white/90 px-2 py-0.5 rounded-md border border-white/20 uppercase tracking-wide">
                  Multi-PO Mode
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {selectedOrders.slice(0, 5).map((o) => (
                  <span key={o.id} className="text-[10px] font-bold bg-white/15 text-white/80 border border-white/20 px-2 py-0.5 rounded-md">
                    PO-{o.orderCode}
                  </span>
                ))}
                {selectedOrders.length > 5 && (
                  <span className="text-[10px] font-bold text-white/60">+{selectedOrders.length - 5} more</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onViewInfo}
              className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-white transition-colors border border-white/20"
            >
              <Info size={13} />
              Combined Info
            </button>
            <button
              onClick={onStartInwarding}
              className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg bg-white hover:bg-indigo-50 text-indigo-700 transition-colors shadow-sm"
            >
              <Truck size={13} />
              Start Multi-PO Inward
            </button>
            <button
              onClick={onClear}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/15 hover:bg-white/25 text-white transition-colors border border-white/20 ml-1"
              title="Clear selection"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const Dashboard = () => {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [globalFilter, setGlobalFilter]       = useState("");
  const [sorting, setSorting]                 = useState([]);
  const [statusFilter, setStatusFilter]       = useState("All");
  const [fromDate, setFromDate]               = useState("");
  const [toDate, setToDate]                   = useState("");
  const [showDateFilter, setShowDateFilter]   = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState(new Set());

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token       = localStorage.getItem("token");
        const currentDate = new Date().toISOString().split("T")[0];

        const res = await axios.post(
          `${import.meta.env.VITE_BASE_URL}/getPurchaseOrderByDate`,
          { from_date: "2025-01-10", to_date: currentDate },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (res.data.status === "success") {
          const dataArray = Array.isArray(res.data.data) ? res.data.data : [res.data.data];
          setOrders(
            dataArray.map((order) => ({
              id:         order.id,
              orderId:    String(order.id),
              orderCode:  order.order_code,
              poCode:     `PO: ${order.order_code}`,
              status:     order.order_status,
              date:       order.order_date,
              vendorCode: order.vendor_code ?? "",
              vendorName: order.vendor_name ?? "",
            }))
          );
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

  const handleRowClick = (order, e) => {
    if (e.target.type === "checkbox" || e.target.closest("[data-checkbox]")) return;
    if (selectedOrderIds.size > 0) { toggleSelection(order.id); return; }
    navigate("/po-details", { state: { poIds: [order.id] } });
  };

  const toggleSelection = (id) => {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectedOrders = useMemo(
    () => orders.filter((o) => selectedOrderIds.has(o.id)),
    [orders, selectedOrderIds]
  );

  const handleStartSingleInward = () => {
    if (selectedOrders.length !== 1) return;
    navigate("/scan", { state: { multiMode: false, poIds: [selectedOrders[0].id] } });
  };

  const handleStartMultiInward = () => {
    if (selectedOrders.length < 2) return;
    navigate("/scan", { state: { multiMode: true, poIds: selectedOrders.map((o) => o.id) } });
  };

  const handleViewInfo = () => {
    if (selectedOrders.length < 1) return;
    navigate("/po-details", { state: { poIds: selectedOrders.map((o) => o.id) } });
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const logicalStatus = o.status === "Picking" ? "Partial" : o.status;
      if (statusFilter !== "All" && logicalStatus !== statusFilter) return false;
      if (fromDate && o.date < fromDate) return false;
      if (toDate   && o.date > toDate)   return false;
      return true;
    });
  }, [orders, statusFilter, fromDate, toDate]);

  const columns = useMemo(
    () => [
      // ── Checkbox ──────────────────────────────────────────────────────────
      columnHelper.display({
        id: "select",
        header: () => null,
        enableSorting: false,
        size: 44,
        cell: (info) => {
          const row        = info.row.original;
          const isSelected = selectedOrderIds.has(row.id);
          return (
            <div
              data-checkbox="true"
              className="flex items-center justify-center"
              onClick={(e) => { e.stopPropagation(); toggleSelection(row.id); }}
            >
              <div
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors cursor-pointer ${
                  isSelected ? "bg-indigo-500 border-indigo-500" : "border-gray-300 hover:border-indigo-400"
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
      }),

      // ── Hidden: orderCode (search only) ──────────────────────────────────
      columnHelper.accessor("orderCode", {
        id: "orderCode",
        header: () => null,
        enableSorting: false,
        cell: () => null,
      }),

      // ── ORDER ID ──────────────────────────────────────────────────────────
      columnHelper.accessor("orderId", {
        id: "orderId",
        header: "Order ID",
        enableSorting: true,
        cell: (info) => {
          const row        = info.row.original;
          const isSelected = selectedOrderIds.has(row.id);
          return (
            <div className="flex items-center gap-3">
              <BoxIcon />
              <div>
                <p className={`text-sm font-bold ${isSelected ? "text-indigo-700" : "text-gray-900"}`}>
                  {row.poCode}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">ID: {row.orderId}</p>
              </div>
            </div>
          );
        },
      }),

      // ── VENDOR ────────────────────────────────────────────────────────────
      columnHelper.accessor("vendorName", {
        id: "vendorName",
        header: "Vendor",
        enableSorting: true,
        cell: (info) => {
          const row = info.row.original;
          const name = row.vendorName || "—";
          const code = row.vendorCode || "";
          return (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                <Building2 size={13} className="text-indigo-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate leading-tight">{name}</p>
                {code && (
                  <p className="text-[11px] text-gray-400 font-medium mt-0.5 leading-tight">
                    ID: {code}
                  </p>
                )}
              </div>
            </div>
          );
        },
      }),

      // ── STATUS ────────────────────────────────────────────────────────────
      columnHelper.accessor("status", {
        header: "Status",
        enableSorting: true,
        cell: (info) => <StatusBadge status={info.getValue()} />,
      }),

      // ── ORDER DATE ────────────────────────────────────────────────────────
      columnHelper.accessor("date", {
        header: "Order Date",
        enableSorting: true,
        cell: (info) => (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar size={14} className="text-gray-400" />
            {info.getValue()}
          </div>
        ),
      }),
    ],
    [selectedOrderIds] // eslint-disable-line
  );

  const customGlobalFilter = (row, _columnId, filterValue) => {
    const q = String(filterValue).toLowerCase();
    const { orderId, orderCode, poCode, status, date, vendorCode, vendorName } = row.original;
    const displayStatus = status === "Picking" ? "Partial" : status;
    return [orderId, orderCode, poCode, displayStatus, date, vendorCode, vendorName].some(
      (val) => String(val ?? "").toLowerCase().includes(q)
    );
  };

  const table = useReactTable({
    data: filteredOrders,
    columns,
    state: {
      globalFilter,
      sorting,
      columnVisibility: {
        orderCode: false, // hidden but still searchable via customGlobalFilter
      },
    },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange:      setSorting,
    getCoreRowModel:       getCoreRowModel(),
    getSortedRowModel:     getSortedRowModel(),
    getFilteredRowModel:   getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn:        customGlobalFilter,
    initialState: { pagination: { pageSize: 10 } },
  });

  const clearDateFilter = () => { setFromDate(""); setToDate(""); setShowDateFilter(false); };
  const hasDateFilter   = fromDate || toDate;

  const pendingCount   = orders.filter((o) => o.status === "Pending").length;
  const partialCount   = orders.filter((o) => o.status === "Picking").length;
  const completedCount = orders.filter((o) => o.status === "Completed").length;

  return (
    <Layout>
      {/* Page header */}
      <div className="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex items-center justify-between mb-4 shadow-sm">
        <div className="flex items-center gap-3">
          <QRIcon />
          <div>
            <h1 className="text-[15px] font-bold text-gray-900 leading-tight">Delivery List</h1>
            <p className="text-xs text-gray-400 mt-0.5">Manage and track all inward shipments.</p>
          </div>
        </div>
        <p className="text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5">
          Tip: check rows to select multiple POs for combined inward
        </p>
      </div>

      {/* Stat cards */}
      <div className="flex gap-4 mb-4">
        <StatCard label="Pending Orders" value={pendingCount || "0"} iconBg="#FEE2E2" icon={<Clock size={22} color="#EF4444" />} />
        <StatCard label="Partial"        value={partialCount || "0"} iconBg="#EEF2FF" icon={<BoxSVG size={22} color="#6366F1" />} />
        <StatCard label="Completed"      value={completedCount || "0"} iconBg="#D1FAE5" icon={<CheckCircle size={22} color="#10B981" />} />
      </div>

      {/* Selection banner */}
      {selectedOrderIds.size > 0 && (
        <SelectionBanner
          count={selectedOrderIds.size}
          selectedOrders={selectedOrders}
          onClear={() => setSelectedOrderIds(new Set())}
          onStartInwarding={handleStartMultiInward}
          onStartSingle={handleStartSingleInward}
          onViewInfo={handleViewInfo}
        />
      )}

      {/* Table card */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 px-6 py-3 border-b border-gray-100">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search PO, ID, vendor, date…"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="w-full pl-8 pr-8 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all"
            />
            {globalFilter && (
              <button onClick={() => setGlobalFilter("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={12} />
              </button>
            )}
          </div>

          {/* Status filter */}
          <div className="flex gap-1.5">
            {["All", "Pending", "Partial", "Completed"].map((s) => (
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

          {/* Date filter */}
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
              {hasDateFilter && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block" />}
            </button>

            {showDateFilter && (
              <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg p-4 z-20 min-w-[280px]">
                <p className="text-xs font-bold text-gray-600 mb-3 uppercase tracking-wide">Filter by Date Range</p>
                <div className="flex flex-col gap-2">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">From</label>
                    <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">To</label>
                    <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300" />
                  </div>
                  <div className="flex gap-2 mt-1">
                    <button onClick={clearDateFilter}
                      className="flex-1 text-xs font-semibold py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                      Clear
                    </button>
                    <button onClick={() => setShowDateFilter(false)}
                      className="flex-1 text-xs font-semibold py-1.5 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition-colors">
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

        {/* Table */}
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
                        header.column.getCanSort() ? "cursor-pointer hover:text-gray-600 transition-colors" : ""
                      }`}
                      style={header.id === "select" ? { width: 44, padding: "12px 8px 12px 20px" } : {}}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && <SortIcon sorted={header.column.getIsSorted()} />}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-400">
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
                        isSelected ? "bg-indigo-50/60 hover:bg-indigo-50/80" : "hover:bg-indigo-50/40"
                      }`}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className="px-6 py-4"
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
                  <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-400">
                    No orders match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Rows per page:</span>
            <select
              value={table.getState().pagination.pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-100"
            >
              {[5, 10, 20, 50].map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>

          <span className="text-sm text-gray-400">
            Page {table.getState().pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())}
          </span>

          <div className="flex items-center gap-1">
            <button onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors">
              <ChevronsLeft size={14} />
            </button>
            <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors">
              <ChevronLeft size={14} />
            </button>
            <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors">
              <ChevronRight size={14} />
            </button>
            <button onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors">
              <ChevronsRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;