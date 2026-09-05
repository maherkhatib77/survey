/**
 * ============================================================================
 * מצפן נט - Main Application Logic (SPA)
 * ============================================================================
 */

// v2.5.0
const App = (() => {
    let currentSection = 'dashboard';
    let currentUser = null;
    let editingItem = null;
    let importWizardData = { type: null, headers: [], rows: [], mappings: {} };
    let _importTargetKey = null;
	
// 🔑 מבנה מרכזי להגדרת כל סוגי הייבוא - מונע טעויות סנכרון
const IMPORT_CONFIGS = {
    solutions: {
        fields: [
            { key: 'responsibilityType', label: 'סוג אחריות', keywords: ['אחריות', 'responsibility', 'סוג', 'פסגה', 'בית ספר'] },
            { key: 'schoolName', label: 'שם בית הספר', keywords: ['בית ספר', 'school', 'מוסד', 'שם'] },
            { key: 'solutionName', label: 'שם פתרון למידה', keywords: ['שם', 'פתרון', 'solution', 'name', 'כותרת'] },
            { key: 'solutionNumber', label: 'מספר פתרון למידה', keywords: ['מספר', 'number', 'קוד', 'מזהה'] },
            { key: 'description', label: 'תיאור פתרון למידה', keywords: ['תיאור', 'description', 'desc'] },
            { key: 'guideId', label: 'מדריך אחראי', keywords: ['מדריך', 'guide', 'אחראי', 'mentor'] },
            { key: 'domain', label: 'תחום', keywords: ['תחום', 'domain', 'field'] },
            { key: 'topic', label: 'נושא', keywords: ['נושא', 'topic', 'subject'] },
            { key: 'educationStage', label: 'שלב חינוך', keywords: ['שלב', 'חינוך', 'stage'] },
            { key: 'educationType', label: 'סוג חינוך', keywords: ['סוג', 'חינוך', 'type'] },
            { key: 'startDate', label: 'תאריך תחילת ההשתלמות', keywords: ['תחילה', 'start', 'התחלה', 'תאריך'] },
            { key: 'endDate', label: 'תאריך סיום ההשתלמות', keywords: ['סיום', 'end', 'תאריך'] },
            { key: 'weekDay', label: 'יום בשבוע', keywords: ['יום', 'שבוע', 'day', 'week'] },
            { key: 'meetingType', label: 'סוג מפגש', keywords: ['מפגש', 'meeting', 'סוג'] },
            { key: 'academicHours', label: 'שעות אקדמיות', keywords: ['שעות', 'hours', 'אקדמי', 'גמול'] },
            { key: 'instructors', label: 'מנחים', keywords: ['מנחה', 'instructor', 'מרצה'] },
            { key: 'whatsappLink', label: 'קישור וואטסאפ', keywords: ['וואטסאפ', 'whatsapp', 'קישור'] },
            { key: 'earlyRegistrationLink', label: 'קישור רישום מוקדם', keywords: ['רישום', 'registration', 'מוקדם', 'קישור'] },
            { key: 'showInCatalog', label: 'הצג בקטלוג הציבורי', keywords: ['הצג', 'show', 'קטלוג', 'ציבורי', 'public'] },
            { key: 'generalNote', label: 'הערה כללית', keywords: ['הערה', 'note', 'כללי'] }
        ]
    },

    mentors: {
        fields: [
            { key: 'idNumber', label: 'ת.ז. / מספר זהות', keywords: ['תז', 'זהות', 'id', 'מספר', 'עמית'] },
            { key: 'fullNameHe', label: 'שם מלא (עברית)', keywords: ['שם', 'עברי', 'hebrew', 'name', 'פרטי'] },
            { key: 'fullNameAr', label: 'שם מלא (ערבית)', keywords: ['ערבי', 'arabic', 'اسم', 'عربي'] },
            { key: 'phone', label: 'טלפון', keywords: ['טלפון', 'נייד', 'phone', 'mobile', 'סלולרי'] },
            { key: 'email', label: 'דוא"ל', keywords: ['דואל', 'email', 'mail', 'אימייל'] },
            { key: 'isCertifiedLecturer', label: 'מרצה מוסב', keywords: ['מוסב', 'certified', 'הסבה'] },
            { key: 'expertInField', label: 'מומחה בתחומו', keywords: ['מומחה', 'expert', 'תחום'] },
            { key: 'lecturerStatus', label: 'סטטוס מרצה', keywords: ['סטטוס', 'status', 'מצב'] }
        ]
    },
    guides_repo: {
        fields: [
            { key: 'idNumber', label: 'ת.ז. / מספר זהות', keywords: ['תז', 'זהות', 'id', 'מספר'] },
            { key: 'fullName', label: 'שם מלא (עברית)', keywords: ['שם', 'עברי', 'hebrew', 'name'] },
            { key: 'fullNameAr', label: 'שם מלא (ערבית)', keywords: ['ערבי', 'arabic', 'اسم'] },
            { key: 'position', label: 'תפקיד', keywords: ['תפקיד', 'position', 'role', 'job'] },
            { key: 'phone', label: 'טלפון', keywords: ['טלפון', 'נייד', 'phone', 'mobile'] },
            { key: 'email', label: 'דוא"ל', keywords: ['דואל', 'email', 'mail', 'אימייל'] },
            { key: 'specializations', label: 'תחומי התמחות', keywords: ['התמחות', 'specialization', 'תחום'] }
        ]
    },
    faq: {
        fields: [
            { key: 'titleAr', label: 'כותרת (ערבית)', keywords: ['כותרת', 'ערבי', 'arabic', 'عنوان', 'سؤال'] },
            { key: 'titleHe', label: 'כותרת (עברית)', keywords: ['כותרת', 'עברי', 'hebrew', 'title', 'שאלה'] },
            { key: 'answerAr', label: 'תשובה (ערבית)', keywords: ['תשובה', 'ערבי', 'arabic', 'إجابة', 'جواب'] },
            { key: 'answerHe', label: 'תשובה (עברית)', keywords: ['תשובה', 'עברי', 'hebrew', 'answer'] },
            { key: 'order', label: 'סדר תצוגה', keywords: ['סדר', 'order', 'מספר', 'sequence'] }
        ]
    },
    budgets: {
        fields: [
            { key: 'budgetCode', label: 'קוד תקציב', keywords: ['קוד', 'תקציב', 'budget', 'code'] },
            { key: 'hebrewYear', label: 'שנה עברית', keywords: ['שנה', 'year', 'עברית'] },
            { key: 'amount', label: 'סכום', keywords: ['סכום', 'amount', 'money'] },
            { key: 'description', label: 'תיאור', keywords: ['תיאור', 'description', 'desc'] }
        ]
    },
    users: {
        fields: [
            { key: 'username', label: 'שם משתמש', keywords: ['משתמש', 'username', 'user', 'login'] },
            { key: 'fullName', label: 'שם מלא', keywords: ['שם', 'name', 'full'] },
            { key: 'email', label: 'דוא"ל', keywords: ['דואל', 'email', 'mail'] },
            { key: 'role', label: 'תפקיד', keywords: ['תפקיד', 'role', 'position'] }
        ]
    },
    pedagogical_executors: {
        fields: [
            { key: 'companyNumber', label: 'מספר חברה', keywords: ['חברה', 'company', 'מספר', 'מזהה'] },
            { key: 'institutionName', label: 'שם מוסד', keywords: ['מוסד', 'institution', 'שם', 'ארגון'] },
            { key: 'groupName', label: 'שם קבוצה', keywords: ['קבוצה', 'group', 'שם'] },
            { key: 'hourlyCost', label: 'עלות שעתית', keywords: ['עלות', 'cost', 'שעה', 'hourly', 'שח', '₪'] },
            { key: 'notes', label: 'הערות', keywords: ['הערה', 'notes', 'description', 'תיאור'] }
        ]
    },
    schools: {
        fields: [
            { key: 'code', label: 'סמל מוסד', keywords: ['סמל', 'code', 'מוסד', 'מזהה'] },
            { key: 'name', label: 'שם מוסד', keywords: ['שם', 'מוסד', 'בית ספר', 'school', 'name'] },
            { key: 'legalStatus', label: 'מעמד משפטי', keywords: ['מעמד', 'משפטי', 'legal', 'סטטוס'] },
            { key: 'educationType', label: 'סוג חינוך', keywords: ['סוג', 'חינוך', 'type', 'רשמי', 'מוכר'] },
            { key: 'educationStage', label: 'שלב חינוך', keywords: ['שלב', 'חינוך', 'stage', 'יסודי', 'על יסודי'] },
            { key: 'principalName', label: 'שם מנהל', keywords: ['מנהל', 'principal', 'head', 'מנהלת'] },
            { key: 'inspectorName', label: 'שם מפקח', keywords: ['מפקח', 'inspector', 'מחוז'] }
        ]
    },
    catalog_entries: {
        fields: [
            { key: 'title', label: 'כותרת', keywords: ['כותרת', 'title', 'שם', 'name'] },
            { key: 'description', label: 'תיאור', keywords: ['תיאור', 'description', 'desc'] },
            { key: 'category', label: 'קטגוריה', keywords: ['קטגוריה', 'category', 'סוג'] },
            { key: 'targetAudience', label: 'קהל יעד', keywords: ['קהל', 'audience', 'יעד'] },
            { key: 'duration', label: 'משך', keywords: ['משך', 'duration', 'זמן'] },
            { key: 'status', label: 'סטטוס', keywords: ['סטטוס', 'status', 'מצב'] }
        ]
    },
    lookup_domains: { fields: [{ key: 'value', label: 'ערך', keywords: ['ערך', 'value', 'קוד'] }, { key: 'label', label: 'תווית (עברית)', keywords: ['תווית', 'label', 'hebrew', 'עברי', 'שם'] }, { key: 'labelAr', label: 'תווית (ערבית)', keywords: ['תווית', 'label', 'arabic', 'ערבי', 'اسم'] }] },
    lookup_education_stages: { fields: [{ key: 'value', label: 'ערך', keywords: ['ערך', 'value', 'קוד'] }, { key: 'label', label: 'תווית (עברית)', keywords: ['תווית', 'label', 'hebrew', 'עברי', 'שם'] }, { key: 'labelAr', label: 'תווית (ערבית)', keywords: ['תווית', 'label', 'arabic', 'ערבי', 'اسم'] }] },
    lookup_education_types: { fields: [{ key: 'value', label: 'ערך', keywords: ['ערך', 'value', 'קוד'] }, { key: 'label', label: 'תווית (עברית)', keywords: ['תווית', 'label', 'hebrew', 'עברי', 'שם'] }, { key: 'labelAr', label: 'תווית (ערבית)', keywords: ['תווית', 'label', 'arabic', 'ערבי', 'اسم'] }] },
    lookup_week_days: { fields: [{ key: 'value', label: 'ערך', keywords: ['ערך', 'value', 'קוד'] }, { key: 'label', label: 'תווית (עברית)', keywords: ['תווית', 'label', 'hebrew', 'עברי', 'שם'] }, { key: 'labelAr', label: 'תווית (ערבית)', keywords: ['תווית', 'label', 'arabic', 'ערבי', 'اسم'] }] },
    lookup_meeting_types: { fields: [{ key: 'value', label: 'ערך', keywords: ['ערך', 'value', 'קוד'] }, { key: 'label', label: 'תווית (עברית)', keywords: ['תווית', 'label', 'hebrew', 'עברי', 'שם'] }, { key: 'labelAr', label: 'תווית (ערבית)', keywords: ['תווית', 'label', 'arabic', 'ערבי', 'اسم'] }] },
    lookup_budget_types: { fields: [{ key: 'value', label: 'ערך', keywords: ['ערך', 'value', 'קוד'] }, { key: 'label', label: 'תווית (עברית)', keywords: ['תווית', 'label', 'hebrew', 'עברי', 'שם'] }, { key: 'labelAr', label: 'תווית (ערבית)', keywords: ['תווית', 'label', 'arabic', 'ערבי', 'اسم'] }] },
    lookup_allocation_status: { fields: [{ key: 'value', label: 'ערך', keywords: ['ערך', 'value', 'קוד'] }, { key: 'label', label: 'תווית (עברית)', keywords: ['תווית', 'label', 'hebrew', 'עברי', 'שם'] }, { key: 'labelAr', label: 'תווית (ערבית)', keywords: ['תווית', 'label', 'arabic', 'ערבי', 'اسم'] }] },
    lookup_solution_status: { fields: [{ key: 'value', label: 'ערך', keywords: ['ערך', 'value', 'קוד'] }, { key: 'label', label: 'תווית (עברית)', keywords: ['תווית', 'label', 'hebrew', 'עברי', 'שם'] }, { key: 'labelAr', label: 'תווית (ערבית)', keywords: ['תווית', 'label', 'arabic', 'ערבי', 'اسم'] }] },
    lookup_performer_types: { fields: [{ key: 'value', label: 'ערך', keywords: ['ערך', 'value', 'קוד'] }, { key: 'label', label: 'תווית (עברית)', keywords: ['תווית', 'label', 'hebrew', 'עברי', 'שם'] }, { key: 'labelAr', label: 'תווית (ערבית)', keywords: ['תווית', 'label', 'arabic', 'ערבי', 'اسم'] }] },
    lookup_lecturer_status: { fields: [{ key: 'value', label: 'ערך', keywords: ['ערך', 'value', 'קוד'] }, { key: 'label', label: 'תווית (עברית)', keywords: ['תווית', 'label', 'hebrew', 'עברי', 'שם'] }, { key: 'labelAr', label: 'תווית (ערבית)', keywords: ['תווית', 'label', 'arabic', 'ערבי', 'اسم'] }] },
    lookup_certified_lecturer: { fields: [{ key: 'value', label: 'ערך', keywords: ['ערך', 'value', 'קוד'] }, { key: 'label', label: 'תווית (עברית)', keywords: ['תווית', 'label', 'hebrew', 'עברי', 'שם'] }, { key: 'labelAr', label: 'תווית (ערבית)', keywords: ['תווית', 'label', 'arabic', 'ערבי', 'اسم'] }] },
    lookup_expert_field: { fields: [{ key: 'value', label: 'ערך', keywords: ['ערך', 'value', 'קוד'] }, { key: 'label', label: 'תווית (עברית)', keywords: ['תווית', 'label', 'hebrew', 'עברי', 'שם'] }, { key: 'labelAr', label: 'תווית (ערבית)', keywords: ['תווית', 'label', 'arabic', 'ערבי', 'اسم'] }] },
    lookup_field_knowledge: { fields: [{ key: 'value', label: 'ערך', keywords: ['ערך', 'value', 'קוד'] }, { key: 'label', label: 'תווית (עברית)', keywords: ['תווית', 'label', 'hebrew', 'עברי', 'שם'] }, { key: 'labelAr', label: 'תווית (ערבית)', keywords: ['תווית', 'label', 'arabic', 'ערבי', 'اسم'] }] },
    lookup_role_holders: { fields: [{ key: 'value', label: 'ערך', keywords: ['ערך', 'value', 'קוד'] }, { key: 'label', label: 'תווית (עברית)', keywords: ['תווית', 'label', 'hebrew', 'עברי', 'שם'] }, { key: 'labelAr', label: 'תווית (ערבית)', keywords: ['תווית', 'label', 'arabic', 'ערבי', 'اسم'] }] },
    lookup_broad_topics: { fields: [{ key: 'value', label: 'ערך', keywords: ['ערך', 'value', 'קוד'] }, { key: 'label', label: 'תווית (עברית)', keywords: ['תווית', 'label', 'hebrew', 'עברי', 'שם'] }, { key: 'labelAr', label: 'תווית (ערבית)', keywords: ['תווית', 'label', 'arabic', 'ערבי', 'اسم'] }] },
    lookup_designated_programs: { fields: [{ key: 'value', label: 'ערך', keywords: ['ערך', 'value', 'קוד'] }, { key: 'label', label: 'תווית (עברית)', keywords: ['תווית', 'label', 'hebrew', 'עברי', 'שם'] }, { key: 'labelAr', label: 'תווית (ערבית)', keywords: ['תווית', 'label', 'arabic', 'ערבי', 'اسم'] }] },
    lookup_responsibility_types: { fields: [{ key: 'value', label: 'ערך', keywords: ['ערך', 'value', 'קוד'] }, { key: 'label', label: 'תווית (עברית)', keywords: ['תווית', 'label', 'hebrew', 'עברי', 'שם'] }, { key: 'labelAr', label: 'תווית (ערבית)', keywords: ['תווית', 'label', 'arabic', 'ערבי', 'اسم'] }] }
};

    // ============ LZ-String (LZ77 compression for localStorage Base64 images) ============
    // Only compressToUTF16 / decompressFromUTF16 — optimal for localStorage (UTF-16 native encoding)
    const _LZString = (function(){var r=String.fromCharCode;return{compressToUTF16:function(o){return null==o?"":this._compress(o,15,function(o){return r(o+32)})+" "},decompressFromUTF16:function(str){return null==str?"":""==str?null:this._decompress(str.length,16384,function(o){return str.charCodeAt(o)-32})},_compress:function(r,o,n){if(null==r)return"";var e,t,i,s={},u={},a="",p="",c="",l=2,f=3,h=2,d=[],m=0,v=0;for(i=0;i<r.length;i+=1)if(a=r.charAt(i),Object.prototype.hasOwnProperty.call(s,a)||(s[a]=f++,u[a]=!0),p=c+a,Object.prototype.hasOwnProperty.call(s,p))c=p;else{if(Object.prototype.hasOwnProperty.call(u,c)){if(c.charCodeAt(0)<256){for(e=0;e<h;e++)m<<=1,v==o-1?(v=0,d.push(n(m)),m=0):v++;for(t=c.charCodeAt(0),e=0;e<8;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}else{for(t=1,e=0;e<h;e++)m=m<<1|t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t=0;for(t=c.charCodeAt(0),e=0;e<16;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}0==--l&&(l=Math.pow(2,h),h++),delete u[c]}else for(t=s[c],e=0;e<h;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1;0==--l&&(l=Math.pow(2,h),h++),s[p]=f++,c=String(a)}if(""!==c){if(Object.prototype.hasOwnProperty.call(u,c)){if(c.charCodeAt(0)<256){for(e=0;e<h;e++)m<<=1,v==o-1?(v=0,d.push(n(m)),m=0):v++;for(t=c.charCodeAt(0),e=0;e<8;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}else{for(t=1,e=0;e<h;e++)m=m<<1|t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t=0;for(t=c.charCodeAt(0),e=0;e<16;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}0==--l&&(l=Math.pow(2,h),h++),delete u[c]}else for(t=s[c],e=0;e<h;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1;0==--l&&(l=Math.pow(2,h),h++)}for(t=2,e=0;e<h;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1;for(;;){if(m<<=1,v==o-1){d.push(n(m));break}v++}return d.join("")},_decompress:function(o,n,e){var t,i,s,u,a,p,c,l=[],f=4,h=4,d=3,m="",v=[],g={val:e(0),position:n,index:1};for(t=0;t<3;t+=1)l[t]=t;for(s=0,a=Math.pow(2,2),p=1;p!=a;)u=g.val&g.position,g.position>>=1,0==g.position&&(g.position=n,g.val=e(g.index++)),s|=(u>0?1:0)*p,p<<=1;switch(s){case 0:for(s=0,a=Math.pow(2,8),p=1;p!=a;)u=g.val&g.position,g.position>>=1,0==g.position&&(g.position=n,g.val=e(g.index++)),s|=(u>0?1:0)*p,p<<=1;c=r(s);break;case 1:for(s=0,a=Math.pow(2,16),p=1;p!=a;)u=g.val&g.position,g.position>>=1,0==g.position&&(g.position=n,g.val=e(g.index++)),s|=(u>0?1:0)*p,p<<=1;c=r(s);break;case 2:return""}for(l[3]=c,i=c,v.push(c);;){if(g.index>o)return"";for(s=0,a=Math.pow(2,d),p=1;p!=a;)u=g.val&g.position,g.position>>=1,0==g.position&&(g.position=n,g.val=e(g.index++)),s|=(u>0?1:0)*p,p<<=1;switch(c=s){case 0:for(s=0,a=Math.pow(2,8),p=1;p!=a;)u=g.val&g.position,g.position>>=1,0==g.position&&(g.position=n,g.val=e(g.index++)),s|=(u>0?1:0)*p,p<<=1;l[h++]=r(s),c=h-1,f--;break;case 1:for(s=0,a=Math.pow(2,16),p=1;p!=a;)u=g.val&g.position,g.position>>=1,0==g.position&&(g.position=n,g.val=e(g.index++)),s|=(u>0?1:0)*p,p<<=1;l[h++]=r(s),c=h-1,f--;break;case 2:return v.join("")}if(0==f&&(f=Math.pow(2,d),d++),l[c])m=l[c];else{if(c!==h)return null;m=i+i.charAt(0)}v.push(m),l[h++]=i+m.charAt(0),i=m,0==--f&&(f=Math.pow(2,d),d++)}}}})();

    // Guide image compression helpers (two-tier: thumb + retina, lz-compressed in localStorage)
    const _guideImgCache = {};
    function _compressImg(dataUrl) {
        if (!dataUrl || !dataUrl.startsWith('data:')) return dataUrl;
        try { return _LZString.compressToUTF16(dataUrl); } catch(e) { return dataUrl; }
    }
    function _decompressImg(str) {
        if (!str) return str;
        if (str.startsWith('data:')) return str; // backward compat: uncompressed data URL
        try {
            var result = _LZString.decompressFromUTF16(str);
            return (result && result.startsWith('data:')) ? result : '';
        } catch(e) { return ''; }
    }

 function _getGuideThumb(g) {
     if (!g) return '';
     var key = g.id + '_t';
     if (_guideImgCache[key]) return _guideImgCache[key];
     
     var src = g.avatar_thumb || g.profileImage || '';
     // 🔑 תאימות לאחור: אם זה נתיב קובץ רגיל, החזר אותו. אם זה Base64 דחוס, פרק אותו.
     if (src && (src.startsWith('uploads/') || src.startsWith('http') || src.startsWith('data:image'))) {
         _guideImgCache[key] = src;
     } else {
         _guideImgCache[key] = _decompressImg(src) || src;
     }
     return _guideImgCache[key];
 }
 
 function _getGuideRetina(g) {
     if (!g) return '';
     var key = g.id + '_r';
     if (_guideImgCache[key]) return _guideImgCache[key];
     
     var src = g.avatar_retina || g.profileImage || '';
     // 🔑 תאימות לאחור
     if (src && (src.startsWith('uploads/') || src.startsWith('http') || src.startsWith('data:image'))) {
         _guideImgCache[key] = src;
     } else {
         _guideImgCache[key] = _decompressImg(src) || src;
     }
     return _guideImgCache[key];
 }


    // ============ IMPORT FIELD MAPS (system fields per type) ============
    const IMPORT_FIELD_MAPS = {
        solutions: [
            { key: 'responsibilityType', label: 'סוג האחריות של פתרון הלמידה', hints: ['סוג אחריות', 'אחריות', 'פסגתי', 'בית-ספרי', 'responsibility'] },
            { key: 'schoolName', label: 'שם בית הספר', hints: ['בית ספר', 'school', 'מוסד'] },
            { key: 'name', label: 'שם פתרון למידה', hints: ['שם פתרון', 'שם', 'name', 'solution'] },
            { key: 'solutionNumber', label: 'מספר פתרון למידה', hints: ['מספר פתרון', 'מספר', 'number', 'קוד'] },
            { key: 'description', label: 'תיאור פתרון למידה', hints: ['תיאור', 'description'] },
            { key: 'guideName', label: 'מדריך אחראי', hints: ['מדריך אחראי', 'שם מדריך', 'מדריך', 'אחראי', 'guide', 'responsible', 'المرشد المسؤول', 'اسم المرشد', 'المرشد', 'المشرف المسؤول', 'المشرف', 'اسم المشرف', 'مسؤول', 'مرشد'] },
            { key: 'topicType', label: 'תחום', hints: ['תחום', 'domain', 'topic type', 'مجال', 'نوع الموضوع'] },
            { key: 'topic', label: 'נושא', hints: ['נושא', 'topic', 'موضوع'] },
            { key: 'educationStage', label: 'שלב חינוך', hints: ['שלב', 'stage', 'חינוך', 'مرحلة تعليم', 'مرحلة'] },
            { key: 'educationType', label: 'סוג חינוך', hints: ['סוג חינוך', 'education type', 'זרם', 'نوع تعليم', 'نوع'] },
            { key: 'startDate', label: 'תאריך תחילת ההשתלמות', hints: ['תאריך התחלה', 'start', 'התחלה'] },
            { key: 'endDate', label: 'תאריך סיום ההשתלמות', hints: ['תאריך סיום', 'end', 'סיום'] },
            { key: 'weekDay', label: 'יום בשבוע', hints: ['יום', 'week', 'day'] },
            { key: 'meetingType', label: 'סוג מפגש', hints: ['סוג מפגש', 'meeting', 'מפגש', 'نوع لقاء', 'لقاء'] },
            { key: 'academicHours', label: 'שעות אקדמיות מוכרות לגמול', hints: ['שעות', 'hours', 'אקדמי', 'גמול'] },
            { key: 'baseBudgetStatus', label: 'מתוקצב?', hints: ['מתוקצב', 'budgeted'] },
            { key: 'baseBudgetedHours', label: 'סה"כ שעות מתוקצבות', hints: ['שעות מתוקצבות', 'budgeted hours'] },
            { key: 'baseBudgetType', label: 'סוג תקצוב', hints: ['סוג תקצוב', 'budget type'] },
            { key: 'mentorType', label: 'סוג המנחה', hints: ['סוג מנחה', 'mentor type', 'רגיל', 'כוח פנים', 'שעות ליווי'] },
            { key: 'mentorName', label: 'שם המנחה', hints: ['שם מנחה', 'mentor name', 'מנחה'] },
            { key: 'mentorP2', label: 'שעות תקופה ב׳ (09-12)', hints: ['תקופה ב', 'period 2', '09-12'] },
            { key: 'mentorP1', label: 'שעות תקופה א׳ (01-08)', hints: ['תקופה א', 'period 1', '01-08'] },
            { key: 'mentorTotal', label: 'סה"כ שעות', hints: ['סהכ', 'total hours'] },
            { key: 'accBudgetedHours', label: 'סה"כ שעות מתוקצבות (שעות ליווי)', hints: ['שעות ליווי', 'accompaniment hours'] },
            { key: 'internalForceHours', label: 'סה"כ שעות כוח פנים', hints: ['כוח פנים', 'internal force hours', 'שעות פנים'] },
            { key: 'accBudgetType', label: 'סוג תקצוב (שעות ליווי)', hints: ['סוג תקצוב ליווי', 'accompaniment budget type'] },
            { key: 'mentors', label: 'מנחים (רב-ברירה)', hints: ['מנחים', 'מרצים', 'instructors', 'mentors', 'רשימת מנחים', 'צוות מנחים'] },
            { key: 'whatsappLink', label: 'קישור וואטסאפ', hints: ['וואטסאפ', 'whatsapp', 'קישור'] },
            { key: 'earlyRegistrationLink', label: 'קישור רישום מוקדם', hints: ['רישום מוקדם', 'registration', 'הרשמה'] },
            { key: 'showInPublicCatalog', label: 'הצג בקטלוג הציבורי', hints: ['ציבורי', 'קטלוג', 'public', 'הצג', 'عرض', 'كتالوج عام', 'العام'] },
            { key: 'notes', label: 'הערה כללית', hints: ['הערה', 'notes', 'הערות'] }
        ],
        mentors: [
            { key: 'idNumber', label: 'ת.ז. מרצה', hints: ['ת.ז', 'תעודת זהות', 'id', 'tz', 'מספר זהות', 'ת.ז. מרצה'] },
            { key: 'fullNameHe', label: 'שם מרצה (עברית)', hints: ['שם', 'name', 'מלא', 'שם מרצה', 'עברית', 'hebrew'] },
            { key: 'fullNameAr', label: 'שם מרצה (ערבית)', hints: ['ערבית', 'arabic', 'שם ערבית'] },
            { key: 'phone', label: 'טלפון נייד', hints: ['טלפון', 'phone', 'נייד', 'פלאפון'] },
            { key: 'email', label: 'דוא"ל', hints: ['דואל', 'email', 'מייל', 'אימייל'] },
            { key: 'isCertifiedLecturer', label: 'מרצה מוסב', hints: ['מוסב', 'certified', 'מרצה מוסב', 'מרצה מוסמך'] },
            { key: 'expertInField', label: 'מומחה בתחומו', hints: ['מומחה', 'expert', 'מומחה בתחומו'] },
            { key: 'lecturerStatus', label: 'סטטוס', hints: ['סטטוס', 'status', 'אושר', 'נדחה'] }
        ],
        guides_repo: [
            { key: 'idNumber', label: 'ת.ז.', hints: ['ת.ז', 'תעודת זהות', 'id', 'tz'] },
            { key: 'fullName', label: 'שם מלא בעברית', hints: ['שם', 'name', 'מלא', 'עברית', 'hebrew'] },
            { key: 'fullNameAr', label: 'שם מלא בערבית', hints: ['ערבית', 'arabic', 'שם ערבית'] },
            { key: 'position', label: 'תפקיד', hints: ['תפקיד', 'position', 'role'] },
            { key: 'phone', label: 'טלפון', hints: ['טלפון', 'phone', 'נייד'] },
            { key: 'email', label: 'דוא"ל', hints: ['דואל', 'email', 'מייל', 'אימייל'] },
            { key: 'specializations', label: 'תחומי התמחות', hints: ['התמחות', 'specialization', 'תחומי', 'תחום'] }
        ],
        users: [
            { key: 'fullName', label: 'שם מלא', hints: ['שם', 'name', 'מלא'] },
            { key: 'username', label: 'שם משתמש', hints: ['משתמש', 'username', 'user'] },
            { key: 'password', label: 'סיסמה', hints: ['סיסמה', 'password', 'קוד'] },
            { key: 'email', label: 'דוא"ל', hints: ['דואל', 'email', 'מייל'] },
            { key: 'role', label: 'תפקיד', hints: ['תפקיד', 'role'] }
        ],
        budgets: [
            { key: 'budgetCode', label: 'קוד תקציב', hints: ['קוד תקציב', 'קוד', 'code', 'מספר'] },
            { key: 'hebrewYear', label: 'שנת תקציב (עברית)', hints: ['שנת תקציב (עברית)', 'שנת תקציב', 'שנה עברית', 'שנה', 'year', 'תשפ'] },
            { key: 'englishYear', label: 'שנת תקציב', hints: ['שנת תקציב', 'שנה לועזית', 'שנה', 'english', 'לועזית'] },
            { key: 'period', label: 'תקופה', hints: ['תקופה', 'period'] },
            { key: 'estimationStatus', label: 'ידוע / משוערך', hints: ['ידוע', 'משוערך', 'estimat'] },
            { key: 'moneyColor', label: 'צבע הכסף', hints: ['צבע', 'כסף', 'color', 'money'] },
            { key: 'organizationalUnit', label: 'יחידה ארגונית מנהלת', hints: ['יחידה ארגונית מנהלת', 'יחידה ארגונית', 'unit', 'ארגונית'] },
            { key: 'budgetFor', label: 'תקציב עבור', hints: ['תקציב עבור', 'עבור', 'for'] },
            { key: 'description', label: 'תיאור תקציב', hints: ['תיאור תקציב', 'תיאור', 'description'] },
            { key: 'notes', label: 'הערה', hints: ['הערה', 'הערות', 'notes'] },
            { key: 'amount', label: 'סכום (₪)', hints: ['סכום', 'amount', 'כסף'] },
            { key: 'planningBalance', label: 'יתרת תכנון (₪)', hints: ['יתרת תכנון', 'תכנון', 'planning'] },
            { key: 'managementBalance', label: 'יתרת ניהול (₪)', hints: ['יתרת ניהול', 'ניהול', 'management'] },
            { key: 'freeBudgetBalance', label: 'יתרת תקציב פנויה (₪)', hints: ['יתרת תקציב פנויה', 'יתרה פנויה', 'פנויה', 'free'] }
        ],
        inspectors: [
            { key: 'fullName', label: 'שם מפקח', hints: ['שם', 'שם מפקח', 'name', 'inspector'] },
            { key: 'phone', label: 'טלפון', hints: ['טלפון', 'phone', 'נייד'] },
            { key: 'email', label: 'דוא"ל', hints: ['דואל', 'email', 'מייל'] },
            { key: 'district', label: 'מחוז', hints: ['מחוז', 'district', 'אזור'] }
        ],
        pedagogical_executors: [
            { key: 'companyNumber', label: 'ח.פ.', hints: ['ח.פ', 'חברה פרטית', 'company', 'registration'] },
            { key: 'institutionName', label: 'שם המוסד', hints: ['שם', 'מוסד', 'name', 'institution'] },
            { key: 'groupName', label: 'קבוצה', hints: ['קבוצה', 'group'] },
            { key: 'hourlyCost', label: 'עלות שעה', hints: ['עלות', 'שעה', 'cost', 'hourly'] },
            { key: 'notes', label: 'הערה', hints: ['הערה', 'notes', 'comment'] }
        ],
        lookup_values: [
            { key: 'value', label: 'ערך', hints: ['ערך', 'value', 'קוד', 'code'] },
            { key: 'label', label: 'תווית (עברית)', hints: ['תווית', 'label', 'שם', 'hebrew', 'עברית'] },
            { key: 'labelAr', label: 'תווית (ערבית)', hints: ['ערבית', 'arabic', 'labelar', 'label_ar'] }
        ],
        faq: [
            { key: 'titleAr', label: 'כותרת (ערבית)', hints: ['כותרת', 'ערבית', 'arabic', 'title', 'titleAr'] },
            { key: 'titleHe', label: 'כותרת (עברית)', hints: ['עברית', 'hebrew', 'titleHe', 'כותרת עברית'] },
            { key: 'answerAr', label: 'תשובה (ערבית)', hints: ['תשובה', 'ערבית', 'arabic', 'answer', 'answerAr'] },
            { key: 'answerHe', label: 'תשובה (עברית)', hints: ['תשובה עברית', 'hebrew', 'answerHe'] },
            { key: 'order', label: 'סדר תצוגה', hints: ['סדר', 'order', 'מספר', 'תצוגה'] }
        ],
        schools: [
            { key: 'code',           label: 'סמל מוסד',        hints: ['סמל מוסד', 'סמל', 'code', 'symbol', 'מוסד', 'رمز'] },
            { key: 'name',           label: 'שם מוסד',         hints: ['שם מוסד', 'שם בית ספר', 'שם', 'name', 'בית ספר', 'اسم'] },
            { key: 'legalStatus',    label: 'מעמד משפטי',      hints: ['מעמד משפטי', 'מעמד', 'legal', 'status', 'وضع'] },
            { key: 'educationType',  label: 'סוג חינוך מוסד',  hints: ['סוג חינוך מוסד', 'סוג חינוך', 'סוג', 'education type', 'نوع'] },
            { key: 'educationStage', label: 'שלב חינוך במוסד', hints: ['שלב חינוך במוסד', 'שלב חינוך', 'שלב', 'education stage', 'مرحلة'] },
            { key: 'principalName',  label: 'שם מנהל',         hints: ['שם מנהל', 'מנהל', 'principal', 'مدير'] },
            { key: 'inspectorName',  label: 'שם מפקח',         hints: ['שם מפקח', 'מפקח', 'inspector', 'مفتش'] }
        ],
        registrations: [
            { key: 'fullName',        label: 'שם',              hints: ['שם', 'name', 'fullName', 'שם מלא'] },
            { key: 'phone',           label: 'טלפון',           hints: ['טלפון', 'phone', 'נייד'] },
            { key: 'email',           label: 'דוא"ל',           hints: ['דואל', 'email', 'מייל'] },
            { key: 'institutionCode', label: 'מוסד',            hints: ['מוסד', 'institution', 'סמל מוסד'] },
            { key: 'institutionName', label: 'בית ספר',         hints: ['בית ספר', 'school'] },
            { key: 'role',            label: 'תפקיד',           hints: ['תפקיד', 'role'] },
            { key: 'solutionName',    label: 'פתרון / השתלמות', hints: ['פתרון', 'solution', 'השתלמות'] }
        ]
    };

    // ============ TABLE COLUMN VISIBILITY & PAGINATION ============
    const _TABLE_COL_CONFIGS = {
        solutions: {
            tableSelector: '#solutionsTableDiv table.data-table',
            label: 'קטלוג פתרונות למידה',
            columns: [
                { index: 0,  key: 'responsibilityType',      label: 'סוג האחריות' },
                { index: 1,  key: 'schoolName',             label: 'שם בית הספר' },
                { index: 2,  key: 'name',                   label: 'שם פתרון למידה' },
                { index: 3,  key: 'solutionNumber',         label: 'מספר פתרון' },
                { index: 4,  key: 'description',            label: 'תיאור' },
                { index: 5,  key: 'guideName',              label: 'מדריך אחראי' },
                { index: 6,  key: 'topicType',              label: 'תחום' },
                { index: 7,  key: 'topic',                  label: 'נושא' },
                { index: 8,  key: 'educationStage',         label: 'שלב חינוך' },
                { index: 9,  key: 'educationType',          label: 'סוג חינוך' },
                { index: 10, key: 'startDate',              label: 'ת. תחילת ההשתלמות' },
                { index: 11, key: 'endDate',                label: 'ת. סיום ההשתלמות' },
                { index: 12, key: 'weekDay',                label: 'יום בשבוע' },
                { index: 13, key: 'meetingType',            label: 'סוג מפגש' },
                { index: 14, key: 'hours',                  label: 'שעות אקדמיות' },
                { index: 15, key: 'isBudgeted',             label: 'מתוקצב?' },
                { index: 16, key: 'budgetedHours',          label: 'סה"כ שעות מתוקצבות' },
                { index: 17, key: 'budgetTypeValue',        label: 'סוג תקצוב' },
                { index: 18, key: 'mentorType',             label: 'סוג המנחה' },
                { index: 19, key: 'mentorName',             label: 'שם המנחה' },
                { index: 20, key: 'mentorP2',               label: 'שעות לתקופה ב׳ (09-12)' },
                { index: 21, key: 'mentorP1',               label: 'שעות לתקופה א׳ (01-08)' },
                { index: 22, key: 'mentorTotal',            label: 'סה"כ שעות' },
                { index: 23, key: 'accBudgetedHours',       label: 'סה"כ שעות מתוקצבות (שעות ליווי)' },
                { index: 24, key: 'accBudgetTypeValue',     label: 'סוג תקצוב (שעות ליווי)' },
                { index: 25, key: 'whatsappLink',           label: 'קישור וואטסאפ' },
                { index: 26, key: 'earlyRegistrationLink',  label: 'קישור רישום מוקדם' },
                { index: 27, key: 'showInPublicCatalog',    label: 'הצג בקטלוג הציבורי' },
                { index: 28, key: 'notes',                  label: 'הערה כללית' }
            ]
        },
        mentors: {
            tableSelector: '#mentorsTableDiv table.data-table',
            label: 'מאגר מרצים',
            columns: [
                { index: 0, key: 'idNumber', label: 'ת.ז.' },
                { index: 1, key: 'fullNameHe', label: 'שם מרצה (עברית)' },
                { index: 2, key: 'fullNameAr', label: 'שם מרצה (ערבית)' },
                { index: 3, key: 'phone', label: 'טלפון' },
                { index: 4, key: 'email', label: 'דוא"ל' },
                { index: 5, key: 'isCertifiedLecturer', label: 'מרצה מוסב' },
                { index: 6, key: 'expertInField', label: 'מומחה בתחומו' },
                { index: 7, key: 'lecturerStatus', label: 'סטטוס' }
            ]
        },
        users: {
            tableSelector: '#section-guides table.data-table',
            label: 'ניהול משתמשים',
            columns: [
                { index: 0, key: 'fullName', label: 'שם' },
                { index: 1, key: 'username', label: 'שם משתמש' },
                { index: 2, key: 'role', label: 'תפקיד' },
                { index: 3, key: 'email', label: 'דוא"ל' }
            ]
        },
        guides_repo: {
            tableSelector: '#guidesRepoTableDiv table.data-table',
            label: 'מאגר מדריכים',
            columns: [
                { index: 0, key: 'order', label: 'סדר' },
                { index: 1, key: 'image', label: 'תמונה' },
                { index: 2, key: 'idNumber', label: 'ת.ז.' },
                { index: 3, key: 'fullName', label: 'שם מלא (עברית)' },
                { index: 4, key: 'fullNameAr', label: 'שם מלא (ערבית)' },
                { index: 5, key: 'position', label: 'תפקיד' },
                { index: 6, key: 'phone', label: 'טלפון' },
                { index: 7, key: 'email', label: 'דוא"ל' },
                { index: 8, key: 'specializations', label: 'תחומי התמחות' }
            ]
        },
        budgets: {
            tableSelector: '#budgetsTableDiv table.data-table',
            label: 'תקציבים',
            columns: [
                { index: 0, key: 'budgetCode', label: 'קוד תקציב' },
                { index: 1, key: 'hebrewYear', label: 'שנת תקציב (עברית)' },
                { index: 2, key: 'englishYear', label: 'שנת תקציב' },
                { index: 3, key: 'period', label: 'תקופה' },
                { index: 4, key: 'estimationStatus', label: 'ידוע/משוערך' },
                { index: 5, key: 'organizationalUnit', label: 'יחידה ארגונית מנהלת' },
                { index: 6, key: 'budgetFor', label: 'תקציב עבור' },
                { index: 7, key: 'description', label: 'תיאור תקציב' },
                { index: 8, key: 'notes', label: 'הערה' },
                { index: 9, key: 'amount', label: 'סכום (₪)' },
                { index: 10, key: 'planningBalance', label: 'יתרת תכנון (₪)' },
                { index: 11, key: 'managementBalance', label: 'יתרת ניהול (₪)' },
                { index: 12, key: 'freeBudgetBalance', label: 'יתרת תקציב פנויה (₪)' }
            ]
        },
        registrations: {
            tableSelector: '#regTableDiv table.data-table',
            label: 'נרשמים לפתרונות למידה',
            columns: [
                { index: 0, key: 'fullName', label: 'שם' },
                { index: 1, key: 'phone', label: 'טלפון' },
                { index: 2, key: 'email', label: 'דוא"ל' },
                { index: 3, key: 'institutionCode', label: 'מוסד' },
                { index: 4, key: 'institutionName', label: 'בית ספר' },
                { index: 5, key: 'role', label: 'תפקיד' },
                { index: 6, key: 'solutionName', label: 'פתרון / השתלמות' },
                { index: 7, key: 'createdAt', label: 'תאריך' }
            ]
        },
        faq: {
            tableSelector: '#section-faq table.data-table',
            label: 'שאלות נפוצות ותשובות',
            columns: [
                { index: 1, key: 'order', label: 'סדר' },
                { index: 2, key: 'titleAr', label: 'כותרת (ערבית)' },
                { index: 3, key: 'titleHe', label: 'כותרת (עברית)' }
            ]
        }
    };

    let _colVisibility = {};   // { catKey: [colKey1, colKey2, ...] } — visible column keys
    let _paginationState = {};  // { catKey: { page: 1, pageSize: 10 } }
    const _PAGE_SIZE = 10;

    function _initTableFeatures() {
        try {
            var saved = localStorage.getItem('matspanet_table_features');
            if (saved) {
                var data = JSON.parse(saved);
                if (data.colVisibility) _colVisibility = data.colVisibility;
                if (data.paginationState) _paginationState = data.paginationState;
            }
        } catch(e) {}
        // Ensure all categories have defaults
        Object.keys(_TABLE_COL_CONFIGS).forEach(function(catKey) {
            if (!_colVisibility[catKey]) {
                if (catKey === 'solutions') {
                    _colVisibility[catKey] = ['name', 'solutionNumber', 'description', 'guideName', 'educationStage', 'topicType', 'showInPublicCatalog'];
                } else {
                    _colVisibility[catKey] = _TABLE_COL_CONFIGS[catKey].columns.map(function(c) { return c.key; });
                }
            }
            if (!_paginationState[catKey]) {
                _paginationState[catKey] = { page: 1, pageSize: _PAGE_SIZE };
            }
        });
    }

    function _saveTableFeaturesPrefs() {
        try {
            localStorage.setItem('matspanet_table_features', JSON.stringify({
                colVisibility: _colVisibility,
                paginationState: _paginationState
            }));
        } catch(e) {}
    }

    function _getVisibleColKeys(catKey) {
        return _colVisibility[catKey] || _TABLE_COL_CONFIGS[catKey].columns.map(function(c) { return c.key; });
    }

    function _colVisBtnHtml(catKey) {
        return '<button class="btn btn-outline btn-sm" onclick="App._openColVisModal(\'' + catKey + '\')" title="בחירת עמודות להצגה">👁️ עמודות</button>';
    }

    function _openColVisModal(catKey) {
        var config = _TABLE_COL_CONFIGS[catKey];
        if (!config) return;
        var visible = _getVisibleColKeys(catKey);
        var checksHtml = config.columns.map(function(col) {
            var checked = visible.indexOf(col.key) >= 0 ? ' checked' : '';
            return '<label style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:var(--border-radius);cursor:pointer;transition:background 0.15s;" onmouseover="this.style.background=\'var(--gray-50)\'" onmouseout="this.style.background=\'transparent\'">' +
                '<input type="checkbox" ' + checked + ' onchange="App._toggleColVis(\'' + catKey + '\',\'' + col.key + '\',this.checked)" style="width:18px;height:18px;cursor:pointer;accent-color:var(--primary);">' +
                '<span style="font-size:14px;">' + col.label + '</span>' +
                '</label>';
        }).join('');
        showModal('👁️ בחירת עמודות להצגה — ' + config.label,
            '<div style="margin-bottom:8px;font-size:13px;color:var(--gray-500);">סמנו את העמודות שברצונכם להציג בטבלה:</div>' +
            '<div style="display:flex;flex-direction:column;gap:2px;">' + checksHtml + '</div>',
            '<button class="btn btn-outline" onclick="App._resetColVis(\'' + catKey + '\')" style="margin-left:auto;">🔄 אפס לברירת מחדל</button>' +
            '<button class="btn btn-primary" onclick="App.closeModal()">סגור</button>');
    }

    function _toggleColVis(catKey, colKey, isVisible) {
        if (!isVisible) {
            _colVisibility[catKey] = _colVisibility[catKey].filter(function(k) { return k !== colKey; });
        } else {
            if (_colVisibility[catKey].indexOf(colKey) < 0) {
                // Insert in original order
                var config = _TABLE_COL_CONFIGS[catKey];
                var orderedKeys = config.columns.map(function(c) { return c.key; });
                var insertIdx = orderedKeys.indexOf(colKey);
                // Find the position after the last already-visible key that comes before this one
                var pos = 0;
                for (var i = 0; i < orderedKeys.length; i++) {
                    if (orderedKeys[i] === colKey) { pos = _colVisibility[catKey].length; break; }
                    if (_colVisibility[catKey].indexOf(orderedKeys[i]) >= 0) pos = _colVisibility[catKey].indexOf(orderedKeys[i]) + 1;
                }
                _colVisibility[catKey].splice(pos, 0, colKey);
            }
        }
        _saveTableFeaturesPrefs();
        _applyColVis(catKey);
    }

    function _resetColVis(catKey) {
        if (catKey === 'solutions') {
            _colVisibility[catKey] = ['name', 'solutionNumber', 'description', 'guideName', 'educationStage', 'topicType', 'showInPublicCatalog'];
        } else {
            _colVisibility[catKey] = _TABLE_COL_CONFIGS[catKey].columns.map(function(c) { return c.key; });
        }
        _saveTableFeaturesPrefs();
        _applyColVis(catKey);
        closeModal();
        showToast('אופסו לברירת מחדל', 'success');
    }

    function _applyColVis(catKey) {
        var config = _TABLE_COL_CONFIGS[catKey];
        if (!config) return;
        var table = document.querySelector(config.tableSelector);
        if (!table) return;
        var visible = _getVisibleColKeys(catKey);
        config.columns.forEach(function(col) {
            var show = visible.indexOf(col.key) >= 0;
            var headers = table.querySelectorAll('thead tr');
            var rows = table.querySelectorAll('tbody tr');
            headers.forEach(function(tr) {
                var cells = tr.querySelectorAll('th');
                if (cells[col.index]) cells[col.index].style.display = show ? '' : 'none';
            });
            rows.forEach(function(tr) {
                var cells = tr.querySelectorAll('td');
                if (cells[col.index]) cells[col.index].style.display = show ? '' : 'none';
            });
        });
    }

    function _resetPagination(catKey) {
        if (_paginationState[catKey]) _paginationState[catKey].page = 1;
    }

    function _applyPagination(catKey) {
        var config = _TABLE_COL_CONFIGS[catKey];
        if (!config) return;
        var table = document.querySelector(config.tableSelector);
        if (!table) return;
        var tbody = table.querySelector('tbody');
        if (!tbody) return;
        var rows = Array.from(tbody.querySelectorAll('tr'));
        var totalItems = rows.length;
        // Remove existing pagination controls
        var existingCtrl = table.parentElement ? table.parentElement.querySelector('.pagination-controls') : null;
        if (existingCtrl) existingCtrl.remove();

        if (totalItems === 0) return;

        var state = _paginationState[catKey] || { page: 1, pageSize: _PAGE_SIZE };
        var totalPages = Math.ceil(totalItems / state.pageSize) || 1;
        if (state.page > totalPages) { state.page = totalPages; _saveTableFeaturesPrefs(); }

        if (totalPages <= 1) return; // No pagination needed

        var start = (state.page - 1) * state.pageSize;
        var end = start + state.pageSize;

        rows.forEach(function(row, idx) {
            var isOnPage = (idx >= start && idx < end);
            row.style.display = isOnPage ? '' : 'none';
            // For FAQ: disable drag on hidden rows
            if (catKey === 'faq') {
                row.setAttribute('draggable', isOnPage ? 'true' : 'false');
                if (!isOnPage) row.style.cursor = 'default';
                else row.style.cursor = 'grab';
            }
        });

        // Insert pagination controls after the table
        var wrapper = table.parentElement;
        if (wrapper) {
            wrapper.insertAdjacentHTML('beforeend', _buildPaginationHtml(catKey, state.page, totalPages, totalItems));
        }
    }

    function _buildPaginationHtml(catKey, currentPage, totalPages, totalItems) {
        var state = _paginationState[catKey] || { pageSize: _PAGE_SIZE };
        var start = (currentPage - 1) * state.pageSize + 1;
        var end = Math.min(currentPage * state.pageSize, totalItems);
        var info = 'רשומות ' + start + '-' + end + ' מתוך ' + totalItems;
        var pageInfo = 'עמוד ' + currentPage + ' מתוך ' + totalPages;
        var disabledFirst = currentPage <= 1 ? ' disabled style="opacity:0.4;pointer-events:none;"' : '';
        var disabledPrev = currentPage <= 1 ? ' disabled style="opacity:0.4;pointer-events:none;"' : '';
        var disabledNext = currentPage >= totalPages ? ' disabled style="opacity:0.4;pointer-events:none;"' : '';
        var disabledLast = currentPage >= totalPages ? ' disabled style="opacity:0.4;pointer-events:none;"' : '';
        // Page number buttons (show max 5 pages around current)
        var pagesHtml = '';
        var startPage = Math.max(1, currentPage - 2);
        var endPage = Math.min(totalPages, startPage + 4);
        if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);
        if (startPage > 1) {
            pagesHtml += '<button class="btn btn-outline btn-sm" style="min-width:32px;padding:2px 6px;" onclick="App._goToPage(\'' + catKey + '\',1)">1</button>';
            if (startPage > 2) pagesHtml += '<span style="color:var(--gray-400);font-size:12px;padding:0 2px;">...</span>';
        }
        for (var p = startPage; p <= endPage; p++) {
            var isActive = p === currentPage;
            var btnClass = isActive ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm';
            var click = isActive ? '' : ' onclick="App._goToPage(\'' + catKey + '\',' + p + ')"';
            pagesHtml += '<button class="' + btnClass + '" style="min-width:32px;padding:2px 6px;' + (isActive ? 'cursor:default;' : '') + '"' + click + '>' + p + '</button>';
        }
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) pagesHtml += '<span style="color:var(--gray-400);font-size:12px;padding:0 2px;">...</span>';
            pagesHtml += '<button class="btn btn-outline btn-sm" style="min-width:32px;padding:2px 6px;" onclick="App._goToPage(\'' + catKey + '\',' + totalPages + ')">' + totalPages + '</button>';
        }
        return '<div class="pagination-controls" style="display:flex;justify-content:center;align-items:center;gap:8px;margin-top:12px;padding:8px 14px;background:var(--gray-50);border-radius:var(--border-radius);border:1px solid var(--gray-100);flex-wrap:wrap;">' +
            '<span style="font-size:13px;color:var(--gray-500);">' + info + '</span>' +
            '<div style="display:flex;gap:4px;align-items:center;">' +
                '<button class="btn btn-outline btn-sm" onclick="App._goToPage(\'' + catKey + '\',1)"' + disabledFirst + ' title="עמוד ראשון">⏮</button>' +
                '<button class="btn btn-outline btn-sm" onclick="App._goToPage(\'' + catKey + '\',' + (currentPage - 1) + ')"' + disabledPrev + ' title="הקודם">◀</button>' +
                pagesHtml +
                '<button class="btn btn-outline btn-sm" onclick="App._goToPage(\'' + catKey + '\',' + (currentPage + 1) + ')"' + disabledNext + ' title="הבא">▶</button>' +
                '<button class="btn btn-outline btn-sm" onclick="App._goToPage(\'' + catKey + '\',' + totalPages + ')"' + disabledLast + ' title="עמוד אחרון">⏭</button>' +
            '</div>' +
            '<span style="font-size:13px;color:var(--gray-500);">' + pageInfo + '</span>' +
        '</div>';
    }

    function _goToPage(catKey, page) {
        if (!_paginationState[catKey]) return;
        var config = _TABLE_COL_CONFIGS[catKey];
        if (!config) return;
        var table = document.querySelector(config.tableSelector);
        if (!table) return;
        var tbody = table.querySelector('tbody');
        if (!tbody) return;
        var totalItems = tbody.querySelectorAll('tr').length;
        var totalPages = Math.ceil(totalItems / _paginationState[catKey].pageSize) || 1;
        page = Math.max(1, Math.min(page, totalPages));
        _paginationState[catKey].page = page;
        _saveTableFeaturesPrefs();
        _applyPagination(catKey);
        // Scroll table into view
        var wrapper = table.closest('.table-wrapper') || table.parentElement;
        if (wrapper) wrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function _applyTableFeatures(catKey) {
        _applyColVis(catKey);
        _applyPagination(catKey);
    }

    function _importTypeLabel(type) {
        const labels = { solutions: 'פתרונות למידה', mentors: 'מנחים / מרצים', guides_repo: 'מדריכים', users: 'משתמשים', budgets: 'תקצבים', schools: 'בתי ספר' };
        return labels[type] || type;
    }

    function _autoDetectMapping(fields, headers) {
        const mapping = {};
        const usedHeaders = new Set();
        fields.forEach((field, fi) => {
            let bestMatch = -1;
            let bestScore = 0;
            headers.forEach((h, hi) => {
                if (usedHeaders.has(hi)) return;
                const hLower = h.toLowerCase().trim();
                const fLabelLower = field.label.toLowerCase().trim();
                if (hLower === fLabelLower) { bestMatch = hi; bestScore = 100; return; }
                for (const hint of field.hints) {
                    const hintLower = hint.toLowerCase();
                    if (hLower === hintLower) { if (50 > bestScore) { bestMatch = hi; bestScore = 50; } }
                    else if (hLower.includes(hintLower) || hintLower.includes(hLower)) { if (10 > bestScore) { bestMatch = hi; bestScore = 10; } }
                }
            });
            if (bestMatch >= 0) { mapping[fi] = bestMatch; usedHeaders.add(bestMatch); }
        });
        return mapping;
    }

    // ============ HELPER FUNCTIONS ============
    function escHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }
    
    function escAttr(str) {
        if (!str) return '';
        return String(str).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }
    
    /**
     * Returns the mentor/guide name according to language context:
     * - For Hebrew (default): prefer fullNameHe, then fullName, then fullNameAr
     * - For Arabic (lang === 'ar'): prefer fullNameAr, then fullNameHe
     * This ensures proper display in both languages.
     */
    function getMentorName(m) {
        if (!m) return '';
        // Determine current UI language
        var currentLang = 'he';
        try {
            if (typeof DataStore !== 'undefined' && DataStore.getSettings) {
                var d = (DataStore.getSettings() || {}).language;
                if (d === 'ar' || d === 'he') currentLang = d;
            }
        } catch (e) {}
        try {
            var s = localStorage.getItem('matspanet_ui_lang');
            if (s === 'ar' || s === 'he') currentLang = s;
        } catch (e) {}
        
        // For Arabic language context
        if (currentLang === 'ar') {
            if (m.fullNameAr && m.fullNameAr.trim() !== '') {
                return m.fullNameAr;
            }
            return m.fullNameHe || m.fullName || '';
        }
        // For Hebrew language context (default): prefer fullNameHe
        if (m.fullNameHe && m.fullNameHe.trim() !== '') {
            return m.fullNameHe;
        }
        return m.fullName || m.fullNameAr || '';
    }

    /**
     * Normalize a date value to YYYY-MM-DD for <input type="date"> compatibility.
     * Handles: Date objects, "Wed Jan 15 2025..." strings, DD/MM/YYYY, YYYY-MM-DD,
     * Excel serial date numbers (e.g., 46278), etc.
     */
    function normalizeDateValue(val) {
        if (!val) return '';
        var s = String(val).trim();
        if (!s) return '';
        // Already YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
        // Try DD/MM/YYYY (Israeli format)
        var dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (dmy) {
            var y = parseInt(dmy[3], 10), m = parseInt(dmy[2], 10), d = parseInt(dmy[1], 10);
            if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
                return y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
            }
        }
        // Try Excel serial date number (e.g., 46278 = a date around 2026)
        if (/^\d{4,5}$/.test(s)) {
            var serial = parseInt(s, 10);
            if (serial >= 30000 && serial <= 70000) {
                var adjSerial = serial > 59 ? serial - 1 : serial;
                var epochMs = new Date(1899, 11, 30).getTime();
                var dtSerial = new Date(epochMs + adjSerial * 86400000);
                if (!isNaN(dtSerial.getTime()) && dtSerial.getFullYear() >= 1900 && dtSerial.getFullYear() <= 2100) {
                    return dtSerial.getFullYear() + '-' + String(dtSerial.getMonth() + 1).padStart(2, '0') + '-' + String(dtSerial.getDate()).padStart(2, '0');
                }
            }
        }
        // Try parsing as Date object or date string via Date constructor
        var dt = new Date(s);
        if (!isNaN(dt.getTime())) {
            var yyyy = dt.getFullYear();
            var mm = String(dt.getMonth() + 1).padStart(2, '0');
            var dd = String(dt.getDate()).padStart(2, '0');
            if (yyyy >= 1900 && yyyy <= 2100) return yyyy + '-' + mm + '-' + dd;
        }
        // Return original if nothing worked
        return s;
    }


        // =====================================================================
        //  מנוע שפה דו‑לשוני (i18n) — ברמת המשתמש
        //  סדר עדיפויות לזיהוי השפה: ① בחירת המשתמש (localStorage) →
        //  ② הגדרת המערכת (settings) → ③ ברירת מחדל 'he'.
        //  העדפה אישית נשמרת אצל המשתמש בלבד — לעולם לא בקובץ המשותף.
        // =====================================================================
        var UI_STRINGS = {
                dashboard:      { he: 'לוח בקרה',                 ar: 'لوحة التحكم' },
                solutions:      { he: 'קטלוג פתרונות למידה',       ar: 'كتالوج حلول التعلم' },
                mentors:        { he: 'מאגר מרצים',               ar: 'بنك المحاضرين' },
                guides_repo:    { he: 'מאגר מדריכים',             ar: 'بنك المرشدين' },
                guides:         { he: 'ניהול משתמשים',            ar: 'إدارة المستخدمين' },
                budgets:        { he: 'תקציבים',                 ar: 'الميزانيات' },
                periods:        { he: 'תקופות',                   ar: 'الفترات' },
                'lookup-tables':{ he: 'טבלאות ערכים',             ar: 'جداول القيم' },
                registrations:  { he: 'נרשמים',                   ar: 'المسجَّلون' },
                permissions:    { he: 'הרשאות',                   ar: 'الصلاحيات' },
                'activity-log': { he: 'יומן פעילות',              ar: 'سجل النشاط' },
                'recycle-bin':  { he: 'סל מחזור',                 ar: 'سلة المحذوفات' },
                homepage:       { he: 'דף שער',                   ar: 'الصفحة الرئيسية' },
                faq:            { he: 'שאלות נפוצות',             ar: 'الأسئلة الشائعة' },
                settings:       { he: 'הגדרות',                   ar: 'الإعدادات' },
                instructors:    { he: 'שיוך מנחים',               ar: 'إسناد المرشدين' },
                logout:         { he: 'התנתקות',                  ar: 'تسجيل الخروج' },
                'custom-pages':  { he: 'יצירת דף חדש',            ar: 'إنشاء صفحة جديدة' },
                brand_sub:      { he: 'מעקב פתרונות למידה',        ar: 'متابعة حلول التعلم' }
        };

        // בונה פעם אחת מפות "עברית↔ערבית" מתוך המילון (לתרגום התפריט/הכותרת)
        var _HE2AR = {}, _AR2HE = {}, _HE_KEYS = [];
        (function () {
                var pairs = [];
                Object.keys(UI_STRINGS).forEach(function (k) {
                        var he = UI_STRINGS[k].he, ar = UI_STRINGS[k].ar;
                        _HE2AR[he] = ar; _AR2HE[ar] = he; pairs.push(he); pairs.push(ar);
                });
                pairs.sort(function (a, b) { return b.length - a.length; });
                _HE_KEYS = pairs;
        })();

        var _LANG_KEY = 'matspanet_ui_lang';

        function getUiLang() {
                // Back Office: settings.json language takes precedence (default: Hebrew for Back End)
                try {
                        if (typeof DataStore !== 'undefined' && DataStore.getSettings) {
                                var d = (DataStore.getSettings() || {}).language;
                                if (d === 'ar' || d === 'he') return d;
                        }
                } catch (e) {}
                try {
                        var s = localStorage.getItem(_LANG_KEY);
                        if (s === 'ar' || s === 'he') return s;
                } catch (e) {}
                return 'he'; // Default to Hebrew for Back End / Dashboard
        }

        function _locLabel(item) {
                if (!item) return '';
                // Always return Hebrew label for dashboard display
                return item.label || item.labelAr || item.value || '';
        }

        function _translateTextNodes(root) {
                if (!root) return;
                var lang = getUiLang();
                var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
                var node, batch = [];
                while ((node = walker.nextNode())) batch.push(node);
                batch.forEach(function (n) {
                        var orig = n.nodeValue;
                        if (!orig || !orig.trim()) return;
                        var nv = orig;
                        for (var i = 0; i < _HE_KEYS.length; i++) {
                                var token = _HE_KEYS[i];
                                var from = (lang === 'ar') ? token : _HE2AR[token];
                                var to   = (lang === 'ar') ? _HE2AR[token] : token;
                                if (from && to && nv.indexOf(from) !== -1) nv = nv.split(from).join(to);
                        }
                        if (nv !== orig) n.nodeValue = nv;
                });
        }

        function applyUiLang(lang, opts) {
                lang = (lang === 'ar') ? 'ar' : 'he';
                opts = opts || {};
                try { document.documentElement.setAttribute('lang', lang); } catch (e) {}
                try { document.documentElement.setAttribute('dir', 'rtl'); } catch (e) {}
                try {
                        document.querySelectorAll('[data-i18n]').forEach(function (el) {
                                var k = el.getAttribute('data-i18n'); if (UI_STRINGS[k]) el.textContent = t(k);
                        });
                        document.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
                                var k = el.getAttribute('data-i18n-ph'); if (UI_STRINGS[k]) el.setAttribute('placeholder', t(k));
                        });
                } catch (e) {}
                if (!opts.soft) {
                        try {
                                var active = document.querySelector('.section-page.active');
                                var sec = active ? active.id.replace('section-', '') : null;
                                if (sec && window.App && typeof App.showSection === 'function') App.showSection(sec);
                        } catch (e) {}
                }
                _translateTextNodes(document.getElementById('sidebarNav'));
                _translateTextNodes(document.getElementById('headerTitle'));
                // מתג שפה הוסר מה-Back End - קוד זה נשמר לתאימות עתידית בלבד
                try {
                        document.querySelectorAll('.ms-lang-opt').forEach(function (b) {
                                b.classList.toggle('is-active', b.getAttribute('data-lang') === lang);
                                b.setAttribute('aria-pressed', b.getAttribute('data-lang') === lang ? 'true' : 'false');
                        });
                } catch (e) {}
                try { document.dispatchEvent(new CustomEvent('matspanet:langchange', { detail: { lang: lang } })); } catch (e) {}
        }

        function setUiLang(lang) {
                lang = (lang === 'ar') ? 'ar' : 'he';
                try { localStorage.setItem(_LANG_KEY, lang); } catch (e) {}
                applyUiLang(lang);
        }
        // פונקציית toggleUiLang הוסרה - Back End עברי בלבד ללא החלפת שפה
        function __ms_translateHeader() { _translateTextNodes(document.getElementById('headerTitle')); }
        
        // פונקציית תרגום - מחזירה את התווית בשפה הנוכחית (ברירת מחדל: עברית ל-Back End)
        function t(key) {
            if (!UI_STRINGS[key]) return key;
            var lang = getUiLang();
            return lang === 'ar' ? UI_STRINGS[key].ar : UI_STRINGS[key].he;
        }

        // חשיפה גלובלית
        window.getUiLang = getUiLang;
        // window.setUiLang = setUiLang;  // לא בשימוש ב-Back End (עברית בלבד)
        // window.toggleUiLang = toggleUiLang;  // הוסר
        window.applyUiLang = applyUiLang;
        window.t = t;
        window.__ms_translateHeader = __ms_translateHeader;

    function getLookupOptions(key, selectedValue) {
        const items = DataStore.getAll(key) || [];
        return items.filter(i => i.isActive !== false).map(i =>
            `<option value="${escAttr(i.value)}" ${selectedValue === i.value ? 'selected' : ''}>${escAttr(i.label || i.labelAr || i.value)}</option>`
        ).join('');
    }

    function getTopicLookupKey(topicType) {
        const map = {
            'תחום דעת': DataStore.KEYS.LOOKUP_FIELD_KNOWLEDGE,
            'בעלי תפקידים': DataStore.KEYS.LOOKUP_ROLE_HOLDERS,
            'נושא רוחב': DataStore.KEYS.LOOKUP_BROAD_TOPICS,
            'תוכניות ייעודיות': DataStore.KEYS.LOOKUP_DESIGNATED_PROGRAMS
        };
        return map[topicType] || null;
    }

    function getTopicLabel(topicType, topicValue) {
        if (!topicType || !topicValue) return topicValue || '—';
        const key = getTopicLookupKey(topicType);
        if (!key) return topicValue;
        const items = DataStore.getAll(key) || [];
        const item = items.find(i => i.value === topicValue);
        if (!item) return topicValue;
        // Always return Hebrew label for dashboard display
        return item.label || item.labelAr || topicValue;
    }

    function _onTopicTypeChange(preSelectValue) {
        const sel = document.getElementById('fSolTopicType').value;
        const topicSelect = document.getElementById('fSolTopic');
        if (!sel) {
            topicSelect.innerHTML = '<option value="">בחר תחום ונושא קודם</option>';
            topicSelect.disabled = true;
            return;
        }
        // בית ספרי – אין נושאים
        if (sel === 'בית ספרי') {
            topicSelect.innerHTML = '<option value="">לא רלוונטי</option>';
            topicSelect.disabled = true;
            return;
        }
        const key = getTopicLookupKey(sel);
        if (!key) {
            topicSelect.innerHTML = '<option value="">אין נושאים</option>';
            topicSelect.disabled = true;
            return;
        }
        const currentTopic = preSelectValue || (editingItem ? (editingItem.topic || '') : '');
        let opts = getLookupOptions(key, currentTopic);
        // If the stored value doesn't match any lookup option, preserve it as a fallback
        if (currentTopic && !opts.includes('selected')) {
            opts += `<option value="${escAttr(currentTopic)}" selected>${escAttr(currentTopic)}</option>`;
        }
        topicSelect.innerHTML = '<option value="">בחר</option>' + opts;
        topicSelect.disabled = false;
    }

    function getLookupLabel(key, value) {
        if (!value) return '—';
        const items = DataStore.getAll(key) || [];
        const item = items.find(i => i.value === value);
        if (!item) return value;
        // Always return Hebrew label for dashboard display
        return item.label || item.labelAr || item.value || value;
    }

    /** Get lookup label in Hebrew (for dashboard use) */
    function getLookupLabelHe(key, value) {
        if (!value) return '—';
        const items = DataStore.getAll(key) || [];
        const item = items.find(i => i.value === value);
        if (!item) return value;
        return item.label || item.labelAr || item.value || value;
    }
    
    /** Generate select options for lecturer status lookup table */
    function _lecturerStatusOpts(selected) {
        var html = '<option value="">בחר סטטוס</option>';
        const items = DataStore.getAll(DataStore.KEYS.LOOKUP_LECTURER_STATUS) || [];
        items.forEach(function(o) {
            var sel = (o.value === selected) ? ' selected' : '';
            // Always use Hebrew label for dropdown options in dashboard
            html += '<option value="' + escAttr(o.value) + '"' + sel + '>' + escAttr((o.label || o.labelAr || o.value) || '') + '</option>';
        });
        if (selected && !items.some(i => i.value === selected)) {
            html += '<option value="' + escAttr(selected) + '" selected>' + escAttr(selected) + '</option>';
        }
        return html;
    }
    
    /** Format phone input as user types - Israeli mobile format: 05X-XXXXXXX */
    function _formatPhoneInput(input) {
        let val = input.value.replace(/[^0-9]/g, '');
        if (val.length > 3) {
            val = val.substring(0, 3) + '-' + val.substring(3, 10);
        }
        input.value = val;
    }

    /** Convert educationStage/educationType (array or comma-separated string) to readable label string */
    function getLookupLabelsJoined(key, val) {
        if (!val) return '';
        var items = [];
        if (Array.isArray(val)) { items = val; }
        else if (typeof val === 'string' && val.indexOf(',') !== -1) { items = val.split(',').map(function(s) { return s.trim(); }).filter(Boolean); }
        else { items = [val]; }
        return items.map(function(v) { return getLookupLabel(key, v); }).filter(function(l) { return l && l !== '—'; }).join(', ');
    }

    function getHebrewYearOptions(selectedValue) {
        return Object.keys(DataStore.HEBREW_YEARS).map(y =>
            `<option value='${y}' ${selectedValue === y ? 'selected' : ''}>${y}</option>`
        ).join('');
    }

    function buildCheckboxes(key, selectedArr) {
        if (!selectedArr) selectedArr = [];
        const items = DataStore.getAll(key) || [];
        return items.filter(i => i.isActive !== false).map(i => `
            <label style="display:flex;align-items:center;gap:6px;font-size:13px;padding:4px 0;cursor:pointer;">
                <input type="checkbox" name="lookup_${key}" value="${i.value}" ${selectedArr.includes(i.value) ? 'checked' : ''} style="width:16px;height:16px;">
                ${i.label}
            </label>
        `).join('');
    }

    function getCheckedValues(key) {
        const checkboxes = document.querySelectorAll(`input[name="lookup_${key}"]:checked`);
        return Array.from(checkboxes).map(cb => cb.value);
    }

    function buildMentorCheckboxes(selectedArr) {
        if (!selectedArr) selectedArr = [];
        const mentors = (DataStore.getAll(DataStore.KEYS.MENTORS) || []).filter(m => m.isActive !== false);
        if (!mentors.length) return '<div style="color:var(--gray-400);font-size:13px;">אין מרצים במאגר. הוסף מרצים בטאב "מאגר מרצים".</div>';
        return mentors.map(m => `
            <label style="display:flex;align-items:center;gap:6px;font-size:13px;padding:4px 0;cursor:pointer;">
                <input type="checkbox" name="mentor_select" value="${m.id}" ${selectedArr.includes(m.id) ? 'checked' : ''} style="width:16px;height:16px;">
                ${escAttr(getMentorName(m))}${m.idNumber ? ' <span style="color:var(--gray-400);font-size:11px;">(' + escAttr(m.idNumber) + ')</span>' : ''}
            </label>
        `).join('');
    }

    function getSelectedMentorIds() {
        const checkboxes = document.querySelectorAll('input[name="mentor_select"]:checked');
        return Array.from(checkboxes).map(cb => cb.value);
    }

    function getStatusBadge(status) {
        const map = {
            'פעיל': 'success', 'active': 'success',
            'ממתין לאישור': 'warning', 'pending': 'warning',
            'בתכנון': 'info', 'planning': 'info',
            'הושלם': 'primary', 'completed': 'primary',
            'בוטל': 'gray', 'cancelled': 'gray',
            'שיוך מלא': 'success', 'שיוך חלקי': 'warning', 'לא שויך': 'danger',
            'אושר': 'success', 'נדחה': 'danger',
            'אושר פדגוגית': 'primary',
            'השלמת פרטים': 'warning',
            'עודכן מרצה': 'info',
            'מוסב': 'info',
            'לא מוסב': 'gray',
            'אחר': 'gray',
            'הוגשה בקשה': 'warning',
            'מומחה בתחומו': 'success',
            'נדחתה הבקשה': 'danger',
            'פעיל': 'success', 'לא פעיל': 'gray', 'ממתין': 'warning'
        };
        const cls = map[status] || 'gray';
        return `<span class="badge badge-${cls}">${escAttr(status)}</span>`;
    }

    function formatDate(d) {
        if (!d) return '—';
        try { return new Date(d).toLocaleDateString('he-IL'); } catch(e) { return d; }
    }

    function downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
    }

    function printSection() {
        window.print();
    }


    let _currentLookupKey = null;
    let _activeLookupTabIndex = 0; // tracks the currently active tab across re-renders
    let _currentLookupTableLabel = ''; // visible table name header

    // ============ ACTION BAR HELPER ============
    function _buildActionBar(dataType, addFn, clearFn, clearCount) {
        let clearBtn = '';
        if (clearFn && clearCount > 0) {
            clearBtn = `<button class="btn btn-danger btn-sm" onclick="${clearFn}" style="margin-right:auto;">🗑️ מחק הכל (${clearCount})</button>`;
        }
        return `<div class="action-bar" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;padding:10px 14px;background:var(--gray-50);border-radius:var(--border-radius);border:1px solid var(--gray-100);">
    <label class="btn btn-outline btn-sm" style="cursor:pointer;margin:0;">📥 ייבוא<input type="file" accept=".csv,.xlsx,.xls" style="display:none;" onchange="App.startImport('${dataType}',this)"></label>
    <button class="btn btn-outline btn-sm" onclick="App.exportCSV('${dataType}')">📤 ייצוא CSV</button>
    <button class="btn btn-outline btn-sm" onclick="App.exportExcel('${dataType}')">📊 Excel</button>
    <button class="btn btn-outline btn-sm" onclick="App.printSection()">🖨️ הדפסה</button>
    <button class="btn btn-primary btn-sm" onclick="${addFn}">➕ הוספה</button>
    ${clearBtn}
</div>`;
    }

    // ============ LOOKUP TABLE HEADER ============
    function _lookupTableHeader(label, count, icon, rightExtra) {
        const ic = icon || '📋';
        const rightHtml = rightExtra
            ? `<span style="font-size:14px;opacity:0.9;display:flex;align-items:center;gap:8px;flex-wrap:wrap;"><span>${count} רשומות</span>${rightExtra}</span>`
            : `<span style="font-size:14px;opacity:0.9;">${count} רשומות</span>`;
        return `<div style="margin-bottom:16px;padding:14px 18px;background:linear-gradient(135deg, var(--primary), var(--primary-dark));color:#fff;border-radius:var(--border-radius);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
        <h2 style="margin:0;font-size:18px;font-weight:700;">${ic} ${label}</h2>
        ${rightHtml}
    </div>`;
    }

    // ============ SOLUTION FLAT ROW BUILDER (29 columns, one row per mentor, smart tagging) ============
    function _getMentorType(m) {
        if (!m) return 'רגיל';
        if ((getMentorName(m) || '') === 'כוח פנים') return 'כוח פנים';
        if (m.performerType === 'כוח פנים') return 'כוח פנים';
        if (!!m.isAccompaniment) return 'שעות ליווי';
        return 'רגיל';
    }

    function _buildSolutionFlatRows(s, insts) {
        var g = DataStore.getById(DataStore.KEYS.GUIDES_REPO, s.guideId);
        // Base budget (solution-level)
        var _isBudgeted = s.budgetType === 'כן' || s.budgetType === 'מתוקצב' || (s.budgetedHours || 0) > 0;
        var _baseBudgetTypeLabel = getLookupLabel(DataStore.KEYS.LOOKUP_BUDGET_TYPES, s.budgetTypeValue) || '';

        // Solution-level summary calculations
        var _regularSum = 0, _accSum = 0;
        for (var i = 0; i < insts.length; i++) {
            var m = insts[i];
            var mType = _getMentorType(m);
            var isSpecial = (mType === 'כוח פנים' || mType === 'שעות ליווי');
            var mTotal = isSpecial ? (m.totalAcademicHours || 0) : ((m.period1Hours || 0) + (m.period2Hours || 0));
            if (mType === 'רגיל') { _regularSum += mTotal; }
            else if (mType === 'שעות ליווי') { _accSum += mTotal; }
        }
        // Col 16: סה״כ שעות מתוקצבות = רגיל only
        var _totalBudgetedHours = _regularSum > 0 ? _regularSum : '';
        // Col 23: סה״כ שעות מתוקצבות (שעות ליווי) = שעות ליווי only
        var _accBudgetedHours = _accSum > 0 ? _accSum : '';

        // Solution-level tail fields
        var _showCat = (s.showInCatalog || s.showInPublicCatalog) ? 'כן' : 'לא';

        // Helper: build a row with given mentor data (28 columns)
        // specialM: if set (for כוח פנים / שעות ליווי), total uses totalAcademicHours
        function makeRow(mType, mName, mP2, mP1, specialM) {
            var rowTotal;
            if (specialM) {
                rowTotal = specialM.totalAcademicHours || 0;
            } else {
                rowTotal = (mP2 || 0) + (mP1 || 0);
            }
            return [
                getLookupLabel(DataStore.KEYS.LOOKUP_RESPONSIBILITY_TYPES, s.responsibilityType) || '',  // 0
                s.schoolName || '',                     // 1
                s.name || '',                           // 2
                s.solutionNumber || '',                 // 3
                s.description || '',                    // 4
                g ? g.fullName : '',                    // 5
                s.topicType || '',                      // 6
                s.topic || '',                          // 7
                getLookupLabelsJoined(DataStore.KEYS.LOOKUP_EDUCATION_STAGES, s.educationStage),     // 8
                getLookupLabelsJoined(DataStore.KEYS.LOOKUP_EDUCATION_TYPES, s.educationType),       // 9
                s.startDate || '',                      // 10
                s.endDate || '',                        // 11
                s.weekDay || '',                        // 12
                s.meetingType || '',                    // 13
                s.academicHours || '',                  // 14
                _isBudgeted ? 'כן' : 'לא',            // 15
                _totalBudgetedHours,                    // 16 — רגיל only
                _baseBudgetTypeLabel,                   // 17
                mType || '',                            // 18 — סוג המנחה
                mName || '',                            // 19
                (mP2 || 0),            // 20 — תקופה ב׳
                (mP1 || 0),            // 21 — תקופה א׳
                rowTotal,                              // 22 — סה"כ
                _accBudgetedHours,                      // 23 — שעות ליווי only
                s.whatsappLink || '',                   // 24
                s.earlyRegistrationLink || '',          // 25
                _showCat,                               // 26
                s.notes || ''                           // 27
            ];
        }

        var rows = [];

        // If no instructors at all, produce one empty row
        if (insts.length === 0) {
            rows.push(makeRow('', '', 0, 0));
            return rows;
        }

        // One row per mentor
        for (var j = 0; j < insts.length; j++) {
            var m = insts[j];
            var mType = _getMentorType(m);
            var mName = getMentorName(m) || '';
            var isSpecialExport = (mType === 'כוח פנים' || mType === 'שעות ליווי');
            var mP2, mP1;
            if (isSpecialExport) {
                // Special rows: export period values if entered, total from totalAcademicHours
                mP2 = m.period1Hours || 0;   // period1Hours in DB = תקופה ב׳ (09-12)
                mP1 = m.period2Hours || 0;   // period2Hours in DB = תקופה א׳ (01-08)
            } else {
                mP2 = m.period1Hours || 0;   // period1Hours in DB = תקופה ב׳ (09-12)
                mP1 = m.period2Hours || 0;   // period2Hours in DB = תקופה א׳ (01-08)
            }
            rows.push(makeRow(mType, mName, mP2, mP1, isSpecialExport ? m : null));
        }
        return rows;
    }

    var _SOLUTION_EXPORT_HEADERS = [
        'סוג האחריות של פתרון למידה',
        'שם בית הספר',
        'שם פתרון למידה',
        'מספר פתרון למידה',
        'תיאור פתרון למידה',
        'מדריך אחראי',
        'תחום',
        'נושא',
        'שלב חינוך',
        'סוג חינוך',
        'תאריך תחילת ההשתלמות',
        'תאריך סיום ההשתלמות',
        'יום בשבוע',
        'סוג מפגש',
        'שעות אקדמיות מוכרות לגמול',
        'מתוקצב?',
        'סה"כ שעות מתוקצבות',
        'סוג תקצוב',
        'סוג המנחה',
        'שם המנחה',
        'שעות לתקופה ב׳ 09-12',
        'שעות לתקופה א׳ 01-08',
        'סה"כ שעות',
        'סה"כ שעות מתוקצבות (שעות ליווי)',
        'קישור וואטסאפ',
        'קישור רישום מוקדם',
        'הצג בקטלוג הציבורי',
        'הערה כללית'
    ];

    var _SOLUTION_COL_WIDTHS = [
        {wch:28},{wch:18},{wch:28},{wch:14},{wch:40},{wch:16},{wch:16},{wch:22},
        {wch:22},{wch:14},{wch:14},{wch:14},{wch:12},{wch:14},{wch:14},
        {wch:10},{wch:12},{wch:14},{wch:16},{wch:20},{wch:20},{wch:14},
        {wch:14},{wch:20},{wch:30},{wch:30},{wch:12},{wch:30}
    ];

    function exportExcel(type) {
        if (typeof XLSX === 'undefined') { showToast('ספריית XLSX לא נטענה', 'error'); return; }
        let data = [], sheetName = type;
        if (type === 'lookup_table') {
            if (!_currentLookupKey) { showToast('לא נבחרה טבלה', 'warning'); return; }
            const items = DataStore.getAll(_currentLookupKey) || [];
            if (!items.length) { showToast('אין נתונים', 'warning'); return; }
            data = items.map(i => ({ 'ערך': i.value || '', 'תווית (עברית)': i.label || '', 'תווית (ערבית)': i.labelAr || '', 'סדר': i.order || 1, 'פעיל': i.isActive !== false ? 'כן' : 'לא' }));
            sheetName = 'ערכים';
        } else {
            const keyMap = { solutions: DataStore.KEYS.SOLUTIONS, mentors: DataStore.KEYS.MENTORS, guides_repo: DataStore.KEYS.GUIDES_REPO, budgets: DataStore.KEYS.BUDGETS, users: DataStore.KEYS.USERS, inspectors: DataStore.KEYS.INSPECTORS, pedagogical_executors: DataStore.KEYS.PEDAGOGICAL_EXECUTORS, faq: DataStore.KEYS.FAQ_DATA };
            const key = keyMap[type];
            if (!key) { showToast('סוג לא ידוע: ' + type, 'error'); return; }
            const items = DataStore.getAll(key) || [];
            if (!items.length) { showToast('אין נתונים', 'warning'); return; }
            if (type === 'solutions') {
                // Flat format: 28 columns, one row per mentor
                var _allInst = DataStore.getAll(DataStore.KEYS.SOLUTION_INSTRUCTORS) || [];
                var _instBySol = {};
                _allInst.forEach(function(inst) {
                    if (!_instBySol[inst.solutionId]) _instBySol[inst.solutionId] = [];
                    _instBySol[inst.solutionId].push(inst);
                });
                var _aoa = [];
                _aoa.push(_SOLUTION_EXPORT_HEADERS);

                var _solColorGroups = []; // track solutions with >2 rows for background coloring
                var pastelColors = [
                    { r: 255, g: 230, b: 230 }, // ורוד חיוור
                    { r: 220, g: 245, b: 255 }, // תכלת
                    { r: 220, g: 255, b: 230 }, // ירוק מנטה
                    { r: 255, g: 250, b: 210 }, // צהוב עדין
                    { r: 235, g: 225, b: 255 }, // לבנדר
                    { r: 255, g: 235, b: 245 }, // ורוד בהיר
                    { r: 230, g: 245, b: 240 }, // ירוק-כחול
                    { r: 255, g: 240, b: 220 }  // אפרסק
                ];
                var colorIndex = 0;
                items.forEach(function(s) {
                    var insts = _instBySol[s.id] || [];
                    var sRows = _buildSolutionFlatRows(s, insts);
                    var startIdx = _aoa.length; // row index in aoa (0 = header)
                    for (var r = 0; r < sRows.length; r++) { _aoa.push(sRows[r]); }
                    // Apply color to ALL solutions with multiple rows (not just >2)
                    if (sRows.length > 1) {
                        // Use sequential pastel color instead of random
                        var pastel = pastelColors[colorIndex % pastelColors.length];
                        colorIndex++;
                        var hexR = pastel.r.toString(16).toUpperCase();
                        var hexG = pastel.g.toString(16).toUpperCase();
                        var hexB = pastel.b.toString(16).toUpperCase();
                        _solColorGroups.push({ startRow: startIdx, count: sRows.length, rgb: 'FF' + (hexR.length < 2 ? '0' + hexR : hexR) + (hexG.length < 2 ? '0' + hexG : hexG) + (hexB.length < 2 ? '0' + hexB : hexB) });
                    }
                });

                var _solWs = XLSX.utils.aoa_to_sheet(_aoa);
                _solWs['!cols'] = _SOLUTION_COL_WIDTHS;

                // Apply random background colors to multi-row solution groups
                if (_solColorGroups.length > 0) {
                    var _headerColCount = _SOLUTION_EXPORT_HEADERS.length;
                    _solColorGroups.forEach(function(grp) {
                        for (var ri = 0; ri < grp.count; ri++) {
                            var aoaRow = grp.startRow + ri;
                            for (var ci = 0; ci < _headerColCount; ci++) {
                                var cellRef = XLSX.utils.encode_cell({ r: aoaRow, c: ci });
                                if (!_solWs[cellRef]) continue;
                                if (!_solWs[cellRef].s) _solWs[cellRef].s = {};
                                _solWs[cellRef].s.fill = { patternType: 'solid', fgColor: { rgb: grp.rgb } };
                            }
                        }
                    });
                }

                var _solWb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(_solWb, _solWs, 'פתרונות למידה');
                XLSX.writeFile(_solWb, 'matspanet_solutions_' + new Date().toISOString().split('T')[0] + '.xlsx');
                showToast('יוצא בהצלחה', 'success');
                return;
            } else if (type === 'mentors') {
                data = items.map(m => ({ 'ת.ז. מרצה': m.idNumber || '', 'שם מרצה (עברית)': m.fullNameHe || '', 'שם מרצה (ערבית)': m.fullNameAr || '', 'טלפון נייד': m.phone || '', 'דוא"ל': m.email || '', 'מרצה מוסב': m.isCertifiedLecturer !== null ? (m.isCertifiedLecturer ? 'כן' : 'לא') : '', 'מומחה בתחומו': m.expertInField !== null ? (m.expertInField ? 'כן' : 'לא') : '', 'סטטוס': m.lecturerStatus || '' }));
                sheetName = 'מרצים';
            } else if (type === 'guides_repo') {
                data = items.map(g => ({ 'ת.ז.': g.idNumber || '', 'שם מלא (עברית)': g.fullNameHe || g.fullName || '', 'שם מלא (ערבית)': g.fullNameAr || '', 'תפקיד': g.position || '', 'טלפון': g.phone || '', 'דוא"ל': g.email || '', 'תחומי התמחות': g.specializations || '' }));
                sheetName = 'מדריכים';
            } else if (type === 'budgets') {
                data = items.map(b => ({ 'קוד תקציב': b.budgetCode || '', 'שנת תקציב (עברית)': b.hebrewYear || '', 'שנת תקציב': b.englishYear || '', 'תקופה': b.period || '', 'ידוע / משוערך': b.estimationStatus || '', 'צבע הכסף': b.moneyColor || '', 'יחידה אירגונית מנהלת': b.organizationalUnit || '', 'תקציב עבור': b.budgetFor || '', 'תיאור תקציב': b.description || '', 'הערה': b.notes || '', 'סכום (₪)': b.amount || 0, 'יתרת תכנון (₪)': b.planningBalance || 0, 'יתרת ניהול (₪)': b.managementBalance || 0, 'יתרת תקציב פנויה (₪)': b.freeBudgetBalance || 0 }));
                sheetName = 'תקציבים';
            } else if (type === 'users') {
                data = items.map(u => ({ 'שם מלא': u.fullName || '', 'שם משתמש': u.username || '', 'תפקיד': u.role || '', 'דוא"ל': u.email || '' }));
                sheetName = 'משתמשים';
            } else if (type === 'inspectors') {
                data = items.map(i => ({ 'שם מפקח': i.fullName || '', 'טלפון': i.phone || '', 'דוא"ל': i.email || '', 'מחוז': i.district || '', 'בתי ספר': (i.schoolIds || []).join(', ') }));
                sheetName = 'מפקחים';
            } else if (type === 'pedagogical_executors') {
                data = items.map(p => ({ 'ח.פ.': p.companyNumber || '', 'שם המוסד': p.institutionName || '', 'קבוצה': p.groupName || '', 'עלות שעה': p.hourlyCost != null ? p.hourlyCost : '', 'הערה': p.notes || '' }));
                sheetName = 'מבצעים פדגוגיים';
            } else if (type === 'faq') {
                data = items.map(f => ({ 'סדר': f.order || 0, 'כותרת (ערבית)': f.titleAr || '', 'כותרת (עברית)': f.titleHe || '', 'תשובה (ערבית)': (f.answerAr || '').replace(/<[^>]*>/g, ''), 'תשובה (עברית)': (f.answerHe || '').replace(/<[^>]*>/g, '') }));
                sheetName = 'שאלות נפוצות';
            }
        }
        if (!data.length) { showToast('אין נתונים', 'warning'); return; }
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        XLSX.writeFile(wb, `matspanet_${type}_${new Date().toISOString().split('T')[0]}.xlsx`);
        showToast('יוצא בהצלחה', 'success');
    }

    // ============ APP CONTEXT (Year Context) ============
    var AppContext = { activePeriod: null, displayPeriod: null };

    /**
     * Resolves the DISPLAY period using hierarchy:
     * 1. Manual selection (sessionStorage) — user explicitly chose a period
     * 2. Date-driven — find period where today falls within period1Start..period2End
     * 3. Fallback — active period
     */
    function _resolveDisplayPeriod() {
        // 1. Check manual selection stored in sessionStorage
        var manualId = sessionStorage.getItem('displayPeriodId');
        if (manualId) {
            var allPeriods = DataStore.getAll(DataStore.KEYS.PERIODS) || [];
            for (var i = 0; i < allPeriods.length; i++) {
                if (allPeriods[i].id === manualId) return allPeriods[i];
            }
            // Manual ID no longer exists — clear and fall through
            sessionStorage.removeItem('displayPeriodId');
        }
        // 2. Date-driven: find period containing today
        var today = new Date(); today.setHours(0, 0, 0, 0);
        var periods = DataStore.getAll(DataStore.KEYS.PERIODS) || [];
        for (var i = 0; i < periods.length; i++) {
            var p = periods[i];
            var starts = [p.period1Start, p.period2Start].filter(Boolean).map(function(d) { return new Date(d); }).sort(function(a, b) { return a - b; });
            var ends = [p.period1End, p.period2End].filter(Boolean).map(function(d) { return new Date(d); }).sort(function(a, b) { return b - a; });
            if (starts.length > 0 && ends.length > 0) {
                if (today >= starts[0] && today <= ends[0]) return p;
            }
        }
        // 3. Fallback: use active period
        return AppContext.activePeriod;
    }

    function _loadActivePeriod() {
        var periods = DataStore.getAll(DataStore.KEYS.PERIODS) || [];
        var active = null;
        for (var i = 0; i < periods.length; i++) {
            if (periods[i].isActive) { active = periods[i]; break; }
        }
        AppContext.activePeriod = active;
        AppContext.displayPeriod = _resolveDisplayPeriod();

        // Silent migration: assign periodId to legacy solutions that don't have one
        if (active) {
            var allSols = DataStore.getAll(DataStore.KEYS.SOLUTIONS) || [];
            for (var j = 0; j < allSols.length; j++) {
                if (!allSols[j].periodId) {
                    DataStore.update(DataStore.KEYS.SOLUTIONS, allSols[j].id, { periodId: active.id });
                }
            }
        }

        return active;
    }

    function _getActivePeriodRange() {
        var p = AppContext.activePeriod;
        if (!p) return null;
        var starts = [p.period1Start, p.period2Start].filter(Boolean).sort();
        var ends = [p.period1End, p.period2End].filter(Boolean).sort().reverse();
        return { rangeStart: starts[0] || null, rangeEnd: ends[0] || null };
    }

    function _renderActivePeriodBadge() {
        var container = document.getElementById('activePeriodBadge');
        if (!container) return;
        var allPeriods = DataStore.getAll(DataStore.KEYS.PERIODS) || [];
        var displayP = AppContext.displayPeriod;
        var activeP = AppContext.activePeriod;
        var manualId = sessionStorage.getItem('displayPeriodId');

        if (allPeriods.length === 0) {
            container.innerHTML = '<span style="color:var(--gray-400);font-size:12px;">לא הוגדרו תקופות</span>';
            return;
        }

        // Build dropdown options
        var optsHtml = '<option value="">📅 אוטומטי (לפי תאריך)</option>';
        for (var i = 0; i < allPeriods.length; i++) {
            var p = allPeriods[i];
            var sel = (manualId === p.id) ? ' selected' : '';
            optsHtml += '<option value="' + escAttr(p.id) + '"' + sel + '>' + escAttr(p.hebrewYear || '') + ' (' + escAttr(p.englishYear || '') + ')</option>';
        }

        // Show "קליטה" badge only when display period differs from active (data entry context)
        var activeLabel = '';
        if (activeP && (!displayP || displayP.id !== activeP.id)) {
            activeLabel = '<span style="display:inline-flex;align-items:center;gap:4px;background:var(--success);color:#fff;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;white-space:nowrap;">📝 קליטה: ' + escAttr(activeP.hebrewYear || '') + '</span>';
        }

        container.innerHTML =
            '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">' +
                '<select id="displayPeriodSelect" onchange="App._setDisplayPeriod(this.value)" style="appearance:none;background:var(--primary);color:#fff;border:none;border-radius:20px;padding:5px 28px 5px 12px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;direction:rtl;max-width:200px;background-image:url(\'data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2210%22 height=%226%22><path d=%22M0 0l5 6 5-6z%22 fill=%22white%22/></svg>\');background-repeat:no-repeat;background-position:left 8px center;background-size:10px;">' +
                    optsHtml +
                '</select>' +
                activeLabel +
            '</div>';
    }

    function _setDisplayPeriod(periodId) {
        if (periodId) {
            sessionStorage.setItem('displayPeriodId', periodId);
        } else {
            sessionStorage.removeItem('displayPeriodId');
        }
        AppContext.displayPeriod = _resolveDisplayPeriod();
        _renderActivePeriodBadge();
        if (currentSection === 'solutions') { renderSolutions(); }
        if (currentSection === 'dashboard') { renderDashboard(); }
        if (currentSection === 'budgets') { renderBudgets(); }
        updateSolutionsCount();
    }

    function _switchActivePeriod(periodId) {
        var allPeriods = DataStore.getAll(DataStore.KEYS.PERIODS) || [];
        allPeriods.forEach(function(p) {
            DataStore.update(DataStore.KEYS.PERIODS, p.id, { isActive: (p.id === periodId) });
        });
        _loadActivePeriod();
        _renderActivePeriodBadge();
        renderPeriods();
        // Display period may have changed (if no manual selection and was falling back to active)
        if (currentSection === 'solutions') { renderSolutions(); }
        if (currentSection === 'dashboard') { renderDashboard(); }
        if (currentSection === 'budgets') { renderBudgets(); }
        updateSolutionsCount();
        showToast('התקופה הפעילה שונתה', 'success');
    }

    // ============ INITIALIZATION ============
 function init() {
     currentUser = Auth.requireAuth();
     if (!currentUser) return;
     _initTableFeatures();
     _loadActivePeriod();
     
     // רישום כניסה למערכת
     logActivity('login', 'כניסה למערכת', 'system', currentUser.id);
     renderSidebar();
     renderUserInfo();
     _renderActivePeriodBadge();
     
     // 🔄 שחזור המיקום האחרון לפני הרענון (ברירת מחדל: dashboard)
     let sectionToLoad = 'dashboard';
     try {
         const savedSection = sessionStorage.getItem('matspanet_last_section');
         if (savedSection) {
             sectionToLoad = savedSection;
         }
         
         // אם חוזרים ל"טבלאות ערכים", נשחזר גם את הטאב האחרון שהיה פתוח
         if (sectionToLoad === 'lookup-tables') {
             const savedTab = sessionStorage.getItem('matspanet_last_lookup_tab');
             if (savedTab !== null) {
                 _activeLookupTabIndex = parseInt(savedTab, 10);
             }
         }
     } catch(e) {
         // התעלמות משגיאות אחסון
     }
     
     showSection(sectionToLoad);
     setupEventListeners();
 }

    // ============ NAVIGATION ============
    let _newSolFlow = { step: 1, responsibilityType: null, editingId: null };
    let _msSelectedIds = []; // Multi-select autocomplete selected mentor IDs
    let _msHighlightIdx = -1; // Keyboard navigation highlight index
    let _msFilteredItems = []; // Current filtered dropdown items
    let _msPrefix = 'nsf_'; // Element ID prefix for the current instance

 function showSection(section) {
     currentSection = section;
     
     // 📌 שמירת המיקום הנוכחי כדי לשחזר אותו לאחר רענון הדף
     try { sessionStorage.setItem('matspanet_last_section', section); } catch(e) {}

     // Navigation guard: if user can't view this section, redirect to dashboard
     const permSection = (section === 'new-solution') ? 'solutions' : section;
     if (permSection !== 'dashboard' && !_canViewSection(permSection)) {
         section = 'dashboard';
         currentSection = 'dashboard';
         showToast('אין לך הרשאה לגשת לחלק זה של המערכת', 'warning');
     }
     // ... (השאר את שאר הקוד של הפונקציה כמו שהוא)
        document.querySelectorAll('.section-page').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        const sectionEl = document.getElementById('section-' + section);
        const navEl = document.querySelector(`.nav-item[data-section="${section}"]`);
        if (sectionEl) sectionEl.classList.add('active');
        if (navEl) navEl.classList.add('active');

        const titleMap = {
            'dashboard': '📊 לוח בקרה',
			'solutions': '📚 קטלוג פתרונות למידה',
            'instructors': '👨‍🏫 מאגר מרצים',
            'guides': '🧑‍🏫 ניהול משתמשים',
			'guides-repo': '📋 מאגר מדריכים',
            'budgets': '💰 תקציבים',
			'periods': '📅 תקופות',
            'lookup-tables': '🔄 טבלאות ערכים',
			'settings': '⚙️ הגדרות',
            'registrations': '👥 נרשמים לפתרונות למידה',
            'permissions': '🔐 הרשאות מתקדמות',
            'activity-log': '📊 מעקב והיסטוריה',
            'recycle-bin': '🗑️ סל מחזור',
            'homepage': '🏠 דף שער',
            'faq': '❓ שאלות נפוצות ותשובות',
            'workshop-bookings': '🏔️ הזמנת סדנאות בפסגה',
			'workshop-sim-bookings': '🎭 הזמנת סדנאות סימולציה',
            'custom-pages': '📄 יצירת דף חדש',
            'new-solution': '➕ הוספת פתרון למידה חדש לקטלוג'
        };
        const titleEl = document.getElementById('headerTitle');
        if (titleEl) titleEl.textContent = titleMap[section] || 'מצפן נט';

        switch (section) {
            case 'dashboard': renderDashboard(); break;
            case 'solutions': renderSolutions(); break;
			case 'clusters': renderClusters(); break;
            case 'instructors': renderMentors(); break;
            case 'guides': renderGuides(); break;
            case 'guides-repo': renderGuidesRepo(); break;
            case 'budgets': renderBudgets(); break;
            case 'periods': renderPeriods(); break;
            case 'lookup-tables': renderLookupTables(); break;
            case 'registrations': renderRegistrations(); break;
            case 'permissions': renderPermissions(); break;
            case 'activity-log': renderActivityLog(); break;
            case 'recycle-bin': renderRecycleBin(); break;
            case 'homepage': renderHomepage(); break;
            case 'faq': renderFAQ(); break;
			case 'workshop-bookings': renderWorkshopBookings(); break;
			case 'workshop-sim-bookings': renderWorkshopSimBookings(); break;
            case 'custom-pages': renderCustomPages(); break;
            case 'settings': renderSettings(); break;
            case 'new-solution': 
                // Destroy TinyMCE editors when leaving the page
                if (currentSection !== 'new-solution' && typeof tinymce !== 'undefined') {
                    try {
                        var descEditor = tinymce.get('nsf_desc');
                        var notesEditor = tinymce.get('nsf_notes');
                        if (descEditor) { descEditor.save(); descEditor.destroy(); }
                        if (notesEditor) { notesEditor.save(); notesEditor.destroy(); }
                        _nsfTinyMCEInit = false;
                    } catch(e) {}
                }
                renderNewSolutionFlow(); 
                break;
        }
        closeSidebarMobile();
    }

    // ============ SIDEBAR ============
    // System parts list for permissions
    const SYSTEM_PARTS = [
        { id: 'dashboard',       label: 'לוח בקרה',            icon: '📊' },
        { id: 'solutions',       label: 'קטלוג פתרונות למידה', icon: '📚' },
        { id: 'instructors',     label: 'מאגר מרצים',          icon: '👨‍🏫' },
        { id: 'guides-repo',     label: 'מאגר מדריכים',        icon: '📋' },
        { id: 'guides',          label: 'ניהול משתמשים',      icon: '🧑‍🏫' },
        { id: 'budgets',         label: 'תקציבים',              icon: '💰' },
        { id: 'periods',         label: 'תקופות',              icon: '📅' },
        { id: 'lookup-tables',   label: 'טבלאות ערכים',        icon: '🔄' },
        { id: 'registrations',   label: 'נרשמים לפתרונות למידה',       icon: '👥' },
        { id: 'activity-log',    label: 'מעקב והיסטוריה',     icon: '📊' },
        { id: 'recycle-bin',     label: 'סל מחזור',            icon: '🗑️' },
        { id: 'settings',        label: 'הגדרות',              icon: '⚙️' },
        { id: 'homepage',        label: 'דף שער',              icon: '🏠' },
        { id: 'custom-pages',   label: 'יצירת דף חדש',        icon: '📄' }
    ];

    function renderSidebar() {
        const isAdminUser = currentUser && (currentUser.role === 'admin' || currentUser.role === 'system_admin');
        // Determine which sections to show based on permissions
        // Admin or users without permissions set → show all
        // Non-admin users with permissions → show only permitted sections

        const navStructure = [
            { type: 'title', text: 'ראשי' },
            { type: 'item', section: 'dashboard', icon: '📊', label: 'לוח בקרה' },
            { type: 'item', section: 'solutions', icon: '📚', label: 'קטלוג פתרונות למידה', badge: 'solutionsCount' },
			{ type: 'item', section: 'clusters', icon: '🧩', label: 'אשכולות למידה' },
            { type: 'item', section: 'instructors', icon: '👨‍🏫', label: 'מאגר מרצים' },
            { type: 'item', section: 'guides-repo', icon: '📋', label: 'מאגר מדריכים' },
            { type: 'item', section: 'homepage', icon: '🏠', label: 'דף שער' },
            { type: 'item', section: 'faq', icon: '❓', label: 'שאלות נפוצות ותשובות' },
			{ type: 'item', section: 'workshop-bookings', icon: '🏔️', label: 'הזמנת סדנאות בפסגה' },
			{ type: 'item', section: 'workshop-sim-bookings', icon: '🎭', label: 'הזמנת סדנאות סימולציה' },
            { type: 'item', section: 'custom-pages', icon: '📄', label: 'יצירת דף חדש' },
            { type: 'title', text: 'ניהול' },
            { type: 'item', section: 'guides', icon: '🧑‍🏫', label: 'ניהול משתמשים' },
            { type: 'item', section: 'budgets', icon: '💰', label: 'תקציבים' },
            { type: 'item', section: 'periods', icon: '📅', label: 'תקופות' },
            { type: 'item', section: 'lookup-tables', icon: '🔄', label: 'טבלאות ערכים' },
            { type: 'item', section: 'registrations', icon: '👥', label: 'נרשמים לפתרונות למידה' },
            { type: 'item', section: 'activity-log', icon: '📊', label: 'מעקב והיסטוריה' },
            { type: 'item', section: 'recycle-bin', icon: '🗑️', label: 'סל מחזור' },
        ];

        // Add permissions section (admin only)
        if (isAdminUser) {
            navStructure.push({ type: 'item', section: 'permissions', icon: '🔐', label: 'הרשאות מתקדמות' });
        }

        navStructure.push({ type: 'item', section: 'settings', icon: '⚙️', label: 'הגדרות' });

        let html = '';
        navStructure.forEach(item => {
            if (item.type === 'title') {
                html += `<div class="sidebar-section-title">${item.text}</div>`;
            } else {
                // Permission check
                if (!_canViewSection(item.section)) return;
                const isActive = item.section === currentSection ? ' active' : '';
                const badge = item.badge ? `<span class="nav-badge" id="${item.badge}">0</span>` : '';
                html += `<div class="nav-item${isActive}" data-section="${item.section}" onclick="App.showSection('${item.section}')"><span class="nav-icon">${item.icon}</span> ${item.label}${badge}</div>`;
            }
        });

        document.getElementById('sidebarNav').innerHTML = html;
        updateSolutionsCount();
    }

    function renderUserInfo() {
        const el = document.getElementById('sidebarUserInfo');
        if (!el) return;
        el.innerHTML = `
            <div class="user-avatar">${currentUser.fullName.charAt(0)}</div>
            <div class="user-info">
                <div class="user-name">${currentUser.fullName}</div>
                <div class="user-role">${Auth.getRoleLabel(currentUser.role)}</div>
            </div>`;
    }

    function updateSolutionsCount() {
        let items = _getVisibleSolutions();
        const badge = document.getElementById('solutionsCount');
        if (badge) badge.textContent = items.length;
    }

    // ============ GUIDE FILTERING ============
    /**
     * Returns solution IDs the current guide user is allowed to see.
     * Guide sees solutions where they are the responsible guide OR they created the solution.
     * Admin/system_admin sees all.
     */
    function _getGuideVisibleSolutionIds() {
        if (!currentUser) return null; // null = no filtering (show all)
        const role = currentUser.role || '';
        if (role === 'admin' || role === 'system_admin' || role === 'system_operator' || role === 'team_leader') {
            return null; // no filtering
        }

        const guidesRepo = DataStore.getAll(DataStore.KEYS.GUIDES_REPO) || [];

        // Primary: find guide_repo entries linked by userId
        let myGuideIds = guidesRepo
            .filter(g => g.userId === currentUser.id)
            .map(g => g.id);

        // Fallback: if no userId link, match by fullName (guide_repo entries added via UI
        // may not have userId set, so we match the guide's name to the logged-in user's name)
        if (myGuideIds.length === 0 && currentUser.fullName) {
            const normalizedName = currentUser.fullName.trim();
            myGuideIds = guidesRepo
                .filter(g => (g.fullName || '').trim() === normalizedName)
                .map(g => g.id);
        }

        const allSolutions = DataStore.getAll(DataStore.KEYS.SOLUTIONS) || [];
        return allSolutions
            .filter(s => {
                // Created by this user
                if (s.createdBy === currentUser.id) return true;
                // User is the responsible guide (match against any of their guide_repo entries)
                if (myGuideIds.length > 0 && myGuideIds.includes(s.guideId)) return true;
                return false;
            })
            .map(s => s.id);
    }

    /**
     * Returns solutions visible to the current user (filtered for guides).
     */

function _getVisibleSolutions() {
    let items = DataStore.getAll(DataStore.KEYS.SOLUTIONS) || [];
    
    // סינון הרשאות בלבד (ללא סינון תקופה שגורם לבעיה)
    var visibleIds = _getGuideVisibleSolutionIds();
    if (visibleIds !== null && Array.isArray(visibleIds) && visibleIds.length > 0) {
        items = items.filter(function(s) { return visibleIds.includes(s.id); });
    }
    
    return items;
}

    function setupEventListeners() {
        const menuBtn = document.getElementById('mobileMenuBtn');
        if (menuBtn) menuBtn.addEventListener('click', toggleSidebarMobile);
        const overlay = document.getElementById('sidebarOverlay');
        if (overlay) overlay.addEventListener('click', closeSidebarMobile);
    }

    function toggleSidebarMobile() {
        document.querySelector('.sidebar').classList.toggle('open');
        document.getElementById('sidebarOverlay').classList.toggle('active');
    }
    function closeSidebarMobile() {
        document.querySelector('.sidebar').classList.remove('open');
        document.getElementById('sidebarOverlay')?.classList.remove('active');
    }

    // ============ TOAST ============
    function showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = 'toast ' + type;
        const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
        toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => { toast.style.animation = 'slideOut 0.3s ease forwards'; setTimeout(() => toast.remove(), 300); }, 3000);
    }

    // ============ MODAL ============
	// ==========================================
	// פונקציות מודאל אוניברסליות (להבטחת יציבות המערכת)
	// ==========================================
	function showModal(title, bodyHtml, footerHtml) {
		// הסרת מודאל קיים אם יש
		closeModal();

		const overlay = document.createElement('div');
		overlay.id = 'global_modal_overlay';
		overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 0.2s ease;';
		
		overlay.innerHTML = `
			<div style="background:#fff;border-radius:12px;padding:24px;min-width:400px;max-width:90vw;max-height:90vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.2);transform:scale(0.95);transition:transform 0.2s ease;" id="global_modal_content">
				<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;border-bottom:1px solid #eee;padding-bottom:12px;">
					<h3 style="margin:0;font-size:18px;color:var(--primary, #0ca7aa);">${title}</h3>
					<button onclick="App.closeModal()" style="background:none;border:none;font-size:24px;cursor:pointer;color:#666;line-height:1;">&times;</button>
				</div>
				<div style="margin-bottom:20px;">
					${bodyHtml}
				</div>
				<div style="display:flex;gap:8px;justify-content:flex-end;border-top:1px solid #eee;padding-top:16px;">
					${footerHtml || '<button class="btn btn-outline" onclick="App.closeModal()">סגור</button>'}
				</div>
			</div>
		`;
		
		document.body.appendChild(overlay);
		
		// אנימציית כניסה
		requestAnimationFrame(() => {
			overlay.style.opacity = '1';
			const content = document.getElementById('global_modal_content');
			if (content) content.style.transform = 'scale(1)';
		});

		// סגירה בלחיצה על הרקע
		overlay.addEventListener('click', function(e) {
			if (e.target === overlay) {
				closeModal();
			}
		});
	}

	function closeModal() {
		const overlay = document.getElementById('global_modal_overlay');
		if (overlay) {
			overlay.style.opacity = '0';
			const content = document.getElementById('global_modal_content');
			if (content) content.style.transform = 'scale(0.95)';
			
			setTimeout(() => {
				overlay.remove();
			}, 200);
		}
	}


    function confirmDialog(message, onConfirm) {
        showModal('אישור פעולה',
            `<div class="confirm-content"><div class="confirm-icon">❓</div><h3>האם אתה בטוח?</h3><p>${message}</p></div>`,
            `<button class="btn btn-danger" onclick="App._doConfirm()">אישור</button><button class="btn btn-outline" onclick="App.closeModal()">ביטול</button>`
        );
        App._confirmCb = onConfirm;
    }
    function _doConfirm() { closeModal(); if (App._confirmCb) App._confirmCb(); App._confirmCb = null; }

    // ============ ACTIVITY LOGGING ============
	
function logActivity(actionType, description, entityType, entityId) {
    var MAX_LOG_ENTRIES = 200;
    var newEntry = {
        userId: currentUser ? currentUser.id : null,
        userName: currentUser ? currentUser.fullName : 'מערכת',
        userRole: currentUser ? currentUser.role : '',
        actionType: actionType,
        description: description,
        entityType: entityType || '',
        entityId: entityId || '',
        timestamp: new Date().toISOString()
    };
    var allLogs = [];
    try {
        allLogs = DataStore.getAll(DataStore.KEYS.ACTIVITY_LOG) || [];
    } catch (e) {
        console.warn('[logActivity] Failed to read activity log, starting fresh:', e);
        allLogs = [];
    }
    allLogs.push(newEntry);
    allLogs.sort(function(a, b) { return new Date(b.timestamp) - new Date(a.timestamp); });
    if (allLogs.length > MAX_LOG_ENTRIES) {
        allLogs = allLogs.slice(0, MAX_LOG_ENTRIES);
    }
    try {
        DataStore.saveAll(DataStore.KEYS.ACTIVITY_LOG, allLogs);
    } catch (e) {
        console.warn('[logActivity] Save failed, resetting storage:', e);
        try {
            localStorage.removeItem('matspanet_activity_log');
            DataStore.saveAll(DataStore.KEYS.ACTIVITY_LOG, [newEntry]);
        } catch (e2) {
            console.error('[logActivity] Cannot save even after reset:', e2);
        }
    }
}

    // ================================================================
    //  DASHBOARD
    // ================================================================
    function renderDashboard() {
        const visibleIds = _getGuideVisibleSolutionIds();
        const isGuideView = visibleIds !== null; // null = admin (no filter), array = guide (filtered)
        const stats = DataStore.getStats();
        const solutions = _getVisibleSolutions();
        const recent = [...solutions].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 5);

        // For guide users, compute stats from their visible solutions only
        let statsHtml;
        if (isGuideView) {
            const activeSol = solutions.filter(s => s.status === 'פעיל' || s.status === 'active').length;
            const solIds = new Set(solutions.map(s => s.id));
            const allInstr = DataStore.getAll(DataStore.KEYS.SOLUTION_INSTRUCTORS) || [];
            const relMentors = allInstr.filter(i => solIds.has(i.solutionId)).length;
            const budgetH = solutions.reduce((s, x) => s + (parseFloat(x.budgetedHours) || 0), 0);
            const usedH = solutions.reduce((s, x) => s + (parseFloat(x.period1Hours) || 0) + (parseFloat(x.period2Hours) || 0), 0);
            const pct = budgetH > 0 ? Math.min(100, Math.round((usedH / budgetH) * 100)) : 0;
            statsHtml = `
            <div class="stats-grid">
                <div class="stat-card"><div class="stat-icon cyan">📝</div><div class="stat-info"><h3>${solutions.length}</h3><p>פתרונות למידה</p></div></div>
                <div class="stat-card"><div class="stat-icon green">✅</div><div class="stat-info"><h3>${activeSol}</h3><p>פעילים</p></div></div>
                <div class="stat-card"><div class="stat-icon purple">👨‍🏫</div><div class="stat-info"><h3>${relMentors}</h3><p>מנחים</p></div></div>
                <div class="stat-card"><div class="stat-icon red">⏱️</div><div class="stat-info"><h3>${budgetH}</h3><p>שעות מתוקצבות</p></div></div>
            </div>`;
        } else {
            const totalUsedHours = stats.totalPeriod1Hours + stats.totalPeriod2Hours;
            const pct = stats.totalBudgetedHours > 0 ? Math.min(100, Math.round((totalUsedHours / stats.totalBudgetedHours) * 100)) : 0;
            statsHtml = `
            <div class="stats-grid">
                <div class="stat-card"><div class="stat-icon cyan">📝</div><div class="stat-info"><h3>${stats.totalSolutions}</h3><p>פתרונות למידה</p></div></div>
                <div class="stat-card"><div class="stat-icon green">✅</div><div class="stat-info"><h3>${stats.activeSolutions}</h3><p>פעילים</p></div></div>
                <div class="stat-card"><div class="stat-icon orange">⏳</div><div class="stat-info"><h3>${stats.pendingSolutions}</h3><p>ממתינים לאישור</p></div></div>
                <div class="stat-card"><div class="stat-icon purple">👨‍🏫</div><div class="stat-info"><h3>${stats.totalMentors}</h3><p>מנחים</p></div></div>
                <div class="stat-card"><div class="stat-icon blue">📋</div><div class="stat-info"><h3>${stats.totalGuidesRepo}</h3><p>מדריכים</p></div></div>
                <div class="stat-card"><div class="stat-icon red">⏱️</div><div class="stat-info"><h3>${stats.totalBudgetedHours}</h3><p>שעות מתוקצבות</p></div></div>
            </div>`;
        }

        // Hours progress bar (from visible solutions)
        const budgetH2 = solutions.reduce((s, x) => s + (parseFloat(x.budgetedHours) || 0), 0);
        const usedH2 = solutions.reduce((s, x) => s + (parseFloat(x.period1Hours) || 0) + (parseFloat(x.period2Hours) || 0), 0);
        const pct2 = budgetH2 > 0 ? Math.min(100, Math.round((usedH2 / budgetH2) * 100)) : 0;

        document.getElementById('section-dashboard').innerHTML = `${statsHtml}
            <div class="card" style="margin-bottom:24px;">
                <div class="card-header"><span class="card-title">📊 ניצול שעות מתוקצבות</span></div>
                <div class="card-body">
                    <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:14px;">
                        <span>נוצלו: ${usedH2} שע'</span><span>סה"כ: ${budgetH2} שע'</span>
                    </div>
                    <div class="progress-bar"><div class="progress-fill ${pct2 > 80 ? 'red' : pct2 > 50 ? 'orange' : 'blue'}" style="width:${pct2}%"></div></div>
                    <div style="display:flex;gap:24px;margin-top:12px;font-size:13px;color:var(--gray-500);">
                        <span>2 מ׳: 09–12: <strong style="color:var(--gray-800);">${solutions.reduce((s, x) => s + (parseFloat(x.period1Hours) || 0), 0)} שע'</strong></span>
                        <span>1 מ׳: 01–08: <strong style="color:var(--gray-800);">${solutions.reduce((s, x) => s + (parseFloat(x.period2Hours) || 0), 0)} שע'</strong></span>
                    </div>
                </div>
            </div>
            <div class="card">
                <div class="card-header"><span class="card-title">🕐 פתרונות למידה אחרונים</span>
                    <button class="btn btn-outline btn-sm" onclick="App.showSection('solutions')">הצג הכל →</button>
                </div>
                <div class="card-body">
                    ${recent.length > 0 ? `<div class="table-wrapper" style="box-shadow:none;"><table class="data-table"><thead><tr>
                        <th>שם</th><th>מדריך אחראי</th><th>תחום / נושא</th><th>סוג מפגש</th><th>שעות</th>
                    </tr></thead><tbody>${recent.map(s => {
                        const g = DataStore.getById(DataStore.KEYS.GUIDES_REPO, s.guideId);
                        return `<tr>
                        <td><strong>${escAttr(s.name)}</strong></td>
                        <td>${g ? escAttr(g.fullName) : '—'}</td>
                        <td>${getLookupLabel(DataStore.KEYS.LOOKUP_DOMAINS, s.topicType)}<br><small style="color:var(--gray-500)">${getTopicLabel(s.topicType, s.topic)}</small></td>
                        <td>${getLookupLabel(DataStore.KEYS.LOOKUP_MEETING_TYPES, s.meetingType) || '—'}</td>
                        <td>${s.academicHours || 0} שע'</td>
                    </tr>`;}).join('')}</tbody></table></div>` : `<div class="empty-state"><div class="empty-icon">📝</div><h3>אין פתרונות למידה</h3><p>הוסף את פתרון הלמידה הראשון</p><button class="btn btn-primary" onclick="App.showSection('solutions')">➕ הוסף פתרון למידה</button></div>`}
                </div>
            </div>`;
    }

    // ================================================================
    //  SOLUTIONS
    // ================================================================
	function renderSolutions() {
		let solutions = _getVisibleSolutions();
		const canFull = _canFullSection('solutions');

		const clearBtn = (canFull && solutions.length > 0) ? `<button class="btn btn-danger btn-sm" onclick="App.deleteAllSolutions()" style="margin-right:auto;">🗑️ מחק הכל (${solutions.length})</button>` : '';
		const addBtn = canFull ? `<button class="btn btn-primary btn-sm" onclick="App.startNewSolutionFlow()">➕ הוספה</button>` : '';
		
		const actionBar = `<div class="action-bar" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;padding:10px 14px;background:var(--gray-50);border-radius:var(--border-radius);border:1px solid var(--gray-100);">
			<label class="btn btn-outline btn-sm" style="cursor:pointer;margin:0;"> ייבוא<input type="file" accept=".csv,.xlsx,.xls" style="display:none;" onchange="App.startImport('solutions',this)"></label>
			<button class="btn btn-outline btn-sm" onclick="App.exportCSV('solutions')"> ייצוא CSV</button>
			<button class="btn btn-outline btn-sm" onclick="App.exportExcel('solutions')">📊 Excel</button>
			<button class="btn btn-outline btn-sm" onclick="App.printSection()">🖨️ הדפסה</button>
			${addBtn}
			${clearBtn}
		</div>`;

		const targetDiv = document.getElementById('section-solutions');
		if (!targetDiv) return;

		targetDiv.innerHTML = `
			${_lookupTableHeader('קטלוג פתרונות למידה', solutions.length, '📚')}
			<div class="card">
				<div class="card-body">
					${actionBar}
					<div class="toolbar" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
						<input type="text" class="search-input" id="solSearch" placeholder="🔍 חיפוש לפי שם, תיאור..." oninput="App.filterSolutions()" style="flex:1;min-width:200px;">
						<select class="filter-select" id="solRespF" onchange="App.filterSolutions()" style="min-width:150px;">
							<option value="">כל סוגי האחריות</option>
							${(typeof getLookupOptions === 'function') ? getLookupOptions(DataStore.KEYS.LOOKUP_RESPONSIBILITY_TYPES) : ''}
						</select>
						<select class="filter-select" id="solDomainF" onchange="App.filterSolutions()" style="min-width:150px;">
							<option value="">כל התחומים</option>
							${(typeof getLookupOptions === 'function') ? getLookupOptions(DataStore.KEYS.LOOKUP_DOMAINS) : ''}
						</select>
						<select class="filter-select" id="solMeetingF" onchange="App.filterSolutions()" style="min-width:150px;">
							<option value="">כל סוגי המפגש</option>
							${(typeof getLookupOptions === 'function') ? getLookupOptions(DataStore.KEYS.LOOKUP_MEETING_TYPES) : ''}
						</select>
					</div>
					<div id="solutionsTableDiv">${_renderSolutionsTable(solutions)}</div>
				</div>
			</div>`;
	}

		// וודא ש-_renderSolutionsTable קיימת (אם לא – הוסף אותה גם)

	function _renderSolutionsTable(items) {
		const canFull = (typeof _canFullSection === 'function') ? _canFullSection('solutions') : true;
		if (!items || !items.length) {
			return `<div class="empty-state"><div class="empty-icon">📚</div><h3>אין רשומות בקטלוג</h3></div>`;
		}
		
		// טעינת נתוני עזר
		var allInstructors = (typeof DataStore !== 'undefined') ? (DataStore.getAll(DataStore.KEYS.SOLUTION_INSTRUCTORS) || []) : [];
		var mentorsBySolution = {};
		allInstructors.forEach(function(inst) {
			if (!mentorsBySolution[inst.solutionId]) mentorsBySolution[inst.solutionId] = [];
			mentorsBySolution[inst.solutionId].push(inst);
		});
		var allGuides = (typeof DataStore !== 'undefined') ? (DataStore.getAll(DataStore.KEYS.GUIDES_REPO) || []) : [];
		var guideMap = {};
		allGuides.forEach(function(g) { guideMap[g.id] = g; });

		var sorted = items.slice().sort(function(a, b) { return new Date(b.createdAt || 0) - new Date(a.createdAt || 0); });

		// 🔑 1. כל העמודות האפשריות
		const allCols = [
			{ key: 'respType', label: 'סוג האחריות' },
			{ key: 'schoolName', label: 'שם בית הספר' },
			{ key: 'solName', label: 'שם פתרון למידה' },
			{ key: 'solNum', label: 'מספר פתרון' },
			{ key: 'description', label: 'תיאור' },
			{ key: 'guide', label: 'מדריך אחראי' },
			{ key: 'domain', label: 'תחום' },
			{ key: 'topic', label: 'נושא' },
			{ key: 'eduStage', label: 'שלב חינוך' },
			{ key: 'eduType', label: 'סוג חינוך' },
			{ key: 'startDate', label: 'תאריך תחילה' },
			{ key: 'endDate', label: 'תאריך סיום' },
			{ key: 'weekDay', label: 'יום בשבוע' },
			{ key: 'meetingType', label: 'סוג מפגש' },
			{ key: 'academicHours', label: 'שעות אקדמיות' },
			{ key: 'instructors', label: 'מנחים' },
			{ key: 'whatsapp', label: 'וואטסאפ' },
			{ key: 'regLink', label: 'רישום מוקדם' },
			{ key: 'showPublic', label: 'הצגה בציבורי' },
			{ key: 'notes', label: 'הערה כללית' }
		];

		// 🔑 2. ברירת מחדל חדשה + תמיד מציגים את עמודת הפעולות
		const defaultVisible = ['solName', 'solNum', 'guide', 'domain', 'eduStage', 'eduType', 'weekDay', 'meetingType'];
		
		let visibleKeys = JSON.parse(localStorage.getItem('matspanet_sol_cols') || 'null');
		if (!visibleKeys || !Array.isArray(visibleKeys)) {
			visibleKeys = [...defaultVisible];
		}
		// תמיד מוסיפים את עמודת הפעולות אם יש הרשאה
		if (canFull && !visibleKeys.includes('actions')) {
			visibleKeys.push('actions');
		}

		const colsToShow = allCols.filter(c => visibleKeys.includes(c.key));

		// 🔑 3. פונקציות עזר משוריינות
		function safeVal(v) { if (v === undefined || v === null || String(v).trim() === '') return '—'; return (typeof escAttr === 'function') ? escAttr(String(v).trim()) : String(v).trim(); }
		function safeNum(v) { if (v === undefined || v === null || String(v).trim() === '') return '—'; return v; }
		function safeLookup(key, val) { if (typeof getLookupLabel === 'function' && val) { var res = getLookupLabel(key, val); return res ? res : safeVal(val); } return safeVal(val); }
		function safeLookupsJoined(key, val) { if (typeof getLookupLabelsJoined === 'function' && val) { var res = getLookupLabelsJoined(key, val); return res ? res : safeVal(val); } return safeVal(val); }
		function safeDate(v) { if (typeof formatDate === 'function' && v) return formatDate(v); return safeVal(v); }
		function safeMentorName(m) { if (typeof getMentorName === 'function') return getMentorName(m); return (m && (m.fullName || m.name)) ? (m.fullName || m.name) : 'לא ידוע'; }

		// 🔑 4. כותרת הטבלה
		let headerHtml = '<tr>';
		colsToShow.forEach(c => { headerHtml += `<th class="col-${c.key}" style="white-space:nowrap;">${c.label}</th>`; });
		if (canFull) headerHtml += '<th style="white-space:nowrap;">פעולות</th>';
		headerHtml += '</tr>';

		// 🔑 5. בניית השורות
		let rowsHtml = sorted.map(function(s) {
			try {
				var guide = guideMap[s.guideId] || (allGuides.find(function(g) { return g.fullName === s.guideId || g.fullNameAr === s.guideId; }) || null);
				var insts = mentorsBySolution[s.id] || [];
				var allNames = insts.map(function(m) { return safeVal(safeMentorName(m)); }).join('; ') || '—';
				
				let rowHtml = '<tr>';
				colsToShow.forEach(c => {
					rowHtml += `<td class="col-${c.key}">`;
					switch(c.key) {
						case 'respType': rowHtml += safeLookup(DataStore.KEYS.LOOKUP_RESPONSIBILITY_TYPES, s.responsibilityType); break;
						case 'schoolName': rowHtml += safeVal(s.schoolName); break;
						case 'solName': rowHtml += '<strong>' + safeVal(s.solutionName || s.name) + '</strong>'; break;
						case 'solNum': rowHtml += safeVal(s.solutionNumber); break;
						case 'description': rowHtml += `<div style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${safeVal(s.description)}">${safeVal(s.description)}</div>`; break;
						case 'guide': rowHtml += (guide ? safeVal(guide.fullName) : safeVal(s.guideId)); break;
						case 'domain': rowHtml += safeLookup(DataStore.KEYS.LOOKUP_DOMAINS, s.domain); break;
						case 'topic': rowHtml += safeVal(s.topic); break;
						case 'eduStage': rowHtml += safeLookupsJoined(DataStore.KEYS.LOOKUP_EDUCATION_STAGES, s.educationStage); break;
						case 'eduType': rowHtml += safeLookupsJoined(DataStore.KEYS.LOOKUP_EDUCATION_TYPES, s.educationType); break;
						case 'startDate': rowHtml += `<span style="direction:ltr;display:inline-block;">${safeDate(s.startDate)}</span>`; break;
						case 'endDate': rowHtml += `<span style="direction:ltr;display:inline-block;">${safeDate(s.endDate)}</span>`; break;
						case 'weekDay': rowHtml += safeLookup(DataStore.KEYS.LOOKUP_WEEK_DAYS, s.weekDay); break;
						case 'meetingType': rowHtml += safeLookup(DataStore.KEYS.LOOKUP_MEETING_TYPES, s.meetingType); break;
						case 'academicHours': rowHtml += safeNum(s.academicHours) + (s.academicHours ? "'" : ''); break;
						case 'instructors': rowHtml += allNames; break;
						case 'whatsapp': rowHtml += (s.whatsappLink ? `<a href="${safeVal(s.whatsappLink)}" target="_blank" style="color:var(--success,#16a34a)">📱 קישור</a>` : '—'); break;
						case 'regLink': rowHtml += ((s.earlyRegistrationLink || s.registrationLink) ? `<a href="${safeVal(s.earlyRegistrationLink || s.registrationLink)}" target="_blank">🔗 קישור</a>` : '—'); break;
						case 'showPublic': rowHtml += ((s.showInCatalog === 'כן' || s.showInCatalog === true) ? '✅ כן' : '❌ לא'); break;
						case 'notes': rowHtml += `<div style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${safeVal(s.generalNote || s.notes)}">${safeVal(s.generalNote || s.notes)}</div>`; break;
					}
					rowHtml += '</td>';
				});
				// עמודת פעולות - תמיד בסוף
				if (canFull) {
					rowHtml += `<td><div style="display:flex;gap:4px;flex-wrap:nowrap;">
						<button class="btn btn-outline btn-sm" onclick="App.viewSolution('${s.id}')" title="צפייה">👁️</button>
						<button class="btn btn-outline btn-sm" onclick="App.editSolutionPopulated('${s.id}')" title="עריכה">✏️</button>
						<button class="btn btn-outline btn-sm" onclick="App.openCompleteDataModal('${s.id}')" title="השלמת פרטים" style="color:var(--primary);">📋</button>
						<button class="btn btn-danger btn-sm" onclick="App.deleteSolution('${s.id}')" title="מחיקה">🗑️</button>
					</div></td>`;
				}
				rowHtml += '</tr>';
				return rowHtml;
			} catch (err) {
				console.error('שגיאה בעיבוד שורה', s.id, err);
				return `<tr><td colspan="${colsToShow.length + (canFull ? 1 : 0)}" style="color:red;background:#fee2e2">שגיאה בעיבוד שורה</td></tr>`;
			}
		}).join('');

		// 🔑 6. כפתור תצוגת עמודות
		const colVisBtn = `
			<div style="position:relative; display:inline-block;">
				<button class="btn btn-outline btn-sm" onclick="App.toggleSolDropdown(event)" style="cursor:pointer; display:flex; align-items:center; gap:6px;">
					️ תצוגת עמודות
				</button>
				<div id="solColVisDropdown" style="display:none; position:absolute; top:100%; left:0; background:white; border:1px solid #ddd; border-radius:8px; padding:12px; box-shadow:0 8px 24px rgba(0,0,0,0.15); z-index:1000; min-width:220px; max-height:400px; overflow-y:auto; direction:rtl; text-align:right;" onclick="event.stopPropagation()">
					<div style="font-weight:bold; margin-bottom:10px; border-bottom:1px solid #eee; padding-bottom:6px; font-size:14px;">בחר עמודות להצגה:</div>
					${allCols.map(c => `
						<label style="display:flex; align-items:center; gap:8px; margin-bottom:8px; cursor:pointer; font-size:13px;">
							<input type="checkbox" value="${c.key}" ${visibleKeys.includes(c.key) ? 'checked' : ''} onchange="App.toggleSolColumn('${c.key}', this.checked)" style="cursor:pointer;">
							${c.label}
						</label>
					`).join('')}
					<button class="btn btn-sm btn-primary" style="width:100%; margin-top:12px;" onclick="App.resetSolColumns()">🔄 איפוס לברירת מחדל</button>
				</div>
			</div>
		`;

		return `
			<div style="margin-bottom:12px; display:flex; justify-content:flex-end;">
				${colVisBtn}
			</div>
			<div class="table-wrapper" style="box-shadow:none; overflow-x:auto;">
				<table class="data-table" style="width:100%; border-collapse:collapse; font-size:14px;">
					<thead style="background:var(--gray-50);">${headerHtml}</thead>
					<tbody>${rowsHtml}</tbody>
				</table>
			</div>
		`;
	}

	function filterSolutions() {
		const search = (document.getElementById('solSearch')?.value || '').toLowerCase().trim();
		const respFilter = (document.getElementById('solRespF')?.value || '').trim();
		const domainFilter = (document.getElementById('solDomainF')?.value || '').trim();
		const meetingFilter = (document.getElementById('solMeetingF')?.value || '').trim();

		console.log("🔍 פילטרים פעילים:", { search, respFilter, domainFilter, meetingFilter });

		let items = DataStore.getAll(DataStore.KEYS.SOLUTIONS) || [];

		// סינון הרשאות
		var visibleIds = _getGuideVisibleSolutionIds();
		if (visibleIds !== null && Array.isArray(visibleIds) && visibleIds.length > 0) {
			items = items.filter(function(s) { return visibleIds.includes(s.id); });
		}

		// סינון חיפוש חופשי
		if (search) {
			items = items.filter(function(s) {
				var text = [s.solutionName, s.name, s.description, s.solutionNumber, s.schoolName, s.guideId]
					.filter(Boolean).join(' ').toLowerCase();
				return text.includes(search);
			});
		}

		// 🔑 פונקציית עזר דו-לשונית: שולפת את כל הערכים האפשריים (value + עברית + ערבית)
		function getAllLookupValues(key, filterValue) {
			if (!filterValue) return [];
			const lookupItems = DataStore.getAll(key) || [];
			const matchingItem = lookupItems.find(function(item) { 
				return String(item.value).trim() === filterValue; 
			});
			if (!matchingItem) return [filterValue];
			return [
				String(matchingItem.value || '').trim(),
				String(matchingItem.label || '').trim(),
				String(matchingItem.labelAr || '').trim()
			].filter(function(v) { return v !== ''; });
		}

		// 🔑 סינון סוג אחריות - בדיקה מול value + label עברי + label ערבי
		if (respFilter) {
			const validValues = getAllLookupValues(DataStore.KEYS.LOOKUP_RESPONSIBILITY_TYPES, respFilter);
			console.log(" ערכים תקינים לסוג אחריות:", validValues);
			
			items = items.filter(function(s) { 
				const itemResp = String(s.responsibilityType || '').trim();
				return validValues.includes(itemResp);
			});
		}

		// 🔑 סינון תחום - בדיקה מול value + label עברי + label ערבי
		if (domainFilter) {
			const validValues = getAllLookupValues(DataStore.KEYS.LOOKUP_DOMAINS, domainFilter);
			items = items.filter(function(s) { 
				const itemDomain = String(s.domain || s.topicType || '').trim();
				return validValues.includes(itemDomain);
			});
		}

		// 🔑 סינון סוג מפגש - בדיקה מול value + label עברי + label ערבי
		if (meetingFilter) {
			const validValues = getAllLookupValues(DataStore.KEYS.LOOKUP_MEETING_TYPES, meetingFilter);
			items = items.filter(function(s) { 
				const itemMeeting = String(s.meetingType || '').trim();
				return validValues.includes(itemMeeting);
			});
		}

		// עדכון כותרת הטבלה
		var header = document.querySelector('#section-solutions .card-title');
		if (header) {
			header.innerHTML = `קטלוג פתרונות למידה <span style="color:var(--primary); font-size:14px;">(${items.length} רשומות)</span>`;
		}

		// רינדור מחדש של הטבלה
		var tableDiv = document.getElementById('solutionsTableDiv');
		if (tableDiv) {
			tableDiv.innerHTML = _renderSolutionsTable(items);
		}
	}

    function openSolutionModal(id = null) {
        const s = id ? DataStore.getById(DataStore.KEYS.SOLUTIONS, id) : null;
        editingItem = s;
        const guides = DataStore.getAll(DataStore.KEYS.GUIDES_REPO) || [];

        let guideOpts = '';
        guideOpts = guides.filter(g => g.isActive !== false).map(g => `<option value="${g.id}" ${s && s.guideId === g.id ? 'selected' : ''}>${escAttr(g.fullName)} - ${escAttr(g.position || '')}</option>`).join('');

        const showInCatalog = (s && typeof s.showInCatalog === 'boolean') ? s.showInCatalog : true;

        // Budget state for conditional fields
        var _formIsBudgeted = s ? (s.budgetType === 'כן' || s.budgetType === 'מתוקצב' || (s.budgetedHours || 0) > 0) : false;

        // Build weekDay options with fallback for values not in lookup
        let weekDayOpts = getLookupOptions(DataStore.KEYS.LOOKUP_WEEK_DAYS, s ? s.weekDay : '');
        if (s && s.weekDay && !weekDayOpts.includes('selected')) {
            weekDayOpts += `<option value="${escAttr(s.weekDay)}" selected>${escAttr(s.weekDay)}</option>`;
        }

        // מאגר מנחים לפתרון זה
        const existingMentors = s ? (DataStore.getAll(DataStore.KEYS.SOLUTION_INSTRUCTORS) || []).filter(i => i.solutionId === s.id) : [];
        let mentorsHtml = '';
        if (s && existingMentors.length > 0) {
            mentorsHtml = `<div style="margin-top:12px;border-top:2px solid var(--gray-200);padding-top:12px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                    <strong style="font-size:14px;">👨‍🏫 מנחים משויכים (${existingMentors.length})</strong>
                    <button class="btn btn-primary btn-sm" onclick="App._addMentorFromForm('${s.id}')">➕ הוספת מנחה</button>
                </div>
                <div style="max-height:200px;overflow-y:auto;">
                <table class="data-table" style="font-size:12px;"><thead><tr><th>שם</th><th>סוג מבצע</th><th>סך שעות</th><th>2 מ׳</th><th>1 מ׳</th><th>פעולות</th></tr></thead><tbody>
                ${existingMentors.map(m => `<tr>
                    <td>${escAttr(getMentorName(m))}</td>
                    <td>${getLookupLabel(DataStore.KEYS.LOOKUP_PERFORMER_TYPES, m.performerType) || '—'}</td>
                    <td>${m.totalAcademicHours || 0}</td>
                    <td>${m.period1Hours || 0}</td>
                    <td>${m.period2Hours || 0}</td>
                    <td><div style="display:flex;gap:3px;">
                        <button class="btn btn-outline btn-sm" style="padding:2px 6px;font-size:11px;" onclick="App.editSolInst('${m.id}')">✏️</button>
                        <button class="btn btn-danger btn-sm" style="padding:2px 6px;font-size:11px;" onclick="App.deleteSolInst('${m.id}','${s.id}')">🗑️</button>
                    </div></td>
                </tr>`).join('')}
                </tbody></table></div>
                <div id="mentorValidationMsg" style="margin-top:6px;"></div>
            </div>`;
        } else if (s) {
            mentorsHtml = `<div style="margin-top:12px;border-top:2px solid var(--gray-200);padding-top:12px;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <strong style="font-size:14px;">👨‍🏫 מנחים משויכים</strong>
                    <button class="btn btn-primary btn-sm" onclick="App._addMentorFromForm('${s.id}')">➕ הוספת מנחה</button>
                </div>
                <p style="color:var(--gray-400);font-size:13px;margin-top:6px;">טרם הוספו מנחים לפתרון זה.</p>
            </div>`;
        } else {
            mentorsHtml = `<div style="margin-top:12px;border-top:2px solid var(--gray-200);padding-top:12px;">
                <p style="color:var(--gray-400);font-size:13px;">💡 שמור את הפתרון קודם ולאחר מכן הוסף מנחים.</p>
            </div>`;
        }

        showModal(s ? 'עריכת פתרון למידה בקטלוג' : 'הוספת פתרון למידה חדש לקטלוג', `
            <div class="form-grid">
                <div class="form-group full-width"><label>1. שם פתרון למידה (בעברית) *</label><input type="text" id="fSolName" class="form-input" value="${s ? escAttr(s.name) : ''}" required placeholder="הכנס שם פתרון הלמידה"></div>
                <div class="form-group"><label>2. מספר פתרון למידה</label><input type="text" id="fSolNumber" class="form-input" value="${s ? escAttr(s.solutionNumber || '') : ''}" placeholder="מספר אוטומטי"></div>
                <div class="form-group full-width"><label>3. תיאור פתרון למידה</label><textarea id="fSolDesc" class="form-textarea" placeholder="תיאור מפורט של פתרון הלמידה">${s ? escAttr(s.description) : ''}</textarea></div>
                <div class="form-group"><label>4. מדריך אחראי *</label><select id="fSolGuide" class="form-select"><option value="">בחר מדריך</option>${guideOpts}</select></div>
                <div class="form-group"><label>5. תחום ונושא</label><select id="fSolTopicType" class="form-select" onchange="App._onTopicTypeChange()"><option value="">בחר</option>${getLookupOptions(DataStore.KEYS.LOOKUP_DOMAINS, s ? s.topicType : '')}</select></div>
                <div class="form-group"><label>6. נושא</label><select id="fSolTopic" class="form-select" ${s && s.topicType ? '' : 'disabled'}><option value="">${s && s.topicType ? 'בחר' : 'בחר תחום ונושא קודם'}</option></select></div>
                <div class="form-group"><label>7. שלב חינוך (רב-ברירה)</label><div style="padding:6px 0;">${buildCheckboxes(DataStore.KEYS.LOOKUP_EDUCATION_STAGES, s ? (Array.isArray(s.educationStage) ? s.educationStage : []) : [])}</div></div>
                <div class="form-group"><label>8. סוג חינוך (רב-ברירה)</label><div style="padding:6px 0;">${buildCheckboxes(DataStore.KEYS.LOOKUP_EDUCATION_TYPES, s ? (Array.isArray(s.educationType) ? s.educationType : []) : [])}</div></div>
                <div class="form-group"><label>9. תאריך התחלת ההשתלמות</label><input type="date" id="fSolStart" class="form-input" value="${s ? normalizeDateValue(s.startDate) : ''}"></div>
                <div class="form-group"><label>10. תאריך סיום השתלמות</label><input type="date" id="fSolEnd" class="form-input" value="${s ? normalizeDateValue(s.endDate) : ''}"></div>
                <div class="form-group"><label>11. יום בשבוע</label><select id="fSolWeekDay" class="form-select"><option value="">בחר</option>${weekDayOpts}</select></div>
                <div class="form-group"><label>12. סוג מפגש</label><select id="fSolMeetingType" class="form-select"><option value="">בחר</option>${getLookupOptions(DataStore.KEYS.LOOKUP_MEETING_TYPES, s ? s.meetingType : '')}</select></div>
                <div class="form-group"><label>13. שעות אקדמיות מוכרות לגמול</label><input type="number" id="fSolHours" class="form-input" value="${s ? s.academicHours || 0 : 0}" min="0" step="0.5"></div>
                <div class="form-group"><label>14. מתוקצב?</label>
                    <div style="display:flex;align-items:center;gap:10px;padding-top:8px;">
                        <label class="toggle-switch"><input type="checkbox" id="fSolIsBudgeted" ${_formIsBudgeted ? 'checked' : ''} onchange="App._onSolBudgetToggle()"><span class="toggle-slider"></span></label>
                        <span id="fSolBudgetStatusLbl" style="font-size:13px;color:var(--gray-500);">${_formIsBudgeted ? 'כן' : 'לא'}</span>
                    </div>
                </div>
                <div class="form-group" id="fSolBudgetTypeGroup"><label>סוג תקצוב</label><select id="fSolBudgetType" class="form-select" ${_formIsBudgeted ? '' : 'disabled'}><option value="">בחר</option>${getLookupOptions(DataStore.KEYS.LOOKUP_BUDGET_TYPES, s ? (s.budgetTypeValue || '') : '')}</select></div>
                <div class="form-group" id="fSolBudgetedHoursGroup"><label>סה"כ שעות מתוקצבות</label><input type="number" id="fSolBudgetedHours" class="form-input" value="${s ? s.budgetedHours || 0 : 0}" min="0" step="1" ${_formIsBudgeted ? '' : 'disabled'} oninput="App._validateBudgetHoursInForm()"></div>
                <div id="budgetHoursValidationMsg" style="grid-column:1/-1;"></div>
                <div class="form-group"><label>16. שעות 2 מ׳: 09–12</label><input type="number" id="fSolP1Hours" class="form-input" value="${s ? s.period1Hours || 0 : 0}" min="0" step="0.5"></div>
                <div class="form-group"><label>17. שעות 1 מ׳: 01–08</label><input type="number" id="fSolP2Hours" class="form-input" value="${s ? s.period2Hours || 0 : 0}" min="0" step="0.5"></div>
                <div class="form-group"><label>18. קישור וואטסאפ</label>
                    <div style="display:flex;gap:6px;align-items:center;">
                        <input type="url" id="fSolWhatsapp" class="form-input" value="${s ? escAttr(s.whatsappLink || '') : ''}" placeholder="https://chat.whatsapp.com/..." dir="ltr" style="text-align:left;flex:1;">
                        <button type="button" class="btn btn-outline btn-sm" onclick="App._toggleLinkVis('fSolWhatsapp',this)" title="הצג/הסתר">👁️</button>
                    </div>
                </div>
                <div class="form-group"><label>19. קישור רישום מוקדם</label>
                    <div style="display:flex;gap:6px;align-items:center;">
                        <input type="url" id="fSolRegLink" class="form-input" value="${s ? escAttr(s.registrationLink || '') : ''}" placeholder="https://..." dir="ltr" style="text-align:left;flex:1;">
                        <button type="button" class="btn btn-outline btn-sm" onclick="App._toggleLinkVis('fSolRegLink',this)" title="הצג/הסתר">👁️</button>
                    </div>
                </div>
                <div class="form-group"><label>20. הצג בקטלוג הציבורי</label>
                    <div style="display:flex;align-items:center;gap:10px;padding-top:8px;">
                        <label class="toggle-switch"><input type="checkbox" id="fSolShowInCatalog" ${showInCatalog ? 'checked' : ''}><span class="toggle-slider"></span></label>
                        <span style="font-size:13px;color:var(--gray-500);">${showInCatalog ? 'מוצג' : 'מוסתר'}</span>
                    </div>
                </div>
                <div class="form-group full-width"><label>22. הערה כללית</label><textarea id="fSolNotes" class="form-textarea" placeholder="הערות נוספות...">${s ? escAttr(s.notes || '') : ''}</textarea></div>
            </div>
            ${mentorsHtml}
            <div class="form-group full-width" style="margin-top:12px;"><label>21. סטטוס שיוך תקציב</label><select id="fSolAllocStatus" class="form-select"><option value="">בחר</option>${getLookupOptions(DataStore.KEYS.LOOKUP_ALLOCATION_STATUS, s ? s.budgetAllocationStatus : '')}</select></div>`,
        `<button class="btn btn-primary" onclick="App.saveSolution()">${s ? '💾 שמור שינויים' : '➕ הוסף לקטלוג'}</button><button class="btn btn-outline" onclick="App.closeModal()">ביטול</button>`);
        // Initialize topic dropdown if editing
        if (s && s.topicType) { setTimeout(function() { App._onTopicTypeChange(s.topic); }, 50); }
        // Toggle label update
        const toggleEl = document.getElementById('fSolShowInCatalog');
        if (toggleEl) {
            toggleEl.addEventListener('change', function() {
                const lbl = this.parentElement.querySelector('span');
                if (lbl) lbl.textContent = this.checked ? 'מוצג' : 'מוסתר';
            });
        }
    }

    function _onHebYearChange() {
        // Legacy – no longer used in catalog form but kept for compatibility
    }

    // Toggle budget fields in solution form
    function _onSolBudgetToggle() {
        var isChecked = document.getElementById('fSolIsBudgeted')?.checked;
        var typeSelect = document.getElementById('fSolBudgetType');
        var hoursInput = document.getElementById('fSolBudgetedHours');
        var statusLbl = document.getElementById('fSolBudgetStatusLbl');
        if (typeSelect) typeSelect.disabled = !isChecked;
        if (hoursInput) { hoursInput.disabled = !isChecked; if (!isChecked) hoursInput.value = 0; }
        if (statusLbl) statusLbl.textContent = isChecked ? 'כן' : 'לא';
        if (!isChecked) {
            var msgEl = document.getElementById('budgetHoursValidationMsg');
            if (msgEl) msgEl.innerHTML = '';
        } else {
            _validateBudgetHoursInForm();
        }
    }

    // Validate mentor hours vs budgeted hours in solution form
    function _validateBudgetHoursInForm() {
        var msgEl = document.getElementById('budgetHoursValidationMsg');
        if (!msgEl) return;
        var budgetedH = parseInt(document.getElementById('fSolBudgetedHours')?.value) || 0;
        var solId = editingItem ? editingItem.id : null;
        if (!solId || !document.getElementById('fSolIsBudgeted')?.checked) { msgEl.innerHTML = ''; return; }
        var mentors = (DataStore.getAll(DataStore.KEYS.SOLUTION_INSTRUCTORS) || []).filter(function(i) { return i.solutionId === solId; });
        if (mentors.length === 0) { msgEl.innerHTML = ''; return; }
        // Exclude "כוח פנים" hours from budget comparison
        var totalMen = mentors.reduce(function(s, m) {
            if ((getMentorName(m) || '') === 'כוח פנים') return s;
            return s + (parseFloat(m.totalAcademicHours) || 0);
        }, 0);
        var diff = totalMen - budgetedH;
        if (Math.abs(diff) < 0.01) {
            msgEl.innerHTML = '<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:8px 12px;color:#166534;font-size:13px;font-weight:500;">✅ סך שעות המנחים תואם בדיוק למספר השעות המתוקצבות</div>';
        } else if (diff > 0) {
            msgEl.innerHTML = '<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:8px 12px;color:#991b1b;font-size:13px;font-weight:500;">🔴 סך שעות המנחים עולה על התקצוב ב-' + diff + ' שעות. יש להקטין את שעות אחד המנחים או להגדיל את התקצוב</div>';
        } else {
            msgEl.innerHTML = '<div style="background:#fef9c3;border:1px solid #fde047;border-radius:8px;padding:8px 12px;color:#854d0e;font-size:13px;font-weight:500;">⚠️ סך שעות המנחים נמוך מהתקצוב ב-' + Math.abs(diff) + ' שעות. יש להוסיף שעות לאחד המנחים או להקטין את התקצוב</div>';
        }
    }

    // הצג/הסתר שדה קישור
    function _toggleLinkVis(inputId, btn) {
        const inp = document.getElementById(inputId);
        if (!inp) return;
        if (inp.type === 'password') {
            inp.type = 'url';
            btn.textContent = '🙈';
        } else {
            inp.type = 'password';
            btn.textContent = '👁️';
        }
    }

    // הוספת מנחה מתוך טופס הפתרון
    function _addMentorFromForm(solId) {
        closeModal();
        setTimeout(function() { App.openSolInstModal(solId); }, 200);
    }

    // בדיקת התאמת שעות בין מנחים לפתרון
    function _validateMentorHours(solutionId) {
        const sol = DataStore.getById(DataStore.KEYS.SOLUTIONS, solutionId);
        if (!sol) return null;
        const allMentors = (DataStore.getAll(DataStore.KEYS.SOLUTION_INSTRUCTORS) || []).filter(i => i.solutionId === solutionId);
        if (allMentors.length === 0) return null;
        const solTotal = sol.academicHours || 0;
        const totalMen = allMentors.reduce((s, m) => s + (parseFloat(m.totalAcademicHours) || 0), 0);
        const sumP1 = allMentors.reduce((s, m) => s + (parseFloat(m.period1Hours) || 0), 0);
        const sumP2 = allMentors.reduce((s, m) => s + (parseFloat(m.period2Hours) || 0), 0);
        if (solTotal === 0 || totalMen === 0) return null;
        if (Math.abs(solTotal - totalMen) > 0.01 || Math.abs(sumP1 + sumP2 - totalMen) > 0.01) {
            return { solP1: sumP1, solP2: sumP2, sumP1, sumP2, totalSol: solTotal, totalMen };
        }
        return null;
    }

    function saveSolution() {
        const name = document.getElementById('fSolName').value.trim();
        if (!name) { showToast('יש להזין שם פתרון למידה', 'error'); return; }
        const data = {
            name: name,
            solutionNumber: document.getElementById('fSolNumber').value.trim(),
            description: document.getElementById('fSolDesc').value.trim(),
            guideId: document.getElementById('fSolGuide').value || null,
            topicType: document.getElementById('fSolTopicType').value,
            topic: document.getElementById('fSolTopic').value,
            createdBy: editingItem ? (editingItem.createdBy || currentUser.id) : currentUser.id,
            educationStage: getCheckedValues(DataStore.KEYS.LOOKUP_EDUCATION_STAGES),
            educationType: getCheckedValues(DataStore.KEYS.LOOKUP_EDUCATION_TYPES),
            startDate: document.getElementById('fSolStart').value,
            endDate: document.getElementById('fSolEnd').value,
            weekDay: document.getElementById('fSolWeekDay').value,
            meetingType: document.getElementById('fSolMeetingType').value,
            academicHours: parseFloat(document.getElementById('fSolHours').value) || 0,
            budgetType: document.getElementById('fSolIsBudgeted')?.checked ? 'מתוקצב' : 'לא מתוקצב',
            budgetTypeValue: document.getElementById('fSolBudgetType')?.value || '',
            budgetedHours: document.getElementById('fSolIsBudgeted')?.checked ? (parseInt(document.getElementById('fSolBudgetedHours').value) || 0) : 0,
            period1Hours: parseFloat(document.getElementById('fSolP1Hours').value) || 0,
            period2Hours: parseFloat(document.getElementById('fSolP2Hours').value) || 0,
            budgetAllocationStatus: document.getElementById('fSolAllocStatus').value,
            whatsappLink: document.getElementById('fSolWhatsapp').value.trim(),
            registrationLink: document.getElementById('fSolRegLink').value.trim(),
            showInCatalog: document.getElementById('fSolShowInCatalog').checked,
            notes: document.getElementById('fSolNotes').value.trim()
        };
        if (editingItem) {
            DataStore.update(DataStore.KEYS.SOLUTIONS, editingItem.id, data);
            logActivity('edit_solution', 'עריכת פתרון למידה: ' + name, 'solution', editingItem.id);
            showToast('הפתרון עודכן בהצלחה', 'success');
        } else {
            data.periodId = AppContext.activePeriod ? AppContext.activePeriod.id : null;
            DataStore.create(DataStore.KEYS.SOLUTIONS, data);
            logActivity('add_solution', 'הוספת פתרון למידה: ' + name, 'solution', '');
            showToast('הפתרון נוסף לקטלוג בהצלחה', 'success');
        }
        editingItem = null; closeModal(); renderSolutions(); updateSolutionsCount();
    }

    // ================================================================
    //  NEW SOLUTION FLOW (Full Page – No Budget Fields)
    // ================================================================
    function startNewSolutionFlow() {
        _newSolFlow = { step: 1, responsibilityType: null, editingId: null };
        showSection('new-solution');
    }

    function renderNewSolutionFlow() {
        const container = document.getElementById('section-new-solution');
        if (!container) return;
        if (_newSolFlow.step === 1) {
            _renderResponsibilitySelection(container);
        } else {
            _renderSolutionForm(container);
        }
    }

    function _renderResponsibilitySelection(container) {
        const types = DataStore.getAll(DataStore.KEYS.LOOKUP_RESPONSIBILITY_TYPES) || [];
        const icons = { psagati: '🏛️', school: '🏫', school_managed: '🏫🏛️' };
        const colors = { psagati: 'var(--primary)', school: 'var(--accent)', school_managed: 'var(--success)' };
        const details = {
            psagati: 'אחריות מלאה של הפסג"ה על התכנית – כולל תקציב, מנחים ולו"ז',
            school: 'אחריות מלאה של בית הספר – הפסג"ה מספקת מעקב בלבד',
            school_managed: 'אחריות מלאה של הפסג"ה על התכנית – כולל תקציב, מנחים ולו"ז'
        };

        container.innerHTML = `
            <div style="max-width:800px;margin:0 auto;">
                <div style="text-align:center;margin-bottom:32px;">
                    <h2 style="font-size:22px;font-weight:800;margin-bottom:8px;">הוספת פתרון למידה חדש לקטלוג</h2>
                    <p style="color:var(--gray-500);font-size:15px;">בחר את סוג האחריות של פתרון הלמידה</p>
                </div>

                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px;">
                    ${types.filter(t => t.isActive !== false).sort((a,b) => (a.order||1)-(b.order||1)).map(t => `
                        <div class="card" style="cursor:pointer;transition:all .2s;border:2px solid var(--gray-200);text-align:center;padding:28px 20px;"
                             onmouseover="this.style.borderColor='${colors[t.value] || 'var(--primary)'}';this.style.transform='translateY(-3px)';this.style.boxShadow='var(--shadow-lg)'"
                             onmouseout="this.style.borderColor='var(--gray-200)';this.style.transform='none';this.style.boxShadow='var(--shadow)'"
                             onclick="App._selectResponsibilityType('${t.value}')">
                            <div style="font-size:48px;margin-bottom:14px;">${icons[t.value] || '📋'}</div>
                            <h3 style="font-size:17px;font-weight:800;margin-bottom:6px;color:var(--gray-800);">${escAttr(t.label)}</h3>
                            <p style="font-size:13px;color:var(--gray-500);line-height:1.6;">${details[t.value] || escAttr(t.description || '')}</p>
                        </div>
                    `).join('')}
                </div>

                <div style="text-align:center;margin-top:28px;">
                    <button class="btn btn-outline" onclick="App.showSection('solutions')">← חזרה לקטלוג</button>
                </div>
            </div>`;
    }

    function _selectResponsibilityType(type) {
        _newSolFlow.step = 2;
        _newSolFlow.responsibilityType = type;
        renderNewSolutionFlow();
    }

    function _backToResponsibilitySelection() {
        // Destroy TinyMCE editors when going back
        if (typeof tinymce !== 'undefined') {
            try {
                var descEditor = tinymce.get('nsf_desc');
                var notesEditor = tinymce.get('nsf_notes');
                if (descEditor) { descEditor.save(); descEditor.destroy(); }
                if (notesEditor) { notesEditor.save(); notesEditor.destroy(); }
                _nsfTinyMCEInit = false;
            } catch(e) {}
        }
        _newSolFlow.step = 1;
        _newSolFlow.responsibilityType = null;
        renderNewSolutionFlow();
    }

    function _renderSolutionForm(container) {
        const respType = _newSolFlow.responsibilityType;
        const respLabel = respType ? (getLookupLabel(DataStore.KEYS.LOOKUP_RESPONSIBILITY_TYPES, respType) || respType) : '';
        const isSchool = (respType === 'school' || respType === 'school_managed');
        const guides = DataStore.getAll(DataStore.KEYS.GUIDES_REPO) || [];
        const mentors = DataStore.getAll(DataStore.KEYS.MENTORS) || [];

        let guideOpts = guides.filter(g => g.isActive !== false).map(g =>
            `<option value="${g.id}">${escAttr(_guideDisplayName(g))}</option>`
        ).join('');

        // Build school field HTML (only for school type)
        const schoolFieldHtml = isSchool ? `
            <div class="form-group full-width" id="nsf_schoolGroup">
                <label>1. שם בית הספר (שדה חובה) *</label>
                <div class="ms-autocomplete" id="nsf_ssAutocomplete">
                    <div class="ms-container" id="nsf_ssContainer" onclick="document.getElementById('nsf_ssInput').focus()">
                        <span class="ms-placeholder" id="nsf_ssPlaceholder">🔍 הקלד שם בית ספר או סמל מוסד...</span>
                    </div>
                </div>
            </div>` : '';

        // Determine field numbering offset
        const numOffset = isSchool ? 1 : 0;

        container.innerHTML = `
            <div style="max-width:900px;margin:0 auto;">
                <!-- Breadcrumb -->
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:20px;font-size:14px;color:var(--gray-500);">
                    <a href="#" onclick="App.showSection('solutions');return false;" style="color:var(--primary);text-decoration:none;font-weight:600;">קטלוג פתרונות למידה</a>
                    <span>›</span>
                    <a href="#" onclick="App._backToResponsibilitySelection();return false;" style="color:var(--primary);text-decoration:none;font-weight:600;">בחירת אחריות</a>
                    <span>›</span>
                    <span>פרטי פתרון למידה חדש</span>
                </div>

                <div class="card">
                    <div class="card-header">
                        <span class="card-title">📝 פרטי פתרון למידה חדש</span>
                        ${respLabel ? `<span class="badge badge-primary" style="font-size:13px;">${escAttr(respLabel)}</span>` : ''}
                    </div>
                    <div class="card-body">
                        <div class="form-grid">

                            <!-- School name (conditional) -->
                            ${schoolFieldHtml}

                            <!-- 1. Name (required) -->
                            <div class="form-group full-width">
                                <label>${1 + numOffset}. שם פתרון למידה (שדה חובה) *</label>
                                <input type="text" id="nsf_name" class="form-input" required placeholder="הכנס שם פתרון הלמידה">
                            </div>

                            <!-- 2. Number -->
                            <div class="form-group">
                                <label>${2 + numOffset}. מספר פתרון למידה</label>
                                <input type="text" id="nsf_number" class="form-input" placeholder="מספר אוטומטי">
                            </div>

                            <!-- 3. Description -->
                            <div class="form-group full-width">
                                <label>${3 + numOffset}. תיאור פתרון למידה</label>
                                <textarea id="nsf_desc" class="form-textarea" placeholder="תיאור מפורט של פתרון הלמידה"></textarea>
                            </div>

                            <!-- 4. Guide -->
                            <div class="form-group">
                                <label>${4 + numOffset}. מדריך אחראי *</label>
                                <select id="nsf_guide" class="form-select" required>
                                    <option value="">בחר מדריך</option>
                                    ${guideOpts}
                                </select>
                            </div>

                            <!-- 5. Domain -->
                            <div class="form-group">
                                <label>${5 + numOffset}. תחום</label>
                                <select id="nsf_topicType" class="form-select" onchange="App._nsfOnTopicTypeChange()">
                                    <option value="">בחר</option>
                                    ${getLookupOptions(DataStore.KEYS.LOOKUP_DOMAINS)}
                                </select>
                            </div>

                            <!-- 6. Topic -->
                            <div class="form-group">
                                <label>${6 + numOffset}. נושא</label>
                                <select id="nsf_topic" class="form-select" disabled>
                                    <option value="">בחר תחום קודם</option>
                                </select>
                            </div>

                            <!-- 7. Education Stage (multi) -->
                            <div class="form-group">
                                <label>${7 + numOffset}. שלב חינוך (רב-ברירה)</label>
                                <div style="padding:6px 0;">${buildCheckboxes(DataStore.KEYS.LOOKUP_EDUCATION_STAGES, [])}</div>
                            </div>

                            <!-- 8. Education Type (multi) -->
                            <div class="form-group">
                                <label>${8 + numOffset}. סוג חינוך (רב-ברירה)</label>
                                <div style="padding:6px 0;">${buildCheckboxes(DataStore.KEYS.LOOKUP_EDUCATION_TYPES, [])}</div>
                            </div>

                            <!-- 9. Start Date -->
                            <div class="form-group">
                                <label>${9 + numOffset}. תאריך תחילת ההשתלמות</label>
                                <input type="date" id="nsf_startDate" class="form-input">
                            </div>

                            <!-- 10. End Date -->
                            <div class="form-group">
                                <label>${10 + numOffset}. תאריך סיום ההשתלמות</label>
                                <input type="date" id="nsf_endDate" class="form-input">
                            </div>

                            <!-- 11. Week Day -->
                            <div class="form-group">
                                <label>${11 + numOffset}. יום בשבוע</label>
                                <select id="nsf_weekDay" class="form-select">
                                    <option value="">בחר</option>
                                    ${getLookupOptions(DataStore.KEYS.LOOKUP_WEEK_DAYS)}
                                </select>
                            </div>

                            <!-- 12. Meeting Type -->
                            <div class="form-group">
                                <label>${12 + numOffset}. סוג מפגש</label>
                                <select id="nsf_meetingType" class="form-select">
                                    <option value="">בחר</option>
                                    ${getLookupOptions(DataStore.KEYS.LOOKUP_MEETING_TYPES)}
                                </select>
                            </div>

                            <!-- 13. Academic Hours -->
                            <div class="form-group">
                                <label>${13 + numOffset}. שעות אקדמיות מוכרות לגמול</label>
                                <input type="number" id="nsf_hours" class="form-input" value="0" min="0" step="0.5">
                            </div>

                            <!-- 14. Mentors (multi-select autocomplete) -->
                            <div class="form-group full-width">
                                <label>${14 + numOffset}. מנחים (רב-ברירה)</label>
                                <div class="ms-autocomplete" id="nsf_msAutocomplete">
                                    <div class="ms-container" id="nsf_msContainer" onclick="document.getElementById('nsf_msInput').focus()">
                                        <span class="ms-placeholder" id="nsf_msPlaceholder">🔍 הקלד לחיפוש מנחה...</span>
                                    </div>
                                </div>
                            </div>

                            <!-- 15. WhatsApp Link -->
                            <div class="form-group">
                                <label>${15 + numOffset}. קישור וואטסאפ</label>
                                <div style="display:flex;gap:6px;align-items:center;">
                                    <input type="password" id="nsf_whatsapp" class="form-input" placeholder="https://chat.whatsapp.com/..." dir="ltr" style="text-align:left;flex:1;">
                                    <button type="button" class="btn btn-outline btn-sm" onclick="App._toggleLinkVis('nsf_whatsapp',this)" title="הצג/הסתר">👁️</button>
                                </div>
                            </div>

                            <!-- 16. Registration Link -->
                            <div class="form-group">
                                <label>${16 + numOffset}. קישור רישום מוקדם</label>
                                <div style="display:flex;gap:6px;align-items:center;">
                                    <input type="password" id="nsf_regLink" class="form-input" placeholder="https://..." dir="ltr" style="text-align:left;flex:1;">
                                    <button type="button" class="btn btn-outline btn-sm" onclick="App._toggleLinkVis('nsf_regLink',this)" title="הצג/הסתר">👁️</button>
                                </div>
                            </div>

                            <!-- 17. Show in Catalog -->
                            <div class="form-group">
                                <label>${17 + numOffset}. הצג בקטלוג הציבורי</label>
                                <div style="display:flex;align-items:center;gap:10px;padding-top:8px;">
                                    <label class="toggle-switch"><input type="checkbox" id="nsf_showInCatalog"><span class="toggle-slider"></span></label>
                                    <span style="font-size:13px;color:var(--gray-500);" id="nsf_catalogLabel">מוסתר</span>
                                </div>
                            </div>

                            <!-- 18. Notes (General Remark - TinyMCE, at bottom) -->
                            <div class="form-group full-width">
                                <label>${18 + numOffset}. הערה כללית</label>
                                <textarea id="nsf_notes" class="form-textarea" placeholder="הערות נוספות..."></textarea>
                            </div>
                        </div>

                        <!-- Action Buttons -->
                        <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:24px;padding-top:20px;border-top:2px solid var(--gray-100);flex-wrap:wrap;">
                            <button class="btn btn-outline" onclick="App.showSection('solutions')">ביטול</button>
                            <button class="btn btn-primary" onclick="App._saveNewSolution()">💾 שמור והוסף לקטלוג</button>
                        </div>
                    </div>
                </div>
            </div>`;

        // Toggle label update
        const toggleEl = document.getElementById('nsf_showInCatalog');
        if (toggleEl) {
            toggleEl.addEventListener('change', function() {
                const lbl = document.getElementById('nsf_catalogLabel');
                if (lbl) lbl.textContent = this.checked ? 'מוצג' : 'מוסתר';
            });
        }
        // Init multi-select autocomplete (mentors)
        _msInit();
        // Init single-select school autocomplete
        if (isSchool) _ssSchoolInit();
        // Initialize TinyMCE for description and notes fields
        setTimeout(function() { _initNsfTinyMCE(); }, 300);
    }

    // ================================================================
    //  SINGLE-SELECT SCHOOL AUTOCOMPLETE (for new solution form)
    // ================================================================
    let _ssSelectedSchool = null; // { id, name, code }
    let _ssHighlightIdx = -1;
    let _ssFilteredSchools = [];

    function _ssSchoolInit() {
        _ssSelectedSchool = null;
        _ssHighlightIdx = -1;
        _ssFilteredSchools = [];
        const container = document.getElementById('nsf_ssContainer');
        if (!container) return;
        // Remove old input if re-initializing
        const oldInput = document.getElementById('nsf_ssInput');
        if (oldInput) oldInput.remove();
        const input = document.createElement('input');
        input.type = 'text';
        input.id = 'nsf_ssInput';
        input.className = 'ms-input';
        input.placeholder = '';
        input.autocomplete = 'off';
        input.setAttribute('dir', 'rtl');
        input.addEventListener('input', function() { App._ssOnInput(this.value); });
        input.addEventListener('keydown', function(e) { App._ssOnKeyDown(e); });
        input.addEventListener('focus', function() { App._ssOnInput(this.value); });
        container.appendChild(input);
        // Click outside to close
        setTimeout(function() {
            document.addEventListener('click', App._ssOnDocClick);
        }, 0);
    }

    function _ssOnDocClick(e) {
        const ac = document.getElementById('nsf_ssAutocomplete');
        if (ac && !ac.contains(e.target)) {
            App._ssCloseDropdown();
        }
    }

    function _ssOnInput(query) {
        const term = (query || '').trim().toLowerCase();
        const schools = DataStore.getAll(DataStore.KEYS.LOOKUP_SCHOOLS) || [];
        const filtered = schools.filter(function(s) {
            if (_ssSelectedSchool && s.id === _ssSelectedSchool.id) return false;
            if (!term) return true;
            return (s.name || '').toLowerCase().indexOf(term) !== -1 ||
                   (s.code || '').indexOf(term) !== -1;
        }).sort(function(a, b) { return (a.name || '').localeCompare(b.name || '', 'he'); });
        _ssFilteredSchools = filtered;
        _ssHighlightIdx = -1;
        _ssRenderDropdown(filtered);
    }

    function _ssRenderDropdown(items) {
        let existing = document.getElementById('nsf_ssDropdown');
        if (existing) existing.remove();
        const ac = document.getElementById('nsf_ssAutocomplete');
        if (!ac) return;
        if (items.length === 0) return;
        const div = document.createElement('div');
        div.id = 'nsf_ssDropdown';
        div.className = 'ms-dropdown';
        div.innerHTML = items.map(function(s, i) {
            const codeDisplay = s.code ? ' <span class="ms-item-sub">(' + escAttr(s.code) + ')</span>' : '';
            return '<div class="ms-item" data-idx="' + i + '" data-id="' + escAttr(s.id) + '" onmousedown="App._ssSelectSchool(\'' + escAttr(s.id) + '\')" onmouseenter="App._ssHighlightItem(' + i + ')"><span class="ms-item-name">' + escAttr(s.name || '') + '</span>' + codeDisplay + '</div>';
        }).join('');
        ac.appendChild(div);
    }

    function _ssCloseDropdown() {
        _ssHighlightIdx = -1;
        const dd = document.getElementById('nsf_ssDropdown');
        if (dd) dd.remove();
    }

    function _ssHighlightItem(idx) {
        _ssHighlightIdx = idx;
        const dd = document.getElementById('nsf_ssDropdown');
        if (!dd) return;
        const items = dd.querySelectorAll('.ms-item');
        items.forEach(function(el, i) {
            if (i === idx) el.classList.add('ms-highlighted');
            else el.classList.remove('ms-highlighted');
        });
        if (items[idx]) items[idx].scrollIntoView({ block: 'nearest' });
    }

    function _ssOnKeyDown(e) {
        const dd = document.getElementById('nsf_ssDropdown');
        const hasDropdown = dd && dd.children.length > 0;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!hasDropdown) return;
            _ssHighlightIdx = Math.min(_ssHighlightIdx + 1, _ssFilteredSchools.length - 1);
            _ssHighlightItem(_ssHighlightIdx);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (!hasDropdown) return;
            _ssHighlightIdx = Math.max(_ssHighlightIdx - 1, 0);
            _ssHighlightItem(_ssHighlightIdx);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (_ssHighlightIdx >= 0 && _ssFilteredSchools[_ssHighlightIdx]) {
                _ssSelectSchool(_ssFilteredSchools[_ssHighlightIdx].id);
            }
        } else if (e.key === 'Backspace') {
            const input = document.getElementById('nsf_ssInput');
            if (input && input.value === '' && _ssSelectedSchool) {
                _ssRemoveSchool();
            }
        } else if (e.key === 'Escape') {
            _ssCloseDropdown();
        }
    }

    function _ssSelectSchool(schoolId) {
        const school = DataStore.getById(DataStore.KEYS.LOOKUP_SCHOOLS, schoolId);
        if (!school) return;
        _ssSelectedSchool = { id: school.id, name: school.name || '', code: school.code || '' };
        const input = document.getElementById('nsf_ssInput');
        if (input) input.value = '';
        _ssRenderTag();
        _ssCloseDropdown();
        if (input) input.focus();
    }

    function _ssRemoveSchool() {
        _ssSelectedSchool = null;
        _ssRenderTag();
        const input = document.getElementById('nsf_ssInput');
        if (input) _ssOnInput(input.value);
    }

    function _ssRenderTag() {
        const container = document.getElementById('nsf_ssContainer');
        const placeholder = document.getElementById('nsf_ssPlaceholder');
        if (!container) return;
        container.querySelectorAll('.ms-tag').forEach(function(el) { el.remove(); });
        if (placeholder) {
            placeholder.style.display = _ssSelectedSchool ? 'none' : '';
        }
        if (!_ssSelectedSchool) return;
        const input = document.getElementById('nsf_ssInput');
        const tag = document.createElement('span');
        tag.className = 'ms-tag';
        const codeText = _ssSelectedSchool.code ? ' (' + _ssSelectedSchool.code + ')' : '';
        tag.innerHTML = escAttr(_ssSelectedSchool.name) + '<span style="color:var(--gray-400);font-weight:400;font-size:12px;">' + escAttr(codeText) + '</span><button type="button" class="ms-tag-remove" onclick="event.stopPropagation();App._ssRemoveSchool()">✕</button>';
        container.insertBefore(tag, input);
    }

    // ================================================================
    //  SINGLE-SELECT SCHOOL AUTOCOMPLETE (for edit solution form)
    // ================================================================
    let _essSelectedSchool = null; // { id, name, code }
    let _essHighlightIdx = -1;
    let _essFilteredSchools = [];

    function _essSchoolInit() {
        _essHighlightIdx = -1;
        _essFilteredSchools = [];
        const container = document.getElementById('ess_ssContainer');
        if (!container) return;
        const oldInput = document.getElementById('ess_ssInput');
        if (oldInput) oldInput.remove();
        const input = document.createElement('input');
        input.type = 'text';
        input.id = 'ess_ssInput';
        input.className = 'ms-input';
        input.placeholder = '';
        input.autocomplete = 'off';
        input.setAttribute('dir', 'rtl');
        input.addEventListener('input', function() { App._essOnInput(this.value); });
        input.addEventListener('keydown', function(e) { App._essOnKeyDown(e); });
        input.addEventListener('focus', function() { App._essOnInput(this.value); });
        container.appendChild(input);
        setTimeout(function() {
            document.addEventListener('click', App._essOnDocClick);
        }, 0);
    }

    function _essOnDocClick(e) {
        const ac = document.getElementById('ess_ssAutocomplete');
        if (ac && !ac.contains(e.target)) {
            App._essCloseDropdown();
        }
    }

    function _essOnInput(query) {
        const term = (query || '').trim().toLowerCase();
        const schools = DataStore.getAll(DataStore.KEYS.LOOKUP_SCHOOLS) || [];
        const filtered = schools.filter(function(s) {
            if (_essSelectedSchool && s.id === _essSelectedSchool.id) return false;
            if (!term) return true;
            return (s.name || '').toLowerCase().indexOf(term) !== -1 ||
                   (s.code || '').indexOf(term) !== -1;
        }).sort(function(a, b) { return (a.name || '').localeCompare(b.name || '', 'he'); });
        _essFilteredSchools = filtered;
        _essHighlightIdx = -1;
        _essRenderDropdown(filtered);
    }

    function _essRenderDropdown(items) {
        let existing = document.getElementById('ess_ssDropdown');
        if (existing) existing.remove();
        const ac = document.getElementById('ess_ssAutocomplete');
        if (!ac) return;
        if (items.length === 0) return;
        const div = document.createElement('div');
        div.id = 'ess_ssDropdown';
        div.className = 'ms-dropdown';
        div.innerHTML = items.map(function(s, i) {
            const codeDisplay = s.code ? ' <span class="ms-item-sub">(' + escAttr(s.code) + ')</span>' : '';
            return '<div class="ms-item" data-idx="' + i + '" data-id="' + escAttr(s.id) + '" onmousedown="App._essSelectSchool(\'' + escAttr(s.id) + '\')" onmouseenter="App._essHighlightItem(' + i + ')"><span class="ms-item-name">' + escAttr(s.name || '') + '</span>' + codeDisplay + '</div>';
        }).join('');
        ac.appendChild(div);
    }

    function _essCloseDropdown() {
        _essHighlightIdx = -1;
        const dd = document.getElementById('ess_ssDropdown');
        if (dd) dd.remove();
    }

    function _essHighlightItem(idx) {
        _essHighlightIdx = idx;
        const dd = document.getElementById('ess_ssDropdown');
        if (!dd) return;
        const items = dd.querySelectorAll('.ms-item');
        items.forEach(function(el, i) {
            if (i === idx) el.classList.add('ms-highlighted');
            else el.classList.remove('ms-highlighted');
        });
        if (items[idx]) items[idx].scrollIntoView({ block: 'nearest' });
    }

    function _essOnKeyDown(e) {
        const dd = document.getElementById('ess_ssDropdown');
        const hasDropdown = dd && dd.children.length > 0;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!hasDropdown) return;
            _essHighlightIdx = Math.min(_essHighlightIdx + 1, _essFilteredSchools.length - 1);
            _essHighlightItem(_essHighlightIdx);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (!hasDropdown) return;
            _essHighlightIdx = Math.max(_essHighlightIdx - 1, 0);
            _essHighlightItem(_essHighlightIdx);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (_essHighlightIdx >= 0 && _essFilteredSchools[_essHighlightIdx]) {
                _essSelectSchool(_essFilteredSchools[_essHighlightIdx].id);
            }
        } else if (e.key === 'Backspace') {
            const input = document.getElementById('ess_ssInput');
            if (input && input.value === '' && _essSelectedSchool) {
                _essRemoveSchool();
            }
        } else if (e.key === 'Escape') {
            _essCloseDropdown();
        }
    }

    function _essSelectSchool(schoolId) {
        const school = DataStore.getById(DataStore.KEYS.LOOKUP_SCHOOLS, schoolId);
        if (!school) return;
        _essSelectedSchool = { id: school.id, name: school.name || '', code: school.code || '' };
        const input = document.getElementById('ess_ssInput');
        if (input) input.value = '';
        _essRenderTag();
        _essCloseDropdown();
        if (input) input.focus();
    }

    function _essRemoveSchool() {
        _essSelectedSchool = null;
        _essRenderTag();
        const input = document.getElementById('ess_ssInput');
        if (input) _essOnInput(input.value);
    }

    function _essRenderTag() {
        const container = document.getElementById('ess_ssContainer');
        const placeholder = document.getElementById('ess_ssPlaceholder');
        if (!container) return;
        container.querySelectorAll('.ms-tag').forEach(function(el) { el.remove(); });
        if (placeholder) {
            placeholder.style.display = _essSelectedSchool ? 'none' : '';
        }
        if (!_essSelectedSchool) return;
        const input = document.getElementById('ess_ssInput');
        const tag = document.createElement('span');
        tag.className = 'ms-tag';
        const codeText = _essSelectedSchool.code ? ' (' + _essSelectedSchool.code + ')' : '';
        tag.innerHTML = escAttr(_essSelectedSchool.name) + '<span style="color:var(--gray-400);font-weight:400;font-size:12px;">' + escAttr(codeText) + '</span><button type="button" class="ms-tag-remove" onclick="event.stopPropagation();App._essRemoveSchool()">✕</button>';
        container.insertBefore(tag, input);
    }

    function _essOnRespTypeChange() {
        const sel = document.getElementById('esp_respType');
        const schoolGroup = document.getElementById('esp_schoolGroup');
        if (!sel || !schoolGroup) return;
        const val = sel.value;
        const shouldShow = (val === 'school' || val === 'school_managed');
        schoolGroup.style.display = shouldShow ? '' : 'none';
        if (shouldShow) {
            _essSelectedSchool = null;
            _essSchoolInit();
        } else {
            _essSelectedSchool = null;
            _essCloseDropdown();
            const container = document.getElementById('ess_ssContainer');
            if (container) container.querySelectorAll('.ms-tag').forEach(function(el) { el.remove(); });
            const placeholder = document.getElementById('ess_ssPlaceholder');
            if (placeholder) placeholder.style.display = '';
            const input = document.getElementById('ess_ssInput');
            if (input) input.value = '';
        }
    }

    function _guideDisplayName(g) {
        if (!g) return '';
        // אם נשמר טקסט מקורי (מהייבוא) — מציגים אותו כמות שהוזן
        if (g.guideName) return g.guideName;
        // אחרת (יצירה ידנית / רשומה ישנה): שולפים מהמאגר לפי שפת הממשק
        var lang = 'he';
        try {
            if (typeof getUiLang === 'function') { lang = getUiLang(); }
            else {
                var s = DataStore.getSettings();
                lang = (s && s.language) || document.documentElement.lang || 'he';
            }
        } catch (e) {}
        if (lang === 'ar' && g.fullNameAr) return g.fullNameAr;
        return g.fullName || g.fullNameAr || '';
    }


    // ================================================================
    //  MULTI-SELECT AUTOCOMPLETE (Mentors)
    // ================================================================
    function _msInit(opts) {
        opts = opts || {};
        _msPrefix = opts.prefix || 'nsf_';
        _msSelectedIds = (opts.preSelectedIds || []).slice();
        // Also handle pre-selected mentor names (from Excel import without mentorId)
        _msPreSelectedNames = (opts.preSelectedNames || []).slice();
        _msHighlightIdx = -1;
        _msFilteredItems = [];
        const container = document.getElementById(_msPrefix + 'msContainer');
        if (!container) return;
        // Remove old input if re-initializing
        var oldInput = document.getElementById(_msPrefix + 'msInput');
        if (oldInput) oldInput.remove();
        // Build search input
        const input = document.createElement('input');
        input.type = 'text';
        input.id = _msPrefix + 'msInput';
        input.className = 'ms-input';
        input.placeholder = '';
        input.autocomplete = 'off';
        input.setAttribute('dir', 'rtl');
        input.addEventListener('input', function() { App._msOnInput(this.value); });
        input.addEventListener('keydown', function(e) { App._msOnKeyDown(e); });
        input.addEventListener('focus', function() { App._msOnInput(this.value); });
        container.appendChild(input);
        // Render pre-selected tags (both by ID and by name)
        _msRenderTags();
        // Click outside to close
        setTimeout(function() {
            document.addEventListener('click', App._msOnDocClick);
        }, 0);
    }

    function _msOnDocClick(e) {
        var ac = document.getElementById(_msPrefix + 'msAutocomplete');
        if (ac && !ac.contains(e.target)) {
            App._msCloseDropdown();
        }
    }

    function _msOnInput(query) {
        var term = (query || '').trim().toLowerCase();
        var mentors = DataStore.getAll(DataStore.KEYS.MENTORS) || [];
        var filtered = mentors.filter(function(m) {
            if (m.isActive === false) return false;
            if (_msSelectedIds.indexOf(m.id) !== -1) return false;
            if (!term) return true;
            var name = getMentorName(m);
            return (name || '').toLowerCase().indexOf(term) !== -1 ||
                   (m.idNumber || '').indexOf(term) !== -1 ||
                   (m.phone || '').indexOf(term) !== -1;
        }).sort(function(a, b) { return (getMentorName(a) || '').localeCompare(getMentorName(b) || '', 'he'); });
        _msFilteredItems = filtered;
        _msHighlightIdx = -1;
        _msRenderDropdown(filtered);
    }

    function _msRenderDropdown(items) {
        var existing = document.getElementById(_msPrefix + 'msDropdown');
        if (existing) existing.remove();
        var ac = document.getElementById(_msPrefix + 'msAutocomplete');
        if (!ac) return;
        if (items.length === 0) {
            return;
        }
        var div = document.createElement('div');
        div.id = _msPrefix + 'msDropdown';
        div.className = 'ms-dropdown';
        div.innerHTML = items.map(function(m, i) {
            return '<div class="ms-item" data-idx="' + i + '" data-id="' + escAttr(m.id) + '" onmousedown="App._msSelectItem(\'' + escAttr(m.id) + '\')" onmouseenter="App._msHighlightItem(' + i + ')">' +
                '<span class="ms-item-name">' + escAttr(getMentorName(m)) + '</span>' +
                (m.idNumber ? '<span class="ms-item-sub">' + escAttr(m.idNumber) + '</span>' : '') +
            '</div>';
        }).join('');
        ac.appendChild(div);
    }

    function _msCloseDropdown() {
        _msHighlightIdx = -1;
        var dd = document.getElementById(_msPrefix + 'msDropdown');
        if (dd) dd.remove();
    }

    function _msHighlightItem(idx) {
        _msHighlightIdx = idx;
        var dd = document.getElementById('nsf_msDropdown');
        if (!dd) return;
        var items = dd.querySelectorAll('.ms-item');
        items.forEach(function(el, i) {
            if (i === idx) el.classList.add('ms-highlighted');
            else el.classList.remove('ms-highlighted');
        });
        if (items[idx]) items[idx].scrollIntoView({ block: 'nearest' });
    }

    function _msOnKeyDown(e) {
        var dd = document.getElementById(_msPrefix + 'msDropdown');
        var hasDropdown = dd && dd.children.length > 0;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!hasDropdown) return;
            _msHighlightIdx = Math.min(_msHighlightIdx + 1, _msFilteredItems.length - 1);
            _msHighlightItem(_msHighlightIdx);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (!hasDropdown) return;
            _msHighlightIdx = Math.max(_msHighlightIdx - 1, 0);
            _msHighlightItem(_msHighlightIdx);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (_msHighlightIdx >= 0 && _msFilteredItems[_msHighlightIdx]) {
                _msSelectItem(_msFilteredItems[_msHighlightIdx].id);
            }
        } else if (e.key === 'Backspace') {
            var input = document.getElementById(_msPrefix + 'msInput');
            if (input && input.value === '' && _msSelectedIds.length > 0) {
                _msRemoveTag(_msSelectedIds[_msSelectedIds.length - 1]);
            }
        } else if (e.key === 'Escape') {
            _msCloseDropdown();
        }
    }

    function _msSelectItem(mentorId) {
        if (_msSelectedIds.indexOf(mentorId) !== -1) return;
        _msSelectedIds.push(mentorId);
        var input = document.getElementById(_msPrefix + 'msInput');
        if (input) input.value = '';
        _msRenderTags();
        _msOnInput('');
        // Re-focus input
        if (input) input.focus();
    }

    function _msRemoveTag(mentorId) {
        _msSelectedIds = _msSelectedIds.filter(function(id) { return id !== mentorId; });
        _msRenderTags();
        // Refresh dropdown to show un-selected item
        var input = document.getElementById(_msPrefix + 'msInput');
        if (input) _msOnInput(input.value);
    }

    function _msRemovePreSelectedName(idx) {
        _msPreSelectedNames.splice(idx, 1);
        _msRenderTags();
        // Refresh dropdown
        var input = document.getElementById(_msPrefix + 'msInput');
        if (input) _msOnInput(input.value);
    }

    function _msRenderTags() {
        var container = document.getElementById(_msPrefix + 'msContainer');
        var placeholder = document.getElementById(_msPrefix + 'msPlaceholder');
        if (!container) return;
        // Remove existing tags
        container.querySelectorAll('.ms-tag').forEach(function(el) { el.remove(); });
        // Show/hide placeholder
        if (placeholder) {
            placeholder.style.display = (_msSelectedIds.length === 0 && (_msPreSelectedNames || []).length === 0) ? '' : 'none';
        }
        var input = document.getElementById(_msPrefix + 'msInput');
        // Add tags for selected mentors by ID
        _msSelectedIds.forEach(function(id) {
            var mentor = DataStore.getById(DataStore.KEYS.MENTORS, id);
            if (!mentor) return;
            var tag = document.createElement('span');
            tag.className = 'ms-tag';
            tag.innerHTML = escAttr(getMentorName(mentor)) + '<button type="button" class="ms-tag-remove" onclick="event.stopPropagation();App._msRemoveTag(\'' + id + '\')">✕</button>';
            container.insertBefore(tag, input);
        });
        // Add tags for pre-selected mentor names (from Excel import without mentorId)
        (_msPreSelectedNames || []).forEach(function(name, idx) {
            var tag = document.createElement('span');
            tag.className = 'ms-tag';
            tag.innerHTML = escAttr(name) + '<button type="button" class="ms-tag-remove" onclick="event.stopPropagation();App._msRemovePreSelectedName(' + idx + ')">✕</button>';
            container.insertBefore(tag, input);
        });
    }

    function _nsfOnTopicTypeChange() {
        const topicType = document.getElementById('nsf_topicType').value;
        const topicSelect = document.getElementById('nsf_topic');
        if (!topicSelect) return;
        if (!topicType) {
            topicSelect.innerHTML = '<option value="">בחר תחום קודם</option>';
            topicSelect.disabled = true;
            return;
        }
        // בית ספרי – אין נושאים
        if (topicType === 'בית ספרי') {
            topicSelect.innerHTML = '<option value="">לא רלוונטי</option>';
            topicSelect.disabled = true;
            return;
        }
        const key = getTopicLookupKey(topicType);
        if (!key) {
            topicSelect.innerHTML = '<option value="">אין נושאים</option>';
            topicSelect.disabled = true;
            return;
        }
        const topics = DataStore.getAll(key) || [];
        let topicOpts = '<option value="">בחר נושא</option>';
        topicOpts += topics.filter(t => t.isActive !== false).sort((a,b) => (a.order||1)-(b.order||1))
                .map(t => `<option value="${t.value}">${escAttr(t.label)}</option>`).join('');
        topicSelect.innerHTML = topicOpts;
        topicSelect.disabled = false;
    }

    function _saveNewSolution() {
        // Save TinyMCE content before saving
        if (typeof tinymce !== 'undefined') {
            var descEditor = tinymce.get('nsf_desc');
            var notesEditor = tinymce.get('nsf_notes');
            if (descEditor) descEditor.save();
            if (notesEditor) notesEditor.save();
        }

        const name = (document.getElementById('nsf_name').value || '').trim();
        const guideId = document.getElementById('nsf_guide').value;
        const respType = _newSolFlow.responsibilityType || '';
        const isSchool = (respType === 'school' || respType === 'school_managed');

        // Validation
        if (!respType) { showToast('יש לבחור סוג אחריות', 'error'); return; }
        if (!name) { showToast('יש להזין שם פתרון למידה', 'error'); return; }
        if (!guideId) { showToast('יש לבחור מדריך אחראי', 'error'); return; }
        if (isSchool) {
            if (!_ssSelectedSchool) { showToast('יש לבחור בית ספר', 'error'); return; }
        }

        // Gather selected mentors from multi-select autocomplete
        const selectedMentorIds = _msSelectedIds.slice();

        const data = {
            name: name,
            solutionNumber: (document.getElementById('nsf_number').value || '').trim(),
            description: (document.getElementById('nsf_desc').value || '').trim(),
            guideId: guideId,
            responsibilityType: respType,
            schoolId: isSchool ? _ssSelectedSchool.id : null,
            schoolName: isSchool ? _ssSelectedSchool.name : null,
            topicType: document.getElementById('nsf_topicType').value,
            topic: document.getElementById('nsf_topic').value,
            educationStage: getCheckedValues(DataStore.KEYS.LOOKUP_EDUCATION_STAGES),
            educationType: getCheckedValues(DataStore.KEYS.LOOKUP_EDUCATION_TYPES),
            startDate: document.getElementById('nsf_startDate').value,
            endDate: document.getElementById('nsf_endDate').value,
            weekDay: document.getElementById('nsf_weekDay').value,
            meetingType: document.getElementById('nsf_meetingType').value,
            academicHours: parseFloat(document.getElementById('nsf_hours').value) || 0,
            whatsappLink: (document.getElementById('nsf_whatsapp').value || '').trim(),
            registrationLink: (document.getElementById('nsf_regLink').value || '').trim(),
            showInCatalog: document.getElementById('nsf_showInCatalog').checked,
            notes: (document.getElementById('nsf_notes').value || '').trim(),
            createdBy: currentUser ? currentUser.id : null,
            periodId: AppContext.activePeriod ? AppContext.activePeriod.id : null,
            status: 'פעיל'
        };

        const newSolution = DataStore.create(DataStore.KEYS.SOLUTIONS, data);
        logActivity('add_solution', 'הוספת פתרון למידה: ' + name, 'solution', newSolution.id);

        // Link selected mentors to this solution
        if (selectedMentorIds.length > 0) {
            selectedMentorIds.forEach(mentorId => {
                const mentor = DataStore.getById(DataStore.KEYS.MENTORS, mentorId);
                if (mentor) {
                    DataStore.create(DataStore.KEYS.SOLUTION_INSTRUCTORS, {
                        solutionId: newSolution.id,
                        mentorId: mentor.id,
                        fullNameHe: mentor.fullNameHe || mentor.fullName,
                        fullNameAr: mentor.fullNameAr || '',
                        idNumber: mentor.idNumber,
                        phone: mentor.phone,
                        email: mentor.email,
                        performerType: '',
                        lecturerStatus: mentor.lecturerStatus || '',
                        totalAcademicHours: 0,
                        period1Hours: 0,
                        period2Hours: 0
                    });
                }
            });
        }

        showToast('הפתרון נוסף לקטלוג בהצלחה!', 'success');
        // Destroy TinyMCE editors before leaving
        if (typeof tinymce !== 'undefined') {
            try {
                var descEditor = tinymce.get('nsf_desc');
                var notesEditor = tinymce.get('nsf_notes');
                if (descEditor) { descEditor.save(); descEditor.destroy(); }
                if (notesEditor) { notesEditor.save(); notesEditor.destroy(); }
                _nsfTinyMCEInit = false;
            } catch(e) {}
        }
        _newSolFlow = { step: 1, responsibilityType: null, editingId: null };
        updateSolutionsCount();
        showSection('solutions');
    }

    function viewSolution(id) {
        const s = DataStore.getById(DataStore.KEYS.SOLUTIONS, id);
        if (!s) return;
        const guide = DataStore.getById(DataStore.KEYS.GUIDES_REPO, s.guideId);

        // תוויות עבריות לשלב חינוך וסוג חינוך
        function _lookupLabels(key, arr) {
            if (!Array.isArray(arr) || !arr.length) return '—';
            const items = DataStore.getAll(key) || [];
            return arr.map(v => {
                const item = items.find(i => i.value === v);
                return item ? item.label : v;
            }).join(', ');
        }
        const stageLabels = _lookupLabels(DataStore.KEYS.LOOKUP_EDUCATION_STAGES, s.educationStage);
        const typeLabels = _lookupLabels(DataStore.KEYS.LOOKUP_EDUCATION_TYPES, s.educationType);

        const whatsappLink = (s.whatsappLink || '').trim();
        const whatsappBtnText = whatsappLink ? 'للانضمام لمجموعة الواتساب' : 'إرسال رسالة واتساب لجهة اتصال';
        const whatsappBtn = '<a href="' + (whatsappLink || '#') + '"' + (whatsappLink ? ' target="_blank" rel="noopener"' : '') + ' class="btn btn-success btn-sm" style="text-decoration:none;">📱 ' + whatsappBtnText + '</a>';
        const regBtn = (s.registrationLink && s.registrationLink.trim())
            ? `<a href="${escAttr(s.registrationLink.trim())}" target="_blank" rel="noopener" class="btn btn-primary btn-sm" style="text-decoration:none;">🔗 רישום מוקדם</a>` : '';
        // כפתור תגובה
        const commentBtn = '<button class="btn btn-outline btn-sm" onclick="App.openCommentModal(\'' + s.id + '\')" title="השאר תגובה">💬 תגובה</button>';

        // מנחים משויכים
        const mentors = (DataStore.getAll(DataStore.KEYS.SOLUTION_INSTRUCTORS) || []).filter(i => i.solutionId === s.id);
        let mentorsSection = '';
        if (mentors.length > 0) {
            // בדיקת התאמת שעות
            const validation = _validateMentorHours(s.id);
            let validationMsg = '';
            if (validation) {
                validationMsg = `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px;margin-top:8px;">
                    <strong style="color:#dc2626;">⚠️ אי-התאמה בשעות:</strong>
                    <div style="font-size:13px;color:#991b1b;margin-top:4px;">
                        סה"כ מתוקצב: ${validation.totalSol} שע' | סה"כ מנחים: ${validation.totalMen} שע'<br>
                        2 מ׳: פתרון ${validation.solP1} שע' / מנחים ${validation.sumP1} שע'<br>
                        1 מ׳: פתרון ${validation.solP2} שע' / מנחים ${validation.sumP2} שע'
                    </div></div>`;
            }

            mentorsSection = `<div style="margin-top:16px;border-top:2px solid var(--gray-200);padding-top:12px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                    <strong style="font-size:15px;">👨‍🏫 מנחים משויכים (${mentors.length})</strong>
                    <button class="btn btn-primary btn-sm" onclick="App.openSolInstModal('${s.id}')">➕ הוספת מנחה</button>
                </div>
                <div style="max-height:250px;overflow-y:auto;">
                <table class="data-table" style="font-size:12px;"><thead><tr><th>שם</th><th>ת.ז.</th><th>סוג מבצע</th><th>סטטוס מרצה</th><th>סך שעות</th><th>2 מ׳</th><th>1 מ׳</th><th>תקציב</th><th>פעולות</th></tr></thead><tbody>
                ${mentors.map(m => `<tr>
                    <td><strong>${escAttr(getMentorName(m))}</strong></td>
                    <td style="direction:ltr;font-size:11px;">${m.idNumber || '—'}</td>
                    <td>${getLookupLabel(DataStore.KEYS.LOOKUP_PERFORMER_TYPES, m.performerType) || '—'}</td>
                    <td>${getLookupLabel(DataStore.KEYS.LOOKUP_LECTURER_STATUS, m.lecturerStatus) || '—'}</td>
                    <td><strong>${m.totalAcademicHours || 0}</strong></td>
                    <td>${m.period1Hours || 0}</td>
                    <td>${m.period2Hours || 0}</td>
                    <td style="font-size:11px;">
                        <div>2 מ׳: ${getLookupLabel(DataStore.KEYS.LOOKUP_ALLOCATION_STATUS, m.period1AllocStatus) || '—'}${m.period1BudgetCode ? ' (' + escAttr(m.period1BudgetCode) + ')' : ''}</div>
                        <div>1 מ׳: ${getLookupLabel(DataStore.KEYS.LOOKUP_ALLOCATION_STATUS, m.period2AllocStatus) || '—'}${m.period2BudgetCode ? ' (' + escAttr(m.period2BudgetCode) + ')' : ''}</div>
                    </td>
                    <td><div style="display:flex;gap:3px;">
                        <button class="btn btn-outline btn-sm" style="padding:2px 6px;font-size:11px;" onclick="App.editSolInst('${m.id}')">✏️</button>
                        <button class="btn btn-danger btn-sm" style="padding:2px 6px;font-size:11px;" onclick="App.deleteSolInst('${m.id}','${s.id}')">🗑️</button>
                    </div></td>
                </tr>`).join('')}
                </tbody></table></div>
                ${validationMsg}
            </div>`;
        } else {
            mentorsSection = `<div style="margin-top:16px;border-top:2px solid var(--gray-200);padding-top:12px;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <strong style="font-size:15px;">👨‍🏫 מנחים משויכים</strong>
                    <button class="btn btn-primary btn-sm" onclick="App.openSolInstModal('${s.id}')">➕ הוספת מנחה</button>
                </div>
                <p style="color:var(--gray-400);font-size:13px;margin-top:6px;">טרם הוספו מנחים לפתרון זה.</p>
            </div>`;
        }

        showModal('צפייה בפתרון למידה', `
            <div style="display:grid;gap:12px;">
                <h3 style="margin:0;font-size:18px;color:var(--gray-800);">${escAttr(s.name)}</h3>
                ${s.description ? `<p style="color:var(--gray-600);margin:0;line-height:1.6;">${escAttr(s.description)}</p>` : ''}
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px;">
                    <div><strong style="color:var(--gray-500);font-size:12px;">מדריך אחראי</strong><p style="font-weight:600;margin:4px 0 0;">${guide ? escAttr(guide.fullName) : '—'}</p></div>
                    <div><strong style="color:var(--gray-500);font-size:12px;">תחום / נושא</strong><p style="margin:4px 0 0;">${getLookupLabel(DataStore.KEYS.LOOKUP_DOMAINS, s.topicType)} / ${getTopicLabel(s.topicType, s.topic)}</p></div>
                    <div><strong style="color:var(--gray-500);font-size:12px;">שלב חינוך</strong><p style="margin:4px 0 0;">${stageLabels}</p></div>
                    <div><strong style="color:var(--gray-500);font-size:12px;">סוג חינוך</strong><p style="margin:4px 0 0;">${typeLabels}</p></div>
                    <div><strong style="color:var(--gray-500);font-size:12px;">תאריך התחלת ההשתלמות</strong><p style="margin:4px 0 0;">${formatDate(s.startDate) || '—'}</p></div>
                    <div><strong style="color:var(--gray-500);font-size:12px;">תאריך סיום השתלמות</strong><p style="margin:4px 0 0;">${formatDate(s.endDate) || '—'}</p></div>
                    <div><strong style="color:var(--gray-500);font-size:12px;">יום בשבוע</strong><p style="margin:4px 0 0;">${getLookupLabel(DataStore.KEYS.LOOKUP_WEEK_DAYS, s.weekDay) || '—'}</p></div>
                    <div><strong style="color:var(--gray-500);font-size:12px;">סוג מפגש</strong><p style="margin:4px 0 0;">${getLookupLabel(DataStore.KEYS.LOOKUP_MEETING_TYPES, s.meetingType) || '—'}</p></div>
                    <div><strong style="color:var(--gray-500);font-size:12px;">שעות אקדמיות</strong><p style="font-weight:600;margin:4px 0 0;">${s.academicHours || 0} שע'</p></div>
                    <div><strong style="color:var(--gray-500);font-size:12px;">סה"כ שעות מתוקצבות</strong><p style="font-weight:600;margin:4px 0 0;">${s.budgetedHours || 0} שע'</p></div>
                    <div><strong style="color:var(--gray-500);font-size:12px;">2 מ׳: 09–12</strong><p style="font-weight:600;margin:4px 0 0;">${s.period1Hours || 0} שע'</p></div>
                    <div><strong style="color:var(--gray-500);font-size:12px;">1 מ׳: 01–08</strong><p style="font-weight:600;margin:4px 0 0;">${s.period2Hours || 0} שע'</p></div>
                    <div><strong style="color:var(--gray-500);font-size:12px;">סטטוס שיוך תקציב</strong><p style="margin:4px 0 0;">${getLookupLabel(DataStore.KEYS.LOOKUP_ALLOCATION_STATUS, s.budgetAllocationStatus) || '—'}</p></div>
                </div>
                ${(whatsappBtn || regBtn || commentBtn) ? `<div style="display:flex;gap:8px;margin-top:8px;">${whatsappBtn}${regBtn}${commentBtn}</div>` : ''}
                ${s.notes ? `<div style="border-top:1px solid var(--gray-200);padding-top:10px;margin-top:8px;"><strong style="color:var(--gray-500);font-size:12px;">הערה כללית</strong><p style="margin:4px 0 0;line-height:1.5;">${escAttr(s.notes)}</p></div>` : ''}
                ${mentorsSection}
            </div>`,
        `<button class="btn btn-outline" onclick="App.closeModal()">סגור</button>`);
    }

    function openSolInstModal(solutionId, editInstId) {
        const editInst = editInstId ? DataStore.getById(DataStore.KEYS.SOLUTION_INSTRUCTORS, editInstId) : null;
        editingItem = editInst;
        const mentors = DataStore.getAll(DataStore.KEYS.MENTORS) || [];
        const mentorOpts = mentors.filter(m => m.isActive !== false).map(m => `<option value="${m.id}">${escAttr(getMentorName(m))} (${m.idNumber})</option>`).join('');
        // מבצעים פדגוגיים מתוך הטבלה החדשה
        const pedExecs = DataStore.getAll(DataStore.KEYS.PEDAGOGICAL_EXECUTORS) || [];
        const pedagogicalOpts = pedExecs.map(p => `<option value="${p.id}">${escAttr(p.institutionName || p.fullName || '')}</option>`).join('');

        const isEdit = !!editInst;
        const selMentorId = isEdit ? (editInst.mentorRepoId || '') : '';
        const eName = isEdit ? escAttr(editInst.fullNameHe || editInst.fullName) : '';
        const eId = isEdit ? (editInst.idNumber || '') : '';
        const ePhone = isEdit ? (editInst.phone || '') : '';
        const eEmail = isEdit ? (editInst.email || '') : '';
        const ePerfType = isEdit ? (editInst.performerType || '') : '';
        const ePedId = isEdit ? (editInst.pedagogicalExecutorId || '') : '';
        const eLectStatus = isEdit ? (editInst.lecturerStatus || '') : '';
        const eTotalHours = isEdit ? (editInst.totalAcademicHours || 0) : 0;
        const eP1Hours = isEdit ? (editInst.period1Hours || 0) : 0;
        const eP2Hours = isEdit ? (editInst.period2Hours || 0) : 0;
        const eP1BudgetCode = isEdit ? (editInst.period1BudgetCode || '') : '';
        const eP2BudgetCode = isEdit ? (editInst.period2BudgetCode || '') : '';
        const eP1AllocStatus = isEdit ? (editInst.period1AllocStatus || '') : '';
        const eP2AllocStatus = isEdit ? (editInst.period2AllocStatus || '') : '';

        // בדיקת התאמה ראשונית
        const sol = DataStore.getById(DataStore.KEYS.SOLUTIONS, solutionId);
        const solTotal = sol ? ((parseFloat(sol.period1Hours) || 0) + (parseFloat(sol.period2Hours) || 0)) : 0;

        showModal(isEdit ? 'עריכת מנחה' : 'הוספת מנחה לפתרון', `
            <div class="form-group"><label>בחר מנחה מהמאגר</label>
                <div style="position:relative;">
                    <input type="text" id="fInstSearch" class="form-input" placeholder="🔍 הקלד שם מלא או ת.ז. לחיפוש..." oninput="App._filterMentorSearch('fInst',false)" onfocus="App._filterMentorSearch('fInst',false)" onblur="App._closeMentorSearch('fInst')" autocomplete="off" value="${isEdit && selMentorId ? getMentorName(editInst) : ''}">
                    <div id="fInstSearchResults" style="position:absolute;top:100%;left:0;right:0;z-index:100;background:#fff;border:1px solid var(--gray-200);border-radius:0 0 var(--border-radius) var(--border-radius);max-height:200px;overflow-y:auto;display:none;box-shadow:0 4px 6px rgba(0,0,0,.1);"></div>
                </div>
                <input type="hidden" id="fInstSelect" value="${selMentorId}">
            </div>
            <div class="form-grid">
                <div class="form-group"><label>שם מנחה (עברית) *</label><input type="text" id="fInstNameHe" class="form-input" value="${isEdit ? escAttr(editInst.fullNameHe || editInst.fullName) : ''}" required></div>
                <div class="form-group"><label>שם מנחה (ערבית)</label><input type="text" id="fInstNameAr" class="form-input" value="${isEdit ? escAttr(editInst.fullNameAr || '') : ''}" placeholder="יישאר ריק אם לא קיים תרגום"></div>
                <div class="form-group"><label>תעודת זהות</label><input type="text" id="fInstId" class="form-input" value="${eId}"></div>
                <div class="form-group"><label>טלפון</label><input type="text" id="fInstPhone" class="form-input" value="${ePhone}"></div>
                <div class="form-group"><label>דוא"ל</label><input type="email" id="fInstEmail" class="form-input" value="${eEmail}"></div>
                <div class="form-group"><label>סוג מבצע</label><select id="fInstType" class="form-select" onchange="App._onPerformerTypeChange()">${getLookupOptions(DataStore.KEYS.LOOKUP_PERFORMER_TYPES, ePerfType)}</select></div>
                <div class="form-group" id="pedagogicalGroup" style="display:${ePerfType === 'pedagogical' ? 'block' : 'none'};"><label>מבצע פדגוגי</label><select id="fInstPedagogical" class="form-select"><option value="">בחר מבצע פדגוגי</option>${pedagogicalOpts}</select></div>
                <div class="form-group"><label>סטטוס מרצה</label><select id="fInstStatus" class="form-select">${getLookupOptions(DataStore.KEYS.LOOKUP_LECTURER_STATUS, eLectStatus)}</select></div>
                <div class="form-group">
                    <label>סה"כ שעות אקדמיות</label>
                    <div style="display:flex;gap:6px;align-items:center;">
                        <input type="number" id="fInstHours" class="form-input" value="${eTotalHours}" min="0" style="flex:1;" oninput="App._updateHoursValidation()">
                        <button type="button" class="btn btn-outline btn-sm" onclick="App.openHoursDetailModal()" title="פירוט שעות לפי תקופה" style="white-space:nowrap;font-size:16px;padding:6px 10px;">⏱️</button>
                    </div>
                </div>
            </div>
            <div id="hoursValidationIndicator" style="margin-top:8px;"></div>
            <!-- שדות נסתרים לאחסון נתוני התקופות -->
            <input type="hidden" id="fInstP1" value="${eP1Hours}">
            <input type="hidden" id="fInstP2" value="${eP2Hours}">
            <input type="hidden" id="fInstP1BudgetCode" value="${escAttr(eP1BudgetCode)}">
            <input type="hidden" id="fInstP2BudgetCode" value="${escAttr(eP2BudgetCode)}">
            <input type="hidden" id="fInstP1AllocStatus" value="${escAttr(eP1AllocStatus)}">
            <input type="hidden" id="fInstP2AllocStatus" value="${escAttr(eP2AllocStatus)}">
            <input type="hidden" id="fInstSolId" value="${solutionId}">
            ${isEdit ? '<input type="hidden" id="fInstEditId" value="' + editInstId + '">' : ''}
            <div id="hoursSummaryInline" style="margin-top:8px;padding:8px 12px;background:var(--gray-50);border-radius:var(--border-radius);border:1px solid var(--gray-200);font-size:13px;direction:rtl;">
                <strong>פירוט שעות:</strong> תקופה 2 (09–12): <strong id="inlineP1">${eP1Hours}</strong> שע' | תקופה 1 (01–08): <strong id="inlineP2">${eP2Hours}</strong> שע' | סה"כ: <strong id="inlineTotal">${parseFloat(eP1Hours||0) + parseFloat(eP2Hours||0)}</strong> שע'
            </div>`,
        `<button class="btn btn-primary" onclick="App.saveSolInst()">${isEdit ? '💾 שמור שינויים' : '➕ הוסף מנחה'}</button><button class="btn btn-outline" onclick="App.closeModal()">ביטול</button>`);
        // Initialize pedagogical dropdown
        if (ePerfType === 'pedagogical' && ePedId) {
            setTimeout(function() {
                const sel = document.getElementById('fInstPedagogical');
                if (sel) sel.value = ePedId;
            }, 50);
        }
        // Initialize validation
        setTimeout(function() { App._updateHoursValidation(); }, 50);
    }

    function _onPerformerTypeChange() {
        const val = document.getElementById('fInstType').value;
        const group = document.getElementById('pedagogicalGroup');
        if (!group) return;
        if (val === 'pedagogical') {
            group.style.display = 'block';
        } else {
            group.style.display = 'none';
            const sel = document.getElementById('fInstPedagogical');
            if (sel) sel.value = '';
        }
    }

    function _fillInstFromRepo() {
        const mentorId = document.getElementById('fInstSelect').value;
        if (!mentorId) return;
        const m = DataStore.getById(DataStore.KEYS.MENTORS, mentorId);
        if (!m) return;
        document.getElementById('fInstNameHe').value = m.fullNameHe || m.fullName || '';
        document.getElementById('fInstNameAr').value = m.fullNameAr || '';
        document.getElementById('fInstId').value = m.idNumber || '';
        document.getElementById('fInstPhone').value = m.phone || '';
        document.getElementById('fInstEmail').value = m.email || '';
        document.getElementById('fInstType').value = m.performerType || '';
        // אוטו-מילוי סטטוס מרצה
        if (m.lecturerStatus) {
            document.getElementById('fInstStatus').value = m.lecturerStatus;
        }
        // הפעלת שדה מבצע פדגוגי אם רלוונטי
        _onPerformerTypeChange();
    }

    function saveSolInst() {
        const nameHe = document.getElementById('fInstNameHe').value.trim();
        const nameAr = document.getElementById('fInstNameAr').value.trim();
        if (!nameHe) { showToast('יש להזין שם מנחה (עברית)', 'error'); return; }
        const solId = document.getElementById('fInstSolId').value;
        const repoId = document.getElementById('fInstSelect').value || null;
        const performerType = document.getElementById('fInstType').value;
        const pedagogicalId = (performerType === 'pedagogical') ? (document.getElementById('fInstPedagogical') ? document.getElementById('fInstPedagogical').value : '') : '';
        const editId = document.getElementById('fInstEditId') ? document.getElementById('fInstEditId').value : null;

        const instData = {
            solutionId: solId, mentorRepoId: repoId,
            fullNameHe: nameHe, fullNameAr: nameAr,
            idNumber: document.getElementById('fInstId').value.trim(),
            phone: document.getElementById('fInstPhone').value.trim(), email: document.getElementById('fInstEmail').value.trim(),
            performerType: performerType,
            pedagogicalExecutorId: pedagogicalId,
            lecturerStatus: document.getElementById('fInstStatus').value,
            totalAcademicHours: parseFloat(document.getElementById('fInstHours').value) || 0,
            period1Hours: parseFloat(document.getElementById('fInstP1').value) || 0,
            period2Hours: parseFloat(document.getElementById('fInstP2').value) || 0,
            period1BudgetCode: document.getElementById('fInstP1BudgetCode').value.trim(),
            period2BudgetCode: document.getElementById('fInstP2BudgetCode').value.trim(),
            period1AllocStatus: document.getElementById('fInstP1AllocStatus').value,
            period2AllocStatus: document.getElementById('fInstP2AllocStatus').value
        };

        if (editId) {
            DataStore.update(DataStore.KEYS.SOLUTION_INSTRUCTORS, editId, instData);
            logActivity('edit_mentor', 'עריכת מנחה: ' + nameHe, 'solution_instructor', editId);
            showToast('המנחה עודכן', 'success');
        } else {
            DataStore.create(DataStore.KEYS.SOLUTION_INSTRUCTORS, instData);
            logActivity('add_mentor', 'הוספת מנחה: ' + nameHe, 'solution_instructor', '');
            showToast('המנחה נוסף', 'success');
        }
        // בדיקת התאמת שעות
        const validation = _validateMentorHours(solId);
        if (validation) {
            showToast('⚠️ אי-התאמה בשעות! סה"כ מתוקצב: ' + validation.totalSol + ' | מנחים: ' + validation.totalMen, 'warning');
        }
        editingItem = null; closeModal(); viewSolution(solId);
    }

    function editSolInst(instId) {
        const inst = DataStore.getById(DataStore.KEYS.SOLUTION_INSTRUCTORS, instId);
        if (!inst) return;
        // עדכון השמות בטופס העריכה להשתמש ב-getMentorName עבור התצוגה
        inst.fullNameDisplay = getMentorName(inst);
        closeModal();
        setTimeout(function() { App.openSolInstModal(inst.solutionId, instId); }, 200);
    }

    function deleteSolInst(instId, solId) {
        confirmDialog('האם למחוק מנחה זה?', () => {
            _moveToRecycleBin(DataStore.KEYS.SOLUTION_INSTRUCTORS, instId);
            logActivity('delete_mentor', 'מחיקת מנחה מפתרון', 'solution_instructor', instId);
            showToast('המנחה נמחק', 'success');
            viewSolution(solId);
        });
    }

    // ============ HOURS DETAIL POPUP (פירוט שעות לפי תקופה) ============
    function openHoursDetailModal() {
        // קריאת ערכים נוכחיים מהשדות הנסתרים
        const curP1 = parseFloat(document.getElementById('fInstP1').value) || 0;
        const curP2 = parseFloat(document.getElementById('fInstP2').value) || 0;
        const curP1Budget = document.getElementById('fInstP1BudgetCode').value || '';
        const curP2Budget = document.getElementById('fInstP2BudgetCode').value || '';
        const curP1Alloc = document.getElementById('fInstP1AllocStatus').value || '';
        const curP2Alloc = document.getElementById('fInstP2AllocStatus').value || '';
        const curTotal = parseFloat(document.getElementById('fInstHours').value) || 0;

        // תקציבים לתפריט נפתח
        const budgets = DataStore.getAll(DataStore.KEYS.BUDGETS) || [];
        const budgetOpts = budgets.map(b => `<option value="${escAttr(b.budgetCode || '')}">${escAttr(b.budgetCode || '')} - ${escAttr(b.description || '')}</option>`).join('');

        // סטטוס שיוך
        const allocOpts = getLookupOptions(DataStore.KEYS.LOOKUP_ALLOCATION_STATUS);

        showModal('⏱️ פירוט שעות לפי תקופה', `
            <div style="margin-bottom:12px;padding:8px 12px;background:var(--gray-50);border-radius:var(--border-radius);font-size:14px;border:1px solid var(--gray-200);">
                <strong>סה"כ שעות אקדמיות:</strong> <span id="hdTotalHours">${curTotal}</span> שע'
            </div>

            <div style="display:grid;gap:16px;">
                <!-- תקופה 2 -->
                <div style="border:1px solid var(--gray-200);border-radius:var(--border-radius);padding:14px;background:white;">
                    <h4 style="margin:0 0 10px;font-size:15px;color:var(--gray-700);">📅 תקופה 2 – חודשים ספטמבר–דצמבר (09–12)</h4>
                    <div class="form-grid">
                        <div class="form-group"><label>מספר שעות</label><input type="number" id="hdP1Hours" class="form-input" value="${curP1}" min="0" step="0.5" oninput="App._updateHoursDetailValidation()"></div>
                        <div class="form-group"><label>קוד תקציב</label><select id="hdP1BudgetCode" class="form-select"><option value="">בחר קוד תקציב</option>${budgetOpts}</select></div>
                        <div class="form-group"><label>סטטוס שיוך תקציב</label><select id="hdP1AllocStatus" class="form-select">${allocOpts}</select></div>
                    </div>
                </div>
                <!-- תקופה 1 -->
                <div style="border:1px solid var(--gray-200);border-radius:var(--border-radius);padding:14px;background:white;">
                    <h4 style="margin:0 0 10px;font-size:15px;color:var(--gray-700);">📅 תקופה 1 – חודשים ינואר–אוגוסט (01–08)</h4>
                    <div class="form-grid">
                        <div class="form-group"><label>מספר שעות</label><input type="number" id="hdP2Hours" class="form-input" value="${curP2}" min="0" step="0.5" oninput="App._updateHoursDetailValidation()"></div>
                        <div class="form-group"><label>קוד תקציב</label><select id="hdP2BudgetCode" class="form-select"><option value="">בחר קוד תקציב</option>${budgetOpts}</select></div>
                        <div class="form-group"><label>סטטוס שיוך תקציב</label><select id="hdP2AllocStatus" class="form-select">${allocOpts}</select></div>
                    </div>
                </div>
            </div>
            <div id="hoursDetailValidation" style="margin-top:12px;"></div>`,
        `<button class="btn btn-primary" onclick="App.saveHoursDetail()">✅ אישור</button><button class="btn btn-outline" onclick="App.closeModal()">ביטול</button>`);

        // אתחול ערכים נבחרים
        setTimeout(function() {
            const s1 = document.getElementById('hdP1BudgetCode'); if (s1) s1.value = curP1Budget;
            const s2 = document.getElementById('hdP2BudgetCode'); if (s2) s2.value = curP2Budget;
            const s3 = document.getElementById('hdP1AllocStatus'); if (s3) s3.value = curP1Alloc;
            const s4 = document.getElementById('hdP2AllocStatus'); if (s4) s4.value = curP2Alloc;
            _updateHoursDetailValidation();
        }, 50);
    }

    function _updateHoursDetailValidation() {
        const total = parseFloat(document.getElementById('fInstHours') ? document.getElementById('fInstHours').value : 0) || 0;
        const p1 = parseFloat(document.getElementById('hdP1Hours') ? document.getElementById('hdP1Hours').value : 0) || 0;
        const p2 = parseFloat(document.getElementById('hdP2Hours') ? document.getElementById('hdP2Hours').value : 0) || 0;
        const sum = p1 + p2;
        const el = document.getElementById('hoursDetailValidation');
        if (!el) return;
        if (total === 0 && sum === 0) { el.innerHTML = ''; return; }
        const diff = sum - total;
        if (Math.abs(diff) < 0.01) {
            el.innerHTML = `<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:10px;color:#166534;font-weight:500;">✅ תקין – סה"כ שעות התקופות (${sum} שע') תואם לסה"כ האקדמיות (${total} שע')</div>`;
        } else if (diff < 0) {
            el.innerHTML = `<div style="background:#fef9c3;border:1px solid #fde047;border-radius:8px;padding:10px;color:#854d0e;font-weight:500;">⚠️ חסר – סה"כ התקופות (${sum} שע') נמוך מהסה"כ האקדמיות (${total} שע') ב-${Math.abs(diff)} שע'</div>`;
        } else {
            el.innerHTML = `<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:10px;color:#991b1b;font-weight:500;">🔴 עודף – סה"כ התקופות (${sum} שע') גבוה מהסה"כ האקדמיות (${total} שע') ב+${diff} שע'</div>`;
        }
    }

    function saveHoursDetail() {
        const p1 = parseFloat(document.getElementById('hdP1Hours').value) || 0;
        const p2 = parseFloat(document.getElementById('hdP2Hours').value) || 0;
        const p1Budget = (document.getElementById('hdP1BudgetCode').value || '').trim();
        const p2Budget = (document.getElementById('hdP2BudgetCode').value || '').trim();
        const p1Alloc = document.getElementById('hdP1AllocStatus').value;
        const p2Alloc = document.getElementById('hdP2AllocStatus').value;

        // עדכון שדות נסתרים בטופס המנחה
        document.getElementById('fInstP1').value = p1;
        document.getElementById('fInstP2').value = p2;
        document.getElementById('fInstP1BudgetCode').value = p1Budget;
        document.getElementById('fInstP2BudgetCode').value = p2Budget;
        document.getElementById('fInstP1AllocStatus').value = p1Alloc;
        document.getElementById('fInstP2AllocStatus').value = p2Alloc;

        // עדכון סה"כ שעות
        const newTotal = p1 + p2;
        document.getElementById('fInstHours').value = newTotal;

        // עדכון סיכום אינליין
        const inlineP1 = document.getElementById('inlineP1');
        const inlineP2 = document.getElementById('inlineP2');
        const inlineTotal = document.getElementById('inlineTotal');
        if (inlineP1) inlineP1.textContent = p1;
        if (inlineP2) inlineP2.textContent = p2;
        if (inlineTotal) inlineTotal.textContent = newTotal;

        closeModal();
        showToast('פירוט השעות נשמר', 'success');
        // עדכון חיווי אימות
        setTimeout(function() { _updateHoursValidation(); }, 200);
    }

    function _updateHoursValidation() {
        const total = parseFloat(document.getElementById('fInstHours') ? document.getElementById('fInstHours').value : 0) || 0;
        const p1 = parseFloat(document.getElementById('fInstP1') ? document.getElementById('fInstP1').value : 0) || 0;
        const p2 = parseFloat(document.getElementById('fInstP2') ? document.getElementById('fInstP2').value : 0) || 0;
        const sum = p1 + p2;
        const el = document.getElementById('hoursValidationIndicator');
        if (!el) return;
        if (total === 0 && sum === 0) { el.innerHTML = ''; return; }
        const diff = sum - total;
        if (Math.abs(diff) < 0.01) {
            el.innerHTML = `<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:8px 12px;color:#166534;font-size:13px;font-weight:500;">✅ תקין – סה"כ ${sum} שע' תואם לפירוט התקופות</div>`;
        } else if (diff < 0) {
            el.innerHTML = `<div style="background:#fef9c3;border:1px solid #fde047;border-radius:8px;padding:8px 12px;color:#854d0e;font-size:13px;">⚠️ חסר ${Math.abs(diff)} שע' – לחץ על ⏱️ לעדכון פירוט התקופות</div>`;
        } else {
            el.innerHTML = `<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:8px 12px;color:#991b1b;font-size:13px;">🔴 עודף ${diff} שע' – לחץ על ⏱️ לעדכון פירוט התקופות</div>`;
        }
    }

    function deleteSolution(id) {
        confirmDialog('האם להעביר פתרון למידה זה לסל מחזור?', () => {
            const sol = DataStore.getById(DataStore.KEYS.SOLUTIONS, id);
            if (!sol) return;
            _moveToRecycleBin(DataStore.KEYS.SOLUTIONS, id);
            // מחק מנחים משויכים
            const insts = (DataStore.getAll(DataStore.KEYS.SOLUTION_INSTRUCTORS) || []).filter(i => i.solutionId === id);
            insts.forEach(i => DataStore.remove(DataStore.KEYS.SOLUTION_INSTRUCTORS, i.id));
            logActivity('delete_solution', 'מחיקת פתרון למידה (לסל מחזור): ' + (sol.name || ''), 'solution', id);
            showToast('הפתרון הועבר לסל מחזור', 'success');
            renderSolutions(); updateSolutionsCount();
        });
    }

function deleteAllSolutions() {
    if (!confirm('⚠️ האם אתה בטוח שברצונך למחוק את כל הרשומות בקטלוג?\n\nפעולה זו אינה הפיכה וכל הנתונים יאבדו!')) return;
    if (!confirm('אישור סופי: למחוק את כל ' + (DataStore.getAll(DataStore.KEYS.SOLUTIONS) || []).length + ' הרשומות?')) return;
    
    console.log("🗑️ מתחיל מחיקה גורפת של קטלוג פתרונות למידה...");
    
    // 🔑 שלב 1: מחיקה מהזיכרון הפנימי
    if (DataStore._memoryCache) {
        DataStore._memoryCache[DataStore.KEYS.SOLUTIONS] = [];
        console.log("✅ נמחק מהזיכרון הפנימי");
    }
    
    // 🔑 שלב 2: מחיקה מ-localStorage
    try {
        localStorage.removeItem('matspanet_' + DataStore.KEYS.SOLUTIONS);
        console.log("✅ נמחק מ-localStorage");
    } catch (e) {
        console.warn("⚠️ לא הצלחנו למחוק מ-localStorage:", e);
    }
    
    // 🔑 שלב 3: מחיקה מהשרת (חשוב!)
    const currentSession = DataStore.getSession();
    if (currentSession && currentSession.userId) {
        const pathParts = window.location.pathname.split('/');
        pathParts.pop();
        const basePath = pathParts.join('/') + '/';
        const url = basePath + 'api/data-save.php';
        
        fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                filename: 'solutions.json', 
                data: [],
                session: currentSession 
            })
        })
        .then(response => response.json())
        .then(result => {
            console.log("✅ נמחק מהשרת בהצלחה:", result);
            // 🔑 שלב 4: רענון מיידי של התצוגה
            if (typeof renderSolutions === 'function') renderSolutions();
            showToast('כל הרשומות נמחקו בהצלחה (שרת + זיכרון)', 'success');
        })
        .catch(err => {
            console.error("❌ שגיאה בשליחה לשרת:", err);
            showToast('נמחק מהזיכרון, אך שגיאה במחיקה מהשרת', 'warning');
        });
    } else {
        console.warn("⚠️ אין session פעיל");
        if (typeof renderSolutions === 'function') renderSolutions();
        showToast('נמחק מהזיכרון (אין session לשליחה לשרת)', 'warning');
    }
}

    // ================================================================
    //  EDIT SOLUTION — All Fields (filled + empty)
    // ================================================================
    
function editSolutionPopulated(id) {
    const s = DataStore.getById(DataStore.KEYS.SOLUTIONS, id);
    if (!s) {
        showToast('רשומה לא נמצאה', 'error');
        return;
    }
    
    // 🔑 לוג אבחון ספציפי לשדות הבעייתיים
    console.log("🔍 בדיקת שדות ספציפיים ברשומה:", {
        instructors: s.instructors,
        mentorNames: s.mentorNames,
        instructorNames: s.instructorNames,
        earlyRegistrationLink: s.earlyRegistrationLink,
        registrationLink: s.registrationLink,
        regLink: s.regLink
    });

    editingItem = s;
    const respType = String(s.responsibilityType || '').trim();
    const isSchool = (respType === 'school' || respType === 'school_managed');
    
    function normalizeArray(val) {
        if (!val) return [];
        if (Array.isArray(val)) return val.map(String).map(v => v.trim());
        return String(val).split(',').map(v => v.trim()).filter(v => v !== '');
    }
    
    function normalizeDate(dateStr) {
        if (!dateStr) return '';
        const str = String(dateStr).trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
        const parts = str.split(/[\/\-\.]/);
        if (parts.length === 3 && parts[0].length <= 2) {
            return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
        return str;
    }

    const guides = DataStore.getAll(DataStore.KEYS.GUIDES_REPO) || [];
    const guideOpts = guides.filter(g => g.isActive !== false).map(g => {
        const isSelected = (s.guideId === g.id) || (s.guideId === g.fullName) || (s.guideId === g.fullNameAr);
        return `<option value="${g.id}" ${isSelected ? 'selected' : ''}>${escAttr(_guideDisplayName(g))}</option>`;
    }).join('');

    // 🔑 טיפול כפול במנחים: גם מהטבלה הנפרדת, וגם ממחרוזת מופרדת בפסיק
    const existingInst = (DataStore.getAll(DataStore.KEYS.SOLUTION_INSTRUCTORS) || []).filter(i => i.solutionId === id);
    const existingMentorIds = [];
    const existingMentorNames = [];
    
    // 1. שליפה מהטבלה הנפרדת
    existingInst.forEach(i => {
        if (i.mentorRepoId || i.mentorId) {
            existingMentorIds.push(String(i.mentorRepoId || i.mentorId).trim());
        } else if (i.fullName || i.fullNameHe) {
            existingMentorNames.push(String(i.fullName || i.fullNameHe).trim());
        }
    });

    // 2. 🔑 קריטי: שליפה ממחרוזת מופרדת בפסיק בשדה הראשי
    const rawInstructors = s.instructors || s.mentorNames || s.instructorNames || '';
    if (rawInstructors && typeof rawInstructors === 'string') {
        const namesArray = rawInstructors.split(',').map(n => n.trim()).filter(n => n !== '');
        namesArray.forEach(name => {
            if (!existingMentorNames.includes(name)) {
                existingMentorNames.push(name);
            }
        });
    }

    const solName = s.solutionName || s.name || '';
    const solNumber = s.solutionNumber || s.number || '';
    const solDesc = s.description || s.desc || '';
    const solDomain = String(s.domain || s.topicType || '').trim();
    const solTopic = String(s.topic || '').trim();
    
    const eduStages = normalizeArray(s.educationStage);
    const eduTypes = normalizeArray(s.educationType);

    function getSafeLookupOptions(key, savedValue) {
        if (!savedValue) return `<option value="">בחר</option>`;
        let opts = getLookupOptions(key, savedValue);
        if (savedValue && !opts.includes('selected')) {
            opts += `<option value="${escAttr(savedValue)}" selected>${escAttr(savedValue)}</option>`;
        }
        return opts;
    }

    const respOpts = getSafeLookupOptions(DataStore.KEYS.LOOKUP_RESPONSIBILITY_TYPES, respType);
    const weekDayOpts = getSafeLookupOptions(DataStore.KEYS.LOOKUP_WEEK_DAYS, String(s.weekDay || '').trim());
    const meetingTypeOpts = getSafeLookupOptions(DataStore.KEYS.LOOKUP_MEETING_TYPES, String(s.meetingType || '').trim());
    const domainOpts = getSafeLookupOptions(DataStore.KEYS.LOOKUP_DOMAINS, solDomain);

    // 🔑 נרמול מקיף לקישור רישום
    const regLink = s.earlyRegistrationLink || s.registrationLink || s.regLink || s.reg_link || '';

    const schoolFieldHtml = `
        <div class="form-group full-width" id="esp_schoolGroup" style="display:${isSchool ? '' : 'none'};">
            <label>1. שם בית הספר (שדה חובה) *</label>
            <div class="ms-autocomplete" id="ess_ssAutocomplete">
                <div class="ms-container" id="ess_ssContainer" onclick="document.getElementById('ess_ssInput').focus()">
                    <span class="ms-placeholder" id="ess_ssPlaceholder">🔍 הקלד שם בית ספר או סמל מוסד...</span>
                </div>
            </div>
        </div>`;

    const topicDisabled = (!solDomain || solDomain === 'בית ספרי') ? 'disabled' : '';
    const topicDefaultOpt = solDomain === 'בית ספרי' ? '<option value="">לא רלוונטי</option>' : '<option value="">בחר תחום קודם</option>';

    showModal('✏️ עריכת פתרון למידה', `
        <div class="form-grid">
            <div class="form-group full-width">
                <label>סוג האחריות</label>
                <select id="esp_respType" class="form-select" onchange="App._essOnRespTypeChange()">
                    <option value="">בחר סוג אחריות</option>
                    ${respOpts}
                </select>
            </div>
            ${schoolFieldHtml}
            <div class="form-group full-width">
                <label>${isSchool ? '2' : '1'}. שם פתרון למידה (שדה חובה) *</label>
                <input type="text" id="esp_name" class="form-input" value="${escAttr(solName)}" required>
            </div>
            <div class="form-group">
                <label>${isSchool ? '3' : '2'}. מספר פתרון למידה</label>
                <input type="text" id="esp_number" class="form-input" value="${escAttr(solNumber)}">
            </div>
            <div class="form-group full-width">
                <label>${isSchool ? '4' : '3'}. תיאור פתרון למידה</label>
                <textarea id="esp_desc" class="form-textarea">${escAttr(solDesc)}</textarea>
            </div>
            <div class="form-group">
                <label>${isSchool ? '5' : '4'}. מדריך אחראי *</label>
                <select id="esp_guide" class="form-select" required>
                    <option value="">בחר מדריך</option>
                    ${guideOpts}
                </select>
            </div>
            <div class="form-group">
                <label>${isSchool ? '6' : '5'}. תחום</label>
                <select id="esp_topicType" class="form-select" onchange="App._espOnTopicTypeChange()">
                    <option value="">בחר</option>
                    ${domainOpts}
                </select>
            </div>
            <div class="form-group">
                <label>${isSchool ? '7' : '6'}. נושא</label>
                <select id="esp_topic" class="form-select" ${topicDisabled}>
                    ${topicDefaultOpt}
                </select>
            </div>
            <div class="form-group">
                <label>${isSchool ? '8' : '7'}. שלב חינוך (רב-ברירה)</label>
                <div style="padding:6px 0;">${buildCheckboxes(DataStore.KEYS.LOOKUP_EDUCATION_STAGES, eduStages)}</div>
            </div>
            <div class="form-group">
                <label>${isSchool ? '9' : '8'}. סוג חינוך (רב-ברירה)</label>
                <div style="padding:6px 0;">${buildCheckboxes(DataStore.KEYS.LOOKUP_EDUCATION_TYPES, eduTypes)}</div>
            </div>
            <div class="form-group">
                <label>${isSchool ? '10' : '9'}. תאריך תחילת ההשתלמות</label>
                <input type="date" id="esp_startDate" class="form-input" value="${normalizeDate(s.startDate)}">
            </div>
            <div class="form-group">
                <label>${isSchool ? '11' : '10'}. תאריך סיום ההשתלמות</label>
                <input type="date" id="esp_endDate" class="form-input" value="${normalizeDate(s.endDate)}">
            </div>
            <div class="form-group">
                <label>${isSchool ? '12' : '11'}. יום בשבוע</label>
                <select id="esp_weekDay" class="form-select">
                    <option value="">בחר</option>
                    ${weekDayOpts}
                </select>
            </div>
            <div class="form-group">
                <label>${isSchool ? '13' : '12'}. סוג מפגש</label>
                <select id="esp_meetingType" class="form-select">
                    <option value="">בחר</option>
                    ${meetingTypeOpts}
                </select>
            </div>
            <div class="form-group">
                <label>${isSchool ? '14' : '13'}. שעות אקדמיות מוכרות לגמול</label>
                <input type="number" id="esp_hours" class="form-input" value="${s.academicHours || 0}" min="0" step="0.5">
            </div>
            <div class="form-group full-width">
                <label>${isSchool ? '15' : '14'}. מנחים (רב-ברירה)</label>
                <div class="ms-autocomplete" id="esp_msAutocomplete">
                    <div class="ms-container" id="esp_msContainer" onclick="document.getElementById('esp_msInput').focus()">
                        <span class="ms-placeholder" id="esp_msPlaceholder">🔍 הקלד לחיפוש מנחה...</span>
                    </div>
                </div>
            </div>
            <div class="form-group">
                <label>${isSchool ? '16' : '15'}. קישור וואטסאפ</label>
                <div style="display:flex;gap:6px;align-items:center;">
                    <input type="password" id="esp_whatsapp" class="form-input" value="${escAttr(s.whatsappLink || '')}" dir="ltr" style="text-align:left;flex:1;">
                    <button type="button" class="btn btn-outline btn-sm" onclick="App._toggleLinkVis('esp_whatsapp',this)">👁️</button>
                </div>
            </div>
            <div class="form-group">
                <label>${isSchool ? '17' : '16'}. קישור רישום מוקדם</label>
                <div style="display:flex;gap:6px;align-items:center;">
                    <input type="password" id="esp_regLink" class="form-input" value="${escAttr(regLink)}" dir="ltr" style="text-align:left;flex:1;">
                    <button type="button" class="btn btn-outline btn-sm" onclick="App._toggleLinkVis('esp_regLink',this)">👁️</button>
                </div>
            </div>
            <div class="form-group">
                <label>${isSchool ? '18' : '17'}. הצג בקטלוג הציבורי</label>
                <div style="display:flex;align-items:center;gap:10px;padding-top:8px;">
                    <label class="toggle-switch"><input type="checkbox" id="esp_showInCatalog" ${s.showInCatalog !== false ? 'checked' : ''}><span class="toggle-slider"></span></label>
                    <span style="font-size:13px;color:var(--gray-500);" id="esp_catalogLabel">${s.showInCatalog !== false ? 'מוצג' : 'מוסתר'}</span>
                </div>
            </div>
            <div class="form-group full-width">
                <label>${isSchool ? '19' : '18'}. הערה כללית</label>
                <textarea id="esp_notes" class="form-textarea">${escAttr(s.notes || s.generalNote || '')}</textarea>
            </div>
        </div>`,
        `<button class="btn btn-primary" onclick="App._saveEditPopulated()">💾 שמור שינויים</button><button class="btn btn-outline" onclick="App.closeModal()">ביטול</button>`
    );

    setTimeout(() => {
        const toggleEl = document.getElementById('esp_showInCatalog');
        if (toggleEl) {
            toggleEl.addEventListener('change', function() {
                const lbl = document.getElementById('esp_catalogLabel');
                if (lbl) lbl.textContent = this.checked ? 'מוצג' : 'מוסתר';
            });
        }
        
        if (solDomain && solDomain !== 'בית ספרי') {
            App._espOnTopicTypeChange(solTopic);
        }
        
        // 🔑 אתחול המנחים עם כל השמות שנאספו (גם מהטבלה הנפרדת וגם מהמחרוזת המופרדת בפסיק)
        _msInit({ prefix: 'esp_', preSelectedIds: existingMentorIds, preSelectedNames: existingMentorNames });
        
        if (isSchool) {
            _essSelectedSchool = (s.schoolId && s.schoolName) ? { id: s.schoolId, name: s.schoolName, code: s.schoolCode || '' } : null;
            _essSchoolInit();
            if (_essSelectedSchool) _essRenderTag();
        }
    }, 150);
}

	
    function _espOnTopicTypeChange(preSelectValue) {
        const sel = document.getElementById('esp_topicType');
        const topicSelect = document.getElementById('esp_topic');
        if (!sel || !topicSelect) return;
        const topicType = sel.value;
        if (!topicType) { topicSelect.innerHTML = '<option value="">בחר</option>'; topicSelect.disabled = true; return; }
        if (topicType === 'בית ספרי') { topicSelect.innerHTML = '<option value="">לא רלוונטי</option>'; topicSelect.disabled = true; return; }
        const key = getTopicLookupKey(topicType);
        if (!key) { topicSelect.innerHTML = '<option value="">אין נושאים</option>'; topicSelect.disabled = true; return; }
        const currentTopic = preSelectValue || '';
        let opts = getLookupOptions(key, currentTopic);
        if (currentTopic && !opts.includes('selected')) {
            opts += `<option value="${escAttr(currentTopic)}" selected>${escAttr(currentTopic)}</option>`;
        }
        topicSelect.innerHTML = '<option value="">בחר</option>' + opts;
        topicSelect.disabled = false;
    }

    function _saveEditPopulated() {
        const name = (document.getElementById('esp_name').value || '').trim();
        const guideId = document.getElementById('esp_guide').value;
        if (!name) { showToast('יש להזין שם פתרון למידה', 'error'); return; }
        if (!guideId) { showToast('יש לבחור מדריך אחראי', 'error'); return; }

        const respType = (document.getElementById('esp_respType') || {}).value || '';
        const isSchool = (respType === 'school' || respType === 'school_managed');
        if (isSchool) {
            if (!_essSelectedSchool) { showToast('יש לבחור בית ספר', 'error'); return; }
        }

        const data = {
            responsibilityType: respType,
            name: name,
            solutionNumber: (document.getElementById('esp_number').value || '').trim(),
            description: (document.getElementById('esp_desc').value || '').trim(),
            guideId: guideId,
            topicType: document.getElementById('esp_topicType').value,
            topic: document.getElementById('esp_topic').value,
            educationStage: getCheckedValues(DataStore.KEYS.LOOKUP_EDUCATION_STAGES),
            educationType: getCheckedValues(DataStore.KEYS.LOOKUP_EDUCATION_TYPES),
            startDate: document.getElementById('esp_startDate').value,
            endDate: document.getElementById('esp_endDate').value,
            weekDay: document.getElementById('esp_weekDay').value,
            meetingType: document.getElementById('esp_meetingType').value,
            academicHours: parseFloat(document.getElementById('esp_hours').value) || 0,
            whatsappLink: (document.getElementById('esp_whatsapp').value || '').trim(),
            registrationLink: (document.getElementById('esp_regLink').value || '').trim(),
            showInCatalog: document.getElementById('esp_showInCatalog').checked,
            notes: (document.getElementById('esp_notes').value || '').trim()
        };

        if (isSchool && _essSelectedSchool) {
            data.schoolId = _essSelectedSchool.id;
            data.schoolName = _essSelectedSchool.name;
            data.schoolCode = _essSelectedSchool.code || '';
        } else {
            data.schoolId = null;
            data.schoolName = null;
            data.schoolCode = null;
        }

        DataStore.update(DataStore.KEYS.SOLUTIONS, editingItem.id, data);

        // Handle mentor changes from multi-select autocomplete
        const selectedMentorIds = _msSelectedIds.slice();
        const selectedMentorNames = _msPreSelectedNames.slice();
        const existingInst = (DataStore.getAll(DataStore.KEYS.SOLUTION_INSTRUCTORS) || []).filter(i => i.solutionId === editingItem.id);
        
        // Remove all existing instructors for this solution (will re-add based on current selection)
        existingInst.forEach(inst => {
            DataStore.remove(DataStore.KEYS.SOLUTION_INSTRUCTORS, inst.id);
        });

        // Add mentors selected by ID
        selectedMentorIds.forEach(mentorId => {
            const mentor = DataStore.getById(DataStore.KEYS.MENTORS, mentorId);
            if (mentor) {
                DataStore.create(DataStore.KEYS.SOLUTION_INSTRUCTORS, {
                    solutionId: editingItem.id,
                    mentorId: mentor.id,
                    mentorRepoId: mentor.id,
                    fullNameHe: mentor.fullNameHe || mentor.fullName,
                    fullNameAr: mentor.fullNameAr || '',
                    idNumber: mentor.idNumber,
                    phone: mentor.phone,
                    email: mentor.email,
                    performerType: '',
                    lecturerStatus: mentor.lecturerStatus || '',
                    totalAcademicHours: 0,
                    period1Hours: 0,
                    period2Hours: 0
                });
            }
        });

        // Add mentors entered by name (from Excel import without mentorId)
        selectedMentorNames.forEach(mentorName => {
            DataStore.create(DataStore.KEYS.SOLUTION_INSTRUCTORS, {
                solutionId: editingItem.id,
                mentorId: null,
                mentorRepoId: null,
                fullName: mentorName,
                fullNameHe: mentorName,
                fullNameAr: '',
                idNumber: '',
                phone: '',
                email: '',
                performerType: '',
                lecturerStatus: '',
                totalAcademicHours: 0,
                period1Hours: 0,
                period2Hours: 0
            });
        });

        logActivity('edit_solution', 'עריכת פתרון למידה: ' + name, 'solution', editingItem.id);
        editingItem = null;
        _essSelectedSchool = null;
        closeModal();
        showToast('הפתרון עודכן בהצלחה', 'success');
        renderSolutions();
    }

    // ================================================================
    //  COMPLETE DATA (השלמת נתונים)
    // ================================================================

    function openCompleteDataModal(id) {
        var s = DataStore.getById(DataStore.KEYS.SOLUTIONS, id);
        if (!s) return;

        var totalHours = s.academicHours || 0;
        var guide = DataStore.getById(DataStore.KEYS.GUIDES_REPO, s.guideId);

        // Period labels from system config - use ACTIVE period, not just first one
        var periods = DataStore.getAll(DataStore.KEYS.PERIODS) || [];
        var curPeriod = null;
        for (var i = 0; i < periods.length; i++) {
            if (periods[i].isActive) { curPeriod = periods[i]; break; }
        }
        if (!curPeriod && periods.length > 0) { curPeriod = periods[0]; }
        var p1Label = (curPeriod && curPeriod.period1Label) ? curPeriod.period1Label : 'תקופה 1 (01-08)';
        var p2Label = (curPeriod && curPeriod.period2Label) ? curPeriod.period2Label : 'תקופה 2 (09-12)';
        var p1Range = curPeriod ? _fmtDateRange(curPeriod.period1Start, curPeriod.period1End) : '';
        var p2Range = curPeriod ? _fmtDateRange(curPeriod.period2Start, curPeriod.period2End) : '';

        // Budget types from lookup (exclude "לא מתוקצב" — handled by radio)
        var budgetTypes = (DataStore.getAll(DataStore.KEYS.LOOKUP_BUDGET_TYPES) || []).filter(function(bt) { return bt.isActive !== false && bt.value !== 'לא מתוקצב'; });

        // Determine existing state for pre-fill
        var hasExisting = !!(s.budgetType && s.budgetType !== '');
        var existingStatus = hasExisting ? (s.budgetType === 'מתוקצב' ? 'yes' : 'no') : '';
        var budgetTypeValue = s.budgetTypeValue || '';
        var budgetedHours = s.budgetedHours || 0;

        // Store global state
        window._cdSolutionId = id;
        window._cdSelectedMentorId = null;
        window._cdP1Label = p1Label;
        window._cdP2Label = p2Label;
        window._cdP1Range = p1Range;
        window._cdP2Range = p2Range;
        window._cdTotalHours = totalHours;

        // Task 3: Split comma-separated mentor names (idempotent)
        (function() {
            var insts = (DataStore.getAll(DataStore.KEYS.SOLUTION_INSTRUCTORS) || []).filter(function(i) { return i.solutionId === id; });
            for (var ii = 0; ii < insts.length; ii++) {
                var inst = insts[ii];
                // Use fullNameHe as primary, fallback to legacy fullName
                var fn = (inst.fullNameHe || inst.fullName || '').trim();
                if (!fn || fn.indexOf(',') === -1 || _getMentorType(inst) === 'כוח פנים') continue;
                var names = fn.split(',').map(function(n) { return n.trim(); }).filter(Boolean);
                if (names.length <= 1) continue;
                // Split: create individual records for names[1..n], keep original for names[0]
                for (var ni = 1; ni < names.length; ni++) {
                    DataStore.create(DataStore.KEYS.SOLUTION_INSTRUCTORS, {
                        solutionId: inst.solutionId,
                        mentorId: inst.mentorId || '',
                        mentorRepoId: inst.mentorRepoId || '',
                        fullNameHe: names[ni],
                        fullNameAr: inst.fullNameAr || '',
                        idNumber: inst.idNumber || '',
                        phone: inst.phone || '',
                        email: inst.email || '',
                        performerType: inst.performerType || '',
                        lecturerStatus: inst.lecturerStatus || '',
                        totalAcademicHours: 0,
                        period1Hours: 0,
                        period2Hours: 0,
                        isAccompaniment: inst.isAccompaniment || false
                    });
                }
                // Update original record with first name only
                DataStore.update(DataStore.KEYS.SOLUTION_INSTRUCTORS, inst.id, { fullNameHe: names[0] });
            }
        })();

        // ---- Build body HTML ----
        var bodyHtml = '';

        // Solution header card
        bodyHtml += '<div style="margin-bottom:16px;padding:14px 16px;background:linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);border-radius:var(--border-radius-lg);color:#fff;">' +
            '<div style="font-size:17px;font-weight:700;margin-bottom:4px;">' + escAttr(s.name) + '</div>' +
            '<div style="font-size:13px;opacity:.85;">' + (guide ? escAttr(guide.fullName) + ' &bull; ' : '') + 'סה"כ ' + totalHours + ' שעות אקדמיות</div>' +
            '</div>';

        // ========= STAGE 1: Budget Status =========
        bodyHtml += '<div id="cd_stage1" style="margin-bottom:20px;padding:14px 16px;border:1px solid var(--gray-200);border-radius:var(--border-radius);background:#fff;">' +
            '<div style="font-weight:700;font-size:15px;color:var(--gray-800);margin-bottom:14px;">💰 שלב 1: סטטוס תקצוב</div>' +
            '<div style="display:flex;gap:12px;flex-wrap:wrap;">' +

            // Card: Neutral (default)
            '<label class="cd-budget-card" id="cd_card_none" style="flex:1;min-width:130px;padding:14px;border:2px solid var(--gray-200);border-radius:var(--border-radius);cursor:pointer;text-align:center;transition:all .2s;">' +
                '<input type="radio" name="cd_budgetStatus" value="" style="display:none;"' + (!hasExisting ? ' checked' : '') + ' onchange="App._cdOnBudgetStatusChange()">' +
                '<div style="font-size:24px;margin-bottom:4px;">⏳</div>' +
                '<div style="font-size:14px;font-weight:600;color:var(--gray-600);">טרם נבחר</div>' +
                '<div style="font-size:11px;color:var(--gray-400);margin-top:2px;">יש לבחור אפשרות</div>' +
            '</label>' +

            // Card: Funded
            '<label class="cd-budget-card" id="cd_card_yes" style="flex:1;min-width:130px;padding:14px;border:2px solid var(--gray-200);border-radius:var(--border-radius);cursor:pointer;text-align:center;transition:all .2s;">' +
                '<input type="radio" name="cd_budgetStatus" value="yes" style="display:none;"' + (existingStatus === 'yes' ? ' checked' : '') + ' onchange="App._cdOnBudgetStatusChange()">' +
                '<div style="font-size:24px;margin-bottom:4px;">✅</div>' +
                '<div style="font-size:14px;font-weight:600;color:var(--gray-600);">מתוקצב</div>' +
                '<div style="font-size:11px;color:var(--gray-400);margin-top:2px;">עם תקציב מוגדר</div>' +
            '</label>' +

            // Card: Not Funded
            '<label class="cd-budget-card" id="cd_card_no" style="flex:1;min-width:130px;padding:14px;border:2px solid var(--gray-200);border-radius:var(--border-radius);cursor:pointer;text-align:center;transition:all .2s;">' +
                '<input type="radio" name="cd_budgetStatus" value="no" style="display:none;"' + (existingStatus === 'no' ? ' checked' : '') + ' onchange="App._cdOnBudgetStatusChange()">' +
                '<div style="font-size:24px;margin-bottom:4px;">🚫</div>' +
                '<div style="font-size:14px;font-weight:600;color:var(--gray-600);">לא מתוקצב</div>' +
                '<div style="font-size:11px;color:var(--gray-400);margin-top:2px;">ללא תקציב ייעודי</div>' +
            '</label>' +

            '</div>' +
            '</div>';

        // ========= STAGE 2: always visible, shows placeholder or content based on Stage 1 selection =========
        bodyHtml += '<div id="cd_stage2" style="margin-top:16px;padding:20px 16px;border:1px dashed var(--gray-300);border-radius:var(--border-radius);text-align:center;color:var(--gray-400);font-size:14px;">⏳ יש לבחור סטטוס תקצוב (שלב 1) על מנת להציג את חלוקת השעות וטבלת המנחים</div>';

        // ========= VALIDATION =========
        bodyHtml += '<div id="cd_validation" style="margin-top:16px;"></div>';

        showModal('📋 השלמת נתונים — ' + escAttr(s.name), bodyHtml,
            '<button class="btn btn-primary" onclick="App._saveCompleteData(\'' + id + '\')">💾 שמור נתוני השלמה</button>' +
            '<button class="btn btn-outline" onclick="App.closeModal()">ביטול</button>'
        );

        // Update card visual styles
        _cdUpdateCardStyles();

        // If existing data, auto-render Stage 2 immediately (no setTimeout needed — showModal is synchronous)
        if (hasExisting) {
            _cdOnBudgetStatusChange();
        }
    }

    function _cdUpdateCardStyles() {
        var cards = document.querySelectorAll('.cd-budget-card');
        cards.forEach(function(card) {
            var radio = card.querySelector('input[type="radio"]');
            if (!radio) return;
            if (radio.checked) {
                card.style.borderColor = 'var(--primary)';
                card.style.background = 'var(--primary-light, #e0f7f7)';
                card.style.boxShadow = '0 0 0 2px rgba(12,167,170,.15)';
            } else {
                card.style.borderColor = 'var(--gray-200)';
                card.style.background = '#fff';
                card.style.boxShadow = 'none';
            }
        });
    }

    function _cdOnBudgetStatusChange() {
        var val = '';
        var checked = document.querySelector('input[name="cd_budgetStatus"]:checked');
        if (checked) val = checked.value;

        _cdUpdateCardStyles();

        var stage2 = document.getElementById('cd_stage2');
        var validation = document.getElementById('cd_validation');
        if (!stage2) return;

        if (val === '' || val === undefined || val === null) {
            // Neutral — show placeholder in Stage 2 (always visible)
            stage2.innerHTML = '<div style="padding:20px 16px;border:1px dashed var(--gray-300);border-radius:var(--border-radius);text-align:center;color:var(--gray-400);font-size:14px;">⏳ יש לבחור סטטוס תקצוב (שלב 1) על מנת להציג את חלוקת השעות וטבלת המנחים</div>';
            if (validation) validation.innerHTML = '';
            return;
        }

        // Render Stage 2 content (Stage 2 container is always visible)
        if (val === 'yes') {
            _cdRenderFundedStage2();
        } else {
            _cdRenderNonFundedStage2();
        }
    }

function _cdRenderFundedStage2() {
    var stage2 = document.getElementById('cd_stage2');
    if (!stage2) return;
    var solId = window._cdSolutionId;
    var s = DataStore.getById(DataStore.KEYS.SOLUTIONS, solId);
    if (!s) return;
    var p1Label = window._cdP1Label || 'תקופה א׳';
    var p2Label = window._cdP2Label || 'תקופה ב׳';
    
    // Budget types - for dropdown
    var budgetTypes = (DataStore.getAll(DataStore.KEYS.LOOKUP_BUDGET_TYPES) || []).filter(function(bt) { 
        return bt.isActive !== false && bt.value !== 'לא מתוקצב'; 
    });
    var budgetTypeOptions = budgetTypes.map(function(bt) {
        var sel = (s.budgetTypeValue === bt.value) ? ' selected' : '';
        return '<option value="' + escAttr(bt.value) + '"' + sel + '>' + escAttr(bt.label) + '</option>';
    }).join('');
    
    // Get existing instructors for this solution
    var allInstructors = (DataStore.getAll(DataStore.KEYS.SOLUTION_INSTRUCTORS) || []).filter(function(i) { 
        return i.solutionId === solId; 
    });
    
    // Task 2: Auto-add 'כוח פנים' if budgeted < academic and no internal row exists
    var hasInternal = allInstructors.some(function(i) { 
        return _getMentorType(i) === 'כוח פנים'; 
    });
    var academicH = s.academicHours || 0;
    var budgetedH = s.budgetedHours || 0;
    
    if (!hasInternal && academicH > 0 && budgetedH > 0 && budgetedH < academicH) {
        var gapH = academicH - budgetedH;
        var autoInternal = DataStore.create(DataStore.KEYS.SOLUTION_INSTRUCTORS, {
            solutionId: solId,
            mentorId: '',
            mentorRepoId: '',
            fullNameHe: 'כוח פנים',
            fullNameAr: '',
            idNumber: '', phone: '', email: '',
            performerType: 'כוח פנים',
            lecturerStatus: '',
            totalAcademicHours: gapH,
            period1Hours: 0,
            period2Hours: 0,
            isAccompaniment: false
        });
        if (autoInternal) allInstructors.push(autoInternal);
    }
    
    // Build mentor rows
    var mentorRowsHtml = allInstructors.map(function(m) {
        return _cdBuildMentorRow(m);
    }).join('');
    
    // Build HTML
    var html = '';
    
    // Step 2 header
    html += '<div style="font-weight:700;font-size:15px;color:var(--gray-800);margin-bottom:12px;">📊 שלב 2: חלוקת שעות אקדמיות <span style="font-weight:400;font-size:12px;color:var(--gray-400);">(מתוקצב)</span></div>';
    
    // Part 2 — Academic hours distribution (EDITABLE fields)
    var _dispBTValue = s.budgetTypeValue || '';
    var _dispFundedH = s.budgetedHours != null ? s.budgetedHours : 0;
    var _dispP1 = s.period1Hours != null && s.period1Hours !== '' ? parseFloat(s.period1Hours) || 0 : 0;
    var _dispP2 = s.period2Hours != null && s.period2Hours !== '' ? parseFloat(s.period2Hours) || 0 : 0;
    var _dispAcademicH = s.academicHours != null ? s.academicHours : 0;
    
    html += '<div style="margin-bottom:14px;display:flex;flex-direction:column;gap:10px;">' +
        // Object 1: Budget type + funded hours (EDITABLE)
        '<div style="padding:12px 14px;background:var(--gray-50);border:1px solid var(--gray-200);border-radius:var(--border-radius);display:flex;gap:20px;align-items:center;flex-wrap:wrap;">' +
            '<div class="form-group" style="margin-bottom:0;min-width:180px;">' +
                '<label style="font-size:13px;font-weight:600;">סוג תקצוב</label>' +
                '<select id="cd_budgetTypeSelect" class="form-select" onchange="App._cdRecalc()">' +
                    '<option value="">בחר סוג תקצוב</option>' +
                    budgetTypeOptions +
                '</select>' +
            '</div>' +
            '<div class="form-group" style="margin-bottom:0;min-width:160px;">' +
                '<label style="font-size:13px;font-weight:600;">סה"כ שעות מתוקצבות</label>' +
                '<input type="number" id="cd_budgetedHours" class="form-input" value="' + _dispFundedH + '" min="0" step="1" style="text-align:center;font-weight:700;" oninput="App._cdRecalc()">' +
            '</div>' +
        '</div>' +
        // Object 2: Period distribution (EDITABLE) — with date ranges and total relationship
        (function() {
            var _p1Range = window._cdP1Range || '';
            var _p2Range = window._cdP2Range || '';
            var _p1Num = _dispP1;
            var _p2Num = _dispP2;
            var _pSum = _p1Num + _p2Num;
            var _solTotal = _dispAcademicH;
            var _matchStyle = (_solTotal > 0 && Math.abs(_pSum - _solTotal) < 0.01) ? 'color:#166534;' : (_pSum > _solTotal ? 'color:#dc2626;' : 'color:var(--gray-800);');
            
            return '<div style="padding:12px 14px;background:var(--gray-50);border:1px solid var(--gray-200);border-radius:var(--border-radius);display:flex;gap:12px;align-items:stretch;flex-wrap:wrap;">' +
                '<div class="form-group" style="margin-bottom:0;flex:1;min-width:130px;">' +
                    '<label style="font-size:13px;font-weight:600;">' + escAttr(p2Label) + '</label>' +
                    (_p2Range ? '<div style="font-size:10px;color:var(--gray-400);margin-bottom:2px;">' + escAttr(_p2Range) + '</div>' : '') +
                    '<input type="number" id="cd_period2Hours" class="form-input" value="' + _dispP2 + '" min="0" step="0.5" style="text-align:center;font-weight:700;" oninput="App._cdRecalc()">' +
                '</div>' +
                '<div class="form-group" style="margin-bottom:0;flex:1;min-width:130px;">' +
                    '<label style="font-size:13px;font-weight:600;">' + escAttr(p1Label) + '</label>' +
                    (_p1Range ? '<div style="font-size:10px;color:var(--gray-400);margin-bottom:2px;">' + escAttr(_p1Range) + '</div>' : '') +
                    '<input type="number" id="cd_period1Hours" class="form-input" value="' + _dispP1 + '" min="0" step="0.5" style="text-align:center;font-weight:700;" oninput="App._cdRecalc()">' +
                '</div>' +
                '<div class="form-group" style="margin-bottom:0;min-width:110px;">' +
                    '<label style="font-size:13px;font-weight:600;">סה״כ תקופות</label>' +
                    '<div style="font-size:10px;color:var(--gray-400);margin-bottom:2px;">' + _p1Num + ' + ' + _p2Num + '</div>' +
                    '<input type="number" id="cd_totalPeriods" class="form-input" value="' + _pSum + '" readonly style="text-align:center;font-weight:700;background:var(--gray-100);cursor:not-allowed;' + _matchStyle + '">' +
                '</div>' +
                '<div class="form-group" style="margin-bottom:0;min-width:110px;">' +
                    '<label style="font-size:13px;font-weight:600;">שעות אקדמיות</label>' +
                    '<div style="font-size:10px;color:var(--gray-400);margin-bottom:2px;">מוכרות לגמול</div>' +
                    '<input type="number" id="cd_academicHours" class="form-input" value="' + _dispAcademicH + '" min="0" step="0.5" style="text-align:center;font-weight:700;" oninput="App._cdRecalc()">' +
                '</div>' +
            '</div>' +
            (_solTotal > 0 && _pSum > 0 && Math.abs(_pSum - _solTotal) > 0.01 ?
                '<div style="margin-top:6px;padding:6px 10px;border-radius:6px;font-size:12px;background:#fef9c3;border:1px solid #fde047;color:#854d0e;">⚠️ סכום התקופות (' + _pSum + ') שונה מסה״כ השעות האקדמיות (' + _solTotal + ')</div>' : '') +
            (_solTotal > 0 && _pSum > 0 && Math.abs(_pSum - _solTotal) < 0.01 ?
                '<div style="margin-top:6px;padding:6px 10px;border-radius:6px;font-size:12px;background:#f0fdf4;border:1px solid #86efac;color:#166534;">✅ סכום התקופות (' + _pSum + ') תואם לסה״כ השעות האקדמיות (' + _solTotal + ')</div>' : '');
        })() +
        '</div>';
    
    // Mentor table
    html += '<div class="table-wrapper" style="box-shadow:0 1px 3px rgba(0,0,0,.08);border-radius:var(--border-radius);overflow-x:auto;margin-bottom:10px;">' +
        '<table class="data-table" style="min-width:700px;margin:0;">' +
        '<thead><tr>' +
        '<th style="min-width:120px;">סוג המנחה</th>' +
        '<th style="min-width:160px;">שם המנחה</th>' +
        '<th style="min-width:110px;text-align:center;">' + escAttr(p2Label) + '</th>' +
        '<th style="min-width:110px;text-align:center;">' + escAttr(p1Label) + '</th>' +
        '<th style="min-width:80px;text-align:center;">סה"כ</th>' +
        '<th style="width:50px;"></th>' +
        '</tr></thead>' +
        '<tbody id="cd_mentorTbody">' + mentorRowsHtml + '</tbody>' +
        '<tfoot><tr style="background:var(--primary);color:#fff;font-weight:700;">' +
        '<td colspan="2" style="text-align:right;padding:10px 14px;">📊 סיכום אקדמי</td>' +
        '<td style="text-align:center;padding:10px;" id="cd_sumP2">0</td>' +
        '<td style="text-align:center;padding:10px;" id="cd_sumP1">0</td>' +
        '<td style="text-align:center;padding:10px;" id="cd_sumTotal">0</td>' +
        '<td></td>' +
        '</tr></tfoot>' +
        '</table></div>';
    
    // Add mentor area
    html += '<div id="cd_addMentorArea" style="margin-top:10px;">' +
        '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">' +
        '<div style="position:relative;flex:1;min-width:200px;max-width:350px;">' +
            '<input type="text" id="cd_newMentorSearch" class="form-input" placeholder="🔍 הקלד שם מלא או ת.ז. לחיפוש..." oninput="App._filterMentorSearch(\'cd_newMentor\',true)" onfocus="App._filterMentorSearch(\'cd_newMentor\',true)" onblur="App._closeMentorSearch(\'cd_newMentor\')" autocomplete="off">' +
            '<div id="cd_newMentorSearchResults" style="position:absolute;top:100%;left:0;right:0;z-index:100;background:#fff;border:1px solid var(--gray-200);border-radius:0 0 var(--border-radius) var(--border-radius);max-height:200px;overflow-y:auto;display:none;box-shadow:0 4px 6px rgba(0,0,0,.1);"></div>' +
        '</div>' +
        '<button class="btn btn-primary btn-sm" onclick="App._cdAddMentorInline()">➕ הוספת מנחה</button>' +
        '<button class="btn btn-sm" style="background:#fffbeb;border:1px solid #fde047;color:#854d0e;" onclick="App._cdAddInternalForceRow()" title="הוספת שורת כוח פנים חדשה">🏠 הוספת כוח פנים</button>' +
        '</div>' +
        '<div id="cd_noMentorsMsg" style="margin-top:8px;text-align:center;padding:8px;color:var(--gray-400);font-size:12px;display:none;">כל המנחים מהמאגר משויכים לפתרון זה</div>' +
        '</div>';
    
    stage2.innerHTML = html;
    setTimeout(function() { _cdRecalc(); }, 50);
}

    function _cdRenderNonFundedStage2() {
        var stage2 = document.getElementById('cd_stage2');
        if (!stage2) return;

        var solId = window._cdSolutionId;
        var s = DataStore.getById(DataStore.KEYS.SOLUTIONS, solId);
        if (!s) return;

        var p1Label = window._cdP1Label || 'תקופה א׳';
        var p2Label = window._cdP2Label || 'תקופה ב׳';
        var totalHours = s.academicHours || 0;

        // Check if an internal force instructor already exists for this solution
        var allInstructors = (DataStore.getAll(DataStore.KEYS.SOLUTION_INSTRUCTORS) || []).filter(function(i) { return i.solutionId === solId; });
        var internalInst = null;
        for (var ii = 0; ii < allInstructors.length; ii++) {
            if (_getMentorType(allInstructors[ii]) === 'כוח פנים') {
                internalInst = allInstructors[ii];
                break;
            }
        }

        // If no internal force exists, auto-create one
        if (!internalInst) {
            internalInst = DataStore.create(DataStore.KEYS.SOLUTION_INSTRUCTORS, {
                solutionId: solId,
                mentorId: '',
                mentorRepoId: '',
                fullName: 'כוח פנים',
                idNumber: '',
                phone: '',
                email: '',
                performerType: 'כוח פנים',
                lecturerStatus: '',
                totalAcademicHours: 0,
                period1Hours: 0,
                period2Hours: 0,
                isAccompaniment: false
            });
        }

        var p1 = internalInst.period1Hours || 0;
        var p2 = internalInst.period2Hours || 0;

        // Build HTML
        var html = '';

        // Step 2 header
        html += '<div style="font-weight:700;font-size:15px;color:var(--gray-800);margin-bottom:12px;">📊 שלב 2: חלוקת שעות אקדמיות <span style="font-weight:400;font-size:12px;color:var(--gray-400);">(לא מתוקצב)</span></div>';

        // Info banner
        html += '<div style="margin-bottom:14px;padding:10px 14px;background:#fffbeb;border:1px solid #fde047;border-radius:var(--border-radius);font-size:13px;color:#854d0e;">' +
            'ℹ️ במצב לא מתוקצב, המנחה מוגדר אוטומטית כ-<strong>כוח פנים</strong>. יש לחלק את סך השעות האקדמיות (' + totalHours + ') בין שתי התקופות.' +
            '</div>';

        // Simple period distribution card
        html += '<div style="padding:14px 16px;border:1px solid var(--gray-200);border-radius:var(--border-radius);background:#fff;">' +
            '<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid var(--gray-100);">' +
                '<span style="width:36px;height:36px;border-radius:50%;background:var(--accent,#f59e0b);color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">🏠</span>' +
                '<div>' +
                    '<div style="font-weight:700;color:var(--accent,#f59e0b);">כוח פנים</div>' +
                    '<div style="font-size:11px;color:var(--gray-400);">מנחה אוטומטי — לא מתוקצב</div>' +
                '</div>' +
            '</div>' +
            '<div style="display:flex;gap:14px;align-items:flex-end;flex-wrap:wrap;">' +
                '<div class="form-group" style="margin-bottom:0;flex:1;min-width:140px;">' +
                    '<label style="font-size:13px;font-weight:600;">' + escAttr(p2Label) + '</label>' +
                    '<input type="number" id="cd_nf_p2" class="form-input cd-nf-period" data-inst-id="' + internalInst.id + '" value="' + p2 + '" min="0" step="0.5" style="text-align:center;" oninput="App._cdRecalc()">' +
                '</div>' +
                '<div class="form-group" style="margin-bottom:0;flex:1;min-width:140px;">' +
                    '<label style="font-size:13px;font-weight:600;">' + escAttr(p1Label) + '</label>' +
                    '<input type="number" id="cd_nf_p1" class="form-input cd-nf-period" data-inst-id="' + internalInst.id + '" value="' + p1 + '" min="0" step="0.5" style="text-align:center;" oninput="App._cdRecalc()">' +
                '</div>' +
                '<div class="form-group" style="margin-bottom:0;min-width:100px;">' +
                    '<label style="font-size:13px;font-weight:600;">סה"כ</label>' +
                    '<div id="cd_nf_total" style="padding:8px;background:var(--gray-50);border:1px solid var(--gray-200);border-radius:var(--border-radius);text-align:center;font-weight:700;font-size:15px;">' + (p1 + p2) + '</div>' +
                '</div>' +
            '</div>' +
            '<input type="hidden" id="cd_nf_instId" value="' + internalInst.id + '">' +
            '</div>';

        // Task 4: Mandatory summary bar
        html += '<div style="background:var(--primary);color:#fff;border-radius:var(--border-radius);padding:10px 16px;display:flex;justify-content:space-around;align-items:center;font-weight:700;font-size:14px;margin-top:10px;">' +
            '<div><div style="font-size:11px;opacity:.7;">' + escAttr(p2Label) + '</div><div id="cd_nf_sumP2">' + p2 + '</div></div>' +
            '<div><div style="font-size:11px;opacity:.7;">' + escAttr(p1Label) + '</div><div id="cd_nf_sumP1">' + p1 + '</div></div>' +
            '<div><div style="font-size:11px;opacity:.7;">סה"כ</div><div id="cd_nf_sumTotal">' + (p1 + p2) + '</div></div>' +
            '<div><div style="font-size:11px;opacity:.7;">שעות אקדמיות</div><div>' + totalHours + '</div></div>' +
            '</div>';

        stage2.innerHTML = html;
        setTimeout(function() { _cdRecalc(); }, 50);
    }

    function _cdBuildMentorRow(m) {
        var p1Label = window._cdP1Label || 'תקופה א׳';
        var p2Label = window._cdP2Label || 'תקופה ב׳';
        var type = _getMentorType(m);
        var isSpecialRow = (type === 'כוח פנים' || type === 'שעות ליווי');

        // For special rows: fixed total from totalAcademicHours
        var fixedTotal = isSpecialRow ? (m.totalAcademicHours || 0) : 0;

        // Show empty (not 0) when no hours were explicitly entered
        var mP1, mP2, mTotal;
        if (isSpecialRow) {
            // Special rows: display actual imported period values (P1/P2) just like regular rows
            var spP1Raw = m.period1Hours;
            var spP2Raw = m.period2Hours;
            mP1 = (spP1Raw !== null && spP1Raw !== undefined && spP1Raw !== '' && spP1Raw !== 0) ? spP1Raw : '';
            mP2 = (spP2Raw !== null && spP2Raw !== undefined && spP2Raw !== '' && spP2Raw !== 0) ? spP2Raw : '';
            mTotal = fixedTotal > 0 ? fixedTotal : '';
        } else {
            var mP1Raw = m.period1Hours;
            var mP2Raw = m.period2Hours;
            mP1 = (mP1Raw !== null && mP1Raw !== undefined && mP1Raw !== '' && mP1Raw !== 0) ? mP1Raw : '';
            mP2 = (mP2Raw !== null && mP2Raw !== undefined && mP2Raw !== '' && mP2Raw !== 0) ? mP2Raw : '';
            var mP1Num = parseFloat(mP1) || 0;
            var mP2Num = parseFloat(mP2) || 0;
            mTotal = mP1Num + mP2Num;
        }

        // Type column: special rows show static "רגיל", regular rows get dropdown
        var typeCellHtml;
        if (isSpecialRow) {
            // Hidden select for recalc/save compatibility
            typeCellHtml = '<select class="cd-mentor-type" data-inst-id="' + m.id + '" data-orig-name="' + escAttr(m.fullNameHe || m.fullName || '') + '" data-orig-mentor-id="' + (m.mentorId || '') + '" onchange="App._cdOnTypeChange(this)" style="display:none;"><option value="' + type + '" selected>' + type + '</option></select>' +
                '<span style="font-size:13px;color:var(--gray-600);">' + type + '</span>';
        } else {
            var typeOpts = '<option value="רגיל"' + (type === 'רגיל' ? ' selected' : '') + '>רגיל</option>' +
                '<option value="כוח פנים"' + (type === 'כוח פנים' ? ' selected' : '') + '>כוח פנים</option>' +
                '<option value="שעות ליווי"' + (type === 'שעות ליווי' ? ' selected' : '') + '>שעות ליווי</option>';
            typeCellHtml = '<select class="form-select cd-mentor-type" data-inst-id="' + m.id + '" data-orig-name="' + escAttr(m.fullNameHe || m.fullName || '') + '" data-orig-mentor-id="' + (m.mentorId || '') + '" onchange="App._cdOnTypeChange(this)" style="min-width:110px;font-size:13px;">' + typeOpts + '</select>';
        }

        // Name display - use getMentorName helper for consistent display
        var nameHtml = '';
        var displayName = getMentorName(m) || m.fullNameHe || m.fullName || '';
        if (type === 'כוח פנים') {
            nameHtml = '<div style="display:flex;align-items:center;gap:8px;">' +
                '<span style="width:28px;height:28px;border-radius:50%;background:var(--accent,#f59e0b);color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;">🏠</span>' +
                '<span style="font-weight:700;color:var(--accent,#f59e0b);">כוח פנים</span></div>';
        } else if (type === 'שעות ליווי') {
            // Editable name field for שעות ליווי
            nameHtml = '<div style="display:flex;align-items:center;gap:8px;">' +
                '<span style="width:28px;height:28px;border-radius:50%;background:#dbeafe;color:#1e40af;display:inline-flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;">🕐</span>' +
                '<input type="text" class="form-input cd-acc-name" data-inst-id="' + m.id + '" value="' + escAttr(m.fullNameHe || m.fullName || '') + '" placeholder="שם מלווה..." style="min-width:120px;font-size:13px;">' +
                '</div>';
        } else {
            nameHtml = '<div style="display:flex;align-items:center;gap:8px;">' +
                '<span style="font-weight:600;">' + escAttr(displayName) + '</span>' +
                (m.idNumber ? '<span style="font-size:11px;color:var(--gray-400);direction:ltr;">' + escAttr(m.idNumber) + '</span>' : '') +
                '</div>';
        }

        var rowBg = type === 'כוח פנים' ? 'background:#fffbeb;' : (type === 'שעות ליווי' ? 'background:#eff6ff;' : '');

        // For special rows: P1/P2 columns show editable inputs, total is read-only fixed value
        var p2CellHtml, p1CellHtml, totalCellHtml;
        if (isSpecialRow) {
            p2CellHtml = '<td><input type="number" class="form-input cd-acad-p2" data-inst-id="' + m.id + '" value="' + mP2 + '" min="0" step="0.5" style="width:90px;text-align:center;" oninput="App._cdRecalc()"></td>';
            p1CellHtml = '<td><input type="number" class="form-input cd-acad-p1" data-inst-id="' + m.id + '" value="' + mP1 + '" min="0" step="0.5" style="width:90px;text-align:center;" oninput="App._cdRecalc()"></td>';
            totalCellHtml = '<td style="text-align:center;font-weight:700;" class="cd-acad-total">' + mTotal + '</td>';
        } else {
            p2CellHtml = '<td><input type="number" class="form-input cd-acad-p2" data-inst-id="' + m.id + '" value="' + mP2 + '" min="0" step="0.5" style="width:90px;text-align:center;" oninput="App._cdRecalc()"></td>';
            p1CellHtml = '<td><input type="number" class="form-input cd-acad-p1" data-inst-id="' + m.id + '" value="' + mP1 + '" min="0" step="0.5" style="width:90px;text-align:center;" oninput="App._cdRecalc()"></td>';
            totalCellHtml = '<td style="text-align:center;font-weight:700;" class="cd-acad-total">' + (mTotal > 0 ? mTotal : '') + '</td>';
        }

        return '<tr data-inst-id="' + m.id + '" style="' + rowBg + '">' +
            '<td>' + typeCellHtml + '</td>' +
            '<td><div class="cd-mentor-name-cell">' + nameHtml + '</div></td>' +
            p2CellHtml +
            p1CellHtml +
            totalCellHtml +
            '<td><button class="btn btn-danger btn-sm" onclick="App._cdRemoveMentorRow(this)" title="הסר מנחה" style="padding:4px 8px;">✕</button></td>' +
            '</tr>';
    }

    function _cdOnTypeChange(selectEl) {
        var newType = selectEl.value;
        var row = selectEl.closest('tr');
        if (!row) return;

        var origName = selectEl.getAttribute('data-orig-name') || '';
        var nameCell = row.querySelector('.cd-mentor-name-cell');

        if (newType === 'כוח פנים') {
            row.style.background = '#fffbeb';
            if (nameCell) {
                nameCell.innerHTML = '<div style="display:flex;align-items:center;gap:8px;">' +
                    '<span style="width:28px;height:28px;border-radius:50%;background:var(--accent,#f59e0b);color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;">🏠</span>' +
                    '<span style="font-weight:700;color:var(--accent,#f59e0b);">כוח פנים</span></div>';
            }
        } else if (newType === 'שעות ליווי') {
            row.style.background = '#eff6ff';
            if (nameCell) {
                nameCell.innerHTML = '<div style="display:flex;align-items:center;gap:8px;">' +
                    '<span style="font-weight:600;">' + escAttr(origName) + '</span></div>';
            }
        } else {
            row.style.background = '';
            if (nameCell) {
                nameCell.innerHTML = '<div style="display:flex;align-items:center;gap:8px;">' +
                    '<span style="font-weight:600;">' + escAttr(origName) + '</span></div>';
            }
        }

        _cdRecalc();
    }

function _cdRecalc() {
    var validation = document.getElementById('cd_validation');
    if (!validation) return;
    var sol = DataStore.getById(DataStore.KEYS.SOLUTIONS, window._cdSolutionId);
    var solTotal = sol ? (sol.academicHours || 0) : 0;
    var p1Label = window._cdP1Label || 'תקופה א׳';
    var p2Label = window._cdP2Label || 'תקופה ב׳';
    var budgetStatus = '';
    var checked = document.querySelector('input[name="cd_budgetStatus"]:checked');
    if (checked) budgetStatus = checked.value;
    
    // Non-funded mode recalc
    if (budgetStatus === 'no') {
        var nfP1Input = document.getElementById('cd_nf_p1');
        var nfP2Input = document.getElementById('cd_nf_p2');
        var nfTotalDiv = document.getElementById('cd_nf_total');
        var nfP1 = nfP1Input ? (parseFloat(nfP1Input.value) || 0) : 0;
        var nfP2 = nfP2Input ? (parseFloat(nfP2Input.value) || 0) : 0;
        var nfSum = nfP1 + nfP2;
        if (nfTotalDiv) nfTotalDiv.textContent = nfSum;
        
        // Task 4: Update fixed summary bar
        var nfSumP2El = document.getElementById('cd_nf_sumP2');
        var nfSumP1El = document.getElementById('cd_nf_sumP1');
        var nfSumTotEl = document.getElementById('cd_nf_sumTotal');
        if (nfSumP2El) nfSumP2El.textContent = nfP2;
        if (nfSumP1El) nfSumP1El.textContent = nfP1;
        if (nfSumTotEl) nfSumTotEl.textContent = nfSum;
        
        var html = '';
        // Period summary
        html += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;">' +
            '<div style="flex:1;min-width:120px;background:var(--gray-50);border:1px solid var(--gray-200);border-radius:8px;padding:8px 12px;text-align:center;">' +
            '<div style="font-size:11px;color:var(--gray-400);">' + escAttr(p2Label) + '</div>' +
            '<div style="font-size:18px;font-weight:700;color:var(--gray-800);">' + nfP2 + '</div></div>' +
            '<div style="flex:1;min-width:120px;background:var(--gray-50);border:1px solid var(--gray-200);border-radius:8px;padding:8px 12px;text-align:center;">' +
            '<div style="font-size:11px;color:var(--gray-400);">' + escAttr(p1Label) + '</div>' +
            '<div style="font-size:18px;font-weight:700;color:var(--gray-800);">' + nfP1 + '</div></div>' +
            '</div>';
        
        // Validation: sum must equal academic hours
        var diff = Math.abs(nfSum - solTotal);
        if (diff < 0.01) {
            html += '<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:10px 14px;color:#166534;font-size:13px;font-weight:500;">✅ סה"כ שעות כוח פנים (' + nfSum + ') תואם לסה"כ השעות האקדמיות (' + solTotal + ')</div>';
        } else {
            var isOver = nfSum > solTotal;
            html += '<div style="background:' + (isOver ? '#fef2f2' : '#fef9c3') + ';border:1px solid ' + (isOver ? '#fca5a5' : '#fde047') + ';border-radius:8px;padding:10px 14px;color:' + (isOver ? '#991b1b' : '#854d0e') + ';font-size:13px;font-weight:500;">' +
                (isOver ? '🔴 עודף' : '⚠️ חסר') + ' ' + Math.abs(diff) + ' שע׳ — סה"כ כוח פנים: ' + nfSum + ' | נדרש: ' + solTotal + '</div>';
        }
        validation.innerHTML = html;
        return;
    }
    
    // Funded mode recalc
    var regularSum = 0, internalSum = 0, accSum = 0;
    var regP1 = 0, regP2 = 0, intP1 = 0, intP2 = 0, accP1 = 0, accP2 = 0;
    
    // Read editable solution-level fields
    var budgetTypeSelect = document.getElementById('cd_budgetTypeSelect');
    var budgetTypeValue = budgetTypeSelect ? budgetTypeSelect.value : '';
    var budgetTypeLabel = budgetTypeValue ? (getLookupLabel(DataStore.KEYS.LOOKUP_BUDGET_TYPES, budgetTypeValue) || budgetTypeValue) : '';
    var fundedHours = parseInt(document.getElementById('cd_budgetedHours')?.value) || 0;
    var period1Hours = parseFloat(document.getElementById('cd_period1Hours')?.value) || 0;
    var period2Hours = parseFloat(document.getElementById('cd_period2Hours')?.value) || 0;
    var academicHours = parseFloat(document.getElementById('cd_academicHours')?.value) || 0;
    
    // Update total periods (auto-calculated)
    var totalPeriods = period1Hours + period2Hours;
    var totalPeriodsInput = document.getElementById('cd_totalPeriods');
    if (totalPeriodsInput) totalPeriodsInput.value = totalPeriods;
    
    var rows = document.querySelectorAll('.cd-mentor-type');
    rows.forEach(function(sel) {
        var type = sel.value;
        var row = sel.closest('tr');
        if (!row) return;
        var isSpecialRecalc = (type === 'כוח פנים' || type === 'שעות ליווי');
        
        var p2Raw = row.querySelector('.cd-acad-p2')?.value;
        var p1Raw = row.querySelector('.cd-acad-p1')?.value;
        var p2Val = (p2Raw === '' || p2Raw === null || p2Raw === undefined) ? 0 : parseFloat(p2Raw) || 0;
        var p1Val = (p1Raw === '' || p1Raw === null || p1Raw === undefined) ? 0 : parseFloat(p1Raw) || 0;
        var total = p1Val + p2Val;
        
        if (isSpecialRecalc) {
            var instId = sel.getAttribute('data-inst-id');
            var _inst = instId ? DataStore.getById(DataStore.KEYS.SOLUTION_INSTRUCTORS, instId) : null;
            var fixedTotal = _inst ? (_inst.totalAcademicHours || 0) : 0;
            var specialP1P2 = p1Val + p2Val;
            
            var totalEl = row.querySelector('.cd-acad-total');
            if (totalEl) {
                if (specialP1P2 > 0 && Math.abs(specialP1P2 - fixedTotal) > 0.01) {
                    totalEl.textContent = specialP1P2;
                    totalEl.style.color = '#dc2626';
                } else {
                    totalEl.textContent = fixedTotal;
                    totalEl.style.color = '';
                }
            }
            
            if (type === 'כוח פנים') { 
                internalSum += fixedTotal; 
                intP1 += p1Val; 
                intP2 += p2Val; 
            } else { 
                accSum += fixedTotal; 
                accP1 += p1Val; 
                accP2 += p2Val; 
            }
        } else {
            row.querySelector('.cd-acad-total').textContent = total;
            if (type === 'רגיל') {
                regularSum += total;
                regP1 += p1Val;
                regP2 += p2Val;
            }
        }
    });
    
    var html = '';
    
    // Period summary (5.4) — Academic periods only (regular + internal); accompaniment is separate extra budget
    var acadP1 = regP1 + intP1;
    var acadP2 = regP2 + intP2;
    
    // Task 4: Update fixed summary row in table footer
    var sumP1El = document.getElementById('cd_sumP1');
    var sumP2El = document.getElementById('cd_sumP2');
    var sumTotEl = document.getElementById('cd_sumTotal');
    if (sumP1El) sumP1El.textContent = acadP1;
    if (sumP2El) sumP2El.textContent = acadP2;
    if (sumTotEl) sumTotEl.textContent = acadP1 + acadP2;
    
    html += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;">' +
        '<div style="flex:1;min-width:120px;background:var(--gray-50);border:1px solid var(--gray-200);border-radius:8px;padding:8px 12px;text-align:center;">' +
        '<div style="font-size:11px;color:var(--gray-400);">' + escAttr(p2Label) + ' (אקדמי)</div>' +
        '<div style="font-size:18px;font-weight:700;color:var(--gray-800);">' + acadP2 + '</div></div>' +
        '<div style="flex:1;min-width:120px;background:var(--gray-50);border:1px solid var(--gray-200);border-radius:8px;padding:8px 12px;text-align:center;">' +
        '<div style="font-size:11px;color:var(--gray-400);">' + escAttr(p1Label) + ' (אקדמי)</div>' +
        '<div style="font-size:18px;font-weight:700;color:var(--gray-800);">' + acadP1 + '</div></div>' +
        (accP1 + accP2 > 0 ?
        '<div style="flex:1;min-width:120px;background:#eff6ff;border:1px solid #93c5fd;border-radius:8px;padding:8px 12px;text-align:center;">' +
        '<div style="font-size:11px;color:#1e40af;">🕐 ליווי (תקציב נוסף)</div>' +
        '<div style="font-size:18px;font-weight:700;color:#1e40af;">' + (accP1 + accP2) + '</div></div>' : '') +
        '</div>';
    
    // Category 1: Regular hours
    html += '<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:10px 14px;color:#166534;font-size:13px;margin-bottom:6px;">✅ סה"כ שעות רגילות: <strong>' + regularSum + '</strong> שע׳' +
        (budgetTypeLabel ? ' — <span style="opacity:.8;">(' + escAttr(budgetTypeLabel) + ')</span>' : '') +
        '</div>';
    
    // Category 2: Accompaniment hours (5.3)
    if (accSum > 0) {
        html += '<div style="background:#eff6ff;border:1px solid #93c5fd;border-radius:8px;padding:10px 14px;color:#1e40af;font-size:13px;margin-bottom:6px;">🕐 סה"כ שעות ליווי: <strong>' + accSum + '</strong> שע׳ — תקציב נוסף, אינן חלק מהשעות האקדמיות</div>';
    }
    
    // Category 3: Internal force hours
    if (internalSum > 0) {
        html += '<div style="background:#fffbeb;border:1px solid #fde047;border-radius:8px;padding:10px 14px;color:#854d0e;font-size:13px;margin-bottom:6px;">🏠 סה"כ שעות כוח פנים: <strong>' + internalSum + '</strong> שע׳ — לא מתוקצב</div>';
    }
    
    // Validate special row period splits
    var specialRows = document.querySelectorAll('.cd-mentor-type');
    specialRows.forEach(function(sel) {
        var type = sel.value;
        if (type !== 'כוח פנים' && type !== 'שעות ליווי') return;
        var row = sel.closest('tr');
        if (!row) return;
        
        var sp1Raw = row.querySelector('.cd-acad-p1')?.value;
        var sp2Raw = row.querySelector('.cd-acad-p2')?.value;
        var sp1 = (sp1Raw === '' || sp1Raw === null || sp1Raw === undefined) ? 0 : parseFloat(sp1Raw) || 0;
        var sp2 = (sp2Raw === '' || sp2Raw === null || sp2Raw === undefined) ? 0 : parseFloat(sp2Raw) || 0;
        var spSum = sp1 + sp2;
        
        if (spSum > 0) {
            var instId = sel.getAttribute('data-inst-id');
            var _inst = instId ? DataStore.getById(DataStore.KEYS.SOLUTION_INSTRUCTORS, instId) : null;
            var fixedT = _inst ? (_inst.totalAcademicHours || 0) : 0;
            
            if (fixedT > 0 && Math.abs(spSum - fixedT) > 0.01) {
                var label = type === 'כוח פנים' ? '🏠 כוח פנים' : '🕐 שעות ליווי';
                html += '<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:10px 14px;color:#991b1b;font-size:13px;margin-bottom:6px;">⚠️ ' + label + ': סכום תקופות (' + spSum + ') אינו שווה לסה"כ הקבוע (' + fixedT + '). יש לתקן את החלוקה.</div>';
            }
        }
    });
    
    // Budgeted hours display
    html += '<div style="background:var(--gray-50);border:1px solid var(--gray-200);border-radius:8px;padding:10px 14px;font-size:13px;color:var(--gray-800);margin-bottom:6px;">💰 סה"כ שעות מתוקצבות (שדה משתמש): <strong>' + fundedHours + '</strong> שע׳</div>';
    
    // Info: Regular vs Funded
    if (fundedHours > 0 && regularSum > 0) {
        var regDiff = regularSum - fundedHours;
        if (Math.abs(regDiff) < 0.01) {
            html += '<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:10px 14px;color:#166534;font-size:13px;margin-bottom:6px;">✅ סה"כ שעות רגילות (' + regularSum + ') שווה לסה"כ המתוקצב (' + fundedHours + ') — תקצוב מלא</div>';
        } else {
            html += '<div style="background:#f0f9ff;border:1px solid #93c5fd;border-radius:8px;padding:10px 14px;color:#1e40af;font-size:13px;margin-bottom:6px;">ℹ️ תקצוב ' + (regDiff > 0 ? 'חלקי' : 'חלקי') + ': רגילות ' + regularSum + ' | מתוקצב ' + fundedHours + ' — תקין, התקצוב יכול להיות מלא או חלקי</div>';
        }
    }
    
    // Check if ALL guides have hours entered in BOTH periods
    var allRows = document.querySelectorAll('.cd-mentor-type');
    var allHaveHoursP1 = true, allHaveHoursP2 = true, anyHoursEntered = false;
    allRows.forEach(function(sel) {
        var row = sel.closest('tr');
        if (!row) return;
        
        var p1Raw = row.querySelector('.cd-acad-p1')?.value;
        var p2Raw = row.querySelector('.cd-acad-p2')?.value;
        var p1Val = (p1Raw === '' || p1Raw === null || p1Raw === undefined) ? 0 : parseFloat(p1Raw) || 0;
        var p2Val = (p2Raw === '' || p2Raw === null || p2Raw === undefined) ? 0 : parseFloat(p2Raw) || 0;
        
        if (p1Val === 0) allHaveHoursP1 = false;
        if (p2Val === 0) allHaveHoursP2 = false;
        if (p1Val > 0 || p2Val > 0) anyHoursEntered = true;
    });
    
    var allHaveHours = allHaveHoursP1 && allHaveHoursP2 && anyHoursEntered;
    
    // Conditional validation (3.7)
    var mainTotal = regularSum + internalSum;
    if (academicHours > 0 && allHaveHours) {
        var mainDiff = mainTotal - academicHours;
        
        if (Math.abs(regP1 + intP1 - (regP1 + intP1)) >= 0) {
            html += '<div style="background:var(--gray-50);border:1px solid var(--gray-200);border-radius:8px;padding:10px 14px;font-size:12px;color:var(--gray-600);margin-bottom:6px;">ℹ️ <strong>אימות תקופתי:</strong> ' +
                escAttr(p2Label) + ': ' + (regP2 + intP2) + ' שע׳ | ' +
                escAttr(p1Label) + ': ' + (regP1 + intP1) + ' שע׳ | סה"כ: ' + mainTotal + ' / ' + academicHours + '</div>';
        }
        
        if (Math.abs(mainDiff) < 0.01) {
            html += '<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:10px 14px;color:#166534;font-size:13px;font-weight:500;margin-bottom:6px;">✅ סה"כ שעות אקדמיות (רגיל + כוח פנים): ' + mainTotal + ' = ' + academicHours + ' שע׳ — תואם</div>';
        } else {
            var isOverM = mainDiff > 0;
            html += '<div style="background:' + (isOverM ? '#fef2f2' : '#fef9c3') + ';border:1px solid ' + (isOverM ? '#fca5a5' : '#fde047') + ';border-radius:8px;padding:10px 14px;color:' + (isOverM ? '#991b1b' : '#854d0e') + ';font-size:13px;font-weight:500;margin-bottom:6px;">' +
                (isOverM ? '🔴' : '⚠️') + ' רגיל (' + regularSum + ') + כוח פנים (' + internalSum + ') = ' + mainTotal + ' — ' +
                (isOverM ? 'עודף' : 'חסר') + ' ' + Math.abs(mainDiff) + ' שע׳ מ-' + academicHours + '</div>';
        }
    } else if (anyHoursEntered) {
        html += '<div style="background:#f0f9ff;border:1px solid #93c5fd;border-radius:8px;padding:10px 14px;color:#1e40af;font-size:12px;margin-bottom:6px;">ℹ️ לא הוזנו שעות לכל המנחים — ניתן להמשיך בתהליך (3.5). סה"כ שעות שהוזנו: ' + mainTotal + ' / ' + academicHours + '</div>';
    }
    
    // Note about accompaniment
    if (accSum > 0) {
        html += '<div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:10px 14px;font-size:12px;color:#713f12;line-height:1.6;margin-bottom:6px;">ℹ️ <strong>הערה:</strong> שעות הליווי (' + accSum + ') הן תקציב נוסף ואינן נכללות בחישוב סה"כ השעות האקדמיות של פתרון הלמידה (' + academicHours + ').</div>';
    }
    
    // Grand total
    html += '<div style="background:var(--gray-50);border:1px solid var(--gray-200);border-radius:8px;padding:10px 14px;font-size:13px;color:var(--gray-700);display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;">' +
        '<span>📊 סה"כ שעות אקדמיות: <strong>' + mainTotal + '</strong> / ' + academicHours + '</span>' +
        (accSum > 0 ? '<span>🕐 שעות ליווי נוספות: <strong>' + accSum + '</strong></span>' : '') +
        '</div>';
    
    validation.innerHTML = html;
}

    function _cdAddMentorInline() {
        var mentorId = window._cdSelectedMentorId;
        if (!mentorId) {
            showToast('יש לבחור מנחה מתוצאות החיפוש', 'warning');
            return;
        }
        var mentor = DataStore.getById(DataStore.KEYS.MENTORS, mentorId);
        if (!mentor) return;

        var newInst = DataStore.create(DataStore.KEYS.SOLUTION_INSTRUCTORS, {
            solutionId: window._cdSolutionId,
            mentorId: mentorId,
            mentorRepoId: mentorId,
            fullNameHe: mentor.fullNameHe || mentor.fullName,
            fullNameAr: mentor.fullNameAr || '',
            idNumber: mentor.idNumber || '',
            phone: mentor.phone || '',
            email: mentor.email || '',
            performerType: mentor.performerType || '',
            lecturerStatus: mentor.lecturerStatus || '',
            totalAcademicHours: 0,
            period1Hours: 0,
            period2Hours: 0,
            isAccompaniment: false
        });

        // Clear search and close dropdown
        window._cdSelectedMentorId = null;
        var searchInput = document.getElementById('cd_newMentorSearch');
        var resultsDiv = document.getElementById('cd_newMentorSearchResults');
        if (searchInput) searchInput.value = '';
        if (resultsDiv) resultsDiv.style.display = 'none';

        // Add row to table
        var tbody = document.getElementById('cd_mentorTbody');
        if (tbody && newInst) {
            tbody.insertAdjacentHTML('beforeend', _cdBuildMentorRow(newInst));
        }

        _cdRecalc();
        showToast('המנחה נוסף בהצלחה', 'success');
    }

    function _cdRemoveMentorRow(btn) {
        var row = btn.closest('tr');
        var instId = row ? row.getAttribute('data-inst-id') : '';
        if (!instId) return;
        confirmDialog('להסיר מנחה זה מהפתרון?', function() {
            DataStore.remove(DataStore.KEYS.SOLUTION_INSTRUCTORS, instId);
            if (row) row.remove();
            _cdRecalc();
            showToast('המנחה הוסר', 'success');
        });
    }

    // 3.6: Add new internal force (כוח פנים) row to funded complete-data table
    function _cdAddInternalForceRow() {
        var solId = window._cdSolutionId;
        if (!solId) return;
        var newInst = DataStore.create(DataStore.KEYS.SOLUTION_INSTRUCTORS, {
            solutionId: solId,
            mentorId: '',
            mentorRepoId: '',
            fullNameHe: 'כוח פנים',
            fullNameAr: '',
            idNumber: '',
            phone: '',
            email: '',
            performerType: 'כוח פנים',
            lecturerStatus: '',
            totalAcademicHours: 0,
            period1Hours: 0,
            period2Hours: 0,
            isAccompaniment: false
        });
        var tbody = document.getElementById('cd_mentorTbody');
        if (tbody && newInst) {
            tbody.insertAdjacentHTML('beforeend', _cdBuildMentorRow(newInst));
        }
        _cdRecalc();
        showToast('שורת כוח פנים נוספה', 'success');
    }

    function _fmtDateRange(start, end) {
        if (!start || !end) return '';
        var s = new Date(start);
        var e = new Date(end);
        var fmt = function(d) { return (d.getMonth() + 1).toString().padStart(2, '0') + '/' + d.getFullYear().toString().slice(-2); };
        return fmt(s) + ' — ' + fmt(e);
    }

function _saveCompleteData(solutionId) {
    var sol = DataStore.getById(DataStore.KEYS.SOLUTIONS, solutionId);
    if (!sol) return;
    var solTotal = sol.academicHours || 0;
    
    // Step 1: Budget status
    var budgetStatus = '';
    var checked = document.querySelector('input[name="cd_budgetStatus"]:checked');
    if (checked) budgetStatus = checked.value;
    
    if (budgetStatus === '' || budgetStatus === undefined || budgetStatus === null) {
        showToast('יש לבחור סטטוס תקצוב (שלב 1) לפני השמירה', 'warning');
        return;
    }
    
    var solUpdate = {};
    
    if (budgetStatus === 'yes') {
        // ====== FUNDED MODE ======
        var budgetTypeSelect = document.getElementById('cd_budgetTypeSelect');
        var budgetTypeValue = budgetTypeSelect ? budgetTypeSelect.value : '';
        var fundedHours = parseInt(document.getElementById('cd_budgetedHours')?.value) || 0;
        var period1Hours = parseFloat(document.getElementById('cd_period1Hours')?.value) || 0;
        var period2Hours = parseFloat(document.getElementById('cd_period2Hours')?.value) || 0;
        var academicHours = parseFloat(document.getElementById('cd_academicHours')?.value) || 0;
        
        if (!budgetTypeValue) {
            showToast('יש לבחור סוג תקצוב', 'warning');
            return;
        }
        
        solUpdate.budgetType = 'מתוקצב';
        solUpdate.budgetTypeValue = budgetTypeValue;
        solUpdate.budgetedHours = fundedHours;
        solUpdate.period1Hours = period1Hours;
        solUpdate.period2Hours = period2Hours;
        solUpdate.academicHours = academicHours;
        
        // Iterate mentor rows
        var regularSum = 0, internalSum = 0, accSum = 0;
        var typeRows = document.querySelectorAll('.cd-mentor-type');
        
        typeRows.forEach(function(sel) {
            var instId = sel.getAttribute('data-inst-id');
            var type = sel.value;
            var row = sel.closest('tr');
            
            if (!row || !instId) return;
            
            var p1Raw = row.querySelector('.cd-acad-p1')?.value;
            var p2Raw = row.querySelector('.cd-acad-p2')?.value;
            var p1 = (p1Raw === '' || p1Raw === null || p1Raw === undefined) ? 0 : parseFloat(p1Raw) || 0;
            var p2 = (p2Raw === '' || p2Raw === null || p2Raw === undefined) ? 0 : parseFloat(p2Raw) || 0;
            var total = p1 + p2;
            
            var isSpecialSave = (type === 'כוח פנים' || type === 'שעות ליווי');
            var preservedTotal = 0;
            
            if (isSpecialSave) {
                var _existingInst = DataStore.getById(DataStore.KEYS.SOLUTION_INSTRUCTORS, instId);
                preservedTotal = _existingInst ? (_existingInst.totalAcademicHours || 0) : 0;
            }
            
            var update = {
                totalAcademicHours: isSpecialSave ? preservedTotal : total,
                period1Hours: p1,
                period2Hours: p2
            };
            
            if (type === 'כוח פנים') {
                update.performerType = 'כוח פנים';
                update.isAccompaniment = false;
                update.fullNameHe = 'כוח פנים';
                update.fullNameAr = '';
                update.mentorId = null;
                internalSum += preservedTotal;
            } else {
                var origName = sel.getAttribute('data-orig-name') || '';
                var origMentorId = sel.getAttribute('data-orig-mentor-id') || '';
                
                if (origName) update.fullName = origName;
                if (origMentorId) update.mentorId = origMentorId;
                
                if (type === 'שעות ליווי') {
                    var accNameInput = row.querySelector('.cd-acc-search');
                    if (accNameInput) update.fullName = accNameInput.value;
                    
                    var accHiddenMentorId = document.getElementById('cd_acc_mentorid_' + instId);
                    if (accHiddenMentorId && accHiddenMentorId.value) {
                        update.mentorId = accHiddenMentorId.value;
                        update.mentorRepoId = accHiddenMentorId.value;
                        
                        var mentorData = DataStore.getById(DataStore.KEYS.MENTORS, update.mentorId);
                        if (mentorData) {
                            update.fullName = mentorData.fullName || update.fullName;
                            update.idNumber = mentorData.idNumber || '';
                            update.phone = mentorData.phone || '';
                            update.email = mentorData.email || '';
                            update.performerType = mentorData.performerType || '';
                            update.lecturerStatus = mentorData.lecturerStatus || '';
                        }
                    }
                    
                    update.isAccompaniment = true;
                    update.performerType = '';
                    accSum += preservedTotal;
                } else {
                    update.isAccompaniment = false;
                    update.performerType = '';
                    regularSum += total;
                }
            }
            
            DataStore.update(DataStore.KEYS.SOLUTION_INSTRUCTORS, instId, update);
        });
        
    } else {
        // ====== NON-FUNDED MODE ======
        solUpdate.budgetType = 'לא מתוקצב';
        solUpdate.budgetTypeValue = '';
        solUpdate.budgetedHours = 0;
        
        var nfP1 = parseFloat(document.getElementById('cd_nf_p1')?.value) || 0;
        var nfP2 = parseFloat(document.getElementById('cd_nf_p2')?.value) || 0;
        var nfTotal = nfP1 + nfP2;
        var nfInstId = document.getElementById('cd_nf_instId')?.value;
        
        if (nfInstId) {
            DataStore.update(DataStore.KEYS.SOLUTION_INSTRUCTORS, nfInstId, {
                totalAcademicHours: nfTotal,
                period1Hours: nfP1,
                period2Hours: nfP2,
                performerType: 'כוח פנים',
                isAccompaniment: false,
                fullName: 'כוח פנים',
                mentorId: null
            });
        }
    }
    
    // Save solution-level data
    DataStore.update(DataStore.KEYS.SOLUTIONS, solutionId, solUpdate);
    logActivity('complete_data', 'השלמת נתונים: ' + (sol.name || ''), 'solution', solutionId);
    showToast('נתוני ההשלמה נשמרו בהצלחה!', 'success');
    closeModal();
    renderSolutions();
}

    // ============ Mentor Free-Text Search ============
    function _filterMentorSearch(prefix, excludeUsedInSol) {
        var searchInput = document.getElementById(prefix + 'Search');
        var resultsDiv = document.getElementById(prefix + 'SearchResults');
        if (!searchInput || !resultsDiv) return;
        var query = searchInput.value.trim().toLowerCase();
        if (!query) { resultsDiv.style.display = 'none'; return; }

        var allMentors = (DataStore.getAll(DataStore.KEYS.MENTORS) || []).filter(function(m) { return m.isActive !== false; });
        var filtered = allMentors.filter(function(m) {
            return (m.fullName || '').toLowerCase().includes(query) ||
                   (m.idNumber || '').includes(query);
        });

        // For complete data modal, exclude mentors already assigned to this solution (except כוח פנים)
        if (excludeUsedInSol && window._cdSolutionId) {
            var solId = window._cdSolutionId;
            var existingInsts = (DataStore.getAll(DataStore.KEYS.SOLUTION_INSTRUCTORS) || []).filter(function(i) { return i.solutionId === solId; });
            var usedIds = new Set(existingInsts.filter(function(i) { return i.mentorId && _getMentorType(i) !== 'כוח פנים'; }).map(function(i) { return i.mentorId; }));
            filtered = filtered.filter(function(m) { return !usedIds.has(m.id); });
        }

        filtered = filtered.slice(0, 15);

        if (filtered.length === 0) {
            resultsDiv.innerHTML = '<div style="padding:10px;color:var(--gray-400);text-align:center;font-size:13px;">לא נמצאו תוצאות</div>';
        } else {
            resultsDiv.innerHTML = filtered.map(function(m) {
                return '<div style="padding:8px 12px;cursor:pointer;border-bottom:1px solid var(--gray-100);font-size:14px;" ' +
                    'onmousedown="App._selectMentorSearchItem(\'' + prefix + '\',\'' + m.id + '\')" ' +
                    'onmouseover="this.style.background=\'var(--gray-50)\'" onmouseout="this.style.background=\'\'">' +
                    '<strong>' + escAttr(m.fullName) + '</strong>' +
                    (m.idNumber ? ' <span style="color:var(--gray-400);font-size:12px;direction:ltr;display:inline-block;margin-right:6px;">(' + escAttr(m.idNumber) + ')</span>' : '') +
                    '</div>';
            }).join('');
        }
        resultsDiv.style.display = 'block';
    }

    function _selectMentorSearchItem(prefix, mentorId) {
        var searchInput = document.getElementById(prefix + 'Search');
        var resultsDiv = document.getElementById(prefix + 'SearchResults');
        var m = DataStore.getById(DataStore.KEYS.MENTORS, mentorId);
        if (!m) return;

        if (searchInput) searchInput.value = m.fullName + (m.idNumber ? ' (' + m.idNumber + ')' : '');
        if (resultsDiv) resultsDiv.style.display = 'none';

        if (prefix === 'fInst') {
            // Set hidden value and fill form fields
            var hidden = document.getElementById('fInstSelect');
            if (hidden) hidden.value = mentorId;
            _fillInstFromRepo();
        } else if (prefix === 'cd_newMentor') {
            window._cdSelectedMentorId = mentorId;
            // Task 1: Close dropdown immediately after selection for better UX
            setTimeout(function() { 
                if (resultsDiv) resultsDiv.style.display = 'none'; 
            }, 50);
        }
    }

    function _closeMentorSearch(prefix) {
        var resultsDiv = document.getElementById(prefix + 'SearchResults');
        if (resultsDiv) {
            setTimeout(function() { resultsDiv.style.display = 'none'; }, 200);
        }
    }


	// ==========================================
	// ניהול אשכולות למידה (Clusters) - גרסה סופית ומדויקת
	// ==========================================
	function renderClusters() {
		const container = document.getElementById('section-clusters');
		if (!container) return;

		const clusters = DataStore.getAll(DataStore.KEYS.CLUSTERS) || [];
		const clustersSettings = (DataStore.getAll(DataStore.KEYS.CLUSTERS_SETTINGS) || [])[0] || {};
		const introText = clustersSettings.introText || '';
		const activeTab = window._clustersActiveTab || 'management';

		container.innerHTML = `
			<div class="card" style="margin-bottom:24px;">
				<div class="card-header"><span class="card-title">📝 טקסט הקדמה לדף האשכולות הציבורי</span></div>
				<div class="card-body">
					<div class="hp-editor-wrapper" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06);">
						<textarea id="clustersIntroText">${escHtml(introText)}</textarea>
					</div>
					<div style="margin-top:12px; display:flex; gap:8px;">
						<button class="btn btn-primary btn-sm" onclick="App.saveClustersIntroText()">💾 שמור הקדמה</button>
						<button class="btn btn-outline btn-sm" onclick="App._initClustersIntroTinyMCE()">🔄 אתחל עורך</button>
					</div>
				</div>
			</div>
			
			<div class="card">
				<div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
					<h3 class="card-title">🧩 ניהול אשכולות למידה</h3>
					<div style="display:flex; gap:8px;">
						<button class="btn ${activeTab === 'management' ? 'btn-primary' : 'btn-outline'}" onclick="App._switchClustersTab('management')">⚙️ ניהול אשכולות</button>
						<button class="btn ${activeTab === 'registrations' ? 'btn-primary' : 'btn-outline'}" onclick="App._switchClustersTab('registrations')">📋 נרשמים</button>
					</div>
				</div>
				<div class="card-body">
					<div id="clustersTabContent"></div>
				</div>
			</div>
		`;

		if (activeTab === 'management') {
			_renderClustersManagementTab();
		} else {
			_renderClustersRegistrationsTab();
		}

		setTimeout(() => {
			if (typeof App._initClustersIntroTinyMCE === 'function') {
				App._initClustersIntroTinyMCE();
			}
		}, 150);
	}

	function _switchClustersTab(tab) {
		window._clustersActiveTab = tab;
		renderClusters();
	}

	function _renderClustersManagementTab() {
		const clusters = DataStore.getAll(DataStore.KEYS.CLUSTERS) || [];
		
		document.getElementById('clustersTabContent').innerHTML = `
			<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
				<h4>רשימת אשכולות</h4>
				<button class="btn btn-primary" onclick="App.openClusterModal()">➕ יצירת אשכול חדש</button>
			</div>
			${clusters.length === 0 ? 
				'<p style="text-align:center; padding:20px; color:var(--text-secondary);">אין אשכולות מוגדרים עדיין.</p>' : 
				`<table class="data-table">
					<thead>
						<tr>
							<th>כותרת האשכול</th>
							<th>תחום דעת</th>
							<th>מס' אפשרויות בחירה</th>
							<th>סטטוס</th>
							<th style="width:150px; text-align:center;">פעולות</th>
						</tr>
					</thead>
					<tbody>
						${clusters.map(c => {
							const statusBadge = c.isActive ? 
								'<span style="color:#28a745; font-weight:bold;">🟢 פתוח לרישום</span>' : 
								'<span style="color:#dc3545; font-weight:bold;">🔴 סגור לרישום</span>';
							return `
							<tr>
								<td>${escAttr(c.title)}</td>
								<td>${escAttr(c.fieldKnowledgeId)}</td>
								<td style="text-align:center;">${c.choiceModules ? c.choiceModules.length : 0}</td>
								<td>${statusBadge}</td>
								<td style="text-align:center; white-space:nowrap;">
									<button class="btn btn-sm btn-outline" onclick="App.openClusterModal('${c.id}')" title="עריכה">✏️</button>
									<button class="btn btn-sm btn-danger" onclick="App.deleteCluster('${c.id}')" title="מחיקה">🗑️</button>
								</td>
							</tr>
							`;
						}).join('')}
					</tbody>
				</table>`
			}
		`;
	}

	function _renderClustersRegistrationsTab() {
		const registrations = DataStore.getAll(DataStore.KEYS.CLUSTER_REGISTRATIONS) || [];
		const clusters = DataStore.getAll(DataStore.KEYS.CLUSTERS) || [];
		
		document.getElementById('clustersTabContent').innerHTML = `
			<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:12px;">
				<h4>רשימת נרשמים (${registrations.length})</h4>
				<div style="display:flex; gap:8px; flex-wrap:wrap;">
					<button class="btn btn-sm btn-success" onclick="App.exportClusterRegistrationsExcel()">📊 ייצוא לאקסל</button>
					<button class="btn btn-sm btn-info" onclick="App.exportClusterRegistrationsCSV()">📄 ייצוא ל-CSV</button>
					<button class="btn btn-sm btn-primary" onclick="App.importClusterRegistrationsExcel()">📥 ייבוא מאקסל</button>
					<button class="btn btn-sm btn-outline" onclick="App.printClusterRegistrations()">🖨️ הדפסה</button>
					<button class="btn btn-sm btn-danger" onclick="App.deleteAllClusterRegistrations()">🗑️ מחיקה גורפת</button>
				</div>
			</div>
			${registrations.length === 0 ? 
				'<p style="text-align:center; padding:40px; color:var(--text-secondary);">אין נרשמים עדיין.</p>' : 
				`<div style="overflow-x:auto;">
					<table class="data-table">
						<thead>
							<tr>
								<th>תאריך רישום</th>
								<th>שם מלא</th>
								<th>טלפון</th>
								<th>דוא"ל</th>
								<th>בית ספר</th>
								<th>תפקיד</th>
								<th>אשכול</th>
								<th>שעות</th>
								<th>סטטוס</th>
								<th style="width:120px; text-align:center;">פעולות</th>
							</tr>
						</thead>
						<tbody>
							${registrations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(r => {
								const cluster = clusters.find(c => c.id === r.clusterId);
								const clusterName = cluster ? cluster.title : 'לא ידוע';
								return `
								<tr>
									<td style="white-space:nowrap;">${new Date(r.createdAt).toLocaleDateString('he-IL')}</td>
									<td>${escAttr(r.teacherName)}</td>
									<td dir="ltr">${escAttr(r.phone)}</td>
									<td dir="ltr">${escAttr(r.email)}</td>
									<td>${escAttr(r.schoolName)}<br><small style="color:#888;">(${escAttr(r.schoolSymbol)})</small></td>
									<td>${escAttr(r.role)}</td>
									<td>${escAttr(clusterName)}</td>
									<td style="text-align:center;">${r.totalHours || 30}</td>
									<td style="text-align:center;">
										<select class="form-select" style="padding:4px 8px; font-size:12px;" onchange="App.updateClusterRegistrationStatus('${r.id}', this.value)">
											<option value="pending" ${r.status === 'pending' ? 'selected' : ''}>⏳ ממתין</option>
											<option value="approved" ${r.status === 'approved' ? 'selected' : ''}>✅ אושר</option>
											<option value="rejected" ${r.status === 'rejected' ? 'selected' : ''}>❌ נדחה</option>
											<option value="completed" ${r.status === 'completed' ? 'selected' : ''}>🏁 הושלם</option>
										</select>
									</td>
									<td style="text-align:center; white-space:nowrap;">
										<button class="btn btn-sm btn-outline" onclick="App.viewClusterRegistration('${r.id}')" title="צפייה">👁️</button>
										<button class="btn btn-sm btn-danger" onclick="App.deleteClusterRegistration('${r.id}')" title="מחיקה">🗑️</button>
									</td>
								</tr>
								`;
							}).join('')}
						</tbody>
					</table>
				</div>`
			}
		`;
		
		// אתחול TinyMCE להקדמה
		setTimeout(() => {
			if (typeof App._initClustersIntroTinyMCE === 'function') {
				App._initClustersIntroTinyMCE();
			}
		}, 150);
	}

	// 🔑 פונקציה חדשה: שמירת טקסט ההקדמה
	function saveClustersIntroText() {
		if (typeof tinymce !== 'undefined') {
			const editor = tinymce.get('clustersIntroText');
			if (editor) editor.save();
		}
		
		const introText = document.getElementById('clustersIntroText')?.value || '';
		
		let settings = (DataStore.getAll('clusters_settings') || [])[0];
		if (!settings) {
			settings = {
				id: 'clusters_settings_main',
				introText: introText,
				updatedAt: new Date().toISOString()
			};
			DataStore.create(DataStore.KEYS.CLUSTERS_SETTINGS, settings);
		} else {
			settings.introText = introText;
			settings.updatedAt = new Date().toISOString();
			DataStore.update('clusters_settings', settings.id, settings);
		}
		
		showToast('טקסט ההקדמה נשמר בהצלחה!', 'success');
	}

	// 🔑 פונקציה חדשה: אתחול TinyMCE להקדמה
	var _clustersIntroTinyMCEInit = false;
	function _initClustersIntroTinyMCE() {
		if (typeof tinymce === 'undefined') {
			console.warn('[Clusters Intro] TinyMCE לא נטען');
			setTimeout(_initClustersIntroTinyMCE, 300);
			return;
		}
		
		const textarea = document.getElementById('clustersIntroText');
		if (!textarea) {
			console.warn('[Clusters Intro] textarea לא נמצא');
			setTimeout(_initClustersIntroTinyMCE, 300);
			return;
		}
		
		if (_clustersIntroTinyMCEInit) {
			try {
				const existing = tinymce.get('clustersIntroText');
				if (existing) existing.remove();
			} catch(e) {}
			_clustersIntroTinyMCEInit = false;
		}
		
		try {
			tinymce.init({
				selector: '#clustersIntroText',
				base_url: './tinymce',
				suffix: '.min',
				height: 350,
				directionality: 'rtl',
				language: 'he_IL',
				plugins: 'advlist autolink lists link image charmap preview anchor searchreplace visualblocks code fullscreen insertdatetime media table wordcount help directionality',
				toolbar: 'undo redo | bold italic underline | forecolor backcolor | alignleft aligncenter alignright | bullist numlist | link image | code',
				content_style: 'body { font-family: "Noto Sans Arabic", "Noto Sans Hebrew", Arial, sans-serif; font-size: 15px; line-height: 1.8; padding: 16px; direction: rtl; }',
				branding: false,
				promotion: false,
				setup: function(editor) {
					editor.on('init', function() {
						_clustersIntroTinyMCEInit = true;
						console.log('✅ [Clusters Intro] TinyMCE אותחל');
					});
				}
			});
		} catch(e) {
			console.error('[Clusters Intro] שגיאה:', e);
		}
	}

	function openClusterModal(clusterId = null) {
		const clusters = DataStore.getAll(DataStore.KEYS.CLUSTERS) || [];
		const solutions = DataStore.getAll(DataStore.KEYS.SOLUTIONS) || [];
		const uniqueDomains = [...new Set(solutions.map(s => s.domain).filter(d => d && d.trim() !== ''))].sort();
		
		const isEdit = !!clusterId;
		const cluster = isEdit ? clusters.find(c => c.id === clusterId) : null;
		
		if (isEdit && !cluster) {
			showToast('אשכול לא נמצא', 'error');
			return;
		}
		
		const clusterData = isEdit ? cluster : {
			title: '',
			fieldKnowledgeId: '',
			fixedTheme: '',
			choiceModules: [{ solutionId: '', theme: '' }, { solutionId: '', theme: '' }],
			isActive: true
		};

		const domainOptions = uniqueDomains.map(d => 
			`<option value="${escAttr(d)}" ${clusterData.fieldKnowledgeId === d ? 'selected' : ''}>${escAttr(d)}</option>`
		).join('');
		
		const availableSolutions = clusterData.fieldKnowledgeId ? 
			solutions.filter(s => s.domain === clusterData.fieldKnowledgeId) : [];

		let overlay = document.getElementById('cluster_modal_overlay');
		if (overlay) overlay.remove();
		
		overlay = document.createElement('div');
		overlay.id = 'cluster_modal_overlay';
		overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:10000;display:flex;align-items:center;justify-content:center;overflow-y:auto; padding: 20px;';
		
		overlay.innerHTML = `
			<div style="background:#fff;border-radius:12px;padding:32px;width:100%;max-width:700px;box-shadow:0 8px 32px rgba(0,0,0,0.3);">
				<h3 style="margin:0 0 24px 0;color:var(--primary);">${isEdit ? 'עריכת אשכול' : 'יצירת אשכול חדש'}</h3>
				
				<div class="form-grid" style="grid-template-columns: 1fr 1fr; gap:16px; margin-bottom:16px;">
					<div class="form-group">
						<label>כותרת האשכול *</label>
						<input type="text" id="c_title" class="form-input" value="${escAttr(clusterData.title)}" required>
					</div>
					<div class="form-group">
						<label>תחום דעת *</label>
						<select id="c_fieldKnowledgeId" class="form-input" onchange="App.updateClusterSolutionsList(this.value)">
							<option value="">-- בחר תחום דעת --</option>
							${domainOptions}
						</select>
					</div>
				</div>

				<div class="form-group" style="margin-bottom:24px; padding:16px; background:#f8f9fa; border-radius:8px;">
					<label style="font-weight:600; display:block; margin-bottom:8px;">📌 חלק קבוע (10 שעות אקדמיות)</label>
					<input type="text" id="c_fixedTheme" class="form-input" value="${escAttr(clusterData.fixedTheme)}" placeholder="לדוגמה: שילוב עברית בהוראה + בינה מלאכותית">
				</div>

				<div style="margin-bottom:24px;">
					<label style="font-weight:600; display:block; margin-bottom:12px;">📚 אפשרויות בחירה (יש לבחור 2, כל אחת 10 שעות)</label>
					<div id="c_choiceModules_container">
						${clusterData.choiceModules.map((mod, idx) => `
							<div class="form-grid" style="grid-template-columns: 2fr 1fr auto; gap:12px; margin-bottom:12px; align-items:end;">
								<div class="form-group">
									<label>פתרון למידה (מתוך הקטלוג)</label>
									<select class="form-input c_choice_solution" data-idx="${idx}">
										<option value="">-- בחר פתרון --</option>
										${availableSolutions.map(s => `<option value="${s.id}" ${mod.solutionId === s.id ? 'selected' : ''}>${escAttr(s.solutionName || 'ללא שם')}</option>`).join('')}
									</select>
								</div>
								<div class="form-group">
									<label>נושא מרכזי באשכול</label>
									<input type="text" class="form-input c_choice_theme" data-idx="${idx}" value="${escAttr(mod.theme)}" placeholder="לדוגמה: אוריינות מתמטית">
								</div>
								<button class="btn btn-sm btn-outline" onclick="this.parentElement.remove()" style="margin-bottom:0; height:42px;">🗑️</button>
							</div>
						`).join('')}
					</div>
					<button class="btn btn-sm btn-outline" onclick="App.addClusterChoiceModule()" style="margin-top:8px;">➕ הוסף אפשרות בחירה נוספת</button>
				</div>

				<div class="form-group" style="margin-bottom:24px; display:flex; align-items:center; gap:12px;">
					<input type="checkbox" id="c_isActive" ${clusterData.isActive ? 'checked' : ''} style="width:20px; height:20px;">
					<label for="c_isActive" style="margin:0; font-weight:600; cursor:pointer;">האשכול פתוח לרישום כעת</label>
				</div>

				<div style="display:flex; gap:12px; justify-content:flex-end; margin-top:24px; border-top:1px solid #eee; padding-top:20px;">
					<button class="btn btn-primary" onclick="App.saveCluster('${clusterId || ''}')">💾 שמור אשכול</button>
					<button class="btn btn-outline" onclick="document.getElementById('cluster_modal_overlay').remove()">ביטול</button>
				</div>
			</div>
		`;
		document.body.appendChild(overlay);
	}

	function updateClusterSolutionsList(fieldKnowledgeId) {
		const solutions = DataStore.getAll(DataStore.KEYS.SOLUTIONS) || [];
		
		// 🔑 סינון מדויק לפי הטקסט בערבית ששמור ב-domain
		const filtered = fieldKnowledgeId ? 
			solutions.filter(s => s.domain === fieldKnowledgeId) : [];
		
		console.log('✅ [Clusters] נמצאו', filtered.length, 'פתרונות לתחום:', fieldKnowledgeId);
		
		document.querySelectorAll('.c_choice_solution').forEach(select => {
			const currentVal = select.value;
			const optionsHtml = filtered.map(s => {
				const displayName = s.solutionName || 'ללא שם';
				return `<option value="${s.id}" ${currentVal === s.id ? 'selected' : ''}>${escAttr(displayName)}</option>`;
			}).join('');
			
			select.innerHTML = '<option value="">-- בחר פתרון --</option>' + optionsHtml;
		});
	}

	function addClusterChoiceModule() {
		const container = document.getElementById('c_choiceModules_container');
		const idx = container.children.length;
		const div = document.createElement('div');
		div.className = 'form-grid';
		div.style.cssText = 'grid-template-columns: 2fr 1fr auto; gap:12px; margin-bottom:12px; align-items:end;';
		div.innerHTML = `
			<div class="form-group">
				<label>פתרון למידה (מתוך הקטלוג)</label>
				<select class="form-input c_choice_solution" data-idx="${idx}">
					<option value="">-- בחר פתרון --</option>
				</select>
			</div>
			<div class="form-group">
				<label>נושא מרכזי באשכול</label>
				<input type="text" class="form-input c_choice_theme" data-idx="${idx}" placeholder="לדוגמה: אוריינות מתמטית">
			</div>
			<button class="btn btn-sm btn-outline" onclick="this.parentElement.remove()" style="margin-bottom:0; height:42px;">🗑️</button>
		`;
		container.appendChild(div);
		
		const fieldKnowledgeId = document.getElementById('c_fieldKnowledgeId').value;
		if (fieldKnowledgeId) updateClusterSolutionsList(fieldKnowledgeId);
	}

	function saveCluster(clusterId) {
		const title = document.getElementById('c_title').value.trim();
		const fieldKnowledgeId = document.getElementById('c_fieldKnowledgeId').value;
		const fixedTheme = document.getElementById('c_fixedTheme').value.trim();
		const isActive = document.getElementById('c_isActive').checked;

		if (!title || !fieldKnowledgeId || !fixedTheme) {
			showToast('יש למלא את כל שדות החובה (כותרת, תחום דעת, נושא קבוע)', 'error');
			return;
		}

		const choiceModules = [];
		document.querySelectorAll('#c_choiceModules_container > div').forEach(div => {
			const solId = div.querySelector('.c_choice_solution').value;
			const theme = div.querySelector('.c_choice_theme').value.trim();
			if (solId && theme) {
				choiceModules.push({ solutionId: solId, theme: theme });
			}
		});

		if (choiceModules.length < 2) {
			showToast('יש להגדיר לפחות 2 אפשרויות בחירה תקינות', 'error');
			return;
		}

		const clusterData = {
			title,
			fieldKnowledgeId,
			fixedTheme,
			choiceModules,
			isActive,
			updatedAt: new Date().toISOString()
		};

		if (clusterId) {
			DataStore.update(DataStore.KEYS.CLUSTERS, clusterId, clusterData);
			showToast('האשכול עודכן בהצלחה!', 'success');
		} else {
			clusterData.id = 'cluster_' + Date.now();
			clusterData.createdAt = new Date().toISOString();
			DataStore.create(DataStore.KEYS.CLUSTERS, clusterData);
			showToast('האשכול נוצר בהצלחה!', 'success');
		}

		document.getElementById('cluster_modal_overlay').remove();
		renderClusters();
	}

	function deleteCluster(id) {
		if (!confirm('האם אתה בטוח שברצונך למחוק אשכול זה? פעולה זו תמחק גם את כל הרישומים המשויכים אליו.')) return;
		DataStore.remove(DataStore.KEYS.CLUSTERS, id);
		
		const regs = DataStore.getAll(DataStore.KEYS.CLUSTER_REGISTRATIONS) || [];
		const filteredRegs = regs.filter(r => r.clusterId !== id);
		DataStore.saveAll(DataStore.KEYS.CLUSTER_REGISTRATIONS, filteredRegs);
		
		showToast('האשכול נמחק בהצלחה', 'success');
		renderClusters();
	}

	function updateClusterRegistrationStatus(id, newStatus) {
		const registrations = DataStore.getAll(DataStore.KEYS.CLUSTER_REGISTRATIONS) || [];
		const index = registrations.findIndex(r => r.id === id);
		if (index === -1) return;
		
		registrations[index].status = newStatus;
		registrations[index].updatedAt = new Date().toISOString();
		DataStore.saveAll(DataStore.KEYS.CLUSTER_REGISTRATIONS, registrations);
		
		showToast('סטטוס הנרשם עודכן', 'success');
		_renderClustersRegistrationsTab();
	}

	function viewClusterRegistration(id) {
		const registrations = DataStore.getAll(DataStore.KEYS.CLUSTER_REGISTRATIONS) || [];
		const clusters = DataStore.getAll(DataStore.KEYS.CLUSTERS) || [];
		const r = registrations.find(reg => reg.id === id);
		if (!r) return;
		
		const cluster = clusters.find(c => c.id === r.clusterId);
		const clusterName = cluster ? cluster.title : 'לא ידוע';
		
		const chosenModulesHtml = (r.chosenModules || []).map((mod, idx) => {
			const sol = DataStore.getAll(DataStore.KEYS.SOLUTIONS).find(s => s.id === mod.solutionId);
			const solName = sol ? sol.solutionName : 'לא ידוע';
			return `<div style="margin-bottom:8px;"><strong>אפשרות ${idx + 1}:</strong> ${escAttr(solName)} - ${escAttr(mod.theme)}</div>`;
		}).join('');
		
		const body = `
			<div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; font-size:14px; line-height:1.6;">
				<div><strong>📅 תאריך רישום:</strong><br>${new Date(r.createdAt).toLocaleString('he-IL')}</div>
				<div><strong>📊 סטטוס:</strong><br>${r.status === 'pending' ? '⏳ ממתין' : r.status === 'approved' ? '✅ אושר' : r.status === 'rejected' ? '❌ נדחה' : '🏁 הושלם'}</div>
				<div><strong>👤 שם מלא:</strong><br>${escAttr(r.teacherName)}</div>
				<div><strong>📱 טלפון:</strong><br><span dir="ltr">${escAttr(r.phone)}</span></div>
				<div><strong>📧 דוא"ל:</strong><br><span dir="ltr">${escAttr(r.email)}</span></div>
				<div><strong>💼 תפקיד:</strong><br>${escAttr(r.role)}</div>
				<div><strong>🏫 בית ספר:</strong><br>${escAttr(r.schoolName)}<br><small>(${escAttr(r.schoolSymbol)})</small></div>
				<div><strong>🧩 אשכול:</strong><br>${escAttr(clusterName)}</div>
				<div style="grid-column:1/-1; background:#f8f9fa; padding:12px; border-radius:8px;">
					<strong>📚 אפשרויות בחירה:</strong><br>${chosenModulesHtml}
				</div>
				<div style="grid-column:1/-1;"><strong>⏱️ סה"כ שעות:</strong> ${r.totalHours || 30}</div>
			</div>
		`;
		
		showModal('פרטי נרשם מלאים', body, '<button class="btn btn-outline" onclick="App.closeModal()">סגור</button>');
	}

	function deleteClusterRegistration(id) {
		if (!confirm('האם אתה בטוח שברצונך למחוק רישום זה?')) return;
		DataStore.remove(DataStore.KEYS.CLUSTER_REGISTRATIONS, id);
		showToast('הרישום נמחק', 'success');
		_renderClustersRegistrationsTab();
	}

	function deleteAllClusterRegistrations() {
		if (!confirm('⚠️ האם אתה בטוח שברצונך למחוק את כל הרישומים? פעולה זו בלתי הפיכה!')) return;
		DataStore.saveAll(DataStore.KEYS.CLUSTER_REGISTRATIONS, []);
		showToast('כל הרישומים נמחקו', 'success');
		_renderClustersRegistrationsTab();
	}

	function exportClusterRegistrationsExcel() {
		const registrations = DataStore.getAll(DataStore.KEYS.CLUSTER_REGISTRATIONS) || [];
		const clusters = DataStore.getAll(DataStore.KEYS.CLUSTERS) || [];
		const solutions = DataStore.getAll(DataStore.KEYS.SOLUTIONS) || [];
		
		if (registrations.length === 0) {
			showToast('אין נתונים לייצוא', 'warning');
			return;
		}
		
		const headers = [
			'תאריך רישום', 
			'שם מלא', 
			'טלפון', 
			'דוא"ל', 
			'סמל מוסד', 
			'שם בית ספר', 
			'תפקיד', 
			'אשכול', 
			'שעות', 
			'אפשרות 1', 
			'נושא 1', 
			'אפשרות 2', 
			'נושא 2',
			'סטטוס'
		];
		
		const rows = registrations.map(r => {
			const cluster = clusters.find(c => c.id === r.clusterId);
			
			// 🔑 תיקון: חילוץ פרטי האפשרויות שנבחרו
			const chosenModules = r.chosenModules || [];
			const mod1 = chosenModules[0];
			const mod2 = chosenModules[1];
			
			const sol1 = mod1 ? solutions.find(s => s.id === mod1.solutionId) : null;
			const sol2 = mod2 ? solutions.find(s => s.id === mod2.solutionId) : null;
			
			const sol1Name = sol1 ? (sol1.solutionName || sol1.titleHe || sol1.title || '') : '';
			const sol2Name = sol2 ? (sol2.solutionName || sol2.titleHe || sol2.title || '') : '';
			
			return [
				new Date(r.createdAt).toLocaleDateString('he-IL'),
				r.teacherName,
				r.phone,
				r.email,
				r.schoolSymbol,
				r.schoolName,
				r.role,
				cluster ? cluster.title : '',
				r.totalHours || 30,
				sol1Name,
				mod1 ? mod1.theme : '',
				sol2Name,
				mod2 ? mod2.theme : '',
				r.status === 'pending' ? 'ממתין' : r.status === 'approved' ? 'אושר' : r.status === 'rejected' ? 'נדחה' : 'הושלם'
			];
		});
		
		const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
		const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
		const link = document.createElement('a');
		link.href = URL.createObjectURL(blob);
		link.download = `cluster_registrations_${new Date().toISOString().split('T')[0]}.csv`;
		link.click();
		
		showToast('הקובץ יוצא בהצלחה', 'success');
	}

	function exportClusterRegistrationsCSV() {
		exportClusterRegistrationsExcel(); // אותה פונקציה, שם קובץ שונה
	}

	function importClusterRegistrationsExcel() {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = '.csv,.xlsx,.xls';
		input.onchange = function(e) {
			const file = e.target.files[0];
			if (!file) return;
			
			const reader = new FileReader();
			reader.onload = function(event) {
				try {
					const content = event.target.result;
					const rows = content.split('\n').map(row => row.split(',').map(cell => cell.replace(/"/g, '').trim()));
					
					if (rows.length < 2) {
						showToast('הקובץ ריק או לא תקין', 'error');
						return;
					}
					
					const headers = rows[0];
					const dataRows = rows.slice(1).filter(row => row.length > 1);
					
					let importCount = 0;
					dataRows.forEach(row => {
						const registration = {
							id: 'cluster_reg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
							createdAt: new Date().toISOString(),
							teacherName: row[1] || '',
							phone: row[2] || '',
							email: row[3] || '',
							schoolSymbol: row[4] || '',
							schoolName: row[5] || '',
							role: row[6] || '',
							clusterId: '',
							totalHours: parseInt(row[8]) || 30,
							status: 'pending',
							chosenModules: []
						};
						DataStore.create(DataStore.KEYS.CLUSTER_REGISTRATIONS, registration);
						importCount++;
					});
					
					showToast(`${importCount} רשומות יובאו בהצלחה`, 'success');
					_renderClustersRegistrationsTab();
				} catch (err) {
					console.error('שגיאה בייבוא:', err);
					showToast('שגיאה בייבוא הקובץ', 'error');
				}
			};
			reader.readAsText(file, 'UTF-8');
		};
		input.click();
	}

	function printClusterRegistrations() {
		const registrations = DataStore.getAll(DataStore.KEYS.CLUSTER_REGISTRATIONS) || [];
		const clusters = DataStore.getAll(DataStore.KEYS.CLUSTERS) || [];
		
		if (registrations.length === 0) {
			showToast('אין נתונים להדפסה', 'warning');
			return;
		}
		
		const printWindow = window.open('', '_blank');
		const html = `
			<!DOCTYPE html>
			<html dir="rtl">
			<head>
				<meta charset="UTF-8">
				<title>רשימת נרשמים - אשכולות למידה</title>
				<style>
					body { font-family: Arial, sans-serif; padding: 20px; direction: rtl; }
					h1 { color: #0ca7aa; border-bottom: 2px solid #0ca7aa; padding-bottom: 10px; }
					table { width: 100%; border-collapse: collapse; margin-top: 20px; }
					th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
					th { background: #0ca7aa; color: white; }
					tr:nth-child(even) { background: #f9f9f9; }
					@media print { body { padding: 0; } }
				</style>
			</head>
			<body>
				<h1>🧩 רשימת נרשמים - אשכולות למידה</h1>
				<p>תאריך הדפסה: ${new Date().toLocaleDateString('he-IL')}</p>
				<p>סה"כ נרשמים: ${registrations.length}</p>
				<table>
					<thead>
						<tr>
							<th>תאריך</th>
							<th>שם מלא</th>
							<th>טלפון</th>
							<th>דוא"ל</th>
							<th>בית ספר</th>
							<th>תפקיד</th>
							<th>אשכול</th>
							<th>שעות</th>
							<th>סטטוס</th>
						</tr>
					</thead>
					<tbody>
						${registrations.map(r => {
							const cluster = clusters.find(c => c.id === r.clusterId);
							return `
							<tr>
								<td>${new Date(r.createdAt).toLocaleDateString('he-IL')}</td>
								<td>${escAttr(r.teacherName)}</td>
								<td dir="ltr">${escAttr(r.phone)}</td>
								<td dir="ltr">${escAttr(r.email)}</td>
								<td>${escAttr(r.schoolName)}</td>
								<td>${escAttr(r.role)}</td>
								<td>${cluster ? escAttr(cluster.title) : ''}</td>
								<td>${r.totalHours || 30}</td>
								<td>${r.status === 'pending' ? 'ממתין' : r.status === 'approved' ? 'אושר' : r.status === 'rejected' ? 'נדחה' : 'הושלם'}</td>
							</tr>
							`;
						}).join('')}
					</tbody>
				</table>
			</body>
			</html>
		`;
		
		printWindow.document.write(html);
		printWindow.document.close();
		setTimeout(() => { printWindow.print(); }, 500);
	}

    // ================================================================
    //  MENTORS (מאגר מרצים)
    // ================================================================

	var _mentorKpiFilter = null; // { field: 'lecturerStatus'|'expertInField'|'isCertifiedLecturer', value: string|null }

	function _mentorKpiCounts(items) {
		var total = items.length;
		var counts = { total: total, lecturerStatus: {}, expertInField: {}, isCertifiedLecturer: {} };
		items.forEach(function(m) {
			var s = m.lecturerStatus || '';
			if (s) counts.lecturerStatus[s] = (counts.lecturerStatus[s] || 0) + 1;
			var e = m.expertInField || '';
			if (e) counts.expertInField[e] = (counts.expertInField[e] || 0) + 1;
			var c = m.isCertifiedLecturer || '';
			if (c) counts.isCertifiedLecturer[c] = (counts.isCertifiedLecturer[c] || 0) + 1;
		});
		return counts;
	}

	function _renderMentorsKpi(items) {
		var c = _mentorKpiCounts(items);
		var total = c.total || 1;
		var active = _mentorKpiFilter;
		function kpiCard(label, count, field, value, color) {
			var pct = total > 0 ? Math.round((count / total) * 100) : 0;
			var isActive = active && active.field === field && active.value === value;
			var borderStyle = isActive ? 'border:2px solid var(--primary);' : '';
			return '<div onclick="App._mentorSetKpiFilter(\'' + field + '\',\'' + value + '\')" style="cursor:pointer;padding:12px 16px;border-radius:var(--border-radius);background:var(--card-bg, #fff);border:1px solid var(--border-color, var(--gray-200));' + borderStyle + 'min-width:100px;text-align:center;transition:all .15s;" onmouseover="this.style.boxShadow=\'var(--shadow-md, 0 2px 8px rgba(0,0,0,0.08))\'" onmouseout="this.style.boxShadow=\'none\'">' +
				'<div style="font-size:22px;font-weight:700;color:' + color + ';">' + count + '</div>' +
				'<div style="font-size:11px;color:var(--gray-500);margin-top:2px;">' + escAttr(label) + '</div>' +
				'<div style="font-size:10px;color:var(--gray-400);">' + pct + '%</div>' +
				'</div>';
		}
		var html = '<div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:16px;">';
		// Status KPIs
		html += kpiCard('סה"כ הרשומות', c.total, '', '', 'var(--gray-700)');
		var statusColors = { 'אושר': 'var(--success, #16a34a)', 'אושר פדגוגית': 'var(--primary, #2563eb)', 'השלמת פרטים': 'var(--warning, #d97706)', 'נדחה': 'var(--danger, #dc2626)', 'עודכן מרצה': 'var(--info, #0891b2)' };
		var statusOrder = ['אושר', 'אושר פדגוגית', 'השלמת פרטים', 'נדחה', 'עודכן מרצה'];
		statusOrder.forEach(function(s) {
			var cnt = c.lecturerStatus[s] || 0;
			html += kpiCard(s, cnt, 'lecturerStatus', s, statusColors[s] || 'var(--gray-500)');
		});
		// Separator
		html += '<div style="width:1px;background:var(--gray-200);margin:0 4px;"></div>';
		// Expert KPIs
		var expColors = { 'הוגשה בקשה': 'var(--warning, #d97706)', 'מומחה בתחומו': 'var(--success, #16a34a)', 'נדחתה הבקשה': 'var(--danger, #dc2626)' };
		['הוגשה בקשה', 'מומחה בתחומו', 'נדחתה הבקשה'].forEach(function(e) {
			var cnt = c.expertInField[e] || 0;
			html += kpiCard(e, cnt, 'expertInField', e, expColors[e] || 'var(--gray-500)');
		});
		// Separator
		html += '<div style="width:1px;background:var(--gray-200);margin:0 4px;"></div>';
		// Certified Lecturer KPI
		var certCnt = c.isCertifiedLecturer['מוסב'] || 0;
		html += kpiCard('מוסב', certCnt, 'isCertifiedLecturer', 'מוסב', 'var(--info, #0891b2)');
		html += '</div>';
		// Active filter indicator
		if (active) {
			html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;padding:8px 12px;background:var(--primary, #2563eb);color:#fff;border-radius:var(--border-radius);font-size:13px;">';
			html += '<span>🔍 מסנן פעיל: <strong>' + escAttr(active.value) + '</strong></span>';
			html += '<button onclick="App._mentorSetKpiFilter(null, null)" style="background:rgba(255,255,255,0.2);color:#fff;border:1px solid rgba(255,255,255,0.4);border-radius:6px;padding:4px 12px;cursor:pointer;font-size:12px;">✕ נקה סינון</button>';
			html += '</div>';
		}
		return html;
	}

	function _mentorSetKpiFilter(field, value) {
		if (!field) { _mentorKpiFilter = null; }
		else if (_mentorKpiFilter && _mentorKpiFilter.field === field && _mentorKpiFilter.value === value) { _mentorKpiFilter = null; }
		else { _mentorKpiFilter = { field: field, value: value }; }
		filterMentors();
	}

	async function renderMentors() {
		var container = document.getElementById('section-instructors');
		if (!container) return;

		var items = DataStore.getAll(DataStore.KEYS.MENTORS);
		if (!items || items.length === 0) {
			container.innerHTML = `
				<div class="card"><div class="card-body" style="text-align:center;padding:48px;">
					<div style="margin:0 auto 16px;width:36px;height:36px;border:3px solid #f3f3f3;border-top:3px solid var(--primary,#0ca7aa);border-radius:50%;animation:spin 1s linear infinite;"></div>
					<p style="font-size:16px;color:var(--gray-600,#555);">⏳ טוען מאגר מרצים מהשרת...</p>
				</div></div>`;
			await DataStore.ensureLoaded(DataStore.KEYS.MENTORS);
			items = DataStore.getAll(DataStore.KEYS.MENTORS) || [];
		}
		
		// שימוש ברכיבים הגנריים של המערכת כדי לקבל את כל כפתורי הפעולה (ייבוא, ייצוא אקסל, הדפסה, מחיקה)
		var headerHtml = _lookupTableHeader('מאגר מרצים', items.length, '👨‍🏫');
		var actionBarHtml = _buildActionBar('mentors', 'App.openMentorModal()', 'App.clearAllMentors()', items.length);
		
		container.innerHTML = `
			${headerHtml}
			<div class="card"><div class="card-body">
				${actionBarHtml}
				<div class="toolbar">
					<input type="text" class="search-input" id="mentorSearch" placeholder="🔍 חיפוש לפי שם, ת.ז., טלפון או דוא\"ל..." oninput="App.filterMentors()">
					${_colVisBtnHtml('mentors')}
				</div>
				<div id="mentorsTableDiv">${_renderMentorsTable(items)}</div>
			</div></div>`;
		
		// הפעלת תכונות טבלה מתקדמות (דפדוף והסתרת עמודות)
		_applyTableFeatures('mentors');
	}

	function filterMentors() {
		const search = document.getElementById('mentorSearch').value.toLowerCase();
		let items = DataStore.getAll(DataStore.KEYS.MENTORS) || [];
		if (search) items = items.filter(m => (m.fullNameHe||m.fullName||'').toLowerCase().includes(search) || (m.fullNameAr||'').toLowerCase().includes(search) || (m.idNumber||'').includes(search) || (m.email||'').toLowerCase().includes(search) || (m.phone||'').includes(search));
		
		// Apply KPI filter
		if (_mentorKpiFilter) {
			var f = _mentorKpiFilter;
			items = items.filter(function(m) {
				if (f.field === 'lecturerStatus') return (m.lecturerStatus || '') === f.value;
				if (f.field === 'expertInField') return (m.expertInField || '') === f.value;
				if (f.field === 'isCertifiedLecturer') return (m.isCertifiedLecturer || '') === f.value;
				return true;
			});
		}
		_resetPagination('mentors');
		document.getElementById('mentorsTableDiv').innerHTML = _renderMentorsTable(items);
		_applyTableFeatures('mentors');
	}

	function _renderMentorsTable(items) {
		if (!items.length) return '<div class="empty-state"><div class="empty-icon">👨‍🏫</div><h3>אין מרצים במאגר</h3><p style="color:var(--gray-500);">הוסף מרצה חדש כדי להתח manage את המאגר</p><button class="btn btn-primary" onclick="App.openMentorModal()">➕ הוסף מרצה</button></div>';
		
		var html = '<div class="table-wrapper" style="box-shadow:none;"><table class="data-table"><thead><tr><th>ת.ז.</th><th>שם מרצה (עברית)</th><th>שם מרצה (ערבית)</th><th>טלפון</th><th>דוא"ל</th><th>סטטוס</th><th>פעולות</th></tr></thead><tbody>';
		items.forEach(function(m) {
			html += '<tr>' +
				'<td style="direction:ltr;white-space:nowrap;">' + (m.idNumber || '—') + '</td>' +
				'<td><strong>' + (m.fullNameHe || m.fullName || '—') + '</strong></td>' +
				'<td style="direction:rtl;">' + (m.fullNameAr || '—') + '</td>' +
				'<td style="direction:ltr;">' + (m.phone || '—') + '</td>' +
				'<td style="direction:ltr;">' + (m.email || '—') + '</td>' +
				'<td>' + (m.lecturerStatus ? getStatusBadge(m.lecturerStatus) : '—') + '</td>' +
				'<td><div style="display:flex;gap:4px;">' +
					'<button class="btn btn-outline btn-sm" onclick="App.openMentorModal(\'' + m.id + '\')" title="עריכה">✏️</button>' +
					'<button class="btn btn-danger btn-sm" onclick="App.deleteMentor(\'' + m.id + '\')" title="מחיקה">🗑️</button>' +
				'</div></td>' +
			'</tr>';
		});
		html += '</tbody></table></div>';
		return html;
	}

    function _mentorSelectOpts(options, selected) {
        var html = '<option value="">בחר</option>';
        var hasSel = false;
        options.forEach(function(o) {
            var sel = (o === selected) ? ' selected' : '';
            if (sel) hasSel = true;
            html += '<option value="' + escAttr(o) + '"' + sel + '>' + escAttr(o) + '</option>';
        });
        if (selected && !hasSel) {
            html += '<option value="' + escAttr(selected) + '" selected>' + escAttr(selected) + '</option>';
        }
        return html;
    }

    function openMentorModal(id = null) {
        const m = id ? DataStore.getById(DataStore.KEYS.MENTORS, id) : null;
        editingItem = m;
        showModal(m ? 'עריכת מרצה' : 'הוספת מרצה חדש', `
            <div class="form-grid">
                <div class="form-group"><label>ת.ז. מרצה *</label><input type="text" id="fMId" class="form-input" value="${m ? m.idNumber || '' : ''}" placeholder="מספר זהות" style="direction:ltr;text-align:right;" required></div>
                <div class="form-group"><label>שם מרצה (עברית) *</label><input type="text" id="fMNameHe" class="form-input" value="${m ? (m.fullNameHe || m.fullName || '') : ''}" required></div>
                <div class="form-group"><label>שם מרצה (ערבית)</label><input type="text" id="fMNameAr" class="form-input" value="${m ? (m.fullNameAr || '') : ''}" placeholder="יישאר ריק אם לא קיים תרגום"></div>
                <div class="form-group"><label>טלפון נייד</label><input type="tel" id="fMPhone" class="form-input" value="${m ? m.phone || '' : ''}" placeholder="050-0000000" style="direction:ltr;text-align:right;" oninput="App._formatPhoneInput(this)"></div>
                <div class="form-group"><label>דוא"ל</label><input type="email" id="fMEmail" class="form-input" value="${m ? m.email || '' : ''}" placeholder="example@mail.com"></div>
                <div class="form-group"><label>מרצה מוסב</label><select id="fMCertified" class="form-select"><option value="">לא צוין</option>${getLookupOptions(DataStore.KEYS.LOOKUP_CERTIFIED_LECTURER, m ? m.isCertifiedLecturer : '')}</select></div>
                <div class="form-group"><label>מומחה בתחומו</label><select id="fMExpert" class="form-select"><option value="">לא צוין</option>${getLookupOptions(DataStore.KEYS.LOOKUP_EXPERT_FIELD, m ? m.expertInField : '')}</select></div>
                <div class="form-group"><label>סטטוס</label><select id="fMStatus" class="form-select">${_lecturerStatusOpts(m ? m.lecturerStatus : '')}</select></div>
            </div>`,
        `<button class="btn btn-primary" onclick="App.saveMentor()">${m ? '💾 שמור' : '➕ הוסף'}</button><button class="btn btn-outline" onclick="App.closeModal()">ביטול</button>`);
    }

function saveMentor() {
    const nameHe = document.getElementById('fMNameHe').value.trim();
    const idNum = document.getElementById('fMId').value.trim();
    
    if (!nameHe) { showToast('יש להזין שם מרצה (עברית)', 'error'); return; }
    if (!idNum) { showToast('יש להזין ת.ז. מרצה', 'error'); return; }
    
    // בדיקת ייחודיות ת.ז.
    const existing = DataStore.getAll(DataStore.KEYS.MENTORS) || [];
    const dup = existing.find(function(e) { 
        return e.idNumber === idNum && (!editingItem || e.id !== editingItem.id); 
    });
    if (dup) { showToast('ת.ז. זו כבר קיימת במאגר', 'error'); return; }
    
    // ולידציית טלפון
    const phone = document.getElementById('fMPhone').value.trim();
    if (phone && !/^05[0-9]-\d{7}$/.test(phone)) { 
        showToast('מספר טלפון לא תקין. הפורמט הנכון: 05X-XXXXXXX (למשל 050-1234567)', 'error'); 
        return; 
    }
    
    // ולידציית דוא"ל
    const email = document.getElementById('fMEmail').value.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { 
        showToast('כתובת דוא"ל לא תקינה', 'error'); 
        return; 
    }
    
    const nameAr = document.getElementById('fMNameAr').value.trim();
    const isCertifiedVal = document.getElementById('fMCertified').value;
    const isExpertVal = document.getElementById('fMExpert').value;
    const lecturerStatus = document.getElementById('fMStatus').value;
    
    // 🔑 התיקון הקריטי: הוספת שדה 'id' לאובייקט הנתונים כדי ש-DataStore יצליח לשמור ל-JSON
    const data = {
        id: editingItem ? editingItem.id : idNum, // <-- זה השדה שחסר וגרם לכשל בשמירה!
        idNumber: idNum,
        fullNameHe: nameHe,
        fullNameAr: nameAr || '',
        phone: phone,
        email: email,
        isCertifiedLecturer: isCertifiedVal || null,
        expertInField: isExpertVal || null,
        lecturerStatus: lecturerStatus || null,
        performerType: editingItem ? (editingItem.performerType || '') : '',
        organization: editingItem ? (editingItem.organization || '') : '',
        updatedAt: new Date().toISOString()
    };
    
    // לוג לבדיקה שהנתונים אכן נשלחים כראוי
    console.log('💾 [Mentor Save] שומר נתונים למאגר:', data);

    if (editingItem) { 
        DataStore.update(DataStore.KEYS.MENTORS, editingItem.id, data); 
        showToast('המרצה עודכן בהצלחה', 'success'); 
    } else { 
        DataStore.create(DataStore.KEYS.MENTORS, data); 
        showToast('המרצה נוסף בהצלחה', 'success'); 
    }
    
    editingItem = null; 
    closeModal(); 
    renderMentors();
}

    function deleteMentor(id) { confirmDialog('למחוק מרצה?', () => { _moveToRecycleBin(DataStore.KEYS.MENTORS, id); showToast('נמחק', 'success'); renderMentors(); }); }

    function clearAllMentors() {
        const items = DataStore.getAll(DataStore.KEYS.MENTORS) || [];
        if (!items.length) return;
        confirmDialog(`למחוק את כל ${items.length} המרצים?`, () => {
            DataStore.saveAll(DataStore.KEYS.MENTORS, []);
            showToast('כל המרצים נמחקו', 'success');
            renderMentors();
        });
    }

    // ================================================================
    //  GUIDES (ניהול משתמשים)
    // ================================================================
    function renderGuides() {
        const users = Auth.getAllUsers();
        const roles = Auth.getAllRoles ? Auth.getAllRoles() : [];
        document.getElementById('section-guides').innerHTML = `
            ${_lookupTableHeader('ניהול משתמשים', users.length, '🧑\u200d🏫')}
            <div class="card"><div class="card-body">
                ${_buildActionBar('users', 'App.openUserModal()')}
                <div class="toolbar">${_colVisBtnHtml('users')}</div>
                <div class="table-wrapper" style="box-shadow:none;"><table class="data-table"><thead><tr><th>שם</th><th>שם משתמש</th><th>תפקיד</th><th>דוא"ל</th><th>פעולות</th></tr></thead><tbody>
                ${users.map(u => `<tr>
                    <td><strong>${u.fullName}</strong></td><td style="direction:ltr">${u.username}</td>
                    <td>${Auth.getRoleBadge(u.role)}</td>
                    <td>${u.email || '—'}</td>
                    <td><div style="display:flex;gap:4px;">
                        <button class="btn btn-outline btn-sm" onclick="App.openUserModal('${u.id}')" title="עריכה">✏️</button>
                        <button class="btn btn-danger btn-sm" onclick="App.deleteUser('${u.id}')" title="מחיקה">🗑️</button>
                        <button class="btn btn-outline btn-sm" onclick="App.resetUserPassword('${u.id}')" title="איפוס סיסמה">🔑</button>
                    </div></td>
                </tr>`).join('')}</tbody></table></div>
            </div></div>`;
        _applyTableFeatures('users');
    }

    function openUserModal(id = null) {
        const u = id ? DataStore.getById(DataStore.KEYS.USERS, id) : null;
        editingItem = u;
        const roles = Auth.getAllRoles ? Auth.getAllRoles() : [];
        const roleOpts = roles.map(r => `<option value="${r.value}" ${u && u.role === r.value ? 'selected' : ''}>${r.label}</option>`).join('');
        showModal(u ? 'עריכת משתמש' : 'משתמש חדש', `
            <div class="form-grid">
                <div class="form-group"><label>שם מלא *</label><input type="text" id="fUName" class="form-input" value="${u ? u.fullName : ''}" required></div>
                <div class="form-group"><label>שם משתמש *</label><input type="text" id="fUUser" class="form-input" value="${u ? u.username : ''}" required></div>
                <div class="form-group"><label>סיסמה ${u ? '(ריק=שמירת קיימת)' : '*'}</label><input type="password" id="fUPass" class="form-input" ${u ? '' : 'required'}></div>
                <div class="form-group"><label>דוא"ל</label><input type="email" id="fUEmail" class="form-input" value="${u ? u.email || '' : ''}"></div>
                <div class="form-group"><label>תפקיד</label><select id="fURole" class="form-select">${roleOpts}</select></div>
            </div>`,
        `<button class="btn btn-primary" onclick="App.saveUser()">${u ? '💾 שמור' : '➕ צור'}</button><button class="btn btn-outline" onclick="App.closeModal()">ביטול</button>`);
    }

    function saveUser() {
        const fullName = document.getElementById('fUName').value.trim();
        const username = document.getElementById('fUUser').value.trim();
        const password = document.getElementById('fUPass').value;
        if (!fullName || !username) { showToast('יש להזין שם ושם משתמש', 'error'); return; }
        if (editingItem) {
            const updates = { fullName, username, email: document.getElementById('fUEmail').value.trim(), role: document.getElementById('fURole').value };
            if (password) updates.password = password;
            DataStore.update(DataStore.KEYS.USERS, editingItem.id, updates);
            showToast('המשתמש עודכן', 'success');
        } else {
            if (!password) { showToast('יש להזין סיסמה', 'error'); return; }
            const result = Auth.createUser({ fullName, username, password, email: document.getElementById('fUEmail').value.trim(), role: document.getElementById('fURole').value });
            if (!result.success) { showToast(result.message, 'error'); return; }
            showToast('המשתמש נוצר', 'success');
        }
        editingItem = null; closeModal(); renderGuides();
    }

    function deleteUser(id) { const r = Auth.deleteUser(id); if (!r.success) { showToast(r.message, 'error'); return; } showToast('נמחק', 'success'); renderGuides(); }

    // ================================================================
    //  GUIDES REPO (מאגר מדריכים)
    // ================================================================
    function renderGuidesRepo() {
        const items = ((DataStore.getAll(DataStore.KEYS.GUIDES_REPO) || []).slice()).sort((a,b) => (a.order||0) - (b.order||0));
        document.getElementById('section-guides-repo').innerHTML =
            _lookupTableHeader('מאגר מדריכים', items.length) +
            _buildActionBar('guides_repo', 'App.openGuideRepoModal()', 'App.clearAllGuidesRepo()', items.length) +
            `<div class="toolbar"><input type="text" class="search-input" id="guideRepoSearch" placeholder="🔍 חיפוש לפי שם, ת.ז., תפקיד..." oninput="App.filterGuidesRepo()">${_colVisBtnHtml('guides_repo')}</div>
            <div id="guidesRepoTableDiv">${_renderGuidesRepoTable(items)}</div>`;
        _applyTableFeatures('guides_repo');
    }

    function _renderGuidesRepoTable(items) {
        if (!items.length) return `<div class="empty-state"><div class="empty-icon">📋</div><h3>אין מדריכים</h3><button class="btn btn-primary" onclick="App.openGuideRepoModal()">➕ הוסף מדריך</button></div>`;
        return `<div class="table-wrapper" style="box-shadow:none;"><table class="data-table"><thead><tr><th>סדר</th><th>תמונה</th><th>ת.ז.</th><th>שם מלא (עברית)</th><th>שם מלא (ערבית)</th><th>תפקיד</th><th>טלפון</th><th>דוא"ל</th><th>תחומי התמחות</th><th>פעולות</th></tr></thead><tbody>
        ${items.map((g, idx) => {
            const upBtn = idx > 0 ? `<button class="btn btn-outline btn-sm" onclick="App.moveGuideRepo('${g.id}','up')" style="padding:2px 8px;font-size:13px;line-height:1;" title="הזז למעלה">▲</button>` : '<span style="display:inline-block;width:28px;"></span>';
            const downBtn = idx < items.length - 1 ? `<button class="btn btn-outline btn-sm" onclick="App.moveGuideRepo('${g.id}','down')" style="padding:2px 8px;font-size:13px;line-height:1;" title="הזז למטה">▼</button>` : '<span style="display:inline-block;width:28px;"></span>';
            return `<tr>
            <td><div style="display:flex;gap:2px;align-items:center;">${upBtn}${downBtn}</div></td>
            <td>${(g.avatar_thumb || g.profileImage) ? `<img src="${_getGuideThumb(g)}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:2px solid var(--gray-200);">` : '<div style="width:40px;height:40px;border-radius:50%;background:var(--primary-bg);display:flex;align-items:center;justify-content:center;font-size:18px;">👤</div>'}</td>
            <td style="direction:ltr;white-space:nowrap;">${g.idNumber || '—'}</td>
            <td><strong>${g.fullName || '—'}</strong></td>
            <td style="direction:rtl">${g.fullNameAr || '—'}</td>
            <td>${g.position ? `<div style="max-width:160px;white-space:pre-wrap;word-break:break-word;">${g.position}</div>` : '—'}</td>
            <td style="direction:ltr;white-space:nowrap;">${g.phone || '—'}</td>
            <td style="direction:ltr;white-space:nowrap;">${g.email || '—'}</td>
            <td>${g.specializations ? `<div style="max-width:160px;white-space:pre-wrap;word-break:break-word;">${g.specializations}</div>` : '—'}</td>
            <td><div style="display:flex;gap:4px;"><button class="btn btn-outline btn-sm" onclick="App.openGuideRepoModal('${g.id}')" title="עריכה">✏️</button><button class="btn btn-danger btn-sm" onclick="App.deleteGuideRepo('${g.id}')" title="מחיקה">🗑️</button></div></td>
        </tr>`;}).join('')}</tbody></table></div>`;
    }

    function filterGuidesRepo() {
        const search = document.getElementById('guideRepoSearch').value.toLowerCase();
        let items = ((DataStore.getAll(DataStore.KEYS.GUIDES_REPO) || []).slice()).sort((a,b) => (a.order||0) - (b.order||0));
        if (search) items = items.filter(g => (g.fullName||'').toLowerCase().includes(search) || (g.fullNameAr||'').toLowerCase().includes(search) || (g.idNumber||'').includes(search) || (g.position||'').toLowerCase().includes(search) || (g.email||'').toLowerCase().includes(search) || (g.specializations||'').toLowerCase().includes(search));
        _resetPagination('guides_repo');
        document.getElementById('guidesRepoTableDiv').innerHTML = _renderGuidesRepoTable(items);
        _applyTableFeatures('guides_repo');
    }

    function openGuideRepoModal(id = null) {
        const g = id ? DataStore.getById(DataStore.KEYS.GUIDES_REPO, id) : null;
        editingItem = g;
        const existingImg = g ? _getGuideRetina(g) : '';
        showModal(g ? 'עריכת מדריך' : 'הוספת מדריך חדש', `
            <div style="display:flex;flex-direction:column;align-items:center;margin-bottom:16px;">
                <div id="guideImgPreview" style="width:80px;height:80px;border-radius:50%;background:var(--gray-100);display:flex;align-items:center;justify-content:center;font-size:36px;overflow:hidden;border:3px solid var(--primary-bg);margin-bottom:8px;cursor:pointer;" onclick="document.getElementById('fGRImage').click();">
                    ${existingImg ? `<img src="${existingImg}" style="width:100%;height:100%;object-fit:cover;">` : '👤'}
                </div>
                <label style="font-size:12px;color:var(--gray-500);cursor:pointer;" onclick="document.getElementById('fGRImage').click();">לחץ להעלאת תמונה</label>
                <input type="file" id="fGRImage" accept="image/*" style="display:none;" onchange="App._previewGuideImage(this)">
            </div>
            <div class="form-grid">
                <div class="form-group"><label>ת.ז. *</label><input type="text" id="fGRId" class="form-input" value="${g ? g.idNumber || '' : ''}" dir="ltr"></div>
                <div class="form-group"><label>שם מלא בעברית *</label><input type="text" id="fGRName" class="form-input" value="${g ? escAttr(g.fullName) : ''}" required></div>
                <div class="form-group"><label>שם מלא בערבית</label><input type="text" id="fGRNameAr" class="form-input" value="${g ? escAttr(g.fullNameAr || '') : ''}"></div>
                <div class="form-group" style="grid-column:1/-1;"><label>תפקיד</label><textarea id="fGRPos" class="form-input" rows="2" placeholder="ניתן להזין טקסט עם שורות...">${g ? escAttr(g.position || '') : ''}</textarea></div>
                <div class="form-group"><label>טלפון</label><input type="text" id="fGRPhone" class="form-input" value="${g ? g.phone || '' : ''}" dir="ltr"></div>
                <div class="form-group"><label>דוא"ל</label><input type="email" id="fGREmail" class="form-input" value="${g ? g.email || '' : ''}" dir="ltr"></div>
                <div class="form-group" style="grid-column:1/-1;"><label>תחומי התמחות</label><textarea id="fGRSpec" class="form-input" rows="2" placeholder="ניתן להזין טקסט עם שורות...">${g ? escAttr(g.specializations || '') : ''}</textarea></div>
            </div>`,
        `<button class="btn btn-primary" onclick="App.saveGuideRepo()">${g ? '💾 שמור' : '➕ הוסף'}</button><button class="btn btn-outline" onclick="App.closeModal()">ביטול</button>`);
    }

 function _previewGuideImage(input) {
     if (!input.files || !input.files[0]) return;
     const file = input.files[0];
     if (file.size > 10 * 1024 * 1024) { showToast('גודל קובץ מקסימלי: 10MB', 'error'); return; }
     const isPng = file.type === 'image/png';
     const url = URL.createObjectURL(file);
     const img = new Image();
     
     // הצגת אנימציית טעינה
     const preview = document.getElementById('guideImgPreview');
     if (preview) preview.innerHTML = '<div style="font-size:12px;color:var(--gray-500);">מעלה תמונה...</div>';

     img.onload = function() {
         try {
             function _resizeToDataUrl(maxSize, jpegQuality) {
                 const canvas = document.createElement('canvas');
                 const scaleFactor = Math.min(maxSize / img.width, maxSize / img.height, 1);
                 const w = Math.round(img.width * scaleFactor);
                 const h = Math.round(img.height * scaleFactor);
                 canvas.width = w;
                 canvas.height = h;
                 const ctx = canvas.getContext('2d');
                 ctx.imageSmoothingQuality = 'high';
                 ctx.drawImage(img, 0, 0, w, h);
                 return isPng ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', jpegQuality);
             }
             const thumbDataUrl = _resizeToDataUrl(200, 0.7);
             const retinaDataUrl = _resizeToDataUrl(isPng ? 400 : 800, 0.94);
             
             // הצגה מקדימה מיידית בדפדפן
             if (preview) preview.innerHTML = `<img src="${retinaDataUrl}" style="width:100%;height:100%;object-fit:cover;">`;

             // 🔑 זיהוי המדריך (אם בעריכה) או יצירת מזהה זמני
             const guideId = (editingItem && editingItem.id) ? editingItem.id : ('new_' + Date.now());

             // 🔑 העלאת תמונת ה-Retina לשרת
             fetch('./api/upload-guide-image.php', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ image: retinaDataUrl, guideId: guideId, type: 'retina' })
             }).then(r => r.json()).then(data => {
                 if (data.success) {
                     input.dataset.retinaUrl = data.url;
                     input.dataset.profileUrl = data.url; // שמירה גם כפרופיל ראשי
                 } else {
                     console.error('Upload retina failed:', data.error);
                     showToast('שגיאה בהעלאת תמונה לשרת', 'error');
                 }
             }).catch(err => console.error('Upload error:', err));

             // 🔑 העלאת תמונת ה-Thumb לשרת
             fetch('./api/upload-guide-image.php', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ image: thumbDataUrl, guideId: guideId, type: 'thumb' })
             }).then(r => r.json()).then(data => {
                 if (data.success) {
                     input.dataset.thumbUrl = data.url;
                 } else {
                     console.error('Upload thumb failed:', data.error);
                 }
             }).catch(err => console.error('Upload error:', err));

         } catch (e) {
             console.error('[GuideImage] Processing error:', e);
             showToast('שגיאה בעיבוד התמונה', 'error');
         } finally {
             URL.revokeObjectURL(url);
         }
     };
     img.onerror = function() { URL.revokeObjectURL(url); showToast('שגיאה בטעינת התמונה', 'error'); };
     img.src = url;
 }

 function saveGuideRepo() {
     const name = document.getElementById('fGRName').value.trim();
     if (!name) { showToast('יש להזין שם בעברית', 'error'); return; }
     
     const imgInput = document.getElementById('fGRImage');
     // 🔑 קריאת נתיבי הקבצים החדשים מהשרת (במקום Base64)
     const newThumbUrl = imgInput && imgInput.dataset.thumbUrl ? imgInput.dataset.thumbUrl : null;
     const newRetinaUrl = imgInput && imgInput.dataset.retinaUrl ? imgInput.dataset.retinaUrl : null;
     const newProfileUrl = imgInput && imgInput.dataset.profileUrl ? imgInput.dataset.profileUrl : null;

     const data = {
         idNumber: document.getElementById('fGRId').value.trim(),
         fullName: name,
         fullNameAr: document.getElementById('fGRNameAr').value.trim(),
         position: document.getElementById('fGRPos').value.trim(),
         phone: document.getElementById('fGRPhone').value.trim(),
         email: document.getElementById('fGREmail').value.trim(),
         specializations: document.getElementById('fGRSpec').value.trim()
     };

     // טיפול בתמונת פרופיל: אם הועלתה תמונה חדשה, שמור את הנתיב. אחרת, שמור את הנתיב הקיים.
     if (newThumbUrl) {
         data.avatar_thumb = newThumbUrl;
         data.avatar_retina = newRetinaUrl || newThumbUrl;
         data.profileImage = newProfileUrl || newRetinaUrl || newThumbUrl;
     } else if (editingItem) {
         // שמירה על תמונות קיימות (תמיכה גם ב-Base64 ישן וגם ב-URL חדש)
         if (editingItem.avatar_thumb) data.avatar_thumb = editingItem.avatar_thumb;
         if (editingItem.avatar_retina) data.avatar_retina = editingItem.avatar_retina;
         if (editingItem.profileImage) data.profileImage = editingItem.profileImage;
     }

     try {
         if (editingItem) { 
             DataStore.update(DataStore.KEYS.GUIDES_REPO, editingItem.id, data); 
             showToast('המדריך עודכן', 'success'); 
         } else {
             const existing = DataStore.getAll(DataStore.KEYS.GUIDES_REPO) || [];
             const maxOrder = existing.reduce((max, g) => Math.max(max, g.order || 0), 0);
             data.order = maxOrder + 1;
             DataStore.create(DataStore.KEYS.GUIDES_REPO, data); 
             showToast('המדריך נוסף', 'success'); 
         }
         editingItem = null; 
         closeModal(); 
         renderGuidesRepo();
     } catch (e) {
         console.error('[GuideRepo] Save error:', e);
         showToast('שגיאה בשמירת המדריך', 'error');
     }
 }
 
    function deleteGuideRepo(id) { confirmDialog('למחוק מדריך?', () => { _moveToRecycleBin(DataStore.KEYS.GUIDES_REPO, id); showToast('נמחק', 'success'); renderGuidesRepo(); }); }

    function clearAllGuidesRepo() {
        const items = DataStore.getAll(DataStore.KEYS.GUIDES_REPO) || [];
        if (!items.length) return;
        confirmDialog(`למחוק את כל ${items.length} המדריכים?`, () => {
            DataStore.saveAll(DataStore.KEYS.GUIDES_REPO, []);
            showToast('כל המדריכים נמחקו', 'success');
            renderGuidesRepo();
        });
    }

    function moveGuideRepo(id, direction) {
        const all = DataStore.getAll(DataStore.KEYS.GUIDES_REPO) || [];
        // Ensure every item has an order value
        const needsInit = all.some(g => !g.order && g.order !== 0);
        if (needsInit) {
            all.slice().sort((a,b) => {
                const ta = a.createdAt || '', tb = b.createdAt || '';
                return ta < tb ? -1 : ta > tb ? 1 : 0;
            }).forEach((g, i) => {
                if (!g.order && g.order !== 0) {
                    DataStore.update(DataStore.KEYS.GUIDES_REPO, g.id, { order: i + 1 });
                }
            });
        }
        const sorted = (DataStore.getAll(DataStore.KEYS.GUIDES_REPO) || []).slice().sort((a,b) => (a.order||0) - (b.order||0));
        const idx = sorted.findIndex(g => g.id === id);
        if (idx < 0) return;
        let targetIdx;
        if (direction === 'up' && idx > 0) targetIdx = idx - 1;
        else if (direction === 'down' && idx < sorted.length - 1) targetIdx = idx + 1;
        else return;
        const itemA = sorted[idx];
        const itemB = sorted[targetIdx];
        const tempOrder = itemA.order || 0;
        DataStore.update(DataStore.KEYS.GUIDES_REPO, itemA.id, { order: itemB.order || 0 });
        DataStore.update(DataStore.KEYS.GUIDES_REPO, itemB.id, { order: tempOrder });
        renderGuidesRepo();
    }

    // ================================================================
    //  HOMEPAGE (דף שער)
    // ================================================================

	function renderHomepage() {
		// 1. Define 'hp' safely at the very top to prevent "hp is not defined" errors
		const hp = DataStore.getHomepage() || {};
		const container = document.getElementById('section-homepage');
		if (!container) return;

		// Destroy any existing TinyMCE editor before re-rendering
		if (typeof tinymce !== 'undefined' && typeof _hpTinyMCEInit !== 'undefined' && _hpTinyMCEInit) {
			try {
				var existingEditor = tinymce.get('hpMainRich');
				if (existingEditor) {
					existingEditor.save();
					existingEditor.destroy();
				}
			} catch(e) { console.error('[Homepage] Error destroying editor on re-render:', e); }
			_hpTinyMCEInit = false;
		}

		container.innerHTML = `
			${typeof _lookupTableHeader === 'function' ? _lookupTableHeader('ניהול דף שער', 1) : '<h2>ניהול דף שער</h2>'}
			<div style="display:flex;flex-direction:column;gap:24px;">

				<!-- Card 1: Header Section (UPDATED with Banner & Display Mode) -->
				<div class="card">
					<div class="card-header"><span class="card-title">🖼️ כותרת עליונה (לוגו + שם אתר / באנר)</span></div>
					<div class="card-body">
						<div style="display:flex;flex-direction:column;gap:16px;">
							<!-- Display Mode Selector -->
							<div>
								<label style="font-weight:600;margin-bottom:4px;display:block;">מה להציג ב-Header של דף הבית</label>
								<select id="hpDisplayMode" class="form-input" style="max-width: 400px;">
									<option value="logo" ${(hp.displayMode || 'logo') === 'logo' ? 'selected' : ''}>לוגו + שם אתר (ברירת מחדל)</option>
									<option value="banner" ${hp.displayMode === 'banner' ? 'selected' : ''}>באנר (תמונה רחבה מעוצבת)</option>
								</select>
							</div>

							<div style="display:flex;gap:24px;align-items:flex-start;flex-wrap:wrap;">
								<!-- Logo Section -->
								<div style="text-align:center;">
									<div style="font-weight:600;margin-bottom:8px;">לוגו האתר</div>
									<div id="hpLogoPreview" style="width:100px;height:100px;border-radius:12px;border:2px dashed var(--border-color);display:flex;align-items:center;justify-content:center;cursor:pointer;overflow:hidden;background:#f8f9fa;" onclick="document.getElementById('hpLogoInput').click()">
										${hp.logo ? `<img src="${hp.logo}" style="width:100%;height:100%;object-fit:cover;">` : '<span style="font-size:40px;">🧭</span>'}
									</div>
									<input type="file" id="hpLogoInput" accept="image/*" style="display:none;" onchange="App._previewHomepageLogo(this)">
									<div style="font-size:12px;color:var(--text-secondary);margin-top:4px;">לחץ להעלאה</div>
								</div>

								<!-- Banner Section -->								<!-- Banner Section -->
								<div style="text-align:center; flex:1; min-width: 250px;">
									<div style="font-weight:600;margin-bottom:8px;">באנר האתר</div>
									<div id="hpBannerPreview" style="width:100%;max-width:400px;height:80px;margin:0 auto;border-radius:12px;border:2px dashed var(--border-color);display:flex;align-items:center;justify-content:center;cursor:pointer;overflow:hidden;background:#f8f9fa;" onclick="document.getElementById('hpBannerInput').click()">
										${hp.banner ? `<img src="${hp.banner}" style="width:100%;height:100%;object-fit:contain;">` : '<span style="font-size:24px;">🖼️</span>'}
									</div>
									<input type="file" id="hpBannerInput" accept="image/*" style="display:none;" onchange="App._previewHomepageBanner(this)">
									<div style="font-size:12px;color:var(--text-secondary);margin-top:4px;">לחץ להעלאה</div>
								</div>

								<!-- Site Names Section -->
								<div style="flex:1;min-width:250px;display:flex;flex-direction:column;gap:12px;">
									<div>
										<label style="font-weight:600;margin-bottom:4px;display:block;">שם האתר (עברית)</label>
										<input type="text" id="hpSiteNameHe" class="form-input" value="${escAttr((hp.siteName && hp.siteName.he) ? hp.siteName.he : '')}" placeholder="שם האתר בעברית">
									</div>
									<div>
										<label style="font-weight:600;margin-bottom:4px;display:block;">שם האתר (ערבית)</label>
										<input type="text" id="hpSiteNameAr" class="form-input" value="${escAttr((hp.siteName && hp.siteName.ar) ? hp.siteName.ar : '')}" placeholder="اسم الموقع بالعربية" dir="rtl">
									</div>
									<button class="btn btn-primary" onclick="App._saveHomepageHeader()" style="align-self:flex-start;">💾 שמור כותרת</button>
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Card 2: Navigation Bar (ORIGINAL) -->
				<div class="card">
					<div class="card-header" style="display:flex;justify-content:space-between;align-items:center;">
						<span class="card-title">🧭 סרגל ניווט</span>
						<button class="btn btn-primary btn-sm" onclick="App.openHomepageNavModal()">➕ הוסף פריט</button>
					</div>
					<div class="card-body" style="overflow-x:auto;">
						${typeof _renderHomepageNavTable === 'function' ? _renderHomepageNavTable(hp) : ''}
					</div>
				</div>

				<!-- Card 3: Sidebar Items (ORIGINAL) -->
				<div class="card">
					<div class="card-header" style="display:flex;justify-content:space-between;align-items:center;">
						<span class="card-title">📌 תוכן צדדי (Sidebar)</span>
						<button class="btn btn-primary btn-sm" onclick="App.openHomepageSidebarModal()">➕ הוסף פריט</button>
					</div>
					<div class="card-body" style="overflow-x:auto;">
						${typeof _renderHomepageSidebarTable === 'function' ? _renderHomepageSidebarTable(hp) : ''}
					</div>
				</div>

				<!-- Card 4: Main Content (ORIGINAL) -->
				<div class="card">
					<div class="card-header"><span class="card-title">📝 תוכן מרכזי (עברי וערבי מאוחד)</span></div>
					<div class="card-body">
						<div style="display:flex;flex-direction:column;gap:12px;">
							<div>
								<label style="font-size:13px;color:var(--text-secondary);margin-bottom:4px;display:block;">תוכן עשיר (עברית + ערבית)</label>
								<div class="hp-editor-wrapper" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06);">
									<textarea id="hpMainRich">${escHtml((hp.mainContent && (hp.mainContent.combined || hp.mainContent.he)) ? (hp.mainContent.combined || hp.mainContent.he) : '')}</textarea>
								</div>
							</div>
							<div style="margin-top:16px;text-align:center;">
								<button class="btn btn-primary" onclick="App._saveHomepageContent()">💾 שמור תוכן</button>
								<button class="btn btn-outline" onclick="typeof App._initHpTinyMCE === 'function' ? App._initHpTinyMCE() : ''" style="margin-right:8px;">🔄 אתחל עורך</button>
							</div>
						</div>
					</div>
				</div>

				<!-- Card 5: Footer (ORIGINAL) -->
				<div class="card">
					<div class="card-header"><span class="card-title">🔻 כותרת תחתונה (Footer)</span></div>
					<div class="card-body">
						<div style="display:flex;flex-direction:column;gap:12px;">
							<div>
								<label style="font-weight:600;margin-bottom:4px;display:block;">טקסט עברית</label>
								<textarea id="hpFooterHe" class="form-input" rows="2" placeholder="טקסט footer בעברית...">${escAttr((hp.footerText && hp.footerText.he) ? hp.footerText.he : '')}</textarea>
							</div>
							<div>
								<label style="font-weight:600;margin-bottom:4px;display:block;">טקסט ערבית</label>
								<textarea id="hpFooterAr" class="form-input" rows="2" placeholder="نص التذييل بالعربية..." dir="rtl">${escAttr((hp.footerText && hp.footerText.ar) ? hp.footerText.ar : '')}</textarea>
							</div>
							<button class="btn btn-primary" onclick="App._saveHomepageFooter()" style="align-self:flex-start;">💾 שמור Footer</button>
						</div>
					</div>
				</div>

			</div>

			<style>
				@media (max-width: 768px) {
					#mainContent [style*="grid-template-columns:1fr 1fr"] { grid-template-columns: 1fr !important; }
				}
			</style>
				<!-- Card 5: Footer (ORIGINAL) -->
				<div class="card">
					<div class="card-header"><span class="card-title">🔻 כותרת תחתונה (Footer)</span></div>
					<div class="card-body">
						<div style="display:flex;flex-direction:column;gap:12px;">
							<div>
								<label style="font-weight:600;margin-bottom:4px;display:block;">טקסט עברית</label>
								<textarea id="hpFooterHe" class="form-input" rows="2" placeholder="טקסט footer בעברית...">${escAttr((hp.footerText && hp.footerText.he) ? hp.footerText.he : '')}</textarea>
							</div>
							<div>
								<label style="font-weight:600;margin-bottom:4px;display:block;">טקסט ערבית</label>
								<textarea id="hpFooterAr" class="form-input" rows="2" placeholder="نص التذييل بالعربية..." dir="rtl">${escAttr((hp.footerText && hp.footerText.ar) ? hp.footerText.ar : '')}</textarea>
							</div>
							<button class="btn btn-primary" onclick="App._saveHomepageFooter()" style="align-self:flex-start;">💾 שמור Footer</button>
						</div>
					</div>
				</div>

			</div>

			<style>
				@media (max-width: 768px) {
					#mainContent [style*="grid-template-columns:1fr 1fr"] { grid-template-columns: 1fr !important; }
				}
			</style>
		`; // <-- סיום הזרקת ה-HTML

		// 🔑 הוספה קריטית: אתחול TinyMCE לאחר שה-DOM של דף השער צויר לחלוטין
		setTimeout(() => {
			if (typeof App !== 'undefined' && typeof App._initHpTinyMCE === 'function') {
				App._initHpTinyMCE();
			}
		}, 150); // 150 מילי-שניות נותנות לדפדפן זמן מספיק לרנדר את ה-textarea לפני האתחול
	} // <-- סיום הפונקציה renderHomepage

    function _renderHomepageNavTable(hp) {
        const items = (hp.navItems || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
        if (!items.length) return '<p style="text-align:center;color:var(--text-secondary);padding:20px;">אין פריטי ניווט. לחץ "הוסף פריט" להוספה.</p>';
        let rows = '';
        items.forEach((item, idx) => {
            const canUp = idx > 0;
            const canDown = idx < items.length - 1;
            rows += `<tr>
                <td style="text-align:center;width:60px;">
                    ${canUp ? `<button class="btn btn-sm btn-outline" onclick="App.moveHomepageNavItem('${item.id}','up')" title="למעלה">▲</button>` : ''}
                    ${canDown ? `<button class="btn btn-sm btn-outline" onclick="App.moveHomepageNavItem('${item.id}','down')" title="למטה" style="margin-right:2px;">▼</button>` : ''}
                </td>
                <td>${escAttr(item.labelHe || '')}</td>
                <td dir="rtl">${escAttr(item.labelAr || '')}</td>
                <td style="direction:ltr;text-align:right;"><code style="font-size:12px;">${escAttr(item.url || '')}</code></td>
                <td style="text-align:center;">${item.isActive !== false ? '<span style="color:var(--success);">✅</span>' : '<span style="color:var(--text-secondary);">⬜</span>'}</td>
                <td style="text-align:center;width:100px;">
                    <button class="btn btn-sm btn-outline" onclick="App.openHomepageNavModal('${item.id}')" title="עריכה">✏️</button>
                    <button class="btn btn-sm btn-outline" onclick="App.deleteHomepageNavItem('${item.id}')" title="מחיקה" style="color:var(--danger);">🗑️</button>
                </td>
            </tr>`;
        });
        return `<table class="table">
            <thead><tr>
                <th style="width:60px;">סדר</th>
                <th>תווית עברית</th>
                <th>תווית ערבית</th>
                <th>קישור</th>
                <th style="text-align:center;">פעיל</th>
                <th style="text-align:center;">פעולות</th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
    }

	function _saveHomepageHeader() {
		const nameHe = document.getElementById('hpSiteNameHe').value.trim();
		const nameAr = document.getElementById('hpSiteNameAr').value.trim();
		const displayMode = document.getElementById('hpDisplayMode').value;
		
		const logoInput = document.getElementById('hpLogoInput');
		const newLogo = logoInput && logoInput.dataset.imagedata ? logoInput.dataset.imagedata : null;
		
		const bannerInput = document.getElementById('hpBannerInput');
		const newBanner = bannerInput && bannerInput.dataset.imagedata ? bannerInput.dataset.imagedata : null;

		if (displayMode === 'banner' && !newBanner) {
			showToast('בחרת להציג באנר, אך לא העלית תמונת באנר. אנא העלה באנר או שנה ל"לוגו + שם".', 'warning');
			return;
		}

		const updates = { 
			siteName: { he: nameHe, ar: nameAr },
			displayMode: displayMode
		};
		if (newLogo) updates.logo = newLogo;
		if (newBanner) updates.banner = newBanner;
		
		DataStore.updateHomepage(updates);
		showToast('הכותרת נשמרה', 'success');
		
		setTimeout(function() { 
			if (typeof renderHomepage === 'function') renderHomepage(); 
			if (typeof _initHpTinyMCE === 'function') _initHpTinyMCE(); 
		}, 100);
	}

// ==========================================
// אתחול חסין-תקלות של TinyMCE לדף שער
// ==========================================
function _initHpTinyMCE() {
    if (typeof tinymce === 'undefined') {
        setTimeout(_initHpTinyMCE, 300);
        return;
    }
    const textarea = document.getElementById('hpMainRich');
    if (!textarea) {
        setTimeout(_initHpTinyMCE, 300);
        return;
    }
    if (tinymce.get('hpMainRich')) {
        tinymce.get('hpMainRich').remove();
    }
    tinymce.init({
        selector: '#hpMainRich',
        base_url: './tinymce',
        suffix: '.min',
        height: 500,
        width: '100%',
        directionality: 'rtl',
        language: 'he_IL',
        plugins: 'advlist autolink lists link image charmap preview anchor searchreplace visualblocks code fullscreen insertdatetime media table wordcount help directionality',
        toolbar: 'undo redo | bold italic underline strikethrough | fontfamily fontsize | forecolor backcolor | alignleft aligncenter alignright justify | ltr rtl | bullist numlist | outdent indent | table | link image | hr | removeformat | code | help',
        content_style: 'body { font-family: "Noto Sans Hebrew", "Noto Sans Arabic", "Tajawal", Arial, sans-serif; font-size: 16px; line-height: 1.8; padding: 16px; direction: rtl; }',
        branding: false,
        promotion: false,
        resize: true,
        statusbar: true,
        paste_data_images: true
    });
}

var _nsfTinyMCEInit = false;

function _initNsfTinyMCE() {
    if (typeof tinymce === 'undefined') {
        console.warn('[NewSolution] TinyMCE not loaded yet');
        return;
    }
    if (_nsfTinyMCEInit) {
        try {
            var descEditor = tinymce.get('nsf_desc');
            var notesEditor = tinymce.get('nsf_notes');
            if (descEditor) { descEditor.save(); descEditor.destroy(); }
            if (notesEditor) { notesEditor.save(); notesEditor.destroy(); }
        } catch(e) { console.error('[NewSolution] Error destroying editors:', e); }
        _nsfTinyMCEInit = false;
    }
    try {
        tinymce.init({
            selector: '#nsf_desc',
            base_url: './tinymce',  // 🔑 NEW
            suffix: '.min',         // 🔑 NEW
            readonly: false,
            statistics: false,
            height: 300,
            directionality: 'rtl',
            language: 'he_IL',         // 🔑 UPDATED
            menubar: 'file edit view insert format table tools',
            plugins: 'advlist autolink lists link image charmap print preview anchor searchreplace visualblocks code fullscreen insertdatetime media table wordcount help directionality textcolor', // 🔑 UPDATED: Removed 'paste'
            toolbar: 'undo redo | bold italic underline strikethrough | fontfamily fontsize | forecolor backcolor | alignleft aligncenter alignright justify | ltr rtl | bullist numlist | outdent indent | table | link image | hr | removeformat | code | help',
            content_style: 'body { font-family: Noto Sans Hebrew, Tajawal, Arial, sans-serif; font-size: 15px; line-height: 1.8; padding: 16px; direction: rtl; } img { max-width: 100%; height: auto; } table { border-collapse: collapse; width: 100%; } td, th { border: 1px solid #ddd; padding: 8px; } h1 { font-size: 26px; } h2 { font-size: 22px; } h3 { font-size: 18px; }',
            branding: false,
            promotion: false,
            resize: true,
            statusbar: true,
            paste_data_images: true,
            setup: function(editor) {
                editor.on('init', function() {
                    console.log('[NewSolution] TinyMCE description editor initialized');
                });
            }
        });
        
        tinymce.init({
            selector: '#nsf_notes',
            base_url: './tinymce',  // 🔑 NEW
            suffix: '.min',         // 🔑 NEW
            readonly: false,
            statistics: false,
            height: 200,
            directionality: 'rtl',
            language: 'he_IL',         // 🔑 UPDATED
            menubar: false,
            plugins: 'advlist autolink lists link charmap searchreplace visualblocks code directionality textcolor', // 🔑 UPDATED: Removed 'paste'
            toolbar: 'undo redo | bold italic underline | forecolor backcolor | alignleft aligncenter alignright | bullist numlist | link | removeformat | code',
            content_style: 'body { font-family: Noto Sans Hebrew, Tajawal, Arial, sans-serif; font-size: 14px; line-height: 1.6; padding: 12px; direction: rtl; }',
            branding: false,
            promotion: false,
            resize: true,
            statusbar: true,
            paste_data_images: false,
            setup: function(editor) {
                editor.on('init', function() {
                    _nsfTinyMCEInit = true;
                    console.log('[NewSolution] TinyMCE initialized successfully');
                });
            }
        });
    } catch(e) {
        console.error('[NewSolution] Error initializing TinyMCE:', e);
    }
}

    function _saveHomepageContent() {
        // Save editor content before saving
        if (typeof tinymce !== 'undefined') {
            var editor = tinymce.get('hpMainRich');
            if (editor) {
                editor.save();
            }
        }
        var mainRich = document.getElementById('hpMainRich');
        var content = mainRich ? mainRich.value : '';
        DataStore.updateHomepage({
            mainContent: { combined: content, he: content, ar: content }
        });
        showToast('התוכן נשמר', 'success');
    }

    function _saveHomepageFooter() {
        const footerHe = document.getElementById('hpFooterHe').value;
        const footerAr = document.getElementById('hpFooterAr').value;
        DataStore.updateHomepage({ footerText: { he: footerHe, ar: footerAr } });
        showToast('ה-Footer נשמר', 'success');
        // Re-render and re-initialize TinyMCE after a short delay
        setTimeout(function() { renderHomepage(); _initHpTinyMCE(); }, 100);
    }

    function openHomepageNavModal(id) {
        const hp = DataStore.getHomepage();
        const items = hp.navItems || [];
        const item = id ? items.find(i => i.id === id) : null;
        editingItem = item || null;
        const isEdit = !!item;
        const body = `
            <div style="display:flex;flex-direction:column;gap:12px;">
                <div>
                    <label style="font-weight:600;margin-bottom:4px;display:block;">תווית עברית</label>
                    <input type="text" id="fHpNavHe" class="form-input" value="${escAttr(item?.labelHe || '')}" placeholder="תווית בעברית">
                </div>
                <div>
                    <label style="font-weight:600;margin-bottom:4px;display:block;">תווית ערבית</label>
                    <input type="text" id="fHpNavAr" class="form-input" value="${escAttr(item?.labelAr || '')}" placeholder="تسمية بالعربية" dir="rtl">
                </div>
                <div>
                    <label style="font-weight:600;margin-bottom:4px;display:block;">קישור (URL)</label>
                    <input type="text" id="fHpNavUrl" class="form-input" value="${escAttr(item?.url || '')}" placeholder="./page.html" dir="ltr">
                </div>
                <div style="display:flex;align-items:center;gap:8px;">
                    <input type="checkbox" id="fHpNavActive" ${!item || item.isActive !== false ? 'checked' : ''}>
                    <label for="fHpNavActive" style="cursor:pointer;">פעיל</label>
                </div>
            </div>
        `;
        const footer = `<button class="btn btn-primary" onclick="App.saveHomepageNavItem()">${isEdit ? '💾 שמור' : '➕ הוסף'}</button>
            <button class="btn btn-outline" onclick="App.closeModal()">ביטול</button>`;
        showModal(isEdit ? 'עריכת פריט ניווט' : 'הוספת פריט ניווט', body, footer);
    }

    function saveHomepageNavItem() {
        const labelHe = document.getElementById('fHpNavHe').value.trim();
        if (!labelHe) { showToast('יש להזין תווית בעברית', 'error'); return; }
        const labelAr = document.getElementById('fHpNavAr').value.trim();
        const url = document.getElementById('fHpNavUrl').value.trim();
        const isActive = document.getElementById('fHpNavActive').checked;
        const hp = DataStore.getHomepage();
        let items = (hp.navItems || []).slice();
        if (editingItem) {
            const idx = items.findIndex(i => i.id === editingItem.id);
            if (idx >= 0) {
                items[idx] = { ...items[idx], labelHe, labelAr, url, isActive };
            }
            showToast('פריט הניווט עודכן', 'success');
        } else {
            const maxOrder = items.reduce((max, i) => Math.max(max, i.order || 0), 0);
            items.push({ id: 'hpnav_' + Date.now(), labelHe, labelAr, url, order: maxOrder + 1, isActive });
            showToast('פריט ניווט נוסף', 'success');
        }
        editingItem = null;
        closeModal();
        DataStore.updateHomepage({ navItems: items });
        // Re-render and re-initialize TinyMCE after a short delay
        setTimeout(function() { renderHomepage(); _initHpTinyMCE(); }, 100);
    }

    function deleteHomepageNavItem(id) {
        confirmDialog('למחוק פריט ניווט?', () => {
            const hp = DataStore.getHomepage();
            const items = (hp.navItems || []).filter(i => i.id !== id);
            DataStore.updateHomepage({ navItems: items });
            showToast('פריט הניווט נמחק', 'success');
            // Re-render and re-initialize TinyMCE after a short delay
            setTimeout(function() { renderHomepage(); _initHpTinyMCE(); }, 100);
        });
    }

    function moveHomepageNavItem(id, direction) {
        const hp = DataStore.getHomepage();
        let items = (hp.navItems || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
        // Auto-initialize orders if needed
        const needsInit = items.some(i => i.order == null);
        if (needsInit) {
            items.forEach((item, idx) => { item.order = idx + 1; });
        }
        const idx = items.findIndex(i => i.id === id);
        if (idx < 0) return;
        let targetIdx;
        if (direction === 'up' && idx > 0) targetIdx = idx - 1;
        else if (direction === 'down' && idx < items.length - 1) targetIdx = idx + 1;
        else return;
        const itemA = items[idx];
        const itemB = items[targetIdx];
        const tempOrder = itemA.order || 0;
        items[idx].order = itemB.order || 0;
        items[targetIdx].order = tempOrder;
        DataStore.updateHomepage({ navItems: items });
        // Re-render and re-initialize TinyMCE after a short delay
        setTimeout(function() { renderHomepage(); _initHpTinyMCE(); }, 100);
    }

    // ── Sidebar Items CRUD (same pattern as Nav Items) ──
    function _renderHomepageSidebarTable(hp) {
        const items = (hp.sidebarItems || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
        if (!items.length) return '<p style="text-align:center;color:var(--text-secondary);padding:20px;">אין פריטים בתוכן הצדדי. לחץ "הוסף פריט" להוספה.</p>';
        let rows = '';
        items.forEach((item, idx) => {
            const canUp = idx > 0;
            const canDown = idx < items.length - 1;
            rows += `<tr>
                <td style="text-align:center;width:60px;">
                    ${canUp ? `<button class="btn btn-sm btn-outline" onclick="App.moveHomepageSidebarItem('${item.id}','up')" title="למעלה">▲</button>` : ''}
                    ${canDown ? `<button class="btn btn-sm btn-outline" onclick="App.moveHomepageSidebarItem('${item.id}','down')" title="למטה" style="margin-right:2px;">▼</button>` : ''}
                </td>
                <td>${escAttr(item.labelHe || '')}</td>
                <td dir="rtl">${escAttr(item.labelAr || '')}</td>
                <td style="direction:ltr;text-align:right;"><code style="font-size:12px;">${escAttr(item.url || '')}</code></td>
                <td style="text-align:center;">${item.isActive !== false ? '<span style="color:var(--success);">✅</span>' : '<span style="color:var(--text-secondary);">⬜</span>'}</td>
                <td style="text-align:center;width:100px;">
                    <button class="btn btn-sm btn-outline" onclick="App.openHomepageSidebarModal('${item.id}')" title="עריכה">✏️</button>
                    <button class="btn btn-sm btn-outline" onclick="App.deleteHomepageSidebarItem('${item.id}')" title="מחיקה" style="color:var(--danger);">🗑️</button>
                </td>
            </tr>`;
        });
        return `<table class="table">
            <thead><tr>
                <th style="width:60px;">סדר</th>
                <th>תווית עברית</th>
                <th>תווית ערבית</th>
                <th>קישור</th>
                <th style="text-align:center;">פעיל</th>
                <th style="text-align:center;">פעולות</th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
    }

    function openHomepageSidebarModal(id) {
        const hp = DataStore.getHomepage();
        const items = hp.sidebarItems || [];
        const item = id ? items.find(i => i.id === id) : null;
        editingItem = item || null;
        const isEdit = !!item;
        const body = `
            <div style="display:flex;flex-direction:column;gap:12px;">
                <div>
                    <label style="font-weight:600;margin-bottom:4px;display:block;">תווית עברית</label>
                    <input type="text" id="fHpSbHe" class="form-input" value="${escAttr(item?.labelHe || '')}" placeholder="תווית בעברית">
                </div>
                <div>
                    <label style="font-weight:600;margin-bottom:4px;display:block;">תווית ערבית</label>
                    <input type="text" id="fHpSbAr" class="form-input" value="${escAttr(item?.labelAr || '')}" placeholder="تسمية بالعربية" dir="rtl">
                </div>
                <div>
                    <label style="font-weight:600;margin-bottom:4px;display:block;">קישור (URL)</label>
                    <input type="text" id="fHpSbUrl" class="form-input" value="${escAttr(item?.url || '')}" placeholder="./page.html" dir="ltr">
                </div>
                <div style="display:flex;align-items:center;gap:8px;">
                    <input type="checkbox" id="fHpSbActive" ${!item || item.isActive !== false ? 'checked' : ''}>
                    <label for="fHpSbActive" style="cursor:pointer;">פעיל</label>
                </div>
            </div>
        `;
        const footer = `<button class="btn btn-primary" onclick="App.saveHomepageSidebarItem()">${isEdit ? '💾 שמור' : '➕ הוסף'}</button>
            <button class="btn btn-outline" onclick="App.closeModal()">ביטול</button>`;
        showModal(isEdit ? 'עריכת פריט תוכן צדדי' : 'הוספת פריט תוכן צדדי', body, footer);
    }

    function saveHomepageSidebarItem() {
        const labelHe = document.getElementById('fHpSbHe').value.trim();
        if (!labelHe) { showToast('יש להזין תווית בעברית', 'error'); return; }
        const labelAr = document.getElementById('fHpSbAr').value.trim();
        const url = document.getElementById('fHpSbUrl').value.trim();
        const isActive = document.getElementById('fHpSbActive').checked;
        const hp = DataStore.getHomepage();
        let items = (hp.sidebarItems || []).slice();
        if (editingItem) {
            const idx = items.findIndex(i => i.id === editingItem.id);
            if (idx >= 0) {
                items[idx] = { ...items[idx], labelHe, labelAr, url, isActive };
            }
            showToast('פריט התוכן הצדדי עודכן', 'success');
        } else {
            const maxOrder = items.reduce((max, i) => Math.max(max, i.order || 0), 0);
            items.push({ id: 'hpsb_' + Date.now(), labelHe, labelAr, url, order: maxOrder + 1, isActive });
            showToast('פריט תוכן צדדי נוסף', 'success');
        }
        editingItem = null;
        closeModal();
        DataStore.updateHomepage({ sidebarItems: items });
        // Re-render and re-initialize TinyMCE after a short delay
        setTimeout(function() { renderHomepage(); _initHpTinyMCE(); }, 100);
    }

    function deleteHomepageSidebarItem(id) {
        confirmDialog('למחוק פריט תוכן צדדי?', () => {
            const hp = DataStore.getHomepage();
            const items = (hp.sidebarItems || []).filter(i => i.id !== id);
            DataStore.updateHomepage({ sidebarItems: items });
            showToast('פריט התוכן הצדדי נמחק', 'success');
            // Re-render and re-initialize TinyMCE after a short delay
            setTimeout(function() { renderHomepage(); _initHpTinyMCE(); }, 100);
        });
    }

    function moveHomepageSidebarItem(id, direction) {
        const hp = DataStore.getHomepage();
        let items = (hp.sidebarItems || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
        const needsInit = items.some(i => i.order == null);
        if (needsInit) {
            items.forEach((item, idx) => { item.order = idx + 1; });
        }
        const idx = items.findIndex(i => i.id === id);
        if (idx < 0) return;
        let targetIdx;
        if (direction === 'up' && idx > 0) targetIdx = idx - 1;
        else if (direction === 'down' && idx < items.length - 1) targetIdx = idx + 1;
        else return;
        const itemA = items[idx];
        const itemB = items[targetIdx];
        const tempOrder = itemA.order || 0;
        items[idx].order = itemB.order || 0;
        items[targetIdx].order = tempOrder;
        DataStore.updateHomepage({ sidebarItems: items });
        // Re-render and re-initialize TinyMCE after a short delay
        setTimeout(function() { renderHomepage(); _initHpTinyMCE(); }, 100);
    }

    function _previewHomepageLogo(input) {
        if (!input.files || !input.files[0]) return;
        const file = input.files[0];
        if (file.size > 2 * 1024 * 1024) { showToast('גודל קובץ מקסימלי: 2MB', 'error'); return; }
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const maxSize = 200;
                let w = img.width, h = img.height;
                if (w > maxSize || h > maxSize) {
                    if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
                    else { w = Math.round(w * maxSize / h); h = maxSize; }
                }
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                const preview = document.getElementById('hpLogoPreview');
                if (preview) preview.innerHTML = `<img src="${dataUrl}" style="width:100%;height:100%;object-fit:cover;">`;
                input.dataset.imagedata = dataUrl;
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
	
	function _previewHomepageBanner(input) {
		if (!input.files || !input.files[0]) return;
		const file = input.files[0];
		if (file.size > 2 * 1024 * 1024) { showToast('גודל קובץ מקסימלי: 2MB', 'error'); return; }
		const reader = new FileReader();
		reader.onload = function(e) {
			const img = new Image();
			img.onload = function() {
				const canvas = document.createElement('canvas');
				const maxWidth = 1200;
				let w = img.width, h = img.height;
				if (w > maxWidth) {
					h = Math.round(h * maxWidth / w);
					w = maxWidth;
				}
				canvas.width = w; canvas.height = h;
				canvas.getContext('2d').drawImage(img, 0, 0, w, h);
				const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
				const preview = document.getElementById('hpBannerPreview');
				if (preview) preview.innerHTML = `<img src="${dataUrl}" style="width:100%;height:100%;object-fit:cover;">`;
				input.dataset.imagedata = dataUrl;
			};
			img.src = e.target.result;
		};
		reader.readAsDataURL(file);
	}

    // ================================================================
    //  BUDGETS (תקציבים)
    // ================================================================
    function renderBudgets() {
        const allItems = DataStore.getAll(DataStore.KEYS.BUDGETS) || [];
        
        // סינון תקציבים לפי השנה העברית הנבחרת בתפריט העליון (displayPeriod)
        const displayPeriod = AppContext.displayPeriod;
        const displayHebrewYear = displayPeriod ? displayPeriod.hebrewYear : null;
        
        // הצגת תקציבים השייכים לשנה הנבחרת בתפריט העליון
        let items = displayHebrewYear 
            ? allItems.filter(b => b.hebrewYear === displayHebrewYear)
            : allItems;
        
        // עדכון מסנן השנה לערך ברירת מחדל של השנה הנבחרת
        setTimeout(() => {
            const yearFilter = document.getElementById('budgetYearF');
            if (yearFilter && displayHebrewYear && !yearFilter.value) {
                yearFilter.value = displayHebrewYear;
            }
        }, 0);
        
        const totalAmount = items.reduce((s, b) => s + (parseFloat(b.amount) || 0), 0);
        const totalFree = items.reduce((s, b) => s + (parseFloat(b.freeBudgetBalance) || 0), 0);
        const totalPlanning = items.reduce((s, b) => s + (parseFloat(b.planningBalance) || 0), 0);
        const totalManagement = items.reduce((s, b) => s + (parseFloat(b.managementBalance) || 0), 0);
        
        // Calculate KPIs - רק לשנה הנבחרת
        const utilizationRate = totalAmount > 0 ? ((totalAmount - totalFree) / totalAmount * 100).toFixed(1) : 0;
        const avgBudgetPerUnit = (() => {
            const units = {};
            items.forEach(b => { if (b.organizationalUnit) units[b.organizationalUnit] = true; });
            const unitCount = Object.keys(units).length || 1;
            return (totalAmount / unitCount).toLocaleString('he-IL', { maximumFractionDigits: 0 });
        })();
        const knownVsEstimated = (() => {
            const known = items.filter(b => b.estimationStatus === 'ידוע').reduce((s, b) => s + (parseFloat(b.amount) || 0), 0);
            const estimated = items.filter(b => b.estimationStatus === 'משוערך').reduce((s, b) => s + (parseFloat(b.amount) || 0), 0);
            return { known, estimated, total: known + estimated };
        })();
        const budgetForBreakdown = (() => {
            const learning = items.filter(b => b.budgetFor === 'learning_solution').reduce((s, b) => s + (parseFloat(b.amount) || 0), 0);
            const hosting = items.filter(b => b.budgetFor === 'hosting').reduce((s, b) => s + (parseFloat(b.amount) || 0), 0);
            return { learning, hosting, total: learning + hosting };
        })();
        
        const actionBar = _buildActionBar('budgets', 'App.openBudgetModal()', 'App.deleteAllBudgets()', items.length);
        
        // כותרת המציינת את השנה הנבחרת
        const yearTitle = displayHebrewYear ? ` - שנת תקציב ${displayHebrewYear}` : '';

        document.getElementById('section-budgets').innerHTML = `
            <div class="stats-grid" style="margin-bottom:20px;">
                <div class="stat-card"><div class="stat-icon blue">💰</div><div class="stat-info"><h3>${items.length}</h3><p>תקציבים${yearTitle}</p></div></div>
                <div class="stat-card"><div class="stat-icon green">📊</div><div class="stat-info"><h3>${totalAmount.toLocaleString('he-IL')} ₪</h3><p>סה"כ תקציב${yearTitle}</p></div></div>
                <div class="stat-card"><div class="stat-icon orange">📈</div><div class="stat-info"><h3>${totalFree.toLocaleString('he-IL')} ₪</h3><p>יתרה פנויה${yearTitle}</p></div></div>
                <div class="stat-card"><div class="stat-icon purple">🎯</div><div class="stat-info"><h3>${utilizationRate}%</h3><p>אחוז ניצול תקציב${yearTitle}</p></div></div>
                <div class="stat-card"><div class="stat-icon cyan">🏢</div><div class="stat-info"><h3>${avgBudgetPerUnit} ₪</h3><p>ממוצע ליחידה ארגונית${yearTitle}</p></div></div>
                <div class="stat-card"><div class="stat-icon pink">💵</div><div class="stat-info"><h3>${knownVsEstimated.known.toLocaleString('he-IL', { maximumFractionDigits: 0 })} ₪</h3><p>תקציב ידוע${yearTitle}</p></div></div>
            </div>
            
            <!-- KPI Breakdown Cards -->
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-bottom:20px;">
                <div class="card"><div class="card-body">
                    <h4 style="margin:0 0 12px 0;font-size:14px;color:var(--gray-700);display:flex;align-items:center;gap:8px;">📊 חלוקה לפי סטטוס תקציב${yearTitle}</h4>
                    <div style="display:flex;flex-direction:column;gap:8px;">
                        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px;background:var(--success-bg,#f0fdf4);border-radius:6px;">
                            <span style="font-size:13px;color:var(--success,#16a34a);font-weight:600;">✅ ידוע</span>
                            <span style="font-size:14px;font-weight:700;color:var(--success,#16a34a);">${knownVsEstimated.known.toLocaleString('he-IL', { maximumFractionDigits: 0 })} ₪</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px;background:var(--warning-bg,#fef9c3);border-radius:6px;">
                            <span style="font-size:13px;color:var(--warning,#ca8a04);font-weight:600;">⏳ משוערך</span>
                            <span style="font-size:14px;font-weight:700;color:var(--warning,#ca8a04);">${knownVsEstimated.estimated.toLocaleString('he-IL', { maximumFractionDigits: 0 })} ₪</span>
                        </div>
                    </div>
                </div></div>
                
                <div class="card"><div class="card-body">
                    <h4 style="margin:0 0 12px 0;font-size:14px;color:var(--gray-700);display:flex;align-items:center;gap:8px;">🎯 חלוקה לפי סוג תקציב${yearTitle}</h4>
                    <div style="display:flex;flex-direction:column;gap:8px;">
                        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px;background:var(--primary-bg,#eff6ff);border-radius:6px;">
                            <span style="font-size:13px;color:var(--primary,#0ea5e9);font-weight:600;">📚 פתרון למידה</span>
                            <span style="font-size:14px;font-weight:700;color:var(--primary,#0ea5e9);">${budgetForBreakdown.learning.toLocaleString('he-IL', { maximumFractionDigits: 0 })} ₪</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px;background:var(--secondary-bg,#fef2f2);border-radius:6px;">
                            <span style="font-size:13px;color:var(--secondary,#dc2626);font-weight:600;">🏨 אירוח</span>
                            <span style="font-size:14px;font-weight:700;color:var(--secondary,#dc2626);">${budgetForBreakdown.hosting.toLocaleString('he-IL', { maximumFractionDigits: 0 })} ₪</span>
                        </div>
                    </div>
                </div></div>
                
                <div class="card"><div class="card-body">
                    <h4 style="margin:0 0 12px 0;font-size:14px;color:var(--gray-700);display:flex;align-items:center;gap:8px;">💹 יתרות תקציביות${yearTitle}</h4>
                    <div style="display:flex;flex-direction:column;gap:8px;">
                        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px;background:var(--gray-50);border-radius:6px;">
                            <span style="font-size:13px;color:var(--gray-600);font-weight:600;">📋 יתרת תכנון</span>
                            <span style="font-size:14px;font-weight:700;color:var(--gray-700);">${totalPlanning.toLocaleString('he-IL')} ₪</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px;background:var(--gray-50);border-radius:6px;">
                            <span style="font-size:13px;color:var(--gray-600);font-weight:600;">⚙️ יתרת ניהול</span>
                            <span style="font-size:14px;font-weight:700;color:var(--gray-700);">${totalManagement.toLocaleString('he-IL')} ₪</span>
                        </div>
                    </div>
                </div></div>
            </div>
            
            ${_lookupTableHeader('תקציבים' + yearTitle, items.length, '💰')}
            <div class="card"><div class="card-body">
                ${actionBar}
                <div class="toolbar">
                    <input type="text" class="search-input" id="budgetSearch" placeholder="🔍 חיפוש..." oninput="App.filterBudgets()">
                    <select class="filter-select" id="budgetYearF" onchange="App.filterBudgets()"><option value="">כל השנים</option></select>
                    <select class="filter-select" id="budgetPeriodF" onchange="App.filterBudgets()"><option value="">כל התקופות</option><option value="1">תקופה 1 (01-08)</option><option value="2">תקופה 2 (09-12)</option></select>
                    <select class="filter-select" id="budgetOrgF" onchange="App.filterBudgets()"><option value="">כל היחידות</option></select>
                    ${_colVisBtnHtml('budgets')}
                </div>
                <div id="budgetsTableDiv">${_renderBudgetsTable(items, yearTitle, displayHebrewYear)}</div>
            </div></div>`;
        
        // Populate year filter - כל השנים הקיימות במערכת
        const allYears = [...new Set(allItems.map(b => b.hebrewYear).filter(Boolean))].sort();
        const yearFilter = document.getElementById('budgetYearF');
        if (yearFilter) {
            allYears.forEach(year => {
                const opt = document.createElement('option');
                opt.value = year;
                opt.textContent = year;
                yearFilter.appendChild(opt);
            });
            // Set default to display year
            if (displayHebrewYear) {
                yearFilter.value = displayHebrewYear;
            }
        }
        
        // Populate organizational units filter - כל היחידות מכל השנים
        const orgUnits = [...new Set(allItems.map(b => b.organizationalUnit).filter(Boolean))];
        const orgFilter = document.getElementById('budgetOrgF');
        if (orgFilter) {
            orgUnits.forEach(unit => {
                const opt = document.createElement('option');
                opt.value = unit;
                opt.textContent = unit;
                orgFilter.appendChild(opt);
            });
        }
        
        _applyTableFeatures('budgets');
    }

    function _renderBudgetsTable(items, yearTitle, activeHebrewYear) {
        if (!items.length) return `<div class="empty-state"><div class="empty-icon">💰</div><h3>אין תקציבים${yearTitle ? ` לשנת ${activeHebrewYear}` : ''}</h3><button class="btn btn-primary" onclick="App.openBudgetModal()">➕ הוסף תקציב</button></div>`;
        return `<div class="table-wrapper" style="box-shadow:none;"><table class="data-table"><thead><tr><th data-key="budgetCode">קוד תקציב</th><th data-key="hebrewYear">שנה עברית</th><th data-key="englishYear">שנה לועזית</th><th data-key="period">תקופה</th><th data-key="estimationStatus">ידוע/משוערך</th><th data-key="organizationalUnit">יחידה ארגונית</th><th data-key="budgetFor">תקציב עבור</th><th data-key="description">תיאור</th><th data-key="notes">הערה</th><th data-key="amount">סכום (₪)</th><th data-key="planningBalance">יתרת תכנון (₪)</th><th data-key="managementBalance">יתרת ניהול (₪)</th><th data-key="freeBudgetBalance">יתרה פנויה (₪)</th><th>פעולות</th></tr></thead><tbody>
        ${items.map(b => `<tr>
            <td style="direction:ltr"><strong>${b.budgetCode || '—'}</strong></td>
            <td>${b.hebrewYear || '—'}</td>
            <td>${b.englishYear || '—'}</td>
            <td>${b.period || '—'}</td>
            <td>${b.estimationStatus || '—'}</td>
            <td>${b.organizationalUnit || '—'}</td>
            <td>${b.budgetFor === 'learning_solution' ? '📚 פתרון למידה' : (b.budgetFor === 'hosting' ? '🏨 אירוח' : '—')}</td>
            <td>${b.description || '—'}</td>
            <td>${b.notes || '—'}</td>
            <td style="direction:ltr;text-align:left;">${(parseFloat(b.amount) || 0).toLocaleString('he-IL')} ₪</td>
            <td style="direction:ltr;text-align:left;">${(parseFloat(b.planningBalance) || 0).toLocaleString('he-IL')} ₪</td>
            <td style="direction:ltr;text-align:left;">${(parseFloat(b.managementBalance) || 0).toLocaleString('he-IL')} ₪</td>
            <td style="direction:ltr;text-align:left;">${(parseFloat(b.freeBudgetBalance) || 0).toLocaleString('he-IL')} ₪</td>
            <td><div style="display:flex;gap:4px;"><button class="btn btn-outline btn-sm" onclick="App.openBudgetModal('${b.id}')">✏️</button><button class="btn btn-danger btn-sm" onclick="App.deleteBudget('${b.id}')">🗑️</button></div></td>
        </tr>`).join('')}</tbody></table></div>`;
    }

    function filterBudgets() {
        const search = document.getElementById('budgetSearch').value.toLowerCase();
        const year = document.getElementById('budgetYearF').value;
        const period = document.getElementById('budgetPeriodF').value;
        const org = document.getElementById('budgetOrgF').value;
        
        // התחל מתקציבי השנה הנבחרת בתפריט העליון (displayPeriod)
        const displayPeriod = AppContext.displayPeriod;
        const displayHebrewYear = displayPeriod ? displayPeriod.hebrewYear : null;
        let items = displayHebrewYear 
            ? (DataStore.getAll(DataStore.KEYS.BUDGETS) || []).filter(b => b.hebrewYear === displayHebrewYear)
            : (DataStore.getAll(DataStore.KEYS.BUDGETS) || []);
        
        // החל סינונים נוספים לפי בחירת המשתמש (בתוך השנה הנבחרת)
        if (year && year !== displayHebrewYear) {
            // אם המשתמש בחר שנה שונה מהשנה הנבחרת, הצג את כל התקציבים מאותה שנה
            items = (DataStore.getAll(DataStore.KEYS.BUDGETS) || []).filter(b => b.hebrewYear === year);
        }
        if (search) items = items.filter(b => (b.description||'').toLowerCase().includes(search) || (b.budgetCode||'').toLowerCase().includes(search) || (b.organizationalUnit||'').toLowerCase().includes(search) || (b.hebrewYear||'').includes(search));
        if (period) items = items.filter(b => b.period === period);
        if (org) items = items.filter(b => b.organizationalUnit === org);
        
        _resetPagination('budgets');
        document.getElementById('budgetsTableDiv').innerHTML = _renderBudgetsTable(items, '', null);
        _applyTableFeatures('budgets');
    }

    function _budgetSelectOpts(field, predefined, selected) {
        var budgets = DataStore.getAll(DataStore.KEYS.BUDGETS) || [];
        var seen = {};
        var all = predefined.slice();
        predefined.forEach(function(p) { seen[p] = true; });
        budgets.forEach(function(bg) {
            var v = (bg[field] || '').trim();
            if (v && !seen[v]) { all.push(v); seen[v] = true; }
        });
        var html = '<option value="">בחר</option>';
        var hasSel = false;
        all.forEach(function(o) {
            var sel = (o === selected) ? ' selected' : '';
            if (sel) hasSel = true;
            html += '<option value="' + escAttr(o) + '"' + sel + '>' + escAttr(o) + '</option>';
        });
        if (selected && !hasSel) {
            html += '<option value="' + escAttr(selected) + '" selected>' + escAttr(selected) + '</option>';
        }
        return html;
    }

    function openBudgetModal(id = null) {
        const b = id ? DataStore.getById(DataStore.KEYS.BUDGETS, id) : null;
        editingItem = b;
        
        // ברירת מחדל לשנה הנבחרת בתפריט העליון בעת יצירת תקציב חדש
        const displayPeriod = AppContext.displayPeriod;
        const defaultHebrewYear = b ? b.hebrewYear : (displayPeriod ? displayPeriod.hebrewYear : '');
        
        const bAmount = b ? (parseFloat(b.amount) || 0) : 0;
        const bPlan = b ? (parseFloat(b.planningBalance) || 0) : 0;
        const bMgmt = b ? (parseFloat(b.managementBalance) || 0) : 0;
        const bFree = b ? (parseFloat(b.freeBudgetBalance) || 0) : 0;
        showModal(b ? 'עריכת תקציב' : 'תקציב חדש', `
            <div style="max-height:70vh;overflow-y:auto;padding-right:4px;">
                <div style="margin-bottom:20px;">
                    <div style="font-size:14px;font-weight:600;color:var(--gray-700);margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid var(--primary);display:flex;align-items:center;gap:8px;">
                        <span>📋</span> פרטי זיהוי
                    </div>
                    <div class="form-grid">
                        <div class="form-group"><label>קוד תקציב *</label><input type="text" id="fBCode" class="form-input" value="${b ? b.budgetCode || '' : ''}" placeholder="למשל: 2025-001"></div>
                        <div class="form-group"><label>שנת תקציב (עברית) *</label><select id="fBHebYear" class="form-select" onchange="App._onBHebYear()"><option value="">בחר</option>${getHebrewYearOptions(defaultHebrewYear)}</select></div>
                        <div class="form-group"><label>שנת תקציב (לועזית)</label><input type="text" id="fBEngYear" class="form-input" value="${b ? b.englishYear || '' : ''}" readonly style="background:var(--gray-50);"></div>
                        <div class="form-group"><label>תקופה *</label><select id="fBPeriod" class="form-select">${_budgetSelectOpts('period', ['שנה', 'חצי שנה', 'רבעון', 'שליש שנה', '2 מ׳: 09–12', '1 מ׳: 01–08'], b ? b.period : '')}</select></div>
                    </div>
                </div>
                <div style="margin-bottom:20px;">
                    <div style="font-size:14px;font-weight:600;color:var(--gray-700);margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid var(--primary);display:flex;align-items:center;gap:8px;">
                        <span>📋</span> פרטי תקציב
                    </div>
                    <div class="form-grid">
                        <div class="form-group"><label>ידוע / משוערך *</label><select id="fBEstStatus" class="form-select">${_budgetSelectOpts('estimationStatus', ['ידוע', 'משוערך'], b ? b.estimationStatus : '')}</select></div>
                        <div class="form-group"><label>צבע הכסף</label><select id="fBMoneyColor" class="form-select">${_budgetSelectOpts('moneyColor', ['לבן', 'ירוק', 'כחול', 'אדום', 'צהוב', 'סגול', 'כתום'], b ? b.moneyColor : '')}</select></div>
                        <div class="form-group"><label>יחידה ארגונית מנהלת *</label><select id="fBOrg" class="form-select">${_budgetSelectOpts('organizationalUnit', [], b ? b.organizationalUnit : '')}</select></div>
                        <div class="form-group"><label>תקציב עבור *</label><select id="fBFor" class="form-select"><option value="learning_solution" ${b && b.budgetFor === 'learning_solution' ? 'selected' : ''}>פתרון למידה</option><option value="hosting" ${b && b.budgetFor === 'hosting' ? 'selected' : ''}>אירוח</option></select></div>
                        <div class="form-group" style="grid-column:1/-1;"><label>תיאור תקציב</label><textarea id="fBDesc" class="form-input" rows="3" placeholder="תיאור מפורט של התקציב">${b ? b.description || '' : ''}</textarea></div>
                        <div class="form-group" style="grid-column:1/-1;"><label>הערה</label><textarea id="fBNotes" class="form-input" rows="2" placeholder="הערות נוספות (אופציונלי)">${b ? b.notes || '' : ''}</textarea></div>
                    </div>
                </div>
                <div>
                    <div style="font-size:14px;font-weight:600;color:var(--gray-700);margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid var(--primary);display:flex;align-items:center;gap:8px;">
                        <span>💰</span> נתונים כספיים
                    </div>
                    <div class="form-grid">
                        <div class="form-group"><label>סכום (₪) *</label><input type="number" id="fBAmount" class="form-input" step="0.01" min="0" value="${bAmount.toFixed(2)}"></div>
                        <div class="form-group"><label>יתרת תכנון (₪)</label><input type="number" id="fBPlan" class="form-input" step="0.01" min="0" value="${bPlan.toFixed(2)}"></div>
                        <div class="form-group"><label>יתרת ניהול (₪)</label><input type="number" id="fBMgmt" class="form-input" step="0.01" min="0" value="${bMgmt.toFixed(2)}"></div>
                        <div class="form-group"><label>יתרת תקציב פנויה (₪)</label><input type="number" id="fBFree" class="form-input" step="0.01" min="0" value="${bFree.toFixed(2)}"></div>
                    </div>
                </div>
            </div>`,
        `<button class="btn btn-primary" onclick="App.saveBudget()">${b ? '💾 שמור' : '➕ צור'}</button><button class="btn btn-outline" onclick="App.closeModal()">ביטול</button>`);
    }

    function _onBHebYear() {
        const h = document.getElementById('fBHebYear').value;
        document.getElementById('fBEngYear').value = DataStore.getEnglishYear(h) || '';
    }

    function saveBudget() {
        const budgetCode = document.getElementById('fBCode').value.trim();
        const hebrewYear = document.getElementById('fBHebYear').value;
        const period = document.getElementById('fBPeriod').value.trim();
        const estimationStatus = document.getElementById('fBEstStatus').value.trim();
        const organizationalUnit = document.getElementById('fBOrg').value.trim();
        const budgetFor = document.getElementById('fBFor').value;
        const amount = parseFloat(document.getElementById('fBAmount').value) || 0;
        
        // Validation
        if (!budgetCode) { showToast('שדה קוד תקציב הוא חובה', 'error'); return; }
        if (!hebrewYear) { showToast('יש לבחור שנת תקציב (עברית)', 'error'); return; }
        if (!period) { showToast('יש לבחור תקופה', 'error'); return; }
        if (!estimationStatus) { showToast('יש לבחור סטטוס (ידוע/משוערך)', 'error'); return; }
        if (!organizationalUnit) { showToast('יש לבחור יחידה ארגונית מנהלת', 'error'); return; }
        if (!budgetFor) { showToast('יש לבחור סוג תקציב (פתרון למידה/אירוח)', 'error'); return; }
        if (amount <= 0) { showToast('סכום התקציב חייב להיות גדול מ-0', 'error'); return; }
        
        const data = { 
            budgetCode: budgetCode, 
            hebrewYear: hebrewYear, 
            englishYear: document.getElementById('fBEngYear').value, 
            period: period, 
            estimationStatus: estimationStatus, 
            moneyColor: document.getElementById('fBMoneyColor').value.trim(), 
            organizationalUnit: organizationalUnit, 
            budgetFor: budgetFor, 
            description: document.getElementById('fBDesc').value.trim(), 
            notes: document.getElementById('fBNotes').value.trim(), 
            amount: amount,
            planningBalance: parseFloat(document.getElementById('fBPlan').value) || 0, 
            managementBalance: parseFloat(document.getElementById('fBMgmt').value) || 0, 
            freeBudgetBalance: parseFloat(document.getElementById('fBFree').value) || 0 
        };
        if (editingItem) { DataStore.update(DataStore.KEYS.BUDGETS, editingItem.id, data); showToast('התקציב עודכן', 'success'); }
        else { DataStore.create(DataStore.KEYS.BUDGETS, data); showToast('התקציב נוצר', 'success'); }
        editingItem = null; closeModal(); renderBudgets();
    }

    function deleteBudget(id) { confirmDialog('למחוק תקציב?', () => { _moveToRecycleBin(DataStore.KEYS.BUDGETS, id); showToast('נמחק', 'success'); renderBudgets(); }); }

    function deleteAllBudgets() {
        const items = DataStore.getAll(DataStore.KEYS.BUDGETS) || [];
        if (!items.length) { showToast('אין רשומות למחיקה', 'warning'); return; }
        confirmDialog('למחוק את כל ' + items.length + ' התקציבים? פעולה זו בלתי הפיכה!', function() {
            _moveAllToRecycleBin(DataStore.KEYS.BUDGETS);
            showToast('כל התקציבים נמחקו', 'success');
            renderBudgets();
        });
    }

    // ================================================================
    //  PERIODS (תקופות)
    // ================================================================

    // ============================================
    // 🔧 תקופות (Periods) - גרסה מתוקנת ויציבה
    // ============================================
    let _editingPeriodItem = null;

    // 🔑 תיקון קריטי: שימוש בגרשיים עבריים (״) במקום רגילים (") למניעת שבירת HTML
    const HEB_TO_ENG_YEAR_MAP = {
        'תשפ״א': '2020-2021',
        'תשפ״ב': '2021-2022',
        'תשפ״ג': '2022-2023',
        'תשפ״ד': '2023-2024',
        'תשפ״ה': '2024-2025',
        'תשפ״ו': '2025-2026',
        'תשפ״ז': '2026-2027',
        'תשפ״ח': '2027-2028',
        'תשפ״ט': '2028-2029',
        'תש״צ': '2029-2030',
        'תשצ״א': '2030-2031',
        'תשצ״ב': '2031-2032'
    };

    function getHebrewYearOptions(selectedYear = '') {
        return Object.keys(HEB_TO_ENG_YEAR_MAP).map(year => {
            const isSelected = (year === selectedYear) ? ' selected' : '';
            return `<option value="${year}"${isSelected}>${year} (${HEB_TO_ENG_YEAR_MAP[year]})</option>`;
        }).join('');
    }

    function _onPHebYear() {
        const h = document.getElementById('fPHebYear').value;
        const eng = HEB_TO_ENG_YEAR_MAP[h] || '';
        
        console.log('[Period] נבחרה שנה:', h, '→ שנה לועזית:', eng);
        
        document.getElementById('fPEngYear').value = eng;
        
        if (eng) {
            const years = eng.split('-').map(Number);
            if (years.length === 2 && years[0] && years[1]) {
                const year1 = years[0];
                const year2 = years[1];
                
                document.getElementById('fP1Label').value = '2 מ׳: 09–12';
                document.getElementById('fP1Start').value = `${year1}-09-01`;
                document.getElementById('fP1End').value = `${year1}-12-31`;
                
                document.getElementById('fP2Label').value = '1 מ׳: 01–08';
                document.getElementById('fP2Start').value = `${year2}-01-01`;
                document.getElementById('fP2End').value = `${year2}-08-30`;
                
                console.log('[Period] שדות עודכנו בהצלחה');
            }
        } else {
            document.getElementById('fP1Label').value = '';
            document.getElementById('fP1Start').value = '';
            document.getElementById('fP1End').value = '';
            document.getElementById('fP2Label').value = '';
            document.getElementById('fP2Start').value = '';
            document.getElementById('fP2End').value = '';
        }
    }

    function renderPeriods() {
        const items = DataStore.getAll(DataStore.KEYS.PERIODS) || [];
        let headerHtml = '';
        if (typeof _lookupTableHeader === 'function') {
            headerHtml = _lookupTableHeader('תקופות', items.length, '📅', '<button class="btn btn-sm" style="background:rgba(255,255,255,0.15);color:#fff;border:1px solid rgba(255,255,255,0.3);" onclick="App.openPeriodModal()">➕ תקופה חדשה</button>');
        } else {
            headerHtml = `<div class="card-header"><span class="card-title">📅 תקופות (${items.length})</span> <button class="btn btn-sm btn-primary" onclick="App.openPeriodModal()">➕ תקופה חדשה</button></div>`;
        }
        
        document.getElementById('section-periods').innerHTML = `
            ${headerHtml}
            <div class="card"><div class="card-body">
                <div class="table-wrapper" style="box-shadow:none;"><table class="data-table"><thead><tr><th>שנה עברית</th><th>שנה לועזית</th><th>2 מ׳: 09–12</th><th>1 מ׳: 01–08</th><th>פעילה</th><th>פעולות</th></tr></thead><tbody>
                ${items.map(p => `<tr>
                    <td><strong>${p.hebrewYear || ''}</strong></td><td>${p.englishYear || '—'}</td>
                    <td>${p.period1Label || '2 מ׳: 09–12'}: ${p.period1Start || ''} - ${p.period1End || ''}</td>
                    <td>${p.period2Label || '1 מ׳: 01–08'}: ${p.period2Start || ''} - ${p.period2End || ''}</td>
                    <td>${p.isActive ? '<span class="badge badge-success">פעילה</span>' : '<button class="btn btn-outline btn-sm" style="font-size:11px;" onclick="App._switchActivePeriod(\'' + p.id + '\')" title="הגדר כפעילה">⚡ הפעל</button>'}</td>
                    <td><div style="display:flex;gap:4px;"><button class="btn btn-outline btn-sm" onclick="App.openPeriodModal('${p.id}')">✏️</button><button class="btn btn-danger btn-sm" onclick="App.deletePeriod('${p.id}')">🗑️</button></div></td>
                </tr>`).join('')}</tbody></table></div>
            </div></div>`;
    }

    function openPeriodModal(id = null) {
        const p = id ? DataStore.getById(DataStore.KEYS.PERIODS, id) : null;
        _editingPeriodItem = p;
        
        const hebOptions = '<option value="">בחר שנה</option>' + getHebrewYearOptions(p ? p.hebrewYear : '');
        const autoFieldStyle = 'style="background:#f0f9ff; border:1px solid #bae6fd;"';
        
        console.log('[Period] פתיחת חלון, תקופה קיימת:', p ? p.hebrewYear : 'חדשה');
        
        showModal(p ? 'עריכת תקופה' : 'תקופה חדשה', `
            <div class="form-grid">
                <div class="form-group">
                    <label>שנת תקציב (עברית) <span style="color:red">*</span></label>
                    <select id="fPHebYear" class="form-select" onchange="App._onPHebYear()">
                        ${hebOptions}
                    </select>
                    <small style="color:var(--gray-500);font-size:11px;">💡 בחר שנה - כל שאר השדות יתמלאו אוטומטית</small>
                </div>
                <div class="form-group">
                    <label>שנה לועזית (אוטומטי)</label>
                    <input type="text" id="fPEngYear" class="form-input" value="${p ? p.englishYear || '' : ''}" ${autoFieldStyle}>
                </div>
                
                <div style="grid-column: 1 / -1; margin-top:10px; padding:10px; background:#e0f2fe; border-radius:8px; font-weight:600; color:#0369a1;">
                    📅 מחצית ראשונה (2 מ׳: 09–12)
                </div>
                <div class="form-group">
                    <label>תווית (אוטומטי)</label>
                    <input type="text" id="fP1Label" class="form-input" value="${p ? p.period1Label || '2 מ׳: 09–12' : ''}" ${autoFieldStyle}>
                </div>
                <div class="form-group">
                    <label>תאריך התחלה (אוטומטי)</label>
                    <input type="date" id="fP1Start" class="form-input" value="${p ? p.period1Start || '' : ''}" ${autoFieldStyle}>
                </div>
                <div class="form-group">
                    <label>תאריך סיום (אוטומטי)</label>
                    <input type="date" id="fP1End" class="form-input" value="${p ? p.period1End || '' : ''}" ${autoFieldStyle}>
                </div>
                
                <div style="grid-column: 1 / -1; margin-top:10px; padding:10px; background:#fef3c7; border-radius:8px; font-weight:600; color:#92400e;">
                    📅 מחצית שנייה (1 מ׳: 01–08)
                </div>
                <div class="form-group">
                    <label>תווית (אוטומטי)</label>
                    <input type="text" id="fP2Label" class="form-input" value="${p ? p.period2Label || '1 מ׳: 01–08' : ''}" ${autoFieldStyle}>
                </div>
                <div class="form-group">
                    <label>תאריך התחלה (אוטומטי)</label>
                    <input type="date" id="fP2Start" class="form-input" value="${p ? p.period2Start || '' : ''}" ${autoFieldStyle}>
                </div>
                <div class="form-group">
                    <label>תאריך סיום (אוטומטי)</label>
                    <input type="date" id="fP2End" class="form-input" value="${p ? p.period2End || '' : ''}" ${autoFieldStyle}>
                </div>
                
                <div class="form-group" style="grid-column: 1 / -1; margin-top:10px;">
                    <label>האם התקופה פעילה?</label>
                    <select id="fPActive" class="form-select">
                        <option value="yes" ${p && p.isActive ? 'selected' : ''}>✅ כן - תקופה פעילה</option>
                        <option value="no" ${(!p || (p && !p.isActive)) ? 'selected' : ''}>❌ לא - תקופה לא פעילה</option>
                    </select>
                </div>
            </div>`,
        `<button class="btn btn-primary" onclick="App.savePeriod()">${p ? '💾 שמור שינויים' : '➕ צור תקופה'}</button><button class="btn btn-outline" onclick="App.closeModal()">ביטול</button>`);
        
        // 🔑 תיקון קריטי: אם עורכים תקופה קיימת, הפעל את החישוב האוטומטי
        if (p && p.hebrewYear) {
            setTimeout(() => {
                console.log('[Period] מפעיל חישוב אוטומטי לשנה:', p.hebrewYear);
                document.getElementById('fPHebYear').value = p.hebrewYear;
                _onPHebYear();
            }, 100);
        }
    }

    function savePeriod() {
        const hebYear = document.getElementById('fPHebYear').value;
        if (!hebYear) {
            showToast('יש לבחור שנת תקציב (עברית)', 'error');
            return;
        }
        
        const data = { 
            hebrewYear: hebYear, 
            englishYear: document.getElementById('fPEngYear').value, 
            period1Label: document.getElementById('fP1Label').value.trim(), 
            period1Start: document.getElementById('fP1Start').value, 
            period1End: document.getElementById('fP1End').value, 
            period2Label: document.getElementById('fP2Label').value.trim(), 
            period2Start: document.getElementById('fP2Start').value, 
            period2End: document.getElementById('fP2End').value, 
            isActive: document.getElementById('fPActive').value === 'yes' 
        };
        
        if (data.isActive) {
            const allPeriods = DataStore.getAll(DataStore.KEYS.PERIODS) || [];
            allPeriods.forEach(function(p) {
                if (p.isActive && (!_editingPeriodItem || p.id !== _editingPeriodItem.id)) {
                    DataStore.update(DataStore.KEYS.PERIODS, p.id, { isActive: false });
                }
            });
        }
        
        if (_editingPeriodItem) { 
            DataStore.update(DataStore.KEYS.PERIODS, _editingPeriodItem.id, data); 
            showToast('התקופה עודכנה בהצלחה', 'success'); 
        } else { 
            DataStore.create(DataStore.KEYS.PERIODS, data); 
            showToast('התקופה נוצרה בהצלחה', 'success'); 
        }
        
        _editingPeriodItem = null; 
        closeModal(); 
        if (typeof _loadActivePeriod === 'function') _loadActivePeriod(); 
        if (typeof _renderActivePeriodBadge === 'function') _renderActivePeriodBadge(); 
        renderPeriods(); 
        if (typeof updateSolutionsCount === 'function') updateSolutionsCount();
    }

    function deletePeriod(id) { 
        confirmDialog('⚠️ האם למחוק תקופה זו?', () => { 
            if (typeof _moveToRecycleBin === 'function') {
                _moveToRecycleBin(DataStore.KEYS.PERIODS, id); 
            } else {
                DataStore.remove(DataStore.KEYS.PERIODS, id);
            }
            showToast('התקופה נמחקה', 'success'); 
            renderPeriods(); 
        }); 
    }

    // ================================================================
    //  LOOKUP TABLES (טבלאות ערכים)
    // ================================================================
function _renderLookupTable(key, isSchools, isCustom, label) {
    try {
        // שליפה בטוחה של הנתונים
        let items = [];
        try {
            items = DataStore.getAll(key) || [];
        } catch (e) {
            console.error(`שגיאה בשליפת נתונים עבור ${key}:`, e);
            return `<div style="padding:20px; color:red;">שגיאה בטעינת הנתונים עבור ${label}. בדוק קונסול.</div>`;
        }

        console.log(`[Render 1:1] טבלה: ${label}, מפתח: ${key}, רשומות:`, items.length);

        if (!Array.isArray(items) || items.length === 0) {
            return `<div style="padding:40px; text-align:center; color:var(--gray-500); font-weight:600; background:#f9fafb; border-radius:8px; border:1px dashed #ccc;">
                אין רשומות להצגה בטבלה "${label}".<br>
                <button class="btn btn-primary btn-sm" style="margin-top:10px;" onclick="App.openLookupModal('${key}', '${isCustom || ''}', ${isSchools})">➕ הוסף רשומה ראשונה</button>
            </div>`;
        }

        let headers = '';
        let rowsHtml = '';

        if (isSchools) {
            headers = `<th>סמל מוסד</th><th>שם מוסד</th><th>מעמד משפטי</th><th>סוג חינוך</th><th>שלב חינוך</th><th>מנהל</th><th>מפקח</th><th>פעולות</th>`;
            rowsHtml = items.map(item => `
                <tr>
                    <td>${item.code || '-'}</td><td>${item.name || '-'}</td><td>${item.legalStatus || '-'}</td>
                    <td>${item.educationType || '-'}</td><td>${item.educationStage || '-'}</td>
                    <td>${item.principalName || '-'}</td><td>${item.inspectorName || '-'}</td>
                    <td><button class="btn btn-sm btn-danger" onclick="App.deleteLookupItem('${key}', '${item.id}')">🗑️</button></td>
                </tr>`).join('');
        } else if (isCustom === 'pedagogical_executors') {
            headers = `<th>מספר חברה</th><th>שם מוסד</th><th>שם קבוצה</th><th>עלות שעתית</th><th>הערות</th><th>פעולות</th>`;
            rowsHtml = items.map(item => `
                <tr>
                    <td>${item.companyNumber || '-'}</td><td>${item.institutionName || '-'}</td><td>${item.groupName || '-'}</td>
                    <td>${item.hourlyCost || '0'}</td><td>${item.notes || '-'}</td>
                    <td><button class="btn btn-sm btn-danger" onclick="App.deleteLookupItem('${key}', '${item.id}')">🗑️</button></td>
                </tr>`).join('');
        } else if (isCustom === 'inspectors') {
            headers = `<th>שם מלא</th><th>טלפון</th><th>דוא"ל</th><th>מחוז</th><th>פעולות</th>`;
            rowsHtml = items.map(item => `
                <tr>
                    <td>${item.fullName || '-'}</td><td>${item.phone || '-'}</td><td>${item.email || '-'}</td><td>${item.district || '-'}</td>
                    <td><button class="btn btn-sm btn-danger" onclick="App.deleteLookupItem('${key}', '${item.id}')">🗑️</button></td>
                </tr>`).join('');
        } else {
            // ברירת מחדל לכל טבלאות הערכים הפשוטות
            headers = `<th>ערך / קוד</th><th>תווית (עברית)</th><th>תווית (ערבית)</th><th>פעולות</th>`;
            rowsHtml = items.map(item => `
                <tr>
                    <td><strong>${item.value || '-'}</strong></td><td>${item.label || '-'}</td><td>${item.labelAr || '-'}</td>
                    <td><button class="btn btn-sm btn-danger" onclick="App.deleteLookupItem('${key}', '${item.id}')">🗑️</button></td>
                </tr>`).join('');
        }

        return `
            <div style="margin-bottom:16px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                <h3 style="margin:0; font-size:18px;">${label} <span style="color:var(--primary); font-size:14px;">(${items.length} רשומות)</span></h3>
                <div style="display:flex; gap:8px;">
                    <button class="btn btn-outline btn-sm" onclick="document.getElementById('import_${key}').click()">📥 ייבוא מאקסל</button>
                    <input type="file" id="import_${key}" style="display:none" accept=".xlsx,.xls,.csv" onchange="App.startImport('lookup_values', this, '${key}')">
                    <button class="btn btn-primary btn-sm" onclick="App.openLookupModal('${key}', '${isCustom || ''}', ${isSchools})">➕ הוספת רשומה</button>
                </div>
            </div>
            <div style="overflow-x:auto; border:1px solid var(--gray-200); border-radius:8px;">
                <table class="data-table" style="width:100%; border-collapse:collapse; font-size:14px;">
                    <thead style="background:var(--gray-50);"><tr>${headers}</tr></thead>
                    <tbody>${rowsHtml}</tbody>
                </table>
            </div>
        `;
    } catch (e) {
        console.error("שגיאה קריטית ב-_renderLookupTable:", e);
        return `<div style="padding:20px; color:red;">שגיאה חמורה ברינדור הטבלה. בדוק קונסול.</div>`;
    }
}

	function switchLookupTab(key, tabEl, isSchools, customType, tabIndex, label) {
	if (typeof tabIndex === 'number') {
		_activeLookupTabIndex = tabIndex;
		window._activeLookupTabIndex = tabIndex; // 🔑 תיקון: סנכרון גם למשתנה הגלובלי
	}
	if (label) _currentLookupTableLabel = label;
     
     // 📌 שמירת הטאב הפעיל לשחזור לאחר רענון
     try { sessionStorage.setItem('matspanet_last_lookup_tab', _activeLookupTabIndex); } catch(e) {}
     
     document.querySelectorAll('#lookupTabs .tab').forEach(t => t.classList.remove('active'));
     tabEl.classList.add('active');
     document.getElementById('lookupContent').innerHTML = _renderLookupTable(key, isSchools, customType, label);
 }

    function _renderLookupTable(key, isSchools, customType, label) {
        if (customType === 'inspectors') return _renderInspectorsTab(label);
        if (customType === 'pedagogical_executors') return _renderPedExecTab(label);
        if (isSchools) return _renderSchoolsTab(label);
        const items = DataStore.getAll(key) || [];
        _currentLookupKey = key;
        if (!label) label = _currentLookupTableLabel;
        const itemCount = items.length;
        // Regular lookup tables (value/label/labelAr/order structure)
        const clearBtn = itemCount > 0 ? `<button class="btn btn-danger btn-sm" onclick="App.clearAllLookupItems()" style="margin-right:auto;">🗑️ מחק הכל (${itemCount})</button>` : '';
        const sorted = items.slice().sort((a,b) => a.order - b.order);
        const rowsHtml = sorted.map((i, idx) => {
            const upBtn = idx > 0 ? `<button class="btn btn-outline btn-sm" onclick="App.moveLookupItem('${key}','${i.id}','up')" style="padding:2px 8px;font-size:13px;line-height:1;" title="הזז למעלה">▲</button>` : '<span style="display:inline-block;width:28px;"></span>';
            const downBtn = idx < sorted.length - 1 ? `<button class="btn btn-outline btn-sm" onclick="App.moveLookupItem('${key}','${i.id}','down')" style="padding:2px 8px;font-size:13px;line-height:1;" title="הזז למטה">▼</button>` : '<span style="display:inline-block;width:28px;"></span>';
            return `<tr>
            <td style="direction:ltr"><strong>${i.value}</strong></td><td>${i.label}</td><td>${i.labelAr || '—'}</td>
            <td><div style="display:flex;gap:2px;align-items:center;">${upBtn}${downBtn}</div></td>
            <td>${i.isActive !== false ? '<span class="badge badge-success">כן</span>' : '<span class="badge badge-gray">לא</span>'}</td>
            <td><div style="display:flex;gap:4px;">
                <button class="btn btn-outline btn-sm" onclick="App.openLookupModal('${key}','${i.id}')">✏️</button>
                <button class="btn btn-danger btn-sm" onclick="App.deleteLookupItem('${key}','${i.id}')">🗑️</button>
            </div></td></tr>`;
        }).join('');
        return _lookupTableHeader(label, itemCount) +
            `<div class="action-bar" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;padding:10px 14px;background:var(--gray-50);border-radius:var(--border-radius);border:1px solid var(--gray-100);">
    <label class="btn btn-outline btn-sm" style="cursor:pointer;margin:0;">📥 ייבוא<input type="file" accept=".csv,.xlsx,.xls" style="display:none;" onchange="App.startImport('lookup_values',this,'${key}')"></label>
    <button class="btn btn-outline btn-sm" onclick="App.exportCSV('lookup_table')">📤 ייצוא CSV</button>
    <button class="btn btn-outline btn-sm" onclick="App.exportExcel('lookup_table')">📊 Excel</button>
    <button class="btn btn-outline btn-sm" onclick="App.printSection()">🖨️ הדפסה</button>
    <button class="btn btn-primary btn-sm" onclick="App.openLookupModal('${key}')">➕ הוסף ערך</button>
    ${clearBtn}
</div><div class="table-wrapper" style="box-shadow:none;"><table class="data-table"><thead><tr><th>ערך</th><th>תווית (עברית)</th><th>תווית (ערבית)</th><th style="width:70px;text-align:center;">סדר</th><th>פעיל</th><th>פעולות</th></tr></thead><tbody>
        ${rowsHtml}
        </tbody></table></div>`;
    }

    // ================================================================
    //  SCHOOLS TAB (בתי ספר) — מבנה מלא: סמל מוסד, שם, מעמד, סוג, שלב, מנהל, מפקח
    // ================================================================
    function _renderSchoolsTab(label) {
        const items = DataStore.getAll(DataStore.KEYS.LOOKUP_SCHOOLS) || [];
        const count = items.length;
        return _lookupTableHeader(label || 'בתי ספר', count, '🏫',
                '<span id="schoolsCount" style="font-size:14px;opacity:0.9;">' + count + ' רשומות</span>') +
            `<div class="action-bar" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;padding:10px 14px;background:var(--gray-50);border-radius:var(--border-radius);border:1px solid var(--gray-100);">
                <label class="btn btn-outline btn-sm" style="cursor:pointer;margin:0;">📥 ייבוא<input type="file" accept=".csv,.xlsx,.xls" style="display:none;" onchange="App.startImport('schools',this)"></label>
                <button class="btn btn-outline btn-sm" onclick="App.exportCSV('schools')">📤 ייצוא CSV</button>
                <button class="btn btn-outline btn-sm" onclick="App.printSection()">🖨️ הדפסה</button>
                <button class="btn btn-primary btn-sm" onclick="App.openSchoolModal()">➕ הוסף בית ספר</button>
                ${count > 0 ? `<button class="btn btn-danger btn-sm" onclick="App.clearAllSchools()" style="margin-right:auto;">🗑️ מחק הכל (${count})</button>` : ''}
            </div>
            <div style="margin-bottom:12px;">
                <input type="text" id="schoolSearch" class="form-input" placeholder="🔍 חיפוש לפי סמל מוסד, שם, מנהל, מפקח..." oninput="App.filterSchools(this.value)">
            </div>
            <div class="table-wrapper" style="box-shadow:none;">
                <table class="data-table">
                    <thead><tr>
                        <th>סמל מוסד</th>
                        <th>שם מוסד</th>
                        <th>מעמד משפטי</th>
                        <th>סוג חינוך מוסד</th>
                        <th>שלב חינוך במוסד</th>
                        <th>שם מנהל</th>
                        <th>שם מפקח</th>
                        <th>פעיל</th>
                        <th>פעולות</th>
                    </tr></thead>
                    <tbody id="schoolsTableBody">${_renderSchoolRows(items)}</tbody>
                </table>
            </div>`;
    }

    // ---- Schools helpers ----
    function _renderSchoolRows(items) {
        const sorted = items.filter(s => s.isActive !== false).sort((a,b) => (a.code||'').localeCompare(b.code||''));
        if (!sorted.length) return '<tr><td colspan="9" style="text-align:center;color:var(--gray-400);padding:20px;">לא נמצאו תוצאות</td></tr>';
        return sorted.map(s => `<tr>
                <td style="direction:ltr"><strong>${s.code || ''}</strong></td>
                <td>${escAttr(s.name || '')}</td>
                <td><span class="badge badge-info" style="font-size:11px;">${escAttr(s.legalStatus || '—')}</span></td>
                <td><span class="badge badge-secondary" style="font-size:11px;">${escAttr(s.educationType || '—')}</span></td>
                <td>${escAttr(s.educationStage || '—')}</td>
                <td>${escAttr(s.principalName || '—')}</td>
                <td>${escAttr(s.inspectorName || '—')}</td>
                <td>${s.isActive !== false ? '<span class="badge badge-success">כן</span>' : '<span class="badge badge-gray">לא</span>'}</td>
                <td><div style="display:flex;gap:4px;">
                    <button class="btn btn-outline btn-sm" onclick="App.openSchoolModal('${s.id}')">✏️</button>
                    <button class="btn btn-danger btn-sm" onclick="App.deleteSchool('${s.id}')">🗑️</button>
                </div></td></tr>`).join('');
    }

    function filterSchools(query) {
        const q = (query || '').trim().toLowerCase();
        const all = DataStore.getAll(DataStore.KEYS.LOOKUP_SCHOOLS) || [];
        const filtered = q ? all.filter(s =>
            (s.code || '').toLowerCase().includes(q) ||
            (s.name || '').toLowerCase().includes(q) ||
            (s.legalStatus || '').toLowerCase().includes(q) ||
            (s.educationType || '').toLowerCase().includes(q) ||
            (s.educationStage || '').toLowerCase().includes(q) ||
            (s.principalName || '').toLowerCase().includes(q) ||
            (s.inspectorName || '').toLowerCase().includes(q)
        ) : all;
        const tbody = document.getElementById('schoolsTableBody');
        const countEl = document.getElementById('schoolsCount');
        if (tbody) tbody.innerHTML = _renderSchoolRows(filtered);
        if (countEl) countEl.textContent = filtered.length + ' רשומות' + (q ? ' (מסונן)' : '');
    }

    // ---- Schools CRUD ----
    function openSchoolModal(id) {
        const sch = id ? DataStore.getById(DataStore.KEYS.LOOKUP_SCHOOLS, id) : null;
        editingItem = sch;
        const edTypeOpts = getLookupOptions(DataStore.KEYS.LOOKUP_EDUCATION_TYPES, sch ? sch.educationType : '');
        const edStageOpts = getLookupOptions(DataStore.KEYS.LOOKUP_EDUCATION_STAGES, sch ? sch.educationStage : '');
        showModal(sch ? 'עריכת בית ספר' : 'הוספת בית ספר', `
            <div class="form-grid">
                <div class="form-group"><label>סמל מוסד *</label><input type="text" id="fSCHCode" class="form-input" value="${sch ? sch.code || '' : ''}" required dir="ltr" style="text-align:left;" placeholder="101101"></div>
                <div class="form-group"><label>שם מוסד *</label><input type="text" id="fSCHName" class="form-input" value="${sch ? escAttr(sch.name) : ''}" required></div>
                <div class="form-group"><label>מעמד משפטי</label><input type="text" id="fSCHLegalStatus" class="form-input" value="${sch ? escAttr(sch.legalStatus || '') : ''}" placeholder="ממלכתי, ממלכתי דתי, ערבי..."></div>
                <div class="form-group"><label>סוג חינוך מוסד</label><select id="fSCHEdType" class="form-select"><option value="">בחר</option>${edTypeOpts}</select></div>
                <div class="form-group"><label>שלב חינוך במוסד</label><select id="fSCHEdStage" class="form-select"><option value="">בחר</option>${edStageOpts}</select></div>
                <div class="form-group"><label>שם מנהל</label><input type="text" id="fSCHPrincipal" class="form-input" value="${sch ? escAttr(sch.principalName || '') : ''}" placeholder="שם המנהל/ת"></div>
                <div class="form-group"><label>שם מפקח</label><input type="text" id="fSCHInspector" class="form-input" value="${sch ? escAttr(sch.inspectorName || '') : ''}" placeholder="שם המפקח/ת"></div>
            </div>`,
        `<button class="btn btn-primary" onclick="App.saveSchool()">${sch ? '💾 שמור' : '➕ הוסף'}</button><button class="btn btn-outline" onclick="App.closeModal()">ביטול</button>`);
    }

function renderLookupTables() {
		try {
			// 🔑 תיקון קריטי: שחזור הטאב הפעיל מ-sessionStorage
			const savedTab = sessionStorage.getItem('matspanet_last_lookup_tab');
			if (savedTab !== null && !isNaN(parseInt(savedTab, 10))) {
				window._activeLookupTabIndex = parseInt(savedTab, 10);
			}
			if (typeof window._activeLookupTabIndex === 'undefined' || window._activeLookupTabIndex === null) {
				window._activeLookupTabIndex = 0;
			}

        const tables = [
            { key: DataStore.KEYS.INSPECTORS, label: 'מפקחים', isCustom: 'inspectors' },
            { key: DataStore.KEYS.PEDAGOGICAL_EXECUTORS, label: 'מבצעים פדגוגיים', isCustom: 'pedagogical_executors' },
            { key: DataStore.KEYS.LOOKUP_SCHOOLS, label: 'בתי ספר', isSchools: true },
            { key: DataStore.KEYS.LOOKUP_DOMAINS, label: 'תחום פתרון למידה' },
            { key: DataStore.KEYS.LOOKUP_EDUCATION_STAGES, label: 'שלב חינוך' },
            { key: DataStore.KEYS.LOOKUP_EDUCATION_TYPES, label: 'סוג חינוך' },
            { key: DataStore.KEYS.LOOKUP_WEEK_DAYS, label: 'ימי שבוע' },
            { key: DataStore.KEYS.LOOKUP_MEETING_TYPES, label: 'סוג מפגש' },
            { key: DataStore.KEYS.LOOKUP_BUDGET_TYPES, label: 'מתוקצב?' },
            { key: DataStore.KEYS.LOOKUP_ALLOCATION_STATUS, label: 'סטטוס שיוך תקציב' },
            { key: DataStore.KEYS.LOOKUP_SOLUTION_STATUS, label: 'סטטוס פתרון למידה' },
            { key: DataStore.KEYS.LOOKUP_PERFORMER_TYPES, label: 'סוג מבצע' },
            { key: DataStore.KEYS.LOOKUP_LECTURER_STATUS, label: 'סטטוס מרצה' },
            { key: DataStore.KEYS.LOOKUP_CERTIFIED_LECTURER, label: 'מרצה מוסב' },
            { key: DataStore.KEYS.LOOKUP_EXPERT_FIELD, label: 'מומחה בתחומו' },
            { key: DataStore.KEYS.LOOKUP_FIELD_KNOWLEDGE, label: 'תחום דעת' },
            { key: DataStore.KEYS.LOOKUP_ROLE_HOLDERS, label: 'בעלי תפקידים' },
            { key: DataStore.KEYS.LOOKUP_BROAD_TOPICS, label: 'נושא רוחב' },
            { key: DataStore.KEYS.LOOKUP_DESIGNATED_PROGRAMS, label: 'תוכניות ייעודיות' },
            { key: DataStore.KEYS.LOOKUP_RESPONSIBILITY_TYPES, label: 'סוג אחריות פתרון למידה' }
        ];

        // בדיקת גבולות
        if (window._activeLookupTabIndex >= tables.length) window._activeLookupTabIndex = 0;
        
        const activeTable = tables[window._activeLookupTabIndex];
        window._currentLookupTableLabel = activeTable.label;

        let tabsHtml = '';
        try {
            tabsHtml = tables.map((t, i) => {
                const isCustomType = t.isCustom ? `'${t.isCustom}'` : 'null';
                const isSchoolsFlag = !!t.isSchools;
                return `<button class="tab ${i === window._activeLookupTabIndex ? 'active' : ''}" 
                    onclick="App.switchLookupTab('${t.key}', this, ${isSchoolsFlag}, ${isCustomType}, ${i}, '${t.label}')"
                    style="padding: 8px 12px; cursor: pointer; border: 1px solid #ccc; background: ${i === window._activeLookupTabIndex ? '#e0e7ff' : '#fff'}; border-radius: 4px 4px 0 0;">
                    ${t.label}
                </button>`;
            }).join('');
        } catch (e) {
            console.error("שגיאה ביצירת הלשוניות:", e);
            tabsHtml = '<div style="color:red; padding:10px;">שגיאה ביצירת הלשוניות. בדוק קונסול.</div>';
        }

        let contentHtml = '<div style="padding:20px;">טוען...</div>';
        try {
            contentHtml = _renderLookupTable(activeTable.key, !!activeTable.isSchools, activeTable.isCustom || null, activeTable.label);
        } catch (e) {
            console.error("שגיאה ברינדור תוכן הטבלה:", e);
            contentHtml = `
                <div style="padding:20px; color:red; direction:rtl; text-align:right; background:#fee2e2; border:1px solid red; border-radius:8px;">
                    <h3>⚠️ שגיאה בהצגת הטבלה: ${activeTable.label}</h3>
                    <p><strong>הודעת שגיאה:</strong> ${e.message}</p>
                    <details><summary>ראה פרטים טכניים (למפתח)</summary><pre style="font-size:12px; overflow:auto;">${e.stack}</pre></details>
                </div>`;
        }

        const section = document.getElementById('section-lookup-tables');
        if (section) {
            section.innerHTML = `
                <div class="card">
                    <div class="card-header"><span class="card-title">🔄 טבלאות ערכים</span></div>
                    <div class="card-body">
                        <div class="tabs" id="lookupTabs" style="display:flex; flex-wrap:wrap; gap:4px; margin-bottom:15px; border-bottom:1px solid #ddd;">${tabsHtml}</div>
                        <div id="lookupContent">${contentHtml}</div>
                    </div>
                </div>`;
        } else {
            console.error("האלמנט section-lookup-tables לא נמצא ב-DOM!");
        }
    } catch (e) {
        console.error("שגיאה קריטית ב-renderLookupTables:", e);
    }
}

    function saveSchool() {
        const code = document.getElementById('fSCHCode').value.trim();
        const name = document.getElementById('fSCHName').value.trim();
        if (!code || !name) { showToast('יש להזין סמל מוסד ושם', 'error'); return; }
        const data = {
            code: code,
            name: name,
            legalStatus: (document.getElementById('fSCHLegalStatus').value || '').trim(),
            educationType: document.getElementById('fSCHEdType').value,
            educationStage: document.getElementById('fSCHEdStage').value,
            principalName: (document.getElementById('fSCHPrincipal').value || '').trim(),
            inspectorName: (document.getElementById('fSCHInspector').value || '').trim(),
            order: 1,
            isActive: true
        };
        if (editingItem) { DataStore.update(DataStore.KEYS.LOOKUP_SCHOOLS, editingItem.id, data); showToast('בית הספר עודכן', 'success'); }
        else { DataStore.create(DataStore.KEYS.LOOKUP_SCHOOLS, data); showToast('בית הספר נוסף', 'success'); }
        editingItem = null; closeModal(); renderLookupTables();
    }

    function deleteSchool(id) {
        confirmDialog('למחוק בית ספר?', () => { _moveToRecycleBin(DataStore.KEYS.LOOKUP_SCHOOLS, id); showToast('נמחק', 'success'); renderLookupTables(); });
    }

    function clearAllSchools() {
        const items = DataStore.getAll(DataStore.KEYS.LOOKUP_SCHOOLS) || [];
        if (!items.length) { showToast('אין רשומות למחיקה', 'info'); return; }
        confirmDialog('למחוק את כל ' + items.length + ' רשומות בתי הספר?\nפעולה זו אינה הפיכה.', function() {
            DataStore.saveAll(DataStore.KEYS.LOOKUP_SCHOOLS, []);
            showToast(items.length + ' רשומות נמחקו בהצלחה', 'success');
            renderLookupTables();
        });
    }

    function clearAllLookupItems() {
        if (!_currentLookupKey) { showToast('לא נבחרה טבלה', 'warning'); return; }
        const items = DataStore.getAll(_currentLookupKey) || [];
        if (!items.length) { showToast('אין רשומות למחיקה', 'info'); return; }
        const label = _currentLookupTableLabel || 'הטבלה';
        confirmDialog('למחוק את כל ' + items.length + ' הרשומות של "' + label + '"?\nפעולה זו אינה הפיכה.', function() {
            DataStore.saveAll(_currentLookupKey, []);
            showToast(items.length + ' רשומות נמחקו בהצלחה', 'success');
            renderLookupTables();
        });
    }

    function clearAllInspectors() {
        const items = DataStore.getAll(DataStore.KEYS.INSPECTORS) || [];
        if (!items.length) { showToast('אין רשומות למחיקה', 'info'); return; }
        confirmDialog('למחוק את כל ' + items.length + ' המפקחים?\nפעולה זו אינה הפיכה.', function() {
            DataStore.saveAll(DataStore.KEYS.INSPECTORS, []);
            showToast(items.length + ' רשומות נמחקו בהצלחה', 'success');
            renderLookupTables();
        });
    }

    function clearAllPedExecs() {
        const items = DataStore.getAll(DataStore.KEYS.PEDAGOGICAL_EXECUTORS) || [];
        if (!items.length) { showToast('אין רשומות למחיקה', 'info'); return; }
        confirmDialog('למחוק את כל ' + items.length + ' המבצעים הפדגוגיים?\nפעולה זו אינה הפיכה.', function() {
            DataStore.saveAll(DataStore.KEYS.PEDAGOGICAL_EXECUTORS, []);
            showToast(items.length + ' רשומות נמחקו בהצלחה', 'success');
            renderLookupTables();
        });
    }

    // ================================================================
    //  INSPECTORS (מפקחים)
    // ================================================================
    function _renderInspectorsTab(label) {
        const items = DataStore.getAll(DataStore.KEYS.INSPECTORS) || [];
        const allSchools = DataStore.getAll(DataStore.KEYS.LOOKUP_SCHOOLS) || [];
        const count = items.length;
        return _lookupTableHeader(label || 'מפקחים', count) +
            _buildActionBar('inspectors', 'App.openInspectorModal()', 'App.clearAllInspectors()', count) +
            `<div style="margin-bottom:12px;"><input type="text" id="inspectorSearch" class="form-input" placeholder="🔍 חיפוש לפי שם, טלפון, מחוז..." oninput="App.filterInspectors()"></div>` +
            `<div id="inspectorsTableDiv">${_renderInspectorsTable(items, allSchools)}</div>`;
    }

    function _renderInspectorsTable(items, allSchools) {
        if (!items || !items.length) return `<div class="empty-state"><div class="empty-icon">👤</div><h3>אין מפקחים</h3><p style="color:var(--gray-500);">הוסף מפקח חדש</p><button class="btn btn-primary" onclick="App.openInspectorModal()">➕ הוסף מפקח</button></div>`;
        if (!allSchools) allSchools = DataStore.getAll(DataStore.KEYS.LOOKUP_SCHOOLS) || [];
        return `<div class="table-wrapper" style="box-shadow:none;max-height:500px;overflow:auto;"><table class="data-table" style="min-width:700px;"><thead><tr><th>שם מפקח</th><th>טלפון</th><th>דוא"ל</th><th>מחוז</th><th>בתי ספר בפיקוח</th><th>פעולות</th></tr></thead><tbody>
        ${items.sort((a,b) => (a.fullName||'').localeCompare(b.fullName||'','he')).map(ins => {
            const schoolNames = (ins.schoolIds || []).map(sid => {
                const sch = allSchools.find(s => s.id === sid);
                return sch ? sch.name || sch.code : sid;
            }).filter(Boolean);
            return `<tr>
                <td><strong>${escAttr(ins.fullName || '')}</strong></td>
                <td style="direction:ltr">${ins.phone || '—'}</td>
                <td>${ins.email || '—'}</td>
                <td>${ins.district || '—'}</td>
                <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${schoolNames.length ? schoolNames.join(', ') : '—'}</td>
                <td><div style="display:flex;gap:4px;">
                    <button class="btn btn-outline btn-sm" onclick="App.openInspectorModal('${ins.id}')">✏️</button>
                    <button class="btn btn-danger btn-sm" onclick="App.deleteInspector('${ins.id}')">🗑️</button>
                </div></td></tr>`;
        }).join('')}
        </tbody></table></div>`;
    }

    function filterInspectors() {
        const q = (document.getElementById('inspectorSearch').value || '').toLowerCase().trim();
        let items = DataStore.getAll(DataStore.KEYS.INSPECTORS) || [];
        if (q) items = items.filter(i => (i.fullName||'').toLowerCase().includes(q) || (i.phone||'').includes(q) || (i.email||'').toLowerCase().includes(q) || (i.district||'').toLowerCase().includes(q));
        document.getElementById('inspectorsTableDiv').innerHTML = _renderInspectorsTable(items);
    }

    function openInspectorModal(id) {
        const ins = id ? DataStore.getById(DataStore.KEYS.INSPECTORS, id) : null;
        editingItem = ins;
        const allSchools = DataStore.getAll(DataStore.KEYS.LOOKUP_SCHOOLS) || [];
        const selectedIds = (ins && ins.schoolIds) ? ins.schoolIds : [];
        const schoolChecks = allSchools.filter(s => s.isActive !== false).sort((a,b) => (a.name||'').localeCompare(b.name||'','he')).map(s => {
            const checked = selectedIds.includes(s.id) ? 'checked' : '';
            return `<label style="display:flex;align-items:center;gap:6px;padding:3px 0;font-size:13px;cursor:pointer;"><input type="checkbox" class="inspectorSchoolCb" value="${s.id}" ${checked}> ${escAttr(s.name || s.code)}</label>`;
        }).join('');
        showModal(ins ? 'עריכת מפקח' : 'הוספת מפקח חדש', `
            <div class="form-grid">
                <div class="form-group"><label>שם מפקח *</label><input type="text" id="fInsName" class="form-input" value="${ins ? escAttr(ins.fullName || '') : ''}" required></div>
                <div class="form-group"><label>טלפון</label><input type="text" id="fInsPhone" class="form-input" value="${ins ? ins.phone || '' : ''}" dir="ltr" style="text-align:right;"></div>
                <div class="form-group"><label>דוא"ל</label><input type="email" id="fInsEmail" class="form-input" value="${ins ? ins.email || '' : ''}"></div>
                <div class="form-group"><label>מחוז</label><input type="text" id="fInsDistrict" class="form-input" value="${ins ? escAttr(ins.district || '') : ''}"></div>
            </div>
            <div class="form-group" style="margin-top:12px;">
                <label>רשימת בתי ספר בפיקוח</label>
                <div style="max-height:200px;overflow-y:auto;border:1px solid var(--gray-200);border-radius:var(--border-radius);padding:10px;margin-top:6px;background:var(--gray-50);">
                    ${schoolChecks || '<span style="color:var(--gray-400);font-size:13px;">אין בתי ספר במאגר</span>'}
                </div>
            </div>`,
        `<button class="btn btn-primary" onclick="App.saveInspector()">${ins ? '💾 שמור' : '➕ הוסף'}</button><button class="btn btn-outline" onclick="App.closeModal()">ביטול</button>`);
    }

    function saveInspector() {
        const name = (document.getElementById('fInsName').value || '').trim();
        if (!name) { showToast('יש להזין שם מפקח', 'error'); return; }
        const schoolIds = Array.from(document.querySelectorAll('.inspectorSchoolCb:checked')).map(cb => cb.value);
        const data = {
            fullName: name,
            phone: (document.getElementById('fInsPhone').value || '').trim(),
            email: (document.getElementById('fInsEmail').value || '').trim(),
            district: (document.getElementById('fInsDistrict').value || '').trim(),
            schoolIds: schoolIds
        };
        if (editingItem) {
            DataStore.update(DataStore.KEYS.INSPECTORS, editingItem.id, data);
            logActivity('edit_inspector', 'עריכת מפקח: ' + name, 'inspector', editingItem.id);
            showToast('המפקח עודכן', 'success');
        } else {
            DataStore.create(DataStore.KEYS.INSPECTORS, data);
            logActivity('add_inspector', 'הוספת מפקח: ' + name, 'inspector', '');
            showToast('המפקח נוסף', 'success');
        }
        editingItem = null; closeModal(); renderLookupTables();
    }

    function deleteInspector(id) {
        confirmDialog('למחוק מפקח?', () => {
            _moveToRecycleBin(DataStore.KEYS.INSPECTORS, id);
            logActivity('delete_inspector', 'מחיקת מפקח', 'inspector', id);
            showToast('המפקח נמחק', 'success');
            renderLookupTables();
        });
    }

    // ================================================================
    //  PEDAGOGICAL EXECUTORS (מבצעים פדגוגיים)
    // ================================================================
    function _renderPedExecTab(label) {
        const items = DataStore.getAll(DataStore.KEYS.PEDAGOGICAL_EXECUTORS) || [];
        const count = items.length;
        return _lookupTableHeader(label || 'מבצעים פדגוגיים', count) +
            _buildActionBar('pedagogical_executors', 'App.openPedExecModal()', 'App.clearAllPedExecs()', count) +
            `<div style="margin-bottom:12px;"><input type="text" id="pedExecSearch" class="form-input" placeholder="🔍 חיפוש..." oninput="App.filterPedExec()"></div>` +
            `<div id="pedExecTableDiv">${_renderPedExecTable(items)}</div>`;
    }

    function _renderPedExecTable(items) {
        if (!items || !items.length) return `<div class="empty-state"><div class="empty-icon">🏢</div><h3>אין מבצעים פדגוגיים</h3><p style="color:var(--gray-500);">הוסף מבצע פדגוגי חדש</p><button class="btn btn-primary" onclick="App.openPedExecModal()">➕ הוסף מבצע פדגוגי</button></div>`;
        return `<div class="table-wrapper" style="box-shadow:none;"><table class="data-table"><thead><tr><th>ח.פ.</th><th>שם המוסד</th><th>קבוצה</th><th>עלות שעה (₪)</th><th>הערה</th><th>פעולות</th></tr></thead><tbody>
        ${items.sort((a,b) => (a.institutionName||'').localeCompare(b.institutionName||'','he')).map(pe => `<tr>
            <td>${escAttr(pe.companyNumber || '')}</td>
            <td><strong>${escAttr(pe.institutionName || pe.fullName || '')}</strong></td>
            <td>${escAttr(pe.groupName || '')}</td>
            <td style="direction:ltr;text-align:center;">${pe.hourlyCost != null ? Number(pe.hourlyCost).toLocaleString() : '—'}</td>
            <td>${escAttr(pe.notes || '')}</td>
            <td><div style="display:flex;gap:4px;">
                <button class="btn btn-outline btn-sm" onclick="App.openPedExecModal('${pe.id}')">✏️</button>
                <button class="btn btn-danger btn-sm" onclick="App.deletePedExec('${pe.id}')">🗑️</button>
            </div></td></tr>`).join('')}
        </tbody></table></div>`;
    }

    function filterPedExec() {
        const q = (document.getElementById('pedExecSearch').value || '').toLowerCase().trim();
        let items = DataStore.getAll(DataStore.KEYS.PEDAGOGICAL_EXECUTORS) || [];
        if (q) items = items.filter(i => ((i.companyNumber||'')+(i.institutionName||'')+(i.fullName||'')+(i.groupName||'')+(i.notes||'')).toLowerCase().includes(q));
        document.getElementById('pedExecTableDiv').innerHTML = _renderPedExecTable(items);
    }

    function openPedExecModal(id) {
        const pe = id ? DataStore.getById(DataStore.KEYS.PEDAGOGICAL_EXECUTORS, id) : null;
        editingItem = pe;
        showModal(pe ? 'עריכת מבצע פדגוגי' : 'הוספת מבצע פדגוגי חדש', `
            <div class="form-group"><label>ח.פ.</label><input type="text" id="fPECompanyNum" class="form-input" value="${pe ? escAttr(pe.companyNumber || '') : ''}" placeholder="מספר רישום ברשם החברות"></div>
            <div class="form-group"><label>שם המוסד *</label><input type="text" id="fPEInstitutionName" class="form-input" value="${pe ? escAttr(pe.institutionName || pe.fullName || '') : ''}" required></div>
            <div class="form-group"><label>קבוצה</label><input type="text" id="fPEGroupName" class="form-input" value="${pe ? escAttr(pe.groupName || '') : ''}"></div>
            <div class="form-group"><label>עלות שעה (₪)</label><input type="number" id="fPEHourlyCost" class="form-input" value="${pe && pe.hourlyCost != null ? pe.hourlyCost : ''}" min="0" step="0.01" placeholder="0.00"></div>
            <div class="form-group"><label>הערה</label><textarea id="fPENotes" class="form-textarea" rows="2">${pe ? escAttr(pe.notes || '') : ''}</textarea></div>`,
        `<button class="btn btn-primary" onclick="App.savePedExec()">${pe ? '💾 שמור' : '➕ הוסף'}</button><button class="btn btn-outline" onclick="App.closeModal()">ביטול</button>`);
    }

    function savePedExec() {
        const institutionName = (document.getElementById('fPEInstitutionName').value || '').trim();
        if (!institutionName) { showToast('יש להזין שם מוסד', 'error'); return; }
        const data = {
            companyNumber: (document.getElementById('fPECompanyNum').value || '').trim(),
            institutionName: institutionName,
            groupName: (document.getElementById('fPEGroupName').value || '').trim(),
            hourlyCost: parseFloat(String(record.hourlyCost || '').replace(/[^\d.-]/g, '')) || 0,
            notes: (document.getElementById('fPENotes').value || '').trim()
        };
        if (editingItem) {
            DataStore.update(DataStore.KEYS.PEDAGOGICAL_EXECUTORS, editingItem.id, data);
            logActivity('edit_ped_exec', 'עריכת מבצע פדגוגי: ' + institutionName, 'pedagogical_executor', editingItem.id);
            showToast('המבצע הפדגוגי עודכן', 'success');
        } else {
            DataStore.create(DataStore.KEYS.PEDAGOGICAL_EXECUTORS, data);
            logActivity('add_ped_exec', 'הוספת מבצע פדגוגי: ' + institutionName, 'pedagogical_executor', '');
            showToast('המבצע הפדגוגי נוסף', 'success');
        }
        editingItem = null; closeModal(); renderLookupTables();
    }

    function deletePedExec(id) {
        confirmDialog('למחוק מבצע פדגוגי?', () => {
            _moveToRecycleBin(DataStore.KEYS.PEDAGOGICAL_EXECUTORS, id);
            logActivity('delete_ped_exec', 'מחיקת מבצע פדגוגי', 'pedagogical_executor', id);
            showToast('נמחק', 'success');
            renderLookupTables();
        });
    }

    function openLookupModal(key, id = null) {
        const item = id ? DataStore.getById(key, id) : null;
        editingItem = { key, item };
        showModal(item ? 'עריכת ערך' : 'ערך חדש', `
            <div class="form-group"><label>ערך *</label><input type="text" id="fLKValue" class="form-input" value="${item ? item.value : ''}" required></div>
            <div class="form-group"><label>תווית (עברית)</label><input type="text" id="fLKLabel" class="form-input" value="${item ? item.label : ''}"></div>
            <div class="form-group"><label>תווית (ערבית)</label><input type="text" id="fLKLabelAr" class="form-input" value="${item ? (item.labelAr || '') : ''}" dir="rtl" style="text-align:right;"></div>`,
        `<button class="btn btn-primary" onclick="App.saveLookupItem()">${item ? '💾 שמור' : '➕ הוסף'}</button><button class="btn btn-outline" onclick="App.closeModal()">ביטול</button>`);
    }

    function saveLookupItem() {
        const key = editingItem.key;
        const item = editingItem.item;
        const val = document.getElementById('fLKValue').value.trim();
        if (!val) { showToast('יש להזין ערך', 'error'); return; }
        const labelAr = document.getElementById('fLKLabelAr').value.trim();
        const data = {
            value: val,
            label: document.getElementById('fLKLabel').value.trim() || val,
            labelAr: labelAr,
            isActive: true
        };
        if (item) {
            data.order = item.order; // preserve existing order on edit
            DataStore.update(key, item.id, data);
            showToast('הערך עודכן', 'success');
        } else {
            // Auto-assign next order
            const existing = DataStore.getAll(key) || [];
            const maxOrder = existing.reduce((max, i) => Math.max(max, i.order || 0), 0);
            data.order = maxOrder + 1;
            DataStore.create(key, data);
            showToast('הערך נוסף', 'success');
        }
        editingItem = null; closeModal(); renderLookupTables();
    }

    function moveLookupItem(key, id, direction) {
        const items = (DataStore.getAll(key) || []).filter(i => i.isActive !== false);
        const sorted = items.slice().sort((a,b) => a.order - b.order);
        const idx = sorted.findIndex(i => i.id === id);
        if (idx < 0) return;
        let targetIdx;
        if (direction === 'up' && idx > 0) targetIdx = idx - 1;
        else if (direction === 'down' && idx < sorted.length - 1) targetIdx = idx + 1;
        else return;
        const itemA = sorted[idx];
        const itemB = sorted[targetIdx];
        const tempOrder = itemA.order;
        DataStore.update(key, itemA.id, { order: itemB.order });
        DataStore.update(key, itemB.id, { order: tempOrder });
        renderLookupTables();
    }

    function deleteLookupItem(key, id) {
        confirmDialog('למחוק ערך?', () => { _moveToRecycleBin(key, id); showToast('נמחק', 'success'); renderLookupTables(); });
    }

    // ================================================================
    //  IMPORT / EXPORT
    // ================================================================
    function downloadBudgetTemplate() {
        var headers = ['קוד תקציב', 'שנת תקציב (עברית)', 'שנת תקציב', 'תקופה', 'ידוע / משוערך', 'צבע הכסף', 'יחידה ארגונית מנהלת', 'תקציב עבור', 'תיאור תקציב', 'הערה', 'סכום (₪)', 'יתרת תכנון (₪)', 'יתרת ניהול (₪)', 'יתרת תקציב פנויה (₪)'];
        if (typeof XLSX !== 'undefined') {
            var ws = XLSX.utils.aoa_to_sheet([headers]);
            ws['!cols'] = headers.map(function() { return { wch: 22 }; });
            var wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'תקציבים');
            XLSX.writeFile(wb, 'תבנית_ייבוא_תקציבים.xlsx');
        } else {
            var csv = '\uFEFF' + headers.join(',') + '\n';
            downloadFile(csv, 'תבנית_ייבוא_תקציבים.csv', 'text/csv;charset=utf-8;');
        }
        showToast('תבנית הורדה בהצלחה', 'success');
    }

    function renderImportExport() {
        document.getElementById('section-import-export').innerHTML = `
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(350px,1fr));gap:24px;">
                <div class="card"><div class="card-header"><span class="card-title">📤 ייצוא נתונים</span></div><div class="card-body">
                    <div style="display:flex;flex-direction:column;gap:8px;">
                        <button class="btn btn-primary btn-block" onclick="App.exportCSV('solutions')">📤 פתרונות למידה (CSV)</button>
                        <button class="btn btn-outline btn-block" onclick="App.exportCSV('mentors')">📤 מאגר מרצים (CSV)</button>
                        <button class="btn btn-outline btn-block" onclick="App.exportExcelGuides()">📤 מאגר מדריכים (Excel)</button>
                        <button class="btn btn-outline btn-block" onclick="App.exportCSV('budgets')">📤 תקציבים (CSV)</button>
                        <button class="btn btn-outline btn-block" onclick="App.exportCSV('schools')">📤 רשימת בתי ספר (CSV)</button>
                    </div>
                    <hr style="margin:16px 0;border:none;border-top:1px solid var(--gray-200);">
                    <button class="btn btn-success btn-block" onclick="App.backupFull()">💾 גיבוי מלא (JSON)</button>
                </div></div>
                <div class="card"><div class="card-header"><span class="card-title">📥 ייבוא נתונים</span></div><div class="card-body">
                    <p style="color:var(--gray-500);margin-bottom:16px;">ייבוא Excel/CSV עם אשף מיפוי עמודות</p>
                    <div style="display:flex;flex-direction:column;gap:8px;">
                        <label class="btn btn-primary btn-block" style="cursor:pointer;">📥 ייבוא פתרונות למידה (Excel/CSV)<input type="file" accept=".csv,.xlsx,.xls" style="display:none;" onchange="App.startImport('solutions',this)"></label>
                        <label class="btn btn-outline btn-block" style="cursor:pointer;">📥 ייבוא מרצים (Excel/CSV)<input type="file" accept=".csv,.xlsx,.xls" style="display:none;" onchange="App.startImport('mentors',this)"></label>
                        <label class="btn btn-outline btn-block" style="cursor:pointer;">📥 ייבוא מדריכים (Excel/CSV)<input type="file" accept=".csv,.xlsx,.xls" style="display:none;" onchange="App.startImport('guides_repo',this)"></label>
                        <label class="btn btn-outline btn-block" style="cursor:pointer;">📥 ייבוא משתמשים (Excel/CSV)<input type="file" accept=".csv,.xlsx,.xls" style="display:none;" onchange="App.startImport('users',this)"></label>
                        <label class="btn btn-outline btn-block" style="cursor:pointer;">📥 ייבוא תקציבים (Excel/CSV)<input type="file" accept=".csv,.xlsx,.xls" style="display:none;" onchange="App.startImport('budgets',this)"></label>
                        <button class="btn btn-outline btn-block" style="border-style:dashed;font-size:13px;" onclick="App.downloadBudgetTemplate()">📄 הורדת תבנית ייבוא — תקציבים</button>
                        <label class="btn btn-outline btn-block" style="cursor:pointer;">📥 ייבוא רשימת בתי ספר (Excel/CSV)<input type="file" accept=".csv,.xlsx,.xls" style="display:none;" onchange="App.startImport('schools',this)"></label>
                        <label class="btn btn-success btn-block" style="cursor:pointer;">📥 ייבוא גיבוי (JSON)<input type="file" accept=".json" style="display:none;" onchange="App.importJSON(this)"></label>
                    </div>
                </div></div>
            </div>`;
    }

	// ================================================================
	//  ייצוא ל-CSV (מתוקן לתמיכה מלאה בעברית/ערבית ובשדות החדשים)
	// ================================================================
	function exportCSV(section) {
		if (section !== 'registrations') {
			showToast('ייצוא זה זמין כרגע רק לנרשמים', 'info');
			return;
		}

		let items = DataStore.getAll(DataStore.KEYS.REGISTRATIONS) || [];
		
		// סינון לפי הרשאות (אם יש)
		const visibleSolIds = _getGuideVisibleSolutionIds();
		if (visibleSolIds !== null) {
			items = items.filter(r => visibleSolIds.includes(r.solutionId));
		}

		if (!items.length) {
			showToast('אין נתונים לייצוא', 'warning');
			return;
		}

		// הגדרת כותרות העמודות
		const headers = ['תאריך רישום', 'שם פתרון למידה', 'שם מלא', 'טלפון', 'דוא"ל', 'סמל מוסד', 'שם בית ספר', 'תפקיד'];

		// פונקציית עזר לניקוי וציטוט ערכים ל-CSV (מונעת שבירה בגלל פסיקים או גרשיים בתוך הטקסט)
		const escapeCSV = (val) => {
			if (val === null || val === undefined) return '';
			const str = String(val).trim();
			// אם הערך מכיל פסיק, גרש, או ירידת שורה, עוטפים אותו בגרשיים ומכפילים גרשיים פנימיים
			if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
				return '"' + str.replace(/"/g, '""') + '"';
			}
			return str;
		};

		// בניית שורות הנתונים
		const rows = items.map(r => {
			// טיפול נכון בשדות המוסד (גם אם הגיעו כמערך וגם אם הגיעו כמחרוזת מופרדת)
			const codes = Array.isArray(r.institutionCodes) 
				? r.institutionCodes.join(' | ') 
				: (r.institutionCodes || r.institutionCode || '');
				
			const names = Array.isArray(r.institutionNames) 
				? r.institutionNames.join(' | ') 
				: (r.institutionNames || r.institutionName || '');

			return [
				formatDate(r.createdAt),
				r.solutionName || '',
				r.fullName || '',
				r.phone || '',
				r.email || '',
				codes,
				names,
				r.role || ''
			];
		});

		// הרכבת מחרוזת ה-CSV
		let csvContent = headers.map(escapeCSV).join(',') + '\n';
		rows.forEach(row => {
			csvContent += row.map(escapeCSV).join(',') + '\n';
		});

		// 🔑 קריטי: הוספת UTF-8 BOM (\uFEFF) כדי שאקסל יזהה עברית/ערבית נכון
		const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
		
		// יצירת קישור הורדה דינמי
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		const fileName = `matspanet_registrations_${new Date().toISOString().split('T')[0]}.csv`;
		link.setAttribute('download', fileName);
		
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);

		showToast(`קובץ ${fileName} יוצא בהצלחה`, 'success');
	}

    function exportJSON() {
        const data = DataStore.exportAllData();
        data.__backup_meta = { type: 'full', timestamp: new Date().toISOString(), version: '2.0', tableCount: Object.keys(data).length - 1 };
        downloadFile(JSON.stringify(data, null, 2), `matspanet_backup_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
        showToast('גיבוי יוצא בהצלחה', 'success');
    }

    // ======================== Batch Import for Mentors (Large File Support) ========================

    var _batchImportCancel = false;
    var _batchImportValidRows = null;
    var _batchImportErrors = null;
    var _batchImportUpdateDetails = null; // Array of {rowNum, idNumber, fullName, changedFields: [{field, label, oldVal, newVal}]}
    var _MENTOR_UPSERT_FIELDS = ['fullNameHe', 'fullNameAr', 'phone', 'email', 'isCertifiedLecturer', 'expertInField', 'lecturerStatus'];
    var _MENTOR_FIELD_LABELS = { fullNameHe: 'שם מרצה (עברית)', fullNameAr: 'שם מרצה (ערבית)', phone: 'טלפון נייד', email: 'דוא"ל', isCertifiedLecturer: 'מרצה מוסב', expertInField: 'מומחה בתחומו', lecturerStatus: 'סטטוס' };

    function _showMentorsImportSummary(newRows, updateRows, errors, fieldMappings) {
        var totalDataRows = newRows.length + updateRows.length;
        var errorCount = errors.length;
        var totalWithUpdates = 0;
        updateRows.forEach(function(u) { totalWithUpdates += u.changedFields.length; });

        var html = '<div style="direction:rtl;text-align:right;">';

        // Summary stats — 4 cards
        html += '<div style="display:grid;grid-template-columns:repeat(2, 1fr);gap:10px;margin-bottom:16px;">';
        html += '<div style="background:var(--success, #16a34a);color:#fff;border-radius:10px;padding:14px;text-align:center;">';
        html += '<div style="font-size:28px;font-weight:700;">' + newRows.length + '</div>';
        html += '<div style="font-size:12px;opacity:0.9;">רשומות חדשות</div></div>';

        html += '<div style="background:var(--info, #0ea5e9);color:#fff;border-radius:10px;padding:14px;text-align:center;">';
        html += '<div style="font-size:28px;font-weight:700;">' + updateRows.length + '</div>';
        html += '<div style="font-size:12px;opacity:0.9;">רשומות קיימות לעדכון</div></div>';

        html += '<div style="background:' + (errorCount > 0 ? 'var(--danger, #dc2626)' : 'var(--gray-300, #d1d5db)') + ';color:#fff;border-radius:10px;padding:14px;text-align:center;">';
        html += '<div style="font-size:28px;font-weight:700;">' + errorCount + '</div>';
        html += '<div style="font-size:12px;opacity:0.9;">שורות עם חסימות</div></div>';

        html += '<div style="background:var(--primary-color, #4f46e5);color:#fff;border-radius:10px;padding:14px;text-align:center;">';
        html += '<div style="font-size:28px;font-weight:700;">' + totalWithUpdates + '</div>';
        html += '<div style="font-size:12px;opacity:0.9;">שינויי שדות צפויים</div></div>';
        html += '</div>';

        // Batch info
        var batchCount = Math.ceil(totalDataRows / 5000);
        html += '<div style="background:var(--gray-50, #f9fafb);border:1px solid var(--gray-200, #e5e7eb);border-radius:8px;padding:12px;margin-bottom:16px;">';
        html += '<div style="font-weight:600;font-size:13px;margin-bottom:6px;">📋 תכנית ייבוא</div>';
        html += '<div style="font-size:12px;color:var(--gray-600);">';
        html += '• ' + totalDataRows + ' רשומות יחולקו ל-<strong>' + batchCount + ' מחזורים</strong> (עד 5,000 במחזור)<br>';
        html += '• רשומות קיימות יעודכנו בלבד אם חל שינוי בשדות (Upsert)<br>';
        html += '• הייבוא יתבצע ברקע עם הצגת התקדמות</div></div>';

        // Updated records preview (first 10 with changes)
        var updatesWithChanges = updateRows.filter(function(u) { return u.changedFields.length > 0; });
        if (updatesWithChanges.length > 0) {
            html += '<div style="margin-bottom:12px;">';
            html += '<div style="color:var(--info, #0ea5e9);font-weight:600;margin-bottom:8px;">🔄 תצוגה מקדימה — שינויים צפויים (' + updatesWithChanges.length + ' רשומות עם שינויים):</div>';
            html += '<div style="max-height:220px;overflow-y:auto;border:1px solid var(--gray-200);border-radius:6px;">';
            html += '<table class="data-table" style="box-shadow:none;font-size:11px;"><thead><tr><th>שורה</th><th>ת.ז.</th><th>שם</th><th>שדה</th><th>ערך ישן</th><th>ערך חדש</th></tr></thead><tbody>';
            var previewCount = 0;
            updatesWithChanges.forEach(function(u) {
                if (previewCount >= 30) return; // limit preview rows
                u.changedFields.forEach(function(cf) {
                    if (previewCount >= 30) return;
                    html += '<tr><td>' + u.rowNum + '</td><td>' + escAttr(u.idNumber) + '</td><td>' + escAttr(u.fullName) + '</td>';
                    html += '<td>' + escAttr(cf.label) + '</td>';
                    html += '<td style="color:var(--gray-500);text-decoration:line-through;">' + escAttr(cf.oldVal) + '</td>';
                    html += '<td style="color:var(--success, #16a34a);font-weight:600;">' + escAttr(cf.newVal) + '</td></tr>';
                    previewCount++;
                });
            });
            html += '</tbody></table></div>';
            if (previewCount < totalWithUpdates) {
                html += '<div style="font-size:11px;color:var(--gray-500);margin-top:4px;">מוצגות ' + previewCount + ' שורות שינוי ראשונות מתוך ' + totalWithUpdates + '</div>';
            }
            html += '</div>';
        }

        // Errors table (if any)
        if (errorCount > 0) {
            html += '<div style="margin-bottom:12px;">';
            html += '<div style="color:var(--danger, #dc2626);font-weight:600;margin-bottom:8px;">⚠️ שגיאות שנמצאו (' + errorCount + '):</div>';
            html += '<div style="max-height:200px;overflow-y:auto;border:1px solid var(--gray-200);border-radius:6px;">';
            html += '<table class="data-table" style="box-shadow:none;font-size:12px;"><thead><tr><th>שורה</th><th>שדה</th><th>שגיאה</th></tr></thead><tbody>';
            var showErrors = errors.slice(0, 50);
            showErrors.forEach(function(e) {
                html += '<tr><td>' + e.row + '</td><td>' + escAttr(e.field) + '</td><td style="color:var(--danger, #dc2626);">' + escAttr(e.error) + '</td></tr>';
            });
            html += '</tbody></table></div>';
            if (errorCount > 50) {
                html += '<div style="font-size:11px;color:var(--gray-500);margin-top:4px;">מוצגות 50 שגיאות ראשונות מתוך ' + errorCount + ' — קובץ מלא ייכלל בדו"ח הסיכום</div>';
            }
            html += '</div>';
        }

        html += '</div>';

        var btns = '';
        if (totalDataRows > 0) {
            btns += '<button class="btn btn-primary" onclick="App._executeMentorsBatchImport()">▶️ התחל ייבוא</button>';
        }
        btns += '<button class="btn btn-outline" onclick="App.closeModal()">ביטול</button>';

        closeModal();
        showModal('אימות מקדים — ייבוא מרצים', html, btns);
    }

function _executeMentorsBatchImport(fieldMappings, rows) {
    if (!rows || !rows.length) {
        showToast('אין רשומות לייבוא', 'warning');
        return;
    }
    
    closeModal();
    
    var total = rows.length;
    var batchSize = 1000;
    var currentBatch = 0;
    var newCount = 0;
    var updatedCount = 0;
    var errorCount = 0;
    
    // טעינה חד-פעמית של המרצים הקיימים
    var allMentors = DataStore.getAll(DataStore.KEYS.MENTORS) || [];
    var mentorMap = {};
    allMentors.forEach(function(m, idx) {
        if (m.idNumber) mentorMap[m.idNumber] = idx;
    });
    
    // הצגת מסך התקדמות
    showModal('ייבוא מדורג', 
        '<div style="text-align:center;padding:20px;">' +
        '<div style="font-size:48px;margin-bottom:12px;">⏳</div>' +
        '<div id="importStatus" style="font-weight:600;margin-bottom:12px;">מכין ייבוא...</div>' +
        '<div style="height:12px;background:#e5e7eb;border-radius:6px;overflow:hidden;margin-bottom:8px;">' +
        '<div id="importBar" style="width:0%;height:100%;background:var(--primary);border-radius:6px;transition:width 0.2s;"></div>' +
        '</div>' +
        '<div id="importDetail" style="font-size:13px;color:var(--gray-500);">0 / ' + total + '</div>' +
        '</div>', '', true);
    
    function processChunk() {
        var start = currentBatch * batchSize;
        var end = Math.min(start + batchSize, total);
        
        for (var i = start; i < end; i++) {
            var row = rows[i];
            var record = {};
            
            // 🔑 תיקון קריטי: מיפוי השדות לפי fieldMappings
            fieldMappings.forEach(function(fm) {
                if (fm.colIdx < row.length) {
                    var val = row[fm.colIdx];
                    record[fm.fieldKey] = val ? String(val).trim().replace(/^\$+/, '') : '';
                }
            });
            
            var idNum = record.idNumber;
            if (!idNum) {
                errorCount++;
                continue;
            }
            
            var existingIdx = mentorMap[idNum];
            if (existingIdx !== undefined) {
                // עדכון רשומה קיימת
                var existing = allMentors[existingIdx];
                Object.keys(record).forEach(function(key) {
                    if (key !== 'idNumber') existing[key] = record[key];
                });
                existing.updatedAt = new Date().toISOString();
                updatedCount++;
            } else {
                // יצירת רשומה חדשה
                var newMentor = {
                    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
                    idNumber: idNum,
                    fullNameHe: record.fullNameHe || '',
                    fullNameAr: record.fullNameAr || '',
                    phone: record.phone || '',
                    email: record.email || '',
                    isCertifiedLecturer: record.isCertifiedLecturer || '',
                    expertInField: record.expertInField || '',
                    lecturerStatus: record.lecturerStatus || '',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                allMentors.push(newMentor);
                mentorMap[idNum] = allMentors.length - 1;
                newCount++;
            }
        }
        
        // שמירה לשרת (וגם לזיכרון אם צריך)
        try {
            DataStore.saveAll(DataStore.KEYS.MENTORS, allMentors);
        } catch(e) {
            console.error('Chunk save failed:', e);
        }
        
        currentBatch++;
        var pct = Math.min(100, Math.round((currentBatch * batchSize / total) * 100));
        var bar = document.getElementById('importBar');
        var status = document.getElementById('importStatus');
        var detail = document.getElementById('importDetail');
        
        if (bar) bar.style.width = pct + '%';
        if (status) status.textContent = 'מעבד מחזור ' + currentBatch + ' מתוך ' + Math.ceil(total / batchSize) + '...';
        if (detail) detail.textContent = Math.min(currentBatch * batchSize, total) + ' / ' + total + ' רשומות';
        
        if (currentBatch * batchSize < total) {
            setTimeout(processChunk, 50);
        } else {
            closeModal();
            showToast('ייבוא הושלם: ' + newCount + ' חדשים, ' + updatedCount + ' עודכנו' + (errorCount > 0 ? ', ' + errorCount + ' שגיאות' : ''), 'success');
            importWizardData = { type: null, headers: [], rows: [], mappings: {} };
            renderMentors();
        }
    }
    
    setTimeout(processChunk, 100);
}

    function _cancelBatchImport() {
        _batchImportCancel = true;
    }

    function _onBatchImportComplete(newCount, updatedCount, errorRows, updateDetails, cancelled) {
        importWizardData = { type: null, headers: [], rows: [], mappings: {} };
        _importTargetKey = null;
        _batchImportValidRows = null;
        _batchImportUpdateDetails = updateDetails;

        var html = '<div style="direction:rtl;text-align:right;">';

        // Result stats — 3 cards
        html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin-bottom:16px;">';

        html += '<div style="background:var(--success, #16a34a);color:#fff;border-radius:10px;padding:14px;text-align:center;">';
        html += '<div style="font-size:32px;font-weight:700;">' + newCount + '</div>';
        html += '<div style="font-size:12px;opacity:0.9;">רשומות חדשות נוספו</div></div>';

        html += '<div style="background:var(--info, #0ea5e9);color:#fff;border-radius:10px;padding:14px;text-align:center;">';
        html += '<div style="font-size:32px;font-weight:700;">' + updatedCount + '</div>';
        html += '<div style="font-size:12px;opacity:0.9;">רשומות קיימות עודכנו</div></div>';

        html += '<div style="background:' + (errorRows.length > 0 ? 'var(--danger, #dc2626)' : 'var(--gray-300, #d1d5db)') + ';color:#fff;border-radius:10px;padding:14px;text-align:center;">';
        html += '<div style="font-size:32px;font-weight:700;">' + errorRows.length + '</div>';
        html += '<div style="font-size:12px;opacity:0.9;">רשומות נכשלו</div></div>';
        html += '</div>';

        if (cancelled) {
            html += '<div style="background:var(--warning, #f59e0b);color:#fff;border-radius:8px;padding:10px;text-align:center;font-weight:600;margin-bottom:12px;">⏹ ייבוא בוטל</div>';
        }

        // Updated records field change details
        var updatesWithChanges = (updateDetails || []).filter(function(u) { return u.changedFields.length > 0; });
        if (updatesWithChanges.length > 0) {
            var totalFieldChanges = 0;
            updatesWithChanges.forEach(function(u) { totalFieldChanges += u.changedFields.length; });
            html += '<div style="margin-bottom:12px;">';
            html += '<div style="color:var(--info, #0ea5e9);font-weight:600;margin-bottom:8px;">🔄 פירוט שינויים ברשומות קיימות (' + updatesWithChanges.length + ' רשומות, ' + totalFieldChanges + ' שינויי שדות):</div>';
            html += '<div style="max-height:250px;overflow-y:auto;border:1px solid var(--gray-200);border-radius:6px;">';
            html += '<table class="data-table" style="box-shadow:none;font-size:11px;"><thead><tr><th>שורה</th><th>ת.ז.</th><th>שם</th><th>שדה</th><th>ערך ישן</th><th>ערך חדש</th></tr></thead><tbody>';
            var detailCount = 0;
            updatesWithChanges.forEach(function(u) {
                u.changedFields.forEach(function(cf) {
                    if (detailCount >= 50) return;
                    html += '<tr><td>' + u.rowNum + '</td><td>' + escAttr(u.idNumber) + '</td><td>' + escAttr(u.fullName) + '</td>';
                    html += '<td>' + escAttr(cf.label) + '</td>';
                    html += '<td style="color:var(--gray-500);text-decoration:line-through;">' + escAttr(cf.oldVal) + '</td>';
                    html += '<td style="color:var(--success, #16a34a);font-weight:600;">' + escAttr(cf.newVal) + '</td></tr>';
                    detailCount++;
                });
            });
            html += '</tbody></table></div>';
            if (detailCount < totalFieldChanges) {
                html += '<div style="font-size:11px;color:var(--gray-500);margin-top:4px;">מוצגות ' + detailCount + ' שורות שינוי ראשונות מתוך ' + totalFieldChanges + '</div>';
            }
            html += '</div>';
        }

        // Error details
        if (errorRows.length > 0) {
            html += '<div style="margin-bottom:12px;">';
            html += '<div style="color:var(--danger, #dc2626);font-weight:600;margin-bottom:8px;">⚠️ פירוט שגיאות:</div>';
            html += '<div style="max-height:200px;overflow-y:auto;border:1px solid var(--gray-200);border-radius:6px;">';
            html += '<table class="data-table" style="box-shadow:none;font-size:12px;"><thead><tr><th>שורה</th><th>שדה</th><th>שגיאה</th></tr></thead><tbody>';
            var showErrs = errorRows.slice(0, 50);
            showErrs.forEach(function(e) {
                html += '<tr><td>' + e.row + '</td><td>' + escAttr(e.field) + '</td><td style="color:var(--danger, #dc2626);">' + escAttr(e.error) + '</td></tr>';
            });
            html += '</tbody></table></div>';
            if (errorRows.length > 50) {
                html += '<div style="font-size:11px;color:var(--gray-500);margin-top:4px;">מוצגות 50 שגיאות ראשונות מתוך ' + errorRows.length + '</div>';
            }
            html += '</div>';
        }

        html += '</div>';

        var btns = '<button class="btn btn-outline" onclick="App.closeModal(); App.renderMentors();">סגור</button>';
        if (updatesWithChanges.length > 0) {
            btns = '<button class="btn btn-outline" onclick="App._downloadUpdateDetails()">📋 הורדת פירוט עדכונים</button>' + btns;
        }
        if (errorRows.length > 0) {
            btns = '<button class="btn btn-outline" onclick="App._downloadImportErrors()">📥 הורדת קובץ שגיאות</button>' + btns;
        }

        _batchImportErrors = errorRows;

        closeModal();
        showModal('דו"ח סיכום — ייבוא מרצים', html, btns);

        renderMentors();
        var totalProcessed = newCount + updatedCount;
        if (totalProcessed > 0) {
            logActivity('import_mentors_batch', 'ייבוא מדורג: ' + newCount + ' חדשות, ' + updatedCount + ' עודכנו' + (errorRows.length ? ', ' + errorRows.length + ' נכשלו' : ''), 'mentor', null);
        }
    }

    function _downloadImportErrors() {
        if (!_batchImportErrors || !_batchImportErrors.length) { showToast('אין שגיאות להורדה', 'warning'); return; }
        var csv = '\uFEFF' + 'שורה,שדה,שגיאה\n';
        _batchImportErrors.forEach(function(e) {
            csv += '"' + (e.row || '') + '","' + (e.field || '').replace(/"/g, '""') + '","' + (e.error || '').replace(/"/g, '""') + '"\n';
        });
        downloadFile(csv, 'שגיאות_ייבוא_מרצים_' + new Date().toISOString().split('T')[0] + '.csv', 'text/csv;charset=utf-8');
        showToast('קובץ השגיאות הורד', 'success');
    }

    function _downloadUpdateDetails() {
        if (!_batchImportUpdateDetails || !_batchImportUpdateDetails.length) { showToast('אין פירוט עדכונים להורדה', 'warning'); return; }
        var csv = '\uFEFF' + 'שורה,ת.ז.,שם מרצה,שדה,ערך ישן,ערך חדש\n';
        _batchImportUpdateDetails.forEach(function(u) {
            u.changedFields.forEach(function(cf) {
                csv += '"' + (u.rowNum || '') + '","' + (u.idNumber || '').replace(/"/g, '""') + '","' + (u.fullName || '').replace(/"/g, '""') + '","';
                csv += (cf.label || '').replace(/"/g, '""') + '","' + (cf.oldVal || '').replace(/"/g, '""') + '","' + (cf.newVal || '').replace(/"/g, '""') + '"\n';
            });
        });
        downloadFile(csv, 'עדכוני_ייבוא_מרצים_' + new Date().toISOString().split('T')[0] + '.csv', 'text/csv;charset=utf-8');
        showToast('קובץ העדכונים הורד', 'success');
    }

function startImport(type, input, targetKey) {
    _importTargetKey = targetKey || null;
    const file = input.files[0];
    if (!file) return;

    // הצגת חיווי טעינה
    showModal('📥 טוען קובץ...', 
        '<div style="text-align:center;padding:40px;">' +
        '<div style="font-size:32px;margin-bottom:12px;">⏳</div>' +
        '<p style="font-weight:600;">מנתח קידוד ועמודות...</p>' +
        '<p style="font-size:12px;color:var(--gray-500);margin-top:8px;">ממיר לעברית/ערבית תקנית</p>' +
        '</div>', '', true);

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            // 🔑 קריטי: שימוש ב-XLSX.read לכל סוגי הקבצים (כולל CSV) מונע בעיות קידוד (ג'יבריש)
            const workbook = XLSX.read(e.target.result, {
                type: 'array',
                cellDates: true,
                raw: false,
                codepage: 65001 // כפיית קידוד UTF-8
            });

            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            // קריאה כמערך מערכים (header: 1) שומרת על הסדר המדויק של העמודות
            const rawData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '', raw: false });

            // ניקוי שורות ריקות לחלוטין
            const cleanData = rawData.filter(row => row.some(cell => String(cell).trim() !== ''));

            if (cleanData.length < 2) {
                closeModal();
                showToast('הקובץ ריק או לא תקין', 'error');
                return;
            }

            // 🔑 קריטי: ניקוי כותרות מהסרת תו BOM (גורם לג'יבריש) ורווחים מיותרים
            const headers = cleanData[0].map(h => String(h).replace(/^\uFEFF/, '').trim());
            
            const rows = cleanData.slice(1).map(row =>
                row.map(cell => {
                    // המרת תאריכי אקסל לפורמט אחיד YYYY-MM-DD
                    if (cell instanceof Date && !isNaN(cell.getTime())) {
                        return cell.getFullYear() + '-' + String(cell.getMonth() + 1).padStart(2, '0') + '-' + String(cell.getDate()).padStart(2, '0');
                    }
                    return String(cell).trim();
                })
            );

            importWizardData = { type: type, headers: headers, rows: rows, mappings: {} };
            closeModal();
            _renderMappingWizard(); // קריאה לאשף המיפוי המשופר

        } catch (err) {
            closeModal();
            console.error('Import Error:', err);
            showToast('שגיאה בקריאת הקובץ: ' + err.message, 'error');
        }
    };
    
    reader.onerror = function() { 
        closeModal(); 
        showToast('שגיאה בקריאת הקובץ מהדיסק', 'error'); 
    };
    
    // 🔑 קריאה כ-ArrayBuffer היא הבטוחה ביותר לשימור קידוד תווים עם ספריית XLSX
    reader.readAsArrayBuffer(file); 
}

    function _parseCSV(line) {
        const r = []; let cur = '', inQ = false;
        for (let i = 0; i < line.length; i++) {
            const c = line[i];
            if (c === '"') { if (inQ && line[i+1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
            else if (c === ',' && !inQ) { r.push(cur.trim()); cur = ''; } else cur += c;
        }
        r.push(cur.trim()); return r;
    }

function _renderMappingWizard() {
    let wizardType = importWizardData.type;
    const headers = importWizardData.headers;
    
    // 🔑 תיקון קריטי: אם הסוג הוא 'lookup_values', השתמש ב-_importTargetKey
    if (wizardType === 'lookup_values' && _importTargetKey) {
        wizardType = _importTargetKey;
    }
    
    console.log('🔍 [Import Debug] מנסה לייבא מסוג:', wizardType);
    console.log('🔍 [Import Debug] מפתחות זמינים ב-IMPORT_CONFIGS:', Object.keys(IMPORT_CONFIGS));
    
    const wizardConfig = IMPORT_CONFIGS[wizardType];
    if (!wizardConfig || !wizardConfig.fields) {
        const errorMsg = 'שגיאה קריטית: אין הגדרת ייבוא לסוג "' + wizardType + '". בדוק את הקונסול.';
        console.error('❌', errorMsg);
        showToast(errorMsg, 'error');
        return;
    }
    const fields = wizardConfig.fields;
    
    let html = '<div style="direction:rtl;text-align:right;">';
    html += '<p style="margin-bottom:16px;color:var(--gray-600);">נמצאו <strong>' + importWizardData.rows.length + '</strong> רשומות. המערכת זיהתה את העמודות אוטומטית. אנא ודאו שהמיפוי נכון:</p>';
    html += '<div style="max-height:400px;overflow-y:auto;border:1px solid var(--gray-200);border-radius:8px;padding:16px;background:var(--gray-50);">';
    
	 // 🔑 תיקון קריטי: מניעת מיפוי כפול של עמודות
	 const usedHeaders = new Set();
	 fields.forEach(field => {
		 const isRequired = field.key === 'idNumber' || field.key === 'code' || field.key === 'username' || field.key === 'value' || field.key === 'title' || field.key === 'solutionName';
		 html += '<div style="margin-bottom:14px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;">';
		 html += '<label style="font-weight:600;min-width:140px;">' + field.label + (isRequired ? ' <span style="color:red">*</span>' : '') + '</label>';
		 html += '<select id="map_' + field.key + '" class="form-select" style="flex:1;min-width:200px;">';
		 html += '<option value="">-- אל תייבא שדה זה --</option>';
		 let bestMatchIndex = -1;
		 headers.forEach((h, i) => {
			 // 🔑 דילוג על עמודות שכבר מופו לשדה אחר
			 if (usedHeaders.has(i)) {
				 html += '<option value="' + i + '" disabled style="color:#ccc;">' + escAttr(h) + ' (כבר מופה)</option>';
				 return;
			 }
			 const lowerH = h.toLowerCase();
			 const isMatch = field.keywords.some(kw => lowerH.includes(kw.toLowerCase()));
			 const isSelected = isMatch && bestMatchIndex === -1 ? ' selected' : '';
			 if (isMatch && bestMatchIndex === -1) {
				 bestMatchIndex = i;
				 usedHeaders.add(i); // 🔑 סימון העמודה כ"תפוסה"
			 }
			 html += '<option value="' + i + '"' + isSelected + '>' + escAttr(h) + '</option>';
		 });
		 html += '</select>';
		 html += '</div>';
	 });
    
    html += '</div>';
    html += '<div style="margin-top:16px;padding:12px;background:#fff3cd;border-radius:8px;font-size:13px;color:#856404;">';
    html += '💡 <strong>טיפ:</strong> אם שם העמודה בקובץ שונה מעט, בחרו אותו ידנית מהרשימה.';
    html += '</div>';
    html += '</div>';
    
    showModal('🗺️ מיפוי עמודות לייבוא', html,
        '<button class="btn btn-primary" onclick="App.executeImport()">▶️ אשר קליטה וייבוא</button>' +
        '<button class="btn btn-outline" onclick="App.closeModal()">ביטול</button>');
}

// ================================================================
// פונקציית ייבוא מלאה - תומכת בייבוא המוני (Batch)
// מונעת קריסת דפדפן בייבוא קבצים גדולים (17,000+ רשומות)
// ================================================================
function executeImport() {
    var type = importWizardData.type;
    var rows = importWizardData.rows;
    
    // 1. קביעת סוג היעד והמפתח האמיתי
    let actualType = type;
    let targetStoreKey = null;
    if (type === 'lookup_values' && _importTargetKey) {
        actualType = _importTargetKey;
        targetStoreKey = _importTargetKey;
    } else if (type === 'schools') {
        targetStoreKey = DataStore.KEYS.LOOKUP_SCHOOLS;
    } else if (type === 'pedagogical_executors') {
        targetStoreKey = DataStore.KEYS.PEDAGOGICAL_EXECUTORS;
    } else if (type === 'catalog_entries') {
        targetStoreKey = DataStore.KEYS.CATALOG_ENTRIES;
    } else {
        targetStoreKey = DataStore.KEYS[actualType.toUpperCase()] || actualType;
    }
    
    // 2. בדיקת הגדרות מיפוי
    let config = IMPORT_CONFIGS[actualType];
    if (!config || !config.fields) {
        showToast('אין הגדרת ייבוא לסוג זה (' + actualType + ')', 'error');
        return;
    }
    
    // 3. בניית המיפוי מהטופס
    var fieldMappings = [];
    config.fields.forEach(function(field) {
        var sel = document.getElementById('map_' + field.key);
        if (sel && sel.value !== '') {
            fieldMappings.push({ fieldKey: field.key, colIdx: parseInt(sel.value) });
        }
    });
    
    if (!fieldMappings.length) {
        showToast('לא מופו שדות - יש לבחור לפחות עמודה אחת', 'warning');
        return;
    }
    
    // 🔑 4. אתחול מונים
    var count = 0;
    var updatedCount = 0;
    var skippedCount = 0;
    
    // 5. לולאת עיבוד השורות
    rows.forEach(function(rowValues, rowIdx) {
        var record = {};
        fieldMappings.forEach(function(fm) {
            if (fm.colIdx < rowValues.length) {
                record[fm.fieldKey] = String(rowValues[fm.colIdx] || '').trim();
            }
        });
        
        // ניקוי שדות נפוצים
        if (record.idNumber) record.idNumber = record.idNumber.replace(/^\$+/, '');
        if (record.phone) record.phone = record.phone.replace(/^\$+/, '');
        
        var hasValue = fieldMappings.some(function(fm) { return record[fm.fieldKey]; });
        if (!hasValue) {
            skippedCount++;
            return;
        }
        
        // ============================================================
        // 🔑 טיפול ייעודי: פתרונות למידה (Solutions)
        // ============================================================
        if (actualType === 'solutions' || targetStoreKey === DataStore.KEYS.SOLUTIONS) {
            var solutionData = {
                responsibilityType: record.responsibilityType || '',
                schoolName: record.schoolName || '',
                solutionName: record.solutionName || '',
                solutionNumber: record.solutionNumber || '',
                description: record.description || '',
                guideId: record.guideId || '',
                domain: record.domain || '',
                topic: record.topic || '',
                educationStage: record.educationStage || '',
                educationType: record.educationType || '',
                startDate: record.startDate || '',
                endDate: record.endDate || '',
                weekDay: record.weekDay || '',
                meetingType: record.meetingType || '',
                academicHours: record.academicHours || '',
                instructors: record.instructors || '',
                whatsappLink: record.whatsappLink || '',
                earlyRegistrationLink: record.earlyRegistrationLink || '',
                showInCatalog: record.showInCatalog || 'hide',
                generalNote: record.generalNote || '',
                isActive: true
            };
            
            // 🔑 בדיקה שיש שם פתרון
            if (!solutionData.solutionName || solutionData.solutionName.trim() === '') {
                skippedCount++;
                console.warn('⚠️ שורה ' + (rowIdx + 2) + ' דולגה: חסר שם פתרון למידה', record);
                return;
            }
            
            var existingSolutions = DataStore.getAll(DataStore.KEYS.SOLUTIONS) || [];
            var existingItem = existingSolutions.find(function(item) { 
                return item.solutionName === solutionData.solutionName; 
            });
            
            if (existingItem) {
                console.log('🔄 שורה ' + (rowIdx + 2) + ' עודכנה (כפולה): "' + solutionData.solutionName + '"');
                DataStore.update(DataStore.KEYS.SOLUTIONS, existingItem.id, solutionData);
                updatedCount++;
            } else {
                DataStore.create(DataStore.KEYS.SOLUTIONS, solutionData);
                count++;
            }
            return;
        }
        
        // ============================================================
        // שאר הטבלאות (טיפול רגיל)
        // ============================================================
        
        // א. מבצעים פדגוגיים
        if (actualType === 'pedagogical_executors' || targetStoreKey === DataStore.KEYS.PEDAGOGICAL_EXECUTORS) {
            var execData = {
                companyNumber: record.companyNumber || '',
                institutionName: record.institutionName || '',
                groupName: record.groupName || '',
                hourlyCost: parseFloat(String(record.hourlyCost || '').replace(/[^\d.-]/g, '')) || 0,
                notes: record.notes || ''
            };
            if (!execData.institutionName && !execData.companyNumber) { skippedCount++; return; }
            
            var existingExecs = DataStore.getAll(DataStore.KEYS.PEDAGOGICAL_EXECUTORS) || [];
            var existingExec = existingExecs.find(function(e) { 
                return e.companyNumber === execData.companyNumber || e.institutionName === execData.institutionName; 
            });
            
            if (existingExec) {
                DataStore.update(DataStore.KEYS.PEDAGOGICAL_EXECUTORS, existingExec.id, execData);
                updatedCount++;
            } else {
                DataStore.create(DataStore.KEYS.PEDAGOGICAL_EXECUTORS, execData);
                count++;
            }
            return;
        }
        
        // ב. בתי ספר
        if (actualType === 'schools' || targetStoreKey === DataStore.KEYS.LOOKUP_SCHOOLS) {
            var schoolData = {
                code: record.code || '',
                name: record.name || '',
                legalStatus: record.legalStatus || '',
                educationType: record.educationType || '',
                educationStage: record.educationStage || '',
                principalName: record.principalName || '',
                inspectorName: record.inspectorName || '',
                isActive: true
            };
            if (!schoolData.code) { skippedCount++; return; }
            
            var existingSchools = DataStore.getAll(DataStore.KEYS.LOOKUP_SCHOOLS) || [];
            var existingSchool = existingSchools.find(function(s) { return s.code === schoolData.code; });
            
            if (existingSchool) {
                DataStore.update(DataStore.KEYS.LOOKUP_SCHOOLS, existingSchool.id, schoolData);
                updatedCount++;
            } else {
                DataStore.create(DataStore.KEYS.LOOKUP_SCHOOLS, schoolData);
                count++;
            }
            return;
        }
        
        // ג. שאלות נפוצות (FAQ)
        if (actualType === 'faq' || targetStoreKey === DataStore.KEYS.FAQ_DATA) {
            var faqData = {
                titleHe: record.titleHe || '',
                titleAr: record.titleAr || '',
                answerHe: record.answerHe || '',
                answerAr: record.answerAr || '',
                order: parseInt(record.order) || 0
            };
            if (!faqData.titleHe && !faqData.titleAr) { skippedCount++; return; }
            
            var existingFaqs = DataStore.getAll(DataStore.KEYS.FAQ_DATA) || [];
            var existingFaq = existingFaqs.find(function(f) { 
                return (faqData.titleHe && f.titleHe === faqData.titleHe) || 
                       (faqData.titleAr && f.titleAr === faqData.titleAr); 
            });
            
            if (existingFaq) {
                if (faqData.titleHe) existingFaq.titleHe = faqData.titleHe;
                if (faqData.titleAr) existingFaq.titleAr = faqData.titleAr;
                if (faqData.answerHe) existingFaq.answerHe = faqData.answerHe;
                if (faqData.answerAr) existingFaq.answerAr = faqData.answerAr;
                if (faqData.order) existingFaq.order = faqData.order;
                DataStore.update(DataStore.KEYS.FAQ_DATA, existingFaq.id, existingFaq);
                updatedCount++;
            } else {
                if (!faqData.order) {
                    var maxOrder = existingFaqs.reduce(function(max, f) { return Math.max(max, f.order || 0); }, 0);
                    faqData.order = maxOrder + 1;
                }
                DataStore.create(DataStore.KEYS.FAQ_DATA, faqData);
                count++;
            }
            return;
        }
        
        // ד. שאר טבלאות הערכים (Lookup Tables)
        if (targetStoreKey && targetStoreKey.startsWith('lookup_')) {
            var lookupData = {
                value: record.value || '',
                label: record.label || '',
                labelAr: record.labelAr || '',
                isActive: true
            };
            if (!lookupData.value && !lookupData.label) { skippedCount++; return; }
            
            var existingItems = DataStore.getAll(targetStoreKey) || [];
            var existingItem = existingItems.find(function(item) { 
                return String(item.value || '').trim() === String(lookupData.value || '').trim(); 
            });
            
            if (existingItem) {
                DataStore.update(targetStoreKey, existingItem.id, lookupData);
                updatedCount++;
            } else {
                DataStore.create(targetStoreKey, lookupData);
                count++;
            }
            return;
        }
    }); // סוף לולאת השורות
    
    // 6. הצגת סיכום
    closeModal();
    var regularMsg = count + ' רשומות חדשות נוספו';
    if (updatedCount > 0) regularMsg += ', ' + updatedCount + ' רשומות קיימות עודכנו';
    if (skippedCount > 0) regularMsg += ', ' + skippedCount + ' רשומות דולגו (חסר נתון חובה)';
    
    showToast(regularMsg, skippedCount > 0 ? 'warning' : 'success');
    importWizardData = { type: null, headers: [], rows: [], mappings: {} };
    
    // רענון התצוגה המתאימה
    if (actualType === 'solutions' && typeof renderSolutions === 'function') renderSolutions();
    else if (typeof renderLookupTables === 'function') renderLookupTables();
}

// 🔑 פונקציה להורדת דו"ח רשומות שדולגו
function _downloadSkippedReport() {
    if (!window._lastSkippedRows || window._lastSkippedRows.length === 0) {
        showToast('אין רשומות שדולגו להורדה', 'info');
        return;
    }
    
    var csv = '\uFEFF'; // UTF-8 BOM
    csv += 'שורה,סיבה,נתונים\n';
    
    window._lastSkippedRows.forEach(function(skipped) {
        var dataStr = JSON.stringify(skipped.data).replace(/"/g, '""');
        csv += '"' + skipped.rowNum + '","' + skipped.reason.replace(/"/g, '""') + '","' + dataStr + '"\n';
    });
    
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = 'רשומות_שדולגו_' + new Date().toISOString().split('T')[0] + '.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showToast('הדו"ח הורד בהצלחה', 'success');
}


// ================================================================
// פונקציית עזר: רענון התצוגה אחרי ייבוא
// ================================================================
function _refreshViewAfterImport(wizardType) {
    try {
        if (wizardType === 'mentors' || wizardType === 'instructors') {
            if (typeof renderMentors === 'function') renderMentors();
        } else if (wizardType === 'guides_repo') {
            if (typeof renderGuidesRepo === 'function') renderGuidesRepo();
        } else if (wizardType === 'budgets') {
            if (typeof renderBudgets === 'function') renderBudgets();
        } else if (wizardType === 'users') {
            if (typeof renderGuides === 'function') renderGuides();
        } else if (wizardType === 'faq') {
            if (typeof renderFAQ === 'function') renderFAQ();
        } else if (wizardType === 'solutions') {
            if (typeof renderSolutions === 'function') renderSolutions();
        } else if (wizardType === 'catalog_entries') {
            if (typeof renderCatalog === 'function') renderCatalog();
        } else if (wizardType === 'schools' || wizardType === 'pedagogical_executors' || wizardType.startsWith('lookup_')) {
            if (typeof renderLookupTables === 'function') renderLookupTables();
        }
    } catch (e) {
        console.warn('שגיאה ברענון תצוגה אחרי ייבוא:', e);
    }
}

// פונקציה חדשה לייבוא מדורג של מרצים
function _executeChunkedMentorsImport(fieldMappings, rows) {
    var batchSize = 100;
    var totalRows = rows.length;
    var totalBatches = Math.ceil(totalRows / batchSize);
    var currentBatch = 0;
    var newCount = 0;
    var updatedCount = 0;
    var errorCount = 0;
    
    // Get existing mentors from localStorage
    var allMentors = [];
    try {
        var stored = localStorage.getItem('matspanet_mentors');
        if (stored) {
            allMentors = JSON.parse(stored);
        }
    } catch(e) {
        console.error('[ChunkedImport] Error loading existing mentors:', e);
    }
    
    // Build id map
    var mentorIdMap = {};
    allMentors.forEach(function(m) {
        if (m.idNumber) mentorIdMap[m.idNumber] = m.id;
    });
    
    // Show progress modal
    closeModal();
    var progressHtml = '<div style="text-align:center;direction:rtl;">';
    progressHtml += '<div style="font-size:48px;margin-bottom:12px;">⏳</div>';
    progressHtml += '<div id="chunked_import_status" style="font-weight:600;font-size:15px;margin-bottom:16px;">מכין ייבוא...</div>';
    progressHtml += '<div style="background:var(--gray-200);border-radius:10px;height:24px;overflow:hidden;margin-bottom:10px;">';
    progressHtml += '<div id="chunked_import_bar" style="background:var(--primary-color);height:100%;width:0%;border-radius:10px;transition:width 0.3s ease;"></div>';
    progressHtml += '</div>';
    progressHtml += '<div id="chunked_import_detail" style="font-size:12px;color:var(--gray-500);">0 / ' + totalRows + ' רשומות</div>';
    progressHtml += '</div>';
    showModal('ייבוא מדורג — מאגר מרצים', progressHtml, '', true);
    
    function processBatch() {
        var startIdx = currentBatch * batchSize;
        var endIdx = Math.min(startIdx + batchSize, totalRows);
        var batchRows = rows.slice(startIdx, endIdx);
        
        // Update progress
        var progress = Math.round((startIdx / totalRows) * 100);
        var bar = document.getElementById('chunked_import_bar');
        var status = document.getElementById('chunked_import_status');
        var detail = document.getElementById('chunked_import_detail');
        
        if (bar) bar.style.width = progress + '%';
        if (status) status.textContent = 'מעבד batch ' + (currentBatch + 1) + ' מתוך ' + totalBatches + '...';
        if (detail) detail.textContent = startIdx + ' / ' + totalRows + ' רשומות';
        
        // Process batch
        batchRows.forEach(function(rowValues) {
            try {
                var record = {};
                fieldMappings.forEach(function(fm) {
                    if (fm.colIdx < rowValues.length) {
                        record[fm.fieldKey] = String(rowValues[fm.colIdx] || '').trim();
                    }
                });
                
                if (record.idNumber) record.idNumber = record.idNumber.replace(/^\$+/, '');
                if (record.phone) record.phone = record.phone.replace(/^\$+/, '');
                
                var idNumber = record.idNumber || '';
                if (!idNumber) {
                    errorCount++;
                    return;
                }
                
                // Check if exists
                var existingId = mentorIdMap[idNumber];
                if (existingId) {
                    // Update
                    var idx = allMentors.findIndex(function(m) { return m.id === existingId; });
                    if (idx >= 0) {
                        allMentors[idx] = Object.assign({}, allMentors[idx], record, { updatedAt: new Date().toISOString() });
                    }
                    updatedCount++;
                } else {
                    // Create
                    var newId = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
                    var newMentor = Object.assign({}, record, {
                        id: newId,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    });
                    allMentors.push(newMentor);
                    mentorIdMap[idNumber] = newId;
                    newCount++;
                }
            } catch(err) {
                errorCount++;
                console.error('[ChunkedImport] Error in row', startIdx, err);
            }
        });
        
        // Sync to server (without saving to localStorage)
        _syncBatchToServer('mentors.json', allMentors);
        
        // Move to next batch
        currentBatch++;
        
        if (currentBatch < totalBatches) {
            // Schedule next batch with delay to let browser breathe
            setTimeout(processBatch, 50);
        } else {
            // Import complete
            _onChunkedImportComplete(newCount, updatedCount, errorCount);
        }
    }
    
    // Start first batch
    setTimeout(processBatch, 100);
}

// פונקציה לסנכרון batch לשרת
function _syncBatchToServer(filename, data) {
    var pathParts = window.location.pathname.split('/');
    pathParts.pop();
    var basePath = pathParts.join('/') + '/';
    var url = basePath + 'api/data-save.php';
    
    try {
        fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: filename, data: data })
        }).catch(function(err) {
            console.warn('[ChunkedImport] Sync error:', err);
        });
    } catch(e) {
        console.warn('[ChunkedImport] Sync error:', e);
    }
}

// פונקציה לסיום הייבוא
function _onChunkedImportComplete(newCount, updatedCount, errorCount) {
    closeModal();
    
    var html = '<div style="direction:rtl;text-align:right;">';
    html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px;">';
    html += '<div style="padding:16px;background:var(--success-bg);border-radius:8px;text-align:center;">';
    html += '<div style="font-size:28px;font-weight:700;color:var(--success);">' + newCount + '</div>';
    html += '<div style="font-size:13px;color:var(--gray-600);">רשומות חדשות</div>';
    html += '</div>';
    html += '<div style="padding:16px;background:var(--info-bg);border-radius:8px;text-align:center;">';
    html += '<div style="font-size:28px;font-weight:700;color:var(--info);">' + updatedCount + '</div>';
    html += '<div style="font-size:13px;color:var(--gray-600);">רשומות עודכנו</div>';
    html += '</div>';
    html += '<div style="padding:16px;background:var(--warning-bg);border-radius:8px;text-align:center;">';
    html += '<div style="font-size:28px;font-weight:700;color:var(--warning);">' + errorCount + '</div>';
    html += '<div style="font-size:13px;color:var(--gray-600);">שגיאות</div>';
    html += '</div>';
    html += '</div>';
    html += '<p style="text-align:center;font-size:14px;color:var(--gray-600);">הייבוא הושלם. הדף ירוענן אוטומטית בעוד 2 שניות...</p>';
    html += '</div>';
    
    showModal('✅ ייבוא הושלם בהצלחה!', html, '<button class="btn btn-primary" onclick="window.location.reload()">רענון ידני</button>');
    
	// 🔑 תיקון: רענון מקומי ששומר את הטאב הפעיל
	setTimeout(function() {
		try {
			sessionStorage.setItem('matspanet_last_section', currentSection);
			if (typeof window._activeLookupTabIndex !== 'undefined') {
				sessionStorage.setItem('matspanet_last_lookup_tab', window._activeLookupTabIndex);
			}
		} catch(e) {}
		
		// רענון מקומי במקום רענון מלא
		if (currentSection === 'lookup-tables') {
			renderLookupTables();
		} else if (currentSection === 'instructors') {
			renderMentors();
		} else if (currentSection === 'guides-repo') {
			renderGuidesRepo();
		} else {
			showSection(currentSection);
		}
	}, 1500);
}


function _importMentorsBatched() {
    var rows = importWizardData.rows;
    var fields = IMPORT_FIELD_MAPS['mentors'];
    
    var fieldMappings = [];
    fields.forEach(function(f, fi) {
        var sel = document.getElementById('import_field_' + fi);
        if (sel && sel.value !== '') {
            fieldMappings.push({ fieldKey: f.key, colIdx: parseInt(sel.value) });
        }
    });

    closeModal();
    
    showModal('ייבוא מרצים', 
        '<div style="text-align:center;padding:20px;">' +
        '<div style="font-size:48px;margin-bottom:12px;">⏳</div>' +
        '<div id="batch_status" style="font-weight:600;margin-bottom:12px;">מכין ייבוא...</div>' +
        '<div style="background:var(--gray-200);border-radius:10px;height:24px;overflow:hidden;">' +
        '<div id="batch_bar" style="background:var(--primary);height:100%;width:0%;transition:width 0.3s;"></div>' +
        '</div>' +
        '<div id="batch_detail" style="font-size:12px;color:var(--gray-500);margin-top:8px;">0 / ' + rows.length + '</div>' +
        '</div>', 
        '<button class="btn btn-outline" onclick="window._cancelMentorImport=true;">ביטול</button>', true
    );

    var batchSize = 500; // מעבד 500 רשומות בכל מחזור כדי לאפשר לדפדפן "לנשום"
    var totalBatches = Math.ceil(rows.length / batchSize);
    var currentBatch = 0;
    var newCount = 0;
    var updatedCount = 0;
    window._cancelMentorImport = false;

    var existingMentors = DataStore.getAll(DataStore.KEYS.MENTORS) || [];
    var mentorMap = {};
    existingMentors.forEach(function(m, idx) {
        if (m.idNumber) mentorMap[m.idNumber] = idx;
    });

    function processNextBatch() {
        if (window._cancelMentorImport) {
            _finishMentorImport(newCount, updatedCount, true);
            return;
        }

        var startIdx = currentBatch * batchSize;
        var endIdx = Math.min(startIdx + batchSize, rows.length);
        
        for (var i = startIdx; i < endIdx; i++) {
            var row = rows[i];
            var record = {};
            fieldMappings.forEach(function(fm) {
                if (fm.colIdx < row.length) {
                    var val = row[fm.colIdx];
                    record[fm.fieldKey] = val ? String(val).trim() : '';
                }
            });

            var idNum = record.idNumber ? record.idNumber.replace(/^\$+/, '') : '';
            if (!idNum) continue;
            record.phone = record.phone ? record.phone.replace(/^\$+/, '') : '';

            var existingIdx = mentorMap[idNum];
            if (existingIdx !== undefined) {
                var existing = existingMentors[existingIdx];
                var changed = false;
                ['fullNameHe', 'fullNameAr', 'phone', 'email', 'isCertifiedLecturer', 'expertInField', 'lecturerStatus'].forEach(function(key) {
                    var oldVal = (existing[key] || '').toString().trim();
                    var newVal = (record[key] || '').toString().trim();
                    if (oldVal !== newVal) {
                        existing[key] = newVal;
                        changed = true;
                    }
                });
                if (changed) {
                    existing.updatedAt = new Date().toISOString();
                    updatedCount++;
                }
            } else {
                var newMentor = {
                    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
                    idNumber: idNum,
                    fullNameHe: record.fullNameHe || '',
                    fullNameAr: record.fullNameAr || '',
                    phone: record.phone || '',
                    email: record.email || '',
                    isCertifiedLecturer: record.isCertifiedLecturer || '',
                    expertInField: record.expertInField || '',
                    lecturerStatus: record.lecturerStatus || '',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                existingMentors.push(newMentor);
                mentorMap[idNum] = existingMentors.length - 1;
                newCount++;
            }
        }

        // שמירה ל-localStorage וסנכרון לשרת פעם אחת בלבד לכל 500 רשומות (במקום 18,000 פעמים!)
        try {
            DataStore.saveAll(DataStore.KEYS.MENTORS, existingMentors);
        } catch (e) {
            console.error('Batch save failed:', e);
        }

        currentBatch++;
        var pct = Math.round((currentBatch / totalBatches) * 100);
        var processed = Math.min(currentBatch * batchSize, rows.length);

        var bar = document.getElementById('batch_bar');
        var status = document.getElementById('batch_status');
        var detail = document.getElementById('batch_detail');
        if (bar) bar.style.width = pct + '%';
        if (status) status.textContent = 'מעבד מחזור ' + currentBatch + ' מתוך ' + totalBatches + '...';
        if (detail) detail.textContent = processed + ' / ' + rows.length + ' רשומות';

        if (currentBatch < totalBatches) {
            setTimeout(processNextBatch, 50); // השהיה קצרה למניעת קריסת הדפדפן
        } else {
            _finishMentorImport(newCount, updatedCount, false);
        }
    }

    setTimeout(processNextBatch, 100);
}

function _finishMentorImport(newCount, updatedCount, cancelled) {
    importWizardData = { type: null, headers: [], rows: [], mappings: {} };
    var msg = cancelled ? 'הייבוא בוטל. ' : '';
    msg += newCount + ' רשומות חדשות נוספו, ' + updatedCount + ' רשומות קיימות עודכנו.';
    
    closeModal();
    showToast(msg, cancelled ? 'warning' : 'success');
    renderMentors();
}


// Excel export for מדריכים
function exportExcelGuides() {
    const items = DataStore.getAll(DataStore.KEYS.GUIDES_REPO) || [];
    if (!items.length) { showToast('אין נתונים', 'warning'); return; }
    if (typeof XLSX === 'undefined') { showToast('ספריית XLSX לא נטענה', 'error'); return; }
    const data = items.map(g => ({
        'ת.ז.': g.idNumber || '',
        'שם מלא (עברית)': g.fullName || '',
        'שם מלא (ערבית)': g.fullNameAr || '',
        'תפקיד': g.position || '',
        'טלפון': g.phone || '',
        'דוא"ל': g.email || '',
        'תחומי התמחות': g.specializations || ''
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'מדריכים');
    XLSX.writeFile(wb, `matspanet_guides_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast('יוצא בהצלחה', 'success');
}

// Rich Text comment modal
function openCommentModal(solutionId) {
    const comments = (DataStore.getAll(DataStore.KEYS.SOLUTION_COMMENTS) || []).filter(c => c.solutionId === solutionId);
    const solution = DataStore.getById(DataStore.KEYS.SOLUTIONS, solutionId);
    let commentsHtml = '';
    if (comments.length === 0) {
        commentsHtml = '<p style="color:var(--gray-400);text-align:center;padding:20px;">אין תגובות עדיין</p>';
    } else {
        commentsHtml = comments.sort((a,b) => new Date(b.createdAt||0) - new Date(a.createdAt||0)).map(c => {
            return `<div style="border:1px solid var(--gray-200);border-radius:8px;padding:12px;margin-bottom:8px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                    <strong style="font-size:13px;">${c.authorName || 'משתמש'}</strong>
                    <span style="font-size:11px;color:var(--gray-400);">${formatDate(c.createdAt)}</span>
                </div>
                <div style="font-size:14px;line-height:1.6;">${c.content || ''}</div>
                <div style="margin-top:6px;text-align:left;"><button class="btn btn-danger btn-sm" onclick="App.deleteComment('${c.id}','${solutionId}')">🗑️</button></div>
            </div>`;
        }).join('');
    }
    showModal('💬 תגובות' + (solution ? ' - ' + solution.name : ''), `
        <div style="max-height:300px;overflow-y:auto;margin-bottom:12px;" id="commentsListDiv">${commentsHtml}</div>
        <div style="border-top:1px solid var(--gray-200);padding-top:12px;">
            <div style="display:flex;gap:4px;margin-bottom:8px;padding:6px;background:var(--gray-50);border-radius:6px;">
                <button class="btn btn-outline btn-sm" onclick="document.execCommand('bold')" title="Bold"><b>B</b></button>
                <button class="btn btn-outline btn-sm" onclick="document.execCommand('italic')" title="Italic"><i>I</i></button>
                <button class="btn btn-outline btn-sm" onclick="document.execCommand('underline')" title="Underline"><u>U</u></button>
                <button class="btn btn-outline btn-sm" onclick="document.execCommand('insertUnorderedList')" title="List">•</button>
            </div>
            <div id="commentEditor" contenteditable="true" style="min-height:80px;max-height:150px;overflow-y:auto;border:1px solid var(--gray-300);border-radius:6px;padding:10px;font-size:14px;line-height:1.6;" data-placeholder="כתוב תגובה..."></div>
        </div>`,
    `<button class="btn btn-primary" onclick="App.saveComment('${solutionId}')">💬 שלח תגובה</button><button class="btn btn-outline" onclick="App.closeModal()">סגור</button>`);
}
function saveComment(solutionId) {
    const editor = document.getElementById('commentEditor');
    const content = editor ? editor.innerHTML.trim() : '';
    if (!content) { showToast('יש לכתוב תגובה', 'error'); return; }
    DataStore.create(DataStore.KEYS.SOLUTION_COMMENTS, {
        solutionId: solutionId,
        content: content,
        authorName: currentUser.fullName,
        createdBy: currentUser.id,
        createdAt: new Date().toISOString()
    });
    showToast('התגובה נוספה', 'success');
    openCommentModal(solutionId);
}
function deleteComment(commentId, solutionId) {
    _moveToRecycleBin(DataStore.KEYS.SOLUTION_COMMENTS, commentId);
    showToast('התגובה נמחקה', 'success');
    openCommentModal(solutionId);
}

function importJSON(input) {
    const file = input.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            var data = JSON.parse(e.target.result);
            if (data.__backup_meta) {
                App._pendingRestoreData = data;
                confirmDialog('⚠️ נמצא קובץ גיבוי עם ' + Object.keys(data).filter(function(k){return k!=='__backup_meta';}).length + ' טבלאות\nהאם לבצע שחזור מלא של כל הטבלאות?', function() {
                    var tablesInFile = Object.keys(data).filter(function(k) { return k !== '__backup_meta'; });
                    var applied = 0;
                    tablesInFile.forEach(function(k) {
                        try { DataStore.saveAll(k, data[k]); applied++; } catch(e) { console.error('[Import] Error restoring', k, e); }
                    });
                    logActivity('restore_full', 'ייבוא גיבוי (' + applied + ' טבלאות)', 'settings');
                    showToast('✅ ייבוא הושלם — ' + applied + ' טבלאות שוחזרו בהצלחה. מרענן...', 'success');
                    setTimeout(function() { window.location.reload(); }, 1500);
                });
            } else {
				// 🔑 שמירת הטאב הפעיל לפני רענון
				try {
					sessionStorage.setItem('matspanet_last_section', currentSection);
					if (typeof window._activeLookupTabIndex !== 'undefined') {
						sessionStorage.setItem('matspanet_last_lookup_tab', window._activeLookupTabIndex);
					} else if (typeof _activeLookupTabIndex !== 'undefined') {
						sessionStorage.setItem('matspanet_last_lookup_tab', _activeLookupTabIndex);
					}
				} catch(e) {}
                DataStore.importData(data, true);
                showToast('הנתונים יובאו! מרענן...', 'success');
                setTimeout(() => window.location.reload(), 1500);
            }
        }
        catch(err) { showToast('שגיאה בקריאת JSON: ' + err.message, 'error'); }
    };
    reader.readAsText(file); input.value = '';
}

// ================================================================
//  REGISTRATIONS (רישומים)
// ================================================================
let _regSortField = 'createdAt';
let _regSortDir = 'desc';
function renderRegistrations() {
    let items = DataStore.getAll(DataStore.KEYS.REGISTRATIONS) || [];
    const visibleSolIds = _getGuideVisibleSolutionIds();
    if (visibleSolIds !== null) { items = items.filter(r => visibleSolIds.includes(r.solutionId)); }
    const totalCount = items.length;
    const canFull = _canFullSection('registrations');
    document.getElementById('section-registrations').innerHTML = `
        ${_lookupTableHeader('נרשמים לפתרונות למידה', totalCount, '👥')}
        <div class="card"><div class="card-body">
            <div class="action-bar" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;padding:10px 14px;background:var(--gray-50);border-radius:var(--border-radius);border:1px solid var(--gray-100);">
                ${canFull ? `<label class="btn btn-outline btn-sm" style="cursor:pointer;margin:0;">📥 ייבוא<input type="file" accept=".csv,.xlsx,.xls" style="display:none;" onchange="App.startImport('registrations',this)"></label>` : ''}
                <button class="btn btn-outline btn-sm" onclick="App.exportCSV('registrations')">📤 ייצוא CSV</button>
                <button class="btn btn-outline btn-sm" onclick="App._exportRegistrationsExcel()">📊 Excel</button>
                <button class="btn btn-outline btn-sm" onclick="App.printSection()">🖨️ הדפסה</button>
                <button class="btn btn-outline btn-sm" style="color:#25D366;border-color:#25D366;" onclick="App._openWhatsAppModal()">💬 שליחת WhatsApp</button>
                ${canFull ? '<button class="btn btn-primary btn-sm" onclick="App._addRegistrationManual()">➕ הוספה</button>' : ''}
                ${canFull ? `<button class="btn btn-danger btn-sm" onclick="App.clearAllRegistrations()">🗑️ מחיקה גורפת</button>` : ''}
            </div>
            <div class="toolbar">
                <input type="text" class="search-input" id="regSearch" placeholder="🔍 חיפוש חופשי לפי שם, טלפון, דוא\"ל, פתרון למידה..." oninput="App.filterRegistrations()">
                <select class="filter-select" id="regSortF" onchange="App._sortRegistrations()">
                    <option value="createdAt" ${_regSortField==='createdAt'?'selected':''}>מיון לפי תאריך</option>
                    <option value="fullName" ${_regSortField==='fullName'?'selected':''}>מיון לפי שם</option>
                    <option value="solutionName" ${_regSortField==='solutionName'?'selected':''}>מיון לפי פתרון</option>
                </select>
                <button class="btn btn-outline btn-sm" onclick="App._toggleRegSortDir()">${_regSortDir === 'desc' ? '↓ יורד' : '↑ עולה'}</button>
                ${_colVisBtnHtml('registrations')}
            </div>
            <div id="regTableDiv">${_renderRegTable(items)}</div>
        </div></div>`;
    _applyTableFeatures('registrations');
}

function _addRegistrationManual() {
    // 1. שליפת רשימת התפקידים (שנה את המפתח אם הוא שונה אצלך, למשל LOOKUP_POSITIONS)
    const roles = DataStore.getAll(DataStore.KEYS.LOOKUP_ROLE_HOLDERS) || [];
    const roleOpts = roles.map(r => `<option value="${escAttr(r.label)}">${escAttr(r.label)}</option>`).join('');

    // 2. בניית ה-HTML של הטופס
    const html = `
        <div class="form-grid">
            <div class="form-group"><label>שם מלא *</label><input type="text" id="fRegAddName" class="form-input" required></div>
            <div class="form-group"><label>טלפון *</label><input type="text" id="fRegAddPhone" class="form-input" required></div>
            <div class="form-group"><label>דוא"ל *</label><input type="email" id="fRegAddEmail" class="form-input" required></div>
            <div class="form-group"><label>תפקיד *</label>
                <select id="fRegAddRole" class="form-select" required>
                    <option value="">-- בחר תפקיד --</option>
                    ${roleOpts}
                </select>
            </div>
        </div>

        <div class="form-group" style="margin-top:16px;">
            <label>מוסד (סמל מוסד) - הקלד לחיפוש והוסף כתגית *</label>
            <div class="inst-autocomplete-wrapper" id="regInstWrapper">
                <div id="regInstTags"></div>
                <input type="text" id="regInstSearch" class="form-input" placeholder="🔍 הקלד סמל מוסד או שם..." autocomplete="off">
            </div>
            <div id="regInstDropdown" class="inst-autocomplete-dropdown"></div>
        </div>

        <div class="form-group" style="margin-top:16px;">
            <label>פתרון למידה - הקלד לחיפוש והוסף כתגית *</label>
            <div class="inst-autocomplete-wrapper" id="regSolWrapper">
                <div id="regSolTags"></div>
                <input type="text" id="regSolSearch" class="form-input" placeholder="🔍 הקלד שם או סמל פתרון..." autocomplete="off">
            </div>
            <div id="regSolDropdown" class="inst-autocomplete-dropdown"></div>
        </div>
    `;

    // 3. הצגת המודאל
    showModal('➕ הוספת נרשם ידני', html,
        `<button class="btn btn-primary" onclick="App._saveManualRegistration()">💾 שמור נרשם</button><button class="btn btn-outline" onclick="App.closeModal()">ביטול</button>`
    );

    // 4. אתחול מערכות החיפוש האוטומטי לאחר שהמודאל נטען ל-DOM
    setTimeout(() => App._initRegAutocomplete(), 100);
}

function _initRegAutocomplete() {
    const schools = DataStore.getAll(DataStore.KEYS.LOOKUP_SCHOOLS) || [];
    const solutions = _getVisibleSolutions() || [];

    // משתנים גלובליים זמניים לשמירת הבחירות
    window._regManualSelectedSchools = [];
    window._regManualSelectedSolutions = [];

    // ==========================================
    // לוגיקה למוסדות (סמל מוסד + שם מוסד)
    // ==========================================
    const instSearch = document.getElementById('regInstSearch');
    const instTags = document.getElementById('regInstTags');
    const instDropdown = document.getElementById('regInstDropdown');

    if (instSearch) {
        instSearch.addEventListener('input', function() {
            const q = this.value.trim().toLowerCase();
            if (q.length < 2) { instDropdown.style.display = 'none'; return; }

            const matches = schools.filter(s =>
                (s.code && s.code.toString().toLowerCase().includes(q)) ||
                (s.name && s.name.toLowerCase().includes(q))
            ).slice(0, 8);

            if (matches.length) {
                instDropdown.innerHTML = matches.map(s => `
                    <div class="inst-suggestion-item" data-code="${s.code}" data-name="${s.name}">
                        <div class="inst-sug-header">
                            <span class="inst-sug-code">${s.code}</span>
                            <span class="inst-sug-name">${s.name}</span>
                        </div>
                    </div>
                `).join('');
                instDropdown.style.display = 'block';
            } else {
                instDropdown.style.display = 'none';
            }
        });

        instDropdown.addEventListener('click', function(e) {
            const item = e.target.closest('.inst-suggestion-item');
            if (!item) return;
            const code = item.dataset.code;
            const name = item.dataset.name;
            
            // הוספה רק אם לא קיים כבר
            if (!window._regManualSelectedSchools.find(s => s.code === code)) {
                window._regManualSelectedSchools.push({ code, name });
                _renderRegInstTags();
            }
            instSearch.value = '';
            instDropdown.style.display = 'none';
        });
    }

    function _renderRegInstTags() {
        if (!instTags) return;
        instTags.innerHTML = window._regManualSelectedSchools.map(s => `
            <div class="institution-tag">
                <span class="tag-text">${s.code} - ${s.name}</span>
                <button type="button" class="tag-remove" data-code="${s.code}">×</button>
            </div>
        `).join('');
        
        // חיבור אירועי מחיקה
        instTags.querySelectorAll('.tag-remove').forEach(btn => {
            btn.addEventListener('click', () => {
                window._regManualSelectedSchools = window._regManualSelectedSchools.filter(s => s.code !== btn.dataset.code);
                _renderRegInstTags();
            });
        });
    }

    // ==========================================
    // לוגיקה לפתרונות למידה
    // ==========================================
    const solSearch = document.getElementById('regSolSearch');
    const solTags = document.getElementById('regSolTags');
    const solDropdown = document.getElementById('regSolDropdown');

    if (solSearch) {
        solSearch.addEventListener('input', function() {
            const q = this.value.trim().toLowerCase();
            if (q.length < 2) { solDropdown.style.display = 'none'; return; }

            const matches = solutions.filter(s =>
                (s.solutionName && s.solutionName.toLowerCase().includes(q)) ||
                (s.solutionNumber && s.solutionNumber.toString().toLowerCase().includes(q))
            ).slice(0, 8);

            if (matches.length) {
                solDropdown.innerHTML = matches.map(s => `
                    <div class="inst-suggestion-item" data-id="${s.id}" data-name="${s.solutionName}">
                        <div class="inst-sug-header">
                            <span class="inst-sug-code">${s.solutionNumber || 'N/A'}</span>
                            <span class="inst-sug-name">${s.solutionName}</span>
                        </div>
                    </div>
                `).join('');
                solDropdown.style.display = 'block';
            } else {
                solDropdown.style.display = 'none';
            }
        });

        solDropdown.addEventListener('click', function(e) {
            const item = e.target.closest('.inst-suggestion-item');
            if (!item) return;
            const id = item.dataset.id;
            const name = item.dataset.name;
            
            if (!window._regManualSelectedSolutions.find(s => s.id === id)) {
                window._regManualSelectedSolutions.push({ id, name });
                _renderRegSolTags();
            }
            solSearch.value = '';
            solDropdown.style.display = 'none';
        });
    }

    function _renderRegSolTags() {
        if (!solTags) return;
        solTags.innerHTML = window._regManualSelectedSolutions.map(s => `
            <div class="institution-tag">
                <span class="tag-text">${s.name}</span>
                <button type="button" class="tag-remove" data-id="${s.id}">×</button>
            </div>
        `).join('');
        
        solTags.querySelectorAll('.tag-remove').forEach(btn => {
            btn.addEventListener('click', () => {
                window._regManualSelectedSolutions = window._regManualSelectedSolutions.filter(s => s.id !== btn.dataset.id);
                _renderRegSolTags();
            });
        });
    }

    // סגירת תפריטים נפתחים בלחיצה מחוץ לאזור
    document.addEventListener('click', function closeDropdowns(e) {
        if (!e.target.closest('.inst-autocomplete-wrapper') && !e.target.closest('.inst-autocomplete-dropdown')) {
            if (instDropdown) instDropdown.style.display = 'none';
            if (solDropdown) solDropdown.style.display = 'none';
        }
    });
}

function _saveManualRegistration() {
    const name = (document.getElementById('fRegAddName').value || '').trim();
    const phone = (document.getElementById('fRegAddPhone').value || '').trim();
    const email = (document.getElementById('fRegAddEmail').value || '').trim();
    const role = (document.getElementById('fRegAddRole').value || '').trim();

    // ולידציה בסיסית
    if (!name || !phone || !email || !role) {
        showToast('נא למלא את כל שדות החובה (שם, טלפון, דוא"ל, תפקיד)', 'error');
        return;
    }

    const schools = window._regManualSelectedSchools || [];
    const solutions = window._regManualSelectedSolutions || [];

    if (schools.length === 0) {
        showToast('נא לבחור לפחות מוסד אחד מהרשימה', 'warning');
        return;
    }
    if (solutions.length === 0) {
        showToast('נא לבחור לפחות פתרון למידה אחד מהרשימה', 'warning');
        return;
    }

    // המרת המערכים למחרוזות מופרדות (כדי לשמור עקביות עם המבנה שתוקן קודם)
    const institutionCodes = schools.map(s => s.code).join(', ');
    const institutionNames = schools.map(s => s.name).join(' | ');
    const solutionIds = solutions.map(s => s.id).join(', ');
    const solutionNames = solutions.map(s => s.name).join(' | ');

    // שמירה ל-DataStore
    DataStore.create(DataStore.KEYS.REGISTRATIONS, {
        fullName: name,
        phone: phone,
        email: email,
        role: role,
        institutionCodes: institutionCodes,
        institutionNames: institutionNames,
        solutionId: solutionIds, 
        solutionName: solutionNames,
        createdAt: new Date().toISOString()
    });

    logActivity('add_registration', 'הוספת נרשם ידני: ' + name, 'registration', '');
    
    // ניקוי וסגירה
    closeModal();
    showToast('הנרשם נוסף בהצלחה למערכת', 'success');
    renderRegistrations();

    // איפוס המשתנים הגלובליים לשימוש עתידי
    window._regManualSelectedSchools = [];
    window._regManualSelectedSolutions = [];
}

function _sortRegistrations() { _regSortField = document.getElementById('regSortF').value; App.filterRegistrations(); }

function _toggleRegSortDir() { _regSortDir = _regSortDir === 'desc' ? 'asc' : 'desc'; App.filterRegistrations(); }

function _exportRegistrationsExcel() {
    let items = DataStore.getAll(DataStore.KEYS.REGISTRATIONS) || [];
    if (!items.length) { showToast('אין נתונים', 'warning'); return; }
    if (typeof XLSX === 'undefined') { showToast('ספריית XLSX לא נטענה', 'error'); return; }
    const allSchools = DataStore.getAll(DataStore.KEYS.LOOKUP_SCHOOLS) || [];
    const schoolByCode = {}; allSchools.forEach(function(s) { schoolByCode[s.code] = s.name; });
    const rows = [];
    items.forEach(function(r) {
        // 🔑 תיקון: תמיכה במחרוזת מופרדת בפסיק/pipe או במערך
        var codes = Array.isArray(r.institutionCodes) ? r.institutionCodes : (r.institutionCodes ? String(r.institutionCodes).split(/[,|]/).map(s=>s.trim()) : (r.institutionCode ? [r.institutionCode] : []));
        var names = Array.isArray(r.institutionNames) ? r.institutionNames : (r.institutionNames ? String(r.institutionNames).split(/[,|]/).map(s=>s.trim()) : (r.institutionName ? [r.institutionName] : []));
        
        if (codes.length === 0) {
            rows.push({ 'שם': r.fullName || '', 'טלפון': r.phone || '', 'דוא"ל': r.email || '', 'סמל מוסד': '', 'בית ספר': '', 'תפקיד': r.role || '', 'פתרון / השתלמות': r.solutionName || '', 'תאריך': formatDate(r.createdAt) });
        } else {
            codes.forEach(function(code, idx) {
                var name = names[idx] || schoolByCode[code] || code;
                rows.push({ 'שם': r.fullName || '', 'טלפון': r.phone || '', 'דוא"ל': r.email || '', 'סמל מוסד': code, 'בית ספר': name, 'תפקיד': r.role || '', 'פתרון / השתלמות': r.solutionName || '', 'תאריך': formatDate(r.createdAt) });
            });
        }
    });
    const ws = XLSX.utils.json_to_sheet(rows); const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'רישומים');
    XLSX.writeFile(wb, `matspanet_registrations_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast('יוצא בהצלחה', 'success');
}

function _renderRegTable(items) {
    const canFull = _canFullSection('registrations');
    if (!items.length) return '<div class="empty-state"><div class="empty-icon">📝</div><h3>אין רישומים</h3></div>';
    const sorted = [...items].sort((a, b) => {
        let va = a[_regSortField] || '', vb = b[_regSortField] || '';
        if (_regSortField === 'createdAt') return _regSortDir === 'desc' ? new Date(b.createdAt||0) - new Date(a.createdAt||0) : new Date(a.createdAt||0) - new Date(b.createdAt||0);
        return _regSortDir === 'desc' ? vb.localeCompare(va, 'he') : va.localeCompare(vb, 'he');
    });
    return `<div class="table-wrapper" style="box-shadow:none;"><table class="data-table"><thead><tr>
        <th>שם</th><th>טלפון</th><th>דוא"ל</th><th>מוסד</th><th>בית ספר</th><th>תפקיד</th><th>פתרון / השתלמות</th><th>תאריך</th>${canFull ? '<th>פעולות</th>' : ''}
    </tr></thead><tbody>${sorted.map(r => `<tr>
        <td><strong>${escAttr(r.fullName)}</strong></td>
        <td style="direction:ltr">${r.phone || '—'}</td>
        <td>${r.email || '—'}</td>
        <td>${Array.isArray(r.institutionCodes) ? r.institutionCodes.join(' | ') : (r.institutionCodes || r.institutionCode || '—')}</td>
        <td>${Array.isArray(r.institutionNames) ? r.institutionNames.join(', ') : (r.institutionNames || r.institutionName || '—')}</td>
        <td>${r.role || '—'}</td>
        <td>${r.solutionName || '—'}</td>
        <td style="font-size:12px;">${formatDate(r.createdAt)}</td>
        ${canFull ? `<td><div style="display:flex;gap:4px;">
            <button class="btn btn-outline btn-sm" onclick="App.editRegistration('${r.id}')" title="עריכה">✏️</button>
            <button class="btn btn-danger btn-sm" onclick="App.deleteRegistration('${r.id}')" title="מחיקה">🗑️</button>
        </div></td>` : ''}
    </tr>`).join('')}</tbody></table></div>`;
}

function filterRegistrations() {
    const search = document.getElementById('regSearch').value.toLowerCase();
    let items = DataStore.getAll(DataStore.KEYS.REGISTRATIONS) || [];
    if (currentUser && currentUser.role !== 'admin' && currentUser.role !== 'system_admin' && currentUser.role !== 'system_operator' && currentUser.role !== 'team_leader') {
        let userGuideIds = (DataStore.getAll(DataStore.KEYS.GUIDES_REPO) || []).filter(g => g.userId === currentUser.id).map(g => g.id);
        if (userGuideIds.length === 0 && currentUser.fullName) {
            const normalizedName = currentUser.fullName.trim();
            userGuideIds = (DataStore.getAll(DataStore.KEYS.GUIDES_REPO) || []).filter(g => (g.fullName || '').trim() === normalizedName).map(g => g.id);
        }
        if (userGuideIds.length > 0) {
            const mySolutionIds = (DataStore.getAll(DataStore.KEYS.SOLUTIONS) || []).filter(s => userGuideIds.includes(s.guideId)).map(s => s.id);
            items = items.filter(r => mySolutionIds.includes(r.solutionId));
        }
    }
    if (search) {
        items = items.filter(r => {
            const s = search;
            if ((r.fullName||'').toLowerCase().includes(s)) return true;
            if ((r.phone||'').includes(s)) return true;
            if ((r.email||'').toLowerCase().includes(s)) return true;
            if ((r.solutionName||'').toLowerCase().includes(s)) return true;
            // 🔑 תיקון: תמיכה גם בשדות החדשים וגם בישנים
            const codes = Array.isArray(r.institutionCodes) ? r.institutionCodes.join(' ') : (r.institutionCodes || r.institutionCode || '');
            const names = Array.isArray(r.institutionNames) ? r.institutionNames.join(' ') : (r.institutionNames || r.institutionName || '');
            if (codes.toLowerCase().includes(s)) return true;
            if (names.toLowerCase().includes(s)) return true;
            return false;
        });
    }
    _resetPagination('registrations');
    document.getElementById('regTableDiv').innerHTML = _renderRegTable(items);
    _applyTableFeatures('registrations');
}

function editRegistration(id) {
    const r = DataStore.getById(DataStore.KEYS.REGISTRATIONS, id);
    if (!r) return;
    editingItem = r;
    showModal('עריכת רישום', `
        <div class="form-grid">
            <div class="form-group"><label>שם מלא *</label><input type="text" id="fRegName" class="form-input" value="${escAttr(r.fullName)}" required></div>
            <div class="form-group"><label>טלפון</label><input type="text" id="fRegPhone" class="form-input" value="${r.phone || ''}"></div>
            <div class="form-group"><label>דוא"ל</label><input type="email" id="fRegEmail" class="form-input" value="${r.email || ''}"></div>
            <div class="form-group"><label>תפקיד</label><input type="text" id="fRegRole" class="form-input" value="${escAttr(r.role || '')}"></div>
        </div>`,
    `<button class="btn btn-primary" onclick="App.saveEditRegistration()">💾 שמור</button><button class="btn btn-outline" onclick="App.closeModal()">ביטול</button>`);
}

function saveEditRegistration() {
    const name = document.getElementById('fRegName').value.trim();
    if (!name) { showToast('יש להזין שם', 'error'); return; }
    DataStore.update(DataStore.KEYS.REGISTRATIONS, editingItem.id, {
        fullName: name,
        phone: document.getElementById('fRegPhone').value.trim(),
        email: document.getElementById('fRegEmail').value.trim(),
        role: document.getElementById('fRegRole').value.trim()
    });
    logActivity('edit_registration', 'עריכת נרשם: ' + name, 'registration', editingItem.id);
    editingItem = null; closeModal(); showToast('הרישום עודכן', 'success'); renderRegistrations();
}

function deleteRegistration(id) {
    const r = DataStore.getById(DataStore.KEYS.REGISTRATIONS, id);
    confirmDialog('למחוק רישום זה?', () => {
        _moveToRecycleBin(DataStore.KEYS.REGISTRATIONS, id);
        logActivity('delete_registration', 'מחיקת נרשם: ' + (r ? r.fullName : ''), 'registration', id);
        showToast('הרישום נמחק', 'success'); renderRegistrations();
    });
}

function clearAllRegistrations() {
    let items = DataStore.getAll(DataStore.KEYS.REGISTRATIONS) || [];
    const visibleSolIds = _getGuideVisibleSolutionIds();
    if (visibleSolIds !== null) items = items.filter(r => visibleSolIds.includes(r.solutionId));
    if (!items.length) return;
    confirmDialog(`⚠️ למחוק את כל ${items.length} הרשומות?\nפעולה זו אינה ניתנת לביטול!`, () => {
        const visibleIds = new Set(items.map(i => i.id));
        const allItems = DataStore.getAll(DataStore.KEYS.REGISTRATIONS) || [];
        DataStore.saveAll(DataStore.KEYS.REGISTRATIONS, allItems.filter(i => !visibleIds.has(i.id)));
        logActivity('bulk_delete_registrations', 'מחיקה גורפת של ' + items.length + ' נרשמים', 'registration', '');
        showToast(items.length + ' רשומות נמחקו', 'success'); renderRegistrations();
    });
}

// ================================================================
//  WHATSAPP MESSAGING
// ================================================================
const _WA_DEFAULT_TEMPLATES = [
    { id: 'he_morning', lang: 'he', period: 'morning', hourFrom: 6, hourTo: 11, text: 'בוקר טוב [שם],' },
    { id: 'he_afternoon', lang: 'he', period: 'afternoon', hourFrom: 12, hourTo: 16, text: 'צהריים טובים [שם],' },
    { id: 'he_evening', lang: 'he', period: 'evening', hourFrom: 17, hourTo: 20, text: 'ערב טוב [שם],' },
    { id: 'he_night', lang: 'he', period: 'night', hourFrom: 21, hourTo: 5, text: 'לילה טוב [שם],' },
    { id: 'ar_morning', lang: 'ar', period: 'morning', hourFrom: 6, hourTo: 11, text: 'صباح الخير [اسم],' },
    { id: 'ar_afternoon', lang: 'ar', period: 'afternoon', hourFrom: 12, hourTo: 16, text: 'مساء الخير [اسم],' },
    { id: 'ar_evening', lang: 'ar', period: 'evening', hourFrom: 17, hourTo: 20, text: 'مساء الخير [اسم],' },
    { id: 'ar_night', lang: 'ar', period: 'night', hourFrom: 21, hourTo: 5, text: 'تصبح على خير [اسم],' }
];
function _getWaLang() { var settings = DataStore.getSettings(); return (settings && settings.language) || document.documentElement.lang || 'he'; }
function _getWaTemplates() { var settings = DataStore.getSettings(); return (settings && settings.waTemplates && settings.waTemplates.length) ? settings.waTemplates : _WA_DEFAULT_TEMPLATES; }
function _getAutoGreeting() {
    var lang = _getWaLang(); var templates = _getWaTemplates(); var hour = new Date().getHours();
    for (var i = 0; i < templates.length; i++) {
        var t = templates[i]; if (t.lang !== lang) continue;
        if (t.hourFrom <= t.hourTo) { if (hour >= t.hourFrom && hour <= t.hourTo) return t; }
        else { if (hour >= t.hourFrom || hour <= t.hourTo) return t; }
    }
    return templates.find(function(t) { return t.lang === lang; }) || templates[0];
}
function _applyWaGreeting(template, name) { if (!template || !name) return ''; return template.text.replace('[שם]', name).replace('[اسم]', name); }
function _renderWaGreetingOptions() {
    var lang = _getWaLang(); var templates = _getWaTemplates(); var autoT = _getAutoGreeting();
    var autoLabel = autoT ? autoT.text.replace('[שם]', '...').replace('[اسم]', '...') : '—';
    var opts = '<option value="auto">' + (lang === 'ar' ? '✅ تلقائي (موصى به): ' : '✅ אוטומטי (מומלץ): ') + escAttr(autoLabel) + '</option>';
    var heTemplates = templates.filter(function(t) { return t.lang === 'he'; });
    var arTemplates = templates.filter(function(t) { return t.lang === 'ar'; });
    if (heTemplates.length) { opts += '<optgroup label="עברית">'; heTemplates.forEach(function(t) { opts += '<option value="' + t.id + '">' + escAttr(t.text.replace('[שם]', '...').replace('[اسم]', '...')) + '</option>'; }); opts += '</optgroup>'; }
    if (arTemplates.length) { opts += '<optgroup label="العربية">'; arTemplates.forEach(function(t) { opts += '<option value="' + t.id + '">' + escAttr(t.text.replace('[שם]', '...').replace('[اسم]', '...')) + '</option>'; }); opts += '</optgroup>'; }
    opts += '<option value="custom">' + (lang === 'ar' ? '✏️ كتابة حرة' : '✏️ כתיבה חופשית') + '</option>';
    return opts;
}
function _onWaGreetingChange() {
    var sel = document.getElementById('waGreetingMode'); var customDiv = document.getElementById('waCustomGreetingDiv'); var previewDiv = document.getElementById('waGreetingPreview');
    if (!sel) return; var val = sel.value;
    if (customDiv) customDiv.style.display = val === 'custom' ? 'block' : 'none';
    if (previewDiv) {
        var templates = _getWaTemplates(); var t = val === 'auto' ? _getAutoGreeting() : templates.find(function(x) { return x.id === val; });
        if (t) { var example = t.lang === 'ar' ? 'أحمد' : 'דני'; previewDiv.textContent = _applyWaGreeting(t, example); previewDiv.style.display = 'block'; }
        else { previewDiv.style.display = 'none'; }
    }
}
function _openWhatsAppModal() {
    let regs = DataStore.getAll(DataStore.KEYS.REGISTRATIONS) || [];
    const visibleSolIds = _getGuideVisibleSolutionIds();
    if (visibleSolIds !== null) regs = regs.filter(r => visibleSolIds.includes(r.solutionId));
    const solMap = {}; const allSolutions = DataStore.getAll(DataStore.KEYS.SOLUTIONS) || [];
    regs.forEach(r => { if (r.solutionId && !solMap[r.solutionId]) { const sol = allSolutions.find(s => s.id === r.solutionId); if (sol) solMap[r.solutionId] = sol.name || r.solutionName || ''; } });
    const solutions = Object.entries(solMap).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'he'));
    if (!solutions.length) { showToast('אין פתרונות למידה עם נרשמים', 'warning'); return; }
    const solOpts = solutions.map(s => `<option value="${s.id}" data-name="${escAttr(s.name || '')}">${escAttr(s.name || 'בחר פתרון למידה')}</option>`).join('');
    showModal('💬 שליחת הודעת WhatsApp', `
        <div class="form-grid">
            <div class="form-group full-width"><label>בחירת פתרון למידה *</label>
                <select id="waSolution" class="form-select" onchange="App._onWaSolutionChange()"><option value="">— בחר פתרון למידה —</option>${solOpts}</select>
            </div>
            <div class="form-group full-width" id="waRecipientsDiv" style="display:none;">
                <label>רשימת נמענים <span id="waRecipCount" style="color:var(--gray-500);font-weight:normal;"></span></label>
                <div id="waRecipientsList" style="max-height:180px;overflow-y:auto;border:1px solid var(--gray-200);border-radius:var(--border-radius);padding:8px;"></div>
            </div>
            <div class="form-group full-width"><label>תוכן ההודעה *</label>
                <textarea id="waMessage" class="form-input" rows="4" placeholder="${_getWaLang() === 'ar' ? 'اكتب محتوى الرسالة هنا...' : 'כתוב את תוכן ההודעה כאן...'}" style="resize:vertical;"></textarea>
            </div>
            <div class="form-group full-width"><label>👤 ${_getWaLang() === 'ar' ? 'تحية شخصية' : 'הפנייה אישית'}</label>
                <select id="waGreetingMode" class="form-select" onchange="App._onWaGreetingChange()">${_renderWaGreetingOptions()}</select>
                <div id="waCustomGreetingDiv" style="display:none;margin-top:8px;">
                    <input type="text" id="waCustomGreeting" class="form-input" placeholder="${_getWaLang() === 'ar' ? 'اكتب تحية مخصصة... (استخدم [שם] أو [اسم] للاسم)' : 'כתוב פנייה מותאמת... (השתמש ב-[שם] או [اسم] לשם המשתלם)'}">
                </div>
                <div id="waGreetingPreview" style="margin-top:6px;padding:8px 12px;background:var(--gray-50);border-radius:var(--border-radius);font-size:13px;color:var(--gray-600);display:none;"></div>
            </div>
        </div>`,
    `<button class="btn btn-primary" style="background:#25D366;border-color:#25D366;" onclick="App._sendWhatsAppMessages()">💬 ${_getWaLang() === 'ar' ? 'إرسال' : 'שליחה'}</button><button class="btn btn-outline" onclick="App.closeModal()">${_getWaLang() === 'ar' ? 'إلغاء' : 'ביטול'}</button>`);
    setTimeout(function() { App._onWaGreetingChange(); }, 50);
}
function _onWaSolutionChange() {
    const sel = document.getElementById('waSolution'); const div = document.getElementById('waRecipientsDiv'); const list = document.getElementById('waRecipientsList'); const count = document.getElementById('waRecipCount');
    if (!sel || !sel.value) { div.style.display = 'none'; return; }
    const solId = sel.value;
    let regs = (DataStore.getAll(DataStore.KEYS.REGISTRATIONS) || []).filter(r => r.solutionId === solId);
    const visibleSolIds = _getGuideVisibleSolutionIds();
    if (visibleSolIds !== null) regs = regs.filter(r => visibleSolIds.includes(r.solutionId));
    div.style.display = 'block'; count.textContent = '(' + regs.length + ' נמענים)';
    if (!regs.length) { list.innerHTML = '<div style="color:var(--gray-500);text-align:center;padding:12px;">אין נרשמים לפתרון למידה זה</div>'; return; }
    list.innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr style="background:var(--gray-50);"><th style="padding:6px 8px;text-align:right;">שם</th><th style="padding:6px 8px;text-align:right;">טלפון</th></tr></thead><tbody>' +
        regs.map(r => `<tr style="border-bottom:1px solid var(--gray-100);"><td style="padding:5px 8px;">${escAttr(r.fullName)}</td><td style="padding:5px 8px;direction:ltr;text-align:left;">${r.phone || '—'}</td></tr>`).join('') + '</tbody></table>';
}
function _sendWhatsAppMessages() {
    const solSel = document.getElementById('waSolution'); const message = (document.getElementById('waMessage').value || '').trim(); const greetingMode = (document.getElementById('waGreetingMode') || {}).value || 'auto';
    if (!solSel || !solSel.value) { showToast(_getWaLang() === 'ar' ? 'يجب اختيار حل تعلم' : 'יש לבחור פתרון למידה', 'error'); return; }
    if (!message) { showToast(_getWaLang() === 'ar' ? 'يجب كتابة محتوى الرسالة' : 'יש לכתוב תוכן הודעה', 'error'); return; }
    const solId = solSel.value;
    let regs = (DataStore.getAll(DataStore.KEYS.REGISTRATIONS) || []).filter(r => r.solutionId === solId);
    const visibleSolIds = _getGuideVisibleSolutionIds();
    if (visibleSolIds !== null) regs = regs.filter(r => visibleSolIds.includes(r.solutionId));
    if (!regs.length) { showToast(_getWaLang() === 'ar' ? 'لا يوجد مسجلون لهذا الحل' : 'אין נרשמים לפתרון למידה זה', 'warning'); return; }
    const validRegs = regs.filter(r => r.phone && r.phone.replace(/[\s\-\(\)\+]/g, '').length >= 9);
    if (!validRegs.length) { showToast(_getWaLang() === 'ar' ? 'لم يتم العثور على مستلمين برقم هاتف صالح' : 'לא נמצאו נמענים עם מספר טלפון תקין', 'warning'); return; }
    var greetingTemplate = null, customGreetingText = null;
    if (greetingMode === 'auto') greetingTemplate = _getAutoGreeting();
    else if (greetingMode === 'custom') { var customEl = document.getElementById('waCustomGreeting'); customGreetingText = customEl ? customEl.value.trim() : ''; if (!customGreetingText) { showToast(_getWaLang() === 'ar' ? 'يجب كتابة تحية مخصصة' : 'יש לכתוב פנייה מותאמת', 'error'); return; } }
    else { var templates = _getWaTemplates(); greetingTemplate = templates.find(function(t) { return t.id === greetingMode; }); }
    let sentCount = 0;
    validRegs.forEach((r, idx) => {
        let fullMsg = message; var greeting = '';
        if (greetingMode === 'custom' && customGreetingText && r.fullName) greeting = customGreetingText.replace('[שם]', r.fullName).replace('[اسم]', r.fullName);
        else if (greetingTemplate && r.fullName) greeting = _applyWaGreeting(greetingTemplate, r.fullName);
        if (greeting) fullMsg = greeting + ' ' + fullMsg;
        let phone = r.phone.replace(/[\s\-\(\)\.]/g, '');
        if (!phone.startsWith('+') && !phone.startsWith('972')) { if (phone.startsWith('0')) phone = '972' + phone.substring(1); else phone = '972' + phone; }
        if (phone.startsWith('+')) phone = phone.substring(1);
        const waUrl = 'https://wa.me/' + phone + '?text=' + encodeURIComponent(fullMsg);
        setTimeout(() => { window.open(waUrl, '_blank'); }, idx * 300);
        sentCount++;
    });
    logActivity('whatsapp_send', 'שליחת WhatsApp ל-' + sentCount + ' נרשמים', 'registration', solId);
    closeModal(); showToast('נפתחו ' + sentCount + ' הודעות WhatsApp בלשוניות חדשות', 'success');
}

// ================================================================
//  ADVANCED PERMISSIONS
// ================================================================
let _permsSelectedUserId = null;
function renderPermissions() {
    const users = (DataStore.getAll(DataStore.KEYS.USERS) || []).filter(u => u.isActive !== false);
    const isAdminUser = currentUser && (currentUser.role === 'admin' || currentUser.role === 'system_admin');
    if (!isAdminUser) { document.getElementById('section-permissions').innerHTML = '<div class="empty-state"><div class="empty-icon">🔒</div><h3>גישה מוגבלת</h3><p>רק מנהל מערכת יכול לנהל הרשאות</p></div>'; return; }
    const permCount = users.filter(u => u.permissions && Object.keys(u.permissions).length > 0).length;
    let html = `${_lookupTableHeader('הרשאות מתקדמות', permCount, '🔐')}
    <div class="card"><div class="card-body">
        <div style="margin-bottom:16px;">
            <label style="display:block;font-weight:600;margin-bottom:6px;">בחר משתמש</label>
            <select id="permsUserSelect" class="form-select" onchange="App._permsOnUserChange()" style="max-width:400px;">
                <option value="">-- בחר משתמש --</option>
                ${users.map(u => `<option value="${u.id}" ${_permsSelectedUserId === u.id ? 'selected' : ''}>${escAttr(u.fullName)} (${Auth.getRoleLabel(u.role)})</option>`).join('')}
            </select>
        </div>
        <div id="permsPartsContainer">
            <div style="text-align:center;padding:32px;color:var(--gray-400);"><div style="font-size:36px;margin-bottom:10px;">👤</div><p>בחר משתמש כדי להגדיר הרשאות</p></div>
        </div>
    </div></div>`;
    document.getElementById('section-permissions').innerHTML = html;
    if (_permsSelectedUserId) setTimeout(() => _permsOnUserChange(), 50);
}
function _permsOnUserChange() {
    const sel = document.getElementById('permsUserSelect'); const userId = sel ? sel.value : ''; _permsSelectedUserId = userId || null;
    const container = document.getElementById('permsPartsContainer'); if (!container) return;
    if (!userId) { container.innerHTML = '<div style="text-align:center;padding:32px;color:var(--gray-400);"><div style="font-size:36px;margin-bottom:10px;">👤</div><p>בחר משתמש כדי להגדיר הרשאות</p></div>'; return; }
    const user = DataStore.getById(DataStore.KEYS.USERS, userId); if (!user) return;
    const perms = user.permissions || {};
    if (user.role === 'admin' || user.role === 'system_admin') {
        container.innerHTML = `<div style="text-align:center;padding:32px;color:var(--gray-500);"><div style="font-size:36px;margin-bottom:10px;">👑</div><p><strong>${escAttr(user.fullName)}</strong> הוא מנהל מערכת — גישה מלאה אוטומטית לכל חלקי המערכת.</p></div>`;
        return;
    }
    let partsHtml = SYSTEM_PARTS.map(part => {
        const permLevel = perms[part.id] || '';
        const isChecked = permLevel !== ''; const isView = permLevel === 'view'; const isFull = permLevel === 'full';
        return `<div style="display:flex;align-items:center;gap:12px;padding:14px 16px;border:1px solid var(--gray-200);border-radius:var(--border-radius);margin-bottom:8px;background:${isChecked ? 'var(--gray-50)' : '#fff'};flex-wrap:wrap;">
            <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:180px;">
                <span style="font-size:20px;">${part.icon}</span>
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:600;font-size:14px;">
                    <input type="checkbox" id="perm_chk_${part.id}" ${isChecked ? 'checked' : ''} onchange="App._permTogglePart('${part.id}')" style="width:18px;height:18px;cursor:pointer;"> ${part.label}
                </label>
            </div>
            <div id="perm_levels_${part.id}" style="display:flex;gap:12px;align-items:center;${isChecked ? '' : 'opacity:0.35;pointer-events:none;'}">
                <label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:13px;color:var(--gray-600);">
                    <input type="radio" name="perm_level_${part.id}" value="view" ${isView ? 'checked' : ''} onchange="App._permSetLevel('${part.id}','view')"> 👁️ צפייה בלבד
                </label>
                <label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:13px;color:var(--gray-600);">
                    <input type="radio" name="perm_level_${part.id}" value="full" ${isFull ? 'checked' : ''} onchange="App._permSetLevel('${part.id}','full')"> ✏️ מלאה (עריכה, מחיקה, השלמת נתונים)
                </label>
            </div>
        </div>`;
    }).join('');
    container.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
            <p style="color:var(--gray-500);font-size:13px;">ברירת מחדל: כל האפשרויות לא מסומנות = אין גישה.</p>
            <div style="display:flex;gap:8px;"><button class="btn btn-outline btn-sm" onclick="App._permsResetUser()">🔄 איפוס הרשאות</button></div>
        </div>
        ${partsHtml}
        <div style="margin-top:16px;padding-top:16px;border-top:2px solid var(--gray-200);">
            <button class="btn btn-primary" onclick="App._permsSave()">💾 שמור הרשאות</button>
            <button class="btn btn-outline" onclick="App._permsSelectedUserId=null;App.renderPermissions();" style="margin-right:8px;">ביטול</button>
        </div>`;
}
function _permTogglePart(partId) {
    const chk = document.getElementById('perm_chk_' + partId); const levels = document.getElementById('perm_levels_' + partId); if (!chk || !levels) return;
    if (chk.checked) {
        levels.style.opacity = '1'; levels.style.pointerEvents = 'auto';
        const viewRadio = document.querySelector('input[name="perm_level_' + partId + '"][value="view"]');
        if (viewRadio && !document.querySelector('input[name="perm_level_' + partId + '"]:checked')) viewRadio.checked = true;
    } else {
        levels.style.opacity = '0.35'; levels.style.pointerEvents = 'none';
        document.querySelectorAll('input[name="perm_level_' + partId + '"]').forEach(r => r.checked = false);
    }
}
function _permSetLevel(partId, level) {
    const chk = document.getElementById('perm_chk_' + partId);
    if (chk && !chk.checked) { chk.checked = true; _permTogglePart(partId); }
}
function _permsResetUser() {
    if (!_permsSelectedUserId) return;
    confirmDialog('לאפס את כל ההרשאות של משתמש זה? (כל האפשרויות יהפכו ללא גישה)', function() {
        DataStore.update(DataStore.KEYS.USERS, _permsSelectedUserId, { permissions: {} });
        showToast('ההרשאות אופסו', 'success'); renderPermissions();
    });
}
function _permsSave() {
    if (!_permsSelectedUserId) return;
    const perms = {};
    SYSTEM_PARTS.forEach(part => {
        const chk = document.getElementById('perm_chk_' + part.id);
        if (chk && chk.checked) {
            const selected = document.querySelector('input[name="perm_level_' + part.id + '"]:checked');
            perms[part.id] = selected ? selected.value : 'view';
        }
    });
    DataStore.update(DataStore.KEYS.USERS, _permsSelectedUserId, { permissions: perms });
    logActivity('update_permissions', 'עדכון הרשאות משתמש', 'user', _permsSelectedUserId);
    showToast('ההרשאות נשמרו בהצלחה', 'success');
}
function _canViewSection(sectionId) {
    if (!currentUser) return false; const role = currentUser.role || '';
    if (role === 'admin' || role === 'system_admin') return true;
    if (!currentUser.permissions) return true;
    if (sectionId === 'homepage' || sectionId === 'faq') return true;
    const perm = currentUser.permissions[sectionId]; return perm === 'view' || perm === 'full';
}
function _canFullSection(sectionId) {
    if (!currentUser) return false; const role = currentUser.role || '';
    if (role === 'admin' || role === 'system_admin') return true;
    if (!currentUser.permissions) return true;
    return currentUser.permissions[sectionId] === 'full';
}

// ================================================================
//  ACTIVITY LOG
// ================================================================
function renderActivityLog() {
    const items = (DataStore.getAll(DataStore.KEYS.ACTIVITY_LOG) || []).sort((a,b) => new Date(b.timestamp||0) - new Date(a.timestamp||0));
    const actionLabels = { 'login': '🔐 כניסה למערכת', 'add_solution': '➕ הוספת פתרון למידה', 'edit_solution': '✏️ עריכת פתרון למידה', 'delete_solution': '🗑️ מחיקת פתרון למידה', 'restore_solution': '♻️ שחזור פתרון מסל מחזור', 'add_registration': '➕ הוספת נרשם', 'edit_registration': '✏️ עריכת נרשם', 'delete_registration': '🗑️ מחיקת נרשם', 'bulk_delete_registrations': '🗑️ מחיקה גורפת — נרשמים', 'whatsapp_send': '💬 שליחת WhatsApp — נרשמים' };
    document.getElementById('section-activity-log').innerHTML = `
        ${_lookupTableHeader('מעקב והיסטוריה', items.length, '📊', '<div style="display:flex;gap:6px;"><button class="btn btn-sm" style="background:rgba(255,255,255,0.15);color:#fff;border:1px solid rgba(255,255,255,0.3);" onclick="App.printSection()">🖨️ הדפסה</button><button class="btn btn-sm" style="background:rgba(255,255,255,0.15);color:#fff;border:1px solid rgba(255,255,255,0.3);" onclick="App.exportCSV(\'activity_log\')">📤 ייצוא CSV</button></div>')}
        <div class="card"><div class="card-body">
            <div class="toolbar">
                <select class="filter-select" id="actTypeF" onchange="App.filterActivityLog()">
                    <option value="">כל הפעולות</option>
                    <option value="login">כניסה למערכת</option><option value="add_solution">הוספת פתרון</option><option value="edit_solution">עריכת פתרון</option>
                    <option value="delete_solution">מחיקת פתרון</option><option value="restore_solution">שחזור פתרון</option><option value="add_registration">הוספת נרשם</option>
                    <option value="edit_registration">עריכת נרשם</option><option value="delete_registration">מחיקת נרשם</option><option value="bulk_delete_registrations">מחיקה גורפת — נרשמים</option><option value="whatsapp_send">שליחת WhatsApp</option>
                </select>
                <input type="text" class="search-input" id="actSearch" placeholder="🔍 חיפוש לפי שם משתמש..." oninput="App.filterActivityLog()">
            </div>
            <div id="actTableDiv" style="max-height:500px;overflow-y:auto;">${_renderActTable(items)}</div>
        </div></div>`;
}
function _renderActTable(items) {
    if (!items.length) return '<div class="empty-state"><div class="empty-icon">📊</div><h3>אין רשומות פעילות</h3></div>';
    const actionLabels = { 'login': '🔐', 'add_solution': '➕', 'edit_solution': '✏️', 'delete_solution': '🗑️', 'restore_solution': '♻️', 'add_registration': '➕', 'edit_registration': '✏️', 'delete_registration': '🗑️', 'bulk_delete_registrations': '🗑️', 'whatsapp_send': '💬' };
    return `<div class="table-wrapper" style="box-shadow:none;"><table class="data-table"><thead><tr><th>תאריך ושעה</th><th>משתמש</th><th>תפקיד</th><th>פעולה</th><th>פרטים</th></tr></thead><tbody>${items.map(a => `<tr>
        <td style="font-size:12px;white-space:nowrap;">${new Date(a.timestamp).toLocaleString('he-IL')}</td>
        <td><strong>${escAttr(a.userName || '—')}</strong></td>
        <td>${a.userRole ? Auth.getRoleBadge(a.userRole) : '—'}</td>
        <td>${actionLabels[a.actionType] || '📋'} ${a.actionType || ''}</td>
        <td style="font-size:13px;color:var(--gray-600);max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escAttr(a.description || '')}">${escAttr(a.description || '—')}</td>
    </tr>`).join('')}</tbody></table></div>`;
}
function filterActivityLog() {
    const type = document.getElementById('actTypeF').value; const search = document.getElementById('actSearch').value.toLowerCase();
    let items = (DataStore.getAll(DataStore.KEYS.ACTIVITY_LOG) || []).sort((a,b) => new Date(b.timestamp||0) - new Date(a.timestamp||0));
    if (type) items = items.filter(a => a.actionType === type);
    if (search) items = items.filter(a => (a.userName||'').toLowerCase().includes(search) || (a.description||'').toLowerCase().includes(search));
    document.getElementById('actTableDiv').innerHTML = _renderActTable(items);
}

// ================================================================
//  RECYCLE BIN
// ================================================================
const _ENTITY_META = { solutions: { label: 'פתרון למידה', nameField: 'name' }, solution_instructors: { label: 'מנחה משויך', nameField: 'fullName' }, mentors: { label: 'מרצה', nameField: 'fullName' }, guides_repo: { label: 'מדריך', nameField: 'fullName' }, budgets: { label: 'תקציב', nameField: 'budgetCode' }, periods: { label: 'תקופה', nameField: 'name' }, lookup_schools: { label: 'בית ספר', nameField: 'name' }, inspectors: { label: 'מפקח', nameField: 'fullName' }, pedagogical_executors: { label: 'מבצע פדגוגי', nameField: 'institutionName' }, registrations: { label: 'נרשם', nameField: 'fullName' }, faq_data: { label: 'שאלת תשובה', nameField: 'question' }, solution_comments: { label: 'תגובה', nameField: 'text' } };
function _moveToRecycleBin(storeKey, id) {
    const item = DataStore.getById(storeKey, id); if (!item) return null;
    const meta = _ENTITY_META[storeKey] || { label: storeKey, nameField: 'name' };
    DataStore.create(DataStore.KEYS.RECYCLE_BIN, { originalId: id, originalStoreKey: storeKey, originalEntityType: meta.label, data: JSON.parse(JSON.stringify(item)), deletedBy: currentUser ? currentUser.id : null, deletedByName: currentUser ? currentUser.fullName : '', deletedAt: new Date().toISOString() });
    DataStore.remove(storeKey, id); return item;
}
function _moveAllToRecycleBin(storeKey) {
    const items = DataStore.getAll(storeKey) || []; const meta = _ENTITY_META[storeKey] || { label: storeKey, nameField: 'name' };
    items.forEach(function(item) { DataStore.create(DataStore.KEYS.RECYCLE_BIN, { originalId: item.id, originalStoreKey: storeKey, originalEntityType: meta.label, data: JSON.parse(JSON.stringify(item)), deletedBy: currentUser ? currentUser.id : null, deletedByName: currentUser ? currentUser.fullName : '', deletedAt: new Date().toISOString() }); });
    DataStore.saveAll(storeKey, []); return items.length;
}
function renderRecycleBin() {
    const allItems = (DataStore.getAll(DataStore.KEYS.RECYCLE_BIN) || []).sort((a,b) => new Date(b.deletedAt||0) - new Date(a.deletedAt||0));
    const typeCounts = {}; allItems.forEach(function(r) { typeCounts[r.originalEntityType] = (typeCounts[r.originalEntityType] || 0) + 1; });
    const types = Object.keys(typeCounts).sort(); const activeType = window._recycleFilter || ''; const search = window._recycleSearch || '';
    const filtered = allItems.filter(function(r) {
        if (activeType && r.originalEntityType !== activeType) return false;
        if (search) { const d = r.data || {}; const meta = _ENTITY_META[r.originalStoreKey] || { nameField: 'name' }; return (d[meta.nameField] || '').toLowerCase().includes(search); }
        return true;
    });
    let filterTabs = '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px;">';
    filterTabs += '<button class="btn btn-sm ' + (!activeType ? 'btn-primary' : 'btn-outline') + '" onclick="window._recycleFilter=\'\';App.renderRecycleBin();">הכל (' + allItems.length + ')</button>';
    types.forEach(function(t) { filterTabs += '<button class="btn btn-sm ' + (activeType === t ? 'btn-primary' : 'btn-outline') + '" onclick="window._recycleFilter=\'' + t + '\';App.renderRecycleBin();">' + t + ' (' + typeCounts[t] + ')</button>'; });
    filterTabs += '</div>';
    const emptyBtn = allItems.length ? '<button class="btn btn-danger btn-sm" style="margin-right:auto;" onclick="App.emptyRecycleBin()">🗑️ ריקון סל מחזור</button>' : '';
    document.getElementById('section-recycle-bin').innerHTML = `
        ${_lookupTableHeader('סל מחזור', allItems.length, '🗑️', '<button class="btn btn-sm" style="background:rgba(255,255,255,0.15);color:#fff;border:1px solid rgba(255,255,255,0.3);" onclick="App.printSection()">🖨️ הדפסה</button>')}
        <div class="card"><div class="card-body">
            ${allItems.length ? '<p style="color:var(--gray-500);font-size:13px;margin-bottom:12px;">פריטים שנמחקו נשמרים כאן. ניתן לשחזר אותם למערכת.</p>' : ''}
            <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px;">
                <input type="text" class="form-input" style="max-width:260px;" placeholder="🔍 חיפוש לפי שם..." value="${escAttr(search)}" oninput="window._recycleSearch=this.value.toLowerCase();App.renderRecycleBin();">
                ${emptyBtn}
            </div>
            ${filterTabs}
            <div id="recycleTableDiv">${_renderRecycleTable(filtered)}</div>
        </div></div>`;
}
function _renderRecycleTable(items) {
    if (!items.length) return '<div class="empty-state"><div class="empty-icon">♻️</div><h3>סל המחזור ריק</h3><p style="color:var(--gray-500);">אין פריטים שנמחקו</p></div>';
    return `<div class="table-wrapper" style="box-shadow:none;"><table class="data-table"><thead><tr><th>סוג</th><th>שם</th><th>מחק ע"י</th><th>תאריך מחיקה</th><th>פעולות</th></tr></thead><tbody>${items.map(r => {
        const d = r.data || {}; const meta = _ENTITY_META[r.originalStoreKey] || { nameField: 'name' }; const itemName = d[meta.nameField] || '—';
        const subInfo = r.originalStoreKey === 'solutions' && d.solutionNumber ? '<br><small style="color:var(--gray-400);">מספר: ' + escAttr(d.solutionNumber) + '</small>' : r.originalStoreKey === 'lookup_schools' && d.code ? '<br><small style="color:var(--gray-400);">סמל: ' + escAttr(d.code) + '</small>' : r.originalStoreKey === 'registrations' && d.phone ? '<br><small style="color:var(--gray-400);">' + escAttr(d.phone) + '</small>' : '';
        return `<tr>
            <td><span style="background:var(--primary-bg);color:var(--primary-dark);padding:2px 8px;border-radius:12px;font-size:12px;white-space:nowrap;">${escAttr(r.originalEntityType || '—')}</span></td>
            <td><strong>${escAttr(itemName)}</strong>${subInfo}</td>
            <td>${escAttr(r.deletedByName || '—')}</td>
            <td style="font-size:12px;">${formatDate(r.deletedAt)}</td>
            <td><div style="display:flex;gap:4px;">
                <button class="btn btn-success btn-sm" onclick="App.restoreFromRecycleBin('${r.id}')" title="שחזר">♻️ שחזר</button>
                <button class="btn btn-danger btn-sm" onclick="App.permanentDeleteFromRecycleBin('${r.id}')" title="מחיקה לצמיתות">🗑️ לצמיתות</button>
            </div></td></tr>`;
    }).join('')}</tbody></table></div>`;
}
function restoreFromRecycleBin(recycleId) {
    const item = DataStore.getById(DataStore.KEYS.RECYCLE_BIN, recycleId); if (!item || !item.data) return;
    const storeKey = item.originalStoreKey; const meta = _ENTITY_META[storeKey] || { nameField: 'name' }; const itemName = (item.data[meta.nameField] || '').substring(0, 40);
    confirmDialog('לשחזר פריט זה (' + (meta.label || '') + ') למערכת?', function() {
        const restoreData = { ...item.data }; delete restoreData.id;
        DataStore.create(storeKey, restoreData); logActivity('restore_item', 'שחזור ' + (meta.label || '') + ': ' + itemName, storeKey, recycleId);
        DataStore.remove(DataStore.KEYS.RECYCLE_BIN, recycleId); showToast('הפריט שוחזר בהצלחה', 'success'); renderRecycleBin(); _refreshSectionAfterRestore(storeKey);
    });
}
function _refreshSectionAfterRestore(storeKey) {
    if (storeKey === DataStore.KEYS.SOLUTIONS) { renderSolutions(); updateSolutionsCount(); }
    else if (storeKey === DataStore.KEYS.MENTORS) renderMentors();
    else if (storeKey === DataStore.KEYS.GUIDES_REPO) renderGuidesRepo();
    else if (storeKey === DataStore.KEYS.BUDGETS) renderBudgets();
    else if (storeKey === DataStore.KEYS.PERIODS) renderPeriods();
    else if (storeKey === DataStore.KEYS.REGISTRATIONS) renderRegistrations();
    else if (storeKey === DataStore.KEYS.FAQ_DATA) renderFAQ();
    else if (storeKey === DataStore.KEYS.INSPECTORS || storeKey === DataStore.KEYS.PEDAGOGICAL_EXECUTORS || storeKey === DataStore.KEYS.LOOKUP_SCHOOLS) renderLookupTables();
}
function permanentDeleteFromRecycleBin(recycleId) {
    confirmDialog('⚠️ מחיקה לצמיתות! פעולה זו בלתי הפיכה.', function() { DataStore.remove(DataStore.KEYS.RECYCLE_BIN, recycleId); showToast('נמחק לצמיתות', 'success'); renderRecycleBin(); });
}
function emptyRecycleBin() {
    const items = DataStore.getAll(DataStore.KEYS.RECYCLE_BIN) || [];
    if (!items.length) { showToast('הסל כבר ריק', 'info'); return; }
    confirmDialog('⚠️ למחוק לצמיתות את כל ' + items.length + ' הפריטים בסל המחזור? פעולה זו בלתי הפיכה!', function() {
        DataStore.saveAll(DataStore.KEYS.RECYCLE_BIN, []); logActivity('empty_recycle_bin', 'ריקון סל מחזור (' + items.length + ' פריטים)', 'recycle_bin', '');
        showToast('סל המחזור רוקן', 'success'); renderRecycleBin();
    });
}

// ================================================================
//  FAQ
// ================================================================
let _faqQuillAr = null, _faqQuillHe = null; let _faqDragId = null;
function renderFAQ() {
    const items = (DataStore.getAll(DataStore.KEYS.FAQ_DATA) || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
    const container = document.getElementById('section-faq'); const hasItems = items.length > 0;
    container.innerHTML = `
        ${_lookupTableHeader('שאלות נפוצות ותשובות', items.length, '❓')}
        <div style="font-size:14px;color:var(--gray-500);margin-bottom:12px;">כאן תוכלו למצוא שאלות נפוצות הנוגעות לתחום הפיתוח המקצועי למורים, לצד תשובות והדרכה מותאמות בנושא.</div>
        ${_buildActionBar('faq', 'App.openFAQModal()', 'App.deleteAllFAQ()', items.length)}
        <div class="toolbar">${_colVisBtnHtml('faq')}</div>
        ${hasItems ? `<div id="faqBulkBar" style="display:none;margin-bottom:10px;padding:8px 14px;background:#fff3cd;border:1px solid #ffc107;border-radius:var(--border-radius);align-items:center;gap:10px;flex-wrap:wrap;">
            <span style="font-size:13px;font-weight:600;color:#856404;" id="faqSelectedCount">0 נבחרו</span>
            <button class="btn btn-danger btn-sm" onclick="App.deleteSelectedFAQs()">🗑️ מחק נבחרים</button>
            <button class="btn btn-outline btn-sm" onclick="App.toggleFaqSelectAll(false)">בטל בחירה</button>
        </div>` : ''}
        <div class="card"><div class="card-body" style="padding:0;overflow-x:auto;">
            <table class="data-table" style="min-width:700px;">
                <thead><tr>
                    ${hasItems ? '<th style="width:36px;"><input type="checkbox" id="faqSelectAll" onchange="App.toggleFaqSelectAll(this.checked)" style="cursor:pointer;"></th>' : ''}
                    <th style="width:40px;">סדר</th><th>כותרת (ערבית)</th><th>כותרת (עברית)</th><th style="width:160px;">פעולות</th>
                </tr></thead>
                <tbody id="faqTableBody">${!hasItems ? '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--gray-400);">אין שאלות עדיין. לחצו על "הוספת שאלה" להתחלה.</td></tr>' :
                    items.map(item => `<tr draggable="true" ondragstart="App._faqDragStart(event,'${escAttr(item.id)}')" ondragover="App._faqDragOver(event)" ondrop="App._faqDrop(event,'${escAttr(item.id)}')" ondragend="App._faqDragEnd(event)" style="cursor:grab;">
                        <td style="text-align:center;"><input type="checkbox" class="faq-check" data-id="${escAttr(item.id)}" style="cursor:pointer;"></td>
                        <td style="text-align:center;">${item.order || 0}</td>
                        <td dir="rtl">${escAttr(item.titleAr || '—')}</td>
                        <td>${escAttr(item.titleHe || '—')}</td>
                        <td><div style="display:flex;gap:4px;justify-content:center;align-items:center;">
                            <button class="btn btn-outline btn-sm" onclick="App.openFAQModal('${escAttr(item.id)}')" title="עריכה" style="padding:4px 8px;">✏️</button>
                            <button class="btn btn-danger btn-sm" onclick="App.deleteFAQ('${escAttr(item.id)}')" title="מחיקה" style="padding:4px 8px;">🗑️</button>
                            <button class="btn btn-outline btn-sm" onclick="App.moveFAQ('${escAttr(item.id)}','up')" title="למעלה" style="padding:4px 8px;">▲</button>
                            <button class="btn btn-outline btn-sm" onclick="App.moveFAQ('${escAttr(item.id)}','down')" title="למטה" style="padding:4px 8px;">▼</button>
                        </div></td>
                    </tr>`).join('')
                }</tbody>
            </table>
        </div></div>`;
    if (hasItems) container.querySelectorAll('.faq-check').forEach(function(cb) { cb.addEventListener('change', _updateFaqBulkBar); });
    _applyTableFeatures('faq');
}
function _updateFaqBulkBar() {
    var checked = document.querySelectorAll('.faq-check:checked'); var bar = document.getElementById('faqBulkBar'); var countEl = document.getElementById('faqSelectedCount'); var selectAll = document.getElementById('faqSelectAll');
    if (!bar) return;
    if (checked.length > 0) { bar.style.display = 'flex'; countEl.textContent = checked.length + ' נבחרו'; } else { bar.style.display = 'none'; }
    if (selectAll) { var total = document.querySelectorAll('.faq-check').length; selectAll.checked = total > 0 && checked.length === total; }
}
function toggleFaqSelectAll(state) { var checkboxes = document.querySelectorAll('.faq-check'); checkboxes.forEach(function(cb) { cb.checked = state; }); _updateFaqBulkBar(); }
function deleteSelectedFAQs() {
    var checked = document.querySelectorAll('.faq-check:checked');
    if (!checked.length) { showToast('לא נבחרו שאלות', 'warning'); return; }
    confirmDialog('למחוק ' + checked.length + ' שאלות נבחרות?', function() {
        checked.forEach(function(cb) { _moveToRecycleBin(DataStore.KEYS.FAQ_DATA, cb.dataset.id); });
        logActivity('delete_faq_bulk', 'מחיקת ' + checked.length + ' שאלות', 'faq'); renderFAQ(); showToast(checked.length + ' שאלות נמחקו', 'success');
    });
}
function deleteAllFAQ() {
    var items = DataStore.getAll(DataStore.KEYS.FAQ_DATA) || [];
    if (!items.length) { showToast('אין רשומות למחיקה', 'warning'); return; }
    confirmDialog('למחוק את כל ' + items.length + ' השאלות? פעולה זו בלתי הפיכה!', function() {
        _moveAllToRecycleBin(DataStore.KEYS.FAQ_DATA); logActivity('delete_faq_all', 'מחיקת כל השאלות (' + items.length + ')', 'faq'); renderFAQ(); showToast('כל השאלות נמחקו', 'success');
    });
}
function moveFAQ(id, direction) {
    var items = (DataStore.getAll(DataStore.KEYS.FAQ_DATA) || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
    var idx = items.findIndex(i => i.id === id); if (idx < 0) return;
    var targetIdx;
    if (direction === 'up' && idx > 0) targetIdx = idx - 1;
    else if (direction === 'down' && idx < items.length - 1) targetIdx = idx + 1;
    else return;
    var itemA = items[idx]; var itemB = items[targetIdx]; var tempOrder = itemA.order;
    DataStore.update(DataStore.KEYS.FAQ_DATA, itemA.id, { order: itemB.order });
    DataStore.update(DataStore.KEYS.FAQ_DATA, itemB.id, { order: tempOrder });
    renderFAQ();
}
function _faqDragStart(e, id) { _faqDragId = id; e.dataTransfer.effectAllowed = 'move'; e.target.style.opacity = '0.4'; }
function _faqDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
function _faqDrop(e, targetId) {
    e.preventDefault(); if (!_faqDragId || _faqDragId === targetId) return;
    var items = (DataStore.getAll(DataStore.KEYS.FAQ_DATA) || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
    var fromIdx = items.findIndex(i => i.id === _faqDragId); var toIdx = items.findIndex(i => i.id === targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    var moved = items.splice(fromIdx, 1)[0]; items.splice(toIdx, 0, moved);
    items.forEach(function(item, i) { DataStore.update(DataStore.KEYS.FAQ_DATA, item.id, { order: i + 1 }); });
    renderFAQ();
}
function _faqDragEnd(e) { _faqDragId = null; e.target.style.opacity = '1'; }
function openFAQModal(editId) {
    const item = editId ? DataStore.getById(DataStore.KEYS.FAQ_DATA, editId) : null;
    const title = item ? 'עריכת שאלה' : 'הוספת שאלה חדשה';
    const items = DataStore.getAll(DataStore.KEYS.FAQ_DATA) || [];
    const maxOrder = items.reduce((max, i) => Math.max(max, i.order || 0), 0);
    document.getElementById('modalBody').innerHTML = `
        <div class="form-group"><label>כותרת בערבית</label><input type="text" id="fFaqTitleAr" class="form-input" value="${escAttr(item ? item.titleAr || '' : '')}" dir="rtl"></div>
        <div class="form-group"><label>כותרת בעברית</label><input type="text" id="fFaqTitleHe" class="form-input" value="${escAttr(item ? item.titleHe || '' : '')}"></div>
        <div class="form-group"><label>תשובה בערבית</label><div id="fFaqAnswerAr" style="min-height:200px;border:1px solid var(--gray-200);border-radius:var(--border-radius);"></div></div>
        <div class="form-group"><label>תשובה בעברית</label><div id="fFaqAnswerHe" style="min-height:200px;border:1px solid var(--gray-200);border-radius:var(--border-radius);"></div></div>
        <div class="form-group"><label>סדר תצוגה</label><input type="number" id="fFaqOrder" class="form-input" value="${item ? (item.order || 0) : maxOrder + 1}" style="max-width:120px;"></div>
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px;">
            <button class="btn btn-primary" onclick="App.saveFAQ('${editId || ''}')">💾 שמור</button>
            <button class="btn btn-outline" onclick="App.closeModal()">ביטול</button>
        </div>`;
    document.getElementById('modalTitle').textContent = title; document.getElementById('modalFooter').innerHTML = '';
    document.getElementById('modalOverlay').classList.add('active');
    setTimeout(() => {
        if (_faqQuillAr) { _faqQuillAr = null; } if (_faqQuillHe) { _faqQuillHe = null; }
        const arEl = document.getElementById('fFaqAnswerAr'); const heEl = document.getElementById('fFaqAnswerHe');
        if (arEl) { _faqQuillAr = new Quill(arEl, { theme: 'snow', direction: 'rtl', placeholder: 'أدخل الإجابة بالعربية...', modules: { toolbar: [['bold','italic','underline','strike'], [{'list':'ordered'},{'list':'bullet'}], ['link'], ['clean']] } }); if (item && item.answerAr) _faqQuillAr.root.innerHTML = item.answerAr; }
        if (heEl) { _faqQuillHe = new Quill(heEl, { theme: 'snow', direction: 'rtl', placeholder: 'הזן את התשובה בעברית...', modules: { toolbar: [['bold','italic','underline','strike'], [{'list':'ordered'},{'list':'bullet'}], ['link'], ['clean']] } }); if (item && item.answerHe) _faqQuillHe.root.innerHTML = item.answerHe; }
    }, 100);
}
function saveFAQ(editId) {
    const titleAr = document.getElementById('fFaqTitleAr').value.trim(); const titleHe = document.getElementById('fFaqTitleHe').value.trim();
    const answerAr = _faqQuillAr ? _faqQuillAr.root.innerHTML : ''; const answerHe = _faqQuillHe ? _faqQuillHe.root.innerHTML : '';
    const order = parseInt(document.getElementById('fFaqOrder').value) || 0;
    if (!titleAr && !titleHe) { showToast('יש להזין לפחות כותרת אחת', 'error'); return; }
    const data = { titleAr, titleHe, answerAr, answerHe, order };
    if (editId) { DataStore.update(DataStore.KEYS.FAQ_DATA, editId, data); logActivity('edit_faq', 'עריכת שאלה: ' + (titleHe || titleAr), 'faq', editId); }
    else { DataStore.create(DataStore.KEYS.FAQ_DATA, data); logActivity('add_faq', 'הוספת שאלה: ' + (titleHe || titleAr), 'faq'); }
    closeModal(); renderFAQ(); showToast(editId ? 'השאלה עודכנה' : 'השאלה נוספה', 'success');
}
function deleteFAQ(id) {
    confirmDialog('⚠️ למחוק שאלה זו?', function() { _moveToRecycleBin(DataStore.KEYS.FAQ_DATA, id); logActivity('delete_faq', 'מחיקת שאלה', 'faq', id); renderFAQ(); showToast('השאלה נמחקה', 'success'); });
}

// ================================================================
//  SETTINGS & BACKUP
// ================================================================
var _waEditIdx = -1;
function _openWaEditModal(idx) {
    var templates = _getWaTemplates(); if (idx < 0 || idx >= templates.length) return; _waEditIdx = idx; var t = templates[idx];
    var langLabel = t.lang === 'ar' ? '🇸🇦 ערבית' : '🇮🇱 עברית'; var periodLabels = { morning: 'בוקר', afternoon: 'צהריים', evening: 'ערב', night: 'לילה' }; var pLabel = periodLabels[t.period] || t.period;
    showModal('עריכת תבנית — ' + langLabel + ' · ' + pLabel, '<div class="form-group"><label>נוסח הפנייה</label><p style="font-size:12px;color:var(--gray-400);margin-bottom:6px;">השתמשו ב-<strong>[שם]</strong> או <strong>[اسم]</strong> כ-placeholder לשם המשתלם.</p><textarea id="fWaEditText" class="form-input" rows="4" style="resize:vertical;">' + escAttr(t.text) + '</textarea></div>', '<button class="btn btn-primary" onclick="App._saveWaEditModal()">💾 שמור</button><button class="btn btn-outline" onclick="App.closeModal()">ביטול</button>');
}
function _saveWaEditModal() {
    if (_waEditIdx < 0) return; var textEl = document.getElementById('fWaEditText'); if (!textEl) return;
    var templates = _getWaTemplates(); if (_waEditIdx < templates.length) { templates[_waEditIdx].text = textEl.value.trim() || templates[_waEditIdx].text; DataStore.updateSettings({ waTemplates: templates }); showToast('התבנית נשמרה', 'success'); var editor = document.getElementById('waTemplateEditor'); if (editor) editor.innerHTML = _renderWaTemplateEditor(); }
    closeModal(); _waEditIdx = -1;
}
function _resetSingleWaTemplate(idx) {
    var templates = _getWaTemplates(); if (idx < 0 || idx >= templates.length) return;
    confirmDialog('לאפס תבנית זו לברירת מחדל?', function() {
        var def = _WA_DEFAULT_TEMPLATES.find(function(d) { return d.id === templates[idx].id; });
        if (def) { templates[idx].text = def.text; DataStore.updateSettings({ waTemplates: templates }); showToast('התבנית אופסה', 'success'); var editor = document.getElementById('waTemplateEditor'); if (editor) editor.innerHTML = _renderWaTemplateEditor(); }
        else { showToast('תבנית מותאמת אישית — לא ניתן לאפס אוטומטית', 'warning'); }
    });
}
function _renderWaTemplateEditor() {
    var templates = _getWaTemplates(); var periodLabels = { morning: 'בוקר', afternoon: 'צהריים', evening: 'ערב', night: 'לילה' }; var periodIcons = { morning: '🌅', afternoon: '☀️', evening: '🌆', night: '🌙' };
    var html = '<p style="color:var(--gray-500);font-size:13px;margin-bottom:14px;">ניתן לערוך כל תבנית בנפרד. השתמשו ב-<strong>[שם]</strong> או <strong>[اسم]</strong> כ-placeholder.</p><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px;">';
    templates.forEach(function(t, i) {
        var langLabel = t.lang === 'ar' ? '🇸🇦 ערבית' : '🇮🇱 עברית'; var pLabel = periodLabels[t.period] || t.period; var pIcon = periodIcons[t.period] || '📝'; var preview = (t.text || '').substring(0, 55); if ((t.text || '').length > 55) preview += '...';
        html += '<div style="border:1px solid var(--gray-200);border-radius:8px;padding:14px;background:white;display:flex;flex-direction:column;gap:8px;"><div style="display:flex;align-items:center;justify-content:space-between;"><div style="display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:var(--gray-700);"><span>' + pIcon + '</span><span>' + langLabel + ' · ' + escAttr(pLabel) + '</span></div><div style="display:flex;gap:2px;"><button onclick="App._openWaEditModal(' + i + ')" style="background:none;border:none;cursor:pointer;font-size:15px;padding:4px;border-radius:4px;" title="ערוך">✏️</button><button onclick="App._resetSingleWaTemplate(' + i + ')" style="background:none;border:none;cursor:pointer;font-size:15px;padding:4px;border-radius:4px;" title="אפס לברירת מחדל">🔄</button></div></div><div style="font-size:12px;color:var(--gray-500);line-height:1.5;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escAttr(preview) + '</div></div>';
    });
    html += '</div><div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap;"><button class="btn btn-outline btn-sm" onclick="App._addWaTemplate()">➕ הוסף תבנית</button><button class="btn btn-outline btn-sm" onclick="App._resetWaTemplates()">↩️ אפס הכל לברירת מחדל</button></div>';
    return html;
}
function _saveWaTemplates() { DataStore.updateSettings({ waTemplates: _getWaTemplates() }); showToast('התבניות נשמרו בהצלחה', 'success'); }
function _resetWaTemplates() { confirmDialog('לשחזר את תבניות ברירת המחדל?', function() { DataStore.updateSettings({ waTemplates: [] }); showToast('התבניות שוחזרו לברירת מחדל', 'success'); var editor = document.getElementById('waTemplateEditor'); if (editor) editor.innerHTML = _renderWaTemplateEditor(); }); }
function _addWaTemplate() { var templates = _getWaTemplates(); templates.push({ id: 'custom_' + Date.now(), lang: 'he', period: 'morning', hourFrom: 6, hourTo: 11, text: 'חג שמח [שם],' }); DataStore.updateSettings({ waTemplates: templates }); var editor = document.getElementById('waTemplateEditor'); if (editor) editor.innerHTML = _renderWaTemplateEditor(); showToast('תבנית חדשה נוספה — ערכו את התוכן ושמרו', 'info'); }

function _getBackupStatus(tableKey) {
    var settings = DataStore.getSettings(); var ts = settings.backupTimestamps || {}; var dateStr = ts[tableKey];
    if (!dateStr) return { status: 'none', label: 'ללא גיבוי', date: '', color: 'var(--gray-300)' };
    var diff = Date.now() - new Date(dateStr).getTime(); var days = diff / (1000 * 60 * 60 * 24); var d = new Date(dateStr); var dateLabel = d.getDate() + '/' + (d.getMonth()+1) + '/' + d.getFullYear();
    if (days <= 7) return { status: 'fresh', label: 'עדכני', date: dateLabel, color: '#22c55e' };
    if (days <= 30) return { status: 'old', label: 'ישן', date: dateLabel, color: '#eab308' };
    return { status: 'stale', label: 'מאוד ישן', date: dateLabel, color: 'var(--gray-400)' };
}
function _backupTableCard(tableKey) { var sel = document.getElementById('fBackupTable'); if (sel) sel.value = tableKey; backupTable(tableKey); }
function _backupFullCard() { backupFull(); }
function _updateBackupStatusUI() {
    var tableKeys = Object.keys(BACKUP_TABLE_META); var freshCount = 0, oldCount = 0, staleCount = 0, noneCount = 0;
    tableKeys.forEach(function(k) {
        var st = _getBackupStatus(k); var dot = document.getElementById('backup-dot-' + k); var dateEl = document.getElementById('backup-date-' + k);
        if (dot) { dot.style.background = st.color; dot.title = st.label; } if (dateEl) dateEl.textContent = st.date || '—';
        if (st.status === 'fresh') freshCount++; else if (st.status === 'old') oldCount++; else if (st.status === 'stale') staleCount++; else noneCount++;
    });
    var badge = document.getElementById('backupSummaryBadge'); var summaryText = document.getElementById('backupSummaryText');
    if (badge && summaryText) {
        if (noneCount > 0) { badge.style.background = '#fee2e2'; badge.style.color = '#991b1b'; badge.textContent = 'דרוש גיבוי'; summaryText.textContent = noneCount + ' טבלאות ללא גיבוי'; }
        else if (staleCount > 0) { badge.style.background = '#fef3c7'; badge.style.color = '#92400e'; badge.textContent = 'גיבוי ישן'; summaryText.textContent = staleCount + ' טבלאות עם גיבוי ישן (>30 יום)'; }
        else if (oldCount > 0) { badge.style.background = '#fef3c7'; badge.style.color = '#92400e'; badge.textContent = 'שים לב'; summaryText.textContent = oldCount + ' טבלאות עם גיבוי עד 30 יום'; }
        else { badge.style.background = '#dcfce7'; badge.style.color = '#166534'; badge.textContent = 'תקין'; summaryText.textContent = 'כל הטבלאות מעודכנות (עד 7 ימים)'; }
    }
}
function _triggerFullRestore() { var input = document.getElementById('fRestoreFullFile'); if (input) { input.value = ''; input.click(); } }
function _triggerTableRestore(tableKey) { var sel = document.getElementById('fRestoreTable'); if (sel) sel.value = tableKey; var input = document.getElementById('fRestoreTableFile'); if (input) { input.value = ''; input.click(); } }
function _triggerDataImport() { var input = document.getElementById('fSettingsImportFile'); if (input) { input.value = ''; input.click(); } }
function _checkDataIntegrity() {
    var keys = Object.keys(BACKUP_TABLE_META); var issues = [];
    keys.forEach(function(k) { var data = DataStore.getAll(k); if (!data || (Array.isArray(data) && data.length === 0)) issues.push(BACKUP_TABLE_META[k] + ': ריקה'); });
    if (issues.length === 0) showToast('כל ' + keys.length + ' הטבלאות תקינות ✓', 'success');
    else { var listHtml = issues.map(function(i) { return '<li style="margin-bottom:3px;font-size:13px;">' + i + '</li>'; }).join(''); showModal('בדיקת תקינות', '<p style="margin-bottom:10px;color:var(--gray-600);">נמצאו <strong>' + issues.length + '</strong> טבלאות ריקות:</p><ul style="max-height:250px;overflow-y:auto;direction:rtl;text-align:right;padding-right:16px;color:var(--gray-700);">' + listHtml + '</ul>', '<button class="btn btn-primary" onclick="App.closeModal()">סגור</button>'); }
}
function renderSettings() {
    const settings = DataStore.getSettings(); var tableKeys = Object.keys(BACKUP_TABLE_META); var tableCardsHtml = '';
    tableKeys.forEach(function(k) {
        var st = _getBackupStatus(k); var label = BACKUP_TABLE_META[k]; var data = DataStore.getAll(k);
        var recordCount = Array.isArray(data) ? data.length : (typeof data === 'object' && data !== null ? Object.keys(data).length : 0);
        var statusTooltip = st.status === 'none' ? 'לא בוצע גיבוי' : 'גיבוי אחרון: ' + st.date + ' (' + st.label + ')';
        tableCardsHtml += '<div style="border:1px solid var(--gray-200);border-radius:10px;padding:12px 14px;background:white;display:flex;flex-direction:column;gap:8px;transition:box-shadow 0.15s;" onmouseover="this.style.boxShadow=\'0 2px 8px rgba(0,0,0,0.06)\'" onmouseout="this.style.boxShadow=\'none\'" title="' + escAttr(statusTooltip) + '">';
        tableCardsHtml += '<div style="display:flex;align-items:center;justify-content:space-between;gap:6px;"><span style="font-size:13px;font-weight:600;color:var(--gray-700);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="' + escAttr(label) + '">' + escAttr(label) + '</span><span id="backup-dot-' + k + '" style="width:10px;height:10px;border-radius:50%;background:' + st.color + ';flex-shrink:0;" title="' + escAttr(st.label) + '"></span></div>';
        tableCardsHtml += '<div style="display:flex;align-items:center;justify-content:space-between;"><span id="backup-date-' + k + '" style="font-size:11px;color:var(--gray-400);">' + (st.date || '—') + '</span><span style="font-size:11px;color:var(--gray-400);background:var(--gray-100);padding:1px 7px;border-radius:8px;">' + recordCount + ' רשומות</span></div>';
        tableCardsHtml += '<div style="display:flex;gap:6px;"><button class="btn btn-outline btn-sm" style="flex:1;font-size:12px;padding:6px 8px;" onclick="App._backupTableCard(\'' + k + '\')" title="הורד גיבוי של ' + escAttr(label) + '">💾 גיבוי</button><button class="btn btn-outline btn-sm" style="flex:1;font-size:12px;padding:6px 8px;" onclick="App._triggerTableRestore(\'' + k + '\')" title="טען גיבוי ל- ' + escAttr(label) + '">🔄 שחזור</button></div></div>';
    });
    document.getElementById('section-settings').innerHTML =
        '<select id="fBackupTable" style="display:none;"><option value="">--</option></select><select id="fRestoreTable" style="display:none;"><option value="">--</option></select>' +
        '<input type="file" id="fRestoreFullFile" accept=".json" style="display:none;" onchange="App.restoreFull()"><input type="file" id="fRestoreTableFile" accept=".json" style="display:none;" onchange="App.restoreTable()">' +
        '<input type="file" id="fSettingsImportFile" accept=".json" style="display:none;" onchange="App.importJSON(this)">' +
        '<div class="card" style="border-top:4px solid #0ca7aa;margin-bottom:24px;"><div class="card-header"><span class="card-title">🌐 כותרת אתר וזכויות יוצרים</span></div><div class="card-body"><div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">' +
            '<div class="form-group"><label>שם האתר – עברית</label><input type="text" id="fSiteNameHe" class="form-input" value="' + escAttr(settings.siteNameHe || '') + '" dir="rtl"></div>' +
            '<div class="form-group"><label>اسم الموقع – بالعربية</label><input type="text" id="fSiteNameAr" class="form-input" value="' + escAttr(settings.siteNameAr || '') + '" dir="rtl"></div>' +
            '<div class="form-group"><label>טקסט זכויות יוצרים – עברית</label><input type="text" id="fCopyrightHe" class="form-input" value="' + escAttr(settings.copyrightHe || '') + '" dir="rtl"></div>' +
            '<div class="form-group"><label>نص حقوق النشر – بالعربية</label><input type="text" id="fCopyrightAr" class="form-input" value="' + escAttr(settings.copyrightAr || '') + '" dir="rtl"></div>' +
        '</div><div class="form-group"><label>לוגו האתר</label><div style="display:flex;align-items:center;gap:10px;margin-top:6px;"><input type="file" id="fLogoFile" accept="image/*" style="font-size:13px;"><div id="fLogoPreview" style="width:40px;height:40px;border-radius:8px;border:2px solid var(--gray-200);display:flex;align-items:center;justify-content:center;font-size:24px;overflow:hidden;flex-shrink:0;background:var(--gray-50);">' + (settings.logoUrl ? '<img src="'+settings.logoUrl+'" style="width:100%;height:100%;object-fit:cover;">' : '🧭') + '</div></div></div>' +
        '<div style="display:flex;justify-content:flex-start;margin-top:8px;"><button class="btn btn-primary" onclick="App.saveSiteSettings()">💾 שמור שינויים</button></div></div></div>' +
        '<div class="card" style="border-top:4px solid #25D366;margin-bottom:24px;"><div class="card-header"><span class="card-title">💬 תבניות הפנייה אישית – WhatsApp</span></div><div class="card-body"><div id="waTemplateEditor">' + _renderWaTemplateEditor() + '</div></div></div>' +
        '<div class="card" style="border-top:4px solid #6b7280;margin-bottom:24px;"><div class="card-header"><span class="card-title">💾 ניהול נתונים, גיבוי ושחזור</span></div><div class="card-body">' +
            '<div style="background:var(--gray-50);border:1px solid var(--gray-200);border-radius:8px;padding:12px 16px;margin-bottom:20px;direction:rtl;text-align:right;"><p style="margin:0 0 6px 0;font-size:13px;color:var(--gray-600);line-height:1.6;">💾 <strong>גיבוי מלא</strong> — יוצר עותק מלא של כל ' + tableKeys.length + ' הטבלאות במערכת ומוריד למחשב כקובץ JSON.</p><p style="margin:0;font-size:13px;color:var(--gray-600);line-height:1.6;">🔄 <strong>שחזור מלא</strong> — טוען קובץ גיבוי ומשחזר את כל הטבלאות שנכללו בו. <span style="color:#991b1b;font-weight:500;">⚠️ הנתונים הקיימים יוחלפו לחלוטין.</span></p></div>' +
            '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid var(--gray-200);">' +
                '<button class="btn btn-primary" id="btnBackupFull" onclick="App._backupFullCard()" style="font-size:14px;padding:10px 20px;" title="יצירת גיבוי מלא של כל הטבלאות והורדה למחשב">💾 גיבוי מלא – כל הנתונים</button>' +
                '<button class="btn btn-outline" onclick="App._triggerFullRestore()" style="font-size:14px;padding:10px 20px;" title="טעינת קובץ גיבוי ושחזור מלא של כל הטבלאות">🔄 שחזור מלא מקובץ גיבוי</button>' +
                '<button class="btn btn-outline" onclick="App.exportJSON()" style="font-size:13px;">📤 ייצוא נתונים</button>' +
                '<button class="btn btn-outline" onclick="App._triggerDataImport()" style="font-size:13px;">📥 ייבוא נתונים</button>' +
                '<button class="btn btn-outline" onclick="App._checkDataIntegrity()" style="font-size:13px;">✅ בדיקת תקינות</button>' +
                '<button class="btn btn-danger" onclick="App.clearData()" style="font-size:13px;">🗑️ נקה הכל</button>' +
            '</div>' +
            '<div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:10px 14px;margin-bottom:16px;direction:rtl;text-align:right;"><p style="margin:0;font-size:12px;color:#0369a1;line-height:1.6;">📤 <strong>ייצוא נתונים</strong> — מייצא את כל הנתונים לקובץ CSV/Excel לצורך ניתוח או דיווח חיצוני. לא מתאים לשחזור!<br>📥 <strong>ייבוא נתונים</strong> — מיזוג נתונים מקובץ חיצוני לתוך הטבלאות הקיימות. לא מחליף נתונים קיימים!</p></div>' +
            '<div style="background:linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%);border:1px solid var(--gray-200);border-radius:10px;padding:14px 16px;margin-bottom:16px;"><div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;"><div style="display:flex;align-items:center;gap:10px;"><span style="font-size:13px;font-weight:600;color:var(--gray-600);">📊 מצב גיבוי כללי:</span><span id="backupSummaryBadge" style="font-size:12px;padding:4px 10px;border-radius:12px;background:#dcfce7;color:#166534;font-weight:600;">תקין</span></div><div style="display:flex;align-items:center;gap:8px;font-size:11px;color:var(--gray-500);"><span id="backupSummaryText">כל הטבלאות מעודכנות</span></div></div></div>' +
            '<p style="font-size:12px;color:var(--gray-400);margin-bottom:10px;">מצב גיבוי לכל טבלה (לחצו על "גיבוי" להורדה או "שחזור" לטעינה):</p>' +
            '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px;max-height:360px;overflow-y:auto;padding:2px;">' + tableCardsHtml + '</div>' +
        '</div></div>' +
        '<div class="card" style="border-top:4px solid #475569;"><div class="card-header"><span class="card-title">🩺 אבחון תקינות שרת</span></div><div class="card-body">' +
            '<div id="healthCheckSummary" style="display:none;margin-bottom:16px;padding:12px 16px;border-radius:8px;font-size:14px;font-weight:600;"></div>' +
            '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:20px;">' +
                '<button class="btn btn-primary" id="btnRunHealthCheck" onclick="App._runHealthCheck()" style="font-size:13px;">🩺 בצע אבחון שרת</button>' +
                '<button class="btn btn-outline" onclick="App._showErrorLog()" style="font-size:13px;">📋 הצג שגיאות אחרונות</button>' +
                '<button class="btn btn-outline" id="btnAutoFix" onclick="App._attemptAutoFix()" style="font-size:13px;display:none;">🔧 תיקון אוטומטי של הרשאות</button>' +
            '</div>' +
            '<div id="healthCheckResults" class="health-check-results" style="display:none;"></div>' +
            '<div id="hcCpanelConfig" style="margin-top:16px;padding:12px 16px;border-radius:8px;background:#f0f4f8;border:1px solid #cbd5e1;direction:rtl;text-align:right;">' +
                '<div style="font-size:12px;font-weight:600;color:#334155;margin-bottom:8px;">ℹ️ הגדרות cPanel (אופציונלי)</div>' +
                '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">' +
                    '<input type="text" id="hcCpanelUrl" placeholder="כתובת cPanel, דוגמה: https://cpanel.example.com:2083" style="flex:1;min-width:200px;padding:7px 12px;border:1px solid var(--gray-200);border-radius:6px;font-size:12px;direction:ltr;text-align:left;font-family:monospace;" onchange="localStorage.setItem(\'hc_cpanel_url\',this.value)" />' +
                    '<button class="btn btn-outline" style="font-size:11px;white-space:nowrap;" onclick="App._openCpanelLink(\'errors\')">📋 דף שגיאות cPanel</button>' +
                    '<button class="btn btn-outline" style="font-size:11px;white-space:nowrap;" onclick="App._openCpanelLink(\'filemanager\')">📁 מנהל קבצים</button>' +
                '</div>' +
                '<p style="font-size:11px;color:#64748b;margin:6px 0 0 0;">הכנסו את כתובת cPanel שלכם (כולל הפורט ו-:2083) כדי לקבל גישה ישירה לדפי השגיאות ומנהל הקבצים של cPanel.</p>' +
            '</div>' +
            '<p style="font-size:12px;color:var(--gray-400);margin-bottom:0;">בדיקה אוטומטית של הרשאות כתיבה, נתיבים, זיכרון, בעלות (Ownership) וקבצי נתונים. מותאם לשרתי cPanel/suPHP – יאבחן בעיות בעלות ויציג הנחיות לתיקון.</p>' +
        '</div></div>';
    _populateBackupTableSelects(); _restoreCpanelUrl();
}
function _switchSettingsSub(subSection) {
    App._settingsSubSection = subSection;
    document.querySelectorAll('.settings-sub-section').forEach(function(el) { el.style.display = 'none'; });
    var activeEl = document.getElementById('settings-sub-' + subSection); if (activeEl) activeEl.style.display = 'block';
    var buttons = document.querySelectorAll('#section-settings .btn');
    buttons.forEach(function(btn) {
        var isTarget = btn.textContent.includes(_getSubSectionLabel(subSection));
        if (isTarget) { btn.classList.remove('btn-ghost'); btn.classList.add('btn-primary'); }
        else { if (btn.onclick && btn.onclick.toString().includes('_switchSettingsSub')) { btn.classList.remove('btn-primary'); btn.classList.add('btn-ghost'); } }
    });
    document.querySelector('.main-content').scrollTop = 0;
}
function _getSubSectionLabel(sub) { var labels = { 'general': 'הגדרות כלליות', 'whatsapp': 'תבניות WhatsApp', 'backup': 'גיבוי ושחזור', 'health': 'אבחון שרת' }; return labels[sub] || ''; }

var _lastHealthData = null;
function _runHealthCheck() {
    var btn = document.getElementById('btnRunHealthCheck'); var resultsEl = document.getElementById('healthCheckResults'); var summaryEl = document.getElementById('healthCheckSummary');
    if (!btn || !resultsEl || !summaryEl) return;
    btn.disabled = true; btn.textContent = '🔄 מאבחן...'; summaryEl.style.display = 'none'; resultsEl.style.display = 'none'; document.getElementById('btnAutoFix').style.display = 'none';
    fetch('/api/health-check?XTransformPort=3001', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
    .then(function(r) { return r.json(); })
    .then(function(data) {
        btn.disabled = false; btn.textContent = '🩺 בצע אבחון שרת'; _lastHealthData = data; _renderHealthResults(data);
    }).catch(function(err) {
        btn.disabled = false; btn.textContent = '🩺 בצע אבחון שרת'; summaryEl.style.display = 'block'; summaryEl.style.background = '#fef2f2'; summaryEl.style.color = '#991b1b'; summaryEl.style.border = '1px solid #fecaca';
        summaryEl.innerHTML = '❌ שגיאה בחיבור השרת: ' + escAttr(err.message) + '. ייתכן שהשרת אינו פעיל בסביבה הנוכחית.';
    });
}
function _renderHealthResults(data) {
    var summaryEl = document.getElementById('healthCheckSummary'); var resultsEl = document.getElementById('healthCheckResults'); var autoFixBtn = document.getElementById('btnAutoFix');
    var hasFail = data.results.some(function(r) { return r.status === 'fail'; }); var hasWarn = data.results.some(function(r) { return r.status === 'warn'; });
    summaryEl.style.display = 'block';
    if (data.allPassed && !hasWarn) { summaryEl.style.background = '#f0fdf4'; summaryEl.style.color = '#166534'; summaryEl.style.border = '1px solid #bbf7d0'; summaryEl.innerHTML = '✅ המערכת תקינה – כל הבדיקות עברו בהצלחה. <span style="font-weight:400;font-size:12px;opacity:0.7;">(' + new Date(data.timestamp).toLocaleString('he-IL') + ')</span>'; }
    else if (!hasFail && hasWarn) { summaryEl.style.background = '#fffbeb'; summaryEl.style.color = '#92400e'; summaryEl.style.border = '1px solid #fde68a'; summaryEl.innerHTML = '⚠️ המערכת פעילה עם אזהרות – יש לבדוק את הפרטים.'; }
    else { summaryEl.style.background = '#fef2f2'; summaryEl.style.color = '#991b1b'; summaryEl.style.border = '1px solid #fecaca'; summaryEl.innerHTML = '❌ נמצאו בעיות – יש לפעול בהתאם להוראות.'; if (autoFixBtn) autoFixBtn.style.display = ''; }
    var html = '';
    data.results.forEach(function(r) {
        var icon, bgColor, borderColor, textColor;
        if (r.status === 'ok') { icon = '✅'; bgColor = '#f0fdf4'; borderColor = '#bbf7d0'; textColor = '#166534'; }
        else if (r.status === 'warn') { icon = '⚠️'; bgColor = '#fffbeb'; borderColor = '#fde68a'; textColor = '#92400e'; }
        else if (r.status === 'fail') { icon = '❌'; bgColor = '#fef2f2'; borderColor = '#fecaca'; textColor = '#991b1b'; }
        else { icon = 'ℹ️'; bgColor = '#f8fafc'; borderColor = '#e2e8f0'; textColor = '#475569'; }
        html += '<div class="hc-result-item" data-check-id="' + escAttr(r.id) + '" data-status="' + r.status + '" style="display:flex;align-items:flex-start;gap:12px;padding:12px 14px;margin-bottom:8px;border-radius:8px;background:' + bgColor + ';border:1px solid ' + borderColor + ';direction:rtl;text-align:right;">';
        html += '<span style="font-size:18px;flex-shrink:0;margin-top:1px;">' + icon + '</span><div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:600;color:' + textColor + ';margin-bottom:4px;">' + escAttr(r.label) + '</div>';
        if (r.status === 'info') { html += '<div style="font-size:12px;color:var(--gray-600);direction:ltr;text-align:left;font-family:monospace;background:white;padding:6px 10px;border-radius:4px;word-break:break-all;">' + escAttr(r.detail) + '</div>'; }
        else { html += '<div style="font-size:12px;color:' + textColor + ';opacity:0.85;line-height:1.6;">' + escAttr(r.detail) + '</div>'; }
        if (r.id === 'cpanel_owner' && r.status === 'fail') {
            html += '<div class="hc-cpanel-guidance"><strong>🔧 פעולות מומלצות לתיקון הבעיה:</strong><ol style="margin:6px 0 0 0;padding-right:18px;line-height:2;"><li>התחברו ל-cPanel > מנהל הקבצים (File Manager)</li><li>בחרו בתיקיית data/ – בדקו את העמודה "בעלות" (Owner)</li><li>אם הבעלות מוגדרת ל-<strong>nobody</strong> – החליפו לשם המשתמש שלכם ב-cPanel</li><li>לאחר השינוי: תיקיות <strong>755</strong>, קבצים <strong>644</strong> או <strong>664</strong></li></ol></div>';
        }
        html += '</div></div>';
    });
    resultsEl.innerHTML = html; resultsEl.style.display = 'block';
}
function _showErrorLog() {
    showModal('📋 יומן שגיאות אחרונות', '<div id="healthLogContent" style="direction:rtl;text-align:center;padding:20px 0;"><div style="font-size:24px;margin-bottom:12px;">🔄</div>טוען...</div>', '<button class="btn btn-outline" onclick="App.closeModal()">סגירה</button>');
    fetch('/api/health-log?XTransformPort=3001', { method: 'GET' }).then(function(r) { return r.json(); }).then(function(data) {
        var container = document.getElementById('healthLogContent'); if (!container) return;
        if (!data.entries || data.entries.length === 0) { container.innerHTML = '<div style="text-align:center;padding:20px 0;color:var(--gray-400);">✅ אין שגיאות מתועדות.</div>'; return; }
        var html = '<div style="font-size:12px;color:var(--gray-400);margin-bottom:12px;">סה"כ כל השגיאות: ' + (data.total || 0) + '</div><div style="max-height:350px;overflow-y:auto;">';
        data.entries.forEach(function(entry) { html += '<div style="background:var(--gray-50);border:1px solid var(--gray-200);border-radius:6px;padding:8px 12px;margin-bottom:6px;font-family:monospace;font-size:12px;direction:ltr;text-align:left;white-space:pre-wrap;word-break:break-all;color:var(--gray-700);">' + escAttr(entry) + '</div>'; });
        html += '</div><div style="margin-top:12px;display:flex;gap:8px;justify-content:center;"><button class="btn btn-outline btn-sm" onclick="App._copyErrorLog()" style="font-size:12px;">📋 העתק ללוח</button><button class="btn btn-outline btn-sm" onclick="App._clearErrorLog()" style="font-size:12px;color:var(--danger);">🗑️ נקה לוג</button></div>';
        var cpanelUrl = (document.getElementById('hcCpanelUrl') && document.getElementById('hcCpanelUrl').value) || localStorage.getItem('hc_cpanel_url') || ''; cpanelUrl = cpanelUrl.trim().replace(/\/+$/, '');
        html += '<div style="margin-top:16px;padding:12px 16px;border-radius:8px;background:#f0f4f8;border:1px solid #cbd5e1;direction:rtl;text-align:right;"><div style="font-size:13px;font-weight:600;color:#334155;margin-bottom:6px;">ℹ️ הפניה לשרתי cPanel</div><div style="font-size:12px;color:#475569;line-height:1.7;">בשרתי cPanel קיים מנגנון יומן שגיאות מובנה תחת <strong>Metrics > Errors</strong> בלוח הבקרה. ייתכן ששגיאות נוספות שאינן מופיעות כאן קשורות לבעלות ובעלויות (Ownership). מומלץ לבדוק גם את יומן השגיאות של Apache/PHP בתיקיית האתר.</div>';
        if (cpanelUrl) { html += '<div style="margin-top:10px;display:flex;gap:8px;justify-content:flex-start;"><a href="' + escAttr(cpanelUrl) + '/frontend/metrics/errors" target="_blank" class="btn btn-outline" style="font-size:11px;text-decoration:none;">📋 פתח דף שגיאות cPanel</a><a href="' + escAttr(cpanelUrl) + '/frontend/files" target="_blank" class="btn btn-outline" style="font-size:11px;text-decoration:none;">📁 מנהל קבצים</a></div>'; }
        else { html += '<div style="margin-top:10px;font-size:11px;color:#64748b;">💡 לקבלת קישור ישיר לדף השגיאות, הגדירו את כתובת cPanel בכרטיס אבחון השרת.</div>'; }
        html += '</div>'; container.innerHTML = html;
    }).catch(function(err) { var container = document.getElementById('healthLogContent'); if (container) container.innerHTML = '<div style="color:var(--danger);text-align:center;">שגיאה בטעינת הלוג: ' + escAttr(err.message) + '</div>'; });
}
function _copyErrorLog() {
    fetch('/api/health-log?XTransformPort=3001', { method: 'GET' }).then(function(r) { return r.json(); }).then(function(data) {
        if (!data.entries || data.entries.length === 0) { showToast('אין שגיאות להעתקה', 'info'); return; }
        var text = data.entries.join('\n');
        navigator.clipboard.writeText(text).then(function() { showToast('הלוג הועתק ללוח', 'success'); }).catch(function() { showToast('שגיאה בהעתקה', 'error'); });
    });
}
function _clearErrorLog() {
    confirmDialog('לנקות את יומן השגיאות?', function() {
        fetch('/api/health-log?XTransformPort=3001', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'clear' }) }).then(function() {
            showToast('יומן השגיאות נמחק', 'success'); App.closeModal();
        }).catch(function() { showToast('שגיאה בניקוי', 'error'); });
    });
}
function _attemptAutoFix() {
    confirmDialog('תיקון אוטומטי של הרשאות', '<div style="padding:8px 0;"><p style="color:var(--gray-600);margin-bottom:12px;">המערכת תנסה להגדיר את ההרשאות:</p><ul style="text-align:right;color:var(--gray-700);font-size:13px;padding-right:20px;line-height:2;"><li>תיקיית data/ ל-755</li><li>קבצי JSON ל-664</li></ul><div style="margin-top:12px;padding:10px 14px;border-radius:8px;background:#fffbeb;border:1px solid #fde68a;direction:rtl;text-align:right;"><div style="font-size:12px;font-weight:600;color:#92400e;margin-bottom:4px;">⚠️ הערת לשרתי cPanel – שימו לב:</div><ol style="text-align:right;color:#92400e;font-size:12px;padding-right:18px;line-height:2;margin:0;"><li>התחבר ל-cPanel > מנהל הקבצים (File Manager)</li><li>בדוק את בעלות (Owner) של תיקיית data/ – אם היא מוגדר ל-<strong>nobody</strong>, שנה לשם המשתמש שלך</li><li>הגדר הרשאות: תיקיות <strong>755</strong>, קבצים <strong>644</strong> או <strong>664</strong></li></ol><p style="color:#b45309;font-size:11px;margin:8px 0 0 0;">🚫 אין להשתמש ב-777 – ב-cPanel הדבר עלול לחסום את האתר בגלל מדינות האבטחה של suPHP/PHP-FPM.</p></div><p style="color:var(--gray-500);font-size:12px;margin-top:8px;">פעולה זו עלולה להשתנות באישור. האבחון יבדוק גם חוסר בעלות (Ownership).</p></div>', '<button class="btn btn-warning" onclick="App._doAutoFix()">🔧 בצע תיקון</button><button class="btn btn-outline" onclick="App.closeModal()">ביטול</button>');
}
function _doAutoFix() {
    closeModal(); var btn = document.getElementById('btnAutoFix'); if (btn) { btn.disabled = true; btn.textContent = '🔧 מתקן...'; }
    fetch('/api/health-log?XTransformPort=3001', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'fix_perms' }) })
    .then(function(r) { return r.json(); }).then(function(data) {
        if (btn) { btn.disabled = false; btn.textContent = '🔧 תיקון אוטומטי של הרשאות'; }
        if (data.success) { showToast('🔧 התיקון הושלם! ' + (data.fixed ? data.fixed.length : 0) + ' קבצים תוקנו. מבצע אבחון חוזר...', 'success'); setTimeout(function() { _runHealthCheck(); }, 1500); }
        else { var msg = 'חלק מהניסיונות נכשלו: '; if (data.failed && data.failed.length > 0) msg += data.failed.join(', '); if (data.ownershipWarning) { msg += ' | ' + data.ownershipWarning; setTimeout(function() { _runHealthCheck(); }, 3000); } showToast(msg, 'error'); }
    }).catch(function(err) { if (btn) { btn.disabled = false; btn.textContent = '🔧 תיקון אוטומטי של הרשאות'; } showToast('שגיאה בתיקון: ' + err.message, 'error'); });
}
function _openCpanelLink(type) {
    var url = (document.getElementById('hcCpanelUrl') && document.getElementById('hcCpanelUrl').value) || localStorage.getItem('hc_cpanel_url') || ''; url = url.trim().replace(/\/+$/, '');
    if (!url) { showToast('יש להכניס את כתובת cPanel בשדה הייעודית למעלה', 'info'); var inp = document.getElementById('hcCpanelUrl'); if (inp) inp.focus(); return; }
    if (type === 'errors') window.open(url + '/frontend/metrics/errors', '_blank');
    else if (type === 'filemanager') window.open(url + '/frontend/files', '_blank');
}
function _restoreCpanelUrl() { var saved = localStorage.getItem('hc_cpanel_url'); var inp = document.getElementById('hcCpanelUrl'); if (inp && saved) inp.value = saved; }

function saveSiteSettings() {
    const fileInput = document.getElementById('fLogoFile'); const currentSettings = DataStore.getSettings();
    const saveData = { siteNameHe: document.getElementById('fSiteNameHe').value.trim(), siteNameAr: document.getElementById('fSiteNameAr').value.trim(), copyrightHe: document.getElementById('fCopyrightHe').value.trim(), copyrightAr: document.getElementById('fCopyrightAr').value.trim() };
    if (fileInput && fileInput.files && fileInput.files[0]) {
        const reader = new FileReader(); reader.onload = function(e) { saveData.logoUrl = e.target.result; DataStore.updateSettings(saveData); showToast('ההגדרות נשמרו (כולל לוגו)', 'success'); renderSettings(); }; reader.readAsDataURL(fileInput.files[0]);
    } else { saveData.logoUrl = currentSettings.logoUrl || ''; DataStore.updateSettings(saveData); showToast('ההגדרות נשמרו', 'success'); }
}

const BACKUP_TABLE_META = { users: 'משתמשים', categories: 'קטגוריות', solutions: 'פתרונות למידה', mentors: 'מנחים', guides_repo: 'מאגר מדריכים', budgets: 'תקצבים', lookup_schools: 'בתי ספר', periods: 'תקופות', solution_instructors: 'מדריכים-פתרונות', lookup_domains: 'תחומים', lookup_education_stages: 'שלבי חינוך', lookup_education_types: 'סוגי חינוך', lookup_budget_types: 'סוגי תקציב', lookup_allocation_status: 'סטטוס הקצאה', lookup_solution_status: 'סטטוס פתרון', lookup_performer_types: 'סוגי מבצע', lookup_lecturer_status: 'סטטוס מרצה', lookup_field_knowledge: 'תחומי ידע', lookup_role_holders: 'נושאי תפקיד', lookup_broad_topics: 'נושאים רחבים', lookup_designated_programs: 'תוכניות ייעוד', lookup_week_days: 'ימים בשבוע', lookup_meeting_types: 'סוגי מפגש', solution_comments: 'הערות פתרונות', catalog_entries: 'רשומות קטלוג', catalog_items: 'פריטי קטלוג', registrations: 'נרשמים לפתרונות למידה', settings: 'הגדרות אתר', recycle_bin: 'סל מחזור', inspectors: 'מפקחים', pedagogical_executors: 'מבצעים פדגוגיים', lookup_responsibility_types: 'סוגי אחריות', homepage: 'דף שער', faq_data: 'שאלות נפוצות','workshop-bookings': 'הזמנת סדנאות בפסגה', custom_pages: 'דפים מותאמים' };

function _populateBackupTableSelects() { var sel1 = document.getElementById('fBackupTable'); var sel2 = document.getElementById('fRestoreTable'); if (sel1 && sel1.options.length <= 1) { Object.keys(BACKUP_TABLE_META).forEach(function(k) { var o1 = document.createElement('option'); o1.value = k; o1.textContent = BACKUP_TABLE_META[k]; sel1.appendChild(o1); var o2 = document.createElement('option'); o2.value = k; o2.textContent = BACKUP_TABLE_META[k]; sel2.appendChild(o2); }); } }
function _collectBackupData(keys) { var data = {}; keys.forEach(function(k) { var val = DataStore.getAll(k); if (val !== undefined && val !== null) data[k] = val; }); return data; }
function _downloadJSON(data, filename) { var jsonStr = JSON.stringify(data, null, 2); var url = URL.createObjectURL(new Blob([jsonStr], { type: 'application/json' })); var a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); return new Blob([jsonStr]).size; }
function _readBackupFile(fileInput) { return new Promise(function(resolve, reject) { if (!fileInput || !fileInput.files || !fileInput.files[0]) { reject('לא נבחר קובץ'); return; } var reader = new FileReader(); reader.onload = function(e) { try { resolve(JSON.parse(e.target.result)); } catch (err) { reject('קובץ לא תקין: ' + err.message); } }; reader.onerror = function() { reject('שגיאה בקריאת הקובץ'); }; reader.readAsText(fileInput.files[0]); }); }
function _applyBackupData(data, selectedKeys) { var keysToApply = selectedKeys || Object.keys(data).filter(function(k) { return k !== '__backup_meta'; }); var applied = 0; keysToApply.forEach(function(k) { if (k === '__backup_meta') return; if (data[k] === undefined) return; try { DataStore.saveAll(k, data[k]); applied++; } catch(e) { console.error('[Backup] Error restoring table', k, e); } }); return applied; }
function _formatFileSize(bytes) { if (bytes < 1024) return bytes + ' B'; if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'; return (bytes / (1024 * 1024)).toFixed(2) + ' MB'; }
function _getBackupTimestamp() { var now = new Date(); var y = now.getFullYear(), m = String(now.getMonth()+1).padStart(2,'0'), d = String(now.getDate()).padStart(2,'0'); var h = String(now.getHours()).padStart(2,'0'), min = String(now.getMinutes()).padStart(2,'0'); return y + '-' + m + '-' + d + '_' + h + '-' + min; }
function _countRecords(data) { var count = 0; Object.keys(data).forEach(function(k) { if (k === '__backup_meta') return; if (Array.isArray(data[k])) count += data[k].length; else if (typeof data[k] === 'object' && data[k] !== null) count += Object.keys(data[k]).length; else count++; }); return count; }
function backupFull() {
    var btn = document.getElementById('btnBackupFull'); if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-sm" style="display:inline-block;width:14px;height:14px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;animation:spin 0.6s linear infinite;vertical-align:middle;"></span> מכין גיבוי...'; }
    setTimeout(function() {
        try {
            var keys = Object.keys(BACKUP_TABLE_META); var data = _collectBackupData(keys); data.__backup_meta = { type: 'full', timestamp: new Date().toISOString(), version: '2.0', tableCount: keys.length };
            var totalRecords = _countRecords(data); var fileSize = _downloadJSON(data, 'matspanet_backup_' + _getBackupTimestamp() + '.json');
            var settings = DataStore.getSettings(); var ts = settings.backupTimestamps || {}; var now = new Date().toISOString(); keys.forEach(function(k) { ts[k] = now; }); DataStore.updateSettings({ backupTimestamps: ts });
            logActivity('backup_full', 'גיבוי מלא (' + keys.length + ' טבלאות, ' + totalRecords + ' רשומות, ' + _formatFileSize(fileSize) + ')', 'settings');
            showToast('✅ גיבוי מלא הורד בהצלחה — ' + _formatFileSize(fileSize) + ', ' + totalRecords + ' רשומות', 'success'); _updateBackupStatusUI();
        } catch(e) { showToast('שגיאה ביצירת גיבוי: ' + e.message, 'error'); }
        if (btn) { btn.disabled = false; btn.innerHTML = '💾 גיבוי מלא – כל הנתונים'; }
    }, 100);
}
function backupTable(tableKey) {
    var key = tableKey || document.getElementById('fBackupTable').value; if (!key) { showToast('יש לבחר טבלה', 'error'); return; }
    var data = _collectBackupData([key]); data.__backup_meta = { type: 'table', table: key, label: BACKUP_TABLE_META[key] || key, timestamp: new Date().toISOString(), version: '2.0' };
    var count = _countRecords(data); var fileSize = _downloadJSON(data, 'matspanet_' + key + '_' + _getBackupTimestamp() + '.json');
    var settings = DataStore.getSettings(); var ts = settings.backupTimestamps || {}; ts[key] = new Date().toISOString(); DataStore.updateSettings({ backupTimestamps: ts });
    logActivity('backup_table', 'גיבוי טבלה: ' + (BACKUP_TABLE_META[key] || key) + ' (' + count + ' רשומות, ' + _formatFileSize(fileSize) + ')', 'settings');
    showToast('✅ גיבוי טבלה ' + (BACKUP_TABLE_META[key] || key) + ' — ' + _formatFileSize(fileSize) + ', ' + count + ' רשומות', 'success'); _updateBackupStatusUI();
}
function _showSelectiveRestoreModal(data) {
    var meta = data.__backup_meta || {}; var tablesInFile = Object.keys(data).filter(function(k) { return k !== '__backup_meta'; }); var tableCheckboxes = '';
    tablesInFile.forEach(function(k) { var label = BACKUP_TABLE_META[k] || k; var count = Array.isArray(data[k]) ? data[k].length : (typeof data[k] === 'object' && data[k] !== null ? Object.keys(data[k]).length : 1); var isSettings = (k === 'settings'); tableCheckboxes += '<label style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:6px;cursor:pointer;transition:background 0.15s;" onmouseover="this.style.background=\'var(--gray-50)\'" onmouseout="this.style.background=\'transparent\'"><input type="checkbox" class="restore-table-cb" value="' + escAttr(k) + '" checked style="width:16px;height:16px;accent-color:var(--primary-color);"' + (isSettings ? '' : '') + '><span style="flex:1;font-size:13px;font-weight:500;">' + escAttr(label) + '</span><span style="font-size:12px;color:var(--gray-400);background:var(--gray-100);padding:2px 8px;border-radius:10px;">' + count + ' רשומות</span></label>'; });
    var tsFormatted = meta.timestamp ? new Date(meta.timestamp).toLocaleDateString('he-IL') + ' ' + new Date(meta.timestamp).toLocaleTimeString('he-IL', {hour:'2-digit',minute:'2-digit'}) : 'לא ידוע';
    var modalHtml = '<div style="direction:rtl;text-align:right;"><div style="background:var(--gray-50);border:1px solid var(--gray-200);border-radius:8px;padding:12px;margin-bottom:16px;"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;"><div><strong style="font-size:13px;">📅 תאריך גיבוי:</strong> <span style="font-size:13px;">' + tsFormatted + '</span></div><div><strong style="font-size:13px;">📊 טבלאות:</strong> <span style="font-size:13px;">' + tablesInFile.length + '</span></div><div><strong style="font-size:13px;">📦 גרסה:</strong> <span style="font-size:13px;">' + (meta.version || '1.0') + '</span></div></div></div><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;"><span style="font-size:14px;font-weight:600;">בחירת טבלאות לשחזור:</span><label style="display:flex;align-items:center;gap:4px;font-size:12px;color:var(--gray-500);cursor:pointer;"><input type="checkbox" id="restoreSelectAll" checked onchange="document.querySelectorAll(\'.restore-table-cb\').forEach(function(cb){cb.checked=this.checked;});" style="accent-color:var(--primary-color);"> בחר הכל</label></div><div id="restoreTablesList" style="max-height:280px;overflow-y:auto;border:1px solid var(--gray-200);border-radius:8px;padding:6px;margin-bottom:16px;">' + tableCheckboxes + '</div><div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px 14px;margin-bottom:16px;"><p style="margin:0;font-size:13px;color:#991b1b;font-weight:500;">⚠️ אזהרה: הנתונים הנבחרים יוחלפו לחלוטין בנתוני הגיבוי. פעולה זו אינה ניתנת לביטול.</p></div><div id="restoreProgressArea" style="display:none;margin-bottom:16px;"><div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;"><span class="spinner-sm" style="display:inline-block;width:16px;height:16px;border:2px solid var(--primary-color);border-top-color:transparent;border-radius:50%;animation:spin 0.6s linear infinite;flex-shrink:0;"></span><span id="restoreProgressText" style="font-size:13px;color:var(--gray-600);">משחזר נתונים...</span></div><div style="height:6px;background:var(--gray-200);border-radius:3px;overflow:hidden;"><div id="restoreProgressBar" style="height:100%;background:var(--primary-color);border-radius:3px;width:0%;transition:width 0.3s ease;"></div></div></div></div>';
    showModal('🔄 שחזור מגיבוי', modalHtml, '<button class="btn btn-primary" id="btnDoRestore" onclick="App._executeSelectiveRestore()">🔄 בצע שחזור</button><button class="btn btn-outline" onclick="App.closeModal()" style="margin-right:8px;">ביטול</button>');
    App._pendingRestoreData = data;
}
function _executeSelectiveRestore() {
    var data = App._pendingRestoreData; if (!data) return;
    var checkboxes = document.querySelectorAll('.restore-table-cb:checked'); var selectedKeys = []; checkboxes.forEach(function(cb) { selectedKeys.push(cb.value); });
    if (selectedKeys.length === 0) { showToast('יש לבחר לפחות טבלה אחת', 'warning'); return; }
    var btn = document.getElementById('btnDoRestore'); if (btn) { btn.disabled = true; btn.textContent = 'משחזר...'; }
    var progressArea = document.getElementById('restoreProgressArea'); var progressBar = document.getElementById('restoreProgressBar'); var progressText = document.getElementById('restoreProgressText');
    if (progressArea) progressArea.style.display = 'block';
    var applied = 0; var total = selectedKeys.length;
    function processNext() {
        if (applied >= total) {
            if (progressBar) progressBar.style.width = '100%'; if (progressText) progressText.textContent = 'הושלם! ' + total + ' טבלאות שוחזרו בהצלחה.';
            logActivity('restore_full', 'שחזור סלקטיבי (' + total + ' טבלאות)', 'settings'); showToast('✅ שחזור הושלם — ' + total + ' טבלאות שוחזרו בהצלחה. מרענן...', 'success'); setTimeout(function() { window.location.reload(); }, 2000); return;
        }
        var key = selectedKeys[applied]; if (progressText) progressText.textContent = 'משחזר: ' + (BACKUP_TABLE_META[key] || key) + ' (' + (applied + 1) + '/' + total + ')';
        if (progressBar) progressBar.style.width = Math.round(((applied + 1) / total) * 100) + '%';
        try { DataStore.saveAll(key, data[key]); } catch(e) { console.error('[Restore] Error restoring', key, e); }
        applied++; setTimeout(processNext, 80);
    }
    setTimeout(processNext, 100);
}
async function restoreFull() {
    var fileInput = document.getElementById('fRestoreFullFile');
    try {
        var data = await _readBackupFile(fileInput); if (!data.__backup_meta) { showToast('❌ קובץ הגיבוי אינו תקין – חסר metadata', 'error'); return; }
        var tablesInFile = Object.keys(data).filter(function(k) { return k !== '__backup_meta'; });
        confirmDialog('⚠️ שחזור מלא של ' + tablesInFile.length + ' טבלאות\nהנתונים הקיימים יוחלפו לחלוטין. להמשיך?', function() {
            var applied = 0; tablesInFile.forEach(function(k) { try { DataStore.saveAll(k, data[k]); applied++; } catch(e) { console.error('[Restore] Error restoring', k, e); } });
            logActivity('restore_full', 'שחזור מלא (' + applied + ' טבלאות)', 'settings'); showToast('✅ שחזור מלא הושלם — ' + applied + ' טבלאות שוחזרו בהצלחה. מרענן...', 'success'); 
			// 🔑 שמירת הטאב הפעיל לפני רענון
			try {
				sessionStorage.setItem('matspanet_last_section', currentSection);
				if (typeof window._activeLookupTabIndex !== 'undefined') {
					sessionStorage.setItem('matspanet_last_lookup_tab', window._activeLookupTabIndex);
				} else if (typeof _activeLookupTabIndex !== 'undefined') {
					sessionStorage.setItem('matspanet_last_lookup_tab', _activeLookupTabIndex);
				}
			} catch(e) {}
			setTimeout(function() { window.location.reload(); }, 1500);
        }); fileInput.value = '';
    } catch (err) { showToast('❌ ' + err, 'error'); }
}
async function restoreTable() {
    var fileInput = document.getElementById('fRestoreTableFile'); var tableKey = document.getElementById('fRestoreTable').value; if (!tableKey) { showToast('יש לבחר טבלה לשחזור', 'error'); return; }
    try {
        var data = await _readBackupFile(fileInput); if (!data[tableKey] && !data.__backup_meta) { showToast('❌ הטבלה ' + (BACKUP_TABLE_META[tableKey] || tableKey) + ' לא נמצאה בקובץ הגיבוי', 'error'); return; }
        var count = Array.isArray(data[tableKey]) ? data[tableKey].length : (typeof data[tableKey] === 'object' ? Object.keys(data[tableKey]).length : 1);
        confirmDialog('⚠️ שחזור טבלה ' + (BACKUP_TABLE_META[tableKey] || tableKey) + ' (' + count + ' רשומות)\nהנתונים הקיימים בטבלה זו יוחלפו. להמשיך?', function() {
            if (data[tableKey] !== undefined) DataStore.saveAll(tableKey, data[tableKey]);
            logActivity('restore_table', 'שחזור טבלה: ' + (BACKUP_TABLE_META[tableKey] || tableKey) + ' (' + count + ' רשומות)', 'settings'); showToast('✅ שחזור טבלה ' + (BACKUP_TABLE_META[tableKey] || tableKey) + ' בוצע בהצלחה. מרענן...', 'success'); fileInput.value = ''; 
		// 🔑 שמירת הטאב הפעיל לפני רענון
		try {
			sessionStorage.setItem('matspanet_last_section', currentSection);
			if (typeof window._activeLookupTabIndex !== 'undefined') {
				sessionStorage.setItem('matspanet_last_lookup_tab', window._activeLookupTabIndex);
			} else if (typeof _activeLookupTabIndex !== 'undefined') {
				sessionStorage.setItem('matspanet_last_lookup_tab', _activeLookupTabIndex);
			}
		} catch(e) {}			
			setTimeout(function() { window.location.reload(); }, 1500);
        });
    } catch (err) { showToast('❌ ' + err, 'error'); }
}
function clearData() {
    const TABLES_TO_CLEAR = ['inspectors', 'pedagogical_executors', 'schools', 'lookup_solution_status', 'lookup_education_stages', 'lookup_education_types', 'lookup_week_days', 'lookup_meeting_types', 'lookup_budget_types', 'lookup_field_knowledge', 'lookup_allocation_status', 'lookup_performer_types', 'lookup_lecturer_status', 'lookup_certified_lecturer', 'lookup_expert_field', 'lookup_domains', 'lookup_role_holders', 'lookup_broad_topics', 'lookup_designated_programs', 'lookup_responsibility_types', 'solutions', 'solution_instructors', 'solution_comments', 'catalog_items', 'catalog_entries', 'mentors', 'guides_repo', 'faq_data', 'custom_pages', 'categories', 'budgets', 'periods', 'registrations', 'activity_log', 'recycle_bin', 'settings', 'homepage', 'institutions', 'institutions_east_jerusalem'];
    showModal('⚠️ מחיקת כל הנתונים', '<div style="text-align:center;padding:12px 0;"><div style="font-size:48px;margin-bottom:12px;">⚠️</div><p style="color:var(--danger);font-weight:600;font-size:15px;margin-bottom:8px;">פעולה בלתי הפיכה!</p><p style="color:var(--gray-500);margin-bottom:16px;font-size:13px;">פעולה זו תמחק את כל הנתונים מהמערכת לצמיתות, כולל:</p><div style="text-align:right;background:var(--gray-50);padding:12px;border-radius:8px;font-size:12px;color:var(--gray-600);max-height:200px;overflow-y:auto;"><strong>📋 רשימת הטבלאות שימחקו (' + TABLES_TO_CLEAR.length + '):</strong><br>• טבלאות ערכים (מפקחים, מבצעים, בתי ספר, שלבים, סוגים, ימים, מפגשים, סוגי תקציב, תחומי דעת, תקצוב, סטטוסים, מרצים, מומחים, תחומי דעת, בעלי תפקידים, נושאי רוחב, תוכניות ייעודיות, סוגי אחריות)<br>• קטלוג פתרונות למידה (כולל מדריכים והערות)<br>• מאגר מרצים<br>• מאגר מדריכים<br>• שאלות נפוצות ותשובות<br>• דפים מותאמים אישית<br>• משתמשים רשומים<br>• תקציבים ותקופות<br>• נרשמים לפתרונות<br>• יומן פעילות והיסטוריה<br>• סל מחזור</div><div class="form-group" style="margin-top:16px;"><label>הזן סיסמת אישור</label><input type="password" id="fClearPass" class="form-input" placeholder="סיסמת אישור" style="text-align:center;font-size:16px;"></div></div>', '<button class="btn btn-danger" onclick="App._doClearAll()">🗑️ אישור מחיקה</button><button class="btn btn-outline" onclick="App.closeModal()">ביטול</button>');
    setTimeout(function() { var el = document.getElementById('fClearPass'); if (el) el.focus(); }, 100);
}
function _doClearAll() {
    var pass = document.getElementById('fClearPass').value; if (pass !== 'Adan.3011$') { showToast('סיסמת אישור שגויה!', 'error'); return; }
    closeModal();
    confirmDialog('⚠️ למחוק את כל הנתונים לצמיתות? פעולה זו בלתי הפיכה!', function() {
        const TABLES_TO_CLEAR = ['inspectors', 'pedagogical_executors', 'schools', 'lookup_solution_status', 'lookup_education_stages', 'lookup_education_types', 'lookup_week_days', 'lookup_meeting_types', 'lookup_budget_types', 'lookup_field_knowledge', 'lookup_allocation_status', 'lookup_performer_types', 'lookup_lecturer_status', 'lookup_certified_lecturer', 'lookup_expert_field', 'lookup_domains', 'lookup_role_holders', 'lookup_broad_topics', 'lookup_designated_programs', 'lookup_responsibility_types', 'lookup_user_roles', 'lookup_schools', 'solutions', 'solution_instructors', 'solution_comments', 'catalog_items', 'catalog_entries', 'mentors', 'guides_repo', 'faq_data', 'custom_pages', 'categories', 'budgets', 'periods', 'registrations', 'activity_log', 'recycle_bin', 'settings', 'homepage', 'institutions', 'institutions_east_jerusalem'];
        let totalDeleted = 0;
        TABLES_TO_CLEAR.forEach(function(key) { var storeKey = 'matspanet_' + key; var data = localStorage.getItem(storeKey); if (data) { try { var parsed = JSON.parse(data); var count = Array.isArray(parsed) ? parsed.length : (typeof parsed === 'object' && parsed !== null ? Object.keys(parsed).length : 0); totalDeleted += count; } catch(e) { totalDeleted += 0; } localStorage.removeItem(storeKey); } });
        TABLES_TO_CLEAR.forEach(function(key) { try { DataStore.saveAll(key, []); } catch(e) { } });
        try {
            var usersData = localStorage.getItem('matspanet_users');
            if (usersData) {
                try {
                    var users = JSON.parse(usersData); var adminUser = users.find(function(u) { return u.username === 'admin'; });
                    if (!adminUser) { adminUser = { id: 'usr_admin_001', username: 'admin', password: 'admin123', fullName: 'מנהל מערכת', email: 'admin@matspanet.co.il', role: 'system_admin', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; }
                    DataStore.saveAll('users', [adminUser]); totalDeleted += (users.length - 1);
                } catch(e) { DataStore.saveAll('users', [{ id: 'usr_admin_001', username: 'admin', password: 'admin123', fullName: 'מנהל מערכת', email: 'admin@matspanet.co.il', role: 'system_admin', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }]); }
            }
        } catch(e) { }
        logActivity('clear_all', 'נקה הכל - נמחקו ' + totalDeleted + ' רשומות מ-' + (TABLES_TO_CLEAR.length + 1) + ' טבלאות', 'settings');
        showToast('הכל נמחק! ' + totalDeleted + ' רשומות נמחקו. משתמש admin נשמר. מרענן...', 'success'); 
		// 🔑 שמירת הטאב הפעיל לפני רענון
		try {
			sessionStorage.setItem('matspanet_last_section', currentSection);
			if (typeof window._activeLookupTabIndex !== 'undefined') {
				sessionStorage.setItem('matspanet_last_lookup_tab', window._activeLookupTabIndex);
			} else if (typeof _activeLookupTabIndex !== 'undefined') {
				sessionStorage.setItem('matspanet_last_lookup_tab', _activeLookupTabIndex);
			}
		} catch(e) {}	
		
		setTimeout(function() { window.location.reload(); }, 1500);
    });
}
function resetUserPassword(id) {
    confirmDialog('לאפס את סיסמת המשתמש ל-1234?', function() {
        const result = DataStore.update(DataStore.KEYS.USERS, id, { password: '1234' });
        if (result) { showToast('הסיסמה אופסה בהצלחה ל-1234', 'success'); renderGuides(); } else { showToast('שגיאה: המשתמש לא נמצא', 'error'); }
    });
}

// ================================================================
//  CUSTOM PAGES
// ================================================================
var _cpEditorInit = false; var _cpCurrentEditId = null;
function _cpEsc(s) { if (!s) return ''; var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function _cpLang() { return (DataStore.getSettings() || {}).language || document.documentElement.lang || 'ar'; }
function _cpSanitizeHtml(html) { if (!html) return ''; html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ''); html = html.replace(/\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, ''); html = html.replace(/href\s*=\s*("')javascript:[^"']*\1/gi, 'href="#"'); return html; }
function _cpGetPageUrl(filename) { return './pages/' + filename + '.html'; }
function _cpUpdateHomepageMenu(pageData, oldMenuLocation) {
    if (oldMenuLocation && oldMenuLocation !== 'none') { var hp = DataStore.getHomepage(); var key = oldMenuLocation === 'top' ? 'navItems' : 'sidebarItems'; var items = (hp[key] || []).filter(function(i) { return i._cpPageId !== pageData.id; }); var updates = {}; updates[key] = items; DataStore.updateHomepage(updates); }
    if (pageData.menuLocation && pageData.menuLocation !== 'none') {
        var hp = DataStore.getHomepage(); var key = pageData.menuLocation === 'top' ? 'navItems' : 'sidebarItems'; var items = (hp[key] || []).slice();
        var exists = items.find(function(i) { return i._cpPageId === pageData.id; });
        if (!exists) { var maxOrder = items.reduce(function(max, i) { return Math.max(max, i.order || 0); }, 0); items.push({ id: 'cpnav_' + pageData.id, _cpPageId: pageData.id, labelHe: pageData.menuLabelHe || pageData.titleHe || pageData.filename, labelAr: pageData.menuLabelAr || pageData.titleAr || pageData.filename, url: _cpGetPageUrl(pageData.filename), order: maxOrder + 1, isActive: true }); var updates = {}; updates[key] = items; DataStore.updateHomepage(updates); }
    }
}
function _cpRemoveHomepageMenu(pageId) {
    var hp = DataStore.getHomepage(); var navItems = (hp.navItems || []).filter(function(i) { return i._cpPageId !== pageId; }); var sideItems = (hp.sidebarItems || []).filter(function(i) { return i._cpPageId !== pageId; });
    if (navItems.length !== (hp.navItems || []).length || sideItems.length !== (hp.sidebarItems || []).length) DataStore.updateHomepage({ navItems: navItems, sidebarItems: sideItems });
}
function renderCustomPages() {
    var items = (DataStore.getAll(DataStore.KEYS.CUSTOM_PAGES) || []).slice().sort(function(a,b) { return (b.updatedAt || '').localeCompare(a.updatedAt || ''); });
    var btnNew = '➕ צור דף חדש'; var colName = 'שם הדף'; var colFilename = 'שם קובץ'; var colStatus = 'סטטוס'; var colMenu = 'תפריט'; var colDate = 'תאריך עדכון'; var colActions = 'פעולות';
    var emptyTitle = 'אין דפים'; var emptySub = 'צור את הדף הראשון שלך'; var emptyBtn = '➕ צור דף חדש'; var headerLabel = 'יצירת דף חדש';
    var html = _lookupTableHeader(headerLabel, items.length, '📄', '<button class="btn btn-sm" style="background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.3);color:#fff;font-weight:700;" onclick="App.openCustomPageModal()">' + btnNew + '</button>');
    if (!items.length) { html += '<div class="cp-empty"><div class="cp-empty-icon">📄</div><h3>' + emptyTitle + '</h3><p>' + emptySub + '</p><button class="btn btn-primary" style="margin-top:20px;" onclick="App.openCustomPageModal()">' + emptyBtn + '</button></div>'; }
    else {
        html += '<div class="table-wrapper"><table class="data-table"><thead><tr><th>' + colName + '</th><th>' + colFilename + '</th><th>' + colStatus + '</th><th>' + colMenu + '</th><th>' + colDate + '</th><th>' + colActions + '</th></tr></thead><tbody>';
        items.forEach(function(p) {
            var statusClass = p.status === 'published' ? 'cp-status-published' : 'cp-status-draft'; var statusText = p.status === 'published' ? 'מפורסם' : 'טיוטה';
            var menuLoc = p.menuLocation || 'none'; var menuBadge = menuLoc === 'top' ? '<span class="cp-status-badge cp-status-published">עליון</span>' : menuLoc === 'sidebar' ? '<span class="cp-status-badge" style="background:#eff6ff;color:#2563eb;">צדדי</span>' : '<span class="cp-status-badge cp-status-draft">ללא</span>';
            var dateStr = p.updatedAt ? new Date(p.updatedAt).toLocaleDateString('he-IL') : '-';
            var editBtn = '✏️ עריכה'; var deleteBtn = '🗑️ מחיקה'; var previewBtn = '👁️ תצוגה'; var linkBtn = '🔗 קישור';
            var displayTitle = p.titleHe || p.titleAr || ''; var secondaryTitle = p.titleAr && p.titleHe ? '<br><span style="color:var(--gray-400);font-size:13px;">' + _cpEsc(p.titleAr) + '</span>' : '';
            html += '<tr><td><strong>' + _cpEsc(displayTitle) + '</strong>' + secondaryTitle + '</td><td style="direction:ltr;unicode-bidi:embed;font-family:monospace;font-size:13px;">' + _cpEsc(p.filename) + '</td><td><span class="cp-status-badge ' + statusClass + '">' + statusText + '</span></td><td>' + menuBadge + '</td><td style="font-size:13px;color:var(--gray-500);">' + dateStr + '</td><td><div class="cp-table-actions"><button class="btn btn-outline btn-sm" onclick="App.editCustomPage(\'' + p.id + '\')">' + editBtn + '</button><button class="btn btn-outline btn-sm" onclick="App.previewCustomPage(\'' + p.id + '\')">' + previewBtn + '</button><button class="btn btn-outline btn-sm" onclick="App._openPageLink(\'' + p.filename + '\')" title="פתח את הדף">' + linkBtn + '</button><button class="btn btn-outline btn-sm" onclick="App.deleteCustomPage(\'' + p.id + '\')" style="color:var(--danger, #e53e3e);">' + deleteBtn + '</button></div></td></tr>';
        });
        html += '</tbody></table></div>';
    }
    document.getElementById('section-custom-pages').innerHTML = html;
}
function _cpInitEditor() {
    if (typeof tinymce === 'undefined') return;
    if (!_cpEditorInit) {
        tinymce.init({ selector: '#cpEditor', readonly: false, statistics: false, height: 420, directionality: 'rtl', menubar: 'file edit view insert format table tools', plugins: 'advlist autolink lists link image charmap print preview anchor searchreplace visualblocks code fullscreen insertdatetime media table paste wordcount help', toolbar: 'undo redo | bold italic underline strikethrough | fontfamily fontsize | forecolor backcolor | alignleft aligncenter alignright justify | bullist numlist | outdent indent | table | link image | hr | removeformat | help', content_style: 'body { font-family: Noto Sans Hebrew, Tajawal, sans-serif; font-size: 15px; line-height: 1.8; padding: 16px; direction: rtl; } img { max-width: 100%; height: auto; } table { border-collapse: collapse; width: 100%; } td, th { border: 1px solid #ddd; padding: 8px; }', branding: false, promotion: false, resize: true, statusbar: true, paste_data_images: true });
        _cpEditorInit = true;
    }
}

function openCustomPageModal(editId) {
    _cpCurrentEditId = editId || null;
    var title = editId ? 'עריכת דף' : 'יצירת דף חדש';
    
    var existing = editId ? (DataStore.getAll(DataStore.KEYS.CUSTOM_PAGES) || []).find(function(p) { return p.id === editId; }) : null;
    var valFilename = existing ? _cpEsc(existing.filename) : '';
    var valTitleHe = existing ? _cpEsc(existing.titleHe || '') : '';
    var valTitleAr = existing ? _cpEsc(existing.titleAr || '') : '';
    var valStatus = existing ? existing.status : 'draft';
    var valMenuLoc = existing ? (existing.menuLocation || 'none') : 'none';
    var valMenuLabelHe = existing ? _cpEsc(existing.menuLabelHe || '') : '';
    var valMenuLabelAr = existing ? _cpEsc(existing.menuLabelAr || '') : '';
    var disabledAttr = existing ? 'disabled style="opacity:0.6;cursor:not-allowed;"' : '';
    
    var statusOpts = (valStatus === 'published' ? '<option value="published" selected>מפורסם</option><option value="draft">טיוטה</option>' : '<option value="draft" selected>טיוטה</option><option value="published">מפורסם</option>');
    var menuLocOpts = '<option value="none"' + (valMenuLoc === 'none' ? ' selected' : '') + '>ללא קישור</option><option value="top"' + (valMenuLoc === 'top' ? ' selected' : '') + '>תפריט עליון</option><option value="sidebar"' + (valMenuLoc === 'sidebar' ? ' selected' : '') + '>תפריט צדדי</option>';
    var menuLabelsStyle = valMenuLoc !== 'none' ? 'display:flex;' : 'display:none;';
    
    var bodyHtml = '<div class="cp-editor-wrap">' +
        '<div class="cp-field-row"><div class="cp-field-group"><label>שם קובץ (באנגלית) *</label><input type="text" id="cpFilename" placeholder="about-us" value="' + valFilename + '" ' + disabledAttr + ' pattern="^[a-z0-9][a-z0-9-]*$"></div>' +
        '<div class="cp-field-group" style="max-width:180px;"><label>סטטוס</label><select id="cpStatus">' + statusOpts + '</select></div></div>' +
        '<div class="cp-field-row"><div class="cp-field-group"><label>כותרת הדף (בעברית) *</label><input type="text" id="cpTitleHe" placeholder="כותרת בעברית" value="' + valTitleHe + '"></div>' +
        '<div class="cp-field-group"><label>כותרת הדף (בערבית) *</label><input type="text" id="cpTitleAr" placeholder="عنوان بالعربية" value="' + valTitleAr + '" dir="rtl"></div></div>' +
        '<div class="cp-field-row"><div class="cp-field-group" style="max-width:260px;"><label>מיקום קישור בתפריט</label><select id="cpMenuLocation" onchange="App._cpOnMenuLocChange()">' + menuLocOpts + '</select></div></div>' +
        '<div class="cp-field-row" id="cpMenuLabelsRow" style="' + menuLabelsStyle + '"><div class="cp-field-group"><label>טקסט תפריט (בעברית)</label><input type="text" id="cpMenuLabelHe" placeholder="הטקסט בעברית" value="' + valMenuLabelHe + '"></div>' +
        '<div class="cp-field-group"><label>טקסט תפריט (בערבית)</label><input type="text" id="cpMenuLabelAr" placeholder="הטקסט בערבית" value="' + valMenuLabelAr + '" dir="rtl"></div></div>' +
        '<div class="cp-field-group" style="margin-bottom:10px;flex:none;"><label>תוכן הדף</label></div>' +
        '<div class="cp-editor-container"><textarea id="cpEditor">' + (existing ? existing.content : '') + '</textarea></div>' +
        '<div class="cp-editor-actions"><button class="btn btn-outline btn-sm" onclick="App.previewCustomPage()" type="button">👁️ תצוגה מקדימה</button></div>' +
        '</div>';
        
    var footerHtml = '<button class="btn btn-ghost" onclick="App.closeModal()" type="button">❌ ביטול</button><button class="btn btn-primary" onclick="App.saveCustomPage()" type="button">💾 שמור</button>';
    
    showModal(title, bodyHtml, footerHtml);
    var modalEl = document.querySelector('#modalOverlay .modal');
    if (modalEl) modalEl.style.maxWidth = '960px';
    
    // 🔑 אתחול TinyMCE בצורה חסינה ואמינה
    setTimeout(function() { 
        if (typeof tinymce !== 'undefined') {
            tinymce.remove('#cpEditor');
            tinymce.baseURL = "./tinymce"; // הנתיב המקומי
            
            tinymce.init({
                selector: '#cpEditor',
                language: 'he',
                height: 450,
                menubar: 'file edit view insert format tools table help',
                plugins: 'advlist autolink lists link image charmap preview anchor searchreplace visualblocks code fullscreen insertdatetime media table paste code help wordcount directionality',
                toolbar: 'undo redo | formatselect | bold italic underline strikethrough | forecolor backcolor | alignright aligncenter alignleft | bullist numlist outdent indent | link image media table | removeformat code',
                content_style: 'body { font-family: \'Noto Sans Arabic\', \'Tajawal\', Arial, sans-serif; font-size: 16px; direction: rtl; text-align: right; line-height: 1.8; color: #333; }',
                setup: function (editor) {
                    editor.on('change', function () {
                        editor.save(); // שמירה אוטומטית ל-textarea
                    });
                }
            });
        } else {
            console.error('❌ TinyMCE לא נטען! ודא שהסקריפט כלול ב-dashboard.html');
        }
    }, 400);
}

function _cpOnMenuLocChange() { var sel = document.getElementById('cpMenuLocation'); var row = document.getElementById('cpMenuLabelsRow'); if (sel && row) { row.style.display = sel.value !== 'none' ? 'flex' : 'none'; } }
function editCustomPage(id) { openCustomPageModal(id); }

function saveCustomPage() {
    // 1. שמירת תוכן העורך לפני השליפה
    if (typeof tinymce !== 'undefined') { 
        var editor = tinymce.get('cpEditor'); 
        if (editor) editor.save(); 
    }
    
    // 2. איסוף נתונים
    var filename = document.getElementById('cpFilename').value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    var titleHe = document.getElementById('cpTitleHe').value.trim(); 
    var titleAr = document.getElementById('cpTitleAr').value.trim();	
    var status = document.getElementById('cpStatus').value; 
    var menuLocation = document.getElementById('cpMenuLocation').value;
    var menuLabelHe = document.getElementById('cpMenuLabelHe').value.trim(); 
    var menuLabelAr = document.getElementById('cpMenuLabelAr').value.trim();
    var content = document.getElementById('cpEditor').value; // לוקח את התוכן מעורך ה-TinyMCE
    
    // 3. בדיקות תקינות
    if (!filename) { showToast('חובה להזין שם קובץ', 'error'); return; }
    if (!titleHe && !titleAr) { showToast('חובה להזין כותרת', 'error'); return; }
    
    var pages = DataStore.getAll(DataStore.KEYS.CUSTOM_PAGES) || []; 
    var dup = pages.find(function(p) { return p.filename === filename && p.id !== _cpCurrentEditId; });
    if (dup) { showToast('שם קובץ כבר קיים', 'error'); return; }
    
    content = _cpSanitizeHtml(content); 
    var now = new Date().toISOString();
    
    var pageData = { 
        filename: filename, titleHe: titleHe, titleAr: titleAr, status: status, 
        content: content, menuLocation: menuLocation, menuLabelHe: menuLabelHe, 
        menuLabelAr: menuLabelAr, updatedAt: now 
    };
    
    var oldMenuLocation = null; 
    var savedPageId = _cpCurrentEditId;
    
    // 4. שמירה ל-DataStore
    if (_cpCurrentEditId) { 
        var oldPage = pages.find(function(p) { return p.id === _cpCurrentEditId; }); 
        oldMenuLocation = oldPage ? (oldPage.menuLocation || 'none') : null; 
        DataStore.update(DataStore.KEYS.CUSTOM_PAGES, _cpCurrentEditId, pageData); 
        showToast('הדף עודכן בהצלחה', 'success'); 
    } else { 
        var newItem = DataStore.create(DataStore.KEYS.CUSTOM_PAGES, pageData); 
        savedPageId = newItem.id; 
        showToast('הדף נוצר בהצלחה', 'success'); 
    }
    
    _cpUpdateHomepageMenu({ id: savedPageId, filename: filename, titleHe: titleHe, titleAr: titleAr, menuLocation: menuLocation, menuLabelHe: menuLabelHe, menuLabelAr: menuLabelAr }, oldMenuLocation);
    
    // 5. שליחה לשרת ליצירת הקובץ העצמאי
    try { 
        fetch('./api/create-page-file.php', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ 
                filename: filename + '.html', 
                title: titleAr || titleHe, 
                content: content 
            }) 
        }).then(function(r) { 
            if (!r.ok) {
                return r.text().then(function(txt) { showToast('⚠️ שגיאת שרת (' + r.status + '): ' + txt, 'error'); }); 
            }
            return r.json(); 
        }).then(function(data) { 
            if (data && !data.success) { 
                console.error('Failed to create page file:', data.error); 
                showToast('⚠️ שגיאה ביצירת קובץ HTML: ' + data.error, 'warning'); 
            } else {
                console.log('✅ קובץ HTML עצמאי נוצר בהצלחה:', filename + '.html');
            }
        }).catch(function(e) { 
            console.error('Error creating page file:', e); 
            showToast('⚠️ כשל בתקשורת עם השרת: ' + e.message, 'error'); 
        }); 
    } catch(e) { 
        console.error('Error creating page file:', e); 
    }
    
    // 6. ניקוי וסגירה
    if (typeof tinymce !== 'undefined') { 
        var editor = tinymce.get('cpEditor'); 
        if (editor) { editor.destroy(); } 
    }
    var modalEl = document.querySelector('#modalOverlay .modal'); 
    if (modalEl) modalEl.style.maxWidth = '';
    
    closeModal(); 
    renderCustomPages();
}

function deleteCustomPage(id) {
    confirmDialog('⚠️ האם למחוק דף זה?', function() {
        var pages = DataStore.getAll(DataStore.KEYS.CUSTOM_PAGES) || []; var page = pages.find(function(p) { return p.id === id; });
        DataStore.remove(DataStore.KEYS.CUSTOM_PAGES, id); _cpRemoveHomepageMenu(id);
        if (page && page.filename) { try { fetch('./api/create-page-file.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename: page.filename, action: 'delete' }) }).catch(function() { }); } catch(e) { } }
        showToast('הדף נמחק', 'success'); renderCustomPages();
    });
}
function previewCustomPage(id, fromModal) {
    var pages = DataStore.getAll(DataStore.KEYS.CUSTOM_PAGES) || []; var page = id ? pages.find(function(p) { return p.id === id; }) : null; var previewData = null;
    if (fromModal && !page) { if (typeof tinymce !== 'undefined') { var editor = tinymce.get('cpEditor'); if (editor) editor.save(); } previewData = { filename: (document.getElementById('cpFilename').value || '').trim() || 'preview', titleHe: (document.getElementById('cpTitleHe').value || '').trim(), titleAr: (document.getElementById('cpTitleAr').value || '').trim(), content: _cpSanitizeHtml(document.getElementById('cpEditor').value) }; }
    var data = page || previewData; if (!data) return;
    var title = _cpLang() === 'ar' ? 'معاينة' : 'תצוגה מקדימה'; var closeBtn = _cpLang() === 'ar' ? '❌ إغلاق' : '❌ סגור';
    var displayTitle = (_cpLang() === 'ar' && data.titleAr) ? data.titleAr : (data.titleHe || data.titleAr || '');
    var bodyHtml = '<div style="direction:rtl;text-align:right;"><h2 style="font-size:22px;font-weight:800;margin-bottom:8px;">' + _cpEsc(displayTitle) + '</h2><div style="border-top:2px solid var(--gray-200);padding-top:16px;line-height:1.9;">' + data.content + '</div></div>';
    showModal(title, bodyHtml, '<button class="btn btn-ghost" onclick="App.closeModal()" type="button">' + closeBtn + '</button>');
}
function _openPageLink(filename) { var url = _cpGetPageUrl(filename); window.open(url, '_blank'); }
function _copyPageLink(filename) {
    var link = _cpGetPageUrl(filename);
    if (navigator.clipboard) { navigator.clipboard.writeText(link).then(function() { showToast(_cpLang() === 'ar' ? 'تم نسخ الرابط' : 'הקישור הועתק', 'success'); }).catch(function() { _cpFallbackCopy(link); }); }
    else { _cpFallbackCopy(link); }
}
function _cpFallbackCopy(text) {
    var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); showToast(_cpLang() === 'ar' ? 'تم نسخ الرابط' : 'הקישור הועתק', 'success'); } catch(e) { showToast(_cpLang() === 'ar' ? 'فشل نسخ الرابط' : 'העתקת הקישור נכשלה', 'error'); }
    document.body.removeChild(ta);
}

function clearActivityLog() {
    if (confirm('למחוק את כל יומן הפעילות?')) { DataStore.saveAll(DataStore.KEYS.ACTIVITY_LOG, []); renderActivityLog(); showToast('יומן הפעילות נמחק', 'success'); }
}
function resetLocalStorage() {
    if (confirm('⚠️ פעולה זו תמחק את כל הנתונים מהדפדפן (localStorage).\nהנתונים שנשמרו בשרת יישארו.\nלהמשיך?')) {
        Object.keys(localStorage).filter(function(k) { return k.startsWith('matspanet_'); }).forEach(function(k) { localStorage.removeItem(k); });
        showToast('✅ localStorage נוקה, מרענן...', 'success'); 
		// 🔑 שמירת הטאב הפעיל לפני רענון
		try {
			sessionStorage.setItem('matspanet_last_section', currentSection);
			if (typeof window._activeLookupTabIndex !== 'undefined') {
				sessionStorage.setItem('matspanet_last_lookup_tab', window._activeLookupTabIndex);
			} else if (typeof _activeLookupTabIndex !== 'undefined') {
				sessionStorage.setItem('matspanet_last_lookup_tab', _activeLookupTabIndex);
			}
		} catch(e) {}
		setTimeout(function() { location.reload(); }, 1000);
    }
}


    // ==========================================
    // ניהול הזמנת סדנאות בפסגה - ממשק הגדרות למנהל
    // ==========================================
	async function renderWorkshopBookings() {
		const container = document.getElementById('section-workshop-bookings');
		if (!container) return;
		const activeTab = window._workshopActiveTab || 'settings';
		
		// הצגת חיווי טעינה
		container.innerHTML = `
			<div class="card">
				<div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
					<h3 class="card-title">🏔️ ניהול הזמנת סדנאות בפסגה</h3>
					<div style="display:flex; gap:8px;">
						<button class="btn ${activeTab === 'settings' ? 'btn-primary' : 'btn-outline'}" onclick="App._switchWorkshopTab('settings')">⚙️ הגדרות ותפעול</button>
						<button class="btn ${activeTab === 'bookings' ? 'btn-primary' : 'btn-outline'}" onclick="App._switchWorkshopTab('bookings')">📋 הזמנות שהתקבלו</button>
					</div>
				</div>
				<div class="card-body">
					<div id="workshopTabContent">
						<div style="text-align:center; padding:40px; color:var(--gray-500);">
							<div style="font-size:32px; margin-bottom:10px;">⏳</div>
							<p>טוען נתונים מהשרת...</p>
						</div>
					</div>
				</div>
			</div>
		`;

		if (activeTab === 'settings') {
			_renderWorkshopSettingsTab();
		} else {
			// 🔑 קריטי: משיכת הנתונים הטריים מהשרת לפני הצגת הטבלה
			try {
				const response = await fetch('./data/workshop_bookings.json?t=' + Date.now());
				if (response.ok) {
					const bookings = await response.json();
					if (Array.isArray(bookings)) {
						// עדכון ה-DataStore עם הנתונים מהשרת (עוקף את ה-localStorage הישן)
						DataStore.saveAll(DataStore.KEYS.WORKSHOP_BOOKINGS, bookings);
						console.log('✅ נטענו ' + bookings.length + ' הזמנות מהשרת לטאב הזמנות בפסגה');
					}
				}
			} catch (e) {
				console.warn('⚠️ לא ניתן לטעון הזמנות מהשרת:', e);
			}
			_renderWorkshopBookingsTab();
		}
	}

	function _switchWorkshopTab(tab) {
		window._workshopActiveTab = tab;
		renderWorkshopBookings();
	}

	function _renderWorkshopSettingsTab() {
		const settings = (DataStore.getAll(DataStore.KEYS.WORKSHOP_SETTINGS) || [])[0] || {};
		const labels = settings.labels || {};
		const workshops = settings.workshops || [];
		const allowedDays = settings.allowedDays || [];
		const responsible = settings.responsible || {};
		const introText = settings.introText || '';

		// 1. שליפת נתונים מ- guides_repo (מאגר מדריכים)
		const guides = DataStore.getAll(DataStore.KEYS.GUIDES_REPO) || [];
		
		// 2. שליפת נתונים מ- lookup_week_days (ימי שבוע)
		const weekDays = DataStore.getAll(DataStore.KEYS.LOOKUP_WEEK_DAYS) || [];

		const getLabel = (key, defHe, defAr) => ({ he: labels[key]?.he || defHe, ar: labels[key]?.ar || defAr });
		const lblInst = getLabel('institutionCode', 'קוד מוסד', 'رمز المؤسسة');
		const lblContact = getLabel('contactPerson', 'שם איש קשר', 'اسم شخص الاتصال');
		const lblMobile = getLabel('mobile', 'מספר נייד', 'رقم الهاتف المحمول');
		const lblEmail = getLabel('email', 'דוא"ל', 'البريد الإلكتروني');
		const lblDate = getLabel('meetingDate', 'תאריך המפגש', 'تاريخ اللقاء');
		const lblTime = getLabel('meetingTime', 'שעת המפגש', 'وقت اللقاء');
		const lblWorkshop = getLabel('workshopName', 'שם הסדנה', 'اسم الورشة');
		const lblNotes = getLabel('notes', 'הערות', 'ملاحظات');
		const lblParticipants = getLabel('participants', 'מספר משתתפים', 'عدد المشاركين');

		// בניית אופציות למדריכים (מיפוי מדויק: fullNameAr, phone, email)
		// בניית אופציות למדריכים (מיפוי מדויק: העדפה ל-fullName בעברית)
		const guidesOptions = guides.map(g => {
			const name = g.fullName || g.fullNameAr || 'ללא שם'; // 🔑 שינוי סדר העדיפות: fullName (עברית) קודם
			const isSelected = responsible.id === g.id ? 'selected' : '';
			return `<option value="${g.id}" data-phone="${g.phone || ''}" data-email="${g.email || ''}" ${isSelected}>${name}</option>`;
		}).join('');

	// 🔑 בניית צ'קבוקסים לימי שבוע - תיקון קריטי: שימוש ב-day.value במקום day.id
	const weekDaysHtml = weekDays.map(day => {
		const dayValue = day.value || day.id; // 🔑 תאימות לאחור
		const isChecked = allowedDays.includes(dayValue) ? 'checked' : '';
		const dayLabel = day.label || day.labelAr || day.value || 'יום';
		return `<label style="display:inline-flex; align-items:center; gap:6px; margin-left:16px; cursor:pointer; padding:6px 10px; border-radius:6px; transition:background 0.15s;" onmouseover="this.style.background='var(--gray-50)'" onmouseout="this.style.background='transparent'">
			<input type="checkbox" class="ws-day-checkbox" value="${escAttr(dayValue)}" ${isChecked} style="width:16px;height:16px;cursor:pointer;accent-color:var(--primary);"> 
			<span style="font-size:14px;">${escAttr(dayLabel)}</span>
		</label>`;
	}).join('');

		// בניית טבלת סדנאות
		const workshopsTableRows = workshops.map((w, index) => `
			<tr>
				<td style="text-align:center;">${index + 1}</td>
				<td>${escAttr(w.name)}</td>
				<td style="text-align:center; white-space:nowrap;">
					<button class="btn btn-sm btn-outline" onclick="App.editWorkshop(${index})" title="עריכה">✏️</button>
					<button class="btn btn-sm btn-danger" onclick="App.deleteWorkshop(${index})" title="מחיקה">🗑️</button>
				</td>
			</tr>
		`).join('') || '<tr><td colspan="3" style="text-align:center; padding:20px; color:var(--text-secondary);">אין סדנאות מוגדרות</td></tr>';

		document.getElementById('workshopTabContent').innerHTML = `
			<!-- חלק 0: הקדמה לטופס הזמנה (TinyMCE) -->
			<div class="card" style="margin-bottom:24px; border:1px solid var(--primary);">
				<div class="card-header"><span class="card-title">📝 הקדמה לטופס הזמנה (מוצג בראש הדף הציבורי)</span></div>
				<div class="card-body">
					<div class="hp-editor-wrapper" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06);">
						<textarea id="ws_intro_text">${escHtml(introText)}</textarea>
					</div>
					<div style="margin-top:12px;">
						<button class="btn btn-outline btn-sm" onclick="App._initWorkshopIntroTinyMCE()">🔄 אתחל עורך</button>
					</div>
				</div>
			</div>

			<!-- חלק 1: מנהל אחראי -->
			<div class="card" style="margin-bottom:24px; border:1px solid var(--primary);">
				<div class="card-header"><span class="card-title">👤 מנהל/ת אחראי/ת לתפעול והתראות (ממאגר מדריכים)</span></div>
				<div class="card-body">
					<div class="form-grid" style="grid-template-columns: 2fr 1fr 1fr; gap:16px;">
						<div class="form-group">
							<label>שם האחראי/ת *</label>
							<select id="ws_resp_id" class="form-input" onchange="App.autoFillResponsibleData()">
								<option value="">-- בחר מדריך/מנהל --</option>
								${guidesOptions}
							</select>
						</div>
						<div class="form-group">
							<label>מספר נייד</label>
							<input type="text" id="ws_resp_phone" class="form-input" value="${responsible.phone || ''}" readonly style="background:#f8f9fa;">
						</div>
						<div class="form-group">
							<label>כתובת דוא"ל</label>
							<input type="email" id="ws_resp_email" class="form-input" value="${responsible.email || ''}" readonly style="background:#f8f9fa;">
						</div>
					</div>
				</div>
			</div>

			<!-- חלק 2: ימי פעילות -->
			<div class="card" style="margin-bottom:24px;">
				<div class="card-header"><span class="card-title">📅 ימי פעילות להזמנת סדנאות (מטבלת ימי שבוע)</span></div>
				<div class="card-body">
					<p style="font-size:13px; color:var(--text-secondary); margin-bottom:12px;">סמן את הימים שבהם יהיה ניתן להגיש הזמנות סדנאות:</p>
					<div style="display:flex; flex-wrap:wrap; gap:12px;">
						${weekDaysHtml}
					</div>
				</div>
			</div>

			<!-- חלק 3: ניהול סדנאות -->
			<div class="card" style="margin-bottom:24px;">
				<div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
					<span class="card-title">📚 רשימת הסדנאות הזמינות</span>
					<div style="display:flex; gap:8px;">
						<button class="btn btn-sm btn-danger" onclick="App.deleteAllWorkshops()" ${workshops.length === 0 ? 'disabled' : ''}>🗑️ מחק הכל</button>
						<button class="btn btn-sm btn-primary" onclick="App.openWorkshopModal()">➕ הוסף סדנה</button>
					</div>
				</div>
				<div class="card-body" style="padding:0; overflow-x:auto;">
					<table class="data-table">
						<thead><tr><th style="width:50px;">#</th><th>שם הסדנה</th><th style="width:120px; text-align:center;">פעולות</th></tr></thead>
						<tbody>${workshopsTableRows}</tbody>
					</table>
				</div>
			</div>

			<!-- חלק 4: תוויות שדות (דו-לשוני) -->
			<div class="card">
				<div class="card-header"><span class="card-title">🌐 תוויות שדות בטופס (עברית / ערבית)</span></div>
				<div class="card-body">
					<div class="form-grid" style="grid-template-columns: 1fr 1fr 1fr; gap:12px; margin-bottom:16px;">
						<div style="font-weight:600; padding:8px;">שדה</div>
						<div style="font-weight:600; padding:8px;">עברית</div>
						<div style="font-weight:600; padding:8px;">ערבית</div>
						
						<div>קוד מוסד</div>
						<input type="text" class="form-input" id="ws_lbl_inst_he" value="${lblInst.he}">
						<input type="text" class="form-input" id="ws_lbl_inst_ar" value="${lblInst.ar}" dir="rtl">

						<div>איש קשר</div>
						<input type="text" class="form-input" id="ws_lbl_contact_he" value="${lblContact.he}">
						<input type="text" class="form-input" id="ws_lbl_contact_ar" value="${lblContact.ar}" dir="rtl">

						<div>מספר נייד</div>
						<input type="text" class="form-input" id="ws_lbl_mobile_he" value="${lblMobile.he}">
						<input type="text" class="form-input" id="ws_lbl_mobile_ar" value="${lblMobile.ar}" dir="rtl">
						
						<div>דוא"ל</div>
						<input type="text" class="form-input" id="ws_lbl_email_he" value="${lblEmail.he}">
						<input type="text" class="form-input" id="ws_lbl_email_ar" value="${lblEmail.ar}" dir="rtl">

						<div>תאריך המפגש</div>
						<input type="text" class="form-input" id="ws_lbl_date_he" value="${lblDate.he}">
						<input type="text" class="form-input" id="ws_lbl_date_ar" value="${lblDate.ar}" dir="rtl">

						<div>שעת המפגש</div>
						<input type="text" class="form-input" id="ws_lbl_time_he" value="${lblTime.he}">
						<input type="text" class="form-input" id="ws_lbl_time_ar" value="${lblTime.ar}" dir="rtl">

						<div>שם הסדנה</div>
						<input type="text" class="form-input" id="ws_lbl_workshop_he" value="${lblWorkshop.he}">
						<input type="text" class="form-input" id="ws_lbl_workshop_ar" value="${lblWorkshop.ar}" dir="rtl">
						
						<div>מספר משתתפים</div>
						<input type="text" class="form-input" id="ws_lbl_participants_he" value="${lblParticipants.he}">
						<input type="text" class="form-input" id="ws_lbl_participants_ar" value="${lblParticipants.ar}" dir="rtl">

						<div>הערות</div>
						<input type="text" class="form-input" id="ws_lbl_notes_he" value="${lblNotes.he}">
						<input type="text" class="form-input" id="ws_lbl_notes_ar" value="${lblNotes.ar}" dir="rtl">
					</div>
					<div style="text-align:left; margin-top:16px;">
						<button class="btn btn-primary" onclick="App.saveWorkshopSettings()">💾 שמור את כל ההגדרות</button>
					</div>
				</div>
			</div>
		`;

		// אתחול TinyMCE להקדמה
		setTimeout(() => App._initWorkshopIntroTinyMCE(), 100);
	}

	// פונקציית אוטו-מילוי נתוני אחראי (מעודכנת לשדות phone ו-email)
	function autoFillResponsibleData() {
		const select = document.getElementById('ws_resp_id');
		const selectedOption = select.options[select.selectedIndex];
		
		document.getElementById('ws_resp_phone').value = selectedOption.getAttribute('data-phone') || '';
		document.getElementById('ws_resp_email').value = selectedOption.getAttribute('data-email') || '';
	}

	// שמירת כל ההגדרות
	function saveWorkshopSettings() {
		// שמירת תוכן TinyMCE לפני השמירה
		if (typeof tinymce !== 'undefined') {
			var editor = tinymce.get('ws_intro_text');
			if (editor) editor.save();
		}
		
		// 🔑 בדיקה שנבחר לפחות יום אחד לפעילות
		const checkedDays = document.querySelectorAll('.ws-day-checkbox:checked');
		if (checkedDays.length === 0) {
			showToast('⚠️ יש לבחור לפחות יום אחד לפעילות הזמנת סדנאות', 'warning');
			return;
		}
		
		const respSelect = document.getElementById('ws_resp_id');
		const respOption = respSelect.options[respSelect.selectedIndex];
		
		const labels = {
			institutionCode: { he: document.getElementById('ws_lbl_inst_he').value, ar: document.getElementById('ws_lbl_inst_ar').value },
			contactPerson: { he: document.getElementById('ws_lbl_contact_he').value, ar: document.getElementById('ws_lbl_contact_ar').value },
			mobile: { he: document.getElementById('ws_lbl_mobile_he').value, ar: document.getElementById('ws_lbl_mobile_ar').value },
			email: { he: document.getElementById('ws_lbl_email_he').value, ar: document.getElementById('ws_lbl_email_ar').value }, // 🔑 שדה חדש
			meetingDate: { he: document.getElementById('ws_lbl_date_he').value, ar: document.getElementById('ws_lbl_date_ar').value },
			meetingTime: { he: document.getElementById('ws_lbl_time_he').value, ar: document.getElementById('ws_lbl_time_ar').value },
			workshopName: { he: document.getElementById('ws_lbl_workshop_he').value, ar: document.getElementById('ws_lbl_workshop_ar').value },
			notes: { he: document.getElementById('ws_lbl_notes_he').value, ar: document.getElementById('ws_lbl_notes_ar').value }
		};

		const allowedDays = [];
		document.querySelectorAll('.ws-sim-day-checkbox:checked').forEach(cb => allowedDays.push(cb.value));

		const introText = document.getElementById('ws_intro_text')?.value || '';

		const settings = (DataStore.getAll(DataStore.KEYS.WORKSHOP_SETTINGS) || [])[0] || {};
		const newData = {
			id: 'workshop_settings_main',
			labels: labels,
			allowedDays: allowedDays,
			workshops: settings.workshops || [],
			responsible: {
				id: respSelect.value,
				name: respOption.text,
				phone: document.getElementById('ws_resp_phone').value,
				email: document.getElementById('ws_resp_email').value
			},
			introText: introText,
			updatedAt: new Date().toISOString()
		};

		const existing = (DataStore.getAll(DataStore.KEYS.WORKSHOP_SETTINGS) || []).find(item => item.id === 'workshop_settings_main');
		if (existing) {
			DataStore.update(DataStore.KEYS.WORKSHOP_SETTINGS, existing.id, newData);
		} else {
			DataStore.create(DataStore.KEYS.WORKSHOP_SETTINGS, newData);
		}
		showToast('הגדרות הדף נשמרו בהצלחה!', 'success');
	}

	// ================================================================
	// 🔑 פונקציה גלובלית: קבלת הימים המותרים להזמנת סדנאות
	// ================================================================
	/**
	 * מחזירה מערך של ימי השבוע המותרים להזמנת סדנאות
	 * @returns {Array} מערך של אובייקטים: [{value: 'sunday', label: 'יום ראשון'}, ...]
	 */
	function getAllowedWorkshopDays() {
		const settings = (DataStore.getAll(DataStore.KEYS.WORKSHOP_SETTINGS) || [])[0] || {};
		const allowedDayValues = settings.allowedDays || [];
		
		if (allowedDayValues.length === 0) return [];
		
		const weekDays = DataStore.getAll(DataStore.KEYS.LOOKUP_WEEK_DAYS) || [];
		
		return weekDays.filter(day => {
			const dayValue = day.value || day.id;
			return allowedDayValues.includes(dayValue);
		}).map(day => ({
			value: day.value || day.id,
			label: day.label || day.labelAr || day.value,
			labelAr: day.labelAr || day.label || ''
		}));
	}

	/**
	 * בודק אם תאריך נתון חל באחד הימים המותרים להזמנת סדנאות
	 * @param {string|Date} dateStr - תאריך בפורמט YYYY-MM-DD או אובייקט Date
	 * @returns {Object} {allowed: boolean, dayName: string, allowedDays: Array}
	 */
	function checkWorkshopDateAllowed(dateStr) {
		const allowedDays = getAllowedWorkshopDays();
		
		if (allowedDays.length === 0) {
			return { allowed: false, dayName: '', allowedDays: [], error: 'לא הוגדרו ימי פעילות' };
		}
		
		// המרת התאריך ל-Date
		const date = (dateStr instanceof Date) ? dateStr : new Date(dateStr);
		if (isNaN(date.getTime())) {
			return { allowed: false, dayName: '', allowedDays: allowedDays, error: 'תאריך לא תקין' };
		}
		
		// קבלת היום בשבוע (0 = ראשון, 1 = שני, ..., 6 = שבת)
		const jsDay = date.getDay();
		
		// מיפוי מ-JavaScript day ל-value של lookup_week_days
		// בדרך כלל: sunday=0, monday=1, ..., saturday=6
		const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
		const selectedDayValue = dayMap[jsDay];
		
		// בדיקה אם היום נמצא ברשימת הימים המותרים
		const isAllowed = allowedDays.some(d => d.value === selectedDayValue);
		
		// מציאת שם היום שנבחר
		const selectedDayInfo = allowedDays.find(d => d.value === selectedDayValue);
		const dayName = selectedDayInfo ? selectedDayInfo.label : '';
		
		return {
			allowed: isAllowed,
			dayName: dayName,
			dayValue: selectedDayValue,
			allowedDays: allowedDays,
			error: isAllowed ? '' : `היום "${dayName || selectedDayValue}" אינו יום פעילות להזמנת סדנאות`
		};
	}

	/**
	 * מחזירה מחרוזת תיאור של הימים המותרים (לתצוגה בטופס)
	 * @returns {string} מחרוזת כמו "ימים מותרים: יום ראשון, יום שלישי"
	 */
	function getAllowedDaysDescription() {
		const allowedDays = getAllowedWorkshopDays();
		if (allowedDays.length === 0) return 'לא הוגדרו ימי פעילות';
		
		const lang = (typeof getUiLang === 'function') ? getUiLang() : 'he';
		const dayNames = allowedDays.map(d => lang === 'ar' ? d.labelAr : d.label);
		
		return (lang === 'ar' ? 'الأيام المسموحة: ' : 'ימים מותרים: ') + dayNames.join(', ');
	}

	// --- ניהול סדנאות (CRUD) ---
	function openWorkshopModal(index) {
		const settings = (DataStore.getAll(DataStore.KEYS.WORKSHOP_SETTINGS) || [])[0] || {};
		const workshops = settings.workshops || [];
		
		let currentName = '';
		let isEdit = false;
		
		if (index !== null && index !== undefined && index !== 'null') {
			const idx = parseInt(index);
			if (!isNaN(idx) && workshops[idx]) {
				currentName = workshops[idx].name || '';
				isEdit = true;
			}
		}

		const title = isEdit ? 'עריכת סדנה' : 'הוספת סדנה חדשה';
		const btnText = isEdit ? '💾 שמור שינויים' : '➕ הוסף סדנה';
		const indexParam = isEdit ? index : 'null';

		// יצירת מודאל ידני (בלי תלות ב-showModal)
		let overlay = document.getElementById('ws_modal_overlay');
		if (overlay) overlay.remove();

		overlay = document.createElement('div');
		overlay.id = 'ws_modal_overlay';
		overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;';
		
		overlay.innerHTML = `
			<div style="background:#fff;border-radius:12px;padding:32px;min-width:400px;max-width:90%;box-shadow:0 8px 32px rgba(0,0,0,0.2);">
				<h3 style="margin:0 0 20px 0;color:var(--primary);">${title}</h3>
				<div class="form-group">
					<label style="font-weight:600;margin-bottom:6px;display:block;">שם הסדנה *</label>
					<input type="text" id="ws_workshop_name_input" class="form-input" value="${currentName}" placeholder="הזן שם סדנה">
				</div>
				<div style="display:flex;gap:12px;justify-content:flex-end;margin-top:24px;">
					<button class="btn btn-primary" id="ws_modal_save_btn">${btnText}</button>
					<button class="btn btn-outline" id="ws_modal_cancel_btn">ביטול</button>
				</div>
			</div>
		`;
		
		document.body.appendChild(overlay);

		// חיבור אירועים
		document.getElementById('ws_modal_save_btn').addEventListener('click', function() {
			App.saveWorkshopItem(indexParam);
		});
		
		document.getElementById('ws_modal_cancel_btn').addEventListener('click', function() {
			overlay.remove();
		});
		
		// סגירה בלחיצה על הרקע
		overlay.addEventListener('click', function(e) {
			if (e.target === overlay) overlay.remove();
		});

		// פוקוס אוטומטי על השדה
		setTimeout(function() {
			var input = document.getElementById('ws_workshop_name_input');
			if (input) input.focus();
		}, 100);
	}

	function saveWorkshopItem(index) {
		const nameInput = document.getElementById('ws_workshop_name_input');
		const name = nameInput ? nameInput.value.trim() : '';
		
		if (!name) { 
			showToast('יש להזין שם סדנה', 'error'); 
			return; // לא סוגרים אם יש שגיאת ולידציה
		}

		const settings = (DataStore.getAll(DataStore.KEYS.WORKSHOP_SETTINGS) || [])[0] || {};
		let workshops = settings.workshops || [];

		// 🔧 בדיקה מלאה גם ל-undefined (תיקון מהקטע הראשון)
		const idx = (index === null || index === undefined || index === 'null') ? null : parseInt(index);

		if (idx !== null && !isNaN(idx)) {
			if (workshops[idx]) {
				workshops[idx] = { name: name };
				showToast('הסדנה עודכנה בהצלחה', 'success');
			}
		} else {
			workshops.push({ name: name });
			showToast('הסדנה נוספה בהצלחה', 'success');
		}

		settings.workshops = workshops;
		
		const existing = (DataStore.getAll(DataStore.KEYS.WORKSHOP_SETTINGS) || []).find(item => item.id === 'workshop_settings_main');
		if (existing) {
			DataStore.update(DataStore.KEYS.WORKSHOP_SETTINGS, existing.id, settings);
		} else {
			settings.id = 'workshop_settings_main';
			DataStore.create(DataStore.KEYS.WORKSHOP_SETTINGS, settings);
		}
		
		// 🔥 סגירת חלון מודאלי - ניקוי בטוח (סדר מתוקן!)
		// 1. קודם מנסים את הפונקציה הרשמית שדואגת לניקוי מאזיני אירועים ואנימציות
		if (typeof App !== 'undefined' && typeof App.closeModal === 'function') {
			App.closeModal();
		}
		// 2. גיבוי כבד: הסרה פיזית של האוברליי מה-DOM, למקרה שהפונקציה הקודמת לא עבדה
		const overlay = document.getElementById('ws_modal_overlay');
		if (overlay) {
			overlay.remove();
		}
		
		_renderWorkshopSettingsTab();
	}

	// פונקציה לעריכת סדנה (מפעילה את המודאל עם האינדקס)
	function editWorkshop(index) {
		App.openWorkshopModal(index);
	}

	// פונקציה למחיקת סדנה בודדת
	function deleteWorkshop(index) {
		if (!confirm('האם אתה בטוח שברצונך למחוק סדנה זו?')) return;
		
		const settings = (DataStore.getAll(DataStore.KEYS.WORKSHOP_SETTINGS) || [])[0] || {};
		let workshops = settings.workshops || [];
		
		// בדיקת תקינות לפני מחיקה
		if (index >= 0 && index < workshops.length) {
			workshops.splice(index, 1); // מחיקת הפריט מהמערך
			settings.workshops = workshops;
			
			const existing = (DataStore.getAll(DataStore.KEYS.WORKSHOP_SETTINGS) || []).find(item => item.id === 'workshop_settings_main');
			if (existing) {
				DataStore.update(DataStore.KEYS.WORKSHOP_SETTINGS, existing.id, settings);
			}
			
			showToast('הסדנה נמחקה בהצלחה', 'success');
			_renderWorkshopSettingsTab(); // רענון התצוגה
		}
	}


	// פונקציה למחיקת כל הסדנאות
	function deleteAllWorkshops() {
		if (!confirm('⚠️ האם אתה בטוח שברצונך למחוק את כל רשימת הסדנאות? פעולה זו בלתי הפיכה.')) return;
		
		const settings = (DataStore.getAll(DataStore.KEYS.WORKSHOP_SETTINGS) || [])[0] || {};
		settings.workshops = [];
		
		const existing = (DataStore.getAll(DataStore.KEYS.WORKSHOP_SETTINGS) || []).find(item => item.id === 'workshop_settings_main');
		if (existing) {
			DataStore.update(DataStore.KEYS.WORKSHOP_SETTINGS, existing.id, settings);
		}
		
		showToast('כל הסדנאות נמחקו', 'success');
		_renderWorkshopSettingsTab();
	}


		 function _renderWorkshopBookingsTab() {
			// 🔑 תיקון קריטי: שימוש במפתח גמיש למקרה ש-DataStore.KEYS.WORKSHOP_BOOKINGS לא מוגדר
			const storeKey = (typeof DataStore !== 'undefined' && DataStore.KEYS && DataStore.KEYS.WORKSHOP_BOOKINGS) ? DataStore.KEYS.WORKSHOP_BOOKINGS : 'workshop_bookings';
			
			const bookings = (DataStore.getAll(storeKey) || []).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
			
			// 🔑 לוג אבחון: ידפיס בדיוק מה המערכת רואה
			console.log('📋 [Workshop Bookings Debug] מפתח בשימוש:', storeKey);
			console.log('📋 [Workshop Bookings Debug] מספר הזמנות שנמצאו:', bookings.length);
			if (bookings.length > 0) {
				console.log('📋 [Workshop Bookings Debug] דוגמה להזמנה ראשונה:', bookings[0]);
			}

			if (bookings.length === 0) {
				document.getElementById('workshopTabContent').innerHTML = `
					<div style="text-align:center; padding:60px 20px; color:var(--text-secondary);">
						<div style="font-size:64px; margin-bottom:16px;">📭</div>
						<h3>אין הזמנות עדיין</h3>
						<p>הזמנות יופיעו כאן לאחר שמשתמשים ימלאו את הטופס באתר הציבורי.</p>
						<p style="font-size:12px; color:#999; margin-top:8px;">(אם ביצעת הזמנה, לחץ Ctrl+F5 לרענון עמוק)</p>
					</div>`;
				return;
			}
		const statusColors = { 'pending': '#ffc107', 'approved': '#28a745', 'rejected': '#dc3545', 'completed': '#17a2b8', 'cancelled': '#6c757d' };
		const statusLabels = { 'pending': 'ממתין', 'approved': 'אושרה', 'rejected': 'נדחתה', 'completed': 'הושלמה', 'cancelled': 'בוטלה' };
		const rowsHtml = bookings.map(b => `
			<tr>
				<td style="text-align:center;">${new Date(b.createdAt).toLocaleDateString('he-IL')}</td>
				<td>${escAttr(b.schoolName || '-')}</td>
				<td>${escAttr(b.contactPerson || '-')}</td>
				<td dir="ltr">${escAttr(b.mobile || '-')}</td>
				<td>${escAttr(b.workshopName || '-')}</td>
				<td>${b.meetingDate ? new Date(b.meetingDate).toLocaleDateString('he-IL') : '-'}</td>
				<td style="text-align:center;">
					<select class="form-select" style="padding:4px 8px; font-size:12px; font-weight:600; color:#fff; background:${statusColors[b.status] || '#6c757d'}; border:none; border-radius:12px; cursor:pointer;" 
							onchange="App.updateBookingStatus('${b.id}', this.value)">
						<option value="pending" ${b.status === 'pending' ? 'selected' : ''}>⏳ ממתין</option>
						<option value="approved" ${b.status === 'approved' ? 'selected' : ''}>✅ אושרה</option>
						<option value="rejected" ${b.status === 'rejected' ? 'selected' : ''}>❌ נדחתה</option>
						<option value="completed" ${b.status === 'completed' ? 'selected' : ''}>🏁 הושלמה</option>
						<option value="cancelled" ${b.status === 'cancelled' ? 'selected' : ''}>🚫 בוטלה</option>
					</select>
				</td>
				<td style="text-align:center; white-space:nowrap;">
					<button class="btn btn-sm btn-outline" onclick="App.viewBookingDetails('${b.id}')" title="צפייה בפרטים">👁️</button>
					<button class="btn btn-sm btn-outline" onclick="App.printBooking('${b.id}')" title="הדפסה">🖨️</button>
					<button class="btn btn-sm btn-success" onclick="App.replyWhatsappBooking('${b.id}')" title="מענה בוואטסאפ">💬</button>
					<button class="btn btn-sm btn-danger" onclick="App.deleteBooking('${b.id}')" title="מחיקה">🗑️</button>
				</td>
			</tr>
		`).join('');
		document.getElementById('workshopTabContent').innerHTML = `
			<div style="overflow-x:auto;">
				<table class="data-table">
					<thead>
						<tr>
							<th>תאריך הזמנה</th><th>בית ספר</th><th>איש קשר</th><th>טלפון</th><th>סדנה</th><th>תאריך מפגש</th><th>סטטוס</th><th>פעולות</th>
						</tr>
					</thead>
					<tbody>${rowsHtml}</tbody>
				</table>
			</div>
		`;
	 }

	// 🔑 פונקציה חדשה: עדכון סטטוס הזמנה (כולל שחרור תאריך במקרה של דחייה/ביטול)
	function updateBookingStatus(id, newStatus) {
		const bookings = DataStore.getAll(DataStore.KEYS.WORKSHOP_BOOKINGS) || [];
		const bookingIndex = bookings.findIndex(b => b.id === id);
		
		if (bookingIndex === -1) return;
		
		const oldStatus = bookings[bookingIndex].status;
		bookings[bookingIndex].status = newStatus;
		bookings[bookingIndex].updatedAt = new Date().toISOString();
		
		DataStore.saveAll(DataStore.KEYS.WORKSHOP_BOOKINGS, bookings);
		
		// הודעה למשתמש על שינוי הסטטוס והשלכותיו
		let msg = 'סטטוס ההזמנה עודכן ל: ';
		if (newStatus === 'approved') msg += '✅ אושרה';
		else if (newStatus === 'rejected') msg += '❌ נדחתה (התאריך שוחרר וזמין להזמנה חדשה)';
		else if (newStatus === 'completed') msg += '🏁 הושלמה';
		else if (newStatus === 'cancelled') msg += '🚫 בוטלה (התאריך שוחרר)';
		else msg += '⏳ ממתין';
		
		showToast(msg, 'success');
		_renderWorkshopBookingsTab(); // רענון הטבלה
	}

	// --- פעולות על הזמנות ---
	function viewBookingDetails(id) {
		const bookings = DataStore.getAll(DataStore.KEYS.WORKSHOP_BOOKINGS) || [];
		const b = bookings.find(x => x.id === id);
		if (!b) return;

		const statusLabels = { 'pending': 'ממתין לאישור', 'approved': 'אושר', 'completed': 'הושלם', 'cancelled': 'בוטל' };
		const body = `
			<div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; font-size:14px; line-height:1.6;">
				<div><strong>📅 תאריך הזמנה:</strong><br>${new Date(b.createdAt).toLocaleString('he-IL')}</div>
				<div><strong>📊 סטטוס:</strong><br><span style="color:var(--primary); font-weight:bold;">${statusLabels[b.status] || b.status}</span></div>
				<div><strong>🏫 קוד מוסד:</strong><br>${escAttr(b.institutionCode || '-')}</div>
				<div><strong>🏫 בית ספר:</strong><br>${escAttr(b.schoolName || '-')}</div>
				<div><strong>👤 מנהל/ת בית הספר:</strong><br>${escAttr(b.principalName || '-')}</div>
				<div><strong>📞 איש קשר:</strong><br>${escAttr(b.contactPerson || '-')}</div>
				<div><strong>📱 טלפון:</strong><br><span dir="ltr">${escAttr(b.mobile || '-')}</span></div>
				<div><strong>📚 שם הסדנה:</strong><br>${escAttr(b.workshopName || '-')}</div>
				<div><strong>🗓️ תאריך מפגש:</strong><br>${b.meetingDate ? new Date(b.meetingDate).toLocaleDateString('he-IL') : '-'}</div>
				<div><strong>⏰ שעה:</strong><br>${escAttr(b.startTime || '-')} עד ${escAttr(b.endTime || '-')}</div>
				<div style="grid-column:1/-1; background:#f8f9fa; padding:12px; border-radius:8px;">
					<strong>📝 הערות:</strong><br>${escAttr(b.notes || 'אין הערות')}
				</div>
			</div>
		`;
		showModal('פרטי הזמנה מלאים', body, '<button class="btn btn-outline" onclick="App.closeModal()">סגור</button>');
	}

	function printBooking(id) {
		const bookings = DataStore.getAll(DataStore.KEYS.WORKSHOP_BOOKINGS) || [];
		const b = bookings.find(x => x.id === id);
		if (!b) return;

		const printWindow = window.open('', '_blank');
		printWindow.document.write(`
			<html dir="rtl"><head><title>הדפסת הזמנה - ${b.schoolName}</title>
			<style>body{font-family:Arial,sans-serif; padding:40px; line-height:1.6;} h2{color:#0ca7aa; border-bottom:2px solid #0ca7aa; padding-bottom:10px;} .row{display:flex; justify-content:space-between; margin-bottom:12px; border-bottom:1px dashed #ccc; padding-bottom:8px;} .label{font-weight:bold; color:#555;} .value{color:#000;} @media print{body{padding:0;}}</style>
			</head><body>
			<h2>🏔️ פרטי הזמנת סדנה בפסגה</h2>
			<div class="row"><span class="label">תאריך הפקת המסמך:</span><span class="value">${new Date().toLocaleDateString('he-IL')}</span></div>
			<div class="row"><span class="label">בית ספר:</span><span class="value">${b.schoolName} (קוד: ${b.institutionCode})</span></div>
			<div class="row"><span class="label">מנהל/ת בית הספר:</span><span class="value">${b.principalName}</span></div>
			<div class="row"><span class="label">איש קשר:</span><span class="value">${b.contactPerson} | ${b.mobile}</span></div>
			<div class="row"><span class="label">סדנה מבוקשת:</span><span class="value">${b.workshopName}</span></div>
			<div class="row"><span class="label">תאריך ושעת המפגש:</span><span class="value">${b.meetingDate ? new Date(b.meetingDate).toLocaleDateString('he-IL') : '-'} | ${b.startTime} - ${b.endTime}</span></div>
			<div class="row"><span class="label">הערות:</span><span class="value">${b.notes || 'אין'}</span></div>
			<br><br>
			<p style="text-align:center; color:#888; font-size:12px;">מסמך זה הופק אוטומטית ממערכת מצפן נט.</p>
			</body></html>
		`);
		printWindow.document.close();
		setTimeout(() => { printWindow.print(); }, 500);
	}

	function replyEmailBooking(id) {
		const bookings = DataStore.getAll(DataStore.KEYS.WORKSHOP_BOOKINGS) || [];
		const b = bookings.find(x => x.id === id);
		if (!b || !b.mobile) { showToast('לא נמצא מספר טלפון להזמנה זו', 'warning'); return; }
		
		// הערה: מכיוון שאין שדה אימייל בטופס הציבורי, נשתמש ב-mailto עם הטלפון כנושא, או שנבקש מהמשתמש להזין ידנית.
		// אם תרצה להוסיף שדה אימייל לטופס הציבורי, עדכן את ה-fetch שם. כרגע נפתח חלון אימייל ריק עם פרטי ההזמנה בגוף ההודעה.
		const subject = encodeURIComponent(`מענה להזמנת סדנה - ${b.schoolName}`);
		const body = encodeURIComponent(`שלום רב ${b.contactPerson},\n\nתודה על פנייתך להזמנת הסדנה "${b.workshopName}".\nאנו בודקים את הזמינות לתאריך ${b.meetingDate} ונחזור אליך בהקדם.\n\nבברכה,\nצוות מצפן נט`);
		
		window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
	}

	function replyWhatsappBooking(id) {
		const bookings = DataStore.getAll(DataStore.KEYS.WORKSHOP_BOOKINGS) || [];
		const b = bookings.find(x => x.id === id);
		if (!b || !b.mobile) { showToast('לא נמצא מספר טלפון להזמנה זו', 'warning'); return; }

		const cleanPhone = b.mobile.replace(/[^0-9]/g, '');
		const message = encodeURIComponent(`שלום רב ${b.contactName || b.contactPerson || ''},\nתודה על הזמנת הסדנה "${b.workshopName}" עבור ${b.schoolName}.\nאנו נחזור אליך בהקדם לאישור סופי.\nבברכה, צוות מצפן נט 🧭`);
		
		window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
	}

	function deleteBooking(id) {
		if (!confirm('האם אתה בטוח שברצונך למחוק הזמנה זו לצמיתות?')) return;
		DataStore.remove(DataStore.KEYS.WORKSHOP_BOOKINGS, id);
		showToast('ההזמנה נמחקה בהצלחה', 'success');
		_renderWorkshopBookingsTab();
	}

    function addWorkshop() {
        const input = document.getElementById('wsNewWorkshop');
        const newName = input.value.trim();
        if (!newName) return;

        const settings = (DataStore.getAll(DataStore.KEYS.WORKSHOP_SETTINGS) || [])[0] || {};
        const workshops = settings.workshops || [];
        
        if (workshops.includes(newName)) {
            showToast('סדנה זו כבר קיימת ברשימה', 'warning');
            return;
        }

        workshops.push(newName);
        
        // עדכון ישיר ב-DataStore
        const existing = (DataStore.getAll(DataStore.KEYS.WORKSHOP_SETTINGS) || []).find(item => item.id === 'workshop_settings_main');
        if (existing) {
            existing.workshops = workshops;
            DataStore.update(DataStore.KEYS.WORKSHOP_SETTINGS, existing.id, existing);
        } else {
            DataStore.create(DataStore.KEYS.WORKSHOP_SETTINGS, { id: 'workshop_settings_main', workshops: workshops });
        }

        input.value = '';
        showToast('הסדנה נוספה בהצלחה', 'success');
        renderWorkshopBookings(); // רענון הרשימה
    }

    function removeWorkshop(index) {
        if (!confirm('האם אתה בטוח שברצונך למחוק סדנה זו מהרשימה?')) return;

        const settings = (DataStore.getAll(DataStore.KEYS.WORKSHOP_SETTINGS) || [])[0] || {};
        const workshops = settings.workshops || [];
        
        workshops.splice(index, 1);
        
        const existing = (DataStore.getAll(DataStore.KEYS.WORKSHOP_SETTINGS) || []).find(item => item.id === 'workshop_settings_main');
        if (existing) {
            existing.workshops = workshops;
            DataStore.update(DataStore.KEYS.WORKSHOP_SETTINGS, existing.id, existing);
        }

        showToast('הסדנה הוסרה', 'success');
        renderWorkshopBookings(); // רענון הרשימה
    }

	function viewWorkshopBooking(id) {
		const bookings = DataStore.getAll(DataStore.KEYS.WORKSHOP_BOOKINGS) || [];
		const booking = bookings.find(b => b.id === id);
		
		if (!booking) {
			showToast('ההזמנה לא נמצאה', 'error');
			return;
		}

		const statusLabels = {
			'pending': 'ממתין לאישור',
			'approved': 'אושר',
			'completed': 'הושלם',
			'cancelled': 'בוטל'
		};

		const body = `
			<div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; font-size:14px;">
				<div><strong>תאריך הזמנה:</strong><br>${new Date(booking.createdAt).toLocaleString('he-IL')}</div>
				<div><strong>סטטוס:</strong><br>${statusLabels[booking.status] || booking.status}</div>
				
				<div><strong>קוד מוסד:</strong><br>${booking.institutionCode || '-'}</div>
				<div><strong>בית ספר:</strong><br>${booking.schoolName || '-'}</div>
				
				<div><strong>שם המנהל/ת:</strong><br>${booking.principalName || '-'}</div>
				<div><strong>איש קשר:</strong><br>${booking.contactPerson || '-'}</div>
				
				<div><strong>טלפון:</strong><br><span dir="ltr">${booking.mobile || '-'}</span></div>
				<div><strong>שם הסדנה:</strong><br>${booking.workshopName || '-'}</div>
				
				<div><strong>תאריך מפגש:</strong><br>${booking.meetingDate ? new Date(booking.meetingDate).toLocaleDateString('he-IL') : '-'}</div>
				<div><strong>שעה:</strong><br>${booking.startTime || '-'} - ${booking.endTime || '-'}</div>
				
				<div style="grid-column:1/-1;"><strong>הערות:</strong><br>${booking.notes || 'אין הערות'}</div>
			</div>
		`;

		showModal('פרטי הזמנה', body, '<button class="btn btn-outline" onclick="App.closeModal()">סגור</button>');
	}

	function changeWorkshopStatus(id) {
		const bookings = DataStore.getAll(DataStore.KEYS.WORKSHOP_BOOKINGS) || [];
		const booking = bookings.find(b => b.id === id);
		
		if (!booking) return;

		const statuses = ['pending', 'approved', 'completed', 'cancelled'];
		const statusLabels = {
			'pending': 'ממתין',
			'approved': 'אושר',
			'completed': 'הושלם',
			'cancelled': 'בוטל'
		};

		const currentIndex = statuses.indexOf(booking.status);
		const nextIndex = (currentIndex + 1) % statuses.length;
		const newStatus = statuses[nextIndex];

		if (confirm(`לשנות סטטוס מ-"${statusLabels[booking.status]}" ל-"${statusLabels[newStatus]}"?`)) {
			booking.status = newStatus;
			DataStore.update(DataStore.KEYS.WORKSHOP_BOOKINGS, id, booking);
			showToast('הסטטוס עודכן', 'success');
			_renderWorkshopBookingsTab();
		}
	}

	function sendWhatsApp(mobile, contactName) {
		if (!mobile) {
			showToast('אין מספר טלפון להזמנה זו', 'warning');
			return;
		}

		const message = encodeURIComponent(`שלום ${contactName || ''},\nתודה על הזמנת הסדנה. ניצור איתך קשר בהקדם.\nבברכה,\nמרכז פיתוח סגלי הוראה`);
		const whatsappUrl = `https://wa.me/${mobile.replace(/[^0-9]/g, '')}?text=${message}`;
		
		window.open(whatsappUrl, '_blank');
	}

	function deleteWorkshopBooking(id) {
    if (!confirm('האם אתה בטוח שברצונך למחוק הזמנה זו?')) return;
    
    DataStore.remove(DataStore.KEYS.WORKSHOP_BOOKINGS, id);
    showToast('ההזמנה נמחקה', 'success');
    _renderWorkshopBookingsTab();
}

// ================================================================
//  ניהול הזמנת סדנאות סימולציה (מערכת מקבילה ועצמאית)
// ================================================================
const SIM_SETTINGS_KEY = 'workshop_sim_settings';
const SIM_BOOKINGS_KEY = 'workshop_sim_bookings';

async function renderWorkshopSimBookings() {
    const container = document.getElementById('section-workshop-sim-bookings');
    if (!container) return;
    const activeTab = window._workshopSimActiveTab || 'settings';
    
    container.innerHTML = `
        <div class="card">
            <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
                <h3 class="card-title">🎭 ניהול הזמנת סדנאות סימולציה</h3>
                <div style="display:flex; gap:8px;">
                    <button class="btn ${activeTab === 'settings' ? 'btn-primary' : 'btn-outline'}" onclick="App._switchWorkshopSimTab('settings')">⚙️ הגדרות ותפעול</button>
                    <button class="btn ${activeTab === 'bookings' ? 'btn-primary' : 'btn-outline'}" onclick="App._switchWorkshopSimTab('bookings')">📋 הזמנות שהתקבלו</button>
                </div>
            </div>
            <div class="card-body">
                <div id="workshopSimTabContent">
					<div style="text-align:center; padding:40px; color:var(--gray-500);">
						<div style="font-size:32px; margin-bottom:10px;">⏳</div>
						<p>טוען נתונים מהשרת...</p>
					</div>
				</div>
            </div>
        </div>
    `;
    if (activeTab === 'settings') {
        _renderWorkshopSimSettingsTab();
    } else {
        // 🔑 קריטי: משיכת הנתונים הטריים מהשרת לפני הצגת הטבלה
        try {
            const response = await fetch('./data/workshop_sim_bookings.json?t=' + Date.now());
            if (response.ok) {
                const bookings = await response.json();
                if (Array.isArray(bookings)) {
                    DataStore.saveAll(DataStore.KEYS.WORKSHOP_SIM_BOOKINGS, bookings);
                    console.log('✅ נטענו ' + bookings.length + ' הזמנות סימולציה מהשרת');
                }
            }
        } catch (e) {
            console.warn('⚠️ לא ניתן לטעון הזמנות סימולציה מהשרת:', e);
        }
        _renderWorkshopSimBookingsTab();
    }
}

function _switchWorkshopSimTab(tab) {
    window._workshopSimActiveTab = tab;
    renderWorkshopSimBookings();
}

function _renderWorkshopSimSettingsTab() {
    const settings = (DataStore.getAll(SIM_SETTINGS_KEY) || [])[0] || {};
    const labels = settings.labels || {};
    const workshops = settings.workshops || [];
    const allowedDays = settings.allowedDays || [];
    const responsible = settings.responsible || {};
    const introText = settings.introText || '';
    
    const guides = DataStore.getAll(DataStore.KEYS.GUIDES_REPO) || [];
    const weekDays = DataStore.getAll(DataStore.KEYS.LOOKUP_WEEK_DAYS) || [];
    const getLabel = (key, defHe, defAr) => ({ he: labels[key]?.he || defHe, ar: labels[key]?.ar || defAr });
    
    const lblInst = getLabel('institutionCode', 'קוד מוסד', 'رمز المؤسسة');
    const lblContact = getLabel('contactPerson', 'שם איש קשר', 'اسم شخص الاتصال');
    const lblMobile = getLabel('mobile', 'מספר נייד', 'رقم الهاتف المحمول');
    const lblEmail = getLabel('email', 'דוא"ל', 'البريد الإلكتروني');
    const lblDate = getLabel('meetingDate', 'תאריך המפגש', 'تاريخ اللقاء');
    const lblTime = getLabel('meetingTime', 'שעת המפגש', 'وقت اللقاء');
    const lblWorkshop = getLabel('workshopName', 'שם הסדנה', 'اسم الورشة');
    const lblParticipants = getLabel('participants', 'מספר משתתפים', 'عدد المشاركين');
    const lblNotes = getLabel('notes', 'הערות', 'ملاحظات');

    const guidesOptions = guides.map(g => {
        const name = g.fullName || g.fullNameAr || 'ללא שם';
        const isSelected = responsible.id === g.id ? 'selected' : '';
        return `<option value="${g.id}" data-phone="${g.phone || ''}" data-email="${g.email || ''}" ${isSelected}>${name}</option>`;
    }).join('');

    const weekDaysHtml = weekDays.map(day => {
        const dayValue = day.value || day.id;
        const isChecked = allowedDays.includes(dayValue) ? 'checked' : '';
        const dayLabel = day.label || day.labelAr || dayValue;
        return `<label style="display:inline-flex; align-items:center; gap:6px; margin-left:16px; cursor:pointer; padding:6px 10px; border-radius:6px; transition:background 0.15s;" onmouseover="this.style.background='var(--gray-50)'" onmouseout="this.style.background='transparent'">
            <input type="checkbox" class="ws-sim-day-checkbox" value="${escAttr(dayValue)}" ${isChecked} style="width:16px;height:16px;cursor:pointer;accent-color:var(--primary);"> 
            <span style="font-size:14px;">${escAttr(dayLabel)}</span>
        </label>`;
    }).join('');

    const workshopsTableRows = workshops.map((w, index) => `
        <tr>
            <td style="text-align:center;">${index + 1}</td>
            <td>${escAttr(w.name)}</td>
            <td style="text-align:center; white-space:nowrap;">
                <button class="btn btn-sm btn-outline" onclick="App.editWorkshopSim(${index})" title="עריכה">✏️</button>
                <button class="btn btn-sm btn-danger" onclick="App.deleteWorkshopSim(${index})" title="מחיקה">🗑️</button>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="3" style="text-align:center; padding:20px; color:var(--text-secondary);">אין סדנאות מוגדרות</td></tr>';

    document.getElementById('workshopSimTabContent').innerHTML = `
        <div class="card" style="margin-bottom:24px; border:1px solid var(--primary);">
            <div class="card-header"><span class="card-title">📝 הקדמה לטופס הזמנה (סימולציה)</span></div>
            <div class="card-body">
                <div class="hp-editor-wrapper" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06);">
                    <textarea id="ws_sim_intro_text">${escHtml(introText)}</textarea>
                </div>
                <div style="margin-top:12px;"><button class="btn btn-outline btn-sm" onclick="App._initWorkshopSimIntroTinyMCE()">🔄 אתחל עורך</button></div>
            </div>
        </div>
        <div class="card" style="margin-bottom:24px; border:1px solid var(--primary);">
            <div class="card-header"><span class="card-title">👤 מנהל/ת אחראי/ת לתפעול והתראות (סימולציה)</span></div>
            <div class="card-body">
                <div class="form-grid" style="grid-template-columns: 2fr 1fr 1fr; gap:16px;">
                    <div class="form-group"><label>שם האחראי/ת *</label>
                        <select id="ws_sim_resp_id" class="form-input" onchange="App.autoFillSimResponsibleData()">
                            <option value="">-- בחר מדריך/מנהל --</option>${guidesOptions}
                        </select>
                    </div>
                    <div class="form-group"><label>מספר נייד</label><input type="text" id="ws_sim_resp_phone" class="form-input" value="${responsible.phone || ''}" readonly style="background:#f8f9fa;"></div>
                    <div class="form-group"><label>כתובת דוא"ל</label><input type="email" id="ws_sim_resp_email" class="form-input" value="${responsible.email || ''}" readonly style="background:#f8f9fa;"></div>
                </div>
            </div>
        </div>
        <div class="card" style="margin-bottom:24px;">
            <div class="card-header"><span class="card-title">📅 ימי פעילות להזמנת סדנאות סימולציה</span></div>
            <div class="card-body">
                <p style="font-size:13px; color:var(--text-secondary); margin-bottom:12px;">סמן את הימים שבהם יהיה ניתן להגיש הזמנות:</p>
                <div style="display:flex; flex-wrap:wrap; gap:12px;">${weekDaysHtml}</div>
            </div>
        </div>
        <div class="card" style="margin-bottom:24px;">
            <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
                <span class="card-title">📚 רשימת הסדנאות הזמינות (סימולציה)</span>
                <div style="display:flex; gap:8px;">
                    <button class="btn btn-sm btn-danger" onclick="App.deleteAllWorkshopsSim()" ${workshops.length === 0 ? 'disabled' : ''}>🗑️ מחק הכל</button>
                    <button class="btn btn-sm btn-primary" onclick="App.openWorkshopSimModal()">➕ הוסף סדנה</button>
                </div>
            </div>
            <div class="card-body" style="padding:0; overflow-x:auto;">
                <table class="data-table"><thead><tr><th style="width:50px;">#</th><th>שם הסדנה</th><th style="width:120px; text-align:center;">פעולות</th></tr></thead>
                <tbody>${workshopsTableRows}</tbody></table>
            </div>
        </div>
        <div class="card">
            <div class="card-header"><span class="card-title">🌐 תוויות שדות בטופס (עברית / ערבית)</span></div>
            <div class="card-body">
                <div class="form-grid" style="grid-template-columns: 1fr 1fr 1fr; gap:12px; margin-bottom:16px;">
                    <div style="font-weight:600; padding:8px;">שדה</div><div style="font-weight:600; padding:8px;">עברית</div><div style="font-weight:600; padding:8px;">ערבית</div>
                    <div>קוד מוסד</div><input type="text" class="form-input" id="ws_sim_lbl_inst_he" value="${lblInst.he}"><input type="text" class="form-input" id="ws_sim_lbl_inst_ar" value="${lblInst.ar}" dir="rtl">
                    <div>איש קשר</div><input type="text" class="form-input" id="ws_sim_lbl_contact_he" value="${lblContact.he}"><input type="text" class="form-input" id="ws_sim_lbl_contact_ar" value="${lblContact.ar}" dir="rtl">
                    <div>מספר נייד</div><input type="text" class="form-input" id="ws_sim_lbl_mobile_he" value="${lblMobile.he}"><input type="text" class="form-input" id="ws_sim_lbl_mobile_ar" value="${lblMobile.ar}" dir="rtl">
                    <div>דוא"ל</div><input type="text" class="form-input" id="ws_sim_lbl_email_he" value="${lblEmail.he}"><input type="text" class="form-input" id="ws_sim_lbl_email_ar" value="${lblEmail.ar}" dir="rtl">
                    <div>תאריך המפגש</div><input type="text" class="form-input" id="ws_sim_lbl_date_he" value="${lblDate.he}"><input type="text" class="form-input" id="ws_sim_lbl_date_ar" value="${lblDate.ar}" dir="rtl">
                    <div>שעת המפגש</div><input type="text" class="form-input" id="ws_sim_lbl_time_he" value="${lblTime.he}"><input type="text" class="form-input" id="ws_sim_lbl_time_ar" value="${lblTime.ar}" dir="rtl">
                    <div>שם הסדנה</div><input type="text" class="form-input" id="ws_sim_lbl_workshop_he" value="${lblWorkshop.he}"><input type="text" class="form-input" id="ws_sim_lbl_workshop_ar" value="${lblWorkshop.ar}" dir="rtl">
                    <div>מספר משתתפים</div><input type="text" class="form-input" id="ws_sim_lbl_participants_he" value="${lblParticipants.he}"><input type="text" class="form-input" id="ws_sim_lbl_participants_ar" value="${lblParticipants.ar}" dir="rtl">
                    <div>הערות</div><input type="text" class="form-input" id="ws_sim_lbl_notes_he" value="${lblNotes.he}"><input type="text" class="form-input" id="ws_sim_lbl_notes_ar" value="${lblNotes.ar}" dir="rtl">
                </div>
                <div style="text-align:left; margin-top:16px;"><button class="btn btn-primary" onclick="App.saveWorkshopSimSettings()">💾 שמור את כל ההגדרות</button></div>
            </div>
        </div>
    `;
    setTimeout(() => App._initWorkshopSimIntroTinyMCE(), 100);
}

function autoFillSimResponsibleData() {
    const select = document.getElementById('ws_sim_resp_id');
    const selectedOption = select.options[select.selectedIndex];
    document.getElementById('ws_sim_resp_phone').value = selectedOption.getAttribute('data-phone') || '';
    document.getElementById('ws_sim_resp_email').value = selectedOption.getAttribute('data-email') || '';
}

function saveWorkshopSimSettings() {
    if (typeof tinymce !== 'undefined') {
        var editor = tinymce.get('ws_sim_intro_text');
        if (editor) editor.save();
    }
    const respSelect = document.getElementById('ws_sim_resp_id');
    const respOption = respSelect.options[respSelect.selectedIndex];
    const labels = {
        institutionCode: { he: document.getElementById('ws_sim_lbl_inst_he').value, ar: document.getElementById('ws_sim_lbl_inst_ar').value },
        contactPerson: { he: document.getElementById('ws_sim_lbl_contact_he').value, ar: document.getElementById('ws_sim_lbl_contact_ar').value },
        mobile: { he: document.getElementById('ws_sim_lbl_mobile_he').value, ar: document.getElementById('ws_sim_lbl_mobile_ar').value },
        email: { he: document.getElementById('ws_sim_lbl_email_he').value, ar: document.getElementById('ws_sim_lbl_email_ar').value },
        meetingDate: { he: document.getElementById('ws_sim_lbl_date_he').value, ar: document.getElementById('ws_sim_lbl_date_ar').value },
        meetingTime: { he: document.getElementById('ws_sim_lbl_time_he').value, ar: document.getElementById('ws_sim_lbl_time_ar').value },
        workshopName: { he: document.getElementById('ws_sim_lbl_workshop_he').value, ar: document.getElementById('ws_sim_lbl_workshop_ar').value },
        participants: { he: document.getElementById('ws_sim_lbl_participants_he').value, ar: document.getElementById('ws_sim_lbl_participants_ar').value },
        notes: { he: document.getElementById('ws_sim_lbl_notes_he').value, ar: document.getElementById('ws_sim_lbl_notes_ar').value }
    };
    const allowedDays = [];
    document.querySelectorAll('.ws-sim-day-checkbox:checked').forEach(cb => allowedDays.push(cb.value));
    const introText = document.getElementById('ws_sim_intro_text')?.value || '';
    const settings = (DataStore.getAll(SIM_SETTINGS_KEY) || [])[0] || {};
    const newData = {
        id: 'workshop_sim_settings_main',
        labels: labels, 
        allowedDays: allowedDays, 
        workshops: settings.workshops || [],
        responsible: { 
            id: respSelect.value, 
            name: respOption.text, 
            phone: document.getElementById('ws_sim_resp_phone').value, 
            email: document.getElementById('ws_sim_resp_email').value 
        },
        introText: introText, 
        updatedAt: new Date().toISOString()
    };
    
    console.log('💾 [Sim Settings] שומר הגדרות:', newData);
    
    const existing = (DataStore.getAll(SIM_SETTINGS_KEY) || []).find(item => item.id === 'workshop_sim_settings_main');
    if (existing) {
        DataStore.update(SIM_SETTINGS_KEY, existing.id, newData);
        console.log('✅ [Sim Settings] עודכן בהצלחה');
    } else {
        DataStore.create(SIM_SETTINGS_KEY, newData);
        console.log('✅ [Sim Settings] נוצר בהצלחה');
    }
    showToast('הגדרות הסדנאות (סימולציה) נשמרו בהצלחה!', 'success');
}

function openWorkshopSimModal(index) {
    const settings = (DataStore.getAll(SIM_SETTINGS_KEY) || [])[0] || {};
    const workshops = settings.workshops || [];
    let currentName = '', isEdit = false;
    if (index !== null && index !== undefined && index !== 'null') {
        const idx = parseInt(index);
        if (!isNaN(idx) && workshops[idx]) { currentName = workshops[idx].name || ''; isEdit = true; }
    }
    const title = isEdit ? 'עריכת סדנה (סימולציה)' : 'הוספת סדנה חדשה (סימולציה)';
    const btnText = isEdit ? '💾 שמור שינויים' : '➕ הוסף סדנה';
    const indexParam = isEdit ? index : 'null';
    
    let overlay = document.getElementById('ws_sim_modal_overlay');
    if (overlay) overlay.remove();
    overlay = document.createElement('div');
    overlay.id = 'ws_sim_modal_overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = `
        <div style="background:#fff;border-radius:12px;padding:32px;min-width:400px;max-width:90%;box-shadow:0 8px 32px rgba(0,0,0,0.2);">
            <h3 style="margin:0 0 20px 0;color:var(--primary);">${title}</h3>
            <div class="form-group"><label style="font-weight:600;margin-bottom:6px;display:block;">שם הסדנה *</label>
            <input type="text" id="ws_sim_workshop_name_input" class="form-input" value="${currentName}" placeholder="הזן שם סדנה"></div>
            <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:24px;">
                <button class="btn btn-primary" id="ws_sim_modal_save_btn">${btnText}</button>
                <button class="btn btn-outline" id="ws_sim_modal_cancel_btn">ביטול</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);
    document.getElementById('ws_sim_modal_save_btn').addEventListener('click', function() { App.saveWorkshopSimItem(indexParam); });
    document.getElementById('ws_sim_modal_cancel_btn').addEventListener('click', function() { overlay.remove(); });
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
    setTimeout(function() { var input = document.getElementById('ws_sim_workshop_name_input'); if (input) input.focus(); }, 100);
}

function saveWorkshopSimItem(index) {
    const nameInput = document.getElementById('ws_sim_workshop_name_input');
    const name = nameInput ? nameInput.value.trim() : '';
    if (!name) { showToast('יש להזין שם סדנה', 'error'); return; }
    const settings = (DataStore.getAll(SIM_SETTINGS_KEY) || [])[0] || {};
    let workshops = settings.workshops || [];
    const idx = (index === null || index === undefined || index === 'null') ? null : parseInt(index);
    if (idx !== null && !isNaN(idx)) { 
        if (workshops[idx]) { workshops[idx] = { name: name }; showToast('הסדנה עודכנה בהצלחה', 'success'); } 
    } else { 
        workshops.push({ name: name }); showToast('הסדנה נוספה בהצלחה', 'success'); 
    }
    settings.workshops = workshops;
    const existing = (DataStore.getAll(SIM_SETTINGS_KEY) || []).find(item => item.id === 'workshop_sim_settings_main');
    if (existing) DataStore.update(SIM_SETTINGS_KEY, existing.id, settings);
    else { settings.id = 'workshop_sim_settings_main'; DataStore.create(SIM_SETTINGS_KEY, settings); }
    const overlay = document.getElementById('ws_sim_modal_overlay'); if (overlay) overlay.remove();
    if (typeof App !== 'undefined' && typeof App.closeModal === 'function') App.closeModal();
    _renderWorkshopSimSettingsTab();
}

function editWorkshopSim(index) { App.openWorkshopSimModal(index); }
function deleteWorkshopSim(index) {
    if (!confirm('האם אתה בטוח שברצונך למחוק סדנה זו?')) return;
    const settings = (DataStore.getAll(SIM_SETTINGS_KEY) || [])[0] || {};
    let workshops = settings.workshops || [];
    if (index >= 0 && index < workshops.length) {
        workshops.splice(index, 1); settings.workshops = workshops;
        const existing = (DataStore.getAll(SIM_SETTINGS_KEY) || []).find(item => item.id === 'workshop_sim_settings_main');
        if (existing) DataStore.update(SIM_SETTINGS_KEY, existing.id, settings);
        showToast('הסדנה נמחקה בהצלחה', 'success'); _renderWorkshopSimSettingsTab();
    }
}
function deleteAllWorkshopsSim() {
    if (!confirm('⚠️ האם אתה בטוח שברצונך למחוק את כל רשימת הסדנאות? פעולה זו בלתי הפיכה.')) return;
    const settings = (DataStore.getAll(SIM_SETTINGS_KEY) || [])[0] || {};
    settings.workshops = [];
    const existing = (DataStore.getAll(SIM_SETTINGS_KEY) || []).find(item => item.id === 'workshop_sim_settings_main');
    if (existing) DataStore.update(SIM_SETTINGS_KEY, existing.id, settings);
    showToast('כל הסדנאות נמחקו', 'success'); _renderWorkshopSimSettingsTab();
}

function _renderWorkshopSimBookingsTab() {
    const bookings = (DataStore.getAll(SIM_BOOKINGS_KEY) || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    console.log('📋 [Sim Bookings] מספר הזמנות:', bookings.length);
    if (bookings.length === 0) {
        document.getElementById('workshopSimTabContent').innerHTML = `<div style="text-align:center; padding:60px 20px; color:var(--text-secondary);"><div style="font-size:64px; margin-bottom:16px;">📭</div><h3>אין הזמנות עדיין</h3><p>הזמנות יופיעו כאן לאחר שמשתמשים ימלאו את הטופס הציבורי.</p></div>`;
        return;
    }
    const statusColors = { 'pending': '#ffc107', 'approved': '#28a745', 'rejected': '#dc3545', 'completed': '#17a2b8', 'cancelled': '#6c757d' };
    const rowsHtml = bookings.map(b => `
        <tr>
            <td style="text-align:center;">${new Date(b.createdAt).toLocaleDateString('he-IL')}</td>
            <td>${escAttr(b.schoolName || '-')}</td>
            <td>${escAttr(b.contactPerson || '-')}</td>
            <td dir="ltr">${escAttr(b.mobile || '-')}</td>
            <td>${escAttr(b.workshopName || '-')}</td>
            <td>${b.meetingDate ? new Date(b.meetingDate).toLocaleDateString('he-IL') : '-'}</td>
            <td style="text-align:center;">
                <select class="form-select" style="padding:4px 8px; font-size:12px; font-weight:600; color:#fff; background:${statusColors[b.status] || '#6c757d'}; border:none; border-radius:12px; cursor:pointer;" onchange="App.updateWorkshopSimStatus('${b.id}', this.value)">
                    <option value="pending" ${b.status === 'pending' ? 'selected' : ''}>⏳ ממתין</option>
                    <option value="approved" ${b.status === 'approved' ? 'selected' : ''}>✅ אושרה</option>
                    <option value="rejected" ${b.status === 'rejected' ? 'selected' : ''}>❌ נדחתה</option>
                    <option value="completed" ${b.status === 'completed' ? 'selected' : ''}>🏁 הושלמה</option>
                    <option value="cancelled" ${b.status === 'cancelled' ? 'selected' : ''}>🚫 בוטלה</option>
                </select>
            </td>
            <td style="text-align:center; white-space:nowrap;">
                <button class="btn btn-sm btn-outline" onclick="App.viewWorkshopSimBookingDetails('${b.id}')" title="צפייה בפרטים">👁️</button>
                <button class="btn btn-sm btn-outline" onclick="App.printWorkshopSimBooking('${b.id}')" title="הדפסה">🖨️</button>
                <button class="btn btn-sm btn-success" onclick="App.replyWhatsappWorkshopSimBooking('${b.id}')" title="מענה בוואטסאפ">💬</button>
                <button class="btn btn-sm btn-danger" onclick="App.deleteWorkshopSimBooking('${b.id}')" title="מחיקה">🗑️</button>
            </td>
        </tr>
    `).join('');
    document.getElementById('workshopSimTabContent').innerHTML = `<div style="overflow-x:auto;"><table class="data-table"><thead><tr><th>תאריך הזמנה</th><th>בית ספר</th><th>איש קשר</th><th>טלפון</th><th>סדנה</th><th>תאריך מפגש</th><th>סטטוס</th><th>פעולות</th></tr></thead><tbody>${rowsHtml}</tbody></table></div>`;
}

function updateWorkshopSimStatus(id, newStatus) {
    const bookings = DataStore.getAll(SIM_BOOKINGS_KEY) || [];
    const bookingIndex = bookings.findIndex(b => b.id === id);
    if (bookingIndex === -1) return;
    bookings[bookingIndex].status = newStatus;
    bookings[bookingIndex].updatedAt = new Date().toISOString();
    DataStore.saveAll(SIM_BOOKINGS_KEY, bookings);
    let msg = 'סטטוס ההזמנה עודכן ל: ';
    if (newStatus === 'approved') msg += '✅ אושרה';
    else if (newStatus === 'rejected') msg += '❌ נדחתה (התאריך שוחרר)';
    else if (newStatus === 'completed') msg += '🏁 הושלמה';
    else if (newStatus === 'cancelled') msg += '🚫 בוטלה (התאריך שוחרר)';
    else msg += '⏳ ממתין';
    showToast(msg, 'success');
    _renderWorkshopSimBookingsTab();
}

function viewWorkshopSimBookingDetails(id) {
    const bookings = DataStore.getAll(SIM_BOOKINGS_KEY) || [];
    const b = bookings.find(x => x.id === id); if (!b) return;
    const statusLabels = { 'pending': 'ממתין לאישור', 'approved': 'אושרה', 'rejected': 'נדחתה', 'completed': 'הושלמה', 'cancelled': 'בוטלה' };
    const body = `<div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; font-size:14px; line-height:1.6;">
        <div><strong>📅 תאריך הזמנה:</strong><br>${new Date(b.createdAt).toLocaleString('he-IL')}</div>
        <div><strong>📊 סטטוס:</strong><br><span style="color:var(--primary); font-weight:bold;">${statusLabels[b.status] || b.status}</span></div>
        <div><strong>🏫 קוד מוסד:</strong><br>${escAttr(b.institutionCode || '-')}</div>
        <div><strong>🏫 בית ספר:</strong><br>${escAttr(b.schoolName || '-')}</div>
        <div><strong>👤 מנהל/ת בית הספר:</strong><br>${escAttr(b.principalName || '-')}</div>
        <div><strong>📞 איש קשר:</strong><br>${escAttr(b.contactPerson || '-')}</div>
        <div><strong>📱 טלפון:</strong><br><span dir="ltr">${escAttr(b.mobile || '-')}</span></div>
        <div><strong>📧 דוא"ל:</strong><br><span dir="ltr">${escAttr(b.contactEmail || '-')}</span></div>
        <div><strong>📚 שם הסדנה:</strong><br>${escAttr(b.workshopName || '-')}</div>
        <div><strong>👥 משתתפים:</strong><br>${escAttr(b.participantsCount || '-')}</div>
        <div><strong>🗓️ תאריך מפגש:</strong><br>${b.meetingDate ? new Date(b.meetingDate).toLocaleDateString('he-IL') : '-'}</div>
        <div><strong>⏰ שעה:</strong><br>${escAttr(b.startTime || '-')} עד ${escAttr(b.endTime || '-')}</div>
        <div style="grid-column:1/-1; background:#f8f9fa; padding:12px; border-radius:8px;"><strong>📝 הערות:</strong><br>${escAttr(b.notes || 'אין הערות')}</div>
    </div>`;
    showModal('פרטי הזמנה מלאים (סימולציה)', body, '<button class="btn btn-outline" onclick="App.closeModal()">סגור</button>');
}

function printWorkshopSimBooking(id) {
    const bookings = DataStore.getAll(SIM_BOOKINGS_KEY) || [];
    const b = bookings.find(x => x.id === id); if (!b) return;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`<html dir="rtl"><head><title>הדפסת הזמנה - ${b.schoolName}</title><style>body{font-family:Arial,sans-serif; padding:40px; line-height:1.6;} h2{color:#0ca7aa; border-bottom:2px solid #0ca7aa; padding-bottom:10px;} .row{display:flex; justify-content:space-between; margin-bottom:12px; border-bottom:1px dashed #ccc; padding-bottom:8px;} .label{font-weight:bold; color:#555;} .value{color:#000;} @media print{body{padding:0;}}</style></head><body>
    <h2>🎭 פרטי הזמנת סדנת סימולציה</h2>
    <div class="row"><span class="label">תאריך הפקת המסמך:</span><span class="value">${new Date().toLocaleDateString('he-IL')}</span></div>
    <div class="row"><span class="label">בית ספר:</span><span class="value">${b.schoolName} (קוד: ${b.institutionCode})</span></div>
    <div class="row"><span class="label">מנהל/ת בית הספר:</span><span class="value">${b.principalName}</span></div>
    <div class="row"><span class="label">איש קשר:</span><span class="value">${b.contactPerson} | ${b.mobile}</span></div>
    <div class="row"><span class="label">סדנה מבוקשת:</span><span class="value">${b.workshopName}</span></div>
    <div class="row"><span class="label">מספר משתתפים:</span><span class="value">${b.participantsCount || 'לא צוין'}</span></div>
    <div class="row"><span class="label">תאריך ושעת המפגש:</span><span class="value">${b.meetingDate ? new Date(b.meetingDate).toLocaleDateString('he-IL') : '-'} | ${b.startTime} - ${b.endTime}</span></div>
    <div class="row"><span class="label">הערות:</span><span class="value">${b.notes || 'אין'}</span></div>
    <br><br><p style="text-align:center; color:#888; font-size:12px;">מסמך זה הופק אוטומטית ממערכת מצפן נט.</p></body></html>`);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 500);
}

function replyWhatsappWorkshopSimBooking(id) {
    const bookings = DataStore.getAll(SIM_BOOKINGS_KEY) || [];
    const b = bookings.find(x => x.id === id);
    if (!b || !b.mobile) { showToast('לא נמצא מספר טלפון להזמנה זו', 'warning'); return; }
    const cleanPhone = b.mobile.replace(/[^0-9]/g, '');
    const message = encodeURIComponent(`שלום רב ${b.contactPerson || ''},\nתודה על הזמנת סדנת הסימולציה "${b.workshopName}" עבור ${b.schoolName}.\nאנו נחזור אליך בהקדם לאישור סופי.\nבברכה, צוות מצפן נט 🧭`);
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
}

function deleteWorkshopSimBooking(id) {
    if (!confirm('האם אתה בטוח שברצונך למחוק הזמנה זו לצמיתות? (התאריך ישוחרר)')) return;
    DataStore.remove(SIM_BOOKINGS_KEY, id);
    showToast('ההזמנה נמחקה בהצלחה', 'success');
    _renderWorkshopSimBookingsTab();
}

var _wsSimIntroTinyMCEInit = false;
function _initWorkshopSimIntroTinyMCE() {
    if (typeof tinymce === 'undefined') {
        console.warn('[Workshop Sim] TinyMCE not loaded yet');
        return;
    }
    if (_wsSimIntroTinyMCEInit) {
        try {
            var existingEditor = tinymce.get('ws_sim_intro_text');
            if (existingEditor) {
                existingEditor.save();
                existingEditor.destroy();
            }
        } catch(e) { console.error('[Workshop Sim] Error destroying editor:', e); }
        _wsSimIntroTinyMCEInit = false;
    }
    try {
        tinymce.init({
            selector: '#ws_sim_intro_text',
            base_url: './tinymce',
            suffix: '.min',
            readonly: false,
            statistics: false,
            height: 300,
            directionality: 'rtl',
            language: 'he_IL',
            plugins: 'advlist autolink lists link image charmap preview anchor searchreplace visualblocks code fullscreen insertdatetime media table wordcount help directionality',
            toolbar: 'undo redo | bold italic underline strikethrough | fontfamily fontsize | forecolor backcolor | alignleft aligncenter alignright justify | ltr rtl | bullist numlist | outdent indent | table | link image | hr | removeformat | code | help',
            content_style: 'body { font-family: Noto Sans Hebrew, Tajawal, Arial, sans-serif; font-size: 15px; line-height: 1.8; padding: 16px; direction: rtl; }',
            branding: false,
            promotion: false,
            resize: true,
            statusbar: true,
            paste_data_images: true,
            setup: function(editor) {
                editor.on('init', function() {
                    _wsSimIntroTinyMCEInit = true;
                    console.log('[Workshop Sim] TinyMCE intro editor initialized');
                });
            }
        });
    } catch(e) {
        console.error('[Workshop Sim] Error initializing TinyMCE:', e);
    }
}

var _wsIntroTinyMCEInit = false;
function _initWorkshopIntroTinyMCE() {
    if (typeof tinymce === 'undefined') {
        console.warn('[Workshop] TinyMCE not loaded yet');
        return;
    }
    if (_wsIntroTinyMCEInit) {
        try {
            var existingEditor = tinymce.get('ws_intro_text');
            if (existingEditor) {
                existingEditor.save();
                existingEditor.destroy();
            }
        } catch(e) { console.error('[Workshop] Error destroying editor:', e); }
        _wsIntroTinyMCEInit = false;
    }
    try {
        tinymce.init({
            selector: '#ws_intro_text',
            base_url: './tinymce',
            suffix: '.min',
            readonly: false,
            statistics: false,
            height: 300,
            directionality: 'rtl',
            language: 'en', // שים לב: 'en' מונע שגיאת 404 של he.js אם הקובץ חסר אצלך מקומית
            plugins: 'advlist autolink lists link image charmap preview anchor searchreplace visualblocks code fullscreen insertdatetime media table wordcount help directionality',
            toolbar: 'undo redo | bold italic underline strikethrough | fontfamily fontsize | forecolor backcolor | alignleft aligncenter alignright justify | ltr rtl | bullist numlist | outdent indent | table | link image | hr | removeformat | code | help',
            content_style: 'body { font-family: Noto Sans Hebrew, Tajawal, Arial, sans-serif; font-size: 15px; line-height: 1.8; padding: 16px; direction: rtl; } img { max-width: 100%; height: auto; } table { border-collapse: collapse; width: 100%; } td, th { border: 1px solid #ddd; padding: 8px; }',
            branding: false,
            promotion: false,
            resize: true,
            statusbar: true,
            paste_data_images: true,
            setup: function(editor) {
                editor.on('init', function() {
                    _wsIntroTinyMCEInit = true;
                    console.log('[Workshop] TinyMCE intro editor initialized');
                });
            }
        });
    } catch(e) {
        console.error('[Workshop] Error initializing TinyMCE:', e);
    }
}

// ============================================================
// MAIN EXPORT - APPLICATION MODULE - PUBLIC API
// ============================================================

/**
 * Main application module export
 * All public methods are exposed through this return statement
 * Organized by functional domains for clarity and maintainability
 */

return {
    // ============================================================
    // CORE APPLICATION LIFECYCLE
    // ============================================================
    init,
    showSection,
    printSection,
    logActivity,
    clearActivityLog,
    resetLocalStorage,
    executeImport,
    showToast,
    showModal,
    closeModal,

    // ============================================================
    // SIDEBAR & NAVIGATION
    // ============================================================
    renderSidebar,
    toggleSidebarMobile,
    closeSidebarMobile,

    // ============================================================
    // DASHBOARD
    // ============================================================
    renderDashboard,

    // ============================================================
    // HOME PAGE MANAGEMENT
    // ============================================================
    renderHomepage,
    _saveHomepageHeader,
    _saveHomepageContent,
    _saveHomepageFooter,
    _previewHomepageBanner,
    openHomepageNavModal,
    saveHomepageNavItem,
    deleteHomepageNavItem,
    moveHomepageNavItem,
    openHomepageSidebarModal,
    saveHomepageSidebarItem,
    deleteHomepageSidebarItem,
    moveHomepageSidebarItem,

    // ============================================================
    // MENTORS
    // ============================================================
    renderMentors,
    openMentorModal,
    saveMentor,
    deleteMentor,
    clearAllMentors,
    filterMentors,
    _mentorSetKpiFilter,

    // ============================================================
    // SOLUTIONS
    // ============================================================
    renderSolutions,
    openSolutionModal,
    saveSolution,
    viewSolution,
    deleteSolution,
    deleteAllSolutions,
    filterSolutions,
    toggleSolColumn,
    resetSolColumns,
    toggleSolDropdown,
    _onHebYearChange,
    _onTopicTypeChange,
    editSolutionPopulated,
    _espOnTopicTypeChange,
    _saveEditPopulated,
    _essOnRespTypeChange,
    _essSchoolInit,
    _essOnInput,
    _essOnKeyDown,
    _essSelectSchool,
    _essRemoveSchool,
    _essHighlightItem,
    _essCloseDropdown,
    _essOnDocClick,
    _guideDisplayName,
    _msInit,
    _msOnInput,
    _msOnKeyDown,
    _msSelectItem,
    _msRemoveTag,
    _msRemovePreSelectedName,
    _msRenderTags,
    _msCloseDropdown,
    _msHighlightItem,
    openCompleteDataModal,
    _cdUpdateCardStyles,
    _cdOnBudgetStatusChange,
    _cdRenderFundedStage2,
    _cdRenderNonFundedStage2,
    _cdBuildMentorRow,
    _cdOnTypeChange,
    _cdRecalc,
    _cdAddMentorInline,
    _cdRemoveMentorRow,
    _cdAddInternalForceRow,
    _saveCompleteData,
    _fmtDateRange,
    _filterMentorSearch,
    _selectMentorSearchItem,
    _closeMentorSearch,
    startNewSolutionFlow,
    _selectResponsibilityType,
    _backToResponsibilitySelection,
    _ssSchoolInit,
    _ssOnInput,
    _ssOnKeyDown,
    _ssSelectSchool,
    _ssRemoveSchool,
    _ssHighlightItem,
    _ssCloseDropdown,
    _nsfOnTopicTypeChange,
    _initNsfTinyMCE,
    _saveNewSolution,

    // ============================================================
    // SOLUTION INSTITUTIONS
    // ============================================================
    openSolInstModal,
    saveSolInst,
    editSolInst,
    deleteSolInst,
    _fillInstFromRepo,

    // ============================================================
    // HOURS DETAIL
    // ============================================================
    openHoursDetailModal,
    saveHoursDetail,
    _updateHoursDetailValidation,
    _updateHoursValidation,

    // ============================================================
    // GUIDES
    // ============================================================
    renderGuides,

    // ============================================================
    // GUIDES REPOSITORY
    // ============================================================
    renderGuidesRepo,
    openGuideRepoModal,
    saveGuideRepo,
    deleteGuideRepo,
    clearAllGuidesRepo,
    filterGuidesRepo,
    _previewGuideImage,
    moveGuideRepo,

    // ============================================================
    // BUDGETS
    // ============================================================
    renderBudgets,
    openBudgetModal,
    saveBudget,
    deleteBudget,
    deleteAllBudgets,
    filterBudgets,
    _onBHebYear,

    // ============================================================
    // PERIODS
    // ============================================================
    renderPeriods,
    openPeriodModal,
    savePeriod,
    deletePeriod,
    _onPHebYear,
    _loadActivePeriod,
    _getActivePeriodRange,
    _renderActivePeriodBadge,
    _switchActivePeriod,
    _resolveDisplayPeriod,
    _setDisplayPeriod,

    // ============================================================
    // LOOKUP TABLES
    // ============================================================
    renderLookupTables,
    switchLookupTab,
    openLookupModal,
    saveLookupItem,
    deleteLookupItem,
    clearAllLookupItems,
    moveLookupItem,

    // ============================================================
    // SCHOOLS & REGISTRATIONS
    // ============================================================
    renderRegistrations,
    openSchoolModal,
    saveSchool,
    deleteSchool,
    clearAllSchools,
    filterSchools,
    editRegistration,
    saveEditRegistration,
    deleteRegistration,
    clearAllRegistrations,
    filterRegistrations,
    _sortRegistrations,
    _toggleRegSortDir,
    _exportRegistrationsExcel,

    // ============================================================
    // INSPECTORS
    // ============================================================
    openInspectorModal,
    saveInspector,
    deleteInspector,
    clearAllInspectors,
    filterInspectors,

    // ============================================================
    // PEDAGOGICAL EXECUTIVES
    // ============================================================
    openPedExecModal,
    savePedExec,
    deletePedExec,
    clearAllPedExecs,
    filterPedExec,

    // ============================================================
    // PERMISSIONS
    // ============================================================
    renderPermissions,
    _permsOnUserChange,
    _permTogglePart,
    _permSetLevel,
    _permsResetUser,
    _permsSave,

    // ============================================================
    // ACTIVITY LOG
    // ============================================================
    renderActivityLog,
    filterActivityLog,

    // ============================================================
    // RECYCLE BIN
    // ============================================================
    renderRecycleBin,
    restoreFromRecycleBin,
    permanentDeleteFromRecycleBin,
    emptyRecycleBin,

    // ============================================================
    // FAQ
    // ============================================================
    renderFAQ,
    openFAQModal,
    saveFAQ,
    deleteFAQ,
    moveFAQ,
    deleteAllFAQ,
    toggleFaqSelectAll,
    deleteSelectedFAQs,
    _faqDragStart,
    _faqDragOver,
    _faqDrop,
    _faqDragEnd,

    // ============================================================
    // CUSTOM PAGES
    // ============================================================
    renderCustomPages,
    openCustomPageModal,
    saveCustomPage,
    editCustomPage,
    deleteCustomPage,
    previewCustomPage,
    _openPageLink,
    _copyPageLink,
    _cpOnMenuLocChange,

    // ============================================================
    // SETTINGS
    // ============================================================
    renderSettings,
    saveSiteSettings,
    _switchSettingsSub,
    _getSubSectionLabel,
    _toggleLinkVis,
    _addMentorFromForm,
    _onPerformerTypeChange,
    _openCpanelLink,
    _restoreCpanelUrl,
    _doConfirm,

    // ============================================================
    // DATA EXPORT & IMPORT
    // ============================================================
    exportCSV,
    exportExcel,
    exportExcelGuides,
    exportJSON,
    startImport,
    importJSON,
    downloadBudgetTemplate,
    _executeMentorsBatchImport,
    _cancelBatchImport,
    _downloadImportErrors,
    _downloadUpdateDetails,
    _triggerDataImport,
    _checkDataIntegrity,

    // ============================================================
    // DATA BACKUP & RESTORE
    // ============================================================
    backupFull,
    backupTable,
    restoreFull,
    restoreTable,
    _showSelectiveRestoreModal,
    _executeSelectiveRestore,
    clearData,
    _doClearAll,
    resetUserPassword,
    _backupTableCard,
    _backupFullCard,
    _triggerFullRestore,
    _triggerTableRestore,
    _updateBackupStatusUI,

    // ============================================================
    // HEALTH CHECK & MAINTENANCE
    // ============================================================
    _runHealthCheck,
    _showErrorLog,
    _attemptAutoFix,
    _doAutoFix,
    _copyErrorLog,
    _clearErrorLog,

    // ============================================================
    // COLUMN VISIBILITY
    // ============================================================
    _openColVisModal,
    _toggleColVis,
    _resetColVis,
    _goToPage,

    // ============================================================
    // COMMENTS
    // ============================================================
    openCommentModal,
    saveComment,
    deleteComment,

    // ============================================================
    // WHATSAPP INTEGRATION
    // ============================================================
    _openWhatsAppModal,
    _onWaSolutionChange,
    _onWaGreetingChange,
    _sendWhatsAppMessages,
    _renderWaTemplateEditor,
    _saveWaTemplates,
    _resetWaTemplates,
    _addWaTemplate,
    _openWaEditModal,
    _saveWaEditModal,
    _resetSingleWaTemplate,

    // ============================================================
    // WORKSHOPS - PEAK (פסגה)
    // ============================================================
    addWorkshop,
    removeWorkshop,
    renderWorkshopBookings,
    _switchWorkshopTab,
    _renderWorkshopSettingsTab,
    _renderWorkshopBookingsTab,
    getAllowedWorkshopDays,
    checkWorkshopDateAllowed,
    getAllowedDaysDescription,
    autoFillResponsibleData,
    saveWorkshopSettings,
    openWorkshopModal,
    saveWorkshopItem,
    editWorkshop,
    deleteWorkshop,
    deleteAllWorkshops,
    viewBookingDetails,
    printBooking,
    replyEmailBooking,
    replyWhatsappBooking,
    deleteBooking,
    _addRegistrationManual,
    _initRegAutocomplete,
    _saveManualRegistration,
    _initWorkshopIntroTinyMCE,

    // ============================================================
    // WORKSHOPS - SIMULATION (סימולציה)
    // ============================================================
    // --- פונקציות סדנאות סימולציה ---
    renderWorkshopSimBookings: renderWorkshopSimBookings,
    _switchWorkshopSimTab: _switchWorkshopSimTab,
    _renderWorkshopSimSettingsTab: _renderWorkshopSimSettingsTab,
    _renderWorkshopSimBookingsTab: _renderWorkshopSimBookingsTab,
    autoFillSimResponsibleData: autoFillSimResponsibleData,
    saveWorkshopSimSettings: saveWorkshopSimSettings,
    openWorkshopSimModal: openWorkshopSimModal,
    saveWorkshopSimItem: saveWorkshopSimItem,
    editWorkshopSim: editWorkshopSim,
    deleteWorkshopSim: deleteWorkshopSim,
    deleteAllWorkshopsSim: deleteAllWorkshopsSim,
    updateWorkshopSimStatus: updateWorkshopSimStatus,
    viewWorkshopSimBookingDetails: viewWorkshopSimBookingDetails,
    printWorkshopSimBooking: printWorkshopSimBooking,
    replyWhatsappWorkshopSimBooking: replyWhatsappWorkshopSimBooking,
    deleteWorkshopSimBooking: deleteWorkshopSimBooking,
    _initWorkshopSimIntroTinyMCE: _initWorkshopSimIntroTinyMCE,
	_initHpTinyMCE: _initHpTinyMCE,
	
    // ============================================================
    // Cluster (אשכולות)
    // ============================================================	
    renderClusters: renderClusters,
    openClusterModal: openClusterModal,
    updateClusterSolutionsList: updateClusterSolutionsList,
    addClusterChoiceModule: addClusterChoiceModule,
    saveCluster: saveCluster,
    deleteCluster: deleteCluster,
    saveClustersIntroText: saveClustersIntroText,
    _initClustersIntroTinyMCE: _initClustersIntroTinyMCE,
	_switchClustersTab: _switchClustersTab,
    _renderClustersManagementTab: _renderClustersManagementTab,
    _renderClustersRegistrationsTab: _renderClustersRegistrationsTab,
    updateClusterRegistrationStatus: updateClusterRegistrationStatus,
    viewClusterRegistration: viewClusterRegistration,
    deleteClusterRegistration: deleteClusterRegistration,
    deleteAllClusterRegistrations: deleteAllClusterRegistrations,
    exportClusterRegistrationsExcel: exportClusterRegistrationsExcel,
    exportClusterRegistrationsCSV: exportClusterRegistrationsCSV,
    importClusterRegistrationsExcel: importClusterRegistrationsExcel,
    printClusterRegistrations: printClusterRegistrations
	
};


// 🔑 פונקציה לפתיחה/סגירה של תפריט בחירת עמודות
function toggleSolDropdown(event) {
    if (event) event.stopPropagation();
    var dropdown = document.getElementById('solColVisDropdown');
    if (dropdown) {
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    }
}

// 🔑 האזנה גלובלית לסגירת התפריט כשלוחצים מחוץ לו
document.addEventListener('click', function(event) {
    var dropdown = document.getElementById('solColVisDropdown');
    if (dropdown && dropdown.style.display === 'block') {
        if (!dropdown.contains(event.target)) {
            dropdown.style.display = 'none';
        }
    }
});


// 🔑 פונקציות לניהול תצוגת עמודות בקטלוג פתרונות למידה
function toggleSolColumn(key, isVisible) {
    let visibleKeys = JSON.parse(localStorage.getItem('matspanet_sol_cols') || 'null');
    const defaultVisible = ['solName', 'schoolName', 'guide', 'domain', 'startDate', 'academicHours', 'instructors', 'actions'];
    if (!visibleKeys || !Array.isArray(visibleKeys)) {
        visibleKeys = [...defaultVisible];
    }
    
    if (isVisible) {
        if (!visibleKeys.includes(key)) visibleKeys.push(key);
    } else {
        visibleKeys = visibleKeys.filter(k => k !== key);
    }
    
    localStorage.setItem('matspanet_sol_cols', JSON.stringify(visibleKeys));
    renderSolutions(); // רענון מיידי של הטבלה
}

function resetSolColumns() {
    localStorage.removeItem('matspanet_sol_cols');
    // סגירת התפריט
    var dropdown = document.getElementById('solColVisDropdown');
    if (dropdown) dropdown.style.display = 'none';
    // רענון הטבלה
    renderSolutions();
}




// 🔍 כלי אבחון לשלמות נתונים
window.checkTableData = async function(tableName, keyName) {
    console.log(`\n=== בדיקת שלמות נתונים: ${tableName} ===`);
    
    // 1. בדיקה ישירה מול קובץ ה-JSON בשרת (עוקף את כל המערכת)
    try {
        const serverRes = await fetch(`./data/${tableName}.json?t=${Date.now()}`);
        const serverData = await serverRes.json();
        console.log(`1. 📁 בשרת (קובץ JSON): ${serverData.length} רשומות`);
    } catch(e) {
        console.error(`1. 📁 שגיאה בקריאה מהשרת:`, e);
    }

    // 2. בדיקה מול ה-DataStore (מה שהדפדפן מציג)
    const storeData = DataStore.getAll(keyName) || [];
    console.log(`2. 🧠 ב-DataStore (זיכרון הדפדפן): ${storeData.length} רשומות`);

    // 3. בדיקה מול localStorage
    const lsRaw = localStorage.getItem('matspanet_' + keyName);
    const lsData = lsRaw ? JSON.parse(lsRaw) : [];
    console.log(`3. 💾 ב-localStorage: ${lsData.length} רשומות`);

    // מסקנה אוטומטית
    if (serverData.length > 0 && storeData.length === 0) {
        console.error("❌ שגיאה קריטית: הנתונים קיימים בשרת, אך לא נטענו ל-DataStore! (בעיית טעינה)");
    } else if (serverData.length === 0 && storeData.length > 0) {
        console.warn("⚠️ אזהרה: הנתונים קיימים בזיכרון, אך נמחקו מהשרת! (בעיית שמירה)");
    } else {
        console.log("✅ הנתונים תקינים ותואמים בכל המקומות.");
    }
    console.log("===================================\n");
};

})();
// App.init() is called from dashboard.html after DataStore.init() completes.