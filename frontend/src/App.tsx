import React, { useState, useEffect } from "react";
import { User } from "./types/user";
import { authService } from "./services/authService";
import { emailService } from "./services/emailService";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { Loader } from "./components/ui/Loader";

export const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [slackStatus, setSlackStatus] = useState<{
    connected: boolean;
    integration?: { teamName: string; channelName: string };
  }>({ connected: false });

  // Handle URL query parameters (Google OAuth callback token, Slack connection)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      authService.setToken(token);
      // Clean query parameter from URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const slackParam = params.get("slack");
    if (slackParam === "connected") {
      const team = params.get("team") || "Workspace";
      alert(`🎉 Slack Workspace '${team}' successfully connected! Rate-limit alerts are active.`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      } catch {
        setUser(null);
      } finally {
        setIsLoadingAuth(false);
      }
    };

    checkAuth();
  }, []);

  // Check Slack status
  useEffect(() => {
    if (user) {
      emailService.getSlackStatus().then((status) => setSlackStatus(status));
    }
  }, [user]);

  const handleLogout = async () => {
    await authService.logout();
    setUser(null);
  };

  const handleConnectSlack = async () => {
    const authUrl = await emailService.getSlackAuthUrl();
    if (authUrl) {
      window.location.href = authUrl;
    } else {
      alert(
        "Slack OAuth credentials are not configured in backend/.env.\nPlease add SLACK_CLIENT_ID and SLACK_CLIENT_SECRET to enable Slack integration."
      );
    }
  };

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
        <Loader message="Initializing ReachInbox scheduler..." />
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLoginSuccess={(loggedInUser) => setUser(loggedInUser)} />;
  }

  return (
    <DashboardLayout
      user={user}
      onLogout={handleLogout}
      onComposeClick={() => setIsComposeOpen(true)}
      slackStatus={slackStatus}
      onConnectSlack={handleConnectSlack}
    >
      <DashboardPage
        user={user}
        onLogout={handleLogout}
        onOpenCompose={() => setIsComposeOpen(true)}
        isComposeOpen={isComposeOpen}
        onCloseCompose={() => setIsComposeOpen(false)}
        slackStatus={slackStatus}
        onConnectSlack={handleConnectSlack}
      />
    </DashboardLayout>
  );
};

export default App;
