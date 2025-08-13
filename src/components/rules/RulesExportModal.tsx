import React, { useState, useEffect } from 'react';
import { useRulesStore } from '../../store/rulesStore';
import { useDataStore } from '../../store/dataStore';
import { RulesExport } from '../../types';
import { downloadFile } from '../../utils/helpers';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const RulesExportModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { 
    rules, 
    priorityWeights, 
    getEnabledRules,
    exportToJSON 
  } = useRulesStore();
  
  const { clients, workers, tasks } = useDataStore();
  
  const [exportData, setExportData] = useState<RulesExport | null>(null);
  const [includeDisabled, setIncludeDisabled] = useState(false);
  const [includeWeights, setIncludeWeights] = useState(true);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [exportFormat, setExportFormat] = useState<'json' | 'yaml'>('json');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      generateExportData();
    }
  }, [isOpen, includeDisabled, includeWeights, includeMetadata]);

  const generateExportData = () => {
    setIsGenerating(true);
    
    const rulesToExport = includeDisabled ? rules : getEnabledRules();
    const weightsToExport = includeWeights ? priorityWeights : [];
    
    const metadata = includeMetadata ? {
      exportedAt: new Date().toISOString(),
      version: '2.0',
      dataContext: {
        clientCount: clients.rows.length,
        workerCount: workers.rows.length,
        taskCount: tasks.rows.length,
      },
      exportSettings: {
        includeDisabled,
        includeWeights,
        totalRulesExported: rulesToExport.length,
        totalWeightsExported: weightsToExport.length,
        enabledRulesCount: getEnabledRules().length,
        disabledRulesCount: rules.length - getEnabledRules().length,
      },
      ruleTypeBreakdown: rules.reduce((acc, rule) => {
        acc[rule.type] = (acc[rule.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    } : {
      exportedAt: new Date().toISOString(),
      version: '2.0',
      dataContext: {
        clientCount: clients.rows.length,
        workerCount: workers.rows.length,
        taskCount: tasks.rows.length,
      },
    };

    const exportObj: RulesExport = {
      rules: rulesToExport,
      priorityWeights: weightsToExport,
      metadata,
    };

    setExportData(exportObj);
    setIsGenerating(false);
  };

  const handleDownload = () => {
    if (!exportData) return;

    const timestamp = new Date().toISOString().split('T')[0];
    let content: string;
    let filename: string;
    let contentType: string;

    if (exportFormat === 'json') {
      content = JSON.stringify(exportData, null, 2);
      filename = `business-rules-${timestamp}.json`;
      contentType = 'application/json';
    } else {
      content = convertToYAML(exportData);
      filename = `business-rules-${timestamp}.yaml`;
      contentType = 'text/yaml';
    }

    downloadFile(content, filename, contentType);
  };

  const convertToYAML = (obj: any, indent = 0): string => {
    const spaces = '  '.repeat(indent);
    let yaml = '';

    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) {
        yaml += `${spaces}${key}: null\n`;
      } else if (typeof value === 'string') {
        yaml += `${spaces}${key}: "${value}"\n`;
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        yaml += `${spaces}${key}: ${value}\n`;
      } else if (Array.isArray(value)) {
        yaml += `${spaces}${key}:\n`;
        value.forEach((item, index) => {
          if (typeof item === 'object') {
            yaml += `${spaces}  - \n`;
            yaml += convertToYAML(item, indent + 2).replace(/^/gm, '    ');
          } else {
            yaml += `${spaces}  - ${item}\n`;
          }
        });
      } else if (typeof value === 'object') {
        yaml += `${spaces}${key}:\n`;
        yaml += convertToYAML(value, indent + 1);
      }
    }

    return yaml;
  };

  const copyToClipboard = async () => {
    if (!exportData) return;
    
    const content = exportFormat === 'json' 
      ? JSON.stringify(exportData, null, 2)
      : convertToYAML(exportData);
      
    try {
      await navigator.clipboard.writeText(content);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const getExportSummary = () => {
    if (!exportData) return null;

    const ruleCount = exportData.rules.length;
    const weightCount = exportData.priorityWeights.length;
    const enabledRules = exportData.rules.filter(r => r.enabled).length;
    
    return {
      totalRules: ruleCount,
      enabledRules,
      disabledRules: ruleCount - enabledRules,
      totalWeights: weightCount,
      enabledWeights: exportData.priorityWeights.filter(w => w.enabled).length,
    };
  };

  if (!isOpen) return null;

  const summary = getExportSummary();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[700px] flex flex-col">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                📥 Export Business Rules
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Download your rules configuration for backup or sharing
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-80 p-6 border-r bg-gray-50">
            <h3 className="font-medium text-gray-900 mb-4">Export Settings</h3>
            
            <div className="space-y-4">
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={includeDisabled}
                    onChange={(e) => setIncludeDisabled(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Include disabled rules</span>
                </label>
              </div>
              
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={includeWeights}
                    onChange={(e) => setIncludeWeights(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Include priority weights</span>
                </label>
              </div>
              
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={includeMetadata}
                    onChange={(e) => setIncludeMetadata(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Include metadata</span>
                </label>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Export Format
                </label>
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as 'json' | 'yaml')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="json">JSON</option>
                  <option value="yaml">YAML</option>
                </select>
              </div>
            </div>

            {summary && (
              <div className="mt-6 p-4 bg-white rounded-lg border">
                <h4 className="font-medium text-gray-900 mb-3">Export Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Rules:</span>
                    <span className="font-medium">{summary.totalRules}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Enabled:</span>
                    <span className="text-green-600">{summary.enabledRules}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Disabled:</span>
                    <span className="text-gray-500">{summary.disabledRules}</span>
                  </div>
                  {includeWeights && (
                    <>
                      <hr className="my-2" />
                      <div className="flex justify-between">
                        <span className="text-gray-600">Priority Weights:</span>
                        <span className="font-medium">{summary.totalWeights}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="mt-6 space-y-3">
              <button
                onClick={handleDownload}
                disabled={!exportData || isGenerating}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? 'Generating...' : '📥 Download'}
              </button>
              
              <button
                onClick={copyToClipboard}
                disabled={!exportData || isGenerating}
                className="w-full px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                📋 Copy to Clipboard
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b bg-gray-50">
              <h3 className="font-medium text-gray-900">
                Preview ({exportFormat.toUpperCase()})
              </h3>
            </div>
            
            <div className="flex-1 overflow-auto p-4">
              {isGenerating ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                    <p>Generating export data...</p>
                  </div>
                </div>
              ) : exportData ? (
                <pre className="text-sm text-gray-800 bg-gray-50 p-4 rounded-lg overflow-auto font-mono">
                  {exportFormat === 'json' 
                    ? JSON.stringify(exportData, null, 2)
                    : convertToYAML(exportData)
                  }
                </pre>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <p>No data to preview</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t bg-gray-50 text-xs text-gray-500">
          Tip: Exported files can be imported back into the system or used for documentation purposes.
          The JSON format is recommended for system imports.
        </div>
      </div>
    </div>
  );
};

export default RulesExportModal; 