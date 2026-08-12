

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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Ticket,
  Search,
  Eye,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Clock,
  Tag,
  MessageSquare,
  AlertTriangle,
  XCircle,
  CheckCheck,
  Paperclip,
  File,
  FileText,
  FileSpreadsheet,
  ImageIcon,
  Download,
  Plus,
  X,
  Check,
  Pencil,
  Save,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage, cn } from "@/lib/utils";
import { useLocale } from "@/contexts/LocaleContext";
import { toAvatarUrl } from "@/lib/avatar-utils";

// ============================================
// INTERFACES
// ============================================
interface SupportTicket {
  id: string;
  ticketNumber: string;
  title: string;
  comment: string;
  description: string;
  status: "new" | "in_progress" | "resolved" | "closed";
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
    email?: string;
    avatar?: string;
    role?: string;
  };
  messages: any[];
  attachments?: Array<{
    id: number;
    fileName: string;
    fileType: string;
    fileSize: number;
    filePath: string;
    createdAt: string;
  }>;
  commentBoxes?: Array<{
    id: number;
    comment: string;
    order: number;
    createdAt: string;
    attachments?: Array<{
      id: number;
      fileName: string;
      fileType: string;
      fileSize: number;
      filePath: string;
      createdAt: string;
    }>;
  }>;
  _count: {
    messages: number;
    attachments?: number;
  };
  hasChildren?: boolean;
  childTickets?: SupportTicket[];
  parentId?: string | null;
  parentTicket?: {
    id: string;
    title: string;
    ticketNumber?: string;
  } | null;
  _depth?: number;
  _isChild?: boolean;
  _parentId?: string;
}

interface TicketCategory {
  id: string;
  name: string;
  parentId?: string | null;
  children?: TicketCategory[];
  level?: number;
  isActive?: boolean;
}

interface Assignee {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  role?: string;
}

interface SavedComment {
  id: string;
  text: string;
  attachments: File[];
  createdAt: string;
  isExisting?: boolean;
  originalId?: number;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

const FileIcon = ({ fileType }: { fileType: string }) => {
  if (fileType?.startsWith("image/")) {
    return <ImageIcon className="h-4 w-4 text-blue-500" />;
  } else if (fileType === "application/pdf") {
    return <FileText className="h-4 w-4 text-red-500" />;
  } else if (fileType?.includes("word") || fileType?.includes("document")) {
    return <FileText className="h-4 w-4 text-blue-600" />;
  } else if (fileType?.includes("excel") || fileType?.includes("sheet")) {
    return <FileSpreadsheet className="h-4 w-4 text-green-600" />;
  }
  return <File className="h-4 w-4 text-gray-500" />;
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const getStatusBadge = (status: string) => {
  const statusMap: Record<
    string,
    { color: string; icon: React.ReactNode; label: string }
  > = {
    new: {
      color: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
      icon: <AlertCircle className="h-3 w-3 mr-1" />,
      label: "New",
    },
    in_progress: {
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
  };
  return statusMap[status] || statusMap["new"];
};

const getPriorityBadge = (priority: string) => {
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
};

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const truncateText = (text: string, limit: number = 10) => {
  const words = text.split(" ");
  if (words.length <= limit) return text;
  return words.slice(0, limit).join(" ") + "...";
};

// ============================================
// CATEGORY TREE BUILDING (FIXED)
// ============================================

const buildCategoryTree = (categories: any[]): TicketCategory[] => {
  const map = new Map<string, TicketCategory>();
  const roots: TicketCategory[] = [];

  categories.forEach((cat) => {
    map.set(String(cat.id), {
      id: String(cat.id),
      name: cat.name,
      parentId: cat.parentId ? String(cat.parentId) : null,
      children: [],
      level: 0,
      isActive: cat.isActive !== false,
    });
  });

  categories.forEach((cat) => {
    const id = String(cat.id);
    const node = map.get(id)!;
    const pid = cat.parentId ? String(cat.parentId) : null;

    if (pid && map.has(pid)) {
      const parent = map.get(pid)!;
      if (!parent.children) parent.children = [];
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const setLevels = (items: TicketCategory[], level: number) => {
    items.forEach((item) => {
      item.level = level;
      if (item.children?.length) {
        setLevels(item.children, level + 1);
      }
    });
  };
  setLevels(roots, 0);

  return roots;
};

// Helper: Get only parent categories (no parentId)
const getParentCategories = (
  categories: TicketCategory[],
): TicketCategory[] => {
  return categories.filter((cat) => !cat.parentId);
};

// Helper: Get only child categories (has parentId)
const getChildCategories = (categories: TicketCategory[]): TicketCategory[] => {
  const allChildren: TicketCategory[] = [];

  const extractChildren = (items: TicketCategory[]) => {
    items.forEach((item) => {
      if (item.children?.length) {
        // Add all children
        item.children.forEach((child) => {
          allChildren.push(child);
          // Also extract nested children
          if (child.children?.length) {
            extractChildren(child.children);
          }
        });
      }
    });
  };

  extractChildren(categories);
  return allChildren;
};

// Get flat list of child categories only (for child ticket dropdown)
// const getFlatChildCategories = (categories: TicketCategory[]): any[] => {
//   const children = getChildCategories(categories);
//   return children.map((cat) => ({
//     id: cat.id,
//     name: cat.name,
//     parentId: cat.parentId,
//     level: cat.level || 0,
//   }));
// };
// Get flat list of child categories only (for child ticket dropdown)
const getFlatChildCategories = (categories: TicketCategory[]): any[] => {
  // ONLY true leaf nodes: has parentId AND no children.
  // Root/parent categories are NEVER included.
  const leaves: TicketCategory[] = [];

  const walk = (items: TicketCategory[]) => {
    items.forEach((item) => {
      const hasChildren = !!(item.children && item.children.length > 0);
      const hasParent =
        item.parentId !== null &&
        item.parentId !== undefined &&
        item.parentId !== "";

      if (hasChildren) {
        walk(item.children!);
      } else if (hasParent) {
        leaves.push(item);
      }
    });
  };

  walk(categories);

  return leaves
    .filter(
      (cat) =>
        cat.parentId !== null &&
        cat.parentId !== undefined &&
        cat.parentId !== "",
    )
    .map((cat) => ({
      id: cat.id,
      name: cat.name,
      parentId: cat.parentId,
      level: cat.level || 0,
    }));
};
// Get flat list of parent categories only (for parent ticket dropdown)
const getFlatParentCategories = (categories: TicketCategory[]): any[] => {
  return getParentCategories(categories).map((cat) => ({
    id: cat.id,
    name: cat.name,
    level: 0,
  }));
};

export default function SupportTicketsPage() {
  // ============================================
  // HOOKS & CONTEXT
  // ============================================
  const { token } = useAuth();
  const { toast } = useToast();
  const { t, formatNumber, locale } = useLocale();

  // ============================================
  // REFS
  // ============================================
  const fileInputRef = useRef<HTMLInputElement>(null);
  const commentFileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const editCommentFileInputRef = useRef<HTMLInputElement>(null);
  const [expandedTickets, setExpandedTickets] = useState<
    Record<string, boolean>
  >({});
  const [ticketChildrenCache, setTicketChildrenCache] = useState<
    Record<string, SupportTicket[]>
  >({});
  const [loadingChildren, setLoadingChildren] = useState<
    Record<string, boolean>
  >({});

  // ============================================
  // STATE - Tickets & Pagination
  // ============================================
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState<number | "all">(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const [childFormData, setChildFormData] = useState({
    title: "",
    description: "",
    status: "new",
    priority: "medium",
    category: "",
    assignedToId: "",
    comment: "",
  });
  const [childAttachments, setChildAttachments] = useState<File[]>([]);
  const [childCommentAttachments, setChildCommentAttachments] = useState<
    File[]
  >([]);
  const [childCommentText, setChildCommentText] = useState("");
  const [childSavedComments, setChildSavedComments] = useState<SavedComment[]>(
    [],
  );
  const [editingChildSavedComments, setEditingChildSavedComments] = useState<
    SavedComment[]
  >([]);
  const childFileInputRef = useRef<HTMLInputElement>(null);
  const childCommentFileInputRef = useRef<HTMLInputElement>(null);
  const [childTicketsList, setChildTicketsList] = useState<SupportTicket[]>([]);
  const [loadingChildTickets, setLoadingChildTickets] = useState(false);

  // ============================================
  // STATE - Dialog Data
  // ============================================
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [flatCategories, setFlatCategories] = useState<any[]>([]);
  const [parentCategories, setParentCategories] = useState<any[]>([]);
  const [childCategories, setChildCategories] = useState<any[]>([]);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(
    null,
  );
  const [deletingTicket, setDeletingTicket] = useState<SupportTicket | null>(
    null,
  );
  const [editingTicket, setEditingTicket] = useState<SupportTicket | null>(
    null,
  );

  // ============================================
  // STATE - Dialog Visibility
  // ============================================
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showChildCreateDialog, setShowChildCreateDialog] = useState(false);

  // ============================================
  // STATE - Child Edit Dialog
  // ============================================
  const [showChildEditDialog, setShowChildEditDialog] = useState(false);
  const [editingChildTicket, setEditingChildTicket] =
    useState<SupportTicket | null>(null);

  // Child Edit Form State
  const [childEditForm, setChildEditForm] = useState({
    title: "",
    description: "",
    status: "new",
    priority: "medium",
    category: "",
    assignedToId: "",
    parentTicketId: "",
  });
  const [childEditAttachments, setChildEditAttachments] = useState<File[]>([]);
  const [childEditExistingAttachments, setChildEditExistingAttachments] =
    useState<any[]>([]);
  const [childEditAttachmentsToDelete, setChildEditAttachmentsToDelete] =
    useState<number[]>([]);
  const [childEditComments, setChildEditComments] = useState<SavedComment[]>(
    [],
  );
  const [childEditCommentText, setChildEditCommentText] = useState("");
  const [childEditCommentAttachments, setChildEditCommentAttachments] =
    useState<File[]>([]);
  const [childEditUploading, setChildEditUploading] = useState(false);
  const [childEditCommentId, setChildEditCommentId] = useState<string | null>(
    null,
  );
  const [childEditCommentTextEditing, setChildEditCommentTextEditing] =
    useState("");

  // Child Edit Refs
  const childEditCommentFileInputRef = useRef<HTMLInputElement>(null);

  // ============================================
  // STATE - Form Data
  // ============================================
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "new",
    priority: "medium",
    category: "",
    comment: "",
    assignedToId: "",
    parentTicketId: "",
  });

  // ============================================
  // STATE - Attachments
  // ============================================
  const [attachments, setAttachments] = useState<File[]>([]);
  const [editAttachments, setEditAttachments] = useState<File[]>([]);
  const [editExistingAttachments, setEditExistingAttachments] = useState<any[]>(
    [],
  );
  const [editAttachmentsToDelete, setEditAttachmentsToDelete] = useState<
    number[]
  >([]);

  // ============================================
  // STATE - Comments (Create Dialog)
  // ============================================
  const [savedComments, setSavedComments] = useState<SavedComment[]>([]);
  const [commentAttachments, setCommentAttachments] = useState<File[]>([]);

  // ============================================
  // STATE - Comments (Edit Dialog)
  // ============================================
  const [editSavedComments, setEditSavedComments] = useState<SavedComment[]>(
    [],
  );
  const [editCommentAttachments, setEditCommentAttachments] = useState<File[]>(
    [],
  );
  const [editCommentText, setEditCommentText] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");

  // ============================================
  // STATE - Comments (View Dialog)
  // ============================================
  const [newCommentText, setNewCommentText] = useState("");
  const [newCommentAttachments, setNewCommentAttachments] = useState<File[]>(
    [],
  );
  const newCommentFileInputRef = useRef<HTMLInputElement>(null);

  // ============================================
  // STATE - Loading States
  // ============================================
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);
  const [assigneeUpdating, setAssigneeUpdating] = useState<string | null>(null);
  const [viewDialogLoading, setViewDialogLoading] = useState(false);

  const [deletingChildTicket, setDeletingChildTicket] =
    useState<SupportTicket | null>(null);
  const [showDeleteChildDialog, setShowDeleteChildDialog] = useState(false);
  const [editingChildId, setEditingChildId] = useState<string | null>(null);
  const [editingChildData, setEditingChildData] = useState({
    title: "",
    description: "",
    status: "new",
    priority: "medium",
    category: "",
    assignedToId: "",
  });
  const [editingChildAttachments, setEditingChildAttachments] = useState<
    File[]
  >([]);
  const [editingChildExistingAttachments, setEditingChildExistingAttachments] =
    useState<any[]>([]);
  const [editingChildAttachmentsToDelete, setEditingChildAttachmentsToDelete] =
    useState<number[]>([]);
  const [editingChildUploading, setEditingChildUploading] = useState(false);
  const childEditFileInputRef = useRef<HTMLInputElement>(null);
  const [showChildDialog, setShowChildDialog] = useState(false);
  const [isEditingChildTicket, setIsEditingChildTicket] = useState(false);
  const [categoriesWithIndent, setCategoriesWithIndent] = useState<any[]>([]);

  // Nested children (child → child) when editing a child ticket
  const [subChildTicketsList, setSubChildTicketsList] = useState<
    SupportTicket[]
  >([]);
  const [loadingSubChildTickets, setLoadingSubChildTickets] = useState(false);

  // Which ticket will be the parent when creating a new child
  const [creatingChildUnderId, setCreatingChildUnderId] = useState<
    string | null
  >(null);

  // Stack for unlimited nested child edit navigation (Back button)
  const [childEditStack, setChildEditStack] = useState<SupportTicket[]>([]);

  // ============================================
  // CONSTANTS
  // ============================================
  const statusOptions = [
    { value: "new", label: "New" },
    { value: "in_progress", label: "In Progress" },
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


  const fetchChildTickets = useCallback(
    async (parentId: string, options?: { forSubLevel?: boolean }) => {
      if (!parentId) return;

      const forSubLevel = options?.forSubLevel === true;
      if (forSubLevel) {
        setLoadingSubChildTickets(true);
      } else {
        setLoadingChildTickets(true);
      }

      try {
        const response = await axios.get(`/api/support-tickets/children`, {
          params: {
            parentId: parentId,
            excludeTicketId: parentId,
          },
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        const rawChildren: SupportTicket[] =
          response.data?.data?.tickets || [];

        // Detect nested hasChildren so chevron shows on child-of-child levels
        const children: SupportTicket[] = await Promise.all(
          rawChildren.map(async (c) => {
            let hasKids =
              c.hasChildren === true ||
              (c.childTickets?.length ?? 0) > 0 ||
              !!(c as any)._count?.childTickets ||
              !!(c as any)._count?.children;

            if (!hasKids && c.hasChildren !== false) {
              try {
                const probe = await axios.get(
                  "/api/support-tickets/children",
                  {
                    params: {
                      parentId: c.id,
                      excludeTicketId: c.id,
                      limit: 1,
                    },
                    headers: token
                      ? { Authorization: `Bearer ${token}` }
                      : {},
                  },
                );
                const kids = probe.data?.data?.tickets || [];
                hasKids = kids.length > 0;
              } catch {
                hasKids = false;
              }
            }

            return {
              ...c,
              hasChildren: hasKids,
              _isChild: true,
              _parentId: parentId,
              _depth: 1,
            };
          }),
        );

        if (forSubLevel) {
          setSubChildTicketsList(children);
        } else {
          setChildTicketsList(children);
        }

        const uniqueMap = new Map<string, SupportTicket>();
        children.forEach((c) => {
          if (!uniqueMap.has(c.id)) uniqueMap.set(c.id, c);
        });

        setTicketChildrenCache((prev) => ({
          ...prev,
          [parentId]: Array.from(uniqueMap.values()),
        }));
      } catch (error) {
        console.error("Error fetching child tickets:", error);
        if (forSubLevel) {
          setSubChildTicketsList([]);
        } else {
          setChildTicketsList([]);
        }
      } finally {
        if (forSubLevel) {
          setLoadingSubChildTickets(false);
        } else {
          setLoadingChildTickets(false);
        }
      }
    },
    [token],
  );

  const fetchCategories = useCallback(async () => {
    try {
      const response = await axios.get("/api/support-tickets/categories", {
        withCredentials: true,
        params: { forTickets: "true", _t: Date.now() },
      });

      const cats =
        response.data?.categories || response.data?.data || response.data || [];

      // Clean flat list
      const flatList = (Array.isArray(cats) ? cats : []).map((cat: any) => ({
        id: String(cat.id),
        name: cat.name,
        parentId: cat.parentId ? String(cat.parentId) : null,
        level: cat.level || 0,
        isActive: cat.isActive !== false,
      }));

      // Dedupe
      const uniqueMap = new Map<string, any>();
      flatList.forEach((c) => {
        if (!uniqueMap.has(c.id)) uniqueMap.set(c.id, c);
      });
      const uniqueList = Array.from(uniqueMap.values());

      // Set flat categories (all)
      setFlatCategories(uniqueList);

      // Build tree
      const tree = buildCategoryTree(uniqueList);
      setCategories(tree);

      // ✅ NEW: Get categories with indentation for display
      const categoriesWithIndent = getCategoriesWithIndent(tree);
      setCategoriesWithIndent(categoriesWithIndent);

      // ✅ Set parent categories (for main ticket dropdown - only show parents)
      const parents = getFlatParentCategories(tree);
      setParentCategories(parents);

      // ✅ Set child categories (for child ticket dropdown - only show children)
      const children = getFlatChildCategories(tree);
      setChildCategories(children);

      console.log("Categories with Indent:", categoriesWithIndent);
    } catch (error) {
      console.error("Fetch Categories Error:", error);
      toast({
        title: "Error",
        description: "Failed to fetch categories",
        variant: "destructive",
      });
    }
  }, [toast]);
  const fetchAssignees = useCallback(async () => {
    try {
      const res = await axios.get("/api/support-tickets/assignees");
      setAssignees(res.data.data || []);
    } catch (error) {
      console.log("Error fetching assignees:", error);
    }
  }, []);

  const fetchTickets = useCallback(async () => {
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
      if (debouncedSearch) params.append("search", debouncedSearch);
      params.append("page", currentPage.toString());
      params.append(
        "limit",
        rowsPerPage === "all" ? "all" : rowsPerPage.toString(),
      );
      params.append("_t", Date.now().toString());

      const response = await axios.get(
        `/api/support-tickets?${params.toString()}`,
        { headers },
      );
      const responseData = response.data?.data || response.data;

      if (responseData?.tickets) {
        const mappedTickets = responseData.tickets.map((ticket: any) => ({
          ...ticket,
          attachments: ticket.attachments || [],
          _count: {
            ...ticket._count,
            attachments:
              ticket._count?.attachments || ticket.attachments?.length || 0,
          },
        }));
        setTickets(mappedTickets);
      }

      if (responseData?.pagination) {
        setPagination(responseData.pagination);
      }
    } catch (error: any) {
      console.error("Error fetching tickets:", error);
      setSearchError(error.response?.data?.error || "No tickets found");
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [token, debouncedSearch, currentPage, rowsPerPage]);

  // ============================================
  // EFFECTS
  // ============================================
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchCategories();
    fetchAssignees();
    fetchTickets();
  }, [fetchCategories, fetchAssignees, fetchTickets]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, rowsPerPage]);

  // ============================================
  // HANDLERS - Ticket CRUD
  // ============================================
  const handleCreate = async () => {
    if (!formData.title.trim() || !formData.category) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const formDataToSend = new FormData();

      formDataToSend.append("title", formData.title);
      formDataToSend.append("description", formData.description || "");
      formDataToSend.append("status", formData.status);
      formDataToSend.append("priority", formData.priority);

      // Category is mandatory
      formDataToSend.append("category", formData.category);

      if (formData.assignedToId && formData.assignedToId !== "unassigned") {
        formDataToSend.append("assignedToId", formData.assignedToId);
      }

      if (formData.parentTicketId && formData.parentTicketId !== "none") {
        formDataToSend.append("parentId", formData.parentTicketId);
      }

      const commentBoxesData = savedComments.map((comment) => ({
        tempId: comment.id,
        comment: comment.text,
      }));

      formDataToSend.append("commentBoxes", JSON.stringify(commentBoxesData));

      attachments.forEach((file) => {
        formDataToSend.append("attachments", file);
      });

      savedComments.forEach((comment) => {
        comment.attachments.forEach((file) => {
          formDataToSend.append(`comment-${comment.id}`, file);
        });
      });

      await axios.post("/api/support-tickets", formDataToSend, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      toast({
        title: "Success",
        description: "Ticket created successfully",
      });

      setShowCreateDialog(false);
      resetCreateForm();
      await fetchTickets();
    } catch (error: any) {
      console.error("Create Ticket Error:", error);

      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to create ticket",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingTicket) return;
    setUploading(true);

    try {
      // Sirf saved new comments
      const newComments = editSavedComments.filter((c) => !c.isExisting);
      const existingComments = editSavedComments.filter((c) => c.isExisting);

      const updatePayload: any = {
        title: formData.title,
        description: formData.description,
        status: formData.status,
        priority: formData.priority,
        category: formData.category,
        comment: formData.comment,
        assignedToId:
          formData.assignedToId === "unassigned"
            ? null
            : formData.assignedToId || null,
        parentId:
          formData.parentTicketId === "none" || !formData.parentTicketId
            ? null
            : formData.parentTicketId,
      };

      // New comments ko main PUT ke saath bhejo
      if (newComments.length > 0) {
        updatePayload.commentBoxes = newComments.map((c) => ({
          tempId: c.id,
          comment: c.text,
        }));
      }

      await axios.put(
        `/api/support-tickets/${editingTicket.id}`,
        updatePayload,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );

      // Attachments delete
      for (const attachmentId of editAttachmentsToDelete) {
        try {
          await axios.delete(
            `/api/support-tickets/${editingTicket.id}/attachments/${attachmentId}`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
        } catch (e) {
          console.error("Delete attachment failed:", e);
        }
      }

      // New attachments
      if (editAttachments.length > 0) {
        try {
          const fd = new FormData();
          editAttachments.forEach((file) => fd.append("files", file));
          await axios.post(
            `/api/support-tickets/${editingTicket.id}/attachments`,
            fd,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "multipart/form-data",
              },
            },
          );
        } catch (e) {
          console.error("Upload attachments failed:", e);
        }
      }

      // Existing comments update (agar route hai)
      for (const comment of existingComments) {
        if (!comment.originalId) continue;
        try {
          await axios.put(
            `/api/support-tickets/${editingTicket.id}/comments/${comment.originalId}`,
            { comment: comment.text },
            { headers: { Authorization: `Bearer ${token}` } },
          );
        } catch (e) {
          console.error("Update existing comment failed:", e);
        }
      }

      // Unsaved text ignore
      setEditCommentText("");
      setEditCommentAttachments([]);

      toast({ title: "Success", description: "Ticket updated successfully" });

      // Parents that may need a fresh children list after this update
      const oldParentId =
        editingTicket.parentId ||
        editingTicket.parentTicket?.id ||
        editingTicket._parentId ||
        "";
      const newParentId =
        formData.parentTicketId === "none" || !formData.parentTicketId
          ? ""
          : formData.parentTicketId;
      const ticketId = editingTicket.id;

      setShowEditDialog(false);
      resetEditForm();

      // Drop cached children so hierarchy rebuilds with new parent links
      setTicketChildrenCache((prev) => {
        const next = { ...prev };
        delete next[ticketId];
        if (oldParentId) delete next[oldParentId];
        if (newParentId) delete next[newParentId];
        return next;
      });
      setExpandedTickets((prev) => {
        const next = { ...prev };
        delete next[ticketId];
        if (oldParentId) delete next[oldParentId];
        if (newParentId) delete next[newParentId];
        return next;
      });

      // Auto-refresh main table (no manual page reload)
      await fetchTickets();

      // Refresh child lists for old/new parents so tree updates immediately
      const parentsToRefresh = Array.from(
        new Set([oldParentId, newParentId].filter(Boolean)),
      );
      for (const pid of parentsToRefresh) {
        try {
          await fetchChildTickets(pid);
        } catch {
          /* ignore */
        }
      }
    } catch (error: any) {
      console.error("Update Error:", error);
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to update ticket"),
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingTicket) return;
    const deletedId = deletingTicket.id;
    setDeleting(true);

    try {
      await axios.delete(`/api/support-tickets/${deletedId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Remove from all UI lists immediately
      setTickets((prev) => prev.filter((t) => t.id !== deletedId));
      setChildTicketsList((prev) => prev.filter((t) => t.id !== deletedId));
      setSubChildTicketsList((prev) => prev.filter((t) => t.id !== deletedId));
      setTicketChildrenCache((prev) => {
        const next: Record<string, SupportTicket[]> = {};
        Object.keys(prev).forEach((pid) => {
          if (pid === deletedId) return;
          next[pid] = prev[pid].filter((t) => t.id !== deletedId);
        });
        return next;
      });
      setExpandedTickets((prev) => {
        const next = { ...prev };
        delete next[deletedId];
        return next;
      });

      toast({ title: "Success", description: "Ticket deleted successfully" });
      setShowDeleteDialog(false);
      setDeletingTicket(null);
      await fetchTickets();
    } catch (error: any) {
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to delete ticket"),
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  // ============================================
  // HANDLERS - Quick Updates
  // ============================================
  // const handleQuickStatusUpdate = async (
  //   ticketId: string,
  //   newStatus: string,
  // ) => {
  //   setStatusUpdating(ticketId);
  //   const ticket = tickets.find((t) => t.id === ticketId);

  //   setTickets((prev) =>
  //     prev.map((t) =>
  //       t.id === ticketId ? { ...t, status: newStatus as any } : t,
  //     ),
  //   );

  //   try {
  //     await axios.put(
  //       `/api/support-tickets/${ticketId}`,
  //       { status: newStatus },
  //       { headers: token ? { Authorization: `Bearer ${token}` } : {} },
  //     );
  //     await fetchTickets();
  //     toast({ title: "Success", description: "Ticket updated" });
  //   } catch (error: any) {
  //     if (ticket) {
  //       setTickets((prev) =>
  //         prev.map((t) =>
  //           t.id === ticketId ? { ...t, status: ticket.status } : t,
  //         ),
  //       );
  //     }
  //     toast({
  //       title: "Error",
  //       description: error.response?.data?.error || "Update failed",
  //       variant: "destructive",
  //     });
  //   } finally {
  //     setStatusUpdating(null);
  //   }
  // };
  const handleQuickStatusUpdate = async (
    ticketId: string,
    newStatus: string,
  ) => {
    setStatusUpdating(ticketId);

    // 1. Optimistic update in main tickets (parents)
    const ticket = tickets.find((t) => t.id === ticketId);
    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId ? { ...t, status: newStatus as any } : t,
      ),
    );

    // 2. Optimistic update in children cache (important for expanded rows)
    setTicketChildrenCache((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((parentId) => {
        next[parentId] = next[parentId].map((child) =>
          child.id === ticketId
            ? { ...child, status: newStatus as any }
            : child,
        );
      });
      return next;
    });

    // 3. Optimistic update in dialog child lists
    setChildTicketsList((prev) =>
      prev.map((c) =>
        c.id === ticketId ? { ...c, status: newStatus as any } : c,
      ),
    );
    setSubChildTicketsList((prev) =>
      prev.map((c) =>
        c.id === ticketId ? { ...c, status: newStatus as any } : c,
      ),
    );

    try {
      await axios.put(
        `/api/support-tickets/${ticketId}`,
        { status: newStatus },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );

      await fetchTickets();
      toast({ title: "Success", description: "Ticket updated" });
    } catch (error: any) {
      if (ticket) {
        setTickets((prev) =>
          prev.map((t) =>
            t.id === ticketId ? { ...t, status: ticket.status } : t,
          ),
        );
      }

      setTicketChildrenCache((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((parentId) => {
          next[parentId] = next[parentId].map((child) =>
            child.id === ticketId && ticket
              ? { ...child, status: ticket.status }
              : child,
          );
        });
        return next;
      });

      toast({
        title: "Error",
        description: error.response?.data?.error || "Update failed",
        variant: "destructive",
      });
    } finally {
      setStatusUpdating(null);
    }
  };

  // const handleQuickAssigneeUpdate = async (
  //   ticketId: string,
  //   assigneeId: string | null,
  // ) => {
  //   setAssigneeUpdating(ticketId);
  //   const ticket = tickets.find((t) => t.id === ticketId);
  //   const selectedAssignee = assigneeId
  //     ? assignees.find((a) => a.id === assigneeId)
  //     : null;

  //   setTickets((prev) =>
  //     prev.map((t) => {
  //       if (t.id === ticketId) {
  //         if (assigneeId === "unassigned" || assigneeId === null) {
  //           const { assignedTo, ...rest } = t;
  //           return { ...rest, assignedTo: undefined };
  //         } else if (selectedAssignee) {
  //           return {
  //             ...t,
  //             assignedTo: {
  //               id: selectedAssignee.id,
  //               name: selectedAssignee.name,
  //               email: selectedAssignee.email || "",
  //               avatar: selectedAssignee.avatar,
  //               role: selectedAssignee.role,
  //             },
  //           };
  //         }
  //       }
  //       return t;
  //     }),
  //   );

  //   try {
  //     await axios.put(
  //       `/api/support-tickets/${ticketId}`,
  //       { assignedToId: assigneeId === "unassigned" ? null : assigneeId },
  //       { headers: token ? { Authorization: `Bearer ${token}` } : {} },
  //     );
  //     await fetchTickets();
  //     toast({ title: "Success", description: "Ticket updated" });
  //   } catch (error: any) {
  //     if (ticket) {
  //       setTickets((prev) =>
  //         prev.map((t) =>
  //           t.id === ticketId ? { ...t, assignedTo: ticket.assignedTo } : t,
  //         ),
  //       );
  //     }
  //     toast({
  //       title: "Error",
  //       description: error.response?.data?.error || "Update failed",
  //       variant: "destructive",
  //     });
  //   } finally {
  //     setAssigneeUpdating(null);
  //   }
  // };

  // ============================================
  // HANDLERS - File/Attachment
  // ============================================

  const handleQuickAssigneeUpdate = async (
    ticketId: string,
    assigneeId: string | null,
  ) => {
    setAssigneeUpdating(ticketId);

    const ticket =
      tickets.find((t) => t.id === ticketId) ||
      Object.values(ticketChildrenCache)
        .flat()
        .find((t) => t.id === ticketId);

    const selectedAssignee = assigneeId
      ? assignees.find((a) => a.id === assigneeId)
      : null;

    // 1. Optimistic update - main tickets (parents)
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === ticketId) {
          if (assigneeId === "unassigned" || assigneeId === null) {
            const { assignedTo, ...rest } = t;
            return { ...rest, assignedTo: undefined };
          } else if (selectedAssignee) {
            return {
              ...t,
              assignedTo: {
                id: selectedAssignee.id,
                name: selectedAssignee.name,
                email: selectedAssignee.email || "",
                avatar: selectedAssignee.avatar,
                role: selectedAssignee.role,
              },
            };
          }
        }
        return t;
      }),
    );

    // 2. Optimistic update - children cache (important for expanded rows)
    setTicketChildrenCache((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((parentId) => {
        next[parentId] = next[parentId].map((child) => {
          if (child.id === ticketId) {
            if (assigneeId === "unassigned" || assigneeId === null) {
              const { assignedTo, ...rest } = child;
              return { ...rest, assignedTo: undefined };
            } else if (selectedAssignee) {
              return {
                ...child,
                assignedTo: {
                  id: selectedAssignee.id,
                  name: selectedAssignee.name,
                  email: selectedAssignee.email || "",
                  avatar: selectedAssignee.avatar,
                  role: selectedAssignee.role,
                },
              };
            }
          }
          return child;
        });
      });
      return next;
    });

    // 3. Optimistic update in dialog child lists
    const applyAssignee = (c: SupportTicket) => {
      if (c.id !== ticketId) return c;
      if (assigneeId === "unassigned" || assigneeId === null) {
        const { assignedTo, ...rest } = c;
        return { ...rest, assignedTo: undefined };
      }
      if (selectedAssignee) {
        return {
          ...c,
          assignedTo: {
            id: selectedAssignee.id,
            name: selectedAssignee.name,
            email: selectedAssignee.email || "",
            avatar: selectedAssignee.avatar,
            role: selectedAssignee.role,
          },
        };
      }
      return c;
    };
    setChildTicketsList((prev) => prev.map(applyAssignee));
    setSubChildTicketsList((prev) => prev.map(applyAssignee));

    try {
      await axios.put(
        `/api/support-tickets/${ticketId}`,
        { assignedToId: assigneeId === "unassigned" ? null : assigneeId },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );

      await fetchTickets();
      toast({ title: "Success", description: "Ticket updated" });
    } catch (error: any) {
      if (ticket) {
        setTickets((prev) =>
          prev.map((t) =>
            t.id === ticketId ? { ...t, assignedTo: ticket.assignedTo } : t,
          ),
        );
      }

      setTicketChildrenCache((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((parentId) => {
          next[parentId] = next[parentId].map((child) =>
            child.id === ticketId && ticket
              ? { ...child, assignedTo: ticket.assignedTo }
              : child,
          );
        });
        return next;
      });

      toast({
        title: "Error",
        description: error.response?.data?.error || "Update failed",
        variant: "destructive",
      });
    } finally {
      setAssigneeUpdating(null);
    }
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const fileArray = Array.from(files).filter((file) => file.size > 0);
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
    ];

    const invalidFiles = fileArray.filter(
      (file) => !allowedTypes.includes(file.type),
    );
    if (invalidFiles.length > 0) {
      toast({
        title: "Invalid file type",
        description: "Only PDF, JPEG, JPG, and PNG files are allowed",
        variant: "destructive",
      });
      return;
    }

    const oversizedFiles = fileArray.filter(
      (file) => file.size > 10 * 1024 * 1024,
    );
    if (oversizedFiles.length > 0) {
      toast({
        title: "File too large",
        description: "Files must be under 10MB",
        variant: "destructive",
      });
      return;
    }

    if (attachments.length + fileArray.length > 10) {
      toast({
        title: "Too many files",
        description: "Maximum 10 attachments allowed per ticket",
        variant: "destructive",
      });
      return;
    }

    setAttachments((prev) => [...prev, ...fileArray]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAllFiles = () => {
    setAttachments([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const triggerFileUpload = () => fileInputRef.current?.click();

  const downloadAttachment = async (
    ticketId: string,
    attachmentId: number,
    fileName: string,
  ) => {
    try {
      const response = await axios.get(
        `/api/support-tickets/${ticketId}/attachments/${attachmentId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob",
        },
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast({ title: "Success", description: "File downloaded successfully" });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Error",
        description: "Failed to download file",
        variant: "destructive",
      });
    }
  };

  // ============================================
  // HANDLERS - Comments (Create Dialog)
  // ============================================
  const handleCommentFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const fileArray = Array.from(files).filter((file) => file.size > 0);
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
    ];

    const invalidFiles = fileArray.filter(
      (file) => !allowedTypes.includes(file.type),
    );
    if (invalidFiles.length > 0) {
      toast({
        title: "Invalid file type",
        description: "Only PDF, JPEG, JPG, and PNG files are allowed",
        variant: "destructive",
      });
      return;
    }

    const oversizedFiles = fileArray.filter(
      (file) => file.size > 10 * 1024 * 1024,
    );
    if (oversizedFiles.length > 0) {
      toast({
        title: "File too large",
        description: "Files must be under 10MB",
        variant: "destructive",
      });
      return;
    }

    if (commentAttachments.length + fileArray.length > 10) {
      toast({
        title: "Too many files",
        description: "Maximum 10 attachments allowed per comment",
        variant: "destructive",
      });
      return;
    }

    setCommentAttachments((prev) => [...prev, ...fileArray]);
    if (commentFileInputRef.current) commentFileInputRef.current.value = "";
  };

  const removeCommentFile = (index: number) => {
    setCommentAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const triggerCommentFileUpload = () => commentFileInputRef.current?.click();

  const handleSaveCommentInCreate = () => {
    const hasContent =
      formData.comment?.trim() || commentAttachments.length > 0;

    if (!hasContent) {
      toast({
        title: "Error",
        description: "Please add a comment or attachment",
        variant: "destructive",
      });
      return;
    }

    const newComment: SavedComment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: formData.comment || "",
      attachments: [...commentAttachments],
      createdAt: new Date().toISOString(),
    };

    setSavedComments((prev) => [...prev, newComment]);
    setFormData({ ...formData, comment: "" });
    setCommentAttachments([]);
    if (commentFileInputRef.current) commentFileInputRef.current.value = "";

    toast({ title: "Success", description: "Comment saved successfully" });
  };

  const handleCancelCommentInCreate = () => {
    setFormData({ ...formData, comment: "" });
    setCommentAttachments([]);
    if (commentFileInputRef.current) commentFileInputRef.current.value = "";
  };

  // ============================================
  // HANDLERS - Comments (Edit Dialog)
  // ============================================
  const handleEditCommentFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files;
    if (!files) return;

    const fileArray = Array.from(files).filter((file) => file.size > 0);
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
    ];

    const invalidFiles = fileArray.filter(
      (file) => !allowedTypes.includes(file.type),
    );
    if (invalidFiles.length > 0) {
      toast({
        title: "Invalid file type",
        description: "Only PDF, JPEG, JPG, and PNG files are allowed",
        variant: "destructive",
      });
      return;
    }

    const oversizedFiles = fileArray.filter(
      (file) => file.size > 10 * 1024 * 1024,
    );
    if (oversizedFiles.length > 0) {
      toast({
        title: "File too large",
        description: "Files must be under 10MB",
        variant: "destructive",
      });
      return;
    }

    if (editCommentAttachments.length + fileArray.length > 10) {
      toast({
        title: "Too many files",
        description: "Maximum 10 attachments allowed per comment",
        variant: "destructive",
      });
      return;
    }

    setEditCommentAttachments((prev) => [...prev, ...fileArray]);
    if (editCommentFileInputRef.current)
      editCommentFileInputRef.current.value = "";
  };

  const removeEditCommentFile = (index: number) => {
    setEditCommentAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const triggerEditCommentFileUpload = () =>
    editCommentFileInputRef.current?.click();

  const handleSaveCommentInEdit = async () => {
    if (!editCommentText?.trim() && editCommentAttachments.length === 0) return;

    setEditingChildUploading(true);
    try {
      const newCommentData = {
        text: editCommentText,
        attachments: editCommentAttachments,
      };

      setEditingChildSavedComments((prev) => [
        ...prev,
        {
          ...newCommentData,
          id: `new-${Date.now()}`,
          isExisting: false,
          createdAt: new Date().toISOString(),
        },
      ]);

      setEditCommentText("");
      setEditCommentAttachments([]);
      toast({
        title: "Comment saved",
        description: "New comment added to ticket",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save comment",
        variant: "destructive",
      });
    } finally {
      setEditingChildUploading(false);
    }
  };

  const handleCancelCommentInEdit = () => {
    setEditCommentText("");
    setEditCommentAttachments([]);
  };

  // Start editing a comment
  const startEditComment = (commentId: string, currentText: string) => {
    setEditingCommentId(commentId);
    setEditingCommentText(currentText);
  };

  // Save edited comment
  const saveEditComment = (commentId: string) => {
    if (!editingCommentText.trim()) {
      toast({
        title: "Error",
        description: "Comment cannot be empty",
        variant: "destructive",
      });
      return;
    }

    setEditSavedComments((prev) =>
      prev.map((c) =>
        c.id === commentId ? { ...c, text: editingCommentText } : c,
      ),
    );
    setEditingCommentId(null);
    setEditingCommentText("");
    toast({ title: "Success", description: "Comment updated" });
  };

  // Cancel editing
  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentText("");
  };

  // Delete a comment from edit dialog
  const deleteEditComment = (commentId: string) => {
    setEditSavedComments((prev) => prev.filter((c) => c.id !== commentId));
    toast({ title: "Success", description: "Comment removed" });
  };

  // ============================================
  // HANDLERS - Comments (View Dialog)
  // ============================================
  const handleNewCommentFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files;
    if (!files) return;

    const fileArray = Array.from(files).filter((file) => file.size > 0);
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
    ];

    const invalidFiles = fileArray.filter(
      (file) => !allowedTypes.includes(file.type),
    );
    if (invalidFiles.length > 0) {
      toast({
        title: "Invalid file type",
        description: "Only PDF, JPEG, JPG, and PNG files are allowed",
        variant: "destructive",
      });
      return;
    }

    const oversizedFiles = fileArray.filter(
      (file) => file.size > 10 * 1024 * 1024,
    );
    if (oversizedFiles.length > 0) {
      toast({
        title: "File too large",
        description: "Files must be under 10MB",
        variant: "destructive",
      });
      return;
    }

    if (newCommentAttachments.length + fileArray.length > 10) {
      toast({
        title: "Too many files",
        description: "Maximum 10 attachments allowed per comment",
        variant: "destructive",
      });
      return;
    }

    setNewCommentAttachments((prev) => [...prev, ...fileArray]);
    if (newCommentFileInputRef.current)
      newCommentFileInputRef.current.value = "";
  };

  const removeNewCommentFile = (index: number) => {
    setNewCommentAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const triggerNewCommentFileUpload = () =>
    newCommentFileInputRef.current?.click();

  const handleSaveCommentInView = async () => {
    const hasContent =
      newCommentText.trim() || newCommentAttachments.length > 0;

    if (!hasContent || !selectedTicket) {
      toast({
        title: "Error",
        description: "Please add a comment or attachment",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      if (newCommentText.trim())
        formData.append("comment", newCommentText.trim());
      newCommentAttachments.forEach((file) =>
        formData.append("attachments", file),
      );

      await axios.post(
        `/api/support-tickets/${selectedTicket.id}/comments`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        },
      );

      toast({ title: "Success", description: "Comment added successfully" });

      setNewCommentText("");
      setNewCommentAttachments([]);
      if (newCommentFileInputRef.current)
        newCommentFileInputRef.current.value = "";

      await openViewDialog(selectedTicket);
      await fetchTickets();
    } catch (error: any) {
      console.error("Error adding comment:", error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to add comment",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleCancelCommentInView = () => {
    setNewCommentText("");
    setNewCommentAttachments([]);
    if (newCommentFileInputRef.current)
      newCommentFileInputRef.current.value = "";
  };

  // ============================================
  // HANDLERS - Edit Dialog
  // ============================================
  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const fileArray = Array.from(files).filter((file) => file.size > 0);
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
    ];

    const invalidFiles = fileArray.filter(
      (file) => !allowedTypes.includes(file.type),
    );
    if (invalidFiles.length > 0) {
      toast({
        title: "Invalid file type",
        description: "Only PDF, JPEG, JPG, and PNG files are allowed",
        variant: "destructive",
      });
      return;
    }

    const oversizedFiles = fileArray.filter(
      (file) => file.size > 10 * 1024 * 1024,
    );
    if (oversizedFiles.length > 0) {
      toast({
        title: "File too large",
        description: "Files must be under 10MB",
        variant: "destructive",
      });
      return;
    }

    const currentTotal =
      editExistingAttachments.length +
      editAttachments.length +
      fileArray.length;
    if (currentTotal > 10) {
      toast({
        title: "Too many files",
        description: "Maximum 10 attachments allowed per ticket",
        variant: "destructive",
      });
      return;
    }

    setEditAttachments((prev) => [...prev, ...fileArray]);
    if (editFileInputRef.current) editFileInputRef.current.value = "";
  };

  const removeEditFile = (index: number) => {
    setEditAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const markForDeletion = (attachmentId: number) => {
    setEditAttachmentsToDelete((prev) => [...prev, attachmentId]);
    setEditExistingAttachments((prev) =>
      prev.filter((att) => att.id !== attachmentId),
    );
  };

  const triggerEditFileUpload = () => editFileInputRef.current?.click();
  const clearEditFiles = () => {
    setEditAttachments([]);
    if (editFileInputRef.current) editFileInputRef.current.value = "";
  };

  // ============================================
  // HANDLERS - Dialog Open/Close
  // ============================================
  const resetCreateForm = () => {
    setFormData({
      title: "",
      description: "",
      status: "new",
      priority: "medium",
      category: "",
      comment: "",
      assignedToId: "",
      parentTicketId: "",
    });
    setSavedComments([]);
    setCommentAttachments([]);
    clearAllFiles();
  };

  const resetEditForm = () => {
    setEditingTicket(null);
    setEditExistingAttachments([]);
    setEditAttachments([]);
    setEditAttachmentsToDelete([]);
    setEditSavedComments([]);
    setEditCommentAttachments([]);
    setEditCommentText("");
    setEditingCommentId(null);
    setEditingCommentText("");
    setFormData({
      title: "",
      description: "",
      status: "new",
      priority: "medium",
      category: "",
      comment: "",
      assignedToId: "",
      parentTicketId: "",
    });
  };

  const openNewTicketDialog = async () => {
    await fetchCategories();
    await fetchAssignees();
    resetCreateForm();
    setShowCreateDialog(true);
  };

  const openViewDialog = async (ticket: SupportTicket) => {
    setViewDialogLoading(true);
    try {
      const response = await axios.get(`/api/support-tickets/${ticket.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const fullTicket = response.data?.data || response.data;
      if (fullTicket) {
        fullTicket.attachments = fullTicket.attachments || [];
        fullTicket._count = {
          ...fullTicket._count,
          attachments:
            fullTicket._count?.attachments ||
            fullTicket.attachments?.length ||
            0,
        };
      }
      setSelectedTicket(fullTicket);
      setShowViewDialog(true);
    } catch (error: any) {
      console.error("Error fetching ticket details:", error);
      setSelectedTicket(ticket);
      setShowViewDialog(true);
    } finally {
      setViewDialogLoading(false);
    }
  };

  const openEditDialog = async (ticket: SupportTicket) => {
    // Open immediately with row data so fields aren't empty / late
    const isChildQuick = !!(
      ticket.parentId ||
      ticket.parentTicket?.id ||
      ticket._parentId ||
      ticket._isChild
    );
    const quickCategory =
      typeof ticket.category === "object" && ticket.category
        ? (ticket.category as any).id || ""
        : (ticket.category as string) || "";

    setEditingTicket(ticket);
    setIsEditingChildTicket(isChildQuick);
    setEditExistingAttachments(ticket.attachments || []);
    setEditAttachments([]);
    setEditAttachmentsToDelete([]);
    setEditSavedComments([]);
    setEditCommentAttachments([]);
    setEditCommentText("");
    setEditingCommentId(null);
    setEditingCommentText("");
    setFormData({
      title: ticket.title || "",
      description: ticket.description || "",
      status: ticket.status || "new",
      priority: ticket.priority || "medium",
      category: quickCategory,
      comment: ticket.comment || "",
      assignedToId: ticket.assignedTo?.id || "",
      parentTicketId:
        ticket.parentId ||
        ticket.parentTicket?.id ||
        ticket._parentId ||
        "",
    });
    setShowEditDialog(true);

    // Background refresh: details + children (don't block UI)
    setViewDialogLoading(true);
    try {
      const [response] = await Promise.all([
        axios.get(`/api/support-tickets/${ticket.id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }),
        assignees.length === 0 ? fetchAssignees() : Promise.resolve(),
        flatCategories.length === 0 ? fetchCategories() : Promise.resolve(),
        fetchChildTickets(ticket.id),
      ]);

      const fullTicket = response.data?.data || response.data;
      const isChildTicket = !!(
        fullTicket.parentId ||
        fullTicket.parentTicket?.id ||
        fullTicket._parentId ||
        fullTicket._isChild ||
        isChildQuick
      );

      const existingComments = (fullTicket.commentBoxes || []).map(
        (box: any) => ({
          id: `existing-${box.id}`,
          text: box.comment || "",
          attachments: box.attachments || [],
          createdAt: box.createdAt || new Date().toISOString(),
          isExisting: true,
          originalId: box.id,
        }),
      );

      const resolvedParentId =
        fullTicket.parentId ||
        fullTicket.parentTicket?.id ||
        fullTicket._parentId ||
        ticket.parentId ||
        ticket.parentTicket?.id ||
        ticket._parentId ||
        "";

      // Attach parentTicket meta so the dropdown label works even when parent
      // is a nested ticket not present in the main `tickets` page list.
      let enriched = fullTicket as SupportTicket;
      if (resolvedParentId && !fullTicket.parentTicket) {
        const known =
          tickets.find((t) => t.id === resolvedParentId) ||
          Object.values(ticketChildrenCache)
            .flat()
            .find((t) => t.id === resolvedParentId) ||
          ticket.parentTicket ||
          null;
        if (known) {
          enriched = {
            ...fullTicket,
            parentId: resolvedParentId,
            parentTicket: {
              id: (known as any).id,
              title: (known as any).title || "",
              ticketNumber: (known as any).ticketNumber || "",
            },
          };
        } else {
          enriched = {
            ...fullTicket,
            parentId: resolvedParentId,
            parentTicket: {
              id: resolvedParentId,
              title: "",
              ticketNumber: "",
            },
          };
        }
      }

      setEditingTicket(enriched);
      setEditExistingAttachments(fullTicket.attachments || []);
      setEditSavedComments(existingComments);
      setIsEditingChildTicket(isChildTicket);
      setFormData({
        title: fullTicket.title,
        description: fullTicket.description || "",
        status: fullTicket.status,
        priority: fullTicket.priority,
        category:
          typeof fullTicket.category === "object"
            ? fullTicket.category?.id || ""
            : fullTicket.category || "",
        comment: fullTicket.comment || "",
        assignedToId: fullTicket.assignedTo?.id || "",
        parentTicketId: resolvedParentId,
      });
    } catch (error) {
      console.error("Error fetching ticket details for edit:", error);
      if (assignees.length === 0) await fetchAssignees();
      if (flatCategories.length === 0) await fetchCategories();
      await fetchChildTickets(ticket.id);
    } finally {
      setViewDialogLoading(false);
    }
  };

  const openDeleteDialog = (ticket: SupportTicket) => {
    setDeletingTicket(ticket);
    setShowDeleteDialog(true);
  };

  const handleCreateDialogClose = () => {
    setShowCreateDialog(false);
    resetCreateForm();
  };

  const handleEditDialogClose = () => {
    setShowEditDialog(false);
    resetEditForm();
  };

  // Flatten a root list with unlimited nested expand (shared by main + edit tables)
  const walkVisibleFromList = useCallback(
    (rootList: SupportTicket[], startDepth = 0): SupportTicket[] => {
      const result: SupportTicket[] = [];
      const walk = (list: SupportTicket[], depth: number) => {
        const seen = new Set<string>();
        for (const ticket of list) {
          if (seen.has(ticket.id)) continue;
          seen.add(ticket.id);
          result.push({ ...ticket, _depth: depth });
          if (expandedTickets[ticket.id] && ticketChildrenCache[ticket.id]) {
            walk(ticketChildrenCache[ticket.id], depth + 1);
          }
        }
      };
      walk(rootList, startDepth);
      return result;
    },
    [expandedTickets, ticketChildrenCache],
  );

  const getVisibleRows = useCallback((): SupportTicket[] => {
    // Sirf pure top-level tickets (jin ka koi parent nahi)
    const mainListTickets = tickets.filter((t) => {
      const hasParent =
        !!t.parentId || !!t.parentTicket?.id || !!t._parentId || !!t._isChild;
      return !hasParent;
    });
    return walkVisibleFromList(mainListTickets, 0);
  }, [tickets, walkVisibleFromList]);

  // Hierarchy rows for edit-dialog child tables
  const getVisibleChildTableRows = useCallback((): SupportTicket[] => {
    return walkVisibleFromList(childTicketsList, 0);
  }, [childTicketsList, walkVisibleFromList]);

  const getVisibleSubChildTableRows = useCallback((): SupportTicket[] => {
    return walkVisibleFromList(subChildTicketsList, 0);
  }, [subChildTicketsList, walkVisibleFromList]);

  const collapseTicketAndChildren = (ticketId: string) => {
    setExpandedTickets((prev) => {
      const next = { ...prev };
      delete next[ticketId];

      const collapseRecursive = (id: string) => {
        const kids = ticketChildrenCache[id] || [];
        kids.forEach((kid) => {
          delete next[kid.id];
          collapseRecursive(kid.id);
        });
      };
      collapseRecursive(ticketId);

      return next;
    });
  };

  const toggleTicketExpand = async (
    e: React.MouseEvent,
    ticket: SupportTicket,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const ticketId = ticket.id;
    const isCurrentlyExpanded = !!expandedTickets[ticketId];

    if (isCurrentlyExpanded) {
      collapseTicketAndChildren(ticketId);
      return;
    }

    if (ticketChildrenCache[ticketId]) {
      setExpandedTickets((prev) => ({ ...prev, [ticketId]: true }));
      return;
    }

    setLoadingChildren((prev) => ({ ...prev, [ticketId]: true }));

    try {
      const res = await axios.get("/api/support-tickets/children", {
        params: {
          parentId: ticketId,
          excludeTicketId: ticketId,
        },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const rawChildren: SupportTicket[] = res.data?.data?.tickets || [];

      // For each child, detect if IT also has children (so chevron shows on nested levels)
      const children: SupportTicket[] = await Promise.all(
        rawChildren.map(async (c) => {
          let hasKids =
            c.hasChildren === true ||
            (c.childTickets?.length ?? 0) > 0 ||
            !!(c as any)._count?.childTickets ||
            !!(c as any)._count?.children;

          // API often omits hasChildren on nested tickets — probe once
          if (!hasKids && c.hasChildren !== false) {
            try {
              const probe = await axios.get("/api/support-tickets/children", {
                params: {
                  parentId: c.id,
                  excludeTicketId: c.id,
                  limit: 1,
                },
                headers: token ? { Authorization: `Bearer ${token}` } : {},
              });
              const kids = probe.data?.data?.tickets || [];
              hasKids = kids.length > 0;
            } catch {
              hasKids = false;
            }
          }

          return {
            ...c,
            hasChildren: hasKids,
            _isChild: true,
            _parentId: ticketId,
            _depth: (ticket._depth || 0) + 1,
          };
        }),
      );

      // Dedupe
      const uniqueMap = new Map<string, SupportTicket>();
      children.forEach((c) => {
        if (!uniqueMap.has(c.id)) uniqueMap.set(c.id, c);
      });
      const uniqueChildren = Array.from(uniqueMap.values());

      setTicketChildrenCache((prev) => ({
        ...prev,
        [ticketId]: uniqueChildren,
      }));

      if (uniqueChildren.length === 0) {
        const markNoKids = (t: SupportTicket) =>
          t.id === ticketId ? { ...t, hasChildren: false } : t;
        setTickets((prev) => prev.map(markNoKids));
        setChildTicketsList((prev) => prev.map(markNoKids));
        setSubChildTicketsList((prev) => prev.map(markNoKids));
        setTicketChildrenCache((prev) => {
          const next = { ...prev };
          Object.keys(next).forEach((pid) => {
            next[pid] = next[pid].map(markNoKids);
          });
          return next;
        });
      }
      setExpandedTickets((prev) => ({ ...prev, [ticketId]: true }));
    } catch (err) {
      console.error("Failed to load child tickets", err);
      toast({
        title: "Error",
        description: "Could not load related tickets",
        variant: "destructive",
      });
    } finally {
      setLoadingChildren((prev) => {
        const next = { ...prev };
        delete next[ticketId];
        return next;
      });
    }
  };

  // ============================================
  // HANDLERS - Child Ticket Form (Inline)
  // ============================================

  const handleChildFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const fileArray = Array.from(files).filter((file) => file.size > 0);
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
    ];

    const invalidFiles = fileArray.filter(
      (file) => !allowedTypes.includes(file.type),
    );
    if (invalidFiles.length > 0) {
      toast({
        title: "Invalid file type",
        description: "Only PDF, JPEG, JPG, and PNG files are allowed",
        variant: "destructive",
      });
      return;
    }

    const oversizedFiles = fileArray.filter(
      (file) => file.size > 10 * 1024 * 1024,
    );
    if (oversizedFiles.length > 0) {
      toast({
        title: "File too large",
        description: "Files must be under 10MB",
        variant: "destructive",
      });
      return;
    }

    if (childAttachments.length + fileArray.length > 10) {
      toast({
        title: "Too many files",
        description: "Maximum 10 attachments allowed per ticket",
        variant: "destructive",
      });
      return;
    }

    setChildAttachments((prev) => [...prev, ...fileArray]);
    if (childFileInputRef.current) childFileInputRef.current.value = "";
  };

  const removeChildFile = (index: number) => {
    setChildAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const triggerChildFileUpload = () => childFileInputRef.current?.click();

  const handleChildCommentFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files;
    if (!files) return;

    const fileArray = Array.from(files).filter((file) => file.size > 0);
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
    ];

    const invalidFiles = fileArray.filter(
      (file) => !allowedTypes.includes(file.type),
    );
    if (invalidFiles.length > 0) {
      toast({
        title: "Invalid file type",
        description: "Only PDF, JPEG, JPG, and PNG files are allowed",
        variant: "destructive",
      });
      return;
    }

    const oversizedFiles = fileArray.filter(
      (file) => file.size > 10 * 1024 * 1024,
    );
    if (oversizedFiles.length > 0) {
      toast({
        title: "File too large",
        description: "Files must be under 10MB",
        variant: "destructive",
      });
      return;
    }

    if (childCommentAttachments.length + fileArray.length > 10) {
      toast({
        title: "Too many files",
        description: "Maximum 10 attachments allowed per comment",
        variant: "destructive",
      });
      return;
    }

    setChildCommentAttachments((prev) => [...prev, ...fileArray]);
    if (childCommentFileInputRef.current)
      childCommentFileInputRef.current.value = "";
  };

  const removeChildCommentFile = (index: number) => {
    setChildCommentAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const triggerChildCommentFileUpload = () =>
    childCommentFileInputRef.current?.click();

  const handleSaveChildComment = () => {
    const hasContent =
      childCommentText?.trim() || childCommentAttachments.length > 0;

    if (!hasContent) {
      toast({
        title: "Error",
        description: "Please add a comment or attachment",
        variant: "destructive",
      });
      return;
    }

    const newComment: SavedComment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: childCommentText || "",
      attachments: [...childCommentAttachments],
      createdAt: new Date().toISOString(),
    };

    setChildSavedComments((prev) => [...prev, newComment]);
    setChildCommentText("");
    setChildCommentAttachments([]);
    if (childCommentFileInputRef.current)
      childCommentFileInputRef.current.value = "";

    toast({ title: "Success", description: "Comment saved successfully" });
  };

  const handleCancelChildComment = () => {
    setChildCommentText("");
    setChildCommentAttachments([]);
    if (childCommentFileInputRef.current)
      childCommentFileInputRef.current.value = "";
  };

  const handleCreateChildTicket = async () => {
    const parentId =
      creatingChildUnderId ||
      editingChildTicket?.id ||
      editingTicket?.id ||
      null;

    if (!parentId) {
      toast({
        title: "Error",
        description: "Parent ticket not found",
        variant: "destructive",
      });
      return;
    }

    if (!childFormData.title.trim() || !childFormData.category) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const formDataToSend = new FormData();

      formDataToSend.append("title", childFormData.title);
      formDataToSend.append("description", childFormData.description || "");
      formDataToSend.append("status", childFormData.status);
      formDataToSend.append("priority", childFormData.priority);
      formDataToSend.append("category", childFormData.category);
      formDataToSend.append("parentId", parentId);

      if (
        childFormData.assignedToId &&
        childFormData.assignedToId !== "unassigned"
      ) {
        formDataToSend.append("assignedToId", childFormData.assignedToId);
      }
      const commentBoxesData = childSavedComments.map((comment) => ({
        tempId: comment.id,
        comment: comment.text,
      }));

      formDataToSend.append("commentBoxes", JSON.stringify(commentBoxesData));

      childAttachments.forEach((file) => {
        formDataToSend.append("attachments", file);
      });

      childSavedComments.forEach((comment) => {
        comment.attachments.forEach((file) => {
          formDataToSend.append(`comment-${comment.id}`, file);
        });
      });

      await axios.post("/api/support-tickets", formDataToSend, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      toast({
        title: "Success",
        description: "Ticket created successfully",
      });

      setShowChildDialog(false);
      setCreatingChildUnderId(null);
      setChildFormData({
        title: "",
        description: "",
        status: "new",
        priority: "medium",
        category: "",
        comment: "",
        assignedToId: "",
      });
      setChildAttachments([]);
      setChildSavedComments([]);
      setChildCommentAttachments([]);
      setChildCommentText("");

      await fetchTickets();

      const isNested =
        !!editingChildTicket && parentId === editingChildTicket.id;
      if (isNested) {
        await fetchChildTickets(parentId, { forSubLevel: true });
      } else if (editingTicket) {
        await fetchChildTickets(editingTicket.id);
      } else {
        await fetchChildTickets(parentId);
      }
    } catch (error: any) {
      console.error("Create Child Ticket Error:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.error || "Failed to create ticket",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const resetChildForm = () => {
    setShowChildDialog(false);
    setCreatingChildUnderId(null);
    setChildFormData({
      title: "",
      description: "",
      status: "new",
      priority: "medium",
      category: "",
      comment: "",
      assignedToId: "",
    });
    setChildAttachments([]);
    setChildSavedComments([]);
    setChildCommentAttachments([]);
    setChildCommentText("");
  };

  const handleDeleteChildTicket = async (childTicket: SupportTicket) => {
    setDeletingChildTicket(childTicket);
    setShowDeleteChildDialog(true);
  };

  const confirmDeleteChildTicket = async () => {
    if (!deletingChildTicket) return;

    const deletedId = deletingChildTicket.id;
    const deletedParentId =
      deletingChildTicket.parentId ||
      deletingChildTicket._parentId ||
      editingChildTicket?.id ||
      editingTicket?.id ||
      null;

    setDeleting(true);
    try {
      await axios.delete(`/api/support-tickets/${deletedId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Remove from EVERY frontend list immediately so it disappears from UI
      setChildTicketsList((prev) => prev.filter((t) => t.id !== deletedId));
      setSubChildTicketsList((prev) => prev.filter((t) => t.id !== deletedId));
      setTickets((prev) => prev.filter((t) => t.id !== deletedId));
      setTicketChildrenCache((prev) => {
        const next: Record<string, SupportTicket[]> = {};
        Object.keys(prev).forEach((pid) => {
          next[pid] = prev[pid].filter((t) => t.id !== deletedId);
        });
        // Also drop cache entry for the deleted ticket itself
        delete next[deletedId];
        return next;
      });
      setExpandedTickets((prev) => {
        const next = { ...prev };
        delete next[deletedId];
        return next;
      });

      toast({
        title: "Success",
        description: "Ticket deleted successfully",
      });
      setShowDeleteChildDialog(false);
      setDeletingChildTicket(null);

      // Refresh lists from server
      if (editingChildTicket && editingChildTicket.id !== deletedId) {
        await fetchChildTickets(editingChildTicket.id, { forSubLevel: true });
      }
      if (deletedParentId) {
        await fetchChildTickets(deletedParentId);
        if (editingChildTicket?.id === deletedParentId) {
          await fetchChildTickets(deletedParentId, { forSubLevel: true });
        }
      }
      if (editingTicket) {
        await fetchChildTickets(editingTicket.id);
      }
      await fetchTickets();
    } catch (error: any) {
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to delete ticket"),
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  // ============================================
  // HANDLERS - Inline Child Edit
  // ============================================

  const markChildAttachmentForDeletion = (attachmentId: number) => {
    setEditingChildAttachmentsToDelete((prev) => [...prev, attachmentId]);
    setEditingChildExistingAttachments((prev) =>
      prev.filter((att) => att.id !== attachmentId),
    );
  };

  // ============================================
  // HANDLERS - Child Edit Dialog
  // ============================================

  const loadChildEditForm = async (child: SupportTicket) => {
    let categoryId = "";
    if (typeof child.category === "object" && child.category) {
      categoryId = (child.category as any).id || "";
    } else {
      categoryId = child.category || "";
    }

    const resolvedParentId =
      child.parentId ||
      child.parentTicket?.id ||
      child._parentId ||
      editingTicket?.id ||
      "";

    // Enrich parentTicket meta so Parent dropdown label is never empty
    let enrichedChild = child;
    if (resolvedParentId && !child.parentTicket) {
      const known =
        (editingTicket?.id === resolvedParentId ? editingTicket : null) ||
        tickets.find((t) => t.id === resolvedParentId) ||
        childTicketsList.find((t) => t.id === resolvedParentId) ||
        Object.values(ticketChildrenCache)
          .flat()
          .find((t) => t.id === resolvedParentId) ||
        null;
      enrichedChild = {
        ...child,
        parentId: resolvedParentId,
        parentTicket: known
          ? {
              id: known.id,
              title: known.title || "",
              ticketNumber: known.ticketNumber || "",
            }
          : {
              id: resolvedParentId,
              title: "",
              ticketNumber: "",
            },
      };
    }

    setEditingChildTicket(enrichedChild);

    setChildEditForm({
      title: child.title,
      description: child.description || "",
      status: child.status,
      priority: child.priority,
      category: categoryId,
      assignedToId: child.assignedTo?.id || "",
      parentTicketId: resolvedParentId,
    });

    setChildEditExistingAttachments(child.attachments || []);
    setChildEditAttachments([]);
    setChildEditAttachmentsToDelete([]);

    const existingComments = (child.commentBoxes || []).map((box: any) => ({
      id: `existing-${box.id}`,
      text: box.comment || "",
      attachments: box.attachments || [],
      createdAt: box.createdAt || new Date().toISOString(),
      isExisting: true,
      originalId: box.id,
    }));
    setChildEditComments(existingComments);
    setChildEditCommentText("");
    setChildEditCommentAttachments([]);
    setShowChildEditDialog(true);

    // Prefer full details if available (parentTicket from API)
    try {
      const res = await axios.get(`/api/support-tickets/${child.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const full = res.data?.data || res.data;
      if (full?.id) {
        const fullParentId =
          full.parentId ||
          full.parentTicket?.id ||
          full._parentId ||
          resolvedParentId;
        const fullCat =
          typeof full.category === "object"
            ? full.category?.id || categoryId
            : full.category || categoryId;

        setEditingChildTicket({
          ...enrichedChild,
          ...full,
          parentId: fullParentId,
          parentTicket:
            full.parentTicket ||
            enrichedChild.parentTicket ||
            (fullParentId
              ? {
                  id: fullParentId,
                  title: "",
                  ticketNumber: "",
                }
              : null),
        });
        setChildEditForm((prev) => ({
          ...prev,
          title: full.title ?? prev.title,
          description: full.description ?? prev.description,
          status: full.status ?? prev.status,
          priority: full.priority ?? prev.priority,
          category: fullCat,
          assignedToId: full.assignedTo?.id || prev.assignedToId,
          parentTicketId: fullParentId,
        }));
        if (full.attachments) {
          setChildEditExistingAttachments(full.attachments);
        }
        if (full.commentBoxes) {
          setChildEditComments(
            full.commentBoxes.map((box: any) => ({
              id: `existing-${box.id}`,
              text: box.comment || "",
              attachments: box.attachments || [],
              createdAt: box.createdAt || new Date().toISOString(),
              isExisting: true,
              originalId: box.id,
            })),
          );
        }
      }
    } catch (e) {
      console.error("Error fetching child ticket details:", e);
    }

    await fetchChildTickets(child.id, { forSubLevel: true });
  };

  const openChildEditDialog = async (child: SupportTicket) => {
    // Push current editing child onto stack before opening deeper level
    if (editingChildTicket && editingChildTicket.id !== child.id) {
      setChildEditStack((prev) => [...prev, editingChildTicket]);
    }
    await loadChildEditForm(child);
  };

  // Back button: go to previous nested child (or close if stack empty)
  const handleBackChildEdit = async () => {
    if (childEditStack.length === 0) {
      resetChildEditForm();
      // Refresh parent-level children list if main edit is open
      if (editingTicket) {
        await fetchChildTickets(editingTicket.id);
      }
      return;
    }
    const prev = childEditStack[childEditStack.length - 1];
    setChildEditStack((stack) => stack.slice(0, -1));
    await loadChildEditForm(prev);
  };

  // Reset Child Edit Form
  const resetChildEditForm = () => {
    setEditingChildTicket(null);
    setChildEditStack([]);
    setChildEditForm({
      title: "",
      description: "",
      status: "new",
      priority: "medium",
      category: "",
      assignedToId: "",
      parentTicketId: "",
    });
    setChildEditAttachments([]);
    setChildEditExistingAttachments([]);
    setChildEditAttachmentsToDelete([]);
    setChildEditComments([]);
    setChildEditCommentText("");
    setChildEditCommentAttachments([]);
    setSubChildTicketsList([]);
    setShowChildEditDialog(false);
  };

  // Categories for nested child: leaf only, exclude parent ticket's own category
  // Helper: extract category id from ticket
  const getTicketCategoryId = (t: SupportTicket | null | undefined) => {
    if (!t) return "";
    if (typeof t.category === "object" && t.category) {
      return (t.category as any).id || "";
    }
    return (t.category as string) || "";
  };

  // Find a category node in the tree by id
  const findCategoryNode = (
    items: TicketCategory[],
    id: string,
  ): TicketCategory | null => {
    for (const item of items) {
      if (item.id === id) return item;
      if (item.children?.length) {
        const found = findCategoryNode(item.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  // Ancestor category ids above a category (User Story → Features, Epic)
  const getAncestorCategoryIds = (categoryId: string): Set<string> => {
    const result = new Set<string>();
    if (!categoryId) return result;
    let current = String(categoryId);
    const guard = new Set<string>();
    while (current && !guard.has(current)) {
      guard.add(current);
      const node = flatCategories.find((c) => String(c.id) === current);
      if (!node || node.parentId == null || node.parentId === "") break;
      const pid = String(node.parentId);
      result.add(pid);
      current = pid;
    }
    return result;
  };

  // Immediate parent category id only (User Story → Features)
  const getImmediateParentCategoryId = (categoryId: string): string => {
    if (!categoryId) return "";
    const node = flatCategories.find((c) => String(c.id) === String(categoryId));
    if (!node || node.parentId == null || node.parentId === "") return "";
    return String(node.parentId);
  };

  // Collect every ticket we already know about (main list + nested caches)
  // so parent dropdown is not limited to top-level page results.
  const collectAllKnownTickets = useCallback((): SupportTicket[] => {
    const map = new Map<string, SupportTicket>();
    const add = (t: SupportTicket | null | undefined) => {
      if (!t?.id) return;
      const existing = map.get(t.id);
      if (!existing) {
        map.set(t.id, t);
        return;
      }
      map.set(t.id, {
        ...existing,
        ...t,
        parentTicket: t.parentTicket || existing.parentTicket,
        ticketNumber: t.ticketNumber || existing.ticketNumber,
        title: t.title || existing.title,
        category: t.category ?? existing.category,
      });
    };

    tickets.forEach(add);
    childTicketsList.forEach(add);
    subChildTicketsList.forEach(add);
    Object.values(ticketChildrenCache).forEach((list) => list.forEach(add));
    add(editingTicket || undefined);
    add(editingChildTicket || undefined);
    if (editingTicket?.parentTicket) {
      add({
        id: editingTicket.parentTicket.id,
        ticketNumber: editingTicket.parentTicket.ticketNumber || "",
        title: editingTicket.parentTicket.title || "",
      } as SupportTicket);
    }
    if (editingChildTicket?.parentTicket) {
      add({
        id: editingChildTicket.parentTicket.id,
        ticketNumber: editingChildTicket.parentTicket.ticketNumber || "",
        title: editingChildTicket.parentTicket.title || "",
      } as SupportTicket);
    }
    return Array.from(map.values());
  }, [
    tickets,
    childTicketsList,
    subChildTicketsList,
    ticketChildrenCache,
    editingTicket,
    editingChildTicket,
  ]);

  /**
   * Parent-ticket options for edit/create:
   * - Never self
   * - Prefer tickets whose category is the IMMEDIATE parent category of the
   *   current ticket category (e.g. User Story → tickets with category Features)
   * - Always keep the currently assigned parent visible even if nested / not on page
   */
  const getParentTicketOptions = useCallback(
    (opts: {
      currentCategoryId?: string;
      currentParentId?: string;
      excludeTicketId?: string;
    }): SupportTicket[] => {
      const {
        currentCategoryId = "",
        currentParentId = "",
        excludeTicketId = "",
      } = opts;

      const all = collectAllKnownTickets();
      const immediateParentCatId = currentCategoryId
        ? getImmediateParentCategoryId(currentCategoryId)
        : "";
      const ancestorCatIds = currentCategoryId
        ? getAncestorCategoryIds(currentCategoryId)
        : new Set<string>();

      const filtered = all.filter((t) => {
        if (!t.id) return false;
        if (excludeTicketId && t.id === excludeTicketId) return false;

        // Always keep currently assigned parent
        if (currentParentId && t.id === currentParentId) return true;

        const tCatId = getTicketCategoryId(t);

        if (currentCategoryId) {
          if (immediateParentCatId) {
            if (tCatId === immediateParentCatId) return true;
            if (ancestorCatIds.has(tCatId)) return true;
            return false;
          }
          // Current category is a root → no higher-category parents
          return false;
        }

        // No category selected: only top-level tickets as parent candidates
        const hasParent =
          !!t.parentId ||
          !!t.parentTicket?.id ||
          !!t._parentId ||
          !!t._isChild;
        return !hasParent;
      });

      // Ensure current parent is present even if API only gave id/title
      if (
        currentParentId &&
        !filtered.some((t) => t.id === currentParentId)
      ) {
        const fromAll = all.find((t) => t.id === currentParentId);
        const parentMeta =
          editingTicket?.parentTicket?.id === currentParentId
            ? editingTicket.parentTicket
            : editingChildTicket?.parentTicket?.id === currentParentId
              ? editingChildTicket.parentTicket
              : null;
        filtered.unshift(
          fromAll ||
            ({
              id: currentParentId,
              ticketNumber: parentMeta?.ticketNumber || "",
              title: parentMeta?.title || currentParentId,
            } as SupportTicket),
        );
      }

      const seen = new Set<string>();
      return filtered.filter((t) => {
        if (seen.has(t.id)) return false;
        seen.add(t.id);
        return true;
      });
    },
    [
      collectAllKnownTickets,
      flatCategories,
      editingTicket,
      editingChildTicket,
    ],
  );

  const formatParentTicketLabel = (
    ticketId: string,
    fallbackParent?: { id: string; title?: string; ticketNumber?: string } | null,
  ): string => {
    if (!ticketId) return "";
    const all = collectAllKnownTickets();
    const found = all.find((t) => t.id === ticketId);
    if (found) {
      const num = found.ticketNumber || "";
      const title = found.title || "";
      if (num || title)
        return `${num}${num && title ? " — " : ""}${title}`.trim();
    }
    if (fallbackParent && (fallbackParent.id === ticketId || !found)) {
      const num = fallbackParent.ticketNumber || "";
      const title = fallbackParent.title || "";
      if (num || title)
        return `${num}${num && title ? " — " : ""}${title}`.trim();
    }
    return ticketId;
  };

  // Descendants via flat parentId links (reliable).
  // Features → { User Story }
  // Epic → { Features, User Story, Bugs, Task }
  const getDescendantCategoryIds = (rootCategoryId: string): Set<string> => {
    const result = new Set<string>();
    if (!rootCategoryId) return result;
    const root = String(rootCategoryId);
    const queue = [root];
    while (queue.length) {
      const current = queue.shift()!;
      flatCategories.forEach((cat) => {
        const id = String(cat.id);
        const pid = cat.parentId != null ? String(cat.parentId) : "";
        if (pid === current && !result.has(id) && id !== root) {
          result.add(id);
          queue.push(id);
        }
      });
    }
    // Also try tree walk as backup
    const node = findCategoryNode(categories, root);
    const walk = (n: TicketCategory) => {
      n.children?.forEach((c) => {
        if (!result.has(c.id)) {
          result.add(c.id);
          walk(c);
        }
      });
    };
    if (node) walk(node);
    return result;
  };

  // Categories under a parent category (for child ticket dropdown)
  // Example: parent ticket category = Features → only User Story (not Bugs/Task)
  const getCategoriesUnderParentCategory = (parentCatId: string) => {
    if (!parentCatId) return [];
    const allowed = getDescendantCategoryIds(parentCatId);
    // Prefer ALL descendants under that branch (not only global leaves)
    // so intermediate nodes under Features are also available if needed
    return flatCategories
      .filter((cat) => {
        const id = String(cat.id);
        if (id === String(parentCatId)) return false;
        if (!allowed.has(id)) return false;
        // must have a parent (never root Epic as option under Features)
        if (cat.parentId == null || cat.parentId === "") return false;
        return true;
      })
      .map((cat) => ({
        id: String(cat.id),
        name: cat.name,
        parentId: cat.parentId,
        level: cat.level || 0,
      }));
  };

  // Resolve which ticket is the "parent" for category scope
  const resolveParentTicketForCategories = (): SupportTicket | null => {
    if (creatingChildUnderId) {
      if (editingChildTicket?.id === creatingChildUnderId)
        return editingChildTicket;
      const fromStack = childEditStack.find(
        (t) => t.id === creatingChildUnderId,
      );
      if (fromStack) return fromStack;
      const fromList =
        childTicketsList.find((t) => t.id === creatingChildUnderId) ||
        subChildTicketsList.find((t) => t.id === creatingChildUnderId);
      if (fromList) return fromList;
      if (editingTicket?.id === creatingChildUnderId) return editingTicket;
    }
    if (editingChildTicket) return editingChildTicket;
    if (editingTicket) return editingTicket;
    return null;
  };

  /**
   * Create-child category list:
   * Parent ticket category = Features → show User Story only
   * Parent ticket category = Epic → show Features, User Story, Bugs, Task
   * Never show sibling branches (Bugs/Task when under Features)
   */
  const getCategoriesForChildCreate = () => {
    const parentTicket = resolveParentTicketForCategories();
    const parentCatId = getTicketCategoryId(parentTicket);

    if (parentCatId) {
      return getCategoriesUnderParentCategory(parentCatId);
    }

    const rootIds = new Set(parentCategories.map((p) => String(p.id)));
    return flatCategories.filter(
      (cat) =>
        cat.parentId != null &&
        cat.parentId !== "" &&
        !rootIds.has(String(cat.id)),
    );
  };

  /**
   * Edit-child category list: same branch rule as create
   */
  const getCategoriesForChildEdit = () => {
    const immediateParent =
      childEditStack.length > 0
        ? childEditStack[childEditStack.length - 1]
        : editingTicket;

    const parentCatId = getTicketCategoryId(immediateParent);
    const currentCatId = childEditForm.category
      ? String(childEditForm.category)
      : "";

    let list = parentCatId
      ? getCategoriesUnderParentCategory(parentCatId)
      : flatCategories.filter(
          (cat) => cat.parentId != null && cat.parentId !== "",
        );

    // Keep current category selectable
    if (currentCatId && !list.some((c) => String(c.id) === currentCatId)) {
      const current = flatCategories.find(
        (c) => String(c.id) === currentCatId,
      );
      if (current) list = [current, ...list];
    }

    return list;
  };

  // Child Edit File Handlers
  const handleChildEditFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files;
    if (!files) return;

    const fileArray = Array.from(files).filter((file) => file.size > 0);
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
    ];

    const invalidFiles = fileArray.filter(
      (file) => !allowedTypes.includes(file.type),
    );
    if (invalidFiles.length > 0) {
      toast({
        title: "Invalid file type",
        description: "Only PDF, JPEG, JPG, and PNG files are allowed",
        variant: "destructive",
      });
      return;
    }

    const oversizedFiles = fileArray.filter(
      (file) => file.size > 10 * 1024 * 1024,
    );
    if (oversizedFiles.length > 0) {
      toast({
        title: "File too large",
        description: "Files must be under 10MB",
        variant: "destructive",
      });
      return;
    }

    const currentTotal =
      childEditExistingAttachments.length +
      childEditAttachments.length +
      fileArray.length;
    if (currentTotal > 10) {
      toast({
        title: "Too many files",
        description: "Maximum 10 attachments allowed per ticket",
        variant: "destructive",
      });
      return;
    }

    setChildEditAttachments((prev) => [...prev, ...fileArray]);
    if (childEditFileInputRef.current) childEditFileInputRef.current.value = "";
  };

  const removeChildEditFile = (index: number) => {
    setChildEditAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const markChildEditAttachmentForDeletion = (attachmentId: number) => {
    setChildEditAttachmentsToDelete((prev) => [...prev, attachmentId]);
    setChildEditExistingAttachments((prev) =>
      prev.filter((att) => att.id !== attachmentId),
    );
  };

  const triggerChildEditFileUpload = () =>
    childEditFileInputRef.current?.click();

  // Child Edit Comment Handlers
  const handleChildEditCommentFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files;
    if (!files) return;

    const fileArray = Array.from(files).filter((file) => file.size > 0);
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
    ];

    const invalidFiles = fileArray.filter(
      (file) => !allowedTypes.includes(file.type),
    );
    if (invalidFiles.length > 0) {
      toast({
        title: "Invalid file type",
        description: "Only PDF, JPEG, JPG, and PNG files are allowed",
        variant: "destructive",
      });
      return;
    }

    const oversizedFiles = fileArray.filter(
      (file) => file.size > 10 * 1024 * 1024,
    );
    if (oversizedFiles.length > 0) {
      toast({
        title: "File too large",
        description: "Files must be under 10MB",
        variant: "destructive",
      });
      return;
    }

    if (childEditCommentAttachments.length + fileArray.length > 10) {
      toast({
        title: "Too many files",
        description: "Maximum 10 attachments allowed per comment",
        variant: "destructive",
      });
      return;
    }

    setChildEditCommentAttachments((prev) => [...prev, ...fileArray]);
    if (childEditCommentFileInputRef.current)
      childEditCommentFileInputRef.current.value = "";
  };

  const removeChildEditCommentFile = (index: number) => {
    setChildEditCommentAttachments((prev) =>
      prev.filter((_, i) => i !== index),
    );
  };

  const triggerChildEditCommentFileUpload = () =>
    childEditCommentFileInputRef.current?.click();

  const handleSaveChildEditComment = () => {
    const hasContent =
      childEditCommentText?.trim() || childEditCommentAttachments.length > 0;

    if (!hasContent) {
      toast({
        title: "Error",
        description: "Please add a comment or attachment",
        variant: "destructive",
      });
      return;
    }

    const newComment: SavedComment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: childEditCommentText || "",
      attachments: [...childEditCommentAttachments],
      createdAt: new Date().toISOString(),
      isExisting: false,
    };

    setChildEditComments((prev) => [...prev, newComment]);
    setChildEditCommentText("");
    setChildEditCommentAttachments([]);
    if (childEditCommentFileInputRef.current)
      childEditCommentFileInputRef.current.value = "";

    toast({ title: "Success", description: "Comment saved successfully" });
  };

  const handleCancelChildEditComment = () => {
    setChildEditCommentText("");
    setChildEditCommentAttachments([]);
    if (childEditCommentFileInputRef.current)
      childEditCommentFileInputRef.current.value = "";
  };

  // Child Edit Comment CRUD
  const startChildEditComment = (commentId: string, currentText: string) => {
    setChildEditCommentId(commentId);
    setChildEditCommentTextEditing(currentText);
  };

  const saveChildEditComment = (commentId: string) => {
    if (!childEditCommentTextEditing.trim()) {
      toast({
        title: "Error",
        description: "Comment cannot be empty",
        variant: "destructive",
      });
      return;
    }

    setChildEditComments((prev) =>
      prev.map((c) =>
        c.id === commentId ? { ...c, text: childEditCommentTextEditing } : c,
      ),
    );
    setChildEditCommentId(null);
    setChildEditCommentTextEditing("");
    toast({ title: "Success", description: "Comment updated" });
  };

  const cancelChildEditComment = () => {
    setChildEditCommentId(null);
    setChildEditCommentTextEditing("");
  };

  const deleteChildEditComment = (commentId: string) => {
    setChildEditComments((prev) => prev.filter((c) => c.id !== commentId));
    toast({ title: "Success", description: "Comment removed" });
  };

  const handleUpdateChildTicket = async () => {
    if (!editingChildTicket) return;

    if (!childEditForm.title.trim() || !childEditForm.category) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setChildEditUploading(true);

    try {
      const updatePayload: any = {
        title: childEditForm.title,
        description: childEditForm.description,
        status: childEditForm.status,
        priority: childEditForm.priority,
        category: childEditForm.category,
        assignedToId:
          childEditForm.assignedToId === "unassigned" ||
          !childEditForm.assignedToId
            ? null
            : childEditForm.assignedToId,
        parentId:
          childEditForm.parentTicketId === "none" ||
          !childEditForm.parentTicketId
            ? null
            : childEditForm.parentTicketId,
      };

      await axios.put(
        `/api/support-tickets/${editingChildTicket.id}`,
        updatePayload,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );

      // Delete attachments
      for (const attachmentId of childEditAttachmentsToDelete) {
        try {
          await axios.delete(
            `/api/support-tickets/${editingChildTicket.id}/attachments/${attachmentId}`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
        } catch (e) {
          console.error("Delete attachment failed:", e);
        }
      }

      // Upload new attachments
      if (childEditAttachments.length > 0) {
        try {
          const fd = new FormData();
          childEditAttachments.forEach((file) => fd.append("files", file));
          await axios.post(
            `/api/support-tickets/${editingChildTicket.id}/attachments`,
            fd,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "multipart/form-data",
              },
            },
          );
        } catch (e) {
          console.error("Upload attachments failed:", e);
        }
      }

      // Handle new comments
      const newComments = childEditComments.filter((c) => !c.isExisting);
      if (newComments.length > 0) {
        try {
          const fd = new FormData();
          fd.append(
            "commentBoxes",
            JSON.stringify(
              newComments.map((c) => ({ tempId: c.id, comment: c.text })),
            ),
          );
          newComments.forEach((comment) => {
            comment.attachments.forEach((file) => {
              fd.append(`comment-${comment.id}`, file);
            });
          });
          await axios.post(
            `/api/support-tickets/${editingChildTicket.id}/comments/batch`,
            fd,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "multipart/form-data",
              },
            },
          );
        } catch (e) {
          console.error("Upload comments failed:", e);
        }
      }

      toast({
        title: "Success",
        description: "Ticket updated successfully",
      });

      const oldParentId =
        editingChildTicket.parentId ||
        editingChildTicket.parentTicket?.id ||
        editingChildTicket._parentId ||
        editingTicket?.id ||
        "";
      const newParentId =
        childEditForm.parentTicketId === "none" ||
        !childEditForm.parentTicketId
          ? ""
          : childEditForm.parentTicketId;
      const ticketId = editingChildTicket.id;

      // Invalidate hierarchy cache for this ticket + old/new parents
      setTicketChildrenCache((prev) => {
        const next = { ...prev };
        delete next[ticketId];
        if (oldParentId) delete next[oldParentId];
        if (newParentId) delete next[newParentId];
        return next;
      });
      setExpandedTickets((prev) => {
        const next = { ...prev };
        delete next[ticketId];
        return next;
      });

      // Stay in nested flow: go back to previous level (3 if you were on 4)
      // instead of jumping to top parent edit page
      if (childEditStack.length > 0) {
        await handleBackChildEdit();
      } else {
        // Level-1 child under main parent → close child dialog, refresh parent list
        resetChildEditForm();
      }

      // Auto-refresh main table + related child lists (no manual page reload)
      await fetchTickets();

      const parentsToRefresh = Array.from(
        new Set(
          [oldParentId, newParentId, editingTicket?.id || ""].filter(Boolean),
        ),
      );
      for (const pid of parentsToRefresh) {
        try {
          await fetchChildTickets(pid);
        } catch {
          /* ignore */
        }
      }
      // If main edit dialog still open, also refresh its nested child table
      if (editingTicket?.id) {
        try {
          await fetchChildTickets(editingTicket.id);
        } catch {
          /* ignore */
        }
      }
    } catch (error: any) {
      console.error("Update Child Error:", error);
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to update ticket"),
        variant: "destructive",
      });
    } finally {
      setChildEditUploading(false);
    }
  };
  const getCategoriesWithIndent = (categories: TicketCategory[]): any[] => {
    const result: any[] = [];

    const traverse = (items: TicketCategory[], level: number = 0) => {
      items.forEach((item) => {
        // Sirf spaces ka indentation - no ├─ └─ symbols
        const indent = "  ".repeat(level);
        const displayName = level === 0 ? item.name : indent + item.name;

        result.push({
          ...item,
          displayName,
          level: level,
          originalName: item.name,
        });

        if (item.children?.length) {
          traverse(item.children, level + 1);
        }
      });
    };

    traverse(categories, 0);
    return result;
  };

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
        {/* New Ticket Button */}
        <div className="flex justify-end items-center mb-6">
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={openNewTicketDialog}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("admin.supportTickets.newTicket") || "New Ticket"}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-5 gap-4">
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
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-muted-foreground">
                NEW
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {formatNumber(tickets.filter((t) => t.status === "new").length)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-muted-foreground">
                In Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                {formatNumber(
                  tickets.filter((t) => t.status === "in_progress").length,
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-muted-foreground">
                Resolved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatNumber(
                  tickets.filter((t) => t.status === "resolved").length,
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-muted-foreground">
                Closed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-600 dark:text-gray-400">
                {formatNumber(
                  tickets.filter((t) => t.status === "closed").length,
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search tickets..."
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
                  Rows:
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
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tickets Table - Click row to view */}
        <Card>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading...
              </div>
            ) : searchError ? (
              <div className="text-center py-8 text-red-500">
                Error: {searchError}
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No tickets found
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">ID</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getVisibleRows().map((ticket) => {
                      const statusInfo = getStatusBadge(ticket.status);
                      const priorityInfo = getPriorityBadge(ticket.priority);
                      const categoryDisplay = flatCategories.find(
                        (cat) => cat.id === ticket.category,
                      );
                      const depth = ticket._depth || 0;
                      const isExpanded = !!expandedTickets[ticket.id];
                      const isLoadingKids = !!loadingChildren[ticket.id];
                      // Expand ONLY if this ticket has children (not every row)
                      const cachedKids = ticketChildrenCache[ticket.id];
                      const canExpand =
                        ticket.hasChildren === true ||
                        (cachedKids?.length ?? 0) > 0;

                      return (
                        <TableRow
                          key={
                            depth > 0
                              ? `child-${ticket._parentId}-${ticket.id}-${depth}`
                              : `root-${ticket.id}`
                          }
                        >
                          {/* ========== TICKET ID with expand ========== */}
                          <TableCell className="text-sm text-gray-500 font-mono">
                            <div
                              className="flex items-center gap-1"
                              style={{ paddingLeft: `${depth * 20}px` }}
                            >
                              {canExpand ? (
                                <button
                                  onClick={(e) => toggleTicketExpand(e, ticket)}
                                  className="p-0.5 rounded hover:bg-muted"
                                  disabled={isLoadingKids}
                                >
                                  {isLoadingKids ? (
                                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
                                  ) : isExpanded ? (
                                    <ChevronDown className="h-4 w-4 text-gray-500" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-gray-500" />
                                  )}
                                </button>
                              ) : (
                                <span className="inline-block w-5" />
                              )}

                              <span>{ticket.ticketNumber}</span>
                            </div>
                          </TableCell>

                          {/* Title */}
                          <TableCell onClick={() => openEditDialog(ticket)}>
                            <p className="font-medium">{ticket.title}</p>
                          </TableCell>

                          {/* Description */}
                          <TableCell>
                            <p className="text-sm text-gray-600 line-clamp-1">
                              {truncateText(ticket.description, 10)}
                            </p>
                          </TableCell>

                          {/* Status – keep your existing Select */}
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
                              <SelectTrigger className="w-full h-8 border-0 bg-transparent shadow-none hover:bg-muted/50">
                                <SelectValue>
                                  {statusUpdating === ticket.id ? (
                                    "Updating..."
                                  ) : (
                                    <Badge className={statusInfo.color}>
                                      {statusInfo.icon}
                                      {statusInfo.label}
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
                                        {status.label}
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
                              {priorityInfo.label}
                            </Badge>
                          </TableCell>

                          {/* Category - simple line only */}
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Tag className="h-3 w-3 text-gray-400" />
                              <span className="font-medium">
                                {categoryDisplay?.name || "N/A"}
                              </span>
                            </div>
                          </TableCell>

                          {/* Assigned To – keep your existing Select */}
                          <TableCell
                            className="w-[180px]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Select
                              value={ticket.assignedTo?.id || "unassigned"}
                              onValueChange={(value) =>
                                handleQuickAssigneeUpdate(ticket.id, value)
                              }
                              disabled={assigneeUpdating === ticket.id}
                              onOpenChange={(open) => open && fetchAssignees()}
                            >
                              <SelectTrigger className="w-full h-8 border-0 bg-transparent shadow-none hover:bg-muted/50">
                                <SelectValue>
                                  {assigneeUpdating === ticket.id ? (
                                    "Updating..."
                                  ) : ticket.assignedTo ? (
                                    <div className="flex items-center gap-2">
                                      <Avatar className="h-6 w-6">
                                        <AvatarImage
                                          src={
                                            toAvatarUrl(
                                              ticket.assignedTo.avatar,
                                            ) ?? undefined
                                          }
                                        />
                                        <AvatarFallback className="text-xs">
                                          {getInitials(ticket.assignedTo.name)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="text-sm truncate max-w-[100px]">
                                        {ticket.assignedTo.name}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-sm text-gray-400">
                                      Unassigned
                                    </span>
                                  )}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unassigned">
                                  <span className="text-gray-400">
                                    Unassigned
                                  </span>
                                </SelectItem>
                                {assignees.map((assignee) => (
                                  <SelectItem
                                    key={assignee.id}
                                    value={assignee.id}
                                  >
                                    <div className="flex items-center gap-2">
                                      <Avatar className="h-6 w-6">
                                        <AvatarImage
                                          src={
                                            toAvatarUrl(assignee.avatar) ??
                                            undefined
                                          }
                                        />
                                        <AvatarFallback className="text-xs">
                                          {getInitials(assignee.name)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span>
                                        {assignee.name}
                                        {assignee.role && (
                                          <span className="text-xs text-gray-400 ml-1">
                                            ({assignee.role})
                                          </span>
                                        )}
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>

                          {/* Actions */}
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
                                    onClick={() => openEditDialog(ticket)}
                                  >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => openDeleteDialog(ticket)}
                                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
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

                {/* Pagination */}
                {rowsPerPage !== "all" && pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <div className="text-sm text-gray-600">
                      Showing{" "}
                      {(currentPage - 1) *
                        (typeof rowsPerPage === "number" ? rowsPerPage : 25) +
                        1}{" "}
                      to{" "}
                      {Math.min(
                        currentPage *
                          (typeof rowsPerPage === "number" ? rowsPerPage : 25),
                        pagination.total,
                      )}{" "}
                      of {formatNumber(pagination.total)} tickets
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
                      <div className="text-sm">
                        Page {formatNumber(currentPage)} of{" "}
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
              </>
            )}
          </CardContent>
        </Card>
      </div>
      {/* ==========================================
          CREATE TICKET DIALOG
          ========================================== */}
      <Dialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          if (!open) handleCreateDialogClose();
          setShowCreateDialog(open);
        }}
      >
        <DialogContent className="w-[90vw] sm:max-w-[90%] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Ticket</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title" className="mb-2">
                    Title *
                  </Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="Ticket title"
                  />
                </div>

                {/* Category:
                    - No parent selected → ALL categories with hierarchy tree
                    - Parent selected (creating as child) → leaf categories only
                */}
                <div>
                  <Label htmlFor="category" className="mb-2">
                    Category *
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      setFormData({ ...formData, category: value })
                    }
                    disabled={
                      formData.parentTicketId
                        ? childCategories.length === 0
                        : categoriesWithIndent.length === 0
                    }
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          formData.parentTicketId
                            ? childCategories.length === 0
                              ? "No leaf categories available"
                              : "Select category"
                            : categoriesWithIndent.length === 0
                              ? "Loading categories..."
                              : "Select category"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.parentTicketId ? (
                        // Creating under a parent → only that category's branch
                        // Features → User Story (NOT Bugs/Task)
                        (() => {
                          const parentT =
                            tickets.find(
                              (t) => t.id === formData.parentTicketId,
                            ) || null;
                          const parentCatId = getTicketCategoryId(parentT);
                          const opts = parentCatId
                            ? getCategoriesUnderParentCategory(parentCatId)
                            : [];
                          if (opts.length === 0) {
                            return (
                              <SelectItem value="loading" disabled>
                                No categories under parent branch
                              </SelectItem>
                            );
                          }
                          return opts.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ));
                        })()
                      ) : // Main Create New Ticket → full hierarchy tree
                      categoriesWithIndent.length === 0 ? (
                        <SelectItem value="loading" disabled>
                          Loading categories...
                        </SelectItem>
                      ) : (
                        categoriesWithIndent.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            <span className="font-mono text-sm whitespace-pre">
                              {cat.displayName}
                            </span>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {formData.parentTicketId && childCategories.length === 0 && (
                    <p className="text-xs text-yellow-500 mt-1">
                      No leaf categories. Create leaf categories first.
                    </p>
                  )}
                  {!formData.parentTicketId &&
                    categoriesWithIndent.length === 0 && (
                      <p className="text-xs text-yellow-500 mt-1">
                        Loading categories...
                      </p>
                    )}
                </div>

                <div className="col-span-2">
                  <Label htmlFor="description" className="mb-2">
                    Description
                  </Label>
                  <textarea
                    id="description"
                    className="w-full min-h-[100px] p-2 rounded-md border border-input bg-background"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Describe the issue in detail"
                  />
                </div>

                <div>
                  <Label htmlFor="priority" className="mb-2">
                    Priority
                  </Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) =>
                      setFormData({ ...formData, priority: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      {priorityOptions.map((priority) => (
                        <SelectItem key={priority.value} value={priority.value}>
                          {priority.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="assignedTo" className="mb-2">
                    Assignee To
                  </Label>
                  <Select
                    value={formData.assignedToId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, assignedToId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {assignees.map((assignee) => (
                        <SelectItem key={assignee.id} value={assignee.id}>
                          {assignee.name} ({assignee.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2">
                  <Label htmlFor="parentTicket" className="mb-2">
                    Parent Ticket
                  </Label>
                  <Select
                    value={formData.parentTicketId || "none"}
                    onValueChange={(value) => {
                      const newParentId = value === "none" ? "" : value;
                      setFormData({
                        ...formData,
                        parentTicketId: newParentId,
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select parent ticket (optional)">
                        {formData.parentTicketId
                          ? formatParentTicketLabel(formData.parentTicketId)
                          : null}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {getParentTicketOptions({
                        currentCategoryId: formData.category
                          ? String(formData.category)
                          : "",
                        currentParentId: formData.parentTicketId || "",
                        excludeTicketId: "",
                      }).map((ticket) => (
                        <SelectItem key={ticket.id} value={ticket.id}>
                          {ticket.ticketNumber
                            ? `${ticket.ticketNumber} — ${ticket.title}`
                            : ticket.title || ticket.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Attachments */}
                <div className="col-span-2">
                  <Label className="mb-2">Attachments</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={triggerFileUpload}
                      className="flex items-center gap-2"
                    >
                      <Paperclip className="h-4 w-4" />
                      Add Files
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleFileChange}
                      accept=".pdf,.jpg,.jpeg,.png"
                    />
                    {attachments.length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={clearAllFiles}
                        className="text-red-500"
                      >
                        Clear All
                      </Button>
                    )}
                  </div>
                  {attachments.length > 0 && (
                    <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                      {attachments.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-gray-50 dark:bg-muted/30 rounded-md border"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <FileIcon fileType={file.type} />
                            <span className="text-sm truncate">
                              {file.name}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatFileSize(file.size)}
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Comments Section - Create */}
                <div className="col-span-2">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Comment
                  </Label>

                  <div className="mt-2  bg-white">
                    <div className="space-y-3">
                      <textarea
                        value={formData.comment || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, comment: e.target.value })
                        }
                        placeholder="Add a comment..."
                        className="w-full min-h-[80px] p-3 border border-gray-200 dark:border-gray-700 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-background"
                      />

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={triggerCommentFileUpload}
                            className="h-8"
                          >
                            <Paperclip className="h-4 w-4 mr-1" />
                            Add Attachment
                          </Button>
                        </div>
                        <input
                          ref={commentFileInputRef}
                          type="file"
                          multiple
                          className="hidden"
                          onChange={handleCommentFileChange}
                          accept=".pdf,.jpg,.jpeg,.png"
                        />

                        {commentAttachments.length > 0 && (
                          <div className="space-y-1">
                            {commentAttachments.map((file, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-3 p-2 bg-white dark:bg-background rounded border"
                              >
                                <FileIcon fileType={file.type} />
                                <span className="text-sm truncate flex-1">
                                  {file.name}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {formatFileSize(file.size)}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeCommentFile(index)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t">
                        <Button
                          type="button"
                          onClick={handleSaveCommentInCreate}
                          disabled={
                            !formData.comment?.trim() &&
                            commentAttachments.length === 0
                          }
                          className="flex-1 sm:flex-none"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Save Comment
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleCancelCommentInCreate}
                          className="flex-1 sm:flex-none"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>

                  {savedComments.length > 0 && (
                    <div className="mt-4">
                      <h5 className="text-sm font-medium text-gray-600 dark:text-muted-foreground mb-2">
                        Saved Comments ({savedComments.length})
                      </h5>
                      <div className="space-y-3 max-h-[200px] overflow-y-auto">
                        {savedComments.map((comment, index) => (
                          <div
                            key={comment.id || index}
                            className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-background"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                #{index + 1}
                              </Badge>
                              <span className="text-xs text-gray-400">
                                {format(
                                  new Date(comment.createdAt),
                                  "MMM dd, yyyy HH:mm",
                                )}
                              </span>
                            </div>
                            <p className="text-sm whitespace-pre-wrap">
                              {comment.text}
                            </p>
                            {comment.attachments.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {comment.attachments.map((file, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center gap-2 text-xs text-gray-500"
                                  >
                                    <Paperclip className="h-3 w-3" />
                                    <span>{file.name}</span>
                                    <span>({formatFileSize(file.size)})</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCreateDialogClose}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={uploading || categoriesWithIndent.length === 0}
            >
              {uploading
                ? "Creating..."
                : categoriesWithIndent.length === 0
                  ? "Loading..."
                  : "Create Ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==========================================
          EDIT TICKET DIALOG
          ========================================== */}
      <Dialog
        open={showEditDialog}
        onOpenChange={(open) => {
          if (!open) handleEditDialogClose();
          setShowEditDialog(open);
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Ticket</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-2">Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                />
              </div>

              {/* Category — always read-only on edit (parent or child) */}
              <div>
                <Label className="mb-2">Category</Label>
                <div className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                  {flatCategories.find((cat) => cat.id === formData.category)
                    ?.name ||
                    parentCategories.find((cat) => cat.id === formData.category)
                      ?.name ||
                    formData.category ||
                    "No category selected"}
                </div>
              </div>
              <div className="col-span-2">
                <Label className="mb-2">Description </Label>
                <textarea
                  className="w-full min-h-[100px] p-2 rounded-md border border-input bg-background"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>
              <div>
                <Label className="mb-2">Status</Label>
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
              <div>
                <Label className="mb-2">Priority</Label>
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
                      <SelectItem key={priority.value} value={priority.value}>
                        {priority.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label className="mb-2">Assignee To</Label>
                <Select
                  value={formData.assignedToId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, assignedToId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {assignees.map((assignee) => (
                      <SelectItem key={assignee.id} value={assignee.id}>
                        {assignee.name} ({assignee.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <Label className="mb-2">Parent Ticket</Label>
                <Select
                  value={formData.parentTicketId || "none"}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      parentTicketId: value === "none" ? "" : value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent ticket (optional)">
                      {formData.parentTicketId
                        ? formatParentTicketLabel(
                            formData.parentTicketId,
                            editingTicket?.parentTicket,
                          )
                        : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {getParentTicketOptions({
                      currentCategoryId: formData.category
                        ? String(formData.category)
                        : "",
                      currentParentId: formData.parentTicketId || "",
                      excludeTicketId: editingTicket?.id || "",
                    }).map((ticket) => (
                      <SelectItem key={ticket.id} value={ticket.id}>
                        {ticket.ticketNumber
                          ? `${ticket.ticketNumber} — ${ticket.title}`
                          : ticket.title || ticket.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Edit Attachments */}
              <div className="col-span-2">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Paperclip className="h-4 w-4" />
                  Attachments
                  <Badge variant="secondary" className="ml-auto">
                    {editExistingAttachments.length + editAttachments.length}
                  </Badge>
                </h4>
                <div className="flex items-center gap-2 mt-1 mb-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={triggerEditFileUpload}
                    className="flex items-center gap-2"
                  >
                    <Paperclip className="h-4 w-4" />
                    Add Files
                  </Button>
                  <input
                    ref={editFileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleEditFileChange}
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                  {editAttachments.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearEditFiles}
                      className="text-red-500"
                    >
                      Clear New Files
                    </Button>
                  )}
                </div>

                {editAttachments.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {editAttachments.map((file, index) => (
                      <div
                        key={`new-${index}`}
                        className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-950/30 rounded-md border border-green-200"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileIcon fileType={file.type} />
                          <span className="text-sm truncate">{file.name}</span>
                          <span className="text-xs text-gray-500">
                            {formatFileSize(file.size)} (New)
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeEditFile(index)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {editExistingAttachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm text-gray-500">
                      Current Attachments:
                    </p>
                    {editExistingAttachments.map((attachment: any) => (
                      <div
                        key={attachment.id}
                        className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-muted/30 rounded-lg border"
                      >
                        <FileIcon fileType={attachment.fileType} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {attachment.fileName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(attachment.fileSize)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            downloadAttachment(
                              editingTicket?.id || "",
                              attachment.id,
                              attachment.fileName,
                            )
                          }
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markForDeletion(attachment.id)}
                          className="text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Comments Section - Edit with Edit/Delete */}
              <div className="col-span-2">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Comments
                  <Badge variant="secondary" className="ml-auto">
                    {editSavedComments.length}
                  </Badge>
                </Label>

                {/* Existing Comments with Edit/Delete */}
                {editSavedComments.length > 0 && (
                  <div className="mt-2 space-y-3 max-h-[300px] overflow-y-auto">
                    {editSavedComments.map((comment, index) => (
                      <div
                        key={comment.id}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-muted/20"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                #{index + 1}
                              </Badge>
                              <span className="text-xs text-gray-400">
                                {format(
                                  new Date(comment.createdAt),
                                  "MMM dd, yyyy HH:mm",
                                )}
                              </span>
                              {comment.isExisting && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs bg-green-100 text-green-600"
                                >
                                  Existing
                                </Badge>
                              )}
                            </div>

                            {editingCommentId === comment.id ? (
                              // Edit mode
                              <div className="space-y-2">
                                <textarea
                                  value={editingCommentText}
                                  onChange={(e) =>
                                    setEditingCommentText(e.target.value)
                                  }
                                  className="w-full min-h-[60px] p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-background"
                                />
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => saveEditComment(comment.id)}
                                  >
                                    <Check className="h-3 w-3 mr-1" />
                                    Save
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={cancelEditComment}
                                  >
                                    <X className="h-3 w-3 mr-1" />
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              // View mode
                              <p className="text-sm whitespace-pre-wrap">
                                {comment.text}
                              </p>
                            )}

                            {comment.attachments.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {comment.attachments.map((file, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center gap-2 text-xs text-gray-500"
                                  >
                                    <Paperclip className="h-3 w-3" />
                                    <span>{file.name}</span>
                                    <span>({formatFileSize(file.size)})</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {editingCommentId !== comment.id && (
                            <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  startEditComment(comment.id, comment.text)
                                }
                                className="h-7 w-7 p-0"
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteEditComment(comment.id)}
                                className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add New Comment in Edit */}
                <div className="mt-2 bg-white">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">
                      Add New Comment
                    </Label>
                    <textarea
                      value={editCommentText}
                      onChange={(e) => setEditCommentText(e.target.value)}
                      placeholder="Add a new comment..."
                      className="w-full min-h-[80px] p-3 border border-gray-200 dark:border-gray-700 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-background"
                    />

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={triggerEditCommentFileUpload}
                          className="h-8"
                        >
                          <Paperclip className="h-4 w-4 mr-1" />
                          Add Attachment
                        </Button>
                      </div>
                      <input
                        ref={editCommentFileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handleEditCommentFileChange}
                        accept=".pdf,.jpg,.jpeg,.png"
                      />

                      {editCommentAttachments.length > 0 && (
                        <div className="space-y-1">
                          {editCommentAttachments.map((file, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-3 p-2 bg-white dark:bg-background rounded border"
                            >
                              <FileIcon fileType={file.type} />
                              <span className="text-sm truncate flex-1">
                                {file.name}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatFileSize(file.size)}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeEditCommentFile(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Button
                        type="button"
                        onClick={handleSaveCommentInEdit}
                        disabled={
                          !editCommentText?.trim() &&
                          editCommentAttachments.length === 0
                        }
                        className="flex-1 sm:flex-none"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Save Comment
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancelCommentInEdit}
                        className="flex-1 sm:flex-none"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Child Tickets Section */}

              {editingTicket && (
                <div className="mb-6 col-span-2">
                  {/* Header */}
                  {/* Header - Child Tickets + Create Button (same line) */}
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-600 dark:text-muted-foreground flex items-center gap-2">
                      <span>Tickets</span>
                      <Badge variant="secondary" className="text-xs">
                        {childTicketsList.length}
                      </Badge>
                    </h4>

                    <div className="flex items-center gap-2">
                      {loadingChildTickets && (
                        <span className="text-sm text-gray-400">
                          Loading...
                        </span>
                      )}

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="bg-white border hover:bg-gray-50"
                        onClick={() => {
                          setCreatingChildUnderId(editingTicket?.id || null);
                          setShowChildDialog(true);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1.5" />
                        Create New Ticket
                      </Button>
                    </div>
                  </div>

                  {/* Child Tickets Table */}
                  {childTicketsList.length > 0 ? (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[100px]">ID</TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Priority</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Assigned To</TableHead>
                            <TableHead className="text-right">
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getVisibleChildTableRows().map((child) => {
                            const statusInfo = getStatusBadge(child.status);
                            const priorityInfo = getPriorityBadge(
                              child.priority,
                            );
                            const categoryDisplay = flatCategories.find(
                              (cat) => cat.id === child.category,
                            );
                            const depth = child._depth || 0;
                            const isExpanded = !!expandedTickets[child.id];
                            const isLoadingKids = !!loadingChildren[child.id];
                            const cachedKids = ticketChildrenCache[child.id];
                            const canExpand =
                              child.hasChildren === true ||
                              (cachedKids?.length ?? 0) > 0;

                            return (
                              <TableRow
                                key={`${child.id}-${depth}`}
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => openChildEditDialog(child)}
                              >
                                {/* ID + hierarchy expand */}
                                <TableCell className="text-sm text-gray-500 font-mono">
                                  <div
                                    className="flex items-center gap-1"
                                    style={{ paddingLeft: `${depth * 16}px` }}
                                  >
                                    {canExpand ? (
                                      <button
                                        type="button"
                                        onClick={(e) =>
                                          toggleTicketExpand(e, child)
                                        }
                                        className="p-0.5 rounded hover:bg-muted"
                                        disabled={isLoadingKids}
                                      >
                                        {isLoadingKids ? (
                                          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
                                        ) : isExpanded ? (
                                          <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
                                        ) : (
                                          <ChevronRight className="h-3.5 w-3.5 text-gray-500" />
                                        )}
                                      </button>
                                    ) : (
                                      <span className="inline-block w-4" />
                                    )}
                                    <span className="text-xs font-mono text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 rounded">
                                      #{child.ticketNumber}
                                    </span>
                                  </div>
                                </TableCell>

                                {/* Title */}
                                <TableCell>
                                  <p className="font-medium text-sm">
                                    {child.title}
                                  </p>
                                </TableCell>

                                {/* Description */}
                                <TableCell>
                                  <p className="text-sm text-gray-600 line-clamp-1">
                                    {child.description
                                      ? truncateText
                                        ? truncateText(child.description, 10)
                                        : child.description.slice(0, 40) + "..."
                                      : "—"}
                                  </p>
                                </TableCell>

                                {/* Status — quick update like main table */}
                                <TableCell
                                  className="w-[140px]"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Select
                                    value={child.status}
                                    onValueChange={(value) =>
                                      handleQuickStatusUpdate(child.id, value)
                                    }
                                    disabled={statusUpdating === child.id}
                                  >
                                    <SelectTrigger className="w-full h-8 border-0 bg-transparent shadow-none hover:bg-muted/50">
                                      <SelectValue>
                                        {statusUpdating === child.id ? (
                                          "Updating..."
                                        ) : (
                                          <Badge
                                            className={cn(
                                              statusInfo.color,
                                              "text-xs",
                                            )}
                                          >
                                            {statusInfo.icon}
                                            {statusInfo.label}
                                          </Badge>
                                        )}
                                      </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                      {statusOptions.map((status) => {
                                        const info = getStatusBadge(
                                          status.value,
                                        );
                                        return (
                                          <SelectItem
                                            key={status.value}
                                            value={status.value}
                                          >
                                            <Badge className={info.color}>
                                              {info.icon}
                                              {status.label}
                                            </Badge>
                                          </SelectItem>
                                        );
                                      })}
                                    </SelectContent>
                                  </Select>
                                </TableCell>

                                {/* Priority */}
                                <TableCell>
                                  <Badge
                                    className={cn(
                                      priorityInfo.color,
                                      "text-xs",
                                    )}
                                  >
                                    {priorityInfo.icon}
                                    {priorityInfo.label}
                                  </Badge>
                                </TableCell>

                                {/* Category */}
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Tag className="h-3 w-3 text-gray-400" />
                                    <span className="text-sm font-medium">
                                      {categoryDisplay?.name || "N/A"}
                                    </span>
                                  </div>
                                </TableCell>

                                {/* Assigned To — quick update like main table */}
                                <TableCell
                                  className="w-[180px]"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Select
                                    value={
                                      child.assignedTo?.id || "unassigned"
                                    }
                                    onValueChange={(value) =>
                                      handleQuickAssigneeUpdate(
                                        child.id,
                                        value,
                                      )
                                    }
                                    disabled={assigneeUpdating === child.id}
                                    onOpenChange={(open) =>
                                      open && fetchAssignees()
                                    }
                                  >
                                    <SelectTrigger className="w-full h-8 border-0 bg-transparent shadow-none hover:bg-muted/50">
                                      <SelectValue>
                                        {assigneeUpdating === child.id ? (
                                          "Updating..."
                                        ) : child.assignedTo ? (
                                          <div className="flex items-center gap-2">
                                            <Avatar className="h-6 w-6">
                                              <AvatarImage
                                                src={
                                                  toAvatarUrl?.(
                                                    child.assignedTo.avatar,
                                                  ) ?? undefined
                                                }
                                              />
                                              <AvatarFallback className="text-xs">
                                                {getInitials?.(
                                                  child.assignedTo.name,
                                                ) ||
                                                  child.assignedTo.name?.charAt(
                                                    0,
                                                  )}
                                              </AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm truncate max-w-[100px]">
                                              {child.assignedTo.name}
                                            </span>
                                          </div>
                                        ) : (
                                          <span className="text-sm text-gray-400">
                                            Unassigned
                                          </span>
                                        )}
                                      </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="unassigned">
                                        <span className="text-gray-400">
                                          Unassigned
                                        </span>
                                      </SelectItem>
                                      {assignees.map((assignee) => (
                                        <SelectItem
                                          key={assignee.id}
                                          value={assignee.id}
                                        >
                                          <div className="flex items-center gap-2">
                                            <Avatar className="h-6 w-6">
                                              <AvatarImage
                                                src={
                                                  toAvatarUrl?.(
                                                    assignee.avatar,
                                                  ) ?? undefined
                                                }
                                              />
                                              <AvatarFallback className="text-xs">
                                                {getInitials(assignee.name)}
                                              </AvatarFallback>
                                            </Avatar>
                                            <span>
                                              {assignee.name}
                                              {assignee.role && (
                                                <span className="text-xs text-gray-400 ml-1">
                                                  ({assignee.role})
                                                </span>
                                              )}
                                            </span>
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </TableCell>

                                {/* Actions */}
                                <TableCell className="text-right">
                                  <div
                                    className="flex justify-end gap-1"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                      onClick={() => openChildEditDialog(child)}
                                      title="Edit"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                      onClick={() =>
                                        handleDeleteChildTicket(child)
                                      }
                                      title="Delete"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    !loadingChildTickets && (
                      <div className="p-8 text-center text-sm text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                        <div className="flex flex-col items-center gap-2">
                          <Ticket className="h-8 w-8 text-gray-300" />
                          <p>No tickets yet</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setCreatingChildUnderId(
                                editingTicket?.id || null,
                              );
                              setShowChildDialog(true);
                            }}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Create First Ticket
                          </Button>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleEditDialogClose}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={uploading}
            >
              {uploading ? "Updating..." : "Update Ticket"}
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
            <DialogTitle>Delete Ticket</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the
              ticket and all associated data.
            </DialogDescription>
          </DialogHeader>

          {deletingTicket && (
            <div className="py-4">
              <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
                <div>
                  <p className="font-medium text-red-900 dark:text-red-200">
                    Delete ticket <strong>{deletingTicket.title}</strong>?
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    ID: {deletingTicket.ticketNumber}
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
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete Ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==========================================
          DELETE CHILD TICKET DIALOG
          ========================================== */}
      <Dialog
        open={showDeleteChildDialog}
        onOpenChange={setShowDeleteChildDialog}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Ticket</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the
              ticket and all associated data.
            </DialogDescription>
          </DialogHeader>
          {deletingChildTicket && (
            <div className="py-4">
              <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
                <div>
                  <p className="font-medium text-red-900 dark:text-red-200">
                    Delete ticket{" "}
                    <strong>{deletingChildTicket.title}</strong>?
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    ID: {deletingChildTicket.ticketNumber}
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteChildDialog(false);
                setDeletingChildTicket(null);
              }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDeleteChildTicket}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete Ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==========================================
    CHILD CREATE TICKET DIALOG
    ========================================== */}
      <Dialog
        open={showChildDialog}
        onOpenChange={(open) => {
          if (!open) resetChildForm();
          else setShowChildDialog(open);
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Ticket</DialogTitle>
            <DialogDescription>
              Create a new child ticket under{" "}
              {editingChildTicket &&
              creatingChildUnderId === editingChildTicket.id
                ? editingChildTicket.title
                : editingTicket?.title || "parent ticket"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              {/* Title */}
              <div>
                <Label className="mb-2">Title *</Label>
                <Input
                  value={childFormData.title}
                  onChange={(e) =>
                    setChildFormData({
                      ...childFormData,
                      title: e.target.value,
                    })
                  }
                  placeholder="Enter child ticket title"
                />
              </div>

              {/* Category — leaf only, exclude parent ticket's category */}
              <div>
                <Label className="mb-2">Category *</Label>
                <Select
                  value={childFormData.category}
                  onValueChange={(value) =>
                    setChildFormData({ ...childFormData, category: value })
                  }
                  disabled={getCategoriesForChildCreate().length === 0}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        getCategoriesForChildCreate().length === 0
                          ? "No leaf categories available"
                          : "Select category"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {getCategoriesForChildCreate().map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {getCategoriesForChildCreate().length === 0 && (
                  <p className="text-xs text-yellow-500 mt-1">
                    No leaf categories available (parent category excluded).
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="col-span-2">
                <Label className="mb-2">Description</Label>
                <textarea
                  className="w-full min-h-[100px] p-2 rounded-md border border-input bg-background"
                  value={childFormData.description}
                  onChange={(e) =>
                    setChildFormData({
                      ...childFormData,
                      description: e.target.value,
                    })
                  }
                  placeholder="Describe the child ticket issue"
                />
              </div>

              {/* Status */}
              <div>
                <Label className="mb-2">Status</Label>
                <Select
                  value={childFormData.status}
                  onValueChange={(value) =>
                    setChildFormData({ ...childFormData, status: value })
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
                <Label className="mb-2">Priority</Label>
                <Select
                  value={childFormData.priority}
                  onValueChange={(value) =>
                    setChildFormData({ ...childFormData, priority: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map((priority) => (
                      <SelectItem key={priority.value} value={priority.value}>
                        {priority.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Assign To */}
              <div className="col-span-2">
                <Label className="mb-2">Assignee To</Label>
                <Select
                  value={childFormData.assignedToId || "unassigned"}
                  onValueChange={(value) =>
                    setChildFormData({
                      ...childFormData,
                      assignedToId: value === "unassigned" ? "" : value,
                    })
                  }
                  onOpenChange={(open) => open && fetchAssignees()}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {assignees.map((assignee) => (
                      <SelectItem key={assignee.id} value={assignee.id}>
                        {assignee.name}
                        {assignee.role ? ` (${assignee.role})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Attachments */}
              <div className="col-span-2">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Paperclip className="h-4 w-4" />
                  Attachments
                  <Badge variant="secondary" className="ml-auto">
                    {childAttachments.length}
                  </Badge>
                </h4>
                <div className="flex items-center gap-2 mt-1 mb-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={triggerChildFileUpload}
                    className="flex items-center gap-2"
                  >
                    <Paperclip className="h-4 w-4" />
                    Add Files
                  </Button>
                  <input
                    ref={childFileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleChildFileChange}
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                  {childAttachments.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        // clear all new files if you have a clear function
                        // clearChildFiles();
                      }}
                      className="text-red-500"
                    >
                      Clear New Files
                    </Button>
                  )}
                </div>

                {childAttachments.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {childAttachments.map((file, index) => (
                      <div
                        key={`new-${index}`}
                        className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-950/30 rounded-md border border-green-200"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileIcon fileType={file.type} />
                          <span className="text-sm truncate">{file.name}</span>
                          <span className="text-xs text-gray-500">
                            {formatFileSize(file.size)} (New)
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeChildFile(index)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Comments */}
              <div className="col-span-2">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Comments
                  <Badge variant="secondary" className="ml-auto">
                    {childSavedComments.length}
                  </Badge>
                </Label>

                {/* Existing Comments */}
                {childSavedComments.length > 0 && (
                  <div className="mt-2 space-y-3 max-h-[300px] overflow-y-auto">
                    {childSavedComments.map((comment, index) => (
                      <div
                        key={comment.id}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-muted/20"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                #{index + 1}
                              </Badge>
                              <span className="text-xs text-gray-400">
                                {format(
                                  new Date(comment.createdAt),
                                  "MMM dd, yyyy HH:mm",
                                )}
                              </span>
                            </div>
                            <p className="text-sm whitespace-pre-wrap">
                              {comment.text}
                            </p>
                            {comment.attachments?.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {comment.attachments.map(
                                  (file: any, idx: number) => (
                                    <div
                                      key={idx}
                                      className="flex items-center gap-2 text-xs text-gray-500"
                                    >
                                      <Paperclip className="h-3 w-3" />
                                      <span>{file.name}</span>
                                      <span>({formatFileSize(file.size)})</span>
                                    </div>
                                  ),
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add New Comment */}
                <div className="mt-2 bg-white dark:bg-background">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">
                      Add New Comment
                    </Label>
                    <textarea
                      value={childCommentText}
                      onChange={(e) => setChildCommentText(e.target.value)}
                      placeholder="Add a new comment..."
                      className="w-full min-h-[80px] p-3 border border-gray-200 dark:border-gray-700 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-background"
                    />

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={triggerChildCommentFileUpload}
                          className="h-8"
                        >
                          <Paperclip className="h-4 w-4 mr-1" />
                          Add Attachment
                        </Button>
                      </div>
                      <input
                        ref={childCommentFileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handleChildCommentFileChange}
                        accept=".pdf,.jpg,.jpeg,.png"
                      />

                      {childCommentAttachments.length > 0 && (
                        <div className="space-y-1">
                          {childCommentAttachments.map((file, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-3 p-2 bg-white dark:bg-background rounded border"
                            >
                              <FileIcon fileType={file.type} />
                              <span className="text-sm truncate flex-1">
                                {file.name}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatFileSize(file.size)}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeChildCommentFile(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Button
                        type="button"
                        onClick={handleSaveChildComment}
                        disabled={
                          !childCommentText?.trim() &&
                          childCommentAttachments.length === 0
                        }
                        className="flex-1 sm:flex-none"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Save Comment
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancelChildComment}
                        className="flex-1 sm:flex-none"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetChildForm}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateChildTicket}
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={uploading}
            >
              {uploading ? "Creating..." : "Create New Ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* ==========================================
    CHILD EDIT TICKET DIALOG
    ========================================== */}
      <Dialog
        open={showChildEditDialog}
        onOpenChange={(open) => {
          if (!open) {
            // X → previous nested level (last page), not top parent
            handleBackChildEdit();
          } else {
            setShowChildEditDialog(open);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Ticket</DialogTitle>
            <DialogDescription>
              Editing: {editingChildTicket?.ticketNumber} -{" "}
              {editingChildTicket?.title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              {/* Title */}
              <div>
                <Label className="mb-2">Title *</Label>
                <Input
                  value={childEditForm.title}
                  onChange={(e) =>
                    setChildEditForm({
                      ...childEditForm,
                      title: e.target.value,
                    })
                  }
                  placeholder="Enter child ticket title"
                />
              </div>

              {/* Category — read-only on edit */}
              <div>
                <Label className="mb-2">Category</Label>
                <div className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                  {flatCategories.find(
                    (cat) => cat.id === childEditForm.category,
                  )?.name ||
                    childEditForm.category ||
                    "No category selected"}
                </div>
              </div>

              {/* Description */}
              <div className="col-span-2">
                <Label className="mb-2">Description</Label>
                <textarea
                  className="w-full min-h-[100px] p-2 rounded-md border border-input bg-background"
                  value={childEditForm.description}
                  onChange={(e) =>
                    setChildEditForm({
                      ...childEditForm,
                      description: e.target.value,
                    })
                  }
                  placeholder="Describe the child ticket issue"
                />
              </div>

              {/* Status */}
              <div>
                <Label className="mb-2">Status</Label>
                <Select
                  value={childEditForm.status}
                  onValueChange={(value) =>
                    setChildEditForm({ ...childEditForm, status: value })
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
                <Label className="mb-2">Priority</Label>
                <Select
                  value={childEditForm.priority}
                  onValueChange={(value) =>
                    setChildEditForm({ ...childEditForm, priority: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map((priority) => (
                      <SelectItem key={priority.value} value={priority.value}>
                        {priority.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Assign To */}
              <div className="col-span-2">
                <Label className="mb-2">Assignee To</Label>
                <Select
                  value={childEditForm.assignedToId || "unassigned"}
                  onValueChange={(value) =>
                    setChildEditForm({
                      ...childEditForm,
                      assignedToId: value === "unassigned" ? "" : value,
                    })
                  }
                  onOpenChange={(open) => open && fetchAssignees()}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {assignees.map((assignee) => (
                      <SelectItem key={assignee.id} value={assignee.id}>
                        {assignee.name}
                        {assignee.role ? ` (${assignee.role})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Parent Ticket — same option as main edit */}
              <div className="col-span-2">
                <Label className="mb-2">Parent Ticket</Label>
                <Select
                  value={childEditForm.parentTicketId || "none"}
                  onValueChange={(value) =>
                    setChildEditForm({
                      ...childEditForm,
                      parentTicketId: value === "none" ? "" : value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent ticket (optional)">
                      {childEditForm.parentTicketId
                        ? formatParentTicketLabel(
                            childEditForm.parentTicketId,
                            editingChildTicket?.parentTicket ||
                              (editingTicket?.id ===
                              childEditForm.parentTicketId
                                ? {
                                    id: editingTicket.id,
                                    title: editingTicket.title,
                                    ticketNumber: editingTicket.ticketNumber,
                                  }
                                : null),
                          )
                        : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {getParentTicketOptions({
                      currentCategoryId: childEditForm.category
                        ? String(childEditForm.category)
                        : "",
                      currentParentId: childEditForm.parentTicketId || "",
                      excludeTicketId: editingChildTicket?.id || "",
                    }).map((ticket) => (
                      <SelectItem key={ticket.id} value={ticket.id}>
                        {ticket.ticketNumber
                          ? `${ticket.ticketNumber} — ${ticket.title}`
                          : ticket.title || ticket.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Attachments */}
              <div className="col-span-2">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Paperclip className="h-4 w-4" />
                  Attachments
                  <Badge variant="secondary" className="ml-auto">
                    {childEditExistingAttachments.length +
                      childEditAttachments.length}{" "}
                    
                  </Badge>
                </h4>
                <div className="flex items-center gap-2 mt-1 mb-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={triggerChildEditFileUpload}
                    className="flex items-center gap-2"
                  >
                    <Paperclip className="h-4 w-4" />
                    Add Files
                  </Button>
                  <input
                    ref={childEditFileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleChildEditFileChange}
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                  {childEditAttachments.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        // clearChildEditFiles();
                      }}
                      className="text-red-500"
                    >
                      Clear New Files
                    </Button>
                  )}
                </div>

                {/* New Attachments */}
                {childEditAttachments.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {childEditAttachments.map((file, index) => (
                      <div
                        key={`new-${index}`}
                        className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-950/30 rounded-md border border-green-200"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileIcon fileType={file.type} />
                          <span className="text-sm truncate">{file.name}</span>
                          <span className="text-xs text-gray-500">
                            {formatFileSize(file.size)} (New)
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeChildEditFile(index)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Existing Attachments */}
                {childEditExistingAttachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm text-gray-500">
                      Current Attachments:
                    </p>
                    {childEditExistingAttachments.map((attachment: any) => (
                      <div
                        key={attachment.id}
                        className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-muted/30 rounded-lg border"
                      >
                        <FileIcon fileType={attachment.fileType} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {attachment.fileName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(attachment.fileSize)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            downloadAttachment(
                              editingChildTicket?.id || "",
                              attachment.id,
                              attachment.fileName,
                            )
                          }
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            markChildEditAttachmentForDeletion(attachment.id)
                          }
                          className="text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Comments */}
              <div className="col-span-2">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Comments
                  <Badge variant="secondary" className="ml-auto">
                    {childEditComments.length}
                  </Badge>
                </Label>

                {/* Existing Comments with Edit/Delete */}
                {childEditComments.length > 0 && (
                  <div className="mt-2 space-y-3 max-h-[300px] overflow-y-auto">
                    {childEditComments.map((comment, index) => (
                      <div
                        key={comment.id}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-muted/20"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                #{index + 1}
                              </Badge>
                              <span className="text-xs text-gray-400">
                                {format(
                                  new Date(comment.createdAt),
                                  "MMM dd, yyyy HH:mm",
                                )}
                              </span>
                              {comment.isExisting && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs bg-green-100 text-green-600"
                                >
                                  Existing
                                </Badge>
                              )}
                            </div>

                            {childEditCommentId === comment.id ? (
                              <div className="space-y-2">
                                <textarea
                                  value={childEditCommentTextEditing}
                                  onChange={(e) =>
                                    setChildEditCommentTextEditing(
                                      e.target.value,
                                    )
                                  }
                                  className="w-full min-h-[60px] p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-background"
                                />
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      saveChildEditComment(comment.id)
                                    }
                                  >
                                    <Check className="h-3 w-3 mr-1" />
                                    Save
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={cancelChildEditComment}
                                  >
                                    <X className="h-3 w-3 mr-1" />
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm whitespace-pre-wrap">
                                {comment.text}
                              </p>
                            )}

                            {comment.attachments?.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {comment.attachments.map(
                                  (file: any, idx: number) => (
                                    <div
                                      key={idx}
                                      className="flex items-center gap-2 text-xs text-gray-500"
                                    >
                                      <Paperclip className="h-3 w-3" />
                                      <span>{file.name}</span>
                                      <span>({formatFileSize(file.size)})</span>
                                    </div>
                                  ),
                                )}
                              </div>
                            )}
                          </div>

                          {childEditCommentId !== comment.id && (
                            <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  startChildEditComment(
                                    comment.id,
                                    comment.text,
                                  )
                                }
                                className="h-7 w-7 p-0"
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  deleteChildEditComment(comment.id)
                                }
                                className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add New Comment */}
                <div className="mt-2 bg-white dark:bg-background">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">
                      Add New Comment
                    </Label>
                    <textarea
                      value={childEditCommentText}
                      onChange={(e) => setChildEditCommentText(e.target.value)}
                      placeholder="Add a new comment..."
                      className="w-full min-h-[80px] p-3 border border-gray-200 dark:border-gray-700 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-background"
                    />

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={triggerChildEditCommentFileUpload}
                          className="h-8"
                        >
                          <Paperclip className="h-4 w-4 mr-1" />
                          Add Attachment
                        </Button>
                      </div>
                      <input
                        ref={childEditCommentFileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handleChildEditCommentFileChange}
                        accept=".pdf,.jpg,.jpeg,.png"
                      />

                      {childEditCommentAttachments.length > 0 && (
                        <div className="space-y-1">
                          {childEditCommentAttachments.map((file, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-3 p-2 bg-white dark:bg-background rounded border"
                            >
                              <FileIcon fileType={file.type} />
                              <span className="text-sm truncate flex-1">
                                {file.name}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatFileSize(file.size)}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  removeChildEditCommentFile(index)
                                }
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Button
                        type="button"
                        onClick={handleSaveChildEditComment}
                        disabled={
                          !childEditCommentText?.trim() &&
                          childEditCommentAttachments.length === 0
                        }
                        className="flex-1 sm:flex-none"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Save Comment
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancelChildEditComment}
                        className="flex-1 sm:flex-none"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Nested Child Tickets (child → child) */}
              {editingChildTicket && (
                <div className="mb-6 col-span-2">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-600 dark:text-muted-foreground flex items-center gap-2">
                      <span>Tickets</span>
                      <Badge variant="secondary" className="text-xs">
                        {subChildTicketsList.length}
                      </Badge>
                    </h4>
                    <div className="flex items-center gap-2">
                      {loadingSubChildTickets && (
                        <span className="text-sm text-gray-400">Loading...</span>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="bg-white border hover:bg-gray-50"
                        onClick={() => {
                          setCreatingChildUnderId(
                            editingChildTicket?.id || null,
                          );
                          setShowChildDialog(true);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1.5" />
                        Create New Ticket
                      </Button>
                    </div>
                  </div>

                  {subChildTicketsList.length > 0 ? (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[100px]">ID</TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Priority</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Assigned To</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getVisibleSubChildTableRows().map((child) => {
                            const statusInfo = getStatusBadge(child.status);
                            const priorityInfo = getPriorityBadge(
                              child.priority,
                            );
                            const categoryDisplay = flatCategories.find(
                              (cat) => cat.id === child.category,
                            );
                            const depth = child._depth || 0;
                            const isExpanded = !!expandedTickets[child.id];
                            const isLoadingKids = !!loadingChildren[child.id];
                            const cachedKids = ticketChildrenCache[child.id];
                            const canExpand =
                              child.hasChildren === true ||
                              (cachedKids?.length ?? 0) > 0;
                            return (
                              <TableRow
                                key={`${child.id}-${depth}`}
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => openChildEditDialog(child)}
                              >
                                <TableCell className="text-sm text-gray-500 font-mono">
                                  <div
                                    className="flex items-center gap-1"
                                    style={{ paddingLeft: `${depth * 16}px` }}
                                  >
                                    {canExpand ? (
                                      <button
                                        type="button"
                                        onClick={(e) =>
                                          toggleTicketExpand(e, child)
                                        }
                                        className="p-0.5 rounded hover:bg-muted"
                                        disabled={isLoadingKids}
                                      >
                                        {isLoadingKids ? (
                                          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
                                        ) : isExpanded ? (
                                          <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
                                        ) : (
                                          <ChevronRight className="h-3.5 w-3.5 text-gray-500" />
                                        )}
                                      </button>
                                    ) : (
                                      <span className="inline-block w-4" />
                                    )}
                                    <span className="text-xs font-mono text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 rounded">
                                      #{child.ticketNumber}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <p className="font-medium text-sm">
                                    {child.title}
                                  </p>
                                </TableCell>
                                <TableCell>
                                  <p className="text-sm text-gray-600 line-clamp-1">
                                    {child.description
                                      ? truncateText(child.description, 10)
                                      : "—"}
                                  </p>
                                </TableCell>
                                <TableCell
                                  className="w-[140px]"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Select
                                    value={child.status}
                                    onValueChange={(value) =>
                                      handleQuickStatusUpdate(child.id, value)
                                    }
                                    disabled={statusUpdating === child.id}
                                  >
                                    <SelectTrigger className="w-full h-8 border-0 bg-transparent shadow-none hover:bg-muted/50">
                                      <SelectValue>
                                        {statusUpdating === child.id ? (
                                          "Updating..."
                                        ) : (
                                          <Badge
                                            className={cn(
                                              statusInfo.color,
                                              "text-xs",
                                            )}
                                          >
                                            {statusInfo.icon}
                                            {statusInfo.label}
                                          </Badge>
                                        )}
                                      </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                      {statusOptions.map((status) => {
                                        const info = getStatusBadge(
                                          status.value,
                                        );
                                        return (
                                          <SelectItem
                                            key={status.value}
                                            value={status.value}
                                          >
                                            <Badge className={info.color}>
                                              {info.icon}
                                              {status.label}
                                            </Badge>
                                          </SelectItem>
                                        );
                                      })}
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    className={cn(
                                      priorityInfo.color,
                                      "text-xs",
                                    )}
                                  >
                                    {priorityInfo.icon}
                                    {priorityInfo.label}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Tag className="h-3 w-3 text-gray-400" />
                                    <span className="text-sm font-medium">
                                      {categoryDisplay?.name || "N/A"}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell
                                  className="w-[180px]"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Select
                                    value={
                                      child.assignedTo?.id || "unassigned"
                                    }
                                    onValueChange={(value) =>
                                      handleQuickAssigneeUpdate(
                                        child.id,
                                        value,
                                      )
                                    }
                                    disabled={assigneeUpdating === child.id}
                                    onOpenChange={(open) =>
                                      open && fetchAssignees()
                                    }
                                  >
                                    <SelectTrigger className="w-full h-8 border-0 bg-transparent shadow-none hover:bg-muted/50">
                                      <SelectValue>
                                        {assigneeUpdating === child.id ? (
                                          "Updating..."
                                        ) : child.assignedTo ? (
                                          <div className="flex items-center gap-2">
                                            <Avatar className="h-6 w-6">
                                              <AvatarImage
                                                src={
                                                  toAvatarUrl?.(
                                                    child.assignedTo.avatar,
                                                  ) ?? undefined
                                                }
                                              />
                                              <AvatarFallback className="text-xs">
                                                {getInitials?.(
                                                  child.assignedTo.name,
                                                ) ||
                                                  child.assignedTo.name?.charAt(
                                                    0,
                                                  )}
                                              </AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm truncate max-w-[100px]">
                                              {child.assignedTo.name}
                                            </span>
                                          </div>
                                        ) : (
                                          <span className="text-sm text-gray-400">
                                            Unassigned
                                          </span>
                                        )}
                                      </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="unassigned">
                                        <span className="text-gray-400">
                                          Unassigned
                                        </span>
                                      </SelectItem>
                                      {assignees.map((assignee) => (
                                        <SelectItem
                                          key={assignee.id}
                                          value={assignee.id}
                                        >
                                          <div className="flex items-center gap-2">
                                            <Avatar className="h-6 w-6">
                                              <AvatarImage
                                                src={
                                                  toAvatarUrl?.(
                                                    assignee.avatar,
                                                  ) ?? undefined
                                                }
                                              />
                                              <AvatarFallback className="text-xs">
                                                {getInitials(assignee.name)}
                                              </AvatarFallback>
                                            </Avatar>
                                            <span>
                                              {assignee.name}
                                              {assignee.role && (
                                                <span className="text-xs text-gray-400 ml-1">
                                                  ({assignee.role})
                                                </span>
                                              )}
                                            </span>
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div
                                    className="flex justify-end gap-1"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                      onClick={() =>
                                        openChildEditDialog(child)
                                      }
                                      title="Edit"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                      onClick={() =>
                                        handleDeleteChildTicket(child)
                                      }
                                      title="Delete"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    !loadingSubChildTickets && (
                      <div className="p-8 text-center text-sm text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                        <div className="flex flex-col items-center gap-2">
                          <Ticket className="h-8 w-8 text-gray-300" />
                          <p>No tickets yet</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setCreatingChildUnderId(
                                editingChildTicket?.id || null,
                              );
                              setShowChildDialog(true);
                            }}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Create First Ticket
                          </Button>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetChildEditForm}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateChildTicket}
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={childEditUploading || !childEditForm.category}
            >
              {childEditUploading ? "Updating..." : "Update Ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageTemplate>
  );
}
