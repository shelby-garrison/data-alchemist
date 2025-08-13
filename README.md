# Data Alchemist – AI-Enabled Resource-Allocation Configurator

Welcome to **Data Alchemist**, a Next.js web app built for Digitalyz to replace chaotic spreadsheet workflows with an intelligent, AI-powered resource allocation tool.

This app lets users upload messy CSV or XLSX files for **clients**, **workers**, and **tasks**, validates them, enables inline edits, and generates clean, export-ready data along with JSON rules configurations.


---

##  Sample Data

> All sample files are in the [`/samples`](./samples) folder.


---

##  Validation Rules

- Missing required columns
- Duplicate IDs
- Malformed lists (non-numeric slots)
- Out-of-range values (PriorityLevel 1–5)
- Broken JSON in attributes
- Unknown references (invalid TaskIDs)
- Circular co-run groups
- Conflicting phase-window constraints
- Overloaded workers
- Phase-slot saturation
- Skill-coverage matrix
- Max-concurrency feasibility

Errors are shown inline with highlighted cells and detailed validation summary.

---

## FULLY IMPLEMENTED FEATURES:

MILESTONE 1: Data Ingestion & Validation 
✅ CSV/XLSX Support: Complete with papaparse and xlsx
✅ AI Header Mapping: Full Gemini integration with fallbacks
✅ Data Grid: Editable Material-UI DataGrid
✅ Core Validations (8/8): All required validations implemented
✅ AI Validations: Dynamic rule generation and suggestions
✅ Natural Language Search: Complete AI-powered query system

MILESTONE 2: Rules & Prioritization 
✅ Rule Types : co-run, load-limit, phase-window, pattern-match
✅ Natural Language to Rules: Complete AI conversion system
✅ Priority Weights: Full slider interface with categories
✅ Export System: Complete CSV/JSON export with metadata

MILESTONE 3: AI Enhancement (90%)
✅ Natural Language Modification: Complete AI data modification
✅ AI Error Correction: Full error analysis and correction
✅ Deep Dataset Analysis: Comprehensive data quality assessment
✅ AI Rule Recommendations: Basic recommendations system

 Could not fully implement enhanced rule recommendations with business impact because I ran out of API credits and was unable to generate new API keys becaue of some internal Google AI Studio error and thus can't deploy it as well. Will do both once I get a new API key. 
 Check the error.jpg file in root directory.


## Run the app locally

1. Clone the repo
2. Create a `.env` file containing, GEMINI_API_KEY=your_api_key
3. Run `npm install` to install dependencies
4. Run `npm run dev` and access the app on port 3000.