
import { GoogleGenerativeAI } from '@google/generative-ai';
import { 
  Rule, 
  NLRuleRequest, 
  NLRuleResponse, 
  RuleType, 
  RULE_TEMPLATES 
} from '../types';
import { validateRule } from './ruleValidation';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');


export const convertNaturalLanguageToRule = async (
  request: NLRuleRequest
): Promise<NLRuleResponse> => {
  try {
    const prompt = buildRuleGenerationPrompt(request);
    
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.text();

    if (!content) {
      throw new Error('No response from Gemini API');
    }

    const parsedResponse = parseAIResponse(content);
    
    if (parsedResponse.suggestedRule) {
      const validation = validateRule(parsedResponse.suggestedRule as Rule);
      if (!validation.isValid) {
        parsedResponse.confidence = Math.max(0, parsedResponse.confidence - 0.3);
        parsedResponse.explanation += ` Note: Generated rule has validation issues: ${validation.errors.join(', ')}`;
      }
    }

    return parsedResponse;
  } catch (error) {
    console.error('Error converting natural language to rule:', error);
    return createFallbackResponse(request.naturalLanguageInput);
  }
};


const buildRuleGenerationPrompt = (request: NLRuleRequest): string => {
  const { naturalLanguageInput, context } = request;
  
  const contextInfo = context ? `
**Available Data Context:**
- Task IDs: ${context.availableTaskIds?.join(', ') || 'None'}
- Worker Groups: ${context.availableWorkerGroups?.join(', ') || 'None'}
- Client Groups: ${context.availableClientGroups?.join(', ') || 'None'}
- Phases: ${context.availablePhases?.join(', ') || 'None'}
` : '';

  return `You are an expert in business rule parsing and data management workflows. Convert the following natural language description into a structured business rule.

**Natural Language Input:** "${naturalLanguageInput}"

${contextInfo}

**Available Rule Types:**
1. **co-run**: Tasks that must or must not run together
   - Example: "Tasks T1 and T2 must run together"
   - Config: { taskIds: string[], mustRunTogether: boolean, samePhase?: boolean }

2. **slot-restriction**: Limit available slots for worker/client groups
   - Example: "Marketing team can only use 5 slots maximum"
   - Config: { workerGroup?: string, clientGroup?: string, minCommonSlots: number, maxCommonSlots?: number, phases?: string[] }

3. **load-limit**: Set maximum workload for worker groups
   - Example: "DevOps team maximum 8 slots per phase"
   - Config: { workerGroup: string, maxSlotsPerPhase: number, phases?: string[], overrideIndividualLimits?: boolean }

4. **phase-window**: Restrict tasks to specific phases or time windows
   - Example: "Task T1 can only run in phases 1, 2, and 3"
   - Config: { taskId: string, allowedPhases: string[], restrictedPhases?: string[], timeWindow?: { start: string, end: string } }

5. **pattern-match**: Apply regex-based rules to filter or validate data
   - Example: "Only allow client names starting with 'CORP'"
   - Config: { field: string, pattern: string, action: 'allow' | 'deny' | 'flag', entityType: 'clients' | 'workers' | 'tasks', message?: string }

6. **precedence-override**: Override default priority ordering
   - Example: "Client C1 should have higher priority than C2"
   - Config: { higherPriorityItems: string[], lowerPriorityItems: string[], entityType: 'clients' | 'workers' | 'tasks', reason?: string }

**Instructions:**
1. Analyze the natural language input
2. Determine the most appropriate rule type
3. Extract specific entities, numbers, and constraints
4. Build the complete rule configuration
5. Provide alternatives if multiple interpretations are possible
6. Rate your confidence (0.0-1.0) based on clarity of the input

**Response Format (JSON only):**
{
  "suggestedRule": {
    "name": "Human-readable rule name",
    "description": "Clear description of what this rule does",
    "type": "rule-type",
    "enabled": true,
    "priority": 50,
    "source": "ai-generated",
    "config": {
      // Type-specific configuration
    }
  },
  "confidence": 0.85,
  "explanation": "Clear explanation of interpretation and reasoning",
  "alternatives": [
    {
      "name": "Alternative interpretation",
      "type": "different-rule-type",
      "config": { ... }
    }
  ],
  "requiresConfirmation": true
}

**Examples:**

Input: "Tasks T1, T2, and T3 must never run at the same time"
Output: {
  "suggestedRule": {
    "name": "Prevent T1, T2, T3 Concurrent Execution",
    "description": "Ensures tasks T1, T2, and T3 never run simultaneously",
    "type": "co-run",
    "enabled": true,
    "priority": 70,
    "source": "ai-generated",
    "config": {
      "taskIds": ["T1", "T2", "T3"],
      "mustRunTogether": false
    }
  },
  "confidence": 0.9,
  "explanation": "Clear instruction to prevent concurrent execution of specific tasks",
  "requiresConfirmation": false
}

Input: "High priority clients should be processed first"
Output: {
  "suggestedRule": {
    "name": "High Priority Client Precedence",
    "description": "Ensures high priority clients are processed before others",
    "type": "pattern-match",
    "enabled": true,
    "priority": 80,
    "source": "ai-generated",
    "config": {
      "field": "PriorityLevel",
      "pattern": "^[89]$|^10$",
      "action": "allow",
      "entityType": "clients",
      "message": "High priority clients (8-10) processed first"
    }
  },
  "confidence": 0.7,
  "explanation": "Interpreted as pattern matching for high priority levels (8-10), but could also be precedence override",
  "alternatives": [
    {
      "name": "Precedence Override Alternative",
      "type": "precedence-override",
      "config": {
        "higherPriorityItems": ["high-priority-group"],
        "lowerPriorityItems": ["normal-priority-group"],
        "entityType": "clients",
        "reason": "Business requirement for high priority processing"
      }
    }
  ],
  "requiresConfirmation": true
}

Now analyze the input and provide ONLY the JSON response:`;
};


const parseAIResponse = (content: string): NLRuleResponse => {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    if (!parsed.suggestedRule || !parsed.confidence || !parsed.explanation) {
      throw new Error('Missing required fields in AI response');
    }

    parsed.confidence = Math.max(0, Math.min(1, parsed.confidence));

    parsed.requiresConfirmation = parsed.requiresConfirmation ?? true;
    parsed.alternatives = parsed.alternatives || [];

    return parsed as NLRuleResponse;
  } catch (error) {
    console.error('Error parsing AI response:', error);
    throw new Error('Failed to parse AI response');
  }
};


const createFallbackResponse = (input: string): NLRuleResponse => {
  const lowerInput = input.toLowerCase();
  let suggestedType: RuleType = 'pattern-match'; // Default fallback
  
  if (lowerInput.includes('together') || lowerInput.includes('same time') || lowerInput.includes('concurrent')) {
    suggestedType = 'co-run';
  } else if (lowerInput.includes('slot') || lowerInput.includes('limit') || lowerInput.includes('maximum')) {
    if (lowerInput.includes('group') || lowerInput.includes('team')) {
      suggestedType = 'load-limit';
    } else {
      suggestedType = 'slot-restriction';
    }
  } else if (lowerInput.includes('phase') || lowerInput.includes('time') || lowerInput.includes('window')) {
    suggestedType = 'phase-window';
  } else if (lowerInput.includes('priority') || lowerInput.includes('first') || lowerInput.includes('order')) {
    suggestedType = 'precedence-override';
  }

  const template = RULE_TEMPLATES[suggestedType];
  
  return {
    suggestedRule: {
      ...template,
      name: `Rule for: ${input.slice(0, 50)}...`,
      description: `Auto-generated rule based on: "${input}"`,
      priority: 50,
      enabled: true,
      source: 'ai-generated',
    } as Partial<Rule>,
    confidence: 0.3,
    explanation: `AI processing failed. Created a basic ${suggestedType} rule template. Please review and customize the configuration.`,
    requiresConfirmation: true,
    alternatives: [],
  };
};


export const suggestRuleImprovements = async (
  rule: Rule,
  dataContext?: {
    availableTaskIds: string[];
    availableWorkerGroups: string[];
    availableClientGroups: string[];
  }
): Promise<string[]> => {
  try {
    const contextInfo = dataContext ? `
Available Data Context:
- Task IDs: ${dataContext.availableTaskIds.join(', ')}
- Worker Groups: ${dataContext.availableWorkerGroups.join(', ')}
- Client Groups: ${dataContext.availableClientGroups.join(', ')}
` : '';

    const prompt = `You are a business rule optimization expert. Analyze this rule and suggest 3-5 specific improvements.

**Current Rule:**
Name: ${rule.name}
Type: ${rule.type}
Description: ${rule.description}
Priority: ${rule.priority}
Configuration: ${JSON.stringify(rule.config, null, 2)}

${contextInfo}

**Task:** Provide specific, actionable suggestions to improve this rule's effectiveness, clarity, or performance. Consider:
- Business logic optimizations
- Performance improvements
- Clarity enhancements
- Potential conflicts or edge cases
- Better integration with available data

**Response Format:** Provide ONLY a JSON array of suggestions:
["Suggestion 1 text", "Suggestion 2 text", "Suggestion 3 text"]

Provide the JSON response:`;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.text();

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return ['Consider adding more specific configuration parameters', 'Review rule priority relative to other rules'];
  } catch (error) {
    console.error('Error getting rule improvement suggestions:', error);
    return [
      'Review rule configuration for completeness',
      'Consider the impact on system performance',
      'Ensure rule name and description are clear',
    ];
  }
};


export const suggestRulesFromDataPatterns = async (
  dataContext: {
    clientsData: any[];
    workersData: any[];
    tasksData: any[];
  },
  existingRules: Rule[]
): Promise<NLRuleResponse[]> => {
  try {
    const prompt = `You are a data analysis expert. Analyze this dataset and suggest 3-5 new business rules based on patterns you observe.

**Data Summary:**
Clients: ${dataContext.clientsData.length} records
Workers: ${dataContext.workersData.length} records  
Tasks: ${dataContext.tasksData.length} records

**Sample Client Data:**
${JSON.stringify(dataContext.clientsData.slice(0, 3), null, 2)}

**Sample Worker Data:**
${JSON.stringify(dataContext.workersData.slice(0, 3), null, 2)}

**Sample Task Data:**
${JSON.stringify(dataContext.tasksData.slice(0, 3), null, 2)}

**Existing Rules:**
${existingRules.map(r => `- ${r.name} (${r.type})`).join('\n')}

**Task:** Identify data patterns and suggest new rules that would improve:
- Data quality
- Business logic enforcement
- Resource optimization
- Workflow efficiency

**Response Format:** JSON array of rule suggestions:
[
  {
    "suggestedRule": { ... },
    "confidence": 0.8,
    "explanation": "Why this rule would be beneficial",
    "requiresConfirmation": true
  }
]

Provide ONLY the JSON response:`;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.text();

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return [];
  } catch (error) {
    console.error('Error suggesting rules from data patterns:', error);
    return [];
  }
};


export const explainRuleInPlainLanguage = async (rule: Rule): Promise<string> => {
  try {
    const prompt = `You are a business communication expert. Explain this technical business rule in simple, non-technical language that any stakeholder can understand.

**Rule Details:**
Name: ${rule.name}
Type: ${rule.type}
Description: ${rule.description}
Configuration: ${JSON.stringify(rule.config, null, 2)}

**Task:** Provide a clear, jargon-free explanation of:
1. What this rule does
2. Why it might be important
3. What happens when it's applied

**Requirements:**
- Use simple language
- Avoid technical jargon
- Be concise but complete
- Focus on business impact

**Response Format:** Provide ONLY the plain language explanation as a single paragraph.

Your explanation:`;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    return response.text().trim() || 'This rule helps manage how tasks and resources are allocated in your workflow.';
  } catch (error) {
    console.error('Error explaining rule in plain language:', error);
    return 'This rule helps manage how tasks and resources are allocated in your workflow.';
  }
}; 