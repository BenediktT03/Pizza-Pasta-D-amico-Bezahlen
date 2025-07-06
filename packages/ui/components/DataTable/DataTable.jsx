/**
 * EATECH - DataTable Component
 * Version: 6.3.0
 * Description: Universelle Datentabelle mit Lazy Loading und Virtualisierung
 * Author: EATECH Development Team
 * Modified: 2025-01-08
 * File Path: /packages/ui/src/components/DataTable/DataTable.jsx
 * 
 * Features: Virtual scrolling, lazy columns, exporters, bulk actions
 */

import React, { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { 
  ChevronUp, ChevronDown, Search, Filter,
  Download, Upload, MoreHorizontal, Check,
  X, Edit2, Trash2, Eye, RefreshCw,
  ArrowUpDown, SortAsc, SortDesc, Settings,
  Columns, Grid, List, CheckSquare,
  Square, Loader, AlertCircle
} from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import styles from './DataTable.module.css';

// Lazy loaded components
const ColumnSettings = lazy(() => import('./components/ColumnSettings'));
const ExportDialog = lazy(() => import('./components/ExportDialog'));
const ImportDialog = lazy(() => import('./components/ImportDialog'));
const BulkActionsMenu = lazy(() => import('./components/BulkActionsMenu'));
const FilterPanel = lazy(() => import('./components/FilterPanel'));
const CellEditor = lazy(() => import('./components/CellEditor'));

// Lazy loaded utilities
const TableUtils = lazy(() => import('./utils/TableUtils'));
const ExportUtils = lazy(() => import('./utils/ExportUtils'));
const FilterUtils = lazy(() => import('./utils/FilterUtils'));

const LoadingSpinner = () => (
  <div className={styles.loadingSpinner}>
    <Loader size={16} className={styles.spinner} />
  </div>
);

const COLUMN_TYPES = {
  text: { component: 'TextCell', sortable: true, filterable: true },
  number: { component: 'NumberCell', sortable: true, filterable: true },
  date: { component: 'DateCell', sortable: true, filterable: true },
  boolean: { component: 'BooleanCell', sortable: true, filterable: true },
  select: { component: 'SelectCell', sortable: true, filterable: true },
  image: { component: 'ImageCell', sortable: false, filterable: false },
  actions: { component: 'ActionsCell', sortable: false, filterable: false }
};

const PAGINATION_SIZES = [10, 25, 50, 100, 250, 500];

const DataTable = ({
  data = [],
  columns = [],
  loading = false,
  error = null,
  selectable = false,
  editable = false,
  sortable = true,
  filterable = true,
  searchable = true,
  exportable = true,
  importable = false,
  virtualizer = false,
  pagination = true,
  pageSize = 25,
  totalCount = null,
  onSelectionChange,
  onRowClick,
  onRowEdit,
  onRowDelete,
  onSort,
  onFilter,
  onSearch,
  onPageChange,
  onPageSizeChange,
  onExport,
  onImport,
  onBulkAction,
  bulkActions = [],
  customActions = [],
  emptyState = null,
  className = '',
  rowHeight = 48,
  overscan = 5
}) => {
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [filters, setFilters] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleColumns, setVisibleColumns] = useState(columns.map(col => col.key));
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageSize, setCurrentPageSize] = useState(pageSize);
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const [columnWidths, setColumnWidths] = useState({});
  const [isResizing, setIsResizing] = useState(false);

  const parentRef = useRef();
  const tableRef = useRef();

  // ============================================================================
  // FILTERED AND SORTED DATA
  // ============================================================================
  const processedData = useMemo(() => {
    let result = [...data];

    // Apply search
    if (searchTerm && searchable) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(row =>
        columns.some(column => {
          const value = row[column.key];
          return value?.toString().toLowerCase().includes(searchLower);
        })
      );
    }

    // Apply filters
    if (Object.keys(filters).length > 0) {
      result = result.filter(row => {
        return Object.entries(filters).every(([key, filterValue]) => {
          if (!filterValue) return true;
          const cellValue = row[key];
          const column = columns.find(col => col.key === key);
          
          switch (column?.type) {
            case 'number':
              return cellValue === Number(filterValue);
            case 'boolean':
              return cellValue === (filterValue === 'true');
            case 'date':
              return new Date(cellValue).toDateString() === new Date(filterValue).toDateString();
            default:
              return cellValue?.toString().toLowerCase().includes(filterValue.toLowerCase());
          }
        });
      });
    }

    // Apply sorting
    if (sortConfig.key && sortable) {
      result.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        if (aValue === bValue) return 0;
        
        const comparison = aValue < bValue ? -1 : 1;
        return sortConfig.direction === 'desc' ? -comparison : comparison;
      });
    }

    return result;
  }, [data, searchTerm, filters, sortConfig, columns, searchable, sortable]);

  // ============================================================================
  // PAGINATION
  // ============================================================================
  const paginatedData = useMemo(() => {
    if (!pagination) return processedData;
    
    const startIndex = (currentPage - 1) * currentPageSize;
    const endIndex = startIndex + currentPageSize;
    return processedData.slice(startIndex, endIndex);
  }, [processedData, currentPage, currentPageSize, pagination]);

  const totalPages = useMemo(() => {
    return Math.ceil((totalCount || processedData.length) / currentPageSize);
  }, [processedData.length, totalCount, currentPageSize]);

  // ============================================================================
  // VIRTUAL SCROLLING
  // ============================================================================
  const rowVirtualizer = useVirtualizer({
    count: virtualizer ? paginatedData.length : 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan
  });

  const columnVirtualizer = useVirtualizer({
    horizontal: true,
    count: visibleColumns.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const column = columns.find(col => col.key === visibleColumns[index]);
      return columnWidths[column?.key] || column?.width || 150;
    },
    overscan: 2
  });

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  const handleSort = useCallback((columnKey) => {
    if (!sortable) return;
    
    const direction = sortConfig.key === columnKey && sortConfig.direction === 'asc' 
      ? 'desc' 
      : 'asc';
    
    const newSortConfig = { key: columnKey, direction };
    setSortConfig(newSortConfig);
    onSort?.(newSortConfig);
  }, [sortConfig, sortable, onSort]);

  const handleFilter = useCallback((columnKey, value) => {
    const newFilters = { ...filters, [columnKey]: value };
    if (!value) delete newFilters[columnKey];
    
    setFilters(newFilters);
    setCurrentPage(1);
    onFilter?.(newFilters);
  }, [filters, onFilter]);

  const handleSearch = useCallback((term) => {
    setSearchTerm(term);
    setCurrentPage(1);
    onSearch?.(term);
  }, [onSearch]);

  const handleRowSelection = useCallback((rowId, selected) => {
    const newSelection = new Set(selectedRows);
    
    if (selected) {
      newSelection.add(rowId);
    } else {
      newSelection.delete(rowId);
    }
    
    setSelectedRows(newSelection);
    onSelectionChange?.(Array.from(newSelection));
  }, [selectedRows, onSelectionChange]);

  const handleSelectAll = useCallback((selected) => {
    const newSelection = selected 
      ? new Set(paginatedData.map((row, index) => row.id || index))
      : new Set();
    
    setSelectedRows(newSelection);
    onSelectionChange?.(Array.from(newSelection));
  }, [paginatedData, onSelectionChange]);

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
    onPageChange?.(page);
  }, [onPageChange]);

  const handlePageSizeChange = useCallback((size) => {
    setCurrentPageSize(size);
    setCurrentPage(1);
    onPageSizeChange?.(size);
  }, [onPageSizeChange]);

  const handleColumnResize = useCallback((columnKey, width) => {
    setColumnWidths(prev => ({ ...prev, [columnKey]: width }));
  }, []);

  const handleCellEdit = useCallback((rowIndex, columnKey, value) => {
    const row = paginatedData[rowIndex];
    onRowEdit?.(row, columnKey, value);
    setEditingCell(null);
  }, [paginatedData, onRowEdit]);

  const handleExport = useCallback(async (format, options) => {
    try {
      const ExportUtilsModule = await import('./utils/ExportUtils');
      const exportData = await ExportUtilsModule.default.export(
        processedData,
        visibleColumns.map(key => columns.find(col => col.key === key)),
        format,
        options
      );
      onExport?.(exportData, format);
    } catch (error) {
      console.error('Export error:', error);
    }
  }, [processedData, visibleColumns, columns, onExport]);

  const handleBulkAction = useCallback(async (action) => {
    const selectedRowData = paginatedData.filter((row, index) => 
      selectedRows.has(row.id || index)
    );
    onBulkAction?.(action, selectedRowData);
    setSelectedRows(new Set());
    setShowBulkActions(false);
  }, [paginatedData, selectedRows, onBulkAction]);

  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================
  const renderTableHeader = () => (
    <div className={styles.tableHeader}>
      <div className={styles.headerActions}>
        {searchable && (
          <div className={styles.searchBox}>
            <Search size={16} />
            <input
              type="text"
              placeholder="Suchen..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        )}
        
        {filterable && (
          <button
            onClick={() => setShowFilterPanel(true)}
            className={`${styles.headerButton} ${Object.keys(filters).length > 0 ? styles.active : ''}`}
          >
            <Filter size={16} />
            Filter {Object.keys(filters).length > 0 && `(${Object.keys(filters).length})`}
          </button>
        )}
        
        <button
          onClick={() => setShowColumnSettings(true)}
          className={styles.headerButton}
        >
          <Columns size={16} />
          Spalten
        </button>
        
        {selectedRows.size > 0 && bulkActions.length > 0 && (
          <button
            onClick={() => setShowBulkActions(true)}
            className={styles.headerButton}
          >
            <CheckSquare size={16} />
            {selectedRows.size} ausgewählt
          </button>
        )}
        
        {exportable && (
          <button
            onClick={() => setShowExportDialog(true)}
            className={styles.headerButton}
          >
            <Download size={16} />
            Export
          </button>
        )}
        
        {importable && (
          <button
            onClick={() => setShowImportDialog(true)}
            className={styles.headerButton}
          >
            <Upload size={16} />
            Import
          </button>
        )}
      </div>
      
      <div className={styles.tableInfo}>
        <span>{processedData.length} Einträge</span>
        {selectedRows.size > 0 && (
          <span>({selectedRows.size} ausgewählt)</span>
        )}
      </div>
    </div>
  );

  const renderColumnHeader = (column) => {
    const isSorted = sortConfig.key === column.key;
    const canSort = sortable && (column.sortable !== false);
    
    return (
      <th
        key={column.key}
        className={`${styles.columnHeader} ${canSort ? styles.sortable : ''}`}
        onClick={canSort ? () => handleSort(column.key) : undefined}
        style={{ width: columnWidths[column.key] || column.width }}
      >
        <div className={styles.headerContent}>
          {selectable && column.key === '__select' && (
            <input
              type="checkbox"
              checked={selectedRows.size === paginatedData.length && paginatedData.length > 0}
              onChange={(e) => handleSelectAll(e.target.checked)}
            />
          )}
          
          <span className={styles.headerTitle}>{column.title}</span>
          
          {canSort && (
            <div className={styles.sortIcon}>
              {isSorted ? (
                sortConfig.direction === 'asc' ? <SortAsc size={14} /> : <SortDesc size={14} />
              ) : (
                <ArrowUpDown size={14} />
              )}
            </div>
          )}
        </div>
        
        <div
          className={styles.resizeHandle}
          onMouseDown={(e) => {
            setIsResizing(true);
            const startX = e.clientX;
            const startWidth = columnWidths[column.key] || column.width || 150;
            
            const handleMouseMove = (e) => {
              const newWidth = Math.max(50, startWidth + (e.clientX - startX));
              handleColumnResize(column.key, newWidth);
            };
            
            const handleMouseUp = () => {
              setIsResizing(false);
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
            };
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
          }}
        />
      </th>
    );
  };

  const renderCell = (row, column, rowIndex) => {
    const cellValue = row[column.key];
    const isEditing = editingCell?.row === rowIndex && editingCell?.column === column.key;
    const isSelected = selectedRows.has(row.id || rowIndex);
    
    if (column.key === '__select') {
      return (
        <td key="__select" className={styles.selectCell}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => handleRowSelection(row.id || rowIndex, e.target.checked)}
          />
        </td>
      );
    }
    
    if (column.key === '__actions') {
      return (
        <td key="__actions" className={styles.actionsCell}>
          <div className={styles.actionButtons}>
            {customActions.map(action => (
              <button
                key={action.key}
                onClick={() => action.handler(row)}
                className={styles.actionButton}
                title={action.title}
              >
                {React.createElement(action.icon, { size: 14 })}
              </button>
            ))}
            {editable && (
              <button
                onClick={() => setEditingCell({ row: rowIndex, column: column.key })}
                className={styles.actionButton}
                title="Bearbeiten"
              >
                <Edit2 size={14} />
              </button>
            )}
          </div>
        </td>
      );
    }
    
    return (
      <td
        key={column.key}
        className={styles.tableCell}
        onClick={() => {
          if (editable && column.editable !== false) {
            setEditingCell({ row: rowIndex, column: column.key });
          }
          onRowClick?.(row, column.key);
        }}
      >
        {isEditing ? (
          <Suspense fallback={cellValue}>
            <CellEditor
              value={cellValue}
              type={column.type}
              options={column.options}
              onSave={(value) => handleCellEdit(rowIndex, column.key, value)}
              onCancel={() => setEditingCell(null)}
            />
          </Suspense>
        ) : (
          <div className={styles.cellContent}>
            {column.render ? column.render(cellValue, row, rowIndex) : cellValue}
          </div>
        )}
      </td>
    );
  };

  const renderTableBody = () => {
    if (loading) {
      return (
        <tbody>
          <tr>
            <td colSpan={visibleColumns.length} className={styles.loadingCell}>
              <LoadingSpinner />
              <span>Daten werden geladen...</span>
            </td>
          </tr>
        </tbody>
      );
    }
    
    if (error) {
      return (
        <tbody>
          <tr>
            <td colSpan={visibleColumns.length} className={styles.errorCell}>
              <AlertCircle size={24} />
              <span>Fehler beim Laden der Daten: {error.message}</span>
            </td>
          </tr>
        </tbody>
      );
    }
    
    if (paginatedData.length === 0) {
      return (
        <tbody>
          <tr>
            <td colSpan={visibleColumns.length} className={styles.emptyCell}>
              {emptyState || (
                <>
                  <Grid size={48} />
                  <h3>Keine Daten verfügbar</h3>
                  <p>Es wurden keine Einträge gefunden, die Ihren Kriterien entsprechen.</p>
                </>
              )}
            </td>
          </tr>
        </tbody>
      );
    }
    
    if (virtualizer) {
      const virtualRows = rowVirtualizer.getVirtualItems();
      
      return (
        <tbody style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
          {virtualRows.map((virtualRow) => {
            const row = paginatedData[virtualRow.index];
            const visibleCols = visibleColumns.map(key => columns.find(col => col.key === key));
            
            return (
              <tr
                key={virtualRow.index}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`
                }}
                className={`${styles.tableRow} ${selectedRows.has(row.id || virtualRow.index) ? styles.selected : ''}`}
              >
                {visibleCols.map(column => renderCell(row, column, virtualRow.index))}
              </tr>
            );
          })}
        </tbody>
      );
    }
    
    return (
      <tbody>
        {paginatedData.map((row, index) => {
          const visibleCols = visibleColumns.map(key => columns.find(col => col.key === key));
          
          return (
            <tr
              key={row.id || index}
              className={`${styles.tableRow} ${selectedRows.has(row.id || index) ? styles.selected : ''}`}
            >
              {visibleCols.map(column => renderCell(row, column, index))}
            </tr>
          );
        })}
      </tbody>
    );
  };

  const renderPagination = () => {
    if (!pagination || paginatedData.length === 0) return null;
    
    const startIndex = (currentPage - 1) * currentPageSize + 1;
    const endIndex = Math.min(currentPage * currentPageSize, processedData.length);
    
    return (
      <div className={styles.pagination}>
        <div className={styles.paginationInfo}>
          <span>
            {startIndex}-{endIndex} von {processedData.length} Einträgen
          </span>
          
          <select
            value={currentPageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            className={styles.pageSizeSelect}
          >
            {PAGINATION_SIZES.map(size => (
              <option key={size} value={size}>{size} pro Seite</option>
            ))}
          </select>
        </div>
        
        <div className={styles.paginationControls}>
          <button
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
            className={styles.pageButton}
          >
            ««
          </button>
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={styles.pageButton}
          >
            ‹
          </button>
          
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const pageNum = Math.max(1, currentPage - 2) + i;
            if (pageNum > totalPages) return null;
            
            return (
              <button
                key={pageNum}
                onClick={() => handlePageChange(pageNum)}
                className={`${styles.pageButton} ${pageNum === currentPage ? styles.active : ''}`}
              >
                {pageNum}
              </button>
            );
          })}
          
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={styles.pageButton}
          >
            ›
          </button>
          <button
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
            className={styles.pageButton}
          >
            »»
          </button>
        </div>
      </div>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  return (
    <div className={`${styles.dataTable} ${className}`}>
      {renderTableHeader()}
      
      <div 
        ref={parentRef}
        className={styles.tableContainer}
        style={{ height: virtualizer ? 400 : 'auto' }}
      >
        <table ref={tableRef} className={styles.table}>
          <thead className={styles.tableHead}>
            <tr>
              {selectable && (
                <th key="__select" className={styles.selectHeader}>
                  <input
                    type="checkbox"
                    checked={selectedRows.size === paginatedData.length && paginatedData.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </th>
              )}
              
              {visibleColumns.map(columnKey => {
                const column = columns.find(col => col.key === columnKey);
                return column ? renderColumnHeader(column) : null;
              })}
              
              {(customActions.length > 0 || editable) && (
                <th key="__actions" className={styles.actionsHeader}>
                  Aktionen
                </th>
              )}
            </tr>
          </thead>
          
          {renderTableBody()}
        </table>
      </div>
      
      {renderPagination()}

      {/* Lazy Loaded Modals */}
      {showColumnSettings && (
        <Suspense fallback={<LoadingSpinner />}>
          <ColumnSettings
            columns={columns}
            visibleColumns={visibleColumns}
            onUpdate={setVisibleColumns}
            onClose={() => setShowColumnSettings(false)}
          />
        </Suspense>
      )}

      {showExportDialog && (
        <Suspense fallback={<LoadingSpinner />}>
          <ExportDialog
            data={processedData}
            columns={columns}
            onExport={handleExport}
            onClose={() => setShowExportDialog(false)}
          />
        </Suspense>
      )}

      {showImportDialog && (
        <Suspense fallback={<LoadingSpinner />}>
          <ImportDialog
            columns={columns}
            onImport={onImport}
            onClose={() => setShowImportDialog(false)}
          />
        </Suspense>
      )}

      {showFilterPanel && (
        <Suspense fallback={<LoadingSpinner />}>
          <FilterPanel
            columns={columns}
            filters={filters}
            onFilterChange={handleFilter}
            onClose={() => setShowFilterPanel(false)}
          />
        </Suspense>
      )}

      {showBulkActions && (
        <Suspense fallback={<LoadingSpinner />}>
          <BulkActionsMenu
            actions={bulkActions}
            selectedCount={selectedRows.size}
            onAction={handleBulkAction}
            onClose={() => setShowBulkActions(false)}
          />
        </Suspense>
      )}
    </div>
  );
};

export default DataTable;