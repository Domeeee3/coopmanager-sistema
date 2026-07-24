import React from 'react';
import { Pagination, Table } from '@heroui/react';
import { SearchInput } from '@/shared/components/SearchInput';
import { tableStyles } from '@/shared/components/table-styles';

const PAGE_SIZE = 15;

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string;
  sortable?: boolean;
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
  toolbar?: React.ReactNode;
}

const alignmentClass = (align?: Column<unknown>['align']) => {
  if (align === 'left') return '!text-left';
  if (align === 'right') return 'text-right';
  if (align === 'center') return 'text-center';
  return '';
};

function getPageNumbers(currentPage: number, totalPages: number): Array<number | 'ellipsis'> {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);

  const pages: Array<number | 'ellipsis'> = [1];
  if (currentPage > 3) pages.push('ellipsis');

  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);
  for (let page = start; page <= end; page += 1) pages.push(page);

  if (currentPage < totalPages - 2) pages.push('ellipsis');
  pages.push(totalPages);
  return pages;
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
  toolbar,
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = React.useState(1);
  const totalPages = Math.max(1, Math.ceil(data.length / PAGE_SIZE));
  const usesFixedLayout = columns.every((column) => column.width !== undefined);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedData = data.slice(startIndex, startIndex + PAGE_SIZE);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [data, searchValue]);

  React.useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const pageNumbers = getPageNumbers(currentPage, totalPages);
  const firstItem = data.length === 0 ? 0 : startIndex + 1;
  const lastItem = Math.min(startIndex + PAGE_SIZE, data.length);

  return (
    <div className="space-y-4">
      {onSearchChange !== undefined || toolbar ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {onSearchChange !== undefined ? (
            <SearchInput
              className="max-w-sm"
              value={searchValue ?? ''}
              onValueChange={onSearchChange}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
            />
          ) : null}
          {toolbar}
        </div>
      ) : null}

      <Table className={tableStyles.root}>
        <Table.ScrollContainer className={tableStyles.scroll}>
          <Table.Content aria-label="Tabla de datos" className={usesFixedLayout ? 'table-fixed' : undefined}>
            <Table.Header className={tableStyles.header}>
              {columns.map((column, index) => (
                <Table.Column
                  key={column.key}
                  id={column.key}
                  isRowHeader={index === 0}
                  className={`${tableStyles.column} ${alignmentClass(column.align)}`}
                  style={{ width: column.width }}
                >
                  {column.header}
                </Table.Column>
              ))}
            </Table.Header>
            <Table.Body>
              {data.length === 0 ? (
                <Table.Row id="empty-state">
                  <Table.Cell colSpan={columns.length} className={tableStyles.emptyCell}>
                    {emptyMessage}
                  </Table.Cell>
                </Table.Row>
              ) : (
                paginatedData.map((item) => {
                  const itemKey = keyExtractor(item);

                  return (
                    <Table.Row
                      key={itemKey}
                      id={itemKey}
                      onAction={onRowClick ? () => onRowClick(item) : undefined}
                      className={`${tableStyles.row} ${onRowClick ? 'cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring' : ''}`}
                    >
                      {columns.map((column) => (
                        <Table.Cell
                          key={`${itemKey}-${column.key}`}
                          className={`${tableStyles.cell} ${alignmentClass(column.align)}`}
                        >
                          {column.render ? column.render(item) : (item as any)[column.key]}
                        </Table.Cell>
                      ))}
                    </Table.Row>
                  );
                })
              )}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>

      {data.length > PAGE_SIZE ? (
        <Pagination className="flex-col items-start justify-between gap-3 sm:flex-row sm:items-center" size="sm">
          <Pagination.Summary>
            Mostrando {firstItem}–{lastItem} de {data.length} registros
          </Pagination.Summary>
          <Pagination.Content>
            <Pagination.Item>
              <Pagination.Previous isDisabled={currentPage === 1} onPress={() => setCurrentPage((page) => page - 1)}>
                <Pagination.PreviousIcon />
                <span>Anterior</span>
              </Pagination.Previous>
            </Pagination.Item>
            {pageNumbers.map((page, index) => (
              page === 'ellipsis' ? (
                <Pagination.Item key={`ellipsis-${index}`}>
                  <Pagination.Ellipsis />
                </Pagination.Item>
              ) : (
                <Pagination.Item key={page}>
                  <Pagination.Link isActive={page === currentPage} onPress={() => setCurrentPage(page)}>
                    {page}
                  </Pagination.Link>
                </Pagination.Item>
              )
            ))}
            <Pagination.Item>
              <Pagination.Next isDisabled={currentPage === totalPages} onPress={() => setCurrentPage((page) => page + 1)}>
                <span>Siguiente</span>
                <Pagination.NextIcon />
              </Pagination.Next>
            </Pagination.Item>
          </Pagination.Content>
        </Pagination>
      ) : null}
    </div>
  );
}
