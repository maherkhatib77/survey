/**
 * Form Builder Pro - Common JavaScript (Public)
 * שכבת נתונים ציבורית - קריאת טפסים מפורסמים ושליחת תגובות
 */

const API_BASE = 'api';
let useAPI = null;

// ===== API Detection =====
async function checkAPI() {
  if (useAPI !== null) return useAPI;
  try {
    const res = await fetch(`${API_BASE}/forms.php?action=list-public`, { signal: AbortSignal.timeout(2000) });
    useAPI = res.ok;
  } catch { useAPI = false; }
  return useAPI;
}

// ===== LocalStorage Fallback =====
function getFormsLS() { return JSON.parse(localStorage.getItem('fb_forms') || '[]'); }
function getResponsesLS() { return JSON.parse(localStorage.getItem('fb_responses') || '[]'); }
function saveResponsesLS(r) { localStorage.setItem('fb_responses', JSON.stringify(r)); }

// ===== UUID =====
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

// ===== Public Forms API =====
async function fetchPublicForms() {
  if (await checkAPI()) {
    try {
      const r = await fetch(`${API_BASE}/forms.php?action=list-public`);
      const j = await r.json();
      if (j.success) return j.data;
    } catch(e) { console.warn('API fallback', e); }
  }
  // Fallback - רק טפסים מפורסמים
  return getFormsLS().filter(f => f.status === 'published').map(f => ({
    id: f.id,
    title: f.settings.title,
    description: f.settings.description || '',
    createdAt: f.createdAt,
    responseCount: f.responseCount || 0
  }));
}

async function fetchForm(id) {
  if (await checkAPI()) {
    try {
      const r = await fetch(`${API_BASE}/forms.php?action=get&id=${id}`);
      const j = await r.json();
      if (j.success) return j.data;
    } catch(e) { console.warn('API fallback', e); }
  }
  return getFormsLS().find(f => f.id === id) || null;
}

// ===== Submit Response (Public) =====
async function submitResponse(formId, data) {
  const response = {
    id: uuid(),
    formId,
    data,
    submittedAt: new Date().toISOString(),
    respondentInfo: { userAgent: navigator.userAgent }
  };
  
  if (await checkAPI()) {
    try {
      const r = await fetch(`${API_BASE}/responses.php?action=submit&formId=${formId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(response)
      });
      const j = await r.json();
      if (j.success) return j.data;
    } catch(e) { console.warn('API fallback', e); }
  }
  
  // Fallback
  const responses = getResponsesLS();
  responses.push(response);
  saveResponsesLS(responses);
  return response;
}

// ===== Calculations =====
function evaluateCalc(formula, values) {
  try {
    let f = formula;
    Object.entries(values).forEach(([k,v]) => {
      const n = typeof v === 'number' ? v : (parseFloat(v)||0);
      f = f.replace(new RegExp(`\\{${k}\\}`, 'g'), String(n));
    });
    const r = Function(`"use strict"; return (${f})`)();
    return typeof r === 'number' && !isNaN(r) ? r : 0;
  } catch { return 0; }
}

// ===== Conditional Logic =====
function checkLogic(logic, values) {
  if (!logic || !logic.conditions || !logic.conditions.length) return true;
  const results = logic.conditions.map(c => {
    const v = values[c.fieldId];
    switch(c.operator) {
      case 'equals': return v == c.value;
      case 'notEquals': return v != c.value;
      case 'contains': return String(v||'').includes(String(c.value));
      case 'greaterThan': return Number(v) > Number(c.value);
      case 'lessThan': return Number(v) < Number(c.value);
      case 'isEmpty': return !v || v === '';
      case 'isNotEmpty': return !!v && v !== '';
      default: return true;
    }
  });
  return logic.matchType === 'all' ? results.every(r=>r) : results.some(r=>r);
}

// ===== Validation =====
function validateField(field, value) {
  if (!field.validation) return null;
  for (const rule of field.validation) {
    switch(rule.type) {
      case 'required':
        if (!value || value === '' || (Array.isArray(value) && !value.length))
          return rule.message || 'שדה חובה';
        break;
      case 'min': if (Number(value) < rule.value) return rule.message; break;
      case 'max': if (Number(value) > rule.value) return rule.message; break;
      case 'minLength': if (String(value).length < rule.value) return rule.message; break;
      case 'maxLength': if (String(value).length > rule.value) return rule.message; break;
      case 'pattern': if (!new RegExp(rule.value).test(String(value))) return rule.message; break;
    }
  }
  return null;
}

// ===== Utility =====
function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('he-IL');
}

function formatDateTime(d) {
  return new Date(d).toLocaleString('he-IL');
}

// ===== Load Sample Data (for demo) =====
async function loadSampleData() {
  const forms = await fetchPublicForms();
  if (forms.length > 0) return;
  
  // Check if we have data in localStorage
  const allForms = getFormsLS();
  if (allForms.length > 0) return;

  // Create sample form in localStorage
  const sample = {
    id: 'sample-form-1',
    settings: {
      title: 'סקר שביעות רצון לקוחות',
      description: 'אנא מלא/י את הסקר הבא כדי לעזור לנו להשתפר',
      theme: { primaryColor: '#2563eb', backgroundColor: '#ffffff', fontFamily: 'Assistant, sans-serif' },
      submitMessage: 'תודה רבה על מילוי הסקר!', integrations: []
    },
    pages: [
      { id: uuid(), title: 'פרטים אישיים', fields: [
        { id:'f-name', type:'text', label:'שם מלא', required:true, width:'half', validation:[{type:'required',message:'יש להזין שם'}] },
        { id:'f-email', type:'email', label:'דוא"ל', required:true, width:'half', validation:[{type:'required',message:'יש להזין דוא"ל'},{type:'pattern',value:'^[^@]+@[^@]+\\.[^@]+$',message:'פורמט לא תקין'}] },
        { id:'f-phone', type:'phone', label:'טלפון', required:false, width:'half' },
        { id:'f-age', type:'number', label:'גיל', required:false, width:'half' }
      ]},
      { id: uuid(), title: 'שביעות רצון', fields: [
        { id:'f-rating', type:'rating', label:'דירוג כללי', required:true, options:[1,2,3,4,5].map(n=>({label:String(n),value:String(n)})) },
        { id:'f-recommend', type:'radio', label:'האם תמליץ/י?', required:true, options:[{label:'בהחלט כן',value:'yes'},{label:'אולי',value:'maybe'},{label:'לא',value:'no'}] },
        { id:'f-features', type:'checkbox', label:'תכונות שאהבת', required:false, options:[{label:'ממשק',value:'ui'},{label:'מהירות',value:'speed'},{label:'אמינות',value:'rel'},{label:'תמיכה',value:'sup'},{label:'מחיר',value:'price'}] },
        { id:'f-comments', type:'textarea', label:'הערות', required:false, placeholder:'כתוב/י כאן...' }
      ]},
      { id: uuid(), title: 'חתימה', fields: [
        { id:'f-sig', type:'signature', label:'חתימה דיגיטלית', required:true, helpText:'חתום/י באמצעות העכבר או האצבע' }
      ]}
    ],
    status: 'published',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    responseCount: 5
  };

  localStorage.setItem('fb_forms', JSON.stringify([sample]));
}
