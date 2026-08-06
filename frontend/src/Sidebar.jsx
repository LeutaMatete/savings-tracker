import {
  FaHome,
  FaExchangeAlt,
  FaBullseye,
  FaWallet,
  FaChartPie,
  FaUsers,
  FaCog,
  FaMoon,
} from "react-icons/fa";

const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: FaHome },
  { id: "transactions", label: "Transactions", icon: FaExchangeAlt },
  { id: "goals", label: "Goals", icon: FaBullseye },
  { id: "budgets", label: "Budgets", icon: FaWallet },
  { id: "analytics", label: "Analytics", icon: FaChartPie },
  { id: "circles", label: "Savings Circles", icon: FaUsers },
  { id: "settings", label: "Settings", icon: FaCog },
];

export default function Sidebar({
  currentPage,
  setCurrentPage,
  mobileOpen,
  setMobileOpen,
}) {
  return (
    <aside
  className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}
>
      <div className="sidebar-logo">
        <div className="logo-circle">
            <button
    className="sidebar-close"
    onClick={() => setMobileOpen(false)}
>
    ✕
</button>
          <FaMoon />
        </div>

        <div>
          <h2>Parrot Finance</h2>
          <span>Personal Edition</span>
        </div>
      </div>

      <nav className="sidebar-menu">
        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              className={`sidebar-item ${
                currentPage === item.id ? "active" : ""
              }`}
             onClick={() => {
    setCurrentPage(item.id);
    setMobileOpen(false);
}}
            >
              <Icon className="sidebar-icon" />

              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <small>Version 1.0</small>
      </div>
    </aside>
  );
}