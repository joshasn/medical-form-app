import React, { useState, useRef } from 'react';
import { FileText, Download, Upload, Save } from 'lucide-react';
import { fillPdfForm, downloadPdf } from './pdfService';

const MedicalFormWithPDF = () => {
  const [formData, setFormData] = useState({
    lastName: '',
    firstName: '',
    middleName: '',
    dateOfBirth: '',
    telephone: '',
    // ... add all other fields
  });
  
  const [uploadedPdf, setUploadedPdf] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePdfUpload = async (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      const arrayBuffer = await file.arrayBuffer();
      setUploadedPdf(new Uint8Array(arrayBuffer));
    }
  };

  const handleFillAndDownload = async () => {
    if (!uploadedPdf) {
      alert('Please upload a PDF first!');
      return;
    }

    setIsProcessing(true);
    try {
      const filledPdf = await fillPdfForm(uploadedPdf, formData);
      downloadPdf(filledPdf, 'medical-examination-filled.pdf');
      alert('PDF filled and downloaded successfully!');
    } catch (error) {
      console.error('Error:', error);
      alert('Error filling PDF. Check console for details.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  Medical Examination Form
                </h1>
                <p className="text-gray-600">Fill and Generate PDF</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
              >
                <Upload className="w-4 h-4" />
                {uploadedPdf ? 'PDF Uploaded ✓' : 'Upload PDF Template'}
              </button>
              <button
                onClick={handleFillAndDownload}
                disabled={!uploadedPdf || isProcessing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                {isProcessing ? 'Processing...' : 'Fill & Download PDF'}
              </button>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handlePdfUpload}
            className="hidden"
          />
        </div>

        {/* Form Fields */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b-2 border-blue-600">
              Personal Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              {/* Add more fields here */}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default MedicalFormWithPDF;