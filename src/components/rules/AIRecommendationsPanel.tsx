import React, { useState } from 'react';
import { RuleRecommendation, RecommendationStatus } from '../../types';
import { useRulesStore } from '../../store/rulesStore';
import { RuleRecommendationCard } from '@/components/rules/RuleRecommendationCard';
import { RuleRecommendationTweakModal } from '@/components/rules/RuleRecommendationTweakModal';

interface AIRecommendationsPanelProps {
  className?: string;
}

export const AIRecommendationsPanel: React.FC<AIRecommendationsPanelProps> = ({ 
  className = '' 
}) => {
  const [selectedRecommendationId, setSelectedRecommendationId] = useState<string | null>(null);
  const [showTweakModal, setShowTweakModal] = useState(false);
  
  const { 
    recommendations,
    isGeneratingRecommendations,
    lastRecommendationRun,
    acceptRecommendation,
    ignoreRecommendation,
    clearRecommendations,
    getPendingRecommendations,
    getAcceptedRecommendations,
    getIgnoredRecommendations
  } = useRulesStore();

  const pendingRecommendations = getPendingRecommendations();
  const acceptedRecommendations = getAcceptedRecommendations();
  const ignoredRecommendations = getIgnoredRecommendations();

  const handleAccept = (id: string) => {
    acceptRecommendation(id);
  };

  const handleIgnore = (id: string) => {
    ignoreRecommendation(id);
  };

  const handleTweak = (id: string) => {
    setSelectedRecommendationId(id);
    setShowTweakModal(true);
  };

  const handleTweakComplete = () => {
    setShowTweakModal(false);
    setSelectedRecommendationId(null);
  };

  const getStatusColor = (status: RecommendationStatus) => {
    switch (status) {
      case 'accepted':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'ignored':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'tweaking':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getStatusIcon = (status: RecommendationStatus) => {
    switch (status) {
      case 'accepted':
        return '✅';
      case 'ignored':
        return '❌';
      case 'tweaking':
        return '🔧';
      default:
        return '💡';
    }
  };

  if (isGeneratingRecommendations) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Analyzing Your Data...
            </h3>
            <p className="text-gray-600">
              AI is examining your clients, workers, and tasks to find optimization opportunities.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <div className="text-center py-8">
          <div className="text-4xl mb-4">🤖</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No AI Recommendations Yet
          </h3>
          <p className="text-gray-600 mb-4">
            Generate AI recommendations to optimize your business rules based on your data patterns.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              🤖 AI Rule Recommendations
              <span className="text-sm font-normal text-gray-500">
                ({recommendations.length} total)
              </span>
            </h3>
            {lastRecommendationRun && (
              <p className="text-sm text-gray-600 mt-1">
                Last updated: {new Date(lastRecommendationRun).toLocaleString()}
              </p>
            )}
          </div>
          <button
            onClick={clearRecommendations}
            className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1 rounded-md hover:bg-gray-100"
          >
            Clear All
          </button>
        </div>

        <div className="flex gap-4 mt-4">
          {pendingRecommendations.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-600">
                {pendingRecommendations.length} Pending
              </span>
            </div>
          )}
          {acceptedRecommendations.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">
                {acceptedRecommendations.length} Accepted
              </span>
            </div>
          )}
          {ignoredRecommendations.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
              <span className="text-sm text-gray-600">
                {ignoredRecommendations.length} Ignored
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {pendingRecommendations.length > 0 && (
          <div className="p-4 border-b bg-blue-50/30">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              💡 Pending Recommendations
              <span className="text-sm font-normal text-gray-500">
                ({pendingRecommendations.length})
              </span>
            </h4>
            <div className="space-y-3">
              {pendingRecommendations.map((recommendation) => (
                <RuleRecommendationCard
                  key={recommendation.id}
                  recommendation={recommendation}
                  onAccept={handleAccept}
                  onIgnore={handleIgnore}
                  onTweak={handleTweak}
                />
              ))}
            </div>
          </div>
        )}

        {acceptedRecommendations.length > 0 && (
          <div className="p-4 border-b">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              ✅ Accepted Recommendations
              <span className="text-sm font-normal text-gray-500">
                ({acceptedRecommendations.length})
              </span>
            </h4>
            <div className="space-y-2">
              {acceptedRecommendations.map((recommendation) => (
                <div 
                  key={recommendation.id}
                  className="p-3 bg-green-50 border border-green-200 rounded-lg"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h5 className="font-medium text-green-800">
                        {recommendation.rule.name}
                      </h5>
                      <p className="text-sm text-green-700 mt-1">
                        {recommendation.explanation}
                      </p>
                    </div>
                    <span className="text-green-600 text-sm">
                      ✅ Added to Rules
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {ignoredRecommendations.length > 0 && (
          <div className="p-4">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              ❌ Ignored Recommendations
              <span className="text-sm font-normal text-gray-500">
                ({ignoredRecommendations.length})
              </span>
            </h4>
            <div className="space-y-2">
              {ignoredRecommendations.map((recommendation) => (
                <div 
                  key={recommendation.id}
                  className="p-3 bg-gray-50 border border-gray-200 rounded-lg opacity-75"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-600">
                        {recommendation.rule.name}
                      </h5>
                      <p className="text-sm text-gray-500 mt-1">
                        {recommendation.explanation}
                      </p>
                    </div>
                    <span className="text-gray-400 text-sm">
                      Ignored
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>


      {showTweakModal && selectedRecommendationId && (
        <RuleRecommendationTweakModal
          recommendationId={selectedRecommendationId}
          isOpen={showTweakModal}
          onClose={handleTweakComplete}
        />
      )}
    </div>
  );
}; 