import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  Alert,
  AlertTitle,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Divider,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormGroup,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
} from '@mui/material';

import {
  FileDownload,
  TableChart,
  Rule as RuleIcon,
  Assessment,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  GetApp,
  Settings,
  DataObject,
  Description,
} from '@mui/icons-material';
import { useDataStore } from '../store/dataStore';
import { useRulesStore } from '../store/rulesStore';
import type { EntityType } from '../types';

type ExportFormat = 'csv' | 'json' | 'xlsx';
type ExportType = 'data' | 'rules' | 'report' | 'validation';

interface ExportOptions {
  format: ExportFormat;
  includeHeaders: boolean;
  includeValidationErrors: boolean;
  includeMetadata: boolean;
  cleanDataOnly: boolean;
}

export const ExportTab: React.FC = () => {
  const [selectedExportType, setSelectedExportType] = useState<ExportType>('data');
  const [selectedEntities, setSelectedEntities] = useState<EntityType[]>(['clients', 'workers', 'tasks']);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'csv',
    includeHeaders: true,
    includeValidationErrors: false,
    includeMetadata: true,
    cleanDataOnly: true,
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [showOptionsDialog, setShowOptionsDialog] = useState(false);

  const { clients, workers, tasks, modificationHistory } = useDataStore();
  const { rules, priorityWeights } = useRulesStore();

  const entityData = { clients, workers, tasks };


  const convertToCSV = (data: any[], headers: string[]): string => {
    const csvHeaders = headers.join(',');
    const csvRows = data.map(row => 
      headers.map(header => {
        const value = row[header];
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      }).join(',')
    );
    return [csvHeaders, ...csvRows].join('\n');
  };

  const downloadFile = (content: string, filename: string, mimeType: string = 'text/csv') => {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const exportEntityData = async (entityType: EntityType) => {
    const data = entityData[entityType];
    
    if (data.rows.length === 0) {
      throw new Error(`No data available for ${entityType}`);
    }

    let exportData = [...data.rows];
    
    if (exportOptions.cleanDataOnly) {
      const errorRowIndices = new Set(data.validationErrors.map(err => err.rowIndex));
      exportData = exportData.filter((_, index) => !errorRowIndices.has(index));
    }

    const timestamp = new Date().toISOString().split('T')[0];
    
    if (exportOptions.format === 'csv') {
      const csvContent = convertToCSV(exportData, data.headers);
      downloadFile(csvContent, `${entityType}_${timestamp}.csv`);
    } else if (exportOptions.format === 'json') {
      const jsonContent = JSON.stringify({
        entityType,
        exportedAt: new Date().toISOString(),
        totalRows: exportData.length,
        headers: data.headers,
        data: exportData,
        ...(exportOptions.includeValidationErrors && { validationErrors: data.validationErrors }),
        ...(exportOptions.includeMetadata && { 
          originalFileName: data.fileName,
          headerMapping: data.headerMapping,
          modifications: modificationHistory.filter(h => h.command.toLowerCase().includes(entityType))
        })
      }, null, 2);
      downloadFile(jsonContent, `${entityType}_${timestamp}.json`, 'application/json');
    }
  };

  const exportRules = async () => {
    const rulesExport = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      dataContext: {
        clientCount: clients.rows.length,
        workerCount: workers.rows.length,
        taskCount: tasks.rows.length,
      },
      rules: rules,
      priorityWeights: priorityWeights,
      metadata: {
        totalRules: rules.length,
        enabledRules: rules.filter(r => r.enabled).length,
        ruleTypes: [...new Set(rules.map(r => r.type))],
      }
    };

    const content = JSON.stringify(rulesExport, null, 2);
    const timestamp = new Date().toISOString().split('T')[0];
    downloadFile(content, `business_rules_${timestamp}.json`, 'application/json');
  };

  const exportValidationReport = async () => {
    const allErrors = [
      ...clients.validationErrors.map(err => ({ ...err, entityType: 'clients' })),
      ...workers.validationErrors.map(err => ({ ...err, entityType: 'workers' })),
      ...tasks.validationErrors.map(err => ({ ...err, entityType: 'tasks' })),
    ];

    const report = {
      exportedAt: new Date().toISOString(),
      summary: {
        totalRows: clients.rows.length + workers.rows.length + tasks.rows.length,
        totalErrors: allErrors.length,
        errorsByEntity: {
          clients: clients.validationErrors.length,
          workers: workers.validationErrors.length,
          tasks: tasks.validationErrors.length,
        },
        errorsBySeverity: {
          error: allErrors.filter(err => err.severity === 'error').length,
          warning: allErrors.filter(err => err.severity === 'warning').length,
        }
      },
      detailedErrors: allErrors,
      dataQualityScore: Math.max(0, 100 - (allErrors.length / (clients.rows.length + workers.rows.length + tasks.rows.length)) * 100),
    };

    const content = JSON.stringify(report, null, 2);
    const timestamp = new Date().toISOString().split('T')[0];
    downloadFile(content, `validation_report_${timestamp}.json`, 'application/json');
  };

  const exportDataQualityReport = async () => {
    const totalRows = clients.rows.length + workers.rows.length + tasks.rows.length;
    const totalErrors = clients.validationErrors.length + workers.validationErrors.length + tasks.validationErrors.length;
    
    const report = `# Data Quality Report
Generated: ${new Date().toLocaleString()}

## Summary
- Total Data Rows: ${totalRows.toLocaleString()}
- Total Validation Issues: ${totalErrors}
- Data Quality Score: ${Math.round(Math.max(0, 100 - (totalErrors / totalRows) * 100))}%

## Entity Breakdown
### Clients
- Rows: ${clients.rows.length}
- Errors: ${clients.validationErrors.length}
- Quality: ${clients.rows.length > 0 ? Math.round((1 - clients.validationErrors.length / clients.rows.length) * 100) : 100}%

### Workers  
- Rows: ${workers.rows.length}
- Errors: ${workers.validationErrors.length}
- Quality: ${workers.rows.length > 0 ? Math.round((1 - workers.validationErrors.length / workers.rows.length) * 100) : 100}%

### Tasks
- Rows: ${tasks.rows.length}  
- Errors: ${tasks.validationErrors.length}
- Quality: ${tasks.rows.length > 0 ? Math.round((1 - tasks.validationErrors.length / tasks.rows.length) * 100) : 100}%

## Business Rules
- Total Rules: ${rules.length}
- Enabled Rules: ${rules.filter(r => r.enabled).length}
- Rule Types: ${[...new Set(rules.map(r => r.type))].join(', ')}

## Data Modifications Applied
${modificationHistory.length > 0 ? 
  modificationHistory.map(h => `- ${h.command} (${h.modifications.length} changes on ${new Date(h.appliedAt).toLocaleDateString()})`).join('\n') :
  'No modifications applied yet'
}

---
Generated by Data Alchemist`;

    const timestamp = new Date().toISOString().split('T')[0];
    downloadFile(report, `data_quality_report_${timestamp}.md`, 'text/markdown');
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);

    try {
      if (selectedExportType === 'data') {
        const totalEntities = selectedEntities.length;
        for (let i = 0; i < selectedEntities.length; i++) {
          await exportEntityData(selectedEntities[i]);
          setExportProgress(((i + 1) / totalEntities) * 100);
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } else if (selectedExportType === 'rules') {
        await exportRules();
        setExportProgress(100);
      } else if (selectedExportType === 'validation') {
        await exportValidationReport();
        setExportProgress(100);
      } else if (selectedExportType === 'report') {
        await exportDataQualityReport();
        setExportProgress(100);
      }

      setTimeout(() => {
        setExportProgress(0);
        setIsExporting(false);
      }, 1000);

    } catch (error) {
      console.error('Export error:', error);
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const getEntityStats = (entityType: EntityType) => {
    const data = entityData[entityType];
    const errorRows = new Set(data.validationErrors.map(err => err.rowIndex));
    const cleanRows = data.rows.length - errorRows.size;
    
    return {
      total: data.rows.length,
      clean: cleanRows,
      errors: data.validationErrors.length,
      quality: data.rows.length > 0 ? Math.round((cleanRows / data.rows.length) * 100) : 100
    };
  };

  const totalDataRows = clients.rows.length + workers.rows.length + tasks.rows.length;
  const totalErrors = clients.validationErrors.length + workers.validationErrors.length + tasks.validationErrors.length;

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)', color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <FileDownload sx={{ mr: 2, fontSize: 32 }} />
          <Typography variant="h4" component="h1">
            Export Clean Data
          </Typography>
        </Box>
        <Typography variant="body1" sx={{ opacity: 0.9 }}>
          Download your cleaned and validated data in multiple formats.
        </Typography>
      </Paper>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <DataObject sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {totalDataRows.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Rows
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <CheckCircle sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {((totalDataRows - totalErrors) / Math.max(totalDataRows, 1) * 100).toFixed(1)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Data Quality
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <RuleIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {rules.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Business Rules
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <GetApp sx={{ fontSize: 40, color: 'secondary.main', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {modificationHistory.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Modifications Applied
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              What would you like to export?
            </Typography>
            
            <Grid container spacing={2}>
              {/* Data Export */}
              <Grid item xs={12} sm={6}>
                <Card 
                  sx={{ 
                    cursor: 'pointer',
                    border: selectedExportType === 'data' ? 2 : 1,
                    borderColor: selectedExportType === 'data' ? 'primary.main' : 'divider',
                    '&:hover': { borderColor: 'primary.main' }
                  }}
                  onClick={() => setSelectedExportType('data')}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <TableChart sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="h6">Clean Data</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Export cleaned CSV/JSON files for each entity
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {(['clients', 'workers', 'tasks'] as EntityType[]).map(entity => {
                        const stats = getEntityStats(entity);
                        return (
                          <Chip 
                            key={entity}
                            label={`${entity}: ${stats.clean}/${stats.total}`}
                            size="small"
                            color={stats.quality > 90 ? 'success' : stats.quality > 70 ? 'warning' : 'error'}
                            variant="outlined"
                          />
                        );
                      })}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Card 
                  sx={{ 
                    cursor: 'pointer',
                    border: selectedExportType === 'rules' ? 2 : 1,
                    borderColor: selectedExportType === 'rules' ? 'primary.main' : 'divider',
                    '&:hover': { borderColor: 'primary.main' }
                  }}
                  onClick={() => setSelectedExportType('rules')}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <RuleIcon sx={{ mr: 1, color: 'info.main' }} />
                      <Typography variant="h6">Business Rules</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Export rules configuration as JSON
                    </Typography>
                    <Chip 
                      label={`${rules.length} rules, ${rules.filter(r => r.enabled).length} enabled`}
                      size="small"
                      color="info"
                      variant="outlined"
                    />
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Card 
                  sx={{ 
                    cursor: 'pointer',
                    border: selectedExportType === 'validation' ? 2 : 1,
                    borderColor: selectedExportType === 'validation' ? 'primary.main' : 'divider',
                    '&:hover': { borderColor: 'primary.main' }
                  }}
                  onClick={() => setSelectedExportType('validation')}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Warning sx={{ mr: 1, color: 'warning.main' }} />
                      <Typography variant="h6">Validation Report</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Detailed validation errors and issues
                    </Typography>
                    <Chip 
                      label={`${totalErrors} total issues`}
                      size="small"
                      color={totalErrors === 0 ? 'success' : 'warning'}
                      variant="outlined"
                    />
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Card 
                  sx={{ 
                    cursor: 'pointer',
                    border: selectedExportType === 'report' ? 2 : 1,
                    borderColor: selectedExportType === 'report' ? 'primary.main' : 'divider',
                    '&:hover': { borderColor: 'primary.main' }
                  }}
                  onClick={() => setSelectedExportType('report')}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Assessment sx={{ mr: 1, color: 'success.main' }} />
                      <Typography variant="h6">Quality Report</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Comprehensive data quality summary
                    </Typography>
                    <Chip 
                      label={`${((totalDataRows - totalErrors) / Math.max(totalDataRows, 1) * 100).toFixed(1)}% quality score`}
                      size="small"
                      color="success"
                      variant="outlined"
                    />
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {selectedExportType === 'data' && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Select entities to export:
                </Typography>
                <FormGroup row>
                  {(['clients', 'workers', 'tasks'] as EntityType[]).map(entity => (
                    <FormControlLabel
                      key={entity}
                      control={
                        <Checkbox
                          checked={selectedEntities.includes(entity)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedEntities([...selectedEntities, entity]);
                            } else {
                              setSelectedEntities(selectedEntities.filter(e => e !== entity));
                            }
                          }}
                        />
                      }
                      label={`${entity} (${getEntityStats(entity).clean} clean rows)`}
                    />
                  ))}
                </FormGroup>
              </Box>
            )}

            {isExporting && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Exporting... {Math.round(exportProgress)}%
                </Typography>
                <LinearProgress variant="determinate" value={exportProgress} />
              </Box>
            )}

            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={<FileDownload />}
                onClick={handleExport}
                disabled={isExporting || (selectedExportType === 'data' && selectedEntities.length === 0)}
                size="large"
              >
                {isExporting ? 'Exporting...' : 'Download Export'}
              </Button>
              
              {selectedExportType === 'data' && (
                <Button
                  variant="outlined"
                  startIcon={<Settings />}
                  onClick={() => setShowOptionsDialog(true)}
                >
                  Export Options
                </Button>
              )}
            </Box>
          </Paper>

          {totalDataRows === 0 && (
            <Alert severity="info">
              <AlertTitle>No Data to Export</AlertTitle>
              Upload data in the &quot;Upload &amp; Clean&quot; tab to enable export functionality.
            </Alert>
          )}
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Export Preview
            </Typography>
            
            {selectedExportType === 'data' && (
              <List dense>
                {selectedEntities.map(entity => {
                  const stats = getEntityStats(entity);
                  return (
                    <ListItem key={entity}>
                      <ListItemIcon>
                        <DataObject color={stats.quality > 90 ? 'success' : 'warning'} />
                      </ListItemIcon>
                      <ListItemText
                        primary={`${entity}.${exportOptions.format}`}
                        secondary={`${stats.clean} clean rows (${stats.quality}% quality)`}
                      />
                    </ListItem>
                  );
                })}
              </List>
            )}

            {selectedExportType === 'rules' && (
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <Description />
                  </ListItemIcon>
                  <ListItemText
                    primary="business_rules.json"
                    secondary={`${rules.length} rules with metadata`}
                  />
                </ListItem>
              </List>
            )}

            {selectedExportType === 'validation' && (
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <Warning />
                  </ListItemIcon>
                  <ListItemText
                    primary="validation_report.json"
                    secondary={`${totalErrors} validation issues`}
                  />
                </ListItem>
              </List>
            )}

            {selectedExportType === 'report' && (
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <Assessment />
                  </ListItemIcon>
                  <ListItemText
                    primary="data_quality_report.md"
                    secondary="Comprehensive quality analysis"
                  />
                </ListItem>
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Dialog open={showOptionsDialog} onClose={() => setShowOptionsDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Export Options</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Format</InputLabel>
            <Select
              value={exportOptions.format}
              label="Format"
              onChange={(e) => setExportOptions({ ...exportOptions, format: e.target.value as ExportFormat })}
            >
              <MenuItem value="csv">CSV (Comma Separated)</MenuItem>
              <MenuItem value="json">JSON (JavaScript Object Notation)</MenuItem>
            </Select>
          </FormControl>

          <FormGroup>
            <FormControlLabel
              control={
                <Switch
                  checked={exportOptions.includeHeaders}
                  onChange={(e) => setExportOptions({ ...exportOptions, includeHeaders: e.target.checked })}
                />
              }
              label="Include column headers"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={exportOptions.cleanDataOnly}
                  onChange={(e) => setExportOptions({ ...exportOptions, cleanDataOnly: e.target.checked })}
                />
              }
              label="Export clean data only (exclude rows with validation errors)"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={exportOptions.includeValidationErrors}
                  onChange={(e) => setExportOptions({ ...exportOptions, includeValidationErrors: e.target.checked })}
                />
              }
              label="Include validation errors in JSON export"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={exportOptions.includeMetadata}
                  onChange={(e) => setExportOptions({ ...exportOptions, includeMetadata: e.target.checked })}
                />
              }
              label="Include metadata (timestamps, modifications, etc.)"
            />
          </FormGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowOptionsDialog(false)}>Cancel</Button>
          <Button onClick={() => setShowOptionsDialog(false)} variant="contained">Apply Options</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}; 