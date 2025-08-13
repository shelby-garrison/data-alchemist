import { z } from 'zod';
import { DataRow, ValidationError, EntityType } from '../types';

const ClientSchemaZod = z.object({
  ClientID: z.string().min(1, "ClientID is required"),
  ClientName: z.string().min(1, "ClientName is required"),
  PriorityLevel: z.union([z.string(), z.number()]).transform(val => {
    const num = typeof val === 'string' ? parseInt(val) : val;
    if (isNaN(num) || num < 1 || num > 5) {
      throw new Error("PriorityLevel must be between 1-5");
    }
    return num;
  }),
  RequestedTaskIDs: z.string().optional().default(""),
  GroupTag: z.string().min(1, "GroupTag is required"),
  AttributesJSON: z.string().optional().default("")
});

const WorkerSchemaZod = z.object({
  WorkerID: z.string().min(1, "WorkerID is required"),
  WorkerName: z.string().min(1, "WorkerName is required"),
  Skills: z.string().min(1, "Skills are required"),
  AvailableSlots: z.string().min(1, "AvailableSlots are required"),
  MaxLoadPerPhase: z.union([z.string(), z.number()]).transform(val => {
    const num = typeof val === 'string' ? parseInt(val) : val;
    if (isNaN(num) || num < 1) {
      throw new Error("MaxLoadPerPhase must be at least 1");
    }
    return num;
  }),
  WorkerGroup: z.string().min(1, "WorkerGroup is required"),
  QualificationLevel: z.union([z.string(), z.number()]).transform(val => {
    const num = typeof val === 'string' ? parseInt(val) : val;
    return isNaN(num) ? 1 : num;
  })
});

const TaskSchemaZod = z.object({
  TaskID: z.string().min(1, "TaskID is required"),
  TaskName: z.string().min(1, "TaskName is required"),
  Category: z.string().min(1, "Category is required"),
  Duration: z.union([z.string(), z.number()]).transform(val => {
    const num = typeof val === 'string' ? parseInt(val) : val;
    if (isNaN(num) || num < 1) {
      throw new Error("Duration must be at least 1");
    }
    return num;
  }),
  RequiredSkills: z.string().min(1, "RequiredSkills are required"),
  PreferredPhases: z.string().min(1, "PreferredPhases are required"),
  MaxConcurrent: z.union([z.string(), z.number()]).transform(val => {
    const num = typeof val === 'string' ? parseInt(val) : val;
    if (isNaN(num) || num < 1) {
      throw new Error("MaxConcurrent must be at least 1");
    }
    return num;
  })
});

export class DataValidator {
  static validateRequiredFields(row: DataRow, entityType: EntityType, index: number): ValidationError[] {
    const errors: ValidationError[] = [];
    const schemas = {
      clients: ClientSchemaZod,
      workers: WorkerSchemaZod,
      tasks: TaskSchemaZod
    };

    try {
      schemas[entityType].parse(row);
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach(err => {
          errors.push({
            rowIndex: index,
            column: err.path[0] as string,
            error: err.message,
            severity: 'error'
          });
        });
      }
    }

    return errors;
  }

  static validateDuplicateIds(rows: DataRow[], entityType: EntityType): ValidationError[] {
    const errors: ValidationError[] = [];
    const idField = entityType === 'clients' ? 'ClientID' : 
                   entityType === 'workers' ? 'WorkerID' : 'TaskID';
    
    const seenIds = new Set<string>();
    const duplicateIds = new Set<string>();

    rows.forEach((row, index) => {
      const id = String(row[idField] || '');
      if (id && seenIds.has(id)) {
        duplicateIds.add(id);
      }
      seenIds.add(id);
    });

    rows.forEach((row, index) => {
      const id = String(row[idField] || '');
      if (duplicateIds.has(id)) {
        errors.push({
          rowIndex: index,
          column: idField,
          error: `Duplicate ID: ${id}`,
          severity: 'error'
        });
      }
    });

    return errors;
  }

  static validateMalformedLists(rows: DataRow[], entityType: EntityType): ValidationError[] {
    const errors: ValidationError[] = [];

    rows.forEach((row, index) => {
      if (entityType === 'clients' && row.AttributesJSON) {
        try {
          const value = String(row.AttributesJSON);
          if (value.trim().startsWith('{') || value.trim().startsWith('[')) {
            JSON.parse(value);
          }
        } catch {
          errors.push({
            rowIndex: index,
            column: 'AttributesJSON',
            error: 'Invalid JSON format',
            severity: 'error'
          });
        }
      }

      if (entityType === 'workers' && row.AvailableSlots) {
        try {
          const value = String(row.AvailableSlots);
          if (value.trim().startsWith('[')) {
            const parsed = JSON.parse(value);
            if (!Array.isArray(parsed)) {
              throw new Error('Not an array');
            }
          }
        } catch {
          errors.push({
            rowIndex: index,
            column: 'AvailableSlots',
            error: 'Invalid array format. Expected JSON array like [1,2,3]',
            severity: 'error'
          });
        }
      }

      const listFields = {
        clients: ['RequestedTaskIDs'],
        workers: ['Skills'],
        tasks: ['RequiredSkills']
      };

      listFields[entityType]?.forEach(field => {
        if (row[field]) {
          const value = String(row[field]);
          if (value.includes(',,') || value.startsWith(',') || value.endsWith(',')) {
            errors.push({
              rowIndex: index,
              column: field,
              error: 'Malformed comma-separated list',
              severity: 'warning'
            });
          }
        }
      });
    });

    return errors;
  }

  static validateOutOfRangeValues(rows: DataRow[], entityType: EntityType): ValidationError[] {
    const errors: ValidationError[] = [];

    rows.forEach((row, index) => {
      if (entityType === 'clients' && row.PriorityLevel !== undefined && row.PriorityLevel !== null && row.PriorityLevel !== '') {
        const priority = Number(row.PriorityLevel);
        if (isNaN(priority) || priority < 1 || priority > 5) {
          errors.push({
            rowIndex: index,
            column: 'PriorityLevel',
            error: 'PriorityLevel must be between 1-5',
            severity: 'error'
          });
        }
      }

      if (entityType === 'workers' && row.MaxLoadPerPhase !== undefined && row.MaxLoadPerPhase !== null && row.MaxLoadPerPhase !== '') {
        const load = Number(row.MaxLoadPerPhase);
        if (isNaN(load) || load < 1 || load > 10) {
          errors.push({
            rowIndex: index,
            column: 'MaxLoadPerPhase',
            error: 'MaxLoadPerPhase must be between 1-10',
            severity: 'warning'
          });
        }
      }

      if (entityType === 'tasks' && row.Duration !== undefined && row.Duration !== null && row.Duration !== '') {
        const duration = Number(row.Duration);
        if (isNaN(duration) || duration < 1) {
          errors.push({
            rowIndex: index,
            column: 'Duration',
            error: 'Duration must be at least 1',
            severity: 'error'
          });
        }
      }

      if (entityType === 'tasks' && row.MaxConcurrent !== undefined && row.MaxConcurrent !== null && row.MaxConcurrent !== '') {
        const concurrent = Number(row.MaxConcurrent);
        if (isNaN(concurrent) || concurrent < 1 || concurrent > 100) {
          errors.push({
            rowIndex: index,
            column: 'MaxConcurrent',
            error: 'MaxConcurrent must be between 1-100',
            severity: 'warning'
          });
        }
      }
    });

    return errors;
  }

  static validateBrokenJSON(rows: DataRow[], entityType: EntityType): ValidationError[] {
    const errors: ValidationError[] = [];

    if (entityType === 'clients') {
      rows.forEach((row, index) => {
        if (row.AttributesJSON) {
          const value = String(row.AttributesJSON).trim();
          
          if (!value) return;
          
          const looksLikeJSON = value.startsWith('{') || value.startsWith('[');
          
          if (looksLikeJSON) {
            try {
              JSON.parse(value);
            } catch {
              errors.push({
                rowIndex: index,
                column: 'AttributesJSON',
                error: 'Invalid JSON syntax',
                severity: 'error'
              });
            }
          } else {
            if (value.length > 0) {
              errors.push({
                rowIndex: index,
                column: 'AttributesJSON',
                error: 'AttributesJSON should contain valid JSON format (e.g., {"key": "value"}). Plain text found instead.',
                severity: 'warning'
              });
            }
          }
        }
      });
    }

    return errors;
  }

  static validateUnknownReferences(
    clientRows: DataRow[], 
    taskRows: DataRow[], 
    workerRows: DataRow[]
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    
    const validTaskIds = new Set(
      taskRows.map(task => String(task.TaskID)).filter(id => id)
    );

    clientRows.forEach((client, index) => {
      if (client.RequestedTaskIDs) {
        const taskIds = String(client.RequestedTaskIDs)
          .split(',')
          .map(id => id.trim())
          .filter(id => id);

        taskIds.forEach(taskId => {
          if (!validTaskIds.has(taskId)) {
            errors.push({
              rowIndex: index,
              column: 'RequestedTaskIDs',
              error: `Unknown task reference: ${taskId}`,
              severity: 'error'
            });
          }
        });
      }
    });

    return errors;
  }

  static validateSkillCoverage(taskRows: DataRow[], workerRows: DataRow[]): ValidationError[] {
    const errors: ValidationError[] = [];

    const availableSkills = new Set<string>();
    workerRows.forEach(worker => {
      if (worker.Skills) {
        String(worker.Skills)
          .split(',')
          .map(skill => skill.trim().toLowerCase())
          .forEach(skill => availableSkills.add(skill));
      }
    });

    taskRows.forEach((task, index) => {
      if (task.RequiredSkills) {
        const requiredSkills = String(task.RequiredSkills)
          .split(',')
          .map(skill => skill.trim().toLowerCase());

        const uncoveredSkills = requiredSkills.filter(skill => 
          !availableSkills.has(skill)
        );

        if (uncoveredSkills.length > 0) {
          errors.push({
            rowIndex: index,
            column: 'RequiredSkills',
            error: `No workers have skills: ${uncoveredSkills.join(', ')}`,
            severity: 'warning'
          });
        }
      }
    });

    return errors;
  }

  static validatePhaseSlotSaturation(taskRows: DataRow[], workerRows: DataRow[]): ValidationError[] {
    const errors: ValidationError[] = [];

    const phaseDemand: Record<number, number> = {};
    
    taskRows.forEach((task, index) => {
      if (task.PreferredPhases && task.Duration) {
        try {
          const duration = Number(task.Duration);
          const phasesStr = String(task.PreferredPhases);
          let phases: number[] = [];

          if (phasesStr.includes('[')) {
            phases = JSON.parse(phasesStr);
          } else if (phasesStr.includes('-')) {
            const [start, end] = phasesStr.split('-').map(p => parseInt(p.trim()));
            for (let i = start; i <= end; i++) {
              phases.push(i);
            }
          } else {
            phases = [parseInt(phasesStr)];
          }

          phases.forEach(phase => {
            phaseDemand[phase] = (phaseDemand[phase] || 0) + duration;
          });
        } catch {
          errors.push({
            rowIndex: index,
            column: 'PreferredPhases',
            error: 'Invalid phase format',
            severity: 'error'
          });
        }
      }
    });

    const phaseCapacity: Record<number, number> = {};
    
    workerRows.forEach(worker => {
      if (worker.AvailableSlots && worker.MaxLoadPerPhase) {
        try {
          const maxLoad = Number(worker.MaxLoadPerPhase);
          const slotsStr = String(worker.AvailableSlots);
          let slots: number[] = [];

          if (slotsStr.includes('[')) {
            slots = JSON.parse(slotsStr);
          }

          slots.forEach(slot => {
            phaseCapacity[slot] = (phaseCapacity[slot] || 0) + maxLoad;
          });
        } catch {
        }
      }
    });

    Object.entries(phaseDemand).forEach(([phase, demand]) => {
      const capacity = phaseCapacity[parseInt(phase)] || 0;
      if (demand > capacity) {
        taskRows.forEach((task, index) => {
          if (task.PreferredPhases) {
            const phasesStr = String(task.PreferredPhases);
            if (phasesStr.includes(phase)) {
              errors.push({
                rowIndex: index,
                column: 'PreferredPhases',
                error: `Phase ${phase} is oversaturated: ${demand} demand vs ${capacity} capacity`,
                severity: 'warning'
              });
            }
          }
        });
      }
    });

    return errors;
  }
}

export const validateAllRows = (
  rows: DataRow[], 
  entityType: EntityType,
  allData?: { clients: DataRow[], workers: DataRow[], tasks: DataRow[] }
): ValidationError[] => {
  const errors: ValidationError[] = [];

  rows.forEach((row, index) => {
    errors.push(...DataValidator.validateRequiredFields(row, entityType, index));
  });

  errors.push(...DataValidator.validateDuplicateIds(rows, entityType));
  errors.push(...DataValidator.validateMalformedLists(rows, entityType));
  errors.push(...DataValidator.validateOutOfRangeValues(rows, entityType));
  errors.push(...DataValidator.validateBrokenJSON(rows, entityType));

  if (allData) {
    errors.push(...DataValidator.validateUnknownReferences(
      allData.clients, allData.tasks, allData.workers
    ));
    errors.push(...DataValidator.validateSkillCoverage(allData.tasks, allData.workers));
    errors.push(...DataValidator.validatePhaseSlotSaturation(allData.tasks, allData.workers));
  }

  return errors;
};

export const ValidationRules = {
  requiredFields: { 
    id: 'required-fields', 
    name: 'Required Fields', 
    description: 'Check for missing required columns',
    enabled: true
  },
  duplicateIds: { 
    id: 'duplicate-ids', 
    name: 'Duplicate IDs', 
    description: 'Detect duplicate entity IDs',
    enabled: true
  },
  malformedLists: { 
    id: 'malformed-lists', 
    name: 'Malformed Lists', 
    description: 'Validate comma-separated and JSON array formats',
    enabled: true
  },
  outOfRange: { 
    id: 'out-of-range', 
    name: 'Out-of-range Values', 
    description: 'Check for values outside expected ranges',
    enabled: true
  },
  brokenJson: { 
    id: 'broken-json', 
    name: 'Broken JSON', 
    description: 'Validate JSON syntax in AttributesJSON fields',
    enabled: true
  },
  unknownReferences: { 
    id: 'unknown-references', 
    name: 'Unknown References', 
    description: 'Check for references to non-existent entities',
    enabled: true
  },
  skillCoverage: { 
    id: 'skill-coverage', 
    name: 'Skill Coverage', 
    description: 'Verify tasks have workers with required skills',
    enabled: true
  },
  phaseSlotSaturation: { 
    id: 'phase-slot-saturation', 
    name: 'Phase Slot Saturation', 
    description: 'Check for phase oversubscription',
    enabled: true
  }
}; 