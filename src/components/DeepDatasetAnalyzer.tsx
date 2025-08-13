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
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Badge,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Divider,
  Grid,
} from '@mui/material';
import {
  Analytics as AnalyticsIcon,
  BugReport as BugReportIcon,
  TrendingUp as TrendingUpIcon,
  Psychology as PsychologyIcon,
  Insights as InsightsIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  ExpandMore as ExpandMoreIcon,
  Lightbulb as LightbulbIcon,
  Assessment as AssessmentIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  DataUsage as DataUsageIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import { 
  EntityType, 
  DatasetAnalysis, 
  AnalysisFinding, 
  EnhancedRuleRecommendation,
  Rule 
} from '../types';
import { 
  performDeepDatasetAnalysis, 
  generateEnhancedRuleRecommendations 
} from '../utils/geminiservice';
import { useDataStore } from '../store/dataStore';
import { useRulesStore } from '../store/rulesStore';

interface DeepDatasetAnalyzerProps {
  className?: string;
}

export const DeepDatasetAnalyzer: React.FC<DeepDatasetAnalyzerProps> = ({
  className = '',
}) => {
  const {
    clients,
    workers,
    tasks,
    datasetAnalyses,
    currentAnalysis,
    isPerformingAnalysis,
    addDatasetAnalysis,
    setCurrentAnalysis,
    setPerformingAnalysis,
  } = useDataStore();

  const { rules, addRule } = useRulesStore();

  const [analysisType, setAnalysisType] = useState<'comprehensive' | 'patterns' | 'anomalies' | 'business-logic'>('comprehensive');
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);
  const [selectedFinding, setSelectedFinding] = useState<AnalysisFinding | null>(null);
  const [enhancedRecommendations, setEnhancedRecommendations] = useState<EnhancedRuleRecommendation[]>([]);
  const [error, setError] = useState<string | null>(null);

  const hasData = clients.rows.length > 0 && workers.rows.length > 0 && tasks.rows.length > 0;
  const allValidationErrors = [
    ...clients.validationErrors,
    ...workers.validationErrors,
    ...tasks.validationErrors,
  ];

  const analysisTypeLabels = {
    comprehensive: 'Comprehensive Analysis',
    patterns: 'Pattern Detection',
    anomalies: 'Anomaly Detection',
    'business-logic': 'Business Logic Review',
  };

  const analysisTypeDescriptions = {
    comprehensive: 'Full analysis covering all aspects: patterns, anomalies, business logic, and efficiency',
    patterns: 'Focus on identifying data patterns, correlations, and recurring structures',
    anomalies: 'Detect outliers, unusual values, and statistical anomalies in the dataset',
    'business-logic': 'Review business rules compliance and logical consistency',
  };

  const handleRunAnalysis = useCallback(async () => {
    if (!hasData) return;

    setPerformingAnalysis(true);
    setError(null);

    try {
      const entities = {
        clients: clients.rows,
        workers: workers.rows,
        tasks: tasks.rows,
      };

      const response = await performDeepDatasetAnalysis(
        entities,
        rules,
        allValidationErrors
      );

      addDatasetAnalysis(response.analysis);
      setCurrentAnalysis(response.analysis);

      const context = {
        clients: clients.rows,
        workers: workers.rows,
        tasks: tasks.rows,
        existingRules: rules,
      };

      const enhancedRecs = await generateEnhancedRuleRecommendations(
        context,
        response.analysis.findings
      );

      setEnhancedRecommendations(enhancedRecs);
      setShowAnalysisDialog(true);

    } catch (error) {
      console.error('Error performing deep analysis:', error);
      setError('Failed to perform dataset analysis. Please try again.');
    } finally {
      setPerformingAnalysis(false);
    }
  }, [hasData, clients.rows, workers.rows, tasks.rows, rules, allValidationErrors, addDatasetAnalysis, setCurrentAnalysis, setPerformingAnalysis]);

  const getSeverityIcon = (severity: AnalysisFinding['severity']) => {
    switch (severity) {
      case 'critical':
        return <ErrorIcon color="error" />;
      case 'high':
        return <WarningIcon color="error" />;
      case 'medium':
        return <WarningIcon color="warning" />;
      case 'low':
        return <InfoIcon color="info" />;
      case 'info':
        return <InsightsIcon color="info" />;
      default:
        return <InfoIcon />;
    }
  };

  const getSeverityColor = (severity: AnalysisFinding['severity']) => {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      case 'info':
        return 'info';
      default:
        return 'default';
    }
  };

  const getCategoryIcon = (category: AnalysisFinding['category']) => {
    switch (category) {
      case 'data-quality':
        return <DataUsageIcon />;
      case 'business-logic':
        return <PsychologyIcon />;
      case 'efficiency':
        return <SpeedIcon />;
      case 'patterns':
        return <TimelineIcon />;
      case 'anomalies':
        return <TrendingUpIcon />;
      default:
        return <AssessmentIcon />;
    }
  };

  const getImpactIcon = (impact: EnhancedRuleRecommendation['businessImpact']) => {
    switch (impact) {
      case 'high':
        return <TrendingUpIcon color="success" />;
      case 'medium':
        return <TrendingUpIcon color="warning" />;
      case 'low':
        return <TrendingUpIcon color="info" />;
      default:
        return <TrendingUpIcon />;
    }
  };

  const handleAcceptRecommendation = (recommendation: EnhancedRuleRecommendation) => {
    if (recommendation.rule) {
      const newRule: Rule = {
        ...recommendation.rule,
        id: recommendation.rule.id || `rule-${Date.now()}`,
        name: recommendation.rule.name || 'AI Generated Rule',
        description: recommendation.rule.description || recommendation.explanation,
        type: recommendation.rule.type || 'pattern-match',
        enabled: true,
        priority: recommendation.priority || 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: 'ai-generated' as const,
      } as Rule;
      
      addRule(newRule);
    }
  };

  const findingsBySeverity = currentAnalysis?.findings.reduce((acc, finding) => {
    if (!acc[finding.severity]) acc[finding.severity] = [];
    acc[finding.severity].push(finding);
    return acc;
  }, {} as Record<AnalysisFinding['severity'], AnalysisFinding[]>) || {};

  const findingsByCategory = currentAnalysis?.findings.reduce((groups, finding) => {
    if (!groups[finding.category]) groups[finding.category] = [];
    groups[finding.category].push(finding);
    return groups;
  }, {} as Record<string, AnalysisFinding[]>) || {};

  return (
    <Paper sx={{ p: 3 }} className={className}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <AnalyticsIcon color="primary" />
        <Typography variant="h6">
          Deep Dataset Analyzer
        </Typography>
        <Badge badgeContent={currentAnalysis?.findings.length || 0} color="primary">
          <InsightsIcon />
        </Badge>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        AI performs comprehensive analysis to identify non-obvious problems, patterns, and optimization opportunities across your entire dataset.
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Analysis Type</InputLabel>
          <Select
            value={analysisType}
            label="Analysis Type"
            onChange={(e) => setAnalysisType(e.target.value as any)}
          >
            {(Object.keys(analysisTypeLabels) as Array<keyof typeof analysisTypeLabels>).map((type) => (
              <MenuItem key={type} value={type}>
                {analysisTypeLabels[type]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          variant="contained"
          onClick={handleRunAnalysis}
          disabled={isPerformingAnalysis || !hasData}
          startIcon={isPerformingAnalysis ? <CircularProgress size={20} /> : <PsychologyIcon />}
        >
          {isPerformingAnalysis ? 'Analyzing...' : 'Run Analysis'}
        </Button>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        <strong>{analysisTypeLabels[analysisType]}:</strong> {analysisTypeDescriptions[analysisType]}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!hasData && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Please upload data for all entity types (clients, workers, tasks) to run deep analysis.
        </Alert>
      )}

      {isPerformingAnalysis && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Analyzing dataset...
          </Typography>
          <LinearProgress />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            This may take 30-60 seconds depending on dataset size
          </Typography>
        </Box>
      )}

      {datasetAnalyses.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Analysis History:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {datasetAnalyses.slice(-5).map((analysis) => (
              <Chip
                key={analysis.id}
                label={`${analysis.findings.length} findings`}
                color={currentAnalysis?.id === analysis.id ? 'primary' : 'default'}
                size="small"
                onClick={() => {
                  setCurrentAnalysis(analysis);
                  setShowAnalysisDialog(true);
                }}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Box>
        </Box>
      )}

      {currentAnalysis && (
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={3}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" color="primary">
                  {currentAnalysis.findings.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Findings
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" color="error">
                  {(findingsBySeverity.critical?.length || 0) + (findingsBySeverity.high?.length || 0)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  High Priority
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" color="success">
                  {Math.round(currentAnalysis.confidence * 100)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Confidence
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" color="info">
                  {Math.round(currentAnalysis.processingTime / 1000)}s
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Analysis Time
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {currentAnalysis && currentAnalysis.findings.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Key Findings Preview:
          </Typography>
          {currentAnalysis.findings.slice(0, 3).map((finding) => (
            <Alert
              key={finding.id}
              severity={getSeverityColor(finding.severity) as any}
              sx={{ mb: 1 }}
              action={
                <Button
                  size="small"
                  onClick={() => {
                    setSelectedFinding(finding);
                    setShowAnalysisDialog(true);
                  }}
                >
                  Details
                </Button>
              }
            >
              <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                {finding.title}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {finding.description}
              </Typography>
            </Alert>
          ))}
          {currentAnalysis.findings.length > 3 && (
            <Button
              size="small"
              onClick={() => setShowAnalysisDialog(true)}
              startIcon={<InsightsIcon />}
            >
              View All {currentAnalysis.findings.length} Findings
            </Button>
          )}
        </Box>
      )}

      <Dialog
        open={showAnalysisDialog}
        onClose={() => setShowAnalysisDialog(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AnalyticsIcon />
            Deep Dataset Analysis Results
            {currentAnalysis && (
              <Chip
                label={`${currentAnalysis.findings.length} findings`}
                color="primary"
                size="small"
              />
            )}
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {currentAnalysis && (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Analysis completed on {new Date(currentAnalysis.createdAt).toLocaleString()} • 
                Confidence: {Math.round(currentAnalysis.confidence * 100)}% • 
                Processing time: {Math.round(currentAnalysis.processingTime / 1000)}s
              </Typography>

              <Typography variant="h6" sx={{ mb: 2 }}>Findings by Severity</Typography>
              {(Object.keys(findingsBySeverity) as Array<keyof typeof findingsBySeverity>).map((severity) => (
                <Accordion key={severity} sx={{ mb: 1 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getSeverityIcon(severity)}
                      <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                        {severity} Priority
                      </Typography>
                      <Chip label={findingsBySeverity[severity].length} size="small" />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    {findingsBySeverity[severity].map((finding) => (
                      <Card key={finding.id} variant="outlined" sx={{ mb: 2 }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            {getCategoryIcon(finding.category)}
                            <Typography variant="subtitle2">
                              {finding.title}
                            </Typography>
                            <Chip 
                              label={finding.category} 
                              size="small" 
                              variant="outlined"
                            />
                          </Box>
                          
                          <Typography variant="body2" sx={{ mb: 2 }}>
                            {finding.description}
                          </Typography>
                          
                          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                            Affects {finding.affectedRows.length} rows • Confidence: {Math.round(finding.confidence * 100)}%
                          </Typography>
                          
                          {finding.evidence.length > 0 && (
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="caption" sx={{ fontWeight: 'bold' }}>Evidence:</Typography>
                              <List dense>
                                {finding.evidence.map((evidence, idx) => (
                                  <ListItem key={idx} sx={{ py: 0 }}>
                                    <ListItemText 
                                      primary={evidence}
                                      primaryTypographyProps={{ variant: 'caption' }}
                                    />
                                  </ListItem>
                                ))}
                              </List>
                            </Box>
                          )}
                          
                          {finding.suggestedActions.length > 0 && (
                            <Box>
                              <Typography variant="caption" sx={{ fontWeight: 'bold' }}>Suggested Actions:</Typography>
                              <List dense>
                                {finding.suggestedActions.map((action, idx) => (
                                  <ListItem key={idx} sx={{ py: 0 }}>
                                    <ListItemIcon sx={{ minWidth: 20 }}>
                                      <LightbulbIcon fontSize="small" />
                                    </ListItemIcon>
                                    <ListItemText 
                                      primary={action}
                                      primaryTypographyProps={{ variant: 'caption' }}
                                    />
                                  </ListItem>
                                ))}
                              </List>
                            </Box>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </AccordionDetails>
                </Accordion>
              ))}

              {enhancedRecommendations.length > 0 && (
                <>
                  <Divider sx={{ my: 3 }} />
                  <Typography variant="h6" sx={{ mb: 2 }}>Enhanced Rule Recommendations</Typography>
                  {enhancedRecommendations.map((recommendation) => (
                    <Card key={recommendation.id} variant="outlined" sx={{ mb: 2 }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                          <Box>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                              {recommendation.rule?.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {recommendation.explanation}
                            </Typography>
                          </Box>
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => handleAcceptRecommendation(recommendation)}
                            startIcon={<CheckCircleIcon />}
                          >
                            Accept Rule
                          </Button>
                        </Box>
                        
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                          <Chip
                            icon={getImpactIcon(recommendation.businessImpact)}
                            label={`${recommendation.businessImpact} Impact`}
                            size="small"
                            color={recommendation.businessImpact === 'high' ? 'success' : 'default'}
                          />
                          <Chip
                            label={`${recommendation.implementationComplexity} Complexity`}
                            size="small"
                            variant="outlined"
                          />
                          <Chip
                            label={`${Math.round(recommendation.confidence * 100)}% Confidence`}
                            size="small"
                            variant="outlined"
                          />
                        </Box>
                        
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Expected Benefit:</strong> {recommendation.estimatedBenefit}
                        </Typography>
                        
                        <Typography variant="body2">
                          <strong>Reasoning:</strong> {recommendation.reasoning}
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
                </>
              )}
            </>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setShowAnalysisDialog(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}; 