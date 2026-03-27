import { useState, useEffect, useRef, useMemo } from "react";
import {
  Play, CheckCircle, ChevronDown, AlertTriangle, XCircle, Check,
  Camera, Layers, AlertCircle, Scan, Upload, Loader2, CalendarDays,
  ShieldCheck, ShieldX, Package, PackageX, MapPin,
} from "lucide-react";
import Layout from "../components/Layout";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";

const parseQR = (qr) => {
  const parts = qr.split("/");
  const sku = parts[0] || qr;
  const qty = parts.length >= 3 ? (parseInt(parts[2], 10) || 1) : 1;
  return { sku, qty };
};

const SESSION_KEY = "scanning_session";

const saveSession = (poIds, challanNumber, challanVerified, selectedDate, fgLocation) => {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      poIds, challanNumber, challanVerified, selectedDate, fgLocation, savedAt: Date.now(),
    }));
  } catch {}
};

const loadSession = () => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (Date.now() - s.savedAt > 86_400_000) { localStorage.removeItem(SESSION_KEY); return null; }
    return s;
  } catch { return null; }
};

const clearSession = () => { try { localStorage.removeItem(SESSION_KEY); } catch {} };

// ─── Challan cache helpers (1-hour TTL) ────────────────────────────────────
const CHALLAN_CACHE_KEY = "verified_challans";
const CHALLAN_TTL_MS    = 60 * 60 * 1000; // 1 hour

const getChallanCache = () => {
  try {
    const raw = localStorage.getItem(CHALLAN_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
};

const isChallanCached = (challan) => {
  const cache = getChallanCache();
  const entry = cache[challan.trim()];
  if (!entry) return false;
  if (Date.now() - entry.verifiedAt > CHALLAN_TTL_MS) {
    // expired — remove it
    try {
      const updated = getChallanCache();
      delete updated[challan.trim()];
      localStorage.setItem(CHALLAN_CACHE_KEY, JSON.stringify(updated));
    } catch {}
    return false;
  }
  return true;
};

const cacheChallan = (challan) => {
  try {
    const cache = getChallanCache();
    cache[challan.trim()] = { verifiedAt: Date.now() };
    localStorage.setItem(CHALLAN_CACHE_KEY, JSON.stringify(cache));
  } catch {}
};
// ───────────────────────────────────────────────────────────────────────────

const PO_COLORS = [
  { bg: "bg-indigo-100", text: "text-indigo-700", dot: "bg-indigo-500", bar: "bg-indigo-400", border: "border-indigo-200" },
  { bg: "bg-violet-100", text: "text-violet-700", dot: "bg-violet-500", bar: "bg-violet-400", border: "border-violet-200" },
  { bg: "bg-sky-100",    text: "text-sky-700",    dot: "bg-sky-500",    bar: "bg-sky-400",    border: "border-sky-200"    },
  { bg: "bg-teal-100",   text: "text-teal-700",   dot: "bg-teal-500",   bar: "bg-teal-400",   border: "border-teal-200"   },
  { bg: "bg-pink-100",   text: "text-pink-700",   dot: "bg-pink-500",   bar: "bg-pink-400",   border: "border-pink-200"   },
];

const FG_LOCATIONS = [
  { id: "0011", label: "0011 — Vest" },
  { id: "0031", label: "0031 — Brief" },
];

const DEFAULT_LOOSE_LOC    = "0020";
const DEFAULT_REJECTED_LOC = "0021";
const STALL_TIMEOUT_MS     = 400;
const setBeltStatus = (running) => localStorage.setItem("belt_running", running ? "true" : "false");

// ─── Composite key helpers ──────────────────────────────────────────────────
// Keys for looseData / rejectedData are `orderCode::sku` to avoid collision
// when the same SKU appears in multiple POs.
const makeItemKey = (orderCode, sku) => `${orderCode}::${sku}`;
// ───────────────────────────────────────────────────────────────────────────

const SyncModal = ({ isOpen, onClose, onConfirm, totalQRs, totalQty, orderLabel, isSyncing }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-indigo-50 p-6 pb-5 flex items-start gap-4 border-b border-indigo-100">
          <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
            <Upload className="text-indigo-600" size={22} strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Sync to Server</h3>
            <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
              You are about to sync{" "}
              <span className="font-bold text-indigo-700">{totalQRs} QR code(s)</span>{" "}
              (<span className="font-bold text-indigo-700">{totalQty} units</span>) for{" "}
              <span className="font-bold text-indigo-700">{orderLabel}</span>. All POs will be submitted together in a single sync.
            </p>
          </div>
        </div>
        <div className="p-6 pt-5 flex items-center justify-end gap-3">
          <button onClick={onClose} disabled={isSyncing} className="cursor-pointer px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50">Cancel</button>
          <button onClick={onConfirm} disabled={isSyncing} className="cursor-pointer px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-60 flex items-center gap-2 min-w-[120px] justify-center">
            {isSyncing ? <><Loader2 size={16} className="animate-spin" /> Syncing...</> : <><Upload size={16} /> Confirm Sync</>}
          </button>
        </div>
      </div>
    </div>
  );
};

const ErrorPopup = ({ isOpen, onDismiss, onRescan, missingCode = "Missing Items", hideRescan = false }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-[#fff5f5] p-6 pb-5 flex items-start gap-4 border-b border-red-50">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <AlertCircle className="text-red-600" size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Process Error Detected</h3>
            <p className="text-sm text-slate-600 mt-1.5 leading-relaxed pr-2">{missingCode}</p>
          </div>
        </div>
        <div className="p-6 pt-5 flex items-center justify-end gap-3">
          <button onClick={onDismiss} className="cursor-pointer px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">Dismiss</button>
          {!hideRescan && (
            <button onClick={onRescan} className="cursor-pointer px-5 py-2.5 rounded-xl bg-[#e60000] text-white text-sm font-semibold shadow-[0_6px_16px_rgba(230,0,0,0.25)] hover:bg-red-700 transition-all">Rescan Stack</button>
          )}
        </div>
      </div>
    </div>
  );
};

const FTPCameraFeed = () => {
  const [imageUrl, setImageUrl]           = useState(null);
  const [error, setError]                 = useState(null);
  const [lastTimestamp, setLastTimestamp] = useState(null);

  useEffect(() => {
    const fetchLatestImage = async () => {
      try {
        const response = await fetch("http://localhost:8000/latest-image");
        if (response.status === 404) { setError("Waiting for first scan..."); return; }
        if (response.ok) {
          const data = await response.json();
          if (data.upload_timestamp !== lastTimestamp) {
            setImageUrl(`http://localhost:8000${data.public_url}?t=${encodeURIComponent(data.upload_timestamp)}`);
            setLastTimestamp(data.upload_timestamp);
            setError(null);
          }
        } else { setError("Camera feed offline"); }
      } catch { setError("Cannot connect to Camera API"); }
    };
    const interval = setInterval(fetchLatestImage, 1000);
    fetchLatestImage();
    return () => clearInterval(interval);
  }, [lastTimestamp]);

  return (
    <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-transparent z-0">
      {imageUrl ? (
        <img src={imageUrl} alt="Live FTP Camera" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="flex flex-col items-center justify-center z-10 pointer-events-none">
          <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mb-2 backdrop-blur-md">
            <Camera size={20} className="text-slate-400" strokeWidth={1.5} />
          </div>
          <p className="text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase mb-1">External Feed</p>
          <p className="text-[11px] font-medium text-slate-500 text-center px-4">{error || "Connecting..."}</p>
        </div>
      )}
    </div>
  );
};

const LoadingSpinner = () => (
  <div className="flex flex-col items-center justify-center py-20 gap-3">
    <div className="w-8 h-8 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
    <p className="text-sm text-slate-500 font-medium">Loading order data…</p>
  </div>
);

// ─── QuantityPanel ──────────────────────────────────────────────────────────
// `data` keys are now `orderCode::sku` composites (plus `__defaultLoc`).
// `products` items carry `orderCode` so the panel builds the right key.
const QuantityPanel = ({ title, icon: Icon, iconBg, products, data, onChange, defaultLocation, accentColor }) => {
  if (products.length === 0) return null;
  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg ${iconBg} flex items-center justify-center`}>
            <Icon size={14} className={accentColor} />
          </div>
          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">{title}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin size={11} className="text-slate-400" />
          <span className="text-[10px] text-slate-400 font-medium">Default loc:</span>
          <input
            type="text"
            value={data.__defaultLoc ?? defaultLocation}
            onChange={(e) => onChange("__defaultLoc", e.target.value)}
            className="cursor-text w-16 text-[11px] font-bold border border-slate-200 rounded-md px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-indigo-200 text-slate-700 text-center bg-white"
            maxLength={10}
          />
        </div>
      </div>
      <div className="divide-y divide-slate-50">
        {products.map((p) => {
          const itemKey = makeItemKey(p.orderCode, p.sku);
          const row     = data[itemKey] ?? { qty: 0, location: data.__defaultLoc ?? defaultLocation };
          return (
            <div key={itemKey} className="px-5 py-2.5 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-slate-800 truncate uppercase tracking-tight">{p.sku}</p>
                <p className="text-[10px] text-slate-400 truncate">
                  {p.name}
                  {/* Show PO badge when multiple POs are in play */}
                  {p.orderCode && (
                    <span className="ml-1.5 text-[9px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                      {p.orderCode}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <MapPin size={10} className="text-slate-300" />
                <input
                  type="text"
                  value={row.location ?? (data.__defaultLoc ?? defaultLocation)}
                  onChange={(e) => onChange(itemKey, { ...row, location: e.target.value })}
                  className="cursor-text w-14 text-[11px] font-semibold border border-slate-200 rounded-md px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-indigo-200 text-slate-600 text-center bg-slate-50"
                  maxLength={10}
                  placeholder={data.__defaultLoc ?? defaultLocation}
                />
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => onChange(itemKey, { ...row, qty: Math.max(0, (row.qty || 0) - 1) })}
                  className="cursor-pointer w-6 h-6 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 flex items-center justify-center text-xs font-bold transition-colors"
                >−</button>
                <input
                  type="number"
                  min={0}
                  value={row.qty || 0}
                  onChange={(e) => onChange(itemKey, { ...row, qty: Math.max(0, parseInt(e.target.value) || 0) })}
                  className="cursor-text w-12 text-center text-sm font-bold border border-slate-200 rounded-md px-1 py-0.5 outline-none focus:ring-1 focus:ring-indigo-200 text-slate-800 bg-white"
                />
                <button
                  onClick={() => onChange(itemKey, { ...row, qty: (row.qty || 0) + 1 })}
                  className="cursor-pointer w-6 h-6 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 flex items-center justify-center text-xs font-bold transition-colors"
                >+</button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
// ───────────────────────────────────────────────────────────────────────────

const Scanning = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const navPoIds     = location.state?.poIds || [];
  const navMultiMode = location.state?.multiMode === true;

  const restoredSession = useMemo(() => {
    if (navPoIds.length > 0) return null;
    return loadSession();
  }, []); // eslint-disable-line

  const poIds     = navPoIds.length > 0 ? navPoIds : (restoredSession?.poIds || []);
  const multiMode = navPoIds.length > 1 || (restoredSession?.poIds?.length ?? 0) > 1 || navMultiMode;

  const [ordersData, setOrdersData]   = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (poIds.length === 0) { setDataLoading(false); return; }
    const fetchOrderDetails = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.post("http://wmsbeta.luxkutumb.info/api/sap/purchase-order-by-ids",
          { po_ids: poIds }, { headers: { Authorization: `Bearer ${token}` } });
        if (res.data.status === "success") {
          setOrdersData(Array.isArray(res.data.data) ? res.data.data : [res.data.data]);
        } else { toast.error(res.data.message || "Failed to fetch order details"); }
      } catch (err) { console.error(err); toast.error("Network error while fetching order details."); }
      finally { setDataLoading(false); }
    };
    fetchOrderDetails();
  }, []); // eslint-disable-line

  const primaryOrder = ordersData[0] || null;

  const earliestOrderDate = useMemo(() => {
    const dates = ordersData.map((o) => o.order_date).filter(Boolean).sort();
    return dates[0] || "";
  }, [ordersData]);

  const deliveryItemsMapRef = useRef({});
  const skuToPOsRef         = useRef({});
  const [allProducts, setAllProducts]         = useState([]);
  const [totalItemsCount, setTotalItemsCount] = useState(0);

  useEffect(() => {
    if (ordersData.length === 0) return;
    const map = {}, skuToPOs = {}, flat = [];
    ordersData.forEach((order, orderIdx) => {
      let parsedItems = order.items;
      if (typeof parsedItems === "string") { try { parsedItems = JSON.parse(parsedItems); } catch { parsedItems = []; } }
      if (!Array.isArray(parsedItems)) parsedItems = [];
      parsedItems.forEach((item) => {
        const sku = item.sku || "N/A";
        const pendingQty = item.pending_qty ?? item.qty ?? 0;
        const receivedQty = item.received_qty ?? 0;
        const totalQty = item.qty ?? 0;
        const entry = { orderCode: order.order_code, orderIdx, name: item.name || "Unknown Item", totalQty, receivedQty, expectedQty: pendingQty };
        if (!skuToPOs[sku]) skuToPOs[sku] = [];
        skuToPOs[sku].push(entry);
        if (!map[sku]) map[sku] = entry;
        flat.push({ name: item.name || "Unknown Item", sku, totalQty, receivedQty, qty: pendingQty, orderCode: order.order_code, orderIdx });
      });
    });
    deliveryItemsMapRef.current = map;
    skuToPOsRef.current = skuToPOs;
    setAllProducts(flat);
    setTotalItemsCount(flat.length);
  }, [ordersData]);

  useEffect(() => { return () => setBeltStatus(false); }, []);

  const storageKeys = useMemo(() => ordersData.map((o) => (o.order_code ? `scanning_qrs_${o.order_code}` : null)), [ordersData]);

  const today = new Date().toISOString().split("T")[0];
  const [challanNumber, setChallanNumber]     = useState(restoredSession?.challanNumber || "");
  const [challanVerified, setChallanVerified] = useState(restoredSession?.challanVerified || false);
  const [challanError, setChallanError]       = useState("");
  const [isVerifying, setIsVerifying]         = useState(false);
  const [selectedDate, setSelectedDate]       = useState(restoredSession?.selectedDate || today);
  const [fgLocation, setFgLocation]           = useState(restoredSession?.fgLocation || FG_LOCATIONS[0].id);

  // ── Loose / Rejected state now keyed by `orderCode::sku` ──────────────────
  const [looseData, setLooseData]       = useState({ __defaultLoc: DEFAULT_LOOSE_LOC });
  const [rejectedData, setRejectedData] = useState({ __defaultLoc: DEFAULT_REJECTED_LOC });

  // onChange receives either "__defaultLoc" or a composite "orderCode::sku" key
  const handleLooseChange    = (key, val) => setLooseData((prev) => ({ ...prev, [key]: val }));
  const handleRejectedChange = (key, val) => setRejectedData((prev) => ({ ...prev, [key]: val }));
  // ──────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (poIds.length === 0) return;
    saveSession(poIds, challanNumber, challanVerified, selectedDate, fgLocation);
  }, [poIds, challanNumber, challanVerified, selectedDate, fgLocation]); // eslint-disable-line

  const [plcError, setPlcError]                       = useState(null);
  const [isStackDropdownOpen, setIsStackDropdownOpen] = useState(false);
  const [stackSize, setStackSize]                     = useState(6);
  const [customAmount, setCustomAmount]               = useState("");
  const stackOptions                                  = [1, 2, 3, 4, 5, 6];
  const [currentBatchQRs, setCurrentBatchQRs]         = useState([]);
  const [allScannedQRs, setAllScannedQRs]             = useState([]);
  const [showErrorPopup, setShowErrorPopup]           = useState(false);
  const [mismatchMsg, setMismatchMsg]                 = useState("");
  const [isQtyError, setIsQtyError]                   = useState(false);
  const [showSyncModal, setShowSyncModal]             = useState(false);
  const [isSyncing, setIsSyncing]                     = useState(false);
  const [activePOTab, setActivePOTab]                 = useState("all");

  const isBeltRunning      = useRef(false);
  const isProcessingBatch  = useRef(false);
  const syncedQRsRef       = useRef(new Set());
  const stackSizeRef       = useRef(stackSize);
  const lastQRArrivedAt    = useRef(null);
  const prevBatchLengthRef = useRef(0);
  const stallFiredRef      = useRef(false);
  const currentBatchRef    = useRef([]);
  const showErrorPopupRef  = useRef(false);
  const beltStartedAt      = useRef(null);
  const allScannedQRsRef   = useRef([]);

  useEffect(() => {
    if (storageKeys.length === 0) return;
    const allRestored = [];
    storageKeys.forEach((key) => {
      if (!key) return;
      try { const saved = localStorage.getItem(key); if (saved) { const p = JSON.parse(saved); if (Array.isArray(p)) allRestored.push(...p); } } catch {}
    });
    if (allRestored.length > 0) {
      setAllScannedQRs(allRestored);
      allScannedQRsRef.current = allRestored;
      allRestored.forEach((qr) => syncedQRsRef.current.add(qr));
      toast(`↺ Restored ${allRestored.length} QR(s) from last session.`, { icon: "💾" });
    }
  }, [storageKeys]);

  useEffect(() => {
    if (ordersData.length === 0) return;
    const perPOQRs = {};
    ordersData.forEach((o) => { perPOQRs[o.order_code] = []; });
    const rc = {};
    allScannedQRs.forEach((qr) => {
      const { sku } = parseQR(qr);
      const pos = skuToPOsRef.current[sku] || [];
      let assigned = false;
      for (const pe of pos) {
        const key = `${pe.orderCode}::${sku}`;
        if ((rc[key] || 0) < pe.expectedQty) { rc[key] = (rc[key] || 0) + 1; if (perPOQRs[pe.orderCode]) perPOQRs[pe.orderCode].push(qr); assigned = true; break; }
      }
      if (!assigned && pos.length > 0 && perPOQRs[pos[0].orderCode]) perPOQRs[pos[0].orderCode].push(qr);
    });
    storageKeys.forEach((key, idx) => {
      if (!key) return;
      const qrs = perPOQRs[ordersData[idx]?.order_code] || [];
      try { if (qrs.length > 0) localStorage.setItem(key, JSON.stringify(qrs)); else localStorage.removeItem(key); } catch {}
    });
  }, [allScannedQRs]); // eslint-disable-line

  const packedPerPO = useMemo(() => {
    const result = {};
    ordersData.forEach((o) => { result[o.order_code] = {}; });
    const rc = {};
    allScannedQRs.forEach((qr) => {
      const { sku, qty } = parseQR(qr);
      const pos = skuToPOsRef.current[sku] || [];
      let assigned = false;
      for (const pe of pos) {
        const key = `${pe.orderCode}::${sku}`;
        if ((rc[key] || 0) < pe.expectedQty) {
          rc[key] = (rc[key] || 0) + qty;
          if (result[pe.orderCode]) result[pe.orderCode][sku] = (result[pe.orderCode][sku] || 0) + qty;
          assigned = true; break;
        }
      }
      if (!assigned && pos.length > 0 && result[pos[0].orderCode])
        result[pos[0].orderCode][sku] = (result[pos[0].orderCode][sku] || 0) + qty;
    });
    return result;
  }, [allScannedQRs, ordersData]); // eslint-disable-line

  const totalUnitsScanned = useMemo(() =>
    Object.values(packedPerPO).reduce((t, m) => t + Object.values(m).reduce((s, v) => s + v, 0), 0),
  [packedPerPO]);

  const totalPendingUnits = useMemo(() => allProducts.reduce((s, p) => s + p.qty, 0), [allProducts]);

  useEffect(() => { stackSizeRef.current      = stackSize;       }, [stackSize]);
  useEffect(() => { currentBatchRef.current   = currentBatchQRs; }, [currentBatchQRs]);
  useEffect(() => { showErrorPopupRef.current = showErrorPopup;  }, [showErrorPopup]);
  useEffect(() => { allScannedQRsRef.current  = allScannedQRs;   }, [allScannedQRs]);

  useEffect(() => {
    fetch("http://localhost:5000/api/stack-size", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stack_size: stackSize }) }).catch(() => {});
  }, [stackSize]);

  const resetStall = () => { lastQRArrivedAt.current = null; prevBatchLengthRef.current = 0; stallFiredRef.current = false; };

  // ─── Challan verification — checks local cache first, then API ────────────
  const handleVerifyChallan = async () => {
    if (!challanNumber.trim()) { setChallanError("Please enter a challan number."); return; }
    setChallanError("");

    // 1. Check local cache first
    if (isChallanCached(challanNumber)) {
      setChallanVerified(true);
      toast.success("Challan verified (from cache).");
      return;
    }

    // 2. Fall through to API
    setIsVerifying(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post("http://wmsbeta.luxkutumb.info/api/sap/verify-challan-number",
        { challan_number: challanNumber.trim() }, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success === true) {
        cacheChallan(challanNumber); // store in cache for 1 hr
        setChallanVerified(true);
        setChallanError("");
        toast.success("Challan verified successfully!");
      } else {
        setChallanVerified(false);
        setChallanError(res.data.message || "Challan verification failed.");
        toast.error(res.data.message || "Invalid challan number.");
      }
    } catch {
      setChallanVerified(false);
      setChallanError("Network error. Please try again.");
      toast.error("Network error during challan verification.");
    } finally {
      setIsVerifying(false);
    }
  };
  // ──────────────────────────────────────────────────────────────────────────

  const findOverflowQR = (incomingQRs) => {
    const tc = {};
    allScannedQRsRef.current.forEach((qr) => {
      const { sku, qty } = parseQR(qr);
      const pos = skuToPOsRef.current[sku] || [];
      let assigned = false;
      for (const pe of pos) { const k = `${pe.orderCode}::${sku}`; if ((tc[k] || 0) < pe.expectedQty) { tc[k] = (tc[k] || 0) + qty; assigned = true; break; } }
      if (!assigned && pos.length > 0) { const k = `${pos[0].orderCode}::${sku}`; tc[k] = (tc[k] || 0) + qty; }
    });
    for (const qr of incomingQRs) {
      const { sku, qty } = parseQR(qr);
      const pos = skuToPOsRef.current[sku] || [];
      if (pos.length === 0) return { qr, sku, reason: `SKU ${sku} is not in any of the selected POs.` };
      let placed = false;
      for (const pe of pos) { const k = `${pe.orderCode}::${sku}`; if ((tc[k] || 0) + qty <= pe.expectedQty) { tc[k] = (tc[k] || 0) + qty; placed = true; break; } }
      if (!placed) {
        const te = pos.reduce((s, p) => s + p.expectedQty, 0);
        const tt = pos.reduce((s, p) => s + p.totalQty, 0);
        const tf = pos.reduce((s, p) => s + (tc[`${p.orderCode}::${sku}`] || 0), 0);
        return { qr, sku, reason: `Pending quantity fulfilled for ${sku} (${pos[0].name || sku}). Pending: ${te} of ${tt} total. Would reach: ${tf + qty}.` };
      }
    }
    return null;
  };

  useEffect(() => {
    const si = setInterval(() => {
      if (beltStartedAt.current && Date.now() - beltStartedAt.current < 500) return;
      const bl = currentBatchRef.current.length;
      if (bl > prevBatchLengthRef.current) { lastQRArrivedAt.current = Date.now(); prevBatchLengthRef.current = bl; stallFiredRef.current = false; return; }
      if (bl === 0 || bl >= stackSizeRef.current || isProcessingBatch.current || showErrorPopupRef.current || stallFiredRef.current || lastQRArrivedAt.current === null) return;
      if (Date.now() - lastQRArrivedAt.current >= STALL_TIMEOUT_MS) {
        stallFiredRef.current = true; isProcessingBatch.current = true; isBeltRunning.current = false; setBeltStatus(false);
        const msg = `${stackSizeRef.current - bl} box(es) missing! Got ${bl}, expected ${stackSizeRef.current}.`;
        setIsQtyError(false); setMismatchMsg(msg); setShowErrorPopup(true); toast.error(msg);
        clearBackendQueue().then(() => { isProcessingBatch.current = false; });
      }
    }, 200);
    return () => clearInterval(si);
  }, []); // eslint-disable-line

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch("http://localhost:5000/api/qr");
        const data = await response.json();
        if (!data.qr_codes) return;
        const incoming = data.qr_codes;

        if (Array.isArray(incoming) && incoming.some((qr) => typeof qr === "string" && qr.trim().toLowerCase() === "noread")) {
          if (!isProcessingBatch.current) {
            isProcessingBatch.current = true; isBeltRunning.current = false; setBeltStatus(false); controlConveyor(1); stallFiredRef.current = true;
            const msg = "No-read detected! Camera could not decode a QR code. Belt stopped.";
            setIsQtyError(false); setMismatchMsg(msg); setShowErrorPopup(true); toast.error(msg);
            clearBackendQueue().then(() => { isProcessingBatch.current = false; });
          }
          return;
        }

        setCurrentBatchQRs(incoming);
        if (isProcessingBatch.current) return;

        if (data.error) {
          isProcessingBatch.current = true; isBeltRunning.current = false; setBeltStatus(false);
          const got = data.qr_codes?.length ?? 0, exp = stackSizeRef.current;
          const msg = got < exp ? `${exp - got} box(es) missing! Got ${got}, expected ${exp}.` : `${got - exp} extra box(es)! Got ${got}, expected ${exp}.`;
          setIsQtyError(false); setMismatchMsg(msg); setShowErrorPopup(true); toast.error(msg); stallFiredRef.current = true;
          clearBackendQueue().then(() => { isProcessingBatch.current = false; }); return;
        }

        if (data.complete === true && incoming.length > 0) {
          isProcessingBatch.current = true; resetStall();
          if (incoming.some((qr) => syncedQRsRef.current.has(qr))) {
            fetch("http://localhost:5000/api/conveyor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ command: 1 }) }).catch(() => {});
            isBeltRunning.current = false; setBeltStatus(false); setIsQtyError(false);
            setMismatchMsg("Duplicate QR(s) detected! This stack was already scanned. Belt stopped."); setShowErrorPopup(true);
            toast.error("Duplicate QR(s) detected! Stack rejected.");
            clearBackendQueue().then(() => { isProcessingBatch.current = false; }); return;
          }
          const overflow = findOverflowQR(incoming);
          if (overflow) {
            fetch("http://localhost:5000/api/conveyor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ command: 1 }) }).catch(() => {});
            isBeltRunning.current = false; setBeltStatus(false); stallFiredRef.current = true;
            setIsQtyError(true); setMismatchMsg(overflow.reason); setShowErrorPopup(true);
            toast.error(`Belt stopped — ${overflow.reason}`);
            clearBackendQueue().then(() => { isProcessingBatch.current = false; }); return;
          }
          incoming.forEach((qr) => syncedQRsRef.current.add(qr));
          setAllScannedQRs((prev) => { const u = [...prev, ...incoming]; allScannedQRsRef.current = u; return u; });
          toast.success(`✓ Stack of ${incoming.length} queued — belt continuing.`);
          clearBackendQueue().then(() => { resetStall(); isProcessingBatch.current = false; });
        }
      } catch {}
    }, 200);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line

  const clearBackendQueue = async () => {
    try { await fetch("http://localhost:5000/api/qr", { method: "DELETE" }); } catch {}
    setCurrentBatchQRs([]); currentBatchRef.current = []; resetStall();
  };

  const controlConveyor = async (command) => {
    try {
      setPlcError(null);
      const res = await fetch("http://localhost:5000/api/conveyor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ command }) });
      const data = await res.json();
      if (data.success) { isBeltRunning.current = command === 0; setBeltStatus(command === 0); }
      else setPlcError("Failed to communicate with PLC");
    } catch { setPlcError("Make sure Python server is running"); }
  };

  const handleStartConveyor = () => {
    if (!challanVerified) { toast.error("Please verify the challan number before starting."); return; }
    if (!selectedDate)    { toast.error("Please select an inward date before starting."); return; }
    if (ordersData.length === 0) { toast.error("Please select a PO from the dashboard first."); return; }
    isProcessingBatch.current = false; beltStartedAt.current = Date.now();
    resetStall(); clearBackendQueue(); controlConveyor(0);
  };

  const handleStopConveyor = () => {
    isBeltRunning.current = false; setBeltStatus(false); controlConveyor(1);
    if (currentBatchQRs.length > 0 && currentBatchQRs.length < stackSize) { setIsQtyError(false); setShowErrorPopup(true); }
  };

  const handleRescan = () => {
    setShowErrorPopup(false); setIsQtyError(false); stallFiredRef.current = false;
    resetStall(); clearBackendQueue(); controlConveyor(0);
  };

  // ─── Build sync payload — reads looseData/rejectedData with composite keys ─
  const buildSyncPayload = () => {
    const perPOQRs = {};
    ordersData.forEach((o) => { perPOQRs[o.order_code] = []; });
    const rc = {};
    allScannedQRs.forEach((qr) => {
      const { sku } = parseQR(qr);
      const pos = skuToPOsRef.current[sku] || [];
      let assigned = false;
      for (const pe of pos) {
        const k = `${pe.orderCode}::${sku}`;
        if ((rc[k] || 0) < pe.expectedQty) { rc[k] = (rc[k] || 0) + 1; if (perPOQRs[pe.orderCode]) perPOQRs[pe.orderCode].push(qr); assigned = true; break; }
      }
      if (!assigned && pos.length > 0 && perPOQRs[pos[0].orderCode]) perPOQRs[pos[0].orderCode].push(qr);
    });

    const pos = ordersData.map((o) => {
      const qrs = perPOQRs[o.order_code] || [];

      // Loose — filter products belonging to this PO, read by composite key
      const looseSkus = allProducts
        .filter((p) => p.orderCode === o.order_code && (looseData[makeItemKey(p.orderCode, p.sku)]?.qty || 0) > 0)
        .map((p) => {
          const row = looseData[makeItemKey(p.orderCode, p.sku)];
          return { sku_code: p.sku, loose_qty: row.qty };
        });
      const looseLocKey         = looseData.__defaultLoc ?? DEFAULT_LOOSE_LOC;
      const effectiveLooseLoc   = looseSkus.length > 0
        ? (looseData[makeItemKey(o.order_code, looseSkus[0]?.sku_code)]?.location || looseLocKey)
        : looseLocKey;

      // Rejected — same pattern
      const rejectedSkus = allProducts
        .filter((p) => p.orderCode === o.order_code && (rejectedData[makeItemKey(p.orderCode, p.sku)]?.qty || 0) > 0)
        .map((p) => {
          const row = rejectedData[makeItemKey(p.orderCode, p.sku)];
          return { sku_code: p.sku, rejected_qty: row.qty };
        });
      const rejectedLocKey        = rejectedData.__defaultLoc ?? DEFAULT_REJECTED_LOC;
      const effectiveRejectedLoc  = rejectedSkus.length > 0
        ? (rejectedData[makeItemKey(o.order_code, rejectedSkus[0]?.sku_code)]?.location || rejectedLocKey)
        : rejectedLocKey;

      return {
        po_code: o.order_code || "", supplier_code: o.supplier_code || "", warehouse_code: o.plant_code || "",
        product_qrs: { fresh: { storage_location_id: fgLocation, qr_list: qrs } },
        ...(looseSkus.length > 0    && { loose_item:    { storage_location_id: effectiveLooseLoc,    sku_list: looseSkus    } }),
        ...(rejectedSkus.length > 0 && { rejected_item: { storage_location_id: effectiveRejectedLoc, sku_list: rejectedSkus } }),
      };
    });

    return { challan_number: challanNumber, challan_rcv_date: selectedDate, pos };
  };
  // ──────────────────────────────────────────────────────────────────────────

  const handleSync = async () => {
    if (allScannedQRs.length === 0) { toast.error("No QR codes to sync."); return; }
    setIsSyncing(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post("http://wmsbeta.luxkutumb.info/api/sap/inward", buildSyncPayload(), { headers: { Authorization: `Bearer ${token}` } });
      const isSuccess = res.status >= 200 && res.status < 300 && res.data.status !== false && res.data.status !== 0 && res.data.status !== "false" && res.data.status !== "error";
      if (isSuccess) {
        const syncedCount = allScannedQRs.length;
        storageKeys.forEach((key) => { if (key) try { localStorage.removeItem(key); } catch {} });
        ordersData.forEach((o) => { try { localStorage.removeItem(`packed_${o.order_code}`); } catch {} });
        clearSession();
        setAllScannedQRs([]); allScannedQRsRef.current = []; syncedQRsRef.current.clear();
        setShowSyncModal(false); setIsSyncing(false);
        toast.success(`✓ Synced ${syncedCount} QR(s) across ${ordersData.length} PO(s) successfully!`);
      } else { toast.error(res.data.message || res.data.error || "Sync failed. Please try again."); }
    } catch (err) { console.error("Sync error:", err); toast.error("Network error during sync."); }
    finally { setIsSyncing(false); }
  };

  const displayedProducts = useMemo(() =>
    activePOTab === "all" ? allProducts : allProducts.filter((p) => p.orderCode === activePOTab),
  [allProducts, activePOTab]);

  const orderLabel = multiMode ? `${ordersData.length} POs` : primaryOrder ? `PO-${primaryOrder.order_code}` : "Unknown Order";
  const canStart   = challanVerified && !!selectedDate && ordersData.length > 0;

  // Grand total — sum over composite keys, skipping __defaultLoc
  const looseTotalQty    = Object.entries(looseData)
    .filter(([k]) => k !== "__defaultLoc")
    .reduce((s, [, v]) => s + (v?.qty || 0), 0);
  const rejectedTotalQty = Object.entries(rejectedData)
    .filter(([k]) => k !== "__defaultLoc")
    .reduce((s, [, v]) => s + (v?.qty || 0), 0);
  const grandTotal       = totalUnitsScanned + looseTotalQty + rejectedTotalQty;

  if (dataLoading) return <Layout><LoadingSpinner /></Layout>;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto flex flex-col gap-6 pb-10">

        {/* ─── HEADER ─── */}
        <header className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

          {/* Row 1 */}
          <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <div className="flex items-center gap-5 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-200 text-slate-600 shadow-sm shrink-0">
                  <Layers size={20} strokeWidth={1.5} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-sm font-bold text-slate-900 tracking-tight leading-tight">
                      {multiMode ? "Multi-PO Inward" : (primaryOrder ? `PO-${primaryOrder.order_code}` : "Unknown Order")}
                    </h1>
                    {multiMode && <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md uppercase tracking-wide">{ordersData.length} POs</span>}
                    {restoredSession && <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md uppercase tracking-wide">Restored</span>}
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5 leading-tight">
                    {allScannedQRs.length} QRs · {totalUnitsScanned}/{totalPendingUnits} pending units · {currentBatchQRs.length} in batch
                  </p>
                </div>
              </div>

              {/* Stack size selector */}
              <div className="relative">
                <button onClick={() => setIsStackDropdownOpen(!isStackDropdownOpen)}
                  className="cursor-pointer flex items-center gap-2 border border-slate-200 rounded-xl pl-3 pr-2 py-1.5 bg-slate-50 hover:bg-slate-100 outline-none transition-all">
                  <div className="flex flex-col text-left leading-tight">
                    <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase">Stack</span>
                    <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase">Size:</span>
                  </div>
                  <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-3 py-1.5 min-w-[100px] shadow-sm">
                    <span className="text-sm font-bold text-slate-700">{stackSize < 10 ? `0${stackSize}` : stackSize} Items</span>
                    <ChevronDown size={14} className={`text-slate-400 transition-transform ${isStackDropdownOpen ? "rotate-180" : ""}`} />
                  </div>
                </button>
                {isStackDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
                    <div className="py-1">
                      {stackOptions.map((opt) => (
                        <button key={opt} onClick={() => { setStackSize(opt); setIsStackDropdownOpen(false); }}
                          className={`cursor-pointer w-full flex items-center justify-between px-4 py-2.5 transition-colors ${stackSize === opt ? "bg-indigo-50/80 text-indigo-700" : "hover:bg-slate-50 text-slate-600"}`}>
                          <div className="flex items-center gap-3">
                            <CheckCircle size={16} className={stackSize === opt ? "text-indigo-600" : "text-slate-300"} />
                            <span className="text-sm font-medium">{opt < 10 ? `0${opt}` : opt} Items</span>
                          </div>
                          {stackSize === opt && <Check size={16} className="text-indigo-600" />}
                        </button>
                      ))}
                    </div>
                    <div className="border-t border-slate-100 p-4 bg-slate-50/50">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Custom Amount</label>
                      <div className="relative flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
                        <input type="number" placeholder="Qty..." value={customAmount}
                          onChange={(e) => setCustomAmount(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter" && customAmount) { setStackSize(parseInt(customAmount, 10)); setIsStackDropdownOpen(false); setCustomAmount(""); } }}
                          className="cursor-text w-full pl-3 pr-12 py-2 text-sm text-slate-700 outline-none" />
                        <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                          <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-1 rounded">PCS</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {plcError && (
                <span className="text-rose-500 bg-rose-50 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                  <AlertTriangle size={13} /> {plcError}
                </span>
              )}
              <button onClick={() => { if (allScannedQRs.length === 0) { toast.error("No QR codes queued."); return; } setShowSyncModal(true); }}
                className={`cursor-pointer flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm ${allScannedQRs.length > 0 ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200" : "bg-slate-100 text-slate-400 cursor-not-allowed"}`}>
                <Upload size={15} />
                Sync ({allScannedQRs.length})
              </button>
            </div>
          </div>

          <div className="border-t border-slate-100 mx-6" />

          {/* Row 2: Challan + Date + FG Location + Total Count */}
          <div className="px-6 py-4 flex flex-wrap items-start gap-8">

            {/* Challan */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Challan No.</span>
              <div className="flex gap-2 items-center">
                <div className="relative">
                  <input type="text" placeholder="Enter challan number" value={challanNumber}
                    onChange={(e) => { setChallanNumber(e.target.value); if (challanVerified) setChallanVerified(false); setChallanError(""); }}
                    disabled={challanVerified}
                    className={`cursor-text text-sm px-3 rounded-xl border outline-none transition-all pr-8 w-52 h-9 ${
                      challanVerified ? "bg-emerald-50 border-emerald-200 text-emerald-700 cursor-not-allowed"
                      : challanError  ? "border-red-300 bg-red-50 focus:ring-2 focus:ring-red-100"
                      : "border-slate-200 bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
                    }`} />
                  {challanVerified && <ShieldCheck size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-500" />}
                  {challanError && !challanVerified && <ShieldX size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-red-400" />}
                </div>
                {!challanVerified ? (
                  <button onClick={handleVerifyChallan} disabled={isVerifying || !challanNumber.trim()}
                    className="cursor-pointer h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0">
                    {isVerifying ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
                    {isVerifying ? "Verifying…" : "Verify"}
                  </button>
                ) : (
                  <button onClick={() => { setChallanVerified(false); setChallanNumber(""); setChallanError(""); }}
                    className="cursor-pointer h-9 px-4 rounded-xl bg-emerald-100 hover:bg-red-50 text-emerald-700 hover:text-red-600 text-xs font-bold transition-all border border-emerald-200 hover:border-red-200 shrink-0">
                    Change
                  </button>
                )}
              </div>
              <div className="h-4 flex items-center">
                {challanError && <p className="text-[10px] text-red-500 font-medium flex items-center gap-1 leading-none"><AlertCircle size={10} />{challanError}</p>}
                {challanVerified && !challanError && (
                  <p className="text-[10px] text-emerald-600 font-medium flex items-center gap-1 leading-none">
                    <ShieldCheck size={10} />
                    Verified{isChallanCached(challanNumber) ? " (cached)" : ""}
                  </p>
                )}
              </div>
            </div>

            <div className="self-stretch w-px bg-slate-100 shrink-0 my-1" />

            {/* Inward Date */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <CalendarDays size={10} />Inward Date
              </span>
              <input type="date" value={selectedDate} min={earliestOrderDate || undefined} max={today}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="cursor-pointer text-sm px-3 rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all h-9" />
              <div className="h-4 flex items-center">
                {earliestOrderDate && <p className="text-[10px] text-slate-400 font-medium leading-none">{earliestOrderDate} → {today}</p>}
              </div>
            </div>

            <div className="self-stretch w-px bg-slate-100 shrink-0 my-1" />

            {/* FG Storage Location */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <MapPin size={10} />FG Storage Location
              </span>
              <div className="flex gap-2">
                {FG_LOCATIONS.map((loc) => (
                  <button key={loc.id} onClick={() => setFgLocation(loc.id)}
                    className={`cursor-pointer h-9 px-4 rounded-xl border text-xs font-bold transition-all ${
                      fgLocation === loc.id ? "bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-200" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}>
                    {loc.label}
                  </button>
                ))}
              </div>
              <div className="h-4 flex items-center">
                <p className="text-[10px] text-slate-400 font-medium leading-none">{fgLocation === "0011" ? "Vest storage" : "Brief storage"}</p>
              </div>
            </div>

            <div className="self-stretch w-px bg-slate-100 shrink-0 my-1" />

            {/* Total Count */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <Layers size={10} />Total Count
              </span>
              <div className="flex items-center h-9">
                <div className="flex items-center gap-1.5 bg-slate-800 text-white px-4 py-1.5 rounded-xl border border-slate-700">
                  <span className="text-sm font-bold tabular-nums">{grandTotal}</span>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">units</span>
                </div>
              </div>
              <div className="h-4 flex items-center">
                <p className="text-[10px] text-slate-400 font-medium leading-none">Scanned + loose + rejected</p>
              </div>
            </div>

          </div>
        </header>

        {/* ─── BODY ─── */}
        <div className="flex items-start gap-6">

          {/* LEFT */}
          <div className="flex-[1.2] flex flex-col gap-6 min-w-0">
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col" style={{ minHeight: "540px" }}>

              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-slate-900 uppercase">Order Items</h2>
                  <span className="text-xs bg-white border border-slate-200 text-slate-600 font-bold px-2.5 py-1 rounded-md tracking-wide shadow-sm">
                    {totalUnitsScanned} / {totalPendingUnits} pending units
                  </span>
                </div>
                {multiMode && ordersData.length > 1 && (
                  <div className="flex gap-1.5 flex-wrap">
                    <button onClick={() => setActivePOTab("all")}
                      className={`cursor-pointer text-[10px] font-bold px-2.5 py-1 rounded-md border transition-colors ${activePOTab === "all" ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`}>
                      All POs
                    </button>
                    {ordersData.map((order, idx) => {
                      const cc = PO_COLORS[idx % PO_COLORS.length];
                      return (
                        <button key={order.order_code} onClick={() => setActivePOTab(order.order_code)}
                          className={`cursor-pointer text-[10px] font-bold px-2.5 py-1 rounded-md border transition-colors flex items-center gap-1.5 ${activePOTab === order.order_code ? `${cc.bg} ${cc.text} ${cc.border}` : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cc.dot}`} />
                          PO-{order.order_code}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className={`px-5 py-2 border-b border-slate-100 bg-slate-50/30 shrink-0 gap-2 ${multiMode ? "grid grid-cols-[1fr_80px_55px_55px_55px_72px]" : "grid grid-cols-[1fr_55px_55px_55px_72px]"}`}>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">SKU / Name</span>
                {multiMode && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">PO</span>}
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Total</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Rcvd.</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Pending</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Status</span>
              </div>

              <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
                {ordersData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                    <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mb-3"><AlertTriangle size={20} className="text-amber-400" /></div>
                    <p className="text-sm font-semibold text-slate-600">No PO Selected</p>
                    <p className="text-xs text-slate-400 mt-1">Go back to the dashboard and select a purchase order first.</p>
                  </div>
                ) : displayedProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center mb-3"><Scan size={20} className="text-slate-300" /></div>
                    <p className="text-sm font-medium text-slate-400">No items in this PO</p>
                  </div>
                ) : (
                  displayedProducts.map((product, i) => {
                    const displayReceived        = packedPerPO[product.orderCode]?.[product.sku] || 0;
                    const displayPending         = product.qty;
                    const displayTotal           = product.totalQty;
                    const displayAlreadyReceived = product.receivedQty;
                    const isFull = displayPending > 0 && displayReceived >= displayPending;
                    const isOver = displayPending > 0 && displayReceived > displayPending;
                    const pct    = displayPending > 0 ? Math.min(100, Math.round((displayReceived / displayPending) * 100)) : 0;
                    const cc     = PO_COLORS[product.orderIdx % PO_COLORS.length];
                    return (
                      <div key={`${product.orderCode}-${product.sku}-${i}`}
                        className={`px-5 py-3 items-center gap-2 transition-colors ${isOver ? "bg-red-50/60" : isFull ? "bg-emerald-50/40" : "hover:bg-slate-50/60"} ${multiMode ? "grid grid-cols-[1fr_80px_55px_55px_55px_72px]" : "grid grid-cols-[1fr_55px_55px_55px_72px]"}`}>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${isOver ? "bg-red-500" : isFull ? "bg-emerald-500" : displayReceived > 0 ? cc.dot : "bg-slate-200"}`} />
                          <div className="min-w-0">
                            <span className="text-[12px] font-bold text-slate-900 uppercase tracking-tight block truncate">{product.sku}</span>
                            <span className="text-[10px] text-slate-400 block leading-tight truncate">{product.name}</span>
                            {displayReceived > 0 && (
                              <div className="w-full bg-slate-100 rounded-full h-1 mt-1">
                                <div className={`h-1 rounded-full transition-all ${isOver ? "bg-red-400" : isFull ? "bg-emerald-400" : cc.bar}`} style={{ width: `${pct}%` }} />
                              </div>
                            )}
                          </div>
                        </div>
                        {multiMode && <div className="flex justify-center"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${cc.bg} ${cc.text}`}>{product.orderCode}</span></div>}
                        <div className="text-center"><span className="text-[13px] font-bold text-slate-500 tabular-nums">{displayTotal}</span></div>
                        <div className="text-center">
                          <span className={`text-[13px] font-bold tabular-nums ${displayAlreadyReceived > 0 ? "text-emerald-600" : "text-slate-300"}`}>
                            {displayAlreadyReceived > 0 ? displayAlreadyReceived : "—"}
                          </span>
                        </div>
                        <div className="text-center">
                          <span className={`text-[13px] font-bold tabular-nums ${isOver ? "text-red-600" : isFull ? "text-emerald-600" : displayReceived > 0 ? "text-indigo-600" : "text-slate-700"}`}>
                            {displayReceived > 0 ? `${displayReceived}/` : ""}{displayPending}
                          </span>
                        </div>
                        <div className="flex justify-end">
                          {isOver    ? <span className="text-[10px] font-bold bg-red-100 border border-red-200 text-red-700 px-2 py-0.5 rounded-md">Over</span>
                          : isFull   ? <span className="text-[10px] font-bold bg-emerald-100 border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded-md flex items-center gap-1"><Check size={9} />Done</span>
                          : displayReceived > 0 ? <span className="text-[10px] font-bold bg-indigo-50 border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded-md">Partial</span>
                          : displayPending === 0 ? <span className="text-[10px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-600 px-2 py-0.5 rounded-md">Complete</span>
                          : <span className="text-[10px] font-bold bg-slate-50 border border-slate-200 text-slate-400 px-2 py-0.5 rounded-md">Pending</span>}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {allProducts.length > 0 && (
                <div className={`px-5 py-3 border-t border-slate-100 bg-slate-50/50 items-center gap-2 shrink-0 ${multiMode ? "grid grid-cols-[1fr_80px_55px_55px_55px_72px]" : "grid grid-cols-[1fr_55px_55px_55px_72px]"}`}>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total</span>
                  {multiMode && <span />}
                  <span className="text-[12px] font-bold text-slate-500 tabular-nums text-center">{displayedProducts.reduce((s, p) => s + p.totalQty, 0)}</span>
                  <span className="text-[12px] font-bold text-emerald-600 tabular-nums text-center">{displayedProducts.reduce((s, p) => s + p.receivedQty, 0)}</span>
                  <span className="text-[12px] font-bold text-indigo-600 tabular-nums text-center">{totalUnitsScanned}/{displayedProducts.reduce((s, p) => s + p.qty, 0)}</span>
                  <span />
                </div>
              )}
            </section>

            <QuantityPanel title="Loose Items"    icon={Package}  iconBg="bg-amber-50" accentColor="text-amber-600" products={displayedProducts} data={looseData}    onChange={handleLooseChange}    defaultLocation={DEFAULT_LOOSE_LOC}    />
            <QuantityPanel title="Rejected Items" icon={PackageX} iconBg="bg-red-50"   accentColor="text-red-500"   products={displayedProducts} data={rejectedData} onChange={handleRejectedChange} defaultLocation={DEFAULT_REJECTED_LOC} />
          </div>

          {/* RIGHT */}
          <div className="flex-[0.65] flex flex-col gap-4 min-w-0">
            <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col gap-4">

              <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-bold px-2.5 py-1.5 rounded-lg w-fit tracking-widest shadow-sm uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />Live Camera
              </div>

              <div className="relative w-full bg-[#0f172a] rounded-2xl overflow-hidden shadow-inner border border-slate-800 flex items-center justify-center" style={{ aspectRatio: "4/3" }}>
                <FTPCameraFeed />
                <div className="absolute inset-0 opacity-10 pointer-events-none z-10" style={{ backgroundImage: "radial-gradient(#94a3b8 1px, transparent 1px)", backgroundSize: "16px 16px" }} />
                <div className="absolute top-4 left-4 w-5 h-5 border-t-2 border-l-2 border-amber-400 rounded-tl opacity-90 z-20" />
                <div className="absolute top-4 right-4 w-5 h-5 border-t-2 border-r-2 border-amber-400 rounded-tr opacity-90 z-20" />
                <div className="absolute bottom-4 left-4 w-5 h-5 border-b-2 border-l-2 border-amber-400 rounded-bl opacity-90 z-20" />
                <div className="absolute bottom-4 right-4 w-5 h-5 border-b-2 border-r-2 border-amber-400 rounded-br opacity-90 z-20" />
                <div className="absolute left-0 right-0 top-1/2 h-[2px] bg-rose-500 z-30 opacity-80 shadow-[0_0_20px_4px_rgba(244,63,94,0.6)] animate-[pulse_2s_ease-in-out_infinite]" />
                <div className="absolute bottom-3 right-3 z-30 bg-slate-900/70 backdrop-blur-sm border border-slate-700 rounded-lg px-3 py-1.5 text-center">
                  <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold leading-tight">Stack</p>
                  <p className="text-white text-sm font-bold tracking-tight leading-tight">{currentBatchQRs.length}/{stackSize}</p>
                </div>
              </div>

              {(looseTotalQty > 0 || rejectedTotalQty > 0) && (
                <div className="flex items-center gap-2 flex-wrap">
                  {looseTotalQty > 0    && <span className="flex items-center gap-1.5 bg-amber-50 border border-amber-100 text-amber-700 text-[10px] font-bold px-2.5 py-1 rounded-lg"><Package  size={10} />{looseTotalQty} loose units</span>}
                  {rejectedTotalQty > 0 && <span className="flex items-center gap-1.5 bg-red-50   border border-red-100   text-red-600   text-[10px] font-bold px-2.5 py-1 rounded-lg"><PackageX size={10} />{rejectedTotalQty} rejected units</span>}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button onClick={handleStartConveyor} disabled={!canStart}
                  title={!challanVerified ? "Verify challan first" : !selectedDate ? "Select date first" : "Start belt"}
                  className={`flex items-center justify-center gap-2 text-sm font-bold py-2.5 rounded-xl transition-all uppercase border ${canStart ? "cursor-pointer bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100" : "cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200 opacity-60"}`}>
                  <Play size={14} fill="currentColor" />Start
                </button>
                <button onClick={handleStopConveyor} className="cursor-pointer flex items-center justify-center gap-2 bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-100 text-sm font-bold py-2.5 rounded-xl transition-all uppercase">
                  <div className="w-3 h-3 bg-rose-600 rounded-[3px]" />Stop
                </button>
              </div>

              {!canStart ? (
                <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 flex items-start gap-2">
                  <AlertTriangle size={13} className="text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
                    {!challanVerified && !selectedDate ? "Verify challan and select a date to enable scanning."
                      : !challanVerified ? "Verify challan number to enable scanning."
                      : "Select an inward date to enable scanning."}
                  </p>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5 flex items-center gap-2">
                  <CheckCircle size={13} className="text-emerald-500 shrink-0" />
                  <p className="text-[11px] text-emerald-700 font-semibold">Ready to scan — press Start.</p>
                </div>
              )}
            </section>

            <section className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] text-slate-500 uppercase tracking-widest font-bold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />Scanner Log
                </p>
                <div className="flex items-center gap-2">
                  {allScannedQRs.length > 0 && <span className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-600 font-bold px-2 py-0.5 rounded-md uppercase tracking-wide">{allScannedQRs.length} QRs</span>}
                  {allScannedQRs.length > 0 && (
                    <button onClick={() => { setAllScannedQRs([]); allScannedQRsRef.current = []; toast("Queue cleared.", { icon: "🗑️" }); }}
                      className="cursor-pointer text-[10px] border border-rose-100 bg-rose-50 text-rose-600 font-bold px-2 py-0.5 rounded-md uppercase tracking-wide hover:bg-rose-100 transition-colors flex items-center gap-1">
                      <XCircle size={10} /> Clear
                    </button>
                  )}
                </div>
              </div>
              <div className="bg-slate-900 rounded-xl p-3 font-mono overflow-y-auto max-h-[220px] shadow-inner border border-slate-800">
                {allScannedQRs.length === 0 && currentBatchQRs.length === 0 ? (
                  <p className="text-slate-500 text-xs font-medium flex items-center gap-2 uppercase tracking-tight"><span className="animate-pulse">_</span> Waiting for payload...</p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {currentBatchQRs.map((code, index) => (
                      <div key={`live-${index}`} className="flex items-start gap-2 border-b border-slate-800 pb-1.5 last:border-0 last:pb-0">
                        <span className="text-amber-400 text-[10px] font-bold min-w-[32px] pt-0.5 uppercase shrink-0">LIVE</span>
                        <span className="text-amber-300 text-[11px] font-medium tracking-wide break-all">{code}</span>
                      </div>
                    ))}
                    {[...allScannedQRs].reverse().map((code, index) => {
                      const { sku } = parseQR(code);
                      const pos = skuToPOsRef.current[sku] || [];
                      const poLabel = multiMode && pos.length > 0 ? pos[0].orderCode : null;
                      return (
                        <div key={`acc-${index}`} className="flex items-start gap-2 border-b border-slate-800 pb-1.5 last:border-0 last:pb-0">
                          <span className="text-slate-600 text-[10px] font-bold min-w-[28px] pt-0.5 uppercase shrink-0">{(allScannedQRs.length - index).toString().padStart(2, "0")}.</span>
                          <span className="text-emerald-400 text-[11px] font-medium tracking-wide break-all flex-1">{code}</span>
                          {poLabel && <span className="text-slate-500 text-[10px] font-bold shrink-0">{poLabel}</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      <ErrorPopup
        isOpen={showErrorPopup}
        onDismiss={() => { setShowErrorPopup(false); setIsQtyError(false); stallFiredRef.current = false; clearBackendQueue(); }}
        onRescan={handleRescan}
        missingCode={mismatchMsg || `${stackSize - currentBatchQRs.length} Item(s) Missing (${currentBatchQRs.length}/${stackSize} scanned)`}
        hideRescan={isQtyError}
      />
      <SyncModal
        isOpen={showSyncModal}
        onClose={() => setShowSyncModal(false)}
        onConfirm={handleSync}
        totalQRs={allScannedQRs.length}
        totalQty={totalUnitsScanned}
        orderLabel={orderLabel}
        isSyncing={isSyncing}
      />
    </Layout>
  );
};

export default Scanning;