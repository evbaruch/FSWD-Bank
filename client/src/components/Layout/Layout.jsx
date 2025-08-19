import React, { useState } from "react";
import { Menu } from "lucide-react";
import Sidebar from "./Sidebar";
import ChatBot from "../ChatBot/ChatBot";
import styles from "./Layout.module.css";

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className={styles.layout}>
      <button
        className={styles.sidebarToggle}
        onClick={toggleSidebar}
        aria-label="Toggle Sidebar"
      >
        <Menu size={24} />
      </button>

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <ChatBot />

      <main className={styles.mainContent}>{children}</main>
    </div>
  );
};

export default Layout;
