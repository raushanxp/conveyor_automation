import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, QrCode, LogOut } from "lucide-react";
import axios from "axios";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Scanning", icon: QrCode, path: "/scan" },
];

const Sidebar = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("token");

      if (token) {
        await axios.post(
          `${import.meta.env.VITE_BASE_URL}/logout_external_device`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          }
        );
      }
    } catch (error) {
      console.error("Logout API failed:", error);
      // even if API fails, continue logout
    } finally {
      // remove token from localStorage
      localStorage.removeItem("token");

      // redirect to login page
      navigate("/");
    }
  };

  return (
    <div className="w-[225px] min-w-[200px] bg-[#432DD7] text-white flex flex-col px-4 py-7 min-h-screen">

      {/* Logo */}
      <div className="mb-8 px-2">
        <img src="/logo.svg" alt="LUX Logo" className="h-10 w-auto" />
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1.5 flex-1">
        {navItems.map(({ label, icon: Icon, path }) => (
          <NavLink
            key={label}
            to={path}
            className={({ isActive }) =>
              `flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
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
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-white/10 transition-colors"
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