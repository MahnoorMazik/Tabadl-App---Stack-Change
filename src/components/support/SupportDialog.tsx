"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ZypherLoader } from "@/components/ui/zypher-loader";
import { toast } from "sonner";
import { handleError, extractApiError } from "@/lib/utils/error-handler";
import { SUPPORT_STATUS_LABEL } from "@/lib/support/supportStatus";
import { EntityDocumentUploader, type UploadedDocument } from "@/components/documents/EntityDocumentUploader";
import { DocumentViewer } from "@/components/documents/DocumentViewer";
import { PendingAttachmentPicker, uploadPendingFiles, type PendingFile } from "@/components/documents/PendingAttachmentPicker";
import { useFormDirty } from "@/hooks/useFormDirty";

interface SupportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket?: {
    id: number;
    displayId: string | null;
    title: string;
    description: string;
    status: string;
  } | null;
  onSuccess: () => void;
}

export function SupportDialog({ open, onOpenChange, ticket, onSuccess }: SupportDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<UploadedDocument | null>(null);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);

  const { markDirty, resetDirty, handleCloseAttempt, forceClose } = useFormDirty();

  const isEditMode = !!ticket;

  useEffect(() => {
    if (ticket) {
      setTitle(ticket.title);
      setDescription(ticket.description);
    } else {
      setTitle("");
      setDescription("");
    }
    setError("");
    setDocuments([]);
    if (!open) {
      setDocuments([]);
      setPendingFiles([]);
    }
  }, [ticket, open]);

  useEffect(() => {
    if (!ticket && !open) return;
    const ticketId = ticket?.displayId != null ? String(ticket.displayId) : ticket?.id ? String(ticket.id) : null;
    if (!ticketId) {
      setDocuments([]);
      return;
    }
    setDocumentsLoading(true);
    fetch(`/api/support/${encodeURIComponent(ticketId)}/attachments`)
      .then(async (r) => {
        if (!r.ok) return { attachments: [] };
        return r.json();
      })
      .then((data) => {
        setDocuments(data.attachments || []);
        setDocumentsLoading(false);
      })
      .catch(() => {
        setDocuments([]);
        setDocumentsLoading(false);
      });
  }, [ticket, open]);

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

      const url = ticket ? `/api/support/${encodeURIComponent(ticket.displayId || String(ticket.id))}` : "/api/support";
      const method = ticket ? "PATCH" : "POST";

      const payload: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim(),
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const msg = await extractApiError(response);
        throw new Error(msg);
      }

      // Upload any pending attachments after ticket is saved
      if (!isEditMode && pendingFiles.length > 0) {
        const created = (await response.json()) as { id?: number; displayId?: string | null };
        const ticketRef = created.displayId ?? String(created.id ?? "");
        if (ticketRef) {
          await uploadPendingFiles(`/api/support/${encodeURIComponent(ticketRef)}/attachments`, pendingFiles);
        }
        setPendingFiles([]);
      }

      resetDirty();
      onSuccess();
      onOpenChange(false);
      toast.success(isEditMode ? "Ticket updated" : "Ticket created");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save ticket";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const canManageAttachments = isEditMode;

  return (
    <Dialog open={open} onOpenChange={(o) => handleCloseAttempt(o, onOpenChange, "Support Ticket")}>
      <DialogContent onXClose={() => forceClose(onOpenChange)} className="max-h-[90vh] overflow-y-auto sm:max-w-[42rem]">
        {loading && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 rounded-lg bg-background/80 backdrop-blur-sm">
            <ZypherLoader size={40} />
            <p className="text-sm text-muted-foreground">{isEditMode ? "Saving ticket..." : "Creating ticket..."}</p>
          </div>
        )}
        <form onSubmit={handleSubmit} onChangeCapture={markDirty}>
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "Edit support ticket" : "Create support ticket"}
            </DialogTitle>
            <DialogDescription>
              {isEditMode
                ? "Update the ticket details below."
                : "Describe the issue you're experiencing. Optionally attach files below."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {error}
              </div>
            )}

            {isEditMode && ticket && (
              <div className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/40 px-3 py-2">
                <div className="grid gap-1">
                  <span className="text-xs text-muted-foreground">Reference</span>
                  <span className="font-mono text-sm font-medium">{ticket.displayId || String(ticket.id)}</span>
                </div>
                <Badge variant="outline" className="ml-auto">
                  {SUPPORT_STATUS_LABEL[ticket.status as keyof typeof SUPPORT_STATUS_LABEL] || ticket.status}
                </Badge>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="title" required>
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
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description" required>
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
              />
            </div>

            {!isEditMode && (
              <div className="grid gap-2">
                <Label>Attachments (optional)</Label>
                <PendingAttachmentPicker
                  files={pendingFiles}
                  onChange={setPendingFiles}
                  disabled={loading}
                />
              </div>
            )}

            {isEditMode && canManageAttachments && (
              <div className="grid gap-2">
                <Label>Attachments</Label>
                <p className="text-xs text-muted-foreground">
                  PDF, PNG, JPG, JPEG (max 10 files, 10MB each)
                </p>
                <EntityDocumentUploader
                  entityType="supportTicket"
                  entityId={ticket?.displayId != null ? String(ticket.displayId) : String(ticket?.id || "")}
                  existingDocuments={documents}
                  onUploadComplete={() => {
                    const ticketId = ticket?.displayId != null ? String(ticket.displayId) : String(ticket?.id || "");
                    fetch(`/api/support/${encodeURIComponent(ticketId)}/attachments`)
                      .then(async (r) => r.json())
                      .then((data) => setDocuments(data.attachments || []))
                      .catch(() => {});
                  }}
                  onViewDocument={(doc) => setViewingDocument(doc)}
                  isLoading={documentsLoading}
                  disabled={loading}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => { resetDirty(); onOpenChange(false); }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {isEditMode ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      <DocumentViewer
        open={!!viewingDocument}
        onOpenChange={(open) => {
          if (!open) setViewingDocument(null);
        }}
        document={viewingDocument}
      />
    </Dialog>
  );
}
