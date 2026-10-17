import React, { useState } from "react";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { CsvUploader } from "./CsvUploader";
import { parseEmailsFromText } from "../../utils/csvParser";
import { emailService } from "../../services/emailService";
import { Calendar, Clock, Gauge, Send, AlertCircle, CheckCircle2 } from "lucide-react";

export interface ComposeEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultSenderEmail?: string;
}

export const ComposeEmailModal: React.FC<ComposeEmailModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultSenderEmail = "demo-sender@reachinbox.test",
}) => {
  const [senderEmail, setSenderEmail] = useState(defaultSenderEmail);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [manualRecipientsText, setManualRecipientsText] = useState("");
  const [inputMode, setInputMode] = useState<"csv" | "manual">("csv");

  // Scheduling options
  const [startTime, setStartTime] = useState(() => {
    const now = new Date();
    // Default 1 minute in the future
    now.setMinutes(now.getMinutes() + 1);
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [delaySeconds, setDelaySeconds] = useState(2);
  const [hourlyLimit, setHourlyLimit] = useState(200);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Combine recipients from CSV or manual text
  const activeRecipients =
    inputMode === "csv"
      ? recipients
      : parseEmailsFromText(manualRecipientsText).validEmails;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!senderEmail.trim()) {
      setErrorMessage("Please enter a valid sender email address.");
      return;
    }
    if (!subject.trim()) {
      setErrorMessage("Please enter an email subject line.");
      return;
    }
    if (!body.trim()) {
      setErrorMessage("Please enter the email body content.");
      return;
    }
    if (activeRecipients.length === 0) {
      setErrorMessage("Please provide at least one valid recipient email.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await emailService.scheduleEmails({
        senderEmail: senderEmail.trim(),
        subject: subject.trim(),
        body: body.trim(),
        recipients: activeRecipients,
        startTime: new Date(startTime).toISOString(),
        delaySeconds: Number(delaySeconds),
        hourlyLimit: Number(hourlyLimit),
      });

      setSuccessMessage(
        `Successfully scheduled ${res.emailsCount || activeRecipients.length} emails! Jobs will process via BullMQ.`
      );

      setTimeout(() => {
        setIsLoading(false);
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(
        err.response?.data?.error || err.message || "Failed to schedule email batch"
      );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Compose & Schedule Campaign"
      description="Queue delayed emails with BullMQ, stagger delivery, and configure rate limits"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Sender Email */}
        <Input
          label="Sender Email Address"
          type="email"
          value={senderEmail}
          onChange={(e) => setSenderEmail(e.target.value)}
          placeholder="sender@domain.com"
          required
        />

        {/* Recipients Mode Selector */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Recipients ({activeRecipients.length} detected)
            </label>
            <div className="flex rounded-lg bg-slate-800 p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setInputMode("csv")}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  inputMode === "csv"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Upload CSV
              </button>
              <button
                type="button"
                onClick={() => setInputMode("manual")}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  inputMode === "manual"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Manual Paste
              </button>
            </div>
          </div>

          {inputMode === "csv" ? (
            <CsvUploader onRecipientsParsed={(parsed) => setRecipients(parsed)} />
          ) : (
            <textarea
              rows={3}
              value={manualRecipientsText}
              onChange={(e) => setManualRecipientsText(e.target.value)}
              placeholder="Paste email addresses separated by commas or new lines&#10;e.g. alice@reachinbox.test, bob@reachinbox.test"
              className="w-full rounded-xl bg-slate-900 border border-slate-800 p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 font-mono"
            />
          )}
        </div>

        {/* Subject Line */}
        <Input
          label="Email Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="e.g. Welcome to Outbox Labs / ReachInbox"
          required
        />

        {/* Body Textarea */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Email Content
          </label>
          <textarea
            rows={5}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your email body here... Supports plain text and line breaks."
            className="w-full rounded-xl bg-slate-900 border border-slate-800 p-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 leading-relaxed"
            required
          />
        </div>

        {/* Scheduling & Rate Limiting Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-300 mb-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span>Start Time</span>
            </label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-300 mb-1">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>Delay (Seconds)</span>
            </label>
            <input
              type="number"
              min={0}
              max={3600}
              value={delaySeconds}
              onChange={(e) => setDelaySeconds(Number(e.target.value))}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-300 mb-1">
              <Gauge className="w-3.5 h-3.5 text-indigo-400" />
              <span>Hourly Limit</span>
            </label>
            <input
              type="number"
              min={1}
              max={10000}
              value={hourlyLimit}
              onChange={(e) => setHourlyLimit(Number(e.target.value))}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            icon={<Send className="w-4 h-4" />}
          >
            Schedule {activeRecipients.length > 0 ? `(${activeRecipients.length})` : ""} Emails
          </Button>
        </div>
      </form>
    </Modal>
  );
};
