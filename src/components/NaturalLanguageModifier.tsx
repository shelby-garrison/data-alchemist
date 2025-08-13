import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  CardActions,
  Chip,
  Alert,
  AlertTitle,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  Send,
  Preview,
  CheckCircle,
  Cancel,
  History,
  Undo,
  ExpandMore,
  Psychology,
  AutoAwesome,
  TrendingUp,
  Warning,
  Info,
  Clear,
} from '@mui/icons-material';
import { useDataStore } from '../store/dataStore';
import { processNaturalLanguageModification } from '../utils/geminiservice';
import { AIQuotaLimitAlert } from './AIQuotaLimitAlert';
import type { EntityType, DataModificationCommand, DataModification } from '../types';

export const NaturalLanguageModifier: React.FC = () => {
  const [command, setCommand] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<EntityType>('clients');
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [currentPreview, setCurrentPreview] = useState<DataModificationCommand | null>(null);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [quotaLimitReached, setQuotaLimitReached] = useState(false);

  const {
    clients,
    workers,
    tasks,
    modificationCommands,
    modificationHistory,
    addModificationCommand,
    applyModificationCommand,
    rejectModificationCommand,
    undoModification,
    clearModificationHistory,
    isProcessingModification,
  } = useDataStore();

  const entityData = { clients, workers, tasks };
  const currentEntityData = entityData[selectedEntity];

  // Example commands for user guidance
  const exampleCommands = [
    {
      entity: 'clients' as EntityType,
      command: 'Change all PriorityLevel 5 clients to 4',
      description: 'Bulk update priority levels'
    },
    {
      entity: 'workers' as EntityType,
      command: 'Set all workers in Group A to have MaxLoadPerPhase of 10',
      description: 'Update capacity limits'
    },
    {
      entity: 'tasks' as EntityType,
      command: 'Change Duration to 8 for all tasks in Marketing category',
      description: 'Standardize task durations'
    },
    {
      entity: 'clients' as EntityType,
      command: 'Replace empty AttributesJSON with {"default": true}',
      description: 'Fill missing JSON data'
    },
  ];

  const handleSubmitCommand = async () => {
    if (!command.trim() || currentEntityData.rows.length === 0) return;

    setIsProcessing(true);
    try {
      const response = await processNaturalLanguageModification(
        command,
        selectedEntity,
        currentEntityData.rows
      );

      if (response.understood && response.modifications.length > 0) {
        const modificationCommand: DataModificationCommand = {
          id: `mod-${Date.now()}`,
          command: command.trim(),
          entityType: selectedEntity,
          confidence: response.confidence,
          suggestedChanges: response.modifications,
          reasoning: response.reasoning,
          createdAt: new Date().toISOString(),
          status: 'pending',
        };

        addModificationCommand(modificationCommand);
        setCurrentPreview(modificationCommand);
        setPreviewDialogOpen(true);
        setCommand('');
      } else {
        // Handle case where AI couldn't understand the command
        console.warn('AI could not understand the command:', response);
      }
    } catch (error) {
      console.error('Error processing natural language modification:', error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('quota') || errorMessage.includes('429')) {
        setQuotaLimitReached(true);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyModification = (commandId: string) => {
    applyModificationCommand(commandId);
    setPreviewDialogOpen(false);
  };

  const handleRejectModification = (commandId: string) => {
    rejectModificationCommand(commandId);
    setPreviewDialogOpen(false);
  };

  const getConfidenceColor = (confidence: number): 'success' | 'warning' | 'error' => {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.6) return 'warning';
    return 'error';
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const pendingCommands = modificationCommands.filter(cmd => cmd.status === 'pending');
  const recentCommands = modificationCommands.slice(-5);

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Psychology sx={{ mr: 2, fontSize: 32 }} />
          <Typography variant="h5" component="h2">
            Natural Language Data Modification
          </Typography>
        </Box>
        <Typography variant="body1" sx={{ opacity: 0.9 }}>
          Describe data changes in plain English and let AI handle the complex logic.
        </Typography>
      </Paper>


      {quotaLimitReached && (
        <AIQuotaLimitAlert 
          feature="Natural Language Data Modification"
          onRetry={() => setQuotaLimitReached(false)}
          showMockOption={true}
        />
      )}

      <Grid container spacing={3}>
        {/* Input Section */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <AutoAwesome sx={{ mr: 1, color: 'primary.main' }} />
              Command Input
            </Typography>

            <Box sx={{ mb: 3 }}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Target Entity</InputLabel>
                <Select
                  value={selectedEntity}
                  label="Target Entity"
                  onChange={(e) => setSelectedEntity(e.target.value as EntityType)}
                >
                  <MenuItem value="clients">
                    Clients ({clients.rows.length} rows)
                  </MenuItem>
                  <MenuItem value="workers">
                    Workers ({workers.rows.length} rows)
                  </MenuItem>
                  <MenuItem value="tasks">
                    Tasks ({tasks.rows.length} rows)
                  </MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                multiline
                rows={3}
                label="Describe your data modification"
                placeholder="E.g., Change all PriorityLevel 5 clients to 4, or Set MaxLoadPerPhase to 10 for workers in Group A"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                sx={{ mb: 2 }}
                disabled={isProcessing || currentEntityData.rows.length === 0}
                helperText={
                  currentEntityData.rows.length === 0
                    ? `No ${selectedEntity} data available. Upload data first.`
                    : 'Use natural language to describe the changes you want to make.'
                }
              />

              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Button
                  variant="contained"
                  onClick={handleSubmitCommand}
                  disabled={!command.trim() || isProcessing || currentEntityData.rows.length === 0}
                  startIcon={isProcessing ? <AutoAwesome className="animate-spin" /> : <Send />}
                  sx={{ px: 3 }}
                >
                  {isProcessing ? 'Processing...' : 'Analyze & Preview'}
                </Button>
                
                {command && (
                  <Button
                    variant="outlined"
                    onClick={() => setCommand('')}
                    startIcon={<Clear />}
                    size="small"
                  >
                    Clear
                  </Button>
                )}
              </Box>
            </Box>

            {/* Example Commands */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center' }}>
                  <TrendingUp sx={{ mr: 1, fontSize: 20 }} />
                  Example Commands
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  {exampleCommands.map((example, index) => (
                    <Grid size={{ xs: 12, sm: 6 }} key={index}>
                      <Card 
                        sx={{ 
                          cursor: 'pointer', 
                          transition: 'all 0.2s',
                          '&:hover': { 
                            bgcolor: 'action.hover',
                            transform: 'translateY(-2px)',
                            boxShadow: 2
                          }
                        }}
                        onClick={() => {
                          setSelectedEntity(example.entity);
                          setCommand(example.command);
                        }}
                      >
                        <CardContent sx={{ pb: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Chip 
                              label={example.entity} 
                              size="small" 
                              color="primary" 
                              variant="outlined"
                            />
                          </Box>
                          <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                            &quot;{example.command}&quot;
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {example.description}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Paper>

          {/* Pending Commands */}
          {pendingCommands.length > 0 && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <Preview sx={{ mr: 1, color: 'warning.main' }} />
                Pending Modifications ({pendingCommands.length})
              </Typography>

              {pendingCommands.map((cmd) => (
                <Card key={cmd.id} sx={{ mb: 2, border: 1, borderColor: 'warning.main' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {cmd.command}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip 
                          label={cmd.entityType} 
                          size="small" 
                          color="primary" 
                          variant="outlined"
                        />
                        <Chip
                          label={`Confidence: ${Math.round(cmd.confidence * 100)}%`}
                          size="small"
                          color={getConfidenceColor(cmd.confidence)}
                          variant="outlined"
                        />
                      </Box>
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {cmd.reasoning}
                    </Typography>

                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Affected Rows: {cmd.suggestedChanges.length}
                    </Typography>
                  </CardContent>

                  <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setCurrentPreview(cmd);
                        setPreviewDialogOpen(true);
                      }}
                      startIcon={<Preview />}
                    >
                      Preview Changes
                    </Button>

                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="contained"
                        color="success"
                        onClick={() => handleApplyModification(cmd.id)}
                        startIcon={<CheckCircle />}
                        size="small"
                      >
                        Apply
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={() => handleRejectModification(cmd.id)}
                        startIcon={<Cancel />}
                        size="small"
                      >
                        Reject
                      </Button>
                    </Box>
                  </CardActions>
                </Card>
              ))}
            </Paper>
          )}
        </Grid>

        {/* Sidebar */}
        <Grid size={{ xs: 12, lg: 4 }}>
          {/* Data Summary */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Current Dataset
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Clients:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {clients.rows.length} rows
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Workers:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {workers.rows.length} rows
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Tasks:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {tasks.rows.length} rows
                </Typography>
              </Box>
            </Box>
          </Paper>

          {/* Modification History */}
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                <History sx={{ mr: 1, fontSize: 20 }} />
                History
              </Typography>
              {modificationHistory.length > 0 && (
                <Button
                  size="small"
                  onClick={clearModificationHistory}
                  startIcon={<Clear />}
                >
                  Clear
                </Button>
              )}
            </Box>

            {modificationHistory.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                No modifications applied yet
              </Typography>
            ) : (
              <List dense>
                {modificationHistory.slice(-5).reverse().map((history) => (
                  <ListItem key={history.id} divider>
                    <ListItemText
                      primary={history.command}
                      secondary={`${history.modifications.length} changes • ${new Date(history.appliedAt).toLocaleString()}`}
                      primaryTypographyProps={{ fontSize: '0.875rem' }}
                      secondaryTypographyProps={{ fontSize: '0.75rem' }}
                    />
                    {history.canUndo && (
                      <ListItemSecondaryAction>
                        <IconButton
                          size="small"
                          onClick={() => undoModification(history.id)}
                          title="Undo changes"
                        >
                          <Undo fontSize="small" />
                        </IconButton>
                      </ListItemSecondaryAction>
                    )}
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Preview Dialog */}
      <Dialog
        open={previewDialogOpen}
        onClose={() => setPreviewDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
          <Preview sx={{ mr: 1 }} />
          Preview Changes
          {currentPreview && (
            <Chip
              label={`Confidence: ${Math.round(currentPreview.confidence * 100)}%`}
              size="small"
              color={getConfidenceColor(currentPreview.confidence)}
              sx={{ ml: 2 }}
            />
          )}
        </DialogTitle>

        <DialogContent>
          {currentPreview && (
            <>
              <Alert severity="info" sx={{ mb: 2 }}>
                <AlertTitle>{currentPreview.command}</AlertTitle>
                {currentPreview.reasoning}
              </Alert>

              {currentPreview.confidence < 0.7 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <AlertTitle>Low Confidence Warning</AlertTitle>
                  This modification has lower confidence. Please review the changes carefully before applying.
                </Alert>
              )}

              <Typography variant="h6" gutterBottom>
                Changes ({currentPreview.suggestedChanges.length} rows affected)
              </Typography>

              <TableContainer sx={{ maxHeight: 400, mb: 2 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Row</TableCell>
                      <TableCell>Column</TableCell>
                      <TableCell>Current Value</TableCell>
                      <TableCell>New Value</TableCell>
                      <TableCell>Reason</TableCell>
                      <TableCell>Confidence</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {currentPreview.suggestedChanges.map((change, index) => (
                      <TableRow key={index}>
                        <TableCell>{change.rowIndex + 1}</TableCell>
                        <TableCell>{change.column}</TableCell>
                        <TableCell sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {formatValue(change.currentValue)}
                        </TableCell>
                        <TableCell sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600 }}>
                          {formatValue(change.suggestedValue)}
                        </TableCell>
                        <TableCell sx={{ maxWidth: 200, fontSize: '0.875rem' }}>
                          {change.reason}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={`${Math.round(change.confidence * 100)}%`}
                            size="small"
                            color={getConfidenceColor(change.confidence)}
                            variant="outlined"
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
          <Button onClick={() => setPreviewDialogOpen(false)}>
            Cancel
          </Button>
          {currentPreview && (
            <>
              <Button
                variant="outlined"
                color="error"
                onClick={() => handleRejectModification(currentPreview.id)}
                startIcon={<Cancel />}
              >
                Reject
              </Button>
              <Button
                variant="contained"
                color="success"
                onClick={() => handleApplyModification(currentPreview.id)}
                startIcon={<CheckCircle />}
              >
                Apply Changes
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* No Data State */}
      {Object.values(entityData).every(entity => entity.rows.length === 0) && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Info sx={{ fontSize: 48, color: 'action.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Data Available
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Upload data in the &quot;Upload &amp; Clean&quot; tab to start using natural language modifications.
          </Typography>
        </Paper>
      )}
    </Box>
  );
}; 