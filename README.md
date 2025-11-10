# 📄 Medical Form Application - CNESST Medical Evaluation Form

An interactive React application designed for healthcare professionals to efficiently fill out CNESST (Commission des normes, de l'équité, de la santé et de la sécurité du travail) medical evaluation forms. Features include voice transcription, automatic PDF field detection, progress-based navigation, and seamless data export to both PDF and JSON formats.

## ✨ Features

### 🎯 Core Functionality
- ✅ **Progress Bar Navigation** - Visual progress indicator with 13 organized sections
- ✅ **Automatic PDF Loading** - Default PDF (`Form.pdf`) loads on startup
- ✅ **PDF Field Detection** - Automatically detects and maps all PDF form fields
- ✅ **Voice Transcription** - Real-time speech-to-text for Sections 7 & 8 (Web Speech API)
- ✅ **Section-Based Form** - Organized into 13 logical sections matching the CNESST form structure
- ✅ **JSON Import/Export** - Import data from JSON files and export filled forms as JSON
- ✅ **PDF Export** - Download filled PDFs with flattened form fields (non-editable)

### 🛠️ Advanced Features
- **Module-Based Physical Exam** - Dynamic tables for different body parts (Section 9)
- **Quick Templates** - Pre-filled templates for common physical exam scenarios
- **Text Splitting** - Automatic text continuation to "Suite" field when character limit reached
- **Fuzzy Field Matching** - Automatically maps JSON keys to PDF field names with variations
- **PDF Viewer Toggle** - Show/hide PDF viewer alongside form
- **Field Mapping Display** - Toggle to show PDF field names next to form inputs
- **Sequelae Management** - Dynamic 2-row table for current sequelae with individual field mapping

---

## 🚀 Getting Started

### Prerequisites
- Node.js 14+ and npm
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation

```bash
# Navigate to project directory
cd medical-form-app

# Install dependencies
npm install

# Start development server
npm start
```

The app will open at `http://localhost:3000`

---

## 📖 User Guide

### Basic Workflow

1. **PDF Loads Automatically** - `Form.pdf` loads on application start
2. **Navigate Sections** - Use the progress bar at the top to jump between 13 sections
3. **Fill Form Fields** - Enter data directly into form fields
4. **Voice Recording** (Sections 7 & 8) - Click "Enregistrer" to start voice transcription
5. **Physical Exam** (Section 9) - Select modules and fill in examination tables
6. **Export Data** - Download as PDF or save as JSON

### 13 Form Sections

1. **Worker Information** - Name, address, phone, health insurance, etc.
2. **Doctor Information** - Doctor details, license, contact info
3. **Mandate** - Evaluation mandate with checkboxes
4. **Identification** - Age, dominance, employment status
5. **Antécédents** - Medical history, accidents, allergies, substance use
6. **Medication** - Current medications
7. **Historique de faits et évolution** - History of facts and evolution (with voice recording)
8. **Questionnaire subjectif** - Subjective questionnaire (with voice recording)
9. **Examen Physique** - Physical examination with module-based tables
10. **Examens paracliniques** - Paraclinical exams
11. **Conclusion** - Summary and conclusions
12. **Séquelles** - Sequelae (current, previous, other deficits, NB)
13. **Signature** - Doctor signature and title

### Voice Transcription (Sections 7 & 8)

1. **Select Language** - Choose from dropdown (French/English variants)
2. **Start Recording** - Click "Enregistrer" button
3. **Speak** - Your words appear in real-time
4. **View Transcript** - Left panel shows timestamped entries
5. **Stop Recording** - Click "Arrêter" button
6. **Text Splitting** - When field reaches character limit, voice continues to "Suite" field automatically

### Physical Exam (Section 9)

1. **Select Modules** - Check boxes for body parts to examine
2. **Quick Templates** - Click template buttons for common examination patterns
3. **Fill Tables** - For each selected module, fill in:
   - Palpation/Inspection
   - Range of Motion (right/left, active/passive)
   - Ligamentous Tests
   - Specialized Tests (e.g., Trendelenburg for Hips)
4. **General Observation** - Weight, height, dominance, general notes

### JSON Import

1. **Upload JSON** - Click "Importer JSON" button
2. **Select File** - Choose JSON file with form data
3. **Review Mapping** - Preview dialog shows mapped and unmapped fields
4. **Apply Data** - Click "Apply to Form" to populate all fields
5. **PDF Auto-fills** - PDF automatically updates with imported data

**JSON Format Example**:
```json
{
  "nom": "Doe",
  "prenom": "John",
  "age_identification": "45",
  "accidentsAutres": "SAAQ accident info",
  "autres": "Other accident info",
  "code_de_sequelle1": "103 499",
  "description_de_sequelle1": "Atteintes des tissus mous",
  "pourcentage1": "2"
}
```

### Export Options

#### Download PDF
- Click "Télécharger PDF (Flattened)" button in PDF viewer
- PDF is filled with all form data
- Form fields are flattened (converted to static text)
- Downloads as `medical-examination-filled.pdf`

#### Save as Word
- Click on the print icon in the PDF Viewer
- Destination -> saved as PDF
- Right click on the saved PDF and open it as DOCX
  
#### Save as JSON
- Click "Sauvegarder (JSON)" button
- Exports all form data with PDF field names as keys
- Downloads as `form-data.json`

---

## 🏗️ Architecture

### Technology Stack

- **React 19** - UI framework and component management
- **pdf-lib** - PDF manipulation, form filling, and flattening
- **pdfjs-dist** - PDF.js core library for PDF parsing
- **react-pdf** - React wrapper for PDF.js (used in some components)
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Icon library
- **Web Speech API** - Browser-native speech recognition
- **LocalStorage** - Template persistence (via TemplateService)

### File Structure

```
medical-form-app/
├── public/
│   ├── Form.pdf                   # Default PDF template (loaded on startup)
│   ├── Fillable_form.pdf          # Alternative fillable PDF template
│   └── Form_filled.pdf            # Alternative filled PDF template
│
├── src/
│   ├── InteractivePDFForm.jsx     # Main application component (8,350 lines)
│   ├── pdfService.js              # PDF operations (detect, fill, flatten)
│   ├── services/
│   │   ├── templateService.js     # Template CRUD operations
│   │   └── jsonImportService.js   # JSON import and field mapping
│   ├── App.js                     # Application entry point
│   └── index.js                   # React DOM rendering
│
├── DOCUMENTATION.md               # Complete technical documentation
├── GITHUB_SETUP.md                # GitHub publishing guide
└── README.md                      # This file
```

### Data Flow

```
1. Application Loads → Default PDF (Form.pdf) loads
2. PDF Fields Detected → Automatic field detection and mapping
3. User Interaction:
   - Fill form fields → Update formData state
   - Voice recording → Update formData + transcript arrays
   - Module selection → Update moduleData state
4. Export Actions:
   - Download PDF → processModuleDataToPdfFieldsJSON → fillPdfForm (flattened) → Download
   - Save JSON → processModuleDataToPdfFieldsJSON → JSON.stringify → Download
```

---

## 🔧 Key Features Explained

### PDF Field Detection

The application automatically detects all form fields in the PDF on load using `pdfService.detectPdfFields()`. Fields are mapped to form inputs using fuzzy matching.

### Field Mapping

Form field names are dynamically mapped to PDF field names using a computed `fieldMapping` object. The mapping handles:
- Exact matches
- Case-insensitive matches
- Partial matches
- French/English variations

### Module Data Processing

Section 9 (Physical Exam) uses a sophisticated module data processing system:
- Nested data structure (e.g., `hips.specializedTests.trendelenburg.right`)
- Automatic PDF field matching using `processModuleDataToPdfFieldsJSON` function
- Processes all modules with data (not just selected ones) when exporting
- Handles fallback field formats from JSON import (e.g., `hipsspecializedTeststrendelenburgright`)
- Automatically selects modules when importing JSON data

### PDF Flattening

When downloading PDF:
- Form fields are filled with data
- PDF is flattened (form fields → static text)
- PDF becomes non-editable

When viewing PDF:
- PDF remains editable (not flattened)
- Allows for corrections and re-filling

---

## 🧪 Testing

### Test JSON Import/Export

1. Fill out some form fields manually
2. Click **"Sauvegarder (JSON)"** to export
3. Clear the form
4. Click **"Importer JSON"** and select the exported JSON file
5. Verify all fields populate correctly
6. Check that PDF viewer also updates with imported data

### Test Voice Transcription

1. Navigate to Section 7 or 8
2. Select language from dropdown
3. Click **"Enregistrer"** and speak
4. Verify text appears in real-time
5. Check transcript panel shows entries
6. Stop recording and verify text is saved

### Test Physical Exam Modules

1. Navigate to Section 9
2. Select a module (e.g., "Hips")
3. Fill in some table fields
4. Click **"Sauvegarder (JSON)"** to export
5. Verify module data is included in JSON export
6. Import JSON and verify module data is restored

---

## 🐛 Troubleshooting

### PDF Not Loading
- **Issue**: "Failed to load PDF file"
- **Solution**: Check browser console, ensure `Form.pdf` exists in `public/` folder

### Voice Recording Not Working
- **Issue**: Recording stops after 6 seconds or words not appearing
- **Solution**: 
  - Check microphone permissions in browser settings
  - Try different language variant
  - Check browser console for recognition errors
  - The app automatically restarts recording, but check for errors

### JSON Import Not Working
- **Issue**: Fields not populating correctly
- **Solution**: 
  - Check JSON format matches expected structure
  - Review mapping preview dialog before applying
  - Check browser console for mapping logs
  - Ensure JSON keys match PDF field names (case-insensitive)

### PDF Export Issues
- **Issue**: PDF fields not filled or encoding errors
- **Solution**: 
  - Check browser console for field mapping errors
  - Verify PDF field names match detected fields
  - Use "Afficher les champs PDF" checkbox to see field mappings
  - Text normalization is automatic for WinAnsi encoding

### Module Data Not Exporting
- **Issue**: Section 9 table data not showing in PDF/JSON
- **Solution**: 
  - Ensure modules are selected (checkboxes checked) OR have data from JSON import
  - Check that data is entered in table fields
  - Verify module data processing logs in browser console
  - Note: Modules with data are automatically processed even if not manually selected

---

## 🔐 Security & Privacy

- ✅ **Client-Side Processing** - No data sent to servers
- ✅ **Local Storage** - Data stays in browser
- ✅ **No Tracking** - No analytics or third-party scripts
- ✅ **HIPAA Consideration** - Suitable for medical data (client-side only)

---

## 📝 Current Features Status

| Feature | Status | Notes |
|---------|--------|-------|
| Progress Bar Navigation | ✅ Complete | 13 sections with free navigation |
| PDF Field Detection | ✅ Complete | Automatic detection on load |
| Voice Transcription | ✅ Complete | Sections 7 & 8 with Web Speech API |
| Module-Based Physical Exam | ✅ Complete | Dynamic tables for all body parts with labels |
| JSON Import/Export | ✅ Complete | Fuzzy matching + module data parsing + auto-selection |
| PDF Export with Flattening | ✅ Complete | Flattened on download, editable when viewing |
| Section 12 Sequelae | ✅ Complete | 2-row table with individual field mapping |
| Text Splitting | ✅ Complete | Automatic continuation to "Suite" field |
| Dropdown Fields (Section 5) | ✅ Complete | Tabac, cannabis, alcool with proper PDF mapping |
| Section 4 Age Mapping | ✅ Complete | Maps to `age_identification` PDF field |

**Status**: **Production Ready** ✅

---

## 🚧 Future Enhancements

- [ ] Draw all physical exam module tables on PDF (currently only Range of Motion for Cervical/Lumbar Spine)
- [ ] Add more quick templates for physical exam
- [ ] Improve table drawing for other module types
- [ ] Add undo/redo functionality
- [ ] Add form validation with error messages
- [ ] Add auto-save functionality
- [ ] Add print preview
- [ ] Add multi-language support for UI
- [ ] Add accessibility improvements

---

## 📄 License

MIT License - See LICENSE file

---

## 👥 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Submit a pull request

---

## 📞 Support

For issues or questions:
- Check **Troubleshooting** section above
- Review browser console for errors
- Check **DOCUMENTATION.md** for complete technical documentation
- Use "Afficher les champs PDF" checkbox to see field mappings
- Verify JSON format matches expected structure

---

## 🎉 Acknowledgments

- **react-pdf** - PDF rendering
- **pdf-lib** - PDF manipulation
- **Tailwind CSS** - UI styling
- **Lucide** - Icon library

---

**Version**: 2.0.0  
**Last Updated**: January 2025  
**Status**: Production Ready ✅

---

## 🔄 Updating the Repository

To update your GitHub repository with changes:

```bash
# Navigate to project directory
cd medical-form-app

# Check what changed
git status

# Add all changes
git add .

# Commit with message
git commit -m "Description of your changes"

# Push to GitHub
git push origin main
```

For detailed instructions, see **[GITHUB_SETUP.md](./GITHUB_SETUP.md)**.

---

## 📚 Additional Documentation

- **[DOCUMENTATION.md](./DOCUMENTATION.md)** - Complete technical documentation with API reference, architecture details, and troubleshooting
- **[GITHUB_SETUP.md](./GITHUB_SETUP.md)** - Guide for publishing the application to GitHub
