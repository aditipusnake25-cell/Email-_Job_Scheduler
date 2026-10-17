import React from "react";
import { User } from "../../types/user";
import { LogOut, Send, MessageSquare, Check, Plus, ExternalLink } from "lucide-react";
import { Button } from "../ui/Button";

export interface HeaderProps {
  user: User | null;
  onLogout: () => void;
  onComposeClick: () => void;
  slackStatus: { connected: boolean; integration?: { teamName: string; channelName: string } };
  onConnectSlack: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onLogout,
  onComposeClick,
  slackStatus,
  onConnectSlack,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#0B0F19]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white shadow-md shadow-indigo-600/30">
            <Send className="w-4 h-4 -rotate-12" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-white tracking-tight">ReachInbox</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Scheduler
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">Outbox Labs Technical Assessment</p>
          </div>
        </div>

        {/* Right Actions & User Profile */}
        <div className="flex items-center gap-3">
          {/* Slack Connection Pill */}
          {slackStatus.connected ? (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium">
              <Check className="w-3.5 h-3.5" />
              <span>Slack: {slackStatus.integration?.teamName || "Connected"}</span>
            </div>
          ) : (
            <button
              onClick={onConnectSlack}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#4A154B]/30 hover:bg-[#4A154B]/50 text-purple-300 border border-purple-500/30 text-xs font-medium transition-colors cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Connect Slack</span>
            </button>
          )}

          {/* Compose Email Button */}
          <Button
            variant="primary"
            size="sm"
            onClick={onComposeClick}
            icon={<Plus className="w-4 h-4" />}
          >
            Compose New Email
          </Button>

          {/* User Profile & Logout */}
          {user && (
            <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
              <div className="flex items-center gap-2.5">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.name}
                    className="w-8 h-8 rounded-full border border-slate-700 bg-slate-800 object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white text-xs font-bold flex items-center justify-center">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="hidden md:block text-left">
                  <p className="text-xs font-medium text-white truncate max-w-[130px]">{user.name}</p>
                  <p className="text-[11px] text-slate-500 truncate max-w-[130px] font-mono">{user.email}</p>
                </div>
              </div>

              <button
                onClick={onLogout}
                className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
