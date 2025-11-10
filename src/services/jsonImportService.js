// JSON Import Service
// Handles importing and mapping JSON data to form fields

export class JSONImportService {
  /**
   * Import JSON file
   */
  static async importJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          resolve(data);
        } catch (error) {
          reject(new Error('Invalid JSON format'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  /**
   * Map JSON data to form fields using fuzzy matching
   */
  static mapJSONToFields(jsonData, fieldNames) {
    const mappedData = {};
    const unmappedKeys = [];

    // Flatten nested JSON
    const flatData = this.flattenJSON(jsonData);

    // Try to match each JSON key to form fields
    Object.keys(flatData).forEach(jsonKey => {
      const matchedField = this.findMatchingField(jsonKey, fieldNames);
      if (matchedField) {
        mappedData[matchedField] = flatData[jsonKey];
      } else {
        unmappedKeys.push(jsonKey);
      }
    });

    return {
      mapped: mappedData,
      unmapped: unmappedKeys,
      originalData: jsonData
    };
  }

  /**
   * Flatten nested JSON object
   */
  static flattenJSON(obj, prefix = '') {
    const flattened = {};

    Object.keys(obj).forEach(key => {
      const value = obj[key];
      const newKey = prefix ? `${prefix}_${key}` : key;

      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        // Recursively flatten nested objects
        Object.assign(flattened, this.flattenJSON(value, newKey));
      } else {
        flattened[newKey] = value;
      }
    });

    return flattened;
  }

  /**
   * Find matching form field using fuzzy matching
   */
  static findMatchingField(jsonKey, fieldNames) {
    const normalizedKey = this.normalizeKey(jsonKey);

    // Try exact match first
    if (fieldNames.includes(jsonKey)) {
      return jsonKey;
    }

    // Try normalized match
    const match = fieldNames.find(field => 
      this.normalizeKey(field) === normalizedKey
    );
    if (match) return match;

    // Try partial match
    const partialMatch = fieldNames.find(field => {
      const normalizedField = this.normalizeKey(field);
      return normalizedField.includes(normalizedKey) || 
             normalizedKey.includes(normalizedField);
    });

    return partialMatch || null;
  }

  /**
   * Normalize key for matching (remove special chars, lowercase, etc.)
   */
  static normalizeKey(key) {
    return key
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }

  /**
   * Generate mapping preview for user review
   */
  static generateMappingPreview(mappedData, fieldNames) {
    return Object.keys(mappedData).map(fieldName => ({
      field: fieldName,
      value: mappedData[fieldName],
      label: this.humanizeFieldName(fieldName)
    }));
  }

  /**
   * Convert camelCase/snake_case to human readable
   */
  static humanizeFieldName(fieldName) {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .trim();
  }

  /**
   * Validate mapped data
   */
  static validateMappedData(mappedData) {
    const errors = [];
    
    Object.keys(mappedData).forEach(field => {
      const value = mappedData[field];
      
      // Check for null/undefined
      if (value === null || value === undefined) {
        errors.push(`${field}: Empty value`);
      }
      
      // Date validation
      if (field.toLowerCase().includes('date') && value) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(value)) {
          errors.push(`${field}: Invalid date format (expected YYYY-MM-DD)`);
        }
      }
      
      // Phone validation
      if (field.toLowerCase().includes('telephone') || field.toLowerCase().includes('phone')) {
        if (value && !/^[\d\s\-\(\)]+$/.test(value)) {
          errors.push(`${field}: Invalid phone number format`);
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }
}

