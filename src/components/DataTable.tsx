import React, { useMemo, useCallback } from 'react';
import {
  DataGrid,
  GridColDef,
  GridRowParams,
  GridRenderCellParams,
  GridRowModel,
  GridToolbar,
} from '@mui/x-data-grid';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { EntityType, ValidationError, EntityData } from '../types';
import { useDataStore } from '../store/dataStore';

interface DataTableProps {
  entityType: EntityType;
  data: EntityData;
  height?: number;
  highlightedRows?: number[];
}

export const DataTable: React.FC<DataTableProps> = ({
  entityType,
  data,
  height = 600,
  highlightedRows = [],
}) => {
  const { updateCell, clearValidationErrors } = useDataStore();

  // Create error lookup for quick access
  const errorLookup = useMemo(() => {
    const lookup: Record<string, ValidationError[]> = {};
    data.validationErrors.forEach(error => {
      const key = `${error.rowIndex}-${error.column}`;
      if (!lookup[key]) lookup[key] = [];
      lookup[key].push(error);
    });
    return lookup;
  }, [data.validationErrors]);

  // Transform data for DataGrid
  const rows = useMemo(() => {
    return data.rows.map((row, index) => ({
      id: index,
      ...row,
      _originalIndex: index, // Keep track of original index
      _version: data.rows.length + data.validationErrors.length, // Stable version for re-renders
    }));
  }, [data.rows, data.validationErrors]); // Include validationErrors as dependency

  // Create columns with error handling
  const columns: GridColDef[] = useMemo(() => {
    if (data.headers.length === 0) return [];

    return data.headers.map((header) => ({
      field: header,
      headerName: header,
      width: getColumnWidth(header),
      editable: true,
      sortable: true,
      filterable: true,
      renderCell: (params: GridRenderCellParams) => {
        const rowIndex = params.row._originalIndex;
        const cellKey = `${rowIndex}-${header}`;
        const cellErrors = errorLookup[cellKey] || [];
        
        return (
          <CellRenderer
            value={params.value}
            errors={cellErrors}
            isHighlighted={highlightedRows.includes(rowIndex)}
          />
        );
      },
      renderHeader: (params) => (
        <HeaderRenderer
          header={header}
          entityType={entityType}
          errorCount={getHeaderErrorCount(header, data.validationErrors)}
        />
      ),
    }));
  }, [data.headers, errorLookup, highlightedRows, entityType, data.validationErrors]);

  // Handle cell edits
  const handleCellEdit = useCallback(
    (newRow: GridRowModel, oldRow: GridRowModel) => {
      const changedField = Object.keys(newRow).find(
        key => newRow[key] !== oldRow[key] && key !== 'id' && key !== '_originalIndex'
      );

      if (changedField) {
        const rowIndex = newRow._originalIndex;
        updateCell(entityType, rowIndex, changedField, newRow[changedField]);
        
        // Clear validation errors for this cell to re-trigger validation
        clearValidationErrors(entityType);
      }

      return newRow;
    },
    [entityType, updateCell, clearValidationErrors]
  );

  // Get row styling based on errors and highlights
  const getRowClassName = useCallback(
    (params: GridRowParams) => {
      const rowIndex = params.row._originalIndex;
      const hasErrors = data.validationErrors.some(error => error.rowIndex === rowIndex);
      const isHighlighted = highlightedRows.includes(rowIndex);
      
      let className = '';
      if (hasErrors) className += ' row-has-errors';
      if (isHighlighted) className += ' row-highlighted';
      
      return className;
    },
    [data.validationErrors, highlightedRows]
  );

  if (data.rows.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          No {entityType} data loaded
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Upload a file to see data here
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ width: '100%', height }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <DataTableHeader 
          entityType={entityType} 
          data={data} 
          totalRows={rows.length}
          highlightedCount={highlightedRows.length}
        />
      </Box>
      
      <Box sx={{ height: height - 100, width: '100%' }}>
        <DataGrid
          key={`${entityType}-${data.rows.length}-${data.validationErrors.length}`}
          rows={rows}
          columns={columns}
          processRowUpdate={handleCellEdit}
          onProcessRowUpdateError={(error) => {
            console.error('Row update error:', error);
          }}
          getRowClassName={getRowClassName}
          slots={{
            toolbar: GridToolbar,
          }}
          slotProps={{
            toolbar: {
              showQuickFilter: true,
              quickFilterProps: { debounceMs: 500 },
            },
          }}
          sx={{
            '& .row-has-errors': {
              backgroundColor: 'rgba(244, 67, 54, 0.08)',
            },
            '& .row-highlighted': {
              backgroundColor: 'rgba(33, 150, 243, 0.12)',
            },
            '& .cell-error': {
              backgroundColor: 'rgba(244, 67, 54, 0.15)',
              border: '1px solid rgba(244, 67, 54, 0.5)',
            },
            '& .cell-warning': {
              backgroundColor: 'rgba(255, 152, 0, 0.15)',
              border: '1px solid rgba(255, 152, 0, 0.5)',
            },
            '& .MuiDataGrid-cell:focus': {
              outline: '2px solid #1976d2',
            },
          }}
          density="compact"
          disableRowSelectionOnClick
          autoHeight={false}
        />
      </Box>
    </Paper>
  );
};

// Cell renderer component with error handling
const CellRenderer: React.FC<{
  value: unknown;
  errors: ValidationError[];
  isHighlighted: boolean;
}> = ({ value, errors }) => {
  const hasErrors = errors.length > 0;
  const severity = hasErrors ? errors[0].severity : 'info';
  
  const cellClass = hasErrors 
    ? severity === 'error' 
      ? 'cell-error' 
      : 'cell-warning'
    : '';

  const displayValue = formatCellValue(value);

  if (!hasErrors) {
    return <span>{displayValue}</span>;
  }

  return (
    <Tooltip
      title={
        <Box>
          {errors.map((error, index) => (
            <Typography key={index} variant="body2" sx={{ mb: index < errors.length - 1 ? 1 : 0 }}>
              <Box component="span" sx={{ fontWeight: 'bold' }}>
                {error.severity === 'error' ? '❌' : '⚠️'}
              </Box>
              {' '}{error.error}
            </Typography>
          ))}
        </Box>
      }
      arrow
      placement="top"
    >
      <Box className={cellClass} sx={{ p: 0.5, borderRadius: 0.5, width: '100%' }}>
        {displayValue}
      </Box>
    </Tooltip>
  );
};

// Header renderer with error count
const HeaderRenderer: React.FC<{
  header: string;
  entityType: EntityType;
  errorCount: number;
}> = ({ header, entityType, errorCount }) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
        {header}
      </Typography>
             {errorCount > 0 && (
         <Badge badgeContent={errorCount} color="error">
           <ErrorIcon sx={{ fontSize: 16, color: 'error.main' }} />
         </Badge>
       )}
    </Box>
  );
};

// Data table header component
const DataTableHeader: React.FC<{
  entityType: EntityType;
  data: EntityData;
  totalRows: number;
  highlightedCount: number;
}> = ({ entityType, data, totalRows, highlightedCount }) => {
  const errorCount = data.validationErrors.filter(e => e.severity === 'error').length;
  const warningCount = data.validationErrors.filter(e => e.severity === 'warning').length;

  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Box>
        <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
          {entityType} Data
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {totalRows} rows • {data.headers.length} columns
          {data.fileName && ` • ${data.fileName}`}
        </Typography>
      </Box>
      
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        {highlightedCount > 0 && (
          <Chip
            icon={<InfoIcon />}
            label={`${highlightedCount} filtered`}
            size="small"
            color="info"
            variant="outlined"
          />
        )}
        
        {errorCount > 0 && (
          <Chip
            icon={<ErrorIcon />}
            label={`${errorCount} errors`}
            size="small"
            color="error"
            variant="outlined"
          />
        )}
        
        {warningCount > 0 && (
          <Chip
            icon={<WarningIcon />}
            label={`${warningCount} warnings`}
            size="small"
            color="warning"
            variant="outlined"
          />
        )}
        
        {errorCount === 0 && warningCount === 0 && (
          <Chip
            icon={<CheckCircleIcon />}
            label="No issues"
            size="small"
            color="success"
            variant="outlined"
          />
        )}
      </Box>
    </Box>
  );
};

// Helper functions
const getColumnWidth = (header: string): number => {
  const widthMap: Record<string, number> = {
    'ClientID': 100,
    'WorkerID': 100,
    'TaskID': 100,
    'ClientName': 150,
    'WorkerName': 150,
    'TaskName': 150,
    'PriorityLevel': 120,
    'Skills': 200,
    'RequiredSkills': 200,
    'RequestedTaskIDs': 200,
    'AttributesJSON': 250,
    'AvailableSlots': 150,
    'PreferredPhases': 150,
    'MaxLoadPerPhase': 150,
    'MaxConcurrent': 130,
    'Duration': 100,
    'Category': 120,
    'GroupTag': 120,
    'WorkerGroup': 120,
    'QualificationLevel': 150,
  };
  
  return widthMap[header] || 130;
};

const formatCellValue = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const getHeaderErrorCount = (header: string, errors: ValidationError[]): number => {
  return errors.filter(error => error.column === header).length;
}; 