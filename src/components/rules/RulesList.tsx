import React from 'react';
import { useRulesStore } from '../../store/rulesStore';
import { Rule, RuleType } from '../../types';
import { formatDate, humanizeString } from '../../utils/helpers';

const RulesList: React.FC = () => {
  const {
    getFilteredRules,
    selectedRuleId,
    setSelectedRule,
    toggleRuleEnabled,
    deleteRule,
    duplicateRule,
    searchQuery,
    setSearchQuery,
    filterByType,
    setFilterByType,
    filterByEnabled,
    setFilterByEnabled,
  } = useRulesStore();

  const filteredRules = getFilteredRules();

  const getRuleTypeColor = (type: RuleType): string => {
    const colors: Record<RuleType, string> = {
      'co-run': 'bg-blue-100 text-blue-800',
      'slot-restriction': 'bg-green-100 text-green-800',
      'load-limit': 'bg-yellow-100 text-yellow-800',
      'phase-window': 'bg-purple-100 text-purple-800',
      'pattern-match': 'bg-pink-100 text-pink-800',
      'precedence-override': 'bg-indigo-100 text-indigo-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getRuleTypeIcon = (type: RuleType): string => {
    const icons: Record<RuleType, string> = {
      'co-run': '🔗',
      'slot-restriction': '🚧',
      'load-limit': '📊',
      'phase-window': '⏰',
      'pattern-match': '🔍',
      'precedence-override': '⬆️',
    };
    return icons[type] || '📋';
  };

  const handleRuleClick = (rule: Rule) => {
    setSelectedRule(rule.id === selectedRuleId ? null : rule.id);
  };

  const handleToggleEnabled = (e: React.MouseEvent, ruleId: string) => {
    e.stopPropagation();
    toggleRuleEnabled(ruleId);
  };

  const handleDelete = (e: React.MouseEvent, ruleId: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this rule?')) {
      deleteRule(ruleId);
    }
  };

  const handleDuplicate = (e: React.MouseEvent, ruleId: string) => {
    e.stopPropagation();
    duplicateRule(ruleId);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-4 border-b">
        <div className="flex flex-col gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search rules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400">🔍</span>
            </div>
          </div>

          <div className="flex gap-4">
            <select
              value={filterByType}
              onChange={(e) => setFilterByType(e.target.value as RuleType | 'all')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
            >
              <option value="all">All Types</option>
              <option value="co-run">Co-run</option>
              <option value="slot-restriction">Slot Restriction</option>
              <option value="load-limit">Load Limit</option>
              <option value="phase-window">Phase Window</option>
              <option value="pattern-match">Pattern Match</option>
              <option value="precedence-override">Precedence Override</option>
            </select>

            <select
              value={filterByEnabled === 'all' ? 'all' : filterByEnabled.toString()}
              onChange={(e) => {
                const value = e.target.value;
                setFilterByEnabled(value === 'all' ? 'all' : value === 'true');
              }}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
            >
              <option value="all">All Rules</option>
              <option value="true">Enabled Only</option>
              <option value="false">Disabled Only</option>
            </select>
          </div>
        </div>
      </div>

      <div className="divide-y">
        {filteredRules.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-4xl mb-2">📋</div>
            <h3 className="text-lg font-medium mb-1">No rules found</h3>
            <p className="text-sm">
              {searchQuery || filterByType !== 'all' || filterByEnabled !== 'all'
                ? 'Try adjusting your filters or search query'
                : 'Create your first rule to get started'
              }
            </p>
          </div>
        ) : (
          filteredRules.map((rule) => (
            <div
              key={rule.id}
              onClick={() => handleRuleClick(rule)}
              className={`p-4 cursor-pointer transition-colors ${
                selectedRuleId === rule.id
                  ? 'bg-blue-50 border-l-4 border-l-blue-500'
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xl">{getRuleTypeIcon(rule.type)}</span>
                    <h3 className="font-medium text-gray-900 truncate">
                      {rule.name}
                    </h3>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getRuleTypeColor(
                        rule.type
                      )}`}
                    >
                      {humanizeString(rule.type)}
                    </span>
                    {!rule.enabled && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                        Disabled
                      </span>
                    )}
                    {rule.source === 'ai-generated' && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                        ✨ AI
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                    {rule.description}
                  </p>
                  
                  <div className="flex items-center text-xs text-gray-500 gap-4">
                    <span>Priority: {rule.priority}</span>
                    <span>Updated: {formatDate(rule.updatedAt)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={(e) => handleToggleEnabled(e, rule.id)}
                    className={`w-10 h-6 rounded-full transition-colors ${
                      rule.enabled ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                    title={rule.enabled ? 'Disable rule' : 'Enable rule'}
                  >
                    <div
                      className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        rule.enabled ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>

                  <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleDuplicate(e, rule.id)}
                      className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Duplicate rule"
                    >
                      📋
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, rule.id)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete rule"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {filteredRules.length > 0 && (
        <div className="p-4 border-t bg-gray-50 text-sm text-gray-600">
          Showing {filteredRules.length} of {useRulesStore.getState().rules.length} rules
          {searchQuery && ` matching "${searchQuery}"`}
        </div>
      )}
    </div>
  );
};

export default RulesList; 