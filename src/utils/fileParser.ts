import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { DataRow, EntityData, EntityType } from '../types';
import { mapHeadersWithOpenAI } from './geminiservice';
import { validateAllRows } from './validation';

const COLUMN_MAPPINGS: Record<EntityType, Record<string, string>> = {
  clients: {
    'clientid': 'client_id',
    'CLIENTID': 'client_id',
    'ClientID': 'client_id',
    'client_id': 'client_id',
    'CLIENT_ID': 'client_id',
    'id': 'client_id',
    'ID': 'client_id',
    
    'clientname': 'name',
    'CLIENTNAME': 'name',
    'ClientName': 'name',
    'client_name': 'name',
    'CLIENT_NAME': 'name',
    'name': 'name',
    'Name': 'name',
    'NAME': 'name',
    
    'email': 'email',
    'Email': 'email',
    'EMAIL': 'email',
    'client_email': 'email',
    'CLIENT_EMAIL': 'email',
    'clientemail': 'email',
    'CLIENTEMAIL': 'email',
    
    'priority': 'priority_level',
    'Priority': 'priority_level', 
    'PRIORITY': 'priority_level',
    'prioritylevel': 'priority_level',
    'PRIORITYLEVEL': 'priority_level',
    'PriorityLevel': 'priority_level',
    'priority_level': 'priority_level',
    'PRIORITY_LEVEL': 'priority_level',
    
    'group': 'group_tag',
    'Group': 'group_tag',
    'GROUP': 'group_tag',
    'grouptag': 'group_tag',
    'GROUPTAG': 'group_tag',
    'GroupTag': 'group_tag',
    'group_tag': 'group_tag',
    'GROUP_TAG': 'group_tag',
    
    'attributes': 'attributes_json',
    'Attributes': 'attributes_json',
    'ATTRIBUTES': 'attributes_json',
    'attributesjson': 'attributes_json',
    'ATTRIBUTESJSON': 'attributes_json',
    'AttributesJson': 'attributes_json',
    'attributes_json': 'attributes_json',
    'ATTRIBUTES_JSON': 'attributes_json',
    
    'requested_tasks': 'requested_tasks',
    'REQUESTEDTASKS': 'requested_tasks',
    'RequestedTasks': 'requested_tasks',
    'REQUESTED_TASKS': 'requested_tasks',
  },
  workers: {
    'workerid': 'worker_id',
    'WORKERID': 'worker_id',
    'WorkerID': 'worker_id',
    'worker_id': 'worker_id',
    'WORKER_ID': 'worker_id',
    'id': 'worker_id',
    'ID': 'worker_id',
    
    'workername': 'name',
    'WORKERNAME': 'name',
    'WorkerName': 'name',
    'worker_name': 'name',
    'WORKER_NAME': 'name',
    'name': 'name',
    'Name': 'name',
    'NAME': 'name',
    
    'email': 'email',
    'Email': 'email',
    'EMAIL': 'email',
    'worker_email': 'email',
    'WORKER_EMAIL': 'email',
    'workeremail': 'email',
    'WORKEREMAIL': 'email',
    
    'skills': 'skills',
    'Skills': 'skills',
    'SKILLS': 'skills',
    'worker_skills': 'skills',
    'WORKER_SKILLS': 'skills',
    'workerskills': 'skills',
    'WORKERSKILLS': 'skills',
  },
  tasks: {
    'taskid': 'task_id',
    'TASKID': 'task_id',
    'TaskID': 'task_id',
    'task_id': 'task_id',
    'TASK_ID': 'task_id',
    'id': 'task_id',
    'ID': 'task_id',
    'TASK ID': 'task_id',
    
    'title': 'title',
    'Title': 'title',
    'TITLE': 'title',
    'task_title': 'title',
    'TASK_TITLE': 'title',
    'tasktitle': 'title',
    'TASKTITLE': 'title',
    'taskname': 'title',
    'TASKNAME': 'title',
    'TaskName': 'title',
    'task_name': 'title',
    'TASK_NAME': 'title',
    'name': 'title',
    'Name': 'title',
    'NAME': 'title',

    'clientid': 'client_id',
    'CLIENTID': 'client_id',
    'ClientID': 'client_id',
    'client_id': 'client_id',
    'CLIENT_ID': 'client_id',
    
    'category': 'category',
    'Category': 'category',
    'CATEGORY': 'category',
    
    'duration': 'duration',
    'Duration': 'duration',
    'DURATION': 'duration',
    
    'required_skills': 'required_skills',
    'REQUIRED_SKILLS': 'required_skills',
    'requiredskills': 'required_skills',
    'REQUIREDSKILLS': 'required_skills',
    'RequiredSkills': 'required_skills',
    
    'startdate': 'start_date',
    'STARTDATE': 'start_date',
    'StartDate': 'start_date',
    'start_date': 'start_date',
    'START_DATE': 'start_date',
    
    'enddate': 'end_date',
    'ENDDATE': 'end_date',
    'EndDate': 'end_date',
    'end_date': 'end_date',
    'END_DATE': 'end_date',
  },
};

const normalizeColumnNames = (headers: string[], entityType?: EntityType): { normalizedHeaders: string[], columnMapping: Record<string, string> } => {
  if (!entityType) {
    return { normalizedHeaders: headers, columnMapping: {} };
  }
  
  const mapping = COLUMN_MAPPINGS[entityType];
  const columnMapping: Record<string, string> = {};
  const normalizedHeaders: string[] = [];
  
  headers.forEach(header => {
    const normalizedHeader = mapping[header] || header;
    normalizedHeaders.push(normalizedHeader);
    columnMapping[header] = normalizedHeader;
  });
  
  return { normalizedHeaders, columnMapping };
};

const normalizeRowData = (rows: DataRow[], columnMapping: Record<string, string>): DataRow[] => {
  return rows.map(row => {
    const normalizedRow: DataRow = {};
    Object.keys(row).forEach(key => {
      const normalizedKey = columnMapping[key] || key;
      normalizedRow[normalizedKey] = row[key];
    });
    return normalizedRow;
  });
};

export const parseCSV = (file: File, entityType?: EntityType): Promise<EntityData> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        try {
          const data = await processRawData(
            results.data as DataRow[],
            results.meta.fields || [],
            file.name,
            entityType
          );
          resolve(data);
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(new Error(`CSV parsing error: ${error.message}`));
      },
    });
  });
};

export const parseXLSX = (file: File, entityType?: EntityType): Promise<EntityData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];
        
        if (jsonData.length === 0) {
          throw new Error('Empty spreadsheet');
        }
        

        const headers = jsonData[0];
        const rawRows = jsonData.slice(1).map(row => {
          const rowData: DataRow = {};
          headers.forEach((header, index) => {
            rowData[header] = row[index] || null;
          });
          return rowData;
        });
        
        const processedData = await processRawData(
          rawRows,
          headers,
          file.name,
          entityType
        );
        
        resolve(processedData);
      } catch (error) {
        reject(new Error(`XLSX parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('File reading error'));
    };
    
    reader.readAsArrayBuffer(file);
  });
};


const processRawData = async (
  rawRows: DataRow[],
  originalHeaders: string[],
  fileName: string,
  entityType?: EntityType
): Promise<EntityData> => {
  const filteredRows = rawRows.filter(row => 
    Object.values(row).some(value => value !== null && value !== '')
  );
  
  if (filteredRows.length === 0) {
    return {
      headers: originalHeaders,
      rows: [],
      validationErrors: [],
      fileName,
      originalHeaders,
      headerMapping: {}
    };
  }
  
  let processedHeaders = originalHeaders;
  let processedRows = filteredRows;
  let headerMapping: Record<string, string> = {};
  
  if (entityType && originalHeaders.length > 0) {
    try {
      console.log(`Using Gemini API to map headers for ${entityType}...`);
      
      const mappingResult = await mapHeadersWithOpenAI(originalHeaders, entityType);
      
      console.log(`Header mapping completed with ${(mappingResult.confidence * 100).toFixed(1)}% confidence`);
      console.log('Mappings:', mappingResult.mappings);
      
      if (mappingResult.unmappedHeaders.length > 0) {
        console.warn('Unmapped headers:', mappingResult.unmappedHeaders);
        console.log('Suggestions:', mappingResult.suggestions);
      }
      
      headerMapping = mappingResult.mappings;
      
      processedHeaders = originalHeaders.map(header => 
        mappingResult.mappings[header] || header
      );
      
      processedRows = filteredRows.map(row => {
        const mappedRow: DataRow = {};
        originalHeaders.forEach(originalHeader => {
          const standardizedHeader = mappingResult.mappings[originalHeader] || originalHeader;
          mappedRow[standardizedHeader] = row[originalHeader];
        });
        return mappedRow;
      });
      
    } catch (error) {
      console.error('Header mapping failed, using original headers:', error);
    }
  }
  
  const validationErrors = entityType 
    ? validateAllRows(processedRows, entityType)
    : [];
  
  return {
    headers: processedHeaders,
    rows: processedRows,
    validationErrors,
    fileName,
    originalHeaders,
    headerMapping
  };
};


export const parseFile = async (file: File, entityType?: EntityType): Promise<EntityData> => {
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  
  console.log(`Parsing ${file.name} as ${entityType || 'unknown'} entity...`);
  
  switch (fileExtension) {
    case 'csv':
      return parseCSV(file, entityType);
    case 'xlsx':
    case 'xls':
      return parseXLSX(file, entityType);
    default:
      throw new Error(`Unsupported file format: ${fileExtension}`);
  }
}; 