import { Search, RefreshCcw, FileText, ChevronDown } from "lucide-react";

const Navbar = () => {
  return (
    <div className="h-[84px] bg-[#432DD7] px-6 flex items-center justify-between text-white shrink-0">

      {/* ════ Left Section: Title & Status ════ */}
      <div className="flex items-center gap-4">
        <h2 className="text-[18px] font-semibold tracking-tight">Workstation #04</h2>
        <span className="flex items-center gap-2 bg-[#f4f6fa] text-[#2563eb] text-[11px] font-medium px-3.5 py-1.5 rounded-full tracking-wide shadow-sm">
          <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
          STOPPED
        </span>
      </div>

      {/* ════ Right Section: Actions ════ */}
      <div className="flex items-center gap-3">
        
        {/* Search Input */}
        <div className="relative h-[38px] flex items-center">
          <Search size={15} className="absolute left-4 text-[#94a3b8]" strokeWidth={2} />
          <input
            type="text"
            placeholder="Search documents..."
            className="h-full pl-10 pr-4 bg-[#f8fafc] rounded-full text-[13px] font-normal text-gray-800 placeholder-[#94a3b8] w-[340px] outline-none shadow-sm"
          />
        </div>

        {/* Fetch PO Button */}
        <button className="h-[38px] flex items-center gap-2 bg-[#f8fafc] text-[#2563eb] px-4 rounded-full text-[13px] font-medium hover:bg-white transition-colors shadow-sm ml-1">
          <FileText size={15} strokeWidth={2} />
          Fetch PO.
          <ChevronDown size={15} strokeWidth={2} className="ml-1" />
        </button>

        {/* Vertical Separator */}
        <div className="w-[1px] h-5 bg-white/20 mx-1.5" />

        {/* Sync Button */}
        <button className="h-[38px] flex items-center gap-2 bg-[#0b1221] text-white px-5 rounded-full text-[13px] font-medium hover:bg-[#151f32] transition-colors shadow-sm">
          <RefreshCcw size={15} strokeWidth={2} />
          Sync
        </button>
        
      </div>
    </div>
  );
};

export default Navbar;