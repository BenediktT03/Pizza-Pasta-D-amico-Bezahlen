import React, { forwardRef, HTMLAttributes, ThHTMLAttributes, TdHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

const Table = forwardRef<HTMLTableElement, HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="relative w-full overflow-auto">
      <table
        ref={ref}
        className={cn('w-full caption-bottom text-sm', className)}
        {...props}
      />
    </div>
  )
);
Table.displayName = 'Table';

const TableHeader = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn('[&_tr]:border-b', className)} {...props} />
));
TableHeader.displayName = 'TableHeader';

const TableBody = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn('[&_tr:last-child]:border-0', className)}
    {...props}
  />
));
TableBody.displayName = 'TableBody';

const TableFooter = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn('bg-muted/50 font-medium [&>tr]:last:border-b-0', className)}
    {...props}
  />
));
TableFooter.displayName = 'TableFooter';

const TableRow = forwardRef<HTMLTableRowElement, HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        'border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted',
        className
      )}
      {...props}
    />
  )
);
TableRow.displayName = 'TableRow';

export interface TableHeadProps extends ThHTMLAttributes<HTMLTableCellElement> {
  sortable?: boolean;
  sorted?: 'asc' | 'desc' | false;
  onSort?: () => void;
}

const TableHead = forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, sortable, sorted, onSort, children, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        'h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0',
        sortable && 'cursor-pointer select-none hover:text-foreground',
        className
      )}
      onClick={sortable ? onSort : undefined}
      {...props}
    >
      <div className="flex items-center gap-2">
        {children}
        {sortable && (
          <span className="ml-auto">
            {sorted === 'asc' && <ChevronUp className="h-4 w-4" />}
            {sorted === 'desc' && <ChevronDown className="h-4 w-4" />}
            {!sorted && <ChevronsUpDown className="h-4 w-4 opacity-50" />}
          </span>
        )}
      </div>
    </th>
  )
);
TableHead.displayName = 'TableHead';

const TableCell = forwardRef<
  HTMLTableCellElement,
  TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn('p-4 align-middle [&:has([role=checkbox])]:pr-0', className)}
    {...props}
  />
));
TableCell.displayName = 'TableCell';

const TableCaption = forwardRef<
  HTMLTableCaptionElement,
  HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn('mt-4 text-sm text-muted-foreground', className)}
    {...props}
  />
));
TableCaption.displayName = 'TableCaption';

// Enhanced Table with built-in features
export interface DataTableColumn<T> {
  key: keyof T | string;
  header: string | React.ReactNode;
  cell?: (value: any, row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  onRowClick?: (row: T) => void;
  selectedRows?: T[];
  onSelectionChange?: (rows: T[]) => void;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  onRowClick,
  selectedRows = [],
  onSelectionChange,
  loading,
  emptyMessage = 'No data available',
  className,
}: DataTableProps<T>) {
  const [sortColumn, setSortColumn] = React.useState<string | null>(null);
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc');

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedData = React.useMemo(() => {
    if (!sortColumn) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      if (aValue === bValue) return 0;
      
      const comparison = aValue > bValue ? 1 : -1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortColumn, sortDirection]);

  const getCellValue = (row: T, column: DataTableColumn<T>) => {
    const keys = String(column.key).split('.');
    let value: any = row;
    
    for (const key of keys) {
      value = value?.[key];
    }
    
    return column.cell ? column.cell(value, row) : value;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Table className={className}>
      <TableHeader>
        <TableRow>
          {onSelectionChange && (
            <TableHead className="w-12">
              <input
                type="checkbox"
                checked={selectedRows.length === data.length && data.length > 0}
                onChange={(e) => {
                  onSelectionChange(e.target.checked ? data : []);
                }}
                className="rounded border-input"
              />
            </TableHead>
          )}
          {columns.map((column) => (
            <TableHead
              key={String(column.key)}
              sortable={column.sortable}
              sorted={
                sortColumn === String(column.key)
                  ? sortDirection
                  : false
              }
              onSort={() => handleSort(String(column.key))}
              className={column.headerClassName}
            >
              {column.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedData.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={columns.length + (onSelectionChange ? 1 : 0)}
              className="h-24 text-center"
            >
              {emptyMessage}
            </TableCell>
          </TableRow>
        ) : (
          sortedData.map((row, index) => (
            <TableRow
              key={index}
              onClick={() => onRowClick?.(row)}
              className={cn(
                onRowClick && 'cursor-pointer',
                selectedRows.includes(row) && 'bg-muted'
              )}
            >
              {onSelectionChange && (
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selectedRows.includes(row)}
                    onChange={(e) => {
                      e.stopPropagation();
                      const newSelection = e.target.checked
                        ? [...selectedRows, row]
                        : selectedRows.filter((r) => r !== row);
                      onSelectionChange(newSelection);
                    }}
                    className="rounded border-input"
                  />
                </TableCell>
              )}
              {columns.map((column) => (
                <TableCell
                  key={String(column.key)}
                  className={column.className}
                >
                  {getCellValue(row, column)}
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
