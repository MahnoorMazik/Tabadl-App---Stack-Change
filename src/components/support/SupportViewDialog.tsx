"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DetailField, DetailFieldGroup } from "@/components/shared/DetailField";
import { DocumentViewer } from "@/components/documents/DocumentViewer";
import { EntityDocumentUploader, type UploadedDocument } from "@/components/documents/EntityDocumentUploader";
import { SUPPORT_STATUS_LABEL } from "@/lib/support/supportStatus";
import { Paperclip, Pencil } from "lucide-react";
import { useTimeFormat } from "@/hooks/useTimeFormat";
import { formatDateTime } from "@/lib/timeFormat";

interface SupportViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: {
    id: number;
    displayId: string | null;
    title: string;
    description: string;
    status: string;
    resolvedAt: string | null;
    createdAt: string;
    updatedAt?: string | null;
    createdBy: {
      id: number;
      name: string;
      firstName: string | null;
      lastName: string | null;
      email: string;
    } | null;
  } | null;
  canUpdate: boolean;
  canCreate: boolean;
  currentUserId: number | null;
  onEdit: () => void;
}

function creatorName(createdBy: {
  id: number;
  name: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
} | null): string {
  if (!createdBy) return "—";
  if (createdBy.name) return createdBy.name;
  return [createdBy.firstName, createdBy.lastName].filter(Boolean).join(" ") || createdBy.email || "—";
}

function formatDate(s: string | null): string {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "NEW") return "outline";
  if (status === "IN_PROGRESS") return "default";
  return "secondary";
}

export function SupportViewDialog({
  open,
  onOpenChange,
  ticket,
  canUpdate,
  canCreate,
  currentUserId,
  onEdit,
}: SupportViewDialogProps) {
  const { timeFormat } = useTimeFormat();
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<UploadedDocument | null>(null);

  useEffect(() => {
    if (!ticket || !open) {
      setDocuments([]);
      return;
    }
    const ticketId = ticket.displayId != null ? String(ticket.displayId) : String(ticket.id);
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

  const canManageAttachments =
    canUpdate || (canCreate && currentUserId != null && ticket != null && ticket.createdBy?.id === currentUserId);

  if (!ticket) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {ticket.displayId || String(ticket.id)} - {ticket.title}
          </DialogTitle>
          <DialogDescription>
            Created by {creatorName(ticket.createdBy)} on {formatDate(ticket.createdAt)}
            {ticket.updatedAt && ticket.updatedAt !== ticket.createdAt && (
              <> · Last updated {formatDate(ticket.updatedAt)}</>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <DetailFieldGroup columns={2}>
            <DetailField
              label="Reference"
              value={<span className="font-mono text-sm">{ticket.displayId || String(ticket.id)}</span>}
            />
            <DetailField
              label="Status"
              value={
                <Badge variant={statusVariant(ticket.status)}>
                  {SUPPORT_STATUS_LABEL[ticket.status as keyof typeof SUPPORT_STATUS_LABEL] || ticket.status}
                </Badge>
              }
            />
          </DetailFieldGroup>

          <div>
            <Label className="text-muted-foreground text-sm">Title</Label>
            <div className="mt-1.5 font-medium">{ticket.title}</div>
          </div>

          <div>
            <Label className="text-muted-foreground text-sm">Description</Label>
            <div className="mt-1.5 p-3 border rounded-md bg-muted/50 min-h-[80px]">
              <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
            </div>
          </div>

          {ticket.resolvedAt && (
            <DetailField
              label="Resolved"
              value={formatDate(ticket.resolvedAt)}
            />
          )}

          <div>
            <Label className="text-muted-foreground text-sm flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              Attachments
            </Label>
            <div className="mt-2">
              <EntityDocumentUploader
                entityType="supportTicket"
                entityId={ticket.displayId != null ? String(ticket.displayId) : String(ticket.id)}
                existingDocuments={documents}
                onUploadComplete={() => {
                  const ticketId = ticket.displayId != null ? String(ticket.displayId) : String(ticket.id);
                  fetch(`/api/support/${encodeURIComponent(ticketId)}/attachments`)
                    .then(async (r) => r.json())
                    .then((data) => setDocuments(data.attachments || []))
                    .catch(() => {});
                }}
                onViewDocument={(doc) => setViewingDocument(doc)}
                isLoading={documentsLoading}
                disabled={false}
                readOnly={!canManageAttachments}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {canUpdate && (
            <Button onClick={() => {
              onOpenChange(false);
              onEdit();
            }}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </DialogFooter>
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

