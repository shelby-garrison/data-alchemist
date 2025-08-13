import { GoogleGenerativeAI } from '@google/generative-ai';
import { EntityType, DataRow } from '../types';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');


export interface CleanedDataRow {
  [key: string]: string | number | boolean | null | undefined;
  needsManualReview?: boolean;
  originalRowIndex?: number;
  cleaningNotes?: string;
}

export interface DataCleaningRequest {
  entityType: EntityType;
  rawRows: DataRow[];
  maxRowsPerBatch?: number;
}

export interface DataCleaningResponse {
  cleanedRows: CleanedDataRow[];
  totalCleaned: number;
  needsManualReview: number;
  processingNotes: string[];
  success: boolean;
  error?: string;
}


const ENTITY_SCHEMA_DEFINITIONS: Record<EntityType, Record<string, string>> = {
  clients: {
    ClientID: 'string',
    ClientName: 'string',
    PriorityLevel: 'integer (1–5)',
    RequestedTaskIDs: 'comma-separated string',
    GroupTag: 'string',
    AttributesJSON: 'valid JSON string'
  },
  workers: {
    WorkerID: 'string',
    WorkerName: 'string',
    Skills: 'comma-separated string',
    AvailableSlots: 'array of integers (e.g. [1,3,5])',
    MaxLoadPerPhase: 'integer',
    WorkerGroup: 'string',
    QualificationLevel: 'string'
  },
  tasks: {
    TaskID: 'string',
    TaskName: 'string',
    Category: 'string',
    Duration: 'integer (≥1)',
    RequiredSkills: 'comma-separated string',
    PreferredPhases: 'array of integers',
    MaxConcurrent: 'integer'
  }
};


const PERFECT_EXAMPLES: Record<EntityType, any> = {
  clients: {
    ClientID: 'CLIENT001',
    ClientName: 'Acme Corporation',
    PriorityLevel: 3,
    RequestedTaskIDs: 'task1,task2,task3',
    GroupTag: 'enterprise',
    AttributesJSON: '{"budget": 50000, "deadline": "2024-12-31"}'
  },
  workers: {
    WorkerID: 'WORKER001',
    WorkerName: 'John Smith',
    Skills: 'javascript,python,react',
    AvailableSlots: [1, 3, 5],
    MaxLoadPerPhase: 10,
    WorkerGroup: 'frontend-team',
    QualificationLevel: 'senior'
  },
  tasks: {
    TaskID: 'TASK001',
    TaskName: 'Develop Login Component',
    Category: 'frontend',
    Duration: 5,
    RequiredSkills: 'react,typescript,css',
    PreferredPhases: [1, 2],
    MaxConcurrent: 2
  }
};


const CLEANING_EXAMPLES = {
  general: [
    'PriorityLevel: "High" → 3',
    'PriorityLevel: "Low" → 1',
    'PriorityLevel: "Medium" → 2',
    'RequestedTaskIDs: "task1; task2" → "task1,task2"',
    'AttributesJSON: broken JSON → "{}"',
    'Duration: "Two" → 2',
    'Duration: "Five hours" → 5',
    'Skills: "JS; React; Node" → "javascript,react,nodejs"'
  ],
  clients: [
    'PriorityLevel: "Critical" → 5',
    'PriorityLevel: "Urgent" → 4',
    'RequestedTaskIDs: "task1|task2|task3" → "task1,task2,task3"',
    'AttributesJSON: "budget: 1000" → \'{"budget": 1000}\''
  ],
  workers: [
    'AvailableSlots: "1,2,3" → [1,2,3]',
    'AvailableSlots: "1-3" → [1,2,3]',
    'Skills: "JS/React/Node" → "javascript,react,nodejs"',
    'QualificationLevel: "Sr" → "senior"'
  ],
  tasks: [
    'PreferredPhases: "1-3" → [1,2,3]',
    'PreferredPhases: "1,2,3" → [1,2,3]',
    'Duration: "3 days" → 3',
    'RequiredSkills: "Python & ML" → "python,machine-learning"'
  ]
};


export const cleanDataWithAI = async (
  request: DataCleaningRequest
): Promise<DataCleaningResponse> => {
  const { entityType, rawRows, maxRowsPerBatch = 50 } = request;

  if (!rawRows || rawRows.length === 0) {
    return {
      cleanedRows: [],
      totalCleaned: 0,
      needsManualReview: 0,
      processingNotes: ['No data to clean'],
      success: true
    };
  }

  try {
    const batches = chunkArray(rawRows, maxRowsPerBatch);
    const allCleanedRows: CleanedDataRow[] = [];
    const allNotes: string[] = [];
    let totalNeedsReview = 0;

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchResult = await processBatch(entityType, batch, i * maxRowsPerBatch);
      
      allCleanedRows.push(...batchResult.cleanedRows);
      allNotes.push(...batchResult.notes);
      totalNeedsReview += batchResult.needsManualReview;
    }

    return {
      cleanedRows: allCleanedRows,
      totalCleaned: allCleanedRows.length,
      needsManualReview: totalNeedsReview,
      processingNotes: allNotes,
      success: true
    };

  } catch (error) {
    console.error('Error in AI data cleaning:', error);
    return {
      cleanedRows: rawRows.map((row, index) => ({
        ...row,
        needsManualReview: true,
        originalRowIndex: index,
        cleaningNotes: 'AI cleaning failed - requires manual review'
      })),
      totalCleaned: 0,
      needsManualReview: rawRows.length,
      processingNotes: [`AI cleaning failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};


const processBatch = async (
  entityType: EntityType,
  batch: DataRow[],
  startIndex: number
): Promise<{
  cleanedRows: CleanedDataRow[];
  needsManualReview: number;
  notes: string[];
}> => {
  const prompt = buildCleaningPrompt(entityType, batch);
  
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.text();

    if (!content) {
      throw new Error('No response from Gemini API');
    }

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in Gemini response');
    }

    const cleanedData: CleanedDataRow[] = JSON.parse(jsonMatch[0]);
    
    const processedRows = cleanedData.map((row, index) => ({
      ...row,
      originalRowIndex: startIndex + index
    }));

    const needsReview = processedRows.filter(row => row.needsManualReview).length;
    
    return {
      cleanedRows: processedRows,
      needsManualReview: needsReview,
      notes: [`Processed batch of ${batch.length} rows, ${needsReview} need manual review`]
    };

  } catch (error) {
    console.error('Error processing batch:', error);
    
    const fallbackRows = batch.map((row, index) => ({
      ...row,
      needsManualReview: true,
      originalRowIndex: startIndex + index,
      cleaningNotes: `AI processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }));

    return {
      cleanedRows: fallbackRows,
      needsManualReview: batch.length,
      notes: [`Batch processing failed, ${batch.length} rows marked for manual review`]
    };
  }
};


const buildCleaningPrompt = (entityType: EntityType, rows: DataRow[]): string => {
  const schemaDefinition = ENTITY_SCHEMA_DEFINITIONS[entityType];
  const perfectExample = PERFECT_EXAMPLES[entityType];
  const specificExamples = CLEANING_EXAMPLES[entityType] || [];
  const generalExamples = CLEANING_EXAMPLES.general;

  const schemaFields = Object.entries(schemaDefinition)
    .map(([field, type]) => `- ${field}: ${type}`)
    .join('\n');

  const exampleTransformations = [
    '## General Transformations:',
    ...generalExamples.map(ex => `- ${ex}`),
    `\n## ${entityType.charAt(0).toUpperCase() + entityType.slice(1)}-Specific Transformations:`,
    ...specificExamples.map(ex => `- ${ex}`)
  ].join('\n');

  return `You are a data-cleaning assistant. Clean the following rows to match this schema:

## Required Schema for ${entityType}:
${schemaFields}

## Example of Perfect Data:
${JSON.stringify(perfectExample, null, 2)}

## Common Value Transformations:
${exampleTransformations}

## Rules:
1. Convert all values to match the exact schema types
2. Normalize comma-separated values (remove spaces, use consistent separators)
3. Parse arrays from strings like "1,2,3" or "1-3" into proper arrays
4. Fix broken JSON strings or replace with "{}" if unfixable
5. Convert text numbers to integers where needed
6. Standardize priority levels: Low=1, Medium=2, High=3, Urgent=4, Critical=5
7. If a row cannot be fixed confidently, mark it with "needsManualReview": true
8. Add a "cleaningNotes" field if you make significant changes

## Raw Data to Clean:
${JSON.stringify(rows, null, 2)}

Return ONLY a JSON array of cleaned objects. Each object should either be properly cleaned or marked with "needsManualReview": true if you cannot fix it confidently.

Example response format:
[
  {
    "ClientID": "CLIENT001",
    "ClientName": "Fixed Name",
    "PriorityLevel": 3,
    "RequestedTaskIDs": "task1,task2",
    "GroupTag": "enterprise",
    "AttributesJSON": "{}",
    "cleaningNotes": "Fixed priority level from 'High' to 3"
  },
  {
    "ClientID": "CLIENT002",
    "needsManualReview": true,
    "cleaningNotes": "Unable to parse complex nested data structure"
  }
]`;
};


const chunkArray = <T>(array: T[], chunkSize: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
};


export const validateCleanedData = (
  data: CleanedDataRow[],
  entityType: EntityType
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const schemaDefinition = ENTITY_SCHEMA_DEFINITIONS[entityType];
  const requiredFields = Object.keys(schemaDefinition);

  data.forEach((row, index) => {
    if (row.needsManualReview) return; 

    requiredFields.forEach(field => {
      if (!(field in row) || row[field] === null || row[field] === undefined) {
        errors.push(`Row ${index + 1}: Missing required field '${field}'`);
      }
    });

    if (entityType === 'clients' && row.PriorityLevel) {
      const priority = Number(row.PriorityLevel);
      if (isNaN(priority) || priority < 1 || priority > 5) {
        errors.push(`Row ${index + 1}: PriorityLevel must be an integer between 1-5`);
      }
    }

    if (entityType === 'tasks' && row.Duration) {
      const duration = Number(row.Duration);
      if (isNaN(duration) || duration < 1) {
        errors.push(`Row ${index + 1}: Duration must be an integer ≥1`);
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}; 