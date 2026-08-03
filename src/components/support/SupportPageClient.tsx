"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SearchInput } from "@/components/ui/search-input";
import { Plus, ChevronDown, Check, Info } from "lucide-react";
import Link from "next/link";
import { ZypherLoader } from "@/components/ui/zypher-loader";
import { TableActionsDropdown } from "@/components/shared/TableActionsDropdown";
import { SupportDialog } from "@/components/support/SupportDialog";
import { SupportViewDialog } from "@/components/support/SupportViewDialog";
import { SupportFilters, type SupportFilterValues, getDefaultSupportFilters } from "@/components/support/SupportFilters";
import { DataTablePagination } from "@/components/shared/DataTablePagination";
import { RowsPerPageSelect } from "@/components/shared/RowsPerPageSelect";
import { SortableTableHead } from "@/components/shared/SortableTableHead";
import { TableRowSkeleton } from "@/components/shared/TableRowSkeleton";
import { TruncatedText } from "@/components/shared/TruncatedText";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getDateRangeParams, isValidDateRangeValue, serializeDateRangeToParams, type DateRangeFilterValue, type DateRangeValue } from "@/components/filters/DateRangeFilter";
import { useDefaultPageSize } from "@/hooks/useDefaultPageSize";
import { useDefaultDateRange } from "@/hooks/useDefaultDateRange";
import { useShowInitialFullPageLoading } from "@/hooks/useShowInitialFullPageLoading";
import { useIsDesktop } from "@/hooks/useMediaQuery";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { handleError, extractApiError } from "@/lib/utils/error-handler";
import { SUPPORT_STATUS_LABEL, SUPPORT_TICKET_STATUSES } from "@/lib/support/supportStatus";

interface SupportTicket {
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
  _count?: {
    attachments: number;
  };
}

const supportPillClass: Record<string, string> = {
  NEW:         "status-pill status-pill-new",
  IN_PROGRESS: "status-pill status-pill-inprogress",
  RESOLVED:    "status-pill status-pill-resolved",
  CLOSED:      "status-pill status-pill-closed",
};

const supportItemClass: Record<string, string> = {
  NEW:         "text-[var(--status-new-text)] focus:bg-[var(--status-new-bg)] focus:text-[var(--status-new-text)]",
  IN_PROGRESS: "text-[var(--status-inprogress-text)] focus:bg-[var(--status-inprogress-bg)] focus:text-[var(--status-inprogress-text)]",
  RESOLVED:    "text-[var(--status-resolved-text)] focus:bg-[var(--status-resolved-bg)] focus:text-[var(--status-resolved-text)]",
  CLOSED:      "text-[var(--status-closed-text)] focus:bg-[var(--status-closed-bg)] focus:text-[var(--status-closed-text)]",
};

interface SupportPageClientProps {
  canCreate: boolean;
  canUpdate: boolean;
  isAdmin: boolean;
  currentUserId: number | null;
}

export default function SupportPageClient({ canCreate, canUpdate, isAdmin, currentUserId }: SupportPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDesktop = useIsDesktop();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [users, setUsers] = useState<Array<{ id: number; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const { pageSize, setPageSize } = useDefaultPageSize();
  const { dateRange: defaultDateRange } = useDefaultDateRange();
  const [sortBy, setSortBy] = useState<string | null>("status");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [viewTicket, setViewTicket] = useState<SupportTicket | null>(null);
  const [ticketToDelete, setTicketToDelete] = useState<SupportTicket | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);

  const [filters, setFilters] = useState<SupportFilterValues>(() => {
    const range = searchParams.get("dateRange") as string | null;
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    let dateRangeValue: DateRangeFilterValue;
    if (range && isValidDateRangeValue(range)) {
      dateRangeValue = {
        range: range as DateRangeValue,
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateTo ? new Date(dateTo) : undefined,
      };
    } else if (dateFrom || dateTo) {
      dateRangeValue = {
        range: "custom",
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateTo ? new Date(dateTo) : undefined,
      };
    } else {
      dateRangeValue = defaultDateRange;
    }

    return {
      status: searchParams.get("status") || "all",
      createdById: searchParams.get("createdById") || "all",
      dateRange: dateRangeValue,
    };
  });

  useEffect(() => {
    const hasUrlDate =
      searchParams.get("dateRange") ||
      searchParams.get("dateFrom") ||
      searchParams.get("dateTo");
    if (!hasUrlDate && defaultDateRange.range) {
      setFilters((prev) => ({ ...prev, dateRange: defaultDateRange }));
    }
  }, [defaultDateRange, searchParams]);

  const ticketsFetchAbortRef = useRef<AbortController | null>(null);

  const fetchTickets = useCallback(async () => {
    ticketsFetchAbortRef.current?.abort();
    const ac = new AbortController();
    ticketsFetchAbortRef.current = ac;

    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(currentPage));
      params.set("limit", String(pageSize === 9999 ? 100 : pageSize));
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (filters.status && filters.status !== "all") params.set("status", filters.status);
      if (filters.createdById && filters.createdById !== "all") params.set("createdById", filters.createdById);

      const dateParams = getDateRangeParams(filters.dateRange);
      if (dateParams.dateFrom) params.set("dateFrom", dateParams.dateFrom.toISOString());
      if (dateParams.dateTo) params.set("dateTo", dateParams.dateTo.toISOString());

      if (sortBy) {
        params.set("sortBy", sortBy);
        params.set("sortOrder", sortOrder);
      }

      const response = await fetch(`/api/support?${params.toString()}`, {
        cache: "no-store",
        signal: ac.signal,
      });
      const json: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const msg =
          json && typeof json === "object" && json !== null && "error" in json && typeof (json as { error: unknown }).error === "string"
            ? (json as { error: string }).error
            : response.status === 401
              ? "Session expired. Please sign in again."
              : `Could not load support tickets (${response.status})`;
        if (!ac.signal.aborted) {
          setFetchError(msg);
          setTickets([]);
          setTotalItems(0);
        }
        return;
      }

      if (ac.signal.aborted) return;

      const list = Array.isArray(json) ? json : (json as { data?: SupportTicket[] })?.data ?? [];
      const totalCount = Array.isArray(json) ? json.length : (json as { total?: number })?.total ?? list.length;
      setTickets(list);
      setTotalItems(totalCount);
    } catch (error: unknown) {
      const aborted =
        (error instanceof DOMException && error.name === "AbortError") ||
        (error instanceof Error && error.name === "AbortError");
      if (aborted) return;
      console.error("Failed to fetch support tickets:", error);
      if (!ac.signal.aborted) {
        setFetchError(error instanceof Error ? error.message : "Failed to load support tickets");
        setTickets([]);
        setTotalItems(0);
      }
    } finally {
      if (!ac.signal.aborted) setLoading(false);
    }
  }, [currentPage, pageSize, searchQuery, filters, sortBy, sortOrder]);

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/support");
      const json = await response.json();
      const usersList = ((json as { filterCreators?: Array<{ id: number; name: string }> })?.filterCreators ?? []) as Array<{ id: number; name: string }>;
      setUsers(Array.isArray(usersList) ? usersList : []);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      setUsers([]);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    void fetchTickets();
    return () => {
      ticketsFetchAbortRef.current?.abort();
    };
  }, [fetchTickets]);

  // Deep-link: /admin/support?ticket=123 opens the ticket view dialog
  useEffect(() => {
    const ticketParam = searchParams.get("ticket");
    if (!ticketParam) return;

    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(`/api/support/${encodeURIComponent(ticketParam)}`);
        if (!response.ok || cancelled) return;
        const ticket = (await response.json()) as SupportTicket;
        if (cancelled) return;
        setViewTicket(ticket);
        setViewDialogOpen(true);

        const params = new URLSearchParams(searchParams.toString());
        params.delete("ticket");
        const qs = params.toString();
        router.replace(qs ? `?${qs}` : "/admin/support", { scroll: false });
      } catch {
        // ignore — invalid or inaccessible ticket
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, router]);

  const handleFiltersChange = (newFilters: SupportFilterValues) => {
    setFilters(newFilters);
    setCurrentPage(1);

    const params = new URLSearchParams();
    if (newFilters.status && newFilters.status !== "all") params.set("status", newFilters.status);
    if (newFilters.createdById && newFilters.createdById !== "all") params.set("createdById", newFilters.createdById);

    serializeDateRangeToParams(newFilters.dateRange, params);

    const queryString = params.toString();
    router.replace(queryString ? `?${queryString}` : window.location.pathname, { scroll: false });
  };

  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  const handleSort = (key: string) => {
    setCurrentPage(1);
    if (sortBy === key) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortOrder("desc");
    }
  };

  const handleCreate = () => {
    if (!isDesktop) {
      router.push("/admin/support/new");
      return;
    }
    setSelectedTicket(null);
    setDialogOpen(true);
  };

  const handleViewTicket = (ticket: SupportTicket) => {
    setViewTicket(ticket);
    setViewDialogOpen(true);
  };

  const handleEdit = (ticket: SupportTicket, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedTicket(ticket);
    setDialogOpen(true);
  };

  const handleDeleteClick = (ticket: SupportTicket, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTicketToDelete(ticket);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!ticketToDelete) return;

    try {
      const ticketId = ticketToDelete.displayId != null ? String(ticketToDelete.displayId) : String(ticketToDelete.id);
      const response = await fetch(`/api/support/${encodeURIComponent(ticketId)}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const msg = await extractApiError(response);
        throw new Error(msg);
      }

      await fetchTickets();
      setDeleteDialogOpen(false);
      setTicketToDelete(null);
      toast.success("Ticket deleted");
    } catch (err) {
      toast.error(await handleError(err));
    }
  };

  const handleStatusChange = async (ticket: SupportTicket, newStatus: string) => {
    if (ticket.status === newStatus) return;

    setUpdatingStatusId(ticket.id);
    try {
      const ticketId = ticket.displayId != null ? String(ticket.displayId) : String(ticket.id);
      const response = await fetch(`/api/support/${encodeURIComponent(ticketId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const msg = await extractApiError(response);
        throw new Error(msg);
      }

      setTickets((prev) => {
        const next = prev.map((row) =>
          row.id === ticket.id
            ? {
                ...row,
                status: newStatus,
                resolvedAt:
                  newStatus === "RESOLVED" || newStatus === "CLOSED"
                    ? new Date().toISOString()
                    : null,
              }
            : row
        );

        if (filters.status !== "all" && newStatus !== filters.status) {
          return next.filter((row) => row.id !== ticket.id);
        }

        return next;
      });

      if (filters.status !== "all" && newStatus !== filters.status) {
        setTotalItems((prev) => Math.max(0, prev - 1));
      }

      setSelectedTicket((prev) => (prev && prev.id === ticket.id ? { ...prev, status: newStatus } : prev));
      setViewTicket((prev) =>
        prev && prev.id === ticket.id
          ? {
              ...prev,
              status: newStatus,
              resolvedAt:
                newStatus === "RESOLVED" || newStatus === "CLOSED"
                  ? new Date().toISOString()
                  : null,
            }
          : prev
      );
      setTicketToDelete((prev) => (prev && prev.id === ticket.id ? { ...prev, status: newStatus } : prev));

      toast.success("Status updated");
    } catch (err) {
      toast.error(await handleError(err));
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const showFullPageLoading = useShowInitialFullPageLoading(loading);
  if (showFullPageLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6 min-w-0 max-w-full w-full overflow-x-hidden">
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold sm:text-3xl">Support</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Track and manage support tickets</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" className="gap-2" asChild>
            <Link href="/admin/support/about">
              <Info className="h-4 w-4" />
              About
            </Link>
          </Button>
          {canCreate && (
            <Button onClick={handleCreate} className="flex-1 sm:flex-none">
              <Plus className="mr-2 h-4 w-4" />
              New Ticket
            </Button>
          )}
        </div>
      </div>

      <SupportFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        users={users}
      />

      {fetchError && (
        <div
          className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {fetchError}
        </div>
      )}

      <div className="mb-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-4">
        <SearchInput
          placeholder="Search tickets..."
          onSearch={(q) => {
            setSearchQuery(q);
            setCurrentPage(1);
          }}
          className="w-full min-w-0 sm:max-w-md sm:flex-1"
        />
        {totalItems > 0 && (
          <RowsPerPageSelect
            value={pageSize}
            onChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
          />
        )}
      </div>

      <div className="w-full max-w-full min-w-0 rounded-2xl border border-[var(--surface-border)] overflow-hidden">
        <div className="table-scroll">
        <Table className="min-w-[520px] w-full sm:min-w-[680px] lg:min-w-[800px]">
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[100px]">Reference</TableHead>
              <SortableTableHead sortKey="title" label="Title" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={handleSort} className="min-w-[140px]" />
              <SortableTableHead sortKey="status" label="Status" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={handleSort} className="min-w-[90px]" />
              <TableHead className="min-w-[120px] hidden lg:table-cell">Created By</TableHead>
              <SortableTableHead sortKey="createdAt" label="Created" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={handleSort} className="min-w-[100px] hidden lg:table-cell" />
              <TableHead className="min-w-[80px] hidden lg:table-cell">Attachments</TableHead>
              <TableHead className="text-right min-w-[70px] table-actions-col">Actions</TableHead>
            </TableRow>
          </TableHeader>
          {loading ? (
            <TableRowSkeleton columnCount={7} rowCount={pageSize > 10 ? Math.min(pageSize, 15) : 10} />
          ) : tickets.length === 0 ? (
            <TableBody>
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  {fetchError
                    ? "Fix the error above and refresh, or adjust filters."
                    : searchQuery
                      ? "No support tickets match your search."
                      : filters.status !== "all" ||
                          filters.createdById !== "all" ||
                          filters.dateRange.range !== "all"
                        ? "No support tickets match your filters. Try clearing filters."
                        : "No support tickets found. Create one to get started."}
                </TableCell>
              </TableRow>
            </TableBody>
          ) : (
            <TableBody>
              {tickets.map((ticket) => (
                <TableRow
                  key={ticket.id}
                  className="cursor-pointer hover:bg-[var(--surface-3)]"
                  onClick={() => handleViewTicket(ticket)}
                >
                  <TableCell>
                    <span className="font-medium">{ticket.displayId || String(ticket.id)}</span>
                  </TableCell>
                  <TableCell>
                    <TruncatedText text={ticket.title} maxLines={2} alwaysPreviewTooltip />
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {updatingStatusId === ticket.id ? (
                      <div className="flex min-h-8 items-center">
                        <ZypherLoader size={16} />
                      </div>
                    ) : canUpdate ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className={`${supportPillClass[ticket.status] ?? "status-pill"} inline-flex items-center gap-1 pr-1.5`}
                          >
                            {SUPPORT_STATUS_LABEL[ticket.status as keyof typeof SUPPORT_STATUS_LABEL] || ticket.status}
                            <ChevronDown className="h-3 w-3 opacity-60 shrink-0" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-40 p-1">
                          {SUPPORT_TICKET_STATUSES.map((status) => (
                            <DropdownMenuItem
                              key={status}
                              onSelect={() => void handleStatusChange(ticket, status)}
                              className={`flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium cursor-pointer ${supportItemClass[status] ?? ""}`}
                            >
                              {SUPPORT_STATUS_LABEL[status]}
                              {ticket.status === status && <Check className="h-3 w-3 shrink-0 ml-2" />}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <span className={`${supportPillClass[ticket.status] ?? "status-pill"}`}>
                        {SUPPORT_STATUS_LABEL[ticket.status as keyof typeof SUPPORT_STATUS_LABEL] || ticket.status}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">
                    {ticket.createdBy?.name || "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">
                    {new Date(ticket.createdAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">
                    {ticket._count?.attachments ?? 0}
                  </TableCell>
                  <TableCell className="table-actions-col text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end">
                      <TableActionsDropdown
                        onView={() => handleViewTicket(ticket)}
                        onEdit={() => handleEdit(ticket)}
                        onDelete={isAdmin ? () => handleDeleteClick(ticket) : undefined}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          )}
        </Table>
        </div>

        {totalItems > 0 && (
          <DataTablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={totalItems}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
          />
        )}
      </div>

      <SupportDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        ticket={selectedTicket}
        onSuccess={fetchTickets}
      />

      <SupportViewDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        ticket={viewTicket}
        canUpdate={canUpdate}
        canCreate={canCreate}
        currentUserId={currentUserId}
        onEdit={() => {
          setViewDialogOpen(false);
          setDialogOpen(true);
        }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this ticket?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the ticket and its attachments. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
