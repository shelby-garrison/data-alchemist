import React, { useCallback, useState } from 'react';
import { Box, Button, Typography, Paper, Alert, Snackbar } from '@mui/material';
import { CloudUpload, AutoFixHigh } from '@mui/icons-material';
import { EntityType, HeaderMappingResponse, DataRow } from '../types';
import { parseFile } from '../utils/fileParser';
import { mapHeadersWithOpenAI, checkAIServiceStatus, getServiceStatus } from '../utils/geminiservice';
import { validateAllRows } from '../utils/validation';
import { useDataStore } from '../store/dataStore';
import { HeaderMappingDialog } from './HeaderMappingDialog';

interface FileUploadProps {
  entityType: EntityType;
  title: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({ entityType, title }) => {
  const { setEntityData, setLoading } = useDataStore();
  
  // Check AI service status on mount
  React.useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await checkAIServiceStatus();
        setServiceStatus(status);
      } catch (error) {
        setServiceStatus({ isAvailable: false, message: "Unable to check service status" });
      }
    };
    checkStatus();
  }, []);
  
  const [mappingDialog, setMappingDialog] = useState({
    open: false,
    originalHeaders: [] as string[],
    mappingResult: undefined as HeaderMappingResponse | undefined,
    isLoading: false,
    rawData: null as any,
  });
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning' | 'info',
  });
  const [serviceStatus, setServiceStatus] = useState<{ isAvailable: boolean; message: string } | null>(null);

  const showNotification = (message: string, severity: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setNotification({ open: true, message, severity });
  };

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    
    try {
      const initialParsedData = await parseFile(file);
      
      if (initialParsedData.headers.length === 0) {
        throw new Error('No headers found in the file');
      }

      setMappingDialog({
        open: true,
        originalHeaders: initialParsedData.headers,
        mappingResult: undefined,
        isLoading: true,
        rawData: initialParsedData,
      });

      await performAIMapping(initialParsedData.headers, initialParsedData.rows, file);
      
    } catch (error) {
      console.error('File parsing error:', error);
      showNotification(
        `Error parsing file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error'
      );
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  }, [entityType, setEntityData, setLoading]);

  const performAIMapping = useCallback(async (
    headers: string[], 
    sampleData: Record<string, unknown>[], 
    file: File
  ) => {
    try {
      console.log('🤖 Starting AI mapping for headers:', headers);
      
      const mappingResult = await mapHeadersWithOpenAI(headers, entityType);
      
      setMappingDialog(prev => ({
        ...prev,
        mappingResult,
        isLoading: false,
      }));

      showNotification(
        `AI mapping completed with ${(mappingResult.confidence * 100).toFixed(1)}% confidence`,
        mappingResult.confidence >= 0.7 ? 'success' : 'warning'
      );

    } catch (error) {
      console.error('AI mapping error:', error);
      
      setMappingDialog(prev => ({
        ...prev,
        isLoading: false,
        mappingResult: {
          mappings: {},
          confidence: 0,
          unmappedHeaders: headers,
          suggestions: ['AI mapping failed. Please map headers manually.']
        }
      }));

      showNotification('AI mapping failed. You can map headers manually.', 'warning');
    }
  }, [entityType, setEntityData, setLoading]);

  const handleMappingConfirm = async (finalMapping: Record<string, string>) => {
    if (!mappingDialog.rawData) return;

    setLoading(true);
    
    try {
      const { rawData } = mappingDialog;
      
      const mappedRows = rawData.rows.map((row: any) => {
        const mappedRow: Record<string, any> = {};
        rawData.headers.forEach((originalHeader: string) => {
          const mappedHeader = finalMapping[originalHeader] || originalHeader;
          mappedRow[mappedHeader] = row[originalHeader];
        });
        return mappedRow;
      });

      const validationErrors = validateAllRows(mappedRows as DataRow[], entityType);
      
      const finalEntityData = {
        headers: Object.values(finalMapping),
        rows: mappedRows as DataRow[],
        validationErrors,
        fileName: rawData.fileName,
        originalHeaders: rawData.headers,
        headerMapping: finalMapping,
      };

      setEntityData(entityType, finalEntityData);
          
      setMappingDialog({
        open: false,
        originalHeaders: [],
        mappingResult: undefined,
        isLoading: false,
        rawData: null,
      });
      
      showNotification(
        `✅ ${entityType} data processed! ${mappedRows.length} rows imported, ${validationErrors.length} validation issues found.`,
        validationErrors.length === 0 ? 'success' : 'warning'
      );

    } catch (error) {
      console.error('Error processing data:', error);
      showNotification(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleMappingCancel = () => {
    setMappingDialog({
      open: false,
      originalHeaders: [],
      mappingResult: undefined,
      isLoading: false,
      rawData: null,
    });
  };

  const handleRetryMapping = () => {
    if (mappingDialog.originalHeaders.length > 0) {
      setMappingDialog(prev => ({ ...prev, isLoading: true, mappingResult: undefined }));
      performAIMapping(mappingDialog.originalHeaders, mappingDialog.rawData.rows, mappingDialog.rawData.file);
    }
  };

  return (
    <>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        
        <Box
          sx={{
            border: '2px dashed #ccc',
            borderRadius: 2,
            p: 4,
            textAlign: 'center',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.02)',
            },
          }}
        >
          <CloudUpload sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          
          <Typography variant="body1" gutterBottom>
            Drop your {entityType} file here or click to browse
          </Typography>
          
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Supported formats: CSV, XLSX
          </Typography>
          
          <Button
            component="label"
            variant="contained"
            startIcon={<CloudUpload />}
            sx={{ mt: 2 }}
          >
            Choose File
            <input
              type="file"
              hidden
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
            />
          </Button>
        </Box>

        {serviceStatus && (
          <Alert 
            severity={serviceStatus.isAvailable ? 'info' : 'warning'} 
            sx={{ mt: 2 }}
            action={
              !serviceStatus.isAvailable && (
                <Button
                  size="small"
                  onClick={async () => {
                    try {
                      const status = await checkAIServiceStatus();
                      setServiceStatus(status);
                    } catch (error) {
                      setServiceStatus({ isAvailable: false, message: "Check failed" });
                    }
                  }}
                >
                  Retry
                </Button>
              )
            }
          >
            <Typography variant="body2">
              <strong><AutoFixHigh sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />AI-Powered Header Mapping:</strong>
              <br />
              {serviceStatus.isAvailable ? (
                <>
                  Gemini AI will analyze your column headers and automatically map them to the expected schema. 
                  Common variations like &quot;client_id&quot;, &quot;ClientID&quot;, &quot;Client ID&quot; are handled intelligently.
                </>
              ) : (
                <>
                  ⚠️ {serviceStatus.message}
                  <br />
                  <strong>Fallback:</strong> Intelligent header mapping will still work, but manual adjustment may be needed.
                </>
              )}
            </Typography>
          </Alert>
        )}
      </Paper>

      <HeaderMappingDialog
        open={mappingDialog.open}
        onClose={handleMappingCancel}
        onConfirm={handleMappingConfirm}
        originalHeaders={mappingDialog.originalHeaders}
        entityType={entityType}
        mappingResult={mappingDialog.mappingResult}
        isLoading={mappingDialog.isLoading}
        onRetryMapping={handleRetryMapping}
      />

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification(prev => ({ ...prev, open: false }))}
        message={notification.message}
      />
    </>
  );
}; 