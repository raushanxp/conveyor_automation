import { useState, useEffect } from "react";
import {
  Play,
  CheckCircle,
  ChevronDown,
  Ban,
  ClipboardList,
  Circle,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Check,
  Camera,
  Layers,
  AlertCircle,
  Scan,
  Package,
  ChevronRight
} from "lucide-react";
import Layout from "../components/Layout";

/* ── MOCK DATA ── */
const checklistItems = [
  { label: "Verify Package Integrity", done: true },
  { label: "Confirm Label Accuracy", done: false },
  { label: "Weight Check (Expected: 2.5kg)", done: false },
  { label: "Seal Inspection", done: false },
  { label: "Barcode Readability", done: false },
];

const products = [
  { name: "Lux Cozi", sku: "LX-AM90-BLK", qty: 6, status: "Passed" },
  { name: "Lux Cozi ONN", sku: "LX-UB21-WHT", qty: 6, status: "Rejected" },
  { name: "Lux Winter -X", sku: "LX-RSX-GRY", qty: 6, status: "Passed" },
  { name: "Lux Lyra", sku: "LX-LYR-BLK", qty: 6, status: "Pending" },
];

/* ── POPUP COMPONENTS ── */
const ErrorPopup = ({ isOpen, onDismiss, onRescan, missingCode = "Missing Items" }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
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
            <button onClick={onDismiss} className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
              Dismiss
            </button>
            <button onClick={onRescan} className="px-5 py-2.5 rounded-xl bg-[#e60000] text-white text-sm font-semibold shadow-[0_6px_16px_rgba(230,0,0,0.25)] hover:bg-red-700 hover:shadow-[0_4px_12px_rgba(230,0,0,0.3)] transition-all">
              Rescan Stack
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── REUSABLE UI COMPONENTS ── */
const StatusPill = ({ status }) => {
  const styles = {
    Passed: "text-emerald-600 bg-emerald-50 border-emerald-100",
    Rejected: "text-rose-600 bg-rose-50 border-rose-100",
    Pending: "text-slate-500 bg-slate-50 border-slate-200"
  };
  const icons = {
    Passed: <CheckCircle2 size={14} strokeWidth={2.5} />,
    Rejected: <XCircle size={14} strokeWidth={2.5} />,
    Pending: <Circle size={14} strokeWidth={2.5} className="opacity-50" />
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
    <path d="M4 7V5a1 1 0 011-1h2M4 17v2a1 1 0 001 1h2M20 7V5a1 1 0 00-1-1h-2M20 17v2a1 1 0 01-1 1h-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <rect x="7" y="7" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.5" />
    <rect x="13" y="7" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.5" />
    <rect x="7" y="13" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.5" />
    <path d="M13 13h1M13 16h4M16 13v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

/* ── OPTIMIZED FTP CAMERA FEED COMPONENT ── */
const FTPCameraFeed = () => {
  const [imageUrl, setImageUrl] = useState(null);
  const [error, setError] = useState(null);
  const [lastTimestamp, setLastTimestamp] = useState(null);

  useEffect(() => {
    const fetchLatestImage = async () => {
      try {
        const response = await fetch("http://localhost:8000/latest-image");
        if (response.status === 404) {
          setError("Waiting for first scan...");
          return;
        }
        if (response.ok) {
          const data = await response.json();
          if (data.upload_timestamp !== lastTimestamp) {
            const newImageUrl = `http://localhost:8000${data.public_url}?t=${encodeURIComponent(data.upload_timestamp)}`;
            setImageUrl(newImageUrl);
            setLastTimestamp(data.upload_timestamp);
            setError(null);
          }
        } else {
          setError("Camera feed offline");
        }
      } catch (err) {
        setError("Cannot connect to Camera API");
      }
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

/* ── MAIN COMPONENT ── */
const Scanning = () => {
  const [passed, setPassed] = useState(false);
  const [rejected, setRejected] = useState(false);
  const [plcError, setPlcError] = useState(null);

  const [isStackDropdownOpen, setIsStackDropdownOpen] = useState(false);
  const [stackSize, setStackSize] = useState(6);
  const [customAmount, setCustomAmount] = useState("");

  const [scannedQRs, setScannedQRs] = useState([]);
  const stackOptions = [2, 4, 6, 8, 10, 20];

  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [validationStatus, setValidationStatus] = useState("waiting");

  // Helper function to clear Python's memory
  const clearBackendQueue = async () => {
    try {
      await fetch("http://localhost:5000/api/qr", { method: 'DELETE' });
    } catch (e) {
      console.error("Failed to clear backend queue", e);
    }
    setScannedQRs([]);
  };

  // QR Fetch Polling
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch("http://localhost:5000/api/qr");
        const data = await response.json();
        if (data.qr_codes) {
          setScannedQRs(data.qr_codes);
        }
      } catch (error) { }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync stackSize to backend whenever operator changes it
  useEffect(() => {
    fetch("http://localhost:5000/api/payload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ box_count: stackSize }),
    }).catch(() => { });
  }, [stackSize]);

  // Poll validation status
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch("http://localhost:5000/api/validation-status");
        const data = await response.json();
        setValidationStatus(data.status);

        // Auto-show error popup on mismatch
        if (data.status === "mismatch") {
          setRejected(true);
          setPassed(false);
          setShowErrorPopup(true);
        }
      } catch (error) { }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const controlConveyor = async (command) => {
    try {
      setPlcError(null);
      const response = await fetch("http://localhost:5000/api/conveyor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command }),
      });
      const data = await response.json();
      if (!data.success) {
        setPlcError("Failed to communicate with PLC");
      }
    } catch (error) {
      setPlcError("Make sure Python server is running");
    }
  };

  // Custom Stop Handler
  const handleStopConveyor = () => {
    setPassed(false);
    setRejected(false);
    controlConveyor(1);
    if (scannedQRs.length > 0 && scannedQRs.length < stackSize) {
      setShowErrorPopup(true); // Alert of missing items
    }
  };

  // Rescan Handler (Clears Python memory)
  const handleRescan = () => {
    setShowErrorPopup(false);
    setValidationStatus("waiting");
    clearBackendQueue();
    controlConveyor(0); // Restart belt
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto flex flex-col gap-6 pb-10">
        <header className="bg-white rounded-2xl border border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between shadow-sm">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-200 text-slate-600 shadow-sm">
                <Layers size={22} strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900 tracking-tight">Batch #2023-X9</h1>
                <p className="text-sm text-slate-500 font-medium mt-0.5">Processing item 4 of 20</p>
              </div>
            </div>

            <div className="relative ml-2">
              <button onClick={() => setIsStackDropdownOpen(!isStackDropdownOpen)} className="flex items-center gap-3 border border-slate-200 rounded-xl pl-3 pr-2 py-1.5 bg-slate-50 hover:bg-slate-100 outline-none transition-all">
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
                      <button key={opt} onClick={() => { setStackSize(opt); setIsStackDropdownOpen(false); }} className={`w-full flex items-center justify-between px-4 py-2.5 transition-colors ${stackSize === opt ? "bg-indigo-50/80 text-indigo-700" : "hover:bg-slate-50 text-slate-600"}`}>
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
                      <input type="number" placeholder="Qty..." value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && customAmount) { setStackSize(parseInt(customAmount, 10)); setIsStackDropdownOpen(false); setCustomAmount(""); } }} className="w-full pl-3 pr-12 py-2 text-sm text-slate-700 outline-none" />
                      <div className="absolute right-1.5 top-1/2 -translate-y-1/2"><span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-1 rounded">PCS</span></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-6">
            {plcError && <span className="text-rose-500 bg-rose-50 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2"><AlertTriangle size={14} /> {plcError}</span>}
            <div className="flex items-center gap-3"><span className="text-2xl font-bold text-slate-900 leading-none">100</span><span className="w-px h-8 bg-slate-200 mx-1" /><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Total<br />Boxes</span></div>
            <div className="flex items-center gap-3 border-l border-slate-200 pl-6"><span className="text-2xl font-bold text-slate-900 leading-none">200</span><span className="w-px h-8 bg-slate-200 mx-1" /><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Boxes<br />Remain</span></div>
          </div>
        </header>

        <div className="flex items-start gap-6">
          <div className="flex-[0.9] flex flex-col gap-6">
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-3 text-indigo-600"><ClipboardList size={20} /><h2 className="text-sm font-bold tracking-tight text-slate-900 uppercase">Inspection Protocol: Level 2</h2></div>
                <span className="text-xs text-slate-400 font-semibold bg-white px-2 py-1 border border-slate-200 rounded-md uppercase">Proc-992-A</span>
              </div>
              <div className="flex flex-col divide-y divide-slate-50 p-2">
                {checklistItems.map((item, i) => (
                  <div key={i} className="px-4 py-3 flex items-center gap-4 rounded-xl hover:bg-slate-50 transition-colors">
                    {item.done ? <CheckCircle2 size={20} className="text-emerald-500 shrink-0" /> : <Circle size={20} className="text-slate-300 shrink-0" />}
                    <span className={`text-sm ${item.done ? "text-slate-900 font-semibold" : "text-slate-600 font-medium"}`}>{item.label}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h2 className="text-sm font-bold text-slate-900 uppercase">Product Scan</h2>
                <span className="text-xs bg-white border border-slate-200 text-slate-600 font-bold px-2.5 py-1 rounded-md tracking-wide shadow-sm">{scannedQRs.length}/{stackSize} Scanned</span>
              </div>
              <div className="divide-y divide-slate-100">
                {products.map((p, i) => (
                  <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/80 transition-colors">
                    <div><p className="text-sm font-bold text-slate-900 uppercase">{p.name}</p><p className="text-xs font-medium text-slate-500 mt-1 uppercase">{p.sku}</p></div>
                    <div className="flex flex-col items-end gap-2"><span className="text-[11px] bg-slate-100 border border-slate-200 text-slate-600 font-bold px-2 py-0.5 rounded-md uppercase tracking-tight">Qty: {p.qty}</span><StatusPill status={p.status} /></div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="flex-[1.2] flex flex-col gap-6">
            <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col">
              <div className="flex gap-6">
                <div className="flex flex-col w-[35%] shrink-0">
                  <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-bold px-2.5 py-1.5 rounded-lg w-fit mb-5 tracking-widest shadow-sm uppercase"><span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />Live Camera</div>
                  <div className="flex flex-col gap-3">
                    <button onClick={() => controlConveyor(0)} className="w-full flex items-center justify-center gap-2 bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 text-sm font-bold py-3 rounded-xl transition-all uppercase cursor-pointer"><Play size={16} fill="currentColor" />Start</button>
                    <button onClick={handleStopConveyor} className="w-full flex items-center justify-center gap-2 bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-100 text-sm font-bold py-3 rounded-xl transition-all uppercase"><div className="w-3 h-3 bg-rose-600 rounded-[3px]" />Stop</button>
                    <div className="flex gap-3 mt-2">
                      <button onClick={() => { setRejected((r) => !r); setPassed(false); }} className={`w-full flex flex-col items-center justify-center gap-1.5 text-xs font-bold py-3 rounded-xl transition-all border uppercase ${rejected ? "bg-rose-600 border-rose-600 text-white shadow-md shadow-rose-600/20" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}><Ban size={18} strokeWidth={2.5} />Reject</button>
                      <button onClick={() => { setPassed((p) => !p); setRejected(false); }} className={`w-full flex flex-col items-center justify-center gap-1.5 text-xs font-bold py-3 rounded-xl transition-all border uppercase ${passed ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20" : "bg-white border-slate-200 text-emerald-600 hover:bg-emerald-50"}`}><CheckCircle size={18} strokeWidth={2.5} />Pass</button>
                    </div>
                  </div>
                </div>
                <div className="flex-1 relative aspect-square max-h-[250px] w-full bg-[#0f172a] rounded-2xl overflow-hidden shadow-inner border border-slate-800 flex items-center justify-center group"><FTPCameraFeed /><div className="absolute inset-0 opacity-10 pointer-events-none z-10" style={{ backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', backgroundSize: '16px 16px' }} /><div className="absolute top-5 left-5 w-6 h-6 border-t-2 border-l-2 border-amber-400 rounded-tl opacity-90 z-20" /><div className="absolute top-5 right-5 w-6 h-6 border-t-2 border-r-2 border-amber-400 rounded-tr opacity-90 z-20" /><div className="absolute bottom-5 left-5 w-6 h-6 border-b-2 border-l-2 border-amber-400 rounded-bl opacity-90 z-20" /><div className="absolute bottom-5 right-5 w-6 h-6 border-b-2 border-r-2 border-amber-400 rounded-br opacity-90 z-20" /><div className="absolute left-0 right-0 top-1/2 h-[2px] bg-rose-500 z-30 opacity-80 shadow-[0_0_20px_4px_rgba(244,63,94,0.6)] animate-[pulse_2s_ease-in-out_infinite]" /></div>
              </div>
              <div className="flex flex-row items-end justify-between mt-6 pt-6 border-t border-slate-100">
                <div><p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1.5 uppercase">Detected Object</p><p className="text-slate-900 text-lg font-bold leading-tight mb-2 tracking-tight uppercase">Adidas Ultraboost 21</p><div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-md w-fit"><QRScanIcon /><span className="text-emerald-600 text-xs font-bold tracking-wide uppercase">{scannedQRs.length > 0 ? scannedQRs[0] : "Waiting..."}</span></div></div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-3.5 text-center shadow-sm"><p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1 tracking-tight">Items in Stack</p><p className="text-slate-900 text-lg font-bold tracking-tight">{scannedQRs.length} / {stackSize}</p><span className={`text-[10px] font-bold mt-1 inline-block px-2 py-0.5 rounded-full ${validationStatus === "ok" ? "bg-emerald-50 text-emerald-600" : validationStatus === "mismatch" ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-400"}`}>{validationStatus === "ok" ? "✅ Passed" : validationStatus === "mismatch" ? "🛑 Mismatch" : "⏳ Scanning..."}</span></div>
              </div>
            </section>
            <section className="w-full bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-4"><p className="text-[11px] text-slate-500 uppercase tracking-widest font-bold flex items-center gap-2.5 shrink-0 uppercase tracking-tight"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />Live Scanner Log</p></div>
              <div className="bg-slate-900 rounded-xl p-4 font-mono flex-1 overflow-y-auto max-h-[160px] shadow-inner border border-slate-800 custom-scrollbar">{scannedQRs.length === 0 ? (<p className="text-slate-500 text-sm font-medium flex items-center gap-2 uppercase tracking-tight"><span className="animate-pulse">_</span> Waiting for payload...</p>) : (<div className="flex flex-col gap-2">{scannedQRs.map((code, index) => (<div key={index} className="flex items-start gap-3 border-b border-slate-800 pb-2 last:border-0 last:pb-0 uppercase tracking-tight leading-tight text-xs font-medium"><span className="text-slate-600 text-xs font-bold min-w-[20px] pt-0.5 uppercase">{(scannedQRs.length - index).toString().padStart(2, '0')}.</span><span className="text-emerald-400 text-sm font-medium tracking-wide break-all uppercase tracking-tight leading-tight text-xs font-medium">{code}</span></div>))}</div>)}</div>
            </section>
          </div>
        </div>
      </div>
      <ErrorPopup isOpen={showErrorPopup} onDismiss={() => setShowErrorPopup(false)} onRescan={handleRescan} missingCode={`${stackSize - scannedQRs.length} Item(s) Missing`} />
    </Layout>
  );
};

export default Scanning;