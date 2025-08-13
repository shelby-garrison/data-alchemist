import React from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Typography,
  Button,
  Link,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Warning as WarningIcon,
  ExpandMore as ExpandMoreIcon,
  Lightbulb as LightbulbIcon,
  Build as BuildIcon,
} from '@mui/icons-material';

interface AIQuotaLimitAlertProps {
  feature: string;
  onRetry?: () => void;
  showMockOption?: boolean;
}

export const AIQuotaLimitAlert: React.FC<AIQuotaLimitAlertProps> = ({
  feature,
  onRetry,
  showMockOption = false,
}) => {
  return (
    <Alert severity="warning" sx={{ mb: 2 }}>
      <AlertTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <WarningIcon />
        Gemini AI Quota Limit Reached
      </AlertTitle>
      
      <Typography variant="body2" sx={{ mb: 2 }}>
        You&apos;ve reached your Gemini API quota limit for <strong>{feature}</strong>. 
        Your application is still functional with limited AI features.
      </Typography>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LightbulbIcon fontSize="small" />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Solutions & Workarounds
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                🚀 Quick Solutions:
              </Typography>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                <li>
                  <strong>Upgrade API Plan:</strong>{' '}
                  <Link 
                    href="https://ai.google.dev/gemini-api/docs/rate-limits" 
                    target="_blank" 
                    rel="noopener"
                  >
                    Visit Gemini API Console
                  </Link>
                </li>
                <li><strong>Wait & Retry:</strong> Free tier resets daily</li>
                <li><strong>Continue Testing:</strong> Use manual data entry for now</li>
              </ul>
            </Box>

            {showMockOption && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  🛠️ For Developers:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                  <Chip 
                    icon={<BuildIcon />}
                    label="Mock Mode Available" 
                    size="small" 
                    color="info"
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Set <code>NEXT_PUBLIC_USE_MOCK_AI=true</code> in your environment to enable mock responses
                </Typography>
              </Box>
            )}

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                💡 Alternative Features:
              </Typography>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                <li>Manual data validation and editing still works</li>
                <li>File upload and export functionality available</li>
                <li>Business rules can be created manually</li>
                <li>All existing data remains accessible</li>
              </ul>
            </Box>
          </Box>
        </AccordionDetails>
      </Accordion>

      {onRetry && (
        <Box sx={{ mt: 2 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={onRetry}
            startIcon={<WarningIcon />}
          >
            Try Again
          </Button>
        </Box>
      )}
    </Alert>
  );
}; 