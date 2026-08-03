"use client";

// ============================================
// IMPORTS
// ============================================
import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { AdminPageTemplate } from "@/components/AdminPageTemplate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toAvatarUrl } from "@/lib/avatar-utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Ticket,
  Search,
  Plus,
  Eye,
  Mail,
  Building,
  Calendar,
  Phone,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Tag,
  MessageSquare,
  AlertTriangle,
  XCircle,
  CheckCheck,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/utils";
import { useLocale } from "@/contexts/LocaleContext";

// ============================================
// TYPES
// ============================================

interface SupportTicket {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  status: "open" | "in-progress" | "resolved" | "closed" | "pending";
  priority: "low" | "medium" | "high" | "urgent";
  category: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  closedAt?: string;
  client: {
    id: string;
    company: string;
    user: {
      id: string;
      name: string;
      email: string;
      phone?: string;
      avatar?: string;
    };
  };
  assignedTo?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  messages: any[];
  _count: {
    messages: number;
  };
}

interface TicketStatus {
  id: string;
  name: string;
  color: string;
  _count: {
    tickets: number;
  };
}

interface TicketPriority {
  id: string;
  name: string;
  color: string;
  _count: {
    tickets: number;
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

// Helper function to get status badge configuration
function getStatusBadge(status: string) {
  const statusMap: Record<
    string,
    { color: string; icon: React.ReactNode; label: string }
  > = {
    open: {
      color: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
      icon: <AlertCircle className="h-3 w-3 mr-1" />,
      label: "Open",
    },
    "in-progress": {
      color:
        "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300",
      icon: <Clock className="h-3 w-3 mr-1" />,
      label: "In Progress",
    },
    resolved: {
      color:
        "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300",
      icon: <CheckCheck className="h-3 w-3 mr-1" />,
      label: "Resolved",
    },
    closed: {
      color: "bg-gray-100 dark:bg-gray-800/40 text-gray-600 dark:text-gray-400",
      icon: <XCircle className="h-3 w-3 mr-1" />,
      label: "Closed",
    },
    pending: {
      color:
        "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300",
      icon: <Clock className="h-3 w-3 mr-1" />,
      label: "Pending",
    },
  };
  return statusMap[status] || statusMap["open"];
}

// Helper function to get priority badge configuration
function getPriorityBadge(priority: string) {
  const priorityMap: Record<
    string,
    { color: string; icon: React.ReactNode; label: string }
  > = {
    low: {
      color: "bg-gray-100 dark:bg-gray-800/40 text-gray-600 dark:text-gray-400",
      icon: <CheckCircle className="h-3 w-3 mr-1" />,
      label: "Low",
    },
    medium: {
      color: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
      icon: <AlertCircle className="h-3 w-3 mr-1" />,
      label: "Medium",
    },
    high: {
      color:
        "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300",
      icon: <AlertTriangle className="h-3 w-3 mr-1" />,
      label: "High",
    },
    urgent: {
      color: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300",
      icon: <AlertTriangle className="h-3 w-3 mr-1" />,
      label: "Urgent",
    },
  };
  return priorityMap[priority] || priorityMap["medium"];
}

// Helper function to get initials from name
function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function SupportTicketsPage() {
  // ============================================
  // HOOKS & CONTEXT
  // ============================================
  const { token } = useAuth();
  const { toast } = useToast();
  const { t, formatNumber, locale } = useLocale();

  // ============================================
  // STATE - Metadata
  // ============================================
  const [statuses, setStatuses] = useState<TicketStatus[]>([]);
  const [priorities, setPriorities] = useState<TicketPriority[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  // ============================================
  // STATE - Pagination & Search
  // ============================================
  const [rowsPerPage, setRowsPerPage] = useState<number | "all">(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // ============================================
  // STATE - Dialogs
  // ============================================
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(
    null,
  );
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingTicket, setEditingTicket] = useState<SupportTicket | null>(
    null,
  );
  const [deletingTicket, setDeletingTicket] = useState<SupportTicket | null>(
    null,
  );

  // ============================================
  // STATE - Loading States
  // ============================================
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);

  // ============================================
  // STATE - Form Data
  // ============================================
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "open",
    priority: "medium",
    category: "",
    clientId: "",
    assignedToId: "",
  });

  // ============================================
  // CONSTANTS
  // ============================================
  const ticketCategories = [
    "Technical Support",
    "Billing",
    "Account Management",
    "Feature Request",
    "Bug Report",
    "General Inquiry",
    "Complaint",
    "Other",
  ];

  const statusOptions = [
    { value: "open", label: "Open" },
    { value: "in-progress", label: "In Progress" },
    { value: "pending", label: "Pending" },
    { value: "resolved", label: "Resolved" },
    { value: "closed", label: "Closed" },
  ];

  const priorityOptions = [
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
    { value: "urgent", label: "Urgent" },
  ];

  // ============================================
  // API CALLS - Fetch Data
  // ============================================

  // Fetch tickets with pagination
  const fetchTickets = useCallback(async () => {
    // Get auth token from context or localStorage
    const authToken =
      token ||
      (typeof window !== "undefined"
        ? localStorage.getItem("auth-token")
        : null);
    const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};

    setLoading(true);
    setSearchError(null);

    try {
      const params = new URLSearchParams();

      // Add search filter if exists
      if (debouncedSearch) {
        params.append("search", debouncedSearch);
      }

      // Add pagination params
      params.append("page", currentPage.toString());
      if (rowsPerPage === "all") {
        params.append("limit", "all");
      } else {
        params.append("limit", rowsPerPage.toString());
      }

      const response = await axios.get(
        `/api/support-tickets?${params.toString()}`,
        {
          headers,
        },
      );

      // Handle structured response format
      const responseData = response.data?.data || response.data;
      if (responseData?.tickets) {
        setTickets(responseData.tickets);
      }
      if (responseData?.pagination) {
        setPagination(responseData.pagination);
      }
    } catch (error: any) {
      console.error("Error fetching tickets:", error);
      setSearchError(
        error.response?.data?.error ||
          t("admin.supportTickets.noTickets") ||
          "No tickets found",
      );
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [token, debouncedSearch, currentPage, rowsPerPage, t]);

  // Fetch clients for dropdown
  const fetchClients = useCallback(async () => {
    const authToken =
      token ||
      (typeof window !== "undefined"
        ? localStorage.getItem("auth-token")
        : null);
    const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};

    try {
      const response = await axios.get("/api/clients?limit=all", { headers });
      const responseData = response.data?.data || response.data;
      setClients(responseData?.clients || []);
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  }, [token]);

  // Fetch users for assignment dropdown
  const fetchUsers = useCallback(async () => {
    const authToken =
      token ||
      (typeof window !== "undefined"
        ? localStorage.getItem("auth-token")
        : null);
    const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};

    try {
      const response = await axios.get("/api/users?limit=all", { headers });
      const responseData = response.data?.data || response.data;
      setUsers(responseData?.users || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  }, [token]);

  // Fetch statuses and priorities metadata
  const fetchMetadata = useCallback(async () => {
    const authToken =
      token ||
      (typeof window !== "undefined"
        ? localStorage.getItem("auth-token")
        : null);
    const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};

    try {
      const [statusRes, priorityRes] = await Promise.all([
        axios.get("/api/support-tickets/statuses", { headers }),
        axios.get("/api/support-tickets/priorities", { headers }),
      ]);
      setStatuses(statusRes.data?.statuses || []);
      setPriorities(priorityRes.data?.priorities || []);
    } catch (error) {
      console.error("Error fetching metadata:", error);
    }
  }, [token]);

  // ============================================
  // EFFECTS
  // ============================================

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch tickets when dependencies change
  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, rowsPerPage]);

  // Fetch initial data
  useEffect(() => {
    fetchClients();
    fetchUsers();
    fetchMetadata();
  }, [fetchClients, fetchUsers, fetchMetadata]);

  // ============================================
  // API CALLS - CRUD Operations
  // ============================================

  // Create new ticket
  const handleCreate = async () => {
    try {
      await axios.post("/api/support-tickets", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast({
        title: t("common.success"),
        description:
          t("admin.supportTickets.created") || "Ticket created successfully",
      });

      // Reset form and close dialog
      setShowCreateDialog(false);
      setFormData({
        title: "",
        description: "",
        status: "open",
        priority: "medium",
        category: "",
        clientId: "",
        assignedToId: "",
      });
      await fetchTickets();
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: getErrorMessage(
          error,
          t("admin.supportTickets.createFailed") || "Failed to create ticket",
        ),
        variant: "destructive",
      });
    }
  };

  // Update existing ticket
  const handleUpdate = async () => {
    if (!editingTicket) return;
    setUpdating(true);

    try {
      await axios.put(
        `/api/support-tickets/${editingTicket.id}`,
        {
          title: formData.title,
          description: formData.description,
          status: formData.status,
          priority: formData.priority,
          category: formData.category,
          assignedToId: formData.assignedToId || null,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      toast({
        title: t("common.success"),
        description:
          t("admin.supportTickets.updated") || "Ticket updated successfully",
      });

      setShowEditDialog(false);
      setEditingTicket(null);
      await fetchTickets();
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: getErrorMessage(
          error,
          t("admin.supportTickets.updateFailed") || "Failed to update ticket",
        ),
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  // Delete ticket
  const handleDelete = async () => {
    if (!deletingTicket) return;

    setDeleting(true);
    try {
      await axios.delete(`/api/support-tickets/${deletingTicket.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast({
        title: t("common.success"),
        description:
          t("admin.supportTickets.deleted") || "Ticket deleted successfully",
      });

      setShowDeleteDialog(false);
      setDeletingTicket(null);
      await fetchTickets();
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: getErrorMessage(
          error,
          t("admin.supportTickets.deleteFailed") || "Failed to delete ticket",
        ),
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  // Quick status update from dropdown
  const handleQuickStatusUpdate = async (
    ticketId: string,
    newStatus: string,
  ) => {
    setStatusUpdating(ticketId);
    const ticket = tickets.find((t) => t.id === ticketId);

    // Optimistic update
    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId ? { ...t, status: newStatus as any } : t,
      ),
    );

    try {
      await axios.put(
        `/api/support-tickets/${ticketId}`,
        { status: newStatus },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      toast({
        title: t("common.success"),
        description: t("admin.supportTickets.updated") || "Ticket updated",
      });
    } catch (error: any) {
      // Rollback on error
      if (ticket) {
        setTickets((prev) =>
          prev.map((t) =>
            t.id === ticketId ? { ...t, status: ticket.status } : t,
          ),
        );
      }
      toast({
        title: t("common.error"),
        description:
          error.response?.data?.error || t("admin.supportTickets.updateFailed"),
        variant: "destructive",
      });
    } finally {
      setStatusUpdating(null);
    }
  };

  // ============================================
  // HANDLER FUNCTIONS
  // ============================================

  // Open delete confirmation dialog
  const openDeleteDialog = (ticket: SupportTicket) => {
    setDeletingTicket(ticket);
    setShowDeleteDialog(true);
  };

  // Open edit dialog with ticket data
  const openEditDialog = (ticket: SupportTicket) => {
    setEditingTicket(ticket);
    setFormData({
      title: ticket.title,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.category || "",
      clientId: ticket.client?.id || "",
      assignedToId: ticket.assignedTo?.id || "",
    });
    setShowEditDialog(true);
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <AdminPageTemplate
      title={t("admin.supportTickets.title") || "Support Tickets"}
      description={
        t("admin.supportTickets.description") ||
        "Manage all support tickets and their statuses"
      }
      icon={<Ticket className="h-6 w-6" />}
      showConstruction={false}
    >
      <div className="space-y-6">
        {/* ==========================================
            HEADER ACTIONS - New Ticket Button
            ========================================== */}
        <div className="flex justify-end items-center mb-6">
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4 mr-2" />
                {t("admin.supportTickets.newTicket") || "New Ticket"}
              </Button>
            </DialogTrigger>
            <DialogContent className="w-1/2 sm:max-w-[50%] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {t("admin.supportTickets.newTicket") || "Create New Ticket"}
                </DialogTitle>
                <DialogDescription>
                  {t("admin.supportTickets.createDescription") ||
                    "Create a new support ticket for a client"}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Ticket Information Section */}
                <div>
                  <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-4">
                    {t("admin.supportTickets.ticketInfo") ||
                      "Ticket Information"}
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Title */}
                    <div>
                      <Label htmlFor="title">
                        {t("admin.supportTickets.title") || "Title"} *
                      </Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) =>
                          setFormData({ ...formData, title: e.target.value })
                        }
                        placeholder={
                          locale === "ar" ? "عنوان التذكرة" : "Ticket title"
                        }
                      />
                    </div>

                    {/* Category */}
                    <div>
                      <Label htmlFor="category">
                        {t("admin.supportTickets.category") || "Category"} *
                      </Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) =>
                          setFormData({ ...formData, category: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              t("admin.supportTickets.selectCategory") ||
                              "Select category"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {ticketCategories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Description */}
                    <div className="col-span-2">
                      <Label htmlFor="description">
                        {t("admin.supportTickets.description") || "Description"}{" "}
                        *
                      </Label>
                      <textarea
                        id="description"
                        className="w-full min-h-[100px] p-2 rounded-md border border-input bg-background"
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            description: e.target.value,
                          })
                        }
                        placeholder={
                          t("admin.supportTickets.describeIssue") ||
                          "Describe the issue in detail"
                        }
                      />
                    </div>

                    {/* Client */}
                    <div>
                      <Label htmlFor="client">
                        {t("admin.supportTickets.client") || "Client"} *
                      </Label>
                      <Select
                        value={formData.clientId}
                        onValueChange={(value) =>
                          setFormData({ ...formData, clientId: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              t("admin.supportTickets.selectClient") ||
                              "Select client"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.company} - {client.user?.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Priority */}
                    <div>
                      <Label htmlFor="priority">
                        {t("admin.supportTickets.priority") || "Priority"}
                      </Label>
                      <Select
                        value={formData.priority}
                        onValueChange={(value) =>
                          setFormData({ ...formData, priority: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              t("admin.supportTickets.selectPriority") ||
                              "Select priority"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {priorityOptions.map((priority) => (
                            <SelectItem
                              key={priority.value}
                              value={priority.value}
                            >
                              {priority.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Assign To */}
                    <div>
                      <Label htmlFor="assignedTo">
                        {t("admin.supportTickets.assignedTo") || "Assign To"}
                      </Label>
                      <Select
                        value={formData.assignedToId}
                        onValueChange={(value) =>
                          setFormData({ ...formData, assignedToId: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              t("admin.supportTickets.selectAssignee") ||
                              "Select assignee (optional)"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">
                            {t("admin.supportTickets.unassigned") ||
                              "Unassigned"}
                          </SelectItem>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name} ({user.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  onClick={handleCreate}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {t("admin.supportTickets.createTicket") || "Create Ticket"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* ==========================================
            STATS CARDS
            ========================================== */}
        <div className="grid grid-cols-4 gap-4">
          {/* Total Tickets */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-muted-foreground">
                {t("admin.supportTickets.totalTickets") || "Total Tickets"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {formatNumber(pagination.total || tickets.length)}
              </div>
            </CardContent>
          </Card>

          {/* Open */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-muted-foreground">
                {t("admin.supportTickets.open") || "Open"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {formatNumber(
                  tickets.filter((t) => t.status === "open").length,
                )}
              </div>
            </CardContent>
          </Card>

          {/* In Progress */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-muted-foreground">
                {t("admin.supportTickets.inProgress") || "In Progress"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                {formatNumber(
                  tickets.filter((t) => t.status === "in-progress").length,
                )}
              </div>
            </CardContent>
          </Card>

          {/* Resolved */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-muted-foreground">
                {t("admin.supportTickets.resolved") || "Resolved"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatNumber(
                  tickets.filter(
                    (t) => t.status === "resolved" || t.status === "closed",
                  ).length,
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ==========================================
            FILTERS AND SEARCH
            ========================================== */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search Input */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-muted-foreground" />
                  <Input
                    placeholder={
                      t("admin.supportTickets.searchPlaceholder") ||
                      "Search tickets..."
                    }
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Rows Per Page */}
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="rowsPerPage"
                  className="text-sm whitespace-nowrap"
                >
                  {t("common.rows")}:
                </Label>
                <Select
                  value={rowsPerPage === "all" ? "all" : rowsPerPage.toString()}
                  onValueChange={(value) => {
                    setRowsPerPage(value === "all" ? "all" : Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger id="rowsPerPage" className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">{formatNumber(10)}</SelectItem>
                    <SelectItem value="25">{formatNumber(25)}</SelectItem>
                    <SelectItem value="50">{formatNumber(50)}</SelectItem>
                    <SelectItem value="100">{formatNumber(100)}</SelectItem>
                    <SelectItem value="all">{t("common.all")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ==========================================
            TICKETS TABLE
            ========================================== */}
        <Card>
          <CardContent>
            {/* Loading State */}
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                {t("common.loading")}
              </div>
            ) : searchError ? (
              <div className="text-center py-8 text-red-500">
                {t("common.error")}: {searchError}
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-muted-foreground">
                {search.length >= 3
                  ? t("admin.supportTickets.noResults") ||
                    "No tickets found matching your search."
                  : t("admin.supportTickets.noTickets") || "No tickets found"}
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">
                        {t("common.id") || "ID"}
                      </TableHead>
                      <TableHead>
                        {t("admin.supportTickets.ticket") || "Ticket"}
                      </TableHead>
                      <TableHead>
                        {t("admin.supportTickets.client") || "Client"}
                      </TableHead>
                      <TableHead>
                        {t("admin.supportTickets.status") || "Status"}
                      </TableHead>
                      <TableHead>
                        {t("admin.supportTickets.priority") || "Priority"}
                      </TableHead>
                      <TableHead>
                        {t("admin.supportTickets.category") || "Category"}
                      </TableHead>
                      <TableHead>
                        {t("admin.supportTickets.assignedTo") || "Assigned To"}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("common.actions")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets.map((ticket) => {
                      const statusInfo = getStatusBadge(ticket.status);
                      const priorityInfo = getPriorityBadge(ticket.priority);
                      return (
                        <TableRow
                          key={ticket.id}
                          className="cursor-pointer"
                          onClick={() => {
                            setSelectedTicket(ticket);
                            setShowViewDialog(true);
                          }}
                        >
                          {/* Ticket ID */}
                          <TableCell className="text-sm text-gray-500 dark:text-muted-foreground font-mono">
                            {ticket.ticketNumber}
                          </TableCell>

                          {/* Ticket Title & Description */}
                          <TableCell>
                            <div className="flex flex-col">
                              <p className="font-medium">{ticket.title}</p>
                              <p className="text-sm text-gray-600 dark:text-muted-foreground line-clamp-1">
                                {ticket.description}
                              </p>
                            </div>
                          </TableCell>

                          {/* Client */}
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building className="h-4 w-4 text-gray-400 dark:text-muted-foreground" />
                              <span>{ticket.client?.company || "N/A"}</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-muted-foreground mt-1">
                              <User className="h-3 w-3" />
                              {ticket.client?.user?.name || "Unknown"}
                            </div>
                          </TableCell>

                          {/* Status - Quick Update Dropdown */}
                          <TableCell
                            className="w-[140px]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Select
                              value={ticket.status}
                              onValueChange={(value) =>
                                handleQuickStatusUpdate(ticket.id, value)
                              }
                              disabled={statusUpdating === ticket.id}
                            >
                              <SelectTrigger className="w-full h-8 border-0 bg-transparent shadow-none hover:bg-muted/50 focus:ring-0">
                                <SelectValue>
                                  {statusUpdating === ticket.id ? (
                                    t("admin.supportTickets.updating") ||
                                    "Updating..."
                                  ) : (
                                    <Badge className={statusInfo.color}>
                                      {statusInfo.icon}
                                      {t(
                                        `admin.supportTickets.statuses.${ticket.status}`,
                                      ) || statusInfo.label}
                                    </Badge>
                                  )}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {statusOptions.map((status) => {
                                  const info = getStatusBadge(status.value);
                                  return (
                                    <SelectItem
                                      key={status.value}
                                      value={status.value}
                                    >
                                      <Badge className={info.color}>
                                        {info.icon}
                                        {t(
                                          `admin.supportTickets.statuses.${status.value}`,
                                        ) || status.label}
                                      </Badge>
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </TableCell>

                          {/* Priority */}
                          <TableCell>
                            <Badge className={priorityInfo.color}>
                              {priorityInfo.icon}
                              {t(
                                `admin.supportTickets.priorities.${ticket.priority}`,
                              ) || priorityInfo.label}
                            </Badge>
                          </TableCell>

                          {/* Category */}
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <Tag className="h-3 w-3 text-gray-400" />
                              {ticket.category || "N/A"}
                            </div>
                          </TableCell>

                          {/* Assigned To */}
                          <TableCell>
                            {ticket.assignedTo ? (
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage
                                    src={
                                      toAvatarUrl(ticket.assignedTo.avatar) ??
                                      undefined
                                    }
                                  />
                                  <AvatarFallback className="text-xs">
                                    {getInitials(ticket.assignedTo.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm">
                                  {ticket.assignedTo.name}
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400 dark:text-muted-foreground">
                                {t("admin.supportTickets.unassigned") ||
                                  "Unassigned"}
                              </span>
                            )}
                          </TableCell>

                          {/* Actions Dropdown */}
                          <TableCell className="text-right">
                            <div
                              className="flex justify-end"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedTicket(ticket);
                                      setShowViewDialog(true);
                                    }}
                                  >
                                    <Eye className="mr-2 h-4 w-4" />
                                    {t("common.view")}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => openEditDialog(ticket)}
                                  >
                                    <Edit className="mr-2 h-4 w-4" />
                                    {t("common.edit")}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => openDeleteDialog(ticket)}
                                    className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/50"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    {t("common.delete")}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {/* Pagination Controls */}
                {rowsPerPage !== "all" && pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-sm text-gray-600 dark:text-muted-foreground">
                      {t("admin.supportTickets.showing") || "Showing"}{" "}
                      {formatNumber(
                        (currentPage - 1) *
                          (typeof rowsPerPage === "number" ? rowsPerPage : 25) +
                          1,
                      )}{" "}
                      {t("admin.supportTickets.to") || "to"}{" "}
                      {formatNumber(
                        Math.min(
                          currentPage *
                            (typeof rowsPerPage === "number"
                              ? rowsPerPage
                              : 25),
                          pagination.total,
                        ),
                      )}{" "}
                      {t("admin.supportTickets.of") || "of"}{" "}
                      {formatNumber(pagination.total)}{" "}
                      {t("admin.supportTickets.tickets") || "tickets"}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(1, prev - 1))
                        }
                        disabled={!pagination.hasPreviousPage}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <div className="text-sm text-gray-600 dark:text-muted-foreground">
                        {t("common.page")} {formatNumber(currentPage)}{" "}
                        {t("admin.supportTickets.of") || "of"}{" "}
                        {formatNumber(pagination.totalPages)}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(pagination.totalPages, prev + 1),
                          )
                        }
                        disabled={!pagination.hasNextPage}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
                {rowsPerPage === "all" && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-sm text-gray-600 dark:text-muted-foreground">
                      {t("admin.supportTickets.showingAll") || "Showing all"}{" "}
                      {formatNumber(pagination.total)}{" "}
                      {t("admin.supportTickets.tickets") || "tickets"}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* ==========================================
            VIEW TICKET DIALOG
            ========================================== */}
        <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {t("admin.supportTickets.ticketDetails") || "Ticket Details"}
              </DialogTitle>
            </DialogHeader>
            {selectedTicket && (
              <div className="space-y-6">
                {/* Header Section */}
                <div className="flex items-start justify-between p-4 bg-gray-50 dark:bg-muted/50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold">
                        {selectedTicket.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-sm text-gray-500 dark:text-muted-foreground font-mono">
                        {selectedTicket.ticketNumber}
                      </span>
                      <Badge
                        className={getStatusBadge(selectedTicket.status).color}
                      >
                        {getStatusBadge(selectedTicket.status).icon}
                        {t(
                          `admin.supportTickets.statuses.${selectedTicket.status}`,
                        ) || getStatusBadge(selectedTicket.status).label}
                      </Badge>
                      <Badge
                        className={
                          getPriorityBadge(selectedTicket.priority).color
                        }
                      >
                        {getPriorityBadge(selectedTicket.priority).icon}
                        {t(
                          `admin.supportTickets.priorities.${selectedTicket.priority}`,
                        ) || getPriorityBadge(selectedTicket.priority).label}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500 dark:text-muted-foreground">
                      {t("admin.supportTickets.created") || "Created"}:{" "}
                      {format(
                        new Date(selectedTicket.createdAt),
                        "MMM dd, yyyy HH:mm",
                      )}
                    </p>
                    {selectedTicket.updatedAt && (
                      <p className="text-sm text-gray-400 dark:text-muted-foreground">
                        {t("admin.supportTickets.updated") || "Updated"}:{" "}
                        {format(
                          new Date(selectedTicket.updatedAt),
                          "MMM dd, yyyy HH:mm",
                        )}
                      </p>
                    )}
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Client Info */}
                  <div>
                    <Label className="text-gray-600 dark:text-muted-foreground">
                      {t("admin.supportTickets.client")}
                    </Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Building className="h-4 w-4 text-gray-400 dark:text-muted-foreground" />
                      <p>{selectedTicket.client?.company || "N/A"}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-1 ml-6">
                      <User className="h-3 w-3 text-gray-400 dark:text-muted-foreground" />
                      <p className="text-sm">
                        {selectedTicket.client?.user?.name || "Unknown"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-1 ml-6">
                      <Mail className="h-3 w-3 text-gray-400 dark:text-muted-foreground" />
                      <p className="text-sm">
                        {selectedTicket.client?.user?.email || "N/A"}
                      </p>
                    </div>
                  </div>

                  {/* Assigned To */}
                  <div>
                    <Label className="text-gray-600 dark:text-muted-foreground">
                      {t("admin.supportTickets.assignedTo")}
                    </Label>
                    <div className="flex items-center gap-2 mt-1">
                      {selectedTicket.assignedTo ? (
                        <>
                          <Avatar className="h-8 w-8">
                            <AvatarImage
                              src={
                                toAvatarUrl(selectedTicket.assignedTo.avatar) ??
                                undefined
                              }
                            />
                            <AvatarFallback>
                              {getInitials(selectedTicket.assignedTo.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p>{selectedTicket.assignedTo.name}</p>
                            <p className="text-sm text-gray-500 dark:text-muted-foreground">
                              {selectedTicket.assignedTo.email}
                            </p>
                          </div>
                        </>
                      ) : (
                        <p className="text-gray-400 dark:text-muted-foreground">
                          {t("admin.supportTickets.unassigned") || "Unassigned"}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Category */}
                  <div>
                    <Label className="text-gray-600 dark:text-muted-foreground">
                      {t("admin.supportTickets.category")}
                    </Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Tag className="h-4 w-4 text-gray-400 dark:text-muted-foreground" />
                      <p>{selectedTicket.category || "N/A"}</p>
                    </div>
                  </div>

                  {/* Messages Count */}
                  <div>
                    <Label className="text-gray-600 dark:text-muted-foreground">
                      {t("admin.supportTickets.messages")}
                    </Label>
                    <div className="flex items-center gap-2 mt-1">
                      <MessageSquare className="h-4 w-4 text-gray-400 dark:text-muted-foreground" />
                      <p>
                        {formatNumber(selectedTicket._count?.messages || 0)}{" "}
                        {t("admin.supportTickets.messages")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h4 className="font-semibold mb-2">
                    {t("admin.supportTickets.description")}
                  </h4>
                  <div className="p-4 bg-gray-50 dark:bg-muted/50 rounded-lg">
                    <p className="whitespace-pre-wrap">
                      {selectedTicket.description}
                    </p>
                  </div>
                </div>

                {/* Resolution Info */}
                {selectedTicket.resolvedAt && (
                  <div>
                    <h4 className="font-semibold mb-2">
                      {t("admin.supportTickets.resolution")}
                    </h4>
                    <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
                      <CheckCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <p className="text-sm">
                        {t("admin.supportTickets.resolvedOn") || "Resolved on"}:{" "}
                        {format(
                          new Date(selectedTicket.resolvedAt),
                          "MMM dd, yyyy HH:mm",
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ==========================================
            EDIT TICKET DIALOG
            ========================================== */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {t("admin.supportTickets.editTicket") || "Edit Ticket"}
              </DialogTitle>
              <DialogDescription>
                {t("admin.supportTickets.updateTicket") ||
                  "Update ticket details and status"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <div>
                <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-4">
                  {t("admin.supportTickets.ticketInfo") || "Ticket Information"}
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {/* Title */}
                  <div>
                    <Label htmlFor="edit-title">
                      {t("admin.supportTickets.title") || "Title"} *
                    </Label>
                    <Input
                      id="edit-title"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <Label htmlFor="edit-category">
                      {t("admin.supportTickets.category") || "Category"}
                    </Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) =>
                        setFormData({ ...formData, category: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            t("admin.supportTickets.selectCategory") ||
                            "Select category"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {ticketCategories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Description */}
                  <div className="col-span-2">
                    <Label htmlFor="edit-description">
                      {t("admin.supportTickets.description") || "Description"} *
                    </Label>
                    <textarea
                      id="edit-description"
                      className="w-full min-h-[100px] p-2 rounded-md border border-input bg-background"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <Label htmlFor="edit-status">
                      {t("admin.supportTickets.status") || "Status"}
                    </Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) =>
                        setFormData({ ...formData, status: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Priority */}
                  <div>
                    <Label htmlFor="edit-priority">
                      {t("admin.supportTickets.priority") || "Priority"}
                    </Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value) =>
                        setFormData({ ...formData, priority: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {priorityOptions.map((priority) => (
                          <SelectItem
                            key={priority.value}
                            value={priority.value}
                          >
                            {priority.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Assign To */}
                  <div>
                    <Label htmlFor="edit-assignedTo">
                      {t("admin.supportTickets.assignedTo") || "Assign To"}
                    </Label>
                    <Select
                      value={formData.assignedToId}
                      onValueChange={(value) =>
                        setFormData({ ...formData, assignedToId: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            t("admin.supportTickets.selectAssignee") ||
                            "Select assignee"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">
                          {t("admin.supportTickets.unassigned") || "Unassigned"}
                        </SelectItem>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name} ({user.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Info Alert */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  {t("admin.supportTickets.clientCannotChange") ||
                    "Client cannot be changed after ticket creation"}
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowEditDialog(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button
                onClick={handleUpdate}
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={updating}
              >
                {updating
                  ? t("admin.supportTickets.updating") || "Updating..."
                  : t("admin.supportTickets.updateTicket") || "Update Ticket"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ==========================================
            DELETE TICKET DIALOG
            ========================================== */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {t("admin.supportTickets.deleteTicket") || "Delete Ticket"}
              </DialogTitle>
              <DialogDescription>
                {t("admin.supportTickets.deletePermanent") ||
                  "This action cannot be undone. This will permanently delete the ticket and all associated data."}
              </DialogDescription>
            </DialogHeader>

            {deletingTicket && (
              <div className="py-4">
                <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="font-medium text-red-900 dark:text-red-200">
                      {t("admin.supportTickets.deleteTicketQuestion") ||
                        "Delete ticket"}{" "}
                      <strong>{deletingTicket.title}</strong>?
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                      {t("admin.supportTickets.ticketId")}:{" "}
                      {deletingTicket.ticketNumber} -{" "}
                      {deletingTicket.client?.company || "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
                disabled={deleting}
              >
                {t("common.cancel")}
              </Button>
              <Button
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={deleting}
              >
                {deleting
                  ? t("admin.supportTickets.deleting") || "Deleting..."
                  : t("admin.supportTickets.deleteTicket") || "Delete Ticket"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminPageTemplate>
  );
}
