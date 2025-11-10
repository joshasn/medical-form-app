# 📚 Medical Form Application - Complete Documentation

**Version**: 2.0.0  
**Last Updated**: January 2025  
**Status**: Production Ready ✅

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Tools & Technologies](#tools--technologies)
3. [Architecture](#architecture)
4. [Features](#features)
5. [Key Components](#key-components)
6. [Field Mappings](#field-mappings)
7. [Usage Guide](#usage-guide)
8. [API Reference](#api-reference)
9. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

The Medical Form Application is a React-based web application designed for healthcare professionals to efficiently fill out CNESST (Commission des normes, de l'équité, de la santé et de la sécurité du travail) medical evaluation forms. The application provides an interactive form interface with voice transcription capabilities, automatic PDF field detection, and seamless data export to both PDF and JSON formats.

### Key Capabilities

- **Interactive Form Interface**: Progress bar navigation with section-based form completion
- **Voice Transcription**: Real-time speech-to-text for sections 7 and 8
- **PDF Integration**: Automatic field detection and filling from `Form_fillable.pdf`
- **Data Export**: Export to PDF and JSON with proper field mapping
- **Module-Based Physical Exam**: Dynamic table generation for physical examination modules
- **Sequelae Management**: Dynamic table for current sequelae with individual field mapping

---

## 🛠️ Tools & Technologies

### Core Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 19.2.0 | UI framework and component management |
| **React DOM** | 19.2.0 | DOM rendering |
| **React Scripts** | 5.0.1 | Build tooling and development server |

### PDF Processing

| Library | Version | Purpose |
|---------|---------|---------|
| **pdf-lib** | 1.17.1 | PDF manipulation, form filling, and table drawing |
| **pdfjs-dist** | 5.4.296 | PDF.js core library for PDF parsing |
| **react-pdf** | 10.2.0 | React wrapper for PDF.js (used in some components) |
| **pdfmake** | 0.2.20 | Installed but not actively used (alternative PDF generation) |

### UI & Styling

| Library | Version | Purpose |
|---------|---------|---------|
| **Tailwind CSS** | 3.4.18 | Utility-first CSS framework for styling |
| **Lucide React** | 0.548.0 | Icon library (FileText, Download, Trash2, Plus, etc.) |

### Speech Recognition

| Technology | Purpose |
|------------|---------|
| **Web Speech API** | Browser-native speech recognition for voice transcription |
| **SpeechRecognition** | Real-time speech-to-text conversion |

### Data Storage

| Technology | Purpose |
|------------|---------|
| **LocalStorage** | Template persistence (via TemplateService) |
| **Blob URLs** | Temporary PDF file URLs for display |

### Development Tools

| Tool | Version | Purpose |
|------|---------|---------|
| **Autoprefixer** | 10.4.21 | CSS vendor prefixing |
| **PostCSS** | 8.5.6 | CSS processing |
| **Jest** | (via react-scripts) | Testing framework |
| **Testing Library** | Various | React component testing utilities |

---

## 🏗️ Architecture

### File Structure

```
medical-form-app/
├── public/
│   ├── Fillable_form.pdf          # Default fillable PDF template (currently loaded)
│   ├── Form.pdf                   # Alternative PDF template
│   ├── Form_filled.pdf            # Alternative PDF template
│   └── 204_MI_1-5.pdf            # Alternative PDF template
│
├── src/
│   ├── InteractivePDFForm.jsx     # Main application component (6,168 lines)
│   ├── pdfService.js              # PDF operations (detect, fill, draw tables)
│   ├── services/
│   │   ├── templateService.js     # Template CRUD operations
│   │   └── jsonImportService.js   # JSON import and field mapping
│   ├── App.js                     # Application entry point
│   ├── index.js                   # React DOM rendering
│   └── InteractivePDFForm.css    # Component-specific styles
│
├── package.json                   # Dependencies and scripts
├── README.md                      # Basic project documentation
└── DOCUMENTATION.md               # This file
```

### Data Flow

```
1. Application Loads
   ↓
2. Default PDF Loaded (Form_filled.pdf)
   ↓
3. PDF Fields Detected (pdfService.detectPdfFields)
   ↓
4. Form Data State Initialized
   ↓
5. User Interaction:
   - Fill form fields → Update formData state
   - Voice recording → Update formData + transcript arrays
   - Module selection → Update moduleData state
   ↓
6. Export Actions:
   - Download PDF → transformFormDataToPdfFields → fillPdfForm → Download
   - Save JSON → transformFormDataToPdfFields → JSON.stringify → Download
```

### State Management

The application uses React hooks for state management:

- **useState**: Form data, PDF state, UI state, recording state
- **useRef**: DOM references, file inputs, accumulated text tracking
- **useCallback**: Memoized functions (handleInputChange, recording handlers)
- **useMemo**: Computed values (fieldMapping, sections array)
- **useEffect**: Side effects (PDF loading, template loading, state synchronization)

---

## ✨ Features

### 1. Progress Bar Navigation

- **Visual Progress Bar**: Shows current section and completion status
- **Section Navigation**: Numbered buttons to jump between sections
- **Section Validation**: Validates all fields before allowing progression (currently disabled for free navigation - users can access any section)
- **13 Sections Total**: 
  1. Worker Information (Renseignements sur le travailleur)
  2. Doctor Information (Renseignements sur le médecin)
  3. Mandate (Mandat de l'évaluation)
  4. Identification (Age, dominance, employment)
  5. Antécédents (History)
  6. Medication (Médication)
  7. Historique de faits et évolution (History of facts and evolution)
  8. Questionnaire subjectif (Subjective questionnaire)
  9. Examen Physique (Physical Exam)
  10. Examens paracliniques (Paraclinical Exams)
  11. Conclusion
  12. Séquelles (Sequelae)
  13. Signature

### 2. Voice Transcription

- **Sections 7 & 8**: Voice recording available for "Historique de faits et évolution" and "Questionnaire subjectif"
- **Real-time Display**: Shows transcript as you speak
- **Transcript Panel**: Left panel displays timestamped transcript entries
- **Language Selection**: French (France/Canada) and English (US/Canada)
- **Continuous Recording**: Automatically restarts to prevent 6-second timeout
- **Confidence Filtering**: Filters out low-confidence interim results
- **Text Splitting (Section 7)**: When `historiqueFaits` reaches character limit, voice automatically continues to "Suite" field (`historiqueFaitsContinue`)
- **Text Merging**: When space becomes available in `historiqueFaits`, text from "Suite" field automatically merges back

### 3. PDF Field Detection & Mapping

- **Automatic Detection**: Detects all form fields in the PDF on load
- **Default PDF**: Uses `Fillable_form.pdf` as the default PDF (can be changed to `Form.pdf` or `Form_filled.pdf`)
- **PDF Viewer Toggle**: Button to show/hide PDF viewer (default: visible)
- **Field Type Detection**: Identifies text fields, dropdowns, checkboxes
- **Dynamic Mapping**: Maps React form field names to PDF field names using `useMemo` computed `fieldMapping`
- **Fuzzy Matching**: Handles variations in field names (case-insensitive, partial matches)
- **Field Display**: Toggle checkbox "Afficher les champs PDF" to show PDF field names next to form inputs
- **Module Field Mapping**: Special handling for Section 9 module data with extensive pattern matching and French translations

### 4. Section 4: Identification

- **Age Field**: Maps to `age_identification` PDF field
- **Worker Information**: Name, first name, health insurance number, birth date, address, phone, file number
- **Event Dates**: Origin event date and recurrence date

### 5. Section 5: Antécédents (History)

- **Custom Layout**: Matches PDF design exactly
- **Multiple Sub-sections**: Medical, Surgical, Lesion, Accidents (CNESST, SAAQ, Autres), Allergies, Substance use
- **Field Mapping**:
  - SAAQ → `accidentsAutres` (PDF field)
  - Autres → `autres` (PDF field)
  - CNESST → `accidentsCNESST` (PDF field)
- **Dropdown Fields**: 
  - `tabac` (Tobacco): Dropdown with options, maps to PDF field `tabac`
  - `cannabis`: Dropdown with options, maps to PDF field `cannabis`
  - `alcool` (Alcohol): Dropdown with options, maps to PDF field `alcool`
- **Data Capture**: Selected dropdown values are properly captured and exported to both PDF and JSON

### 6. Section 9: Examen Physique (Physical Exam)

- **Module Selection**: Checkboxes for different body parts/assessments
- **Quick Templates**: Pre-filled templates for common examinations
  - **Behavior**: Clicking a template selects its modules; clicking again unselects it
  - **Replacement (Not Merge)**: Selecting a different template replaces the previous selection (doesn't merge)
  - **Templates Available**:
    - Upper Extremity (Cervical Spine, Muscle Atrophy)
    - Upper Proximal (Cervical Spine, Muscle Atrophy)
    - Upper Distal (Cervical Spine, Muscle Atrophy)
    - Lower Proximal (Lumbar Spine, Muscle Atrophy)
    - Lower Distal (Lumbar Spine, Muscle Atrophy)
    - Bilateral Upper (Cervical Spine, Muscle Atrophy)
    - Bilateral Lower (Lumbar Spine, Muscle Atrophy)
- **General Observation**: Weight, height, dominance (`dominance_examen` PDF field), general observation textarea
- **Dynamic Tables**: Conditionally rendered tables based on selected modules:
  - Cervical Spine (Range of Motion, Palpation, Inspection, Radicular Maneuvers)
  - Shoulders (Range of Motion, Palpation, Inspection, Rotator Cuff Tests, Biceps Tests, Instability Tests, Labrum Tests, AC Joint Tests)
  - Elbows (Range of Motion, Palpation, Inspection, Ligamentous Tests)
  - Wrists/Hands (Range of Motion, Palpation, Inspection, Specialized Tests)
  - Lumbar Spine (Range of Motion, Palpation, Inspection, Radicular Maneuvers)
  - Hips (Range of Motion, Palpation, Inspection, Specialized Tests including Trendelenburg)
  - Knees (Range of Motion, Palpation, Inspection, Ligamentous Tests, Meniscal Tests, Patellar Tests)
  - Feet/Ankles (Range of Motion, Palpation, Inspection, Tendon Tests)
  - Muscle Atrophy (with auto-calculated differences)
  - Neurovascular Assessment (Forces, Sensibilities, Reflexes, Pulses)
- **Field Labels**: All table fields display short descriptive labels for clarity
- **PDF Field Mapping**: Module data is processed using `processModuleDataToPdfFieldsJSON` function, which:
  - Maps nested module data (e.g., `hips.specializedTests.trendelenburg.right`) to PDF field names
  - Uses fuzzy matching to find appropriate PDF fields
  - Processes all modules with data (not just selected ones) when downloading PDF after JSON import
- **Table Data Export**: All module table data is properly linked to PDF fields when downloading PDF or saving as JSON

### 7. Section 10: Examens Paracliniques (Paraclinical Exams)

- **Field Mapping**: `paraclinicalExams` maps to `examensParacliniques` PDF field
- **Textarea Input**: Single textarea for all paraclinical exam information

### 8. Section 12: Séquelles (Sequelae)

- **Current Sequelae Table**: Dynamic 2-row table with:
  - Code (maps to `code_de_sequelle1`, `sequelaCode1`, etc.)
  - Description (maps to `sequelaDescription1`, etc.)
  - Percentage (maps to `pourcentage1`, `sequelaPercentage1`, etc.)
- **Previous Sequelae**: Textarea for previous sequelae
- **Other Bilateral Deficits**: Textarea for other deficits
- **NB (Note Bene)**: Editable textarea
- **Export Mapping**: Maps table rows to individual PDF fields

### 7. Data Export

#### PDF Export
- **Field Transformation**: Converts form field names to PDF field names
- **Direct Field Preservation**: Preserves fields that already match PDF field names
- **Module Data Processing**: Uses `processModuleDataToPdfFieldsJSON` to process all modules with data (including imported JSON data)
- **Table Drawing**: Draws physical exam tables on PDF using pdf-lib primitives (currently only Range of Motion for Cervical Spine and Lumbar Spine)
- **Character Encoding**: Normalizes text for WinAnsi encoding compatibility
- **PDF Flattening**: When downloading, PDF is flattened (form fields converted to static text) - PDF remains editable when viewing, only flattened on download
- **Flattening Control**: Uses `shouldFlatten` parameter - `true` for downloads, `false` for viewing

#### JSON Export
- **Same Transformation**: Uses same field mapping as PDF export
- **Filtered Output**: Only includes PDFTextField types
- **Section 12 Fields**: Always included even if not detected as PDFTextField
- **Internal Fields Filtered**: Removes internal sequela form fields (`sequelaCode*`, etc.)

### 9. JSON Import

- **File Upload**: Select JSON file to import
- **Field Mapping Preview**: Shows mapped and unmapped fields
- **Automatic Mapping**: Uses fuzzy matching to map JSON keys to form fields
- **Section 12 Parsing**: Parses combined format strings and individual fields
- **Module Data Parsing**: Automatically parses fallback module data fields (e.g., `hipsspecializedTeststrendelenburgright`) and reconstructs nested structure
- **Module Auto-Selection**: Automatically selects modules that have imported data
- **PDF Auto-fill**: Automatically fills PDF after import (without flattening, so PDF remains editable)
- **Data Validation**: Skips suspicious data (e.g., long trendelenburg text that might be from wrong field)

---

## 🔧 Key Components

### InteractivePDFForm.jsx

**Main Component** (6,168 lines)

#### State Variables

```javascript
// Form Data
formData: Object with all form fields
currentSequelae: Array of sequelae table rows
moduleData: Object with data for each physical exam module
selectedModules: Object with boolean flags for module selection

// PDF State
pdfFile: File object
pdfBytes: Uint8Array
originalPdfBytes: Uint8Array (for refilling)
pdfUrl: String (blob URL or public path)
detectedFields: Object (PDF field names and positions)
detectedFieldTypes: Object (PDF field types)

// UI State
currentSection: Number (0-12)
completedSections: Set
showFieldMapping: Boolean
showFormView: Boolean (currently unused - side-by-side layout)

// Recording State
isRecording: Object { evolution: Boolean, subjective: Boolean }
recognitionInstances: Object { evolution: SpeechRecognition, subjective: SpeechRecognition }
recordingStartTime: Object { evolution: Number, subjective: Number }
recognitionLanguage: String ('fr-FR', 'fr-CA', 'en-US', 'en-CA')

// Template & JSON Import
templates: Array
selectedTemplate: String
showTemplateDialog: Boolean
showJSONDialog: Boolean
jsonMappingPreview: Object
```

#### Key Functions

- `handleInputChange(field, value)`: Updates form data state
- `handleStartRecording(sectionKey, fieldName)`: Starts speech recognition
- `handleStopRecording(sectionKey)`: Stops speech recognition
- `handleFillAndDownload()`: Fills PDF and triggers download
- `handleExportToJSON()`: Exports form data as JSON
- `handleJSONUpload(event)`: Handles JSON file upload
- `handleApplyJSONData()`: Applies imported JSON data to form
- `transformFormDataToPdfFields(data)`: Transforms form field names to PDF field names
- `isSectionCompleted(sectionIndex)`: Validates if section is complete
- `navigateToSection(index)`: Navigates to specific section
- `updateModuleData(moduleKey, path, value)`: Updates nested module data
- `getModuleData(moduleKey, path)`: Retrieves nested module data

### pdfService.js

**PDF Operations Service** (614 lines)

#### Functions

- `detectPdfFields(pdfBytes)`: Detects all form fields in PDF
  - Returns: Array of field objects with name, type, position
  - Uses: pdf-lib PDFDocument.load

- `fillPdfForm(pdfBytes, formData, moduleData, selectedModules)`: Fills PDF with form data
  - Parameters:
    - `pdfBytes`: Uint8Array of PDF
    - `formData`: Object with field values
    - `moduleData`: Object with physical exam module data
    - `selectedModules`: Object with selected module flags
  - Returns: Uint8Array of filled PDF
  - Features:
    - Case-insensitive field matching
    - Partial field name matching
    - Text normalization for WinAnsi encoding
    - Table drawing for Range of Motion tables

- `drawTable(page, data, x, y, options)`: Draws a table on PDF page
  - Parameters:
    - `page`: PDFPage object
    - `data`: Array of row objects
    - `x, y`: Starting coordinates
    - `options`: Table styling options
  - Uses: pdf-lib primitives (rectangles, lines, text)

- `normalizeTextForWinAnsi(text)`: Normalizes text for PDF encoding
  - Removes/replaces problematic Unicode characters
  - Handles combining diacritical marks

### services/templateService.js

**Template Management Service**

#### Functions

- `saveTemplate(name, description, pdfName, fields)`: Saves template to localStorage
- `getAllTemplates()`: Retrieves all templates
- `getTemplate(id)`: Retrieves specific template
- `deleteTemplate(id)`: Deletes template
- `exportTemplate(id)`: Exports template as JSON
- `importTemplate(templateData)`: Imports template from JSON

### services/jsonImportService.js

**JSON Import Service**

#### Functions

- `mapJSONToFields(jsonData, pdfFields)`: Maps JSON keys to PDF fields
  - Uses fuzzy matching (exact, case-insensitive, partial)
  - Returns mapping object with matched and unmatched fields

---

## 🗺️ Field Mappings

### Form Field → PDF Field Mapping

The `fieldMapping` object (computed with `useMemo`) maps React form field names to PDF field names:

```javascript
// Section A: Worker Information
'workerName' → PDF field matching /nom/i or 'nom'
'workerFirstName' → PDF field matching /prenom/i or 'prenom'
'healthInsuranceNo' → PDF field matching /assurance|maladie/i
'birthDate' → PDF field matching /naissance|date/i
// ... etc

// Section 5: Antécédents
'saaqHistory' → 'accidentsAutres' (SAAQ maps to accidentsAutres)
'accidentsAutres' → 'accidentsAutres' (direct PDF field)
'otherHistory' → 'autres' (Autres maps to autres)
'autres' → 'autres' (direct PDF field)
'cnesstHistory' → 'accidentsCNESST'
'accidentsCNESST' → 'accidentsCNESST'

// Section 7 & 8
'historiqueFaits' → PDF field matching /historique|evolution/i
'subjectiveQuestionnaire' → PDF field matching /questionnaire|subjectif/i

// Section 9: Physical Exam
'weight' → PDF field matching /poids/i
'height' → PDF field matching /taille/i
'physicalDominance' → PDF field matching /dominance/i
'physicalExam' → PDF field matching /examen.*physique/i

// Section 12: Sequelae
'currentSequelae' → PDF field matching /sequelle.*actuel/i
'previousSequelae' → PDF field matching /sequelle.*anterieur/i
'otherBilateralDeficits' → PDF field matching /deficit.*bilateral/i
'noteBene' → PDF field matching /nb|note.*bene/i
```

### Section 12 Table Field Mapping

For the Current Sequelae table, each row maps to individual PDF fields:

```javascript
// Row 1
sequelaCode1 → code_de_sequelle1, sequelaCode1, codeDeSequelle1, etc.
sequelaDescription1 → sequelaDescription1, description_de_sequelle1, etc.
sequelaPercentage1 → pourcentage1, sequelaPercentage1, pourcentage_de_sequelle1, etc.

// Row 2
sequelaCode2 → code_de_sequelle2, sequelaCode2, etc.
sequelaDescription2 → sequelaDescription2, etc.
sequelaPercentage2 → pourcentage2, sequelaPercentage2, etc.

// Primary fields (for first row)
sequelaCode → code_de_sequelle, sequelaCode (without number)
sequelaPercentage → pourcentage, sequelaPercentage (without number)
```

---

## 📖 Usage Guide

### Starting the Application

```bash
cd medical-form-app
npm install
npm start
```

The application will open at `http://localhost:3000`

### Basic Workflow

1. **PDF Loads Automatically**: `Fillable_form.pdf` loads on application start
2. **Fill Form Sections**: Navigate through sections using progress bar
3. **Voice Recording** (Sections 7 & 8):
   - Click "Enregistrer" to start recording
   - Speak into microphone
   - Text appears in real-time
   - Click "Arrêter" to stop
4. **Physical Exam** (Section 9):
   - Select modules via checkboxes
   - Fill in tables for selected modules
   - Tables will be drawn on PDF when downloaded
5. **Sequelae** (Section 12):
   - Fill in current sequelae table (2 rows)
   - Add previous sequelae, other deficits, and NB
6. **Export**:
   - Click "Télécharger PDF" to download filled PDF
   - Click "Sauvegarder (JSON)" to download JSON file

### Voice Recording

1. **Select Language**: Choose from dropdown (French/English variants)
2. **Start Recording**: Click "Enregistrer" button
3. **Speak**: Your words appear in real-time in the text area
4. **View Transcript**: Left panel shows timestamped transcript entries
5. **Stop Recording**: Click "Arrêter" button
6. **Clear Transcript**: Click trash icon to clear transcript
7. **Text Splitting (Section 7)**: When `historiqueFaits` field reaches character limit, voice automatically continues to "Suite" field
8. **Text Merging**: When space becomes available in `historiqueFaits`, text from "Suite" field automatically merges back

**Note**: Recording automatically restarts if browser stops temporarily (prevents 6-second timeout)

### Physical Exam Module Selection

1. **Select Modules**: Check boxes for body parts you want to examine
2. **Quick Templates**: Click template buttons to pre-fill common values
   - **Toggle Behavior**: Clicking a template again unselects it
   - **Replacement**: Selecting a different template replaces the previous selection (doesn't merge)
3. **Fill Tables**: For each selected module, fill in:
   - Palpation/Inspection (with "Normal" buttons and PDF field mapping display)
   - Range of Motion (right/left, active/passive) with labels
   - Ligamentous Tests with labels
   - Specialized Tests (e.g., Trendelenburg for Hips) with labels
4. **Muscle Atrophy**: Difference fields auto-calculate
5. **General Observation**: Fill in weight, height, dominance, and general observation
6. **Field Mapping Display**: All fields show their associated PDF field names when "Afficher les champs PDF" is enabled

### Section 12: Sequelae

1. **Current Sequelae Table**:
   - Always shows 2 rows
   - Fill in Code, Description, Percentage for each row
   - Fields map to individual PDF fields (e.g., `code_de_sequelle1`, `pourcentage1`)
2. **Previous Sequelae**: Textarea for previous sequelae
3. **Other Bilateral Deficits**: Textarea for other deficits
4. **NB**: Editable textarea for additional notes

### Export Options

#### PDF Export
- Fills all PDF fields with form data
- Processes all modules with data (including imported JSON data, not just selected modules)
- Draws physical exam tables (Range of Motion for Cervical Spine and Lumbar Spine)
- Normalizes text for WinAnsi encoding
- **Flattens PDF**: Converts form fields to static text (non-editable) when downloading
- Downloads as `medical-examination-filled.pdf`
- **Viewing vs Download**: PDF remains editable when viewing; only flattened on download

#### JSON Export
- Exports form data with PDF field names as keys
- Filters to only PDFTextField types
- Includes Section 12 fields even if not detected as PDFTextField
- Downloads as `form-data.json`

### JSON Import

1. **Upload JSON**: Click "Importer JSON" button
2. **Select File**: Choose JSON file with form data
3. **Review Mapping**: Preview dialog shows:
   - ✅ Mapped fields (green)
   - ⚠️ Unmapped fields (yellow)
4. **Apply Data**: Click "Apply to Form" to populate fields
5. **PDF Auto-fills**: PDF automatically updates with imported data

**JSON Format Example**:
```json
{
  "nom": "Doe",
  "prenom": "John",
  "date_de_naissance": "1985-01-01",
  "accidentsAutres": "SAAQ accident info",
  "autres": "Other accident info",
  "code_de_sequelle1": "103 499",
  "description_de_sequelle1": "Atteintes des tissus mous",
  "pourcentage1": "2"
}
```

---

## 🔌 API Reference

### InteractivePDFForm Component

#### Props
None (self-contained component)

#### State Management

**Form Data Structure**:
```typescript
interface FormData {
  // Section A: Worker Information
  workerName: string;
  workerFirstName: string;
  healthInsuranceNo: string;
  birthDate: string;
  address: string;
  phone: string;
  workerFileNo: string;
  originEventDate: string;
  recurrenceDate: string;
  
  // Section B: Doctor Information
  doctorName: string;
  doctorFirstName: string;
  licenseNo: string;
  doctorAddress: string;
  doctorPhone: string;
  doctorEmail: string;
  
  // Section C: Report Sections
  mandate: string;
  acceptedDiagnostics: string;
  interviewModality: string;
  age: string;
  dominance: string;
  employment: string;
  
  // Section 5: Antécédents
  medicalHistory: string;
  surgicalHistory: string;
  lesionHistory: string;
  cnesstHistory: string;
  saaqHistory: string;
  otherHistory: string;
  accidentsAutres: string;
  autres: string;
  allergies: string;
  tobacco: string;
  cannabis: string;
  alcohol: string;
  
  // Section 6: Medication
  currentMedication: string;
  
  // Section 7: Historique
  historiqueFaits: string;
  historiqueFaitsTranscript: Array<{timestamp: string, text: string}>;
  
  // Section 8: Questionnaire
  subjectiveQuestionnaire: string;
  subjectiveQuestionnaireTranscript: Array<{timestamp: string, text: string}>;
  
  // Section 9: Physical Exam
  weight: string;
  height: string;
  physicalDominance: string;
  physicalExam: string;
  
  // Section 10: Paraclinical
  paraclinicalExams: string;
  
  // Section 11: Conclusion
  summary: string;
  
  // Section 12: Sequelae
  previousSequelae: string;
  otherBilateralDeficits: string;
  noteBene: string;
  
  // Signature
  doctorSignature: string;
  doctorTitle: string;
}
```

### pdfService Functions

#### `detectPdfFields(pdfBytes: Uint8Array): Promise<Array>`

Detects all form fields in a PDF document.

**Parameters**:
- `pdfBytes`: Uint8Array of PDF file

**Returns**: Promise resolving to array of field objects:
```typescript
{
  name: string;           // PDF field name
  type: string;            // PDF field type (PDFTextField, PDFDropdown, etc.)
  position?: {            // Field position (if available)
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
  }
}
```

#### `fillPdfForm(pdfBytes: Uint8Array, formData: Object, moduleData?: Object, selectedModules?: Object): Promise<Uint8Array>`

Fills a PDF form with form data.

**Parameters**:
- `pdfBytes`: Uint8Array of original PDF
- `formData`: Object with field name → value mappings
- `moduleData`: (Optional) Object with physical exam module data
- `selectedModules`: (Optional) Object with selected module flags

**Returns**: Promise resolving to Uint8Array of filled PDF

**Features**:
- Case-insensitive field matching
- Partial field name matching
- Text normalization for WinAnsi encoding
- Table drawing for Range of Motion tables

#### `drawTable(page: PDFPage, data: Array, x: number, y: number, options?: Object): void`

Draws a table on a PDF page.

**Parameters**:
- `page`: PDFPage object from pdf-lib
- `data`: Array of row objects with column values
- `x`: Starting X coordinate
- `y`: Starting Y coordinate
- `options`: (Optional) Table styling options

**Example**:
```javascript
const tableData = [
  { col1: 'Flexion', col2: '45°', col3: '50°' },
  { col1: 'Extension', col2: '30°', col3: '35°' }
];
drawTable(page, tableData, 100, 200, {
  header: true,
  columnWidths: [100, 50, 50]
});
```

---

## 🐛 Troubleshooting

### Voice Recording Issues

**Problem**: Recording stops after 6 seconds  
**Solution**: The app automatically restarts recording. If it doesn't, check browser console for errors.

**Problem**: Words not appearing in text box  
**Solution**: 
- Check microphone permissions in browser settings
- Try different language (French vs English)
- Check browser console for recognition errors

**Problem**: Inaccurate transcription  
**Solution**:
- Select appropriate language variant (fr-FR, fr-CA, en-US, en-CA)
- Speak clearly and at moderate pace
- Check microphone quality

### PDF Export Issues

**Problem**: PDF fields not filled  
**Solution**:
- Check browser console for field mapping errors
- Verify PDF field names match detected fields
- Use "Afficher les champs PDF" checkbox to see field mappings

**Problem**: WinAnsi encoding error  
**Solution**: Text normalization is automatic. If errors persist, check for special characters.

**Problem**: Tables not appearing in PDF  
**Solution**: 
- Ensure modules are selected (checkboxes checked)
- Currently only Range of Motion tables for Cervical Spine and Lumbar Spine are drawn
- Check browser console for drawing errors

### JSON Import/Export Issues

**Problem**: Fields not mapping correctly  
**Solution**:
- Check JSON keys match PDF field names (case-insensitive)
- Review mapping preview dialog before applying
- Check browser console for mapping logs

**Problem**: Section 12 data not importing  
**Solution**:
- Ensure JSON has fields like `code_de_sequelle1`, `pourcentage1`, etc.
- Check combined format strings are properly formatted
- Review parsing logs in browser console

### General Issues

**Problem**: Form fields not updating  
**Solution**: 
- Check browser console for React errors
- Verify field names match formData keys
- Clear browser cache and reload

**Problem**: PDF not loading  
**Solution**:
- Check `public/Form_filled.pdf` exists
- Check browser console for fetch errors
- Verify PDF file is not corrupted

---

## 📝 Notes

### Current Limitations

1. **Table Drawing**: Only Range of Motion tables for Cervical Spine and Lumbar Spine are drawn on PDF
2. **Module Tables**: Other module tables (Shoulders, Elbows, etc.) are displayed in UI but not drawn on PDF yet (data is exported to PDF fields)
3. **PDF Viewer**: Currently uses iframe for PDF display (doesn't use react-pdf in main component)
4. **Template System**: Template save/load exists but not fully integrated with current form structure
5. **PDF Flattening**: Only occurs on download, not when viewing (by design)

### Future Enhancements

- [ ] Draw all physical exam module tables on PDF
- [ ] Add more quick templates for physical exam
- [ ] Improve table drawing for other module types
- [ ] Add undo/redo functionality
- [ ] Add form validation with error messages
- [ ] Add auto-save functionality
- [ ] Add print preview
- [ ] Add multi-language support for UI
- [ ] Add accessibility improvements

---

## 📞 Support

For issues or questions:
1. Check browser console for errors
2. Review this documentation
3. Check field mappings using "Afficher les champs PDF" checkbox
4. Verify JSON format matches expected structure

---

## 📄 License

MIT License

---

**Documentation Version**: 2.0.0  
**Last Updated**: January 2025  
**Maintained By**: Development Team

