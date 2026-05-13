import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import Disclaimer from "./Disclaimer";

interface AppLayoutProps {
  title: string;
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ title, children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="app-main">
        <Topbar title={title} onMenuClick={() => setSidebarOpen((v) => !v)} />
        {/* paddingBottom keeps content above the fixed disclaimer banner */}
        <div className="page-content" style={{ paddingBottom: 56 }}>
          {children}
        </div>
      </div>
      <Disclaimer />
    </div>
  );
};

export default AppLayout;
