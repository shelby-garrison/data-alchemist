import React, { useState, useCallback } from 'react';
import {
  Paper,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
  Collapse,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  Search as SearchIcon,
  AutoFixHigh as AutoFixHighIcon,
  Clear as ClearIcon,
  History as HistoryIcon,
  TrendingUp as TrendingUpIcon,
  FilterList as FilterListIcon,
} from '@mui/icons-material';
import { EntityType } from '../types';
import { executeNaturalLanguageQuery, NLQueryResult } from '../utils/geminiservice';
import { useDataStore } from '../store/dataStore';

interface AIQueryInputProps {
  entityType: EntityType;
  onResultsFound: (matchingRows: number[], description: string) => void;
  onClearResults: () => void;
}

interface QueryHistory {
  query: string;
  timestamp: Date;
  resultCount: number;
  confidence: number;
}

export const AIQueryInput: React.FC<AIQueryInputProps> = ({
  entityType,
  onResultsFound,
  onClearResults,
}) => {
  const { [entityType]: entityData } = useDataStore();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [lastResult, setLastResult] = useState<NLQueryResult | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [queryHistory, setQueryHistory] = useState<QueryHistory[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { rows } = entityData;

  const exampleQueries = {
    clients: [
      "Show clients with priority level 5",
      "Find clients in GroupA with more than 5 requested tasks",
      "Clients with budget over 100000 in AttributesJSON",
      "Show all VIP clients from the attributes",
    ],
    workers: [
      "Find workers with coding and ml skills",
      "Show workers available in phase 3 and 4",
      "Workers with qualification level above 3",
      "Find workers in GroupB with testing skills",
    ],
    tasks: [
      "Show tasks with duration greater than 2",
      "Find ML category tasks in preferred phases 2-4",
      "Tasks requiring data and analysis skills",
      "Show tasks with MaxConcurrent equal to 1",
    ],
  };

  const handleSearch = useCallback(async () => {
    if (!query.trim() || rows.length === 0) return;

    setIsSearching(true);
    setError(null);

    try {
      const result = await executeNaturalLanguageQuery(query, entityType, rows);
      
      setLastResult(result);
      onResultsFound(result.matchingRows, result.filterDescription);

      const historyEntry: QueryHistory = {
        query,
        timestamp: new Date(),
        resultCount: result.matchingRows.length,
        confidence: result.confidence,
      };
      
      setQueryHistory(prev => [historyEntry, ...prev.slice(0, 9)]); 

    } catch (error) {
      console.error('Search error:', error);
      setError('Failed to process your query. Please try a different search.');
    } finally {
      setIsSearching(false);
    }
  }, [query, rows, entityType, onResultsFound]);

  const handleClear = () => {
    setQuery('');
    setLastResult(null);
    setError(null);
    onClearResults();
  };

  const handleExampleClick = (exampleQuery: string) => {
    setQuery(exampleQuery);
  };

  const handleHistoryClick = (historyQuery: string) => {
    setQuery(historyQuery);
    setShowHistory(false);
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSearch();
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.6) return 'warning';
    return 'error';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High Confidence';
    if (confidence >= 0.6) return 'Medium Confidence';
    return 'Low Confidence';
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <AutoFixHighIcon color="primary" />
        <Typography variant="h6">
          AI Natural Language Search
        </Typography>
        <Tooltip title="Search History">
          <IconButton
            size="small"
            onClick={() => setShowHistory(!showHistory)}
            color={showHistory ? 'primary' : 'default'}
          >
            <HistoryIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Ask questions about your {entityType} data in plain English. AI will find matching records for you.
      </Typography>

      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder={`Ask about your ${entityType} data... (e.g., "${exampleQueries[entityType][0]}")`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isSearching || rows.length === 0}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
          }}
        />
        <Button
          variant="contained"
          onClick={handleSearch}
          disabled={!query.trim() || isSearching || rows.length === 0}
          sx={{ minWidth: 100 }}
        >
          {isSearching ? <CircularProgress size={20} /> : 'Search'}
        </Button>
        {(lastResult || query) && (
          <Tooltip title="Clear search">
            <IconButton onClick={handleClear} color="secondary">
              <ClearIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {lastResult && !error && (
        <Alert 
          severity={lastResult.matchingRows.length > 0 ? 'success' : 'info'} 
          sx={{ mb: 2 }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="body1">
                <strong>
                  {lastResult.matchingRows.length > 0 
                    ? `Found ${lastResult.matchingRows.length} matching ${entityType}`
                    : `No matching ${entityType} found`
                  }
                </strong>
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {lastResult.filterDescription}
              </Typography>
              {lastResult.sqlLikeQuery && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  Query: {lastResult.sqlLikeQuery}
                </Typography>
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Chip
                icon={<TrendingUpIcon />}
                label={getConfidenceLabel(lastResult.confidence)}
                color={getConfidenceColor(lastResult.confidence)}
                size="small"
                variant="outlined"
              />
              {lastResult.matchingRows.length > 0 && (
                <Chip
                  icon={<FilterListIcon />}
                  label={`${lastResult.matchingRows.length} rows`}
                  color="primary"
                  size="small"
                />
              )}
            </Box>
          </Box>
        </Alert>
      )}

      <Collapse in={showHistory}>
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Recent Searches
          </Typography>
          {queryHistory.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No search history yet.
            </Typography>
          ) : (
            <List dense>
              {queryHistory.map((item, index) => (
                <ListItem
                  key={index}
                  component="button"
                  onClick={() => handleHistoryClick(item.query)}
                  sx={{ 
                    borderRadius: 1, 
                    mb: 0.5,
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                >
                  <ListItemIcon>
                    <HistoryIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={item.query}
                    secondary={
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
                        <Typography variant="caption">
                          {item.resultCount} results
                        </Typography>
                        <Typography variant="caption">•</Typography>
                        <Typography variant="caption">
                          {item.timestamp.toLocaleDateString()}
                        </Typography>
                        <Chip
                          label={`${Math.round(item.confidence * 100)}%`}
                          size="small"
                          color={getConfidenceColor(item.confidence)}
                          variant="outlined"
                          sx={{ ml: 'auto', height: 20 }}
                        />
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Paper>
      </Collapse>

      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Try these example queries:
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {exampleQueries[entityType].map((example, index) => (
            <Chip
              key={index}
              label={example}
              onClick={() => handleExampleClick(example)}
              clickable
              size="small"
              variant="outlined"
              color="primary"
              disabled={isSearching || rows.length === 0}
            />
          ))}
        </Box>
      </Box>

      {rows.length === 0 && (
        <Alert severity="info" sx={{ mt: 2 }}>
          No {entityType} data available. Upload a file to start using AI search.
        </Alert>
      )}
    </Paper>
  );
}; 