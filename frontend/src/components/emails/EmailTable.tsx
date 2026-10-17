import React from "react";
import { EmailRecord } from "../../types/email";
import { StatusBadge } from "../ui/StatusBadge";
import { ExternalLink, Mail, Calendar, AlertCircle } from "lucide-react";
import { Loader } from "../ui/Loader";
import { EmptyState } from "../ui/EmptyState";

export interface EmailTableProps {
  emails: EmailRecord[];
  isLoading: boolean;
  type: "scheduled" | "sent";
  onComposeClick?: () => void;
}

export const EmailTable: React.FC<EmailTableProps> = ({
  emails,
  isLoading,
  type,
  onComposeClick,
}) => {
  if (isLoading) {
    return <Loader message={`Loading ${type} emails...`} />;
  }

  if (emails.length === 0) {
    return (
      <EmptyState
        title={type === "scheduled" ? "No scheduled emails yet" : "No sent emails yet"}
        description={
          type === "scheduled"
            ? "Create and schedule your first email campaign to see delayed BullMQ jobs here."
            : "Sent and delivered emails with Ethereal preview links will appear here."
        }
        actionText="Compose New Campaign"
        onAction={onComposeClick}
      />
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="border-b border-slate-800 bg-slate-900/90 text-xs uppercase tracking-wider text-slate-400 font-semibold">
            <tr>
              <th scope="col" className="px-5 py-3.5">
                Recipient
              </th>
              <th scope="col" className="px-5 py-3.5">
                Subject
              </th>
              <th scope="col" className="px-5 py-3.5">
                {type === "scheduled" ? "Scheduled Time" : "Sent Time"}
              </th>
              <th scope="col" className="px-5 py-3.5">
                Status
              </th>
              <th scope="col" className="px-5 py-3.5 text-right">
                Actions / Preview
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {emails.map((email) => {
              const displayDate =
                type === "scheduled"
                  ? new Date(email.scheduled_at).toLocaleString()
                  : email.sent_at
                  ? new Date(email.sent_at).toLocaleString()
                  : new Date(email.scheduled_at).toLocaleString();

              return (
                <tr
                  key={email.id}
                  className="hover:bg-slate-800/40 transition-colors group"
                >
                  {/* Recipient */}
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{email.recipient}</p>
                        {email.sender_email && (
                          <p className="text-[11px] text-slate-500 font-mono">
                            from: {email.sender_email}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Subject */}
                  <td className="px-5 py-4 max-w-xs truncate">
                    <p className="text-slate-200 font-medium truncate" title={email.subject}>
                      {email.subject}
                    </p>
                    <p className="text-xs text-slate-500 truncate" title={email.body}>
                      {email.body.slice(0, 60)}...
                    </p>
                  </td>

                  {/* Time */}
                  <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-400">
                    <div className="flex items-center gap-1.5 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>{displayDate}</span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-5 py-4 whitespace-nowrap">
                    <StatusBadge status={email.status} />
                    {email.error_message && (
                      <div
                        className="flex items-center gap-1 text-[11px] text-rose-400 mt-1 max-w-xs truncate"
                        title={email.error_message}
                      >
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span className="truncate">{email.error_message}</span>
                      </div>
                    )}
                  </td>

                  {/* Action / Preview */}
                  <td className="px-5 py-4 whitespace-nowrap text-right">
                    {email.ethereal_preview_url ? (
                      <a
                        href={email.ethereal_preview_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-lg transition-colors cursor-pointer"
                        title="View test email in Ethereal web inbox"
                      >
                        <span>Ethereal Preview</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <span className="text-xs text-slate-600 font-mono">
                        {email.job_id ? `Job: ${email.job_id.slice(0, 10)}...` : "—"}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
