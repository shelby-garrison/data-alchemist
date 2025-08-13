import React, { useState } from 'react';
import { useRulesStore } from '../../store/rulesStore';
import { PriorityWeight } from '../../types';
import { clamp } from '../../utils/helpers';

const PriorityWeights: React.FC = () => {
  const {
    priorityWeights,
    updatePriorityWeight,
    togglePriorityWeightEnabled,
    resetPriorityWeights,
    addCustomPriorityWeight,
    deletePriorityWeight,
    getTotalWeightSum,
  } = useRulesStore();

  const [showAddCustom, setShowAddCustom] = useState(false);
  const [newWeight, setNewWeight] = useState<Omit<PriorityWeight, 'id'>>({
    name: '',
    description: '',
    weight: 50,
    category: 'system',
    enabled: true,
  });

  const totalWeight = getTotalWeightSum();
  const enabledWeights = priorityWeights.filter(w => w.enabled);

  const getCategoryColor = (category: PriorityWeight['category']): string => {
    const colors = {
      client: 'bg-blue-500',
      worker: 'bg-green-500',
      task: 'bg-yellow-500',
      system: 'bg-purple-500',
    };
    return colors[category];
  };

  const getCategoryIcon = (category: PriorityWeight['category']): string => {
    const icons = {
      client: '👥',
      worker: '👷',
      task: '📋',
      system: '⚙️',
    };
    return icons[category];
  };

  const handleSliderChange = (id: string, value: number) => {
    updatePriorityWeight(id, clamp(value, 0, 100));
  };

  const handleAddCustomWeight = () => {
    if (newWeight.name.trim()) {
      addCustomPriorityWeight(newWeight);
      setNewWeight({
        name: '',
        description: '',
        weight: 50,
        category: 'system',
        enabled: true,
      });
      setShowAddCustom(false);
    }
  };

  const handleBalanceWeights = () => {
    const enabled = priorityWeights.filter(w => w.enabled);
    if (enabled.length > 0) {
      const equalWeight = Math.floor(100 / enabled.length);
      enabled.forEach(weight => {
        updatePriorityWeight(weight.id, equalWeight);
      });
    }
  };

  const getWeightDescription = (weight: number): string => {
    if (weight >= 80) return 'Very High Priority';
    if (weight >= 60) return 'High Priority';
    if (weight >= 40) return 'Medium Priority';
    if (weight >= 20) return 'Low Priority';
    return 'Very Low Priority';
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Priority Weights</h3>
            <p className="text-sm text-gray-600 mt-1">
              Configure the relative importance of different factors in task allocation
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-600">
              Total Weight: <span className="font-medium">{totalWeight}</span>
            </div>
            
            <button
              onClick={handleBalanceWeights}
              className="px-3 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 text-sm"
            >
              Balance Weights
            </button>
            
            <button
              onClick={() => setShowAddCustom(true)}
              className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
            >
              Add Custom
            </button>
            
            <button
              onClick={resetPriorityWeights}
              className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
            >
              Reset to Default
            </button>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-gray-700">Weight Distribution</span>
            <span className="text-xs text-gray-500">({enabledWeights.length} active)</span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            {enabledWeights.length > 0 ? (
              enabledWeights.map((weight, index) => (
                <div
                  key={weight.id}
                  className={`h-full float-left ${getCategoryColor(weight.category)}`}
                  style={{ width: `${(weight.weight / totalWeight) * 100}%` }}
                  title={`${weight.name}: ${weight.weight} (${((weight.weight / totalWeight) * 100).toFixed(1)}%)`}
                />
              ))
            ) : (
              <div className="h-full bg-gray-300 w-full flex items-center justify-center">
                <span className="text-xs text-gray-500">No active weights</span>
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap gap-4 mt-3">
            {['client', 'worker', 'task', 'system'].map(category => {
              const categoryWeights = enabledWeights.filter(w => w.category === category);
              const categoryTotal = categoryWeights.reduce((sum, w) => sum + w.weight, 0);
              
              return (
                <div key={category} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded ${getCategoryColor(category as PriorityWeight['category'])}`} />
                  <span className="text-xs text-gray-600 capitalize">
                    {category} ({categoryTotal})
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {priorityWeights.map((weight) => (
          <div
            key={weight.id}
            className={`bg-white rounded-lg shadow-sm border p-6 transition-opacity ${
              weight.enabled ? 'opacity-100' : 'opacity-60'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{getCategoryIcon(weight.category)}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900">{weight.name}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      weight.category === 'client' ? 'bg-blue-100 text-blue-800' :
                      weight.category === 'worker' ? 'bg-green-100 text-green-800' :
                      weight.category === 'task' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {weight.category}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{weight.description}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => togglePriorityWeightEnabled(weight.id)}
                  className={`w-10 h-6 rounded-full transition-colors ${
                    weight.enabled ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                  title={weight.enabled ? 'Disable weight' : 'Enable weight'}
                >
                  <div
                    className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      weight.enabled ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
                
                {!weight.id.startsWith('client-') && !weight.id.startsWith('worker-') && 
                 !weight.id.startsWith('task-') && !weight.id.startsWith('load-') && 
                 !weight.id.startsWith('skill-') && (
                  <button
                    onClick={() => deletePriorityWeight(weight.id)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete custom weight"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>

            {weight.enabled && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Weight: {weight.weight}</span>
                  <span className="font-medium text-gray-800">
                    {getWeightDescription(weight.weight)}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={weight.weight}
                    onChange={(e) => handleSliderChange(weight.id, parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    style={{
                      background: `linear-gradient(to right, ${getCategoryColor(weight.category)} 0%, ${getCategoryColor(weight.category)} ${weight.weight}%, #e5e7eb ${weight.weight}%, #e5e7eb 100%)`
                    }}
                  />
                  
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>0</span>
                    <span>25</span>
                    <span>50</span>
                    <span>75</span>
                    <span>100</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>
                    Impact: {totalWeight > 0 ? ((weight.weight / totalWeight) * 100).toFixed(1) : 0}% of total
                  </span>
                  <div className="flex gap-4">
                    <button
                      onClick={() => handleSliderChange(weight.id, Math.max(0, weight.weight - 10))}
                      className="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
                    >
                      -10
                    </button>
                    <button
                      onClick={() => handleSliderChange(weight.id, Math.min(100, weight.weight + 10))}
                      className="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
                    >
                      +10
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {showAddCustom && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add Custom Priority Weight</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={newWeight.name}
                  onChange={(e) => setNewWeight({ ...newWeight, name: e.target.value })}
                  placeholder="e.g., Geographic Preference"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newWeight.description}
                  onChange={(e) => setNewWeight({ ...newWeight, description: e.target.value })}
                  placeholder="Describe what this weight controls..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={newWeight.category}
                  onChange={(e) => setNewWeight({ ...newWeight, category: e.target.value as PriorityWeight['category'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="client">Client</option>
                  <option value="worker">Worker</option>
                  <option value="task">Task</option>
                  <option value="system">System</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Initial Weight: {newWeight.weight}
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={newWeight.weight}
                  onChange={(e) => setNewWeight({ ...newWeight, weight: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddCustomWeight}
                disabled={!newWeight.name.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Weight
              </button>
              <button
                onClick={() => setShowAddCustom(false)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PriorityWeights; 