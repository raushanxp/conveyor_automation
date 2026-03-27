import { useState, useEffect, useRef, useMemo } from "react";
import {
  Play,
  CheckCircle,
  ChevronDown,
  AlertTriangle,
  XCircle,
  Check,
  Camera,
  Layers,
  AlertCircle,
  Scan,
  Upload,
  Loader2,
} from "lucide-react";
import Layout from "../components/Layout";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";

/* ─────────────────────────────────────────
   QR PARSER HELPER
   Format: "FW3240XL/2/10/0000k7uc/022026"
   parts[0] = SKU, parts[2] = qty
───────────────────────────────────────── */
const parseQR = (qr) => {
  const parts = qr.split("/");
  const sku = parts[0] || qr;
  const qty = parts.length >= 3 ? (parseInt(parts[2], 10) || 1) : 1;
  return { sku, qty };
};

/* ─────────────────────────────────────────
   PO color palette
───────────────────────────────────────── */
const PO_COLORS = [
  { bg: "bg-indigo-100", text: "text-indigo-700", dot: "bg-indigo-500", bar: "bg-indigo-400", border: "border-indigo-200" },
  { bg: "bg-violet-100", text: "text-violet-700", dot: "bg-violet-500", bar: "bg-violet-400", border: "border-violet-200" },
  { bg: "bg-sky-100",    text: "text-sky-700",    dot: "bg-sky-500",    bar: "bg-sky-400",    border: "border-sky-200"    },
  { bg: "bg-teal-100",   text: "text-teal-700",   dot: "bg-teal-500",   bar: "bg-teal-400",   border: "border-teal-200"   },
  { bg: "bg-pink-100",   text: "text-pink-700",   dot: "bg-pink-500",   bar: "bg-pink-400",   border: "border-pink-200"   },
];

/* ─────────────────────────────────────────
   SYNC CONFIRMATION MODAL
───────────────────────────────────────── */
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
              <span className="font-bold text-indigo-700">{orderLabel}</span>. All POs will be
              submitted together in a single sync.
            </p>
          </div>
        </div>
        <div className="p-6 pt-5 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isSyncing}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isSyncing}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-60 flex items-center gap-2 min-w-[120px] justify-center"
          >
            {isSyncing ? (
              <><Loader2 size={16} className="animate-spin" /> Syncing...</>
            ) : (
              <><Upload size={16} /> Confirm Sync</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────
   ERROR POPUP
   — Shows the actual dynamic `missingCode` message in the header.
   — The detail block below is removed to avoid duplication.
───────────────────────────────────────── */
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
            {/* ✅ FIX: Show the actual dynamic error message here, not a hardcoded string */}
            <p className="text-sm text-slate-600 mt-1.5 leading-relaxed pr-2">
              {missingCode}
            </p>
          </div>
        </div>
        <div className="p-6 pt-5">
          <div className="flex items-center justify-end gap-3">
            <button onClick={onDismiss} className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
              Dismiss
            </button>
            {!hideRescan && (
              <button onClick={onRescan} className="px-5 py-2.5 rounded-xl bg-[#e60000] text-white text-sm font-semibold shadow-[0_6px_16px_rgba(230,0,0,0.25)] hover:bg-red-700 transition-all">
                Rescan Stack
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────
   REUSABLE UI
───────────────────────────────────────── */
const QRScanIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-emerald-500">
    <path d="M4 7V5a1 1 0 011-1h2M4 17v2a1 1 0 001 1h2M20 7V5a1 1 0 00-1-1h-2M20 17v2a1 1 0 01-1 1h-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <rect x="7" y="7" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.5" />
    <rect x="13" y="7" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.5" />
    <rect x="7" y="13" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.5" />
    <path d="M13 13h1M13 16h4M16 13v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

/* ─────────────────────────────────────────
   FTP CAMERA FEED
───────────────────────────────────────── */
const FTPCameraFeed = () => {
  const [imageUrl, setImageUrl] = useState(null);
  const [error, setError] = useState(null);
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
          <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mb-3 backdrop-blur-md shadow-lg">
            <Camera size={24} className="text-slate-400" strokeWidth={1.5} />
          </div>
          <p className="text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase mb-1">External Feed</p>
          <p className="text-xs font-medium text-slate-500 text-center px-4">{error || "Connecting..."}</p>
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────── */
const STALL_TIMEOUT_MS = 400;
const setBeltStatus = (running) => localStorage.setItem("belt_running", running ? "true" : "false");

/* ─────────────────────────────────────────
   MAIN SCANNING COMPONENT
───────────────────────────────────────── */
const Scanning = () => {
  const location = useLocation();
  const navigate = useNavigate();

  /* ── Detect single vs multi mode ── */
  const multiMode = location.state?.multiMode === true;
  const ordersData = multiMode
    ? (location.state?.ordersData || [])
    : (location.state?.orderData ? [location.state.orderData] : []);

  // Primary order for display purposes in single mode
  const primaryOrder = ordersData[0] || null;

  /* ──────────────────────────────────────────────────────
     Build a unified SKU map across ALL orders:
     skuMap[sku] = { name, expectedQty, orderCode, orderIdx }
     In multi-mode, a SKU may appear in multiple POs.
     We store them as an array and fulfill in order.
  ────────────────────────────────────────────────────── */
  const deliveryItemsMapRef = useRef({});
  // skuToPOs[sku] = [ { orderCode, expectedQty, name, orderIdx }, ... ]
  const skuToPOsRef = useRef({});

  const [allProducts, setAllProducts] = useState([]); // flat list for display
  const [totalItemsCount, setTotalItemsCount] = useState(0);

  useEffect(() => {
    const map = {};      // sku -> first PO match (legacy compat)
    const skuToPOs = {}; // sku -> array of PO entries

    const flat = [];

    ordersData.forEach((order, orderIdx) => {
      let parsedItems = order.items;
      if (typeof parsedItems === "string") {
        try { parsedItems = JSON.parse(parsedItems); } catch { parsedItems = []; }
      }
      if (!Array.isArray(parsedItems)) parsedItems = [];

      parsedItems.forEach((item) => {
        const sku = item.sku || "N/A";
        const entry = {
          orderCode: order.order_code,
          orderIdx,
          name: item.name || "Unknown Item",
          expectedQty: item.qty || 0,
        };

        if (!skuToPOs[sku]) skuToPOs[sku] = [];
        skuToPOs[sku].push(entry);

        // For backward compat — primary match
        if (!map[sku]) map[sku] = entry;

        flat.push({
          name: item.name || "Unknown Item",
          sku,
          qty: item.qty || 0,
          orderCode: order.order_code,
          orderIdx,
        });
      });
    });

    deliveryItemsMapRef.current = map;
    skuToPOsRef.current = skuToPOs;
    setAllProducts(flat);
    setTotalItemsCount(flat.length);
  }, []);  // eslint-disable-line

  useEffect(() => { return () => setBeltStatus(false); }, []);

  /* ── Per-PO storage keys ── */
  const storageKeys = useMemo(
    () => ordersData.map((o) => (o.order_code ? `scanning_qrs_${o.order_code}` : null)),
    [] // eslint-disable-line
  );

  /* ── State ── */
  const [plcError, setPlcError]               = useState(null);
  const [isStackDropdownOpen, setIsStackDropdownOpen] = useState(false);
  const [stackSize, setStackSize]             = useState(6);
  const [customAmount, setCustomAmount]       = useState("");
  const stackOptions                          = [1, 2, 3, 4, 5, 6];
  const [currentBatchQRs, setCurrentBatchQRs] = useState([]);
  const [allScannedQRs, setAllScannedQRs]     = useState([]);
  const [showErrorPopup, setShowErrorPopup]   = useState(false);
  const [mismatchMsg, setMismatchMsg]         = useState("");
  const [isQtyError, setIsQtyError]           = useState(false);
  const [showSyncModal, setShowSyncModal]     = useState(false);
  const [isSyncing, setIsSyncing]             = useState(false);
  const [activePOTab, setActivePOTab]         = useState("all"); // "all" or order_code

  /* ── Refs ── */
  const isBeltRunning       = useRef(false);
  const isProcessingBatch   = useRef(false);
  const syncedQRsRef        = useRef(new Set());
  const stackSizeRef        = useRef(stackSize);
  const lastQRArrivedAt     = useRef(null);
  const prevBatchLengthRef  = useRef(0);
  const stallFiredRef       = useRef(false);
  const currentBatchRef     = useRef([]);
  const showErrorPopupRef   = useRef(false);
  const beltStartedAt       = useRef(null);
  const allScannedQRsRef    = useRef([]);

  /* ── Restore QRs from localStorage (all POs) ── */
  useEffect(() => {
    const allRestored = [];
    storageKeys.forEach((key) => {
      if (!key) return;
      try {
        const saved = localStorage.getItem(key);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) allRestored.push(...parsed);
        }
      } catch {}
    });
    if (allRestored.length > 0) {
      setAllScannedQRs(allRestored);
      allScannedQRsRef.current = allRestored;
      allRestored.forEach((qr) => syncedQRsRef.current.add(qr));
      toast(`↺ Restored ${allRestored.length} QR(s) from last session.`, { icon: "💾" });
    }
  }, []); // eslint-disable-line

  /* ── Persist QRs to localStorage per-PO on every change ── */
  useEffect(() => {
    if (ordersData.length === 0) return;

    const perPOQRs = {};
    ordersData.forEach((o) => { perPOQRs[o.order_code] = []; });

    const runningCounts = {};
    allScannedQRs.forEach((qr) => {
      const { sku } = parseQR(qr);
      const pos = skuToPOsRef.current[sku] || [];
      let assigned = false;
      for (const poEntry of pos) {
        const key = `${poEntry.orderCode}::${sku}`;
        const cur = runningCounts[key] || 0;
        if (cur < poEntry.expectedQty) {
          runningCounts[key] = cur + 1;
          if (perPOQRs[poEntry.orderCode]) perPOQRs[poEntry.orderCode].push(qr);
          assigned = true;
          break;
        }
      }
      if (!assigned && pos.length > 0 && perPOQRs[pos[0].orderCode]) {
        perPOQRs[pos[0].orderCode].push(qr);
      }
    });

    storageKeys.forEach((key, idx) => {
      if (!key) return;
      const poCode = ordersData[idx]?.order_code;
      const qrs = perPOQRs[poCode] || [];
      try {
        if (qrs.length > 0) localStorage.setItem(key, JSON.stringify(qrs));
        else localStorage.removeItem(key);
      } catch {}
    });
  }, [allScannedQRs]); // eslint-disable-line

  /* ── Packed counts per PO — single source of truth for display ──
     ✅ FIX: packedPerPO is now the authoritative count for all display
     purposes. Each QR is assigned to exactly ONE PO in sequence,
     so the same SKU in two POs won't double-count.
  ── */
  const packedPerPO = useMemo(() => {
    const result = {};
    ordersData.forEach((o) => { result[o.order_code] = {}; });

    const runningCounts = {}; // `${orderCode}::${sku}` -> qty assigned so far
    allScannedQRs.forEach((qr) => {
      const { sku, qty } = parseQR(qr);
      const pos = skuToPOsRef.current[sku] || [];
      let assigned = false;
      for (const poEntry of pos) {
        const key = `${poEntry.orderCode}::${sku}`;
        const cur = runningCounts[key] || 0;
        if (cur < poEntry.expectedQty) {
          runningCounts[key] = cur + qty;
          if (result[poEntry.orderCode]) {
            result[poEntry.orderCode][sku] = (result[poEntry.orderCode][sku] || 0) + qty;
          }
          assigned = true;
          break;
        }
      }
      // overflow → first PO
      if (!assigned && pos.length > 0 && result[pos[0].orderCode]) {
        result[pos[0].orderCode][sku] = (result[pos[0].orderCode][sku] || 0) + qty;
      }
    });
    return result;
  }, [allScannedQRs]); // eslint-disable-line

  /* ── Global total units scanned — derived from packedPerPO ── */
  const totalUnitsScanned = useMemo(() => {
    return Object.values(packedPerPO).reduce((total, poMap) => {
      return total + Object.values(poMap).reduce((s, v) => s + v, 0);
    }, 0);
  }, [packedPerPO]);

  /* ── Sync ref wiring ── */
  useEffect(() => { stackSizeRef.current = stackSize; }, [stackSize]);
  useEffect(() => { currentBatchRef.current   = currentBatchQRs; }, [currentBatchQRs]);
  useEffect(() => { showErrorPopupRef.current  = showErrorPopup;  }, [showErrorPopup]);
  useEffect(() => { allScannedQRsRef.current   = allScannedQRs;   }, [allScannedQRs]);

  useEffect(() => {
    fetch("http://localhost:5000/api/stack-size", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stack_size: stackSize }),
    }).catch(() => {});
  }, [stackSize]);

  const resetStall = () => {
    lastQRArrivedAt.current    = null;
    prevBatchLengthRef.current = 0;
    stallFiredRef.current      = false;
  };

  /* ── Quantity gate — works across ALL POs ── */
  const findOverflowQR = (incomingQRs) => {
    // Build running counts on top of already-accepted QRs
    const tempCounts = {}; // `${orderCode}::${sku}` -> count
    allScannedQRsRef.current.forEach((qr) => {
      const { sku, qty } = parseQR(qr);
      const pos = skuToPOsRef.current[sku] || [];
      let assigned = false;
      for (const poEntry of pos) {
        const key = `${poEntry.orderCode}::${sku}`;
        const cur = tempCounts[key] || 0;
        if (cur < poEntry.expectedQty) {
          tempCounts[key] = cur + qty;
          assigned = true;
          break;
        }
      }
      if (!assigned && pos.length > 0) {
        const key = `${pos[0].orderCode}::${sku}`;
        tempCounts[key] = (tempCounts[key] || 0) + qty;
      }
    });

    for (const qr of incomingQRs) {
      const { sku, qty } = parseQR(qr);
      const pos = skuToPOsRef.current[sku] || [];

      if (pos.length === 0) {
        return { qr, sku, reason: `SKU ${sku} is not in any of the selected POs.` };
      }

      // Try to assign to a PO that still has capacity
      let placed = false;
      for (const poEntry of pos) {
        const key = `${poEntry.orderCode}::${sku}`;
        const cur = tempCounts[key] || 0;
        if (cur + qty <= poEntry.expectedQty) {
          tempCounts[key] = cur + qty;
          placed = true;
          break;
        }
      }

      if (!placed) {
        const itemName = pos[0].name || sku;
        const totalExpected = pos.reduce((s, p) => s + p.expectedQty, 0);
        const totalFulfilled = pos.reduce((s, p) => {
          const key = `${p.orderCode}::${sku}`;
          return s + (tempCounts[key] || 0);
        }, 0);
        return {
          qr, sku,
          reason: `Quantity fulfilled for ${sku} (${itemName}) across all POs. Total expected: ${totalExpected}, would reach: ${totalFulfilled + qty}.`,
        };
      }
    }
    return null;
  };

  /* ── Stall detector ── */
  useEffect(() => {
    const stallInterval = setInterval(() => {
      if (beltStartedAt.current && Date.now() - beltStartedAt.current < 500) return;
      const batch    = currentBatchRef.current;
      const batchLen = batch.length;
      if (batchLen > prevBatchLengthRef.current) {
        lastQRArrivedAt.current    = Date.now();
        prevBatchLengthRef.current = batchLen;
        stallFiredRef.current      = false;
        return;
      }
      if (batchLen === 0 || batchLen >= stackSizeRef.current || isProcessingBatch.current ||
          showErrorPopupRef.current || stallFiredRef.current || lastQRArrivedAt.current === null) return;
      if (Date.now() - lastQRArrivedAt.current >= STALL_TIMEOUT_MS) {
        stallFiredRef.current     = true;
        isProcessingBatch.current = true;
        isBeltRunning.current     = false;
        setBeltStatus(false);
        const msg = `${stackSizeRef.current - batchLen} box(es) missing! Got ${batchLen}, expected ${stackSizeRef.current}.`;
        setIsQtyError(false);
        setMismatchMsg(msg);
        setShowErrorPopup(true);
        toast.error(msg);
        clearBackendQueue().then(() => { isProcessingBatch.current = false; });
      }
    }, 200);
    return () => clearInterval(stallInterval);
  }, []); // eslint-disable-line

  /* ── Poll QR backend ── */
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch("http://localhost:5000/api/qr");
        const data     = await response.json();
        if (!data.qr_codes) return;

        const incoming = data.qr_codes;

        if (Array.isArray(incoming) && incoming.some((qr) => typeof qr === "string" && qr.trim().toLowerCase() === "noread")) {
          if (!isProcessingBatch.current) {
            isProcessingBatch.current = true;
            isBeltRunning.current     = false;
            setBeltStatus(false);
            controlConveyor(1);
            stallFiredRef.current = true;
            const msg = "No-read detected! Camera could not decode a QR code. Belt stopped.";
            setIsQtyError(false);
            setMismatchMsg(msg);
            setShowErrorPopup(true);
            toast.error(msg);
            clearBackendQueue().then(() => { isProcessingBatch.current = false; });
          }
          return;
        }

        setCurrentBatchQRs(incoming);
        if (isProcessingBatch.current) return;

        if (data.error) {
          isProcessingBatch.current = true;
          isBeltRunning.current     = false;
          setBeltStatus(false);
          const got  = data.qr_codes?.length ?? 0;
          const exp  = stackSizeRef.current;
          const msg  = got < exp ? `${exp - got} box(es) missing! Got ${got}, expected ${exp}.`
                                 : `${got - exp} extra box(es)! Got ${got}, expected ${exp}.`;
          setIsQtyError(false);
          setMismatchMsg(msg);
          setShowErrorPopup(true);
          toast.error(msg);
          stallFiredRef.current = true;
          clearBackendQueue().then(() => { isProcessingBatch.current = false; });
          return;
        }

        if (data.complete === true && incoming.length > 0) {
          isProcessingBatch.current = true;
          resetStall();

          const hasDuplicate = incoming.some((qr) => syncedQRsRef.current.has(qr));
          if (hasDuplicate) {
            fetch("http://localhost:5000/api/conveyor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ command: 1 }) }).catch(() => {});
            isBeltRunning.current = false;
            setBeltStatus(false);
            setIsQtyError(false);
            setMismatchMsg("Duplicate QR(s) detected! This stack was already scanned. Belt stopped.");
            setShowErrorPopup(true);
            toast.error("Duplicate QR(s) detected! Stack rejected.");
            clearBackendQueue().then(() => { isProcessingBatch.current = false; });
            return;
          }

          const overflow = findOverflowQR(incoming);
          if (overflow) {
            fetch("http://localhost:5000/api/conveyor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ command: 1 }) }).catch(() => {});
            isBeltRunning.current = false;
            setBeltStatus(false);
            stallFiredRef.current = true;
            setIsQtyError(true);
            setMismatchMsg(overflow.reason);
            setShowErrorPopup(true);
            toast.error(`Belt stopped — ${overflow.reason}`);
            clearBackendQueue().then(() => { isProcessingBatch.current = false; });
            return;
          }

          incoming.forEach((qr) => syncedQRsRef.current.add(qr));
          setAllScannedQRs((prev) => {
            const updated = [...prev, ...incoming];
            allScannedQRsRef.current = updated;
            return updated;
          });
          toast.success(`✓ Stack of ${incoming.length} queued — belt continuing.`);
          clearBackendQueue().then(() => { resetStall(); isProcessingBatch.current = false; });
        }
      } catch {}
    }, 200);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line

  const clearBackendQueue = async () => {
    try { await fetch("http://localhost:5000/api/qr", { method: "DELETE" }); } catch {}
    setCurrentBatchQRs([]);
    currentBatchRef.current = [];
    resetStall();
  };

  const controlConveyor = async (command) => {
    try {
      setPlcError(null);
      const response = await fetch("http://localhost:5000/api/conveyor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command }),
      });
      const data = await response.json();
      if (data.success) { isBeltRunning.current = command === 0; setBeltStatus(command === 0); }
      else setPlcError("Failed to communicate with PLC");
    } catch { setPlcError("Make sure Python server is running"); }
  };

  const handleStopConveyor = () => {
    isBeltRunning.current = false;
    setBeltStatus(false);
    controlConveyor(1);
    if (currentBatchQRs.length > 0 && currentBatchQRs.length < stackSize) {
      setIsQtyError(false);
      setShowErrorPopup(true);
    }
  };

  const handleRescan = () => {
    setShowErrorPopup(false);
    setIsQtyError(false);
    stallFiredRef.current = false;
    resetStall();
    clearBackendQueue();
    controlConveyor(0);
  };

  /* ── Multi-PO Sync: send one payload per PO ── */
  const handleSync = async () => {
    if (allScannedQRs.length === 0) { toast.error("No QR codes to sync."); return; }
    setIsSyncing(true);
    try {
      const token = localStorage.getItem("token");

      // Group QRs per PO (same logic as persistence)
      const perPOQRs = {};
      ordersData.forEach((o) => { perPOQRs[o.order_code] = []; });
      const runningCounts = {};
      allScannedQRs.forEach((qr) => {
        const { sku } = parseQR(qr);
        const pos = skuToPOsRef.current[sku] || [];
        let assigned = false;
        for (const poEntry of pos) {
          const key = `${poEntry.orderCode}::${sku}`;
          const cur = runningCounts[key] || 0;
          if (cur < poEntry.expectedQty) {
            runningCounts[key] = cur + 1;
            if (perPOQRs[poEntry.orderCode]) perPOQRs[poEntry.orderCode].push(qr);
            assigned = true;
            break;
          }
        }
        if (!assigned && pos.length > 0 && perPOQRs[pos[0].orderCode]) {
          perPOQRs[pos[0].orderCode].push(qr);
        }
      });

      // Build payload: one entry per PO that has QRs
      const payload = ordersData
        .filter((o) => (perPOQRs[o.order_code] || []).length > 0)
        .map((o) => ({
          po_code:        o.order_code    || "",
          supplier_code:  o.supplier_code || "",
          warehouse_code: o.plant_code    || "",
          product_qrs:    perPOQRs[o.order_code],
        }));

      const res = await axios.post(
        "http://wmsbeta.luxkutumb.info/api/sap/inward",
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const isSuccess = res.status >= 200 && res.status < 300 &&
        res.data.status !== false && res.data.status !== 0 &&
        res.data.status !== "false" && res.data.status !== "error";

      if (isSuccess) {
        const syncedCount = allScannedQRs.length;
        storageKeys.forEach((key) => { if (key) try { localStorage.removeItem(key); } catch {} });
        ordersData.forEach((o) => {
          try { localStorage.removeItem(`packed_${o.order_code}`); } catch {}
        });
        setAllScannedQRs([]);
        allScannedQRsRef.current = [];
        syncedQRsRef.current.clear();
        setShowSyncModal(false);
        setIsSyncing(false);
        toast.success(`✓ Synced ${syncedCount} QR(s) across ${ordersData.length} PO(s) successfully!`);
      } else {
        toast.error(res.data.message || res.data.error || "Sync failed. Please try again.");
      }
    } catch (err) {
      console.error("Sync error:", err);
      toast.error("Network error during sync.");
    } finally {
      setIsSyncing(false);
    }
  };

  /* ── Products to show based on active tab ── */
  const displayedProducts = useMemo(() => {
    if (activePOTab === "all") return allProducts;
    return allProducts.filter((p) => p.orderCode === activePOTab);
  }, [allProducts, activePOTab]);

  const latestQR = currentBatchQRs.length > 0 ? currentBatchQRs[currentBatchQRs.length - 1] : null;

  const orderLabel = multiMode
    ? `${ordersData.length} POs`
    : primaryOrder ? `PO-${primaryOrder.order_code}` : "Unknown Order";

  return (
    <Layout>
      <div className="max-w-7xl mx-auto flex flex-col gap-6 pb-10">

        {/* ─── HEADER ─── */}
        <header className="bg-white rounded-2xl border border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between shadow-sm gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-200 text-slate-600 shadow-sm">
                <Layers size={22} strokeWidth={1.5} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold text-slate-900 tracking-tight">
                    {multiMode ? `Multi-PO Inward` : (primaryOrder ? `PO-${primaryOrder.order_code}` : "Unknown Order")}
                  </h1>
                  {multiMode && (
                    <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md uppercase tracking-wide">
                      {ordersData.length} POs
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500 font-medium mt-0.5">
                  {allScannedQRs.length} QRs queued · {totalUnitsScanned} units · {currentBatchQRs.length} in batch
                </p>
              </div>
            </div>

            {/* Stack size selector */}
            <div className="relative ml-2">
              <button
                onClick={() => setIsStackDropdownOpen(!isStackDropdownOpen)}
                className="flex items-center gap-3 border border-slate-200 rounded-xl pl-3 pr-2 py-1.5 bg-slate-50 hover:bg-slate-100 outline-none transition-all"
              >
                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-bold text-slate-500 leading-tight tracking-wider uppercase">Stack</span>
                  <span className="text-[10px] font-bold text-slate-500 leading-tight tracking-wider uppercase">Size:</span>
                </div>
                <div className="flex items-center justify-between gap-4 bg-white border border-slate-200 rounded-lg px-3 py-1.5 min-w-[110px] shadow-sm">
                  <span className="text-sm font-bold text-slate-700">{stackSize < 10 ? `0${stackSize}` : stackSize} Items</span>
                  <ChevronDown size={16} className={`text-slate-400 transition-transform ${isStackDropdownOpen ? "rotate-180" : ""}`} />
                </div>
              </button>
              {isStackDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
                  <div className="py-1">
                    {stackOptions.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => { setStackSize(opt); setIsStackDropdownOpen(false); }}
                        className={`w-full flex items-center justify-between px-4 py-2.5 transition-colors ${stackSize === opt ? "bg-indigo-50/80 text-indigo-700" : "hover:bg-slate-50 text-slate-600"}`}
                      >
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
                      <input
                        type="number"
                        placeholder="Qty..."
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && customAmount) {
                            setStackSize(parseInt(customAmount, 10));
                            setIsStackDropdownOpen(false);
                            setCustomAmount("");
                          }
                        }}
                        className="w-full pl-3 pr-12 py-2 text-sm text-slate-700 outline-none"
                      />
                      <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                        <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-1 rounded">PCS</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: stats + sync */}
          <div className="flex items-center gap-4">
            {plcError && (
              <span className="text-rose-500 bg-rose-50 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2">
                <AlertTriangle size={14} /> {plcError}
              </span>
            )}
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-slate-900 leading-none">{totalItemsCount}</span>
              <span className="w-px h-8 bg-slate-200 mx-1" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Total<br />SKUs</span>
            </div>
            <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
              <span className="text-2xl font-bold text-indigo-600 leading-none">{totalUnitsScanned}</span>
              <span className="w-px h-8 bg-slate-200 mx-1" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Units<br />Scanned</span>
            </div>
            <button
              onClick={() => {
                if (allScannedQRs.length === 0) { toast.error("No QR codes queued."); return; }
                setShowSyncModal(true);
              }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm ${
                allScannedQRs.length > 0
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
              }`}
            >
              <Upload size={15} />
              Sync ({allScannedQRs.length})
            </button>
          </div>
        </header>

        {/* ─── BODY ─── */}
        <div className="flex items-start gap-6">

          {/* LEFT COLUMN — PO Items with scan progress */}
          <div className="flex-[0.9] flex flex-col gap-6">
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col" style={{ minHeight: "520px" }}>

              {/* Header + PO tabs */}
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-slate-900 uppercase">Order Items</h2>
                  <span className="text-xs bg-white border border-slate-200 text-slate-600 font-bold px-2.5 py-1 rounded-md tracking-wide shadow-sm">
                    {totalUnitsScanned} / {allProducts.reduce((s, p) => s + p.qty, 0)} units
                  </span>
                </div>

                {/* PO filter tabs — only in multi mode */}
                {multiMode && ordersData.length > 1 && (
                  <div className="flex gap-1.5 flex-wrap">
                    <button
                      onClick={() => setActivePOTab("all")}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-md border transition-colors ${
                        activePOTab === "all"
                          ? "bg-slate-800 text-white border-slate-800"
                          : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      All POs
                    </button>
                    {ordersData.map((order, idx) => {
                      const cc = PO_COLORS[idx % PO_COLORS.length];
                      return (
                        <button
                          key={order.order_code}
                          onClick={() => setActivePOTab(order.order_code)}
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-md border transition-colors flex items-center gap-1.5 ${
                            activePOTab === order.order_code
                              ? `${cc.bg} ${cc.text} ${cc.border}`
                              : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${cc.dot}`} />
                          PO-{order.order_code}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Column headers */}
              <div className={`px-5 py-2 border-b border-slate-100 bg-slate-50/30 shrink-0 gap-2 ${multiMode ? "grid grid-cols-[1fr_80px_60px_60px_72px]" : "grid grid-cols-[1fr_60px_60px_72px]"}`}>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">SKU / Name</span>
                {multiMode && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">PO</span>}
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Exp.</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Rcvd.</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Status</span>
              </div>

              <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
                {ordersData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                    <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mb-3">
                      <AlertTriangle size={20} className="text-amber-400" />
                    </div>
                    <p className="text-sm font-semibold text-slate-600">No PO Selected</p>
                    <p className="text-xs text-slate-400 mt-1">Go back to the dashboard and select a purchase order first.</p>
                  </div>
                ) : displayedProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center mb-3">
                      <Scan size={20} className="text-slate-300" />
                    </div>
                    <p className="text-sm font-medium text-slate-400">No items in this PO</p>
                  </div>
                ) : (
                  displayedProducts.map((product, i) => {
                    // ✅ FIX: Always use per-PO packed count — never the global cross-PO sum.
                    // This ensures PO-A and PO-B with the same SKU each show their own tally.
                    const displayReceived = packedPerPO[product.orderCode]?.[product.sku] || 0;
                    const displayExpected = product.qty;

                    const isFull   = displayExpected > 0 && displayReceived >= displayExpected;
                    const isOver   = displayExpected > 0 && displayReceived > displayExpected;
                    const pct      = displayExpected > 0 ? Math.min(100, Math.round((displayReceived / displayExpected) * 100)) : 0;
                    const cc       = PO_COLORS[product.orderIdx % PO_COLORS.length];

                    return (
                      <div
                        key={`${product.orderCode}-${product.sku}-${i}`}
                        className={`px-5 py-3 items-center gap-2 transition-colors ${
                          isOver ? "bg-red-50/60" : isFull ? "bg-emerald-50/40" : "hover:bg-slate-50/60"
                        } ${multiMode ? "grid grid-cols-[1fr_80px_60px_60px_72px]" : "grid grid-cols-[1fr_60px_60px_72px]"}`}
                      >
                        {/* SKU + name */}
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${
                            isOver ? "bg-red-500" : isFull ? "bg-emerald-500" : displayReceived > 0 ? cc.dot : "bg-slate-200"
                          }`} />
                          <div className="min-w-0">
                            <span className="text-[12px] font-bold text-slate-900 uppercase tracking-tight block truncate">{product.sku}</span>
                            <span className="text-[10px] text-slate-400 block leading-tight truncate">{product.name}</span>
                            {displayReceived > 0 && (
                              <div className="w-full bg-slate-100 rounded-full h-1 mt-1">
                                <div
                                  className={`h-1 rounded-full transition-all ${isOver ? "bg-red-400" : isFull ? "bg-emerald-400" : cc.bar}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* PO badge — multi mode only */}
                        {multiMode && (
                          <div className="flex justify-center">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${cc.bg} ${cc.text}`}>
                              {product.orderCode}
                            </span>
                          </div>
                        )}

                        {/* Expected */}
                        <div className="text-center">
                          <span className="text-[13px] font-bold text-slate-700 tabular-nums">{displayExpected}</span>
                        </div>

                        {/* Received */}
                        <div className="text-center">
                          <span className={`text-[13px] font-bold tabular-nums ${
                            isOver ? "text-red-600" : isFull ? "text-emerald-600" : displayReceived > 0 ? "text-indigo-600" : "text-slate-300"
                          }`}>
                            {displayReceived > 0 ? displayReceived : "—"}
                          </span>
                        </div>

                        {/* Status */}
                        <div className="flex justify-end">
                          {isOver ? (
                            <span className="text-[10px] font-bold bg-red-100 border border-red-200 text-red-700 px-2 py-0.5 rounded-md">Over</span>
                          ) : isFull ? (
                            <span className="text-[10px] font-bold bg-emerald-100 border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <Check size={9} />Done
                            </span>
                          ) : displayReceived > 0 ? (
                            <span className="text-[10px] font-bold bg-indigo-50 border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded-md">Partial</span>
                          ) : (
                            <span className="text-[10px] font-bold bg-slate-50 border border-slate-200 text-slate-400 px-2 py-0.5 rounded-md">Pending</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer totals */}
              {allProducts.length > 0 && (
                <div className={`px-5 py-3 border-t border-slate-100 bg-slate-50/50 items-center gap-2 shrink-0 ${multiMode ? "grid grid-cols-[1fr_80px_60px_60px_72px]" : "grid grid-cols-[1fr_60px_60px_72px]"}`}>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total</span>
                  {multiMode && <span />}
                  <span className="text-[12px] font-bold text-slate-700 tabular-nums text-center">
                    {displayedProducts.reduce((s, p) => s + p.qty, 0)}
                  </span>
                  <span className="text-[12px] font-bold text-indigo-600 tabular-nums text-center">{totalUnitsScanned}</span>
                  <span />
                </div>
              )}
            </section>
          </div>

          {/* RIGHT COLUMN */}
          <div className="flex-[1.2] flex flex-col gap-6">

            {/* Camera + controls */}
            <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col">
              <div className="flex gap-6">
                <div className="flex flex-col w-[35%] shrink-0">
                  <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-bold px-2.5 py-1.5 rounded-lg w-fit mb-5 tracking-widest shadow-sm uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />Live Camera
                  </div>
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => {
                        if (ordersData.length === 0) { toast.error("Please select a PO from the dashboard first."); return; }
                        isProcessingBatch.current = false;
                        beltStartedAt.current = Date.now();
                        resetStall();
                        clearBackendQueue();
                        controlConveyor(0);
                      }}
                      disabled={ordersData.length === 0}
                      className={`w-full flex items-center justify-center gap-2 text-sm font-bold py-3 rounded-xl transition-all uppercase border ${
                        ordersData.length > 0
                          ? "bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100 cursor-pointer"
                          : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                      }`}
                    >
                      <Play size={16} fill="currentColor" />Start
                    </button>
                    <button
                      onClick={handleStopConveyor}
                      className="w-full flex items-center justify-center gap-2 bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-100 text-sm font-bold py-3 rounded-xl transition-all uppercase cursor-pointer"
                    >
                      <div className="w-3 h-3 bg-rose-600 rounded-[3px]" />Stop
                    </button>
                  </div>
                </div>

                {/* Camera view */}
                <div className="flex-1 relative aspect-square max-h-[250px] w-full bg-[#0f172a] rounded-2xl overflow-hidden shadow-inner border border-slate-800 flex items-center justify-center">
                  <FTPCameraFeed />
                  <div className="absolute inset-0 opacity-10 pointer-events-none z-10" style={{ backgroundImage: "radial-gradient(#94a3b8 1px, transparent 1px)", backgroundSize: "16px 16px" }} />
                  <div className="absolute top-5 left-5 w-6 h-6 border-t-2 border-l-2 border-amber-400 rounded-tl opacity-90 z-20" />
                  <div className="absolute top-5 right-5 w-6 h-6 border-t-2 border-r-2 border-amber-400 rounded-tr opacity-90 z-20" />
                  <div className="absolute bottom-5 left-5 w-6 h-6 border-b-2 border-l-2 border-amber-400 rounded-bl opacity-90 z-20" />
                  <div className="absolute bottom-5 right-5 w-6 h-6 border-b-2 border-r-2 border-amber-400 rounded-br opacity-90 z-20" />
                  <div className="absolute left-0 right-0 top-1/2 h-[2px] bg-rose-500 z-30 opacity-80 shadow-[0_0_20px_4px_rgba(244,63,94,0.6)] animate-[pulse_2s_ease-in-out_infinite]" />
                </div>
              </div>

              {/* Detected object footer */}
              <div className="flex flex-row items-end justify-between mt-6 pt-6 border-t border-slate-100">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1.5">Detected Object</p>
                  <p className="text-slate-900 text-lg font-bold leading-tight mb-2 tracking-tight uppercase">
                    {latestQR
                      ? (deliveryItemsMapRef.current[parseQR(latestQR).sku]?.name || parseQR(latestQR).sku)
                      : allProducts.length > 0 ? allProducts[0].name : "—"}
                  </p>
                  {/* Show which PO the latest QR belongs to */}
                  {latestQR && (() => {
                    const { sku } = parseQR(latestQR);
                    const pos = skuToPOsRef.current[sku] || [];
                    if (pos.length > 0 && multiMode) {
                      const poEntry = pos[0];
                      const idx = ordersData.findIndex((o) => o.order_code === poEntry.orderCode);
                      const cc = PO_COLORS[idx >= 0 ? idx % PO_COLORS.length : 0];
                      return (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md mb-2 inline-block ${cc.bg} ${cc.text}`}>
                          → PO-{poEntry.orderCode}
                        </span>
                      );
                    }
                    return null;
                  })()}
                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-md w-fit">
                    <QRScanIcon />
                    <span className="text-emerald-600 text-xs font-bold tracking-wide uppercase">
                      {latestQR || "Waiting..."}
                    </span>
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-3.5 text-center shadow-sm">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Items in Stack</p>
                  <p className="text-slate-900 text-lg font-bold tracking-tight">{currentBatchQRs.length} / {stackSize}</p>
                </div>
              </div>
            </section>

            {/* LIVE SCANNER LOG */}
            <section className="w-full bg-white rounded-2xl p-6 border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[11px] text-slate-500 uppercase tracking-widest font-bold flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  Live Scanner Log
                </p>
                <div className="flex items-center gap-3">
                  {allScannedQRs.length > 0 && (
                    <span className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-600 font-bold px-2.5 py-1 rounded-md uppercase tracking-wide">
                      {allScannedQRs.length} QRs queued
                    </span>
                  )}
                  {allScannedQRs.length > 0 && (
                    <button
                      onClick={() => { setAllScannedQRs([]); allScannedQRsRef.current = []; toast("Queue cleared.", { icon: "🗑️" }); }}
                      className="text-[10px] border border-rose-100 bg-rose-50 text-rose-600 font-bold px-2.5 py-1 rounded-md uppercase tracking-wide hover:bg-rose-100 transition-colors flex items-center gap-1.5"
                    >
                      <XCircle size={11} /> Clear
                    </button>
                  )}
                </div>
              </div>
              <div className="bg-slate-900 rounded-xl p-4 font-mono flex-1 overflow-y-auto max-h-[200px] shadow-inner border border-slate-800">
                {allScannedQRs.length === 0 && currentBatchQRs.length === 0 ? (
                  <p className="text-slate-500 text-sm font-medium flex items-center gap-2 uppercase tracking-tight">
                    <span className="animate-pulse">_</span> Waiting for payload...
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {currentBatchQRs.map((code, index) => (
                      <div key={`live-${index}`} className="flex items-start gap-3 border-b border-slate-800 pb-2 last:border-0 last:pb-0">
                        <span className="text-amber-400 text-[10px] font-bold min-w-[36px] pt-0.5 uppercase shrink-0">LIVE</span>
                        <span className="text-amber-300 text-xs font-medium tracking-wide break-all">{code}</span>
                      </div>
                    ))}
                    {[...allScannedQRs].reverse().map((code, index) => {
                      const { sku } = parseQR(code);
                      const pos = skuToPOsRef.current[sku] || [];
                      const poLabel = multiMode && pos.length > 0 ? pos[0].orderCode : null;
                      return (
                        <div key={`acc-${index}`} className="flex items-start gap-3 border-b border-slate-800 pb-2 last:border-0 last:pb-0">
                          <span className="text-slate-600 text-[10px] font-bold min-w-[36px] pt-0.5 uppercase shrink-0">
                            {(allScannedQRs.length - index).toString().padStart(2, "0")}.
                          </span>
                          <span className="text-emerald-400 text-xs font-medium tracking-wide break-all flex-1">{code}</span>
                          {poLabel && (
                            <span className="text-slate-500 text-[10px] font-bold shrink-0">{poLabel}</span>
                          )}
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