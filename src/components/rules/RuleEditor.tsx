import React, { useState, useEffect } from 'react';
import { useRulesStore } from '../../store/rulesStore';
import { useDataStore } from '../../store/dataStore';
import { Rule, RuleType, RuleValidationResult } from '../../types';
import { validateRule, validateRuleAgainstData } from '../../utils/ruleValidation';
import { getUniqueValues } from '../../utils/helpers';
import { explainRuleInPlainLanguage, suggestRuleImprovements } from '../../utils/aiRulesService';

const RuleEditor: React.FC = () => {
  const { 
    selectedRuleId, 
    getRuleById, 
    updateRule, 
    setSelectedRule 
  } = useRulesStore();
  
  const { clients, workers, tasks } = useDataStore();
  
  const [rule, setRule] = useState<Rule | null>(null);
  const [validation, setValidation] = useState<RuleValidationResult | null>(null);
  const [dataValidation, setDataValidation] = useState<RuleValidationResult | null>(null);
  const [plainLanguageExplanation, setPlainLanguageExplanation] = useState<string>('');
  const [improvements, setImprovements] = useState<string[]>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  useEffect(() => {
    if (selectedRuleId) {
      const selectedRule = getRuleById(selectedRuleId);
      if (selectedRule) {
        setRule(selectedRule);
        
        const ruleValidation = validateRule(selectedRule);
        setValidation(ruleValidation);
        
        const dataContext = {
          availableTaskIds: getUniqueValues(tasks.rows, 'TaskID').filter(v => v != null).map(String),
          availableWorkerGroups: getUniqueValues(workers.rows, 'WorkerGroup').filter(v => v != null).map(String),
          availableClientGroups: getUniqueValues(clients.rows, 'GroupTag').filter(v => v != null).map(String),
        };
        
        const dataVal = validateRuleAgainstData(selectedRule, dataContext);
        setDataValidation(dataVal);
      }
    } else {
      setRule(null);
      setValidation(null);
      setDataValidation(null);
    }
  }, [selectedRuleId, getRuleById, clients.rows, workers.rows, tasks.rows]);

  const handleRuleUpdate = (updates: Partial<Rule>) => {
    if (!rule) return;
    
    const updatedRule = { ...rule, ...updates } as Rule;
    setRule(updatedRule);
    updateRule(rule.id, updates);
    
    const ruleValidation = validateRule(updatedRule);
    setValidation(ruleValidation);
  };

  const handleGetAIExplanation = async () => {
    if (!rule) return;
    
    setIsLoadingAI(true);
    try {
      const explanation = await explainRuleInPlainLanguage(rule);
      setPlainLanguageExplanation(explanation);
    } catch (error) {
      console.error('Failed to get AI explanation:', error);
    } finally {
      setIsLoadingAI(false);
    }
  };

  const handleGetImprovements = async () => {
    if (!rule) return;
    
    setIsLoadingAI(true);
    try {
      const dataContext = {
        availableTaskIds: getUniqueValues(tasks.rows, 'TaskID').filter(v => v != null).map(String),
        availableWorkerGroups: getUniqueValues(workers.rows, 'WorkerGroup').filter(v => v != null).map(String),
        availableClientGroups: getUniqueValues(clients.rows, 'GroupTag').filter(v => v != null).map(String),
      };
      
      const suggestions = await suggestRuleImprovements(rule, dataContext);
      setImprovements(suggestions);
    } catch (error) {
      console.error('Failed to get improvement suggestions:', error);
    } finally {
      setIsLoadingAI(false);
    }
  };

  const renderConfigEditor = () => {
    if (!rule) return null;

    switch (rule.type) {
      case 'co-run':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Task IDs
              </label>
              <textarea
                value={rule.config.taskIds?.join(', ') || ''}
                onChange={(e) => handleRuleUpdate({
                  config: {
                    ...rule.config,
                    taskIds: e.target.value.split(',').map(id => id.trim()).filter(Boolean)
                  }
                })}
                placeholder="T1, T2, T3"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                rows={3}
              />
            </div>
            
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={rule.config.mustRunTogether}
                  onChange={(e) => handleRuleUpdate({
                    config: {
                      ...rule.config,
                      mustRunTogether: e.target.checked
                    }
                  })}
                  className="mr-2"
                />
                <span className="text-sm text-black">Must run together</span>
              </label>
              <p className="text-xs text-black mt-1">
                Uncheck to prevent tasks from running together
              </p>
            </div>
            
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={rule.config.samePhase || false}
                  onChange={(e) => handleRuleUpdate({
                    config: {
                      ...rule.config,
                      samePhase: e.target.checked
                    }
                  })}
                  className="mr-2"
                />
                <span className="text-sm text-black">Same phase requirement</span>
              </label>
            </div>
          </div>
        );

      case 'load-limit':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Worker Group
              </label>
              <select
                value={rule.config.workerGroup}
                onChange={(e) => handleRuleUpdate({
                  config: {
                    ...rule.config,
                    workerGroup: e.target.value
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
              >
                <option value="">Select a worker group</option>
                {getUniqueValues(workers.rows, 'WorkerGroup').filter(group => group != null).map(group => (
                  <option key={group} value={group}>{group}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Max Slots Per Phase
              </label>
              <input
                type="number"
                value={rule.config.maxSlotsPerPhase}
                onChange={(e) => handleRuleUpdate({
                  config: {
                    ...rule.config,
                    maxSlotsPerPhase: parseInt(e.target.value) || 0
                  }
                })}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Specific Phases (optional)
              </label>
              <input
                type="text"
                value={rule.config.phases?.join(', ') || ''}
                onChange={(e) => handleRuleUpdate({
                  config: {
                    ...rule.config,
                    phases: e.target.value ? e.target.value.split(',').map(p => p.trim()) : undefined
                  }
                })}
                placeholder="Phase1, Phase2"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
              />
            </div>
          </div>
        );

      case 'pattern-match':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Field Name
              </label>
              <input
                type="text"
                value={rule.config.field}
                onChange={(e) => handleRuleUpdate({
                  config: {
                    ...rule.config,
                    field: e.target.value
                  }
                })}
                placeholder="PriorityLevel"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Pattern (Regex)
              </label>
              <input
                type="text"
                value={rule.config.pattern}
                onChange={(e) => handleRuleUpdate({
                  config: {
                    ...rule.config,
                    pattern: e.target.value
                  }
                })}
                placeholder="^[89]$|^10$"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Action
              </label>
              <select
                value={rule.config.action}
                onChange={(e) => handleRuleUpdate({
                  config: {
                    ...rule.config,
                    action: e.target.value as 'allow' | 'deny' | 'flag'
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
              >
                <option value="allow">Allow</option>
                <option value="deny">Deny</option>
                <option value="flag">Flag</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Entity Type
              </label>
              <select
                value={rule.config.entityType}
                onChange={(e) => handleRuleUpdate({
                  config: {
                    ...rule.config,
                    entityType: e.target.value as 'clients' | 'workers' | 'tasks'
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
              >
                <option value="clients">Clients</option>
                <option value="workers">Workers</option>
                <option value="tasks">Tasks</option>
              </select>
            </div>
          </div>
        );

      default:
        return (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              Configuration editor for {rule.type} rules is not yet implemented.
            </p>
          </div>
        );
    }
  };

  if (!rule) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
        <div className="text-gray-400 text-4xl mb-2">📋</div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">No rule selected</h3>
        <p className="text-sm text-black">
          Select a rule from the list to edit its configuration
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Rule Editor</h3>
        <button
          onClick={() => setSelectedRule(null)}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>

      <div className="p-4 space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Rule Name
            </label>
            <input
              type="text"
              value={rule.name}
              onChange={(e) => handleRuleUpdate({ name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Description
            </label>
            <textarea
              value={rule.description}
              onChange={(e) => handleRuleUpdate({ description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Priority (0-100)
            </label>
            <input
              type="number"
              value={rule.priority}
              onChange={(e) => handleRuleUpdate({ priority: parseInt(e.target.value) || 0 })}
              min="0"
              max="100"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
            />
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={rule.enabled}
                onChange={(e) => handleRuleUpdate({ enabled: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm text-black">Rule enabled</span>
            </label>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-black mb-4">Configuration</h4>
          {renderConfigEditor()}
        </div>

        {(validation || dataValidation) && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-black">Validation</h4>
            
            {validation && validation.errors.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <h5 className="text-sm font-medium text-red-800 mb-1">Errors</h5>
                <ul className="text-sm text-red-700 space-y-1">
                  {validation.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {validation && validation.warnings.length > 0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <h5 className="text-sm font-medium text-yellow-800 mb-1">Warnings</h5>
                <ul className="text-sm text-yellow-700 space-y-1">
                  {validation.warnings.map((warning, index) => (
                    <li key={index}>• {warning}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {dataValidation && dataValidation.warnings.length > 0 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <h5 className="text-sm font-medium text-blue-800 mb-1">Data Context</h5>
                <ul className="text-sm text-blue-700 space-y-1">
                  {dataValidation.warnings.map((warning, index) => (
                    <li key={index}>• {warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="space-y-3">
          <h4 className="text-sm font-medium text-black">AI Assistance</h4>
          
          <div className="flex gap-2">
            <button
              onClick={handleGetAIExplanation}
              disabled={isLoadingAI}
              className="px-3 py-2 bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 disabled:opacity-50 text-sm"
            >
              {isLoadingAI ? 'Loading...' : 'Explain Rule'}
            </button>
            
            <button
              onClick={handleGetImprovements}
              disabled={isLoadingAI}
              className="px-3 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 disabled:opacity-50 text-sm"
            >
              {isLoadingAI ? 'Loading...' : 'Suggest Improvements'}
            </button>
          </div>
          
          {plainLanguageExplanation && (
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-md">
              <h5 className="text-sm font-medium text-purple-800 mb-1">Plain Language Explanation</h5>
              <p className="text-sm text-purple-700">{plainLanguageExplanation}</p>
            </div>
          )}
          
          {improvements.length > 0 && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <h5 className="text-sm font-medium text-green-800 mb-1">Improvement Suggestions</h5>
              <ul className="text-sm text-green-700 space-y-1">
                {improvements.map((improvement, index) => (
                  <li key={index}>• {improvement}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RuleEditor; 