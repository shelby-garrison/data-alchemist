import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Tabs,
  Tab,
  Typography,
  AppBar,
  Toolbar,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import { 
  DataObjectOutlined, 
  RuleOutlined, 
  FileDownloadOutlined,
  AutoAwesome
} from '@mui/icons-material';
import { useDataStore } from '../store/dataStore';
import { checkAIServiceStatus } from '../utils/geminiservice';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { activeTab, setActiveTab } = useDataStore();
  const [serviceStatus, setServiceStatus] = useState<{ isAvailable: boolean; message: string } | null>(null);

  // Check AI service status on mount and periodically
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await checkAIServiceStatus();
        setServiceStatus(status);
      } catch (error) {
        setServiceStatus({ isAvailable: false, message: "Unable to check service status" });
      }
    };

    checkStatus();
    
    // Check every 5 minutes
    const interval = setInterval(checkStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: 'upload' | 'rules' | 'ai-enhancement' | 'export') => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <AppBar position="static" sx={{ backgroundColor: '#1976d2' }}>
        <Toolbar>
          <DataObjectOutlined sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Data Alchemist
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            Clean & Validate Your Data with AI
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            indicatorColor="primary"
            textColor="primary"
            variant="fullWidth"
          >
            <Tab
              icon={<DataObjectOutlined />}
              label="Upload & Clean"
              value="upload"
              iconPosition="start"
            />
            <Tab
              icon={<RuleOutlined />}
              label="Business Rules"
              value="rules"
              iconPosition="start"
            />
            <Tab
              icon={<AutoAwesome />}
              label="AI Enhancement"
              value="ai-enhancement"
              iconPosition="start"
            />
            <Tab
              icon={<FileDownloadOutlined />}
              label="Export"
              value="export"
              iconPosition="start"
            />
          </Tabs>
        </Paper>

        {/* AI Service Status Indicator */}
        {serviceStatus && !serviceStatus.isAvailable && (
          <Alert 
            severity="warning" 
            sx={{ mb: 3 }}
            action={
              <Tooltip title="Check service status">
                <IconButton
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
                  🔄
                </IconButton>
              </Tooltip>
            }
          >
            <Typography variant="body2">
              <strong>AI Service Status:</strong> {serviceStatus.message}
              <br />
              <Typography variant="caption" color="text.secondary">
                Some AI features may be limited. The app will continue to work with fallback options.
              </Typography>
            </Typography>
          </Alert>
        )}

        {children}
      </Container>
    </Box>
  );
}; 