import React, { useState, useRef } from 'react';
import { FileText, Download, Upload, Save } from 'lucide-react';

const MedicalExaminationForm = () => {
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
    
    // Medical conditions - using Yes/No/Ref radio buttons
    hearing: '',
    cardiovascular: '',
    sickSinus: '',
    aorticAneurysm: '',
    bloodPressureSystolic: '',
    bloodPressureDiastolic: '',
    ischemiaAttacks: '',
    myocardialDate: '',
    multipleSyncope: '',
    spontaneousSeizures: '',
    memoryDysfunction: '',
    moderateDementia: '',
    levelImpairment: '',
    metabolicDiabetes: '',
    hypoglycemicDate: '',
    diabetesControl: '',
    insulinDependent: '',
    hypoglycemiaAnyStation: '',
    symptomaticHypothyroidism: '',
    psychiatricDisorders: '',
    habitualAlcohol: '',
    otherDisorder: '',
    diseaseOnset: '',
    lastSeizure: '',
    frequency: ''
  });

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

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      // PDF upload functionality can be implemented here
      console.log('PDF uploaded:', file.name);
    }
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
      <span className="text-sm font-medium text-gray-700 min-w-[100px]">{label}</span>
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
      <div className="max-w-6xl mx-auto">
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
                Upload PDF
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

        {/* Form Content */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Personal Information Section */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b-2 border-blue-600">
              Personal Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Middle Name</label>
                <input
                  type="text"
                  value={formData.middleName}
                  onChange={(e) => handleInputChange('middleName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telephone Number</label>
                <input
                  type="tel"
                  value={formData.telephone}
                  onChange={(e) => handleInputChange('telephone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Occupation</label>
                <input
                  type="text"
                  value={formData.occupation}
                  onChange={(e) => handleInputChange('occupation', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Apartment</label>
                <input
                  type="text"
                  value={formData.apartment}
                  onChange={(e) => handleInputChange('apartment', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City / Town</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
                <input
                  type="text"
                  value={formData.province}
                  onChange={(e) => handleInputChange('province', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                <input
                  type="text"
                  value={formData.postalCode}
                  onChange={(e) => handleInputChange('postalCode', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">License Class</label>
                <input
                  type="text"
                  value={formData.licenseClass}
                  onChange={(e) => handleInputChange('licenseClass', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
                <input
                  type="text"
                  value={formData.licenseNumber}
                  onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </section>

          {/* Visual Acuity Section */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b-2 border-blue-600">
              1. Visual Acuity Results
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="font-semibold text-gray-700">Eye</div>
              <div className="font-semibold text-gray-700">Uncorrected</div>
              <div className="font-semibold text-gray-700">Corrected</div>
              
              <div className="font-medium text-gray-600">Right</div>
              <input
                type="text"
                value={formData.rightUncorrected}
                onChange={(e) => handleInputChange('rightUncorrected', e.target.value)}
                placeholder="6/"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="text"
                value={formData.rightCorrected}
                onChange={(e) => handleInputChange('rightCorrected', e.target.value)}
                placeholder="6/"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              
              <div className="font-medium text-gray-600">Left</div>
              <input
                type="text"
                value={formData.leftUncorrected}
                onChange={(e) => handleInputChange('leftUncorrected', e.target.value)}
                placeholder="6/"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="text"
                value={formData.leftCorrected}
                onChange={(e) => handleInputChange('leftCorrected', e.target.value)}
                placeholder="6/"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              
              <div className="font-medium text-gray-600">Both</div>
              <input
                type="text"
                value={formData.bothUncorrected}
                onChange={(e) => handleInputChange('bothUncorrected', e.target.value)}
                placeholder="6/"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="text"
                value={formData.bothCorrected}
                onChange={(e) => handleInputChange('bothCorrected', e.target.value)}
                placeholder="6/"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </section>

          {/* Medical History Section */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b-2 border-blue-600">
              Medical History and Physical Examination
            </h2>
            
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-800 mt-4 mb-2">2. Hearing</h3>
              <RadioGroup
                name="hearing"
                value={formData.hearing}
                onChange={handleRadioChange}
                label="Loss > 40 dB"
              />

              <h3 className="font-semibold text-gray-800 mt-4 mb-2">3. Cardiovascular/Cerebrovascular System</h3>
              <RadioGroup
                name="cardiovascular"
                value={formData.cardiovascular}
                onChange={handleRadioChange}
                label="Current history"
              />
              <RadioGroup
                name="sickSinus"
                value={formData.sickSinus}
                onChange={handleRadioChange}
                label="Sick Sinus Syndrome"
              />
              <RadioGroup
                name="aorticAneurysm"
                value={formData.aorticAneurysm}
                onChange={handleRadioChange}
                label="Aortic Aneurysm > 5.5 cm"
              />
              
              <div className="flex items-center gap-4 mt-2">
                <span className="text-sm font-medium text-gray-700 min-w-[100px]">Blood Pressure:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={formData.bloodPressureSystolic}
                    onChange={(e) => handleInputChange('bloodPressureSystolic', e.target.value)}
                    placeholder="Systolic"
                    className="w-24 px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-600">/</span>
                  <input
                    type="text"
                    value={formData.bloodPressureDiastolic}
                    onChange={(e) => handleInputChange('bloodPressureDiastolic', e.target.value)}
                    placeholder="Diastolic"
                    className="w-24 px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <RadioGroup
                name="ischemiaAttacks"
                value={formData.ischemiaAttacks}
                onChange={handleRadioChange}
                label="Ischemia attacks"
              />

              <h3 className="font-semibold text-gray-800 mt-4 mb-2">4. Nervous System</h3>
              <RadioGroup
                name="multipleSyncope"
                value={formData.multipleSyncope}
                onChange={handleRadioChange}
                label="Multiple syncope"
              />
              <RadioGroup
                name="spontaneousSeizures"
                value={formData.spontaneousSeizures}
                onChange={handleRadioChange}
                label="Spontaneous seizures"
              />
              <RadioGroup
                name="memoryDysfunction"
                value={formData.memoryDysfunction}
                onChange={handleRadioChange}
                label="Memory dysfunction"
              />
              <RadioGroup
                name="moderateDementia"
                value={formData.moderateDementia}
                onChange={handleRadioChange}
                label="Moderate to severe dementia"
              />

              <h3 className="font-semibold text-gray-800 mt-4 mb-2">5. Respiratory System</h3>
              <RadioGroup
                name="levelImpairment"
                value={formData.levelImpairment}
                onChange={handleRadioChange}
                label="Level 1 impairment"
              />

              <h3 className="font-semibold text-gray-800 mt-4 mb-2">6. Metabolic System</h3>
              <RadioGroup
                name="metabolicDiabetes"
                value={formData.metabolicDiabetes}
                onChange={handleRadioChange}
                label="Diabetes present"
              />
              <RadioGroup
                name="insulinDependent"
                value={formData.insulinDependent}
                onChange={handleRadioChange}
                label="Insulin dependent"
              />
              <RadioGroup
                name="hypoglycemiaAnyStation"
                value={formData.hypoglycemiaAnyStation}
                onChange={handleRadioChange}
                label="Hypoglycemia"
              />
              <RadioGroup
                name="symptomaticHypothyroidism"
                value={formData.symptomaticHypothyroidism}
                onChange={handleRadioChange}
                label="Symptomatic hypothyroidism"
              />

              <h3 className="font-semibold text-gray-800 mt-4 mb-2">7. Psychiatric Disorders</h3>
              <RadioGroup
                name="psychiatricDisorders"
                value={formData.psychiatricDisorders}
                onChange={handleRadioChange}
                label="Psychosis or Bipolar"
              />
              <RadioGroup
                name="habitualAlcohol"
                value={formData.habitualAlcohol}
                onChange={handleRadioChange}
                label="Habitual alcohol/drug use"
              />

              <h3 className="font-semibold text-gray-800 mt-4 mb-2">8. Other</h3>
              <div className="mt-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Other disorders (if any)</label>
                <textarea
                  value={formData.otherDisorder}
                  onChange={(e) => handleInputChange('otherDisorder', e.target.value)}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe any other disorders..."
                />
              </div>
            </div>
          </section>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <button
              onClick={() => setFormData({})}
              className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
            >
              Clear Form
            </button>
            <button
              onClick={exportFormData}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
            >
              <Save className="w-4 h-4" />
              Save Form Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MedicalExaminationForm;