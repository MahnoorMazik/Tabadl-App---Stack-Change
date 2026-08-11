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
  // Collect ONLY true leaf nodes (have parent, no children).
  // Parent categories used by main tickets never appear here.
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
      // roots (no parent) are never added — they stay for parent tickets only
    });
  };

  walk(categories);

  console.log(
    "🔍 FINAL Leaf Categories for Child Tickets:",
    leaves.map((c) => ({ id: c.id, name: c.name, parentId: c.parentId })),
  );

  return leaves.map((cat) => ({
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

  // const fetchChildTickets = useCallback(
  //   async (parentId: string) => {
  //     if (!parentId) return;

  //     setLoadingChildTickets(true);
  //     try {
  //       const response = await axios.get(`/api/support-tickets/children`, {
  //         params: {
  //           parentId: parentId,
  //           excludeTicketId: parentId,
  //         },
  //         headers: token ? { Authorization: `Bearer ${token}` } : {},
  //       });

  //       const children = response.data?.data?.tickets || [];
  //       setChildTicketsList(children);
  //     } catch (error) {
  //       console.error("Error fetching child tickets:", error);
  //       setChildTicketsList([]);
  //     } finally {
  //       setLoadingChildTickets(false);
  //     }
  //   },
  //   [token],
  // );
  const fetchChildTickets = useCallback(
    async (parentId: string) => {
      if (!parentId) return;

      setLoadingChildTickets(true);
      try {
        const response = await axios.get(`/api/support-tickets/children`, {
          params: {
            parentId: parentId,
            excludeTicketId: parentId,
          },
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        const children = response.data?.data?.tickets || [];

        // Dialog list
        setChildTicketsList(children);

        // Main table cache bhi update
        const uniqueMap = new Map<string, SupportTicket>();
        children.forEach((c: SupportTicket) => {
          if (!uniqueMap.has(c.id)) {
            uniqueMap.set(c.id, {
              ...c,
              _isChild: true,
              _parentId: parentId,
              _depth: 1,
            });
          }
        });

        setTicketChildrenCache((prev) => ({
          ...prev,
          [parentId]: Array.from(uniqueMap.values()),
        }));
      } catch (error) {
        console.error("Error fetching child tickets:", error);
        setChildTicketsList([]);
      } finally {
        setLoadingChildTickets(false);
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
      setShowEditDialog(false);
      resetEditForm();
      await fetchTickets();
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
    setDeleting(true);

    try {
      await axios.delete(`/api/support-tickets/${deletingTicket.id}`, {
        headers: { Authorization: `Bearer ${token}` },
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

    try {
      await axios.put(
        `/api/support-tickets/${ticketId}`,
        { status: newStatus },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );

      await fetchTickets(); // parents refresh
      toast({ title: "Success", description: "Ticket updated" });
    } catch (error: any) {
      // Revert
      if (ticket) {
        setTickets((prev) =>
          prev.map((t) =>
            t.id === ticketId ? { ...t, status: ticket.status } : t,
          ),
        );
      }

      // Revert cache bhi
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

  const handleQuickAssigneeUpdate = async (
    ticketId: string,
    assigneeId: string | null,
  ) => {
    setAssigneeUpdating(ticketId);
    const ticket = tickets.find((t) => t.id === ticketId);
    const selectedAssignee = assigneeId
      ? assignees.find((a) => a.id === assigneeId)
      : null;

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
      toast({
        title: "Error",
        description: error.response?.data?.error || "Update failed",
        variant: "destructive",
      });
    } finally {
      setAssigneeUpdating(null);
    }
  };

  // ============================================
  // HANDLERS - File/Attachment
  // ============================================
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
        description: "New comment added to child ticket",
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
    try {
      setViewDialogLoading(true);
      const response = await axios.get(`/api/support-tickets/${ticket.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const fullTicket = response.data?.data || response.data;

      await fetchAssignees();
      await fetchCategories();

      // ✅ CHECK: Is this a child ticket?
      const isChildTicket = !!(
        fullTicket.parentId ||
        fullTicket.parentTicket?.id ||
        fullTicket._parentId ||
        fullTicket._isChild ||
        ticket.parentId ||
        ticket.parentTicket?.id ||
        ticket._parentId ||
        ticket._isChild
      );

      // Load existing comments into edit saved comments
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
      const childCommentBoxes =
        fullTicket.childTickets?.map((ct: any) => ({
          id: `existing-${ct.id}`,
          text: ct.comment || "",
          attachments: ct.attachments || [],
          createdAt: ct.createdAt || new Date().toISOString(),
          isExisting: true,
          originalId: ct.id,
        })) || [];

      setEditingChildSavedComments(
        childTicketsList.map((ct: any) => ({
          id: `existing-${ct.id}`,
          text: ct.comment || "",
          attachments: ct.attachments || [],
          createdAt: ct.createdAt || new Date().toISOString(),
          isExisting: true,
          originalId: ct.id,
        })),
      );

      setEditingTicket(fullTicket);
      setEditExistingAttachments(fullTicket.attachments || []);
      setEditAttachments([]);
      setEditAttachmentsToDelete([]);
      setEditSavedComments(existingComments);
      setEditCommentAttachments([]);
      setEditCommentText("");
      setEditingCommentId(null);
      setEditingCommentText("");

      // ✅ SET: Is child ticket state
      setIsEditingChildTicket(isChildTicket);

      setFormData({
        title: fullTicket.title,
        description: fullTicket.description,
        status: fullTicket.status,
        priority: fullTicket.priority,
        category:
          typeof fullTicket.category === "object"
            ? fullTicket.category?.id || ""
            : fullTicket.category || "",
        comment: fullTicket.comment || "",
        assignedToId: fullTicket.assignedTo?.id || "",
        parentTicketId:
          fullTicket.parentId ||
          fullTicket.parentTicket?.id ||
          fullTicket._parentId ||
          "",
      });
      setShowEditDialog(true);
      await fetchChildTickets(ticket.id);
    } catch (error) {
      console.error("Error fetching ticket details for edit:", error);
      await fetchAssignees();
      await fetchCategories();

      // ✅ CHECK: Is this a child ticket (from error fallback)
      const isChildTicket = !!(
        ticket.parentId ||
        ticket.parentTicket?.id ||
        ticket._parentId ||
        ticket._isChild
      );

      setEditingTicket(ticket);
      setEditExistingAttachments(ticket.attachments || []);
      setEditAttachments([]);
      setEditAttachmentsToDelete([]);
      setEditSavedComments([]);
      setEditCommentAttachments([]);
      setEditCommentText("");
      setEditingCommentId(null);
      setEditingCommentText("");

      // ✅ SET: Is child ticket state
      setIsEditingChildTicket(isChildTicket);

      setFormData({
        title: ticket.title,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        category: ticket.category || "",
        comment: ticket.comment || "",
        assignedToId: ticket.assignedTo?.id || "",
        parentTicketId:
          ticket.parentId || ticket.parentTicket?.id || ticket._parentId || "",
      });
      setShowEditDialog(true);
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

  const getVisibleRows = useCallback((): SupportTicket[] => {
    const result: SupportTicket[] = [];

    // Sirf pure top-level tickets (jin ka koi parent nahi)
    const mainListTickets = tickets.filter((t) => {
      const hasParent =
        !!t.parentId || !!t.parentTicket?.id || !!t._parentId || !!t._isChild;
      return !hasParent;
    });

    const walk = (list: SupportTicket[], depth: number) => {
      const seen = new Set<string>();

      for (const ticket of list) {
        if (seen.has(ticket.id)) continue;
        seen.add(ticket.id);

        result.push({ ...ticket, _depth: depth });

        // Expand hai to children neeche dikhao
        if (expandedTickets[ticket.id] && ticketChildrenCache[ticket.id]) {
          walk(ticketChildrenCache[ticket.id], depth + 1);
        }
      }
    };

    walk(mainListTickets, 0);
    return result;
  }, [tickets, expandedTickets, ticketChildrenCache]);

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

      const uniqueMap = new Map<string, SupportTicket>();
      rawChildren.forEach((c) => {
        if (!uniqueMap.has(c.id)) {
          uniqueMap.set(c.id, {
            ...c,
            _isChild: true,
            _parentId: ticketId,
            _depth: (ticket._depth || 0) + 1,
          });
        }
      });

      const children = Array.from(uniqueMap.values());

      setTicketChildrenCache((prev) => ({ ...prev, [ticketId]: children }));
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
    if (!editingTicket) return;

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
      formDataToSend.append("parentId", editingTicket.id);

      // if (formData.assignedToId && formData.assignedToId !== "unassigned") {
      //   formDataToSend.append("assignedToId", formData.assignedToId);
      // }
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
        description: "Child ticket created successfully",
      });

      setShowChildDialog(false);
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

      if (editingTicket) {
        await fetchChildTickets(editingTicket.id);
      }
    } catch (error: any) {
      console.error("Create Child Ticket Error:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.error || "Failed to create child ticket",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const resetChildForm = () => {
    setShowChildDialog(false);
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

    setDeleting(true);
    try {
      await axios.delete(`/api/support-tickets/${deletingChildTicket.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast({
        title: "Success",
        description: "Child ticket deleted successfully",
      });
      setShowDeleteChildDialog(false);
      setDeletingChildTicket(null);

      if (editingTicket) {
        await fetchChildTickets(editingTicket.id);
        await fetchTickets();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to delete child ticket"),
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

  // Open Child Edit Dialog
  // const openChildEditDialog = (child: SupportTicket) => {
  //   setEditingChildTicket(child);
  //   setChildEditForm({
  //     title: child.title,
  //     description: child.description || "",
  //     status: child.status,
  //     priority: child.priority,
  //     category:
  //       typeof child.category === "object" && child.category
  //         ? (child.category as any).id || ""
  //         : (child.category as string) || "",
  //   });
  //   setChildEditExistingAttachments(child.attachments || []);
  //   setChildEditAttachments([]);
  //   setChildEditAttachmentsToDelete([]);

  //   // Load existing comments
  //   const existingComments = (child.commentBoxes || []).map((box: any) => ({
  //     id: `existing-${box.id}`,
  //     text: box.comment || "",
  //     attachments: box.attachments || [],
  //     createdAt: box.createdAt || new Date().toISOString(),
  //     isExisting: true,
  //     originalId: box.id,
  //   }));
  //   setChildEditComments(existingComments);
  //   setChildEditCommentText("");
  //   setChildEditCommentAttachments([]);
  //   setShowChildEditDialog(true);
  // };

  const openChildEditDialog = (child: SupportTicket) => {
    setEditingChildTicket(child);

    // ✅ Get the category ID properly
    let categoryId = "";
    if (typeof child.category === "object" && child.category) {
      categoryId = (child.category as any).id || "";
    } else {
      categoryId = child.category || "";
    }

    console.log("🔍 Child category ID from ticket:", categoryId);
    console.log("🔍 Available childCategories:", childCategories);

    // ✅ Check if this category exists in childCategories
    const isValidChildCategory = childCategories.some(
      (cat) => cat.id === categoryId,
    );

    // ✅ If not a valid child category, set to empty string
    // if (!isValidChildCategory && categoryId) {
    //   // ✅ Don't set the invalid category - keep it empty
    //   categoryId = "";
    //   toast({
    //     title: "⚠️ Invalid Category",
    //     description:
    //       "This ticket has a parent category. Please select a valid child category.",
    //     variant: "destructive",
    //   });
    // }

    setChildEditForm({
      title: child.title,
      description: child.description || "",
      status: child.status,
      priority: child.priority,
      category: categoryId, // ✅ Will be empty if invalid
      assignedToId: child.assignedTo?.id || "",
    });

    setChildEditExistingAttachments(child.attachments || []);
    setChildEditAttachments([]);
    setChildEditAttachmentsToDelete([]);

    // Load existing comments
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
  };
  // Reset Child Edit Form
  const resetChildEditForm = () => {
    setEditingChildTicket(null);
    setChildEditForm({
      title: "",
      description: "",
      status: "new",
      priority: "medium",
      category: "",
      assignedToId: "",
    });
    setChildEditAttachments([]);
    setChildEditExistingAttachments([]);
    setChildEditAttachmentsToDelete([]);
    setChildEditComments([]);
    setChildEditCommentText("");
    setChildEditCommentAttachments([]);
    setShowChildEditDialog(false);
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

  // Update Child Ticket Handler
  // const handleUpdateChildTicket = async () => {
  //   if (!editingChildTicket) return;

  //   if (!childEditForm.title.trim() || !childEditForm.category) {
  //     toast({
  //       title: "Error",
  //       description: "Please fill in all required fields",
  //       variant: "destructive",
  //     });
  //     return;
  //   }

  //   setChildEditUploading(true);

  //   try {
  //     const updatePayload: any = {
  //       title: childEditForm.title,
  //       description: childEditForm.description,
  //       status: childEditForm.status,
  //       priority: childEditForm.priority,
  //       category: childEditForm.category,
  //       assignedToId:
  //         childEditForm.assignedToId === "unassigned" ||
  //         !childEditForm.assignedToId
  //           ? null
  //           : childEditForm.assignedToId,
  //     };

  //     await axios.put(
  //       `/api/support-tickets/${editingChildTicket.id}`,
  //       updatePayload,
  //       {
  //         headers: token ? { Authorization: `Bearer ${token}` } : {},
  //       },
  //     );

  //     // Delete attachments
  //     for (const attachmentId of childEditAttachmentsToDelete) {
  //       try {
  //         await axios.delete(
  //           `/api/support-tickets/${editingChildTicket.id}/attachments/${attachmentId}`,
  //           { headers: { Authorization: `Bearer ${token}` } },
  //         );
  //       } catch (e) {
  //         console.error("Delete attachment failed:", e);
  //       }
  //     }

  //     // Upload new attachments
  //     if (childEditAttachments.length > 0) {
  //       try {
  //         const fd = new FormData();
  //         childEditAttachments.forEach((file) => fd.append("files", file));
  //         await axios.post(
  //           `/api/support-tickets/${editingChildTicket.id}/attachments`,
  //           fd,
  //           {
  //             headers: {
  //               Authorization: `Bearer ${token}`,
  //               "Content-Type": "multipart/form-data",
  //             },
  //           },
  //         );
  //       } catch (e) {
  //         console.error("Upload attachments failed:", e);
  //       }
  //     }

  //     // Handle new comments
  //     const newComments = childEditComments.filter((c) => !c.isExisting);
  //     if (newComments.length > 0) {
  //       try {
  //         const fd = new FormData();
  //         fd.append(
  //           "commentBoxes",
  //           JSON.stringify(
  //             newComments.map((c) => ({ tempId: c.id, comment: c.text })),
  //           ),
  //         );
  //         newComments.forEach((comment) => {
  //           comment.attachments.forEach((file) => {
  //             fd.append(`comment-${comment.id}`, file);
  //           });
  //         });
  //         await axios.post(
  //           `/api/support-tickets/${editingChildTicket.id}/comments/batch`,
  //           fd,
  //           {
  //             headers: {
  //               Authorization: `Bearer ${token}`,
  //               "Content-Type": "multipart/form-data",
  //             },
  //           },
  //         );
  //       } catch (e) {
  //         console.error("Upload comments failed:", e);
  //       }
  //     }

  //     toast({
  //       title: "Success",
  //       description: "Child ticket updated successfully",
  //     });

  //     resetChildEditForm();
  //     if (editingTicket) {
  //       await fetchChildTickets(editingTicket.id);
  //       await fetchTickets();
  //     }
  //   } catch (error: any) {
  //     console.error("Update Child Error:", error);
  //     toast({
  //       title: "Error",
  //       description: getErrorMessage(error, "Failed to update child ticket"),
  //       variant: "destructive",
  //     });
  //   } finally {
  //     setChildEditUploading(false);
  //   }
  // };

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
        description: "Child ticket updated successfully",
      });

      resetChildEditForm();

      if (editingTicket) {
        // 1. Edit dialog ki list refresh
        await fetchChildTickets(editingTicket.id);

        // 2. Main table ka children cache bhi update karo (important)
        try {
          const res = await axios.get("/api/support-tickets/children", {
            params: {
              parentId: editingTicket.id,
              excludeTicketId: editingTicket.id,
            },
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });

          const rawChildren: SupportTicket[] = res.data?.data?.tickets || [];

          const uniqueMap = new Map<string, SupportTicket>();
          rawChildren.forEach((c) => {
            if (!uniqueMap.has(c.id)) {
              uniqueMap.set(c.id, {
                ...c,
                _isChild: true,
                _parentId: editingTicket.id,
                _depth: 1,
              });
            }
          });

          const children = Array.from(uniqueMap.values());

          setTicketChildrenCache((prev) => ({
            ...prev,
            [editingTicket.id]: children,
          }));
        } catch (err) {
          console.error("Failed to refresh children cache after update", err);
        }

        // 3. Parent tickets list refresh
        await fetchTickets();
      }
    } catch (error: any) {
      console.error("Update Child Error:", error);
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to update child ticket"),
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
                      const canExpand =
                        ticket.hasChildren ||
                        (ticketChildrenCache[ticket.id]?.length ?? 0) > 0;

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

                {/* Category - Show ALL categories */}
                {/* Create  */}
                {/* Category - Show ALL categories with hierarchy */}
                <div>
                  <Label htmlFor="category" className="mb-2">
                    Category *
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      setFormData({ ...formData, category: value })
                    }
                    disabled={categoriesWithIndent.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          categoriesWithIndent.length === 0
                            ? "Loading categories..."
                            : "Select category"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {categoriesWithIndent.length === 0 ? (
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
                  {categoriesWithIndent.length === 0 && (
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
                    Assign To
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
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        parentTicketId: value === "none" ? "" : value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select parent ticket (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {tickets
                        .filter((t) => {
                          const hasParent =
                            !!t.parentId ||
                            !!t.parentTicket?.id ||
                            !!t._parentId ||
                            !!t._isChild;
                          return !hasParent;
                        })
                        .map((ticket) => (
                          <SelectItem key={ticket.id} value={ticket.id}>
                            {ticket.ticketNumber} — {ticket.title}
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
              disabled={uploading || parentCategories.length === 0}
            >
              {uploading
                ? "Creating..."
                : parentCategories.length === 0
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

              {/* Category Field - Disabled for Parent, Enabled for Child */}
              <div>
                <Label className="mb-2">Category</Label>
                {!isEditingChildTicket ? (
                  // For parent tickets - show as read-only text
                  <div className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                    {parentCategories.find(
                      (cat) => cat.id === formData.category,
                    )?.name ||
                      flatCategories.find((cat) => cat.id === formData.category)
                        ?.name ||
                      formData.category ||
                      "No category selected"}
                  </div>
                ) : (
                  // For child tickets - show as select dropdown
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      setFormData({ ...formData, category: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {childCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
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
                <Label className="mb-2">Assign To</Label>
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
                    <SelectValue placeholder="Select parent ticket (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {tickets
                      .filter((t) => {
                        const hasParent =
                          !!t.parentId ||
                          !!t.parentTicket?.id ||
                          !!t._parentId ||
                          !!t._isChild;
                        return !hasParent;
                      })
                      .map((ticket) => (
                        <SelectItem key={ticket.id} value={ticket.id}>
                          {ticket.ticketNumber} — {ticket.title}
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
                    {editExistingAttachments.length + editAttachments.length} /
                    10
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
                  {/* Header - Child Tickets Count + Create Button */}
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-600 dark:text-muted-foreground flex items-center gap-2">
                      <span>Child Tickets</span>
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
                    </div>
                  </div>

                  {/* Child Tickets List - Card Style */}
                  {childTicketsList.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
                      {childTicketsList.map((child) => (
                        <div
                          key={child.id}
                          className="group relative p-4 bg-white dark:bg-muted/20 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-200 cursor-pointer"
                          onClick={() => openChildEditDialog(child)}
                        >
                          {/* Line 1: Ticket Number + Title */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="text-xs font-mono text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 rounded whitespace-nowrap">
                                #{child.ticketNumber}
                              </span>
                              <span className="font-medium text-sm truncate">
                                {child.title}
                              </span>
                            </div>
                            {/* Status Badge - Small */}
                            <Badge
                              className={cn(
                                getStatusBadge(child.status).color,
                                "text-xs px-2 py-0 h-5 whitespace-nowrap flex-shrink-0",
                              )}
                            >
                              {getStatusBadge(child.status).icon}
                              {getStatusBadge(child.status).label}
                            </Badge>
                          </div>

                          {/* Line 2: Priority + Created Date */}
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            <Badge
                              className={cn(
                                getPriorityBadge(child.priority).color,
                                "text-xs px-2 py-0 h-5",
                              )}
                            >
                              {getPriorityBadge(child.priority).icon}
                              {getPriorityBadge(child.priority).label}
                            </Badge>
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(
                                new Date(child.createdAt),
                                "MMM dd, yyyy HH:mm",
                              )}
                            </span>
                          </div>

                          {/* Line 3: Description (truncated) */}
                          {child.description && (
                            <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                              {child.description}
                            </p>
                          )}

                          {/* Line 4: Action Buttons - Bottom Right */}
                          <div
                            className="flex items-center justify-end gap-1 mt-3 pt-2 border-t border-gray-100 dark:border-gray-800"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                              onClick={() => openChildEditDialog(child)}
                              title="Edit this child ticket"
                            >
                              <Edit className="h-3.5 w-3.5 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30"
                              onClick={() => handleDeleteChildTicket(child)}
                              title="Delete this child ticket"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    !loadingChildTickets && (
                      <div className="p-8 text-center text-sm text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                        <div className="flex flex-col items-center gap-2">
                          <Ticket className="h-8 w-8 text-gray-300" />
                          <p>No child tickets yet</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowChildDialog(true)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Create First Child Ticket
                          </Button>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}

              {/* 👇 ADD THIS: Create Child Ticket Button 👇 */}
              <div className="col-span-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full bg-white border hover:bg-gray-50"
                  onClick={() => setShowChildDialog(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Child Ticket from this Ticket
                </Button>
              </div>
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
    CHILD CREATE TICKET DIALOG
    ========================================== */}
      <Dialog open={showChildDialog} onOpenChange={setShowChildDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Child Ticket</DialogTitle>
            <DialogDescription>
              Create a new child ticket under{" "}
              {editingTicket?.title || "parent ticket"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              {/* Title */}
              <div className="col-span-2">
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

              {/* Category - Only show child categories */}
              {/* <div className="col-span-2">
                <Label className="mb-2">Category *</Label>
                <Select
                  value={childFormData.category}
                  onValueChange={(value) =>
                    setChildFormData({ ...childFormData, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {childCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div> */}
              {/* Category - ONLY LEAF categories (parents/Epic/Features hidden) */}
              <div className="col-span-2">
                <Label className="mb-2">Category *</Label>
                <Select
                  value={childFormData.category}
                  onValueChange={(value) =>
                    setChildFormData({ ...childFormData, category: value })
                  }
                  disabled={childCategories.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        childCategories.length === 0
                          ? "No leaf categories available"
                          : "Select category"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {childCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {childCategories.length === 0 && (
                  <p className="text-xs text-yellow-500 mt-1">
                    No leaf categories available. Please create leaf categories
                    first.
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="col-span-2">
                <Label className="mb-2">Description</Label>
                <textarea
                  className="w-full min-h-[80px] p-2 rounded-md border border-input bg-background"
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

              {/* Assign To */}
              <div className="col-span-2">
                <Label className="mb-2">Assign To</Label>
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
              {/* Attachments */}
              <div className="col-span-2">
                <Label className="mb-2">Attachments</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={triggerChildFileUpload}
                  >
                    <Paperclip className="h-4 w-4 mr-1" />
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
                    <span className="text-sm text-gray-500">
                      {childAttachments.length} file(s) selected
                    </span>
                  )}
                </div>
                {childAttachments.length > 0 && (
                  <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                    {childAttachments.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 bg-white dark:bg-background rounded border"
                      >
                        <FileIcon fileType={file.type} />
                        <span className="text-sm truncate flex-1">
                          {file.name}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeChildFile(index)}
                        >
                          <X className="h-4 w-4" />
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
                </Label>

                <div className="mt-2 border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-background">
                  <textarea
                    value={childCommentText}
                    onChange={(e) => setChildCommentText(e.target.value)}
                    placeholder="Add a comment..."
                    className="w-full min-h-[60px] p-2 border border-gray-200 dark:border-gray-700 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-background"
                  />

                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={triggerChildCommentFileUpload}
                    >
                      <Paperclip className="h-4 w-4 mr-1" />
                      Add Attachment
                    </Button>
                    <input
                      ref={childCommentFileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleChildCommentFileChange}
                      accept=".pdf,.jpg,.jpeg,.png"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSaveChildComment}
                      disabled={
                        !childCommentText?.trim() &&
                        childCommentAttachments.length === 0
                      }
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Save
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCancelChildComment}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  </div>

                  {childCommentAttachments.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {childCommentAttachments.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 text-xs"
                        >
                          <Paperclip className="h-3 w-3" />
                          <span>{file.name}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeChildCommentFile(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {childSavedComments.length > 0 && (
                  <div className="mt-3 space-y-2 max-h-[150px] overflow-y-auto">
                    {childSavedComments.map((comment, index) => (
                      <div
                        key={comment.id}
                        className="border rounded-lg p-2 bg-gray-50 dark:bg-muted/20"
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
                        <p className="text-sm">{comment.text}</p>
                        {comment.attachments.length > 0 && (
                          <div className="mt-1 text-xs text-gray-500">
                            {comment.attachments.map((f, i) => (
                              <span key={i}>{f.name} </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
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
              {uploading ? "Creating..." : "Create Child Ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* ==========================================
    CHILD EDIT TICKET DIALOG
    ========================================== */}
      <Dialog open={showChildEditDialog} onOpenChange={setShowChildEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Child Ticket</DialogTitle>
            <DialogDescription>
              Editing: {editingChildTicket?.ticketNumber} -{" "}
              {editingChildTicket?.title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              {/* Title */}
              <div className="col-span-2">
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

              {/* Category - Only show child categories */}
              {/* <div className="col-span-2">
                <Label className="mb-2">Category *</Label>
                <Select
                  value={childEditForm.category || ""}
                  onValueChange={(value) =>
                    setChildEditForm({ ...childEditForm, category: value })
                  }
                  disabled={childCategories.length === 0}
                >
                  <SelectTrigger
                    className={
                      childEditForm.category &&
                      childCategories.length > 0 &&
                      !childCategories.some(
                        (cat) => cat.id === childEditForm.category,
                      )
                        ? "border-red-500 ring-1 ring-red-500"
                        : ""
                    }
                  >
                    <SelectValue
                      placeholder={
                        childCategories.length === 0
                          ? "No child categories available"
                          : childEditForm.category &&
                              !childCategories.some(
                                (cat) => cat.id === childEditForm.category,
                              )
                            ? "⚠️ Invalid - Select child category"
                            : "Select category"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {childCategories.length === 0 ? (
                      <SelectItem value="no-categories" disabled>
                        No child categories available
                      </SelectItem>
                    ) : (
                      childCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>

              
                {childEditForm.category &&
                  childCategories.length > 0 &&
                  !childCategories.some(
                    (cat) => cat.id === childEditForm.category,
                  ) && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Current category is not valid. Please select a child
                      category.
                    </p>
                  )}

                {childCategories.length === 0 && (
                  <p className="text-xs text-yellow-500 mt-1">
                    No child categories available. Please create child
                    categories first.
                  </p>
                )}
              </div> */}
              {/* Category - ONLY LEAF categories (parents/Epic/Features hidden) */}
              <div className="col-span-2">
                <Label className="mb-2">Category *</Label>
                <Select
                  value={childEditForm.category}
                  onValueChange={(value) =>
                    setChildEditForm({ ...childEditForm, category: value })
                  }
                  disabled={childCategories.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        childCategories.length === 0
                          ? "No leaf categories available"
                          : "Select category"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {childCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {childCategories.length === 0 && (
                  <p className="text-xs text-yellow-500 mt-1">
                    No leaf categories available. Please create leaf categories
                    first.
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="col-span-2">
                <Label className="mb-2">Description</Label>
                <textarea
                  className="w-full min-h-[80px] p-2 rounded-md border border-input bg-background"
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
              <div className="col-span-2">
                <Label className="mb-2">Assign To</Label>
                <Select
                  value={childFormData.assignedToId || "unassigned"} // edit: childEditForm
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
                <Label className="mb-2">Attachments</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={triggerChildEditFileUpload}
                  >
                    <Paperclip className="h-4 w-4 mr-1" />
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
                </div>

                {/* New Attachments */}
                {childEditAttachments.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {childEditAttachments.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 bg-green-50 rounded border border-green-200 text-sm"
                      >
                        <FileIcon fileType={file.type} />
                        <span className="truncate flex-1">{file.name}</span>
                        <span className="text-xs text-gray-500">(New)</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeChildEditFile(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Existing Attachments */}
                {childEditExistingAttachments.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-gray-500">
                      Existing Attachments:
                    </p>
                    {childEditExistingAttachments.map((att: any) => (
                      <div
                        key={att.id}
                        className="flex items-center gap-2 p-2 bg-gray-100 rounded border text-sm"
                      >
                        <FileIcon fileType={att.fileType} />
                        <span className="truncate flex-1">{att.fileName}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            markChildEditAttachmentForDeletion(att.id)
                          }
                          className="text-red-500"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Comments */}
              <div className="col-span-2 border-t pt-4">
                <Label className="text-base font-semibold flex items-center gap-2 mb-3">
                  <MessageSquare className="h-4 w-4" />
                  Comments
                  <Badge variant="secondary" className="ml-auto">
                    {childEditComments.length}
                  </Badge>
                </Label>

                {/* Existing Comments */}
                {childEditComments.length > 0 && (
                  <div className="mt-2 space-y-3 max-h-[280px] overflow-y-auto">
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
                                  className="text-xs bg-blue-100 text-blue-700"
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
                <div className="mt-4 bg-white dark:bg-background">
                  <Label className="text-sm font-medium block mb-2">
                    Add New Comment
                  </Label>
                  <textarea
                    value={childEditCommentText}
                    onChange={(e) => setChildEditCommentText(e.target.value)}
                    placeholder="Add a new comment..."
                    className="w-full min-h-[80px] p-3 border border-gray-200 dark:border-gray-700 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-background"
                  />

                  <div className="space-y-2 mt-3">
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
                              onClick={() => removeChildEditCommentFile(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t mt-4">
                    <Button
                      type="button"
                      onClick={handleSaveChildEditComment}
                      disabled={
                        !childEditCommentText?.trim() &&
                        childEditCommentAttachments.length === 0
                      }
                      className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700"
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
              {childEditUploading ? "Updating..." : "Update Child Ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageTemplate>
  );
}
