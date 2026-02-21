import React, { forwardRef, HTMLAttributes, useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '../../utils/formatters';
import Input from './Input';

interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  width?: string;
  render?: (item: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  loading?: boolean;
  emptyMessage?: string;
  striped?: boolean;
  hoverable?: boolean;
  compact?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  getRowClassName?: (item: T) => string;
}

function Table<T>(
  {
    data,
    columns,
    keyExtractor,
    onRowClick,
    loading = false,
    emptyMessage = 'No hay datos disponibles',
    striped = false,
    hoverable = true,
    compact = false,
    searchValue,
    onSearchChange,
    searchPlaceholder = 'Buscar...',
    getRowClassName,
  }: TableProps<T>,
  ref: React.Ref<HTMLTableElement>
) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Filtrar datos si hay búsqueda
  const filteredData = useMemo(() => {
    if (!searchValue || !onSearchChange) return data;
    
    const search = searchValue.toLowerCase();
    return data.filter((item) => {
      return columns.some((col) => {
        const value = (item as Record<string, unknown>)[col.key];
        return String(value).toLowerCase().includes(search);
      });
    });
  }, [data, columns, searchValue, onSearchChange]);

  // Ordenar datos
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortKey];
      const bVal = (b as Record<string, unknown>)[sortKey];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      let comparison = 0;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else if (typeof aVal === 'string' && typeof bVal === 'string') {
        comparison = aVal.localeCompare(bVal);
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortKey, sortDirection]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const renderSortIcon = (key: string) => {
    if (sortKey !== key) {
      return <ChevronsUpDown className="w-4 h-4 text-slate-400" />;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4 text-primary-600" />
    ) : (
      <ChevronDown className="w-4 h-4 text-primary-600" />
    );
  };

  const alignments = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  if (loading) {
    return (
      <div className="w-full">
        {onSearchChange && (
          <div className="mb-4">
            <Input
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
              disabled
            />
          </div>
        )}
        <div className="animate-pulse">
          <div className="h-12 bg-slate-200 dark:bg-slate-700 rounded-lg mb-2" />
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-10 bg-slate-100 dark:bg-slate-800 rounded-lg mb-1"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Search */}
      {onSearchChange && (
        <div className="mb-4">
          <Input
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
        <table
          ref={ref}
          className={cn(
            'w-full',
            compact ? 'text-sm' : 'text-base'
          )}
        >
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    'px-4 py-3 font-semibold text-slate-700 dark:text-slate-300',
                    alignments[column.align || 'left'],
                    column.sortable && 'cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-700/50'
                  )}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-2">
                    <span>{column.header}</span>
                    {column.sortable && renderSortIcon(column.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-slate-500 dark:text-slate-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sortedData.map((item, index) => (
                <tr
                  key={keyExtractor(item)}
                  className={cn(
                    'border-t border-slate-100 dark:border-slate-700/50',
                    striped && index % 2 === 1 && 'bg-slate-50/50 dark:bg-slate-800/30',
                    hoverable && onRowClick && 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30',
                    !onRowClick && 'cursor-default',
                    getRowClassName?.(item)
                  )}
                  onClick={() => onRowClick?.(item)}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        'px-4 py-3 text-slate-700 dark:text-slate-300',
                        alignments[column.align || 'left']
                      )}
                    >
                      {column.render
                        ? column.render(item)
                        : String((item as Record<string, unknown>)[column.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer con contador */}
      <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        {sortedData.length} {sortedData.length === 1 ? 'registro' : 'registros'}
      </div>
    </div>
  );
}

export default forwardRef(Table);

// ==================== PAGINATION ====================
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const maxVisiblePages = 5;
  
  let visiblePages: (number | 'ellipsis')[] = [];
  
  if (totalPages <= maxVisiblePages) {
    visiblePages = pages;
  } else {
    if (currentPage <= 3) {
      visiblePages = [1, 2, 3, 4, 'ellipsis', totalPages];
    } else if (currentPage >= totalPages - 2) {
      visiblePages = [1, 'ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    } else {
      visiblePages = [1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages];
    }
  }

  return (
    <div className={cn('flex items-center justify-center gap-1', className)}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={cn(
          'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
          currentPage === 1
            ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
        )}
      >
        Anterior
      </button>
      
      {visiblePages.map((page, index) =>
        page === 'ellipsis' ? (
          <span
            key={`ellipsis-${index}`}
            className="px-2 text-slate-400"
          >
            ...
          </span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={cn(
              'w-8 h-8 rounded-lg text-sm font-medium transition-colors',
              page === currentPage
                ? 'bg-primary-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            )}
          >
            {page}
          </button>
        )
      )}
      
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={cn(
          'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
          currentPage === totalPages
            ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
        )}
      >
        Siguiente
      </button>
    </div>
  );
}
