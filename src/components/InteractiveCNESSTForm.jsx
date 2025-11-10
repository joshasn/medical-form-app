import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const Section = ({ title, sectionKey, expandedSections, toggleSection, children }) => (
  <div className="mb-4 border border-gray-300 rounded-lg overflow-hidden bg-white shadow-sm">
    <button
      onClick={() => toggleSection(sectionKey)}
      className="w-full flex items-center justify-between p-4 bg-blue-600 text-white hover:bg-blue-700 transition-colors"
    >
      <span className="font-semibold text-lg">{title}</span>
      {expandedSections[sectionKey] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
    </button>
    {expandedSections[sectionKey] && (
      <div className="p-6">
        {children}
      </div>
    )}
  </div>
);

const InputField = ({ label, field, formData, handleInputChange, type = "text", placeholder = "" }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label}
    </label>
    <input
      type={type}
      value={formData[field] || ''}
      onChange={(e) => handleInputChange(field, e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  </div>
);

const TextAreaField = ({ label, field, formData, handleInputChange, rows = 4, placeholder = "" }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label}
    </label>
    <textarea
      value={formData[field] || ''}
      onChange={(e) => handleInputChange(field, e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  </div>
);

export { Section, InputField, TextAreaField };

