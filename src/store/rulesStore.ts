import { create } from 'zustand';
import { Rule, PriorityWeight, DEFAULT_PRIORITY_WEIGHTS, RuleType, RULE_TEMPLATES, RuleRecommendation, RecommendationStatus } from '../types';
import { validateRule } from '@/utils/ruleValidation';
import { generateId } from '@/utils/helpers';
import { useDataStore } from '@/store/dataStore';
import { generateAIRuleRecommendations } from '../utils/aiRuleRecommendations';

interface RulesStore {
  rules: Rule[];
  priorityWeights: PriorityWeight[];
  selectedRuleId: string | null;
  isLoading: boolean;
  searchQuery: string;
  filterByType: RuleType | 'all';
  filterByEnabled: boolean | 'all';
  
  recommendations: RuleRecommendation[];
  isGeneratingRecommendations: boolean;
  lastRecommendationRun: string | null;
  
  addRule: (rule: Omit<Rule, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateRule: (id: string, updates: Partial<Rule>) => void;
  deleteRule: (id: string) => void;
  toggleRuleEnabled: (id: string) => void;
  duplicateRule: (id: string) => void;
  reorderRules: (startIndex: number, endIndex: number) => void;
  
  updatePriorityWeight: (id: string, weight: number) => void;
  togglePriorityWeightEnabled: (id: string) => void;
  resetPriorityWeights: () => void;
  addCustomPriorityWeight: (weight: Omit<PriorityWeight, 'id'>) => void;
  deletePriorityWeight: (id: string) => void;
  
  setSelectedRule: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
  setSearchQuery: (query: string) => void;
  setFilterByType: (type: RuleType | 'all') => void;
  setFilterByEnabled: (enabled: boolean | 'all') => void;
  
  enableAllRules: () => void;
  disableAllRules: () => void;
  deleteAllRules: () => void;
  importRules: (rules: Rule[], weights?: PriorityWeight[]) => void;
  
  getFilteredRules: () => Rule[];
  getRuleById: (id: string) => Rule | undefined;
  getRulesByType: (type: RuleType) => Rule[];
  getEnabledRules: () => Rule[];
  getTotalWeightSum: () => number;
  
  createRuleFromTemplate: (type: RuleType) => void;
  
  exportToJSON: () => string;
  importFromJSON: (jsonString: string) => void;
    
  setRecommendations: (recommendations: RuleRecommendation[]) => void;
  updateRecommendationStatus: (id: string, status: RecommendationStatus) => void;
  acceptRecommendation: (id: string) => void;
  acceptRecommendationWithTweaks: (id: string, tweakedRule: Partial<Rule>) => void;
  ignoreRecommendation: (id: string) => void;
  clearRecommendations: () => void;
  setGeneratingRecommendations: (loading: boolean) => void;
  getPendingRecommendations: () => RuleRecommendation[];
  getAcceptedRecommendations: () => RuleRecommendation[];
  getIgnoredRecommendations: () => RuleRecommendation[];
  
  generateRuleRecommendations: () => Promise<void>;
}

export const useRulesStore = create<RulesStore>((set, get) => ({
  rules: [],
  priorityWeights: [...DEFAULT_PRIORITY_WEIGHTS],
  selectedRuleId: null,
  isLoading: false,
  searchQuery: '',
  filterByType: 'all',
  filterByEnabled: 'all',

  recommendations: [],
  isGeneratingRecommendations: false,
  lastRecommendationRun: null,

  addRule: (ruleData) => {
    const newRule: Rule = {
      ...ruleData,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Rule;

    const validation = validateRule(newRule);
    if (!validation.isValid) {
      console.warn('Rule validation failed:', validation.errors);
    }

    set((state) => ({
      rules: [...state.rules, newRule].sort((a, b) => b.priority - a.priority),
    }));
  },

  updateRule: (id, updates) => set((state) => ({
    rules: state.rules.map((rule) =>
      rule.id === id
        ? { ...rule, ...updates, updatedAt: new Date().toISOString() } as Rule
        : rule
    ),
  })),

  deleteRule: (id) => set((state) => ({
    rules: state.rules.filter((rule) => rule.id !== id),
    selectedRuleId: state.selectedRuleId === id ? null : state.selectedRuleId,
  })),

  toggleRuleEnabled: (id) => set((state) => ({
    rules: state.rules.map((rule) =>
      rule.id === id
        ? { ...rule, enabled: !rule.enabled, updatedAt: new Date().toISOString() }
        : rule
    ),
  })),

  duplicateRule: (id) => {
    const { rules, addRule } = get();
    const originalRule = rules.find((rule) => rule.id === id);
    if (originalRule) {
      const { id, createdAt, updatedAt, ...ruleToDuplicate } = originalRule;
      addRule({
        ...ruleToDuplicate,
        name: `${originalRule.name} (Copy)`,
        source: 'manual',
      } as Omit<Rule, 'id' | 'createdAt' | 'updatedAt'>);
    }
  },

  reorderRules: (startIndex, endIndex) => set((state) => {
    const result = Array.from(state.rules);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    
    const updatedRules = result.map((rule, index) => ({
      ...rule,
      priority: result.length - index,
      updatedAt: new Date().toISOString(),
    }));

    return { rules: updatedRules };
  }),

  updatePriorityWeight: (id, weight) => set((state) => ({
    priorityWeights: state.priorityWeights.map((pw) =>
      pw.id === id ? { ...pw, weight: Math.max(0, Math.min(100, weight)) } : pw
    ),
  })),

  togglePriorityWeightEnabled: (id) => set((state) => ({
    priorityWeights: state.priorityWeights.map((pw) =>
      pw.id === id ? { ...pw, enabled: !pw.enabled } : pw
    ),
  })),

  resetPriorityWeights: () => set({
    priorityWeights: [...DEFAULT_PRIORITY_WEIGHTS],
  }),

  addCustomPriorityWeight: (weight) => set((state) => ({
    priorityWeights: [
      ...state.priorityWeights,
      { ...weight, id: generateId() },
    ],
  })),

  deletePriorityWeight: (id) => set((state) => ({
    priorityWeights: state.priorityWeights.filter((pw) => pw.id !== id),
  })),

  setSelectedRule: (id) => set({ selectedRuleId: id }),
  setLoading: (loading) => set({ isLoading: loading }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setFilterByType: (type) => set({ filterByType: type }),
  setFilterByEnabled: (enabled) => set({ filterByEnabled: enabled }),

  enableAllRules: () => set((state) => ({
    rules: state.rules.map((rule) => ({
      ...rule,
      enabled: true,
      updatedAt: new Date().toISOString(),
    })),
  })),

  disableAllRules: () => set((state) => ({
    rules: state.rules.map((rule) => ({
      ...rule,
      enabled: false,
      updatedAt: new Date().toISOString(),
    })),
  })),

  deleteAllRules: () => set({
    rules: [],
    selectedRuleId: null,
  }),

  importRules: (rules, weights) => set((state) => ({
    rules: [...state.rules, ...rules],
    priorityWeights: weights ? weights : state.priorityWeights,
  })),

  getFilteredRules: () => {
    const { rules, searchQuery, filterByType, filterByEnabled } = get();
    
    return rules.filter((rule) => {
      const matchesSearch = !searchQuery || 
        rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rule.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = filterByType === 'all' || rule.type === filterByType;
      
      const matchesEnabled = filterByEnabled === 'all' || rule.enabled === filterByEnabled;
      
      return matchesSearch && matchesType && matchesEnabled;
    });
  },

  getRuleById: (id) => {
    return get().rules.find((rule) => rule.id === id);
  },

  getRulesByType: (type) => {
    return get().rules.filter((rule) => rule.type === type);
  },

  getEnabledRules: () => {
    return get().rules.filter((rule) => rule.enabled);
  },

  getTotalWeightSum: () => {
    return get().priorityWeights
      .filter((pw) => pw.enabled)
      .reduce((sum, pw) => sum + pw.weight, 0);
  },

  createRuleFromTemplate: (type) => {
    const template = RULE_TEMPLATES[type];
    if (template) {
      get().addRule({
        ...template,
        priority: get().rules.length + 1,
        enabled: true,
        source: 'manual',
      } as Omit<Rule, 'id' | 'createdAt' | 'updatedAt'>);
    }
  },

  exportToJSON: () => {
    const { rules, priorityWeights } = get();
    const exportData = {
      rules,
      priorityWeights,
      metadata: {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        totalRules: rules.length,
        enabledRules: rules.filter(r => r.enabled).length,
      },
    };
    return JSON.stringify(exportData, null, 2);
  },

  importFromJSON: (jsonString) => {
    try {
      const data = JSON.parse(jsonString);
      if (data.rules && Array.isArray(data.rules)) {
        set((state) => ({
          rules: [...state.rules, ...data.rules],
          priorityWeights: data.priorityWeights || state.priorityWeights,
        }));
      }
    } catch (error) {
      console.error('Failed to import rules from JSON:', error);
      throw new Error('Invalid JSON format');
    }
  },

  setRecommendations: (recommendations) => set({ 
    recommendations,
    lastRecommendationRun: new Date().toISOString(),
  }),

  updateRecommendationStatus: (id, status) => set((state) => ({
    recommendations: state.recommendations.map((rec) =>
      rec.id === id ? { ...rec, status } : rec
    ),
  })),

  acceptRecommendation: (id) => {
    const { recommendations, addRule } = get();
    const recommendation = recommendations.find((rec) => rec.id === id);
    
    if (recommendation && recommendation.rule) {
      const fullRule = {
        ...recommendation.rule,
        name: recommendation.rule.name || `AI Rule ${Date.now()}`,
        description: recommendation.rule.description || recommendation.explanation,
        priority: recommendation.rule.priority || get().rules.length + 1,
        enabled: true,
        source: 'ai-generated' as const,
      } as Omit<Rule, 'id' | 'createdAt' | 'updatedAt'>;

      addRule(fullRule);
      
      get().updateRecommendationStatus(id, 'accepted');
    }
  },

  acceptRecommendationWithTweaks: (id, tweakedRule) => {
    const { recommendations, addRule } = get();
    const recommendation = recommendations.find((rec) => rec.id === id);
    
    if (recommendation) {
      const fullRule = {
        ...recommendation.rule,
        ...tweakedRule,
        name: tweakedRule.name || recommendation.rule.name || `AI Rule ${Date.now()}`,
        description: tweakedRule.description || recommendation.rule.description || recommendation.explanation,
        priority: tweakedRule.priority || recommendation.rule.priority || get().rules.length + 1,
        enabled: true,
        source: 'ai-generated' as const,
      } as Omit<Rule, 'id' | 'createdAt' | 'updatedAt'>;

      addRule(fullRule);
      
      get().updateRecommendationStatus(id, 'accepted');
    }
  },

  ignoreRecommendation: (id) => {
    get().updateRecommendationStatus(id, 'ignored');
  },

  clearRecommendations: () => set({ 
    recommendations: [],
    lastRecommendationRun: null,
  }),

  setGeneratingRecommendations: (loading) => set({ 
    isGeneratingRecommendations: loading 
  }),

  getPendingRecommendations: () => {
    return get().recommendations.filter((rec) => rec.status === 'pending');
  },

  getAcceptedRecommendations: () => {
    return get().recommendations.filter((rec) => rec.status === 'accepted');
  },

  getIgnoredRecommendations: () => {
    return get().recommendations.filter((rec) => rec.status === 'ignored');
  },

  generateRuleRecommendations: async () => {
    set({ isGeneratingRecommendations: true });
    
    try {
      const { clients, workers, tasks } = useDataStore.getState();
      
      // Generate rule recommendations would go here
      // const recommendations = await generateAIRuleRecommendations(...);

      set({ 
        isGeneratingRecommendations: false 
      });
    } catch (error) {
      console.error('Failed to generate rule recommendations:', error);
      set({ isGeneratingRecommendations: false });
    }
  },
})); 