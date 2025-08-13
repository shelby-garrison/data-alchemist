import React, { useState } from 'react';
import { useRulesStore } from '../store/rulesStore';
import RulesList from '@/components/rules/RulesList';
import RuleEditor from '@/components/rules/RuleEditor';
import PriorityWeights from '@/components/rules/PriorityWeights';
import NaturalLanguageRuleModal from '@/components/rules/NaturalLanguageRuleModal';
import RulesExportModal from '@/components/rules/RulesExportModal';
import { AIRecommendationsGenerator } from '@/components/rules/AIRecommendationsGenerator';
import { AIRecommendationsPanel } from '@/components/rules/AIRecommendationsPanel';

type RulesTabView = 'rules' | 'weights' | 'settings' | 'recommendations';

export const RulesTab: React.FC = () => {
  const [currentView, setCurrentView] = useState<RulesTabView>('rules');
  const [showNLModal, setShowNLModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  
  const { 
    rules, 
    selectedRuleId, 
    createRuleFromTemplate, 
    exportToJSON,
    getEnabledRules 
  } = useRulesStore();

  const handleQuickAdd = (type: string) => {
    createRuleFromTemplate(type as any);
  };

  const handleExport = () => {
    setShowExportModal(true);
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'rules':
        return (
          <div className="flex gap-6 h-full">
            <div className="flex-1">
              <RulesList />
            </div>
            {selectedRuleId && (
              <div className="w-96">
                <RuleEditor />
              </div>
            )}
          </div>
        );
      case 'weights':
        return <PriorityWeights />;
      case 'settings':
        return (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold mb-4 text-black">Rules Settings</h3>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2 text-black">Export/Import</h4>
                <p className="text-sm text-black mb-3">
                  Export your rules configuration or import from a previous backup.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleExport}
                    className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                  >
                    Export Rules
                  </button>
                  <button className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm text-black">
                    Import Rules
                  </button>
                </div>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2 text-black">Rule Statistics</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-black">Total Rules:</span>
                    <span className="ml-2 font-medium text-black">{rules.length}</span>
                  </div>
                  <div>
                    <span className="text-black">Enabled:</span>
                    <span className="ml-2 font-medium text-black">{getEnabledRules().length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'recommendations':
        return (
          <div className="space-y-6">
            <AIRecommendationsGenerator />
            <AIRecommendationsPanel />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Business Rules</h2>
            <p className="text-black mt-1">
              Configure rules and priority weights for intelligent task allocation
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowNLModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              ✨ AI Assistant
            </button>
            
            <div className="relative group">
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                + Add Rule
              </button>
              
              <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-lg border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                <div className="p-2">
                  <button
                    onClick={() => handleQuickAdd('co-run')}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 text-sm text-black"
                  >
                    Co-run Tasks
                  </button>
                  <button
                    onClick={() => handleQuickAdd('load-limit')}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 text-sm text-black"
                  >
                    Load Limit
                  </button>
                  <button
                    onClick={() => handleQuickAdd('phase-window')}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 text-sm text-black"
                  >
                    Phase Window
                  </button>
                  <button
                    onClick={() => handleQuickAdd('pattern-match')}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 text-sm text-black"
                  >
                    Pattern Match
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex gap-1 mt-4">
          <button
            onClick={() => setCurrentView('rules')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              currentView === 'rules'
                ? 'bg-blue-100 text-blue-700'
                : 'text-black hover:text-black hover:bg-gray-100'
            }`}
          >
            Rules ({rules.length})
          </button>
          <button
            onClick={() => setCurrentView('weights')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              currentView === 'weights'
                ? 'bg-blue-100 text-blue-700'
                : 'text-black hover:text-black hover:bg-gray-100'
            }`}
          >
            Priority Weights
          </button>
          <button
            onClick={() => setCurrentView('recommendations')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              currentView === 'recommendations'
                ? 'bg-blue-100 text-blue-700'
                : 'text-black hover:text-black hover:bg-gray-100'
            }`}
          >
            AI Recommendations
          </button>
          <button
            onClick={() => setCurrentView('settings')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              currentView === 'settings'
                ? 'bg-blue-100 text-blue-700'
                : 'text-black hover:text-black hover:bg-gray-100'
            }`}
          >
            Settings
          </button>
        </div>
      </div>

      <div className="flex-1 p-6 bg-gray-50">
        {renderCurrentView()}
      </div>

      {showNLModal && (
        <NaturalLanguageRuleModal
          isOpen={showNLModal}
          onClose={() => setShowNLModal(false)}
        />
      )}
      
      {showExportModal && (
        <RulesExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
}; 