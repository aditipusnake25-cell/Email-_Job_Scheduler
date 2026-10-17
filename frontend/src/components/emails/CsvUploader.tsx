import React, { useRef, useState } from "react";
import { UploadCloud, FileText, CheckCircle2, AlertTriangle, Trash2 } from "lucide-react";
import { parseEmailsFromFile, ParseEmailResult } from "../../utils/csvParser";

export interface CsvUploaderProps {
  onRecipientsParsed: (emails: string[]) => void;
  initialCount?: number;
}

export const CsvUploader: React.FC<CsvUploaderProps> = ({ onRecipientsParsed }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<ParseEmailResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileProcess = async (file: File) => {
    if (!file.name.endsWith(".csv") && !file.name.endsWith(".txt")) {
      alert("Please upload a .csv or .txt file containing recipient emails.");
      return;
    }

    setFileName(file.name);
    const result = await parseEmailsFromFile(file);
    setParseResult(result);
    onRecipientsParsed(result.validEmails);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileProcess(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileProcess(file);
  };

  const handleClear = () => {
    setFileName(null);
    setParseResult(null);
    onRecipientsParsed([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="w-full">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".csv,.txt"
        className="hidden"
      />

      {!fileName ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
            isDragging
              ? "border-indigo-500 bg-indigo-500/10"
              : "border-slate-800 hover:border-slate-700 bg-slate-900/50 hover:bg-slate-900"
          }`}
        >
          <div className="p-3 rounded-xl bg-slate-800 text-slate-400 mb-3">
            <UploadCloud className="w-6 h-6 text-indigo-400" />
          </div>
          <p className="text-sm font-medium text-slate-200">
            Click to upload or drag & drop CSV file
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Supports CSV or text files with one recipient per line or column
          </p>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">{fileName}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {parseResult?.validEmails.length || 0} valid recipients detected
                  </span>
                  {(parseResult?.duplicatesCount || 0) > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-400 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {parseResult?.duplicatesCount} duplicates deduped
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="Remove file"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {parseResult && parseResult.validEmails.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-800/80">
              <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
                Preview Recipients:
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {parseResult.validEmails.slice(0, 8).map((email, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-xs font-mono"
                  >
                    {email}
                  </span>
                ))}
                {parseResult.validEmails.length > 8 && (
                  <span className="px-2 py-0.5 rounded bg-slate-800/50 text-slate-500 text-xs font-mono">
                    +{parseResult.validEmails.length - 8} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
