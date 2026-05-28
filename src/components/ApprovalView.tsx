import React, { useState, useEffect } from "react";
import { 
  getVisitHistory, 
  approveVisit, 
  rejectVisit 
} from "../api";
import { User, Visit } from "../types";
import { 
  ShieldAlert, 
  Check, 
  X, 
  Eye, 
  FileCheck, 
  Clock, 
  Coins, 
  AlertOctagon,
  CornerDownRight,
  RefreshCw,
  TrendingUp,
  Inbox
} from "lucide-react";

interface ApprovalViewProps {
  currentUser: User;
}

export default function ApprovalView({ currentUser }: ApprovalViewProps) {
  const [pendingItems, setPendingItems] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  
  // Rejection modal state
  const [rejectionNotes, setRejectionNotes] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const fetchPendingItems = async (silent: boolean = false) => {
    if (!silent) setLoading(true);
    try {
      // Fetch history with initial list, we will filter manually to match the precise approval stage
      const allVisits = await getVisitHistory({ username: currentUser.username, role: currentUser.role });
      
      let approvalStageItems: Visit[] = [];
      
      if (currentUser.role === "SPV") {
        // SPV authorizes visits with states SUBMITTED or RESUBMITTED
        approvalStageItems = allVisits.filter(v => v.approval_status === "SUBMITTED" || v.approval_status === "RESUBMITTED");
      } else if (currentUser.role === "ASM") {
        // ASM authorizes visits with state SPV_APPROVED
        approvalStageItems = allVisits.filter(v => v.approval_status === "SPV_APPROVED");
      } else if (currentUser.role === "DDM") {
        // DDM authorizes visits with state ASM_APPROVED
        approvalStageItems = allVisits.filter(v => v.approval_status === "ASM_APPROVED");
      }

      setPendingItems(approvalStageItems);
    } catch (err) {
      console.error("Error fetching approval queues:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingItems();

    // Auto-sync polling every 15 seconds
    const interval = setInterval(() => {
      fetchPendingItems(true);
    }, 15000);

    return () => clearInterval(interval);
  }, [currentUser]);

  const handleApproveAction = async (visit: Visit) => {
    setActioningId(visit.record_id);
    try {
      await approveVisit(visit.record_id, currentUser.name, currentUser.role);
      
      // Remove from list
      setPendingItems(prev => prev.filter(item => item.record_id !== visit.record_id));
      if (selectedVisit?.record_id === visit.record_id) {
        setSelectedVisit(null);
      }
    } catch (err: any) {
      alert("Failed approving visit: " + (err.message || err));
    } finally {
      setActioningId(null);
    }
  };

  const handleOpenRejectModal = (visit: Visit) => {
    setSelectedVisit(visit);
    setRejecting(true);
    setRejectionNotes("");
  };

  const submitRejectionAction = async () => {
    if (!selectedVisit) return;
    if (!rejectionNotes.trim()) {
      alert("Please provide the correction notes explaining why this visit is rejected.");
      return;
    }

    setActioningId(selectedVisit.record_id);
    try {
      await rejectVisit(
        selectedVisit.record_id,
        currentUser.name,
        currentUser.role,
        rejectionNotes.trim()
      );

      // Remove from list
      setPendingItems(prev => prev.filter(item => item.record_id !== selectedVisit.record_id));
      setSelectedVisit(null);
      setRejecting(false);
    } catch (err: any) {
      alert("Failed executing rejection: " + (err.message || err));
    } finally {
      setActioningId(null);
    }
  };

  const formatIDR = (num: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(num);
  };

  return (
    <div className="space-y-6 w-full min-w-0">
      {/* Intro section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-sky-100 shadow-sm w-full min-w-0">
        <div className="min-w-0">
          <h2 className="text-lg font-black text-sky-955 truncate">Pending Approvals Queue</h2>
          <p className="text-xs text-sky-600 font-semibold leading-relaxed mt-0.5">
            Authorization Level: <span className="bg-sky-100 text-sky-850 px-2.5 py-0.5 rounded font-black text-[10px] uppercase tracking-wider">{currentUser.role}</span> &bull; 
            Supervisor scope checklist. Verify shelf photos and check records.
          </p>
        </div>
        <button
          onClick={fetchPendingItems}
          className="px-3.5 py-2 bg-sky-50 hover:bg-sky-100 border border-sky-100 rounded-xl text-xs font-bold text-sky-800 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5 text-sky-600 shrink-0" />
          <span>Sync Pipeline</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20 w-full">
          <div className="animate-spin h-8 w-8 border-4 border-sky-605 border-t-transparent rounded-full font-bold"></div>
        </div>
      ) : pendingItems.length === 0 ? (
        <div className="bg-white rounded-2xl border border-sky-100 p-12 text-center text-sky-500/70 space-y-3 min-w-0">
          <div className="mx-auto h-12 w-12 bg-sky-50/50 rounded-full flex items-center justify-center text-sky-450 shrink-0">
            <Inbox className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h4 className="font-extrabold text-sky-905 text-sm">Inbox Fully Cleared!</h4>
            <p className="text-xs text-sky-600 max-w-xs mx-auto mt-1 leading-relaxed">
              There are no pending sales check-ins submitted in your territory awaiting approval at this stage.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full min-w-0">
          {/* Main items index table/list */}
          <div className="lg:col-span-2 space-y-3 min-w-0 w-full">
            {pendingItems.map((item) => (
              <div
                key={item.record_id}
                onClick={() => { setSelectedVisit(item); setRejecting(false); }}
                className={`p-4 bg-white rounded-2xl border border-sky-100 transition-all cursor-pointer text-left relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-w-0 w-full ${selectedVisit?.record_id === item.record_id ? "ring-2 ring-sky-500 border-transparent shadow shadow-sky-500/10" : "hover:border-sky-305"}`}
              >
                {/* Visual marker of type of submit */}
                {item.approval_status === "RESUBMITTED" && (
                  <div className="absolute top-0 left-0 h-full w-1.5 bg-amber-500" title="Resubmitted correction request"></div>
                )}

                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <div className="h-14 w-14 rounded-xl overflow-hidden border border-sky-105 shrink-0 bg-sky-50/10">
                    <img 
                      src={item.photo_url} 
                      alt="" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-sm text-sky-955 break-words leading-tight">{item.store_name}</h4>
                      {item.approval_status === "RESUBMITTED" && (
                        <span className="bg-amber-100 text-amber-800 font-extrabold text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
                          REVISION {item.revision_count}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-xs text-sky-600 truncate">
                      Submitted by: <strong className="text-sky-850">{item.username}</strong> on {item.visit_date} &bull; {item.checkin_time}
                    </p>

                    <div className="flex items-center gap-3 pt-1 text-xs font-semibold">
                      <span className="text-[11px] font-bold text-sky-850 flex items-center gap-0.5 shrink-0">
                        <Coins className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> {formatIDR(item.omzet)}
                      </span>
                      <span className="text-sky-155 shrink-0">&bull;</span>
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full shrink-0 ${item.effective_call === "YES" ? "bg-emerald-50 text-emerald-700" : "bg-sky-50 border border-sky-100/50 text-sky-750"}`}>
                        Effective: {item.effective_call}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Direct quick action buttons */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApproveAction(item);
                    }}
                    disabled={actioningId === item.record_id}
                    className="p-2 px-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl hover:bg-emerald-100 transition-all text-xs font-bold flex items-center gap-1 shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    <Check className="w-4 h-4 shrink-0" /> Approve
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenRejectModal(item);
                    }}
                    disabled={actioningId === item.record_id}
                    className="p-2 px-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl hover:bg-rose-100 transition-all text-xs font-bold flex items-center gap-1 shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    <X className="w-4 h-4 shrink-0" /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Details / Interactive side drawer */}
          <div className="lg:col-span-1 min-w-0 w-full">
            {selectedVisit ? (
              <div className="bg-white rounded-2xl border border-sky-100 p-5 shadow-sm space-y-5 text-left sticky top-6 min-w-0 w-full overflow-hidden">
                <div className="flex justify-between items-start min-w-0 gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="text-[9px] bg-sky-100 text-sky-800 font-extrabold px-2.5 py-0.5 rounded uppercase tracking-widest block w-max leading-none">Selected Report</span>
                    <h3 className="text-md font-bold text-sky-955 mt-2.5 break-words leading-tight">{selectedVisit.store_name}</h3>
                    <p className="text-[10px] text-sky-500 font-mono font-bold mt-1">ID: {selectedVisit.record_id}</p>
                  </div>
                  <button
                    onClick={() => setSelectedVisit(null)}
                    className="p-1.5 hover:bg-sky-55/65 rounded-full text-sky-400 transition-all shrink-0 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="rounded-xl overflow-hidden border border-sky-100 h-44 bg-sky-50/10 shrink-0">
                  <img 
                    src={selectedVisit.photo_url} 
                    alt="Active display upload" 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer"
                  />
                </div>

                <div className="space-y-3.5 border-t border-b border-sky-100/70 py-4 text-xs font-semibold text-sky-655 w-full min-w-0">
                  <div className="flex justify-between gap-2 pb-1">
                    <span className="shrink-0">Field Representative:</span>
                    <strong className="text-sky-950 truncate">{selectedVisit.username}</strong>
                  </div>
                  <div className="flex justify-between gap-2 pb-1">
                    <span className="shrink-0">Visit Date / Time:</span>
                    <span className="text-sky-850 font-mono text-right">{selectedVisit.visit_date} - {selectedVisit.checkin_time}</span>
                  </div>
                  <div className="flex justify-between gap-2 pb-1">
                    <span className="shrink-0 font-bold">Reported Omzet:</span>
                    <strong className="text-sky-955 text-sm font-black">{formatIDR(selectedVisit.omzet)}</strong>
                  </div>
                  <div className="flex justify-between gap-2 pb-1">
                    <span className="shrink-0">Effective Call Status:</span>
                    <span className={`font-black text-[10px] px-2.5 py-0.5 rounded-full shrink-0 ${selectedVisit.effective_call === "YES" ? "bg-emerald-100 text-emerald-800" : "bg-sky-50 border border-sky-100/50 text-sky-850"}`}>
                      {selectedVisit.effective_call}
                    </span>
                  </div>
                  {selectedVisit.notes && (
                    <div className="space-y-1 bg-sky-50/40 p-3 rounded-xl border border-sky-100/30 text-[11px] leading-relaxed min-w-0 break-words">
                      <span className="font-bold text-sky-800 block">Visit Notes &amp; Findings:</span>
                      <p className="text-sky-905 italic font-medium">"{selectedVisit.notes}"</p>
                    </div>
                  )}

                  {/* Previous Approvals Chain if hierarchy */}
                  <div className="space-y-2 pt-3 border-t border-sky-100/40 w-full">
                    <span className="font-bold text-sky-500 text-[10px] uppercase tracking-wider block">Approval Chain Path:</span>
                    <div className="space-y-1 text-[10px] font-bold text-sky-600">
                      <div className="flex items-center justify-between">
                        <span>1. SPV Review:</span>
                        <span className={`font-black ${selectedVisit.spv_approval === "PENDING" ? "text-amber-500" : "text-emerald-600"}`}>{selectedVisit.spv_approval}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>2. ASM Review:</span>
                        <span className={`font-black ${selectedVisit.asm_approval === "PENDING" ? "text-amber-500" : "text-emerald-600"}`}>{selectedVisit.asm_approval}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>3. DDM Review:</span>
                        <span className={`font-black ${selectedVisit.ddm_approval === "PENDING" ? "text-amber-500" : "text-emerald-600"}`}>{selectedVisit.ddm_approval}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Reject formulation input */}
                {rejecting ? (
                  <div className="space-y-3.5 bg-rose-50 border border-rose-100/80 p-4 rounded-xl min-w-0 break-words">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-rose-800 uppercase tracking-wide">
                        What correction needs revision?
                      </label>
                      <button onClick={() => setRejecting(false)} className="text-rose-500 hover:text-rose-700 cursor-pointer">
                        <X className="w-4 h-4 shrink-0" />
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      value={rejectionNotes}
                      onChange={(e) => setRejectionNotes(e.target.value)}
                      placeholder="e.g. Please clarify the low omzet or provide a clearer photo of the shelf Display..."
                      className="block w-full border border-rose-200 rounded-xl p-2.5 text-xs text-rose-950 focus:outline-none focus:ring-1 focus:ring-rose-500 bg-white"
                    />
                    <div className="flex justify-end gap-2 text-xs font-bold">
                      <button
                        onClick={() => setRejecting(false)}
                        className="px-3 py-1.5 border border-rose-200 rounded-xl text-rose-700 bg-white hover:bg-rose-50/20 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={submitRejectionAction}
                        className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl flex items-center gap-1 shadow-sm cursor-pointer"
                      >
                        Confirm Rejection
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 pt-1 text-xs font-bold">
                    <button
                      onClick={() => handleOpenRejectModal(selectedVisit)}
                      className="py-2.5 bg-rose-50 border border-rose-205 hover:bg-rose-100 rounded-xl text-rose-700 tracking-wide transition-all text-center flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <X className="w-4 h-4 shrink-0" /> Send Back (Reject)
                    </button>
                    <button
                      onClick={() => handleApproveAction(selectedVisit)}
                      className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl tracking-wide font-bold transition-all text-center flex items-center justify-center gap-1 shadow-md shadow-emerald-500/10 cursor-pointer"
                    >
                      <Check className="w-4 h-4 shrink-0" /> Approve Report
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-sky-50/20 border border-sky-100 rounded-2xl h-96 p-6 flex flex-col justify-center items-center text-center text-sky-400 sticky top-6">
                <FileCheck className="w-12 h-12 mb-3 text-sky-305 shrink-0" />
                <h4 className="font-bold text-sky-905 text-sm">Review Panel</h4>
                <p className="text-xs text-sky-650 max-w-xs mt-1 leading-relaxed">
                  Select a pending check-in request item from the table list on the left to review photos, audit omzet records, and stamp approval keys.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
