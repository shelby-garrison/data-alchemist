import React, { useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  AlertTitle,
  Fade,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  AutoFixHigh as AutoFixHighIcon,
  Healing as HealingIcon,
  Analytics as AnalyticsIcon,
  Psychology as PsychologyIcon,
  TrendingUp as TrendingUpIcon,
  BugReport as BugReportIcon,
  Insights as InsightsIcon,
  Launch as LaunchIcon,
  Settings as SettingsIcon,
  AutoAwesome,
  CheckCircle,
  Warning,
  Info,
  Assessment as AssessmentIcon,
  DataObject as DataObjectIcon,
  Rule as RuleIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  Lightbulb as LightbulbIcon,
} from '@mui/icons-material';
import { EntityType } from '../types';
import { useDataStore } from '../store/dataStore';
import { NaturalLanguageModifier } from './NaturalLanguageModifier';
import { AIErrorCorrection } from './AIErrorCorrection';
import { DeepDatasetAnalyzer } from './DeepDatasetAnalyzer';

type Milestone3TabType = 'modification' | 'error-correction' | 'analysis' | 'enhanced-rules';

interface Milestone3TabProps {
  //  activeEntityType: EntityType;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`milestone3-tabpanel-${index}`}
      aria-labelledby={`milestone3-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `milestone3-tab-${index}`,
    'aria-controls': `milestone3-tabpanel-${index}`,
  };
}

export const Milestone3Tab: React.FC<Milestone3TabProps> = () => {
  const {
    clients,
    workers,
    tasks,
    modificationCommands,
    errorCorrectionBatches,
    datasetAnalyses,
    currentAnalysis,
    isProcessingModification,
    isGeneratingCorrections,
    isPerformingAnalysis,
  } = useDataStore();

  const [activeSubTab, setActiveSubTab] = useState<Milestone3TabType>('modification');
  const [selectedEntity, setSelectedEntity] = useState<EntityType>('clients');

  const handleSubTabChange = (event: React.SyntheticEvent, newValue: Milestone3TabType) => {
    setActiveSubTab(newValue);
  };

  const currentEntityData = (() => {
    switch (selectedEntity) {
      case 'clients':
        return clients;
      case 'workers':
        return workers;
      case 'tasks':
        return tasks;
      default:
        return clients;
    }
  })();

  const stats = {
    totalRows: currentEntityData.rows.length,
    validationErrors: currentEntityData.validationErrors.length,
    pendingModifications: modificationCommands.filter(cmd => cmd.status === 'pending').length,
    pendingCorrections: errorCorrectionBatches.filter(batch => batch.status === 'pending').length,
    analysisFindings: currentAnalysis?.findings.length || 0,
  };

  const hasData = currentEntityData.rows.length > 0;
  const hasAllData = clients.rows.length > 0 && workers.rows.length > 0 && tasks.rows.length > 0;

  const totalRows = clients.rows.length + workers.rows.length + tasks.rows.length;
  const totalErrors = clients.validationErrors.length + workers.validationErrors.length + tasks.validationErrors.length;
  const completedAnalyses = datasetAnalyses.length;

  const renderSubTab = () => {
    switch (activeSubTab) {
      case 'modification':
        return <NaturalLanguageModifier />;
      case 'error-correction':
        return <AIErrorCorrection entityType={selectedEntity} />;
      case 'analysis':
        return <DeepDatasetAnalyzer />;
      case 'enhanced-rules':
        return (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Enhanced Rule Recommendations
            </Typography>
            <Alert severity="info">
              <AlertTitle>Coming Soon</AlertTitle>
              Enhanced rule recommendations with business impact analysis will be available here.
            </Alert>
          </Paper>
        );
      default:
        return null;
    }
  };

  const getTabColor = (tabType: Milestone3TabType): 'primary' | 'secondary' | 'warning' | 'success' => {
    switch (tabType) {
      case 'modification': return 'primary';
      case 'error-correction': return 'warning';
      case 'analysis': return 'secondary';
      case 'enhanced-rules': return 'success';
      default: return 'primary';
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Paper sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <AutoAwesome sx={{ mr: 2, fontSize: 32 }} />
          <Typography variant="h4" component="h1">
            AI Enhancement Suite
          </Typography>
        </Box>
        
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ background: 'rgba(255,255,255,0.1)', color: 'white', backdropFilter: 'blur(10px)' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
                  {totalRows.toLocaleString()}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Total Data Rows
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ background: 'rgba(255,255,255,0.1)', color: 'white', backdropFilter: 'blur(10px)' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', mr: 1 }}>
                    {totalErrors}
                  </Typography>
                  {totalErrors > 0 && <Warning sx={{ color: '#ffeb3b' }} />}
                </Box>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Validation Issues
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ background: 'rgba(255,255,255,0.1)', color: 'white', backdropFilter: 'blur(10px)' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', mr: 1 }}>
                    {stats.pendingModifications + stats.pendingCorrections}
                  </Typography>
                  {(isProcessingModification || isGeneratingCorrections) && 
                    <CircularProgress size={20} sx={{ color: 'white' }} />
                  }
                </Box>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Pending AI Actions
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ background: 'rgba(255,255,255,0.1)', color: 'white', backdropFilter: 'blur(10px)' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', mr: 1 }}>
                    {completedAnalyses}
                  </Typography>
                  {isPerformingAnalysis && 
                    <CircularProgress size={20} sx={{ color: 'white' }} />
                  }
                </Box>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Completed Analyses
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ mb: 3 }}>
        {activeSubTab === 'error-correction' && (
          <Paper sx={{ p: 2, mb: 3 }}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Entity Type</InputLabel>
              <Select
                value={selectedEntity}
                label="Entity Type"
                onChange={(e) => setSelectedEntity(e.target.value as EntityType)}
              >
                <MenuItem value="clients">Clients</MenuItem>
                <MenuItem value="workers">Workers</MenuItem>
                <MenuItem value="tasks">Tasks</MenuItem>
              </Select>
            </FormControl>
          </Paper>
        )}
        <Tabs
          value={activeSubTab}
          onChange={handleSubTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
          sx={{ 
            '& .MuiTab-root': { 
              minHeight: 72,
              '&.Mui-selected': {
                background: 'linear-gradient(45deg, rgba(25, 118, 210, 0.1), rgba(25, 118, 210, 0.05))',
              }
            }
          }}
        >
          <Tab
            icon={
              <Box sx={{ display: 'flex', alignItems: 'center', flexDirection: 'column' }}>
                <PsychologyIcon color="primary" sx={{ mb: 0.5 }} />
                {stats.pendingModifications > 0 && (
                  <Chip 
                    label={stats.pendingModifications} 
                    size="small" 
                    color={getTabColor('modification')}
                    sx={{ minWidth: 20, height: 16, fontSize: '0.7rem' }}
                  />
                )}
              </Box>
            }
            label="Data Modification"
            value="modification"
            iconPosition="top"
          />
          <Tab
            icon={
              <Box sx={{ display: 'flex', alignItems: 'center', flexDirection: 'column' }}>
                <HealingIcon color="primary" sx={{ mb: 0.5 }} />
                {stats.pendingCorrections > 0 && (
                  <Chip 
                    label={stats.pendingCorrections} 
                    size="small" 
                    color={getTabColor('error-correction')}
                    sx={{ minWidth: 20, height: 16, fontSize: '0.7rem' }}
                  />
                )}
              </Box>
            }
            label="Error Correction"
            value="error-correction"
            iconPosition="top"
          />
          <Tab
            icon={
              <Box sx={{ display: 'flex', alignItems: 'center', flexDirection: 'column' }}>
                <AnalyticsIcon color="primary" sx={{ mb: 0.5 }} />
                {stats.analysisFindings > 0 && (
                  <Chip 
                    label={stats.analysisFindings} 
                    size="small" 
                    color={getTabColor('analysis')}
                    sx={{ minWidth: 20, height: 16, fontSize: '0.7rem' }}
                  />
                )}
              </Box>
            }
            label="Deep Analysis"
            value="analysis"
            iconPosition="top"
          />
          <Tab
            icon={<TrendingUpIcon />}
            label="Enhanced Rules"
            value="enhanced-rules"
            iconPosition="top"
          />
        </Tabs>
      </Paper>

      <Fade in={true} timeout={300}>
        <Box>
          {renderSubTab()}
        </Box>
      </Fade>

      {!hasData && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Getting Started:</strong> Upload {selectedEntity} data to begin using AI-powered features. 
            For full analysis capabilities, upload data for all entity types (clients, workers, tasks).
          </Typography>
        </Alert>
      )}
    </Box>
  );
}; 