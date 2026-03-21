import { useState, useEffect, useRef } from "react";
import {
  Play,
  CheckCircle,
  ChevronDown,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Circle,
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
   SYNC CONFIRMATION MODAL
───────────────────────────────────────── */
const SyncModal = ({ isOpen, onClose, onConfirm, totalQRs, orderCode, isSyncing }) => {
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
              You are about to sync <span className="font-bold text-indigo-700">{totalQRs} QR code(s)</span> for PO{" "}
              <span className="font-bold text-indigo-700">{orderCode}</span>. This action will submit the inward data to the server.
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
            className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-60 flex items-center gap-2 min-w-[110px] justify-center"
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
───────────────────────────────────────── */
const ErrorPopup = ({ isOpen, onDismiss, onRescan, missingCode = "Missing Items" }) => {
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
            <p className="text-sm text-slate-600 mt-1.5 leading-relaxed pr-2">
              A QR code is missing from the current stack sequence. Please rescan the stack or verify the items manually.
            </p>
          </div>
        </div>
        <div className="p-6 pt-5">
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center gap-3">
            <Scan size={18} className="text-slate-400 shrink-0" strokeWidth={2} />
            <span className="text-sm font-medium text-slate-700 flex-1">{missingCode}</span>
            <span className="text-xs font-bold text-red-600 tracking-wide">ERROR</span>
          </div>
          <div className="flex items-center justify-end gap-3 mt-6">
            <button
              onClick={onDismiss}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Dismiss
            </button>
            <button
              onClick={onRescan}
              className="px-5 py-2.5 rounded-xl bg-[#e60000] text-white text-sm font-semibold shadow-[0_6px_16px_rgba(230,0,0,0.25)] hover:bg-red-700 hover:shadow-[0_4px_12px_rgba(230,0,0,0.3)] transition-all"
            >
              Rescan Stack
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────
   REUSABLE UI
───────────────────────────────────────── */
const StatusPill = ({ status }) => {
  const styles = {
    Picked:  "text-emerald-600 bg-emerald-50 border-emerald-100",
    Picking: "text-indigo-600 bg-indigo-50 border-indigo-100",
    Pending: "text-slate-500 bg-slate-50 border-slate-200",
  };
  const icons = {
    Picked:  <CheckCircle2 size={14} strokeWidth={2.5} />,
    Picking: <Loader2 size={14} strokeWidth={2.5} className="animate-spin" />,
    Pending: <Circle size={14} strokeWidth={2.5} className="opacity-50" />,
  };
  return (
    <span className={`text-xs font-semibold px-2 py-1 rounded-md border flex items-center gap-1.5 w-fit ${styles[status] || styles.Pending}`}>
      {icons[status] || icons.Pending}
      {status}
    </span>
  );
};

const QRScanIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-emerald-500">
    <path d="M4 7V5a1 1 0 011-1h2M4 17v2a1 1 0 001 1h2M20 7V5a1 1 0 00-1-1h-2M20 17v2a1 1 0 01-1 1h-2"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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
  const [error, setError]       = useState(null);
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

const setBeltStatus = (running) =>
  localStorage.setItem("belt_running", running ? "true" : "false");

/* ─────────────────────────────────────────
   MAIN SCANNING COMPONENT
───────────────────────────────────────── */
const Scanning = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const orderData = location.state?.orderData || null;

  const [products, setProducts]           = useState([]);
  const [totalItemsCount, setTotalItemsCount] = useState(0);

  useEffect(() => {
    if (orderData?.items) {
      let parsedItems = orderData.items;
      if (typeof parsedItems === "string") {
        try { parsedItems = JSON.parse(parsedItems); } catch { parsedItems = []; }
      }
      if (!Array.isArray(parsedItems)) parsedItems = [];
      setTotalItemsCount(parsedItems.length);
      setProducts(parsedItems.map((item) => ({
        name: item.name || "Unknown Item",
        sku:  item.sku  || "N/A",
        qty:  item.qty  || 0,
        status: "Pending",
      })));
    }
  }, [orderData]);

  // Mark belt stopped when navigating away
  useEffect(() => {
    return () => setBeltStatus(false);
  }, []);

  // ─── Conveyor / scan state ───
  const [plcError, setPlcError] = useState(null);

  const [isStackDropdownOpen, setIsStackDropdownOpen] = useState(false);
  const [stackSize, setStackSize]   = useState(6);
  const [customAmount, setCustomAmount] = useState("");
  const stackOptions = [1, 2, 3, 4, 5, 6];

  // ─── QR accumulation ───
  const [currentBatchQRs, setCurrentBatchQRs] = useState([]);
  const [allScannedQRs, setAllScannedQRs]     = useState([]);

  // ─── Error popup ───
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [mismatchMsg, setMismatchMsg]       = useState("");

  // ─── Sync modal ───
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [isSyncing, setIsSyncing]         = useState(false);

  // ─── Synced SKU counts (persisted) ───
  const [syncedSkuCounts, setSyncedSkuCounts] = useState(() => {
    try {
      const poCode = location.state?.orderData?.order_code || "unknown";
      const stored = localStorage.getItem(`packed_${poCode}`);
      return stored ? JSON.parse(stored) : {};
    } catch { return {}; }
  });

  // ─── Derive live packed counts per SKU from queued QRs ───
  const packedCounts = allScannedQRs.reduce((acc, qr) => {
    const sku = qr.split("/")[0];
    acc[sku] = (acc[sku] || 0) + 1;
    return acc;
  }, {});

  // ─── Refs ───
  const isBeltRunning       = useRef(false);
  const isProcessingBatch   = useRef(false);
  const syncedQRsRef        = useRef(new Set());
  const stackSizeRef        = useRef(stackSize);

  // Stall detector refs
  const lastQRArrivedAt     = useRef(null);
  const prevBatchLengthRef  = useRef(0);
  const stallFiredRef       = useRef(false);
  const currentBatchRef     = useRef([]);
  const showErrorPopupRef   = useRef(false);

  // Warmup ref — stall detector is blind for 500ms after Start is clicked
  const beltStartedAt       = useRef(null);

  // Keep stackSizeRef current and push to Flask
  useEffect(() => {
    stackSizeRef.current = stackSize;
    fetch("http://localhost:5000/api/stack-size", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stack_size: stackSize }),
    }).catch(() => {});
  }, [stackSize]);

  // Keep mirrors in sync with state
  useEffect(() => { currentBatchRef.current  = currentBatchQRs; }, [currentBatchQRs]);
  useEffect(() => { showErrorPopupRef.current = showErrorPopup;  }, [showErrorPopup]);

  // ─── Helper: reset all stall-detector state ───
  const resetStall = () => {
    lastQRArrivedAt.current    = null;
    prevBatchLengthRef.current = 0;
    stallFiredRef.current      = false;
  };

  // ─── Stall detector ───
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

      if (
        batchLen === 0                    ||
        batchLen >= stackSizeRef.current  ||
        isProcessingBatch.current         ||
        showErrorPopupRef.current         ||
        stallFiredRef.current             ||
        lastQRArrivedAt.current === null
      ) return;

      const elapsed = Date.now() - lastQRArrivedAt.current;
      if (elapsed >= STALL_TIMEOUT_MS) {
        stallFiredRef.current     = true;
        isProcessingBatch.current = true;
        isBeltRunning.current     = false;
        setBeltStatus(false);

        const got      = batchLen;
        const expected = stackSizeRef.current;
        const missing  = expected - got;
        const msg      = `${missing} box(es) missing! Got ${got}, expected ${expected}.`;

        setMismatchMsg(msg);
        setShowErrorPopup(true);
        toast.error(msg);

        clearBackendQueue().then(() => { isProcessingBatch.current = false; });
      }
    }, 200);

    return () => clearInterval(stallInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Poll Python backend for live QR codes (200ms) ───
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch("http://localhost:5000/api/qr");
        const data     = await response.json();
        if (!data.qr_codes) return;

        const incoming = data.qr_codes;

        // ─── NOREAD: TCP client couldn't decode any QR → stop belt ───
        if (
          Array.isArray(incoming) &&
          incoming.some((qr) => typeof qr === "string" && qr.trim().toLowerCase() === "noread")
        ) {
          if (!isProcessingBatch.current) {
            isProcessingBatch.current = true;
            isBeltRunning.current     = false;
            setBeltStatus(false);
            controlConveyor(1);
            stallFiredRef.current = true;
            const msg = "No-read detected! Camera could not decode a QR code. Belt stopped.";
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

          const got      = data.qr_codes?.length ?? 0;
          const expected = stackSizeRef.current;
          const missing  = data.missing ?? Math.max(0, expected - got);
          const extra    = data.extra   ?? Math.max(0, got - expected);
          const msg = missing > 0
            ? `${missing} box(es) missing! Got ${got}, expected ${expected}.`
            : `${extra} extra box(es)! Got ${got}, expected ${expected}.`;
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
            fetch("http://localhost:5000/api/conveyor", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ command: 1 }),
            }).catch(() => {});
            isBeltRunning.current = false;
            setBeltStatus(false);
            setMismatchMsg("Duplicate QR(s) detected! This stack was already scanned. Belt stopped.");
            setShowErrorPopup(true);
            toast.error("Duplicate QR(s) detected! Stack rejected.");
            clearBackendQueue().then(() => { isProcessingBatch.current = false; });
          } else {
            incoming.forEach((qr) => syncedQRsRef.current.add(qr));
            setAllScannedQRs((prev) => [...prev, ...incoming]);
            toast.success(`✓ Stack of ${incoming.length} queued — belt continuing.`);
            clearBackendQueue().then(() => {
              resetStall();
              isProcessingBatch.current = false;
            });
          }
          return;
        }
      } catch {}
    }, 200);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Clear backend queue only (not our accumulated list) ───
  const clearBackendQueue = async () => {
    try {
      await fetch("http://localhost:5000/api/qr", { method: "DELETE" });
    } catch (e) {
      console.error("Failed to clear backend queue", e);
    }
    setCurrentBatchQRs([]);
    currentBatchRef.current = [];
    resetStall();
  };

  // ─── Conveyor control: command 0 = start, 1 = stop ───
  const controlConveyor = async (command) => {
    try {
      setPlcError(null);
      const response = await fetch("http://localhost:5000/api/conveyor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command }),
      });
      const data = await response.json();
      if (data.success) {
        isBeltRunning.current = command === 0;
        setBeltStatus(command === 0);
      } else {
        setPlcError("Failed to communicate with PLC");
      }
    } catch {
      setPlcError("Make sure Python server is running");
    }
  };

  const handleStopConveyor = () => {
    isBeltRunning.current = false;
    setBeltStatus(false);
    controlConveyor(1);

    if (currentBatchQRs.length > 0 && currentBatchQRs.length < stackSize) {
      setShowErrorPopup(true);
    }
  };

  const handleRescan = () => {
    setShowErrorPopup(false);
    stallFiredRef.current = false;
    resetStall();
    clearBackendQueue();
    controlConveyor(0);
  };

  // ─── Sync: POST all accumulated QRs to the inward API ───
  const handleSync = async () => {
    if (allScannedQRs.length === 0) {
      toast.error("No QR codes to sync. Scan some items first.");
      return;
    }
    setIsSyncing(true);
    try {
      const token = localStorage.getItem("token");
      const payload = [
        {
          po_code:        orderData?.order_code    || "",
          supplier_code:  orderData?.supplier_code || "",
          warehouse_code: orderData?.plant_code    || "",
          product_qrs:    allScannedQRs,
        },
      ];

      const res = await axios.post(
        "http://wmsbeta.luxkutumb.info/api/sap/inward",
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log("Sync API response:", res.status, JSON.stringify(res.data));

      const isSuccess =
        res.status >= 200 &&
        res.status < 300 &&
        res.data.status !== false &&
        res.data.status !== 0 &&
        res.data.status !== "false" &&
        res.data.status !== "error";

      if (isSuccess) {
        const syncedCount = allScannedQRs.length;
        try { localStorage.removeItem(`packed_${orderData?.order_code || "unknown"}`); } catch {}
        setSyncedSkuCounts({});
        setAllScannedQRs([]);
        syncedQRsRef.current.clear();
        setShowSyncModal(false);
        setIsSyncing(false);
        toast.success("✓ Synced " + syncedCount + " QR(s) successfully!");
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

  const latestQR = currentBatchQRs.length > 0 ? currentBatchQRs[currentBatchQRs.length - 1] : null;

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
                <h1 className="text-base font-bold text-slate-900 tracking-tight">
                  {orderData ? `PO-${orderData.order_code}` : "Unknown Order"}
                </h1>
                <p className="text-sm text-slate-500 font-medium mt-0.5">
                  {allScannedQRs.length} queued · {currentBatchQRs.length} in current batch
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
                </div>
              )}
            </div>
          </div>

          {/* Right side: stats + sync button */}
          <div className="flex items-center gap-4">
            {plcError && (
              <span className="text-rose-500 bg-rose-50 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2">
                <AlertTriangle size={14} /> {plcError}
              </span>
            )}
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-slate-900 leading-none">{totalItemsCount}</span>
              <span className="w-px h-8 bg-slate-200 mx-1" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Total<br />Items</span>
            </div>
            <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
              <span className="text-2xl font-bold text-indigo-600 leading-none">{allScannedQRs.length}</span>
              <span className="w-px h-8 bg-slate-200 mx-1" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">QRs<br />Queued</span>
            </div>
            <button
              onClick={() => {
                if (allScannedQRs.length === 0) {
                  toast.error("No QR codes queued. Stop the conveyor after scanning a full batch first.");
                  return;
                }
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

          {/* LEFT COLUMN */}
          <div className="flex-[0.9] flex flex-col gap-6">
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                <h2 className="text-sm font-bold text-slate-900 uppercase">Scanned Products</h2>
                <span className="text-xs bg-white border border-slate-200 text-slate-600 font-bold px-2.5 py-1 rounded-md tracking-wide shadow-sm">
                  {allScannedQRs.length} total scanned
                </span>
              </div>
              <div className="px-6 py-2 grid grid-cols-2 border-b border-slate-100 bg-slate-50/30 shrink-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">SKU</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Count</span>
              </div>
              <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
                {Object.keys(packedCounts).length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center mb-3">
                      <Scan size={20} className="text-slate-300" />
                    </div>
                    <p className="text-sm font-medium text-slate-400">No items scanned yet</p>
                    <p className="text-xs text-slate-300 mt-1">Start the belt to begin scanning</p>
                  </div>
                ) : (
                  Object.entries(packedCounts)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([sku, count], i) => (
                      <div key={i} className="px-6 py-3.5 grid grid-cols-2 items-center hover:bg-slate-50/80 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                          <span className="text-[13px] font-bold text-slate-900 uppercase tracking-tight">{sku}</span>
                        </div>
                        <div className="flex justify-end">
                          <span className="text-[13px] font-bold bg-indigo-50 border border-indigo-200 text-indigo-700 px-3 py-0.5 rounded-md tabular-nums">
                            {count}
                          </span>
                        </div>
                      </div>
                    ))
                )}
              </div>
              {Object.keys(packedCounts).length > 0 && (
                <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total QRs</span>
                  <span className="text-sm font-bold text-indigo-600">{allScannedQRs.length}</span>
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
                        isProcessingBatch.current = false;
                        beltStartedAt.current = Date.now();
                        resetStall();
                        clearBackendQueue();
                        controlConveyor(0);
                      }}
                      className="w-full flex items-center justify-center gap-2 bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 text-sm font-bold py-3 rounded-xl transition-all uppercase cursor-pointer"
                    >
                      <Play size={16} fill="currentColor" />Start
                    </button>
                    <button
                      onClick={handleStopConveyor}
                      className="w-full flex items-center justify-center gap-2 bg-rose-50 text-rose-700 border border-rose-100 cursor-pointer hover:bg-rose-100 text-sm font-bold py-3 rounded-xl transition-all uppercase"
                    >
                      <div className="w-3 h-3 bg-rose-600 rounded-[3px]" />Stop
                    </button>
                  </div>
                </div>

                {/* Camera view */}
                <div className="flex-1 relative aspect-square max-h-[250px] w-full bg-[#0f172a] rounded-2xl overflow-hidden shadow-inner border border-slate-800 flex items-center justify-center group">
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
                    {products.length > 0 ? products[0].name : "—"}
                  </p>
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

            {/* ─── LIVE SCANNER LOG ─── */}
            <section className="w-full bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[11px] text-slate-500 uppercase tracking-widest font-bold flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  Live Scanner Log
                </p>
                <div className="flex items-center gap-3">
                  {allScannedQRs.length > 0 && (
                    <span className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-600 font-bold px-2.5 py-1 rounded-md uppercase tracking-wide">
                      {allScannedQRs.length} queued for sync
                    </span>
                  )}
                  {allScannedQRs.length > 0 && (
                    <button
                      onClick={() => { setAllScannedQRs([]); toast("Queue cleared.", { icon: "🗑️" }); }}
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
                    {[...allScannedQRs].reverse().map((code, index) => (
                      <div key={`acc-${index}`} className="flex items-start gap-3 border-b border-slate-800 pb-2 last:border-0 last:pb-0">
                        <span className="text-slate-600 text-[10px] font-bold min-w-[36px] pt-0.5 uppercase shrink-0">
                          {(allScannedQRs.length - index).toString().padStart(2, "0")}.
                        </span>
                        <span className="text-emerald-400 text-xs font-medium tracking-wide break-all">{code}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* ─── MODALS ─── */}
      <ErrorPopup
        isOpen={showErrorPopup}
        onDismiss={() => {
          setShowErrorPopup(false);
          stallFiredRef.current = false;
          clearBackendQueue();
        }}
        onRescan={handleRescan}
        missingCode={mismatchMsg || `${stackSize - currentBatchQRs.length} Item(s) Missing (${currentBatchQRs.length}/${stackSize} scanned)`}
      />
      <SyncModal
        isOpen={showSyncModal}
        onClose={() => setShowSyncModal(false)}
        onConfirm={handleSync}
        totalQRs={allScannedQRs.length}
        orderCode={orderData ? `PO-${orderData.order_code}` : "Unknown"}
        isSyncing={isSyncing}
      />
    </Layout>
  );
};

export default Scanning;