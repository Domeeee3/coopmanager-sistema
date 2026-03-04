import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../ui/table';
import { Input } from '../ui/input';
import { Search } from 'lucide-react';

export interface Column<T> {
    key: string;
    header: string;
    render?: (item: T) => React.ReactNode;
    align?: 'left' | 'center' | 'right';
    width?: string;
    sortable?: boolean; // A futuro para sorter
}

interface DataTableProps<T> {
    data: T[];
    columns: Column<T>[];
    keyExtractor: (item: T) => string;
    searchValue?: string;
    onSearchChange?: (value: string) => void;
    searchPlaceholder?: string;
    onRowClick?: (item: T) => void;
    emptyMessage?: string;
}

export function DataTable<T>({
    data,
    columns,
    keyExtractor,
    searchValue,
    onSearchChange,
    searchPlaceholder = 'Buscar...',
    onRowClick,
    emptyMessage = 'No hay datos disponibles',
}: DataTableProps<T>) {
    return (
        <div className="space-y-4">
            {onSearchChange !== undefined && (
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder={searchPlaceholder}
                        value={searchValue || ''}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="pl-9 max-w-sm"
                    />
                </div>
            )}

            <div className="rounded-md border border-border bg-card overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent bg-muted/50 border-b border-border">
                                {columns.map((column) => (
                                    <TableHead
                                        key={column.key}
                                        className={`font-medium text-muted-foreground h-11 ${column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left'
                                            }`}
                                        style={{ width: column.width }}
                                    >
                                        {column.header}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={columns.length}
                                        className="h-24 text-center text-muted-foreground"
                                    >
                                        {emptyMessage}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.map((item) => (
                                    <TableRow
                                        key={keyExtractor(item)}
                                        onClick={() => onRowClick?.(item)}
                                        className={`
                      border-b border-border transition-colors
                      ${onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}
                    `}
                                    >
                                        {columns.map((column) => (
                                            <TableCell
                                                key={`${keyExtractor(item)}-${column.key}`}
                                                className={`py-3 px-4 ${column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left'
                                                    }`}
                                            >
                                                {column.render ? column.render(item) : (item as any)[column.key]}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
