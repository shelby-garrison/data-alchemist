import React, { useState, useCallback } from 'react';
import {
  Paper,
  Button,
  Box,
  Typography,
  Alert,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,

  Checkbox,

  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Badge,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,

  SelectChangeEvent,
} from '@mui/material';
import {
  AutoFixHigh as AutoFixHighIcon,
  Build as BuildIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  BugReport as BugReportIcon,
  Healing as HealingIcon,
  Preview as PreviewIcon,
} from '@mui/icons-material';
import { EntityType, ValidationError, ErrorCorrectionSuggestion, ErrorCorrectionBatch } from '../types';
import { generateErrorCorrections } from '../utils/geminiservice';
import { useDataStore } from '../store/dataStore';

interface AIErrorCorrectionProps {
  entityType: EntityType;
  className?: string;
}

export const AIErrorCorrection: React.FC<AIErrorCorrectionProps> = ({
  entityType,
  className = '',
}) => {
  const {
    [entityType]: entityData,
    errorCorrectionBatches,
    isGeneratingCorrections,
    addErrorCorrectionBatch,
    applyErrorCorrections,
    rejectErrorCorrectionBatch,
    setGeneratingCorrections,
  } = useDataStore();

  const [showCorrectionDialog, setShowCorrectionDialog] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<ErrorCorrectionBatch | null>(null);
  const [selectedSuggestionIds, setSelectedSuggestionIds] = useState<string[]>([]);
  const [filterBySeverity, setFilterBySeverity] = useState<'all' | 'error' | 'warning'>('all');
  const [error, setError] = useState<string | null>(null);

  const { validationErrors = [], rows = [] } = entityData || {};

  const filteredErrors = validationErrors.filter(err => 
    filterBySeverity === 'all' || err.severity === filterBySeverity
  );

  const errorGroups = filteredErrors.reduce((groups, error) => {
    const key = error.error.split(':')[0] || 'Other';
    if (!groups[key]) groups[key] = [];
    groups[key].push(error);
    return groups;
  }, {} as Record<string, ValidationError[]>);

  const handleGenerateCorrections = useCallback(async () => {
    if (filteredErrors.length === 0) return;

    setGeneratingCorrections(true);
    setError(null);

    try {
      const response = await generateErrorCorrections(
        filteredErrors,
        entityType,
        rows
      );

      const batch: ErrorCorrectionBatch = {
        id: response.batchId,
        entityType,
        suggestions: response.suggestions,
        createdAt: new Date().toISOString(),
        status: 'pending',
      };

      addErrorCorrectionBatch(batch);
      setSelectedBatch(batch);
      setSelectedSuggestionIds(batch.suggestions.map(s => s.id));
      setShowCorrectionDialog(true);

    } catch (error) {
      console.error('Error generating corrections:', error);
      setError('Failed to generate error corrections. Please try again.');
    } finally {
      setGeneratingCorrections(false);
    }
  }, [filteredErrors, entityType, rows, addErrorCorrectionBatch, setGeneratingCorrections]);

  const handleApplyCorrections = () => {
    if (selectedBatch && selectedSuggestionIds.length > 0) {
      applyErrorCorrections(selectedBatch.id, selectedSuggestionIds);
      setShowCorrectionDialog(false);
      setSelectedBatch(null);
      setSelectedSuggestionIds([]);
    }
  };

  const handleRejectBatch = () => {
    if (selectedBatch) {
      rejectErrorCorrectionBatch(selectedBatch.id);
      setShowCorrectionDialog(false);
      setSelectedBatch(null);
      setSelectedSuggestionIds([]);
    }
  };

  const handleToggleSuggestion = (suggestionId: string) => {
    setSelectedSuggestionIds(prev => 
      prev.includes(suggestionId)
        ? prev.filter(id => id !== suggestionId)
        : [...prev, suggestionId]
    );
  };

  const handleSelectAll = () => {
    if (selectedBatch) {
      setSelectedSuggestionIds(selectedBatch.suggestions.map(s => s.id));
    }
  };

  const handleSelectNone = () => {
    setSelectedSuggestionIds([]);
  };

  const getCorrectionTypeIcon = (type: ErrorCorrectionSuggestion['correctionType']) => {
    switch (type) {
      case 'fix':
        return <HealingIcon color="success" />;
      case 'replace':
        return <AutoFixHighIcon color="primary" />;
      case 'remove':
        return <CancelIcon color="error" />;
      case 'format':
        return <BuildIcon color="info" />;
      default:
        return <InfoIcon />;
    }
  };

  const getCorrectionTypeLabel = (type: ErrorCorrectionSuggestion['correctionType']) => {
    switch (type) {
      case 'fix':
        return 'Fix Error';
      case 'replace':
        return 'Replace Value';
      case 'remove':
        return 'Remove Invalid';
      case 'format':
        return 'Reformat';
      default:
        return 'Modify';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.6) return 'warning';
    return 'error';
  };

  const getSeverityIcon = (severity: 'error' | 'warning') => {
    return severity === 'error' ? <BugReportIcon color="error" /> : <WarningIcon color="warning" />;
  };

  const pendingBatches = errorCorrectionBatches.filter(batch => batch.status === 'pending');
  const appliedBatches = errorCorrectionBatches.filter(batch => batch.status === 'applied');

  return (
    <Paper sx={{ p: 3 }} className={className}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <HealingIcon color="primary" />
        <Typography variant="h6">
          AI Error Correction
        </Typography>
        <Badge badgeContent={filteredErrors.length} color="error">
          <BugReportIcon />
        </Badge>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        AI analyzes your validation errors and suggests specific corrections to fix data quality issues.
        <strong> Note: The AI will process ALL {filteredErrors.length} validation errors, not just the ones displayed in the summary.</strong>
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Filter by</InputLabel>
          <Select
            value={filterBySeverity}
            label="Filter by"
            onChange={(e: SelectChangeEvent<string>) => setFilterBySeverity(e.target.value as 'all' | 'error' | 'warning')}
          >
            <MenuItem value="all">All Issues</MenuItem>
            <MenuItem value="error">Errors Only</MenuItem>
            <MenuItem value="warning">Warnings Only</MenuItem>
          </Select>
        </FormControl>

        <Button
          variant="contained"
          onClick={handleGenerateCorrections}
          disabled={isGeneratingCorrections || filteredErrors.length === 0}
          startIcon={isGeneratingCorrections ? <CircularProgress size={20} /> : <AutoFixHighIcon />}
        >
          {isGeneratingCorrections ? 'Analyzing...' : 'Generate Corrections'}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {validationErrors.length === 0 && (
        <Alert severity="success" sx={{ mb: 2 }}>
          🎉 No validation errors found! Your {entityType} data looks clean.
        </Alert>
      )}

      {filteredErrors.length === 0 && validationErrors.length > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          No {filterBySeverity} issues found. Try changing the filter or check other severity levels.
        </Alert>
      )}

      {filteredErrors.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Error Summary ({filteredErrors.length} issues):
          </Typography>
          
          {Object.entries(errorGroups).map(([errorType, errors]) => (
            <Accordion key={errorType} sx={{ mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {getSeverityIcon(errors[0].severity)}
                  <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                    {errorType}
                  </Typography>
                  <Chip label={errors.length} size="small" />
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <List dense>
                  {errors.slice(0, 10).map((error, index) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={`Row ${error.rowIndex + 1}, Column: ${error.column}`}
                        secondary={error.error}
                      />
                    </ListItem>
                  ))}
                  {errors.length > 10 && (
                    <ListItem>
                      <ListItemText
                        secondary={`... and ${errors.length - 10} more similar issues (AI will process ALL ${errors.length} errors)`}
                      />
                    </ListItem>
                  )}
                </List>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}

      {pendingBatches.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Pending Corrections:
          </Typography>
          {pendingBatches.map((batch) => (
            <Alert
              key={batch.id}
              severity="info"
              sx={{ mb: 1 }}
              action={
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    onClick={() => {
                      setSelectedBatch(batch);
                      setSelectedSuggestionIds(batch.suggestions.map(s => s.id));
                      setShowCorrectionDialog(true);
                    }}
                    startIcon={<PreviewIcon />}
                  >
                    Review
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    onClick={() => rejectErrorCorrectionBatch(batch.id)}
                    startIcon={<CancelIcon />}
                  >
                    Reject
                  </Button>
                </Box>
              }
            >
              <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                {batch.suggestions.length} corrections suggested
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Created: {new Date(batch.createdAt).toLocaleString()}
              </Typography>
            </Alert>
          ))}
        </Box>
      )}

      {appliedBatches.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Recent Corrections Applied:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {appliedBatches.slice(-3).map((batch) => (
              <Chip
                key={batch.id}
                icon={<CheckCircleIcon />}
                label={`${batch.suggestions.length} fixes applied`}
                color="success"
                size="small"
              />
            ))}
          </Box>
        </Box>
      )}

      <Dialog
        open={showCorrectionDialog}
        onClose={() => setShowCorrectionDialog(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HealingIcon />
            Review Error Corrections
            {selectedBatch && (
              <Chip
                label={`${selectedBatch.suggestions.length} suggestions`}
                color="primary"
                size="small"
              />
            )}
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {selectedBatch && (
            <>
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <Button
                  size="small"
                  onClick={handleSelectAll}
                  startIcon={<CheckCircleIcon />}
                >
                  Select All
                </Button>
                <Button
                  size="small"
                  onClick={handleSelectNone}
                  startIcon={<CancelIcon />}
                >
                  Select None
                </Button>
                <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
                  {selectedSuggestionIds.length} of {selectedBatch.suggestions.length} selected
                </Typography>
              </Box>

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">Apply</TableCell>
                      <TableCell>Issue</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell>Current</TableCell>
                      <TableCell>Fix</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Confidence</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedBatch.suggestions.map((suggestion) => (
                      <TableRow key={suggestion.id}>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selectedSuggestionIds.includes(suggestion.id)}
                            onChange={() => handleToggleSuggestion(suggestion.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {suggestion.explanation}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            Row {suggestion.rowIndex + 1}<br />
                            <Typography variant="caption" color="text.secondary">
                              {suggestion.column}
                            </Typography>
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {String(suggestion.currentValue || 'null')}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="primary">
                            {String(suggestion.suggestedValue || 'null')}
                          </Typography>
                          {suggestion.alternativeOptions && suggestion.alternativeOptions.length > 0 && (
                            <Typography variant="caption" color="text.secondary">
                              <br />Alternatives: {suggestion.alternativeOptions.join(', ')}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {getCorrectionTypeIcon(suggestion.correctionType)}
                            <Typography variant="caption">
                              {getCorrectionTypeLabel(suggestion.correctionType)}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={`${Math.round(suggestion.confidence * 100)}%`}
                            color={getConfidenceColor(suggestion.confidence)}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleRejectBatch} color="error">
            Reject All
          </Button>
          <Button
            onClick={handleApplyCorrections}
            variant="contained"
            disabled={selectedSuggestionIds.length === 0}
            startIcon={<CheckCircleIcon />}
          >
            Apply Selected ({selectedSuggestionIds.length})
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}; 