import { useState, useEffect, useRef } from "react";
import { FileText, ChevronDown, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [beltRunning, setBeltRunning] = useState(false);

  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Poll localStorage every 300ms for belt status written by Scanning.jsx
  useEffect(() => {
    const interval = setInterval(() => {
      const status = localStorage.getItem("belt_running");
      setBeltRunning(status === "true");
    }, 300);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch POs when the dropdown is opened
  const fetchOrders = async () => {
    if (orders.length > 0) return;

    setLoading(true);
    try {
      const token = localStorage.getItem("token");

      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const day = String(today.getDate()).padStart(2, "0");
      const currentDate = `${year}-${month}-${day}`;

      const payload = { from_date: "2025-01-10", to_date: currentDate };

      const res = await axios.post(
        "http://wmsbeta.luxkutumb.info/api/sap/getPurchaseOrderByDate",
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.status === "success") {
        const apiData = res.data.data;
        setOrders(Array.isArray(apiData) ? apiData : [apiData]);
      } else {
        toast.error("Failed to fetch POs");
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
      toast.error("Network error while fetching POs.");
    } finally {
      setLoading(false);
    }
  };

  const handleDropdownClick = () => {
    if (!isOpen) fetchOrders();
    setIsOpen(!isOpen);
  };

  const handlePOClick = (order) => {
    setIsOpen(false);
    navigate("/po-details", { state: { orderData: order } });
  };

  return (
    <div className="h-[84px] bg-[#432DD7] px-6 flex items-center justify-between text-white shrink-0">

      {/* ════ Left Section: Title & Status ════ */}
      <div className="flex items-center gap-4">
        <h2 className="text-[18px] font-semibold tracking-tight">Workstation</h2>

        {/* Dynamic belt status pill */}
        <span
          className={`flex items-center gap-2 text-[11px] font-medium px-3.5 py-1.5 rounded-full tracking-wide shadow-sm transition-all duration-300 ${
            beltRunning
              ? "bg-emerald-50 text-emerald-700"
              : "bg-[#f4f6fa] text-[#2563eb]"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full inline-block ${
              beltRunning ? "bg-emerald-500 animate-pulse" : "bg-red-500"
            }`}
          />
          {beltRunning ? "RUNNING" : "STOPPED"}
        </span>
      </div>

      {/* ════ Right Section: Actions ════ */}
      <div className="flex items-center gap-3">

        {/* Fetch PO Button & Dropdown */}
        

        {/* Vertical Separator */}
        <div className="w-[1px] h-5 bg-white/20 mx-1.5" />

      </div>
    </div>
  );
};

export default Navbar;