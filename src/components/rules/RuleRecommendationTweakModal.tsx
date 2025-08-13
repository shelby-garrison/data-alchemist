import React, { useState, useEffect } from 'react';
import { Rule, RuleType } from '../../types';
import { useRulesStore } from '../../store/rulesStore';

interface RuleRecommendationTweakModalProps {
  recommendationId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const RuleRecommendationTweakModal: React.FC<RuleRecommendationTweakModalProps> = ({
  recommendationId,
  isOpen,
  onClose
}) => {
  const { recommendations, acceptRecommendationWithTweaks } = useRulesStore();
  const recommendation = recommendations.find(r => r.id === recommendationId);
  
  const [tweakedRule, setTweakedRule] = useState<Partial<Rule>>(recommendation?.rule || {});
  const [configInputs, setConfigInputs] = useState<Record<string, any>>({});

  useEffect(() => {
    if (recommendation) {
      setTweakedRule(recommendation.rule);
      setConfigInputs(recommendation.rule.config || {});
    }
  }, [recommendation]);

  if (!isOpen || !recommendation) return null;

  const handleInputChange = (field: keyof Rule, value: any) => {
    setTweakedRule(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleConfigChange = (key: string, value: any) => {
    setConfigInputs(prev => ({
      ...prev,
      [key]: value
    }));
    
    setTweakedRule(prev => ({
      ...prev,
      config: {
        ...prev.config,
        [key]: value
      }
    } as Partial<Rule>));
  };

  const handleAcceptTweaks = () => {
    acceptRecommendationWithTweaks(recommendationId, {
      ...tweakedRule,
      config: configInputs
    } as Partial<Rule>);
    onClose();
  };

  const renderConfigEditor = () => {
    if (!recommendation.rule.type) return null;

    switch (recommendation.rule.type) {
      case 'co-run':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Task IDs (comma-separated)
              </label>
              <input
                type="text"
                value={Array.isArray(configInputs.taskIds) ? configInputs.taskIds.join(', ') : ''}
                onChange={(e) => handleConfigChange('taskIds', e.target.value.split(',').map(s => s.trim()))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="T01, T02, T03"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="mustRunTogether"
                checked={configInputs.mustRunTogether || false}
                onChange={(e) => handleConfigChange('mustRunTogether', e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="mustRunTogether" className="text-sm text-gray-700">
                Must run together
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="samePhase"
                checked={configInputs.samePhase || false}
                onChange={(e) => handleConfigChange('samePhase', e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="samePhase" className="text-sm text-gray-700">
                Same phase required
              </label>
            </div>
          </div>
        );

      case 'load-limit':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Worker Group
              </label>
              <input
                type="text"
                value={configInputs.workerGroup || ''}
                onChange={(e) => handleConfigChange('workerGroup', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Sales, Engineering, etc."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Slots Per Phase
              </label>
              <input
                type="number"
                value={configInputs.maxSlotsPerPhase || ''}
                onChange={(e) => handleConfigChange('maxSlotsPerPhase', parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                min="1"
                max="20"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="overrideIndividualLimits"
                checked={configInputs.overrideIndividualLimits || false}
                onChange={(e) => handleConfigChange('overrideIndividualLimits', e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="overrideIndividualLimits" className="text-sm text-gray-700">
                Override individual worker limits
              </label>
            </div>
          </div>
        );

      case 'phase-window':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Task ID
              </label>
              <input
                type="text"
                value={configInputs.taskId || ''}
                onChange={(e) => handleConfigChange('taskId', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="T01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Allowed Phases (comma-separated)
              </label>
              <input
                type="text"
                value={Array.isArray(configInputs.allowedPhases) ? configInputs.allowedPhases.join(', ') : ''}
                onChange={(e) => handleConfigChange('allowedPhases', e.target.value.split(',').map(s => s.trim()))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Phase1, Phase2"
              />
            </div>
          </div>
        );

      case 'pattern-match':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Field to Match
              </label>
              <input
                type="text"
                value={configInputs.field || ''}
                onChange={(e) => handleConfigChange('field', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="PriorityLevel, WorkerGroup, etc."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pattern
              </label>
              <input
                type="text"
                value={configInputs.pattern || ''}
                onChange={(e) => handleConfigChange('pattern', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Value or regex pattern"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Action
              </label>
              <select
                value={configInputs.action || 'allow'}
                onChange={(e) => handleConfigChange('action', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="allow">Allow</option>
                <option value="deny">Deny</option>
                <option value="flag">Flag for Review</option>
              </select>
            </div>
          </div>
        );

      case 'slot-restriction':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Worker Group (optional)
              </label>
              <input
                type="text"
                value={configInputs.workerGroup || ''}
                onChange={(e) => handleConfigChange('workerGroup', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Engineering, Sales, etc."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client Group (optional)
              </label>
              <input
                type="text"
                value={configInputs.clientGroup || ''}
                onChange={(e) => handleConfigChange('clientGroup', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Enterprise, SMB, etc."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Min Common Slots
              </label>
              <input
                type="number"
                value={configInputs.minCommonSlots || ''}
                onChange={(e) => handleConfigChange('minCommonSlots', parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                min="1"
                max="10"
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="p-4 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-600">
              Configuration editor not available for this rule type. 
              You can still modify the name, description, and priority above.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              🔧 Tweak AI Recommendation
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-medium text-blue-900 mb-2">Original AI Suggestion:</h3>
            <p className="text-blue-800 text-sm">
              {recommendation.explanation}
            </p>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rule Name
              </label>
              <input
                type="text"
                value={tweakedRule.name || ''}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Enter rule name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={tweakedRule.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                rows={3}
                placeholder="Describe what this rule does"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority (1-10, higher = more important)
              </label>
              <input
                type="number"
                value={tweakedRule.priority || 5}
                onChange={(e) => handleInputChange('priority', parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                min="1"
                max="10"
              />
            </div>
          </div>

          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-3">
              Rule Configuration ({tweakedRule.type?.replace('-', ' ') || 'Unknown'})
            </h4>
            {renderConfigEditor()}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleAcceptTweaks}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              ✅ Accept Tweaked Rule
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 