# Data Alchemist – AI-Enabled Resource-Allocation Configurator

Welcome to **Data Alchemist**, a Next.js web app built for Digitalyz to replace chaotic spreadsheet workflows with an intelligent, AI-powered resource allocation tool.

This app lets users upload messy CSV or XLSX files for **clients**, **workers**, and **tasks**, validates them, enables inline edits, and generates clean, export-ready data along with JSON rules configurations.

---

## 📂 Sample Data

> All sample files are in the [`/samples`](./samples) folder.

---

## ✅ Validation Rules

* Missing required columns
* Duplicate IDs
* Malformed lists (non-numeric slots)
* Out-of-range values (PriorityLevel 1–5)
* Broken JSON in attributes
* Unknown references (invalid TaskIDs)
* Circular co-run groups
* Conflicting phase-window constraints
* Overloaded workers
* Phase-slot saturation
* Skill-coverage matrix
* Max-concurrency feasibility

**Errors are shown inline** with highlighted cells and a detailed validation summary.

---

## 🚀 Fully Implemented Features

### **Milestone 1: Data Ingestion & Validation**

* ✅ **CSV/XLSX Support** – Complete with `papaparse` and `xlsx`
* ✅ **AI Header Mapping** – Full Gemini integration with fallbacks
* ✅ **Data Grid** – Editable Material-UI DataGrid
* ✅ **Core Validations (8/8)** – All required validations implemented
* ✅ **AI Validations** – Dynamic rule generation and suggestions
* ✅ **Natural Language Search** – Complete AI-powered query system

### **Milestone 2: Rules & Prioritization**

* ✅ **Rule Types** – co-run, load-limit, phase-window, pattern-match
* ✅ **Natural Language to Rules** – Complete AI conversion system
* ✅ **Priority Weights** – Full slider interface with categories
* ✅ **Export System** – Complete CSV/JSON export with metadata

### **Milestone 3: AI Enhancement (90%)**

* ✅ **Natural Language Modification** – Complete AI data modification
* ✅ **AI Error Correction** – Full error analysis and correction
* ✅ **Deep Dataset Analysis** – Comprehensive data quality assessment
* ✅ **AI Rule Recommendations** – Basic recommendations system
* ⚠️ **Enhanced Rule Recommendations with Business Impact** – *Not fully implemented* due to exhausted API credits and inability to generate new API keys because of a Google AI Studio error.

  * See **`error.jpg`** in the root directory for details.
  * Will complete and deploy once a new API key is obtained.
  * Meanwhile, please run the app locally and try

---

## 🖥️ Run the App Locally

1. Clone the repo
2. Create a `.env` file containing:

   ```env
   GEMINI_API_KEY=your_api_key
   ```
3. Install dependencies:

   ```bash
   npm install
   ```
4. Start the development server:

   ```bash
   npm run dev
   ```
5. Access the app on **`http://localhost:3000`**

---
