import React, { useState, useEffect } from "react";
import { UserCheck, ShieldAlert, Wifi, Globe, Eye, EyeOff } from "lucide-react";
import { loginUser, checkCloudConnection } from "../api";
import { User } from "../types";

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [usingRealAppsScript, setUsingRealAppsScript] = useState(false);

  useEffect(() => {
    checkCloudConnection().then((connected) => {
      setUsingRealAppsScript(connected);
    });
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Please fill in both standard username and password fields.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const user = await loginUser(username.trim(), password);
      onLoginSuccess(user);
    } catch (err: any) {
      setError(err?.message || "Invalid login credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-sky-100/30 via-blue-50/20 to-sky-50/20 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 min-w-0 w-full overflow-x-hidden">
      <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-white text-sky-900 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm border border-sky-100">
        {usingRealAppsScript ? (
          <>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <Globe className="w-3.5 h-3.5 text-sky-600 animate-spin" />
            <span>Cloud DB Connected</span>
          </>
        ) : (
          <>
            <span className="w-2 h-2 rounded-full bg-sky-500"></span>
            <Wifi className="w-3.5 h-3.5 text-sky-500" />
            <span>Local Sim Mode</span>
          </>
        )}
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md min-w-0">
        <div className="flex justify-center">
          <div className="h-14 w-14 bg-sky-600 rounded-2xl flex items-center justify-center shadow-lg shadow-sky-500/20 text-white shrink-0">
            <UserCheck className="w-8 h-8 font-bold" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-black tracking-tight text-sky-950 font-sans">
          Effective Call Monitoring
        </h2>
        <p className="mt-2 text-center text-sm text-sky-800/80 max-w-sm mx-auto">
          Sign in to execute daily visits, monitor performance, and process approval streams.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md min-w-0 w-full">
        <div className="bg-white py-8 px-4 shadow-md shadow-sky-500/5 rounded-2xl border border-sky-100/80 sm:px-10 min-w-0 w-full">
          {error && (
            <div className="mb-4 bg-rose-50 border-l-4 border-rose-500 p-4 rounded-xl text-rose-950 text-xs flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0 text-rose-600" />
              <span className="break-words font-semibold">{error}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-xs font-bold text-sky-900 uppercase tracking-wider">
                Username
              </label>
              <div className="mt-1.5 relative rounded-md shadow-sm">
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full px-4 py-2.5 rounded-lg border border-sky-200 placeholder-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sky-950 text-sm bg-sky-50/10 font-medium"
                  placeholder="Enter your username (e.g., se1)"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold text-sky-900 uppercase tracking-wider">
                Password
              </label>
              <div className="mt-1.5 relative rounded-md shadow-sm">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-4 pr-11 py-2.5 rounded-lg border border-sky-200 placeholder-sky-305 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sky-950 text-sm bg-sky-50/10 font-medium"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-sky-400 hover:text-sky-600 transition-colors cursor-pointer"
                  title={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-md shadow-sky-500/10 text-xs font-extrabold text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-550 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
              >
                {loading ? "Authenticating..." : "Sign In"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
