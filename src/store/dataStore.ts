import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { 
  EntityType, 
  EntityData, 
  ValidationError, 
  DataRow, 
  ErrorCorrectionBatch, 
  DataModification 
} from '../types';
import { validateAllRows } from '../utils/validation';

import {
  DataModificationCommand,
  DataModificationHistory,
  DatasetAnalysis,
  AnalysisFinding
} from '../types';

const initialEntityData: EntityData = {
  headers: [],
  rows: [],
  validationErrors: [],
  fileName: undefined,
};

interface DataStore {
  clients: EntityData;
  workers: EntityData;
  tasks: EntityData;
  activeTab: 'upload' | 'rules' | 'ai-enhancement' | 'export';
  isLoading: boolean;
}

interface Milestone3State {
  modificationCommands: DataModificationCommand[];
  modificationHistory: DataModificationHistory[];
  isProcessingModification: boolean;
  
  errorCorrectionBatches: ErrorCorrectionBatch[];
  isGeneratingCorrections: boolean;
  
  datasetAnalyses: DatasetAnalysis[];
  currentAnalysis: DatasetAnalysis | null;
  isPerformingAnalysis: boolean;
  
  showModificationPanel: boolean;
  showErrorCorrectionPanel: boolean;
  showAnalysisPanel: boolean;
}

interface DataStoreActions {
  setActiveTab: (tab: 'upload' | 'rules' | 'ai-enhancement' | 'export') => void;
  setLoading: (loading: boolean) => void;
  setEntityData: (entity: EntityType, data: EntityData) => void;
  updateCell: (entity: EntityType, rowIndex: number, column: string, value: string | number) => void;
  addValidationError: (entity: EntityType, error: ValidationError) => void;
  clearValidationErrors: (entity: EntityType) => void;
  resetEntityData: (entity: EntityType) => void;
  resetAllData: () => void;
  triggerCrossEntityValidation: () => void;
  
  addModificationCommand: (command: DataModificationCommand) => void;
  applyModificationCommand: (commandId: string) => void;
  rejectModificationCommand: (commandId: string) => void;
  undoModification: (historyId: string) => void;
  clearModificationHistory: () => void;
  setProcessingModification: (loading: boolean) => void;
  
  addErrorCorrectionBatch: (batch: ErrorCorrectionBatch) => void;
  applyErrorCorrections: (batchId: string, selectedSuggestionIds: string[]) => void;
  rejectErrorCorrectionBatch: (batchId: string) => void;
  setGeneratingCorrections: (loading: boolean) => void;
  
  addDatasetAnalysis: (analysis: DatasetAnalysis) => void;
  setCurrentAnalysis: (analysis: DatasetAnalysis | null) => void;
  setPerformingAnalysis: (loading: boolean) => void;
  clearAnalysisHistory: () => void;
  
  toggleModificationPanel: () => void;
  toggleErrorCorrectionPanel: () => void;
  toggleAnalysisPanel: () => void;
}

export const useDataStore = create<DataStore & Milestone3State & DataStoreActions>((set, get) => ({
  clients: initialEntityData,
  workers: initialEntityData,
  tasks: initialEntityData,
  activeTab: 'upload',
  isLoading: false,

  modificationCommands: [],
  modificationHistory: [],
  isProcessingModification: false,
  errorCorrectionBatches: [],
  isGeneratingCorrections: false,
  datasetAnalyses: [],
  currentAnalysis: null,
  isPerformingAnalysis: false,
  showModificationPanel: false,
  showErrorCorrectionPanel: false,
  showAnalysisPanel: false,

  setActiveTab: (tab) => set({ activeTab: tab }),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  setEntityData: (entity, data) => {
    set((state) => ({
      [entity]: data,
    }));
    
    setTimeout(() => {
      get().triggerCrossEntityValidation();
    }, 100);
  },
  
  updateCell: (entity, rowIndex, column, value) => {
    set((state) => {
      const entityData = state[entity];
      const updatedRows = [...entityData.rows];
      updatedRows[rowIndex] = {
        ...updatedRows[rowIndex],
        [column]: value,
      };
      
      const validationErrors = validateAllRows(updatedRows, entity);
      
      return {
        [entity]: {
          ...entityData,
          rows: updatedRows,
          validationErrors,
        },
      };
    });

    setTimeout(() => {
      get().triggerCrossEntityValidation();
    }, 100);
  },
  
  addValidationError: (entity, error) => set((state) => {
    const entityData = state[entity];
    return {
      [entity]: {
        ...entityData,
        validationErrors: [...entityData.validationErrors, error],
      },
    };
  }),
  
  clearValidationErrors: (entity) => set((state) => {
    const entityData = state[entity];
    return {
      [entity]: {
        ...entityData,
        validationErrors: [],
      },
    };
  }),
  
  resetEntityData: (entity) => set((state) => ({
    [entity]: initialEntityData,
  })),
  
  resetAllData: () => set({
    clients: initialEntityData,
    workers: initialEntityData,
    tasks: initialEntityData,
    activeTab: 'upload',
    isLoading: false,
    modificationCommands: [],
    modificationHistory: [],
    errorCorrectionBatches: [],
    datasetAnalyses: [],
    currentAnalysis: null,
  }),

  triggerCrossEntityValidation: () => {
    const state = get();
    const { clients, workers, tasks } = state;

    if (clients.rows.length > 0 && workers.rows.length > 0 && tasks.rows.length > 0) {
      const allData = {
        clients: clients.rows,
        workers: workers.rows,
        tasks: tasks.rows,
      };

      const entities: EntityType[] = ['clients', 'workers', 'tasks'];
      
      entities.forEach(entityType => {
        const entityData = state[entityType];
        const validationErrors = validateAllRows(entityData.rows, entityType, allData);
        
        set((currentState) => ({
          [entityType]: {
            ...currentState[entityType],
            validationErrors,
          },
        }));
      });
    }
  },

  
  addModificationCommand: (command) => set((state) => ({
    modificationCommands: [...state.modificationCommands, command],
  })),

  applyModificationCommand: (commandId) => {
    const state = get();
    const command = state.modificationCommands.find(cmd => cmd.id === commandId);
    
    if (!command) return;

    const { entityType, suggestedChanges } = command;
    const entityData = state[entityType];
    const updatedRows = [...entityData.rows];

    suggestedChanges.forEach(modification => {
      if (updatedRows[modification.rowIndex]) {
        updatedRows[modification.rowIndex] = {
          ...updatedRows[modification.rowIndex],
          [modification.column]: modification.suggestedValue,
        };
      }
    });

    const historyEntry: DataModificationHistory = {
      id: `history-${Date.now()}`,
      command: command.command,
      modifications: suggestedChanges,
      appliedAt: new Date().toISOString(),
      canUndo: true,
    };

    set((state) => ({
      [entityType]: {
        ...entityData,
        rows: updatedRows,
        validationErrors: validateAllRows(updatedRows, entityType),
      },
      modificationCommands: state.modificationCommands.map(cmd =>
        cmd.id === commandId ? { ...cmd, status: 'applied' as const } : cmd
      ),
      modificationHistory: [...state.modificationHistory, historyEntry],
    }));

    console.log(`Applied modification to ${entityType}:`, {
      command: command.command,
      rowsModified: suggestedChanges.length,
      totalRows: updatedRows.length
    });

    setTimeout(() => {
      get().triggerCrossEntityValidation();
    }, 100);
  },

  rejectModificationCommand: (commandId) => set((state) => ({
    modificationCommands: state.modificationCommands.map(cmd =>
      cmd.id === commandId ? { ...cmd, status: 'rejected' as const } : cmd
    ),
  })),

  undoModification: (historyId) => {
    console.log('Undo modification:', historyId);
  },

  clearModificationHistory: () => set({
    modificationHistory: [],
  }),

  setProcessingModification: (loading) => set({
    isProcessingModification: loading,
  }),

  addErrorCorrectionBatch: (batch) => set((state) => ({
    errorCorrectionBatches: [...state.errorCorrectionBatches, batch],
  })),

  applyErrorCorrections: (batchId, selectedSuggestionIds) => {
    const state = get();
    const batch = state.errorCorrectionBatches.find(b => b.id === batchId);
    
    if (!batch) return;

    const { entityType } = batch;
    const entityData = state[entityType];
    const updatedRows = [...entityData.rows];

    batch.suggestions
      .filter(suggestion => selectedSuggestionIds.includes(suggestion.id))
      .forEach(suggestion => {
        if (updatedRows[suggestion.rowIndex]) {
          updatedRows[suggestion.rowIndex] = {
            ...updatedRows[suggestion.rowIndex],
            [suggestion.column]: suggestion.suggestedValue,
          };
        }
      });

    set((state) => ({
      [entityType]: {
        ...entityData,
        rows: updatedRows,
        validationErrors: validateAllRows(updatedRows, entityType),
      },
      errorCorrectionBatches: state.errorCorrectionBatches.map(b =>
        b.id === batchId ? { ...b, status: 'applied' as const } : b
      ),
    }));

    console.log(`Applied error corrections to ${entityType}:`, {
      correctionsApplied: selectedSuggestionIds.length,
      totalRows: updatedRows.length
    });

    setTimeout(() => {
      get().triggerCrossEntityValidation();
    }, 100);
  },

  rejectErrorCorrectionBatch: (batchId) => set((state) => ({
    errorCorrectionBatches: state.errorCorrectionBatches.map(b =>
      b.id === batchId ? { ...b, status: 'rejected' as const } : b
    ),
  })),

  setGeneratingCorrections: (loading) => set({
    isGeneratingCorrections: loading,
  }),

  addDatasetAnalysis: (analysis) => set((state) => ({
    datasetAnalyses: [...state.datasetAnalyses, analysis],
    currentAnalysis: analysis,
  })),

  setCurrentAnalysis: (analysis) => set({
    currentAnalysis: analysis,
  }),

  setPerformingAnalysis: (loading) => set({
    isPerformingAnalysis: loading,
  }),

  clearAnalysisHistory: () => set({
    datasetAnalyses: [],
    currentAnalysis: null,
  }),

  toggleModificationPanel: () => set((state) => ({
    showModificationPanel: !state.showModificationPanel,
  })),

  toggleErrorCorrectionPanel: () => set((state) => ({
    showErrorCorrectionPanel: !state.showErrorCorrectionPanel,
  })),

  toggleAnalysisPanel: () => set((state) => ({
    showAnalysisPanel: !state.showAnalysisPanel,
  })),
})); 