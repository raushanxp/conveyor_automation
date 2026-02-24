import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, ShoppingCart, Settings, LogOut, QrCode } from "lucide-react";

const navItems = [
  { label: "Dashboard",       icon: LayoutDashboard, path: "/dashboard" },
  { label: "Purchase Orders", icon: ShoppingCart,    path: "/purchase-orders" },
  { label: "Scanning",        icon: QrCode,        path: "/scan" },
  { label: "Settings",        icon: Settings,        path: "/settings" },
];

const Sidebar = () => {
  const navigate = useNavigate();

  return (
    <div className="w-[225px] min-w-[200px] bg-[#432DD7] text-white flex flex-col px-4 py-7 min-h-screen">

      {/* Logo */}
      <div className="mb-8 px-2">
        <img
          src="/logo.svg"
          alt="LUX Logo"
          className="h-10 w-auto"
        />
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1.5 flex-1">
        {navItems.map(({ label, icon: Icon, path }) => (
          <NavLink
            key={label}
            to={path}
            className={({ isActive }) =>
              `flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
                isActive ? "bg-white/15" : "hover:bg-white/10"
              }`
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}

        {/* Log Out */}
        <div className="mt-auto pt-6">
          <button
            onClick={() => navigate("/login")}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-white/10 transition-colors text-left"
          >
            <LogOut size={17} />
            Log Out
          </button>
        </div>
      </nav>
    </div>
  );
};

export default Sidebar;