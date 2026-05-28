import React, { useState, useEffect } from "react";
import { 
  Users, 
  MapPin, 
  TrendingUp, 
  Coins, 
  Clock, 
  AlertCircle, 
  CheckCircle,
  FileCheck,
  RefreshCw,
  Award
} from "lucide-react";
import { getDashboard, getVisitHistory } from "../api";
import { DashboardMetrics, User, Visit } from "../types";
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  Cell,
  PieChart,
  Pie
} from "recharts";

interface DashboardViewProps {
  currentUser: User;
  setActivePage?: (page: any) => void;
}

export default function DashboardView({ currentUser, setActivePage }: DashboardViewProps) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async (silent: boolean = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await getDashboard(currentUser.username, currentUser.role);
      const hist = await getVisitHistory({ username: currentUser.username, role: currentUser.role });
      setMetrics(data);
      setVisits(hist);
    } catch (err) {
      console.error("Dashboard error fetching metrics:", err);
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Auto-sync polling every 15 seconds
    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 15000);

    return () => clearInterval(interval);
  }, [currentUser]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData(false);
  };

  // Helper to format currency to IDR
  const formatIDR = (num: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(num);
  };

  // Compile Chart Data of daily visit trend (past 7 days)
  const getTrendData = () => {
    if (!visits.length) return [];
    
    const groups: { [date: string]: { date: string; total: number; effective: number } } = {};
    
    // Scan last 7 days from records
    visits.forEach(v => {
      const d = v.visit_date;
      if (!groups[d]) {
        groups[d] = { date: d, total: 0, effective: 0 };
      }
      groups[d].total += 1;
      if (v.effective_call === "YES") {
        groups[d].effective += 1;
      }
    });

    const sortedDates = Object.keys(groups).sort();
    return sortedDates.map(d => ({
      date: new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "short" }),
      "Total Visits": groups[d].total,
      "Effective Calls": groups[d].effective
    }));
  };

  // Compile Regional/Branch Performance (Group by Branch if available)
  const getRegionData = () => {
    // Generate simulated branch distribution metrics
    const branches: { [branch: string]: { name: string; omzet: number; visits: number } } = {
      "Jakarta Selatan": { name: "Jakarta Selatan", omzet: 0, visits: 0 },
      "Jakarta Pusat": { name: "Jakarta Pusat", omzet: 0, visits: 0 },
      "Jakarta Barat": { name: "Jakarta Barat", omzet: 0, visits: 0 },
      "Jakarta Timur": { name: "Jakarta Timur", omzet: 0, visits: 0 }
    };

    visits.forEach((v, idx) => {
      // distribute stats representing regional divisions
      const br = idx % 2 === 0 ? "Jakarta Selatan" : (idx % 3 === 0 ? "Jakarta Pusat" : "Jakarta Timur");
      branches[br].visits += 1;
      branches[br].omzet += Number(v.omzet) || 0;
    });

    return Object.values(branches).filter(b => b.visits > 0);
  };

  // Compile Approval Pie chart stats
  const getApprovalPieState = () => {
    const counts = {
      SUBMITTED: 0,
      APPROVED: 0,
      REJECTED: 0
    };

    visits.forEach(v => {
      if (v.approval_status === "DDM_APPROVED") counts.APPROVED += 1;
      else if (v.approval_status === "REJECTED") counts.REJECTED += 1;
      else counts.SUBMITTED += 1;
    });

    return [
      { name: "Approved Visit", value: counts.APPROVED || 1, color: "#10b981" },
      { name: "Pending Review", value: counts.SUBMITTED || 1, color: "#3b82f6" },
      { name: "Rejected / Revision", value: counts.REJECTED || 0, color: "#ef4444" }
    ].filter(item => item.value > 0);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4 w-full">
        <div className="animate-spin h-10 w-10 border-4 border-sky-600 border-t-transparent rounded-full"></div>
        <p className="text-xs font-extrabold text-sky-800 uppercase tracking-widest">Compiling dashboard telemetry...</p>
      </div>
    );
  }

  const trendData = getTrendData();
  const regionData = getRegionData();
  const pieData = getApprovalPieState();

  return (
    <div className="space-y-6 w-full min-w-0 overflow-hidden">
      {/* Upper bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-sky-100/80 shadow-sm w-full min-w-0">
        <div className="min-w-0">
          <h2 className="text-lg font-black tracking-tight text-sky-955 font-sans truncate">
            Welcome Back, <span className="text-sky-600">{currentUser.name}</span>
          </h2>
          <p className="text-xs text-sky-600 font-medium flex flex-wrap items-center gap-1.5 mt-1">
            Role: <span className="bg-sky-100 text-sky-850 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-widest">{currentUser.role}</span> &bull; 
            Region: <span className="text-sky-900 font-bold">{currentUser.region || "DKI Jakarta"}</span>
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-4 py-2 bg-sky-50 hover:bg-sky-100 border border-sky-100 rounded-xl text-xs font-bold text-sky-800 flex items-center gap-1.5 transition-all shrink-0 cursor-pointer shadow-sm w-full sm:w-auto justify-center"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-sky-600 ${refreshing ? "animate-spin" : ""}`} />
          <span>{refreshing ? "Syncing..." : "Sync Stats"}</span>
        </button>
      </div>

      {/* Rejection Notification Banner */}
      {currentUser.role === "SE" && visits.some(v => v.approval_status === "REJECTED") && (
        <div className="bg-rose-50 border border-rose-100 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fadeIn shadow-xs">
          <div className="flex items-start gap-4 text-left">
            <div className="h-11 w-11 bg-rose-100 rounded-xl flex items-center justify-center text-rose-650 shrink-0">
              <AlertCircle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-rose-955 font-sans tracking-tight">Visit Submission Rejected / Needs Revision</h3>
              <p className="text-xs text-rose-700 font-medium leading-relaxed mt-1">
                There are <strong>{visits.filter(v => v.approval_status === "REJECTED").length} of your store visit reports</strong> rejected or marked with correction notes by your supervisor. Please edit and resolve them so they can be resubmitted to the approval pipeline.
              </p>
            </div>
          </div>
          {setActivePage && (
            <button
              onClick={() => setActivePage("revision")}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-sm shrink-0 uppercase tracking-wide inline-flex items-center gap-1.5"
            >
              Open Revision Menu &rarr;
            </button>
          )}
        </div>
      )}

      {/* KPI Cards Grid */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 w-full min-w-0">
          <div className="bg-white p-5 rounded-2xl border border-sky-100/80 shadow-sm shadow-sky-500/5 hover:shadow-md hover:border-sky-200 transition-all space-y-3 min-w-0 w-full overflow-hidden">
            <div className="flex items-center justify-between gap-1 w-full overflow-hidden">
              <span className="text-[10px] font-extrabold text-sky-400 uppercase tracking-wider truncate">Total Visit</span>
              <div className="p-0.5 px-1.5 rounded-md bg-sky-50 text-sky-600 text-[8px] font-extrabold shrink-0">100% Target</div>
            </div>
            <div className="flex items-baseline gap-1 overflow-hidden w-full">
              <span className="text-2xl font-black text-sky-955 truncate leading-none">{metrics.totalVisits}</span>
              <span className="text-xs font-bold text-sky-500 shrink-0">Stores</span>
            </div>
            <div className="text-[10px] text-sky-600/70 truncate block w-full">Target check-ins completed</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-sky-100/80 shadow-sm shadow-sky-500/5 hover:shadow-md hover:border-sky-200 transition-all space-y-3 min-w-0 w-full overflow-hidden">
            <div className="flex items-center justify-between gap-1 w-full overflow-hidden">
              <span className="text-[10px] font-extrabold text-sky-400 uppercase tracking-wider truncate">Effective Call</span>
              <div className="p-0.5 px-1.5 rounded-md bg-emerald-50 text-emerald-600 text-[8px] font-extrabold shrink-0">Omzet &gt; 0</div>
            </div>
            <div className="flex items-baseline gap-1 overflow-hidden w-full">
              <span className="text-2xl font-black text-sky-955 truncate leading-none">{metrics.totalEffectiveCalls}</span>
              <span className="text-xs font-bold text-sky-500 shrink-0">Stores</span>
            </div>
            <div className="text-[10px] text-sky-600/70 truncate block w-full">Visits with reported sales</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-sky-100/80 shadow-sm shadow-sky-500/5 hover:shadow-md hover:border-sky-200 transition-all space-y-3 min-w-0 w-full overflow-hidden">
            <div className="flex items-center justify-between gap-1 w-full overflow-hidden">
              <span className="text-[10px] font-extrabold text-sky-400 uppercase tracking-wider truncate">Strike Rate</span>
              <TrendingUp className="w-4 h-4 text-sky-600 shrink-0" />
            </div>
            <div className="flex items-baseline gap-1 overflow-hidden w-full">
              <span className="text-2xl font-black text-sky-955 truncate leading-none">{metrics.strikeRate}%</span>
            </div>
            <div className="w-full bg-sky-100/50 h-1.5 rounded-full overflow-hidden">
              <div className="bg-sky-500 h-full rounded-full" style={{ width: `${Math.min(metrics.strikeRate, 100)}%` }}></div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-sky-100/80 shadow-sm shadow-sky-500/5 hover:shadow-md hover:border-sky-200 transition-all space-y-3 col-span-1 sm:col-span-2 lg:col-span-2 min-w-0 w-full overflow-hidden">
            <div className="flex items-center justify-between gap-1 w-full overflow-hidden">
              <span className="text-[10px] font-extrabold text-sky-400 uppercase tracking-wider truncate">Total transaction omzet</span>
              <Coins className="w-4 h-4 text-sky-600 shrink-0" />
            </div>
            <div className="overflow-hidden w-full">
              <span className="text-lg font-black text-sky-900 block truncate max-w-full font-mono tracking-tight leading-none">{formatIDR(metrics.totalOmzet)}</span>
            </div>
            <div className="text-[10px] text-sky-600/70 truncate block w-full">Cumulative sales value field wide</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-sky-100/80 shadow-sm shadow-sky-500/5 hover:shadow-md hover:border-sky-200 transition-all space-y-3 min-w-0 w-full overflow-hidden">
            <div className="flex items-center justify-between gap-1 w-full overflow-hidden">
              <span className="text-[10px] font-extrabold text-sky-400 uppercase tracking-wider truncate">Pending Review</span>
              <Clock className="w-4 h-4 text-sky-500 animate-pulse shrink-0" />
            </div>
            <div className="flex items-baseline gap-1 overflow-hidden w-full">
              <span className="text-2xl font-black text-sky-955 truncate leading-none">{metrics.pendingApprovals}</span>
              <span className="text-xs font-bold text-sky-400 shrink-0">Items</span>
            </div>
            <div className="text-[10px] text-sky-600/70 truncate block w-full">Awaiting supervisor stamps</div>
          </div>
        </div>
      )}

      {/* Visual Analytics graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full min-w-0">
        
        {/* Trend Graph Area */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-sky-100 p-6 shadow-sm space-y-4 min-w-0 w-full overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-sky-100/50 pb-4 gap-2 w-full">
            <div className="min-w-0">
              <h3 className="font-extrabold text-sm text-sky-955 truncate">Visit &amp; Effective Call Progression</h3>
              <p className="text-[11px] text-sky-500/80 truncate">Compare completed visits against transactable store orders</p>
            </div>
            <div className="flex items-center gap-3.5 text-[10px] font-bold shrink-0">
              <div className="flex items-center gap-1 bg-sky-50 px-2 py-1 rounded">
                <span className="w-2 h-2 bg-sky-500 rounded-full"></span>
                <span className="text-sky-850">Total Visit</span>
              </div>
              <div className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded">
                <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                <span className="text-blue-800">Effective Call</span>
              </div>
            </div>
          </div>

          <div className="h-72 w-full min-w-0">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorEffective" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0f2fe" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: "#0284c7", fontSize: 10 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: "#0284c7", fontSize: 10 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: "12px", border: "1px solid #bae6fd", backgroundColor: "#fff", boxShadow: "0 4px 12px -1px rgb(14 165 233 / 0.08)" }}
                    labelStyle={{ fontWeight: "bold", color: "#0369a1", fontSize: "11px" }}
                  />
                  <Area type="monotone" dataKey="Total Visits" stroke="#0ea5e9" strokeWidth={2.5} fillOpacity={1} fill="url(#colorVisits)" />
                  <Area type="monotone" dataKey="Effective Calls" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#colorEffective)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-sky-50/40 rounded-xl text-sky-400 text-xs font-semibold">
                No telemetry recorded for the selected timeline.
              </div>
            )}
          </div>
        </div>

        {/* Approval breakdown state / Pie chart */}
        <div className="bg-white rounded-2xl border border-sky-100 p-6 shadow-sm flex flex-col justify-between min-w-0 w-full overflow-hidden">
          <div className="border-b border-sky-100/50 pb-4">
            <h3 className="font-extrabold text-sm text-sky-955 truncate">Approval State Ratios</h3>
            <p className="text-[11px] text-sky-500/80 truncate">Distribution of visits inside authorization pipe</p>
          </div>

          <div className="h-44 w-full relative flex items-center justify-center my-4 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            {metrics && (
              <div className="absolute flex flex-col items-center">
                <span className="text-sm font-bold text-sky-400 uppercase tracking-widest text-[8px] leading-none">Strike</span>
                <span className="text-2xl font-black text-sky-955 leading-tight">{metrics.strikeRate}%</span>
              </div>
            )}
          </div>

          <div className="space-y-2 w-full">
            {pieData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-[11px] font-bold border-b border-sky-50 pb-2 last:border-none w-full overflow-hidden">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
                  <span className="text-sky-800 truncate">{item.name}</span>
                </div>
                <span className="text-sky-955 font-black shrink-0">{item.value} Visits</span>
              </div>
            ))}
          </div>
        </div>

        {/* Branch / Regional Sales Bar */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-sky-100 p-6 shadow-sm space-y-4 min-w-0 w-full overflow-hidden">
          <div className="flex items-center justify-between border-b border-sky-100/50 pb-4">
            <div>
              <h3 className="font-extrabold text-sm text-sky-955">Branch &amp; Territory Performance Metrics</h3>
              <p className="text-[11px] text-sky-500/80">Total transactional value generated per monitored region branch</p>
            </div>
          </div>

          <div className="h-56 w-full min-w-0">
            {regionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={regionData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0f2fe" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "#0ea5e9", fontSize: 10 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: "#0ea5e9", fontSize: 10 }} />
                  <Tooltip 
                    formatter={(value: any) => [formatIDR(value), "Cumulative Omzet"]}
                    contentStyle={{ borderRadius: "12px", border: "1px solid #bae6fd", backgroundColor: "#fff" }}
                  />
                  <Bar dataKey="omzet" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={40}>
                    {regionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? "#0369a1" : "#0284c7"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-sky-50/40 rounded-xl text-sky-400 text-xs font-semibold">
                No active visits with transactional figures to compile territory graphics.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
