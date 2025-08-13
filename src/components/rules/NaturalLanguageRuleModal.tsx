import React, { useState, useRef, useEffect } from 'react';
import { useRulesStore } from '../../store/rulesStore';
import { useDataStore } from '../../store/dataStore';
import { convertNaturalLanguageToRule } from '../../utils/aiRulesService';
import { NLRuleResponse, Rule } from '../../types';
import { getUniqueValues } from '../../utils/helpers';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface ConversationMessage {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  suggestion?: Partial<Rule>;
  alternatives?: Partial<Rule>[];
  confidence?: number;
}

const NaturalLanguageRuleModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { addRule } = useRulesStore();
  const { clients, workers, tasks } = useDataStore();
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversation, setConversation] = useState<ConversationMessage[]>([
    {
      id: 'welcome',
      type: 'system',
      content: 'Hi! I\'m your AI rule assistant. Describe the business rule you\'d like to create in plain English, and I\'ll convert it into a structured rule for you.',
      timestamp: new Date(),
    }
  ]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<Partial<Rule> | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  const getDataContext = () => ({
    availableTaskIds: getUniqueValues(tasks.rows, 'TaskID').filter(v => v != null).map(String),
    availableWorkerGroups: getUniqueValues(workers.rows, 'WorkerGroup').filter(v => v != null).map(String),
    availableClientGroups: getUniqueValues(clients.rows, 'GroupTag').filter(v => v != null).map(String),
    availablePhases: ['Phase1', 'Phase2', 'Phase3', 'Phase4'], 
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ConversationMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setConversation(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await convertNaturalLanguageToRule({
        naturalLanguageInput: input.trim(),
        context: getDataContext(),
      });

      const aiMessage: ConversationMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: response.explanation,
        timestamp: new Date(),
        suggestion: response.suggestedRule,
        alternatives: response.alternatives,
        confidence: response.confidence,
      };

      setConversation(prev => [...prev, aiMessage]);
      
      if (response.confidence > 0.8 && response.suggestedRule) {
        setSelectedSuggestion(response.suggestedRule);
      }
    } catch (error) {
      const errorMessage: ConversationMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: 'I apologize, but I encountered an error processing your request. Could you try rephrasing your rule description?',
        timestamp: new Date(),
      };
      setConversation(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRule = (ruleData: Partial<Rule>) => {
    if (!ruleData.name || !ruleData.type || !ruleData.config) return;

    const fullRule = {
      ...ruleData,
      id: '',
      createdAt: '',
      updatedAt: '',
      enabled: true,
      priority: ruleData.priority || 50,
      source: 'ai-generated' as const,
    };

    addRule(fullRule as Omit<Rule, 'id' | 'createdAt' | 'updatedAt'>);
    
    const confirmMessage: ConversationMessage = {
      id: Date.now().toString(),
      type: 'system',
      content: `Rule "${ruleData.name}" has been added successfully! You can now close this dialog and edit the rule if needed.`,
      timestamp: new Date(),
    };
    
    setConversation(prev => [...prev, confirmMessage]);
    setSelectedSuggestion(null);
  };

  const renderRulePreview = (rule: Partial<Rule>, index?: number) => {
    const isSelected = selectedSuggestion === rule;
    const prefix = index !== undefined ? `Alternative ${index + 1}` : 'Suggested Rule';
    
    return (
      <div
        key={`${rule.name}-${index || 'main'}`}
        className={`border rounded-lg p-4 cursor-pointer transition-colors ${
          isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
        onClick={() => setSelectedSuggestion(rule)}
      >
        <div className="flex items-start justify-between mb-2">
          <div>
            <span className="text-xs text-gray-500 font-medium">{prefix}</span>
            <h4 className="font-medium text-gray-900">{rule.name}</h4>
          </div>
          {isSelected && (
            <span className="text-blue-600 text-sm">✓ Selected</span>
          )}
        </div>
        
        <p className="text-sm text-gray-600 mb-3">{rule.description}</p>
        
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="px-2 py-1 bg-gray-100 rounded">
            {rule.type?.replace('-', ' ')}
          </span>
          <span>Priority: {rule.priority}</span>
        </div>
        
        {rule.config && (
          <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
            <strong>Config:</strong> {JSON.stringify(rule.config, null, 1).slice(0, 100)}...
          </div>
        )}
      </div>
    );
  };

  const renderMessage = (message: ConversationMessage) => {
    const isUser = message.type === 'user';
    const isSystem = message.type === 'system';
    
    return (
      <div
        key={message.id}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div
          className={`max-w-3xl px-4 py-3 rounded-lg ${
            isUser
              ? 'bg-blue-600 text-white'
              : isSystem
              ? 'bg-green-100 text-green-800 border border-green-200'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          <div className="flex items-start gap-2">
            {!isUser && (
              <span className="text-lg">
                {isSystem ? '🤖' : '✨'}
              </span>
            )}
            <div className="flex-1">
              <p className="text-sm">{message.content}</p>
              
              {message.confidence !== undefined && (
                <div className="mt-2 text-xs opacity-75">
                  Confidence: {(message.confidence * 100).toFixed(0)}%
                </div>
              )}
            </div>
          </div>
          
          {message.suggestion && (
            <div className="mt-4 space-y-3">
              {renderRulePreview(message.suggestion)}
              
              {message.alternatives && message.alternatives.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium opacity-75">Alternatives:</p>
                  {message.alternatives.map((alt, index) => renderRulePreview(alt, index))}
                </div>
              )}
              
              {selectedSuggestion && (
                <button
                  onClick={() => handleAddRule(selectedSuggestion)}
                  className="mt-3 px-4 py-2 bg-white text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 text-sm font-medium"
                >
                  Add This Rule
                </button>
              )}
            </div>
          )}
          
          <div className="text-xs opacity-50 mt-2">
            <ClientOnlyTimestamp timestamp={message.timestamp} />
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[600px] flex flex-col">
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              ✨ AI Rule Assistant
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Describe your business rule in plain English
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-3 bg-blue-50 border-b">
          <div className="flex items-center gap-4 text-sm text-blue-800">
            <span>📊 Available Data:</span>
            <span>{tasks.rows.length} tasks</span>
            <span>{workers.rows.length} workers</span>
            <span>{clients.rows.length} clients</span>
            <span>{getUniqueValues(workers.rows, 'WorkerGroup').length} worker groups</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {conversation.map(renderMessage)}
          
          {isLoading && (
            <div className="flex justify-start mb-4">
              <div className="bg-gray-100 px-4 py-3 rounded-lg max-w-xs">
                <div className="flex items-center gap-2 text-gray-600">
                  <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                  <span className="text-sm">Analyzing your rule...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        <div className="p-6 border-t">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g., 'Tasks T1 and T2 should never run at the same time' or 'High priority clients should be processed first'"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isLoading ? 'Processing...' : 'Send'}
            </button>
          </form>
          
          <div className="mt-3 text-xs text-gray-500">
            💡 Try examples: &quot;Marketing team maximum 5 slots&quot;, &quot;Task T1 only in phases 1-3&quot;, &quot;Pattern match client names starting with CORP&quot;
          </div>
        </div>
      </div>
    </div>
  );
};

// Client-only component to avoid hydration mismatch with timestamp display
const ClientOnlyTimestamp: React.FC<{ timestamp: Date }> = ({ timestamp }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <span>Loading...</span>;
  }

  return <span>{timestamp.toLocaleTimeString()}</span>;
};

export default NaturalLanguageRuleModal; 