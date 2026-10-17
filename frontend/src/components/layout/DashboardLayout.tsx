import React from "react";
import { Header } from "./Header";
import { User } from "../../types/user";

export interface DashboardLayoutProps {
  user: User | null;
  onLogout: () => void;
  onComposeClick: () => void;
  slackStatus: { connected: boolean; integration?: { teamName: string; channelName: string } };
  onConnectSlack: () => void;
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  user,
  onLogout,
  onComposeClick,
  slackStatus,
  onConnectSlack,
  children,
}) => {
  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col">
      <Header
        user={user}
        onLogout={onLogout}
        onComposeClick={onComposeClick}
        slackStatus={slackStatus}
        onConnectSlack={onConnectSlack}
      />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <footer className="border-t border-slate-900 bg-slate-950/60 py-4 text-center text-xs text-slate-600">
        ReachInbox Software Development Intern Assignment • BullMQ Delayed Scheduling • Neon PostgreSQL • Redis Sliding Window Rate Limiting
      </footer>
    </div>
  );
};
