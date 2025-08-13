import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  Alert,
  AlertTitle,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  CheckCircle,
  Warning,
  Error,
  AutoFixHigh,
  Refresh,
} from '@mui/icons-material';
import { HeaderMappingResponse, EntityType, ENTITY_SCHEMAS } from '../types';

interface HeaderMappingDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (mapping: Record<string, string>) => void;
  originalHeaders: string[];
  entityType: EntityType;
  mappingResult?: HeaderMappingResponse;
  isLoading?: boolean;
  onRetryMapping?: () => void;
}

export const HeaderMappingDialog: React.FC<HeaderMappingDialogProps> = ({
  open,
  onClose,
  onConfirm,
  originalHeaders,
  entityType,
  mappingResult,
  isLoading = false,
  onRetryMapping,
}) => {
  const [editedMapping, setEditedMapping] = useState<Record<string, string>>({});
  const expectedSchema = ENTITY_SCHEMAS[entityType];

  useEffect(() => {
    if (mappingResult) {
      setEditedMapping(mappingResult.mappings);
    }
  }, [mappingResult]);

  const handleMappingChange = (originalHeader: string, standardizedHeader: string) => {
    setEditedMapping(prev => ({
      ...prev,
      [originalHeader]: standardizedHeader
    }));
  };

  const handleConfirm = () => {
    onConfirm(editedMapping);
    onClose();
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.6) return 'warning';
    return 'error';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.8) return <CheckCircle color="success" />;
    if (confidence >= 0.6) return <Warning color="warning" />;
    return <Error color="error" />;
  };

  if (isLoading) {
    return (
      <Dialog open={open} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <AutoFixHigh color="primary" />
            Mapping Headers with AI...
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body1" gutterBottom>
              Claude AI is analyzing your column headers and mapping them to the standardized schema...
            </Typography>
            <LinearProgress sx={{ mt: 2, mb: 2 }} />
            <Typography variant="body2" color="text.secondary">
              This usually takes 3-5 seconds
            </Typography>
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={1}>
            <AutoFixHigh color="primary" />
            AI Header Mapping Results
          </Box>
          {mappingResult && (
            <Box display="flex" alignItems="center" gap={1}>
              {getConfidenceIcon(mappingResult.confidence)}
              <Chip
                label={`${(mappingResult.confidence * 100).toFixed(1)}% Confidence`}
                color={getConfidenceColor(mappingResult.confidence)}
                size="small"
              />
              {onRetryMapping && (
                <Tooltip title="Retry AI mapping">
                  <IconButton onClick={onRetryMapping} size="small">
                    <Refresh />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          )}
        </Box>
      </DialogTitle>

      <DialogContent>
        {mappingResult && (
          <>
            {mappingResult.confidence < 0.7 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                <AlertTitle>Low Confidence Mapping</AlertTitle>
                <Typography variant="body2" color="text.secondary">
                  The AI couldn&apos;t map some headers. Please review and adjust the mappings below.
                </Typography>
              </Alert>
            )}

            {mappingResult.unmappedHeaders.length > 0 && (
              <Alert severity="info" sx={{ mb: 2 }}>
                <AlertTitle>Unmapped Headers</AlertTitle>
                <Typography variant="body2">
                  The following headers couldn't be mapped automatically:{' '}
                  <strong>{mappingResult.unmappedHeaders.join(', ')}</strong>
                </Typography>
                {mappingResult.suggestions.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" fontWeight="bold">Suggestions:</Typography>
                    <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                      {mappingResult.suggestions.map((suggestion, index) => (
                        <li key={index}>
                          <Typography variant="body2">{suggestion}</Typography>
                        </li>
                      ))}
                    </ul>
                  </Box>
                )}
              </Alert>
            )}

            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              Header Mapping Configuration
            </Typography>

            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Original Header</strong></TableCell>
                    <TableCell><strong>Mapped To</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {originalHeaders.map((originalHeader) => {
                    const currentMapping = editedMapping[originalHeader];
                    const isMapped = Boolean(currentMapping);
                    const isValidMapping = expectedSchema.includes(currentMapping);

                    return (
                      <TableRow key={originalHeader}>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace">
                            &quot;{originalHeader}&quot;
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <FormControl size="small" fullWidth>
                            <InputLabel>Select mapping</InputLabel>
                            <Select
                              value={currentMapping || ''}
                              onChange={(e) => handleMappingChange(originalHeader, e.target.value)}
                              label="Select mapping"
                            >
                              <MenuItem value="">
                                <em>No mapping</em>
                              </MenuItem>
                              {expectedSchema.map((schemaField) => (
                                <MenuItem key={schemaField} value={schemaField}>
                                  {schemaField}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell>
                          {!isMapped && (
                            <Chip label="Unmapped" color="default" size="small" />
                          )}
                          {isMapped && isValidMapping && (
                            <Chip label="Mapped" color="success" size="small" />
                          )}
                          {isMapped && !isValidMapping && (
                            <Chip label="Invalid" color="error" size="small" />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Expected Schema for {entityType}:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {expectedSchema.map((field) => (
                  <Chip 
                    key={field} 
                    label={field} 
                    size="small" 
                    variant="outlined"
                    color={Object.values(editedMapping).includes(field) ? 'primary' : 'default'}
                  />
                ))}
              </Box>
            </Box>

            <Typography variant="body2" color="text.secondary">
              Review the AI&apos;s suggested mappings below. You can adjust them before importing.
            </Typography>
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={!mappingResult}
        >
          Apply Mapping
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 