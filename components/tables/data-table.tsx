"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  id: string;
  header: string;
  className?: string;
  sortable?: boolean;
  accessor?: (row: T) => string | number;
  searchValue?: (row: T) => string | number | null | undefined;
  cell: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  rowKey: (row: T) => string;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchFilter?: (row: T, query: string) => boolean;
  pageSize?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  toolbar?: React.ReactNode;
  unboxed?: boolean;
}

const PAGE_SIZES = [10, 25, 50];

export function DataTable<T>({
  data,
  columns,
  rowKey,
  searchable = true,
  searchPlaceholder = "Search...",
  searchFilter,
  pageSize: initialPageSize = 10,
  emptyTitle = "No records found",
  emptyDescription = "Try adjusting your search or filters.",
  toolbar,
  unboxed = false,
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [sort, setSort] = useState<{ id: string; direction: "asc" | "desc" } | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = data;
    if (q) {
      rows = rows.filter((row) => {
        if (searchFilter) {
          return searchFilter(row, q);
        }
        return buildSearchHaystack(row, columns).includes(q);
      });
    }
    if (sort) {
      const column = columns.find((item) => item.id === sort.id);
      rows = [...rows].sort((a, b) => {
        const left = column?.accessor?.(a) ?? "";
        const right = column?.accessor?.(b) ?? "";
        const comparison = String(left).localeCompare(String(right), undefined, { numeric: true });
        return sort.direction === "asc" ? comparison : -comparison;
      });
    }
    return rows;
  }, [columns, data, query, searchFilter, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const start = filtered.length === 0 ? 0 : safePage * pageSize + 1;
  const end = Math.min(filtered.length, (safePage + 1) * pageSize);
  const pageRows = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize);
  const pages = paginationItems(safePage, pageCount);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {searchable ? (
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(0);
              }}
              placeholder={searchPlaceholder}
              className="pl-8"
              aria-label="Search table"
            />
          </div>
        ) : (
          <div />
        )}
        <div className="flex flex-wrap items-center gap-3">
          {toolbar}
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            Rows
            <select
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(0);
              }}
              aria-label="Rows per page"
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <div className={cn(!unboxed && "overflow-hidden rounded-xl border bg-card")}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column.id} className={column.className}>
                    {column.sortable ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 font-medium"
                        onClick={() =>
                          setSort((current) =>
                            current?.id === column.id
                              ? { id: column.id, direction: current.direction === "asc" ? "desc" : "asc" }
                              : { id: column.id, direction: "asc" },
                          )
                        }
                      >
                        {column.header}
                      </button>
                    ) : (
                      column.header
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="p-0">
                    <EmptyState title={emptyTitle} description={emptyDescription} />
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((row) => (
                  <TableRow key={rowKey(row)}>
                    {columns.map((column) => (
                      <TableCell key={column.id} className={cn("whitespace-nowrap", column.className)}>
                        {column.cell(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {filtered.length === 0
            ? "0 records"
            : `Showing ${start}–${end} of ${filtered.length} record${filtered.length === 1 ? "" : "s"}`}
        </p>
        <div className="flex flex-wrap items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setPage(0)}
            disabled={safePage === 0}
            aria-label="First page"
          >
            <ChevronsLeft />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setPage((value) => Math.max(0, value - 1))}
            disabled={safePage === 0}
            aria-label="Previous page"
          >
            <ChevronLeft />
          </Button>
          {pages.map((item, index) =>
            item === "gap" ? (
              <span key={`gap-${index}`} className="px-1.5 text-sm text-muted-foreground">
                …
              </span>
            ) : (
              <Button
                key={item}
                variant={item === safePage ? "default" : "outline"}
                size="icon-sm"
                onClick={() => setPage(item)}
                aria-label={`Page ${item + 1}`}
                aria-current={item === safePage ? "page" : undefined}
              >
                {item + 1}
              </Button>
            ),
          )}
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}
            disabled={safePage >= pageCount - 1}
            aria-label="Next page"
          >
            <ChevronRight />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setPage(pageCount - 1)}
            disabled={safePage >= pageCount - 1}
            aria-label="Last page"
          >
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  );
}

function buildSearchHaystack<T>(row: T, columns: DataTableColumn<T>[]): string {
  const parts = columns.flatMap((column) => {
    const values = [column.accessor?.(row), column.searchValue?.(row)];
    return values.flatMap((value) => (value == null ? [] : stringifySearchValue(value)));
  });
  parts.push(...collectSearchText(row, 0));
  return parts.join(" ").toLowerCase();
}

function stringifySearchValue(value: string | number): string[] {
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    try {
      return [text, formatDate(text)];
    } catch {
      return [text];
    }
  }
  if (/^\d{4}-\d{2}-\d{2}T/.test(text)) {
    try {
      return [text, formatDate(text), formatTime(text)];
    } catch {
      return [text];
    }
  }
  return [text];
}

function collectSearchText(value: unknown, depth: number): string[] {
  if (value == null || depth > 2) {
    return [];
  }
  if (typeof value === "boolean") {
    return [String(value)];
  }
  if (typeof value === "string" || typeof value === "number") {
    const text = String(value);
    return stringifySearchValue(value).concat(typeof value === "string" ? [text.replaceAll("_", " ")] : []);
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectSearchText(item, depth + 1));
  }
  if (typeof value === "object") {
    return Object.values(value).flatMap((item) => collectSearchText(item, depth + 1));
  }
  return [];
}

function paginationItems(current: number, total: number): Array<number | "gap"> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index);
  }

  const items: Array<number | "gap"> = [0];
  const start = Math.max(1, current - 1);
  const end = Math.min(total - 2, current + 1);

  if (start > 1) {
    items.push("gap");
  }
  for (let page = start; page <= end; page += 1) {
    items.push(page);
  }
  if (end < total - 2) {
    items.push("gap");
  }
  items.push(total - 1);
  return items;
}
