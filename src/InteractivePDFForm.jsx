import React, { useState, useRef, useEffect, useCallback, useMemo, useContext } from 'react';
import { FileText, Download, Save, FolderOpen, FileJson, ChevronDown, ChevronUp, Trash2, Plus, Mic, MicOff } from 'lucide-react';
import { fillPdfForm, downloadPdf, detectPdfFields } from './pdfService';
import { TemplateService } from './services/templateService';
import { JSONImportService } from './services/jsonImportService';
import './InteractivePDFForm.css';

// Context to share field mapping and toggle
const MappingContext = React.createContext({ mapping: null, show: false });

// Memoized components defined outside to prevent recreation on every render
const SectionComponent = React.memo(({ title, sectionKey, children, isExpanded, onToggle }) => (
  <div className="mb-4 border border-gray-300 rounded-lg overflow-hidden bg-white shadow-sm">
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between p-4 bg-blue-600 text-white hover:bg-blue-700 transition-colors"
    >
      <span className="font-semibold text-lg">{title}</span>
      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
    </button>
    {isExpanded && (
      <div className="p-6">
        {children}
      </div>
    )}
  </div>
));
SectionComponent.displayName = 'SectionComponent';

// Optimized InputField - stable component reference
const InputField = React.memo(({ label, field, type = "text", placeholder = "", value, onChange, handleInputChange }) => {
  const inputValue = value !== undefined ? value : '';
  const handleChange = onChange || ((e) => handleInputChange(field, e.target.value));
  const { mapping, show } = useContext(MappingContext);
  const pdfFieldName = mapping ? (mapping[field] || field) : field;
  
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1">
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        {show && (
          <span className="text-[11px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
            PDF: {pdfFieldName}
          </span>
        )}
      </div>
      <input
        type={type}
        value={inputValue}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
});
InputField.displayName = 'InputField';

// Optimized TextAreaField - stable component reference with auto-expand
const TextAreaField = React.memo(({ label, field, rows = 4, placeholder = "", value, onChange, handleInputChange, className = "", autoExpand = false }) => {
  const textareaValue = value !== undefined ? value : '';
  const textareaRef = React.useRef(null);
  const handleChange = onChange || ((e) => handleInputChange(field, e.target.value));
  const { mapping, show } = useContext(MappingContext);
  const pdfFieldName = mapping ? (mapping[field] || field) : field;
  
  // Auto-expand functionality
  React.useEffect(() => {
    if (autoExpand && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const minHeight = rows * 24; // Approximate min height
      textareaRef.current.style.height = Math.max(scrollHeight, minHeight) + 'px';
    }
  }, [textareaValue, autoExpand, rows]);
  
  const handleTextareaChange = (e) => {
    handleChange(e);
    if (autoExpand && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current.style.height = 'auto';
        const scrollHeight = textareaRef.current.scrollHeight;
        const minHeight = rows * 24;
        textareaRef.current.style.height = Math.max(scrollHeight, minHeight) + 'px';
      }, 0);
    }
  };
  
  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700">
            {label}
          </label>
          {show && (
            <span className="text-[11px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
              PDF: {pdfFieldName}
            </span>
          )}
        </div>
      )}
      <textarea
        ref={textareaRef}
        value={textareaValue}
        onChange={handleTextareaChange}
        placeholder={placeholder}
        rows={rows}
        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${autoExpand ? 'overflow-y-auto resize-none' : ''} ${className}`}
        style={autoExpand ? { minHeight: `${rows * 24}px` } : {}}
      />
    </div>
  );
});
TextAreaField.displayName = 'TextAreaField';

// Table Input Field Component with PDF field mapping and short label
const TableInputField = React.memo(({ moduleName, fieldPath, value, onChange, showFieldMapping, label, type = "text" }) => {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <span className="text-[10px] font-medium text-gray-600">{label}</span>
      )}
      {showFieldMapping && (
        <span className="text-[9px] font-mono text-gray-400 bg-gray-100 px-1 py-0.5 rounded">
          {moduleName}.{fieldPath}
        </span>
      )}
      <input
        type={type}
        value={value || ''}
        onChange={onChange}
        placeholder={label || ''}
        step={type === "number" ? "0.1" : undefined}
        className="w-full px-2 py-1 border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
      />
    </div>
  );
});
TableInputField.displayName = 'TableInputField';

const InteractivePDFForm = () => {
  const [formData, setFormData] = useState({
    // Worker Information (Section A)
    workerName: '',
    workerFirstName: '',
    healthInsuranceNo: '',
    birthDate: '',
    address: '',
    phone: '',
    workerFileNo: '',
    originEventDate: '',
    recurrenceDate: '',
    
    // Doctor Information (Section B)
    doctorName: '',
    doctorFirstName: '',
    licenseNo: '',
    doctorAddress: '',
    doctorPhone: '',
    doctorEmail: '',
    
    // Report Sections (Section C)
    mandate: '',
    acceptedDiagnostics: '',
    interviewModality: '',
    age: '',
    dominance: '',
    employment: '',
    
    // Antécédents (Section 5)
    medicalHistory: '',
    antecedentsMedicaux: '',
    surgicalHistory: '',
    antecedenusChirurgicaux: '',
    lesionHistory: '',
    antecedentsLesion: '',
    cnesstHistory: '',
    accidentsCNESST: '',
    saaqHistory: '',
    accidentsSAAQ: '',
    otherHistory: '',
    accidentsAutres: '',
    autres: '', // Field for "Autres" in Section 5
    allergies: '',
    allergie: '',
    tobacco: '',
    tabac: '',
    cannabis: '',
    alcohol: '',
    alcool: '',
    
    // Medication (Section 6)
    currentMedication: '',
    
    // Historique (Section 7)
    historiqueFaits: '',
    historiqueFaitsContinue: '',
    historiqueFaitsTranscript: [],
    
    // Questionnaire (Section 8)
    subjectiveQuestionnaire: '',
    subjectiveQuestionnaireTranscript: [],
    
    // Examen Physique (Section 9)
    weight: '',
    height: '',
    physicalDominance: '',
    physicalExam: '',
    
    // Physical exam measurements table
    physicalExamMeasurements: [],
    
    // Examens paracliniques (Section 10)
    paraclinicalExams: '',
    
    // Conclusion (Section 11)
    summary: '',
    
    // Section 12: Sequelae
    previousSequelae: '',
    otherBilateralDeficits: '',
    noteBene: '',
    
    // Signature
    doctorSignature: 'Hugo Centomo, MD, PhD, FRCS ©',
    doctorTitle: '', // Empty by default - user should fill this
  });

  const [pdfFile, setPdfFile] = useState(null);
  const [originalPdfBytes, setOriginalPdfBytes] = useState(null); // Store original PDF for refilling
  const [pdfUrl, setPdfUrl] = useState(null);
  const [showPdfViewer, setShowPdfViewer] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectedFields, setDetectedFields] = useState(null);
  const [detectedFieldTypes, setDetectedFieldTypes] = useState(null);
  
  // Template Management
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  
  // JSON Import
  const [showJSONDialog, setShowJSONDialog] = useState(false);
  const [jsonMappingPreview, setJsonMappingPreview] = useState(null);
  
  // Expanded sections state for interactive form
  // Speech recognition state for sections 7 and 8
  const [isRecording, setIsRecording] = useState({ evolution: false, subjective: false });
  const [recognitionInstances, setRecognitionInstances] = useState({ evolution: null, subjective: null });
  const [recordingStartTime, setRecordingStartTime] = useState({ evolution: null, subjective: null });
  const [recognitionLanguage, setRecognitionLanguage] = useState('fr-FR'); // Default to French
  
  // Progress bar state - track current section and completion
  const [currentSection, setCurrentSection] = useState(0); // Index of current section
  const [completedSections, setCompletedSections] = useState(new Set()); // Set of completed section indices
  
  // Current sequelae entries state (for the table) - initialize with 2 empty rows
  const [currentSequelae, setCurrentSequelae] = useState([
    { id: 1, code: '', description: '', percentage: '' },
    { id: 2, code: '', description: '', percentage: '' }
  ]);
  
  // Module selection state for Section 9 (Examen Physique)
  const [selectedQuickTemplate, setSelectedQuickTemplate] = useState(null);
  const [selectedModules, setSelectedModules] = useState({
    generalObservation: true,
    cervicalSpine: false,
    shoulders: false,
    elbows: false,
    wristsHands: false,
    lumbarSpine: false,
    hips: false,
    knees: false,
    feetAnkles: false,
    muscleAtrophy: false,
    neurovascularAssessment: false
  });
  
  // Expanded modules state for accordion functionality
  const [expandedModules, setExpandedModules] = useState({
    generalObservation: true,
    cervicalSpine: false,
    shoulders: false,
    elbows: false,
    wristsHands: false,
    lumbarSpine: false,
    hips: false,
    knees: false,
    feetAnkles: false,
    muscleAtrophy: false,
    neurovascularAssessment: false
  });
  
  // Module data state - store data for each module
  const [moduleData, setModuleData] = useState({
    cervicalSpine: {
      palpation: '',
      inspection: '',
      rangeOfMotion: {
        flexion: '',
        extension: '',
        lateralFlexionL: '',
        lateralFlexionR: '',
        rotationL: '',
        rotationR: ''
      },
      radicularManeuvers: {
        lhermitteSign: { right: '', left: '' },
        spurlingManeuver: { right: '', left: '' },
        tractionManeuver: { right: '', left: '' }
      }
    },
    shoulders: {
      palpation: '',
      inspection: '',
      rangeOfMotion: {
        flexion: { rightActive: '', rightPassive: '', leftActive: '', leftPassive: '' },
        abduction: { rightActive: '', rightPassive: '', leftActive: '', leftPassive: '' },
        internalRotation: { rightActive: '', rightPassive: '', leftActive: '', leftPassive: '' },
        externalRotation: { rightActive: '', rightPassive: '', leftActive: '', leftPassive: '' },
        extension: { rightActive: '', rightPassive: '', leftActive: '', leftPassive: '' },
        adduction: { rightActive: '', rightPassive: '', leftActive: '', leftPassive: '' }
      },
      rotatorCuffTests: {
        neer: { right: '', left: '' },
        hawkins: { right: '', left: '' },
        jobe: { right: '', left: '' },
        bearHugger: { right: '', left: '' },
        bellyPress: { right: '', left: '' },
        liftOff: { right: '', left: '' },
        hornblower: { right: '', left: '' }
      },
      bicepsTests: {
        speed: { right: '', left: '' },
        yeagerson: { right: '', left: '' },
        bicipitalGroovePalpation: { right: '', left: '' }
      },
      instabilityTests: {
        sulcus: { right: '', left: '' },
        apprehension: { right: '', left: '' },
        relocation: { right: '', left: '' },
        jerkTest: { right: '', left: '' }
      },
      labrumTests: {
        oBrien: { right: '', left: '' },
        crankTest: { right: '', left: '' }
      },
      acJointTests: {
        acPalpation: { right: '', left: '' },
        crossArmTest: { right: '', left: '' }
      }
    },
    elbows: {
      palpation: '',
      inspection: '',
      rangeOfMotion: {
        flexion: { rightActive: '', rightPassive: '', leftActive: '', leftPassive: '' },
        extension: { rightActive: '', rightPassive: '', leftActive: '', leftPassive: '' },
        pronation: { rightActive: '', rightPassive: '', leftActive: '', leftPassive: '' },
        supination: { rightActive: '', rightPassive: '', leftActive: '', leftPassive: '' }
      },
      ligamentousTests: {
        varusStability: { right: '', left: '' },
        valgusStability: { right: '', left: '' }
      },
      instabilityTests: {
        milking: { right: '', left: '' },
        lateralPivotShift: { right: '', left: '' },
        pushUpTest: { right: '', left: '' }
      },
      tendinitisTests: {
        extensionResistance: { right: '', left: '' },
        flexionResistance: { right: '', left: '' },
        ulnarTinel: { right: '', left: '' },
        radialTinel: { right: '', left: '' }
      }
    },
    wristsHands: {
      palpation: '',
      inspection: '',
      rangeOfMotion: {
        flexion: { rightActive: '', rightPassive: '', leftActive: '', leftPassive: '' },
        extension: { rightActive: '', rightPassive: '', leftActive: '', leftPassive: '' },
        ulnarDeviation: { rightActive: '', rightPassive: '', leftActive: '', leftPassive: '' },
        radialDeviation: { rightActive: '', rightPassive: '', leftActive: '', leftPassive: '' }
      },
      fingerObservation: {
        atrophy: { rightHand: '', leftHand: '' },
        amputation: { rightHand: '', leftHand: '' },
        deformation: { rightHand: '', leftHand: '' },
        sensation: { rightHand: '', leftHand: '' }
      },
      kapandjiOppositionScore: {
        thumbIndex: { right: '', left: '' },
        thumbMiddle: { right: '', left: '' },
        thumbRing: { right: '', left: '' },
        thumbLittle: { right: '', left: '' }
      },
      gripStrength: {
        trial1: { rightHand: '', leftHand: '' },
        trial2: { rightHand: '', leftHand: '' }
      },
      specializedTests: {
        finkelstein: { right: '', left: '' },
        tinel: { right: '', left: '' },
        phalen: { right: '', left: '' },
        durkan: { right: '', left: '' },
        froment: { right: '', left: '' },
        wartenberg: { right: '', left: '' }
      }
    },
    lumbarSpine: {
      palpation: '',
      inspection: '',
      rangeOfMotion: {
        flexion: '',
        extension: '',
        lateralFlexionL: '',
        lateralFlexionR: '',
        rotationL: '',
        rotationR: ''
      },
      radicularManeuvers: {
        slr: { right: '', left: '' },
        tripod: { right: '', left: '' },
        lasegue: { right: '', left: '' },
        reverseLasegue: { right: '', left: '' }
      }
    },
    hips: {
      palpation: '',
      inspection: '',
      rangeOfMotion: {
        flexion: { rightActive: '', rightPassive: '', leftActive: '', leftPassive: '' },
        extension: { rightActive: '', rightPassive: '', leftActive: '', leftPassive: '' },
        internalRotation: { rightActive: '', rightPassive: '', leftActive: '', leftPassive: '' },
        externalRotation: { rightActive: '', rightPassive: '', leftActive: '', leftPassive: '' },
        abduction: { rightActive: '', rightPassive: '', leftActive: '', leftPassive: '' },
        adduction: { rightActive: '', rightPassive: '', leftActive: '', leftPassive: '' }
      },
      specializedTests: {
        trendelenburg: { right: '', left: '' },
        fadir: { right: '', left: '' },
        faber: { right: '', left: '' },
        thomas: { right: '', left: '' },
        ober: { right: '', left: '' }
      }
    },
    knees: {
      palpation: '',
      inspection: '',
      rangeOfMotion: {
        flexion: { rightActive: '', rightPassive: '', leftActive: '', leftPassive: '' },
        extension: { rightActive: '', rightPassive: '', leftActive: '', leftPassive: '' },
        varusValgus: { rightActive: '', rightPassive: '', leftActive: '', leftPassive: '' }
      },
      ligamentousTests: {
        mcl0: { right: '', left: '' },
        mcl20: { right: '', left: '' },
        lcl0: { right: '', left: '' },
        lcl20: { right: '', left: '' },
        lachman: { right: '', left: '' },
        pivot: { right: '', left: '' },
        anteriorDrawer: { right: '', left: '' },
        posteriorDrawer: { right: '', left: '' },
        posteriorSag: { right: '', left: '' },
        dial30: { right: '', left: '' },
        dial90: { right: '', left: '' }
      },
      meniscalTests: {
        apley: { right: '', left: '' },
        mcMurray: { right: '', left: '' },
        thessaly: { right: '', left: '' }
      },
      patellarTests: {
        extensionLag: { right: '', left: '' },
        patellarTracking: { right: '', left: '' },
        patellarGrinding: { right: '', left: '' }
      }
    },
    feetAnkles: {
      palpation: '',
      inspection: '',
      rangeOfMotion: {
        ankleDorsiflexion: { rightActive: '', rightPassive: '', leftActive: '', leftPassive: '' },
        anklePlantarflexion: { rightActive: '', rightPassive: '', leftActive: '', leftPassive: '' },
        subtalarMotion: { rightActive: '', rightPassive: '', leftActive: '', leftPassive: '' },
        midtarsalMotion: { rightActive: '', rightPassive: '', leftActive: '', leftPassive: '' }
      },
      ligamentousTests: {
        drawer0: { right: '', left: '' },
        drawer20: { right: '', left: '' },
        varusStress: { right: '', left: '' },
        calcaneofibularLaxity: { right: '', left: '' }
      },
      tendonTests: {
        singleHeelRaise: { right: '', left: '' },
        thompson: { right: '', left: '' },
        peronealApprehension: { right: '', left: '' }
      },
      lowerLimbAlignment: {
        hipRotation: { right: '', left: '' },
        thighFootAngle: { right: '', left: '' },
        generalAlignment: { right: '', left: '' }
      }
    },
    muscleAtrophy: {
      thighCircumference: { right: '', left: '', difference: '' },
      calfCircumference: { right: '', left: '', difference: '' },
      armCircumference: { right: '', left: '', difference: '' },
      forearmCircumference: { right: '', left: '', difference: '' }
    },
    neurovascularAssessment: {
      forces: {
        l2: { right: '', left: '' },
        l3: { right: '', left: '' },
        l4: { right: '', left: '' },
        l5: { right: '', left: '' },
        s1: { right: '', left: '' }
      },
      sensibilites: {
        l2: { right: '', left: '' },
        l3: { right: '', left: '' },
        l4: { right: '', left: '' },
        l5: { right: '', left: '' },
        s1: { right: '', left: '' }
      },
      reflexes: {
        rotulien: { right: '', left: '' },
        achilleen: { right: '', left: '' },
        babinski: { right: '', left: '' }
      },
      pouls: {
        tibialPosterieur: { right: '', left: '' },
        pedieux: { right: '', left: '' }
      }
    }
  });
  
  // Helper function to update module data
  const updateModuleData = useCallback((moduleKey, path, value) => {
    setModuleData(prev => {
      const newData = { ...prev };
      const keys = path.split('.');
      
      if (!newData[moduleKey]) {
        newData[moduleKey] = {};
      }
      
      let current = newData[moduleKey];
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newData;
    });
  }, []);
  
  // Helper function to get module data value
  const getModuleData = useCallback((moduleKey, path) => {
    if (!moduleData[moduleKey]) return '';
    const keys = path.split('.');
    let current = moduleData[moduleKey];
    for (const key of keys) {
      if (!current || current[key] === undefined || current[key] === null) return '';
      current = current[key];
    }
    let value = current || '';
    
    // Validate trendelenburg values - filter out suspicious data (but don't update state here to avoid loops)
    if (moduleKey === 'hips' && path.includes('trendelenburg') && typeof value === 'string' && value.length > 0) {
      const suspiciousKeywords = ['asymétrie musculaire', 'asymetrie musculaire', 'pourcentage', 'pôle inférieur', 'rotule', 'tissus mous', 'atteinte'];
      const hasSuspiciousKeywords = suspiciousKeywords.some(kw => value.toLowerCase().includes(kw.toLowerCase()));
      
      // If value is very long and contains suspicious keywords, it's likely wrong data
      if (value.length > 100 && hasSuspiciousKeywords) {
        // Return empty string to prevent display, cleanup will happen via useEffect
        return '';
      }
    }
    
    return value;
  }, [moduleData]);
  
  // Helper to get normal values for range of motion based on module
  const getNormalValuesForModule = useCallback((moduleKey) => {
    const normalValues = {
      cervicalSpine: {
        flexion: { right: '50°', left: '50°' },
        extension: { right: '60°', left: '60°' },
        lateralFlexionL: { right: '45°', left: '45°' },
        lateralFlexionR: { right: '45°', left: '45°' },
        rotationL: { right: '80°', left: '80°' },
        rotationR: { right: '80°', left: '80°' }
      },
      shoulders: {
        flexion: { rightActive: '180°', rightPassive: '180°', leftActive: '180°', leftPassive: '180°' },
        abduction: { rightActive: '180°', rightPassive: '180°', leftActive: '180°', leftPassive: '180°' },
        internalRotation: { rightActive: '70°', rightPassive: '70°', leftActive: '70°', leftPassive: '70°' },
        externalRotation: { rightActive: '90°', rightPassive: '90°', leftActive: '90°', leftPassive: '90°' },
        extension: { rightActive: '60°', rightPassive: '60°', leftActive: '60°', leftPassive: '60°' },
        adduction: { rightActive: '50°', rightPassive: '50°', leftActive: '50°', leftPassive: '50°' }
      },
      elbows: {
        flexion: { rightActive: '150°', rightPassive: '150°', leftActive: '150°', leftPassive: '150°' },
        extension: { rightActive: '0°', rightPassive: '0°', leftActive: '0°', leftPassive: '0°' },
        pronation: { rightActive: '80°', rightPassive: '80°', leftActive: '80°', leftPassive: '80°' },
        supination: { rightActive: '80°', rightPassive: '80°', leftActive: '80°', leftPassive: '80°' }
      },
      lumbarSpine: {
        flexion: { right: '60°', left: '60°' },
        extension: { right: '25°', left: '25°' },
        lateralFlexionL: { right: '25°', left: '25°' },
        lateralFlexionR: { right: '25°', left: '25°' },
        rotationL: { right: '30°', left: '30°' },
        rotationR: { right: '30°', left: '30°' }
      }
    };
    return normalValues[moduleKey] || {};
  }, []);
  
  // Helper function to fill all fields in a module with "Normal"
  const fillModuleNormal = useCallback((moduleKey) => {
    setModuleData(prev => {
      const updated = { ...prev };
      if (!updated[moduleKey]) return updated;
      
      // Special handling for neurovascular assessment
      if (moduleKey === 'neurovascularAssessment') {
        updated[moduleKey] = {
          forces: {
            l2: { right: '5/5', left: '5/5' },
            l3: { right: '5/5', left: '5/5' },
            l4: { right: '5/5', left: '5/5' },
            l5: { right: '5/5', left: '5/5' },
            s1: { right: '5/5', left: '5/5' }
          },
          sensibilites: {
            l2: { right: '2/2', left: '2/2' },
            l3: { right: '2/2', left: '2/2' },
            l4: { right: '2/2', left: '2/2' },
            l5: { right: '2/2', left: '2/2' },
            s1: { right: '2/2', left: '2/2' }
          },
          reflexes: {
            rotulien: { right: 'Normal', left: 'Normal' },
            achilleen: { right: 'Normal', left: 'Normal' },
            babinski: { right: 'Normal', left: 'Normal' }
          },
          pouls: {
            tibialPosterieur: { right: 'Présent', left: 'Présent' },
            pedieux: { right: 'Présent', left: 'Présent' }
          }
        };
        return updated;
      }
      
      // Fill palpation and inspection
      if (updated[moduleKey].palpation !== undefined) {
        updated[moduleKey] = { ...updated[moduleKey], palpation: 'Normal', inspection: 'Normal' };
      }
      
      // Fill range of motion with normal values based on module type
      if (updated[moduleKey].rangeOfMotion) {
        const normalValues = getNormalValuesForModule(moduleKey);
        updated[moduleKey] = {
          ...updated[moduleKey],
          rangeOfMotion: normalValues
        };
      }
      
      return updated;
    });
  }, [getNormalValuesForModule]);
  
  // Define sections in order - memoized to prevent recreation
  // All fields must be filled before moving to next section
  const sections = useMemo(() => [
    { 
      key: 'worker', 
      title: 'A. RENSEIGNEMENTS SUR LE TRAVAILLEUR', 
      allFields: ['workerName', 'workerFirstName', 'healthInsuranceNo', 'birthDate', 'address', 'phone', 'workerFileNo', 'originEventDate', 'recurrenceDate'] 
    },
    { 
      key: 'doctor', 
      title: 'B. RENSEIGNEMENTS SUR LE MÉDECIN', 
      allFields: ['doctorName', 'doctorFirstName', 'licenseNo', 'doctorAddress', 'doctorPhone', 'doctorEmail'] 
    },
    { 
      key: 'mandate', 
      title: 'C. RAPPORT - 1. Mandat de l\'évaluation', 
      allFields: ['mandate'] 
    },
    { 
      key: 'diagnostics', 
      title: '2. Diagnostics acceptés par la CNESST', 
      allFields: ['acceptedDiagnostics'] 
    },
    { 
      key: 'interview', 
      title: '3. Entrevue avec le travailleur', 
      allFields: ['interviewModality'] 
    },
    { 
      key: 'identification', 
      title: '4. Identification de la lésion professionnelle', 
      allFields: ['age', 'dominance', 'employment'] 
    },
    { 
      key: 'history', 
      title: '5. Antécédents', 
      allFields: ['medicalHistory', 'surgicalHistory', 'lesionHistory', 'cnesstHistory', 'saaqHistory', 'otherHistory', 'allergies', 'tobacco', 'cannabis', 'alcohol'] 
    },
    { 
      key: 'medication', 
      title: '6. Médication et traitements', 
      allFields: ['currentMedication'] 
    },
    { 
      key: 'evolution', 
      title: '7. Historique de faits et évolution', 
      allFields: ['historiqueFaits'] 
    },
    { 
      key: 'subjective', 
      title: '8. Questionnaire subjectif et état actuel', 
      allFields: ['subjectiveQuestionnaire'] 
    },
    { 
      key: 'physical', 
      title: '9. Examen Physique', 
      allFields: ['weight', 'height', 'physicalDominance', 'physicalExam'],
      // Physical exam measurements table is optional, so we don't require it
    },
    { 
      key: 'paraclinical', 
      title: '10. Examens paracliniques', 
      allFields: ['paraclinicalExams'] 
    },
    { 
      key: 'conclusion', 
      title: '11. Conclusion', 
      allFields: ['summary'] 
    },
    { 
      key: 'sequelae', 
      title: '12. Séquelles', 
      allFields: ['previousSequelae', 'otherBilateralDeficits', 'noteBene'],
      // Special handling for currentSequelae table - check if both rows have all fields filled
      customCheck: (formData, currentSequelae) => {
        // Check regular fields
        const regularFieldsComplete = ['previousSequelae', 'otherBilateralDeficits', 'noteBene'].every(field => {
          const value = formData[field];
          return value !== null && value !== undefined && value.toString().trim().length > 0;
        });
        
        // Check currentSequelae table - both rows must have code, description, and percentage filled
        const sequelaeTableComplete = currentSequelae && currentSequelae.length >= 2 && 
          currentSequelae.every(sequela => 
            sequela.code && sequela.code.trim().length > 0 &&
            sequela.description && sequela.description.trim().length > 0 &&
            sequela.percentage && sequela.percentage.trim().length > 0
          );
        
        return regularFieldsComplete && sequelaeTableComplete;
      }
    }
  ], []);
  
  // Check if a section is completed - ALL fields must be filled
  const isSectionCompleted = useCallback((sectionIndex) => {
    if (!sections || sectionIndex >= sections.length) return false;
    const section = sections[sectionIndex];
    
    // Special handling for sequelae section
    if (section.customCheck) {
      return section.customCheck(formData, currentSequelae);
    }
    
    // For all other sections, check that ALL fields are filled
    if (!section.allFields || section.allFields.length === 0) {
      return false; // No fields means incomplete
    }
    
    return section.allFields.every(field => {
      const value = formData[field];
      // Check if value exists and is not empty (after trimming)
      // For dropdowns, empty string means not selected, so require non-empty value
      if (value === null || value === undefined || value === '') {
        return false;
      }
      // For strings, check that trimmed length is > 0
      if (typeof value === 'string') {
        return value.trim().length > 0;
      }
      // For other types (numbers, etc.), just check that it exists
      return true;
    });
  }, [formData, sections, currentSequelae]);
  
  // Check if section can be accessed (all sections accessible - no restrictions)
  const canAccessSection = useCallback((sectionIndex) => {
    // All sections are accessible - user can navigate freely
    return true;
  }, []);
  
  // Mark section as completed
  const markSectionComplete = useCallback((sectionIndex) => {
    if (isSectionCompleted(sectionIndex)) {
      setCompletedSections(prev => new Set([...prev, sectionIndex]));
      // Auto-advance to next section if current one is completed
      if (sectionIndex === currentSection && sectionIndex < sections.length - 1) {
        if (canAccessSection(sectionIndex + 1)) {
          setCurrentSection(sectionIndex + 1);
        }
      }
    }
  }, [currentSection, isSectionCompleted, canAccessSection, sections.length]);
  
  // Update completion status when form data changes
  useEffect(() => {
    sections.forEach((_, index) => {
      if (isSectionCompleted(index)) {
        setCompletedSections(prev => new Set([...prev, index]));
      }
    });
  }, [formData, isSectionCompleted, sections]);
  
  // Navigate to section (no restrictions - all sections accessible)
  const navigateToSection = useCallback((sectionIndex) => {
    // Allow navigation to any section
    if (sectionIndex >= 0 && sectionIndex < sections.length) {
      setCurrentSection(sectionIndex);
    }
  }, [sections.length]);
  
  
  // Mandate checkboxes state
  const [mandateCheckboxes, setMandateCheckboxes] = useState({
    diagnostic: false,
    dateConsolidation: false,
    natureSoins: false,
    atteinteExistence: false,
    atteintePourcentage: false,
    limitationsExistence: false,
    limitationsEvaluation: false
  });
  
  const mandateItems = {
    diagnostic: '1) Diagnostic.',
    dateConsolidation: '2) Date de consolidation.',
    natureSoins: '3) Nature, nécessité, suffisance, durée des soins ou traitements administrés ou prescrits.',
    atteinteExistence: '4) a) Existence de l\'atteinte permanente à l\'intégrité physique ou psychique.',
    atteintePourcentage: '4) b) Pourcentage de l\'atteinte permanente à l\'intégrité physique ou psychique.',
    limitationsExistence: '5) a) Existence de limitations fonctionnelles résultant de la lésion professionnelle.',
    limitationsEvaluation: '5) b) Évaluation des limitations fonctionnelles résultant de la lésion professionnelle.'
  };
  
  const handleMandateCheckboxChange = (key, checked) => {
    setMandateCheckboxes(prev => ({
      ...prev,
      [key]: checked
    }));
    
    // Update mandate textarea with proper formatting
    const updatedCheckboxes = {
      ...mandateCheckboxes,
      [key]: checked
    };
    
    // Build the mandate text with proper spacing and order
    const order = ['diagnostic', 'dateConsolidation', 'natureSoins', 'atteinteExistence', 'atteintePourcentage', 'limitationsExistence', 'limitationsEvaluation'];
    
    const selectedItems = [];
    order.forEach(itemKey => {
      if (updatedCheckboxes[itemKey]) {
        const itemText = mandateItems[itemKey];
        selectedItems.push({ key: itemKey, text: itemText });
      }
    });
    
    // Format with proper spacing matching the photo layout
    // Format: blank lines between 1, 2, 3; 4a after 3, 4b indented after 4a; 5a after 4b, 5b indented after 5a
    let formattedText = '';
    selectedItems.forEach((item, index) => {
      const { key: itemKey, text: itemText } = item;
      const isMainItem = ['diagnostic', 'dateConsolidation', 'natureSoins'].includes(itemKey);
      const is4a = itemKey === 'atteinteExistence';
      const is4b = itemKey === 'atteintePourcentage';
      const is5a = itemKey === 'limitationsExistence';
      const is5b = itemKey === 'limitationsEvaluation';
      
      if (index === 0) {
        formattedText = itemText;
      } else {
        const prevItem = selectedItems[index - 1];
        const prevIsMainItem = ['diagnostic', 'dateConsolidation', 'natureSoins'].includes(prevItem.key);
        const prevIs4b = prevItem.key === 'atteintePourcentage';
        
        if (isMainItem) {
          // Main items (1, 2, 3) - blank line before and after
          formattedText += '\n\n' + itemText;
        } else if (is4a) {
          // 4a - blank line after main item (3), or just new line if after other
          if (prevIsMainItem) {
            formattedText += '\n\n' + itemText;
          } else {
            formattedText += '\n' + itemText;
          }
        } else if (is4b) {
          // 4b - indented on next line after 4a
          formattedText += '\n    ' + itemText;
        } else if (is5a) {
          // 5a - blank line after 4b, or new line if after other
          if (prevIs4b) {
            formattedText += '\n\n' + itemText;
          } else {
            formattedText += '\n' + itemText;
          }
        } else if (is5b) {
          // 5b - indented on next line after 5a
          formattedText += '\n    ' + itemText;
        }
      }
    });
    
    handleInputChange('mandate', formattedText);
  };
  
  // Sync checkboxes with mandate textarea content
  useEffect(() => {
    const mandateText = formData.mandate || '';
    const updatedCheckboxes = {};
    
    Object.keys(mandateItems).forEach(key => {
      updatedCheckboxes[key] = mandateText.includes(mandateItems[key]);
    });
    
    setMandateCheckboxes(prev => {
      // Only update if there are actual changes to avoid infinite loops
      const hasChanges = Object.keys(updatedCheckboxes).some(
        key => prev[key] !== updatedCheckboxes[key]
      );
      return hasChanges ? updatedCheckboxes : prev;
    });
  }, [formData.mandate, mandateItems]);
  
  const jsonInputRef = useRef(null);
  const templateInputRef = useRef(null);
  const containerRef = useRef(null);
  
  
  // Calculate progress percentage
  const progressPercentage = useMemo(() => {
    const completed = sections.filter((_, index) => completedSections.has(index) || isSectionCompleted(index)).length;
    return Math.round((completed / sections.length) * 100);
  }, [completedSections, isSectionCompleted, sections]);
  
  // Format time for transcript display (HH:MM:SS)
  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Speech recognition handler for sections 7 and 8
  const handleStartRecording = useCallback((sectionKey, fieldName) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert('Votre navigateur ne supporte pas la reconnaissance vocale. Veuillez utiliser Chrome ou Edge.');
      return;
    }
    
    // Stop any existing recording
    if (recognitionInstances[sectionKey]) {
      recognitionInstances[sectionKey].stop();
    }
    
    const recognition = new SpeechRecognition();
    recognition.continuous = true; // Keep recording continuously
    recognition.interimResults = true; // Show interim results in real-time
    recognition.lang = recognitionLanguage;
    
    // Improve accuracy settings
    // Max alternatives (0 = best match only, higher = more alternatives)
    if (recognition.maxAlternatives !== undefined) {
      recognition.maxAlternatives = 1; // Use best match for accuracy
    }
    
    // Service-specific settings for better accuracy
    // Some browsers support these settings
    if (recognition.serviceURI) {
      // Use best quality service if available
      recognition.serviceURI = undefined; // Let browser choose best service
    }
    
    // Remove any timeout - let it run indefinitely until manually stopped
    // Some browsers have default timeouts, but continuous=true should prevent auto-stop
    
    const startTime = Date.now();
    setRecordingStartTime(prev => ({ ...prev, [sectionKey]: startTime }));
    
    // Store field name for restart purposes
    const fieldNameForRestart = fieldName;
    
    // Use a ref to track accumulated final text across all recognition events
    // Initialize with current field value
    const finalTextRef = { current: formData[fieldName] || '' };
    
    console.log(`🎤 Starting recording for ${sectionKey}, field: ${fieldName}, initial value: "${finalTextRef.current}"`);
    
    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';
      
      // Process all results from the current event
      // We need to handle both final and interim results that might be in the same event
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        const confidence = result[0].confidence || 0;
        
        // Process interim results even with lower confidence for real-time display
        // Only skip very low confidence interim results (< 0.05) to avoid gibberish
        // This ensures we see text appear as you speak
        if (confidence < 0.05 && !result.isFinal && transcript.trim().length < 2) {
          console.log(`⚠️ Very low confidence (${confidence.toFixed(2)}) for: "${transcript}"`);
          continue; // Skip very low-confidence interim results that are too short
        }
        
        if (result.isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          // Keep only the latest interim transcript
          interimTranscript = transcript;
        }
      }
      
      console.log('🎤 Recognition result:', { 
        finalTranscript: finalTranscript.trim(), 
        interimTranscript, 
        fieldName,
        resultIndex: event.resultIndex,
        resultsLength: event.results.length
      });
      
      // Always update the field in real-time with accumulated final text + current interim
      // This ensures text appears immediately as you speak
      
      // Handle final transcript (confirmed text) - this gets added permanently
      if (finalTranscript.trim()) {
        const elapsedSeconds = (Date.now() - startTime) / 1000;
        
        // Update accumulated final text (add space between segments)
        const finalTextToAdd = finalTranscript.trim();
        if (finalTextRef.current && !finalTextRef.current.endsWith(' ')) {
          finalTextRef.current += ' ';
        }
        finalTextRef.current += finalTextToAdd;
        
        console.log('✅ Adding final transcript:', finalTextToAdd);
        console.log('📝 Accumulated final text:', finalTextRef.current);
        
        // Update both transcript array and main field - show final + interim in real-time
        const newFieldValue = finalTextRef.current + (interimTranscript ? ' ' + interimTranscript : '');
        
        // For historiqueFaits, use handleInputChange to trigger auto-splitting
        if (fieldName === 'historiqueFaits') {
          // Use a callback to access the latest formData and handle splitting
          setFormData(prev => {
            const existingTranscript = prev[`${fieldName}Transcript`] || [];
            const currentFirstField = prev.historiqueFaits || '';
            const currentContinueField = prev.historiqueFaitsContinue || '';
            const maxLength = 1800;
            
            const updatedData = {
              ...prev,
              [`${fieldName}Transcript`]: [
                ...existingTranscript,
                {
                  timestamp: formatTime(elapsedSeconds),
                  text: finalTextToAdd
                }
              ]
            };
            
            // Check if first field is already at or near the limit
            if (currentFirstField.length >= maxLength) {
              // First field is full, add new text directly to continue field
              updatedData.historiqueFaitsContinue = currentContinueField + (currentContinueField ? ' ' : '') + finalTextToAdd;
              // Update finalTextRef to reflect that text is going to continue field
              // Keep finalTextRef as is since it tracks the first field
            } else {
              // First field has space, try to add to first field
              const combinedText = currentFirstField + (currentFirstField ? ' ' : '') + finalTextToAdd + (interimTranscript ? ' ' + interimTranscript : '');
              
              if (combinedText.length > maxLength) {
                // Need to split
                const splitPoint = combinedText.lastIndexOf(' ', maxLength);
                updatedData.historiqueFaits = splitPoint > 0 ? combinedText.substring(0, splitPoint) : combinedText.substring(0, maxLength);
                const secondPart = splitPoint > 0 ? combinedText.substring(splitPoint + 1) : combinedText.substring(maxLength);
                updatedData.historiqueFaitsContinue = currentContinueField + (currentContinueField ? ' ' : '') + secondPart;
                // Update finalTextRef to only contain what's in the first field
                finalTextRef.current = updatedData.historiqueFaits;
              } else {
                // Fits in first field
                updatedData.historiqueFaits = combinedText;
                // Update finalTextRef to match
                finalTextRef.current = updatedData.historiqueFaits;
              }
            }
            
            return updatedData;
          });
        } else {
          setFormData(prev => {
            const existingTranscript = prev[`${fieldName}Transcript`] || [];
            
            return {
              ...prev,
              [`${fieldName}Transcript`]: [
                ...existingTranscript,
                {
                  timestamp: formatTime(elapsedSeconds),
                  text: finalTextToAdd
                }
              ],
              // Always show accumulated final text + current interim transcript for real-time display
              [fieldName]: newFieldValue
            };
          });
        }
      } 
      // Handle interim transcript only (temporary, still being processed) - update in real-time
      if (interimTranscript) {
        console.log('⏳ Interim transcript:', interimTranscript);
        // Update main field immediately with accumulated final text + interim text for real-time display
        const currentFinal = finalTextRef.current || '';
        const separator = currentFinal && !currentFinal.endsWith(' ') ? ' ' : '';
        const newValue = currentFinal + separator + interimTranscript;
        console.log('📝 Updating with interim in real-time, new value:', newValue);
        
        // For historiqueFaits, apply splitting logic
        if (fieldName === 'historiqueFaits') {
          setFormData(prev => {
            const currentFirstField = prev.historiqueFaits || '';
            const currentContinueField = prev.historiqueFaitsContinue || '';
            const maxLength = 1800;
            
            // Check if first field is already at or near the limit
            if (currentFirstField.length >= maxLength) {
              // First field is full, add interim text directly to continue field
              return {
                ...prev,
                historiqueFaitsContinue: currentContinueField + (currentContinueField ? ' ' : '') + interimTranscript
              };
            } else {
              // First field has space, try to add to first field
              // Use currentFirstField instead of newValue to get accurate current state
              const combinedWithInterim = currentFirstField + (currentFirstField ? ' ' : '') + interimTranscript;
              
              if (combinedWithInterim.length > maxLength) {
                const splitPoint = combinedWithInterim.lastIndexOf(' ', maxLength);
                const firstPart = splitPoint > 0 ? combinedWithInterim.substring(0, splitPoint) : combinedWithInterim.substring(0, maxLength);
                const secondPart = splitPoint > 0 ? combinedWithInterim.substring(splitPoint + 1) : combinedWithInterim.substring(maxLength);
                return {
                  ...prev,
                  historiqueFaits: firstPart,
                  historiqueFaitsContinue: currentContinueField + (currentContinueField ? ' ' : '') + secondPart
                };
              } else {
                return {
                  ...prev,
                  historiqueFaits: combinedWithInterim
                };
              }
            }
          });
        } else {
          setFormData(prev => ({
            ...prev,
            [fieldName]: newValue
          }));
        }
      }
    };
    
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      
      // Handle specific error cases
      if (event.error === 'not-allowed') {
        alert('Accès au microphone refusé. Veuillez autoriser l\'accès au microphone dans les paramètres de votre navigateur.');
      } else if (event.error === 'no-speech') {
        // This is normal - just means no speech detected yet
        console.log('No speech detected yet');
        return;
      } else if (event.error === 'aborted') {
        // Recording was stopped intentionally
        console.log('Recording aborted');
        return;
      } else {
        alert('Erreur de reconnaissance vocale: ' + event.error);
      }
      
      // Stop recording on error (except for no-speech and aborted)
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setIsRecording(prev => ({ ...prev, [sectionKey]: false }));
        setRecognitionInstances(prev => ({ ...prev, [sectionKey]: null }));
        setRecordingStartTime(prev => ({ ...prev, [sectionKey]: null }));
      }
    };
    
    recognition.onstart = () => {
      console.log(`✅ Speech recognition started for ${sectionKey}`);
    };
    
    recognition.onend = () => {
      console.log(`⏹️ Speech recognition ended for ${sectionKey}`);
      // Continue recording if still in recording state - restart immediately
      // This prevents the 6-second timeout issue
      if (isRecording[sectionKey]) {
        // Use setTimeout to ensure we restart after the event loop
        setTimeout(() => {
          // Double-check we're still recording and create a fresh instance if needed
          if (isRecording[sectionKey]) {
            try {
              // Check if the recognition instance is still valid
              if (recognitionInstances[sectionKey] === recognition) {
                console.log(`🔄 Restarting recognition for ${sectionKey} (continuous mode)`);
                recognition.start();
              } else {
                // Instance changed, create new one
                console.log(`🔄 Creating new recognition instance for ${sectionKey} (instance changed)`);
                // Get current field value before restarting
                const currentFieldValue = formData[fieldNameForRestart] || '';
                // Clear old instance
                setRecognitionInstances(prev => ({ ...prev, [sectionKey]: null }));
                // Restart with stored field name
                setTimeout(() => {
                  if (isRecording[sectionKey]) {
                    handleStartRecording(sectionKey, fieldNameForRestart);
                  }
                }, 100);
              }
            } catch (e) {
              console.error('Error restarting recognition:', e);
              // If restart fails, create a completely new instance
              if (isRecording[sectionKey]) {
                console.log(`🔄 Creating new recognition instance for ${sectionKey} (restart failed)`);
                // Clear the old instance first
                setRecognitionInstances(prev => ({ ...prev, [sectionKey]: null }));
                // Small delay before creating new instance
                setTimeout(() => {
                  if (isRecording[sectionKey]) {
                    handleStartRecording(sectionKey, fieldNameForRestart);
                  }
                }, 100);
              } else {
                setIsRecording(prev => ({ ...prev, [sectionKey]: false }));
                setRecognitionInstances(prev => ({ ...prev, [sectionKey]: null }));
                setRecordingStartTime(prev => ({ ...prev, [sectionKey]: null }));
              }
            }
          }
        }, 100); // Small delay to ensure clean restart
      }
    };
    
    try {
      recognition.start();
      setIsRecording(prev => ({ ...prev, [sectionKey]: true }));
      setRecognitionInstances(prev => ({ ...prev, [sectionKey]: recognition }));
      console.log(`🎤 Attempting to start recording for ${sectionKey}`);
    } catch (e) {
      console.error('Error starting speech recognition:', e);
      alert('Erreur lors du démarrage de la reconnaissance vocale. Veuillez autoriser l\'accès au microphone.');
      setIsRecording(prev => ({ ...prev, [sectionKey]: false }));
      setRecognitionInstances(prev => ({ ...prev, [sectionKey]: null }));
    }
  }, [recognitionInstances, isRecording, formData, recognitionLanguage]);
  
  const handleStopRecording = useCallback((sectionKey) => {
    if (recognitionInstances[sectionKey]) {
      recognitionInstances[sectionKey].stop();
      setIsRecording(prev => ({ ...prev, [sectionKey]: false }));
      setRecognitionInstances(prev => ({ ...prev, [sectionKey]: null }));
      setRecordingStartTime(prev => ({ ...prev, [sectionKey]: null }));
    }
  }, [recognitionInstances]);
  
  // Load templates on mount
  useEffect(() => {
    const loadedTemplates = TemplateService.getAllTemplates();
    setTemplates(loadedTemplates);
  }, []);

  // Cleanup PDF URL when component unmounts
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  // Field positions: use auto-detected fields (fallback removed as fields are auto-detected)
  const fieldPositions = detectedFields || {};

  const handleInputChange = useCallback((field, value) => {
    // Special handling for historiqueFaits - auto-split when field is full
    if (field === 'historiqueFaits') {
      // Estimate character limit for first field (typically ~1500-2000 chars for PDF fields)
      const maxLength = 1800;
      
      if (value.length > maxLength) {
        // Find the last space before the limit to avoid splitting words
        const splitPoint = value.lastIndexOf(' ', maxLength);
        const firstPart = splitPoint > 0 ? value.substring(0, splitPoint) : value.substring(0, maxLength);
        const secondPart = splitPoint > 0 ? value.substring(splitPoint + 1) : value.substring(maxLength);
        
        setFormData(prev => ({
          ...prev,
          historiqueFaits: firstPart,
          historiqueFaitsContinue: (prev.historiqueFaitsContinue || '') + (prev.historiqueFaitsContinue ? ' ' : '') + secondPart
        }));
      } else {
        // If text fits in first field, clear the continue field if it was only from overflow
        setFormData(prev => {
          const newData = {
            ...prev,
            historiqueFaits: value
          };
          // Only clear continue field if it was empty before or if the new value is shorter
          if (value.length < (prev.historiqueFaits || '').length) {
            // Text was deleted, check if we need to move text back from continue field
            const totalLength = (value || '').length + (prev.historiqueFaitsContinue || '').length;
            if (totalLength <= maxLength) {
              // All text fits in first field now, merge them
              newData.historiqueFaits = value + (prev.historiqueFaitsContinue ? ' ' + prev.historiqueFaitsContinue : '');
              newData.historiqueFaitsContinue = '';
            }
          }
          return newData;
        });
      }
    } else if (field === 'historiqueFaitsContinue') {
      // Handle changes to the continue field
      setFormData(prev => ({
        ...prev,
        historiqueFaitsContinue: value
      }));
    } else {
      // Normal field update
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  }, []);

  // Toggle to show PDF field associations
  const [showFieldMapping, setShowFieldMapping] = useState(true);

  // Mapping from React form field names to PDF field names in Form_fillable.pdf
  const fieldMapping = useMemo(() => {
    // If we have detected fields, use those as the base
    const pdfFieldNames = detectedFields ? Object.keys(detectedFields) : [];
    
    // Create a mapping object: formFieldName -> pdfFieldName
    const mapping = {};
    
    // Map React form field names to detected PDF field names
    // Try to match by similarity or use common patterns
    const formToPdfMapping = {
      // Section A: Worker Information
      'workerName': pdfFieldNames.find(f => /nom/i.test(f) && !/medecin/i.test(f)) || 'nom',
      'nom': pdfFieldNames.find(f => /nom/i.test(f) && !/medecin/i.test(f)) || 'nom',
      'nomTravailleur': pdfFieldNames.find(f => /nom/i.test(f) && !/medecin/i.test(f)) || 'nom',
      'lastName': pdfFieldNames.find(f => /nom/i.test(f) && !/medecin/i.test(f)) || 'nom',
      
      'workerFirstName': pdfFieldNames.find(f => /prenom/i.test(f) && !/medecin/i.test(f)) || 'prenom',
      'firstName': pdfFieldNames.find(f => /prenom/i.test(f) && !/medecin/i.test(f)) || 'prenom',
      'prenom': pdfFieldNames.find(f => /prenom/i.test(f) && !/medecin/i.test(f)) || 'prenom',
      
      'healthInsuranceNo': pdfFieldNames.find(f => /assurance/i.test(f) || /maladie/i.test(f)) || 'noAssuranceMaladie',
      'noAssuranceMaladie': pdfFieldNames.find(f => /assurance/i.test(f) || /maladie/i.test(f)) || 'noAssuranceMaladie',
      
      'birthDate': pdfFieldNames.find(f => /naissance/i.test(f) || /birth/i.test(f) || /dob/i.test(f)) || 'dateNaissance',
      'dateNaissance': pdfFieldNames.find(f => /naissance/i.test(f) || /birth/i.test(f) || /dob/i.test(f)) || 'dateNaissance',
      'dateOfBirth': pdfFieldNames.find(f => /naissance/i.test(f) || /birth/i.test(f) || /dob/i.test(f)) || 'dateNaissance',
      
      'address': pdfFieldNames.find(f => /adresse/i.test(f) && !/medecin/i.test(f)) || 'adresse',
      'adresse': pdfFieldNames.find(f => /adresse/i.test(f) && !/medecin/i.test(f)) || 'adresse',
      
      'phone': pdfFieldNames.find(f => /telephone/i.test(f) && !/medecin/i.test(f)) || 'telephone',
      'telephone': pdfFieldNames.find(f => /telephone/i.test(f) && !/medecin/i.test(f)) || 'telephone',
      
      'workerFileNo': pdfFieldNames.find(f => /dossier/i.test(f)) || 'noDossierTravailleur',
      'noDossierTravailleur': pdfFieldNames.find(f => /dossier/i.test(f)) || 'noDossierTravailleur',
      
      'originEventDate': pdfFieldNames.find(f => /evenement/i.test(f) || /origine/i.test(f)) || 'dateEvenementOrigine',
      'dateEvenementOrigine': pdfFieldNames.find(f => /evenement/i.test(f) || /origine/i.test(f)) || 'dateEvenementOrigine',
      'eventDate': pdfFieldNames.find(f => /evenement/i.test(f) || /origine/i.test(f)) || 'dateEvenementOrigine',
      
      'recurrenceDate': pdfFieldNames.find(f => /recidive/i.test(f) || /rechute/i.test(f) || /aggravation/i.test(f)) || 'dateRecidive',
      'dateRecidive': pdfFieldNames.find(f => /recidive/i.test(f) || /rechute/i.test(f) || /aggravation/i.test(f)) || 'dateRecidive',
      
      // Section B: Doctor Information
      'doctorName': pdfFieldNames.find(f => /nom/i.test(f) && /medecin/i.test(f)) || pdfFieldNames.find(f => /nom/i.test(f) && /medecin/i.test(f)) || 'nomMedecin',
      'nomMedecin': pdfFieldNames.find(f => /nom/i.test(f) && /medecin/i.test(f)) || 'nomMedecin',
      
      'doctorFirstName': pdfFieldNames.find(f => /prenom/i.test(f) && /medecin/i.test(f)) || 'prenomMedecin',
      'prenomMedecin': pdfFieldNames.find(f => /prenom/i.test(f) && /medecin/i.test(f)) || 'prenomMedecin',
      
      'licenseNo': pdfFieldNames.find(f => /permis/i.test(f) || /license/i.test(f)) || 'noPermis',
      'noPermis': pdfFieldNames.find(f => /permis/i.test(f) || /license/i.test(f)) || 'noPermis',
      
      'doctorAddress': pdfFieldNames.find(f => /adresse/i.test(f) && /medecin/i.test(f)) || 'adresseMedecin',
      'adresseMedecin': pdfFieldNames.find(f => /adresse/i.test(f) && /medecin/i.test(f)) || 'adresseMedecin',
      
      'doctorPhone': pdfFieldNames.find(f => /telephone/i.test(f) && /medecin/i.test(f)) || 'telephoneMedecin',
      'telephoneMedecin': pdfFieldNames.find(f => /telephone/i.test(f) && /medecin/i.test(f)) || 'telephoneMedecin',
      
      'doctorEmail': pdfFieldNames.find(f => /courriel/i.test(f) || /email/i.test(f)) || 'courriel',
      'courriel': pdfFieldNames.find(f => /courriel/i.test(f) || /email/i.test(f)) || 'courriel',
      
      // Section C: Report fields
      'mandate': pdfFieldNames.find(f => /mandat/i.test(f)) || 'mandat',
      'acceptedDiagnostics': pdfFieldNames.find(f => /diagnostic/i.test(f)) || 'diagnostics',
      'interviewModality': pdfFieldNames.find(f => /modalite/i.test(f) || /entrevue/i.test(f)) || 'modaliteEntrevue',
      'age': pdfFieldNames.find(f => /age_identification/i.test(f)) || 
             pdfFieldNames.find(f => /ageidentification/i.test(f)) ||
             pdfFieldNames.find(f => /^age$/i.test(f)) || 
             'age_identification',
      'dominance': pdfFieldNames.find(f => /dominance/i.test(f)) || 'dominance',
      'employment': pdfFieldNames.find(f => /emploi/i.test(f)) || 'emploi',
      'medicalHistory': pdfFieldNames.find(f => /antecedent/i.test(f) && /medical/i.test(f)) || 'antecedentsMedicaux',
      'antecedentsMedicaux': pdfFieldNames.find(f => /antecedent/i.test(f) && /medical/i.test(f)) || 'antecedentsMedicaux',
      'surgicalHistory': pdfFieldNames.find(f => /antecedent/i.test(f) && /chirurg/i.test(f)) || 'antecedenusChirurgicaux',
      'antecedenusChirurgicaux': pdfFieldNames.find(f => /antecedent/i.test(f) && /chirurg/i.test(f)) || 'antecedenusChirurgicaux',
      'lesionHistory': pdfFieldNames.find(f => /antecedent/i.test(f) && /lesion/i.test(f)) || 'antecedentsLesion',
      'antecedentsLesion': pdfFieldNames.find(f => /antecedent/i.test(f) && /lesion/i.test(f)) || 'antecedentsLesion',
      'cnesstHistory': pdfFieldNames.find(f => /antecedent/i.test(f) && /cnesst/i.test(f)) || 'accidentsCNESST',
      'accidentsCNESST': pdfFieldNames.find(f => /antecedent/i.test(f) && /cnesst/i.test(f)) || 'accidentsCNESST',
      // SAAQ maps to the actual detected PDF field (prioritize exact matches, then pattern matches)
      'saaqHistory': pdfFieldNames.find(f => /^accidentsAutres$/i.test(f)) || 
                     pdfFieldNames.find(f => /accidents.*saaq/i.test(f)) ||
                     pdfFieldNames.find(f => /saaq/i.test(f) && /antecedent/i.test(f)) ||
                     pdfFieldNames.find(f => /antecedent/i.test(f) && /autre/i.test(f)) || 
                     null, // Don't use fallback - use detected field name only
      // Use the actual detected PDF field name, not a hardcoded fallback
      'accidentsAutres': pdfFieldNames.find(f => /^accidentsAutres$/i.test(f)) || 
                         pdfFieldNames.find(f => /accidents.*saaq/i.test(f)) ||
                         pdfFieldNames.find(f => /saaq/i.test(f) && /antecedent/i.test(f)) ||
                         pdfFieldNames.find(f => /antecedent/i.test(f) && /autre/i.test(f)) || 
                         null, // Use detected field name only
      'otherHistory': pdfFieldNames.find(f => /^autres$/i.test(f) || /^autre$/i.test(f)) || 'autres', // Autres maps to autres
      'autres': pdfFieldNames.find(f => /^autres$/i.test(f) || /^autre$/i.test(f)) || 'autres', // Autres maps to autres
      'allergies': pdfFieldNames.find(f => /allergie/i.test(f)) || 'allergie',
      'allergie': pdfFieldNames.find(f => /allergie/i.test(f)) || 'allergie',
      'tobacco': pdfFieldNames.find(f => /tabac/i.test(f)) || 'tabac',
      'tabac': pdfFieldNames.find(f => /tabac/i.test(f)) || 'tabac',
      'cannabis': pdfFieldNames.find(f => /cannabis/i.test(f)) || 'cannabis',
      'alcohol': pdfFieldNames.find(f => /alcool/i.test(f)) || 'alcool',
      'alcool': pdfFieldNames.find(f => /alcool/i.test(f)) || 'alcool',
      'currentMedication': pdfFieldNames.find(f => /medication/i.test(f) || /traitement/i.test(f)) || 'medication',
      'historiqueFaits': pdfFieldNames.find(f => /historique/i.test(f) && !/continue/i.test(f) && !/suite/i.test(f)) || pdfFieldNames.find(f => /historique/i.test(f) || /evolution/i.test(f)) || 'historiqueFaits',
      'historiqueFaitsContinue': pdfFieldNames.find(f => /historique/i.test(f) && (/continue/i.test(f) || /suite/i.test(f))) || pdfFieldNames.find(f => /historique.*continue/i.test(f) || /historique.*suite/i.test(f)) || 'historiqueFaitsContinue',
      'subjectiveQuestionnaire': pdfFieldNames.find(f => /questionnaire/i.test(f) || /subjectif/i.test(f)) || 'questionnaireSubjectif',
      'weight': pdfFieldNames.find(f => /poids/i.test(f)) || 'poids',
      'height': pdfFieldNames.find(f => /taille/i.test(f)) || 'taille',
      'physicalDominance': pdfFieldNames.find(f => /dominance_examen/i.test(f)) || pdfFieldNames.find(f => /dominance/i.test(f) && /physique/i.test(f)) || pdfFieldNames.find(f => /dominance/i.test(f) && /examen/i.test(f)) || 'dominance_examen',
      'dominance_examen': pdfFieldNames.find(f => /dominance_examen/i.test(f)) || 'dominance_examen',
      'physicalExam': pdfFieldNames.find(f => /examen/i.test(f) && /physique/i.test(f)) || 'examenPhysique',
      'paraclinicalExams': pdfFieldNames.find(f => /examensParacliniques/i.test(f)) || pdfFieldNames.find(f => /paraclinique/i.test(f)) || pdfFieldNames.find(f => /examen/i.test(f) && /paraclinique/i.test(f)) || 'examensParacliniques',
      'summary': pdfFieldNames.find(f => /conclusion/i.test(f) || /resume/i.test(f) || /sommaire/i.test(f)) || 'conclusion',
      // Section 12: Sequelae fields
      'currentSequelae': pdfFieldNames.find(f => 
        (/sequelle/i.test(f) && /actuel/i.test(f)) || 
        (/sequelle/i.test(f) && !/anterieur/i.test(f) && !/anterieure/i.test(f) && !/previous/i.test(f)) ||
        (/current/i.test(f) && /sequel/i.test(f)) ||
        /sequellesactuelles/i.test(f) ||
        /sequelles\.actuelles/i.test(f)
      ) || pdfFieldNames.find(f => /sequelle/i.test(f) && !/anterieur/i.test(f)) || 'sequellesActuelles',
      'sequellesActuelles': pdfFieldNames.find(f => 
        (/sequelle/i.test(f) && /actuel/i.test(f)) || 
        (/sequelle/i.test(f) && !/anterieur/i.test(f) && !/anterieure/i.test(f)) ||
        /sequellesactuelles/i.test(f) ||
        /sequelles\.actuelles/i.test(f)
      ) || pdfFieldNames.find(f => /sequelle/i.test(f) && !/anterieur/i.test(f)) || 'sequellesActuelles',
      'previousSequelae': pdfFieldNames.find(f => 
        (/sequelle/i.test(f) && (/anterieur/i.test(f) || /anterieure/i.test(f))) || 
        (/previous/i.test(f) && /sequel/i.test(f)) ||
        /sequellesanterieures/i.test(f) ||
        /sequelles\.anterieures/i.test(f)
      ) || pdfFieldNames.find(f => /sequelle/i.test(f) && /anterieur/i.test(f)) || 'sequellesAnterieures',
      'otherBilateralDeficits': pdfFieldNames.find(f => 
        (/deficit/i.test(f) && /bilateral/i.test(f)) || 
        (/autre/i.test(f) && /deficit/i.test(f)) ||
        (/deficit/i.test(f) && /later/i.test(f)) ||
        /deficitsbilateraux/i.test(f) ||
        /deficits\.bilateraux/i.test(f) ||
        /autresdeficits/i.test(f)
      ) || pdfFieldNames.find(f => /deficit/i.test(f) && /bilateral/i.test(f)) || 'deficitsBilateraux',
      'noteBene': (() => {
        // First, try to find exact 'nb' field (case-insensitive, but must be standalone or at word boundary)
        const exactNb = pdfFieldNames.find(f => {
          const fLower = f.toLowerCase();
          // Must contain 'nb' but NOT be part of a longer word (like 'trendelenburg' or module names)
          return (fLower === 'nb' || 
                  /^nb[^a-z0-9]|^nb$/i.test(f) || 
                  /[^a-z0-9]nb[^a-z0-9]|[^a-z0-9]nb$/i.test(f)) &&
                 !fLower.includes('trendelenburg') &&
                 !fLower.includes('specialized') &&
                 !fLower.includes('hip') &&
                 !fLower.includes('test');
        });
        if (exactNb) return exactNb;
        
        // Then try 'note bene' variations
        const noteBene = pdfFieldNames.find(f => {
          const fLower = f.toLowerCase();
          return (/note/i.test(fLower) && /bene/i.test(fLower)) ||
                 (/nota/i.test(fLower) && /bene/i.test(fLower));
        });
        if (noteBene) return noteBene;
        
        // Fallback to any field containing 'nb' but exclude module-related fields
        const anyNb = pdfFieldNames.find(f => {
          const fLower = f.toLowerCase();
          return /nb/i.test(fLower) &&
                 !fLower.includes('trendelenburg') &&
                 !fLower.includes('specialized') &&
                 !fLower.includes('hip') &&
                 !fLower.includes('test') &&
                 !fLower.includes('module');
        });
        return anyNb || 'nb';
      })(),
      'nb': (() => {
        // Same logic as noteBene
        const exactNb = pdfFieldNames.find(f => {
          const fLower = f.toLowerCase();
          return (fLower === 'nb' || 
                  /^nb[^a-z0-9]|^nb$/i.test(f) || 
                  /[^a-z0-9]nb[^a-z0-9]|[^a-z0-9]nb$/i.test(f)) &&
                 !fLower.includes('trendelenburg') &&
                 !fLower.includes('specialized') &&
                 !fLower.includes('hip') &&
                 !fLower.includes('test');
        });
        if (exactNb) return exactNb;
        
        const noteBene = pdfFieldNames.find(f => {
          const fLower = f.toLowerCase();
          return (/note/i.test(fLower) && /bene/i.test(fLower)) ||
                 (/nota/i.test(fLower) && /bene/i.test(fLower));
        });
        if (noteBene) return noteBene;
        
        const anyNb = pdfFieldNames.find(f => {
          const fLower = f.toLowerCase();
          return /nb/i.test(fLower) &&
                 !fLower.includes('trendelenburg') &&
                 !fLower.includes('specialized') &&
                 !fLower.includes('hip') &&
                 !fLower.includes('test') &&
                 !fLower.includes('module');
        });
        return anyNb || 'nb';
      })(),
      
      // Signature fields
      'doctorSignature': pdfFieldNames.find(f => /signature/i.test(f) && /medecin/i.test(f)) || pdfFieldNames.find(f => /signature/i.test(f)) || 'signatureMedecin',
      'doctorTitle': pdfFieldNames.find(f => /titre/i.test(f) && /medecin/i.test(f)) || pdfFieldNames.find(f => /specialite/i.test(f) || /chirurg/i.test(f)) || 'titreMedecin',
    };
    
    // For each form field, try to find matching PDF field
    Object.keys(formToPdfMapping).forEach(formField => {
      const pdfField = formToPdfMapping[formField];
      // Only add to mapping if the PDF field exists in detected fields
      // For null values (no match found), skip the mapping to use detected field name
      if (pdfField && pdfFieldNames.includes(pdfField)) {
        mapping[formField] = pdfField;
      } else if (pdfField && !detectedFields) {
        // Only use fallback if no fields detected at all
        mapping[formField] = pdfField;
      }
      // If pdfField is null, don't add to mapping - will use direct PDF field name if it exists
    });
    
    // Also add direct mappings if form field name matches PDF field name exactly
    if (detectedFields) {
      Object.keys(formData).forEach(formField => {
        if (pdfFieldNames.includes(formField) && !mapping[formField]) {
          mapping[formField] = formField; // Direct match
        }
      });
    }
    
    return mapping;
  }, [detectedFields, formData]);

  // Transform formData to PDF field names using the mapping
  const transformFormDataToPdfFields = useCallback((data) => {
    const pdfData = {};
    
    Object.keys(data).forEach(formField => {
      const value = data[formField];
      if (value === undefined || value === null || value === '') return;
      
      // Use mapping if available, otherwise try direct match or keep original name
      const pdfFieldName = fieldMapping[formField] || formField;
      pdfData[pdfFieldName] = value;
    });
    
    return pdfData;
  }, [fieldMapping]);

  // Load default template PDF on mount
  useEffect(() => {
    const loadDefaultTemplate = async () => {
      try {
        // First, set the PDF URL directly to the public folder path to preserve all content including images
          setPdfUrl('/Form.pdf');
          
          // Then fetch the PDF to get bytes for field detection
          const response = await fetch('/Form.pdf');
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          
          // Store bytes for form filling
          setOriginalPdfBytes(new Uint8Array(bytes));
          
          // Create a File-like object for state
          const blob = new Blob([bytes], { type: 'application/pdf' });
            const file = new File([blob], 'Form.pdf', { type: 'application/pdf' });
          setPdfFile(file);
          
          // Detect PDF form fields automatically (this doesn't modify the PDF, just reads it)
          const fieldInfo = await detectPdfFields(bytes);
          
          // Convert field info to fieldPositions format
          if (fieldInfo && fieldInfo.length > 0) {
            const positions = {};
            const typesMap = {};
            const initialFormData = {};
            
            fieldInfo.forEach(field => {
              if (field.position) {
                positions[field.name] = field.position;
                initialFormData[field.name] = '';
              }
              if (field.name && field.type) {
                typesMap[field.name] = field.type;
              }
            });
            
            if (Object.keys(positions).length > 0) {
              setDetectedFields(positions);
              setDetectedFieldTypes(typesMap);
              
              // Merge with existing formData to preserve defaults (like signature)
              setFormData(prev => {
                const merged = { ...prev };
                Object.keys(initialFormData).forEach(field => {
                  if (!merged[field] || merged[field] === '') {
                    merged[field] = initialFormData[field];
                  }
                });
                return merged;
              });
              
              console.log(`✅ Auto-detected ${Object.keys(positions).length} fields pixel-perfectly!`);
              console.log('📝 Fields:', Object.keys(positions).join(', '));
              console.log('📄 PDF loaded with original content preserved (signature image intact)');
            }
          }
          
            console.log('✅ Default template PDF (Form.pdf) loaded successfully!');
          } else {
            console.log('⚠️ Default template PDF (Form.pdf) not found.');
        }
      } catch (error) {
        console.error('Error loading default template:', error);
      }
    };
    
    loadDefaultTemplate();
  }, []); // Empty deps - only run once on mount

  // Clean up incorrect trendelenburg data - runs whenever trendelenburg data changes
  useEffect(() => {
    const cleanupTrendelenburg = () => {
      if (moduleData.hips && moduleData.hips.specializedTests && moduleData.hips.specializedTests.trendelenburg) {
        const suspiciousKeywords = ['asymétrie musculaire', 'asymetrie musculaire', 'pourcentage', 'pôle inférieur', 'rotule', 'tissus mous', 'atteinte'];
        let needsUpdate = false;
        
        setModuleData(prev => {
          const updated = JSON.parse(JSON.stringify(prev)); // Deep clone
          
          if (updated.hips && updated.hips.specializedTests && updated.hips.specializedTests.trendelenburg) {
            if (updated.hips.specializedTests.trendelenburg.right && typeof updated.hips.specializedTests.trendelenburg.right === 'string') {
              const value = updated.hips.specializedTests.trendelenburg.right;
              const hasSuspiciousKeywords = suspiciousKeywords.some(kw => value.toLowerCase().includes(kw.toLowerCase()));
              if (value.length > 100 && hasSuspiciousKeywords) {
                console.warn(`⚠️ Cleaning up incorrect trendelenburg right data: "${value.substring(0, 50)}..."`);
                updated.hips.specializedTests.trendelenburg.right = '';
                needsUpdate = true;
              }
            }
            
            if (updated.hips.specializedTests.trendelenburg.left && typeof updated.hips.specializedTests.trendelenburg.left === 'string') {
              const value = updated.hips.specializedTests.trendelenburg.left;
              const hasSuspiciousKeywords = suspiciousKeywords.some(kw => value.toLowerCase().includes(kw.toLowerCase()));
              if (value.length > 100 && hasSuspiciousKeywords) {
                console.warn(`⚠️ Cleaning up incorrect trendelenburg left data: "${value.substring(0, 50)}..."`);
                updated.hips.specializedTests.trendelenburg.left = '';
                needsUpdate = true;
              }
            }
          }
          
          return needsUpdate ? updated : prev;
        });
      }
    };
    
    cleanupTrendelenburg();
  }, [moduleData.hips?.specializedTests?.trendelenburg?.right, moduleData.hips?.specializedTests?.trendelenburg?.left]);

  const handleFillAndDownload = async () => {
    if (!originalPdfBytes) {
      alert('Please upload a PDF first!');
      return;
    }

    setIsProcessing(true);
    try {
      // IMPORTANT: Extract noteBene FIRST, directly from formData, before any processing
      // This ensures we get the actual user input, not any incorrectly mapped values
      const noteBeneFromForm = formData.noteBene || '';
      console.log(`📝 noteBene value from formData (PDF download): "${noteBeneFromForm}"`);
      
      // Prepare complete form data including sequelae table
      // IMPORTANT: Use the latest state values to ensure imported JSON data is included
      const completeFormData = { ...formData };
      
      console.log('📋 PDF Download - Current formData keys:', Object.keys(formData).length);
      console.log('📋 PDF Download - Current moduleData keys:', Object.keys(moduleData).length);
      console.log('📋 PDF Download - Current selectedModules:', Object.keys(selectedModules).filter(k => selectedModules[k]));
      console.log('📋 PDF Download - Current currentSequelae rows:', currentSequelae?.length || 0);
      
      // Map individual sequelae table fields to PDF fields
      if (currentSequelae && currentSequelae.length > 0) {
        const validSequelae = currentSequelae.filter(s => s.code || s.description || s.percentage);
        const pdfFieldNames = detectedFields ? Object.keys(detectedFields) : [];
        
        // Find primary/combined PDF fields for code and percentage (used by first row)
        const primaryCodeField = pdfFieldNames.find(f => 
          (/sequel/i.test(f) && /code/i.test(f) && !/\d/.test(f)) ||
          (/code/i.test(f) && /sequel/i.test(f) && !/\d/.test(f))
        ) || pdfFieldNames.find(f => 
          /sequel/i.test(f) && /code/i.test(f)
        );
        
        const primaryPctField = pdfFieldNames.find(f => 
          (/sequel/i.test(f) && (/%/i.test(f) || /percentage/i.test(f) || /pct/i.test(f) || /pourcent/i.test(f)) && !/\d/.test(f)) ||
          ((/%/i.test(f) || /percentage/i.test(f) || /pct/i.test(f) || /pourcent/i.test(f)) && /sequel/i.test(f) && !/\d/.test(f))
        ) || pdfFieldNames.find(f => 
          /sequel/i.test(f) && (/%/i.test(f) || /percentage/i.test(f) || /pct/i.test(f) || /pourcent/i.test(f))
        );
        
        // For each row, map code, description, and percentage to individual PDF fields
        validSequelae.forEach((sequela, index) => {
          const rowNum = index + 1;
          
          // Find PDF fields for this row's code, description, and percentage
          // Pattern: code_de_sequelle1, codeDeSequelle1, sequelaCode1, sequelleCode1, etc.
          const codeField = pdfFieldNames.find(f => 
            // Match code_de_sequelle1, code_de_sequelle2, etc.
            (new RegExp(`code[^0-9]*(?:de[^0-9]*)?(?:sequel|sequelle)[^0-9]*${rowNum}[^0-9]*$|^code[^0-9]*(?:de[^0-9]*)?(?:sequel|sequelle)[^0-9]*${rowNum}[^0-9]*`, 'i').test(f)) ||
            // Match sequelaCode1, sequelleCode1, etc.
            (new RegExp(`(?:sequel|sequelle)[^0-9]*code[^0-9]*${rowNum}[^0-9]*$|^(?:sequel|sequelle)[^0-9]*code[^0-9]*${rowNum}[^0-9]*`, 'i').test(f)) ||
            // Match code with row number and sequel
            (/code/i.test(f) && new RegExp(`${rowNum}`).test(f) && /sequel/i.test(f))
          ) || pdfFieldNames.find(f => 
            (/sequel/i.test(f) && /code/i.test(f) && rowNum === 1) ||
            (index === 0 && /sequel/i.test(f) && /code/i.test(f))
          );
          
          const descField = pdfFieldNames.find(f => 
            (/sequel/i.test(f) && /description/i.test(f) && new RegExp(`[^0-9]*${rowNum}[^0-9]*$|^[^0-9]*${rowNum}[^0-9]*`).test(f)) ||
            (/description/i.test(f) && new RegExp(`${rowNum}`).test(f) && /sequel/i.test(f))
          ) || pdfFieldNames.find(f => 
            (/sequel/i.test(f) && /description/i.test(f) && rowNum === 1) ||
            (index === 0 && /sequel/i.test(f) && /description/i.test(f))
          );
          
          // Find PDF fields for percentage - Pattern: pourcentage1, pourcentage2, pourcentage_de_sequelle1, etc.
          const pctField = pdfFieldNames.find(f => 
            // Match simple patterns: pourcentage1, pourcentage2, percentage1, percentage2 (priority - exact match)
            (new RegExp(`^pourcentage${rowNum}$|^percentage${rowNum}$|^pct${rowNum}$`, 'i').test(f)) ||
            // Match pourcentage_de_sequelle1, pourcentage_de_sequelle2, etc.
            (new RegExp(`(?:pourcent|percentage|pct)[^0-9]*(?:age[^0-9]*)?(?:de[^0-9]*)?(?:sequel|sequelle)[^0-9]*${rowNum}[^0-9]*$|^(?:pourcent|percentage|pct)[^0-9]*(?:age[^0-9]*)?(?:de[^0-9]*)?(?:sequel|sequelle)[^0-9]*${rowNum}[^0-9]*`, 'i').test(f)) ||
            // Match sequelaPercentage1, sequellePercentage1, etc.
            (new RegExp(`(?:sequel|sequelle)[^0-9]*(?:pourcent|percentage|pct)[^0-9]*${rowNum}[^0-9]*$|^(?:sequel|sequelle)[^0-9]*(?:pourcent|percentage|pct)[^0-9]*${rowNum}[^0-9]*`, 'i').test(f)) ||
            // Match percentage with row number and sequel
            ((/%/i.test(f) || /percentage/i.test(f) || /pct/i.test(f) || /pourcent/i.test(f)) && new RegExp(`${rowNum}`).test(f) && /sequel/i.test(f))
          ) || pdfFieldNames.find(f => 
            (/sequel/i.test(f) && (/%/i.test(f) || /percentage/i.test(f) || /pct/i.test(f) || /pourcent/i.test(f)) && rowNum === 1) ||
            (index === 0 && /sequel/i.test(f) && (/%/i.test(f) || /percentage/i.test(f) || /pct/i.test(f) || /pourcent/i.test(f)))
          );
          
          // Add individual fields to completeFormData
          if (sequela.code) {
            // Always add with PDF field name (if found) - this ensures proper linking
            if (codeField) {
              completeFormData[codeField] = sequela.code;
              console.log(`✅ Mapped row ${rowNum} code to PDF field: ${codeField} = "${sequela.code}"`);
            }
            // Also add with form field name for reference
            completeFormData[`sequelaCode${rowNum}`] = sequela.code;
            
            // For first row, also link to primary code field (without row number)
            if (index === 0 && primaryCodeField && primaryCodeField !== codeField) {
              completeFormData[primaryCodeField] = sequela.code;
              console.log(`✅ Also mapped row ${rowNum} code to primary PDF field: ${primaryCodeField} = "${sequela.code}"`);
            }
          }
          if (sequela.description && descField) {
            completeFormData[`sequelaDescription${rowNum}`] = sequela.description;
            completeFormData[descField] = sequela.description;
          }
          if (sequela.percentage) {
            // Always add with PDF field name (if found) - this ensures proper linking
            if (pctField) {
              completeFormData[pctField] = sequela.percentage;
              console.log(`✅ Mapped row ${rowNum} percentage to PDF field: ${pctField} = "${sequela.percentage}"`);
            }
            // Also add with simple field names: pourcentage1, pourcentage2 (for direct PDF field matching)
            completeFormData[`pourcentage${rowNum}`] = sequela.percentage;
            // Also add with form field name for reference
            completeFormData[`sequelaPercentage${rowNum}`] = sequela.percentage;
            
            // For first row, also link to primary percentage field (without row number)
            if (index === 0 && primaryPctField && primaryPctField !== pctField) {
              completeFormData[primaryPctField] = sequela.percentage;
              console.log(`✅ Also mapped row ${rowNum} percentage to primary PDF field: ${primaryPctField} = "${sequela.percentage}"`);
            }
          }
        });
        
        // Also keep the combined format for backward compatibility
        if (validSequelae.length > 0) {
          const sequelaeText = validSequelae
            .map(s => {
              const parts = [];
              if (s.code) parts.push(`Code: ${s.code}`);
              if (s.description) parts.push(`Description: ${s.description}`);
              if (s.percentage) parts.push(`%: ${s.percentage}`);
              return parts.join(' | ');
            })
            .join('\n');
          completeFormData.currentSequelae = sequelaeText;
        }
      }
      
      // Ensure all Section 12 fields are included:
      // - currentSequelae (from table) - already added above
      // - previousSequelae (from formData) - already in formData
      // - otherBilateralDeficits (from formData) - already in formData
      // - noteBene (from formData) - already in formData
      
      // Separate form fields from direct PDF field names
      const pdfFieldNames = detectedFields ? Object.keys(detectedFields) : [];
      const formFieldsOnly = {};
      const directPdfFields = {};
      
      // Extract noteBene separately to prevent incorrect mapping
      // Use the value we captured directly from formData, not from completeFormData
      // (completeFormData might have been modified by module data processing)
      let noteBeneValue = noteBeneFromForm || null;
      
      // Double-check: if completeFormData.noteBene is different from what we captured,
      // it means something overwrote it - use the original formData value
      if (completeFormData.noteBene !== noteBeneFromForm && noteBeneFromForm) {
        console.warn(`⚠️ noteBene was overwritten! Original: "${noteBeneFromForm}", Current: "${completeFormData.noteBene}"`);
        console.warn(`⚠️ Using original formData value: "${noteBeneFromForm}"`);
        noteBeneValue = noteBeneFromForm;
      } else if (completeFormData.noteBene && !noteBeneFromForm) {
        // If we didn't capture it initially but it exists now, use it
        noteBeneValue = completeFormData.noteBene;
      }
      
      console.log(`📝 Final noteBene value for PDF download: "${noteBeneValue}"`);
      
      Object.keys(completeFormData).forEach(key => {
        const value = completeFormData[key];
        if (value === undefined || value === null || value === '') return;
        
        // Skip noteBene - it will be handled separately to prevent incorrect mapping
        if (key === 'noteBene' || key === 'nb') {
          return;
        }
        
        // If the key is already a PDF field name (exists in detectedFields), preserve it directly
        // BUT: Check if it's 'nb' and has a suspicious value (like "Neg" from trendelenburg)
        if (detectedFields && detectedFields[key]) {
          // Special check for 'nb' field - don't use it if it looks like trendelenburg data
          if ((key.toLowerCase() === 'nb' || key === 'nb') && typeof value === 'string') {
            const suspiciousKeywords = ['neg', 'trendelenburg', 'specialized', 'hip', 'test', 'positive', 'negative'];
            const isSuspicious = suspiciousKeywords.some(kw => value.toLowerCase().includes(kw.toLowerCase()));
            if (isSuspicious) {
              console.warn(`⚠️ Skipping 'nb' field from directPdfFields - value appears to be from trendelenburg: "${value}"`);
              return; // Skip this field - we'll use the formData value instead
            }
          }
          directPdfFields[key] = value;
          console.log(`✅ Preserved direct PDF field mapping: ${key} = "${value}"`);
        } else {
          // Otherwise, it's a form field that needs transformation
          formFieldsOnly[key] = value;
        }
      });
      
      // Transform form fields to PDF field names using fieldMapping
      const pdfFormData = transformFormDataToPdfFields(formFieldsOnly);
      
      // Merge direct PDF fields (these take priority and won't be overwritten)
      // BUT: Remove 'nb' from directPdfFields if it has a suspicious value
      const cleanedDirectPdfFields = { ...directPdfFields };
      Object.keys(cleanedDirectPdfFields).forEach(key => {
        if ((key.toLowerCase() === 'nb' || key === 'nb') && typeof cleanedDirectPdfFields[key] === 'string') {
          const value = cleanedDirectPdfFields[key];
          const suspiciousKeywords = ['neg', 'trendelenburg', 'specialized', 'hip', 'test', 'positive', 'negative'];
          const isSuspicious = suspiciousKeywords.some(kw => value.toLowerCase().includes(kw.toLowerCase()));
          if (isSuspicious) {
            console.warn(`⚠️ Removing 'nb' from directPdfFields - value appears to be from trendelenburg: "${value}"`);
            delete cleanedDirectPdfFields[key];
          }
        }
      });
      
      Object.assign(pdfFormData, cleanedDirectPdfFields);
      
      // Explicitly handle noteBene separately - ensure it maps to 'nb' and NOT to trendelenburg
      // ALWAYS use the value captured directly from formData, regardless of what's in pdfFormData
      if (noteBeneValue && noteBeneValue.trim() !== '') {
        // Remove any incorrect mappings that might have been created
        Object.keys(pdfFormData).forEach(key => {
          const keyLower = key.toLowerCase();
          // If this field contains 'nb' but is related to trendelenburg or modules, remove it
          if ((keyLower.includes('nb') || keyLower === 'nb') && 
              (keyLower.includes('trendelenburg') || 
               keyLower.includes('specialized') || 
               keyLower.includes('hip') || 
               keyLower.includes('test') ||
               keyLower.startsWith('hips'))) {
            delete pdfFormData[key];
            console.log(`⚠️ Removed incorrect mapping for nb field: ${key}`);
          }
        });
        
        // ALWAYS explicitly set to 'nb' using the value from formData
        // This ensures we use the actual user input, not any incorrectly mapped values
        pdfFormData['nb'] = noteBeneValue;
        console.log(`✅ Explicitly mapped noteBene to PDF field (PDF download): nb = "${noteBeneValue}" (from formData)`);
      } else if (noteBeneValue === '' || !noteBeneValue) {
        // Even if empty, ensure 'nb' field exists and is empty (not set to trendelenburg value)
        // Remove any existing 'nb' mappings that might be from trendelenburg
        Object.keys(pdfFormData).forEach(key => {
          if (key.toLowerCase() === 'nb' || key === 'nb') {
            const value = pdfFormData[key];
            // Check if the value looks like it's from trendelenburg
            if (value && typeof value === 'string' && 
                (value.toLowerCase().includes('neg') || 
                 value.toLowerCase().includes('trendelenburg') ||
                 value.toLowerCase().includes('positive') ||
                 value.toLowerCase().includes('negative'))) {
              delete pdfFormData[key];
              console.log(`⚠️ Removed incorrect 'nb' value that appears to be from trendelenburg: "${value}"`);
            }
          }
        });
        // Set to empty string to ensure it's not linked to trendelenburg
        pdfFormData['nb'] = '';
      }
      
      // Ensure Section 12 fields are properly mapped to PDF field names for PDF download
      // USE EXACT SAME LOGIC AS JSON EXPORT
      // Note: pdfFieldNames was already declared above
      
      // 1. Current Sequelae
      if (completeFormData.currentSequelae) {
        const mappedField = fieldMapping.currentSequelae || fieldMapping.sequellesActuelles;
        if (mappedField && pdfFieldNames.includes(mappedField)) {
          if (!pdfFormData[mappedField]) {
            pdfFormData[mappedField] = completeFormData.currentSequelae;
          }
        } else {
          const sequelaePdfField = pdfFieldNames.find(f => 
            (/sequelle/i.test(f) && /actuel/i.test(f)) || 
            (/sequelle/i.test(f) && !/anterieur/i.test(f) && !/anterieure/i.test(f) && !/previous/i.test(f)) ||
            /sequellesactuelles/i.test(f) ||
            /sequelles\.actuelles/i.test(f)
          ) || pdfFieldNames.find(f => /sequelle/i.test(f) && !/anterieur/i.test(f) && !/anterieure/i.test(f));
          
          if (sequelaePdfField && !pdfFormData[sequelaePdfField]) {
            pdfFormData[sequelaePdfField] = completeFormData.currentSequelae;
          } else if (mappedField && !pdfFormData[mappedField]) {
            pdfFormData[mappedField] = completeFormData.currentSequelae;
          }
        }
      }
      
      // 2. Previous Sequelae
      if (completeFormData.previousSequelae) {
        const mappedField = fieldMapping.previousSequelae;
        if (mappedField && pdfFieldNames.includes(mappedField)) {
          if (!pdfFormData[mappedField]) {
            pdfFormData[mappedField] = completeFormData.previousSequelae;
          }
        } else {
          const previousSequelaePdfField = pdfFieldNames.find(f => 
            (/sequelle/i.test(f) && (/anterieur/i.test(f) || /anterieure/i.test(f))) || 
            (/previous/i.test(f) && /sequel/i.test(f)) ||
            /sequellesanterieures/i.test(f) ||
            /sequelles\.anterieures/i.test(f)
          ) || pdfFieldNames.find(f => /sequelle/i.test(f) && /anterieur/i.test(f));
          
          if (previousSequelaePdfField && !pdfFormData[previousSequelaePdfField]) {
            pdfFormData[previousSequelaePdfField] = completeFormData.previousSequelae;
          } else if (mappedField && !pdfFormData[mappedField]) {
            pdfFormData[mappedField] = completeFormData.previousSequelae;
          }
        }
      }
      
      // 3. Other Bilateral Deficits
      if (completeFormData.otherBilateralDeficits) {
        const mappedField = fieldMapping.otherBilateralDeficits;
        if (mappedField && pdfFieldNames.includes(mappedField)) {
          if (!pdfFormData[mappedField]) {
            pdfFormData[mappedField] = completeFormData.otherBilateralDeficits;
          }
        } else {
          const deficitsPdfField = pdfFieldNames.find(f => 
            (/deficit/i.test(f) && /bilateral/i.test(f)) || 
            (/autre/i.test(f) && /deficit/i.test(f)) ||
            (/deficit/i.test(f) && /later/i.test(f)) ||
            /deficitsbilateraux/i.test(f) ||
            /deficits\.bilateraux/i.test(f) ||
            /autresdeficits/i.test(f)
          ) || pdfFieldNames.find(f => /deficit/i.test(f) && /bilateral/i.test(f));
          
          if (deficitsPdfField && !pdfFormData[deficitsPdfField]) {
            pdfFormData[deficitsPdfField] = completeFormData.otherBilateralDeficits;
          } else if (mappedField && !pdfFormData[mappedField]) {
            pdfFormData[mappedField] = completeFormData.otherBilateralDeficits;
          }
        }
      }
      
      // 4. Note Bene (NB) - PDF Download
      // Always use 'nb' as the PDF field name for PDF download
      // This is already handled above, but ensure no trendelenburg fields are linked
      if (noteBeneValue && pdfFormData['nb'] !== noteBeneValue) {
        // Remove any incorrect trendelenburg-related fields that might have been mapped
        Object.keys(pdfFormData).forEach(key => {
          const keyLower = key.toLowerCase();
          if ((keyLower.includes('nb') || keyLower === 'nb') && 
              (keyLower.includes('trendelenburg') || 
               keyLower.includes('specialized') || 
               keyLower.includes('hip') || 
               keyLower.includes('test') ||
               keyLower.startsWith('hips'))) {
            delete pdfFormData[key];
            console.log(`⚠️ Removed incorrect nb mapping to trendelenburg field: ${key}`);
          }
        });
        
        // Explicitly set to 'nb'
        pdfFormData['nb'] = noteBeneValue;
        console.log(`✅ Ensured noteBene maps to 'nb' (PDF download): nb = "${noteBeneValue}"`);
      }
      
      // 5. Section 4 & 5 Fields - Explicit handling for age, tabac, cannabis, alcool
      // Age (Section 4) - Map to age_identification
      if (completeFormData.age) {
        const ageMappedField = fieldMapping.age || 'age_identification';
        // Prioritize age_identification field
        const agePdfField = pdfFieldNames.find(f => /age_identification/i.test(f)) || 
                           pdfFieldNames.find(f => /ageidentification/i.test(f)) ||
                           pdfFieldNames.find(f => /^age$/i.test(f)) || 
                           ageMappedField;
        if (agePdfField && pdfFieldNames.includes(agePdfField)) {
          if (!pdfFormData[agePdfField]) {
            pdfFormData[agePdfField] = completeFormData.age;
            console.log(`✅ Mapped age to PDF field (PDF download): ${agePdfField} = "${completeFormData.age}"`);
          }
        } else if (ageMappedField) {
          pdfFormData[ageMappedField] = completeFormData.age;
          console.log(`✅ Mapped age to PDF field (PDF download, fallback): ${ageMappedField} = "${completeFormData.age}"`);
        }
      }
      
      // Tabac (Section 5)
      const tabacValue = completeFormData.tobacco || completeFormData.tabac;
      console.log(`📝 Tabac value for PDF download: "${tabacValue}" (tobacco: "${completeFormData.tobacco}", tabac: "${completeFormData.tabac}")`);
      if (tabacValue && tabacValue.trim() !== '') {
        const tabacMappedField = fieldMapping.tabac || fieldMapping.tobacco || 'tabac';
        const tabacPdfField = pdfFieldNames.find(f => /tabac/i.test(f)) || tabacMappedField;
        if (tabacPdfField && pdfFieldNames.includes(tabacPdfField)) {
          if (!pdfFormData[tabacPdfField]) {
            pdfFormData[tabacPdfField] = tabacValue;
            console.log(`✅ Mapped tabac to PDF field (PDF download): ${tabacPdfField} = "${tabacValue}"`);
          }
        } else if (tabacMappedField) {
          pdfFormData[tabacMappedField] = tabacValue;
          console.log(`✅ Mapped tabac to PDF field (PDF download, fallback): ${tabacMappedField} = "${tabacValue}"`);
        }
      } else {
        console.log(`⚠️ Tabac value is empty or not set, skipping PDF download`);
      }
      
      // Cannabis (Section 5)
      console.log(`📝 Cannabis value for PDF download: "${completeFormData.cannabis}"`);
      if (completeFormData.cannabis && completeFormData.cannabis.trim() !== '') {
        const cannabisMappedField = fieldMapping.cannabis || 'cannabis';
        const cannabisPdfField = pdfFieldNames.find(f => /cannabis/i.test(f)) || cannabisMappedField;
        if (cannabisPdfField && pdfFieldNames.includes(cannabisPdfField)) {
          if (!pdfFormData[cannabisPdfField]) {
            pdfFormData[cannabisPdfField] = completeFormData.cannabis;
            console.log(`✅ Mapped cannabis to PDF field (PDF download): ${cannabisPdfField} = "${completeFormData.cannabis}"`);
          }
        } else if (cannabisMappedField) {
          pdfFormData[cannabisMappedField] = completeFormData.cannabis;
          console.log(`✅ Mapped cannabis to PDF field (PDF download, fallback): ${cannabisMappedField} = "${completeFormData.cannabis}"`);
        }
      } else {
        console.log(`⚠️ Cannabis value is empty or not set, skipping PDF download`);
      }
      
      // Alcool (Section 5)
      const alcoolValue = completeFormData.alcohol || completeFormData.alcool;
      console.log(`📝 Alcool value for PDF download: "${alcoolValue}" (alcohol: "${completeFormData.alcohol}", alcool: "${completeFormData.alcool}")`);
      if (alcoolValue && alcoolValue.trim() !== '') {
        const alcoolMappedField = fieldMapping.alcool || fieldMapping.alcohol || 'alcool';
        const alcoolPdfField = pdfFieldNames.find(f => /alcool/i.test(f)) || alcoolMappedField;
        if (alcoolPdfField && pdfFieldNames.includes(alcoolPdfField)) {
          if (!pdfFormData[alcoolPdfField]) {
            pdfFormData[alcoolPdfField] = alcoolValue;
            console.log(`✅ Mapped alcool to PDF field (PDF download): ${alcoolPdfField} = "${alcoolValue}"`);
          }
        } else if (alcoolMappedField) {
          pdfFormData[alcoolMappedField] = alcoolValue;
          console.log(`✅ Mapped alcool to PDF field (PDF download, fallback): ${alcoolMappedField} = "${alcoolValue}"`);
        }
      } else {
        console.log(`⚠️ Alcool value is empty or not set, skipping PDF download`);
      }
      
      // 6. Physical Dominance (dominance_examen) - PDF Download
      if (completeFormData.physicalDominance) {
        const mappedField = fieldMapping.physicalDominance || 'dominance_examen';
        // Check if dominance_examen exists in PDF fields
        const dominancePdfField = pdfFieldNames.find(f => /dominance_examen/i.test(f)) || mappedField;
        
        if (dominancePdfField && pdfFieldNames.includes(dominancePdfField)) {
          if (!pdfFormData[dominancePdfField]) {
            pdfFormData[dominancePdfField] = completeFormData.physicalDominance;
            console.log(`✅ Mapped physicalDominance to PDF field (PDF download): ${dominancePdfField} = "${completeFormData.physicalDominance}"`);
          }
        } else if (mappedField) {
          // Even if not detected, use the mapped field name
          if (!pdfFormData[mappedField]) {
            pdfFormData[mappedField] = completeFormData.physicalDominance;
            console.log(`✅ Mapped physicalDominance to PDF field (PDF download, fallback): ${mappedField} = "${completeFormData.physicalDominance}"`);
          }
        }
      }
      
      // 7. Paraclinical Exams (examensParacliniques) - PDF Download
      if (completeFormData.paraclinicalExams) {
        const mappedField = fieldMapping.paraclinicalExams || 'examensParacliniques';
        // Check if examensParacliniques exists in PDF fields
        const paraclinicalPdfField = pdfFieldNames.find(f => /examensParacliniques/i.test(f)) || pdfFieldNames.find(f => /paraclinique/i.test(f)) || mappedField;
        
        if (paraclinicalPdfField && pdfFieldNames.includes(paraclinicalPdfField)) {
          if (!pdfFormData[paraclinicalPdfField]) {
            pdfFormData[paraclinicalPdfField] = completeFormData.paraclinicalExams;
            console.log(`✅ Mapped paraclinicalExams to PDF field (PDF download): ${paraclinicalPdfField} = "${completeFormData.paraclinicalExams}"`);
          }
        } else if (mappedField) {
          // Even if not detected, use the mapped field name
          if (!pdfFormData[mappedField]) {
            pdfFormData[mappedField] = completeFormData.paraclinicalExams;
            console.log(`✅ Mapped paraclinicalExams to PDF field (PDF download, fallback): ${mappedField} = "${completeFormData.paraclinicalExams}"`);
          }
        }
      }
      
      // Process Section 9 module data and map to PDF fields
      // USE EXACT SAME FUNCTION AS JSON EXPORT
      // USE EXACT SAME FUNCTION AS JSON EXPORT - copied from handleExportToJSON
      const processModuleDataToPdfFieldsJSON = (moduleKey, moduleDataValue, selectedModulesValue, pdfFieldNamesList) => {
        const modulePdfFields = {};
        
        // Helper to find PDF field name for a module field
        const findPdfField = (moduleName, fieldPath) => {
          // Special mappings for exact PDF field names
          const specialFieldMappings = {
            'rangeOfMotion.lateralFlexionL': [
              'Flexion Latérale G. 30o',
              'Flexion Latérale G.',
              'Flexion Latérale G',
              'Flexion Laterale G. 30o',
              'Flexion Laterale G.',
              'Flexion Laterale G',
              'flexion_laterale_g_30o',
              'flexion_laterale_g',
              'lateralFlexionL',
              'lateral_flexion_l'
            ],
            'rangeOfMotion.lateralFlexionR': [
              'Flexion Latérale D. 30o',
              'Flexion Latérale D.',
              'Flexion Latérale D',
              'Flexion Laterale D. 30o',
              'Flexion Laterale D.',
              'Flexion Laterale D',
              'flexion_laterale_d_30o',
              'flexion_laterale_d',
              'lateralFlexionR',
              'lateral_flexion_r'
            ],
            'rangeOfMotion.rotationL': [
              'Rotation G. 30o',
              'Rotation G.',
              'Rotation G',
              'rotation_g_30o',
              'rotation_g',
              'rotationG',
              'rotationL',
              'rotation_l'
            ],
            'rangeOfMotion.rotationR': [
              'Rotation D.',
              'Rotation D',
              'Rotation D. 30o',
              'rotation_d',
              'rotation_d_30o',
              'rotationD',
              'rotationR',
              'rotation_r'
            ],
            'specializedTests.trendelenburg.right': [
              'trendelenburg_right',
              'trendelenburgRight',
              'trendelenburg.droit',
              'trendelenburg_droit',
              'trendelenburgDroit',
              'hips.trendelenburg.right',
              'hips_trendelenburg_right',
              'hanches.trendelenburg.droit',
              'hanches_trendelenburg_droit',
              'hip.trendelenburg.right',
              'hip_trendelenburg_right',
              'testTrendelenburgDroit',
              'test_trendelenburg_droit',
              'testTrendelenburg.droit',
              'testTrendelenburgD',
              'trendelenburgD',
              'trendelenburgDroit',
              'trendelenburg_d',
              'testTrendelenburgD',
              'test_trendelenburg_d',
              'hanches.trendelenburg.droit',
              'hanches_trendelenburg_droit',
              'hanchesTrendelenburgDroit',
              'hanches_trendelenburg_droit'
            ],
            'specializedTests.trendelenburg.left': [
              'trendelenburg_left',
              'trendelenburgLeft',
              'trendelenburg.gauche',
              'trendelenburg_gauche',
              'trendelenburgGauche',
              'hips.trendelenburg.left',
              'hips_trendelenburg_left',
              'hanches.trendelenburg.gauche',
              'hanches_trendelenburg_gauche',
              'hip.trendelenburg.left',
              'hip_trendelenburg_left',
              'testTrendelenburgGauche',
              'test_trendelenburg_gauche',
              'testTrendelenburg.gauche',
              'testTrendelenburgG',
              'trendelenburgG',
              'trendelenburgGauche',
              'trendelenburg_g',
              'testTrendelenburgG',
              'test_trendelenburg_g',
              'hanches.trendelenburg.gauche',
              'hanches_trendelenburg_gauche',
              'hanchesTrendelenburgGauche',
              'hanches_trendelenburg_gauche'
            ]
          };
          
          // Check for special mappings first
          if (specialFieldMappings[fieldPath]) {
            for (const mapping of specialFieldMappings[fieldPath]) {
              const found = pdfFieldNamesList.find(f => 
                f === mapping ||
                f.toLowerCase() === mapping.toLowerCase() ||
                f.toLowerCase().includes(mapping.toLowerCase()) ||
                mapping.toLowerCase().includes(f.toLowerCase())
              );
              if (found) {
                console.log(`✅ Found special mapping: ${fieldPath} -> ${found}`);
                return found;
              }
            }
          }
          
          // Special handling for trendelenburg fields - try fuzzy matching
          if (fieldPath.includes('trendelenburg')) {
            const isRight = fieldPath.includes('.right') || fieldPath.includes('right');
            const isLeft = fieldPath.includes('.left') || fieldPath.includes('left');
            
            if (isRight) {
              // Try to find any field containing trendelenburg and droit/right
              const fuzzyMatch = pdfFieldNamesList.find(f => {
                const fLower = f.toLowerCase();
                return (fLower.includes('trendelenburg') || fLower.includes('trendelen')) &&
                       (fLower.includes('droit') || fLower.includes('right') || fLower.includes('d.') || fLower.endsWith('d'));
              });
              if (fuzzyMatch) {
                console.log(`✅ Found fuzzy match for trendelenburg right (PDF download): ${fieldPath} -> ${fuzzyMatch}`);
                return fuzzyMatch;
              }
            } else if (isLeft) {
              // Try to find any field containing trendelenburg and gauche/left
              const fuzzyMatch = pdfFieldNamesList.find(f => {
                const fLower = f.toLowerCase();
                return (fLower.includes('trendelenburg') || fLower.includes('trendelen')) &&
                       (fLower.includes('gauche') || fLower.includes('left') || fLower.includes('g.') || fLower.endsWith('g'));
              });
              if (fuzzyMatch) {
                console.log(`✅ Found fuzzy match for trendelenburg left (PDF download): ${fieldPath} -> ${fuzzyMatch}`);
                return fuzzyMatch;
              }
            }
          }
          
          // Try various patterns: moduleName.fieldPath, moduleName_fieldPath, etc.
          const patterns = [
            `${moduleName}.${fieldPath}`,
            `${moduleName}_${fieldPath}`,
            `${moduleName}${fieldPath.charAt(0).toUpperCase() + fieldPath.slice(1)}`,
            fieldPath.replace(/([A-Z])/g, '_$1').toLowerCase(),
            fieldPath.replace(/([A-Z])/g, '.$1').toLowerCase()
          ];
          
          // Also try French translations for common module names
          const moduleTranslations = {
            'cervicalSpine': ['colonne_cervicale', 'colonneCervicale', 'cervical'],
            'lumbarSpine': ['colonne_lombaire', 'colonneLombaire', 'lombaire'],
            'shoulders': ['epaules', 'epaule', 'shoulder'],
            'elbows': ['coudes', 'coude', 'elbow'],
            'wristsHands': ['poignets_mains', 'poignetsMains', 'poignet', 'wrist', 'hand'],
            'hips': ['hanches', 'hanche', 'hip'],
            'knees': ['genoux', 'genou', 'knee'],
            'feetAnkles': ['pieds_chevilles', 'piedsChevilles', 'pied', 'ankle'],
            'muscleAtrophy': ['atrophie_musculaire', 'atrophieMusculaire', 'atrophie'],
            'neurovascularAssessment': ['evaluation_neurovasculaire', 'evaluationNeurovasculaire', 'neurovasculaire']
          };
          
          const translations = moduleTranslations[moduleName] || [moduleName];
          
          for (const pattern of patterns) {
            for (const translation of translations) {
              const testPatterns = [
                `${translation}.${fieldPath}`,
                `${translation}_${fieldPath}`,
                `${translation}${fieldPath.charAt(0).toUpperCase() + fieldPath.slice(1)}`
              ];
              
              for (const testPattern of testPatterns) {
                const found = pdfFieldNamesList.find(f => 
                  f.toLowerCase() === testPattern.toLowerCase() ||
                  f.toLowerCase().includes(testPattern.toLowerCase()) ||
                  testPattern.toLowerCase().includes(f.toLowerCase())
                );
                if (found) return found;
              }
            }
            
            const found = pdfFieldNamesList.find(f => 
              f.toLowerCase() === pattern.toLowerCase() ||
              f.toLowerCase().includes(pattern.toLowerCase()) ||
              pattern.toLowerCase().includes(f.toLowerCase())
            );
            if (found) return found;
          }
          
          return null;
        };
        
        // Recursively process module data
        const processValue = (value, path = '') => {
          if (value === null || value === undefined || value === '') return;
          
          if (typeof value === 'object' && !Array.isArray(value)) {
            Object.keys(value).forEach(key => {
              const newPath = path ? `${path}.${key}` : key;
              processValue(value[key], newPath);
            });
          } else if (Array.isArray(value)) {
            // Arrays are handled separately (e.g., physicalExamMeasurements)
            return;
          } else {
            // Leaf value - map to PDF field
            const pdfField = findPdfField(moduleKey, path);
            if (pdfField && value) {
              modulePdfFields[pdfField] = String(value);
              console.log(`✅ Mapped Section 9 field (PDF download): ${moduleKey}.${path} -> ${pdfField} = "${value}"`);
            } else if (value) {
              // If no PDF field found, still add with module path for reference
              const fallbackField = `${moduleKey}.${path}`.replace(/\./g, '_');
              modulePdfFields[fallbackField] = String(value);
              console.log(`⚠️ Section 9 field not found in PDF (PDF download), using fallback: ${moduleKey}.${path} -> ${fallbackField}`);
              // Special handling for trendelenburg fields - ensure they're exported even if not found in PDF
              if (path.includes('trendelenburg')) {
                console.log(`📝 Trendelenburg field detected (PDF download): ${moduleKey}.${path}, ensuring export with fallback field: ${fallbackField}`);
              }
            }
          }
        };
        
        // Process module data if selected OR if it has data (for imported JSON)
        if (moduleDataValue && (selectedModulesValue[moduleKey] || moduleDataValue)) {
          processValue(moduleDataValue);
        }
        
        return modulePdfFields;
      };
      
      // Process all selected modules and add to pdfFormData
      // USE EXACT SAME LOGIC AS JSON EXPORT
      // IMPORTANT: Also process modules that have data even if not explicitly selected
      // This ensures imported JSON data is included even if modules weren't manually selected
      const modulesToProcess = new Set();
      
      // First, add all selected modules
      Object.keys(selectedModules).forEach(moduleKey => {
        if (selectedModules[moduleKey]) {
          modulesToProcess.add(moduleKey);
        }
      });
      
      // Also include modules that have data (from JSON import)
      Object.keys(moduleData).forEach(moduleKey => {
        if (moduleData[moduleKey] && Object.keys(moduleData[moduleKey]).length > 0) {
          // Check if module has any actual data (not just empty objects)
          const hasData = Object.values(moduleData[moduleKey]).some(value => {
            if (typeof value === 'object' && value !== null) {
              return Object.keys(value).length > 0;
            }
            return value !== '' && value !== null && value !== undefined;
          });
          if (hasData) {
            modulesToProcess.add(moduleKey);
            console.log(`📝 Including module ${moduleKey} in PDF download (has data from import)`);
          }
        }
      });
      
      // Create a modified selectedModules that includes all modules with data
      // This ensures processModuleDataToPdfFieldsJSON processes all imported data
      const effectiveSelectedModules = { ...selectedModules };
      modulesToProcess.forEach(moduleKey => {
        effectiveSelectedModules[moduleKey] = true;
      });
      
      modulesToProcess.forEach(moduleKey => {
        if (moduleData[moduleKey]) {
          // USE EXACT SAME FUNCTION AS JSON EXPORT
          const modulePdfFields = processModuleDataToPdfFieldsJSON(moduleKey, moduleData[moduleKey], effectiveSelectedModules, pdfFieldNames);
          
          // CRITICAL: Remove any 'nb' field from module data - it should NEVER come from modules
          // Module data should only contain trendelenburg, range of motion, etc., NOT 'nb'
          Object.keys(modulePdfFields).forEach(key => {
            if (key.toLowerCase() === 'nb' || key === 'nb') {
              console.warn(`⚠️ Removed 'nb' field from module data (${moduleKey}) - nb should only come from formData.noteBene`);
              delete modulePdfFields[key];
            }
          });
          
          if (Object.keys(modulePdfFields).length > 0) {
            console.log(`✅ Processing module ${moduleKey} for PDF download: ${Object.keys(modulePdfFields).length} fields`);
            Object.assign(pdfFormData, modulePdfFields);
          }
        }
      });
      
      // Explicit handling for trendelenburg fields to ensure they're linked
      // USE EXACT SAME LOGIC AS JSON EXPORT
      if (moduleData.hips && moduleData.hips.specializedTests && moduleData.hips.specializedTests.trendelenburg) {
        const trendelenburgRight = moduleData.hips.specializedTests.trendelenburg.right;
        const trendelenburgLeft = moduleData.hips.specializedTests.trendelenburg.left;
        
        if (trendelenburgRight) {
          // Try to find PDF field for trendelenburg right
          const rightField = pdfFieldNames.find(f => {
            const fLower = f.toLowerCase();
            return (fLower.includes('trendelenburg') || fLower.includes('trendelen')) &&
                   (fLower.includes('droit') || fLower.includes('right') || fLower.includes('d.') || fLower.endsWith('d'));
          });
          if (rightField && !pdfFormData[rightField]) {
            pdfFormData[rightField] = trendelenburgRight;
            console.log(`✅ Explicitly mapped trendelenburg right to PDF field (PDF download): ${rightField} = "${trendelenburgRight}"`);
          } else if (trendelenburgRight) {
            console.warn(`⚠️ Trendelenburg right data exists but PDF field not found or already set: "${trendelenburgRight}"`);
          }
        }
        
        if (trendelenburgLeft) {
          // Try to find PDF field for trendelenburg left
          const leftField = pdfFieldNames.find(f => {
            const fLower = f.toLowerCase();
            return (fLower.includes('trendelenburg') || fLower.includes('trendelen')) &&
                   (fLower.includes('gauche') || fLower.includes('left') || fLower.includes('g.') || fLower.endsWith('g'));
          });
          if (leftField && !pdfFormData[leftField]) {
            pdfFormData[leftField] = trendelenburgLeft;
            console.log(`✅ Explicitly mapped trendelenburg left to PDF field (PDF download): ${leftField} = "${trendelenburgLeft}"`);
          } else if (trendelenburgLeft) {
            console.warn(`⚠️ Trendelenburg left data exists but PDF field not found or already set: "${trendelenburgLeft}"`);
          }
        }
      }
      
      // Log all module data that was processed
      console.log(`📊 PDF Download - Processed ${modulesToProcess.size} modules:`, Array.from(modulesToProcess));
      console.log(`📊 PDF Download - Total PDF fields after module processing: ${Object.keys(pdfFormData).length}`);
      
      // FINAL SAFEGUARD: Ensure essential fields (age, tabac, cannabis, alcool, nb) are always included
      // USE EXACT SAME LOGIC AS JSON EXPORT
      // This is the last check before filling the PDF to prevent any missing values
      
      // 1. Age (Section 4) - Map to age_identification
      const finalAgeValue = completeFormData.age;
      if (finalAgeValue && finalAgeValue !== '' && finalAgeValue !== null && finalAgeValue !== undefined) {
        // Prioritize age_identification field
        const ageField = pdfFieldNames.find(f => /age_identification/i.test(f)) || 
                        pdfFieldNames.find(f => /ageidentification/i.test(f)) ||
                        pdfFieldNames.find(f => /^age$/i.test(f)) || 
                        'age_identification';
        pdfFormData[ageField] = finalAgeValue;
        console.log(`✅ Final safeguard: Set age to formData value: "${finalAgeValue}" in field "${ageField}"`);
      }
      
      // 2. Tabac (Section 5)
      const finalTabacValue = completeFormData.tobacco || completeFormData.tabac;
      if (finalTabacValue && finalTabacValue !== '' && finalTabacValue !== null && finalTabacValue !== undefined) {
        const tabacField = pdfFieldNames.find(f => /tabac/i.test(f)) || 'tabac';
        pdfFormData[tabacField] = finalTabacValue;
        console.log(`✅ Final safeguard: Set tabac to formData value: "${finalTabacValue}" in field "${tabacField}"`);
      }
      
      // 3. Cannabis (Section 5)
      const finalCannabisValue = completeFormData.cannabis;
      if (finalCannabisValue && finalCannabisValue !== '' && finalCannabisValue !== null && finalCannabisValue !== undefined) {
        const cannabisField = pdfFieldNames.find(f => /cannabis/i.test(f)) || 'cannabis';
        pdfFormData[cannabisField] = finalCannabisValue;
        console.log(`✅ Final safeguard: Set cannabis to formData value: "${finalCannabisValue}" in field "${cannabisField}"`);
      }
      
      // 4. Alcool (Section 5)
      const finalAlcoolValue = completeFormData.alcohol || completeFormData.alcool;
      if (finalAlcoolValue && finalAlcoolValue !== '' && finalAlcoolValue !== null && finalAlcoolValue !== undefined) {
        const alcoolField = pdfFieldNames.find(f => /alcool/i.test(f)) || 'alcool';
        pdfFormData[alcoolField] = finalAlcoolValue;
        console.log(`✅ Final safeguard: Set alcool to formData value: "${finalAlcoolValue}" in field "${alcoolField}"`);
      }
      
      // 5. Note Bene (NB) - Final safeguard
      // USE EXACT SAME LOGIC AS JSON EXPORT
      if (noteBeneFromForm !== undefined && noteBeneFromForm !== null) {
        // Remove any existing 'nb' field that might have incorrect data
        Object.keys(pdfFormData).forEach(key => {
          if (key.toLowerCase() === 'nb' || key === 'nb') {
            const existingValue = pdfFormData[key];
            // If the existing value is "Neg" or looks like trendelenburg data, remove it
            if (existingValue && typeof existingValue === 'string' && 
                (existingValue.toLowerCase().includes('neg') || 
                 existingValue.toLowerCase().includes('trendelenburg') ||
                 existingValue.toLowerCase().includes('positive') ||
                 existingValue.toLowerCase().includes('negative'))) {
              delete pdfFormData[key];
              console.log(`⚠️ Removed incorrect 'nb' value before PDF fill: "${existingValue}"`);
            }
          }
        });
        
        // ALWAYS set 'nb' to the value from formData, regardless of what's in pdfFormData
        pdfFormData['nb'] = noteBeneFromForm;
        console.log(`✅ Final safeguard: Set 'nb' to formData value: "${noteBeneFromForm}"`);
      }
      
      console.log('📋 Form field mapping:', fieldMapping);
      console.log('📄 Original form data:', formData);
      console.log('📊 Current sequelae:', currentSequelae);
      console.log('📝 Complete form data:', completeFormData);
      console.log('📝 Transformed PDF data:', pdfFormData);
      
      // Filter module data to only include selected modules
      const filteredModuleData = {};
      Object.keys(moduleData).forEach(moduleKey => {
        if (selectedModules[moduleKey]) {
          filteredModuleData[moduleKey] = moduleData[moduleKey];
        }
      });
      console.log('🔬 Filtered module data (only selected):', filteredModuleData);
      
      // Use original PDF bytes to ensure fresh fill
      // Pass module data to fillPdfForm and set shouldFlatten=true for download
      const filledPdf = await fillPdfForm(originalPdfBytes, pdfFormData, filteredModuleData, selectedModules, true);
      downloadPdf(filledPdf, pdfFile ? `${pdfFile.name.replace('.pdf', '')}_filled.pdf` : 'medical-examination-filled.pdf');
      alert('PDF filled and downloaded successfully!');
    } catch (error) {
      console.error('Error filling PDF:', error);
      alert('Error filling PDF. Check console for details.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Template Management Functions
  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      alert('Please enter a template name');
      return;
    }
    
    const template = TemplateService.createTemplate(
      templateName,
      `Template for ${pdfFile?.name || 'PDF Form'}`,
      fieldPositions,
      pdfFile?.name || ''
    );
    
    TemplateService.saveTemplate(template);
    setTemplates(TemplateService.getAllTemplates());
    setTemplateName('');
    setShowTemplateDialog(false);
    alert(`Template "${templateName}" saved successfully!`);
  };

  const handleLoadTemplate = (templateId) => {
    const template = TemplateService.getTemplate(templateId);
    if (template) {
      // This would update fieldPositions - for now just log
      console.log('Loading template:', template);
      setSelectedTemplate(template);
      alert(`Template "${template.name}" loaded! (Field positions would be applied here)`);
    }
  };

  const handleExportTemplate = () => {
    if (!selectedTemplate) {
      alert('Please select a template to export');
      return;
    }
    TemplateService.exportTemplate(selectedTemplate);
  };

  const handleImportTemplate = async (event) => {
    const file = event.target.files[0];
    if (file) {
      try {
        const template = await TemplateService.importTemplate(file);
        TemplateService.saveTemplate(template);
        setTemplates(TemplateService.getAllTemplates());
        alert(`Template "${template.name}" imported successfully!`);
      } catch (error) {
        alert('Error importing template: ' + error.message);
      } finally {
        if (templateInputRef.current) {
          templateInputRef.current.value = '';
        }
      }
    }
  };

  // JSON Import Functions
  const handleJSONUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      try {
        const jsonData = await JSONImportService.importJSON(file);
        
        // Get all possible field names: PDF fields first, then form fields
        const pdfFieldNames = detectedFields ? Object.keys(detectedFields) : [];
        const formFieldNames = Object.keys(formData);
        const allFieldNames = [...new Set([...pdfFieldNames, ...formFieldNames])];
        
        console.log('📋 PDF Field Names:', pdfFieldNames);
        console.log('📋 Form Field Names:', formFieldNames);
        console.log('📄 JSON Data Keys:', Object.keys(jsonData));
        
        // Map JSON data to all possible field names (PDF fields first, then form fields)
        const mappingResult = JSONImportService.mapJSONToFields(jsonData, allFieldNames);
        
        setJsonMappingPreview(mappingResult);
        setShowJSONDialog(true);
        
        console.log('✅ JSON Mapping Result:', mappingResult);
      } catch (error) {
        alert('Error importing JSON: ' + error.message);
      } finally {
        if (jsonInputRef.current) {
          jsonInputRef.current.value = '';
        }
      }
    }
  };

  const handleApplyJSONData = async () => {
    if (jsonMappingPreview && jsonMappingPreview.mapped) {
      const mappedData = jsonMappingPreview.mapped;
      const pdfFieldNames = detectedFields ? Object.keys(detectedFields) : [];
      
      // Parse sequelae table data from imported JSON before updating form data
      const sequelaeRows = [];
      const individualFields = {};
      
      // First, check for fields that contain combined format (like code_de_sequelle1 with "Code: ... | Description: ...")
      // This is the PRIMARY source - parse it first to get all data including percentages
      Object.keys(mappedData).forEach(key => {
        const value = mappedData[key];
        if (value && typeof value === 'string' && value.includes('Code:') && value.includes('|')) {
          // This is a combined format field - parse it
          const codeMatch = key.match(/code[^0-9]*(?:de[^0-9]*)?(?:sequel|sequelle)[^0-9]*(\d+)/i) ||
                           key.match(/(?:sequel|sequelle)[^0-9]*code[^0-9]*(\d+)/i);
          
          if (codeMatch) {
            const rowNum = parseInt(codeMatch[1]);
            // Parse the combined format: "Code: xxx | Description: yyy | %: zzz"
            // Handle cases where there's no newline between entries (e.g., "2Code:" instead of "2\nCode:")
            // Split by newline, or by "Code:" pattern (but ensure we don't split mid-word)
            let lines = value.split(/\n/i);
            
            // If no newlines, try to split by "Code:" pattern (but only if not preceded by a digit that's part of a percentage)
            if (lines.length === 1) {
              // Split by "Code:" but preserve the pattern - use positive lookahead
              lines = value.split(/(?=Code:)/i);
            }
            
            // Filter and clean lines
            lines = lines.filter(line => line.trim() && /Code:/i.test(line));
            
            lines.forEach((line, idx) => {
              if (!line.trim()) return;
              
              // Extract code - everything after "Code:" until the first "|" or end of description marker
              const codeMatch = line.match(/Code:\s*([^|]+?)(?:\s*\||$)/i);
              // Extract description - everything after "Description:" until the first "|" or "%:" marker
              const descMatch = line.match(/Description:\s*([^|%]+?)(?:\s*(?:\||%:)|$)/i);
              // Extract percentage - everything after "%:" until the next "Code:" or end of string
              const pctMatch = line.match(/%:\s*([^Code:]+?)(?:\s*Code:|$)/i) || 
                             line.match(/%:\s*([^\n]+?)(?:\n|$)/i) ||
                             line.match(/%:\s*([^|]+)/i);
              
              const code = codeMatch ? codeMatch[1].trim() : '';
              const description = descMatch ? descMatch[1].trim() : '';
              let percentage = pctMatch ? pctMatch[1].trim() : '';
              
              // Clean up percentage - remove any trailing "Code:" text
              if (percentage && /Code:/i.test(percentage)) {
                percentage = percentage.split(/Code:/i)[0].trim();
              }
              
              // Use rowNum for first line, then increment for subsequent lines
              const finalRowNum = idx === 0 ? rowNum : (rowNum + idx);
              if (!individualFields[finalRowNum]) individualFields[finalRowNum] = {};
              
              // Always set from combined format (has priority - includes percentages)
              // Only set code if it's not empty and doesn't contain the entire combined string
              if (code && !code.includes('Description:') && !code.includes('%:')) {
                individualFields[finalRowNum].code = code;
              }
              if (description && !description.includes('Code:') && !description.includes('%:')) {
                individualFields[finalRowNum].description = description;
              }
              if (percentage && !percentage.includes('Code:') && !percentage.includes('Description:')) {
                individualFields[finalRowNum].percentage = percentage;
              }
            });
          }
        }
      });
      
      // Then, find individual sequela fields (sequelaCode1, sequelaDescription1, etc.)
      // Only use individual fields if they don't conflict with combined format data
      // This ensures percentages from combined format are preserved
      Object.keys(mappedData).forEach(key => {
        const value = mappedData[key];
        // Skip if it's a combined format field (already handled above)
        if (value && typeof value === 'string' && value.includes('Code:') && value.includes('|')) {
          return;
        }
        
        const codeMatch = key.match(/sequel[^0-9]*code[^0-9]*(\d+)/i);
        const descMatch = key.match(/sequel[^0-9]*description[^0-9]*(\d+)/i);
        const pctMatch = key.match(/sequel[^0-9]*(?:percentage|pct|pourcent|%)[^0-9]*(\d+)/i);
        
        if (codeMatch) {
          const rowNum = parseInt(codeMatch[1]);
          if (!individualFields[rowNum]) individualFields[rowNum] = {};
          // Only use if not already set from combined format parsing
          // Also skip if the value looks like a combined format string
          if (!individualFields[rowNum].code && 
              value && 
              typeof value === 'string' && 
              !value.includes('Description:') && 
              !value.includes('%:') && 
              !value.includes('Code:') &&
              !value.includes('|')) {
            individualFields[rowNum].code = value;
          }
        }
        if (descMatch) {
          const rowNum = parseInt(descMatch[1]);
          if (!individualFields[rowNum]) individualFields[rowNum] = {};
          // Only use if not already set from combined format parsing
          if (!individualFields[rowNum].description) {
            individualFields[rowNum].description = value;
          }
        }
        if (pctMatch) {
          const rowNum = parseInt(pctMatch[1]);
          if (!individualFields[rowNum]) individualFields[rowNum] = {};
          // Always use percentage field if available (might be missing from combined format)
          individualFields[rowNum].percentage = value;
        }
      });
      
      // Also check primary fields (without row numbers) for first row
      const primaryCodeField = Object.keys(mappedData).find(key => 
        (/sequel/i.test(key) && /code/i.test(key) && !/\d/.test(key))
      );
      const primaryPctField = Object.keys(mappedData).find(key => 
        (/sequel/i.test(key) && (/%/i.test(key) || /percentage/i.test(key) || /pct/i.test(key) || /pourcent/i.test(key)) && !/\d/.test(key))
      );
      
      if (primaryCodeField && mappedData[primaryCodeField]) {
        const value = mappedData[primaryCodeField];
        if (!individualFields[1]) individualFields[1] = {};
        // Check if it's combined format or individual value
        if (value && typeof value === 'string' && value.includes('Code:') && value.includes('|')) {
          // Parse combined format - handle multiple entries
          let lines = value.split(/\n/i);
          if (lines.length === 1) {
            lines = value.split(/(?=Code:)/i);
          }
          lines = lines.filter(line => line.trim() && /Code:/i.test(line));
          
          lines.forEach((line, idx) => {
            const codeMatch = line.match(/Code:\s*([^|]+?)(?:\s*\||$)/i);
            const code = codeMatch ? codeMatch[1].trim() : '';
            // Only set if it's a valid code (not containing other field markers)
            if (code && !code.includes('Description:') && !code.includes('%:')) {
              if (idx === 0) {
                individualFields[1].code = code;
              } else {
                // For additional entries, create new rows
                const rowNum = idx + 1;
                if (!individualFields[rowNum]) individualFields[rowNum] = {};
                individualFields[rowNum].code = code;
              }
            }
          });
        } else if (value && typeof value === 'string' && !value.includes('Description:') && !value.includes('%:') && !value.includes('|')) {
          // Only set if it's a simple individual value
          individualFields[1].code = value;
        }
        if (primaryPctField && mappedData[primaryPctField]) {
          individualFields[1].percentage = mappedData[primaryPctField];
        }
      }
      
      // Convert individual fields to rows
      Object.keys(individualFields).sort((a, b) => parseInt(a) - parseInt(b)).forEach(rowNum => {
        const rowData = individualFields[rowNum];
        if (rowData.code || rowData.description || rowData.percentage) {
          sequelaeRows.push({
            id: parseInt(rowNum),
            code: rowData.code || '',
            description: rowData.description || '',
            percentage: rowData.percentage || ''
          });
        }
      });
      
      // If no individual fields found, try parsing from combined format fields
      if (sequelaeRows.length === 0) {
        const combinedField = Object.keys(mappedData).find(key => 
          /sequelle/i.test(key) && /actuel/i.test(key) && !/code/i.test(key) && !/description/i.test(key) && !/%/i.test(key) && !/percentage/i.test(key)
        ) || 'currentSequelae';
        
        const combinedValue = mappedData[combinedField] || mappedData['currentSequelae'] || mappedData['sequellesActuelles'];
        
        if (combinedValue && typeof combinedValue === 'string') {
          // Parse the combined format: "Code: xxx | Description: yyy | %: zzz"
          const lines = combinedValue.split(/\n|(?=Code:)/i).filter(line => line.trim());
          
          lines.forEach((line, idx) => {
            if (!line.trim()) return;
            
            const codeMatch = line.match(/Code:\s*([^|]+)/i);
            const descMatch = line.match(/Description:\s*([^|]+)/i);
            const pctMatch = line.match(/%:\s*([^|]+)/i);
            
            const code = codeMatch ? codeMatch[1].trim() : '';
            const description = descMatch ? descMatch[1].trim() : '';
            const percentage = pctMatch ? pctMatch[1].trim() : '';
            
            if (code || description || percentage) {
              sequelaeRows.push({
                id: idx + 1,
                code: code,
                description: description,
                percentage: percentage
              });
            }
          });
        }
      }
      
      // Update currentSequelae state with parsed rows
      if (sequelaeRows.length > 0) {
        setCurrentSequelae(sequelaeRows);
      }
      
      // Parse moduleData fields from fallback format (e.g., "hipsspecializedTeststrendelenburgright")
      // Pattern: moduleName + path (dots replaced with nothing) + value
      const moduleDataUpdates = {};
      
      // Exclude known form fields from module data parsing (they should be handled separately)
      const excludedFormFields = ['nb', 'noteBene', 'note_bene', 'notabene', 'nb_', '_nb'];
      
      Object.keys(mappedData).forEach(key => {
        const value = mappedData[key];
        if (!value || value === '') return;
        
        // Skip if this is a known form field that should not be parsed as module data
        const keyLower = key.toLowerCase();
        if (excludedFormFields.some(excluded => keyLower === excluded.toLowerCase() || keyLower === excluded)) {
          console.log(`⚠️ Skipping ${key} from module data parsing - it's a form field (noteBene/nb)`);
          return; // Skip this key - it's a form field, not module data
        }
        
        // Try to match fallback format: moduleName + path (e.g., "hipsspecializedTeststrendelenburgright")
        // Known module names
        const moduleNames = ['cervicalSpine', 'lumbarSpine', 'shoulders', 'elbows', 'wristsHands', 'hips', 'knees', 'feetAnkles', 'muscleAtrophy', 'neurovascularAssessment'];
        
        for (const moduleName of moduleNames) {
          // Check if key starts with module name (case-insensitive, with or without underscores)
          // Ensure the key is long enough to actually be a module field (at least module name length + some path)
          const moduleNameLower = moduleName.toLowerCase();
          if (keyLower.length < moduleNameLower.length + 3) {
            continue; // Key is too short to be a module field
          }
          
          const modulePattern = new RegExp(`^${moduleName.replace(/([A-Z])/g, '[$1]?')}`, 'i');
          if (modulePattern.test(key)) {
            // Extract the path part (everything after module name)
            const pathPart = key.substring(moduleName.length);
            
            // Try to reconstruct the path by splitting on common patterns
            // Look for patterns like: specializedTests, rangeOfMotion, palpation, inspection, etc.
            const knownPaths = [
              'specializedTests', 'rangeOfMotion', 'palpation', 'inspection', 
              'radicularManeuvers', 'rotatorCuffTests', 'bicepsTests', 'instabilityTests',
              'labrumTests', 'acJointTests', 'ligamentousTests', 'meniscalTests', 'patellarTests',
              'tendonTests', 'forces', 'sensibilites', 'reflexes', 'pouls'
            ];
            
            // Try to find known path segments - check for specializedTests first
            let reconstructedPath = '';
            let remaining = pathPart;
            
            // Check for specializedTests pattern (most common for trendelenburg)
            if (remaining.toLowerCase().startsWith('specializedtests')) {
              reconstructedPath = 'specializedTests';
              remaining = remaining.substring('specializedtests'.length);
              
              // Now extract test name and side
              // Known test names for specializedTests
              const testNames = ['trendelenburg', 'fadir', 'faber', 'thomas', 'ober', 'finkelstein', 'tinel', 'phalen', 'durkan', 'froment', 'wartenberg'];
              
              for (const testName of testNames) {
                if (remaining.toLowerCase().startsWith(testName.toLowerCase())) {
                  const testPart = remaining.substring(0, testName.length);
                  const afterTest = remaining.substring(testName.length);
                  
                  // Check for side suffix
                  const sideMatch = afterTest.match(/^(right|left|droit|gauche)/i);
                  if (sideMatch) {
                    const side = sideMatch[1].toLowerCase();
                    const normalizedSide = (side === 'droit' || side === 'right') ? 'right' : 'left';
                    const fullPath = `${reconstructedPath}.${testName}.${normalizedSide}`;
                    
                    // Validate value - trendelenburg should be short text, not long paragraphs
                    // If value is too long and contains words that suggest it's from another field, skip it
                    if (testName === 'trendelenburg' && value && typeof value === 'string') {
                      const valueLength = value.length;
                      const suspiciousKeywords = ['asymétrie musculaire', 'asymetrie musculaire', 'pourcentage', 'pôle inférieur', 'rotule', 'tissus mous', 'atteinte'];
                      const hasSuspiciousKeywords = suspiciousKeywords.some(keyword => value.toLowerCase().includes(keyword.toLowerCase()));
                      
                      // If value is very long (>100 chars) and contains suspicious keywords, it's likely wrong data
                      if (valueLength > 100 && hasSuspiciousKeywords) {
                        console.warn(`⚠️ Skipping suspicious trendelenburg data (likely from wrong field): ${key} = "${value.substring(0, 100)}..."`);
                        break; // Skip this value - it's likely from the wrong field
                      }
                    }
                    
                    if (!moduleDataUpdates[moduleName]) moduleDataUpdates[moduleName] = {};
                    const pathKeys = fullPath.split('.');
                    let current = moduleDataUpdates[moduleName];
                    for (let i = 0; i < pathKeys.length - 1; i++) {
                      if (!current[pathKeys[i]]) current[pathKeys[i]] = {};
                      current = current[pathKeys[i]];
                    }
                    current[pathKeys[pathKeys.length - 1]] = value;
                    
                    console.log(`✅ Parsed moduleData field: ${key} -> ${moduleName}.${fullPath} = "${value}"`);
                    break;
                  }
                }
              }
            } else {
              // Try other known paths
              for (const knownPath of knownPaths) {
                const pathPattern = new RegExp(`^${knownPath.replace(/([A-Z])/g, '[$1]?')}`, 'i');
                if (pathPattern.test(remaining)) {
                  if (reconstructedPath) reconstructedPath += '.';
                  reconstructedPath += knownPath;
                  remaining = remaining.substring(knownPath.length);
                  break;
                }
              }
              
              // Try to extract test name and side (right/left)
              const sideMatch = remaining.match(/(right|left|droit|gauche)$/i);
              if (sideMatch) {
                const side = sideMatch[1].toLowerCase();
                const testName = remaining.substring(0, remaining.length - side.length);
                
                // Normalize side
                const normalizedSide = (side === 'droit' || side === 'right') ? 'right' : 'left';
                
                if (reconstructedPath && testName) {
                  const fullPath = `${reconstructedPath}.${testName}.${normalizedSide}`;
                  if (!moduleDataUpdates[moduleName]) moduleDataUpdates[moduleName] = {};
                  
                  // Set nested value
                  const pathKeys = fullPath.split('.');
                  let current = moduleDataUpdates[moduleName];
                  for (let i = 0; i < pathKeys.length - 1; i++) {
                    if (!current[pathKeys[i]]) current[pathKeys[i]] = {};
                    current = current[pathKeys[i]];
                  }
                  current[pathKeys[pathKeys.length - 1]] = value;
                  
                  console.log(`✅ Parsed moduleData field: ${key} -> ${moduleName}.${fullPath} = "${value}"`);
                }
              } else {
                // Try simple path reconstruction (e.g., "palpation", "inspection")
                if (remaining && (remaining === 'palpation' || remaining === 'inspection')) {
                  const fullPath = remaining;
                  if (!moduleDataUpdates[moduleName]) moduleDataUpdates[moduleName] = {};
                  moduleDataUpdates[moduleName][fullPath] = value;
                  console.log(`✅ Parsed moduleData field: ${key} -> ${moduleName}.${fullPath} = "${value}"`);
                }
              }
            }
          }
        }
      });
      
      // Update moduleData with parsed values
      if (Object.keys(moduleDataUpdates).length > 0) {
        setModuleData(prev => {
          const updated = { ...prev };
          Object.keys(moduleDataUpdates).forEach(moduleKey => {
            if (!updated[moduleKey]) updated[moduleKey] = {};
            // Deep merge
            const mergeDeep = (target, source) => {
              Object.keys(source).forEach(key => {
                if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
                  if (!target[key]) target[key] = {};
                  mergeDeep(target[key], source[key]);
                } else {
                  // Additional validation for trendelenburg fields
                  if (key === 'trendelenburg' && typeof source[key] === 'object') {
                    // Validate trendelenburg right and left values
                    if (source[key].right && typeof source[key].right === 'string') {
                      const suspiciousKeywords = ['asymétrie musculaire', 'asymetrie musculaire', 'pourcentage', 'pôle inférieur', 'rotule', 'tissus mous', 'atteinte'];
                      const hasSuspiciousKeywords = suspiciousKeywords.some(kw => source[key].right.toLowerCase().includes(kw.toLowerCase()));
                      if (source[key].right.length > 100 && hasSuspiciousKeywords) {
                        console.warn(`⚠️ Clearing suspicious trendelenburg right data: "${source[key].right.substring(0, 50)}..."`);
                        source[key].right = ''; // Clear the incorrect data
                      }
                    }
                    if (source[key].left && typeof source[key].left === 'string') {
                      const suspiciousKeywords = ['asymétrie musculaire', 'asymetrie musculaire', 'pourcentage', 'pôle inférieur', 'rotule', 'tissus mous', 'atteinte'];
                      const hasSuspiciousKeywords = suspiciousKeywords.some(kw => source[key].left.toLowerCase().includes(kw.toLowerCase()));
                      if (source[key].left.length > 100 && hasSuspiciousKeywords) {
                        console.warn(`⚠️ Clearing suspicious trendelenburg left data: "${source[key].left.substring(0, 50)}..."`);
                        source[key].left = ''; // Clear the incorrect data
                      }
                    }
                  }
                  target[key] = source[key];
                }
              });
            };
            mergeDeep(updated[moduleKey], moduleDataUpdates[moduleKey]);
          });
          
          // Clean up any existing incorrect trendelenburg data
          if (updated.hips && updated.hips.specializedTests && updated.hips.specializedTests.trendelenburg) {
            const suspiciousKeywords = ['asymétrie musculaire', 'asymetrie musculaire', 'pourcentage', 'pôle inférieur', 'rotule', 'tissus mous', 'atteinte'];
            
            if (updated.hips.specializedTests.trendelenburg.right && typeof updated.hips.specializedTests.trendelenburg.right === 'string') {
              const value = updated.hips.specializedTests.trendelenburg.right;
              const hasSuspiciousKeywords = suspiciousKeywords.some(kw => value.toLowerCase().includes(kw.toLowerCase()));
              if (value.length > 100 && hasSuspiciousKeywords) {
                console.warn(`⚠️ Cleaning up existing incorrect trendelenburg right data`);
                updated.hips.specializedTests.trendelenburg.right = '';
              }
            }
            
            if (updated.hips.specializedTests.trendelenburg.left && typeof updated.hips.specializedTests.trendelenburg.left === 'string') {
              const value = updated.hips.specializedTests.trendelenburg.left;
              const hasSuspiciousKeywords = suspiciousKeywords.some(kw => value.toLowerCase().includes(kw.toLowerCase()));
              if (value.length > 100 && hasSuspiciousKeywords) {
                console.warn(`⚠️ Cleaning up existing incorrect trendelenburg left data`);
                updated.hips.specializedTests.trendelenburg.left = '';
              }
            }
          }
          
          return updated;
        });
        
        // Automatically select modules that have imported data
        setSelectedModules(prev => {
          const updated = { ...prev };
          Object.keys(moduleDataUpdates).forEach(moduleKey => {
            updated[moduleKey] = true;
          });
          return updated;
        });
      }
      
      // Remove sequelae-related fields and moduleData fallback fields from mappedData to avoid overwriting
      const filteredMappedData = { ...mappedData };
      Object.keys(filteredMappedData).forEach(key => {
        if (/sequel/i.test(key) && (/code/i.test(key) || /description/i.test(key) || /percentage/i.test(key) || /pct/i.test(key) || /pourcent/i.test(key))) {
          delete filteredMappedData[key];
        }
        // Remove moduleData fallback fields (they're already processed above)
        const moduleNames = ['cervicalSpine', 'lumbarSpine', 'shoulders', 'elbows', 'wristsHands', 'hips', 'knees', 'feetAnkles', 'muscleAtrophy', 'neurovascularAssessment'];
        for (const moduleName of moduleNames) {
          if (key.toLowerCase().startsWith(moduleName.toLowerCase()) && 
              (key.includes('specializedTests') || key.includes('rangeOfMotion') || key.includes('palpation') || key.includes('inspection'))) {
            delete filteredMappedData[key];
            break;
          }
        }
      });
      
      // Explicitly handle nb/noteBene field - ensure it maps to noteBene, not to module data
      // Only map if it's actually 'nb' or 'noteBene', not if it's part of a trendelenburg field
      if (mappedData.nb || mappedData.noteBene || mappedData.note_bene) {
        // Check if the value is from a trendelenburg field (contains suspicious keywords)
        const nbValue = mappedData.nb || mappedData.noteBene || mappedData.note_bene;
        if (nbValue && typeof nbValue === 'string') {
          const suspiciousKeywords = ['trendelenburg', 'specialized', 'hip', 'test', 'neg', 'positive', 'negative'];
          const isFromTrendelenburg = suspiciousKeywords.some(keyword => 
            nbValue.toLowerCase().includes(keyword.toLowerCase())
          );
          
          // Only map if it's NOT from trendelenburg
          if (!isFromTrendelenburg) {
            filteredMappedData.noteBene = nbValue;
            // Remove any incorrect mappings that might have been created
            delete filteredMappedData.nb;
            delete filteredMappedData.note_bene;
            console.log(`✅ Mapped nb/noteBene to form field: noteBene = "${nbValue}"`);
          } else {
            console.log(`⚠️ Skipped mapping nb field - value appears to be from trendelenburg: "${nbValue}"`);
            // Remove it from filteredMappedData to prevent incorrect mapping
            delete filteredMappedData.nb;
            delete filteredMappedData.noteBene;
            delete filteredMappedData.note_bene;
          }
        } else if (nbValue) {
          // Non-string value - map it
          filteredMappedData.noteBene = nbValue;
          delete filteredMappedData.nb;
          delete filteredMappedData.note_bene;
          console.log(`✅ Mapped nb/noteBene to form field: noteBene = "${nbValue}"`);
        }
      }
      
      // Also check if any trendelenburg-related fields were incorrectly mapped to noteBene
      Object.keys(filteredMappedData).forEach(key => {
        if (key.toLowerCase().includes('trendelenburg') || 
            key.toLowerCase().includes('hipsspecialized')) {
          // If this field's value is in noteBene, remove it
          if (filteredMappedData.noteBene === filteredMappedData[key]) {
            console.log(`⚠️ Removed trendelenburg value from noteBene: ${key} = "${filteredMappedData[key]}"`);
            // Don't delete noteBene, but ensure it's not set to trendelenburg value
            if (filteredMappedData.noteBene === filteredMappedData[key]) {
              filteredMappedData.noteBene = '';
            }
          }
        }
      });
      
      // Update form data with mapped JSON values (for display in form)
      setFormData(prev => ({
        ...prev,
        ...filteredMappedData
      }));
      
      // If PDF is loaded, fill it immediately and update the display
      if (originalPdfBytes && Object.keys(mappedData).length > 0) {
        setIsProcessing(true);
        try {
          console.log('🔄 Filling PDF with imported JSON data...');
          console.log('📝 Mapped JSON data:', mappedData);
          console.log('📋 Available PDF field names:', pdfFieldNames);
          console.log('📋 Field mapping:', fieldMapping);
          
          // Prepare data for PDF filling
          // Strategy: Use direct PDF field matches first, then use fieldMapping to transform form field names
          let pdfFormData = {};
          
          // Step 1: Add data that matches PDF field names directly (JSON keys that are PDF field names)
          Object.keys(mappedData).forEach(key => {
            if (pdfFieldNames.includes(key)) {
              pdfFormData[key] = mappedData[key];
              console.log(`✅ Direct match: ${key} = "${mappedData[key]}"`);
            }
          });
          
          // Step 2: Transform form field names to PDF field names using fieldMapping
          Object.keys(mappedData).forEach(key => {
            // Skip if already added as direct match
            if (pdfFormData[key]) return;
            
            // Check if this key is a form field that maps to a PDF field
            const pdfFieldName = fieldMapping[key];
            if (pdfFieldName && pdfFieldNames.includes(pdfFieldName)) {
              pdfFormData[pdfFieldName] = mappedData[key];
              console.log(`✅ Mapped via fieldMapping: ${key} -> ${pdfFieldName} = "${mappedData[key]}"`);
            } else if (pdfFieldName) {
              // PDF field exists but might not be in detectedFields - try anyway
              pdfFormData[pdfFieldName] = mappedData[key];
              console.log(`⚠️ Mapped (PDF field not in detectedFields): ${key} -> ${pdfFieldName} = "${mappedData[key]}"`);
            }
          });
          
          // Step 3: Also try reverse mapping (PDF field -> form field)
          // In case JSON has PDF field names but we need to check if they're in formData
          pdfFieldNames.forEach(pdfField => {
            if (!pdfFormData[pdfField]) {
              // Find form field that maps to this PDF field
              const formField = Object.keys(fieldMapping).find(
                formKey => fieldMapping[formKey] === pdfField
              );
              if (formField && mappedData[formField]) {
                pdfFormData[pdfField] = mappedData[formField];
                console.log(`✅ Reverse mapped: ${formField} -> ${pdfField} = "${mappedData[formField]}"`);
              }
            }
          });
          
          console.log('📝 Final PDF data to fill:', pdfFormData);
          console.log(`📊 Total fields to fill: ${Object.keys(pdfFormData).length}`);
          
          // Use original PDF bytes to ensure we're filling the base PDF
          const filledPdf = await fillPdfForm(originalPdfBytes, pdfFormData);
          
          // Update the PDF URL to show filled PDF
          const blob = new Blob([filledPdf], { type: 'application/pdf' });
          
          // Revoke old URL
          if (pdfUrl) {
            URL.revokeObjectURL(pdfUrl);
          }
          
          // Create new URL with filled PDF
          const newUrl = URL.createObjectURL(blob);
          setPdfUrl(newUrl);
          
          console.log('✅ PDF filled and updated successfully!');
          alert(`✅ Successfully imported ${Object.keys(mappedData).length} fields and filled ${Object.keys(pdfFormData).length} PDF fields!`);
        } catch (error) {
          console.error('❌ Error filling PDF:', error);
          alert('⚠️ Data imported, but error filling PDF: ' + error.message);
        } finally {
          setIsProcessing(false);
        }
      } else {
        alert(`✅ Successfully imported ${Object.keys(mappedData).length} fields!`);
      }
      
      setShowJSONDialog(false);
      setJsonMappingPreview(null);
    }
  };

  // Export form data to JSON file (keys exactly as PDF field names)
  const handleExportToJSON = () => {
    try {
      // IMPORTANT: Extract noteBene FIRST, directly from formData, before any processing
      // This ensures we get the actual user input, not any incorrectly mapped values
      const noteBeneFromForm = formData.noteBene || '';
      console.log(`📝 noteBene value from formData (JSON export): "${noteBeneFromForm}"`);
      
      // Prepare complete form data including sequelae table
      const completeFormData = { ...formData };
      
      // Map individual sequelae table fields to PDF fields
      if (currentSequelae && currentSequelae.length > 0) {
        const validSequelae = currentSequelae.filter(s => s.code || s.description || s.percentage);
        const pdfFieldNames = detectedFields ? Object.keys(detectedFields) : [];
        
        // Find primary/combined PDF fields for code and percentage (used by first row)
        const primaryCodeField = pdfFieldNames.find(f => 
          (/sequel/i.test(f) && /code/i.test(f) && !/\d/.test(f)) ||
          (/code/i.test(f) && /sequel/i.test(f) && !/\d/.test(f))
        ) || pdfFieldNames.find(f => 
          /sequel/i.test(f) && /code/i.test(f)
        );
        
        const primaryPctField = pdfFieldNames.find(f => 
          (/sequel/i.test(f) && (/%/i.test(f) || /percentage/i.test(f) || /pct/i.test(f) || /pourcent/i.test(f)) && !/\d/.test(f)) ||
          ((/%/i.test(f) || /percentage/i.test(f) || /pct/i.test(f) || /pourcent/i.test(f)) && /sequel/i.test(f) && !/\d/.test(f))
        ) || pdfFieldNames.find(f => 
          /sequel/i.test(f) && (/%/i.test(f) || /percentage/i.test(f) || /pct/i.test(f) || /pourcent/i.test(f))
        );
        
        // For each row, map code, description, and percentage to individual PDF fields
        validSequelae.forEach((sequela, index) => {
          const rowNum = index + 1;
          
          // Find PDF fields for this row's code, description, and percentage
          // Pattern: code_de_sequelle1, codeDeSequelle1, sequelaCode1, sequelleCode1, etc.
          const codeField = pdfFieldNames.find(f => 
            // Match code_de_sequelle1, code_de_sequelle2, etc.
            (new RegExp(`code[^0-9]*(?:de[^0-9]*)?(?:sequel|sequelle)[^0-9]*${rowNum}[^0-9]*$|^code[^0-9]*(?:de[^0-9]*)?(?:sequel|sequelle)[^0-9]*${rowNum}[^0-9]*`, 'i').test(f)) ||
            // Match sequelaCode1, sequelleCode1, etc.
            (new RegExp(`(?:sequel|sequelle)[^0-9]*code[^0-9]*${rowNum}[^0-9]*$|^(?:sequel|sequelle)[^0-9]*code[^0-9]*${rowNum}[^0-9]*`, 'i').test(f)) ||
            // Match code with row number and sequel
            (/code/i.test(f) && new RegExp(`${rowNum}`).test(f) && /sequel/i.test(f))
          ) || pdfFieldNames.find(f => 
            (/sequel/i.test(f) && /code/i.test(f) && rowNum === 1) ||
            (index === 0 && /sequel/i.test(f) && /code/i.test(f))
          );
          
          const descField = pdfFieldNames.find(f => 
            (/sequel/i.test(f) && /description/i.test(f) && new RegExp(`[^0-9]*${rowNum}[^0-9]*$|^[^0-9]*${rowNum}[^0-9]*`).test(f)) ||
            (/description/i.test(f) && new RegExp(`${rowNum}`).test(f) && /sequel/i.test(f))
          ) || pdfFieldNames.find(f => 
            (/sequel/i.test(f) && /description/i.test(f) && rowNum === 1) ||
            (index === 0 && /sequel/i.test(f) && /description/i.test(f))
          );
          
          // Find PDF fields for percentage - Pattern: pourcentage1, pourcentage2, pourcentage_de_sequelle1, etc.
          const pctField = pdfFieldNames.find(f => 
            // Match simple patterns: pourcentage1, pourcentage2, percentage1, percentage2 (priority - exact match)
            (new RegExp(`^pourcentage${rowNum}$|^percentage${rowNum}$|^pct${rowNum}$`, 'i').test(f)) ||
            // Match pourcentage_de_sequelle1, pourcentage_de_sequelle2, etc.
            (new RegExp(`(?:pourcent|percentage|pct)[^0-9]*(?:age[^0-9]*)?(?:de[^0-9]*)?(?:sequel|sequelle)[^0-9]*${rowNum}[^0-9]*$|^(?:pourcent|percentage|pct)[^0-9]*(?:age[^0-9]*)?(?:de[^0-9]*)?(?:sequel|sequelle)[^0-9]*${rowNum}[^0-9]*`, 'i').test(f)) ||
            // Match sequelaPercentage1, sequellePercentage1, etc.
            (new RegExp(`(?:sequel|sequelle)[^0-9]*(?:pourcent|percentage|pct)[^0-9]*${rowNum}[^0-9]*$|^(?:sequel|sequelle)[^0-9]*(?:pourcent|percentage|pct)[^0-9]*${rowNum}[^0-9]*`, 'i').test(f)) ||
            // Match percentage with row number and sequel
            ((/%/i.test(f) || /percentage/i.test(f) || /pct/i.test(f) || /pourcent/i.test(f)) && new RegExp(`${rowNum}`).test(f) && /sequel/i.test(f))
          ) || pdfFieldNames.find(f => 
            (/sequel/i.test(f) && (/%/i.test(f) || /percentage/i.test(f) || /pct/i.test(f) || /pourcent/i.test(f)) && rowNum === 1) ||
            (index === 0 && /sequel/i.test(f) && (/%/i.test(f) || /percentage/i.test(f) || /pct/i.test(f) || /pourcent/i.test(f)))
          );
          
          // Add individual fields to completeFormData
          if (sequela.code) {
            // Always add with PDF field name (if found) - this ensures proper linking
            if (codeField) {
              completeFormData[codeField] = sequela.code;
              console.log(`✅ Mapped row ${rowNum} code to PDF field (JSON export): ${codeField} = "${sequela.code}"`);
            }
            // Also add with form field name for reference
            completeFormData[`sequelaCode${rowNum}`] = sequela.code;
            
            // For first row, also link to primary code field (without row number)
            if (index === 0 && primaryCodeField && primaryCodeField !== codeField) {
              completeFormData[primaryCodeField] = sequela.code;
              console.log(`✅ Also mapped row ${rowNum} code to primary PDF field (JSON export): ${primaryCodeField} = "${sequela.code}"`);
            }
          }
          if (sequela.description && descField) {
            completeFormData[`sequelaDescription${rowNum}`] = sequela.description;
            completeFormData[descField] = sequela.description;
          }
          if (sequela.percentage) {
            // Always add with PDF field name (if found) - this ensures proper linking
            if (pctField) {
              completeFormData[pctField] = sequela.percentage;
              console.log(`✅ Mapped row ${rowNum} percentage to PDF field (JSON export): ${pctField} = "${sequela.percentage}"`);
            }
            // Also add with simple field names: pourcentage1, pourcentage2 (for direct PDF field matching)
            completeFormData[`pourcentage${rowNum}`] = sequela.percentage;
            // Also add with form field name for reference
            completeFormData[`sequelaPercentage${rowNum}`] = sequela.percentage;
            
            // For first row, also link to primary percentage field (without row number)
            if (index === 0 && primaryPctField && primaryPctField !== pctField) {
              completeFormData[primaryPctField] = sequela.percentage;
              console.log(`✅ Also mapped row ${rowNum} percentage to primary PDF field (JSON export): ${primaryPctField} = "${sequela.percentage}"`);
            }
          }
        });
        
        // Also keep the combined format for backward compatibility
        if (validSequelae.length > 0) {
          const sequelaeText = validSequelae
            .map(s => {
              const parts = [];
              if (s.code) parts.push(`Code: ${s.code}`);
              if (s.description) parts.push(`Description: ${s.description}`);
              if (s.percentage) parts.push(`%: ${s.percentage}`);
              return parts.join(' | ');
            })
            .join('\n');
          completeFormData.currentSequelae = sequelaeText;
        }
      }
      
      // Ensure all Section 12 fields are included:
      // - currentSequelae (from table) - already added above
      // - previousSequelae (from formData) - already in formData
      // - otherBilateralDeficits (from formData) - already in formData
      // - noteBene (from formData) - already in formData
      
      // Separate form fields from direct PDF field names
      const pdfFieldNames = detectedFields ? Object.keys(detectedFields) : [];
      const formFieldsOnly = {};
      const directPdfFields = {};
      
      // Extract noteBene separately to prevent incorrect mapping
      // Use the value we captured directly from formData, not from completeFormData
      // (completeFormData might have been modified by module data processing)
      let noteBeneValue = noteBeneFromForm || null;
      
      // Double-check: if completeFormData.noteBene is different from what we captured,
      // it means something overwrote it - use the original formData value
      if (completeFormData.noteBene !== noteBeneFromForm && noteBeneFromForm) {
        console.warn(`⚠️ noteBene was overwritten! Original: "${noteBeneFromForm}", Current: "${completeFormData.noteBene}"`);
        console.warn(`⚠️ Using original formData value: "${noteBeneFromForm}"`);
        noteBeneValue = noteBeneFromForm;
      } else if (completeFormData.noteBene && !noteBeneFromForm) {
        // If we didn't capture it initially but it exists now, use it
        noteBeneValue = completeFormData.noteBene;
      }
      
      console.log(`📝 Final noteBene value for JSON export: "${noteBeneValue}"`);
      
      Object.keys(completeFormData).forEach(key => {
        const value = completeFormData[key];
        if (value === undefined || value === null || value === '') return;
        
        // Skip noteBene - it will be handled separately to prevent incorrect mapping
        if (key === 'noteBene' || key === 'nb') {
          return;
        }
        
        // If the key is already a PDF field name (exists in detectedFields), preserve it directly
        // BUT: Check if it's 'nb' and has a suspicious value (like "Neg" from trendelenburg)
        if (detectedFields && detectedFields[key]) {
          // Special check for 'nb' field - don't use it if it looks like trendelenburg data
          if ((key.toLowerCase() === 'nb' || key === 'nb') && typeof value === 'string') {
            const suspiciousKeywords = ['neg', 'trendelenburg', 'specialized', 'hip', 'test', 'positive', 'negative'];
            const isSuspicious = suspiciousKeywords.some(kw => value.toLowerCase().includes(kw.toLowerCase()));
            if (isSuspicious) {
              console.warn(`⚠️ Skipping 'nb' field from directPdfFields - value appears to be from trendelenburg: "${value}"`);
              return; // Skip this field - we'll use the formData value instead
            }
          }
          directPdfFields[key] = value;
          console.log(`✅ Preserved direct PDF field mapping (JSON export): ${key} = "${value}"`);
        } else {
          // Otherwise, it's a form field that needs transformation
          formFieldsOnly[key] = value;
        }
      });
      
      // Transform form fields to PDF field names using fieldMapping
      const pdfData = transformFormDataToPdfFields(formFieldsOnly);
      
      // Merge direct PDF fields (these take priority and won't be overwritten)
      // BUT: Remove 'nb' from directPdfFields if it has a suspicious value
      const cleanedDirectPdfFields = { ...directPdfFields };
      Object.keys(cleanedDirectPdfFields).forEach(key => {
        if ((key.toLowerCase() === 'nb' || key === 'nb') && typeof cleanedDirectPdfFields[key] === 'string') {
          const value = cleanedDirectPdfFields[key];
          const suspiciousKeywords = ['neg', 'trendelenburg', 'specialized', 'hip', 'test', 'positive', 'negative'];
          const isSuspicious = suspiciousKeywords.some(kw => value.toLowerCase().includes(kw.toLowerCase()));
          if (isSuspicious) {
            console.warn(`⚠️ Removing 'nb' from directPdfFields - value appears to be from trendelenburg: "${value}"`);
            delete cleanedDirectPdfFields[key];
          }
        }
      });
      
      Object.assign(pdfData, cleanedDirectPdfFields);
      
      // Explicitly handle noteBene separately - ensure it maps to 'nb' and NOT to trendelenburg
      // ALWAYS use the value captured directly from formData, regardless of what's in pdfData
      if (noteBeneValue && noteBeneValue.trim() !== '') {
        // Remove any incorrect mappings that might have been created
        Object.keys(pdfData).forEach(key => {
          const keyLower = key.toLowerCase();
          // If this field contains 'nb' but is related to trendelenburg or modules, remove it
          if ((keyLower.includes('nb') || keyLower === 'nb') && 
              (keyLower.includes('trendelenburg') || 
               keyLower.includes('specialized') || 
               keyLower.includes('hip') || 
               keyLower.includes('test') ||
               keyLower.startsWith('hips'))) {
            delete pdfData[key];
            console.log(`⚠️ Removed incorrect mapping for nb field: ${key}`);
          }
        });
        
        // ALWAYS explicitly set to 'nb' using the value from formData
        // This ensures we use the actual user input, not any incorrectly mapped values
        pdfData['nb'] = noteBeneValue;
        console.log(`✅ Explicitly mapped noteBene to PDF field (JSON export): nb = "${noteBeneValue}" (from formData)`);
      } else if (noteBeneValue === '' || !noteBeneValue) {
        // Even if empty, ensure 'nb' field exists and is empty (not set to trendelenburg value)
        // Remove any existing 'nb' mappings that might be from trendelenburg
        Object.keys(pdfData).forEach(key => {
          if (key.toLowerCase() === 'nb' || key === 'nb') {
            const value = pdfData[key];
            // Check if the value looks like it's from trendelenburg
            if (value && typeof value === 'string' && 
                (value.toLowerCase().includes('neg') || 
                 value.toLowerCase().includes('trendelenburg') ||
                 value.toLowerCase().includes('positive') ||
                 value.toLowerCase().includes('negative'))) {
              delete pdfData[key];
              console.log(`⚠️ Removed incorrect 'nb' value that appears to be from trendelenburg: "${value}"`);
            }
          }
        });
        // Set to empty string to ensure it's not linked to trendelenburg
        pdfData['nb'] = '';
      }
      
      // Ensure Section 12 fields are properly mapped to PDF field names for JSON export
      // Use the same comprehensive mapping logic as PDF download
      // Note: pdfFieldNames was already declared above
      
      // 1. Current Sequelae
      if (completeFormData.currentSequelae) {
        const mappedField = fieldMapping.currentSequelae || fieldMapping.sequellesActuelles;
        if (mappedField && pdfFieldNames.includes(mappedField)) {
          if (!pdfData[mappedField]) {
            pdfData[mappedField] = completeFormData.currentSequelae;
          }
        } else {
          const sequelaePdfField = pdfFieldNames.find(f => 
            (/sequelle/i.test(f) && /actuel/i.test(f)) || 
            (/sequelle/i.test(f) && !/anterieur/i.test(f) && !/anterieure/i.test(f) && !/previous/i.test(f)) ||
            /sequellesactuelles/i.test(f) ||
            /sequelles\.actuelles/i.test(f)
          ) || pdfFieldNames.find(f => /sequelle/i.test(f) && !/anterieur/i.test(f) && !/anterieure/i.test(f));
          
          if (sequelaePdfField && !pdfData[sequelaePdfField]) {
            pdfData[sequelaePdfField] = completeFormData.currentSequelae;
          } else if (mappedField && !pdfData[mappedField]) {
            pdfData[mappedField] = completeFormData.currentSequelae;
          }
        }
      }
      
      // 2. Previous Sequelae
      if (completeFormData.previousSequelae) {
        const mappedField = fieldMapping.previousSequelae;
        if (mappedField && pdfFieldNames.includes(mappedField)) {
          if (!pdfData[mappedField]) {
            pdfData[mappedField] = completeFormData.previousSequelae;
          }
        } else {
          const previousSequelaePdfField = pdfFieldNames.find(f => 
            (/sequelle/i.test(f) && (/anterieur/i.test(f) || /anterieure/i.test(f))) || 
            (/previous/i.test(f) && /sequel/i.test(f)) ||
            /sequellesanterieures/i.test(f) ||
            /sequelles\.anterieures/i.test(f)
          ) || pdfFieldNames.find(f => /sequelle/i.test(f) && /anterieur/i.test(f));
          
          if (previousSequelaePdfField && !pdfData[previousSequelaePdfField]) {
            pdfData[previousSequelaePdfField] = completeFormData.previousSequelae;
          } else if (mappedField && !pdfData[mappedField]) {
            pdfData[mappedField] = completeFormData.previousSequelae;
          }
        }
      }
      
      // 3. Other Bilateral Deficits
      if (completeFormData.otherBilateralDeficits) {
        const mappedField = fieldMapping.otherBilateralDeficits;
        if (mappedField && pdfFieldNames.includes(mappedField)) {
          if (!pdfData[mappedField]) {
            pdfData[mappedField] = completeFormData.otherBilateralDeficits;
          }
        } else {
          const deficitsPdfField = pdfFieldNames.find(f => 
            (/deficit/i.test(f) && /bilateral/i.test(f)) || 
            (/autre/i.test(f) && /deficit/i.test(f)) ||
            (/deficit/i.test(f) && /later/i.test(f)) ||
            /deficitsbilateraux/i.test(f) ||
            /deficits\.bilateraux/i.test(f) ||
            /autresdeficits/i.test(f)
          ) || pdfFieldNames.find(f => /deficit/i.test(f) && /bilateral/i.test(f));
          
          if (deficitsPdfField && !pdfData[deficitsPdfField]) {
            pdfData[deficitsPdfField] = completeFormData.otherBilateralDeficits;
          } else if (mappedField && !pdfData[mappedField]) {
            pdfData[mappedField] = completeFormData.otherBilateralDeficits;
          }
        }
      }
      
      // 4. Note Bene (NB) - JSON Export
      // Always use 'nb' as the PDF field name for JSON export
      // This is already handled above, but ensure no trendelenburg fields are linked
      if (noteBeneValue && pdfData['nb'] !== noteBeneValue) {
        // Remove any incorrect trendelenburg-related fields that might have been mapped
        Object.keys(pdfData).forEach(key => {
          const keyLower = key.toLowerCase();
          if ((keyLower.includes('nb') || keyLower === 'nb') && 
              (keyLower.includes('trendelenburg') || 
               keyLower.includes('specialized') || 
               keyLower.includes('hip') || 
               keyLower.includes('test') ||
               keyLower.startsWith('hips'))) {
            delete pdfData[key];
            console.log(`⚠️ Removed incorrect nb mapping to trendelenburg field: ${key}`);
          }
        });
        
        // Explicitly set to 'nb'
        pdfData['nb'] = noteBeneValue;
        console.log(`✅ Ensured noteBene maps to 'nb' (JSON export): nb = "${noteBeneValue}"`);
      }
      
      // 5. Section 4 & 5 Fields - Explicit handling for age, tabac, cannabis, alcool
      // Age (Section 4) - Map to age_identification
      if (completeFormData.age) {
        const ageMappedField = fieldMapping.age || 'age_identification';
        // Prioritize age_identification field
        const agePdfField = pdfFieldNames.find(f => /age_identification/i.test(f)) || 
                           pdfFieldNames.find(f => /ageidentification/i.test(f)) ||
                           pdfFieldNames.find(f => /^age$/i.test(f)) || 
                           ageMappedField;
        if (agePdfField && pdfFieldNames.includes(agePdfField)) {
          if (!pdfData[agePdfField]) {
            pdfData[agePdfField] = completeFormData.age;
            console.log(`✅ Mapped age to PDF field (JSON export): ${agePdfField} = "${completeFormData.age}"`);
          }
        } else if (ageMappedField) {
          pdfData[ageMappedField] = completeFormData.age;
          console.log(`✅ Mapped age to PDF field (JSON export, fallback): ${ageMappedField} = "${completeFormData.age}"`);
        }
      }
      
      // Tabac (Section 5)
      const tabacValue = completeFormData.tobacco || completeFormData.tabac;
      console.log(`📝 Tabac value for JSON export: "${tabacValue}" (tobacco: "${completeFormData.tobacco}", tabac: "${completeFormData.tabac}")`);
      if (tabacValue && tabacValue.trim() !== '') {
        const tabacMappedField = fieldMapping.tabac || fieldMapping.tobacco || 'tabac';
        const tabacPdfField = pdfFieldNames.find(f => /tabac/i.test(f)) || tabacMappedField;
        if (tabacPdfField && pdfFieldNames.includes(tabacPdfField)) {
          if (!pdfData[tabacPdfField]) {
            pdfData[tabacPdfField] = tabacValue;
            console.log(`✅ Mapped tabac to PDF field (JSON export): ${tabacPdfField} = "${tabacValue}"`);
          }
        } else if (tabacMappedField) {
          pdfData[tabacMappedField] = tabacValue;
          console.log(`✅ Mapped tabac to PDF field (JSON export, fallback): ${tabacMappedField} = "${tabacValue}"`);
        }
      } else {
        console.log(`⚠️ Tabac value is empty or not set, skipping JSON export`);
      }
      
      // Cannabis (Section 5)
      console.log(`📝 Cannabis value for JSON export: "${completeFormData.cannabis}"`);
      if (completeFormData.cannabis && completeFormData.cannabis.trim() !== '') {
        const cannabisMappedField = fieldMapping.cannabis || 'cannabis';
        const cannabisPdfField = pdfFieldNames.find(f => /cannabis/i.test(f)) || cannabisMappedField;
        if (cannabisPdfField && pdfFieldNames.includes(cannabisPdfField)) {
          if (!pdfData[cannabisPdfField]) {
            pdfData[cannabisPdfField] = completeFormData.cannabis;
            console.log(`✅ Mapped cannabis to PDF field (JSON export): ${cannabisPdfField} = "${completeFormData.cannabis}"`);
          }
        } else if (cannabisMappedField) {
          pdfData[cannabisMappedField] = completeFormData.cannabis;
          console.log(`✅ Mapped cannabis to PDF field (JSON export, fallback): ${cannabisMappedField} = "${completeFormData.cannabis}"`);
        }
      } else {
        console.log(`⚠️ Cannabis value is empty or not set, skipping JSON export`);
      }
      
      // Alcool (Section 5)
      const alcoolValue = completeFormData.alcohol || completeFormData.alcool;
      console.log(`📝 Alcool value for JSON export: "${alcoolValue}" (alcohol: "${completeFormData.alcohol}", alcool: "${completeFormData.alcool}")`);
      if (alcoolValue && alcoolValue.trim() !== '') {
        const alcoolMappedField = fieldMapping.alcool || fieldMapping.alcohol || 'alcool';
        const alcoolPdfField = pdfFieldNames.find(f => /alcool/i.test(f)) || alcoolMappedField;
        if (alcoolPdfField && pdfFieldNames.includes(alcoolPdfField)) {
          if (!pdfData[alcoolPdfField]) {
            pdfData[alcoolPdfField] = alcoolValue;
            console.log(`✅ Mapped alcool to PDF field (JSON export): ${alcoolPdfField} = "${alcoolValue}"`);
          }
        } else if (alcoolMappedField) {
          pdfData[alcoolMappedField] = alcoolValue;
          console.log(`✅ Mapped alcool to PDF field (JSON export, fallback): ${alcoolMappedField} = "${alcoolValue}"`);
        }
      } else {
        console.log(`⚠️ Alcool value is empty or not set, skipping JSON export`);
      }
      
      // 6. Physical Dominance (dominance_examen) - JSON Export
      if (completeFormData.physicalDominance) {
        const mappedField = fieldMapping.physicalDominance || 'dominance_examen';
        // Check if dominance_examen exists in PDF fields
        const dominancePdfField = pdfFieldNames.find(f => /dominance_examen/i.test(f)) || mappedField;
        
        if (dominancePdfField && pdfFieldNames.includes(dominancePdfField)) {
          if (!pdfData[dominancePdfField]) {
            pdfData[dominancePdfField] = completeFormData.physicalDominance;
            console.log(`✅ Mapped physicalDominance to PDF field (JSON export): ${dominancePdfField} = "${completeFormData.physicalDominance}"`);
          }
        } else if (mappedField) {
          // Even if not detected, use the mapped field name
          if (!pdfData[mappedField]) {
            pdfData[mappedField] = completeFormData.physicalDominance;
            console.log(`✅ Mapped physicalDominance to PDF field (JSON export, fallback): ${mappedField} = "${completeFormData.physicalDominance}"`);
          }
        }
      }
      
      // 7. Paraclinical Exams (examensParacliniques) - JSON Export
      if (completeFormData.paraclinicalExams) {
        const mappedField = fieldMapping.paraclinicalExams || 'examensParacliniques';
        // Check if examensParacliniques exists in PDF fields
        const paraclinicalPdfField = pdfFieldNames.find(f => /examensParacliniques/i.test(f)) || pdfFieldNames.find(f => /paraclinique/i.test(f)) || mappedField;
        
        if (paraclinicalPdfField && pdfFieldNames.includes(paraclinicalPdfField)) {
          if (!pdfData[paraclinicalPdfField]) {
            pdfData[paraclinicalPdfField] = completeFormData.paraclinicalExams;
            console.log(`✅ Mapped paraclinicalExams to PDF field (JSON export): ${paraclinicalPdfField} = "${completeFormData.paraclinicalExams}"`);
          }
        } else if (mappedField) {
          // Even if not detected, use the mapped field name
          if (!pdfData[mappedField]) {
            pdfData[mappedField] = completeFormData.paraclinicalExams;
            console.log(`✅ Mapped paraclinicalExams to PDF field (JSON export, fallback): ${mappedField} = "${completeFormData.paraclinicalExams}"`);
          }
        }
      }
      
      // 7. Section 9 Module Data - JSON Export
      // Process Section 9 module data and map to PDF fields
      const processModuleDataToPdfFieldsJSON = (moduleKey, moduleDataValue, selectedModulesValue, pdfFieldNamesList) => {
        const modulePdfFields = {};
        
        // Helper to find PDF field name for a module field
        const findPdfField = (moduleName, fieldPath) => {
          // Special mappings for exact PDF field names
          const specialFieldMappings = {
            'rangeOfMotion.lateralFlexionL': [
              'Flexion Latérale G. 30o',
              'Flexion Latérale G.',
              'Flexion Latérale G',
              'Flexion Laterale G. 30o',
              'Flexion Laterale G.',
              'Flexion Laterale G',
              'flexion_laterale_g_30o',
              'flexion_laterale_g',
              'lateralFlexionL',
              'lateral_flexion_l'
            ],
            'rangeOfMotion.lateralFlexionR': [
              'Flexion Latérale D. 30o',
              'Flexion Latérale D.',
              'Flexion Latérale D',
              'Flexion Laterale D. 30o',
              'Flexion Laterale D.',
              'Flexion Laterale D',
              'flexion_laterale_d_30o',
              'flexion_laterale_d',
              'lateralFlexionR',
              'lateral_flexion_r'
            ],
            'rangeOfMotion.rotationL': [
              'Rotation G. 30o',
              'Rotation G.',
              'Rotation G',
              'rotation_g_30o',
              'rotation_g',
              'rotationG',
              'rotationL',
              'rotation_l'
            ],
            'rangeOfMotion.rotationR': [
              'Rotation D.',
              'Rotation D',
              'Rotation D. 30o',
              'rotation_d',
              'rotation_d_30o',
              'rotationD',
              'rotationR',
              'rotation_r'
            ],
            'specializedTests.trendelenburg.right': [
              'trendelenburg_right',
              'trendelenburgRight',
              'trendelenburg.droit',
              'trendelenburg_droit',
              'trendelenburgDroit',
              'hips.trendelenburg.right',
              'hips_trendelenburg_right',
              'hanches.trendelenburg.droit',
              'hanches_trendelenburg_droit',
              'hip.trendelenburg.right',
              'hip_trendelenburg_right',
              'testTrendelenburgDroit',
              'test_trendelenburg_droit',
              'testTrendelenburg.droit',
              'testTrendelenburgD',
              'trendelenburgD',
              'trendelenburgDroit',
              'trendelenburg_d',
              'testTrendelenburgD',
              'test_trendelenburg_d',
              'hanches.trendelenburg.droit',
              'hanches_trendelenburg_droit',
              'hanchesTrendelenburgDroit',
              'hanches_trendelenburg_droit'
            ],
            'specializedTests.trendelenburg.left': [
              'trendelenburg_left',
              'trendelenburgLeft',
              'trendelenburg.gauche',
              'trendelenburg_gauche',
              'trendelenburgGauche',
              'hips.trendelenburg.left',
              'hips_trendelenburg_left',
              'hanches.trendelenburg.gauche',
              'hanches_trendelenburg_gauche',
              'hip.trendelenburg.left',
              'hip_trendelenburg_left',
              'testTrendelenburgGauche',
              'test_trendelenburg_gauche',
              'testTrendelenburg.gauche',
              'testTrendelenburgG',
              'trendelenburgG',
              'trendelenburgGauche',
              'trendelenburg_g',
              'testTrendelenburgG',
              'test_trendelenburg_g',
              'hanches.trendelenburg.gauche',
              'hanches_trendelenburg_gauche',
              'hanchesTrendelenburgGauche',
              'hanches_trendelenburg_gauche'
            ]
          };
          
          // Check for special mappings first
          if (specialFieldMappings[fieldPath]) {
            for (const mapping of specialFieldMappings[fieldPath]) {
              const found = pdfFieldNamesList.find(f => 
                f === mapping ||
                f.toLowerCase() === mapping.toLowerCase() ||
                f.toLowerCase().includes(mapping.toLowerCase()) ||
                mapping.toLowerCase().includes(f.toLowerCase())
              );
              if (found) {
                console.log(`✅ Found special mapping (JSON export): ${fieldPath} -> ${found}`);
                return found;
              }
            }
          }
          
          // Special handling for trendelenburg fields - try fuzzy matching
          if (fieldPath.includes('trendelenburg')) {
            const isRight = fieldPath.includes('.right') || fieldPath.includes('right');
            const isLeft = fieldPath.includes('.left') || fieldPath.includes('left');
            
            if (isRight) {
              // Try to find any field containing trendelenburg and droit/right
              const fuzzyMatch = pdfFieldNamesList.find(f => {
                const fLower = f.toLowerCase();
                return (fLower.includes('trendelenburg') || fLower.includes('trendelen')) &&
                       (fLower.includes('droit') || fLower.includes('right') || fLower.includes('d.') || fLower.endsWith('d'));
              });
              if (fuzzyMatch) {
                console.log(`✅ Found fuzzy match for trendelenburg right (JSON export): ${fieldPath} -> ${fuzzyMatch}`);
                return fuzzyMatch;
              }
            } else if (isLeft) {
              // Try to find any field containing trendelenburg and gauche/left
              const fuzzyMatch = pdfFieldNamesList.find(f => {
                const fLower = f.toLowerCase();
                return (fLower.includes('trendelenburg') || fLower.includes('trendelen')) &&
                       (fLower.includes('gauche') || fLower.includes('left') || fLower.includes('g.') || fLower.endsWith('g'));
              });
              if (fuzzyMatch) {
                console.log(`✅ Found fuzzy match for trendelenburg left (JSON export): ${fieldPath} -> ${fuzzyMatch}`);
                return fuzzyMatch;
              }
            }
          }
          
          // Try various patterns: moduleName.fieldPath, moduleName_fieldPath, etc.
          const patterns = [
            `${moduleName}.${fieldPath}`,
            `${moduleName}_${fieldPath}`,
            `${moduleName}${fieldPath.charAt(0).toUpperCase() + fieldPath.slice(1)}`,
            fieldPath.replace(/([A-Z])/g, '_$1').toLowerCase(),
            fieldPath.replace(/([A-Z])/g, '.$1').toLowerCase()
          ];
          
          // Also try French translations for common module names
          const moduleTranslations = {
            'cervicalSpine': ['colonne_cervicale', 'colonneCervicale', 'cervical'],
            'lumbarSpine': ['colonne_lombaire', 'colonneLombaire', 'lombaire'],
            'shoulders': ['epaules', 'epaule', 'shoulder'],
            'elbows': ['coudes', 'coude', 'elbow'],
            'wristsHands': ['poignets_mains', 'poignetsMains', 'poignet', 'wrist', 'hand'],
            'hips': ['hanches', 'hanche', 'hip'],
            'knees': ['genoux', 'genou', 'knee'],
            'feetAnkles': ['pieds_chevilles', 'piedsChevilles', 'pied', 'ankle'],
            'muscleAtrophy': ['atrophie_musculaire', 'atrophieMusculaire', 'atrophie'],
            'neurovascularAssessment': ['evaluation_neurovasculaire', 'evaluationNeurovasculaire', 'neurovasculaire']
          };
          
          const translations = moduleTranslations[moduleName] || [moduleName];
          
          for (const pattern of patterns) {
            for (const translation of translations) {
              const testPatterns = [
                `${translation}.${fieldPath}`,
                `${translation}_${fieldPath}`,
                `${translation}${fieldPath.charAt(0).toUpperCase() + fieldPath.slice(1)}`
              ];
              
              for (const testPattern of testPatterns) {
                const found = pdfFieldNamesList.find(f => 
                  f.toLowerCase() === testPattern.toLowerCase() ||
                  f.toLowerCase().includes(testPattern.toLowerCase()) ||
                  testPattern.toLowerCase().includes(f.toLowerCase())
                );
                if (found) return found;
              }
            }
            
            const found = pdfFieldNamesList.find(f => 
              f.toLowerCase() === pattern.toLowerCase() ||
              f.toLowerCase().includes(pattern.toLowerCase()) ||
              pattern.toLowerCase().includes(f.toLowerCase())
            );
            if (found) return found;
          }
          
          return null;
        };
        
        // Recursively process module data
        const processValue = (value, path = '') => {
          if (value === null || value === undefined || value === '') return;
          
          if (typeof value === 'object' && !Array.isArray(value)) {
            Object.keys(value).forEach(key => {
              const newPath = path ? `${path}.${key}` : key;
              processValue(value[key], newPath);
            });
          } else if (Array.isArray(value)) {
            // Arrays are handled separately (e.g., physicalExamMeasurements)
            return;
          } else {
            // Leaf value - map to PDF field
            const pdfField = findPdfField(moduleKey, path);
            if (pdfField && value) {
              modulePdfFields[pdfField] = String(value);
              console.log(`✅ Mapped Section 9 field (JSON export): ${moduleKey}.${path} -> ${pdfField} = "${value}"`);
            } else if (value) {
              // If no PDF field found, still add with module path for reference
              const fallbackField = `${moduleKey}.${path}`.replace(/\./g, '_');
              modulePdfFields[fallbackField] = String(value);
              console.log(`⚠️ Section 9 field not found in PDF (JSON export), using fallback: ${moduleKey}.${path} -> ${fallbackField}`);
              // Special handling for trendelenburg fields - ensure they're exported even if not found in PDF
              if (path.includes('trendelenburg')) {
                console.log(`📝 Trendelenburg field detected (JSON export): ${moduleKey}.${path}, ensuring export with fallback field: ${fallbackField}`);
              }
            }
          }
        };
        
        if (selectedModulesValue[moduleKey] && moduleDataValue) {
          processValue(moduleDataValue);
        }
        
        return modulePdfFields;
      };
      
      // Process all selected modules and add to pdfData
      Object.keys(moduleData).forEach(moduleKey => {
        if (selectedModules[moduleKey]) {
          const modulePdfFields = processModuleDataToPdfFieldsJSON(moduleKey, moduleData[moduleKey], selectedModules, pdfFieldNames);
          
          // CRITICAL: Remove any 'nb' field from module data - it should NEVER come from modules
          // Module data should only contain trendelenburg, range of motion, etc., NOT 'nb'
          Object.keys(modulePdfFields).forEach(key => {
            if (key.toLowerCase() === 'nb' || key === 'nb') {
              console.warn(`⚠️ Removed 'nb' field from module data (${moduleKey}) - nb should only come from formData.noteBene`);
              delete modulePdfFields[key];
            }
          });
          
          Object.assign(pdfData, modulePdfFields);
        }
      });
      
      // Explicit handling for trendelenburg fields to ensure they're linked in JSON export
      if (moduleData.hips && moduleData.hips.specializedTests && moduleData.hips.specializedTests.trendelenburg) {
        const trendelenburgRight = moduleData.hips.specializedTests.trendelenburg.right;
        const trendelenburgLeft = moduleData.hips.specializedTests.trendelenburg.left;
        
        if (trendelenburgRight) {
          // Try to find PDF field for trendelenburg right
          const rightField = pdfFieldNames.find(f => {
            const fLower = f.toLowerCase();
            return (fLower.includes('trendelenburg') || fLower.includes('trendelen')) &&
                   (fLower.includes('droit') || fLower.includes('right') || fLower.includes('d.') || fLower.endsWith('d'));
          });
          if (rightField && !pdfData[rightField]) {
            pdfData[rightField] = trendelenburgRight;
            console.log(`✅ Explicitly mapped trendelenburg right to PDF field (JSON export): ${rightField} = "${trendelenburgRight}"`);
          }
        }
        
        if (trendelenburgLeft) {
          // Try to find PDF field for trendelenburg left
          const leftField = pdfFieldNames.find(f => {
            const fLower = f.toLowerCase();
            return (fLower.includes('trendelenburg') || fLower.includes('trendelen')) &&
                   (fLower.includes('gauche') || fLower.includes('left') || fLower.includes('g.') || fLower.endsWith('g'));
          });
          if (leftField && !pdfData[leftField]) {
            pdfData[leftField] = trendelenburgLeft;
            console.log(`✅ Explicitly mapped trendelenburg left to PDF field (JSON export): ${leftField} = "${trendelenburgLeft}"`);
          }
        }
      }
      
      // Filter out unmapped fields - only keep fields that match PDF field names
      // pdfFieldNames contains all detected PDF field names
      const mappedFieldsOnly = {};
      
      // CRITICAL: Always include these essential fields even if not in pdfFieldNames
      // These are explicitly mapped fields that must be preserved
      const essentialFields = ['age', 'tabac', 'cannabis', 'alcool', 'nb'];
      
      Object.keys(pdfData).forEach((key) => {
        // Filter out internal sequela form fields - these are mapped to PDF fields
        if (/^sequelaCode\d+$/.test(key) || 
            /^sequelaDescription\d+$/.test(key) || 
            /^sequelaPercentage\d+$/.test(key)) {
          return; // Skip internal form field names
        }
        
        // Always include essential fields (age, tabac, cannabis, alcool, nb) even if not detected
        if (essentialFields.includes(key.toLowerCase()) || essentialFields.includes(key)) {
          mappedFieldsOnly[key] = pdfData[key];
          console.log(`✅ Preserved essential field in JSON export: ${key} = "${pdfData[key]}"`);
          return;
        }
        
        // Only include fields that match PDF field names (mapped fields)
        if (pdfFieldNames.includes(key)) {
          mappedFieldsOnly[key] = pdfData[key];
        } else {
          // Also check if it's a fallback module data field that should be included
          // (e.g., hipsspecializedTeststrendelenburgright)
          const moduleNames = ['cervicalSpine', 'lumbarSpine', 'shoulders', 'elbows', 'wristsHands', 'hips', 'knees', 'feetAnkles', 'muscleAtrophy', 'neurovascularAssessment'];
          const isModuleFallback = moduleNames.some(moduleName => 
            key.toLowerCase().startsWith(moduleName.toLowerCase())
          );
          
          // Include module fallback fields (they represent valid module data)
          if (isModuleFallback) {
            mappedFieldsOnly[key] = pdfData[key];
          } else {
            console.log(`⚠️ Filtering out unmapped field from JSON export: ${key}`);
          }
        }
      });
      
      // If we know field types, keep only text fields to match requirement
      let dataToSave = mappedFieldsOnly;
      if (detectedFieldTypes) {
        const onlyText = {};
        Object.keys(mappedFieldsOnly).forEach((key) => {
          if (!detectedFieldTypes[key] || detectedFieldTypes[key] === 'PDFTextField') {
            onlyText[key] = mappedFieldsOnly[key];
          }
        });
        
        // Always include Section 12 fields and essential fields even if not detected as PDFTextField
        // These are critical for data integrity
        const section12Fields = [
          fieldMapping.currentSequelae,
          fieldMapping.previousSequelae,
          fieldMapping.otherBilateralDeficits,
          fieldMapping.noteBene,
          'currentSequelae',
          'sequellesActuelles',
          'previousSequelae',
          'sequellesAnterieures',
          'otherBilateralDeficits',
          'deficitsBilateraux',
          'noteBene',
          'nb'
        ].filter(Boolean);
        
        section12Fields.forEach(field => {
          // Only include if it's a mapped PDF field
          if (pdfFieldNames.includes(field) && pdfData[field] && !onlyText[field]) {
            onlyText[field] = pdfData[field];
          }
        });
        
        // CRITICAL: Always include essential fields (age, tabac, cannabis, alcool) even if not detected as PDFTextField
        // These fields are explicitly mapped and must be preserved
        const essentialFieldsToInclude = ['age', 'tabac', 'cannabis', 'alcool', 'nb'];
        essentialFieldsToInclude.forEach(field => {
          // Check both the exact field name and lowercase version
          const fieldKey = Object.keys(mappedFieldsOnly).find(k => 
            k.toLowerCase() === field.toLowerCase() || k === field
          );
          if (fieldKey && mappedFieldsOnly[fieldKey] !== undefined && mappedFieldsOnly[fieldKey] !== null && mappedFieldsOnly[fieldKey] !== '') {
            onlyText[fieldKey] = mappedFieldsOnly[fieldKey];
            console.log(`✅ Preserved essential field in onlyText: ${fieldKey} = "${mappedFieldsOnly[fieldKey]}"`);
          }
        });
        
        dataToSave = onlyText;
      } else {
        dataToSave = mappedFieldsOnly;
      }
      
      // FINAL SAFEGUARD: Ensure essential fields (age, tabac, cannabis, alcool, nb) are always included
      // This is the last check before creating the JSON to prevent any missing values
      
      // 1. Age (Section 4) - Map to age_identification
      const finalAgeValue = completeFormData.age;
      if (finalAgeValue && finalAgeValue !== '' && finalAgeValue !== null && finalAgeValue !== undefined) {
        // Prioritize age_identification field
        const ageField = pdfFieldNames.find(f => /age_identification/i.test(f)) || 
                        pdfFieldNames.find(f => /ageidentification/i.test(f)) ||
                        pdfFieldNames.find(f => /^age$/i.test(f)) || 
                        'age_identification';
        dataToSave[ageField] = finalAgeValue;
        console.log(`✅ Final safeguard: Set age to formData value: "${finalAgeValue}" in field "${ageField}"`);
      }
      
      // 2. Tabac (Section 5)
      const finalTabacValue = completeFormData.tobacco || completeFormData.tabac;
      if (finalTabacValue && finalTabacValue !== '' && finalTabacValue !== null && finalTabacValue !== undefined) {
        const tabacField = pdfFieldNames.find(f => /tabac/i.test(f)) || 'tabac';
        dataToSave[tabacField] = finalTabacValue;
        console.log(`✅ Final safeguard: Set tabac to formData value: "${finalTabacValue}" in field "${tabacField}"`);
      }
      
      // 3. Cannabis (Section 5)
      const finalCannabisValue = completeFormData.cannabis;
      if (finalCannabisValue && finalCannabisValue !== '' && finalCannabisValue !== null && finalCannabisValue !== undefined) {
        const cannabisField = pdfFieldNames.find(f => /cannabis/i.test(f)) || 'cannabis';
        dataToSave[cannabisField] = finalCannabisValue;
        console.log(`✅ Final safeguard: Set cannabis to formData value: "${finalCannabisValue}" in field "${cannabisField}"`);
      }
      
      // 4. Alcool (Section 5)
      const finalAlcoolValue = completeFormData.alcohol || completeFormData.alcool;
      if (finalAlcoolValue && finalAlcoolValue !== '' && finalAlcoolValue !== null && finalAlcoolValue !== undefined) {
        const alcoolField = pdfFieldNames.find(f => /alcool/i.test(f)) || 'alcool';
        dataToSave[alcoolField] = finalAlcoolValue;
        console.log(`✅ Final safeguard: Set alcool to formData value: "${finalAlcoolValue}" in field "${alcoolField}"`);
      }
      
      // 5. Note Bene (NB)
      if (noteBeneFromForm !== undefined && noteBeneFromForm !== null) {
        // Remove any existing 'nb' field that might have incorrect data
        Object.keys(dataToSave).forEach(key => {
          if (key.toLowerCase() === 'nb' || key === 'nb') {
            const existingValue = dataToSave[key];
            // If the existing value is "Neg" or looks like trendelenburg data, remove it
            if (existingValue && typeof existingValue === 'string' && 
                (existingValue.toLowerCase().includes('neg') || 
                 existingValue.toLowerCase().includes('trendelenburg') ||
                 existingValue.toLowerCase().includes('positive') ||
                 existingValue.toLowerCase().includes('negative'))) {
              delete dataToSave[key];
              console.log(`⚠️ Removed incorrect 'nb' value before JSON export: "${existingValue}"`);
            }
          }
        });
        
        // ALWAYS set 'nb' to the value from formData, regardless of what's in dataToSave
        dataToSave['nb'] = noteBeneFromForm;
        console.log(`✅ Final safeguard: Set 'nb' to formData value: "${noteBeneFromForm}"`);
      }
      
      const jsonData = JSON.stringify(dataToSave, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const fileName = pdfFile 
        ? `${pdfFile.name.replace('.pdf', '')}_form_data.json`
        : 'form_data.json';
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
      alert(`Form data exported to ${fileName} successfully!`);
    } catch (error) {
      console.error('Error exporting JSON:', error);
      alert('Error exporting JSON: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Clean white bar */}
      <div className="bg-white border-b border-gray-200 header-shadow">
        <div className="max-w-full px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {pdfFile ? pdfFile.name : 'Interactive PDF Form Filler'}
              </h1>
              {pdfFile && (
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="status-badge">
                    <div className="status-indicator"></div>
                    <span>Ready to use</span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              {pdfFile && (
                <>
                  <button
                    onClick={handleExportToJSON}
                    className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg transition pdf-action-button"
                    title="Export form data to JSON file"
                  >
                    <FileJson className="w-4 h-4" />
                    Export JSON
                  </button>
                  <button
                    onClick={() => jsonInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg transition pdf-action-button"
                    title="Import data from JSON file"
                  >
                    <FileJson className="w-4 h-4" />
                    Import JSON
                  </button>
                  <button
                    onClick={() => setShowTemplateDialog(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg transition pdf-action-button"
                    title="Save current template"
                  >
                    <Save className="w-4 h-4" />
                    Save Template
                  </button>
                </>
              )}
            </div>
          </div>
          
          {/* Template Selector */}
          {templates.length > 0 && (
            <div className="mt-4 flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">Load Template:</label>
              <select
                value={selectedTemplate?.id || ''}
                onChange={(e) => e.target.value && handleLoadTemplate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a template...</option>
                {templates.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.name} {template.pdfName && `(${template.pdfName})`}
                  </option>
                ))}
              </select>
              <button
                onClick={() => templateInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition text-sm"
              >
                <FolderOpen className="w-4 h-4" />
                Import Template
              </button>
              {selectedTemplate && (
                <button
                  onClick={handleExportTemplate}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition text-sm"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
              )}
            </div>
          )}
          
          {/* Hidden file inputs */}
          <input
            ref={jsonInputRef}
            type="file"
            accept="application/json"
            onChange={handleJSONUpload}
            className="hidden"
          />
          <input
            ref={templateInputRef}
            type="file"
            accept="application/json"
            onChange={handleImportTemplate}
            className="hidden"
          />
        </div>
      </div>

      {/* Form Section with PDF Viewer */}
      {pdfFile && pdfUrl ? (
         <div className="w-full flex-1 flex overflow-hidden bg-gray-50">
           {/* Form View - Main Page */}
           <div className={`flex flex-col overflow-auto bg-gradient-to-br from-blue-50 to-gray-100 ${showPdfViewer ? 'w-1/2 border-r border-gray-300' : 'w-full'}`}>
            <div className="p-6">
              {/* View PDF Button */}
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => setShowPdfViewer(!showPdfViewer)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm font-medium"
                  title={showPdfViewer ? "Hide PDF Viewer" : "Show PDF Viewer"}
                >
                  {showPdfViewer ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Hide PDF
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View PDF
                    </>
                  )}
                </button>
              </div>
              {/* Mapping Toggle */}
              <div className="flex items-center justify-end mb-3">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={showFieldMapping}
                    onChange={(e) => setShowFieldMapping(e.target.checked)}
                  />
                  Afficher les champs PDF (associations)
                </label>
              </div>
              {/* Progress Bar */}
              <div className="mb-6 bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-700">Progression du formulaire</h3>
                  <span className="text-sm font-medium text-blue-600">{progressPercentage}%</span>
                </div>
                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                  <div 
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                {/* Section Indicators */}
                <div className="flex flex-wrap gap-2">
                  {sections.map((section, index) => {
                    const isCompleted = completedSections.has(index) || isSectionCompleted(index);
                    const isCurrent = index === currentSection;
                    
                    return (
                      <button
                        key={section.key}
                        onClick={() => navigateToSection(index)}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                          isCurrent
                            ? 'bg-blue-600 text-white shadow-md'
                            : isCompleted
                            ? 'bg-green-500 text-white hover:bg-green-600'
                            : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                        }`}
                        title={section.title}
                      >
                        {index + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
              
              {/* Mapping Toggle */}
              <div className="flex items-center justify-end mb-3">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={showFieldMapping}
                    onChange={(e) => setShowFieldMapping(e.target.checked)}
                  />
                  Afficher les champs PDF (associations)
                </label>
              </div>
              
              {/* Current Section Display */}
              <MappingContext.Provider value={{ mapping: fieldMapping, show: showFieldMapping }}>
                <div className="bg-white rounded-lg shadow-md p-6 mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-800">
                      {sections[currentSection]?.title}
                    </h2>
                    {isSectionCompleted(currentSection) && (
                      <span className="flex items-center gap-2 text-green-600 text-sm font-medium">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Complété
                      </span>
                    )}
                  </div>
                  
                  {/* Navigation Buttons */}
                  <div className="flex items-center justify-between mb-4 pb-4 border-b">
                    <button
                      onClick={() => navigateToSection(Math.max(0, currentSection - 1))}
                      disabled={currentSection === 0}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        currentSection === 0
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      ← Précédent
                    </button>
                    <button
                      onClick={() => {
                        markSectionComplete(currentSection);
                        if (currentSection < sections.length - 1) {
                          navigateToSection(currentSection + 1);
                        }
                      }}
                      disabled={currentSection === sections.length - 1}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        currentSection === sections.length - 1
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      Suivant →
                    </button>
                  </div>
                  
                  {/* Section Content - Conditional Rendering */}
                  <div>
                    {/* Section 0: Worker Information */}
                    {currentSection === 0 && (
                      <div>
                        <div className="grid grid-cols-2 gap-4">
                          <InputField 
                            label="Nom" 
                            field="workerName"
                            value={formData.workerName || formData.nom || formData.nomTravailleur || formData.lastName || ''}
                            onChange={(e) => handleInputChange('workerName', e.target.value)}
                            handleInputChange={handleInputChange}
                          />
                          <InputField 
                            label="Prénom" 
                            field="workerFirstName"
                            value={formData.workerFirstName || formData.firstName || formData.prenom || ''}
                            onChange={(e) => handleInputChange('workerFirstName', e.target.value)}
                            handleInputChange={handleInputChange}
                          />
                          <InputField 
                            label="No d'assurance maladie" 
                            field="healthInsuranceNo"
                            value={formData.healthInsuranceNo || formData.noAssuranceMaladie || ''}
                            onChange={(e) => handleInputChange('healthInsuranceNo', e.target.value)}
                          />
                          <InputField 
                            label="Date de naissance" 
                            field="birthDate" 
                            type="date"
                            value={formData.birthDate || formData.dateNaissance || formData.dateOfBirth || ''}
                            onChange={(e) => handleInputChange('birthDate', e.target.value)}
                          />
                        </div>
                        <InputField 
                          label="Adresse" 
                          field="address"
                          value={formData.address || formData.adresse || ''}
                          onChange={(e) => handleInputChange('address', e.target.value)}
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <InputField 
                            label="Téléphone" 
                            field="phone" 
                            type="tel"
                            value={formData.phone || formData.telephone || ''}
                            onChange={(e) => handleInputChange('phone', e.target.value)}
                          />
                          <InputField 
                            label="No de dossier du travailleur" 
                            field="workerFileNo"
                            value={formData.workerFileNo || formData.noDossierTravailleur || ''}
                            onChange={(e) => handleInputChange('workerFileNo', e.target.value)}
                          />
                          <InputField 
                            label="Date de l'évènement d'origine" 
                            field="originEventDate" 
                            type="date"
                            value={formData.originEventDate || formData.dateEvenementOrigine || ''}
                            onChange={(e) => handleInputChange('originEventDate', e.target.value)}
                          />
                          <InputField 
                            label="Date de la récidive, rechute ou aggravation" 
                            field="recurrenceDate" 
                            type="date"
                            value={formData.recurrenceDate || formData.dateRecidive || ''}
                            onChange={(e) => handleInputChange('recurrenceDate', e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                    
                    {/* Section 1: Doctor Information */}
                    {currentSection === 1 && (
                      <div>
                        <div className="grid grid-cols-2 gap-4">
                          <InputField 
                            label="Nom" 
                            field="doctorName" 
                            value={formData.doctorName || formData.nomMedecin || ''}
                            onChange={(e) => handleInputChange('doctorName', e.target.value)}
                            handleInputChange={handleInputChange}
                          />
                          <InputField 
                            label="Prénom" 
                            field="doctorFirstName"
                            value={formData.doctorFirstName || formData.prenomMedecin || ''}
                            onChange={(e) => handleInputChange('doctorFirstName', e.target.value)}
                            handleInputChange={handleInputChange}
                          />
                          <InputField 
                            label="No permis" 
                            field="licenseNo"
                            value={formData.licenseNo || formData.noPermis || ''}
                            onChange={(e) => handleInputChange('licenseNo', e.target.value)}
                            handleInputChange={handleInputChange}
                          />
                          <InputField 
                            label="Téléphone" 
                            field="doctorPhone" 
                            type="tel"
                            value={formData.doctorPhone || formData.telephoneMedecin || ''}
                            onChange={(e) => handleInputChange('doctorPhone', e.target.value)}
                            handleInputChange={handleInputChange}
                          />
                        </div>
                        <InputField 
                          label="Adresse" 
                          field="doctorAddress"
                          value={formData.doctorAddress || formData.adresseMedecin || ''}
                          onChange={(e) => handleInputChange('doctorAddress', e.target.value)}
                          handleInputChange={handleInputChange}
                        />
                        <InputField 
                          label="Courriel" 
                          field="doctorEmail" 
                          type="email"
                          value={formData.doctorEmail || formData.courrielMedecin || ''}
                          onChange={(e) => handleInputChange('doctorEmail', e.target.value)}
                          handleInputChange={handleInputChange}
                        />
                      </div>
                    )}
                    
                    {/* Section 2: Mandat */}
                    {currentSection === 2 && (
                      <div>
                        <div className="mb-4">
                          <p className="text-sm text-gray-700 mb-3">
                            Le but de l'évaluation est de répondre aux points suivants de l'article de la LATMP :
                          </p>
                          <div className="space-y-2 mb-4">
                            <label className="flex items-start gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={mandateCheckboxes.diagnostic}
                                onChange={(e) => handleMandateCheckboxChange('diagnostic', e.target.checked)}
                                className="mt-1"
                              />
                              <span className="text-sm">{mandateItems.diagnostic}</span>
                            </label>
                            <label className="flex items-start gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={mandateCheckboxes.dateConsolidation}
                                onChange={(e) => handleMandateCheckboxChange('dateConsolidation', e.target.checked)}
                                className="mt-1"
                              />
                              <span className="text-sm">{mandateItems.dateConsolidation}</span>
                            </label>
                            <label className="flex items-start gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={mandateCheckboxes.natureSoins}
                                onChange={(e) => handleMandateCheckboxChange('natureSoins', e.target.checked)}
                                className="mt-1"
                              />
                              <span className="text-sm">{mandateItems.natureSoins}</span>
                            </label>
                            <label className="flex items-start gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={mandateCheckboxes.atteinteExistence}
                                onChange={(e) => handleMandateCheckboxChange('atteinteExistence', e.target.checked)}
                                className="mt-1"
                              />
                              <span className="text-sm">{mandateItems.atteinteExistence}</span>
                            </label>
                            <label className="flex items-start gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={mandateCheckboxes.atteintePourcentage}
                                onChange={(e) => handleMandateCheckboxChange('atteintePourcentage', e.target.checked)}
                                className="mt-1"
                              />
                              <span className="text-sm">{mandateItems.atteintePourcentage}</span>
                            </label>
                            <label className="flex items-start gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={mandateCheckboxes.limitationsExistence}
                                onChange={(e) => handleMandateCheckboxChange('limitationsExistence', e.target.checked)}
                                className="mt-1"
                              />
                              <span className="text-sm">{mandateItems.limitationsExistence}</span>
                            </label>
                            <label className="flex items-start gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={mandateCheckboxes.limitationsEvaluation}
                                onChange={(e) => handleMandateCheckboxChange('limitationsEvaluation', e.target.checked)}
                                className="mt-1"
                              />
                              <span className="text-sm">{mandateItems.limitationsEvaluation}</span>
                            </label>
                          </div>
                        </div>
                        <TextAreaField 
                          label="Mandat de l'évaluation" 
                          field="mandate"
                          rows={8}
                          placeholder="Les éléments sélectionnés ci-dessus apparaîtront ici..."
                          value={formData.mandate || ''}
                          onChange={(e) => handleInputChange('mandate', e.target.value)}
                          handleInputChange={handleInputChange}
                        />
                      </div>
                    )}
                    
                    {/* Section 3: Diagnostics */}
                    {currentSection === 3 && (
                      <div>
                        <TextAreaField 
                          label="Diagnostics" 
                          field="acceptedDiagnostics"
                          rows={3}
                          value={formData.acceptedDiagnostics || ''}
                          onChange={(e) => handleInputChange('acceptedDiagnostics', e.target.value)}
                          handleInputChange={handleInputChange}
                        />
                      </div>
                    )}
                    
                    {/* Section 4: Interview */}
                    {currentSection === 4 && (
                      <div>
                        <TextAreaField 
                          label="Description de l'entrevue" 
                          field="interviewModality"
                          rows={8}
                          value={formData.interviewModality || ''}
                          onChange={(e) => handleInputChange('interviewModality', e.target.value)}
                          handleInputChange={handleInputChange}
                        />
                      </div>
                    )}
                    
                    {/* Section 5: Identification */}
                    {currentSection === 5 && (
                      <div>
                        <div className="grid grid-cols-3 gap-4">
                          <InputField 
                            label="Âge" 
                            field="age" 
                            type="number"
                            value={formData.age || ''}
                            onChange={(e) => handleInputChange('age', e.target.value)}
                            handleInputChange={handleInputChange}
                          />
                          <InputField 
                            label="Dominance" 
                            field="dominance" 
                            placeholder="ex: Droitier/Gaucher"
                            value={formData.dominance || ''}
                            onChange={(e) => handleInputChange('dominance', e.target.value)}
                            handleInputChange={handleInputChange}
                          />
                          <InputField 
                            label="Emploi" 
                            field="employment"
                            value={formData.employment || ''}
                            onChange={(e) => handleInputChange('employment', e.target.value)}
                            handleInputChange={handleInputChange}
                          />
                        </div>
                      </div>
                    )}
                    
                    {/* Section 6: History (Antécédents) */}
                    {currentSection === 6 && (
                      <div>
                            {/* Médicaux - Linked to Section 7 */}
                            <div className="mb-4">
                              <div className="flex items-center justify-between mb-1">
                                <label className="block text-sm font-medium text-gray-700">
                                  Médicaux :
                                </label>
                                {showFieldMapping && (
                                  <span className="text-[11px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                    PDF: {fieldMapping['antecedentsMedicaux'] || 'antecedentsMedicaux'}
                                  </span>
                                )}
                              </div>
                              <input
                                type="text"
                                value={formData.medicalHistory || formData.antecedentsMedicaux || ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  handleInputChange('medicalHistory', value);
                                  handleInputChange('antecedentsMedicaux', value);
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                              />
                            </div>

                            {/* Chirurgicaux - Linked to Section 7 */}
                            <div className="mb-4">
                              <div className="flex items-center justify-between mb-1">
                                <label className="block text-sm font-medium text-gray-700">
                                  Chirurgicaux :
                                </label>
                                {showFieldMapping && (
                                  <span className="text-[11px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                    PDF: {fieldMapping['antecedenusChirurgicaux'] || 'antecedenusChirurgicaux'}
                                  </span>
                                )}
                              </div>
                              <input
                                type="text"
                                value={formData.surgicalHistory || formData.antecedenusChirurgicaux || ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  handleInputChange('surgicalHistory', value);
                                  handleInputChange('antecedenusChirurgicaux', value);
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                              />
                            </div>

                            {/* Au site et au pourtour de la lésion - Linked to Section 7 */}
                            <div className="mb-4">
                              <div className="flex items-center justify-between mb-1">
                                <label className="block text-sm font-medium text-gray-700">
                                  Au site et au pourtour de la lésion :
                                </label>
                                {showFieldMapping && (
                                  <span className="text-[11px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                    PDF: {fieldMapping['antecedentsLesion'] || 'antecedentsLesion'}
                                  </span>
                                )}
                              </div>
                              <input
                                type="text"
                                value={formData.lesionHistory || formData.antecedentsLesion || ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  handleInputChange('lesionHistory', value);
                                  handleInputChange('antecedentsLesion', value);
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                              />
                            </div>

                            {/* Accidentels */}
                            <div className="mb-4">
                              <div className="flex items-center justify-between mb-1">
                                <label className="block text-sm font-medium text-gray-700">
                                  Accidentels :
                                </label>
                              </div>
                              <div className="ml-4 space-y-3">
                                <div className="flex items-center gap-2">
                                  <label className="text-sm font-medium text-gray-700 min-w-[80px]">CNESST :</label>
                                  {showFieldMapping && (
                                    <span className="text-[11px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                      PDF: {fieldMapping['accidentsCNESST'] || 'accidentsCNESST'}
                                    </span>
                                  )}
                                  <input
                                    type="text"
                                    value={formData.cnesstHistory || formData.accidentsCNESST || ''}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      handleInputChange('cnesstHistory', value);
                                      handleInputChange('accidentsCNESST', value);
                                    }}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <label className="text-sm font-medium text-gray-700 min-w-[80px]">SAAQ :</label>
                                  {showFieldMapping && (
                                    <span className="text-[11px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                      PDF: {fieldMapping['accidentsAutres'] || 'accidentsAutres'}
                                    </span>
                                  )}
                                  <input
                                    type="text"
                                    value={formData.saaqHistory || formData.accidentsAutres || ''}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      handleInputChange('saaqHistory', value);
                                      handleInputChange('accidentsAutres', value);
                                    }}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <label className="text-sm font-medium text-gray-700 min-w-[80px]">Autres :</label>
                                  {showFieldMapping && (
                                    <span className="text-[11px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                      PDF: {fieldMapping['autres'] || 'autres'}
                                    </span>
                                  )}
                                  <input
                                    type="text"
                                    value={formData.otherHistory || formData.autres || ''}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      handleInputChange('otherHistory', value);
                                      handleInputChange('autres', value);
                                    }}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Allergie */}
                            <div className="mb-4">
                              <div className="flex items-center justify-between mb-1">
                                <label className="block text-sm font-medium text-gray-700">
                                  Allergie :
                                </label>
                                {showFieldMapping && (
                                  <span className="text-[11px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                    PDF: {fieldMapping['allergie'] || 'allergie'}
                                  </span>
                                )}
                              </div>
                              <input
                                type="text"
                                value={formData.allergies || formData.allergie || ''}
                                onChange={(e) => handleInputChange('allergies', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                              />
                            </div>

                            {/* Tabac, Cannabis, Alcool - Dropdown Layout */}
                            <div className="flex items-center gap-4 mb-4">
                              <div className="flex items-center gap-2">
                                <label className="text-sm font-medium text-gray-700">Tabac :</label>
                                {showFieldMapping && (
                                  <span className="text-[11px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">PDF: {fieldMapping['tabac'] || fieldMapping['tobacco'] || 'tabac'}</span>
                                )}
                                <select
                                  value={formData.tobacco || formData.tabac || ''}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    console.log(`📝 Tabac dropdown changed: "${value}"`);
                                    // Update both tobacco and tabac to ensure consistency
                                    handleInputChange('tobacco', value);
                                    handleInputChange('tabac', value);
                                    console.log(`✅ Updated formData.tobacco = "${value}", formData.tabac = "${value}"`);
                                  }}
                                  className="w-40 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                                >
                                  <option value="">Sélectionner</option>
                                  <option value="positif">Positif</option>
                                  <option value="négatif">Négatif</option>
                                </select>
                              </div>
                              <div className="flex items-center gap-2">
                                <label className="text-sm font-medium text-gray-700">Cannabis :</label>
                                {showFieldMapping && (
                                  <span className="text-[11px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">PDF: {fieldMapping['cannabis'] || 'cannabis'}</span>
                                )}
                                <select
                                  value={formData.cannabis || ''}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    console.log(`📝 Cannabis dropdown changed: "${value}"`);
                                    handleInputChange('cannabis', value);
                                    console.log(`✅ Updated formData.cannabis = "${value}"`);
                                  }}
                                  className="w-40 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                                >
                                  <option value="">Sélectionner</option>
                                  <option value="positif">Positif</option>
                                  <option value="négatif">Négatif</option>
                                </select>
                              </div>
                              <div className="flex items-center gap-2">
                                <label className="text-sm font-medium text-gray-700">Alcool :</label>
                                {showFieldMapping && (
                                  <span className="text-[11px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">PDF: {fieldMapping['alcool'] || fieldMapping['alcohol'] || 'alcool'}</span>
                                )}
                                <select
                                  value={formData.alcohol || formData.alcool || ''}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    console.log(`📝 Alcool dropdown changed: "${value}"`);
                                    // Update both alcohol and alcool to ensure consistency
                                    handleInputChange('alcohol', value);
                                    handleInputChange('alcool', value);
                                    console.log(`✅ Updated formData.alcohol = "${value}", formData.alcool = "${value}"`);
                                  }}
                                  className="w-40 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                                >
                                  <option value="">Sélectionner</option>
                                  <option value="positif">Positif</option>
                                  <option value="négatif">Négatif</option>
                                </select>
                              </div>
                            </div>
                      </div>
                    )}
                    
                    {/* Section 7: Medication */}
                    {currentSection === 7 && (
                      <div>
                        <TextAreaField 
                          label="Médication et traitements" 
                          field="currentMedication"
                          rows={6}
                          value={formData.currentMedication || ''}
                          onChange={(e) => handleInputChange('currentMedication', e.target.value)}
                          handleInputChange={handleInputChange}
                        />
                      </div>
                    )}
                    
                    {/* Section 8: Evolution (Historique de faits) */}
                    {currentSection === 8 && (
                      <div>
                        <div className="flex gap-4 h-[600px]">
                          {/* Left Panel - Transcript */}
                          <div className="w-1/3 bg-white border border-gray-200 rounded-lg flex flex-col">
                            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                              <h4 className="text-sm font-semibold text-gray-700">Transcript</h4>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setFormData(prev => ({ ...prev, historiqueFaitsTranscript: [] }));
                                  }}
                                  className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                                  title="Effacer"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                              {formData.historiqueFaitsTranscript && formData.historiqueFaitsTranscript.length > 0 ? (
                                formData.historiqueFaitsTranscript.map((entry, index) => (
                                  <div key={index} className="text-sm">
                                    <span className="text-gray-500 font-mono text-xs">{entry.timestamp}</span>
                                    <p className="text-gray-800 mt-1">{entry.text}</p>
                                  </div>
                                ))
                              ) : (
                                <p className="text-gray-400 text-sm text-center mt-4">Aucune transcription</p>
                              )}
                              {isRecording.evolution && (
                                <div className="text-sm">
                                  <span className="text-red-500 font-mono text-xs animate-pulse">{formatTime((Date.now() - (recordingStartTime.evolution || Date.now())) / 1000)}</span>
                                  <p className="text-gray-400 mt-1 italic">Enregistrement en cours...</p>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Right Panel - Main Content */}
                          <div className="flex-1 bg-white border border-gray-200 rounded-lg flex flex-col">
                            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">File</span>
                                <FileText size={16} className="text-gray-500" />
                              </div>
                              <div className="flex items-center gap-3">
                                {/* Language selector */}
                                <select
                                  value={recognitionLanguage}
                                  onChange={(e) => setRecognitionLanguage(e.target.value)}
                                  className="text-xs px-2 py-1 border border-gray-300 rounded bg-white text-gray-700"
                                  disabled={isRecording.evolution}
                                  title="Sélectionner la langue"
                                >
                                  <option value="fr-FR">Français (France)</option>
                                  <option value="fr-CA">Français (Canada)</option>
                                  <option value="en-US">English (US)</option>
                                  <option value="en-CA">English (Canada)</option>
                                </select>
                                {isRecording.evolution && (
                                  <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                                    <span className="text-sm text-red-600">Enregistrement</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex-1 p-4 overflow-y-auto">
                              {isRecording.evolution && (
                                <div className="mb-4 flex justify-center">
                                  <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                                    <Mic size={24} className="text-white" />
                                  </div>
                                </div>
                              )}
                              <TextAreaField 
                                label="" 
                                field="historiqueFaits"
                                rows={8}
                                value={formData.historiqueFaits || ''}
                                onChange={(e) => handleInputChange('historiqueFaits', e.target.value)}
                                handleInputChange={handleInputChange}
                                autoExpand={true}
                                className="w-full"
                              />
                              {/* Continue field - show when first field has significant content, continue field has content, or when recording */}
                              {(formData.historiqueFaits && formData.historiqueFaits.length > 1700) || formData.historiqueFaitsContinue || isRecording.evolution ? (
                                <div className="mt-4">
                                  {showFieldMapping && (
                                    <div className="mb-2">
                                      <span className="text-[11px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                        PDF: {fieldMapping['historiqueFaitsContinue'] || 'historiqueFaitsContinue'}
                                      </span>
                                    </div>
                                  )}
                                  <TextAreaField 
                                    label="Suite (continuation)" 
                                    field="historiqueFaitsContinue"
                                    rows={8}
                                    value={formData.historiqueFaitsContinue || ''}
                                    onChange={(e) => handleInputChange('historiqueFaitsContinue', e.target.value)}
                                    handleInputChange={handleInputChange}
                                    autoExpand={true}
                                    className="w-full"
                                    placeholder="Le texte continue automatiquement ici lorsque le premier champ est plein..."
                                  />
                                </div>
                              ) : null}
                            </div>
                            {/* Bottom Control Bar */}
                            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                              <button
                                onClick={() => {
                                  if (isRecording.evolution) {
                                    handleStopRecording('evolution');
                                  } else {
                                    handleStartRecording('evolution', 'historiqueFaits');
                                  }
                                }}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
                                  isRecording.evolution
                                    ? 'bg-red-500 text-white hover:bg-red-600'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                              >
                                {isRecording.evolution ? (
                                  <>
                                    <MicOff size={18} />
                                    <span>Arrêter</span>
                                  </>
                                ) : (
                                  <>
                                    <Mic size={18} />
                                    <span>Enregistrer</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Section 9: Subjective Questionnaire */}
                    {currentSection === 9 && (
                      <div>
                        <div className="flex gap-4 h-[600px]">
                          {/* Left Panel - Transcript */}
                          <div className="w-1/3 bg-white border border-gray-200 rounded-lg flex flex-col">
                            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                              <h4 className="text-sm font-semibold text-gray-700">Transcript</h4>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setFormData(prev => ({ ...prev, subjectiveQuestionnaireTranscript: [] }));
                                  }}
                                  className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                                  title="Effacer"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                              {formData.subjectiveQuestionnaireTranscript && formData.subjectiveQuestionnaireTranscript.length > 0 ? (
                                formData.subjectiveQuestionnaireTranscript.map((entry, index) => (
                                  <div key={index} className="text-sm">
                                    <span className="text-gray-500 font-mono text-xs">{entry.timestamp}</span>
                                    <p className="text-gray-800 mt-1">{entry.text}</p>
                                  </div>
                                ))
                              ) : (
                                <p className="text-gray-400 text-sm text-center mt-4">Aucune transcription</p>
                              )}
                              {isRecording.subjective && (
                                <div className="text-sm">
                                  <span className="text-red-500 font-mono text-xs animate-pulse">{formatTime((Date.now() - (recordingStartTime.subjective || Date.now())) / 1000)}</span>
                                  <p className="text-gray-400 mt-1 italic">Enregistrement en cours...</p>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Right Panel - Main Content */}
                          <div className="flex-1 bg-white border border-gray-200 rounded-lg flex flex-col">
                            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">File</span>
                                <FileText size={16} className="text-gray-500" />
                              </div>
                              <div className="flex items-center gap-3">
                                {/* Language selector */}
                                <select
                                  value={recognitionLanguage}
                                  onChange={(e) => setRecognitionLanguage(e.target.value)}
                                  className="text-xs px-2 py-1 border border-gray-300 rounded bg-white text-gray-700"
                                  disabled={isRecording.subjective}
                                  title="Sélectionner la langue"
                                >
                                  <option value="fr-FR">Français (France)</option>
                                  <option value="fr-CA">Français (Canada)</option>
                                  <option value="en-US">English (US)</option>
                                  <option value="en-CA">English (Canada)</option>
                                </select>
                                {isRecording.subjective && (
                                  <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                                    <span className="text-sm text-red-600">Enregistrement</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex-1 p-4 overflow-y-auto">
                              {isRecording.subjective && (
                                <div className="mb-4 flex justify-center">
                                  <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                                    <Mic size={24} className="text-white" />
                                  </div>
                                </div>
                              )}
                              <TextAreaField 
                                label="" 
                                field="subjectiveQuestionnaire"
                                rows={10}
                                value={formData.subjectiveQuestionnaire || ''}
                                onChange={(e) => handleInputChange('subjectiveQuestionnaire', e.target.value)}
                                handleInputChange={handleInputChange}
                                autoExpand={true}
                                className="w-full"
                              />
                            </div>
                            {/* Bottom Control Bar */}
                            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                              <button
                                onClick={() => {
                                  if (isRecording.subjective) {
                                    handleStopRecording('subjective');
                                  } else {
                                    handleStartRecording('subjective', 'subjectiveQuestionnaire');
                                  }
                                }}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
                                  isRecording.subjective
                                    ? 'bg-red-500 text-white hover:bg-red-600'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                              >
                                {isRecording.subjective ? (
                                  <>
                                    <MicOff size={18} />
                                    <span>Arrêter</span>
                                  </>
                                ) : (
                                  <>
                                    <Mic size={18} />
                                    <span>Enregistrer</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Section 10: Physical Exam (9. Examen Physique) */}
                    {currentSection === 10 && (
                      <div className="space-y-6">
                        {/* Module Selection Card */}
                        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                          <h3 className="text-lg font-semibold text-gray-800 mb-4">Module Selection</h3>
                          
                          {/* Quick Templates */}
                          <div className="mb-6">
                            <label className="text-sm font-medium text-gray-700 mb-2 block">Quick Templates:</label>
                            <div className="flex flex-wrap gap-2">
                              {[
                                { name: 'Lower Extremity', modules: ['hips', 'knees', 'feetAnkles', 'muscleAtrophy'] },
                                { name: 'Upper Extremity', modules: ['cervicalSpine', 'shoulders', 'elbows', 'wristsHands', 'muscleAtrophy'] },
                                { name: 'Spine Focus', modules: ['cervicalSpine', 'lumbarSpine'] },
                                { name: 'Upper Proximal', modules: ['cervicalSpine', 'shoulders', 'elbows', 'muscleAtrophy'] },
                                { name: 'Upper Distal', modules: ['cervicalSpine', 'wristsHands', 'muscleAtrophy'] },
                                { name: 'Lower Proximal', modules: ['lumbarSpine', 'hips', 'knees', 'muscleAtrophy'] },
                                { name: 'Lower Distal', modules: ['lumbarSpine', 'feetAnkles', 'muscleAtrophy'] },
                                { name: 'Bilateral Upper', modules: ['cervicalSpine', 'shoulders', 'elbows', 'wristsHands', 'muscleAtrophy'] },
                                { name: 'Bilateral Lower', modules: ['lumbarSpine', 'hips', 'knees', 'feetAnkles', 'muscleAtrophy'] },
                                { name: 'Complete Exam', modules: ['cervicalSpine', 'shoulders', 'elbows', 'wristsHands', 'lumbarSpine', 'hips', 'knees', 'feetAnkles', 'muscleAtrophy'] }
                              ].map((template) => (
                                <button
                                  key={template.name}
                                  onClick={() => {
                                    // Toggle: if already selected, unselect; otherwise select
                                    if (selectedQuickTemplate === template.name) {
                                      // Unselect: reset to default state (only generalObservation selected)
                                      setSelectedQuickTemplate(null);
                                      setSelectedModules({
                                        generalObservation: true,
                                        cervicalSpine: false,
                                        shoulders: false,
                                        elbows: false,
                                        wristsHands: false,
                                        lumbarSpine: false,
                                        hips: false,
                                        knees: false,
                                        feetAnkles: false,
                                        muscleAtrophy: false
                                      });
                                      // Collapse all modules except generalObservation
                                      setExpandedModules({
                                        generalObservation: true,
                                        cervicalSpine: false,
                                        shoulders: false,
                                        elbows: false,
                                        wristsHands: false,
                                        lumbarSpine: false,
                                        hips: false,
                                        knees: false,
                                        feetAnkles: false,
                                        muscleAtrophy: false
                                      });
                                    } else {
                                      // Select: set template and REPLACE modules (don't merge)
                                      setSelectedQuickTemplate(template.name);
                                      // Reset all modules first, then set only the template's modules
                                      const newModules = {
                                        generalObservation: true, // Always keep generalObservation
                                        cervicalSpine: false,
                                        shoulders: false,
                                        elbows: false,
                                        wristsHands: false,
                                        lumbarSpine: false,
                                        hips: false,
                                        knees: false,
                                        feetAnkles: false,
                                        muscleAtrophy: false
                                      };
                                      // Set only the modules from this template
                                      template.modules.forEach(module => {
                                        newModules[module] = true;
                                      });
                                      setSelectedModules(newModules);
                                      // Reset and expand only the selected modules
                                      const newExpanded = {
                                        generalObservation: true,
                                        cervicalSpine: false,
                                        shoulders: false,
                                        elbows: false,
                                        wristsHands: false,
                                        lumbarSpine: false,
                                        hips: false,
                                        knees: false,
                                        feetAnkles: false,
                                        muscleAtrophy: false
                                      };
                                      template.modules.forEach(module => {
                                        newExpanded[module] = true;
                                      });
                                      setExpandedModules(newExpanded);
                                    }
                                  }}
                                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                    selectedQuickTemplate === template.name
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                  }`}
                                >
                                  {template.name}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Module Checkboxes Grid */}
                          <div className="grid grid-cols-3 gap-4">
                            {/* Column 1 */}
                            <div className="space-y-3">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selectedModules.generalObservation}
                                  onChange={(e) => {
                                    setSelectedModules(prev => ({ ...prev, generalObservation: e.target.checked }));
                                    if (e.target.checked) {
                                      setExpandedModules(prev => ({ ...prev, generalObservation: true }));
                                    }
                                  }}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">General Observation</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selectedModules.elbows}
                                  onChange={(e) => setSelectedModules(prev => ({ ...prev, elbows: e.target.checked }))}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">Elbows</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selectedModules.hips}
                                  onChange={(e) => setSelectedModules(prev => ({ ...prev, hips: e.target.checked }))}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">Hips</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selectedModules.muscleAtrophy}
                                  onChange={(e) => setSelectedModules(prev => ({ ...prev, muscleAtrophy: e.target.checked }))}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">Muscle Atrophy</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selectedModules.neurovascularAssessment}
                                  onChange={(e) => setSelectedModules(prev => ({ ...prev, neurovascularAssessment: e.target.checked }))}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">Neurovascular Assessment</span>
                              </label>
                            </div>

                            {/* Column 2 */}
                            <div className="space-y-3">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selectedModules.cervicalSpine}
                                  onChange={(e) => setSelectedModules(prev => ({ ...prev, cervicalSpine: e.target.checked }))}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">Cervical Spine</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selectedModules.wristsHands}
                                  onChange={(e) => setSelectedModules(prev => ({ ...prev, wristsHands: e.target.checked }))}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">Wrists/Hands</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selectedModules.knees}
                                  onChange={(e) => setSelectedModules(prev => ({ ...prev, knees: e.target.checked }))}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">Knees</span>
                              </label>
                            </div>

                            {/* Column 3 */}
                            <div className="space-y-3">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selectedModules.shoulders}
                                  onChange={(e) => setSelectedModules(prev => ({ ...prev, shoulders: e.target.checked }))}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">Shoulders</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selectedModules.lumbarSpine}
                                  onChange={(e) => setSelectedModules(prev => ({ ...prev, lumbarSpine: e.target.checked }))}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">Lumbar Spine</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selectedModules.feetAnkles}
                                  onChange={(e) => setSelectedModules(prev => ({ ...prev, feetAnkles: e.target.checked }))}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">Feet/Ankles</span>
                              </label>
                            </div>
                          </div>
                        </div>

                        {/* General Observation Card - Only show when checkbox is checked */}
                        {selectedModules.generalObservation && (
                          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                            <button
                              onClick={() => setExpandedModules(prev => ({ ...prev, generalObservation: !prev.generalObservation }))}
                              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                            >
                              <h3 className="text-lg font-semibold text-gray-800">General Observation</h3>
                              {expandedModules.generalObservation ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </button>
                            {expandedModules.generalObservation && (
                              <div className="p-6">
                            
                            {/* Input Fields */}
                            <div className="grid grid-cols-3 gap-4 mb-4">
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <label className="block text-sm font-medium text-gray-700">
                                    Weight (kg):
                                  </label>
                                  {showFieldMapping && (
                                    <span className="text-[11px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                      PDF: {fieldMapping['weight'] || 'weight'}
                                    </span>
                                  )}
                                </div>
                                <input
                                  type="number"
                                  value={formData.weight || ''}
                                  onChange={(e) => handleInputChange('weight', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                  placeholder=""
                                />
                              </div>
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <label className="block text-sm font-medium text-gray-700">
                                    Height (m):
                                  </label>
                                  {showFieldMapping && (
                                    <span className="text-[11px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                      PDF: {fieldMapping['height'] || 'height'}
                                    </span>
                                  )}
                                </div>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={formData.height || ''}
                                  onChange={(e) => handleInputChange('height', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                  placeholder=""
                                />
                              </div>
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <label className="block text-sm font-medium text-gray-700">
                                    Dominance:
                                  </label>
                                  {showFieldMapping && (
                                    <span className="text-[11px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                      PDF: {fieldMapping['physicalDominance'] || 'physicalDominance'}
                                    </span>
                                  )}
                                </div>
                                <input
                                  type="text"
                                  value={formData.physicalDominance || ''}
                                  onChange={(e) => handleInputChange('physicalDominance', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                  placeholder=""
                                />
                              </div>
                            </div>

                            {/* Text Area */}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="block text-sm font-medium text-gray-700">
                                  General observation and attitude:
                                </label>
                                {showFieldMapping && (
                                  <span className="text-[11px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                    PDF: {fieldMapping['physicalExam'] || 'physicalExam'}
                                  </span>
                                )}
                              </div>
                              <textarea
                                value={formData.physicalExam || ''}
                                onChange={(e) => handleInputChange('physicalExam', e.target.value)}
                                rows={6}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-y"
                                placeholder="Presentation, ability to rise, antalgic positioning, gait analysis..."
                              />
                            </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Module Tables - Display when checkbox is checked */}
                        {/* Cervical Spine */}
                        {selectedModules.cervicalSpine && (
                          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                            <button
                              onClick={() => setExpandedModules(prev => ({ ...prev, cervicalSpine: !prev.cervicalSpine }))}
                              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <h3 className="text-lg font-semibold text-gray-800">Cervical Spine</h3>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    fillModuleNormal('cervicalSpine');
                                  }}
                                  className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 text-xs"
                                  title="Fill all fields with Normal values"
                                >
                                  Fill All Normal
                                </button>
                              </div>
                              {expandedModules.cervicalSpine ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </button>
                            {expandedModules.cervicalSpine && (
                              <div className="p-6">
                            
                            {/* Palpation and Inspection */}
                            <div className="grid grid-cols-2 gap-4 mb-6">
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <label className="text-sm font-medium text-gray-700">Palpation:</label>
                                  <div className="flex items-center gap-2">
                                    {showFieldMapping && (
                                      <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                        PDF: cervicalSpine.palpation
                                      </span>
                                    )}
                                    <button
                                      onClick={() => updateModuleData('cervicalSpine', 'palpation', 'Normal')}
                                      className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                                    >
                                      Normal
                                    </button>
                                  </div>
                                </div>
                                <textarea
                                  value={getModuleData('cervicalSpine', 'palpation')}
                                  onChange={(e) => updateModuleData('cervicalSpine', 'palpation', e.target.value)}
                                  rows={4}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                />
                              </div>
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <label className="text-sm font-medium text-gray-700">Inspection:</label>
                                  <div className="flex items-center gap-2">
                                    {showFieldMapping && (
                                      <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                        PDF: cervicalSpine.inspection
                                      </span>
                                    )}
                                    <button
                                      onClick={() => updateModuleData('cervicalSpine', 'inspection', 'Normal')}
                                      className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                                    >
                                      Normal
                                    </button>
                                  </div>
                                </div>
                                <textarea
                                  value={getModuleData('cervicalSpine', 'inspection')}
                                  onChange={(e) => updateModuleData('cervicalSpine', 'inspection', e.target.value)}
                                  rows={4}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                />
                              </div>
                            </div>

                            {/* Range of Motion */}
                            <div className="mb-6">
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">Range of Motion:</h4>
                              <table className="w-full border border-gray-300 rounded-lg overflow-hidden">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Movement</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Patient</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Normal</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {[
                                    { key: 'flexion', label: 'Flexion', normal: '40°' },
                                    { key: 'extension', label: 'Extension', normal: '30°' },
                                    { key: 'lateralFlexionL', label: 'Lateral Flexion L', normal: '40°' },
                                    { key: 'lateralFlexionR', label: 'Lateral Flexion R', normal: '40°' },
                                    { key: 'rotationL', label: 'Rotation L', normal: '60°' },
                                    { key: 'rotationR', label: 'Rotation R', normal: '60°' }
                                  ].map((movement) => (
                                    <tr key={movement.key} className="border-b border-gray-200">
                                      <td className="px-3 py-2 text-sm text-gray-700">{movement.label}</td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="cervicalSpine"
                                          fieldPath={`rangeOfMotion.${movement.key}`}
                                          value={getModuleData('cervicalSpine', `rangeOfMotion.${movement.key}`)}
                                          onChange={(e) => updateModuleData('cervicalSpine', `rangeOfMotion.${movement.key}`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${movement.label}`}
                                        />
                                      </td>
                                      <td className="px-3 py-2 text-sm text-gray-500">{movement.normal}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Radicular Maneuvers */}
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">Radicular Maneuvers:</h4>
                              <table className="w-full border border-gray-300 rounded-lg overflow-hidden">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Test</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Right</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Left</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {[
                                    { key: 'lhermitteSign', label: 'Lhermitte Sign' },
                                    { key: 'spurlingManeuver', label: 'Spurling Maneuver' },
                                    { key: 'tractionManeuver', label: 'Traction Maneuver' }
                                  ].map((test) => (
                                    <tr key={test.key} className="border-b border-gray-200">
                                      <td className="px-3 py-2 text-sm text-gray-700">{test.label}</td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="cervicalSpine"
                                          fieldPath={`radicularManeuvers.${test.key}.right`}
                                          value={getModuleData('cervicalSpine', `radicularManeuvers.${test.key}.right`)}
                                          onChange={(e) => updateModuleData('cervicalSpine', `radicularManeuvers.${test.key}.right`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${test.label} R`}
                                        />
                                      </td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="cervicalSpine"
                                          fieldPath={`radicularManeuvers.${test.key}.left`}
                                          value={getModuleData('cervicalSpine', `radicularManeuvers.${test.key}.left`)}
                                          onChange={(e) => updateModuleData('cervicalSpine', `radicularManeuvers.${test.key}.left`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${test.label} L`}
                                        />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Shoulders */}
                        {selectedModules.shoulders && (
                          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Shoulders</h3>
                            
                            {/* Palpation and Inspection */}
                            <div className="grid grid-cols-2 gap-4 mb-6">
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <label className="text-sm font-medium text-gray-700">Palpation:</label>
                                  <div className="flex items-center gap-2">
                                    {showFieldMapping && (
                                      <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                        PDF: shoulders.palpation
                                      </span>
                                    )}
                                    <button
                                      onClick={() => updateModuleData('shoulders', 'palpation', 'Normal')}
                                      className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                                    >
                                      Normal
                                    </button>
                                  </div>
                                </div>
                                <textarea
                                  value={getModuleData('shoulders', 'palpation')}
                                  onChange={(e) => updateModuleData('shoulders', 'palpation', e.target.value)}
                                  rows={4}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                />
                              </div>
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <label className="text-sm font-medium text-gray-700">Inspection:</label>
                                  <div className="flex items-center gap-2">
                                    {showFieldMapping && (
                                      <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                        PDF: shoulders.inspection
                                      </span>
                                    )}
                                    <button
                                      onClick={() => updateModuleData('shoulders', 'inspection', 'Normal')}
                                      className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                                    >
                                      Normal
                                    </button>
                                  </div>
                                </div>
                                <textarea
                                  value={getModuleData('shoulders', 'inspection')}
                                  onChange={(e) => updateModuleData('shoulders', 'inspection', e.target.value)}
                                  rows={4}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                />
                              </div>
                            </div>

                            {/* Range of Motion */}
                            <div className="mb-6">
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">Range of Motion:</h4>
                              <table className="w-full border border-gray-300 rounded-lg overflow-hidden">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Movement</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Right Active</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Right Passive</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Left Active</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Left Passive</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Normal</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {[
                                    { key: 'flexion', label: 'Flexion', normal: '180°' },
                                    { key: 'abduction', label: 'Abduction', normal: '180°' },
                                    { key: 'internalRotation', label: 'Internal Rotation', normal: '70°' },
                                    { key: 'externalRotation', label: 'External Rotation', normal: '90°' },
                                    { key: 'extension', label: 'Extension', normal: '60°' },
                                    { key: 'adduction', label: 'Adduction', normal: '50°' }
                                  ].map((movement) => (
                                    <tr key={movement.key} className="border-b border-gray-200">
                                      <td className="px-3 py-2 text-sm text-gray-700">{movement.label}</td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="shoulders"
                                          fieldPath={`rangeOfMotion.${movement.key}.rightActive`}
                                          value={getModuleData('shoulders', `rangeOfMotion.${movement.key}.rightActive`)}
                                          onChange={(e) => updateModuleData('shoulders', `rangeOfMotion.${movement.key}.rightActive`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${movement.label} R-A`}
                                        />
                                      </td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="shoulders"
                                          fieldPath={`rangeOfMotion.${movement.key}.rightPassive`}
                                          value={getModuleData('shoulders', `rangeOfMotion.${movement.key}.rightPassive`)}
                                          onChange={(e) => updateModuleData('shoulders', `rangeOfMotion.${movement.key}.rightPassive`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${movement.label} R-P`}
                                        />
                                      </td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="shoulders"
                                          fieldPath={`rangeOfMotion.${movement.key}.leftActive`}
                                          value={getModuleData('shoulders', `rangeOfMotion.${movement.key}.leftActive`)}
                                          onChange={(e) => updateModuleData('shoulders', `rangeOfMotion.${movement.key}.leftActive`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${movement.label} L-A`}
                                        />
                                      </td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="shoulders"
                                          fieldPath={`rangeOfMotion.${movement.key}.leftPassive`}
                                          value={getModuleData('shoulders', `rangeOfMotion.${movement.key}.leftPassive`)}
                                          onChange={(e) => updateModuleData('shoulders', `rangeOfMotion.${movement.key}.leftPassive`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${movement.label} L-P`}
                                        />
                                      </td>
                                      <td className="px-3 py-2 text-sm text-gray-500">{movement.normal}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Rotator Cuff Tests */}
                            <div className="mb-6">
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">Rotator Cuff Tests:</h4>
                              <table className="w-full border border-gray-300 rounded-lg overflow-hidden">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Test</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Right</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Left</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {[
                                    { key: 'neer', label: 'Neer' },
                                    { key: 'hawkins', label: 'Hawkins' },
                                    { key: 'jobe', label: 'Jobe' },
                                    { key: 'bearHugger', label: 'Bear Hugger' },
                                    { key: 'bellyPress', label: 'Belly Press' },
                                    { key: 'liftOff', label: 'Lift-off' },
                                    { key: 'hornblower', label: 'Hornblower' }
                                  ].map((test) => (
                                    <tr key={test.key} className="border-b border-gray-200">
                                      <td className="px-3 py-2 text-sm text-gray-700">{test.label}</td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="shoulders"
                                          fieldPath={`rotatorCuffTests.${test.key}.right`}
                                          value={getModuleData('shoulders', `rotatorCuffTests.${test.key}.right`)}
                                          onChange={(e) => updateModuleData('shoulders', `rotatorCuffTests.${test.key}.right`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${test.label} R`}
                                        />
                                      </td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="shoulders"
                                          fieldPath={`rotatorCuffTests.${test.key}.left`}
                                          value={getModuleData('shoulders', `rotatorCuffTests.${test.key}.left`)}
                                          onChange={(e) => updateModuleData('shoulders', `rotatorCuffTests.${test.key}.left`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${test.label} L`}
                                        />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Biceps Tests */}
                            <div className="mb-6">
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">Biceps Tests:</h4>
                              <table className="w-full border border-gray-300 rounded-lg overflow-hidden">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Test</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Right</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Left</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {[
                                    { key: 'speed', label: 'Speed' },
                                    { key: 'yeagerson', label: 'Yeagerson' },
                                    { key: 'bicipitalGroovePalpation', label: 'Bicipital Groove Palpation' }
                                  ].map((test) => (
                                    <tr key={test.key} className="border-b border-gray-200">
                                      <td className="px-3 py-2 text-sm text-gray-700">{test.label}</td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="shoulders"
                                          fieldPath={`bicepsTests.${test.key}.right`}
                                          value={getModuleData('shoulders', `bicepsTests.${test.key}.right`)}
                                          onChange={(e) => updateModuleData('shoulders', `bicepsTests.${test.key}.right`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${test.label} R`}
                                        />
                                      </td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="shoulders"
                                          fieldPath={`bicepsTests.${test.key}.left`}
                                          value={getModuleData('shoulders', `bicepsTests.${test.key}.left`)}
                                          onChange={(e) => updateModuleData('shoulders', `bicepsTests.${test.key}.left`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${test.label} L`}
                                        />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Instability Tests */}
                            <div className="mb-6">
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">Instability Tests:</h4>
                              <table className="w-full border border-gray-300 rounded-lg overflow-hidden">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Test</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Right</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Left</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {[
                                    { key: 'sulcus', label: 'Sulcus' },
                                    { key: 'apprehension', label: 'Apprehension' },
                                    { key: 'relocation', label: 'Relocation' },
                                    { key: 'jerkTest', label: 'Jerk Test' }
                                  ].map((test) => (
                                    <tr key={test.key} className="border-b border-gray-200">
                                      <td className="px-3 py-2 text-sm text-gray-700">{test.label}</td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="shoulders"
                                          fieldPath={`instabilityTests.${test.key}.right`}
                                          value={getModuleData('shoulders', `instabilityTests.${test.key}.right`)}
                                          onChange={(e) => updateModuleData('shoulders', `instabilityTests.${test.key}.right`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${test.label} R`}
                                        />
                                      </td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="shoulders"
                                          fieldPath={`instabilityTests.${test.key}.left`}
                                          value={getModuleData('shoulders', `instabilityTests.${test.key}.left`)}
                                          onChange={(e) => updateModuleData('shoulders', `instabilityTests.${test.key}.left`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${test.label} L`}
                                        />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Labrum Tests */}
                            <div className="mb-6">
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">Labrum Tests:</h4>
                              <table className="w-full border border-gray-300 rounded-lg overflow-hidden">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Test</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Right</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Left</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {[
                                    { key: 'oBrien', label: 'O\'Brien' },
                                    { key: 'crankTest', label: 'Crank Test' }
                                  ].map((test) => (
                                    <tr key={test.key} className="border-b border-gray-200">
                                      <td className="px-3 py-2 text-sm text-gray-700">{test.label}</td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="shoulders"
                                          fieldPath={`labrumTests.${test.key}.right`}
                                          value={getModuleData('shoulders', `labrumTests.${test.key}.right`)}
                                          onChange={(e) => updateModuleData('shoulders', `labrumTests.${test.key}.right`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${test.label} R`}
                                        />
                                      </td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="shoulders"
                                          fieldPath={`labrumTests.${test.key}.left`}
                                          value={getModuleData('shoulders', `labrumTests.${test.key}.left`)}
                                          onChange={(e) => updateModuleData('shoulders', `labrumTests.${test.key}.left`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${test.label} L`}
                                        />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* AC Joint Tests */}
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">AC Joint Tests:</h4>
                              <table className="w-full border border-gray-300 rounded-lg overflow-hidden">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Test</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Right</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Left</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {[
                                    { key: 'acPalpation', label: 'AC Palpation' },
                                    { key: 'crossArmTest', label: 'Cross-arm Test' }
                                  ].map((test) => (
                                    <tr key={test.key} className="border-b border-gray-200">
                                      <td className="px-3 py-2 text-sm text-gray-700">{test.label}</td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="shoulders"
                                          fieldPath={`acJointTests.${test.key}.right`}
                                          value={getModuleData('shoulders', `acJointTests.${test.key}.right`)}
                                          onChange={(e) => updateModuleData('shoulders', `acJointTests.${test.key}.right`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${test.label} R`}
                                        />
                                      </td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="shoulders"
                                          fieldPath={`acJointTests.${test.key}.left`}
                                          value={getModuleData('shoulders', `acJointTests.${test.key}.left`)}
                                          onChange={(e) => updateModuleData('shoulders', `acJointTests.${test.key}.left`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${test.label} L`}
                                        />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Elbows */}
                        {selectedModules.elbows && (
                          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Elbows</h3>
                            
                            {/* Palpation and Inspection */}
                            <div className="grid grid-cols-2 gap-4 mb-6">
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <label className="text-sm font-medium text-gray-700">Palpation:</label>
                                  <div className="flex items-center gap-2">
                                    {showFieldMapping && (
                                      <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                        PDF: elbows.palpation
                                      </span>
                                    )}
                                    <button
                                      onClick={() => updateModuleData('elbows', 'palpation', 'Normal')}
                                      className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                                    >
                                      Normal
                                    </button>
                                  </div>
                                </div>
                                <textarea
                                  value={getModuleData('elbows', 'palpation')}
                                  onChange={(e) => updateModuleData('elbows', 'palpation', e.target.value)}
                                  rows={4}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                />
                              </div>
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <label className="text-sm font-medium text-gray-700">Inspection:</label>
                                  <div className="flex items-center gap-2">
                                    {showFieldMapping && (
                                      <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                        PDF: elbows.inspection
                                      </span>
                                    )}
                                    <button
                                      onClick={() => updateModuleData('elbows', 'inspection', 'Normal')}
                                      className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                                    >
                                      Normal
                                    </button>
                                  </div>
                                </div>
                                <textarea
                                  value={getModuleData('elbows', 'inspection')}
                                  onChange={(e) => updateModuleData('elbows', 'inspection', e.target.value)}
                                  rows={4}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                />
                              </div>
                            </div>

                            {/* Range of Motion */}
                            <div className="mb-6">
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">Range of Motion:</h4>
                              <table className="w-full border border-gray-300 rounded-lg overflow-hidden">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Movement</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Right Active</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Right Passive</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Left Active</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Left Passive</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Normal</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {[
                                    { key: 'flexion', label: 'Flexion', normal: '150°' },
                                    { key: 'extension', label: 'Extension', normal: '0°' },
                                    { key: 'pronation', label: 'Pronation', normal: '80°' },
                                    { key: 'supination', label: 'Supination', normal: '80°' }
                                  ].map((movement) => (
                                    <tr key={movement.key} className="border-b border-gray-200">
                                      <td className="px-3 py-2 text-sm text-gray-700">{movement.label}</td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="elbows"
                                          fieldPath={`rangeOfMotion.${movement.key}.rightActive`}
                                          value={getModuleData('elbows', `rangeOfMotion.${movement.key}.rightActive`)}
                                          onChange={(e) => updateModuleData('elbows', `rangeOfMotion.${movement.key}.rightActive`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${movement.label} R-A`}
                                        />
                                      </td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="elbows"
                                          fieldPath={`rangeOfMotion.${movement.key}.rightPassive`}
                                          value={getModuleData('elbows', `rangeOfMotion.${movement.key}.rightPassive`)}
                                          onChange={(e) => updateModuleData('elbows', `rangeOfMotion.${movement.key}.rightPassive`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${movement.label} R-P`}
                                        />
                                      </td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="elbows"
                                          fieldPath={`rangeOfMotion.${movement.key}.leftActive`}
                                          value={getModuleData('elbows', `rangeOfMotion.${movement.key}.leftActive`)}
                                          onChange={(e) => updateModuleData('elbows', `rangeOfMotion.${movement.key}.leftActive`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${movement.label} L-A`}
                                        />
                                      </td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="elbows"
                                          fieldPath={`rangeOfMotion.${movement.key}.leftPassive`}
                                          value={getModuleData('elbows', `rangeOfMotion.${movement.key}.leftPassive`)}
                                          onChange={(e) => updateModuleData('elbows', `rangeOfMotion.${movement.key}.leftPassive`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${movement.label} L-P`}
                                        />
                                      </td>
                                      <td className="px-3 py-2 text-sm text-gray-500">{movement.normal}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Ligamentous Tests */}
                            <div className="mb-6">
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">Ligamentous Tests:</h4>
                              <table className="w-full border border-gray-300 rounded-lg overflow-hidden">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Test</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Right</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Left</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {[
                                    { key: 'varusStability', label: 'Varus Stability' },
                                    { key: 'valgusStability', label: 'Valgus Stability' }
                                  ].map((test) => (
                                    <tr key={test.key} className="border-b border-gray-200">
                                      <td className="px-3 py-2 text-sm text-gray-700">{test.label}</td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="elbows"
                                          fieldPath={`ligamentousTests.${test.key}.right`}
                                          value={getModuleData('elbows', `ligamentousTests.${test.key}.right`)}
                                          onChange={(e) => updateModuleData('elbows', `ligamentousTests.${test.key}.right`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${test.label} R`}
                                        />
                                      </td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="elbows"
                                          fieldPath={`ligamentousTests.${test.key}.left`}
                                          value={getModuleData('elbows', `ligamentousTests.${test.key}.left`)}
                                          onChange={(e) => updateModuleData('elbows', `ligamentousTests.${test.key}.left`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${test.label} L`}
                                        />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Instability Tests */}
                            <div className="mb-6">
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">Instability Tests:</h4>
                              <table className="w-full border border-gray-300 rounded-lg overflow-hidden">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Test</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Right</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Left</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {[
                                    { key: 'milking', label: 'Milking' },
                                    { key: 'lateralPivotShift', label: 'Lateral Pivot-shift' },
                                    { key: 'pushUpTest', label: 'Push-up Test' }
                                  ].map((test) => (
                                    <tr key={test.key} className="border-b border-gray-200">
                                      <td className="px-3 py-2 text-sm text-gray-700">{test.label}</td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="elbows"
                                          fieldPath={`instabilityTests.${test.key}.right`}
                                          value={getModuleData('elbows', `instabilityTests.${test.key}.right`)}
                                          onChange={(e) => updateModuleData('elbows', `instabilityTests.${test.key}.right`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${test.label} R`}
                                        />
                                      </td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="elbows"
                                          fieldPath={`instabilityTests.${test.key}.left`}
                                          value={getModuleData('elbows', `instabilityTests.${test.key}.left`)}
                                          onChange={(e) => updateModuleData('elbows', `instabilityTests.${test.key}.left`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${test.label} L`}
                                        />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Tendinitis Tests */}
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">Tendinitis Tests:</h4>
                              <table className="w-full border border-gray-300 rounded-lg overflow-hidden">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Test</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Right</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Left</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {[
                                    { key: 'extensionResistance', label: 'Extension Resistance' },
                                    { key: 'flexionResistance', label: 'Flexion Resistance' },
                                    { key: 'ulnarTinel', label: 'Ulnar Tinel' },
                                    { key: 'radialTinel', label: 'Radial Tinel' }
                                  ].map((test) => (
                                    <tr key={test.key} className="border-b border-gray-200">
                                      <td className="px-3 py-2 text-sm text-gray-700">{test.label}</td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="elbows"
                                          fieldPath={`tendinitisTests.${test.key}.right`}
                                          value={getModuleData('elbows', `tendinitisTests.${test.key}.right`)}
                                          onChange={(e) => updateModuleData('elbows', `tendinitisTests.${test.key}.right`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${test.label} R`}
                                        />
                                      </td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="elbows"
                                          fieldPath={`tendinitisTests.${test.key}.left`}
                                          value={getModuleData('elbows', `tendinitisTests.${test.key}.left`)}
                                          onChange={(e) => updateModuleData('elbows', `tendinitisTests.${test.key}.left`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${test.label} L`}
                                        />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Lumbar Spine */}
                        {selectedModules.lumbarSpine && (
                          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Lumbar Spine</h3>
                            
                            {/* Palpation and Inspection */}
                            <div className="grid grid-cols-2 gap-4 mb-6">
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <label className="text-sm font-medium text-gray-700">Palpation:</label>
                                  <div className="flex items-center gap-2">
                                    {showFieldMapping && (
                                      <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                        PDF: lumbarSpine.palpation
                                      </span>
                                    )}
                                    <button
                                      onClick={() => updateModuleData('lumbarSpine', 'palpation', 'Normal')}
                                      className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                                    >
                                      Normal
                                    </button>
                                  </div>
                                </div>
                                <textarea
                                  value={getModuleData('lumbarSpine', 'palpation')}
                                  onChange={(e) => updateModuleData('lumbarSpine', 'palpation', e.target.value)}
                                  rows={4}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                />
                              </div>
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <label className="text-sm font-medium text-gray-700">Inspection:</label>
                                  <div className="flex items-center gap-2">
                                    {showFieldMapping && (
                                      <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                        PDF: lumbarSpine.inspection
                                      </span>
                                    )}
                                    <button
                                      onClick={() => updateModuleData('lumbarSpine', 'inspection', 'Normal')}
                                      className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                                    >
                                      Normal
                                    </button>
                                  </div>
                                </div>
                                <textarea
                                  value={getModuleData('lumbarSpine', 'inspection')}
                                  onChange={(e) => updateModuleData('lumbarSpine', 'inspection', e.target.value)}
                                  rows={4}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                />
                              </div>
                            </div>

                            {/* Range of Motion */}
                            <div className="mb-6">
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">Range of Motion:</h4>
                              <table className="w-full border border-gray-300 rounded-lg overflow-hidden">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Movement</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Patient</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Normal</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {[
                                    { key: 'flexion', label: 'Flexion', normal: '90°' },
                                    { key: 'extension', label: 'Extension', normal: '30°' },
                                    { key: 'lateralFlexionL', label: 'Lateral Flexion L', normal: '30°' },
                                    { key: 'lateralFlexionR', label: 'Lateral Flexion R', normal: '30°' },
                                    { key: 'rotationL', label: 'Rotation L', normal: '30°' },
                                    { key: 'rotationR', label: 'Rotation R', normal: '30°' }
                                  ].map((movement) => (
                                    <tr key={movement.key} className="border-b border-gray-200">
                                      <td className="px-3 py-2 text-sm text-gray-700">{movement.label}</td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="lumbarSpine"
                                          fieldPath={`rangeOfMotion.${movement.key}`}
                                          value={getModuleData('lumbarSpine', `rangeOfMotion.${movement.key}`)}
                                          onChange={(e) => updateModuleData('lumbarSpine', `rangeOfMotion.${movement.key}`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${movement.label}`}
                                        />
                                      </td>
                                      <td className="px-3 py-2 text-sm text-gray-500">{movement.normal}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Radicular Maneuvers */}
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">Radicular Maneuvers:</h4>
                              <table className="w-full border border-gray-300 rounded-lg overflow-hidden">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Test</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Right</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Left</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {[
                                    { key: 'slr', label: 'S.L.R.' },
                                    { key: 'tripod', label: 'Tripod' },
                                    { key: 'lasegue', label: 'Lasègue' },
                                    { key: 'reverseLasegue', label: 'Reverse Lasègue (Ely)' }
                                  ].map((test) => (
                                    <tr key={test.key} className="border-b border-gray-200">
                                      <td className="px-3 py-2 text-sm text-gray-700">{test.label}</td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="lumbarSpine"
                                          fieldPath={`radicularManeuvers.${test.key}.right`}
                                          value={getModuleData('lumbarSpine', `radicularManeuvers.${test.key}.right`)}
                                          onChange={(e) => updateModuleData('lumbarSpine', `radicularManeuvers.${test.key}.right`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${test.label} R`}
                                        />
                                      </td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="lumbarSpine"
                                          fieldPath={`radicularManeuvers.${test.key}.left`}
                                          value={getModuleData('lumbarSpine', `radicularManeuvers.${test.key}.left`)}
                                          onChange={(e) => updateModuleData('lumbarSpine', `radicularManeuvers.${test.key}.left`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${test.label} L`}
                                        />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Muscle Atrophy */}
                        {selectedModules.muscleAtrophy && (
                          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Muscle Atrophy</h3>
                            <h4 className="text-sm font-semibold text-gray-700 mb-3">Circumferential Measurements:</h4>
                            <table className="w-full border border-gray-300 rounded-lg overflow-hidden">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Location</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Right (cm)</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Left (cm)</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Difference</th>
                                </tr>
                              </thead>
                              <tbody>
                                {[
                                  { key: 'thighCircumference', label: 'Thigh Circumference (15cm above patella)' },
                                  { key: 'calfCircumference', label: 'Calf Circumference (maximum point)' },
                                  { key: 'armCircumference', label: 'Arm Circumference (maximum point)' },
                                  { key: 'forearmCircumference', label: 'Forearm Circumference (maximum point)' }
                                ].map((measurement) => {
                                  const right = parseFloat(getModuleData('muscleAtrophy', `${measurement.key}.right`)) || 0;
                                  const left = parseFloat(getModuleData('muscleAtrophy', `${measurement.key}.left`)) || 0;
                                  const difference = Math.abs(right - left).toFixed(2);
                                  return (
                                    <tr key={measurement.key} className="border-b border-gray-200">
                                      <td className="px-3 py-2 text-sm text-gray-700">{measurement.label}</td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="muscleAtrophy"
                                          fieldPath={`${measurement.key}.right`}
                                          value={getModuleData('muscleAtrophy', `${measurement.key}.right`)}
                                          onChange={(e) => updateModuleData('muscleAtrophy', `${measurement.key}.right`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${measurement.label} R (cm)`}
                                          type="number"
                                        />
                                      </td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="muscleAtrophy"
                                          fieldPath={`${measurement.key}.left`}
                                          value={getModuleData('muscleAtrophy', `${measurement.key}.left`)}
                                          onChange={(e) => updateModuleData('muscleAtrophy', `${measurement.key}.left`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${measurement.label} L (cm)`}
                                          type="number"
                                        />
                                      </td>
                                      <td className="px-3 py-2 text-sm text-gray-500 bg-orange-50">
                                        <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded">Auto</span> {difference}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Neurovascular Assessment */}
                        {selectedModules.neurovascularAssessment && (
                          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                            <button
                              onClick={() => setExpandedModules(prev => ({ ...prev, neurovascularAssessment: !prev.neurovascularAssessment }))}
                              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <h3 className="text-lg font-semibold text-gray-800">Évaluation neurovasculaire</h3>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    fillModuleNormal('neurovascularAssessment');
                                  }}
                                  className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600 text-xs"
                                  title="Fill all fields with Normal values"
                                >
                                  Auto
                                </button>
                              </div>
                              {expandedModules.neurovascularAssessment ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </button>
                            {expandedModules.neurovascularAssessment && (
                              <div className="p-6">
                                {/* Forces (Échelle ASIA) */}
                                <div className="mb-6">
                                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Forces (Échelle ASIA):</h4>
                                  <table className="w-full border border-gray-300 rounded-lg overflow-hidden">
                                    <thead className="bg-gray-50">
                                      <tr>
                                        <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Racine/Fonction</th>
                                        <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Droit</th>
                                        <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Gauche</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {[
                                        { key: 'l2', label: 'L2 (Flexion hanche)' },
                                        { key: 'l3', label: 'L3 (Extension genou)' },
                                        { key: 'l4', label: 'L4 (Dorsiflexion cheville)' },
                                        { key: 'l5', label: 'L5 (Extension D1 pied)' },
                                        { key: 's1', label: 'S1 (Flexion plantaire cheville)' }
                                      ].map((root) => (
                                        <tr key={root.key} className="border-b border-gray-200">
                                          <td className="px-3 py-2 text-sm text-gray-700">{root.label}</td>
                                          <td className="px-3 py-2">
                                            <TableInputField
                                              moduleName="neurovascularAssessment"
                                              fieldPath={`forces.${root.key}.right`}
                                              value={getModuleData('neurovascularAssessment', `forces.${root.key}.right`)}
                                              onChange={(e) => updateModuleData('neurovascularAssessment', `forces.${root.key}.right`, e.target.value)}
                                              showFieldMapping={showFieldMapping}
                                              label={`${root.label} Droit /5`}
                                            />
                                          </td>
                                          <td className="px-3 py-2">
                                            <TableInputField
                                              moduleName="neurovascularAssessment"
                                              fieldPath={`forces.${root.key}.left`}
                                              value={getModuleData('neurovascularAssessment', `forces.${root.key}.left`)}
                                              onChange={(e) => updateModuleData('neurovascularAssessment', `forces.${root.key}.left`, e.target.value)}
                                              showFieldMapping={showFieldMapping}
                                              label={`${root.label} Gauche /5`}
                                            />
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>

                                {/* Sensibilités */}
                                <div className="mb-6">
                                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Sensibilités:</h4>
                                  <table className="w-full border border-gray-300 rounded-lg overflow-hidden">
                                    <thead className="bg-gray-50">
                                      <tr>
                                        <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Racine</th>
                                        <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Droit</th>
                                        <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Gauche</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {[
                                        { key: 'l2', label: 'L2' },
                                        { key: 'l3', label: 'L3' },
                                        { key: 'l4', label: 'L4' },
                                        { key: 'l5', label: 'L5' },
                                        { key: 's1', label: 'S1' }
                                      ].map((root) => (
                                        <tr key={root.key} className="border-b border-gray-200">
                                          <td className="px-3 py-2 text-sm text-gray-700">{root.label}</td>
                                          <td className="px-3 py-2">
                                            <TableInputField
                                              moduleName="neurovascularAssessment"
                                              fieldPath={`sensibilites.${root.key}.right`}
                                              value={getModuleData('neurovascularAssessment', `sensibilites.${root.key}.right`)}
                                              onChange={(e) => updateModuleData('neurovascularAssessment', `sensibilites.${root.key}.right`, e.target.value)}
                                              showFieldMapping={showFieldMapping}
                                              label={`${root.label} Droit /2`}
                                            />
                                          </td>
                                          <td className="px-3 py-2">
                                            <TableInputField
                                              moduleName="neurovascularAssessment"
                                              fieldPath={`sensibilites.${root.key}.left`}
                                              value={getModuleData('neurovascularAssessment', `sensibilites.${root.key}.left`)}
                                              onChange={(e) => updateModuleData('neurovascularAssessment', `sensibilites.${root.key}.left`, e.target.value)}
                                              showFieldMapping={showFieldMapping}
                                              label={`${root.label} Gauche /2`}
                                            />
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>

                                {/* Réflexes */}
                                <div className="mb-6">
                                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Réflexes:</h4>
                                  <table className="w-full border border-gray-300 rounded-lg overflow-hidden">
                                    <thead className="bg-gray-50">
                                      <tr>
                                        <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Test</th>
                                        <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Droit</th>
                                        <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Gauche</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {[
                                        { key: 'rotulien', label: 'Rotulien' },
                                        { key: 'achilleen', label: 'Achilléen' },
                                        { key: 'babinski', label: 'Babinski' }
                                      ].map((test) => (
                                        <tr key={test.key} className="border-b border-gray-200">
                                          <td className="px-3 py-2 text-sm text-gray-700">{test.label}</td>
                                          <td className="px-3 py-2">
                                            <TableInputField
                                              moduleName="neurovascularAssessment"
                                              fieldPath={`reflexes.${test.key}.right`}
                                              value={getModuleData('neurovascularAssessment', `reflexes.${test.key}.right`)}
                                              onChange={(e) => updateModuleData('neurovascularAssessment', `reflexes.${test.key}.right`, e.target.value)}
                                              showFieldMapping={showFieldMapping}
                                              label={`${test.label} Droit`}
                                            />
                                          </td>
                                          <td className="px-3 py-2">
                                            <TableInputField
                                              moduleName="neurovascularAssessment"
                                              fieldPath={`reflexes.${test.key}.left`}
                                              value={getModuleData('neurovascularAssessment', `reflexes.${test.key}.left`)}
                                              onChange={(e) => updateModuleData('neurovascularAssessment', `reflexes.${test.key}.left`, e.target.value)}
                                              showFieldMapping={showFieldMapping}
                                              label={`${test.label} Gauche`}
                                            />
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>

                                {/* Pouls */}
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Pouls:</h4>
                                  <table className="w-full border border-gray-300 rounded-lg overflow-hidden">
                                    <thead className="bg-gray-50">
                                      <tr>
                                        <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Test</th>
                                        <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Droit</th>
                                        <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Gauche</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {[
                                        { key: 'tibialPosterieur', label: 'Tibial postérieur' },
                                        { key: 'pedieux', label: 'Pédieux' }
                                      ].map((test) => (
                                        <tr key={test.key} className="border-b border-gray-200">
                                          <td className="px-3 py-2 text-sm text-gray-700">{test.label}</td>
                                          <td className="px-3 py-2">
                                            <TableInputField
                                              moduleName="neurovascularAssessment"
                                              fieldPath={`pouls.${test.key}.right`}
                                              value={getModuleData('neurovascularAssessment', `pouls.${test.key}.right`)}
                                              onChange={(e) => updateModuleData('neurovascularAssessment', `pouls.${test.key}.right`, e.target.value)}
                                              showFieldMapping={showFieldMapping}
                                              label={`${test.label} Droit`}
                                            />
                                          </td>
                                          <td className="px-3 py-2">
                                            <TableInputField
                                              moduleName="neurovascularAssessment"
                                              fieldPath={`pouls.${test.key}.left`}
                                              value={getModuleData('neurovascularAssessment', `pouls.${test.key}.left`)}
                                              onChange={(e) => updateModuleData('neurovascularAssessment', `pouls.${test.key}.left`, e.target.value)}
                                              showFieldMapping={showFieldMapping}
                                              label={`${test.label} Gauche`}
                                            />
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Wrists/Hands */}
                        {selectedModules.wristsHands && (
                          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Wrists/Hands</h3>
                            
                            {/* Palpation and Inspection */}
                            <div className="grid grid-cols-2 gap-4 mb-6">
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <label className="text-sm font-medium text-gray-700">Palpation:</label>
                                  <div className="flex items-center gap-2">
                                    {showFieldMapping && (
                                      <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                        PDF: wristsHands.palpation
                                      </span>
                                    )}
                                    <button
                                      onClick={() => updateModuleData('wristsHands', 'palpation', 'Normal')}
                                      className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                                    >
                                      Normal
                                    </button>
                                  </div>
                                </div>
                                <textarea
                                  value={getModuleData('wristsHands', 'palpation')}
                                  onChange={(e) => updateModuleData('wristsHands', 'palpation', e.target.value)}
                                  rows={4}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                />
                              </div>
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <label className="text-sm font-medium text-gray-700">Inspection:</label>
                                  <div className="flex items-center gap-2">
                                    {showFieldMapping && (
                                      <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                        PDF: wristsHands.inspection
                                      </span>
                                    )}
                                    <button
                                      onClick={() => updateModuleData('wristsHands', 'inspection', 'Normal')}
                                      className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                                    >
                                      Normal
                                    </button>
                                  </div>
                                </div>
                                <textarea
                                  value={getModuleData('wristsHands', 'inspection')}
                                  onChange={(e) => updateModuleData('wristsHands', 'inspection', e.target.value)}
                                  rows={4}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                />
                              </div>
                            </div>

                            {/* Range of Motion */}
                            <div className="mb-6">
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">Range of Motion:</h4>
                              <table className="w-full border border-gray-300 rounded-lg overflow-hidden">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Movement</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Right Active</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Right Passive</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Left Active</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Left Passive</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Normal</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {[
                                    { key: 'flexion', label: 'Flexion', normal: '80°' },
                                    { key: 'extension', label: 'Extension', normal: '70°' },
                                    { key: 'ulnarDeviation', label: 'Ulnar Deviation', normal: '30°' },
                                    { key: 'radialDeviation', label: 'Radial Deviation', normal: '20°' }
                                  ].map((movement) => (
                                    <tr key={movement.key} className="border-b border-gray-200">
                                      <td className="px-3 py-2 text-sm text-gray-700">{movement.label}</td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="wristsHands"
                                          fieldPath={`rangeOfMotion.${movement.key}.rightActive`}
                                          value={getModuleData('wristsHands', `rangeOfMotion.${movement.key}.rightActive`)}
                                          onChange={(e) => updateModuleData('wristsHands', `rangeOfMotion.${movement.key}.rightActive`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${movement.label} R-A`}
                                        />
                                      </td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="wristsHands"
                                          fieldPath={`rangeOfMotion.${movement.key}.rightPassive`}
                                          value={getModuleData('wristsHands', `rangeOfMotion.${movement.key}.rightPassive`)}
                                          onChange={(e) => updateModuleData('wristsHands', `rangeOfMotion.${movement.key}.rightPassive`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${movement.label} R-P`}
                                        />
                                      </td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="wristsHands"
                                          fieldPath={`rangeOfMotion.${movement.key}.leftActive`}
                                          value={getModuleData('wristsHands', `rangeOfMotion.${movement.key}.leftActive`)}
                                          onChange={(e) => updateModuleData('wristsHands', `rangeOfMotion.${movement.key}.leftActive`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${movement.label} L-A`}
                                        />
                                      </td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="wristsHands"
                                          fieldPath={`rangeOfMotion.${movement.key}.leftPassive`}
                                          value={getModuleData('wristsHands', `rangeOfMotion.${movement.key}.leftPassive`)}
                                          onChange={(e) => updateModuleData('wristsHands', `rangeOfMotion.${movement.key}.leftPassive`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${movement.label} L-P`}
                                        />
                                      </td>
                                      <td className="px-3 py-2 text-sm text-gray-500">{movement.normal}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Finger Observation */}
                            <div className="mb-6">
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">Finger Observation:</h4>
                              <table className="w-full border border-gray-300 rounded-lg overflow-hidden">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Aspect</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Right Hand</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Left Hand</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {[
                                    { key: 'atrophy', label: 'Atrophy' },
                                    { key: 'amputation', label: 'Amputation' },
                                    { key: 'deformation', label: 'Deformation' },
                                    { key: 'sensation', label: 'Sensation' }
                                  ].map((aspect) => (
                                    <tr key={aspect.key} className="border-b border-gray-200">
                                      <td className="px-3 py-2 text-sm text-gray-700">{aspect.label}</td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="wristsHands"
                                          fieldPath={`fingerObservation.${aspect.key}.rightHand`}
                                          value={getModuleData('wristsHands', `fingerObservation.${aspect.key}.rightHand`)}
                                          onChange={(e) => updateModuleData('wristsHands', `fingerObservation.${aspect.key}.rightHand`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${aspect.label} R`}
                                        />
                                      </td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="wristsHands"
                                          fieldPath={`fingerObservation.${aspect.key}.leftHand`}
                                          value={getModuleData('wristsHands', `fingerObservation.${aspect.key}.leftHand`)}
                                          onChange={(e) => updateModuleData('wristsHands', `fingerObservation.${aspect.key}.leftHand`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${aspect.label} L`}
                                        />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Kapandji Opposition Score */}
                            <div className="mb-6">
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">Kapandji Opposition Score:</h4>
                              <table className="w-full border border-gray-300 rounded-lg overflow-hidden">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Test</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Right</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Left</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {[
                                    { key: 'thumbIndex', label: 'Thumb-Index' },
                                    { key: 'thumbMiddle', label: 'Thumb-Middle' },
                                    { key: 'thumbRing', label: 'Thumb-Ring' },
                                    { key: 'thumbLittle', label: 'Thumb-Little' }
                                  ].map((test) => (
                                    <tr key={test.key} className="border-b border-gray-200">
                                      <td className="px-3 py-2 text-sm text-gray-700">{test.label}</td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="wristsHands"
                                          fieldPath={`kapandjiOppositionScore.${test.key}.right`}
                                          value={getModuleData('wristsHands', `kapandjiOppositionScore.${test.key}.right`)}
                                          onChange={(e) => updateModuleData('wristsHands', `kapandjiOppositionScore.${test.key}.right`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${test.label} R`}
                                        />
                                      </td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="wristsHands"
                                          fieldPath={`kapandjiOppositionScore.${test.key}.left`}
                                          value={getModuleData('wristsHands', `kapandjiOppositionScore.${test.key}.left`)}
                                          onChange={(e) => updateModuleData('wristsHands', `kapandjiOppositionScore.${test.key}.left`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${test.label} L`}
                                        />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Grip Strength */}
                            <div className="mb-6">
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">Grip Strength:</h4>
                              <table className="w-full border border-gray-300 rounded-lg overflow-hidden">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Trial</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Right Hand (kg)</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Left Hand (kg)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {[
                                    { key: 'trial1', label: 'Trial 1' },
                                    { key: 'trial2', label: 'Trial 2' }
                                  ].map((trial) => (
                                    <tr key={trial.key} className="border-b border-gray-200">
                                      <td className="px-3 py-2 text-sm text-gray-700">{trial.label}</td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="wristsHands"
                                          fieldPath={`gripStrength.${trial.key}.rightHand`}
                                          value={getModuleData('wristsHands', `gripStrength.${trial.key}.rightHand`)}
                                          onChange={(e) => updateModuleData('wristsHands', `gripStrength.${trial.key}.rightHand`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${trial.label} R (kg)`}
                                        />
                                      </td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="wristsHands"
                                          fieldPath={`gripStrength.${trial.key}.leftHand`}
                                          value={getModuleData('wristsHands', `gripStrength.${trial.key}.leftHand`)}
                                          onChange={(e) => updateModuleData('wristsHands', `gripStrength.${trial.key}.leftHand`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${trial.label} L (kg)`}
                                        />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Specialized Tests */}
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">Specialized Tests:</h4>
                              <table className="w-full border border-gray-300 rounded-lg overflow-hidden">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Test</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Right</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Left</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {[
                                    { key: 'finkelstein', label: 'Finkelstein' },
                                    { key: 'tinel', label: 'Tinel' },
                                    { key: 'phalen', label: 'Phalen' },
                                    { key: 'durkan', label: 'Durkan' },
                                    { key: 'froment', label: 'Froment' },
                                    { key: 'wartenberg', label: 'Wartenberg' }
                                  ].map((test) => (
                                    <tr key={test.key} className="border-b border-gray-200">
                                      <td className="px-3 py-2 text-sm text-gray-700">{test.label}</td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="wristsHands"
                                          fieldPath={`specializedTests.${test.key}.right`}
                                          value={getModuleData('wristsHands', `specializedTests.${test.key}.right`)}
                                          onChange={(e) => updateModuleData('wristsHands', `specializedTests.${test.key}.right`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${test.label} R`}
                                        />
                                      </td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="wristsHands"
                                          fieldPath={`specializedTests.${test.key}.left`}
                                          value={getModuleData('wristsHands', `specializedTests.${test.key}.left`)}
                                          onChange={(e) => updateModuleData('wristsHands', `specializedTests.${test.key}.left`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${test.label} L`}
                                        />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Hips */}
                        {selectedModules.hips && (
                          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Hips</h3>
                            
                            {/* Palpation and Inspection */}
                            <div className="grid grid-cols-2 gap-4 mb-6">
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <label className="text-sm font-medium text-gray-700">Palpation:</label>
                                  <div className="flex items-center gap-2">
                                    {showFieldMapping && (
                                      <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                        PDF: hips.palpation
                                      </span>
                                    )}
                                    <button
                                      onClick={() => updateModuleData('hips', 'palpation', 'Normal')}
                                      className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                                    >
                                      Normal
                                    </button>
                                  </div>
                                </div>
                                <textarea
                                  value={getModuleData('hips', 'palpation')}
                                  onChange={(e) => updateModuleData('hips', 'palpation', e.target.value)}
                                  rows={4}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                />
                              </div>
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <label className="text-sm font-medium text-gray-700">Inspection:</label>
                                  <div className="flex items-center gap-2">
                                    {showFieldMapping && (
                                      <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                        PDF: hips.inspection
                                      </span>
                                    )}
                                    <button
                                      onClick={() => updateModuleData('hips', 'inspection', 'Normal')}
                                      className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                                    >
                                      Normal
                                    </button>
                                  </div>
                                </div>
                                <textarea
                                  value={getModuleData('hips', 'inspection')}
                                  onChange={(e) => updateModuleData('hips', 'inspection', e.target.value)}
                                  rows={4}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                />
                              </div>
                            </div>

                            {/* Range of Motion */}
                            <div className="mb-6">
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">Range of Motion:</h4>
                              <table className="w-full border border-gray-300 rounded-lg overflow-hidden">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Movement</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Right Active</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Right Passive</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Left Active</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Left Passive</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Normal</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {[
                                    { key: 'flexion', label: 'Flexion', normal: '120°' },
                                    { key: 'extension', label: 'Extension', normal: '30°' },
                                    { key: 'internalRotation', label: 'Internal Rotation', normal: '40°' },
                                    { key: 'externalRotation', label: 'External Rotation', normal: '50°' },
                                    { key: 'abduction', label: 'Abduction', normal: '40°' },
                                    { key: 'adduction', label: 'Adduction', normal: '20°' }
                                  ].map((movement) => (
                                    <tr key={movement.key} className="border-b border-gray-200">
                                      <td className="px-3 py-2 text-sm text-gray-700">{movement.label}</td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="hips"
                                          fieldPath={`rangeOfMotion.${movement.key}.rightActive`}
                                          value={getModuleData('hips', `rangeOfMotion.${movement.key}.rightActive`)}
                                          onChange={(e) => updateModuleData('hips', `rangeOfMotion.${movement.key}.rightActive`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${movement.label} R-A`}
                                        />
                                      </td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="hips"
                                          fieldPath={`rangeOfMotion.${movement.key}.rightPassive`}
                                          value={getModuleData('hips', `rangeOfMotion.${movement.key}.rightPassive`)}
                                          onChange={(e) => updateModuleData('hips', `rangeOfMotion.${movement.key}.rightPassive`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${movement.label} R-P`}
                                        />
                                      </td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="hips"
                                          fieldPath={`rangeOfMotion.${movement.key}.leftActive`}
                                          value={getModuleData('hips', `rangeOfMotion.${movement.key}.leftActive`)}
                                          onChange={(e) => updateModuleData('hips', `rangeOfMotion.${movement.key}.leftActive`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${movement.label} L-A`}
                                        />
                                      </td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="hips"
                                          fieldPath={`rangeOfMotion.${movement.key}.leftPassive`}
                                          value={getModuleData('hips', `rangeOfMotion.${movement.key}.leftPassive`)}
                                          onChange={(e) => updateModuleData('hips', `rangeOfMotion.${movement.key}.leftPassive`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${movement.label} L-P`}
                                        />
                                      </td>
                                      <td className="px-3 py-2 text-sm text-gray-500">{movement.normal}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Specialized Tests */}
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">Specialized Tests:</h4>
                              <table className="w-full border border-gray-300 rounded-lg overflow-hidden">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Test</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Right</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Left</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {[
                                    { key: 'trendelenburg', label: 'Trendelenburg' },
                                    { key: 'fadir', label: 'FADIR' },
                                    { key: 'faber', label: 'FABER' },
                                    { key: 'thomas', label: 'Thomas' },
                                    { key: 'ober', label: 'Ober' }
                                  ].map((test) => (
                                    <tr key={test.key} className="border-b border-gray-200">
                                      <td className="px-3 py-2 text-sm text-gray-700">{test.label}</td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="hips"
                                          fieldPath={`specializedTests.${test.key}.right`}
                                          value={getModuleData('hips', `specializedTests.${test.key}.right`)}
                                          onChange={(e) => updateModuleData('hips', `specializedTests.${test.key}.right`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${test.label} R`}
                                        />
                                      </td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="hips"
                                          fieldPath={`specializedTests.${test.key}.left`}
                                          value={getModuleData('hips', `specializedTests.${test.key}.left`)}
                                          onChange={(e) => updateModuleData('hips', `specializedTests.${test.key}.left`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${test.label} L`}
                                        />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Knees */}
                        {selectedModules.knees && (
                          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Knees</h3>
                            
                            {/* Palpation and Inspection */}
                            <div className="grid grid-cols-2 gap-4 mb-6">
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <label className="text-sm font-medium text-gray-700">Palpation:</label>
                                  <div className="flex items-center gap-2">
                                    {showFieldMapping && (
                                      <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                        PDF: knees.palpation
                                      </span>
                                    )}
                                    <button
                                      onClick={() => updateModuleData('knees', 'palpation', 'Normal')}
                                      className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                                    >
                                      Normal
                                    </button>
                                  </div>
                                </div>
                                <textarea
                                  value={getModuleData('knees', 'palpation')}
                                  onChange={(e) => updateModuleData('knees', 'palpation', e.target.value)}
                                  rows={4}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                />
                              </div>
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <label className="text-sm font-medium text-gray-700">Inspection:</label>
                                  <div className="flex items-center gap-2">
                                    {showFieldMapping && (
                                      <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                        PDF: knees.inspection
                                      </span>
                                    )}
                                    <button
                                      onClick={() => updateModuleData('knees', 'inspection', 'Normal')}
                                      className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                                    >
                                      Normal
                                    </button>
                                  </div>
                                </div>
                                <textarea
                                  value={getModuleData('knees', 'inspection')}
                                  onChange={(e) => updateModuleData('knees', 'inspection', e.target.value)}
                                  rows={4}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                />
                              </div>
                            </div>

                            {/* Range of Motion */}
                            <div className="mb-6">
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">Range of Motion:</h4>
                              <table className="w-full border border-gray-300 rounded-lg overflow-hidden">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Movement</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Right Active</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Right Passive</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Left Active</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Left Passive</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Normal</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {[
                                    { key: 'flexion', label: 'Flexion', normal: '150°' },
                                    { key: 'extension', label: 'Extension', normal: '0°' },
                                    { key: 'varusValgus', label: 'Varus/Valgus', normal: '-' }
                                  ].map((movement) => (
                                    <tr key={movement.key} className="border-b border-gray-200">
                                      <td className="px-3 py-2 text-sm text-gray-700">{movement.label}</td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="knees"
                                          fieldPath={`rangeOfMotion.${movement.key}.rightActive`}
                                          value={getModuleData('knees', `rangeOfMotion.${movement.key}.rightActive`)}
                                          onChange={(e) => updateModuleData('knees', `rangeOfMotion.${movement.key}.rightActive`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${movement.label} R-A`}
                                        />
                                      </td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="knees"
                                          fieldPath={`rangeOfMotion.${movement.key}.rightPassive`}
                                          value={getModuleData('knees', `rangeOfMotion.${movement.key}.rightPassive`)}
                                          onChange={(e) => updateModuleData('knees', `rangeOfMotion.${movement.key}.rightPassive`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${movement.label} R-P`}
                                        />
                                      </td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="knees"
                                          fieldPath={`rangeOfMotion.${movement.key}.leftActive`}
                                          value={getModuleData('knees', `rangeOfMotion.${movement.key}.leftActive`)}
                                          onChange={(e) => updateModuleData('knees', `rangeOfMotion.${movement.key}.leftActive`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${movement.label} L-A`}
                                        />
                                      </td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="knees"
                                          fieldPath={`rangeOfMotion.${movement.key}.leftPassive`}
                                          value={getModuleData('knees', `rangeOfMotion.${movement.key}.leftPassive`)}
                                          onChange={(e) => updateModuleData('knees', `rangeOfMotion.${movement.key}.leftPassive`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${movement.label} L-P`}
                                        />
                                      </td>
                                      <td className="px-3 py-2 text-sm text-gray-500">{movement.normal}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Ligamentous Tests */}
                            <div className="mb-6">
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">Ligamentous Tests:</h4>
                              <table className="w-full border border-gray-300 rounded-lg overflow-hidden">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Test</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Right</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Left</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {[
                                    { key: 'mcl0', label: 'MCL 0°' },
                                    { key: 'mcl20', label: 'MCL 20°' },
                                    { key: 'lcl0', label: 'LCL 0°' },
                                    { key: 'lcl20', label: 'LCL 20°' },
                                    { key: 'lachman', label: 'Lachman' },
                                    { key: 'pivot', label: 'Pivot' },
                                    { key: 'anteriorDrawer', label: 'Anterior Drawer' },
                                    { key: 'posteriorDrawer', label: 'Posterior Drawer' },
                                    { key: 'posteriorSag', label: 'Posterior Sag' },
                                    { key: 'dial30', label: 'Dial at 30°' },
                                    { key: 'dial90', label: 'Dial at 90°' }
                                  ].map((test) => (
                                    <tr key={test.key} className="border-b border-gray-200">
                                      <td className="px-3 py-2 text-sm text-gray-700">{test.label}</td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="knees"
                                          fieldPath={`ligamentousTests.${test.key}.right`}
                                          value={getModuleData('knees', `ligamentousTests.${test.key}.right`)}
                                          onChange={(e) => updateModuleData('knees', `ligamentousTests.${test.key}.right`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${test.label} R`}
                                        />
                                      </td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="knees"
                                          fieldPath={`ligamentousTests.${test.key}.left`}
                                          value={getModuleData('knees', `ligamentousTests.${test.key}.left`)}
                                          onChange={(e) => updateModuleData('knees', `ligamentousTests.${test.key}.left`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${test.label} L`}
                                        />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Meniscal Tests */}
                            <div className="mb-6">
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">Meniscal Tests:</h4>
                              <table className="w-full border border-gray-300 rounded-lg overflow-hidden">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Test</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Right</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Left</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {[
                                    { key: 'apley', label: 'Apley' },
                                    { key: 'mcMurray', label: 'McMurray' },
                                    { key: 'thessaly', label: 'Thessaly' }
                                  ].map((test) => (
                                    <tr key={test.key} className="border-b border-gray-200">
                                      <td className="px-3 py-2 text-sm text-gray-700">{test.label}</td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="knees"
                                          fieldPath={`meniscalTests.${test.key}.right`}
                                          value={getModuleData('knees', `meniscalTests.${test.key}.right`)}
                                          onChange={(e) => updateModuleData('knees', `meniscalTests.${test.key}.right`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${test.label} R`}
                                        />
                                      </td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="knees"
                                          fieldPath={`meniscalTests.${test.key}.left`}
                                          value={getModuleData('knees', `meniscalTests.${test.key}.left`)}
                                          onChange={(e) => updateModuleData('knees', `meniscalTests.${test.key}.left`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${test.label} L`}
                                        />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Patellar Tests */}
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">Patellar Tests:</h4>
                              <table className="w-full border border-gray-300 rounded-lg overflow-hidden">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Test</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Right</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Left</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {[
                                    { key: 'extensionLag', label: 'Extension Lag' },
                                    { key: 'patellarTracking', label: 'Patellar Tracking' },
                                    { key: 'patellarGrinding', label: 'Patellar Grinding' }
                                  ].map((test) => (
                                    <tr key={test.key} className="border-b border-gray-200">
                                      <td className="px-3 py-2 text-sm text-gray-700">{test.label}</td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="knees"
                                          fieldPath={`patellarTests.${test.key}.right`}
                                          value={getModuleData('knees', `patellarTests.${test.key}.right`)}
                                          onChange={(e) => updateModuleData('knees', `patellarTests.${test.key}.right`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${test.label} R`}
                                        />
                                      </td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="knees"
                                          fieldPath={`patellarTests.${test.key}.left`}
                                          value={getModuleData('knees', `patellarTests.${test.key}.left`)}
                                          onChange={(e) => updateModuleData('knees', `patellarTests.${test.key}.left`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${test.label} L`}
                                        />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Feet/Ankles */}
                        {selectedModules.feetAnkles && (
                          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Feet/Ankles</h3>
                            
                            {/* Palpation and Inspection */}
                            <div className="grid grid-cols-2 gap-4 mb-6">
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <label className="text-sm font-medium text-gray-700">Palpation:</label>
                                  <div className="flex items-center gap-2">
                                    {showFieldMapping && (
                                      <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                        PDF: feetAnkles.palpation
                                      </span>
                                    )}
                                    <button
                                      onClick={() => updateModuleData('feetAnkles', 'palpation', 'Normal')}
                                      className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                                    >
                                      Normal
                                    </button>
                                  </div>
                                </div>
                                <textarea
                                  value={getModuleData('feetAnkles', 'palpation')}
                                  onChange={(e) => updateModuleData('feetAnkles', 'palpation', e.target.value)}
                                  rows={4}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                />
                              </div>
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <label className="text-sm font-medium text-gray-700">Inspection:</label>
                                  <div className="flex items-center gap-2">
                                    {showFieldMapping && (
                                      <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                        PDF: feetAnkles.inspection
                                      </span>
                                    )}
                                    <button
                                      onClick={() => updateModuleData('feetAnkles', 'inspection', 'Normal')}
                                      className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                                    >
                                      Normal
                                    </button>
                                  </div>
                                </div>
                                <textarea
                                  value={getModuleData('feetAnkles', 'inspection')}
                                  onChange={(e) => updateModuleData('feetAnkles', 'inspection', e.target.value)}
                                  rows={4}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                />
                              </div>
                            </div>

                            {/* Range of Motion */}
                            <div className="mb-6">
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">Range of Motion:</h4>
                              <table className="w-full border border-gray-300 rounded-lg overflow-hidden">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Movement</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Right Active</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Right Passive</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Left Active</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Left Passive</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Normal</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {[
                                    { key: 'ankleDorsiflexion', label: 'Ankle Dorsiflexion', normal: '20°' },
                                    { key: 'anklePlantarflexion', label: 'Ankle Plantarflexion', normal: '40°' },
                                    { key: 'subtalarMotion', label: 'Subtalar Motion', normal: 'Présent' },
                                    { key: 'midtarsalMotion', label: 'Midtarsal Motion', normal: 'Présent' }
                                  ].map((movement) => (
                                    <tr key={movement.key} className="border-b border-gray-200">
                                      <td className="px-3 py-2 text-sm text-gray-700">{movement.label}</td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="feetAnkles"
                                          fieldPath={`rangeOfMotion.${movement.key}.rightActive`}
                                          value={getModuleData('feetAnkles', `rangeOfMotion.${movement.key}.rightActive`)}
                                          onChange={(e) => updateModuleData('feetAnkles', `rangeOfMotion.${movement.key}.rightActive`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${movement.label} R-A`}
                                        />
                                      </td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="feetAnkles"
                                          fieldPath={`rangeOfMotion.${movement.key}.rightPassive`}
                                          value={getModuleData('feetAnkles', `rangeOfMotion.${movement.key}.rightPassive`)}
                                          onChange={(e) => updateModuleData('feetAnkles', `rangeOfMotion.${movement.key}.rightPassive`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${movement.label} R-P`}
                                        />
                                      </td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="feetAnkles"
                                          fieldPath={`rangeOfMotion.${movement.key}.leftActive`}
                                          value={getModuleData('feetAnkles', `rangeOfMotion.${movement.key}.leftActive`)}
                                          onChange={(e) => updateModuleData('feetAnkles', `rangeOfMotion.${movement.key}.leftActive`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${movement.label} L-A`}
                                        />
                                      </td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="feetAnkles"
                                          fieldPath={`rangeOfMotion.${movement.key}.leftPassive`}
                                          value={getModuleData('feetAnkles', `rangeOfMotion.${movement.key}.leftPassive`)}
                                          onChange={(e) => updateModuleData('feetAnkles', `rangeOfMotion.${movement.key}.leftPassive`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${movement.label} L-P`}
                                        />
                                      </td>
                                      <td className="px-3 py-2 text-sm text-gray-500">{movement.normal}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Ligamentous Tests */}
                            <div className="mb-6">
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">Ligamentous Tests:</h4>
                              <table className="w-full border border-gray-300 rounded-lg overflow-hidden">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Test</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Right</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Left</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {[
                                    { key: 'drawer0', label: 'Drawer 0°' },
                                    { key: 'drawer20', label: 'Drawer 20°' },
                                    { key: 'varusStress', label: 'Varus Stress' },
                                    { key: 'calcaneofibularLaxity', label: 'Calcaneofibular Laxity' }
                                  ].map((test) => (
                                    <tr key={test.key} className="border-b border-gray-200">
                                      <td className="px-3 py-2 text-sm text-gray-700">{test.label}</td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="feetAnkles"
                                          fieldPath={`ligamentousTests.${test.key}.right`}
                                          value={getModuleData('feetAnkles', `ligamentousTests.${test.key}.right`)}
                                          onChange={(e) => updateModuleData('feetAnkles', `ligamentousTests.${test.key}.right`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${test.label} R`}
                                        />
                                      </td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="feetAnkles"
                                          fieldPath={`ligamentousTests.${test.key}.left`}
                                          value={getModuleData('feetAnkles', `ligamentousTests.${test.key}.left`)}
                                          onChange={(e) => updateModuleData('feetAnkles', `ligamentousTests.${test.key}.left`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${test.label} L`}
                                        />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Tendon Tests */}
                            <div className="mb-6">
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">Tendon Tests:</h4>
                              <table className="w-full border border-gray-300 rounded-lg overflow-hidden">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Test</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Right</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Left</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {[
                                    { key: 'singleHeelRaise', label: 'Single Heel Raise' },
                                    { key: 'thompson', label: 'Thompson' },
                                    { key: 'peronealApprehension', label: 'Peroneal Apprehension' }
                                  ].map((test) => (
                                    <tr key={test.key} className="border-b border-gray-200">
                                      <td className="px-3 py-2 text-sm text-gray-700">{test.label}</td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="feetAnkles"
                                          fieldPath={`tendonTests.${test.key}.right`}
                                          value={getModuleData('feetAnkles', `tendonTests.${test.key}.right`)}
                                          onChange={(e) => updateModuleData('feetAnkles', `tendonTests.${test.key}.right`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${test.label} R`}
                                        />
                                      </td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="feetAnkles"
                                          fieldPath={`tendonTests.${test.key}.left`}
                                          value={getModuleData('feetAnkles', `tendonTests.${test.key}.left`)}
                                          onChange={(e) => updateModuleData('feetAnkles', `tendonTests.${test.key}.left`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${test.label} L`}
                                        />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Lower Limb Alignment */}
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">Lower Limb Alignment:</h4>
                              <table className="w-full border border-gray-300 rounded-lg overflow-hidden">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Test</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Right</th>
                                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Left</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {[
                                    { key: 'hipRotation', label: 'Hip Rotation' },
                                    { key: 'thighFootAngle', label: 'Thigh-Foot Angle' },
                                    { key: 'generalAlignment', label: 'General Alignment' }
                                  ].map((test) => (
                                    <tr key={test.key} className="border-b border-gray-200">
                                      <td className="px-3 py-2 text-sm text-gray-700">{test.label}</td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="feetAnkles"
                                          fieldPath={`lowerLimbAlignment.${test.key}.right`}
                                          value={getModuleData('feetAnkles', `lowerLimbAlignment.${test.key}.right`)}
                                          onChange={(e) => updateModuleData('feetAnkles', `lowerLimbAlignment.${test.key}.right`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${test.label} R`}
                                        />
                                      </td>
                                      <td className="px-3 py-2">
                                        <TableInputField
                                          moduleName="feetAnkles"
                                          fieldPath={`lowerLimbAlignment.${test.key}.left`}
                                          value={getModuleData('feetAnkles', `lowerLimbAlignment.${test.key}.left`)}
                                          onChange={(e) => updateModuleData('feetAnkles', `lowerLimbAlignment.${test.key}.left`, e.target.value)}
                                          showFieldMapping={showFieldMapping}
                                          label={`${test.label} L`}
                                        />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Section 11: Paraclinical Exams */}
                    {currentSection === 11 && (
                      <div>
                        <TextAreaField 
                          label="Examens et résultats" 
                          field="paraclinicalExams"
                          rows={8}
                          value={formData.paraclinicalExams || ''}
                          onChange={(e) => handleInputChange('paraclinicalExams', e.target.value)}
                          handleInputChange={handleInputChange}
                        />
                      </div>
                    )}
                    
                    {/* Section 12: Conclusion */}
                    {currentSection === 12 && (
                      <div>
                        <TextAreaField 
                          label="Résumé et conclusion" 
                          field="summary"
                          rows={12}
                          value={formData.summary || ''}
                          onChange={(e) => handleInputChange('summary', e.target.value)}
                          handleInputChange={handleInputChange}
                        />
                      </div>
                    )}
                    
                    {/* Section 13: Sequelae */}
                    {currentSection === 13 && (
                      <div>
                        {/* 1. CURRENT SEQUELAE */}
                        <div className="mb-6">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-bold text-gray-800">1. CURRENT SEQUELAE</h3>
                            {showFieldMapping && (
                              <span className="text-[11px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                PDF: {fieldMapping['currentSequelae'] || fieldMapping['sequellesActuelles'] || 'currentSequelae'}
                              </span>
                            )}
                          </div>
                          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                            <table className="w-full bg-white rounded-lg overflow-hidden">
                              <thead className="bg-blue-100">
                                <tr>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-blue-200">Sequela code</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-blue-200">Description</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-blue-200 w-20">%</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-blue-200 w-16"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {currentSequelae.map((sequela) => (
                                  <tr key={sequela.id} className="border-b border-gray-200 hover:bg-gray-50">
                                    <td className="px-3 py-2">
                                      <input
                                        type="text"
                                        value={sequela.code || ''}
                                        onChange={(e) => {
                                          setCurrentSequelae(currentSequelae.map(s => 
                                            s.id === sequela.id ? { ...s, code: e.target.value } : s
                                          ));
                                        }}
                                        className="w-full px-2 py-1 border border-gray-300 rounded bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                        placeholder="Enter code"
                                      />
                                    </td>
                                    <td className="px-3 py-2">
                                      <input
                                        type="text"
                                        value={sequela.description || ''}
                                        onChange={(e) => {
                                          setCurrentSequelae(currentSequelae.map(s => 
                                            s.id === sequela.id ? { ...s, description: e.target.value } : s
                                          ));
                                        }}
                                        className="w-full px-2 py-1 border border-gray-300 rounded bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                        placeholder="Enter description"
                                      />
                                    </td>
                                    <td className="px-3 py-2">
                                      <input
                                        type="text"
                                        value={sequela.percentage || ''}
                                        onChange={(e) => {
                                          setCurrentSequelae(currentSequelae.map(s => 
                                            s.id === sequela.id ? { ...s, percentage: e.target.value } : s
                                          ));
                                        }}
                                        className="w-full px-2 py-1 border border-gray-300 rounded bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-center"
                                        placeholder="%"
                                      />
                                    </td>
                                    <td className="px-3 py-2">
                                      {currentSequelae.length > 1 && (
                                        <button
                                          onClick={() => {
                                            // When removing, ensure we always have at least 2 rows
                                            const filtered = currentSequelae.filter(s => s.id !== sequela.id);
                                            if (filtered.length < 2) {
                                              // Add a new empty row if we're below 2
                                              const newId = filtered.length > 0 
                                                ? Math.max(...filtered.map(s => s.id)) + 1 
                                                : 1;
                                              setCurrentSequelae([...filtered, { id: newId, code: '', description: '', percentage: '' }]);
                                            } else {
                                              setCurrentSequelae(filtered);
                                            }
                                          }}
                                          className="text-red-600 hover:text-red-800 hover:bg-red-50 rounded p-1 transition-colors"
                                          title="Supprimer"
                                        >
                                          <Trash2 size={18} />
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {currentSequelae.length < 2 && (
                              <div className="mt-3">
                                <button
                                  onClick={() => {
                                    const newId = currentSequelae.length > 0 
                                      ? Math.max(...currentSequelae.map(s => s.id)) + 1 
                                      : 1;
                                    setCurrentSequelae([...currentSequelae, { id: newId, code: '', description: '', percentage: '' }]);
                                  }}
                                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                                  disabled={currentSequelae.length >= 2}
                                >
                                  <Plus size={16} />
                                  Add Sequela
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 2. PREVIOUS SEQUELAE */}
                        <div className="mb-6">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-bold text-gray-800">2. PREVIOUS SEQUELAE</h3>
                            {showFieldMapping && (
                              <span className="text-[11px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                PDF: {fieldMapping['previousSequelae'] || fieldMapping['sequellesAnterieures'] || 'previousSequelae'}
                              </span>
                            )}
                          </div>
                          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                            <textarea
                              value={formData.previousSequelae || ''}
                              onChange={(e) => handleInputChange('previousSequelae', e.target.value)}
                              rows={4}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        {/* 3. OTHER BILATERAL DEFICITS */}
                        <div className="mb-6">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-bold text-gray-800">3. OTHER BILATERAL DEFICITS</h3>
                            {showFieldMapping && (
                              <span className="text-[11px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                PDF: {fieldMapping['otherBilateralDeficits'] || fieldMapping['deficitsBilateraux'] || 'otherBilateralDeficits'}
                              </span>
                            )}
                          </div>
                          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                            <textarea
                              value={formData.otherBilateralDeficits || ''}
                              onChange={(e) => handleInputChange('otherBilateralDeficits', e.target.value)}
                              rows={4}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        {/* NB Section */}
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-bold text-gray-800">NB:</h3>
                            {showFieldMapping && (() => {
                              // Get the mapped PDF field name, but filter out module fallback fields
                              const mappedField = fieldMapping['noteBene'] || fieldMapping['nb'] || 'noteBene';
                              const isModuleFallback = mappedField && (
                                mappedField.includes('specialized') ||
                                mappedField.includes('trendelenburg') ||
                                mappedField.includes('hip') ||
                                mappedField.includes('test') ||
                                mappedField.toLowerCase().startsWith('hips') ||
                                mappedField.toLowerCase().startsWith('cervical') ||
                                mappedField.toLowerCase().startsWith('lumbar')
                              );
                              
                              // If it's a module fallback, try to find the actual PDF field
                              let displayField = mappedField;
                              if (isModuleFallback && detectedFields) {
                                const actualNbField = Object.keys(detectedFields).find(f => {
                                  const fLower = f.toLowerCase();
                                  return (fLower === 'nb' || 
                                          /^nb[^a-z0-9]|^nb$/i.test(f) || 
                                          /[^a-z0-9]nb[^a-z0-9]|[^a-z0-9]nb$/i.test(f)) &&
                                         !fLower.includes('trendelenburg') &&
                                         !fLower.includes('specialized') &&
                                         !fLower.includes('hip') &&
                                         !fLower.includes('test');
                                });
                                displayField = actualNbField || 'nb';
                              }
                              
                              return (
                                <span className="text-[11px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                  PDF: {displayField}
                                </span>
                              );
                            })()}
                          </div>
                          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                            <textarea
                              value={formData.noteBene || ''}
                              onChange={(e) => handleInputChange('noteBene', e.target.value)}
                              rows={3}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Footer - Signature (shown on last section) */}
                  {currentSection === sections.length - 1 && (
                    <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
                      <div className="border-t-2 border-gray-300 pt-4">
                        <p className="text-sm text-gray-600 mb-2">Signature du médecin :</p>
                        <div className="h-16 border-b border-gray-400 mb-2"></div>
                        <p className="text-sm text-gray-700 font-medium mb-1">{formData.doctorSignature || 'Hugo Centomo, MD, PhD, FRCS ©'}</p>
                        <p className="text-sm text-gray-600">{formData.doctorTitle || ''}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Action Buttons at Bottom (shown on last section) */}
                  {/* NOTE: This button uses the same handleFillAndDownload function as the PDF viewer button */}
                  {currentSection === sections.length - 1 && (
                    <div className="flex justify-end gap-3 mt-6 mb-6">
                      <button 
                        onClick={handleExportToJSON}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                      >
                        <Save size={20} />
                        Sauvegarder (JSON)
                      </button>
                    </div>
                  )}
                </div>
              </MappingContext.Provider>
            </div>
          </div>

          {/* PDF Viewer - Right Side */}
          {showPdfViewer && (
            <div className="w-1/2 flex flex-col bg-gray-50 py-6 px-4 overflow-auto">
              <div className="max-w-full mx-auto">
                {/* Success indicator when fields are auto-detected */}
                {detectedFields && Object.keys(detectedFields).length > 0 && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">✅</div>
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-green-900">
                          {Object.keys(detectedFields).length} Fields Detected & Positioned Pixel-Perfect
                        </h3>
                        <p className="text-xs text-green-700 mt-0.5">
                          Form fields are ready to fill. Type directly, import JSON, or save as template.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div
                  ref={containerRef}
                  className="relative bg-white shadow-lg rounded-lg overflow-hidden"
                  style={{ 
                    height: 'calc(100vh - 200px)',
                    minHeight: '600px'
                  }}
                >
                  {isProcessing ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Processing PDF...</p>
                      </div>
                    </div>
                  ) : pdfUrl ? (
                    <iframe
                      src={pdfUrl}
                      className="w-full h-full border-0"
                      title="PDF Viewer - Form.pdf"
                    />
                  ) : null}
                </div>

                {/* PDF Action Buttons */}
                {pdfFile && (
                  <div className="mt-4 flex gap-3 justify-center">
                    <button
                      onClick={handleFillAndDownload}
                      disabled={isProcessing}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed pdf-action-button"
                    >
                      <Download className="w-4 h-4" />
                      {isProcessing ? 'Traitement...' : 'Télécharger PDF (Flattened)'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
            <div className="w-full flex-1 bg-gray-50 py-6">
              <div className="max-w-5xl mx-auto px-6">
                <div className="bg-white shadow-lg rounded-lg" style={{ height: 'calc(100vh - 180px)', minHeight: '600px' }}>
                  <div className="flex items-center justify-center h-full w-full">
                    <div className="text-center px-8 py-12">
                      <div className="w-24 h-24 mx-auto mb-6 bg-blue-50 rounded-full flex items-center justify-center">
                        <FileText className="w-12 h-12 text-blue-500" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">Loading PDF form...</h3>
                      <p className="text-gray-600 mb-6 max-w-md">
                        Please wait while the form is being loaded
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

      {/* Save Template Dialog */}
      {showTemplateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 dialog-backdrop">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 dialog-content">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Save Template</h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template Name
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g., Alberta Medical Exam Template"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              <div className="text-sm text-gray-600 mb-4">
                This will save the current field positions for reuse with similar PDFs.
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowTemplateDialog(false);
                    setTemplateName('');
                  }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTemplate}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                >
                  Save Template
                </button>
              </div>
            </div>
          </div>
        )}

      {/* JSON Import Preview Dialog */}
      {showJSONDialog && jsonMappingPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 dialog-backdrop">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto dialog-content">
              <h2 className="text-xl font-bold text-gray-800 mb-4">JSON Import Preview</h2>
              
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Matched Fields: {Object.keys(jsonMappingPreview.mapped).length}
                  </span>
                  {jsonMappingPreview.unmapped.filter(field => {
                    // Filter out internal sequela form fields - these are mapped to PDF fields during transformation
                    return !/^sequelaCode\d+$/.test(field) && 
                           !/^sequelaDescription\d+$/.test(field) &&
                           !/^sequelaPercentage\d+$/.test(field);
                  }).length > 0 && (
                    <span className="text-sm text-amber-600">
                      Unmapped: {jsonMappingPreview.unmapped.filter(field => {
                        return !/^sequelaCode\d+$/.test(field) && 
                               !/^sequelaDescription\d+$/.test(field) &&
                               !/^sequelaPercentage\d+$/.test(field);
                      }).length}
                    </span>
                  )}
                </div>
                
                {/* Mapped Fields Preview */}
                <div className="border border-gray-300 rounded-lg p-4 max-h-96 overflow-y-auto">
                  <h3 className="font-semibold text-gray-800 mb-2">Data to Import:</h3>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Field</th>
                        <th className="px-3 py-2 text-left">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(jsonMappingPreview.mapped).map(([key, value]) => (
                        <tr key={key} className="border-t border-gray-200">
                          <td className="px-3 py-2 font-medium text-gray-700">
                            {JSONImportService.humanizeFieldName(key)}
                          </td>
                          <td className="px-3 py-2 text-gray-600">
                            {String(value)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Unmapped Fields Warning */}
                {jsonMappingPreview.unmapped.filter(field => {
                  // Filter out internal sequela form fields - these are mapped to PDF fields during transformation
                  return !/^sequelaCode\d+$/.test(field) && 
                         !/^sequelaDescription\d+$/.test(field) &&
                         !/^sequelaPercentage\d+$/.test(field);
                }).length > 0 && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800 font-medium mb-1">
                      ⚠️ Unmapped Fields:
                    </p>
                    <p className="text-xs text-amber-700">
                      {jsonMappingPreview.unmapped
                        .filter(field => {
                          // Filter out internal sequela form fields - these are mapped to PDF fields during transformation
                          return !/^sequelaCode\d+$/.test(field) && 
                                 !/^sequelaDescription\d+$/.test(field) &&
                                 !/^sequelaPercentage\d+$/.test(field);
                        })
                        .join(', ')}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowJSONDialog(false);
                    setJsonMappingPreview(null);
                  }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyJSONData}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
                >
                  Apply to Form
                </button>
              </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InteractivePDFForm;

