import React, { useState } from 'react';
import { RuleRecommendation, RuleType } from '../../types';

interface RuleRecommendationCardProps {
  recommendation: RuleRecommendation;
  onAccept: (id: string) => void;
  onIgnore: (id: string) => void;
  onTweak: (id: string) => void;
}

export const RuleRecommendationCard: React.FC<RuleRecommendationCardProps> = ({
  recommendation,
  onAccept,
  onIgnore,
  onTweak
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const getRuleTypeColor = (type: RuleType) => {
    switch (type) {
      case 'co-run':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'load-limit':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'phase-window':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pattern-match':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'slot-restriction':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRuleTypeIcon = (type: RuleType) => {
    switch (type) {
      case 'co-run':
        return '🔗';
      case 'load-limit':
        return '⚖️';
      case 'phase-window':
        return '🕒';
      case 'pattern-match':
        return '🔍';
      case 'slot-restriction':
        return '🎯';
      default:
        return '⚙️';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const formatRuleConfig = (config: any) => {
    if (!config) return 'No configuration details';
    
    const entries = Object.entries(config);
    if (entries.length === 0) return 'No configuration details';
    
    return entries.map(([key, value]) => {
      let displayValue = value;
      if (Array.isArray(value)) {
        displayValue = value.join(', ');
      } else if (typeof value === 'object') {
        displayValue = JSON.stringify(value);
      }
      
      const displayKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      return `${displayKey}: ${displayValue}`;
    }).join(' • ');
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">
              {getRuleTypeIcon(recommendation.rule.type || 'pattern-match')}
            </span>
            <h4 className="font-semibold text-gray-900">
              {recommendation.rule.name || 'AI Rule Suggestion'}
            </h4>
            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getRuleTypeColor(recommendation.rule.type || 'pattern-match')}`}>
              {recommendation.rule.type?.replace('-', ' ') || 'pattern match'}
            </span>
          </div>
          
          <p className="text-gray-700 text-sm leading-relaxed">
            {recommendation.explanation}
          </p>
        </div>

        <div className={`ml-4 px-2 py-1 rounded-md text-xs font-medium ${getConfidenceColor(recommendation.confidence)}`}>
          {Math.round(recommendation.confidence * 100)}% confidence
        </div>
      </div>

      {recommendation.dataPatterns.length > 0 && (
        <div className="mb-3">
          <div className="flex flex-wrap gap-1">
            {recommendation.dataPatterns.slice(0, 2).map((pattern, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md"
              >
                📊 {pattern}
              </span>
            ))}
            {recommendation.dataPatterns.length > 2 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">
                +{recommendation.dataPatterns.length - 2} more
              </span>
            )}
          </div>
        </div>
      )}

      <div className="mb-4">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
        >
          {showDetails ? '▼' : '▶'} Rule Configuration
        </button>
        
        {showDetails && (
          <div className="mt-2 p-3 bg-gray-50 rounded-md border">
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-gray-700">Name:</span>
                <span className="ml-2 text-gray-600">{recommendation.rule.name}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Description:</span>
                <span className="ml-2 text-gray-600">{recommendation.rule.description}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Priority:</span>
                <span className="ml-2 text-gray-600">{recommendation.rule.priority || 5}</span>
              </div>
              {recommendation.rule.config && (
                <div>
                  <span className="font-medium text-gray-700">Configuration:</span>
                  <div className="ml-2 text-gray-600 mt-1">
                    {formatRuleConfig(recommendation.rule.config)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {recommendation.reasoning && (
        <div className="mb-4 p-3 bg-blue-50 rounded-md border border-blue-200">
          <h5 className="font-medium text-blue-900 text-sm mb-1">AI Reasoning:</h5>
          <p className="text-blue-800 text-sm">
            {recommendation.reasoning}
          </p>
        </div>
      )}


      <div className="flex items-center gap-2 pt-3 border-t">
        <button
          onClick={() => onAccept(recommendation.id)}
          className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
        >
          ✅ Accept & Add Rule
        </button>
        
        <button
          onClick={() => onTweak(recommendation.id)}
          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          🔧 Tweak & Accept
        </button>
        
        <button
          onClick={() => onIgnore(recommendation.id)}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium"
        >
          ❌ Ignore
        </button>
      </div>
    </div>
  );
}; 