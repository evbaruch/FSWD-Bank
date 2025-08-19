import React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  X,
  Home,
  CreditCard,
  Send,
  FileText,
  Settings,
  Users,
  Shield,
  BellRing,
  BarChart3,
  Upload,
  Building,
  LogOut,
} from "lucide-react";
import styles from "./Layout.module.css";
import { authService } from "./../../services/authService";
import { useAuth } from "../../context/AuthContext";

const Sidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { hasRole } = useAuth();

  const mainNav = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "Accounts", href: "/accounts", icon: CreditCard },
    { name: "Transfers", href: "/transfers", icon: Send },
    { name: "Transactions", href: "/transactions", icon: FileText },
    { name: "Loans", href: "/loans", icon: FileText },
    { name: "Documents", href: "/documents", icon: Upload },
    { name: "Notifications", href: "/notifications", icon: BellRing },
    { name: "Profile", href: "/profile", icon: Settings },
  ];

  const adminNav = [
    { name: "Admin Dashboard", href: "/admin", icon: Home },
    { name: "Users", href: "/admin/users", icon: Users },
    { name: "Security", href: "/admin/security", icon: Shield },
    { name: "Notifications", href: "/admin/notifications", icon: BellRing },
    { name: "Reports", href: "/admin/reports", icon: BarChart3 },
    { name: "Documents", href: "/admin/documents", icon: Upload },
    { name: "Loan Applications", href: "/admin/loans", icon: FileText },
  ];

  const handleLogout = async () => {
    try {
      await authService.logout();
      navigate("/");
    } catch (e) {
      console.error("Logout failed:", e);
    }
  };

  const Section = (title, items, admin = false) => (
    <section className={styles.navSection}>
      <h3 className={styles.navTitle}>{title}</h3>
      {items.map((item) => (
        <Link
          key={item.name}
          to={item.href}
          className={`${styles.navLink} ${admin ? styles.adminLink : ""}`}
          onClick={onClose}
        >
          <item.icon size={20} />
          <span>{item.name}</span>
        </Link>
      ))}
    </section>
  );

  const Header = (
    <header className={styles.sidebarHeader}>
      <h2 className={styles.logo}>
        <Building size={24} className={styles.logoIcon} />
        <span className={styles.sidebarTitle}>FSWD Bank</span>
      </h2>

      <span className={styles.headerActions}>
        <button
          type="button"
          className={styles.iconButton}
          onClick={handleLogout}
          title="Logout"
          aria-label="Logout"
        >
          <LogOut size={20} />
          <span className={styles.hideOnMobile}>Logout</span>
        </button>

        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close Sidebar"
          title="Close"
        >
          <X size={24} />
        </button>
      </span>
    </header>
  );

  const Nav = (
    <nav className={styles.navigation}>
      {Section("Main Menu", mainNav)}
      {/* Only show admin navigation for admin/manager users */}
      {(hasRole('admin') || hasRole('manager')) && Section("Administration", adminNav, true)}
    </nav>
  );

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ""}`}>
      {isOpen && (
        <button
          type="button"
          className={styles.overlay}
          aria-label="Close sidebar overlay"
          onClick={onClose}
        />
      )}
      {Header}
      <main className={styles.sidebarContent}>{Nav}</main>
    </aside>
  );
};

export default Sidebar;
