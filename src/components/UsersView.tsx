import React, { useState, useEffect } from "react";
import { 
  getUsersList, 
  saveUser, 
  deleteUser, 
  checkCloudConnection,
  seedRemoteSpreadsheet,
  diagnoseSpreadsheet,
  SpreadsheetDiagnostics,
  getAppsScriptUrl,
  saveAppsScriptUrl
} from "../api";
import { User, UserRole } from "../types";
import { 
  Users, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Shield, 
  MapPin, 
  User as UserIcon, 
  Lock, 
  X, 
  Save, 
  AlertTriangle, 
  CheckCircle,
  HelpCircle,
  ChevronDown,
  Building,
  RefreshCw,
  Globe,
  Layers,
  Activity,
  XCircle
} from "lucide-react";

interface UsersViewProps {
  currentUser: User;
}

export default function UsersView({ currentUser }: UsersViewProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [cloudConnected, setCloudConnected] = useState(false);

  // Success & Error Alerts
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formValues, setFormValues] = useState({
    username: "",
    password: "",
    name: "",
    role: "SE" as UserRole,
    supervisor_username: "",
    region: "",
    branch: ""
  });

  // Deletion Confirmation Target
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Google Spreadsheet Controls & Diagnostics State
  const [usingRealAppsScript, setUsingRealAppsScript] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState<string | null>(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagData, setDiagData] = useState<SpreadsheetDiagnostics | null>(null);
  const [diagError, setDiagError] = useState<string | null>(null);

  // Direct Apps Script Configuration
  const [appsScriptUrlInput, setAppsScriptUrlInput] = useState(getAppsScriptUrl());
  const [saveUrlSuccess, setSaveUrlSuccess] = useState<string | null>(null);

  const handleSaveAppsScriptUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveUrlSuccess(null);
    setErrorMsg(null);
    try {
      saveAppsScriptUrl(appsScriptUrlInput);
      const connected = await checkCloudConnection();
      setCloudConnected(connected);
      setUsingRealAppsScript(connected);
      if (connected) {
        setSaveUrlSuccess("Google Sheets Web App URL successfully updated and connected! Cloud synchronization is fully operational.");
        handleRunDiagnostics();
        fetchUsers();
      } else {
        if (appsScriptUrlInput.trim() !== "") {
          setErrorMsg("Apps Script URL updated, but connection validation failed. Please ensure the Apps Script URL is correct, is deployed as a Web App, and has 'Who has access' configured as 'Anyone'.");
        } else {
          setSaveUrlSuccess("Apps Script URL cleared. Operating on offline local state mode successfully.");
          setDiagData(null);
          fetchUsers();
        }
      }
    } catch (err: any) {
      setErrorMsg("Failed to update connection URL: " + err.message);
    }
  };

  useEffect(() => {
    fetchUsers(true);
    
    // Auto-sync polling every 15 seconds
    const interval = setInterval(() => {
      fetchUsers(true);
    }, 15000);

    checkCloudConnection().then(async (connected) => {
      setCloudConnected(connected);
      setUsingRealAppsScript(connected);
      if (connected) {
        setDiagLoading(true);
        try {
          const data = await diagnoseSpreadsheet();
          setDiagData(data);
        } catch (err: any) {
          console.debug("Note: Auto-diagnostics returned offline/local fallback state:", err);
        } finally {
          setDiagLoading(false);
        }
      }
    });

    return () => clearInterval(interval);
  }, []);

  const handleSeedRemote = async () => {
    setSeeding(true);
    setErrorMsg(null);
    setSeedSuccess(null);
    try {
      await seedRemoteSpreadsheet();
      setSeedSuccess("Successfully initialized / seeded default data to your Google Sheet! Demo accounts and master data structures are ready to use.");
      // Refresh user list after seed to show the newly seeded accounts
      fetchUsers();
      // Also re-run diagnostics
      handleRunDiagnostics();
    } catch (err: any) {
      setErrorMsg("Failed to seed: " + (err?.message || err));
    } finally {
      setSeeding(false);
    }
  };

  const handleRunDiagnostics = async () => {
    setDiagLoading(true);
    setDiagError(null);
    setDiagData(null);
    try {
      const data = await diagnoseSpreadsheet();
      setDiagData(data);
    } catch (err: any) {
      console.error(err);
      setDiagError(err?.message || "Failed to contact Google Apps Script Diagnostics API.");
    } finally {
      setDiagLoading(false);
    }
  };

  const fetchUsers = async (silent: boolean = false) => {
    try {
      if (!silent) setLoading(true);
      setErrorMsg(null);
      const data = await getUsersList();
      setUsers(data);
    } catch (err: any) {
      console.error(err);
      if (!silent) setErrorMsg("Failed to fetch accounts data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  const handleOpenAddForm = () => {
    setIsEditing(false);
    setFormValues({
      username: "",
      password: "password123",
      name: "",
      role: "SE",
      supervisor_username: "",
      region: "",
      branch: ""
    });
    setErrorMsg(null);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (u: User) => {
    setIsEditing(true);
    setFormValues({
      username: u.username,
      password: u.password || "",
      name: u.name,
      role: u.role,
      supervisor_username: u.supervisor_username || "",
      region: u.region || "",
      branch: u.branch || ""
    });
    setErrorMsg(null);
    setIsFormOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormValues(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValues.username || !formValues.name || !formValues.role) {
      setErrorMsg("Please fill in all required fields (Username, Name, Role)");
      return;
    }

    try {
      setActionLoading(true);
      setErrorMsg(null);
      
      const userToSave: User = {
        username: formValues.username.trim().toLowerCase(),
        password: formValues.password,
        name: formValues.name.trim(),
        role: formValues.role,
        supervisor_username: formValues.supervisor_username.trim() || undefined,
        region: formValues.region.trim() || undefined,
        branch: formValues.branch.trim() || undefined
      };

      await saveUser(userToSave, !isEditing);
      
      showSuccess(isEditing ? `Account "${formValues.username}" successfully updated!` : `New account "${formValues.username}" successfully added!`);
      setIsFormOpen(false);
      fetchUsers();
    } catch (err: any) {
      setErrorMsg("Failed to save account: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (username: string) => {
    try {
      setActionLoading(true);
      setErrorMsg(null);
      await deleteUser(username);
      showSuccess(`Account "${username}" successfully deleted!`);
      setDeleteTarget(null);
      fetchUsers();
    } catch (err: any) {
      setErrorMsg("Failed to delete account: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Filter & Search logic
  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.region || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.branch || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  // Supervisor Suggestions based on roles
  // SE should report to SPV
  // SPV should report to ASM
  // ASM should report to DDM
  const getSupervisorsForRole = (role: UserRole) => {
    if (role === "SE") return users.filter(u => u.role === "SPV");
    if (role === "SPV") return users.filter(u => u.role === "ASM");
    if (role === "ASM") return users.filter(u => u.role === "DDM");
    return [];
  };

  const availableSupervisors = getSupervisorsForRole(formValues.role);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-sky-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 bg-sky-100 rounded-xl flex items-center justify-center text-sky-600 shadow-sm">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-sky-950 font-sans tracking-tight">User Account Management</h1>
            <p className="text-xs text-sky-500 font-medium font-sans">Add, edit, or delete credentials for sales & supervisor teams</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchUsers()}
            className="p-2.5 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-xl transition-all cursor-pointer font-bold border border-sky-100/60"
            title="SYNC / REFRESH"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-sky-550" : ""}`} />
          </button>
          
          <button
            onClick={handleOpenAddForm}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-xs tracking-wide transition-all shadow-md shadow-sky-600/10 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Account</span>
          </button>
        </div>
      </div>

      {/* Success Alarm Alert */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-850 px-4 py-3.5 rounded-xl text-xs font-bold font-sans flex items-center gap-2.5 animate-fadeIn shadow-sm">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Error Alarm Alert */}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-100 text-rose-850 px-4 py-3.5 rounded-xl text-xs font-bold font-sans flex items-center gap-2.5 animate-fadeIn shadow-sm">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="flex-1">{errorMsg}</span>
        </div>
      )}

      {/* Primary search & Filters bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-white p-5 rounded-2xl border border-sky-100 shadow-sm">
        <div className="md:col-span-7 relative">
          <Search className="w-4 h-4 text-sky-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, username, region, or branch..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-sky-50/50 hover:bg-sky-50 focus:bg-white border border-sky-100 focus:border-sky-500 rounded-xl outline-none transition-all font-medium text-sky-950 placeholder-sky-400"
          />
        </div>

        <div className="md:col-span-3">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full px-3.5 py-2 text-xs bg-sky-50/50 hover:bg-sky-50 focus:bg-white border border-sky-100 focus:border-sky-500 rounded-xl outline-none transition-all font-bold text-sky-850 cursor-pointer"
          >
            <option value="ALL">All Roles</option>
            <option value="ADMIN">ADMIN - Administrator</option>
            <option value="DDM">DDM - Distributor Development Manager</option>
            <option value="ASM">ASM - Area Sales Manager</option>
            <option value="SPV">SPV - Supervisor</option>
            <option value="SE">SE - Sales Executive</option>
          </select>
        </div>

        <div className="md:col-span-2 flex items-center justify-end">
          <span className="text-[10px] font-extrabold text-sky-500 tracking-wider">
            {filteredUsers.length} ACCOUNTS FOUND
          </span>
        </div>
      </div>

      {/* Delete Confirmation Overlay Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-sky-950/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-sky-100 animate-scaleUp">
            <div className="flex items-center gap-3 text-rose-600 mb-4 font-sans">
              <div className="h-10 w-10 rounded-xl bg-rose-50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-600 animate-pulse" />
              </div>
              <h3 className="text-base font-extrabold">Confirm Account Deletion</h3>
            </div>
            
            <p className="text-xs text-sky-900 leading-relaxed mb-6 font-medium">
              Are you sure you want to delete the user with username <strong className="text-sky-950">"{deleteTarget}"</strong>? 
              This action is permanent and will remove their login credentials directly from the database schema.
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 bg-sky-50 text-sky-800 hover:bg-sky-100 text-xs font-extrabold rounded-xl transition-all cursor-pointer"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteUser(deleteTarget)}
                className="px-4 py-2 bg-rose-600 text-white hover:bg-rose-700 text-xs font-extrabold rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-md shadow-rose-650/10"
                disabled={actionLoading}
              >
                {actionLoading ? "Deleting..." : "Yes, Delete Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drawer Form for Add / Edit User */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-sky-950/40 z-50 flex justify-end p-0 md:p-4 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md h-full md:h-auto md:rounded-2xl shadow-2xl flex flex-col overflow-hidden border-l md:border border-sky-100 animate-slideLeft">
            
            {/* Form Header */}
            <div className="p-6 border-b border-sky-100 flex items-center justify-between bg-sky-50/50">
              <div className="flex items-center gap-2.5 font-sans">
                <div className="h-10 w-10 bg-sky-100 rounded-xl flex items-center justify-center text-sky-700">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-sky-950 tracking-tight">
                    {isEditing ? "Edit Account Profile" : "Register New Account"}
                  </h3>
                  <p className="text-[10px] text-sky-500 font-bold uppercase tracking-wide">
                    {isEditing ? `username: ${formValues.username}` : "fill in the form below"}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 hover:bg-sky-100 rounded-lg text-sky-400 hover:text-sky-700 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleFormSubmit} className="flex-1 p-6 overflow-y-auto space-y-4">
              
              {/* Username field (disabled in edit mode) */}
              <div>
                <label className="block text-[10px] font-extrabold text-sky-550 uppercase tracking-widest mb-1.5">
                  Username *
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-sky-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    name="username"
                    value={formValues.username}
                    onChange={handleInputChange}
                    placeholder="e.g., se01 or spv_jakarta"
                    disabled={isEditing}
                    className="w-full pl-9 pr-4 py-2 text-xs bg-sky-50/50 disabled:bg-sky-100/70 disabled:text-sky-450 focus:bg-white border border-sky-100 focus:border-sky-500 rounded-xl outline-none transition-all font-bold text-sky-950 placeholder-sky-400"
                    required
                  />
                </div>
                {!isEditing && (
                  <p className="text-[9px] text-sky-400 mt-1 font-bold">Note: Username must be unique and is case-insensitive.</p>
                )}
              </div>

              {/* Password field */}
              <div>
                <label className="block text-[10px] font-extrabold text-sky-550 uppercase tracking-widest mb-1.5">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-sky-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    name="password"
                    value={formValues.password}
                    onChange={handleInputChange}
                    placeholder="At least 6 characters"
                    className="w-full pl-9 pr-4 py-2 text-xs bg-sky-50/50 focus:bg-white border border-sky-100 focus:border-sky-500 rounded-xl outline-none transition-all font-mono font-bold text-sky-950 placeholder-sky-400"
                    required
                  />
                </div>
              </div>

              {/* Real Name */}
              <div>
                <label className="block text-[10px] font-extrabold text-sky-550 uppercase tracking-widest mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formValues.name}
                  onChange={handleInputChange}
                  placeholder="e.g., John Doe (Sales Exec)"
                  className="w-full px-3.5 py-2 text-xs bg-sky-50/50 focus:bg-white border border-sky-100 focus:border-sky-500 rounded-xl outline-none transition-all font-semibold text-sky-950 placeholder-sky-400"
                  required
                />
              </div>

              {/* Role Select */}
              <div>
                <label className="block text-[10px] font-extrabold text-sky-555 uppercase tracking-widest mb-1.5">
                  Role / Title *
                </label>
                <select
                  name="role"
                  value={formValues.role}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 text-xs bg-sky-50/50 focus:bg-white border border-sky-100 focus:border-sky-500 rounded-xl outline-none transition-all font-extrabold text-sky-900 cursor-pointer"
                  required
                >
                  <option value="SE">SE - Sales Executive</option>
                  <option value="SPV">SPV - Supervisor</option>
                  <option value="ASM">ASM - Area Sales Manager</option>
                  <option value="DDM">DDM - Distributor Development Manager</option>
                  <option value="ADMIN">ADMIN - Administrator</option>
                </select>
              </div>

              {/* Supervisor selection */}
              {formValues.role !== "ADMIN" && formValues.role !== "DDM" && (
                <div>
                  <label className="block text-[10px] font-extrabold text-sky-550 uppercase tracking-widest mb-1.5">
                    Direct Supervisor
                  </label>
                  <select
                    name="supervisor_username"
                    value={formValues.supervisor_username}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-xs bg-sky-50/50 focus:bg-white border border-sky-100 focus:border-sky-500 rounded-xl outline-none transition-all font-extrabold text-sky-900 cursor-pointer"
                  >
                    <option value="">-- Connect with Supervisor --</option>
                    {availableSupervisors.map(u => (
                      <option key={u.username} value={u.username}>
                        {u.name} ({u.username})
                      </option>
                    ))}
                  </select>
                  <p className="text-[9px] text-sky-400 mt-1 font-semibold leading-snug">
                    {formValues.role === "SE" && "SE must report to a Supervisor (SPV)"}
                    {formValues.role === "SPV" && "SPV must report to an Area Manager (ASM)"}
                    {formValues.role === "ASM" && "ASM must report to a Distributor Dev Manager (DDM)"}
                  </p>
                </div>
              )}

              {/* Region field */}
              <div>
                <label className="block text-[10px] font-extrabold text-sky-550 uppercase tracking-widest mb-1.5">
                  Region (Optional)
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-sky-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    name="region"
                    value={formValues.region}
                    onChange={handleInputChange}
                    placeholder="e.g., DKI Jakarta"
                    className="w-full pl-9 pr-4 py-2 text-xs bg-sky-50/50 focus:bg-white border border-sky-100 focus:border-sky-500 rounded-xl outline-none transition-all font-semibold text-sky-950 placeholder-sky-400"
                  />
                </div>
              </div>

              {/* Branch field */}
              <div>
                <label className="block text-[10px] font-extrabold text-sky-550 uppercase tracking-widest mb-1.5">
                  Branch (Optional)
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-sky-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    name="branch"
                    value={formValues.branch}
                    onChange={handleInputChange}
                    placeholder="e.g., South Jakarta"
                    className="w-full pl-9 pr-4 py-2 text-xs bg-sky-50/50 focus:bg-white border border-sky-100 focus:border-sky-500 rounded-xl outline-none transition-all font-semibold text-sky-950 placeholder-sky-400"
                  />
                </div>
              </div>

            </form>

            {/* Form Footer Actions */}
            <div className="p-4 bg-sky-50/50 border-t border-sky-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 bg-white hover:bg-sky-50 text-sky-850 text-xs font-bold rounded-xl border border-sky-100 transition-all cursor-pointer"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleFormSubmit}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-sky-600/10 flex items-center gap-1.5 cursor-pointer"
                disabled={actionLoading}
              >
                <Save className="w-4 h-4" />
                <span>{actionLoading ? "Saving..." : "Save Account"}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Users Grid Card / List Dashboard */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-12 text-center flex flex-col items-center justify-center">
          <div className="h-10 w-10 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin mb-3"></div>
          <span className="text-xs font-extrabold text-sky-600">Loading user list, please wait...</span>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-12 text-center flex flex-col items-center justify-center">
          <Users className="w-12 h-12 text-sky-300 mb-3" />
          <h3 className="text-sm font-extrabold text-sky-950 font-sans">No matching accounts found</h3>
          <p className="text-xs text-sky-400 mt-1 max-w-sm mx-auto font-medium">
            Please try modifying search keywords or changing the role filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredUsers.map((u) => {
            const isSelf = u.username.toLowerCase() === currentUser.username.toLowerCase();
            const isAdminAcc = u.role === "ADMIN";
            
            return (
              <div 
                key={u.username} 
                className={`bg-white rounded-2xl border ${isSelf ? "border-sky-500 shadow-sky-100" : "border-sky-100"} shadow-sm p-5 hover:shadow-md transition-all relative flex flex-col justify-between`}
              >
                {/* Upper Details */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3.5 font-sans">
                    {/* Role Indicator Badge */}
                    <span className={`text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                      u.role === "ADMIN" ? "bg-purple-100 text-purple-700" :
                      u.role === "DDM" ? "bg-indigo-100 text-indigo-700" :
                      u.role === "ASM" ? "bg-blue-100 text-blue-700" :
                      u.role === "SPV" ? "bg-amber-100 text-amber-700" :
                      "bg-sky-100 text-sky-700"
                    }`}>
                      {u.role}
                    </span>

                    {isSelf && (
                      <span className="text-[8px] bg-emerald-150 text-emerald-700 border border-emerald-200/50 font-extrabold px-1.5 py-0.5 rounded-lg">
                        ME
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-extrabold text-sky-950 font-sans leading-snug line-clamp-1">{u.name}</h3>
                  
                  <div className="mt-3 space-y-2 text-xs font-semibold text-sky-700">
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="text-sky-450 font-extrabold font-mono text-[9px] w-14 block select-none">USERNAME:</span>
                      <span className="text-sky-900 font-bold font-mono bg-sky-50 px-1.5 py-0.5 rounded text-[11px] font-medium">{u.username}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="text-sky-450 font-extrabold font-mono text-[9px] w-14 block select-none">PASSWORD:</span>
                      <span className="text-sky-600 font-medium font-mono truncate">{u.password || "*********"}</span>
                    </div>

                    <div className="flex items-start gap-1.5 text-[11px] leading-relaxed">
                      <span className="text-sky-450 font-extrabold font-mono text-[9px] w-14 block select-none">SUPERVISOR:</span>
                      <span className="text-sky-900 leading-snug font-medium truncate flex-1">
                        {u.supervisor_username ? `@${u.supervisor_username}` : "-"}
                      </span>
                    </div>

                    {(u.region || u.branch) && (
                      <div className="pt-2 border-t border-sky-50/80 flex items-center justify-between text-[10px] text-sky-500 font-bold">
                        <span className="flex items-center gap-1 truncate max-w-[50%]">
                          <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          <span className="truncate">{u.region || "-"}</span>
                        </span>
                        <span className="flex items-center gap-1 truncate max-w-[50%]">
                          <Building className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          <span className="truncate">{u.branch || "-"}</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Actions Row */}
                <div className="mt-5 pt-3 border-t border-sky-50/80 flex items-center justify-end gap-1">
                  <button
                    onClick={() => handleOpenEditForm(u)}
                    className="p-2 text-sky-600 hover:text-sky-900 hover:bg-sky-55 rounded-lg transition-all cursor-pointer font-bold inline-flex items-center gap-1 text-[10px]"
                    title="EDIT PROFILE / PASSWORD"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>

                  {!isSelf && u.username !== "admin" && (
                    <button
                      onClick={() => setDeleteTarget(u.username)}
                      className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all cursor-pointer font-bold inline-flex items-center gap-1 text-[10px]"
                      title="DELETE ACCOUNT"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Google Spreadsheet Integration & Developer Diagnostics Section */}
      <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-sky-50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shadow-inner">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-sky-950 font-sans tracking-tight">Google Spreadsheet Integration & Cloud Diagnostics</h2>
              <p className="text-[11px] text-sky-500 font-bold uppercase tracking-wider font-sans">Administrator Only • Real-time Sync & Database Initialization</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 bg-sky-50 text-sky-900 px-3.5 py-1.5 rounded-full text-[11px] font-bold border border-sky-100 shadow-xs">
            {usingRealAppsScript ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Google Sheets Connection Active (Real Cloud)</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>Local Simulation Mode (Offline)</span>
              </>
            )}
          </div>
        </div>

        {/* Direct Apps Script URL Config (Perfect for Vercel / serverless deployments) */}
        <div className="bg-indigo-50/25 p-5 rounded-2xl border border-indigo-100/65 space-y-4">
          <div className="flex gap-2.5 items-start text-xs font-semibold text-indigo-950">
            <Globe className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="space-y-1 w-full text-left">
              <h3 className="font-extrabold text-sky-950 text-sm">Direct Google Sheets Connection Settings</h3>
              <p className="text-[11px] text-sky-600 font-medium leading-relaxed">
                <strong>💡 Vercel / Static Deployment Quick Fix:</strong> When deployed on Vercel, the internal Express proxy server will not run automatically since Vercel only serves static assets. To bind real-time Google Sheets database, enter your <strong>Google Apps Script Web App URL</strong> below! It connects directly and securely from your browser.
              </p>
              <p className="text-[11px] text-sky-500 italic mt-1">
                (Tip: You can also set it permanently by establishing the <code>VITE_APPS_SCRIPT_URL</code> environment variable in your Vercel Dashboard settings).
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveAppsScriptUrl} className="flex flex-col sm:flex-row gap-3 pt-1">
            <div className="grow">
              <input
                type="url"
                required
                placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                value={appsScriptUrlInput}
                onChange={e => setAppsScriptUrlInput(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-sky-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-550 rounded-xl text-xs font-semibold placeholder-sky-350 text-sky-950"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs tracking-wide rounded-xl transition-all shadow-md shadow-sky-600/15 cursor-pointer whitespace-nowrap"
              >
                Save & Connect
              </button>
              {appsScriptUrlInput && (
                <button
                  type="button"
                  onClick={() => {
                    setAppsScriptUrlInput("");
                    saveAppsScriptUrl("");
                    setSaveUrlSuccess("Direct Apps Script URL cleared. Operating on offline local state mode.");
                    checkCloudConnection().then(connected => {
                      setCloudConnected(connected);
                      setUsingRealAppsScript(connected);
                      fetchUsers();
                    });
                  }}
                  className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-xs tracking-wide rounded-xl transition-all cursor-pointer whitespace-nowrap"
                >
                  Clear/Disconnect
                </button>
              )}
            </div>
          </form>

          {saveUrlSuccess && (
            <div className="text-[11px] font-semibold text-emerald-850 bg-emerald-50 p-3 border border-emerald-100 rounded-xl leading-relaxed flex items-start gap-2 text-left animate-fadeIn">
              <span className="text-emerald-500 font-bold">✔</span>
              <span>{saveUrlSuccess}</span>
            </div>
          )}
        </div>

        {/* Action Controls Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Seeding Block */}
          <div className="bg-sky-5/10 p-5 rounded-2xl border border-sky-100/50 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex gap-2.5 items-start text-xs font-semibold text-sky-955">
                <Layers className="w-5 h-5 text-indigo-600 shrink-0" />
                <div>
                  <h3 className="font-extrabold text-sky-900 text-xs text-left">New or Empty Google Sheet Database?</h3>
                  <p className="text-[11px] text-sky-500 font-medium leading-relaxed mt-1 text-left">
                    If you are connecting a spreadsheet for the first time or inadvertently cleared its contents, use the button below to initialize the MASTER_DATA tab, column mappings, and insert several initial demo accounts.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3.5 pt-2 text-left">
              <button
                type="button"
                onClick={handleSeedRemote}
                disabled={seeding}
                className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs tracking-wide rounded-xl transition-all shadow-md shadow-indigo-600/15 cursor-pointer disabled:opacity-50"
              >
                {seeding ? "Initializing / Seeding Cloud..." : "Initialize / Seed Google Sheet"}
              </button>

              {seedSuccess && (
                <div className="text-[11px] font-semibold text-emerald-850 bg-emerald-50 p-3 border border-emerald-100 rounded-xl leading-relaxed flex items-start gap-2">
                  <span className="text-emerald-500 font-bold">✔</span>
                  <span>{seedSuccess}</span>
                </div>
              )}
            </div>
          </div>

          {/* Diagnostic Stats Block */}
          <div className="bg-sky-5/10 p-5 rounded-2xl border border-sky-100/50 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex gap-2.5 items-start text-xs font-semibold text-sky-955">
                <Activity className="w-5 h-5 text-sky-600 shrink-0" />
                <div>
                  <h3 className="font-extrabold text-sky-900 text-xs text-left">Worksheet Schema Diagnostics</h3>
                  <p className="text-[11px] text-sky-500 font-medium leading-relaxed mt-1 text-left">
                    Analyze the configuration of your target spreadsheet workbook to ensure USER, SCHEDULE, and VISIT reporting rows match our validated schemas.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 text-left">
              <button
                type="button"
                onClick={handleRunDiagnostics}
                disabled={diagLoading}
                className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-sky-50 border border-sky-200 text-sky-800 hover:text-sky-955 font-extrabold text-xs tracking-wide rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
              >
                {diagLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <span>Run Diagnostics</span>
                )}
              </button>
            </div>
          </div>

        </div>

        {/* Diagnostics Results Rendering */}
        {diagError && (
          <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 space-y-2 text-left">
            <div className="flex gap-2 items-start text-xs font-extrabold text-rose-955">
              <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>Cloud Diagnostics Encountered an Issue</div>
            </div>
            <p className="text-[11px] text-rose-700 leading-relaxed font-semibold pl-7">
              Detail: {diagError}
            </p>
            {diagError.includes("action: diagnose") && (
              <div className="bg-white border border-rose-100 p-4 rounded-xl text-[11px] text-rose-900 leading-relaxed pl-4 space-y-2 mx-7">
                <p className="font-black text-rose-950">💡 Apps Script Version Updates Required:</p>
                <p>The deployed Google Apps Script in your Spreadsheet is running on an outdated schema.</p>
                <p className="font-black text-sky-800">How to update manually:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>In Google Sheets, open the developer editor via <span className="font-bold">Extensions → Apps Script</span>.</li>
                  <li>Replace all code in your editor with the script inside <span className="font-mono font-bold">apps_script.gs</span> from this workspace.</li>
                  <li>Click <span className="font-bold">Save (Ctrl+S / Cmd+S)</span>.</li>
                  <li>Click <span className="font-bold">Deploy → New Deployment</span>.</li>
                  <li>Under type select <span className="font-bold">Web app</span>, set <span className="font-bold">Who has access</span> to <span className="font-bold">Anyone</span>, then tap Deploy.</li>
                </ol>
              </div>
            )}
          </div>
        )}

        {diagData && (
          <div className="bg-sky-50/10 border border-sky-100 rounded-2xl p-5 space-y-5 shadow-inner text-left">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4 border-b border-sky-100/60">
              <div>
                <dt className="text-[10px] text-sky-500 font-extrabold uppercase tracking-wide">Spreadsheet Title</dt>
                <dd className="text-sm font-black text-sky-950 mt-0.5 truncate">{diagData.spreadsheetName || "(No Title)"}</dd>
              </div>

              <div>
                <dt className="text-[10px] text-sky-500 font-extrabold uppercase tracking-wide">Detected Google Sheet Tabs</dt>
                <dd className="flex flex-wrap gap-1 mt-1">
                  {diagData.sheets.map(name => (
                    <span
                      key={name}
                      className={`px-2.5 py-0.5 rounded-lg font-bold text-[10px] tracking-wide ${
                        name === "MASTER_DATA"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : "bg-sky-100 text-sky-800 border border-sky-200"
                      }`}
                    >
                      {name}
                    </span>
                  ))}
                </dd>
                {!diagData.masterDataExists && (
                  <p className="mt-1.5 flex gap-1 items-center text-[10px] font-bold text-rose-650">
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Warning: Crucial &apos;MASTER_DATA&apos; tab is missing!</span>
                  </p>
                )}
              </div>

              <div>
                <dt className="text-[10px] text-sky-500 font-extrabold uppercase tracking-wide">Schema Validity Status</dt>
                <dd className="mt-1.5">
                  {diagData.masterDataExists && diagData.dataTypeCounts.USER > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-bold text-[10px] border border-emerald-100">
                      ✔ Spreadsheet Schema Valid & Ready
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 text-amber-700 rounded-full font-bold text-[10px] border border-amber-100">
                      ⚠ Maintenance / Seeding Needed
                    </span>
                  )}
                </dd>
              </div>
            </div>

            {/* Counts breakdown */}
            <div>
              <h3 className="text-[10px] text-sky-500 font-extrabold uppercase tracking-wider mb-2.5">Row Counts & Recognized Types</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white p-3 border border-sky-100/80 rounded-xl relative overflow-hidden">
                  <div className="font-black text-sky-955 text-base">{diagData.dataTypeCounts.USER}</div>
                  <div className="text-[9px] text-sky-450 font-extrabold uppercase tracking-wider mt-0.5">User Accounts (USER)</div>
                </div>
                <div className="bg-white p-3 border border-sky-100/80 rounded-xl relative overflow-hidden">
                  <div className="font-black text-sky-955 text-base">{diagData.dataTypeCounts.SCHEDULE}</div>
                  <div className="text-[9px] text-sky-450 font-extrabold uppercase tracking-wider mt-0.5">Visit Schedules</div>
                </div>
                <div className="bg-white p-3 border border-sky-100/80 rounded-xl relative overflow-hidden">
                  <div className="font-black text-sky-955 text-base">{diagData.dataTypeCounts.VISIT}</div>
                  <div className="text-[9px] text-sky-450 font-extrabold uppercase tracking-wider mt-0.5">Reports History</div>
                </div>
                <div className="bg-white p-3 border border-sky-100/80 rounded-xl relative overflow-hidden">
                  <div className="font-black text-sky-955 text-base">{diagData.dataTypeCounts.OTHER}</div>
                  <div className="text-[9px] text-sky-450 font-extrabold uppercase tracking-wider mt-0.5">Other Row Records</div>
                </div>
              </div>
            </div>

            {/* Accounts list (User Valid di Google Sheet) */}
            <div>
              <h3 className="text-[10px] text-sky-500 font-extrabold uppercase tracking-wider mb-2">Registered Accounts List (on Sheet)</h3>
              {diagData.dataTypeCounts.USER === 0 ? (
                <div className="bg-amber-50/50 p-4 border border-amber-100 rounded-xl text-xs text-amber-900 leading-normal pl-4 font-semibold">
                  <p className="font-bold">⚠️ Empty Account Records</p>
                  <p className="text-[11px] font-normal mt-0.5 text-amber-800">
                    No user accounts are recognized on the target Google Sheet. Please insert row values in your sheet or click the database initializer button above.
                  </p>
                </div>
              ) : (
                <div className="max-h-56 overflow-y-auto border border-sky-100 bg-white rounded-xl divide-y divide-sky-50">
                  {diagData.users.map((user, i) => (
                    <div key={i} className="p-3 flex justify-between items-center hover:bg-sky-50/30 transition-colors">
                      <div className="min-w-0">
                        <div className="font-extrabold text-sky-950 text-xs font-mono select-all">@{user.username}</div>
                        <div className="text-[10px] text-sky-500 font-semibold mt-0.5">{user.name || "(No Name)"}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-lg font-extrabold text-[9px] tracking-wider uppercase ${
                        user.role === "ADMIN" ? "bg-purple-55 text-purple-700" :
                        user.role === "DDM" ? "bg-indigo-55 text-indigo-700" :
                        user.role === "ASM" ? "bg-blue-55 text-blue-700" :
                        user.role === "SPV" ? "bg-amber-55 text-amber-700" :
                        "bg-sky-55 text-sky-700"
                      }`}>
                        {user.role}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
