"use client";

import { FiltersCard } from "@/components/filters/FiltersCard";
import { FilterSelect } from "@/components/filters/FilterSelect";
import { DateRangeFilter, DateRangeFilterValue, DEFAULT_DATE_RANGE } from "@/components/filters/DateRangeFilter";
import { useDefaultDateRange } from "@/hooks/useDefaultDateRange";
import { clearFiltersClass } from "@/components/filters/filterStyles";

export interface SupportFilterValues {
  status: string;
  createdById: string;
  dateRange: DateRangeFilterValue;
}

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "NEW", label: "New" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CLOSED", label: "Closed" },
];

const DEFAULT_FILTERS: Omit<SupportFilterValues, "dateRange"> = {
  status: "all",
  createdById: "all",
};

export function getDefaultSupportFilters(dateRange?: DateRangeFilterValue): SupportFilterValues {
  return {
    ...DEFAULT_FILTERS,
    dateRange: dateRange ?? { range: DEFAULT_DATE_RANGE, dateFrom: undefined, dateTo: undefined },
  };
}

interface SupportFiltersProps {
  filters: SupportFilterValues;
  onFiltersChange: (filters: SupportFilterValues) => void;
  users: Array<{ id: number; name: string }>;
}

export function SupportFilters({
  filters,
  onFiltersChange,
  users,
}: SupportFiltersProps) {
  const { dateRange: defaultDateRange } = useDefaultDateRange();

  const handleFilterChange = (key: keyof SupportFilterValues, value: string | DateRangeFilterValue) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const hasActiveFilters =
    filters.status !== "all" ||
    filters.createdById !== "all" ||
    filters.dateRange.range !== defaultDateRange.range;

  return (
    <FiltersCard title="Filters" defaultOpen={true} className="mb-4 min-w-0 max-w-full">
      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <FilterSelect
          id="filter-status"
          label="Status"
          value={filters.status}
          onChange={(v) => handleFilterChange("status", v)}
          options={STATUS_OPTIONS}
        />
        <FilterSelect
          id="filter-created-by"
          label="Created by"
          value={filters.createdById}
          onChange={(v) => handleFilterChange("createdById", v)}
          options={[
            { value: "all", label: "All" },
            ...users.map((user) => ({ value: String(user.id), label: user.name })),
          ]}
        />
        <DateRangeFilter
          value={filters.dateRange}
          onChange={(value) => handleFilterChange("dateRange", value)}
        />
        {hasActiveFilters && (
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => onFiltersChange(getDefaultSupportFilters(defaultDateRange))}
              className={clearFiltersClass}
            >
              Clear all
            </button>
          </div>
        )}
      </div>
    </FiltersCard>
  );
}
