export interface DataRow {
  [key: string]: string | number | null;
}

export interface ValidationError {
  rowIndex: number;
  column: string;
  error: string;
  severity: 'error' | 'warning';
}

export interface EntityData {
  headers: string[];
  rows: DataRow[];
  validationErrors: ValidationError[];
  fileName?: string;
  originalHeaders?: string[]; 
  headerMapping?: Record<string, string>; 
}

export interface DataStore {
  clients: EntityData;
  workers: EntityData;
  tasks: EntityData;
  activeTab: 'upload' | 'rules' | 'ai-enhancement' | 'export';
  isLoading: boolean;
}

export type EntityType = 'clients' | 'workers' | 'tasks';

export interface BusinessRule {
  id: string;
  name: string;
  description: string;
  type: 'validation' | 'transformation' | 'relationship';
  enabled: boolean;
  priority: number;
  config: Record<string, any>;
}


export interface ClientSchema {
  ClientID: string;
  ClientName: string;
  PriorityLevel: number;
  RequestedTaskIDs: string;
  GroupTag: string;
  AttributesJSON: string;
}

export interface WorkerSchema {
  WorkerID: string;
  WorkerName: string;
  Skills: string;
  AvailableSlots: string;
  MaxLoadPerPhase: number;
  WorkerGroup: string;
  QualificationLevel: string | number;
}

export interface TaskSchema {
  TaskID: string;
  TaskName: string;
  Category: string;
  Duration: number;
  RequiredSkills: string;
  PreferredPhases: string;
  MaxConcurrent: number;
}

export interface HeaderMappingRequest {
  originalHeaders: string[];
  entityType: EntityType;
  expectedSchema: string[];
}

export interface HeaderMappingResponse {
  mappings: Record<string, string>;
  confidence: number;
  unmappedHeaders: string[];
  suggestions: string[];
}

export const ENTITY_SCHEMAS: Record<EntityType, string[]> = {
  clients: [
    'ClientID',
    'ClientName', 
    'PriorityLevel',
    'RequestedTaskIDs',
    'GroupTag',
    'AttributesJSON'
  ],
  workers: [
    'WorkerID',
    'WorkerName',
    'Skills',
    'AvailableSlots',
    'MaxLoadPerPhase',
    'WorkerGroup',
    'QualificationLevel'
  ],
  tasks: [
    'TaskID',
    'TaskName',
    'Category',
    'Duration',
    'RequiredSkills',
    'PreferredPhases',
    'MaxConcurrent'
  ]
}; 


export type RuleType = 
  | 'co-run' 
  | 'slot-restriction' 
  | 'load-limit' 
  | 'phase-window' 
  | 'pattern-match' 
  | 'precedence-override';

export interface BaseRule {
  id: string;
  name: string;
  description: string;
  type: RuleType;
  enabled: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
  source: 'manual' | 'ai-generated';
}

export interface CoRunRule extends BaseRule {
  type: 'co-run';
  config: {
    taskIds: string[];
    mustRunTogether: boolean; 
    samePhase?: boolean;
  };
}

export interface SlotRestrictionRule extends BaseRule {
  type: 'slot-restriction';
  config: {
    workerGroup?: string;
    clientGroup?: string;
    minCommonSlots: number;
    maxCommonSlots?: number;
    phases?: string[];
  };
}

export interface LoadLimitRule extends BaseRule {
  type: 'load-limit';
  config: {
    workerGroup: string;
    maxSlotsPerPhase: number;
    phases?: string[];
    overrideIndividualLimits?: boolean;
  };
}

export interface PhaseWindowRule extends BaseRule {
  type: 'phase-window';
  config: {
    taskId: string;
    allowedPhases: string[];
    restrictedPhases?: string[];
    timeWindow?: {
      start: string;
      end: string;
    };
  };
}

export interface PatternMatchRule extends BaseRule {
  type: 'pattern-match';
  config: {
    field: string; 
    pattern: string; 
    action: 'allow' | 'deny' | 'flag';
    entityType: EntityType;
    message?: string;
  };
}

export interface PrecedenceOverrideRule extends BaseRule {
  type: 'precedence-override';
  config: {
    higherPriorityItems: string[]; 
    lowerPriorityItems: string[]; 
    entityType: EntityType;
    reason?: string;
  };
}

export type Rule = CoRunRule | SlotRestrictionRule | LoadLimitRule | PhaseWindowRule | PatternMatchRule | PrecedenceOverrideRule;

export interface PriorityWeight {
  id: string;
  name: string;
  description: string;
  weight: number; 
  category: 'client' | 'worker' | 'task' | 'system';
  enabled: boolean;
}

export interface RuleValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions?: string[];
}

export interface NLRuleRequest {
  naturalLanguageInput: string;
  context?: {
    availableTaskIds: string[];
    availableWorkerGroups: string[];
    availableClientGroups: string[];
    availablePhases: string[];
  };
}

export interface NLRuleResponse {
  suggestedRule: Partial<Rule>;
  confidence: number;
  explanation: string;
  alternatives?: Partial<Rule>[];
  requiresConfirmation: boolean;
}

export interface RulesExport {
  rules: Rule[];
  priorityWeights: PriorityWeight[];
  metadata: {
    exportedAt: string;
    version: string;
    dataContext: {
      clientCount: number;
      workerCount: number;
      taskCount: number;
    };
  };
}



export type RecommendationStatus = 'pending' | 'accepted' | 'ignored' | 'tweaking';

export interface RuleRecommendation {
  id: string;
  explanation: string;
  rule: Partial<Rule>;
  confidence: number;
  status: RecommendationStatus;
  createdAt: string;
  reasoning: string;
  dataPatterns: string[];
  priority: number;
}

export interface RecommendationAnalysisContext {
  clients: DataRow[];
  workers: DataRow[];
  tasks: DataRow[];
  existingRules: Rule[];
  priorityWeights: PriorityWeight[];
}

export interface AIRecommendationRequest {
  context: RecommendationAnalysisContext;
  maxRecommendations?: number;
  focusAreas?: ('efficiency' | 'load-balancing' | 'constraints' | 'patterns')[];
}

export interface AIRecommendationResponse {
  recommendations: RuleRecommendation[];
  analysisMetadata: {
    totalPatternsFound: number;
    confidenceScore: number;
    processingTime: number;
    suggestions: string[];
  };
}


export const DEFAULT_PRIORITY_WEIGHTS: PriorityWeight[] = [
  {
    id: 'client-priority-level',
    name: 'Client Priority Level',
    description: 'Weight given to client-specified priority levels',
    weight: 80,
    category: 'client',
    enabled: true,
  },
  {
    id: 'worker-qualification',
    name: 'Worker Qualification Match',
    description: 'Weight given to how well worker qualifications match task requirements',
    weight: 70,
    category: 'worker',
    enabled: true,
  },
  {
    id: 'task-duration',
    name: 'Task Duration Optimization',
    description: 'Weight given to optimizing for shorter task completion times',
    weight: 60,
    category: 'task',
    enabled: true,
  },
  {
    id: 'load-balancing',
    name: 'Load Balancing',
    description: 'Weight given to distributing work evenly across workers',
    weight: 50,
    category: 'system',
    enabled: true,
  },
  {
    id: 'skill-matching',
    name: 'Skill Matching',
    description: 'Weight given to matching required skills exactly',
    weight: 75,
    category: 'worker',
    enabled: true,
  },
];


export const RULE_TEMPLATES: Record<RuleType, Partial<Rule>> = {
  'co-run': {
    name: 'Co-run Tasks',
    description: 'Specify tasks that must or must not run together',
    type: 'co-run',
    config: {
      taskIds: [],
      mustRunTogether: true,
    },
  },
  'slot-restriction': {
    name: 'Slot Restriction',
    description: 'Limit available slots for specific worker or client groups',
    type: 'slot-restriction',
    config: {
      minCommonSlots: 1,
    },
  },
  'load-limit': {
    name: 'Load Limit',
    description: 'Set maximum workload limits for worker groups',
    type: 'load-limit',
    config: {
      workerGroup: '',
      maxSlotsPerPhase: 5,
    },
  },
  'phase-window': {
    name: 'Phase Window',
    description: 'Restrict tasks to specific phases or time windows',
    type: 'phase-window',
    config: {
      taskId: '',
      allowedPhases: [],
    },
  },
  'pattern-match': {
    name: 'Pattern Match',
    description: 'Apply regex-based rules to filter or validate data',
    type: 'pattern-match',
    config: {
      field: '',
      pattern: '',
      action: 'allow',
      entityType: 'clients',
    },
  },
  'precedence-override': {
    name: 'Precedence Override',
    description: 'Override default priority ordering for specific items',
    type: 'precedence-override',
    config: {
      higherPriorityItems: [],
      lowerPriorityItems: [],
      entityType: 'clients',
    },
  },
}; 


export interface DataModificationCommand {
  id: string;
  command: string;
  entityType: EntityType;
  confidence: number;
  suggestedChanges: DataModification[];
  reasoning: string;
  createdAt: string;
  status: 'pending' | 'applied' | 'rejected';
}

export interface DataModification {
  rowIndex: number;
  column: string;
  currentValue: string | number | null;
  suggestedValue: string | number | null;
  reason: string;
  confidence: number;
}

export interface DataModificationHistory {
  id: string;
  command: string;
  modifications: DataModification[];
  appliedAt: string;
  canUndo: boolean;
}


export interface ErrorCorrectionSuggestion {
  id: string;
  validationErrorId: string;
  rowIndex: number;
  column: string;
  currentValue: string | number | null;
  suggestedValue: string | number | null;
  explanation: string;
  confidence: number;
  correctionType: 'fix' | 'replace' | 'remove' | 'format';
  alternativeOptions?: string[];
}

export interface ErrorCorrectionBatch {
  id: string;
  entityType: EntityType;
  suggestions: ErrorCorrectionSuggestion[];
  createdAt: string;
  status: 'pending' | 'applied' | 'rejected';
}


export interface DatasetAnalysis {
  id: string;
  entityTypes: EntityType[];
  analysisType: 'comprehensive' | 'patterns' | 'anomalies' | 'business-logic';
  findings: AnalysisFinding[];
  createdAt: string;
  confidence: number;
  processingTime: number;
}

export interface AnalysisFinding {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: 'data-quality' | 'business-logic' | 'efficiency' | 'patterns' | 'anomalies';
  affectedRows: number[];
  affectedColumns: string[];
  confidence: number;
  evidence: string[];
  suggestedActions: string[];
  canAutoFix: boolean;
}


export interface EnhancedRuleRecommendation extends RuleRecommendation {
  businessImpact: 'high' | 'medium' | 'low';
  implementationComplexity: 'simple' | 'moderate' | 'complex';
  estimatedBenefit: string;
  relatedFindings: string[];
  alternativeApproaches: Partial<Rule>[];
}


export interface NLModificationRequest {
  command: string;
  entityType: EntityType;
  context: {
    currentData: DataRow[];
    schema: string[];
    existingValidationErrors: ValidationError[];
  };
}

export interface NLModificationResponse {
  understood: boolean;
  modifications: DataModification[];
  confidence: number;
  reasoning: string;
  warnings: string[];
  requiresConfirmation: boolean;
}

export interface ErrorCorrectionRequest {
  validationErrors: ValidationError[];
  entityType: EntityType;
  sampleData: DataRow[];
  context: {
    otherEntities: Record<EntityType, DataRow[]>;
  };
}

export interface ErrorCorrectionResponse {
  suggestions: ErrorCorrectionSuggestion[];
  batchId: string;
  confidence: number;
  processingTime: number;
}

export interface DeepAnalysisRequest {
  entities: Record<EntityType, DataRow[]>;
  existingRules: Rule[];
  validationErrors: ValidationError[];
  analysisType: 'comprehensive' | 'patterns' | 'anomalies' | 'business-logic';
  focusAreas?: string[];
}

export interface DeepAnalysisResponse {
  analysis: DatasetAnalysis;
  recommendations: EnhancedRuleRecommendation[];
  estimatedProcessingTime: number;
} 