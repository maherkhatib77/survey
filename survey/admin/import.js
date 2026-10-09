/**
 * Import - ייבוא סקר מקובץ Word/PDF
 */
const API = '../api';
let extractedContent = '';
let detectedFields = [];

// ===== Auth =====
async function checkAuth() {
  try {
    const res = await fetch(`${API}/auth.php?action=check`);
    const json = await res.json();
    if (!json.loggedIn) { window.location.href = 'login.html'; return false; }
    return true;
  } catch(e) { window.location.href = 'login.html'; return false; }
}

async function logout() {
  await fetch(`${API}/auth.php?action=logout`, { method: 'POST' });
  window.location.href = 'login.html';
}

// ===== File Handling =====
function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file) processFile(file);
}

// Drag & Drop
const uploadArea = document.getElementById('uploadArea');
uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.classList.add('dragover');
});
uploadArea.addEventListener('dragleave', () => {
  uploadArea.classList.remove('dragover');
});
uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file) processFile(file);
});

async function processFile(file) {
  const fileName = file.name.toLowerCase();
  
  // Validate file type
  if (!fileName.endsWith('.pdf') && !fileName.endsWith('.docx') && !fileName.endsWith('.json')) {
    alert('אנא בחר קובץ PDF, Word (.docx) או JSON');
    return;
  }

  // Show processing
  document.getElementById('uploadArea').style.display = 'none';
  document.getElementById('processingSection').style.display = 'block';

  try {
    if (fileName.endsWith('.pdf')) {
      extractedContent = await extractPDF(file);
      // Analyze content
      detectedFields = analyzeContent(extractedContent);
      // Show preview
      showPreview(file.name);
    } else if (fileName.endsWith('.docx')) {
      extractedContent = await extractWord(file);
      // Analyze content
      detectedFields = analyzeContent(extractedContent);
      // Show preview
      showPreview(file.name);
    } else if (fileName.endsWith('.json')) {
      await importJSON(file);
    }
  } catch (error) {
    console.error('Error processing file:', error);
    alert('שגיאה בקריאת הקובץ: ' + error.message);
    reset();
  }
}

// ===== PDF Extraction =====
async function extractPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    fullText += pageText + '\n\n';
  }
  
  return fullText;
}

// ===== Word Extraction =====
async function extractWord(file) {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

// ===== JSON Import =====
async function importJSON(file) {
  const text = await file.text();
  const jsonData = JSON.parse(text);
  
  // בדוק אם זה מבנה של טופס שלם או רק שדות
  if (jsonData.settings && jsonData.pages) {
    // זהו טופס שלם - ייבא ישירות
    const formTitle = jsonData.settings.title || file.name.replace('.json', '');
    const formDescription = jsonData.settings.description || '';
    
    // שמור את הטופס
    const form = {
      settings: {
        title: formTitle,
        description: formDescription,
        theme: jsonData.settings.theme || {
          primaryColor: '#2563eb',
          backgroundColor: '#ffffff',
          fontFamily: 'Assistant, sans-serif'
        },
        submitMessage: jsonData.settings.submitMessage || 'תודה! הטופס נשלח בהצלחה.',
        integrations: jsonData.settings.integrations || []
      },
      pages: jsonData.pages,
      status: 'draft',
      responseCount: 0
    };
    
    const res = await fetch(`${API}/forms.php?action=create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    
    const result = await res.json();
    
    if (result.success) {
      alert(`✅ הסקר "${formTitle}" יובא בהצלחה עם ${jsonData.pages.reduce((sum, p) => sum + p.fields.length, 0)} שדות!`);
      window.location.href = `builder.html?id=${result.data.id}`;
    } else {
      throw new Error(result.error || 'שגיאה בשמירת הסקר');
    }
  } else if (Array.isArray(jsonData)) {
    // זהו מערך של שדות - הצג לתצוגה מקדימה
    detectedFields = jsonData.map(field => ({
      type: field.type || 'text',
      label: field.label || 'שדה ללא כותרת',
      required: field.required || false,
      options: field.options || [],
      validation: field.validation || [],
      conditionalLogic: field.conditionalLogic || null,
      calculation: field.calculation || null,
      width: field.width || 'full',
      helpText: field.helpText || '',
      placeholder: field.placeholder || ''
    }));
    
    showPreview(file.name);
  } else {
    throw new Error('מבנה JSON לא תקין. הקובץ צריך להכיל settings ו-pages או מערך של שדות.');
  }
}

// ===== Content Analysis =====
function analyzeContent(content) {
  const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const fields = [];
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    
    // Skip empty lines
    if (!line || line.length < 3) {
      i++;
      continue;
    }

    // Detect field type
    const field = detectFieldType(line, lines, i);
    if (field) {
      fields.push(field);
      i += field.linesConsumed || 1;
    } else {
      i++;
    }
  }
  
  return fields;
}

function detectFieldType(line, lines, index) {
  // Check for rating (1-5, 1-10, stars)
  if (/^(דירוג|rating|ציון|score).*\b([1-5]|10)\b/i.test(line) || 
      /^\s*[⭐★☆]+\s*$/i.test(line) ||
      /\b(1\s*2\s*3\s*4\s*5|1\s*2\s*3\s*4\s*5\s*6\s*7\s*8\s*9\s*10)\b/.test(line)) {
    return {
      type: 'rating',
      label: cleanLabel(line),
      options: [1,2,3,4,5].map(n => ({ label: String(n), value: String(n) })),
      required: isRequired(line),
      linesConsumed: 1
    };
  }

  // Check for multiple choice (a, b, c / 1, 2, 3 / bullets)
  const nextLines = lines.slice(index + 1, index + 10);
  const options = extractOptions(nextLines);
  
  if (options.length >= 2) {
    // Check if it's radio (single choice) or checkbox (multiple choice)
    const isMultiple = /בחר.*הכל|multiple|multi|כמה|מספר/i.test(line);
    
    return {
      type: isMultiple ? 'checkbox' : 'radio',
      label: cleanLabel(line),
      options: options,
      required: isRequired(line),
      linesConsumed: options.length + 1
    };
  }

  // Check for yes/no question
  if (/^(האם|האם אתה|האם את|do you|are you|would you)/i.test(line) ||
      /\?/.test(line)) {
    return {
      type: 'radio',
      label: cleanLabel(line),
      options: [
        { label: 'כן', value: 'yes' },
        { label: 'לא', value: 'no' }
      ],
      required: isRequired(line),
      linesConsumed: 1
    };
  }

  // Check for date field
  if (/תאריך|date|יום|month|שנה/i.test(line)) {
    return {
      type: 'date',
      label: cleanLabel(line),
      required: isRequired(line),
      linesConsumed: 1
    };
  }

  // Check for email
  if (/אימייל|email|דוא"ל|כתובת.*דואר/i.test(line)) {
    return {
      type: 'email',
      label: cleanLabel(line),
      required: isRequired(line),
      linesConsumed: 1
    };
  }

  // Check for phone
  if (/טלפון|phone|נייד|סלולרי|tel/i.test(line)) {
    return {
      type: 'phone',
      label: cleanLabel(line),
      required: isRequired(line),
      linesConsumed: 1
    };
  }

  // Check for number
  if (/גיל|age|מספר|number|כמות|quantity/i.test(line)) {
    return {
      type: 'number',
      label: cleanLabel(line),
      required: isRequired(line),
      linesConsumed: 1
    };
  }

  // Check for long text (textarea)
  if (/הסבר|explain|describe|תאר|פרט|details|comments|הערות/i.test(line) ||
      line.length > 50) {
    return {
      type: 'textarea',
      label: cleanLabel(line),
      required: isRequired(line),
      linesConsumed: 1
    };
  }

  // Default to text field if it looks like a question
  if (/\?/.test(line) || /^(מה|שם|פרט|כתוב|הזן|fill|enter|name)/i.test(line)) {
    return {
      type: 'text',
      label: cleanLabel(line),
      required: isRequired(line),
      linesConsumed: 1
    };
  }

  return null;
}

function extractOptions(lines) {
  const options = [];
  const patterns = [
    /^[\s]*([a-z])[\.\)]\s+(.+)/i,           // a) option / a. option
    /^[\s]*(\d+)[\.\)]\s+(.+)/,              // 1) option / 1. option
    /^[\s]*[•\-\*]\s+(.+)/,                   // • option / - option / * option
    /^[\s]*(א|ב|ג|ד|ה|ו|ז|ח|ט)[\.\)]\s+(.+)/ // א) option / א. option
  ];

  for (const line of lines) {
    if (!line || line.length < 2) break;
    
    let matched = false;
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        const optionText = match[2] || match[1];
        if (optionText && optionText.length > 1) {
          options.push({
            label: optionText.trim(),
            value: optionText.trim().toLowerCase().replace(/\s+/g, '_')
          });
          matched = true;
          break;
        }
      }
    }
    
    if (!matched) break; // Stop if line doesn't match any pattern
  }

  return options;
}

function cleanLabel(line) {
  // Remove question marks, numbers, bullets
  return line
    .replace(/^[\s]*[\d]+\.[\s]*/, '')
    .replace(/^[\s]*[•\-\*][\s]*/, '')
    .replace(/\?/g, '')
    .replace(/[\*]+/g, '')
    .trim();
}

function isRequired(line) {
  return /[\*]|חובה|required|mandatory/i.test(line);
}

// ===== Preview =====
function showPreview(fileName) {
  document.getElementById('processingSection').style.display = 'none';
  document.getElementById('previewSection').style.display = 'block';

  // Set title from filename
  const title = fileName.replace(/\.(pdf|docx|json)$/i, '').replace(/[_-]/g, ' ');
  document.getElementById('formTitle').value = title;

  // Render detected fields
  const container = document.getElementById('detectedFields');
  if (detectedFields.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:40px;background:var(--slate-50);border-radius:12px;">
        <div style="font-size:48px;margin-bottom:16px;">🤔</div>
        <h3>לא זוהו שדות</h3>
        <p style="color:var(--slate-500);margin-top:8px;">הקובץ לא הכיל מבנה טופס ברור. אנא צור את הטופס ידנית.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = detectedFields.map((field, idx) => {
    const typeLabels = {
      text: '📝 טקסט',
      textarea: '📄 טקסט ארוך',
      number: '🔢 מספר',
      email: '📧 דוא"ל',
      phone: '📱 טלפון',
      date: '📅 תאריך',
      select: '📋 רשימה',
      radio: '🔘 בחירה יחידה',
      checkbox: '☑️ בחירה מרובה',
      rating: '⭐ דירוג',
      file: '📎 העלאת קובץ',
      signature: '✍️ חתימה',
      calculation: '🧮 חישוב',
      richtext: '📝 עורך טקסט',
      divider: '➖ קו הפרדה',
      heading: '🔤 כותרת',
      record: '🗄️ רשומה ממאגר',
      matrix: '📊 מטריצה'
    };

    let html = `
      <div class="detected-field">
        <div class="field-header">
          <div>
            <input type="text" value="${esc(field.label)}" 
                   onchange="detectedFields[${idx}].label=this.value"
                   style="font-size:16px;font-weight:600;border:none;background:transparent;width:100%;padding:4px 0;">
          </div>
          <span class="field-type-badge">${typeLabels[field.type] || field.type}</span>
        </div>
        
        <div style="display:flex;gap:16px;margin-top:12px;">
          <label class="checkbox-label">
            <input type="checkbox" ${field.required ? 'checked' : ''} 
                   onchange="detectedFields[${idx}].required=this.checked">
            <span>שדה חובה</span>
          </label>
          <select onchange="changeFieldType(${idx}, this.value)" style="padding:4px 8px;border-radius:6px;border:1px solid var(--slate-300);">
            <option value="text" ${field.type === 'text' ? 'selected' : ''}>טקסט</option>
            <option value="textarea" ${field.type === 'textarea' ? 'selected' : ''}>טקסט ארוך</option>
            <option value="number" ${field.type === 'number' ? 'selected' : ''}>מספר</option>
            <option value="email" ${field.type === 'email' ? 'selected' : ''}>דוא"ל</option>
            <option value="phone" ${field.type === 'phone' ? 'selected' : ''}>טלפון</option>
            <option value="date" ${field.type === 'date' ? 'selected' : ''}>תאריך</option>
            <option value="select" ${field.type === 'select' ? 'selected' : ''}>רשימה</option>
            <option value="radio" ${field.type === 'radio' ? 'selected' : ''}>בחירה יחידה</option>
            <option value="checkbox" ${field.type === 'checkbox' ? 'selected' : ''}>בחירה מרובה</option>
            <option value="rating" ${field.type === 'rating' ? 'selected' : ''}>דירוג</option>
            <option value="file" ${field.type === 'file' ? 'selected' : ''}>העלאת קובץ</option>
            <option value="signature" ${field.type === 'signature' ? 'selected' : ''}>חתימה</option>
            <option value="calculation" ${field.type === 'calculation' ? 'selected' : ''}>חישוב</option>
            <option value="richtext" ${field.type === 'richtext' ? 'selected' : ''}>עורך טקסט</option>
            <option value="divider" ${field.type === 'divider' ? 'selected' : ''}>קו הפרדה</option>
            <option value="heading" ${field.type === 'heading' ? 'selected' : ''}>כותרת</option>
            <option value="record" ${field.type === 'record' ? 'selected' : ''}>רשומה ממאגר</option>
            <option value="matrix" ${field.type === 'matrix' ? 'selected' : ''}>מטריצה</option>
          </select>
        </div>
    `;

    // Show options for radio/checkbox/rating
    if (['radio', 'checkbox', 'rating'].includes(field.type) && field.options) {
      html += `<div class="options-list">`;
      field.options.forEach((opt, optIdx) => {
        html += `
          <div class="option-item" style="display:flex;gap:8px;align-items:center;">
            <input type="text" value="${esc(opt.label)}" 
                   onchange="detectedFields[${idx}].options[${optIdx}].label=this.value;detectedFields[${idx}].options[${optIdx}].value=this.value"
                   style="flex:1;border:none;background:transparent;">
            <button onclick="removeOption(${idx}, ${optIdx})" style="background:none;border:none;cursor:pointer;color:var(--danger);">✕</button>
          </div>
        `;
      });
      html += `
        <button onclick="addOption(${idx})" class="btn btn-sm btn-outline" style="margin-top:8px;">+ הוסף אפשרות</button>
      </div>`;
    }

    html += `</div>`;
    return html;
  }).join('');
}

function changeFieldType(idx, newType) {
  detectedFields[idx].type = newType;
  
  // Add default options for certain types
  if (['radio', 'checkbox', 'select'].includes(newType) && !detectedFields[idx].options) {
    detectedFields[idx].options = [
      { label: 'אפשרות 1', value: 'option1' },
      { label: 'אפשרות 2', value: 'option2' }
    ];
  } else if (newType === 'rating' && !detectedFields[idx].options) {
    detectedFields[idx].options = [1,2,3,4,5].map(n => ({ label: String(n), value: String(n) }));
  } else if (newType === 'matrix' && !detectedFields[idx].matrixRows) {
    detectedFields[idx].matrixRows = [
      { id: 'row1', label: 'שורה 1' },
      { id: 'row2', label: 'שורה 2' }
    ];
    detectedFields[idx].matrixColumns = [
      { id: 'col1', label: 'עמודה 1', value: 'col1' },
      { id: 'col2', label: 'עמודה 2', value: 'col2' }
    ];
    detectedFields[idx].matrixType = 'radio';
  }
  
  showPreview(document.getElementById('formTitle').value);
}

function addOption(fieldIdx) {
  if (!detectedFields[fieldIdx].options) detectedFields[fieldIdx].options = [];
  const num = detectedFields[fieldIdx].options.length + 1;
  detectedFields[fieldIdx].options.push({
    label: `אפשרות ${num}`,
    value: `option${num}`
  });
  showPreview(document.getElementById('formTitle').value);
}

function removeOption(fieldIdx, optIdx) {
  detectedFields[fieldIdx].options.splice(optIdx, 1);
  showPreview(document.getElementById('formTitle').value);
}

// ===== Save Form =====
async function saveForm() {
  const title = document.getElementById('formTitle').value.trim();
  if (!title) {
    alert('אנא הזן כותרת לסקר');
    return;
  }

  if (detectedFields.length === 0) {
    alert('לא זוהו שדות. אנא הוסף שדות ידנית או ייבא קובץ אחר.');
    return;
  }

  // Create form object
  const form = {
    settings: {
      title: title,
      description: document.getElementById('formDescription').value.trim(),
      theme: {
        primaryColor: '#2563eb',
        backgroundColor: '#ffffff',
        fontFamily: 'Assistant, sans-serif'
      },
      submitMessage: 'תודה! הטופס נשלח בהצלחה.',
      integrations: []
    },
    pages: [{
      id: uuid(),
      title: 'עמוד 1',
      fields: detectedFields.map(field => ({
        id: field.id || uuid(),
        type: field.type,
        label: field.label,
        required: field.required || false,
        options: field.options,
        validation: field.validation || [],
        conditionalLogic: field.conditionalLogic || null,
        calculation: field.calculation || null,
        width: field.width || 'full',
        helpText: field.helpText || '',
        placeholder: field.placeholder || '',
        enableOther: field.enableOther || false,
        otherLabel: field.otherLabel || '',
        matrixRows: field.matrixRows || null,
        matrixColumns: field.matrixColumns || null,
        matrixType: field.matrixType || 'radio',
        sourceId: field.sourceId || '',
        displayField: field.displayField || '',
        searchFields: field.searchFields || [],
        autoFill: field.autoFill || [],
        recordSelectionType: field.recordSelectionType || 'single',
        ratingScale: field.ratingScale || 5
      }))
    }],
    status: 'draft',
    responseCount: 0
  };

  try {
    const res = await fetch(`${API}/forms.php?action=create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    const json = await res.json();
    
    if (json.success) {
      alert('✅ הטופס נוצר בהצלחה!');
      window.location.href = `builder.html?id=${json.data.id}`;
    } else {
      alert('שגיאה בשמירת הטופס: ' + (json.error || 'לא ידוע'));
    }
  } catch (error) {
    alert('שגיאה בשמירת הטופס: ' + error.message);
  }
}

function reset() {
  extractedContent = '';
  detectedFields = [];
  document.getElementById('uploadArea').style.display = 'block';
  document.getElementById('processingSection').style.display = 'none';
  document.getElementById('previewSection').style.display = 'none';
  document.getElementById('fileInput').value = '';
}

// ===== Helpers =====
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function esc(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// Init
checkAuth();
