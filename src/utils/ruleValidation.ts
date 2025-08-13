import { 
  Rule, 
  RuleValidationResult, 
  CoRunRule, 
  SlotRestrictionRule, 
  LoadLimitRule, 
  PhaseWindowRule, 
  PatternMatchRule, 
  PrecedenceOverrideRule 
} from '../types';
import { isValidRegex } from './helpers';


export const validateRule = (rule: Rule): RuleValidationResult => {
  const result: RuleValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    suggestions: [],
  };

  if (!rule.name?.trim()) {
    result.errors.push('Rule name is required');
  }

  if (!rule.description?.trim()) {
    result.warnings.push('Rule description is recommended for clarity');
  }

  if (rule.priority < 0 || rule.priority > 100) {
    result.errors.push('Rule priority must be between 0 and 100');
  }

  switch (rule.type) {
    case 'co-run':
      validateCoRunRule(rule as CoRunRule, result);
      break;
    case 'slot-restriction':
      validateSlotRestrictionRule(rule as SlotRestrictionRule, result);
      break;
    case 'load-limit':
      validateLoadLimitRule(rule as LoadLimitRule, result);
      break;
    case 'phase-window':
      validatePhaseWindowRule(rule as PhaseWindowRule, result);
      break;
    case 'pattern-match':
      validatePatternMatchRule(rule as PatternMatchRule, result);
      break;
    case 'precedence-override':
      validatePrecedenceOverrideRule(rule as PrecedenceOverrideRule, result);
      break;
    default:
      result.errors.push(`Unknown rule type: ${(rule as any).type}`);
  }

  result.isValid = result.errors.length === 0;
  return result;
};

const validateCoRunRule = (rule: CoRunRule, result: RuleValidationResult): void => {
  const { config } = rule;

  if (!config.taskIds || config.taskIds.length < 2) {
    result.errors.push('Co-run rules require at least 2 task IDs');
  }

  if (config.taskIds && config.taskIds.some(id => !id.trim())) {
    result.errors.push('All task IDs must be non-empty');
  }

  if (config.taskIds && new Set(config.taskIds).size !== config.taskIds.length) {
    result.errors.push('Task IDs must be unique');
  }

  if (config.taskIds && config.taskIds.length > 10) {
    result.warnings.push('Co-run rules with many tasks may impact performance');
  }
};

const validateSlotRestrictionRule = (rule: SlotRestrictionRule, result: RuleValidationResult): void => {
  const { config } = rule;

  if (!config.workerGroup && !config.clientGroup) {
    result.errors.push('Either worker group or client group must be specified');
  }

  if (config.minCommonSlots < 0) {
    result.errors.push('Minimum common slots must be non-negative');
  }

  if (config.maxCommonSlots !== undefined && config.maxCommonSlots < config.minCommonSlots) {
    result.errors.push('Maximum common slots must be greater than or equal to minimum');
  }

  if (config.phases && config.phases.length === 0) {
    result.warnings.push('Empty phases array will have no effect');
  }

  if (config.minCommonSlots > 24) {
    result.warnings.push('Very high slot requirements may be difficult to satisfy');
  }
};

const validateLoadLimitRule = (rule: LoadLimitRule, result: RuleValidationResult): void => {
  const { config } = rule;

  if (!config.workerGroup?.trim()) {
    result.errors.push('Worker group is required for load limit rules');
  }

  if (config.maxSlotsPerPhase <= 0) {
    result.errors.push('Maximum slots per phase must be positive');
  }

  if (config.maxSlotsPerPhase > 100) {
    result.warnings.push('Very high slot limits may not be practical');
  }

  if (config.phases && config.phases.length === 0) {
    result.warnings.push('Empty phases array will apply to all phases');
  }
};

const validatePhaseWindowRule = (rule: PhaseWindowRule, result: RuleValidationResult): void => {
  const { config } = rule;

  if (!config.taskId?.trim()) {
    result.errors.push('Task ID is required for phase window rules');
  }

  if (!config.allowedPhases || config.allowedPhases.length === 0) {
    result.errors.push('At least one allowed phase must be specified');
  }

  if (config.restrictedPhases && config.allowedPhases) {
    const overlap = config.allowedPhases.some(phase => 
      config.restrictedPhases?.includes(phase)
    );
    if (overlap) {
      result.errors.push('Allowed and restricted phases cannot overlap');
    }
  }

  if (config.timeWindow) {
    const start = new Date(config.timeWindow.start);
    const end = new Date(config.timeWindow.end);
    
    if (isNaN(start.getTime())) {
      result.errors.push('Invalid start time format');
    }
    
    if (isNaN(end.getTime())) {
      result.errors.push('Invalid end time format');
    }
    
    if (start >= end) {
      result.errors.push('Start time must be before end time');
    }
  }
};

const validatePatternMatchRule = (rule: PatternMatchRule, result: RuleValidationResult): void => {
  const { config } = rule;

  if (!config.field?.trim()) {
    result.errors.push('Field name is required for pattern match rules');
  }

  if (!config.pattern?.trim()) {
    result.errors.push('Pattern is required for pattern match rules');
  } else if (!isValidRegex(config.pattern)) {
    result.errors.push('Invalid regular expression pattern');
  }

  if (!['allow', 'deny', 'flag'].includes(config.action)) {
    result.errors.push('Action must be one of: allow, deny, flag');
  }

  if (!['clients', 'workers', 'tasks'].includes(config.entityType)) {
    result.errors.push('Entity type must be one of: clients, workers, tasks');
  }

  if (config.pattern && config.pattern.length > 200) {
    result.warnings.push('Complex regex patterns may impact performance');
  }

  if (config.action === 'flag' && !config.message) {
    result.suggestions?.push('Consider adding a message for flag actions to improve clarity');
  }
};

const validatePrecedenceOverrideRule = (rule: PrecedenceOverrideRule, result: RuleValidationResult): void => {
  const { config } = rule;

  if (!config.higherPriorityItems || config.higherPriorityItems.length === 0) {
    if (!config.lowerPriorityItems || config.lowerPriorityItems.length === 0) {
      result.errors.push('Either higher or lower priority items must be specified');
    }
  }

  if (config.higherPriorityItems && config.lowerPriorityItems) {
    const overlap = config.higherPriorityItems.some(item =>
      config.lowerPriorityItems?.includes(item)
    );
    if (overlap) {
      result.errors.push('Items cannot be in both higher and lower priority lists');
    }
  }

  if (!['clients', 'workers', 'tasks'].includes(config.entityType)) {
    result.errors.push('Entity type must be one of: clients, workers, tasks');
  }

  const allItems = [
    ...(config.higherPriorityItems || []),
    ...(config.lowerPriorityItems || [])
  ];
  
  if (allItems.some(item => !item.trim())) {
    result.errors.push('All item IDs must be non-empty');
  }

  if (config.higherPriorityItems) {
    const uniqueHigher = new Set(config.higherPriorityItems);
    if (uniqueHigher.size !== config.higherPriorityItems.length) {
      result.errors.push('Higher priority items must be unique');
    }
  }

  if (config.lowerPriorityItems) {
    const uniqueLower = new Set(config.lowerPriorityItems);
    if (uniqueLower.size !== config.lowerPriorityItems.length) {
      result.errors.push('Lower priority items must be unique');
    }
  }
};

export const validateRuleConflicts = (rules: Rule[]): RuleValidationResult => {
  const result: RuleValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    suggestions: [],
  };

  const nameMap = new Map<string, number>();
  rules.forEach((rule, index) => {
    const name = rule.name.toLowerCase().trim();
    if (nameMap.has(name)) {
      result.warnings.push(`Duplicate rule name: "${rule.name}" (rules ${nameMap.get(name)! + 1} and ${index + 1})`);
    } else {
      nameMap.set(name, index);
    }
  });

  const coRunRules = rules.filter(r => r.type === 'co-run') as CoRunRule[];
  for (let i = 0; i < coRunRules.length; i++) {
    for (let j = i + 1; j < coRunRules.length; j++) {
      const rule1 = coRunRules[i];
      const rule2 = coRunRules[j];
      
      const commonTasks = rule1.config.taskIds.filter(id => 
        rule2.config.taskIds.includes(id)
      );
      
      if (commonTasks.length > 0 && rule1.config.mustRunTogether !== rule2.config.mustRunTogether) {
        result.errors.push(
          `Conflicting co-run rules for tasks: ${commonTasks.join(', ')} ` +
          `(rules "${rule1.name}" and "${rule2.name}")`
        );
      }
    }
  }

  const loadLimitRules = rules.filter(r => r.type === 'load-limit') as LoadLimitRule[];
  const workerGroupLimits = new Map<string, LoadLimitRule[]>();
  
  loadLimitRules.forEach(rule => {
    const group = rule.config.workerGroup;
    if (!workerGroupLimits.has(group)) {
      workerGroupLimits.set(group, []);
    }
    workerGroupLimits.get(group)!.push(rule);
  });

  workerGroupLimits.forEach((rules, group) => {
    if (rules.length > 1) {
      result.warnings.push(
        `Multiple load limit rules for worker group "${group}": ${rules.map(r => r.name).join(', ')}`
      );
    }
  });

  result.isValid = result.errors.length === 0;
  return result;
};

export const validateRuleAgainstData = (
  rule: Rule,
  dataContext: {
    availableTaskIds: string[];
    availableWorkerGroups: string[];
    availableClientGroups: string[];
  }
): RuleValidationResult => {
  const result: RuleValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    suggestions: [],
  };

  switch (rule.type) {
    case 'co-run':
      const coRunRule = rule as CoRunRule;
      const invalidTaskIds = coRunRule.config.taskIds.filter(
        id => !dataContext.availableTaskIds.includes(id)
      );
      if (invalidTaskIds.length > 0) {
        result.warnings.push(`Task IDs not found in data: ${invalidTaskIds.join(', ')}`);
      }
      break;

    case 'load-limit':
      const loadLimitRule = rule as LoadLimitRule;
      if (!dataContext.availableWorkerGroups.includes(loadLimitRule.config.workerGroup)) {
        result.warnings.push(`Worker group not found in data: ${loadLimitRule.config.workerGroup}`);
      }
      break;

    case 'slot-restriction':
      const slotRule = rule as SlotRestrictionRule;
      if (slotRule.config.workerGroup && 
          !dataContext.availableWorkerGroups.includes(slotRule.config.workerGroup)) {
        result.warnings.push(`Worker group not found in data: ${slotRule.config.workerGroup}`);
      }
      if (slotRule.config.clientGroup && 
          !dataContext.availableClientGroups.includes(slotRule.config.clientGroup)) {
        result.warnings.push(`Client group not found in data: ${slotRule.config.clientGroup}`);
      }
      break;

    case 'phase-window':
      const phaseRule = rule as PhaseWindowRule;
      if (!dataContext.availableTaskIds.includes(phaseRule.config.taskId)) {
        result.warnings.push(`Task ID not found in data: ${phaseRule.config.taskId}`);
      }
      break;

    case 'precedence-override':
      const precedenceRule = rule as PrecedenceOverrideRule;
      const entityIds = precedenceRule.config.entityType === 'clients' 
        ? dataContext.availableClientGroups 
        : precedenceRule.config.entityType === 'workers'
        ? dataContext.availableWorkerGroups
        : dataContext.availableTaskIds;

      const invalidHigher = (precedenceRule.config.higherPriorityItems || [])
        .filter(id => !entityIds.includes(id));
      const invalidLower = (precedenceRule.config.lowerPriorityItems || [])
        .filter(id => !entityIds.includes(id));

      if (invalidHigher.length > 0) {
        result.warnings.push(`Higher priority items not found: ${invalidHigher.join(', ')}`);
      }
      if (invalidLower.length > 0) {
        result.warnings.push(`Lower priority items not found: ${invalidLower.join(', ')}`);
      }
      break;
  }

  return result;
}; 