import React, { useState, useEffect, useMemo } from 'react';
import {
  Paper,
  Typography,
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Switch,
  FormControlLabel,
  Chip,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Button,
  Divider,
  CircularProgress,
  Tooltip,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  AutoFixHigh as AutoFixHighIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { EntityType, ValidationError } from '../types';
import { useDataStore } from '../store/dataStore';
import { ValidationRules } from '../utils/validation';
import { getAIValidationSuggestions, AIValidationSuggestion } from '../utils/geminiservice';

interface ValidationPanelProps {
  entityType: EntityType;
  onJumpToCell?: (rowIndex: number, columnName: string) => void;
}

export const ValidationPanel: React.FC<ValidationPanelProps> = ({
  entityType,
  onJumpToCell,
}) => {
  const { [entityType]: entityData } = useDataStore();
  const [validationRules, setValidationRules] = useState(ValidationRules);
  const [aiSuggestions, setAiSuggestions] = useState<AIValidationSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showRulesDialog, setShowRulesDialog] = useState(false);
  const [expanded, setExpanded] = useState<string>('validation-errors');

  const { validationErrors, rows } = entityData;

  
  const groupedErrors = useMemo(() => {
    const groups: Record<string, ValidationError[]> = {
      errors: [],
      warnings: [],
      info: [],
    };

    validationErrors.forEach(error => {
      if (error.severity === 'error') {
        groups.errors.push(error);
      } else if (error.severity === 'warning') {
        groups.warnings.push(error);
      } else {
        groups.info.push(error);
      }
    });

    return groups;
  }, [validationErrors]);

  const validationStats = useMemo(() => {
    const affectedRows = new Set(validationErrors.map(e => e.rowIndex)).size;
    const totalRows = rows.length;
    const cleanRows = totalRows - affectedRows;
    
    return {
      totalIssues: validationErrors.length,
      errorCount: groupedErrors.errors.length,
      warningCount: groupedErrors.warnings.length,
      infoCount: groupedErrors.info.length,
      affectedRows,
      cleanRows,
      totalRows,
      healthScore: totalRows > 0 ? Math.round((cleanRows / totalRows) * 100) : 100,
    };
  }, [validationErrors, groupedErrors, rows.length]);

  useEffect(() => {
    if (rows.length > 0 && validationErrors.length > 0) {
      loadAISuggestions();
    }
  }, [rows.length, validationErrors.length]);

  const loadAISuggestions = async () => {
    if (rows.length === 0) return;
    
    setLoadingSuggestions(true);
    try {
      const existingErrors = validationErrors.map(e => e.error);
      // Send more rows for better AI analysis, but limit to reasonable size
      const maxRowsForAI = Math.min(50, rows.length);
      const suggestions = await getAIValidationSuggestions(
        entityType,
        rows.slice(0, maxRowsForAI),
        existingErrors
      );
      setAiSuggestions(suggestions);
    } catch (error) {
      console.error('Failed to load AI suggestions:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleToggleRule = (ruleId: string) => {
    setValidationRules(prev => ({
      ...prev,
      [ruleId]: {
        ...prev[ruleId as keyof typeof prev],
        enabled: !prev[ruleId as keyof typeof prev].enabled,
      },
    }));
  };

  const handleToggleAISuggestion = (suggestionId: string) => {
    setAiSuggestions(prev =>
      prev.map(suggestion =>
        suggestion.id === suggestionId
          ? { ...suggestion, enabled: !suggestion.enabled }
          : suggestion
      )
    );
  };

  const handleAccordionChange = (panel: string) => (
    event: React.SyntheticEvent,
    isExpanded: boolean
  ) => {
    setExpanded(isExpanded ? panel : '');
  };

  const getSeverityIcon = (severity: 'error' | 'warning' | 'info') => {
    switch (severity) {
      case 'error':
        return <ErrorIcon color="error" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'info':
        return <InfoIcon color="info" />;
    }
  };

  const getSeverityColor = (severity: 'error' | 'warning' | 'info') => {
    switch (severity) {
      case 'error':
        return 'error.main';
      case 'warning':
        return 'warning.main';
      case 'info':
        return 'info.main';
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          Data Quality Panel
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Tooltip title="Refresh AI suggestions">
            <Button
              size="small"
              onClick={loadAISuggestions}
              disabled={loadingSuggestions || rows.length === 0}
              startIcon={loadingSuggestions ? <CircularProgress size={16} /> : <RefreshIcon />}
            >
              AI Insights
            </Button>
          </Tooltip>
          <Button
            size="small"
            onClick={() => setShowRulesDialog(true)}
            startIcon={<SettingsIcon />}
            variant="outlined"
          >
            Rules
          </Button>
        </Box>
      </Box>

      <Alert 
        severity={validationStats.healthScore >= 90 ? 'success' : validationStats.healthScore >= 70 ? 'warning' : 'error'}
        sx={{ mb: 3 }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6">
              Data Health Score: {validationStats.healthScore}%
            </Typography>
            <Typography variant="body2">
              {validationStats.cleanRows} of {validationStats.totalRows} rows are clean
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {validationStats.errorCount > 0 && (
              <Chip 
                icon={<ErrorIcon />} 
                label={`${validationStats.errorCount} errors`} 
                color="error" 
                size="small" 
              />
            )}
            {validationStats.warningCount > 0 && (
              <Chip 
                icon={<WarningIcon />} 
                label={`${validationStats.warningCount} warnings`} 
                color="warning" 
                size="small" 
              />
            )}
          </Box>
        </Box>
      </Alert>

      <Accordion 
        expanded={expanded === 'validation-errors'} 
        onChange={handleAccordionChange('validation-errors')}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle1">
              Validation Issues
            </Typography>
            <Badge badgeContent={validationStats.totalIssues} color="error">
              <ErrorIcon />
            </Badge>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          {validationErrors.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
              <Typography variant="body1" color="success.main">
                No validation issues found!
              </Typography>
            </Box>
          ) : (
            <Box>
              {Object.entries(groupedErrors).map(([severity, errors]) => {
                if (errors.length === 0) return null;
                
                return (
                  <Box key={severity} sx={{ mb: 2 }}>
                    <Typography 
                      variant="subtitle2" 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1, 
                        mb: 1,
                        color: getSeverityColor(severity as any)
                      }}
                    >
                      {getSeverityIcon(severity as any)}
                      {severity.charAt(0).toUpperCase() + severity.slice(1)} ({errors.length})
                    </Typography>
                    <List dense>
                      {errors.slice(0, 5).map((error, index) => (
                        <ListItem
                          key={index}
                          button={!!onJumpToCell}
                          onClick={() => onJumpToCell?.(error.rowIndex, error.column)}
                          sx={{
                            borderLeft: 3,
                            borderLeftColor: getSeverityColor(error.severity),
                            mb: 0.5,
                            bgcolor: 'rgba(0,0,0,0.02)',
                          }}
                        >
                          <ListItemIcon>
                            {getSeverityIcon(error.severity)}
                          </ListItemIcon>
                          <ListItemText
                            primary={error.error}
                            secondary={`Row ${error.rowIndex + 1}, Column: ${error.column}`}
                          />
                        </ListItem>
                      ))}
                      {errors.length > 5 && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, ml: 2 }}>
                          ... and {errors.length - 5} more {severity}
                        </Typography>
                      )}
                    </List>
                  </Box>
                );
              })}
            </Box>
          )}
        </AccordionDetails>
      </Accordion>

      <Accordion 
        expanded={expanded === 'ai-suggestions'} 
        onChange={handleAccordionChange('ai-suggestions')}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AutoFixHighIcon color="primary" />
            <Typography variant="subtitle1">
              AI Validation Suggestions
            </Typography>
            {aiSuggestions.length > 0 && (
              <Chip 
                label={aiSuggestions.length} 
                size="small" 
                color="primary" 
                variant="outlined"
              />
            )}
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          {loadingSuggestions ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
              <CircularProgress size={24} />
              <Typography>Analyzing data for improvement suggestions...</Typography>
            </Box>
          ) : aiSuggestions.length === 0 ? (
            <Typography color="text.secondary">
              No AI suggestions available. Upload data to get AI-powered validation recommendations.
            </Typography>
          ) : (
            <List>
              {aiSuggestions.map((suggestion, index) => (
                <ListItem key={suggestion.id} sx={{ flexDirection: 'column', alignItems: 'stretch' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={suggestion.enabled}
                            onChange={() => handleToggleAISuggestion(suggestion.id)}
                          />
                        }
                        label={suggestion.name}
                      />
                      <Chip 
                        label={`${Math.round(suggestion.confidence * 100)}% confidence`}
                        size="small"
                        variant="outlined"
                        color={suggestion.confidence > 0.8 ? 'success' : 'default'}
                      />
                      <Chip 
                        label={suggestion.severity}
                        size="small"
                        color={suggestion.severity === 'error' ? 'error' : suggestion.severity === 'warning' ? 'warning' : 'info'}
                      />
                    </Box>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1, ml: 4 }}>
                    {suggestion.description}
                  </Typography>
                  {index < aiSuggestions.length - 1 && <Divider sx={{ mt: 2 }} />}
                </ListItem>
              ))}
            </List>
          )}
        </AccordionDetails>
      </Accordion>
          
      <Dialog open={showRulesDialog} onClose={() => setShowRulesDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Validation Rules Configuration</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Enable or disable specific validation rules. Changes will apply to future validations.
          </Typography>
          
          <List>
            {Object.entries(validationRules).map(([ruleId, rule]) => (
              <ListItem key={ruleId}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={rule.enabled}
                      onChange={() => handleToggleRule(ruleId)}
                    />
                  }
                  label={rule.name}
                />
                <Box sx={{ ml: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    {rule.description}
                  </Typography>
                </Box>
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRulesDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}; 