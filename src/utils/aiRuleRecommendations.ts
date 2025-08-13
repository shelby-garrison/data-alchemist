import { GoogleGenerativeAI } from '@google/generative-ai';
import { 
  AIRecommendationRequest, 
  AIRecommendationResponse, 
  RuleRecommendation, 
  Rule,
  DataRow,
  RecommendationAnalysisContext,
  RuleType
} from '../types';
import { generateId } from './helpers';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');



export class AIRuleRecommendationsService {
  private model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  
  async generateRecommendations(request: AIRecommendationRequest): Promise<AIRecommendationResponse> {
    const startTime = Date.now();
    
    try {
      const prompt = this.buildAnalysisPrompt(request);
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const content = response.text();

      if (!content) {
        throw new Error('No response from Gemini API');
      }

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in Gemini response');
      }

      const aiResponse = JSON.parse(jsonMatch[0]);
      
      const processedRecommendations = this.processRecommendations(aiResponse.recommendations || []);
      
      const processingTime = Date.now() - startTime;

      return {
        recommendations: processedRecommendations,
        analysisMetadata: {
          totalPatternsFound: aiResponse.totalPatternsFound || processedRecommendations.length,
          confidenceScore: aiResponse.confidenceScore || 0.7,
          processingTime,
          suggestions: aiResponse.suggestions || []
        }
      };

    } catch (error) {
      console.error('Error generating AI rule recommendations:', error);
      
      return this.generateFallbackRecommendations(request);
    }
  }

  
  private buildAnalysisPrompt(request: AIRecommendationRequest): string {
    const { context, maxRecommendations = 5, focusAreas = [] } = request;
    const { clients, workers, tasks, existingRules } = context;

    return `You are an expert business analyst specializing in task allocation optimization. Analyze the provided data and suggest intelligent business rules.

**CURRENT DATA CONTEXT:**

**Clients (${clients.length} records):**
${JSON.stringify(clients.slice(0, 10), null, 2)}
${clients.length > 10 ? `... and ${clients.length - 10} more clients` : ''}

**Workers (${workers.length} records):**
${JSON.stringify(workers.slice(0, 10), null, 2)}
${workers.length > 10 ? `... and ${workers.length - 10} more workers` : ''}

**Tasks (${tasks.length} records):**
${JSON.stringify(tasks.slice(0, 10), null, 2)}
${tasks.length > 10 ? `... and ${tasks.length - 10} more tasks` : ''}

**Existing Rules (${existingRules.length}):**
${existingRules.map(rule => `- ${rule.name}: ${rule.description} (${rule.type})`).join('\n')}

**ANALYSIS GOALS:**
${focusAreas.length > 0 ? `Focus on: ${focusAreas.join(', ')}` : 'General optimization'}

**RULE TYPES AVAILABLE:**
1. **co-run**: Tasks that should run together (same worker/phase)
   - Example: Task A and Task B always co-located for efficiency
   
2. **load-limit**: Maximum workload constraints for worker groups
   - Example: Sales team max 3 concurrent tasks per phase
   
3. **phase-window**: Time/phase restrictions for specific tasks or clients
   - Example: Client X only available in Phase 1-2
   
4. **pattern-match**: Data validation and consistency rules
   - Example: High priority clients must have senior workers
   
5. **slot-restriction**: Worker-client compatibility requirements
   - Example: Enterprise clients need workers with QualificationLevel >= 3

**ANALYSIS INSTRUCTIONS:**

1. Look for these patterns in the data:
   - Tasks frequently requested together by same clients
   - Worker groups that appear overloaded (high MaxLoadPerPhase vs task volume)
   - Clients with consistent phase preferences
   - Skills mismatches between required and available
   - Qualification level patterns for different client types
   - Time windows where certain combinations work better

2. Suggest ${maxRecommendations} business rules that would:
   - Improve allocation efficiency
   - Prevent overloading  
   - Ensure quality matches
   - Optimize resource utilization
   - Maintain business constraints

3. For each recommendation, provide:
   - Clear business justification
   - Specific configuration values based on data patterns
   - Confidence score (0.1-1.0)
   - Data patterns that support the rule

**RESPONSE FORMAT (JSON only, no other text):**
{
  "recommendations": [
    {
      "explanation": "Tasks T12 and T14 appear together in 85% of client requests, suggesting they should be co-run for efficiency",
      "rule": {
        "name": "T12-T14 Co-run Optimization",
        "description": "Ensure tasks T12 and T14 are assigned to the same worker and run in the same phase",
        "type": "co-run",
        "priority": 8,
        "config": {
          "taskIds": ["T12", "T14"],
          "mustRunTogether": true,
          "samePhase": true
        }
      },
      "confidence": 0.85,
      "reasoning": "Data analysis shows 17 out of 20 clients requesting both tasks simultaneously",
      "dataPatterns": ["T12-T14 co-occurrence: 85%", "Average efficiency gain: 23%"],
      "priority": 8
    }
  ],
  "totalPatternsFound": 12,
  "confidenceScore": 0.78,
  "suggestions": ["Consider implementing workload balancing across phases", "Monitor client satisfaction for high-priority allocations"]
}

**IMPORTANT:**
- Base all recommendations on actual data patterns found
- Ensure rule configurations use actual IDs/values from the provided data
- Provide realistic confidence scores based on data strength
- Include specific business reasoning for each suggestion

Analyze the data and provide your JSON response:`;
  }

  
  private processRecommendations(rawRecommendations: any[]): RuleRecommendation[] {
    return rawRecommendations.map((raw, index) => ({
      id: generateId(),
      explanation: raw.explanation || `AI-generated rule suggestion ${index + 1}`,
      rule: this.validateAndCleanRule(raw.rule),
      confidence: Math.min(Math.max(raw.confidence || 0.5, 0.1), 1.0),
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
      reasoning: raw.reasoning || raw.explanation || 'AI analysis of data patterns',
      dataPatterns: Array.isArray(raw.dataPatterns) ? raw.dataPatterns : [],
      priority: raw.priority || 5
    }));
  }

  
  private validateAndCleanRule(rawRule: any): Partial<Rule> {
    if (!rawRule || !rawRule.type) {
      return {
        name: 'AI Rule',
        description: 'AI-generated optimization rule',
        type: 'pattern-match' as RuleType,
        priority: 5,
        enabled: true
      };
    }

    const baseRule = {
      name: rawRule.name || 'AI Rule',
      description: rawRule.description || 'AI-generated rule',
      type: rawRule.type as RuleType,
      priority: Math.min(Math.max(rawRule.priority || 5, 1), 10),
      enabled: true
    };

    
    if (rawRule.config) {
      return {
        ...baseRule,
        config: rawRule.config
      };
    }

    return baseRule;
  }

  
  private generateFallbackRecommendations(request: AIRecommendationRequest): AIRecommendationResponse {
    const { context } = request;
    const fallbackRecommendations: RuleRecommendation[] = [];

    if (context.clients.length > 0 && context.workers.length > 0) {
      const taskPatterns = this.findTaskPatterns(context.clients);
      const workerLoadPatterns = this.findWorkerLoadPatterns(context.workers);

      if (taskPatterns.length > 0) {
        taskPatterns.forEach((pattern, index) => {
          fallbackRecommendations.push({
            id: generateId(),
            explanation: `Tasks ${pattern.taskIds.join(' and ')} frequently appear together in client requests`,
            rule: {
              name: `Co-run: ${pattern.taskIds.join('-')}`,
              description: `Optimize allocation by running ${pattern.taskIds.join(' and ')} together`,
              type: 'co-run' as const,
              priority: 7,
              enabled: true,
              config: {
                taskIds: pattern.taskIds,
                mustRunTogether: true,
                samePhase: true
              } 
            } as Partial<Rule>,
            confidence: pattern.confidence,
            status: 'pending',
            createdAt: new Date().toISOString(),
            reasoning: `Found ${pattern.occurrences} instances of these tasks requested together`,
            dataPatterns: [`Co-occurrence rate: ${Math.round(pattern.confidence * 100)}%`],
            priority: 7
          });
        });
      }

      if (workerLoadPatterns.length > 0) {
        workerLoadPatterns.forEach((pattern) => {
          fallbackRecommendations.push({
            id: generateId(),
            explanation: `Worker group "${pattern.group}" shows high load, consider adding limits`,
            rule: {
              name: `Load Limit: ${pattern.group}`,
              description: `Limit concurrent tasks for ${pattern.group} workers to prevent overload`,
              type: 'load-limit' as const,
              priority: 6,
              enabled: true,
              config: {
                workerGroup: pattern.group,
                maxSlotsPerPhase: pattern.suggestedLimit,
                overrideIndividualLimits: false
              }
            } as Partial<Rule>,
            confidence: 0.7,
            status: 'pending',
            createdAt: new Date().toISOString(),
            reasoning: `Average load per worker: ${pattern.averageLoad}`,
            dataPatterns: [`High load detected: ${pattern.averageLoad} tasks/worker`],
            priority: 6
          });
        });
      }
    }

    return {
      recommendations: fallbackRecommendations.slice(0, 3),
      analysisMetadata: {
        totalPatternsFound: fallbackRecommendations.length,
        confidenceScore: 0.6,
        processingTime: 100,
        suggestions: ['AI analysis unavailable, using pattern detection fallback']
      }
    };
  }

  
  private findTaskPatterns(clients: DataRow[]): Array<{taskIds: string[], confidence: number, occurrences: number}> {
    const taskPairs: Record<string, number> = {};
    const taskCounts: Record<string, number> = {};

    clients.forEach(client => {
      const requestedTasks = String(client.RequestedTaskIDs || '').split(',').map(t => t.trim()).filter(Boolean);
      
      requestedTasks.forEach(task => {
        taskCounts[task] = (taskCounts[task] || 0) + 1;
      });

      for (let i = 0; i < requestedTasks.length; i++) {
        for (let j = i + 1; j < requestedTasks.length; j++) {
          const pair = [requestedTasks[i], requestedTasks[j]].sort().join('-');
          taskPairs[pair] = (taskPairs[pair] || 0) + 1;
        }
      }
    });

    const patterns: Array<{taskIds: string[], confidence: number, occurrences: number}> = [];
    
    Object.entries(taskPairs).forEach(([pair, count]) => {
      const [task1, task2] = pair.split('-');
      const task1Count = taskCounts[task1] || 0;
      const task2Count = taskCounts[task2] || 0;
      const confidence = count / Math.min(task1Count, task2Count);
      
      if (confidence > 0.5 && count >= 2) {
        patterns.push({
          taskIds: [task1, task2],
          confidence,
          occurrences: count
        });
      }
    });

    return patterns.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
  }

  
  private findWorkerLoadPatterns(workers: DataRow[]): Array<{group: string, averageLoad: number, suggestedLimit: number}> {
    const groupLoads: Record<string, number[]> = {};

    workers.forEach(worker => {
      const group = String(worker.WorkerGroup || 'Default');
      const maxLoad = Number(worker.MaxLoadPerPhase) || 0;
      
      if (!groupLoads[group]) {
        groupLoads[group] = [];
      }
      groupLoads[group].push(maxLoad);
    });

    const patterns: Array<{group: string, averageLoad: number, suggestedLimit: number}> = [];

    Object.entries(groupLoads).forEach(([group, loads]) => {
      if (loads.length > 1) {
        const averageLoad = loads.reduce((sum, load) => sum + load, 0) / loads.length;
        
        if (averageLoad > 5) {
          patterns.push({
            group,
            averageLoad: Math.round(averageLoad * 10) / 10,
            suggestedLimit: Math.max(3, Math.floor(averageLoad * 0.8))
          });
        }
      }
    });

    return patterns.slice(0, 2);
  }
}


export const aiRuleRecommendationsService = new AIRuleRecommendationsService();


export async function generateAIRuleRecommendations(
  clients: DataRow[],
  workers: DataRow[],
  tasks: DataRow[],
  existingRules: Rule[],
  maxRecommendations: number = 5
): Promise<AIRecommendationResponse> {
  const context: RecommendationAnalysisContext = {
    clients,
    workers,
    tasks,
    existingRules,
    priorityWeights: [] 
  };

  const request: AIRecommendationRequest = {
    context,
    maxRecommendations,
    focusAreas: ['efficiency', 'load-balancing', 'patterns']
  };

  return await aiRuleRecommendationsService.generateRecommendations(request);
} 