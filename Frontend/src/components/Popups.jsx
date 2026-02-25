import { 
  AlertCircle, 
  Scan, 
  CheckCircle2, 
  Package, 
  ChevronRight 
} from "lucide-react";

/* ── ERROR POPUP COMPONENT ── */
export const ErrorPopup = ({ isOpen, onDismiss, onRescan, missingCode = "AD-UB21-WHT-094" }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header Section */}
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

        {/* Bottom Action Section */}
        <div className="p-6 pt-5">
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center gap-3">
            <Scan size={18} className="text-slate-400 shrink-0" strokeWidth={2} />
            <span className="text-sm font-medium text-slate-700 flex-1">{missingCode}</span>
            <span className="text-xs font-bold text-red-600 tracking-wide">MISSING</span>
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


/* ── SUCCESS POPUP COMPONENT ── */
export const SuccessPopup = ({ isOpen, onDismiss, onPrint, verifiedCount = 6, totalCount = 6 }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header Section */}
        <div className="bg-[#f0fdf4] p-6 pb-5 flex items-start gap-4 border-b border-emerald-50">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
            <CheckCircle2 className="text-emerald-600" size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Stack Completed</h3>
            <p className="text-sm text-slate-600 mt-1.5 leading-relaxed pr-2">
              All items in the current stack have been verified and processed successfully. Ready for the next batch.
            </p>
          </div>
        </div>

        {/* Bottom Action Section */}
        <div className="p-6 pt-5">
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center">
            
            {/* Left Stat */}
            <div className="flex-1 flex flex-col gap-1 pl-2">
              <div className="flex items-center gap-1.5">
                <Package size={14} className="text-indigo-600" strokeWidth={2.5} />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Verified</span>
              </div>
              <span className="text-base font-bold text-slate-900">
                {verifiedCount} / {totalCount} Items
              </span>
            </div>

            <div className="w-px h-10 bg-slate-200 mx-4" />

            {/* Right Stat */}
            <div className="flex-[0.8] flex flex-col gap-1 pl-2">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-500" strokeWidth={2.5} />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</span>
              </div>
              <span className="text-base font-bold text-emerald-600 tracking-wide">
                PASSED
              </span>
            </div>

          </div>
          
          <div className="flex items-center justify-end gap-3 mt-6">
            <button 
              onClick={onDismiss} 
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Dismiss
            </button>
            <button 
              onClick={onPrint} 
              className="px-5 py-2.5 rounded-xl bg-[#00a859] text-white text-sm font-semibold flex items-center gap-1.5 shadow-[0_6px_16px_rgba(0,168,89,0.25)] hover:bg-[#00964f] hover:shadow-[0_4px_12px_rgba(0,168,89,0.3)] transition-all"
            >
              Print Label
              <ChevronRight size={16} strokeWidth={2.5} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};