import React, { useState } from 'react';
import { useDataStore } from '../../store/dataStore';
import { useRulesStore } from '../../store/rulesStore';
import { generateAIRuleRecommendations } from '../../utils/aiRuleRecommendations';

interface AIRecommendationsGeneratorProps {
  className?: string;
}

export const AIRecommendationsGenerator: React.FC<AIRecommendationsGeneratorProps> = ({ 
  className = '' 
}) => {
  const [error, setError] = useState<string | null>(null);
  
  const { clients, workers, tasks } = useDataStore();
  const { 
    rules, 
    isGeneratingRecommendations,
    setGeneratingRecommendations,
    setRecommendations
  } = useRulesStore();

  const hasData = clients.rows.length > 0 && workers.rows.length > 0 && tasks.rows.length > 0;

  const handleGenerateRecommendations = async () => {
    if (!hasData) {
      setError('Please upload and validate clients, workers, and tasks data first.');
      return;
    }

    setError(null);
    setGeneratingRecommendations(true);

    try {
      const response = await generateAIRuleRecommendations(
        clients.rows,
        workers.rows,
        tasks.rows,
        rules,
        5 
      );

      setRecommendations(response.recommendations);
      
    } catch (err) {
      console.error('Error generating AI recommendations:', err);
      setError('Failed to generate AI recommendations. Please try again.');
    } finally {
      setGeneratingRecommendations(false);
    }
  };

  const getDataSummary = () => {
    return {
      clients: clients.rows.length,
      workers: workers.rows.length, 
      tasks: tasks.rows.length,
      rules: rules.length
    };
  };

  const summary = getDataSummary();

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            🤖 AI Rule Recommendations
          </h3>
          <p className="text-gray-600 text-sm mt-1">
            Let AI analyze your data to suggest optimization rules
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">{summary.clients}</div>
          <div className="text-sm text-gray-600">Clients</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">{summary.workers}</div>
          <div className="text-sm text-gray-600">Workers</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">{summary.tasks}</div>
          <div className="text-sm text-gray-600">Tasks</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">{summary.rules}</div>
          <div className="text-sm text-gray-600">Existing Rules</div>
        </div>
      </div>

      {!hasData && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-yellow-600">⚠️</span>
            <h4 className="font-medium text-yellow-800">Data Required</h4>
          </div>
          <p className="text-yellow-700 text-sm mt-1">
            To generate AI recommendations, please first upload and validate your:
          </p>
          <ul className="text-yellow-700 text-sm mt-2 ml-4 list-disc">
            {clients.rows.length === 0 && <li>Client data</li>}
            {workers.rows.length === 0 && <li>Worker data</li>}
            {tasks.rows.length === 0 && <li>Task data</li>}
          </ul>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-red-600">❌</span>
            <h4 className="font-medium text-red-800">Error</h4>
          </div>
          <p className="text-red-700 text-sm mt-1">{error}</p>
        </div>
      )}

      <div className="mb-6">
        <h4 className="font-medium text-gray-900 mb-3">AI will analyze for:</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span className="text-purple-600">🔗</span>
            <span>Tasks that frequently run together</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span className="text-orange-600">⚖️</span>
            <span>Worker groups with high load</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span className="text-blue-600">🕒</span>
            <span>Phase availability patterns</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span className="text-green-600">🔍</span>
            <span>Data quality and consistency issues</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span className="text-yellow-600">🎯</span>
            <span>Skill and qualification mismatches</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span className="text-indigo-600">📊</span>
            <span>Resource optimization opportunities</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center">
        <button
          onClick={handleGenerateRecommendations}
          disabled={!hasData || isGeneratingRecommendations}
          className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors ${
            hasData && !isGeneratingRecommendations
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isGeneratingRecommendations ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Analyzing Data...
            </>
          ) : (
            <>
              🚀 Generate AI Recommendations
            </>
          )}
        </button>
      </div>


      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          AI analysis typically takes 10-30 seconds • Powered by Gemini 1.5 Flash
        </p>
      </div>
    </div>
  );
}; 