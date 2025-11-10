import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// Helper function to generate copy-paste ready fieldPositions code
const generateFieldPositionsCode = (fieldInfo) => {
  const fieldsWithPositions = fieldInfo.filter(f => f.position);
  
  if (fieldsWithPositions.length === 0) {
    console.log('⚠️  No fields with positions found. This PDF may not have form fields.');
    return;
  }
  
  console.log('\n✨ COPY-PASTE READY CODE ✨');
  console.log('========================================');
  console.log('const fieldPositions = {');
  
  fieldsWithPositions.forEach((field, index) => {
    const pos = field.position;
    const comma = index < fieldsWithPositions.length - 1 ? ',' : '';
    console.log(`  ${field.name}: { page: ${pos.page}, x: ${pos.x}, y: ${pos.y}, width: ${pos.width}, height: ${pos.height} }${comma}`);
  });
  
  console.log('};');
  console.log('========================================');
  console.log(`✅ Found ${fieldsWithPositions.length} fields with positions`);
  console.log('📋 Copy the code above and paste it into your InteractivePDFForm.jsx');
  console.log('========================================\n');
};

// Detect and list all form fields in the PDF with their positions
export const detectPdfFields = async (pdfBytes) => {
  try {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    const pages = pdfDoc.getPages();
    
    const fieldInfo = fields.map(field => {
      const fieldName = field.getName();
      const fieldType = field.constructor.name;
      let position = null;
      
      // Try to get field widget annotations and positions
      try {
        const widgets = field.acroField.getWidgets();
        if (widgets && widgets.length > 0) {
          const widget = widgets[0];
          const rect = widget.getRectangle();
          
          // Find which page this field is on
          let pageNum = 0;
          for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            const pageAnnots = page.node.Annots();
            if (pageAnnots) {
              const annots = pageAnnots.asArray();
              for (const annot of annots) {
                if (annot === widget.dict) {
                  pageNum = i + 1;
                  break;
                }
              }
            }
            if (pageNum > 0) break;
          }
          
          // Get page height for coordinate conversion
          const pageHeight = pages[pageNum - 1]?.getHeight() || 792;
          
          position = {
            page: pageNum || 1,
            x: Math.round(rect.x),
            y: Math.round(pageHeight - rect.y - rect.height), // Convert from PDF coords (bottom-left) to top-left
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          };
        }
      } catch (e) {
        // Field doesn't have position info
      }
      
      return {
        name: fieldName,
        type: fieldType,
        position: position
      };
    });
    
    console.log('========================================');
    console.log('PDF FORM FIELDS WITH POSITIONS:');
    console.log('========================================');
    fieldInfo.forEach(field => {
      if (field.position) {
        console.log(`${field.name}:`);
        console.log(`  Type: ${field.type}`);
        console.log(`  Position: { page: ${field.position.page}, x: ${field.position.x}, y: ${field.position.y}, width: ${field.position.width}, height: ${field.position.height} }`);
      } else {
        console.log(`${field.name}: Type: ${field.type} (no position info)`);
      }
    });
    console.log('========================================');
    
    // Generate copy-paste ready fieldPositions object
    generateFieldPositionsCode(fieldInfo);
    
    return fieldInfo;
  } catch (error) {
    console.error('Error detecting PDF fields:', error);
    return [];
  }
};

// Helper function to normalize text for WinAnsi encoding
// Converts Unicode characters to their closest WinAnsi equivalents
const normalizeTextForWinAnsi = (text) => {
  if (!text || typeof text !== 'string') return text;
  
  // Replace common problematic Unicode characters with WinAnsi equivalents
  const replacements = {
    // Combining diacritical marks
    '\u0300': '',  // Combining grave accent
    '\u0301': '',  // Combining acute accent
    '\u0302': '',  // Combining circumflex
    '\u0303': '',  // Combining tilde
    '\u0308': '',  // Combining diaeresis
    '\u0327': '',  // Combining cedilla
    
    // Precomposed accented characters (should work but normalize just in case)
    'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a', 'å': 'a',
    'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e',
    'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i',
    'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o',
    'ù': 'u', 'ú': 'u', 'û': 'u', 'ü': 'u',
    'ý': 'y', 'ÿ': 'y',
    'ç': 'c',
    'À': 'A', 'Á': 'A', 'Â': 'A', 'Ã': 'A', 'Ä': 'A', 'Å': 'A',
    'È': 'E', 'É': 'E', 'Ê': 'E', 'Ë': 'E',
    'Ì': 'I', 'Í': 'I', 'Î': 'I', 'Ï': 'I',
    'Ò': 'O', 'Ó': 'O', 'Ô': 'O', 'Õ': 'O', 'Ö': 'O',
    'Ù': 'U', 'Ú': 'U', 'Û': 'U', 'Ü': 'U',
    'Ý': 'Y',
    'Ç': 'C',
    
    // Other special characters
    'œ': 'oe', 'Œ': 'OE',
    'æ': 'ae', 'Æ': 'AE',
    '«': '"', '»': '"',
    '–': '-', '—': '-',
    '…': '...',
  };
  
  // First, normalize combining marks by removing them
  let normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Then replace remaining problematic characters
  Object.keys(replacements).forEach(char => {
    normalized = normalized.replace(new RegExp(char, 'g'), replacements[char]);
  });
  
  // Remove any remaining non-printable or problematic characters
  normalized = normalized.replace(/[^\x20-\x7E\u00A0-\u00FF]/g, '');
  
  return normalized;
};

// Fill PDF form fields with data
export const fillPdfForm = async (pdfBytes, formData, moduleData = null, selectedModules = null, shouldFlatten = false) => {
  try {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    
    const pdfFieldNames = fields.map(f => f.getName());
    console.log('📋 Available PDF fields:', pdfFieldNames);
    console.log('📄 Form data keys to fill:', Object.keys(formData).filter(k => formData[k] && formData[k] !== ''));
    
    let filledCount = 0;
    const failedFields = [];
    
    // Fill fields directly using formData keys (should match PDF field names from auto-detection)
    Object.keys(formData).forEach(fieldName => {
      const value = formData[fieldName];
      if (!value || value === '') return; // Skip empty values
      
      try {
        // First try exact match with PDF field name
        let field = form.getFieldMaybe(fieldName);
        let matchedFieldName = fieldName;
        
        // If not found, try case-insensitive match
        if (!field) {
          matchedFieldName = pdfFieldNames.find(name => 
            name.toLowerCase() === fieldName.toLowerCase()
          );
          if (matchedFieldName) {
            field = form.getField(matchedFieldName);
          }
        }
        
        // If still not found, try partial/fuzzy matching for common patterns
        if (!field) {
          // Try to find field that contains the key part of the field name
          const fieldNameParts = fieldName.toLowerCase().replace(/[0-9]/g, '').split(/(?=[A-Z])|_|-/).filter(p => p.length > 2);
          matchedFieldName = pdfFieldNames.find(name => {
            const nameLower = name.toLowerCase();
            return fieldNameParts.some(part => nameLower.includes(part) || part.includes(nameLower));
          });
          if (matchedFieldName) {
            try {
              field = form.getField(matchedFieldName);
            } catch (e) {
              // Field might not exist, continue
            }
          }
        }
        
        if (field) {
          const fieldType = field.constructor.name;
          
          if (fieldType === 'PDFTextField') {
            // Normalize text to handle encoding issues
            const normalizedValue = normalizeTextForWinAnsi(String(value));
            try {
              field.setText(normalizedValue);
              filledCount++;
              console.log(`✅ Filled text field: ${fieldName} = "${normalizedValue}"`);
            } catch (encodingError) {
              // If encoding still fails, try without special characters
              const safeValue = String(value).replace(/[^\x20-\x7E\u00A0-\u00FF]/g, '');
              field.setText(safeValue);
              filledCount++;
              console.log(`✅ Filled text field (sanitized): ${fieldName} = "${safeValue}"`);
              console.warn(`⚠️ Encoding issue resolved for ${fieldName}, some characters may have been removed`);
            }
          } else if (fieldType === 'PDFCheckBox') {
            if (value === 'Yes' || value === true || value === 'true' || value === '1' || value === 'yes') {
              field.check();
            } else {
              field.uncheck();
            }
            filledCount++;
            console.log(`✅ Filled checkbox: ${fieldName} = ${value}`);
          } else if (fieldType === 'PDFRadioGroup') {
            const normalizedValue = normalizeTextForWinAnsi(String(value));
            field.select(normalizedValue);
            filledCount++;
            console.log(`✅ Filled radio: ${fieldName} = ${normalizedValue}`);
          } else if (fieldType === 'PDFDropdown') {
            const normalizedValue = normalizeTextForWinAnsi(String(value));
            field.select(normalizedValue);
            filledCount++;
            console.log(`✅ Filled dropdown: ${fieldName} = ${normalizedValue}`);
          } else {
            console.log(`⚠️ Field "${fieldName}" has unsupported type: ${fieldType}`);
            failedFields.push(fieldName);
          }
        } else {
          console.log(`⚠️ Field not found in PDF: ${fieldName}`);
          failedFields.push(fieldName);
        }
      } catch (fieldError) {
        console.error(`❌ Error filling field "${fieldName}":`, fieldError);
        
        // Try to recover from encoding errors
        if (fieldError.message && fieldError.message.includes('WinAnsi')) {
          try {
            const field = form.getFieldMaybe(fieldName);
            if (field && field.constructor.name === 'PDFTextField') {
              const safeValue = String(formData[fieldName]).replace(/[^\x20-\x7E\u00A0-\u00FF]/g, '');
              field.setText(safeValue);
              filledCount++;
              console.log(`✅ Recovered: Filled text field (sanitized): ${fieldName}`);
            }
          } catch (recoveryError) {
            failedFields.push(fieldName);
          }
        } else {
          failedFields.push(fieldName);
        }
      }
    });
    
    console.log(`\n✅ Successfully filled ${filledCount} out of ${Object.keys(formData).filter(k => formData[k] && formData[k] !== '').length} fields`);
    if (failedFields.length > 0) {
      console.log(`⚠️ Failed to fill ${failedFields.length} fields:`, failedFields);
    }
    
    // Table generation removed - PDF fields are filled directly without drawing tables
    
    // Flatten the form only if requested (for downloads, not for viewing)
    if (shouldFlatten) {
      form.flatten();
      console.log('✅ PDF flattened (form fields converted to static text)');
    }
    
    const pdfBytes_filled = await pdfDoc.save();
    return pdfBytes_filled;
    
  } catch (error) {
    console.error('Error filling PDF:', error);
    throw error;
  }
};

/**
 * Draw a table on a PDF page
 * @param {PDFPage} page - The PDF page to draw on
 * @param {Object} options - Table configuration
 * @param {number} options.x - X position (left)
 * @param {number} options.y - Y position (top, PDF coordinates)
 * @param {number} options.width - Table width
 * @param {Array} options.headers - Array of header strings
 * @param {Array} options.rows - Array of row arrays (each row is an array of cell strings)
 * @param {number} options.rowHeight - Height of each row (default: 20)
 * @param {number} options.headerHeight - Height of header row (default: 25)
 * @param {number} options.fontSize - Font size (default: 10)
 */
export const drawTable = async (page, options) => {
  const {
    x,
    y,
    width,
    headers,
    rows,
    rowHeight = 20,
    headerHeight = 25,
    fontSize = 10,
  } = options;

  if (!headers || headers.length === 0) return;

  const pdfDoc = page.doc;
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pageHeight = page.getHeight();
  
  // Convert Y from top-left to bottom-left coordinates
  const startY = pageHeight - y;
  
  // Calculate column widths (equal width for now)
  const colWidth = width / headers.length;
  const tableHeight = headerHeight + (rows.length * rowHeight);
  
  // Draw header background
  page.drawRectangle({
    x,
    y: startY - headerHeight,
    width,
    height: headerHeight,
    color: rgb(0.9, 0.9, 0.9), // Light gray background
  });
  
  // Draw header text and borders
  headers.forEach((header, colIndex) => {
    const cellX = x + (colIndex * colWidth);
    
    // Draw header text
    page.drawText(String(header || ''), {
      x: cellX + 5,
      y: startY - headerHeight + 5,
      size: fontSize,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    
    // Draw vertical border
    if (colIndex > 0) {
      page.drawLine({
        start: { x: cellX, y: startY },
        end: { x: cellX, y: startY - tableHeight },
        thickness: 1,
        color: rgb(0, 0, 0),
      });
    }
  });
  
  // Draw horizontal border below header
  page.drawLine({
    start: { x, y: startY - headerHeight },
    end: { x: x + width, y: startY - headerHeight },
    thickness: 1,
    color: rgb(0, 0, 0),
  });
  
  // Draw rows
  rows.forEach((row, rowIndex) => {
    const rowY = startY - headerHeight - ((rowIndex + 1) * rowHeight);
    
    // Draw row background (alternating colors)
    if (rowIndex % 2 === 0) {
      page.drawRectangle({
        x,
        y: rowY,
        width,
        height: rowHeight,
        color: rgb(1, 1, 1), // White
      });
    } else {
      page.drawRectangle({
        x,
        y: rowY,
        width,
        height: rowHeight,
        color: rgb(0.98, 0.98, 0.98), // Very light gray
      });
    }
    
    // Draw row cells
    headers.forEach((header, colIndex) => {
      const cellX = x + (colIndex * colWidth);
      const cellValue = row[colIndex] !== undefined ? String(row[colIndex] || '') : '';
      
      // Draw cell text (truncate if too long)
      const maxTextWidth = colWidth - 10;
      let displayText = cellValue;
      if (font.widthOfTextAtSize(displayText, fontSize) > maxTextWidth) {
        // Truncate text to fit
        while (font.widthOfTextAtSize(displayText + '...', fontSize) > maxTextWidth && displayText.length > 0) {
          displayText = displayText.slice(0, -1);
        }
        displayText += '...';
      }
      
      page.drawText(displayText, {
        x: cellX + 5,
        y: rowY + 5,
        size: fontSize,
        font: font,
        color: rgb(0, 0, 0),
      });
      
      // Draw vertical border
      if (colIndex > 0) {
        page.drawLine({
          start: { x: cellX, y: rowY + rowHeight },
          end: { x: cellX, y: rowY },
          thickness: 1,
          color: rgb(0, 0, 0),
        });
      }
    });
    
    // Draw horizontal border below row
    page.drawLine({
      start: { x, y: rowY },
      end: { x: x + width, y: rowY },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
  });
  
  // Draw outer border
  page.drawRectangle({
    x,
    y: startY - tableHeight,
    width,
    height: tableHeight,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });
};

export const downloadPdf = (pdfBytes, filename) => {
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};