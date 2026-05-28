import React, { useState, useEffect } from "react";
import { 
  checkCloudConnection,
  getLocalRecords,
  saveLocalRecords 
} from "./api";
import { User, UserRole } from "./types";

// Import Views
import LoginView from "./components/LoginView";
import DashboardView from "./components/DashboardView";
import VisitView from "./components/VisitView";
import ApprovalView from "./components/ApprovalView";
import RevisionView from "./components/RevisionView";
import HistoryView from "./components/HistoryView";
import UsersView from "./components/UsersView";
import SchedulesView from "./components/SchedulesView";

// Lucide Icons
import {
  UserCheck,
  LayoutGrid,
  MapPin,
  FileCheck,
  FileEdit,
  History,
  LogOut,
  Menu,
  X,
  Globe,
  Wifi,
  Users,
  Calendar
} from "lucide-react";

type ActivePageType = "dashboard" | "visit" | "approval" | "revision" | "history" | "users" | "schedules";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activePage, setActivePage] = useState<ActivePageType>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cloudConnected, setCloudConnected] = useState(false);

  // Initialize DB once on start and check connection status from backend
  useEffect(() => {
    getLocalRecords(); // Ensure seed data populated
    checkCloudConnection().then(connected => {
      setCloudConnected(connected);
    });
  }, []);

  // Sync connection status periodically from backend
  useEffect(() => {
    const checkConn = () => {
      checkCloudConnection().then(connected => {
        setCloudConnected(connected);
      });
    };
    const interval = setInterval(checkConn, 5000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    // Redirect based on role
    if (user.role === "SE") {
      setActivePage("visit");
    } else if (user.role === "ADMIN") {
      setActivePage("users");
    } else if (user.role === "DDM") {
      setActivePage("schedules");
    } else {
      setActivePage("dashboard");
    }
  };

  const handleSignOut = () => {
    setCurrentUser(null);
  };

  if (!currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  // Define sidebar menu options contingent on Role
  const menuItems = [
    {
      id: "users",
      label: "Manajemen Akun",
      icon: Users,
      roles: ["ADMIN"]
    },
    {
      id: "schedules",
      label: "Jadwal Kunjungan",
      icon: Calendar,
      roles: ["DDM", "ADMIN"]
    },
    {
      id: "dashboard",
      label: "Dashboard KPI",
      icon: LayoutGrid,
      roles: ["SE", "SPV", "ASM", "DDM", "ADMIN"]
    },
    {
      id: "visit",
      label: "Field Visits (SE)",
      icon: MapPin,
      roles: ["SE"]
    },
    {
      id: "approval",
      label: "Approvals Review",
      icon: FileCheck,
      roles: ["SPV", "ASM", "DDM"]
    },
    {
      id: "revision",
      label: "Revision Board",
      icon: FileEdit,
      roles: ["SE"]
    },
    {
      id: "history",
      label: "Visit Archives",
      icon: History,
      roles: ["SE", "SPV", "ASM", "DDM", "ADMIN"]
    }
  ];

  // Filter menu items by active role scope
  const filteredMenuItems = menuItems.filter(item => item.roles.includes(currentUser.role));

  const renderActivePage = () => {
    switch (activePage) {
      case "users":
        return <UsersView currentUser={currentUser} />;
      case "schedules":
        return <SchedulesView currentUser={currentUser} />;
      case "dashboard":
        return <DashboardView currentUser={currentUser} setActivePage={setActivePage} />;
      case "visit":
        return <VisitView currentUser={currentUser} setActivePage={setActivePage} />;
      case "approval":
        return <ApprovalView currentUser={currentUser} />;
      case "revision":
        return <RevisionView currentUser={currentUser} />;
      case "history":
        return <HistoryView currentUser={currentUser} />;
      default:
        if (currentUser.role === "ADMIN") {
          return <UsersView currentUser={currentUser} />;
        } else if (currentUser.role === "DDM") {
          return <SchedulesView currentUser={currentUser} />;
        } else {
          return <DashboardView currentUser={currentUser} />;
        }
    }
  };

  return (
    <div className="min-h-screen bg-sky-50/30 flex flex-col md:flex-row text-sky-950 font-sans min-w-0 w-full overflow-x-hidden">
      
      {/* 1. Mobile Top Banner Menu Bar */}
      <header className="md:hidden bg-gradient-to-r from-sky-600 to-blue-600 text-white px-4 py-3.5 flex items-center justify-between sticky top-0 z-50 shadow-md w-full">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-white/20 rounded-lg flex items-center justify-center text-white font-bold shrink-0">
            EC
          </div>
          <span className="font-bold text-sm tracking-tight text-white uppercase font-sans truncate">EC Monitoring</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {cloudConnected ? (
            <span className="p-1 px-1.5 bg-white/10 text-white text-[9px] font-bold rounded-lg border border-white/20 flex items-center gap-1">
              <Globe className="w-3 h-3 text-white" /> Cloud
            </span>
          ) : (
            <span className="p-1 px-1.5 bg-white/10 text-white text-[9px] font-bold rounded-lg border border-white/20 flex items-center gap-1">
              <Wifi className="w-3 h-3 text-white" /> Local Sim
            </span>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 bg-white/10 text-white rounded hover:bg-white/20 transition-all cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 animate-scaleUp" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* 2. Side-Navigation Bar (Desktop Responsive) */}
      <aside className={`fixed inset-y-0 left-0 bg-white text-sky-900 w-64 transform ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 md:relative md:flex flex-col shrink-0 transition-transform duration-305 ease-in-out z-40 shadow-md border-r border-sky-100 min-w-0`}>
        {/* Branding header */}
        <div className="p-6 border-b border-sky-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-sky-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-sky-505/20 shrink-0">
              <UserCheck className="w-5 h-5 font-bold" />
            </div>
            <div className="min-w-0">
              <h1 className="font-extrabold text-xs tracking-tight text-sky-950 leading-tight uppercase font-sans truncate">Effective Call</h1>
              <span className="text-[10px] text-sky-500 font-bold uppercase tracking-wider block truncate">Monitoring System</span>
            </div>
          </div>
        </div>

        {/* User Identity Highlight */}
        <div className="px-6 py-4 border-b border-sky-100 flex flex-col bg-sky-50/50 justify-start items-start w-full min-w-0 shrink-0">
          <span className="text-[9px] bg-sky-200/60 text-sky-800 font-extrabold px-2.5 py-0.5 rounded uppercase tracking-widest text-left block w-auto">
            Active {currentUser.role} Account
          </span>
          <span className="mt-2 text-sm font-extrabold text-sky-950 text-left block truncate w-full">{currentUser.name}</span>
          <span className="text-xs text-sky-600 text-left mt-0.5 truncate w-full font-medium">branch: {currentUser.branch || "Head Office"}</span>
        </div>

        {/* Navigations links */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto w-full min-w-0">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setActivePage(item.id as ActivePageType);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-xs tracking-wide cursor-pointer transition-all min-w-0 ${isActive ? "bg-sky-600 text-white shadow-md shadow-sky-500/10" : "text-sky-800/80 hover:bg-sky-50 hover:text-sky-950"}`}
              >
                <Icon className={`w-4 h-4 shrink-0 font-bold ${isActive ? "text-white" : "text-sky-600"}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer controls & Connection flag */}
        <div className="p-4 border-t border-sky-100 space-y-3 bg-sky-50/20 w-full min-w-0 shrink-0">
          <div className="bg-sky-50/60 p-3 rounded-xl border border-sky-100/80 space-y-1 text-left w-full min-w-0">
            <span className="text-[8px] font-extrabold text-sky-500 uppercase tracking-widest block">Connection State:</span>
            {cloudConnected ? (
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 truncate w-full">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping shrink-0 animate-pulse"></span>
                <Globe className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="truncate">Google Sheet DB</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-sky-600 truncate w-full">
                <span className="w-1.5 h-1.5 bg-sky-400 rounded-full shrink-0"></span>
                <Wifi className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                <span className="truncate">Local Simulator</span>
              </div>
            )}
          </div>

          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-50 hover:bg-rose-50 hover:text-rose-700 text-xs font-bold transition-all text-sky-800 cursor-pointer border border-sky-100 hover:border-rose-100"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* 3. Main Workspace Area */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full min-w-0">
        {renderActivePage()}
      </main>

      {/* Backdrop cover for mobile menu */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-sky-950/25 md:hidden z-30 transition-all duration-300"
        ></div>
      )}
    </div>
  );
}
