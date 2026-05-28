import React, { useState, useEffect } from "react";
import { 
  getVisitHistory, 
  resubmitVisit 
} from "../api";
import { User, Visit } from "../types";
import { 
  AlertCircle, 
  FileEdit, 
  CheckCircle, 
  Camera, 
  FileText, 
  CornerDownRight,
  Upload,
  UploadCloud,
  X,
  FileImage,
  RefreshCw,
  Archive,
  ArrowRight
} from "lucide-react";

interface RevisionViewProps {
  currentUser: User;
}

export default function RevisionView({ currentUser }: RevisionViewProps) {
  const [rejectedVisits, setRejectedVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [revisionOmzet, setRevisionOmzet] = useState<number | "">("");
  const [revisionNotes, setRevisionNotes] = useState("");
  const [revisionPhoto, setRevisionPhoto] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const fetchRejectedVisits = async (silent: boolean = false) => {
    if (!silent) setLoading(true);
    try {
      const allHistory = await getVisitHistory({ username: currentUser.username, role: currentUser.role });
      // Filter list of visits belonging to this SE with status = "REJECTED" or containing a rejection stamp
      const rejected = allHistory.filter(v => v.approval_status === "REJECTED");
      setRejectedVisits(rejected);
    } catch (err) {
      console.error("Error fetching rejected reports:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchRejectedVisits();

    // Auto-sync polling every 15 seconds
    const interval = setInterval(() => {
      fetchRejectedVisits(true);
    }, 15000);

    return () => clearInterval(interval);
  }, [currentUser]);

  const handleOpenForm = (visit: Visit) => {
    setSelectedVisit(visit);
    setRevisionOmzet(visit.omzet);
    setRevisionNotes(visit.notes || "");
    setRevisionPhoto(visit.photo_url || "");
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setRevisionPhoto(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setRevisionPhoto(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!selectedVisit) return;
    if (revisionOmzet === "" || isNaN(Number(revisionOmzet)) || Number(revisionOmzet) < 0) {
      setErrorMsg("VALIDATION ERROR: Valid Transaction Value (Omzet) is required. Enter 0 if no transactions occurred.");
      return;
    }
    if (!revisionPhoto) {
      setErrorMsg("VALIDATION ERROR: Photo represents critical audit trail. A valid store shelf snapshot is required.");
      return;
    }

    setSubmitting(true);
    try {
      await resubmitVisit(
        selectedVisit.record_id,
        Number(revisionOmzet),
        revisionNotes.trim(),
        revisionPhoto
      );

      setSuccessMsg(`REVISION SUBMITTED: The store visit report to "${selectedVisit.store_name}" has been resubmitted successfully with updated records!`);
      setSelectedVisit(null);
      // Reload lists
      await fetchRejectedVisits();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed resubmitting the revision report.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatIDR = (num: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(num);
  };

  const computedEffectiveCall = revisionOmzet !== "" && Number(revisionOmzet) > 0 ? "YES" : "NO";

  return (
    <div className="space-y-6 max-w-5xl mx-auto text-left w-full min-w-0">
      {/* Intro block */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-sky-100 shadow-sm w-full min-w-0">
        <div className="min-w-0">
          <h2 className="text-lg font-black text-sky-955 truncate">Revision Terminal (Sales SE)</h2>
          <p className="text-xs text-sky-605 font-medium leading-relaxed mt-0.5">
            Review store reports rejected or flagged by supervisors. Address correction notes and resubmit for certification.
          </p>
        </div>
        <button
          onClick={fetchRejectedVisits}
          className="px-3.5 py-2 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-100 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5 text-sky-605 shrink-0" />
          <span>Sync Corrections</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border-l-4 border-emerald-500 text-emerald-900 text-xs font-semibold">
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border-l-4 border-rose-500 text-rose-900 text-xs flex items-start gap-1.5 leading-relaxed font-bold">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 w-full">
          <div className="animate-spin h-8 w-8 border-4 border-sky-605 border-t-transparent rounded-full font-bold"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full min-w-0">
          {/* List of active corrections */}
          <div className="lg:col-span-1 space-y-4 min-w-0 w-full">
            <h3 className="text-xs font-bold text-sky-400 uppercase tracking-widest pl-1">
              Flagged Visits ({rejectedVisits.length})
            </h3>

            {rejectedVisits.length === 0 ? (
              <div className="bg-white p-8 text-center rounded-2xl border border-sky-100 text-sky-500/70 text-xs font-medium">
                All outstanding reports are in order. No pending supervisor revision flags!
              </div>
            ) : (
              <div className="space-y-3 min-w-0 w-full">
                {rejectedVisits.map((item) => (
                  <div
                    key={item.record_id}
                    onClick={() => handleOpenForm(item)}
                    className={`p-4 bg-white rounded-2xl border border-sky-100 transition-all cursor-pointer text-left relative overflow-hidden min-w-0 w-full ${selectedVisit?.record_id === item.record_id ? "ring-2 ring-sky-500 border-transparent shadow shadow-sky-500/10" : "hover:border-sky-305"}`}
                  >
                    <div className="absolute top-0 left-0 h-full w-1.5 bg-rose-500"></div>

                    <div className="space-y-2 min-w-0">
                      <div className="flex justify-between items-start gap-2 min-w-0">
                        <h4 className="font-extrabold text-sm text-sky-955 break-words line-clamp-1">{item.store_name}</h4>
                        <span className="text-[9px] font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded-full shrink-0">
                          Correction Required
                        </span>
                      </div>
                      
                      {/* Rejection reason preview */}
                      <p className="text-[11px] text-rose-850 leading-relaxed font-bold bg-rose-50/70 p-2.5 rounded-xl border border-rose-100/80 line-clamp-2">
                        "{item.rejection_notes || "Please check details."}"
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-sky-500 font-semibold min-w-0">
                        <span className="truncate">Submitted {item.visit_date}</span>
                        <span className="font-mono bg-sky-50 border border-sky-100/50 px-1.5 py-0.5 rounded shrink-0 text-sky-800 font-bold">REV: {item.revision_count}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Revision Form container */}
          <div className="lg:col-span-2 min-w-0 w-full">
            {selectedVisit ? (
              <form onSubmit={handleSubmitRevision} className="bg-white p-6 rounded-2xl border border-sky-100/80 shadow-sm space-y-6 w-full min-w-0">
                <div className="flex items-center justify-between border-b border-sky-100/60 pb-4 min-w-0 gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="text-[9px] bg-rose-50 text-rose-800 px-2 py-0.5 rounded-md font-extrabold uppercase tracking-widest">Resubmit Corrected Audit</span>
                    <h3 className="text-lg font-black text-sky-955 mt-1 truncate">{selectedVisit.store_name}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedVisit(null)}
                    className="p-1 text-sky-400 hover:bg-sky-50 rounded-full cursor-pointer shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Supervisor Notes Spotlight banner */}
                <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-xl flex items-start gap-2.5 min-w-0 break-words">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5 animate-bounce" />
                  <div className="space-y-1 text-xs text-rose-955 min-w-0 flex-1">
                    <span className="font-black uppercase tracking-wider text-[10px]">Supervisor Comment:</span>
                    <p className="italic font-bold leading-relaxed font-sans">
                      "{selectedVisit.rejection_notes || "Please audit transactional metrics and photos before submit."}"
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 w-full min-w-0">
                  
                  {/* Photo Replacement */}
                  <div className="space-y-3 font-medium min-w-0">
                    <label className="block text-xs font-bold text-sky-500 uppercase tracking-widest leading-none">
                      Correct Store Display Photo (Mandatory)
                    </label>

                    {revisionPhoto ? (
                      <div className="relative rounded-2xl overflow-hidden border border-sky-100 h-48 group bg-sky-50/10">
                        <img 
                          src={revisionPhoto} 
                          alt="Revised display upload" 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => setRevisionPhoto("")}
                            className="bg-white text-rose-600 p-2 px-3 rounded-xl font-bold text-xs flex items-center gap-1 shadow cursor-pointer"
                          >
                            <X className="w-4 h-4 shrink-0" /> Edit Image
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onDragEnter={handleDrag}
                        onDragOver={handleDrag}
                        onDragLeave={handleDrag}
                        onDrop={handleDrop}
                        className={`h-48 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-4 text-center transition-all min-w-0 overflow-hidden ${dragActive ? "border-sky-500 bg-sky-50/20" : "border-sky-200 hover:border-sky-350 bg-sky-50/10"}`}
                      >
                        <UploadCloud className="w-7 h-7 text-sky-400 mb-2 shrink-0" />
                        <p className="text-xs font-bold text-sky-850">Drag &amp; drop shop front photo</p>
                        
                        <label className="mt-3 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 font-bold text-white rounded-xl text-xs cursor-pointer shadow-sm">
                          <span>Browse Gallery</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Form fields */}
                  <div className="space-y-4 text-xs font-bold text-sky-850 min-w-0">
                    <div>
                      <label className="block uppercase tracking-wider mb-1.5 leading-none">
                        Revision Transaction Omzet (IDR)
                      </label>
                      <div className="relative rounded-xl shadow-sm bg-sky-50/5">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-sky-500 text-xs font-bold font-sans">Rp</span>
                        </div>
                        <input
                          type="number"
                          required
                          value={revisionOmzet}
                          onChange={(e) => setRevisionOmzet(e.target.value === "" ? "" : Number(e.target.value))}
                          placeholder="e.g. 1500000"
                          className="block w-full pl-8 pr-3 py-2 border border-sky-205 rounded-xl focus:ring-2 focus:ring-sky-550 focus:outline-none text-sky-950 text-sm font-semibold"
                        />
                      </div>
                    </div>

                    <div className="bg-sky-50/30 border border-sky-100/50 p-3 rounded-lg font-semibold">
                      <span className="text-[9px] font-bold text-sky-400 uppercase tracking-widest block">Calculation:</span>
                      <div className="flex items-center justify-between mt-1 text-sky-800 font-bold">
                        <span>Calculated Call Status:</span>
                        {computedEffectiveCall === "YES" ? (
                          <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full">
                            YES (OMZET &gt; 0)
                          </span>
                        ) : (
                          <span className="bg-sky-50 border border-sky-100 text-sky-800 font-bold px-2.5 py-0.5 rounded-full">
                            NO (OMZET IS 0)
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block uppercase tracking-wider mb-1.5 leading-none">
                        Explanation Notes
                      </label>
                      <textarea
                        rows={3}
                        value={revisionNotes}
                        onChange={(e) => setRevisionNotes(e.target.value)}
                        placeholder="Provide details about why the report was edited (e.g., replenished missing skincare sets today)..."
                        className="block w-full px-3 py-2 border border-sky-205 focus:ring-2 focus:ring-sky-550 focus:outline-none text-sky-955 text-xs font-semibold bg-sky-50/5 rounded-xl"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-sky-100/60 pt-4 flex justify-end gap-2 text-xs font-bold w-full">
                  <button
                    type="button"
                    onClick={() => setSelectedVisit(null)}
                    className="px-4 py-2 border border-sky-100 text-sky-805 hover:bg-sky-50 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl flex items-center gap-1 shadow-md shadow-sky-500/10 cursor-pointer"
                  >
                    {submitting ? "Publishing Revision..." : "Submit Revision"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="bg-sky-50/10 border-2 border-dashed border-sky-105 rounded-2xl h-96 flex flex-col justify-center items-center text-sky-450 p-6 text-center w-full">
                <FileEdit className="w-12 h-12 text-sky-305 mb-3 shrink-0" />
                <h4 className="font-extrabold text-sky-905 text-sm">Resubmission Workbench</h4>
                <p className="text-xs text-sky-600 max-w-sm mt-1 leading-relaxed">
                  Choose an active store card on the left panel flagging revision notes, to review the remarks and re-submit corrected logs.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
