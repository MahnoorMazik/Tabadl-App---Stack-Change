"use client";

// ============================================
// IMPORTS
// ============================================
import { useState, useEffect, useCallback, useMemo } from "react";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  User,
  Plus,
  Edit,
  Trash2,
  MoreVertical,
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Eye,
  EyeOff,
  Briefcase,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/utils";
import { useLocale } from "@/contexts/LocaleContext";
import { toAvatarUrl } from "@/lib/avatar-utils";

// ============================================
// ENUMS & CONSTANTS - MUST MATCH PRISMA SCHEMA
// ============================================
enum SupportAssigneeRole {
  ARCHITECT = "ARCHITECT",
  FUNCTIONAL_ARCHITECT = "FUNCTIONAL_ARCHITECT",
  DEVELOPER = "DEVELOPER",
  SQA_MANAGER = "SQA_MANAGER",
  SOLUTION_ENGINEER = "SOLUTION_ENGINEER",
  FUNCTIONAL_MANAGER = "FUNCTIONAL_MANAGER",
  PROJECT_MANAGER = "PROJECT_MANAGER",
  PRODUCT_MANAGER = "PRODUCT_MANAGER",
  SCRUM_MASTER = "SCRUM_MASTER",
  IT_SUPPORT = "IT_SUPPORT",
}

// ✅ Role display names for the UI
const ROLE_DISPLAY_NAMES: Record<SupportAssigneeRole, string> = {
  [SupportAssigneeRole.ARCHITECT]: "Architect",
  [SupportAssigneeRole.FUNCTIONAL_ARCHITECT]: "Functional Architect",
  [SupportAssigneeRole.DEVELOPER]: "Developer",
  [SupportAssigneeRole.SQA_MANAGER]: "SQA Manager",
  [SupportAssigneeRole.SOLUTION_ENGINEER]: "Solution Engineer",
  [SupportAssigneeRole.FUNCTIONAL_MANAGER]: "Functional Manager",
  [SupportAssigneeRole.PROJECT_MANAGER]: "Project Manager",
  [SupportAssigneeRole.PRODUCT_MANAGER]: "Product Manager",
  [SupportAssigneeRole.SCRUM_MASTER]: "Scrum Master",
  [SupportAssigneeRole.IT_SUPPORT]: "IT Support",
};

// ✅ Role color mapping for badges
// const ROLE_COLORS: Record<SupportAssigneeRole, string> = {
//   [SupportAssigneeRole.ARCHITECTURE]:
//     "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
//   [SupportAssigneeRole.FUNCTIONAL_ARCHITECTURE]:
//     "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800",
//   [SupportAssigneeRole.DEVELOPERS]:
//     "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800",
//   [SupportAssigneeRole.SQA_MANAGER]:
//     "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400 border-pink-200 dark:border-pink-800",
//   [SupportAssigneeRole.SOLUTION_ENGINEER]:
//     "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
//   [SupportAssigneeRole.FUNCTIONAL_MANAGER]:
//     "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
//   [SupportAssigneeRole.FINANCE]:
//     "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
//   [SupportAssigneeRole.PROJECT_MANAGER]:
//     "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800",
//   [SupportAssigneeRole.PRODUCT_MANAGER]:
//     "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800",
//   [SupportAssigneeRole.SCRUM_MASTER]:
//     "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 border-violet-200 dark:border-violet-800",
//   [SupportAssigneeRole.SOLUTION_ENGINEERS]:
//     "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 border-teal-200 dark:border-teal-800",
//   [SupportAssigneeRole.IT_SUPPORT]:
//     "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800",
//   [SupportAssigneeRole.SUPPORT_AGENT]:
//     "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400 border-sky-200 dark:border-sky-800",
// };
const ROLE_COLORS: Record<SupportAssigneeRole, string> = {
  [SupportAssigneeRole.ARCHITECT]:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",

  [SupportAssigneeRole.FUNCTIONAL_ARCHITECT]:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800",

  [SupportAssigneeRole.DEVELOPER]:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800",

  [SupportAssigneeRole.SQA_MANAGER]:
    "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400 border-pink-200 dark:border-pink-800",

  [SupportAssigneeRole.SOLUTION_ENGINEER]:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",

  [SupportAssigneeRole.FUNCTIONAL_MANAGER]:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",

  [SupportAssigneeRole.PROJECT_MANAGER]:
    "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800",

  [SupportAssigneeRole.PRODUCT_MANAGER]:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800",

  [SupportAssigneeRole.SCRUM_MASTER]:
    "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 border-violet-200 dark:border-violet-800",

  [SupportAssigneeRole.IT_SUPPORT]:
    "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800",
};

// ============================================
// INTERFACES
// ============================================

interface Assignee {
  id: string;
  name: string;
  email: string;
  role: SupportAssigneeRole;
  isActive: boolean;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    tickets: number;
  };
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

export default function AssigneesPage() {
  // ============================================
  // HOOKS & CONTEXT
  // ============================================
  const { token } = useAuth();
  const { toast } = useToast();
  const { t, formatNumber } = useLocale();

  // ============================================
  // STATE
  // ============================================
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState<Assignee | null>(
    null,
  );
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "" as SupportAssigneeRole | "",
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ✅ State for inline role editing (like the ticket status dropdown)
  const [roleUpdating, setRoleUpdating] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number | "all">(10);

  // ============================================
  // FILTERED & PAGINATED DATA
  // ============================================
  const filteredAssignees = useMemo(() => {
    let filtered = assignees;

    if (!showInactive) {
      filtered = filtered.filter((assignee) => assignee.isActive);
    }

    const searchLower = search.toLowerCase().trim();
    if (searchLower) {
      filtered = filtered.filter((assignee) => {
        const roleDisplay =
          ROLE_DISPLAY_NAMES[assignee.role]?.toLowerCase() || "";
        return (
          assignee.name.toLowerCase().includes(searchLower) ||
          (assignee.email?.toLowerCase() || "").includes(searchLower) ||
          roleDisplay.includes(searchLower)
        );
      });
    }

    return filtered;
  }, [assignees, search, showInactive]);

  const paginatedAssignees = useMemo(() => {
    if (rowsPerPage === "all") return filteredAssignees;
    const pageSize = typeof rowsPerPage === "number" ? rowsPerPage : 10;
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredAssignees.slice(start, end);
  }, [filteredAssignees, rowsPerPage, currentPage]);

  const pagination = useMemo(() => {
    const total = filteredAssignees.length;
    const pageSize = typeof rowsPerPage === "number" ? rowsPerPage : 10;
    const totalPages = rowsPerPage === "all" ? 1 : Math.ceil(total / pageSize);
    return {
      total,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
    };
  }, [filteredAssignees, rowsPerPage, currentPage]);

  const stats = useMemo(() => {
    const total = assignees.length;
    const active = assignees.filter((a) => a.isActive).length;
    const inactive = total - active;
    const totalTickets = assignees.reduce(
      (sum, a) => sum + (a._count?.tickets || 0),
      0,
    );
    const avgTickets = total > 0 ? (totalTickets / total).toFixed(1) : "0";
    return { total, active, inactive, totalTickets, avgTickets };
  }, [assignees]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, rowsPerPage, showInactive]);

  // ============================================
  // API CALLS
  // ============================================

  const fetchAssignees = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get("/api/support-tickets/assignees", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = response.data.data || response.data || [];
      setAssignees(data);
    } catch (error: any) {
      console.error("Error fetching assignees:", error);
      toast({
        title: t("common.error"),
        description: getErrorMessage(error, "Failed to load assignees"),
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  }, [token, toast, t]);

  // ✅ Function to update role (like the ticket status update)
  const handleRoleUpdate = async (
    assigneeId: string,
    newRole: SupportAssigneeRole,
  ) => {
    setRoleUpdating(assigneeId);

    // Optimistic update
    const previousAssignee = assignees.find((a) => a.id === assigneeId);
    setAssignees((prev) =>
      prev.map((a) => (a.id === assigneeId ? { ...a, role: newRole } : a)),
    );

    try {
      const assignee = assignees.find((a) => a.id === assigneeId);
      if (!assignee) return;

      await axios.put(
        `/api/support-tickets/assignees/${assigneeId}`,
        {
          name: assignee.name,
          email: assignee.email || undefined,
          role: newRole,
          isActive: assignee.isActive,
        },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );

      toast({
        title: t("common.success"),
        description: "Role updated successfully",
        duration: 3000,
      });

      // Refresh to get latest data
      await fetchAssignees();
    } catch (error: any) {
      console.error("Role Update Error:", error);
      // Revert on error
      if (previousAssignee) {
        setAssignees((prev) =>
          prev.map((a) =>
            a.id === assigneeId ? { ...a, role: previousAssignee.role } : a,
          ),
        );
      }
      toast({
        title: t("common.error"),
        description: getErrorMessage(error, "Failed to update role"),
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setRoleUpdating(null);
    }
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast({
        title: t("common.error"),
        description: t("admin.assignees.nameRequired") || "Name is required",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    if (!formData.role) {
      toast({
        title: t("common.error"),
        description: "Role is required",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim() || undefined,
        role: formData.role,
        isActive: formData.isActive,
      };

      await axios.post("/api/support-tickets/assignees", payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      toast({
        title: t("common.success"),
        description:
          t("admin.assignees.createSuccess") || "Assignee created successfully",
          duration: 3000,
      });

      setShowCreateDialog(false);
      resetForm();
      await fetchAssignees();
    } catch (error: any) {
      console.error("Create Error:", error);
      if (error.response) {
        console.error("Error response data:", error.response.data);
        console.error("Error response status:", error.response.status);
      }
      toast({
        title: t("common.error"),
        description: getErrorMessage(error, "Failed to create assignee"),
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedAssignee) return;

    if (!formData.name.trim()) {
      toast({
        title: t("common.error"),
        description: t("admin.assignees.nameRequired") || "Name is required",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    if (!formData.role) {
      toast({
        title: t("common.error"),
        description: "Role is required",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim() || undefined,
        role: formData.role,
        isActive: formData.isActive,
      };

      await axios.put(
        `/api/support-tickets/assignees/${selectedAssignee.id}`,
        payload,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );

      toast({
        title: t("common.success"),
        description:
          t("admin.assignees.updateSuccess") || "Assignee updated successfully",
        duration: 3000,
      });

      setShowEditDialog(false);
      setSelectedAssignee(null);
      resetForm();
      await fetchAssignees();
    } catch (error: any) {
      console.error("Update Error:", error);
      if (error.response) {
        console.error("Error response data:", error.response.data);
        console.error("Error response status:", error.response.status);
      }
      toast({
        title: t("common.error"),
        description: getErrorMessage(error, "Failed to update assignee"),
        variant: "destructive",
        duration: 3000,
      });

    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedAssignee) return;

    setDeleting(true);
    try {
      await axios.delete(
        `/api/support-tickets/assignees/${selectedAssignee.id}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );

      toast({
        title: t("common.success"),
        description:
          t("admin.assignees.deleteSuccess") || "Assignee deleted successfully",
        duration: 3000,
      });

      setShowDeleteDialog(false);
      setSelectedAssignee(null);
      await fetchAssignees();
    } catch (error: any) {
      console.error("Delete Error:", error);
      if (error.response) {
        console.error("Error response data:", error.response.data);
        console.error("Error response status:", error.response.status);
      }
      toast({
        title: t("common.error"),
        description: getErrorMessage(error, "Failed to delete assignee"),
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setDeleting(false);
    }
  };

  // ============================================
  // HANDLER FUNCTIONS
  // ============================================

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      role: "",
      isActive: true,
    });
  };

  const openEditDialog = (assignee: Assignee) => {
    setSelectedAssignee(assignee);
    setFormData({
      name: assignee.name,
      email: assignee.email || "",
      role: assignee.role,
      isActive: assignee.isActive,
    });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (assignee: Assignee) => {
    setSelectedAssignee(assignee);
    setShowDeleteDialog(true);
  };

  const openViewDialog = (assignee: Assignee) => {
    setSelectedAssignee(assignee);
    setShowViewDialog(true);
  };

  const handleCreateDialogClose = () => {
    setShowCreateDialog(false);
    resetForm();
  };

  const toggleActiveStatus = async (assignee: Assignee) => {
    const authToken =
      token ||
      (typeof window !== "undefined"
        ? localStorage.getItem("auth-token")
        : null);

    try {
      await axios.put(
        `/api/support-tickets/assignees/${assignee.id}`,
        {
          name: assignee.name,
          email: assignee.email || undefined,
          role: assignee.role,
          isActive: !assignee.isActive,
        },
        {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
          withCredentials: true,
        },
      );

      toast({
        title: t("common.success"),
        description: assignee.isActive
          ? "Assignee deactivated successfully"
          : "Assignee activated successfully",
      });

      await fetchAssignees();
    } catch (error: any) {
      console.error("Toggle Status Error:", error);
      toast({
        title: t("common.error"),
        description: getErrorMessage(error, "Failed to update assignee status"),
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  // ============================================
  // EFFECTS
  // ============================================

  useEffect(() => {
    fetchAssignees();
  }, [fetchAssignees]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <AdminPageTemplate
      title={t("admin.assignees.title") || "Assignees"}
      description={
        t("admin.assignees.description") || "Manage support ticket assignees"
      }
      icon={<Users className="h-6 w-6" />}
      showConstruction={false}
    >
      <div className="space-y-6">
        {/* ==========================================
            HEADER ACTIONS - New Assignee Button
            ========================================== */}
        <div className="flex justify-end items-center mb-6">
          <Dialog
            open={showCreateDialog}
            onOpenChange={(open) => {
              if (!open) {
                handleCreateDialogClose();
              }
              setShowCreateDialog(open);
            }}
          >
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4 mr-2" />
                {t("admin.assignees.newAssignee") || "New Assignee"}
              </Button>
            </DialogTrigger>

            <DialogContent className="w-1/2 sm:max-w-[50%] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {t("admin.assignees.newAssignee") || "Create New Assignee"}
                </DialogTitle>
                {/* <DialogDescription>
                  {t("admin.assignees.createDescription") ||
                    "Add a new person who can be assigned to support tickets"}
                </DialogDescription> */}
              </DialogHeader>

              <div className="space-y-6">
                <div>
                  {/* <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-4">
                    {t("admin.assignees.assigneeInfo") || "Assignee Information"}
                  </h4> */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name" className="mb-2">
                        {t("admin.assignees.name") || "Name"} *
                      </Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        placeholder={
                          t("admin.assignees.enterName") || "Enter full name"
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="role" className="mb-2">
                        {t("admin.assignees.role") || "Role"} *
                      </Label>
                      <Select
                        value={formData.role || ""}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            role: value as SupportAssigneeRole,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(SupportAssigneeRole).map((role) => (
                            <SelectItem key={role} value={role}>
                              {ROLE_DISPLAY_NAMES[role]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-2">
                      <div className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Switch
                            id="create-active"
                            checked={formData.isActive}
                            onCheckedChange={(checked) =>
                              setFormData({ ...formData, isActive: checked })
                            }
                          />
                          <Label
                            htmlFor="create-active"
                            className="cursor-pointer"
                          >
                            {formData.isActive ? "Active" : "Inactive"}
                          </Label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={handleCreateDialogClose}>
                  {t("common.cancel")}
                </Button>
                <Button
                  onClick={handleCreate}
                  className="bg-emerald-600 hover:bg-emerald-700"
                  disabled={submitting}
                >
                  {submitting
                    ? t("admin.assignees.creating") || "Creating..."
                    : t("admin.assignees.createAssignee") || "Create Assignee"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* ==========================================
            STATS CARDS
            ========================================== */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-muted-foreground">
                {t("admin.assignees.totalAssignees") || "Total Assignees"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {formatNumber(stats.total)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-muted-foreground">
                {t("admin.assignees.active") || "Active"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatNumber(stats.active)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-muted-foreground">
                {t("admin.assignees.inactive") || "Inactive"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-400 dark:text-muted-foreground">
                {formatNumber(stats.inactive)}
              </div>
            </CardContent>
          </Card>

          {/* <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-muted-foreground">
                {t("admin.assignees.totalTicketsAssigned") || "Total Tickets"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {formatNumber(stats.totalTickets)}
              </div>
            </CardContent>
          </Card> */}
        </div>

        {/* ==========================================
            TOGGLE BUTTON - ABOVE THE TABLE
            ========================================== */}
        <div className="flex items-center justify-between gap-4 bg-gray-50 dark:bg-muted/30 p-4 ">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch
                id="show-inactive-toggle"
                checked={showInactive}
                onCheckedChange={setShowInactive}
              />
              <Label
                htmlFor="show-inactive-toggle"
                className="cursor-pointer font-medium"
              >
                {showInactive ? (
                  <span className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    Showing All Assignees (Including Inactive)
                  </span>
                ) : (
                  <span className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    Showing Active Assignees Only
                  </span>
                )}
              </Label>
            </div>
          </div>
        </div>

        {/* ==========================================
            FILTERS AND SEARCH
            ========================================== */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-muted-foreground" />
                  <Input
                    placeholder={
                      t("admin.assignees.searchPlaceholder") ||
                      "Search assignees..."
                    }
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Label
                  htmlFor="rowsPerPage"
                  className="text-sm whitespace-nowrap"
                >
                  {t("common.rows")}:
                </Label>
                <select
                  id="rowsPerPage"
                  className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  value={rowsPerPage === "all" ? "all" : rowsPerPage.toString()}
                  onChange={(e) => {
                    setRowsPerPage(
                      e.target.value === "all" ? "all" : Number(e.target.value),
                    );
                    setCurrentPage(1);
                  }}
                >
                  <option value="10">{formatNumber(10)}</option>
                  <option value="25">{formatNumber(25)}</option>
                  <option value="50">{formatNumber(50)}</option>
                  <option value="100">{formatNumber(100)}</option>
                  <option value="all">{t("common.all")}</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ==========================================
            ASSIGNEES TABLE
            ========================================== */}
        <Card>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                {t("common.loading")}
              </div>
            ) : filteredAssignees.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-muted-foreground">
                {search.length >= 1
                  ? t("admin.assignees.noResults") ||
                    "No assignees found matching your search."
                  : !showInactive
                    ? "No active assignees found"
                    : "No assignees found"}
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        {t("admin.assignees.name") || "Name"}
                      </TableHead>
                      <TableHead>
                        {t("admin.assignees.role") || "Role"}
                      </TableHead>
                      <TableHead>Status</TableHead>
                      {/* <TableHead>
                        {t("admin.assignees.tickets") || "Tickets"}
                      </TableHead> */}
                      <TableHead>
                        {t("admin.assignees.created") || "Created"}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("common.actions")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAssignees.map((assignee) => {
                      const roleColor =
                        ROLE_COLORS[assignee.role] ||
                        "bg-gray-100 text-gray-700";

                      return (
                        <TableRow
                          key={assignee.id}
                          className={`cursor-pointer ${!assignee.isActive ? "opacity-60 bg-gray-50 dark:bg-gray-900/50" : ""}`}
                          onClick={() => openViewDialog(assignee)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage
                                  src={
                                    toAvatarUrl(assignee.avatar) ?? undefined
                                  }
                                />
                                <AvatarFallback className="text-xs">
                                  {getInitials(assignee.name)}
                                </AvatarFallback>
                              </Avatar>
                              <span
                                className={`font-medium ${!assignee.isActive ? "line-through text-gray-400" : ""}`}
                              >
                                {assignee.name}
                              </span>
                            </div>
                          </TableCell>

                          {/* ✅ ROLE DROPDOWN - Like the ticket status dropdown */}
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Select
                              value={assignee.role}
                              onValueChange={(value) =>
                                handleRoleUpdate(
                                  assignee.id,
                                  value as SupportAssigneeRole,
                                )
                              }
                              disabled={roleUpdating === assignee.id}
                            >
                              <SelectTrigger className="w-full h-8 border-0 bg-transparent shadow-none hover:bg-muted/50 focus:ring-0">
                                <SelectValue>
                                  {roleUpdating === assignee.id ? (
                                    t("common.updating") || "Updating..."
                                  ) : (
                                    <Badge className={roleColor}>
                                      {ROLE_DISPLAY_NAMES[assignee.role] ||
                                        assignee.role}
                                    </Badge>
                                  )}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {Object.values(SupportAssigneeRole).map(
                                  (role) => (
                                    <SelectItem key={role} value={role}>
                                      <Badge className={ROLE_COLORS[role]}>
                                        {ROLE_DISPLAY_NAMES[role]}
                                      </Badge>
                                    </SelectItem>
                                  ),
                                )}
                              </SelectContent>
                            </Select>
                          </TableCell>

                          <TableCell>
                            <Badge
                              variant={
                                assignee.isActive ? "default" : "secondary"
                              }
                              className={
                                assignee.isActive
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                  : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                              }
                            >
                              {assignee.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>

                          {/* <TableCell>
                            <Badge variant="secondary">
                              {formatNumber(assignee._count?.tickets || 0)}
                            </Badge>
                          </TableCell> */}

                          <TableCell>
                            <span className="text-sm text-gray-500 dark:text-muted-foreground">
                              {new Date(
                                assignee.createdAt,
                              ).toLocaleDateString()}
                            </span>
                          </TableCell>

                          <TableCell className="text-right">
                            <div
                              className="flex items-center justify-end gap-3"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Switch
                                checked={assignee.isActive}
                                onCheckedChange={() => toggleActiveStatus(assignee)}
                                title={
                                  assignee.isActive
                                    ? "Click to deactivate"
                                    : "Click to activate"
                                }
                              />

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
                                    onClick={() => openViewDialog(assignee)}
                                  >
                                    <User className="mr-2 h-4 w-4" />
                                    {t("common.view")}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => openEditDialog(assignee)}
                                  >
                                    <Edit className="mr-2 h-4 w-4" />
                                    {t("common.edit")}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => openDeleteDialog(assignee)}
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
                      {t("admin.assignees.showing") || "Showing"}{" "}
                      {formatNumber(
                        (currentPage - 1) *
                          (typeof rowsPerPage === "number" ? rowsPerPage : 10) +
                          1,
                      )}{" "}
                      {t("admin.assignees.to") || "to"}{" "}
                      {formatNumber(
                        Math.min(
                          currentPage *
                            (typeof rowsPerPage === "number"
                              ? rowsPerPage
                              : 10),
                          pagination.total,
                        ),
                      )}{" "}
                      {t("admin.assignees.of") || "of"}{" "}
                      {formatNumber(pagination.total)}{" "}
                      {t("admin.assignees.assignees") || "assignees"}
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
                        {t("admin.assignees.of") || "of"}{" "}
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
                      {t("admin.assignees.showingAll") || "Showing all"}{" "}
                      {formatNumber(pagination.total)}{" "}
                      {t("admin.assignees.assignees") || "assignees"}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* ==========================================
            VIEW ASSIGNEE DIALOG
            ========================================== */}
        <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {t("admin.assignees.assigneeDetails") || "Assignee Details"}
              </DialogTitle>
            </DialogHeader>
            {selectedAssignee && (
              <div className="space-y-6">
                <div className="flex items-start justify-between p-4 bg-gray-50 dark:bg-muted/50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage
                          src={
                            toAvatarUrl(selectedAssignee.avatar) ?? undefined
                          }
                        />
                        <AvatarFallback className="text-lg">
                          {getInitials(selectedAssignee.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-xl font-bold">
                          {selectedAssignee.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={ROLE_COLORS[selectedAssignee.role]}>
                            {ROLE_DISPLAY_NAMES[selectedAssignee.role] ||
                              selectedAssignee.role}
                          </Badge>
                          <Badge
                            variant={
                              selectedAssignee.isActive
                                ? "default"
                                : "secondary"
                            }
                            className={
                              selectedAssignee.isActive
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                            }
                          >
                            {selectedAssignee.isActive ? "Active" : "Inactive"}
                          </Badge>
                          <Badge variant="secondary">
                            {formatNumber(
                              selectedAssignee._count?.tickets || 0,
                            )}{" "}
                            tickets
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500 dark:text-muted-foreground">
                      {t("admin.assignees.created") || "Created"}:{" "}
                      {new Date(
                        selectedAssignee.createdAt,
                      ).toLocaleDateString()}
                    </p>
                    {selectedAssignee.updatedAt && (
                      <p className="text-sm text-gray-400 dark:text-muted-foreground">
                        {t("admin.assignees.updated") || "Updated"}:{" "}
                        {new Date(
                          selectedAssignee.updatedAt,
                        ).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-600 dark:text-muted-foreground">
                      {t("admin.assignees.name") || "Name"}
                    </Label>
                    <div className="flex items-center gap-2 mt-1">
                      <User className="h-4 w-4 text-gray-400 dark:text-muted-foreground" />
                      <p>{selectedAssignee.name}</p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-gray-600 dark:text-muted-foreground">
                      {t("admin.assignees.role") || "Role"}
                    </Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Briefcase className="h-4 w-4 text-gray-400 dark:text-muted-foreground" />
                      <Badge className={ROLE_COLORS[selectedAssignee.role]}>
                        {ROLE_DISPLAY_NAMES[selectedAssignee.role] ||
                          selectedAssignee.role}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <Label className="text-gray-600 dark:text-muted-foreground">
                      Status
                    </Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant={
                          selectedAssignee.isActive ? "default" : "secondary"
                        }
                        className={
                          selectedAssignee.isActive
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                        }
                      >
                        {selectedAssignee.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>

                  {/* <div>
                    <Label className="text-gray-600 dark:text-muted-foreground">
                      {t("admin.assignees.totalTicketsAssigned") || "Total Tickets Assigned"}
                    </Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Users className="h-4 w-4 text-gray-400 dark:text-muted-foreground" />
                      <p className="font-semibold">
                        {formatNumber(selectedAssignee._count?.tickets || 0)}
                      </p>
                    </div>
                  </div> */}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ==========================================
            EDIT ASSIGNEE DIALOG
            ========================================== */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {t("admin.assignees.editAssignee") || "Edit Assignee"}
              </DialogTitle>
              {/* <DialogDescription>
                {t("admin.assignees.updateAssignee") ||
                  "Update assignee information"}
              </DialogDescription> */}
            </DialogHeader>

            <div className="space-y-6">
              <div>
                {/* <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-4">
                  {t("admin.assignees.assigneeInfo") || "Assignee Information"}
                </h4> */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-name" className="mb-2">
                      {t("admin.assignees.name") || "Name"} *
                    </Label>
                    <Input
                      id="edit-name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder={
                        t("admin.assignees.enterName") || "Enter full name"
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-role" className="mb-2">
                      {t("admin.assignees.role") || "Role"} *
                    </Label>
                    <Select
                      value={formData.role || ""}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          role: value as SupportAssigneeRole,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(SupportAssigneeRole).map((role) => (
                          <SelectItem key={role} value={role}>
                            {ROLE_DISPLAY_NAMES[role]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2">
                    <div className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Switch
                          id="edit-active"
                          checked={formData.isActive}
                          onCheckedChange={(checked) =>
                            setFormData({ ...formData, isActive: checked })
                          }
                        />
                        <Label htmlFor="edit-active" className="cursor-pointer">
                          {formData.isActive ? "Active" : "Inactive"}
                        </Label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditDialog(false);
                  setSelectedAssignee(null);
                  resetForm();
                }}
                disabled={submitting}
              >
                {t("common.cancel")}
              </Button>
              <Button
                onClick={handleUpdate}
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={submitting}
              >
                {submitting
                  ? t("admin.assignees.updating") || "Updating..."
                  : t("admin.assignees.updateAssignee") || "Update Assignee"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ==========================================
            DELETE ASSIGNEE DIALOG
            ========================================== */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {t("admin.assignees.deleteAssignee") || "Delete Assignee"}
              </DialogTitle>
              <DialogDescription>
                {t("admin.assignees.deletePermanent") ||
                  "This action cannot be undone. This will permanently delete the assignee and remove them from all assigned tickets."}
              </DialogDescription>
            </DialogHeader>

            {selectedAssignee && (
              <div className="py-4">
                <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="font-medium text-red-900 dark:text-red-200">
                      {t("admin.assignees.deleteAssigneeQuestion") ||
                        "Delete assignee"}{" "}
                      <strong>{selectedAssignee.name}</strong>?
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                      {t("admin.assignees.role")}:{" "}
                      {ROLE_DISPLAY_NAMES[selectedAssignee.role] ||
                        selectedAssignee.role}
                      {selectedAssignee._count?.tickets &&
                        ` • ${formatNumber(selectedAssignee._count.tickets)} tickets assigned`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteDialog(false);
                  setSelectedAssignee(null);
                }}
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
                  ? t("admin.assignees.deleting") || "Deleting..."
                  : t("admin.assignees.deleteAssignee") || "Delete Assignee"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminPageTemplate>
  );
}
