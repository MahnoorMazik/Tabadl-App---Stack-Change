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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Edit,
  Trash2,
  MoreVertical,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Tag,
  FolderOpen,
  Hash,
  Eye,
  EyeOff,
  FolderTree,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/utils";
import { useLocale } from "@/contexts/LocaleContext";

// ============================================
// TYPES
// ============================================
interface TicketCategory {
  id: string;
  name: string;
  isActive: boolean;
  parentId: string | null;
  parent?: TicketCategory | null;
  children?: TicketCategory[];
  level?: number;
  _count?: {
    tickets: number;
    children?: number;
  };
}

// Extended type for display purposes
interface TicketCategoryWithDisplay extends TicketCategory {
  originalName: string;
  level: number;
}

// ============================================
// CATEGORIES PAGE COMPONENT
// ============================================
export default function CategoriesPage() {
  // ============================================
  // HOOKS & CONTEXT
  // ============================================
  const { token } = useAuth();
  const { toast } = useToast();
  const { t, formatNumber } = useLocale();

  // ============================================
  // STATE
  // ============================================
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [flatCategories, setFlatCategories] = useState<
    TicketCategoryWithDisplay[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [parentId, setParentId] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<TicketCategory | null>(
    null,
  );
  const [deletingCategory, setDeletingCategory] =
    useState<TicketCategoryWithDisplay | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] =
    useState<TicketCategory | null>(null);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number | "all">(10);

  // ============================================
  // HELPER FUNCTIONS - Build Category Tree
  // ============================================
  const buildCategoryTree = useCallback(
    (categories: TicketCategory[]): TicketCategory[] => {
      const categoryMap = new Map<string, TicketCategory>();
      const roots: TicketCategory[] = [];

      // First pass: create all nodes
      categories.forEach((cat) => {
        categoryMap.set(cat.id, { ...cat, children: [], level: 0 });
      });

      // Second pass: link children to parents
      categories.forEach((cat) => {
        const category = categoryMap.get(cat.id)!;
        if (cat.parentId && categoryMap.has(cat.parentId)) {
          const parent = categoryMap.get(cat.parentId)!;
          if (!parent.children) parent.children = [];
          parent.children.push(category);
        } else {
          roots.push(category);
        }
      });

      // Third pass: correctly set levels recursively (THIS WAS MISSING)
      const setLevels = (items: TicketCategory[], level: number) => {
        items.forEach((item) => {
          item.level = level;
          if (item.children && item.children.length > 0) {
            setLevels(item.children, level + 1);
          }
        });
      };
      setLevels(roots, 0);

      // Sort children by name
      const sortChildren = (node: TicketCategory) => {
        if (node.children && node.children.length > 0) {
          node.children.sort((a, b) => a.name.localeCompare(b.name));
          node.children.forEach(sortChildren);
        }
      };
      roots.forEach(sortChildren);

      return roots;
    },
    [],
  );
  // Get flat list for dropdown (simple list with level for indentation)
  const getFlatCategoryList = useCallback(
    (categories: TicketCategory[]): TicketCategoryWithDisplay[] => {
      let result: TicketCategoryWithDisplay[] = [];
      categories.forEach((cat) => {
        const categoryWithDisplay: TicketCategoryWithDisplay = {
          ...cat,
          originalName: cat.name,
          level: cat.level || 0,
        };
        result.push(categoryWithDisplay);
        if (cat.children && cat.children.length > 0) {
          result = result.concat(getFlatCategoryList(cat.children));
        }
      });
      return result;
    },
    [],
  );

  // Get parent name for display
  const getParentName = useCallback(
    (parentId: string | null): string => {
      if (!parentId) return "None (Top Level)";
      const parent = flatCategories.find((c) => c.id === parentId);
      return parent?.originalName || "Unknown";
    },
    [flatCategories],
  );

  // ============================================
  // FILTERED & PAGINATED DATA
  // ============================================
  const filteredCategories = useMemo(() => {
    let filtered = flatCategories;

    if (!showInactive) {
      filtered = filtered.filter((category) => category.isActive);
    }

    const searchLower = search.toLowerCase().trim();
    if (searchLower) {
      filtered = filtered.filter((category) => {
        return (
          category.originalName.toLowerCase().includes(searchLower) ||
          category.id.toLowerCase().includes(searchLower)
        );
      });
    }

    return filtered;
  }, [flatCategories, search, showInactive]);

  const paginatedCategories = useMemo(() => {
    if (rowsPerPage === "all") return filteredCategories;
    const pageSize = typeof rowsPerPage === "number" ? rowsPerPage : 10;
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredCategories.slice(start, end);
  }, [filteredCategories, rowsPerPage, currentPage]);

  const pagination = useMemo(() => {
    const total = filteredCategories.length;
    const pageSize = typeof rowsPerPage === "number" ? rowsPerPage : 10;
    const totalPages = rowsPerPage === "all" ? 1 : Math.ceil(total / pageSize);
    return {
      total,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
    };
  }, [filteredCategories, rowsPerPage, currentPage]);

  // Stats
  const stats = useMemo(() => {
    const total = categories.length;
    const active = categories.filter((c) => c.isActive).length;
    const inactive = total - active;
    const totalTickets = categories.reduce(
      (sum, c) => sum + (c._count?.tickets || 0),
      0,
    );
    const totalParent = categories.filter((c) => !c.parentId).length;
    const totalChildren = categories.filter((c) => c.parentId).length;
    return {
      total,
      active,
      inactive,
      totalTickets,
      totalParent,
      totalChildren,
    };
  }, [categories]);

  // Reset to page 1 when search or rowsPerPage changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, rowsPerPage, showInactive]);

  // ============================================
  // API CALLS - Fetch Categories
  // ============================================
  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get("/api/support-tickets/categories", {
        withCredentials: true,
        params: {
          _t: Date.now(),
          includeInactive: "true",
        },
      });

      const cats =
        response.data?.categories || response.data?.data || response.data || [];
      const normalizedCategories = Array.isArray(cats)
        ? cats.map((cat: any) => ({
            id: String(cat.id),
            name: cat.name,
            isActive: cat.isActive !== undefined ? cat.isActive : true,
            parentId: cat.parentId || null,
            parent: cat.parent || null,
            _count: cat._count || { tickets: 0, children: 0 },
          }))
        : [];

      // Build tree
      const tree = buildCategoryTree(normalizedCategories);
      setCategories(tree);

      // Create flat list for dropdown
      const flat = getFlatCategoryList(tree);
      setFlatCategories(flat);
    } catch (error: any) {
      console.error("Fetch Categories Error:", error.response?.data || error);
      toast({
        title: t("common.error"),
        description: "Failed to load categories",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, t, buildCategoryTree, getFlatCategoryList]);

  // ============================================
  // API CALLS - Create Category
  // ============================================
  const handleCreateCategory = async () => {
    if (!categoryName.trim()) {
      toast({
        title: t("common.error"),
        description: "Category name is required.",
        variant: "destructive",
      });
      return;
    }

    const authToken =
      token ||
      (typeof window !== "undefined"
        ? localStorage.getItem("auth-token")
        : null);

    try {
      await axios.post(
        "/api/support-tickets/categories",
        {
          name: categoryName.trim(),
          isActive: isActive,
          parentId: parentId || null,
        },
        {
          headers: authToken
            ? {
                Authorization: `Bearer ${authToken}`,
                "Content-Type": "application/json",
              }
            : { "Content-Type": "application/json" },
          withCredentials: true,
        },
      );

      toast({
        title: t("common.success"),
        description: "Category created successfully.",
      });

      await fetchCategories();
      setCategoryName("");
      setIsActive(true);
      setParentId(null);
      setShowCategoryDialog(false);
    } catch (error: any) {
      console.error("Create Category Error:", error);
      toast({
        title: t("common.error"),
        description:
          error.response?.data?.error || "Failed to create category.",
        variant: "destructive",
      });
    }
  };

  // ============================================
  // API CALLS - Update Category
  // ============================================
  const handleUpdateCategory = async () => {
    if (!editingCategory) return;
    if (!categoryName.trim()) {
      toast({
        title: t("common.error"),
        description: "Category name is required.",
        variant: "destructive",
      });
      return;
    }

    setUpdating(true);
    const authToken =
      token ||
      (typeof window !== "undefined"
        ? localStorage.getItem("auth-token")
        : null);

    try {
      await axios.put(
        `/api/support-tickets/categories/${editingCategory.id}`,
        {
          name: categoryName.trim(),
          isActive: isActive,
          parentId: parentId || null,
        },
        {
          headers: authToken
            ? {
                Authorization: `Bearer ${authToken}`,
                "Content-Type": "application/json",
              }
            : { "Content-Type": "application/json" },
          withCredentials: true,
        },
      );

      toast({
        title: t("common.success"),
        description: "Category updated successfully.",
      });

      await fetchCategories();
      setShowEditDialog(false);
      setEditingCategory(null);
      setCategoryName("");
      setIsActive(true);
      setParentId(null);
    } catch (error: any) {
      console.error("Update Category Error:", error);
      toast({
        title: t("common.error"),
        description:
          error.response?.data?.error || "Failed to update category.",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  // ============================================
  // API CALLS - Delete Category
  // ============================================
  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;

    setDeleting(true);
    const authToken =
      token ||
      (typeof window !== "undefined"
        ? localStorage.getItem("auth-token")
        : null);

    try {
      await axios.delete(
        `/api/support-tickets/categories/${deletingCategory.id}`,
        {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
          withCredentials: true,
        },
      );

      toast({
        title: t("common.success"),
        description: "Category deleted successfully.",
      });

      await fetchCategories();
      setShowDeleteDialog(false);
      setDeletingCategory(null);
    } catch (error: any) {
      console.error("Delete Category Error:", error);
      toast({
        title: t("common.error"),
        description:
          error.response?.data?.error || "Failed to delete category.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  // ============================================
  // HANDLER FUNCTIONS
  // ============================================
  const openEditDialog = (category: TicketCategoryWithDisplay) => {
    // Find original category (without prefix)
    const findOriginal = (cats: TicketCategory[]): TicketCategory | null => {
      for (const cat of cats) {
        if (cat.id === category.id) return cat;
        if (cat.children) {
          const found = findOriginal(cat.children);
          if (found) return found;
        }
      }
      return null;
    };

    const originalCategory = findOriginal(categories);
    if (originalCategory) {
      setEditingCategory(originalCategory);
      setCategoryName(originalCategory.name);
      setIsActive(originalCategory.isActive);
      setParentId(originalCategory.parentId || null);
      setShowEditDialog(true);
    } else {
      // Fallback: use the category object directly
      setEditingCategory({ ...category });
      setCategoryName(category.originalName || category.name);
      setIsActive(category.isActive);
      setParentId(category.parentId || null);
      setShowEditDialog(true);
    }
  };

  const openDeleteDialog = (category: TicketCategoryWithDisplay) => {
    setDeletingCategory(category);
    setShowDeleteDialog(true);
  };

  const openViewDialog = (category: TicketCategoryWithDisplay) => {
    // Find the full category with children
    const findCategory = (cats: TicketCategory[]): TicketCategory | null => {
      for (const cat of cats) {
        if (cat.id === category.id) return cat;
        if (cat.children) {
          const found = findCategory(cat.children);
          if (found) return found;
        }
      }
      return null;
    };

    const fullCategory = findCategory(categories);
    setSelectedCategory(fullCategory || category);
    setShowViewDialog(true);
  };

  const handleEditDialogClose = () => {
    setShowEditDialog(false);
    setEditingCategory(null);
    setCategoryName("");
    setIsActive(true);
    setParentId(null);
  };

  const handleDeleteDialogClose = () => {
    setShowDeleteDialog(false);
    setDeletingCategory(null);
  };

  const handleCreateDialogClose = () => {
    setShowCategoryDialog(false);
    setCategoryName("");
    setIsActive(true);
    setParentId(null);
  };

  const toggleActiveStatus = async (category: TicketCategoryWithDisplay) => {
    const authToken =
      token ||
      (typeof window !== "undefined"
        ? localStorage.getItem("auth-token")
        : null);

    try {
      await axios.put(
        `/api/support-tickets/categories/${category.id}`,
        { isActive: !category.isActive },
        {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
          withCredentials: true,
        },
      );

      toast({
        title: t("common.success"),
        description: category.isActive
          ? "Category deactivated successfully"
          : "Category activated successfully",
      });

      await fetchCategories();
    } catch (error: any) {
      console.error("Toggle Status Error:", error);
      toast({
        title: t("common.error"),
        description: getErrorMessage(error, "Failed to update category status"),
        variant: "destructive",
      });
    }
  };

  // ============================================
  // EFFECTS
  // ============================================
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // ============================================
  // RENDER
  // ============================================
  return (
    <AdminPageTemplate
      title={t("admin.categories.title") || "Categories"}
      description={
        t("admin.categories.description") || "Manage support ticket categories"
      }
      icon={<FolderOpen className="h-6 w-6" />}
      showConstruction={false}
    >
      <div className="space-y-6">
        {/* ==========================================
            HEADER ACTIONS - New Category Button
            ========================================== */}
        <div className="flex justify-end items-center mb-6">
          <Dialog
            open={showCategoryDialog}
            onOpenChange={(open) => {
              if (!open) {
                handleCreateDialogClose();
              }
              setShowCategoryDialog(open);
            }}
          >
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4 mr-2" />
                {t("admin.categories.newCategory") || "New Category"}
              </Button>
            </DialogTrigger>

            <DialogContent className="w-1/2 sm:max-w-[50%] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {t("admin.categories.newCategory") || "Create New Category"}
                </DialogTitle>
                {/* <DialogDescription>
                  {t("admin.categories.createDescription") ||
                    "Create a new support ticket category. You can make it a subcategory by selecting a parent."}
                </DialogDescription> */}
              </DialogHeader>

              <div className="space-y-6">
                <div>
                  <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-4">
                    {t("admin.categories.categoryInfo") ||
                      "Category Information"}
                  </h4>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label htmlFor="categoryName" className="mb-2"  >
                        {t("admin.categories.name") || "Category Name"} *
                      </Label>
                      <Input
                        id="categoryName"
                        value={categoryName}
                        onChange={(e) => setCategoryName(e.target.value)}
                        placeholder={
                          t("admin.categories.enterName") ||
                          "Enter category name"
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="parentCategory" className="mb-2">
                        {t("admin.categories.parentCategory") ||
                          "Parent Category"}
                        <span className="text-xs text-gray-500 ml-2">
                          (Optional)
                        </span>
                      </Label>
                      <Select
                        value={parentId || "none"}
                        onValueChange={(value) =>
                          setParentId(value === "none" ? null : value)
                        }
                      >
                        <SelectTrigger id="parentCategory" className="w-full">
                          <SelectValue placeholder="Select parent category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None (Top Level)</SelectItem>
                          {flatCategories
                            .filter((cat) => cat.isActive)
                            .map((cat) => {
                              const level = cat.level || 0;
                              // Create indentation based on level (only spaces, no arrows)
                              const indent = "  ".repeat(level);
                              return (
                                <SelectItem key={cat.id} value={cat.id}>
                                  <span className="flex items-center gap-1">
                                    <span className="text-gray-400">
                                      {indent}
                                    </span>
                                    <span>{cat.originalName}</span>
                                  </span>
                                </SelectItem>
                              );
                            })}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <div className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Switch
                            id="create-active"
                            checked={isActive}
                            onCheckedChange={setIsActive}
                          />
                          <Label
                            htmlFor="create-active"
                            className="cursor-pointer"
                          >
                            {isActive ? "Active" : "Inactive"}
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
                  onClick={handleCreateCategory}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {t("admin.categories.createCategory") || "Create Category"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* ==========================================
            STATS CARDS
            ========================================== */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-muted-foreground">
                {t("admin.categories.totalCategories") || "Total Categories"}
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
                {t("admin.categories.active") || "Active"}
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
                {t("admin.categories.inactive") || "Inactive"}
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
                {t("admin.categories.parentCategories") || "Parents"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {formatNumber(stats.totalParent)}
              </div>
            </CardContent>
          </Card> */}
        </div>

        {/* ==========================================
            TOGGLE BUTTON - ABOVE THE TABLE
            ========================================== */}
        <div className="flex items-center justify-between dark:bg-gray-800 p-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch
                id="show-inactive-toggle"
                checked={showInactive}
                onCheckedChange={setShowInactive}
                className="data-[state=checked]:bg-emerald-600"
              />
              <Label
                htmlFor="show-inactive-toggle"
                className="cursor-pointer text-sm font-medium"
              >
                {showInactive ? (
                  <span className="text-emerald-600 dark:text-emerald-400">
                    Show Inactive
                  </span>
                ) : (
                  <span className="text-gray-600 dark:text-gray-300">
                    Show active
                  </span>
                )}
              </Label>
            </div>
          </div>

          {/* <div className="text-sm text-gray-500 dark:text-muted-foreground">
            {showInactive ? (
              <span>Total: {formatNumber(filteredCategories.length)}</span>
            ) : (
              <span>Active: {formatNumber(filteredCategories.length)}</span>
            )}
          </div> */}
        </div>

        {/* ==========================================
            FILTERS AND SEARCH
            ========================================== */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-muted-foreground" />
                  <Input
                    placeholder={
                      t("admin.categories.searchPlaceholder") ||
                      "Search categories..."
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
            CATEGORIES TABLE - Flat View (No Tree)
            ========================================== */}
        <Card>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                {t("common.loading")}
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-muted-foreground">
                {search.length >= 1
                  ? t("admin.categories.noResults") ||
                    "No categories found matching your search."
                  : !showInactive
                    ? "No active categories found"
                    : "No categories found"}
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        {t("admin.categories.name") || "Category Name"}
                      </TableHead>
                      <TableHead>
                        {t("admin.categories.status") || "Status"}
                      </TableHead>
                      {/* <TableHead>
                        {t("admin.categories.totalTickets") || "Total Tickets"}
                      </TableHead> */}
                      <TableHead className="text-right">
                        {t("common.actions")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedCategories.map((category) => {
                      const isInactive = !category.isActive;

                      return (
                        <TableRow
                          key={category.id}
                          className={`cursor-pointer ${isInactive ? "opacity-60 bg-gray-50 dark:bg-gray-900/50" : ""}`}
                          onClick={() => openViewDialog(category)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Tag
                                className={`h-4 w-4 ${isInactive ? "text-gray-400" : "text-emerald-500"}`}
                              />
                              <span
                                className={`font-medium ${isInactive ? "line-through text-gray-400" : ""}`}
                              >
                                {category.originalName}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell>
                            <Badge
                              variant={isInactive ? "secondary" : "default"}
                              className={
                                isInactive
                                  ? "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              }
                            >
                              {isInactive ? "Inactive" : "Active"}
                            </Badge>
                          </TableCell>

                          {/* <TableCell>
                            <Badge variant="secondary">
                              {formatNumber(category._count?.tickets || 0)}
                            </Badge>
                          </TableCell> */}

                          <TableCell className="text-right">
                            <div
                              className="flex items-center justify-end gap-3"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Switch
                                checked={category.isActive}
                                onCheckedChange={() => toggleActiveStatus(category)}
                                title={
                                  category.isActive
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
                                    onClick={() => openViewDialog(category)}
                                  >
                                    <Tag className="mr-2 h-4 w-4" />
                                    {t("common.view")}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => openEditDialog(category)}
                                  >
                                    <Edit className="mr-2 h-4 w-4" />
                                    {t("common.edit")}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => openDeleteDialog(category)}
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
                      {t("admin.categories.showing") || "Showing"}{" "}
                      {formatNumber(
                        (currentPage - 1) *
                          (typeof rowsPerPage === "number" ? rowsPerPage : 10) +
                          1,
                      )}{" "}
                      {t("admin.categories.to") || "to"}{" "}
                      {formatNumber(
                        Math.min(
                          currentPage *
                            (typeof rowsPerPage === "number"
                              ? rowsPerPage
                              : 10),
                          pagination.total,
                        ),
                      )}{" "}
                      {t("admin.categories.of") || "of"}{" "}
                      {formatNumber(pagination.total)}{" "}
                      {t("admin.categories.categories") || "categories"}
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
                        {t("admin.categories.of") || "of"}{" "}
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
                      {t("admin.categories.showingAll") || "Showing all"}{" "}
                      {formatNumber(pagination.total)}{" "}
                      {t("admin.categories.categories") || "categories"}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* ==========================================
            VIEW CATEGORY DIALOG - Shows Parent & Children
            ========================================== */}
        <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {t("admin.categories.categoryDetails") || "Category Details"}
              </DialogTitle>
            </DialogHeader>
            {selectedCategory && (
              <div className="space-y-6">
                <div className="flex items-start justify-between p-4 bg-gray-50 dark:bg-muted/50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        {selectedCategory.children &&
                        selectedCategory.children.length > 0 ? (
                          <FolderTree className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        ) : (
                          <Tag className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">
                          {selectedCategory.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge
                            variant={
                              selectedCategory.isActive
                                ? "default"
                                : "secondary"
                            }
                            className={
                              selectedCategory.isActive
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                            }
                          >
                            {selectedCategory.isActive ? "Active" : "Inactive"}
                          </Badge>
                          <Badge variant="secondary">
                            {formatNumber(
                              selectedCategory._count?.tickets || 0,
                            )}{" "}
                            tickets
                          </Badge>
                          {selectedCategory.children &&
                            selectedCategory.children.length > 0 && (
                              <Badge
                                variant="secondary"
                                className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                              >
                                {selectedCategory.children.length} subcategories
                              </Badge>
                            )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-600 dark:text-muted-foreground">
                      {t("admin.categories.name") || "Category Name"}
                    </Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Tag className="h-4 w-4 text-gray-400 dark:text-muted-foreground" />
                      <p className="font-medium">{selectedCategory.name}</p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-gray-600 dark:text-muted-foreground">
                      {t("admin.categories.status") || "Status"}
                    </Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant={
                          selectedCategory.isActive ? "default" : "secondary"
                        }
                        className={
                          selectedCategory.isActive
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                        }
                      >
                        {selectedCategory.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <Label className="text-gray-600 dark:text-muted-foreground">
                      {t("admin.categories.parentCategory") ||
                        "Parent Category"}
                    </Label>
                    <div className="flex items-center gap-2 mt-1">
                      <FolderOpen className="h-4 w-4 text-gray-400 dark:text-muted-foreground" />
                      <p className="font-medium">
                        {selectedCategory.parentId
                          ? getParentName(selectedCategory.parentId)
                          : "None (Top Level)"}
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-gray-600 dark:text-muted-foreground">
                      {t("admin.categories.totalTickets") || "Total Tickets"}
                    </Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Hash className="h-4 w-4 text-gray-400 dark:text-muted-foreground" />
                      <p className="font-semibold">
                        {formatNumber(selectedCategory._count?.tickets || 0)}
                      </p>
                    </div>
                  </div>
                </div>

                {selectedCategory.children &&
                  selectedCategory.children.length > 0 && (
                    <div>
                      <Label className="text-gray-600 dark:text-muted-foreground">
                        Subcategories
                      </Label>
                      <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                        {selectedCategory.children.map((child) => (
                          <div
                            key={child.id}
                            className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-muted/30 rounded"
                          >
                            <Tag className="h-4 w-4 text-purple-500" />
                            <span>{child.name}</span>
                            <Badge variant="secondary" className="ml-auto">
                              {child._count?.tickets || 0} tickets
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ==========================================
            EDIT CATEGORY DIALOG - Shows Parent Dropdown
            ========================================== */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {t("admin.categories.editCategory") || "Edit Category"}
              </DialogTitle>
              {/* <DialogDescription>
                {t("admin.categories.updateCategory") ||
                  "Update category information"}
              </DialogDescription> */}
            </DialogHeader>

            <div className="space-y-6">
              <div>
                {/* <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-4">
                  {t("admin.categories.categoryInfo") || "Category Information"}
                </h4> */}
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="edit-categoryName" className="mb-2">
                      {t("admin.categories.name") || "Category Name"} *
                    </Label>
                    <Input
                      id="edit-categoryName"
                      value={categoryName}
                      onChange={(e) => setCategoryName(e.target.value)}
                      placeholder={
                        t("admin.categories.enterName") || "Enter category name"
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-parentCategory" className="mb-2">
                      {t("admin.categories.parentCategory") ||
                        "Parent Category"}
                      <span className="text-xs text-gray-500 ml-2">
                        (Optional)
                      </span>
                    </Label>
                    <Select
                      value={parentId || "none"}
                      onValueChange={(value) =>
                        setParentId(value === "none" ? null : value)
                      }
                    >
                      <SelectTrigger
                        id="edit-parentCategory"
                        className="w-full"
                      >
                        <SelectValue placeholder="Select parent category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None (Top Level)</SelectItem>
                        {flatCategories
                          .filter(
                            (cat) =>
                              cat.id !== editingCategory?.id && cat.isActive,
                          )
                          .map((cat) => {
                            const level = cat.level || 0;
                            const indent = "  ".repeat(level);
                            return (
                              <SelectItem key={cat.id} value={cat.id}>
                                <span className="flex items-center gap-1">
                                  <span className="text-gray-400">
                                    {indent}
                                  </span>
                                  <span>{cat.originalName}</span>
                                </span>
                              </SelectItem>
                            );
                          })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <div className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Switch
                          id="edit-active"
                          checked={isActive}
                          onCheckedChange={setIsActive}
                        />
                        <Label htmlFor="edit-active" className="cursor-pointer">
                          {isActive ? "Active" : "Inactive"}
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
                onClick={handleEditDialogClose}
                disabled={updating}
              >
                {t("common.cancel")}
              </Button>
              <Button
                onClick={handleUpdateCategory}
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={updating}
              >
                {updating
                  ? t("admin.categories.updating") || "Updating..."
                  : t("admin.categories.updateCategory") || "Update Category"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ==========================================
            DELETE CATEGORY DIALOG
            ========================================== */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {t("admin.categories.deleteCategory") || "Delete Category"}
              </DialogTitle>
              <DialogDescription>
                {t("admin.categories.deletePermanent") ||
                  "This action cannot be undone. This will permanently delete the category."}
              </DialogDescription>
            </DialogHeader>

            {deletingCategory && (
              <div className="py-4">
                <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="font-medium text-red-900 dark:text-red-200">
                      {t("admin.categories.deleteCategoryQuestion") ||
                        "Delete category"}{" "}
                      <strong>
                        {deletingCategory.originalName || deletingCategory.name}
                      </strong>
                      ?
                    </p>
                    {deletingCategory._count?.tickets &&
                      deletingCategory._count.tickets > 0 && (
                        <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                          {formatNumber(deletingCategory._count.tickets)}{" "}
                          tickets assigned to this category
                        </p>
                      )}
                    {deletingCategory.children &&
                      deletingCategory.children.length > 0 && (
                        <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                          {deletingCategory.children.length} subcategories will
                          also be deleted
                        </p>
                      )}
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleDeleteDialogClose}
                disabled={deleting}
              >
                {t("common.cancel")}
              </Button>
              <Button
                onClick={handleDeleteCategory}
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={deleting}
              >
                {deleting
                  ? t("admin.categories.deleting") || "Deleting..."
                  : t("admin.categories.deleteCategory") || "Delete Category"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminPageTemplate>
  );
}
