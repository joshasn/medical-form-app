import React, { useState, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { FileText, Download, Upload, Save, ZoomIn, ZoomOut, FilePlus } from 'lucide-react';
import { detectPdfFields, fillPdfForm, downloadPdf } from './pdfService';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const MedicalFormViewer = () => {
  const [formData, setFormData] = useState({
    // Personal Information
    lastName: '',
    firstName: '',
    middleName: '',
    dateOfBirth: '',
    telephone: '',
    address: '',
    apartment: '',
    city: '',
    province: '',
    postalCode: '',
    occupation: '',
    licenseClass: '',
    licenseNumber: '',
    
    // Visual Acuity
    rightUncorrected: '',
    rightCorrected: '',
    leftUncorrected: '',
    leftCorrected: '',
    bothUncorrected: '',
    bothCorrected: '',
    
    // Medical conditions
    hearing: '',
    cardiovascular: '',
    sickSinus: '',
    aorticAneurysm: '',
    bloodPressureSystolic: '',
    bloodPressureDiastolic: '',
    ischemiaAttacks: '',
    multipleSyncope: '',
    spontaneousSeizures: '',
    memoryDysfunction: '',
    moderateDementia: '',
    levelImpairment: '',
    metabolicDiabetes: '',
    insulinDependent: '',
    hypoglycemiaAnyStation: '',
    symptomaticHypothyroidism: '',
    psychiatricDisorders: '',
    habitualAlcohol: '',
    otherDisorder: ''
  });

  const [pdfFile, setPdfFile] = useState(null);
  const [pdfBytes, setPdfBytes] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleRadioChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      console.log('File selected:', file.name, file.type, file.size);
      if (file.type === 'application/pdf') {
        setPdfFile(file);
        
        // Also read the file as bytes for filling
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        setPdfBytes(bytes);
        
        // Detect available form fields
        await detectPdfFields(bytes);
      } else {
        alert('Please select a PDF file');
      }
    }
  };

  const handleFillAndDownload = async () => {
    if (!pdfBytes) {
      alert('Please upload a PDF first!');
      return;
    }

    setIsProcessing(true);
    try {
      console.log('Filling PDF with data:', formData);
      const filledPdf = await fillPdfForm(pdfBytes, formData);
      downloadPdf(filledPdf, 'medical-examination-filled.pdf');
      alert('PDF filled and downloaded successfully!');
    } catch (error) {
      console.error('Error filling PDF:', error);
      alert('Error filling PDF. Check console for details.');
    } finally {
      setIsProcessing(false);
    }
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPageNumber(1);
    console.log('PDF loaded successfully:', numPages, 'pages');
  };

  const onDocumentLoadError = (error) => {
    console.error('Error loading PDF:', error);
    alert('Error loading PDF: ' + error.message);
  };

  const exportFormData = () => {
    const dataStr = JSON.stringify(formData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'medical-examination-form-data.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const RadioGroup = ({ name, value, onChange, label }) => (
    <div className="flex items-center gap-4">
      <span className="text-sm font-medium text-gray-700 min-w-[120px]">{label}</span>
      <div className="flex gap-4">
        {['Yes', 'No', 'Ref'].map(option => (
          <label key={option} className="flex items-center gap-1 cursor-pointer">
            <input
              type="radio"
              name={name}
              value={option}
              checked={value === option}
              onChange={(e) => onChange(name, e.target.value)}
              className="w-4 h-4 text-blue-600 cursor-pointer"
            />
            <span className="text-sm text-gray-600">{option}</span>
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Medical Examination Form</h1>
                <p className="text-gray-600">For Motor Vehicle Operators - Alberta</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
              >
                <Upload className="w-4 h-4" />
                {pdfFile ? 'PDF Loaded ✓' : 'Upload PDF'}
              </button>
              <button
                onClick={handleFillAndDownload}
                disabled={!pdfFile || isProcessing}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FilePlus className="w-4 h-4" />
                {isProcessing ? 'Processing...' : 'Fill & Download PDF'}
              </button>
              <button
                onClick={exportFormData}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                <Download className="w-4 h-4" />
                Export Data
              </button>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {/* Main Content - Split View */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* PDF Viewer Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">PDF Preview</h2>
              {pdfFile && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setScale(s => Math.max(0.5, s - 0.1))}
                    className="p-2 bg-gray-100 hover:bg-gray-200 rounded"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-gray-600">{Math.round(scale * 100)}%</span>
                  <button
                    onClick={() => setScale(s => Math.min(2, s + 0.1))}
                    className="p-2 bg-gray-100 hover:bg-gray-200 rounded"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            
            <div className="border border-gray-300 rounded-lg overflow-auto max-h-[800px]">
              {pdfFile ? (
                <div className="flex flex-col items-center">
                  <Document
                    file={pdfFile}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={onDocumentLoadError}
                    loading={<div className="p-4">Loading PDF...</div>}
                    error={<div className="p-4 text-red-600">Failed to load PDF file.</div>}
                    className="flex justify-center"
                  >
                    <Page
                      pageNumber={pageNumber}
                      scale={scale}
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                    />
                  </Document>
                  {numPages && (
                    <div className="flex items-center gap-4 mt-4 mb-4">
                      <button
                        onClick={() => setPageNumber(p => Math.max(1, p - 1))}
                        disabled={pageNumber <= 1}
                        className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <span className="text-sm text-gray-600">
                        Page {pageNumber} of {numPages}
                      </span>
                      <button
                        onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
                        disabled={pageNumber >= numPages}
                        className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-400">
                  <div className="text-center">
                    <FileText className="w-16 h-16 mx-auto mb-2 opacity-50" />
                    <p>No PDF loaded</p>
                    <p className="text-sm">Click "Upload PDF" to view</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Form Section */}
          <div className="bg-white rounded-lg shadow-lg p-6 max-h-[800px] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Form Data</h2>
            
            {/* Personal Information Section */}
            <section className="mb-6">
              <h3 className="text-md font-bold text-gray-800 mb-3 pb-2 border-b border-blue-600">
                Personal Information
              </h3>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Middle Name</label>
                  <input
                    type="text"
                    value={formData.middleName}
                    onChange={(e) => handleInputChange('middleName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telephone</label>
                  <input
                    type="tel"
                    value={formData.telephone}
                    onChange={(e) => handleInputChange('telephone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>
            </section>

            {/* Visual Acuity Section */}
            <section className="mb-6">
              <h3 className="text-md font-bold text-gray-800 mb-3 pb-2 border-b border-blue-600">
                Visual Acuity
              </h3>
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2 text-sm font-semibold text-gray-700">
                  <div>Eye</div>
                  <div>Uncorrected</div>
                  <div>Corrected</div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="font-medium text-gray-600 text-sm">Right</div>
                  <input
                    type="text"
                    value={formData.rightUncorrected}
                    onChange={(e) => handleInputChange('rightUncorrected', e.target.value)}
                    placeholder="6/"
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <input
                    type="text"
                    value={formData.rightCorrected}
                    onChange={(e) => handleInputChange('rightCorrected', e.target.value)}
                    placeholder="6/"
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="font-medium text-gray-600 text-sm">Left</div>
                  <input
                    type="text"
                    value={formData.leftUncorrected}
                    onChange={(e) => handleInputChange('leftUncorrected', e.target.value)}
                    placeholder="6/"
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <input
                    type="text"
                    value={formData.leftCorrected}
                    onChange={(e) => handleInputChange('leftCorrected', e.target.value)}
                    placeholder="6/"
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="font-medium text-gray-600 text-sm">Both</div>
                  <input
                    type="text"
                    value={formData.bothUncorrected}
                    onChange={(e) => handleInputChange('bothUncorrected', e.target.value)}
                    placeholder="6/"
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <input
                    type="text"
                    value={formData.bothCorrected}
                    onChange={(e) => handleInputChange('bothCorrected', e.target.value)}
                    placeholder="6/"
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
              </div>
            </section>

            {/* Medical History Section */}
            <section className="mb-6">
              <h3 className="text-md font-bold text-gray-800 mb-3 pb-2 border-b border-blue-600">
                Medical History
              </h3>
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-800 text-sm mt-3">Hearing</h4>
                <RadioGroup
                  name="hearing"
                  value={formData.hearing}
                  onChange={handleRadioChange}
                  label="Loss > 40 dB"
                />

                <h4 className="font-semibold text-gray-800 text-sm mt-3">Cardiovascular</h4>
                <RadioGroup
                  name="cardiovascular"
                  value={formData.cardiovascular}
                  onChange={handleRadioChange}
                  label="Current history"
                />
                
                <h4 className="font-semibold text-gray-800 text-sm mt-3">Nervous System</h4>
                <RadioGroup
                  name="spontaneousSeizures"
                  value={formData.spontaneousSeizures}
                  onChange={handleRadioChange}
                  label="Seizures"
                />

                <h4 className="font-semibold text-gray-800 text-sm mt-3">Metabolic</h4>
                <RadioGroup
                  name="metabolicDiabetes"
                  value={formData.metabolicDiabetes}
                  onChange={handleRadioChange}
                  label="Diabetes"
                />
              </div>
            </section>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4 border-t">
              <button
                onClick={() => setFormData({})}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition text-sm"
              >
                Clear
              </button>
              <button
                onClick={exportFormData}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MedicalFormViewer;

