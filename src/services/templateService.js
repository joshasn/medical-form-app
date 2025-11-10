// Template Management Service
// Handles saving, loading, and managing field position templates

export class TemplateService {
  static STORAGE_KEY = 'pdf_form_templates';

  /**
   * Save a template to localStorage
   */
  static saveTemplate(template) {
    try {
      const templates = this.getAllTemplates();
      
      // Generate ID if not provided
      if (!template.id) {
        template.id = this.generateTemplateId();
      }
      
      // Add metadata
      template.createdAt = template.createdAt || new Date().toISOString();
      template.updatedAt = new Date().toISOString();
      
      // Check if template exists, update or add
      const existingIndex = templates.findIndex(t => t.id === template.id);
      if (existingIndex >= 0) {
        templates[existingIndex] = template;
      } else {
        templates.push(template);
      }
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(templates));
      console.log('Template saved:', template.name);
      return template;
    } catch (error) {
      console.error('Error saving template:', error);
      throw error;
    }
  }

  /**
   * Get all templates
   */
  static getAllTemplates() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading templates:', error);
      return [];
    }
  }

  /**
   * Get template by ID
   */
  static getTemplate(id) {
    const templates = this.getAllTemplates();
    return templates.find(t => t.id === id);
  }

  /**
   * Delete template
   */
  static deleteTemplate(id) {
    try {
      const templates = this.getAllTemplates();
      const filtered = templates.filter(t => t.id !== id);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
      console.log('Template deleted:', id);
      return true;
    } catch (error) {
      console.error('Error deleting template:', error);
      return false;
    }
  }

  /**
   * Export template as JSON file
   */
  static exportTemplate(template) {
    const dataStr = JSON.stringify(template, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${template.name.replace(/\s+/g, '-')}-template.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Import template from JSON file
   */
  static async importTemplate(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const template = JSON.parse(e.target.result);
          // Validate template structure
          if (!template.name || !template.fields) {
            throw new Error('Invalid template format');
          }
          resolve(template);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  /**
   * Generate unique template ID
   */
  static generateTemplateId() {
    return `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create template from current state
   */
  static createTemplate(name, description, fieldPositions, pdfName = '') {
    return {
      id: this.generateTemplateId(),
      name: name,
      description: description || '',
      pdfName: pdfName,
      fields: fieldPositions,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
}

