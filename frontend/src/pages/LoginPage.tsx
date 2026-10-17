import React, { useState } from "react";
import { Send, Sparkles, ShieldCheck, Zap, Mail, ArrowRight, AlertCircle } from "lucide-react";
import { Button } from "../components/ui/Button";
import { authService } from "../services/authService";
import { User } from "../types/user";

export interface LoginPageProps {
  onLoginSuccess: (user: User, token: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    return err ? `Authentication failed: ${err.replace(/_/g, " ")}` : null;
  });

  const handleGoogleLogin = () => {
    setIsLoading(true);
    window.location.href = authService.getGoogleAuthUrl();
  };

  const handleDevLogin = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const res = await authService.devLogin("intern.candidate@reachinbox.test", "ReachInbox Intern Candidate");
      onLoginSuccess(res.user, res.token);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err.response?.data?.error || err.message || "Failed to log in with dev account");
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        {/* Brand Logo */}
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 shadow-xl shadow-indigo-600/30 text-white mb-4">
          <Send className="w-7 h-7 -rotate-12" />
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white">ReachInbox</h2>
        <p className="mt-1 text-sm text-slate-400">Full-Stack Email Job Scheduler & Rate Limiter</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-900/80 backdrop-blur-xl py-8 px-6 shadow-2xl rounded-2xl border border-slate-800 sm:px-10">
          {errorMessage && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-4">
            {/* Primary Google Login Button */}
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-slate-700 rounded-xl shadow-sm bg-white hover:bg-slate-50 text-slate-800 font-medium text-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-900 px-3 text-slate-500 font-semibold tracking-wider">
                  Or instant local testing
                </span>
              </div>
            </div>

            {/* Quick Dev Login */}
            <Button
              type="button"
              variant="secondary"
              size="md"
              className="w-full"
              isLoading={isLoading}
              onClick={handleDevLogin}
              icon={<Sparkles className="w-4 h-4 text-amber-400" />}
            >
              Enter as Demo Candidate
            </Button>
          </div>

          {/* Architecture Badges */}
          <div className="mt-8 pt-6 border-t border-slate-800/80 space-y-2.5">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Zap className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>BullMQ Delayed Queue & Worker concurrency</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Redis distributed sliding-window hourly limiter</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Mail className="w-4 h-4 text-sky-400 shrink-0" />
              <span>Ethereal SMTP test delivery & live preview links</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
