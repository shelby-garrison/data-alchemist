import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { Layout } from '../components/Layout';
import { UploadTab } from '../components/UploadTab';
import { RulesTab } from '../components/RulesTab';
import { ExportTab } from '../components/ExportTab';
import { Milestone3Tab } from '../components/Milestone3Tab';
import { useDataStore } from '../store/dataStore';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

export default function Home() {
  const { activeTab } = useDataStore();

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'upload':
        return <UploadTab />;
      case 'rules':
        return <RulesTab />;
      case 'ai-enhancement':
        return <Milestone3Tab />;
      case 'export':
        return <ExportTab />;
      default:
        return <UploadTab />;
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Layout>
        {renderActiveTab()}
      </Layout>
    </ThemeProvider>
  );
}
