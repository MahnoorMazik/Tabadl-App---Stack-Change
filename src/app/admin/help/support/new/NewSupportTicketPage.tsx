"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

// Type definitions for pending files
type PendingFile = {
  file: File;
  id: string;
  progress?: number;
  error?: string;
  uploaded?: boolean;
};

// Simple inline loader component
function ZypherLoader({ size = 16 }: { size?: number }) {
  return (
    <div 
      className="inline-block animate-spin rounded-full border-2 border-solid border-current border-r-transparent"
      style={{ width: size, height: size }}
    />
  );
}

// Simple error handling functions
async function extractApiError(response: Response): Promise<string> {
  try {
    const data = await response.json();
    return data.message || data.error || `Request failed with status ${response.status}`;
  } catch {
    return `Request failed with status ${response.status}`;
  }
}

async function handleError(err: unknown): Promise<string> {
  if (err instanceof Error) return err.message;
  return String(err);
}

// Simple pending attachment picker component
function PendingAttachmentPicker({ 
  files, 
  onChange, 
  disabled 
}: { 
  files: PendingFile[]; 
  onChange: (files: PendingFile[]) => void; 
  disabled?: boolean;
}) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const newPendingFiles = selectedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substring(7),
      progress: 0,
    }));
    onChange([...files, ...newPendingFiles]);
  };

  const removeFile = (id: string) => {
    onChange(files.filter(f => f.id !== id));
  };

  return (
    <div className="space-y-2">
      <input
        type="file"
        multiple
        accept=".pdf,.png,.jpg,.jpeg"
        onChange={handleFileChange}
        disabled={disabled}
        className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:text-primary-foreground hover:file:bg-primary/90"
      />
      {files.length > 0 && (
        <div className="space-y-1">
          {files.map((file) => (
            <div key={file.id} className="flex items-center justify-between text-sm">
              <span className="truncate">{file.file.name}</span>
              <button
                type="button"
                onClick={() => removeFile(file.id)}
                className="text-destructive hover:text-destructive/80"
                disabled={disabled}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

async function uploadPendingFiles(url: string, files: PendingFile[]): Promise<void> {
  const formData = new FormData();
  files.forEach(({ file }) => formData.append("attachments", file));

  const response = await fetch(url, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Failed to upload attachments");
  }
}

export function NewSupportTicketPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (!title.trim()) {
        throw new Error("Title is required");
      }
      if (!description.trim()) {
        throw new Error("Description is required");
      }

      const response = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
        }),
      });

      if (!response.ok) {
        const msg = await extractApiError(response);
        throw new Error(msg);
      }

      const created = (await response.json()) as { id?: number; displayId?: string | null };
      const ticketRef = created.displayId ?? String(created.id ?? "");

      if (ticketRef && pendingFiles.length > 0) {
        await uploadPendingFiles(`/api/support/${encodeURIComponent(ticketRef)}/attachments`, pendingFiles);
      }

      toast.success("Ticket created");
      router.push("/admin/help/support");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create ticket";
      setError(msg);
      toast.error(await handleError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-6 px-0">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="-ml-2" onClick={() => router.push("/admin/help/support")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">New Support Ticket</h1>
          <p className="text-sm text-muted-foreground">Describe the issue you are experiencing</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-4 rounded-xl border border-border/60 bg-card p-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="title" >
              Title
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Button not working on dashboard"
              maxLength={500}
              required
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="description" >
              Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue in detail..."
              rows={6}
              maxLength={5000}
              required
              disabled={loading}
              className="resize-none"
            />
          </div>

          <div className="grid gap-1.5">
            <Label>Attachments (optional)</Label>
            <p className="text-xs text-muted-foreground">
              PDF, PNG, JPG, JPEG (max 10 files, 10MB each)
            </p>
            <PendingAttachmentPicker
              files={pendingFiles}
              onChange={setPendingFiles}
              disabled={loading}
            />
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => router.push("/admin/help/support")}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" className="flex-1" disabled={loading}>
            {loading ? <ZypherLoader size={16} /> : "Create Ticket"}
          </Button>
        </div>
      </form>
    </div>
  );
}