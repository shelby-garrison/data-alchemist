import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Grid, 
  Tabs, 
  Tab, 
  Divider,
  Chip,
  Alert
} from '@mui/material';
import { 
  CloudUpload as CloudUploadIcon,
  Storage as StorageIcon
} from '@mui/icons-material';
import { FileUpload } from './FileUpload';
import { DataTable } from './DataTable';
import { ValidationPanel } from './ValidationPanel';
import { AIQueryInput } from './AIQueryInput';
import { useDataStore } from '../store/dataStore';
import { EntityType } from '../types';

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
      id={`entity-tabpanel-${index}`}
      aria-labelledby={`entity-tab-${index}`}
      {...other}
    >
      {value === index && children}
    </div>
  );
}

export const UploadTab: React.FC = () => {
  const [activeEntityTab, setActiveEntityTab] = useState(0);
  const [highlightedRows, setHighlightedRows] = useState<number[]>([]);
  const [filterDescription, setFilterDescription] = useState<string>('');

  const { clients, workers, tasks } = useDataStore();
  
  const entities: { type: EntityType; label: string; icon: React.ReactElement }[] = [
    { type: 'clients', label: 'Clients', icon: <StorageIcon /> },
    { type: 'workers', label: 'Workers', icon: <StorageIcon /> },
    { type: 'tasks', label: 'Tasks', icon: <StorageIcon /> }
  ];

  const currentEntity = entities[activeEntityTab];
  const currentEntityData = currentEntity.type === 'clients' ? clients : 
                           currentEntity.type === 'workers' ? workers : tasks;

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveEntityTab(newValue);
    setHighlightedRows([]);
    setFilterDescription('');
  };

  const handleSearchResults = (matchingRows: number[], description: string) => {
    setHighlightedRows(matchingRows);
    setFilterDescription(description);
  };

  const handleClearSearch = () => {
    setHighlightedRows([]);
    setFilterDescription('');
  };

  const handleJumpToCell = (rowIndex: number, columnName: string) => {
    console.log(`Jump to row ${rowIndex + 1}, column ${columnName}`);
    setHighlightedRows([rowIndex]);
  };

  const getEntityStats = () => {
    const stats = entities.map(entity => {
      const data = entity.type === 'clients' ? clients : 
                   entity.type === 'workers' ? workers : tasks;
      return {
        ...entity,
        rowCount: data.rows.length,
        errorCount: data.validationErrors.filter(e => e.severity === 'error').length,
        warningCount: data.validationErrors.filter(e => e.severity === 'warning').length,
      };
    });
    return stats;
  };

  const entityStats = getEntityStats();

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <CloudUploadIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Box>
            <Typography variant="h5" gutterBottom sx={{ mb: 1 }}>
              Data Alchemist - Upload & Manage
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Upload CSV/XLSX files, validate data quality, and search using natural language queries
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          {entityStats.map((stat, index) => (
            <Chip
              key={stat.type}
              icon={stat.icon}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>{stat.label}: {stat.rowCount}</span>
                  {(stat.errorCount > 0 || stat.warningCount > 0) && (
                    <span>
                      ({stat.errorCount}E, {stat.warningCount}W)
                    </span>
                  )}
                </Box>
              }
              color={stat.rowCount > 0 ? 'primary' : 'default'}
              variant={index === activeEntityTab ? 'filled' : 'outlined'}
              onClick={() => setActiveEntityTab(index)}
              clickable
            />
          ))}
        </Box>


        {process.env.NODE_ENV === 'development' && (
          <ClientOnlyTimeDisplay 
            entityLabel={currentEntity.label}
            rowCount={currentEntityData.rows.length}
          />
        )}
      </Paper>

      <Grid container spacing={3}>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Box sx={{ position: 'sticky', top: 20, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CloudUploadIcon />
                Upload Files
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <FileUpload 
                entityType="clients" 
                title="Clients Data" 
              />
              
              <FileUpload 
                entityType="workers" 
                title="Workers Data" 
              />
              
              <FileUpload 
                entityType="tasks" 
                title="Tasks Data" 
              />
            </Paper>

            <ValidationPanel 
              entityType={currentEntity.type}
              onJumpToCell={handleJumpToCell}
            />
          </Box>
        </Grid>

        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper sx={{ mb: 3 }}>
            <Tabs 
              value={activeEntityTab} 
              onChange={handleTabChange}
              variant="fullWidth"
              sx={{ borderBottom: 1, borderColor: 'divider' }}
            >
              {entities.map((entity, index) => (
                <Tab 
                  key={entity.type}
                  icon={entity.icon}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {entity.label}
                      {entityStats[index].rowCount > 0 && (
                        <Chip 
                          label={entityStats[index].rowCount} 
                          size="small" 
                          color="primary"
                        />
                      )}
                    </Box>
                  }
                  iconPosition="start"
                />
              ))}
            </Tabs>

            <Box sx={{ p: 2 }}>
              <AIQueryInput
                entityType={currentEntity.type}
                onResultsFound={handleSearchResults}
                onClearResults={handleClearSearch}
              />
              
              {filterDescription && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Active Filter:</strong> {filterDescription}
                  </Typography>
                </Alert>
              )}
            </Box>
          </Paper>

          {entities.map((entity, index) => (
            <TabPanel key={entity.type} value={activeEntityTab} index={index}>
              <DataTable
                entityType={entity.type}
                data={entity.type === 'clients' ? clients : 
                      entity.type === 'workers' ? workers : tasks}
                height={600}
                highlightedRows={highlightedRows}
              />
            </TabPanel>
          ))}
        </Grid>
      </Grid>
    </Box>
  );
};

// Client-only component to avoid hydration mismatch with time display
const ClientOnlyTimeDisplay: React.FC<{ entityLabel: string; rowCount: number }> = ({ 
  entityLabel, 
  rowCount 
}) => {
  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    setMounted(true);
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString());
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!mounted) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        <Typography variant="caption">
          Debug: {entityLabel} - {rowCount} rows - Last updated: Loading...
        </Typography>
      </Alert>
    );
  }

  return (
    <Alert severity="info" sx={{ mt: 2 }}>
      <Typography variant="caption">
        Debug: {entityLabel} - {rowCount} rows - Last updated: {currentTime}
      </Typography>
    </Alert>
  );
}; 