import { GoogleGenerativeAI } from '@google/generative-ai';
import {  
  HeaderMappingResponse, 
  EntityType, 
  ENTITY_SCHEMAS, 
  DataRow,
  ValidationError,
  NLModificationResponse,
  ErrorCorrectionResponse,
  DeepAnalysisResponse,
  EnhancedRuleRecommendation,
  DataModification
} from '../types';

const genAI = new GoogleGenerativeAI('AIzaSyB48OQpsGCQt2J0j9OWSQY5jstyP5qErE4');

// Service status tracking
let serviceStatus = {
  isAvailable: true,
  lastCheck: Date.now(),
  errorCount: 0,
  lastError: null as string | null,
};

// Check service availability
export const checkAIServiceStatus = async (): Promise<{ isAvailable: boolean; message: string }> => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Hello");
    await result.response.text();
    
    serviceStatus = {
      isAvailable: true,
      lastCheck: Date.now(),
      errorCount: 0,
      lastError: null,
    };
    
    return { isAvailable: true, message: "AI service is available" };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    serviceStatus = {
      isAvailable: false,
      lastCheck: Date.now(),
      errorCount: serviceStatus.errorCount + 1,
      lastError: errorMessage,
    };
    
    let message = "AI service is temporarily unavailable";
    if (errorMessage.includes('overloaded')) {
      message = "AI service is currently overloaded. Please try again later.";
    } else if (errorMessage.includes('quota')) {
      message = "API quota exceeded. Please check your billing.";
    } else if (errorMessage.includes('403')) {
      message = "API access denied. Please check your API key.";
    }
    
    return { isAvailable: false, message };
  }
};

export const getServiceStatus = () => ({ ...serviceStatus });

// Enhanced error handling and user guidance
export const getErrorGuidance = (error: Error): { 
  userMessage: string; 
  technicalDetails: string; 
  recoverySteps: string[]; 
  fallbackAvailable: boolean;
} => {
  const errorMessage = error.message.toLowerCase();
  
  if (errorMessage.includes('overloaded')) {
    return {
      userMessage: "AI service is currently experiencing high demand",
      technicalDetails: "Model overloaded (503 error) - too many requests",
      recoverySteps: [
        "Wait a few minutes and try again",
        "The service usually recovers quickly during peak hours",
        "Use manual header mapping as a fallback option"
      ],
      fallbackAvailable: true
    };
  }
  
  if (errorMessage.includes('quota')) {
    return {
      userMessage: "API usage limit reached",
      technicalDetails: "Quota exceeded - billing limit reached",
      recoverySteps: [
        "Check your Gemini API billing dashboard",
        "Upgrade your plan or wait for quota reset",
        "Use manual header mapping until quota resets"
      ],
      fallbackAvailable: true
    };
  }
  
  if (errorMessage.includes('403') || errorMessage.includes('unauthorized')) {
    return {
      userMessage: "API access denied",
      technicalDetails: "Authentication failed - check API key",
      recoverySteps: [
        "Verify your API key is correct",
        "Check if the API key has proper permissions",
        "Regenerate your API key if needed"
      ],
      fallbackAvailable: true
    };
  }
  
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return {
      userMessage: "Network connection issue",
      technicalDetails: "Failed to connect to AI service",
      recoverySteps: [
        "Check your internet connection",
        "Try again in a few moments",
        "Use manual header mapping as fallback"
      ],
      fallbackAvailable: true
    };
  }
  
  // Default case
  return {
    userMessage: "AI service temporarily unavailable",
    technicalDetails: error.message,
    recoverySteps: [
      "Try again in a few minutes",
      "Check if the service is down",
      "Use manual header mapping for now"
    ],
    fallbackAvailable: true
  };
};

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
};

// Exponential backoff retry function
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  retryCount: number = 0
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (retryCount >= RETRY_CONFIG.maxRetries) {
      throw error;
    }

    const delay = Math.min(
      RETRY_CONFIG.baseDelay * Math.pow(2, retryCount),
      RETRY_CONFIG.maxDelay
    );

    console.log(`AI service error, retrying in ${delay}ms... (attempt ${retryCount + 1}/${RETRY_CONFIG.maxRetries})`);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    return retryWithBackoff(fn, retryCount + 1);
  }
};

export const mapHeadersWithOpenAI = async (
  originalHeaders: string[],
  entityType: EntityType
): Promise<HeaderMappingResponse> => {
  const expectedSchema = ENTITY_SCHEMAS[entityType];
  
  const prompt = `You are a data processing expert. I need to map column headers from an uploaded CSV/Excel file to a standardized schema.

**Entity Type**: ${entityType}

**Expected Schema** (standardized field names):
${expectedSchema.map(field => `- ${field}`).join('\n')}

**Uploaded Headers** (potentially messy/inconsistent):
${originalHeaders.map((header, i) => `${i + 1}. "${header}"`).join('\n')}

**Task**: 
1. Map each uploaded header to the most appropriate standardized field name
2. If a header doesn't match any expected field, leave it unmapped
3. Consider common variations, misspellings, and different naming conventions
4. Provide a confidence score (0-1) for the overall mapping quality

**Response Format** (JSON only, no other text):
{
  "mappings": {
    "original_header": "standardized_field",
    "client name": "ClientName",
    "priority": "PriorityLevel"
  },
  "confidence": 0.85,
  "unmappedHeaders": ["unknown_field"],
  "suggestions": ["Consider mapping 'unknown_field' to 'AttributesJSON' if it contains JSON data"]
}

**Examples of common mappings for ${entityType}**:
${getExampleMappings(entityType)}

Please analyze the headers and provide ONLY the JSON mapping response:`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const result = await retryWithBackoff(async () => {
      const response = await model.generateContent(prompt);
      const content = response.response.text();
      
      if (!content) {
        throw new Error('No response from Gemini API');
      }
      
      return content;
    });

    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Gemini response');
    }

    const mappingResult: HeaderMappingResponse = JSON.parse(jsonMatch[0]);
    
    if (!mappingResult.mappings || typeof mappingResult.confidence !== 'number') {
      throw new Error('Invalid response format from Gemini API');
    }

    return mappingResult;
  } catch (error) {
    console.error('Error mapping headers with Gemini:', error);
    
    // Enhanced fallback with better error messaging
    const fallbackResult = createFallbackMapping(originalHeaders, entityType);
    
    // Add error context to help users understand what happened
    if (error instanceof Error && error.message.includes('overloaded')) {
      fallbackResult.suggestions.unshift(
        '⚠️ Gemini AI is currently overloaded. Using intelligent fallback mapping.',
        '💡 You can manually adjust the header mapping below, or try again later when the service is available.'
      );
    } else if (error instanceof Error && error.message.includes('quota')) {
      fallbackResult.suggestions.unshift(
        '⚠️ API quota exceeded. Using intelligent fallback mapping.',
        '💡 Check your Gemini API billing or upgrade your plan for continued usage.'
      );
    }
    
    return fallbackResult;
  }
};


export interface AIValidationSuggestion {
  id: string;
  name: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  confidence: number;
  enabled: boolean;
}

export const getAIValidationSuggestions = async (
  entityType: EntityType,
  sampleData: DataRow[],
  existingValidationErrors: string[]
): Promise<AIValidationSuggestion[]> => {
  // Use more rows for better AI analysis, but limit to reasonable size
  const maxRowsForAI = Math.min(20, sampleData.length);
  const sampleRows = sampleData.slice(0, maxRowsForAI);
  const schema = ENTITY_SCHEMAS[entityType];

  const prompt = `You are a data quality expert. Analyze this dataset and suggest additional validation rules.

**Entity Type**: ${entityType}

**Schema**:
${schema.map(field => `- ${field}`).join('\n')}

**Sample Data** (${sampleRows.length} rows for analysis):
${JSON.stringify(sampleRows, null, 2)}

**Existing Validation Issues Found**:
${existingValidationErrors.length > 0 ? existingValidationErrors.join('\n') : 'None detected'}

**Task**: 
Suggest 3-5 additional domain-specific validation rules that would improve data quality for this ${entityType} dataset. Consider:
- Business logic violations
- Data consistency issues
- Cross-field validations
- Domain-specific constraints
- Unusual patterns in the sample data

**Response Format** (JSON only):
{
  "suggestions": [
    {
      "id": "custom-validation-1",
      "name": "Budget Range Validation",
      "description": "Ensure budget values in AttributesJSON are within reasonable business ranges (1000-1000000)",
      "severity": "warning",
      "confidence": 0.8,
      "enabled": false
    }
  ]
}

Provide ONLY the JSON response:`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.text();

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI validation response');
    }

    const validationResponse = JSON.parse(jsonMatch[0]);
    return validationResponse.suggestions || [];

  } catch (error) {
    console.error('Error getting AI validation suggestions:', error);
    
    return getFallbackValidationSuggestions(entityType);
  }
};

export interface NLQueryResult {
  matchingRows: number[];
  filterDescription: string;
  confidence: number;
  sqlLikeQuery?: string;
}

export const executeNaturalLanguageQuery = async (
  query: string,
  entityType: EntityType,
  data: DataRow[]
): Promise<NLQueryResult> => {
  const schema = ENTITY_SCHEMAS[entityType];
  // Use more sample data for better context, but limit to reasonable size
  const maxSampleRows = Math.min(10, data.length);
  const sampleData = data.slice(0, maxSampleRows);

  const prompt = `You are a data filter assistant. Convert this natural language query into a filtering logic.

**Entity Type**: ${entityType}

**Schema**:
${schema.map(field => `- ${field}`).join('\n')}

**Sample Data** (${sampleData.length} rows for context):
${JSON.stringify(sampleData, null, 2)}

**Natural Language Query**: "${query}"

**Task**:
1. Analyze the query and determine which rows should match
2. Return the indices of matching rows from the provided data
3. Provide a clear description of the filter logic applied
4. Give a confidence score for the interpretation

**Available Data** (${data.length} total rows):
${JSON.stringify(data, null, 2)}

**Response Format** (JSON only):
{
  "matchingRows": [0, 2, 5],
  "filterDescription": "Showing clients with PriorityLevel > 2 and containing 'T17' in RequestedTaskIDs",
  "confidence": 0.9,
  "sqlLikeQuery": "WHERE PriorityLevel > 2 AND RequestedTaskIDs CONTAINS 'T17'"
}

Analyze the data and provide ONLY the JSON response:`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.text();

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in NL query response');
    }

    const queryResult: NLQueryResult = JSON.parse(jsonMatch[0]);
    
    if (!Array.isArray(queryResult.matchingRows)) {
      throw new Error('Invalid matching rows format');
    }

    queryResult.matchingRows = queryResult.matchingRows.filter(
      index => index >= 0 && index < data.length
    );

    return queryResult;

  } catch (error) {
    console.error('Error executing natural language query:', error);
    
    return executeSimpleTextSearch(query, data);
  }
};

const executeSimpleTextSearch = (query: string, data: DataRow[]): NLQueryResult => {
  const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2);
  const matchingRows: number[] = [];

  data.forEach((row, index) => {
    const rowText = Object.values(row).join(' ').toLowerCase();
    const hasMatch = searchTerms.some(term => rowText.includes(term));
    
    if (hasMatch) {
      matchingRows.push(index);
    }
  });

  return {
    matchingRows,
    filterDescription: `Simple text search for: ${searchTerms.join(', ')}`,
    confidence: 0.3,
    sqlLikeQuery: `Text search: "${query}"`
  };
};

const getFallbackValidationSuggestions = (entityType: EntityType): AIValidationSuggestion[] => {
  const suggestions = {
    clients: [
      {
        id: 'client-name-format',
        name: 'Client Name Formatting',
        description: 'Ensure client names follow standard business naming conventions',
        severity: 'warning' as const,
        confidence: 0.7,
        enabled: false
      },
      {
        id: 'budget-consistency',
        name: 'Budget Consistency Check',
        description: 'Validate budget values in AttributesJSON are within reasonable ranges',
        severity: 'warning' as const,
        confidence: 0.6,
        enabled: false
      }
    ],
    workers: [
      {
        id: 'skill-standardization',
        name: 'Skill Name Standardization',
        description: 'Check for skill name variations (e.g., "js" vs "javascript")',
        severity: 'info' as const,
        confidence: 0.8,
        enabled: false
      },
      {
        id: 'capacity-realism',
        name: 'Capacity Realism Check',
        description: 'Ensure worker capacity aligns with available time slots',
        severity: 'warning' as const,
        confidence: 0.7,
        enabled: false
      }
    ],
    tasks: [
      {
        id: 'duration-complexity',
        name: 'Duration vs Complexity',
        description: 'Validate task duration matches complexity of required skills',
        severity: 'info' as const,
        confidence: 0.6,
        enabled: false
      },
      {
        id: 'phase-logic',
        name: 'Phase Logic Validation',
        description: 'Ensure phase preferences make logical sense for task types',
        severity: 'warning' as const,
        confidence: 0.7,
        enabled: false
      }
    ]
  };

  return suggestions[entityType] || [];
};

const createFallbackMapping = (
  originalHeaders: string[],
  entityType: EntityType
): HeaderMappingResponse => {
  const expectedSchema = ENTITY_SCHEMAS[entityType];
  const mappings: Record<string, string> = {};
  const unmappedHeaders: string[] = [];
  
  originalHeaders.forEach(header => {
    const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '');
    let bestMatch = '';
    let bestScore = 0;
    
    expectedSchema.forEach(schemaField => {
      const normalizedSchema = schemaField.toLowerCase().replace(/[^a-z0-9]/g, '');
      const score = calculateSimilarity(normalizedHeader, normalizedSchema);
      
      if (score > bestScore && score > 0.6) {
        bestMatch = schemaField;
        bestScore = score;
      }
    });
    
    if (bestMatch) {
      mappings[header] = bestMatch;
    } else {
      unmappedHeaders.push(header);
    }
  });
  
  return {
    mappings,
    confidence: 0.5,
    unmappedHeaders,
    suggestions: unmappedHeaders.map(h => `Consider manually mapping "${h}" to an appropriate field`)
  };
};

const calculateSimilarity = (str1: string, str2: string): number => {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
};

const levenshteinDistance = (str1: string, str2: string): number => {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
};

const getExampleMappings = (entityType: EntityType): string => {
  const examples = {
    clients: `
- "client_id", "clientid", "Client ID" → "ClientID"
- "client name", "clientname", "Client Name" → "ClientName"
- "priority", "Priority Level", "priority_level" → "PriorityLevel"
- "tasks", "task_ids", "RequestedTasks" → "RequestedTaskIDs"
- "group", "tag", "Group Tag" → "GroupTag"
- "attributes", "json", "extra_data" → "AttributesJSON"`,
    
    workers: `
- "worker_id", "workerid", "Worker ID" → "WorkerID"
- "worker name", "workername", "Worker Name" → "WorkerName"
- "skills", "skill_set", "abilities" → "Skills"
- "slots", "available_slots", "availability" → "AvailableSlots"
- "max_load", "capacity", "load_per_phase" → "MaxLoadPerPhase"
- "group", "team", "worker_group" → "WorkerGroup"
- "qualification", "level", "qual_level" → "QualificationLevel"`,
    
    tasks: `
- "task_id", "taskid", "Task ID" → "TaskID"
- "task name", "taskname", "Task Name", "title" → "TaskName"
- "category", "type", "task_type" → "Category"
- "duration", "time", "hours" → "Duration"
- "skills", "required_skills", "skill_requirements" → "RequiredSkills"
- "phases", "preferred_phases", "phase_preference" → "PreferredPhases"
- "concurrent", "max_concurrent", "parallel" → "MaxConcurrent"`
  };
  
  return examples[entityType];
};


export const processNaturalLanguageModification = async (
  command: string,
  entityType: EntityType,
  currentData: DataRow[]
): Promise<NLModificationResponse> => {
  const schema = ENTITY_SCHEMAS[entityType];
  const sampleData = currentData.slice(0, 5);

  const prompt = `You are a data modification expert. Analyze this natural language command and suggest precise data modifications.

**Entity Type**: ${entityType}

**Schema**:
${schema.map(field => `- ${field}`).join('\n')}

**Current Data Sample** (first 5 rows):
${JSON.stringify(sampleData, null, 2)}

**Modification Command**: "${command}"

**Your Task**:
1. Parse the natural language command to understand what changes are requested
2. Identify which rows and columns need to be modified
3. Suggest specific new values for each modification
4. Provide clear reasoning for each change
5. Flag any potential issues or warnings

**Available Full Dataset** (${currentData.length} rows):
${JSON.stringify(currentData, null, 2)}

**Common Modification Patterns**:
- "Change all PriorityLevel 5 clients to 4" → Modify PriorityLevel column
- "Remove task T12 from all client requests" → Remove T12 from RequestedTaskIDs
- "Set all workers in GroupA to have qualification level 3" → Update QualificationLevel
- "Add skill 'python' to all developers" → Append to Skills column

**Response Format** (JSON only):
{
  "understood": true,
  "modifications": [
    {
      "rowIndex": 0,
      "column": "PriorityLevel",
      "currentValue": "5",
      "suggestedValue": "4",
      "reason": "Requested to change all PriorityLevel 5 clients to 4",
      "confidence": 0.95
    }
  ],
  "confidence": 0.9,
  "reasoning": "Command understood as: change priority level from 5 to 4 for all clients matching this criteria",
  "warnings": ["This will affect 15 client records", "Consider business impact of priority changes"],
  "requiresConfirmation": true
}

**Important**:
- Only suggest modifications you are confident about
- Include warnings for potentially risky changes
- Set requiresConfirmation to true for significant changes
- Use actual row indices and values from the provided data

Analyze the command and provide ONLY the JSON response:`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.text();

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in modification response');
    }

    const modificationResponse: NLModificationResponse = JSON.parse(jsonMatch[0]);
    return modificationResponse;

  } catch (error) {
    console.error('Error processing natural language modification:', error);


    const errorMessage = error instanceof Error ? error.message : String(error);
    const isQuotaError = errorMessage.includes('quota') || errorMessage.includes('429');
    const isRateLimit = errorMessage.includes('rate') || errorMessage.includes('limit');
    
    if (isQuotaError || isRateLimit) {
      return {
        understood: false,
        modifications: [],
        confidence: 0,
        reasoning: 'AI quota limit reached. Please check your Gemini API billing or try again later.',
        warnings: [
          'Gemini API quota exceeded',
          'You can test with mock data by setting NEXT_PUBLIC_USE_MOCK_AI=true',
          'Or upgrade your Gemini API plan for continued usage'
        ],
        requiresConfirmation: true
      };
    }
    
    return {
      understood: false,
      modifications: [],
      confidence: 0,
      reasoning: 'Unable to process the command. Please try rephrasing or be more specific.',
      warnings: ['AI service temporarily unavailable'],
      requiresConfirmation: true
    };
  }
};

export const generateErrorCorrections = async (
  validationErrors: ValidationError[],
  entityType: EntityType,
  sampleData: DataRow[]
): Promise<ErrorCorrectionResponse> => {
  const schema = ENTITY_SCHEMAS[entityType];
  const startTime = Date.now();

  // Get all rows that have validation errors, plus some context rows
  const errorRowIndices = new Set(validationErrors.map(err => err.rowIndex));
  const contextRows = new Set<number>();
  
  // Add rows with errors and some context rows around them
  validationErrors.forEach(err => {
    errorRowIndices.add(err.rowIndex);
    // Add context rows (2 rows before and after each error)
    for (let i = Math.max(0, err.rowIndex - 2); i <= Math.min(sampleData.length - 1, err.rowIndex + 2); i++) {
      contextRows.add(i);
    }
  });
  
  // Convert to sorted array and limit to reasonable size for AI processing
  const relevantRowIndices = Array.from(contextRows).sort((a, b) => a - b);
  const maxRowsToSend = Math.min(50, relevantRowIndices.length); // Send up to 50 rows
  const selectedRowIndices = relevantRowIndices.slice(0, maxRowsToSend);
  
  const relevantData = selectedRowIndices.map(index => ({
    rowIndex: index,
    ...sampleData[index]
  }));

  const prompt = `You are a data quality expert. Analyze these validation errors and suggest specific corrections.

**Entity Type**: ${entityType}

**Schema**:
${schema.map(field => `- ${field}`).join('\n')}

**Relevant Data** (${relevantData.length} rows with errors and context):
${JSON.stringify(relevantData, null, 2)}

**Note**: This data includes rows with validation errors and surrounding context rows. The AI will process ALL validation errors regardless of which rows are shown in this sample.

**Validation Errors to Fix** (${validationErrors.length} total):
${validationErrors.map((err, idx) => 
  `${idx + 1}. Row ${err.rowIndex}, Column ${err.column}: ${err.error} (${err.severity})`
).join('\n')}

**Your Task**:
For each validation error, suggest a specific correction:
1. Analyze the error and current data
2. Suggest the best correction approach
3. Provide alternative options where applicable
4. Explain your reasoning

**IMPORTANT**: You must provide corrections for ALL ${validationErrors.length} validation errors listed above, not just the ones in the sample data. Use the row indices from the validation errors to identify which rows need corrections.

**Correction Types**:
- **fix**: Correct the value (e.g., fix typo, format issue)
- **replace**: Replace with a standard/expected value
- **remove**: Remove invalid characters or parts
- **format**: Reformat to match expected format

**Response Format** (JSON only):
{
  "suggestions": [
    {
      "id": "correction-1",
      "validationErrorId": "error-1",
      "rowIndex": 0,
      "column": "PriorityLevel",
      "currentValue": "10",
      "suggestedValue": "5",
      "explanation": "PriorityLevel must be between 1-5. Value 10 is out of range, suggesting maximum value 5.",
      "confidence": 0.9,
      "correctionType": "replace",
      "alternativeOptions": ["4", "3"]
    }
  ],
  "batchId": "batch-123",
  "confidence": 0.85,
  "processingTime": 1200
}

**Important**:
- Only suggest corrections you are confident about
- Provide realistic alternative options
- Consider business context and data patterns
- Prioritize corrections that maintain data integrity

Analyze the errors and provide ONLY the JSON response:`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.text();

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in error correction response');
    }

    const correctionResponse: Partial<ErrorCorrectionResponse> = JSON.parse(jsonMatch[0]);
    
    return {
      suggestions: correctionResponse.suggestions || [],
      batchId: correctionResponse.batchId || generateId(),
      confidence: correctionResponse.confidence || 0.7,
      processingTime: Date.now() - startTime
    };

  } catch (error) {
    console.error('Error generating error corrections:', error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isQuotaError = errorMessage.includes('quota') || errorMessage.includes('429');
    
    if (isQuotaError) {

      return {
        suggestions: validationErrors.map((err, idx) => ({
          id: `mock-correction-${idx}`,
          validationErrorId: `error-${idx}`,
          rowIndex: err.rowIndex,
          column: err.column,
          currentValue: 'invalid_value',
          suggestedValue: 'corrected_value',
          explanation: `Mock correction for ${err.error} (API quota exceeded)`,
          confidence: 0.8,
          correctionType: 'fix' as const,
          alternativeOptions: ['option1', 'option2']
        })),
        batchId: generateId(),
        confidence: 0.8,
        processingTime: Date.now() - startTime
      };
    }
    
    return {
      suggestions: [],
      batchId: generateId(),
      confidence: 0,
      processingTime: Date.now() - startTime
    };
  }
};

export const performDeepDatasetAnalysis = async (
  entities: Record<EntityType, DataRow[]>,
  existingRules: any[],
  validationErrors: ValidationError[]
): Promise<DeepAnalysisResponse> => {
  const startTime = Date.now();

  const prompt = `You are a senior data analyst. Perform a comprehensive analysis of this multi-entity dataset to identify non-obvious problems and optimization opportunities.

**DATASET OVERVIEW**:

**Clients** (${entities.clients?.length || 0} records):
${JSON.stringify(entities.clients?.slice(0, 8) || [], null, 2)}

**Workers** (${entities.workers?.length || 0} records):
${JSON.stringify(entities.workers?.slice(0, 8) || [], null, 2)}

**Tasks** (${entities.tasks?.length || 0} records):
${JSON.stringify(entities.tasks?.slice(0, 8) || [], null, 2)}

**Existing Business Rules** (${existingRules.length}):
${existingRules.map(rule => `- ${rule.name}: ${rule.description}`).join('\n')}

**Current Validation Issues** (${validationErrors.length} total):
${validationErrors.map(err => `Row ${err.rowIndex}, ${err.column}: ${err.error}`).join('\n')}

**DEEP ANALYSIS GOALS**:
Look beyond obvious validation errors to find:

1. **Business Logic Issues**:
   - Clients requesting tasks that don't match their priority level
   - Workers assigned to tasks they're not qualified for
   - Resource allocation inefficiencies

2. **Data Patterns & Anomalies**:
   - Unusual distributions in priority levels, workloads, or skills
   - Inconsistent naming conventions or data entry patterns
   - Suspicious correlations or outliers

3. **Operational Inefficiencies**:
   - Overloaded workers or underutilized resources
   - Tasks with mismatched skill requirements
   - Phase allocation problems

4. **Quality & Consistency Issues**:
   - Incomplete or inconsistent attribute data
   - Cross-entity reference problems
   - Business rule violations

**ANALYSIS INSTRUCTIONS**:
1. Analyze relationships between entities
2. Look for subtle patterns indicating problems
3. Identify business logic violations
4. Suggest data quality improvements
5. Recommend operational optimizations

**Response Format** (JSON only):
{
  "analysis": {
    "id": "analysis-123",
    "entityTypes": ["clients", "workers", "tasks"],
    "analysisType": "comprehensive",
    "findings": [
      {
        "id": "finding-1",
        "title": "High Priority Clients Requesting Low-Skill Tasks",
        "description": "15 clients with PriorityLevel 5 are requesting tasks that only require basic skills, suggesting possible priority inflation",
        "severity": "medium",
        "category": "business-logic",
        "affectedRows": [0, 5, 12, 18, 22],
        "affectedColumns": ["PriorityLevel", "RequestedTaskIDs"],
        "confidence": 0.8,
        "evidence": [
          "Priority 5 clients: 15 found",
          "Low-skill tasks in requests: 'basic-data-entry', 'simple-review'",
          "Expected: Priority 5 clients should request complex tasks"
        ],
        "suggestedActions": [
          "Review client priority assignments",
          "Create rule to validate priority-task alignment",
          "Consider priority recalibration"
        ],
        "canAutoFix": false
      }
    ],
    "createdAt": "${new Date().toISOString()}",
    "confidence": 0.82,
    "processingTime": 2500
  },
  "recommendations": [
    {
      "explanation": "Create a rule to ensure high-priority clients are matched with appropriately skilled workers",
      "rule": {
        "name": "Priority-Skill Alignment Rule",
        "description": "Ensure Priority 4-5 clients are assigned workers with QualificationLevel >= 3",
        "type": "pattern-match",
        "priority": 8,
        "config": {
          "field": "PriorityLevel",
          "pattern": "[4-5]",
          "action": "flag",
          "entityType": "clients"
        }
      },
      "confidence": 0.85,
      "businessImpact": "high",
      "implementationComplexity": "simple",
      "estimatedBenefit": "Improved client satisfaction and resource utilization"
    }
  ],
  "estimatedProcessingTime": 2500
}

**IMPORTANT**:
- Focus on actionable insights with clear evidence
- Provide specific row indices and data examples
- Suggest concrete improvement actions
- Consider business impact and operational feasibility
- Use actual data patterns from the provided dataset

Perform the analysis and provide ONLY the JSON response:`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.text();

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in deep analysis response');
    }

    const analysisResponse: DeepAnalysisResponse = JSON.parse(jsonMatch[0]);
    return analysisResponse;

  } catch (error) {
    console.error('Error performing deep dataset analysis:', error);
    
    return {
      analysis: {
        id: generateId(),
        entityTypes: Object.keys(entities) as EntityType[],
        analysisType: 'comprehensive',
        findings: [],
        createdAt: new Date().toISOString(),
        confidence: 0,
        processingTime: Date.now() - startTime
      },
      recommendations: [],
      estimatedProcessingTime: Date.now() - startTime
    };
  }
};

export const generateEnhancedRuleRecommendations = async (
  context: any,
  analysisFindings: any[] = []
): Promise<EnhancedRuleRecommendation[]> => {
  const { clients, workers, tasks, existingRules } = context;

  const prompt = `You are a business optimization expert. Generate sophisticated rule recommendations based on data analysis and findings.

**CONTEXT**:
- Clients: ${clients.length} records
- Workers: ${workers.length} records  
- Tasks: ${tasks.length} records
- Existing Rules: ${existingRules.length}

**ANALYSIS FINDINGS**:
${analysisFindings.map(finding => 
  `- ${finding.title}: ${finding.description} (${finding.severity})`
).join('\n')}

**SAMPLE DATA**:
**Clients**: ${JSON.stringify(clients.slice(0, 5), null, 2)}
**Workers**: ${JSON.stringify(workers.slice(0, 5), null, 2)}
**Tasks**: ${JSON.stringify(tasks.slice(0, 5), null, 2)}

**ENHANCED RECOMMENDATION REQUIREMENTS**:
1. **Business Impact Assessment**: Evaluate potential ROI and operational impact
2. **Implementation Complexity**: Assess difficulty and resource requirements
3. **Alternative Approaches**: Provide multiple ways to achieve the same goal
4. **Integration with Findings**: Link recommendations to specific analysis findings

**Response Format** (JSON only):
{
  "recommendations": [
    {
      "id": "enhanced-rec-1",
      "explanation": "Implement workload balancing to prevent worker overload and improve efficiency",
      "rule": {
        "name": "Dynamic Workload Balancing",
        "description": "Automatically balance workload across workers based on current capacity and skill match",
        "type": "load-limit",
        "priority": 9,
        "config": {
          "workerGroup": "all",
          "maxSlotsPerPhase": 8,
          "overrideIndividualLimits": false
        }
      },
      "confidence": 0.88,
      "status": "pending",
      "createdAt": "${new Date().toISOString()}",
      "reasoning": "Analysis shows 23% of workers are overloaded while 31% are underutilized",
      "dataPatterns": ["Workload variance: 67%", "Efficiency gap: 23%"],
      "priority": 9,
      "businessImpact": "high",
      "implementationComplexity": "moderate",
      "estimatedBenefit": "15-20% improvement in task completion rates and 25% reduction in worker stress",
      "relatedFindings": ["finding-workload-imbalance", "finding-efficiency-gap"],
      "alternativeApproaches": [
        {
          "name": "Skill-Based Load Balancing",
          "description": "Balance workload based on skill requirements rather than just capacity",
          "type": "pattern-match"
        }
      ]
    }
  ]
}

Generate enhanced recommendations and provide ONLY the JSON response:`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.text();

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in enhanced recommendations response');
    }

    const enhancedResponse = JSON.parse(jsonMatch[0]);
    return enhancedResponse.recommendations || [];

  } catch (error) {
    console.error('Error generating enhanced rule recommendations:', error);
    return [];
  }
};

const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};
