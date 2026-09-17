
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

type PendingFile = {
  file: File;
  id: string;
  progress?: number;
  error?: string;
  uploaded?: boolean;
};

function ZypherLoader({ size = 16 }: { size?: number }) {
  return (
    <div 
      className="inline-block animate-spin rounded-full border-2 border-solid border-current border-r-transparent"
      style={{ width: size, height: size }}
    />
  );
}

async function extractApiError(response: Response): Promise<string> {
  try {
    const data = await response.json();
    return data.message || data.error || `Request failed with status ${response.status}`;
  } catch {
    return `Request failed with status ${response.status}`;
  }
}

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

export function NewSupportTicketPage() {
  const router = useRouter();
  const { token } = useAuth();
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

      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // Create the ticket
      const response = await fetch("/api/support", {
        method: "POST",
        headers,
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `Failed to create ticket (${response.status})`);
      }

      const created = await response.json();
      
      // Handle both response formats
      const ticketId = created.id || created.data?.id;
      const displayId = created.displayId || created.data?.displayId || `TICKET-${String(ticketId).padStart(6, "0")}`;

      toast.success("Ticket created successfully");

      // If there are pending files, upload them
      if (ticketId && pendingFiles.length > 0) {
        try {
          const formData = new FormData();
          pendingFiles.forEach(({ file }) => {
            formData.append("attachments", file);
          });

          const uploadResponse = await fetch(`/api/support/${ticketId}/attachments`, {
            method: "POST",
            headers: token ? { "Authorization": `Bearer ${token}` } : {},
            body: formData,
          });

          if (!uploadResponse.ok) {
            console.warn("Failed to upload attachments");
            toast.warning("Ticket created but attachments failed to upload");
          } else {
            toast.success("Attachments uploaded successfully");
          }
        } catch (uploadError) {
          console.error("Error uploading attachments:", uploadError);
          toast.warning("Ticket created but some attachments failed to upload");
        }
      }

      router.push("/admin/help/support");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create ticket";
      setError(msg);
      toast.error(msg);
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
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
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
            <Label htmlFor="description">
              Description <span className="text-destructive">*</span>
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