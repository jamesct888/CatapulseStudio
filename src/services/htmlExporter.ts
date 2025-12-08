

import { ProcessDefinition, VisualTheme } from '../types';

export const generateStandaloneHTML = (processDef: ProcessDefinition, theme: VisualTheme): string => {
  const processJson = JSON.stringify(processDef);
  const themeJson = JSON.stringify(theme);

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${processDef.name} - Prototype</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script>
      tailwind.config = {
        theme: {
          extend: {
            colors: {
              sw: {
                teal: '#0b3239',
                tealHover: '#062126',
                red: '#e61126',
                redHover: '#c40e20',
                lightGray: '#eee',
                lighterGray: '#fafafa',
                purpleLight: '#ede9ff',
                surface: '#ffffff',
                text: '#0b3239',
                error: '#db0f30'
              }
            },
            fontFamily: {
              sans: ['"Segoe UI"', 'Helvetica Neue', 'Arial', 'sans-serif'],
              serif: ['Georgia', 'Times New Roman', 'serif'],
            },
            borderRadius: {
              'xl': '12px',
              '2xl': '16px',
              'btn': '50px'
            },
            boxShadow: {
              'card': '0 0 8px 0 rgba(11,50,57,.04), 0 2px 5px 0 rgba(11,50,57,.06)',
              'input-focus': '0 0 0 2px #fff, 0 0 0 4px #0b3239'
            }
          }
        }
      }
    </script>
    <style>
      body { background-color: ${theme.mode === 'type2' ? '#e0e0e0' : '#fafafa'}; color: #0b3239; }
      /* Custom scrollbar for better feel */
      ::-webkit-scrollbar { width: 8px; }
      ::-webkit-scrollbar-track { background: #f1f1f1; }
      ::-webkit-scrollbar-thumb { background: #ccc; border-radius: 4px; }
      ::-webkit-scrollbar-thumb:hover { background: #0b3239; }
    </style>
</head>
<body>
    <div id="root"></div>

    <script type="text/babel">
        const { useState, useEffect, useMemo } = React;

        // --- INJECTED DATA ---
        const PROCESS_DEF = ${processJson};
        const THEME = ${themeJson};

        // --- ICONS (Inline SVGs to remove dependencies) ---
        const Icons = {
            User: (props) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
            ArrowRight: (props) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>,
            ChevronRight: (props) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m9 18 6-6-6-6"/></svg>,
            Check: (props) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="20 6 9 17 4 12"/></svg>,
            Trash: (props) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>,
            Plus: (props) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M5 12h14"/><path d="M12 5v14"/></svg>,
            Alert: (props) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>,
            PanelBottom: (props) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="3" x2="21" y1="15" y2="15"/></svg>
        };

        // --- LOGIC ENGINE ---
        const evaluateCondition = (condition, formData) => {
            const value = formData[condition.targetElementId];
            const targetValue = condition.value;
            
            switch (condition.operator) {
                case 'equals': return value == targetValue;
                case 'notEquals': return value != targetValue;
                case 'contains': return String(value || '').includes(String(targetValue));
                case 'greaterThan': return Number(value) > Number(targetValue);
                case 'lessThan': return Number(value) < Number(targetValue);
                case 'isEmpty': return value === undefined || value === '' || value === null;
                case 'isNotEmpty': return value !== undefined && value !== '' && value !== null;
                default: return false;
            }
        };

        const evaluateLogicGroup = (group, formData) => {
            if (!group || (!group.conditions.length && (!group.groups || !group.groups.length))) return true;
            const conditionsResult = group.conditions.map(c => evaluateCondition(c, formData));
            const groupsResult = group.groups ? group.groups.map(g => evaluateLogicGroup(g, formData)) : [];
            const allResults = [...conditionsResult, ...groupsResult];
            if (group.operator === 'AND') return allResults.every(r => r === true);
            else return allResults.some(r => r === true);
        };

        const isElementVisible = (element, formData) => {
            if (element.hidden) return false;
            if (!element.visibility) return true;
            return evaluateLogicGroup(element.visibility, formData);
        };
        
        const isSectionVisible = (section, formData) => {
            if (section.hidden) return false;
            if (!section.visibility) return true;
            return evaluateLogicGroup(section.visibility, formData);
        };

        const isElementRequired = (element, formData) => {
            if (element.required) return true;
            if (!element.requiredLogic) return false;
            return evaluateLogicGroup(element.requiredLogic, formData);
        };

        const validateValue = (element, value) => {
            if (!element.validation || element.validation.type === 'none') return null;
            if (value === undefined || value === null || value === '') return null;
            const strVal = String(value);
            // Basic regex patterns for standalone
            const patterns = {
                email: /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/,
                phone_uk: /^(\\+44|0)\\d{9,10}$/,
                nino_uk: /^[A-CEGHJ-PR-TW-Z]{1}[A-CEGHJ-NPR-TW-Z]{1}[0-9]{6}[A-D]{1}$/i
            };
            
            switch (element.validation.type) {
                case 'email': return patterns.email.test(strVal) ? null : 'Invalid email format';
                case 'phone_uk': return patterns.phone_uk.test(strVal.replace(/\\s/g, '')) ? null : 'Invalid UK phone number';
                case 'nino_uk': return patterns.nino_uk.test(strVal.replace(/\\s/g, '')) ? null : 'Invalid National Insurance Number';
                case 'date_future': return new Date(strVal) > new Date() ? null : 'Date must be in the future';
                case 'date_past': return new Date(strVal) < new Date() ? null : 'Date must be in the past';
                default: return null;
            }
        };

        // --- COMPONENTS ---
        
        const RenderElement = ({ element, value, onChange, onBlur, error, disabled }) => {
            const theme = THEME;
            const isType2 = theme.mode === 'type2';
            
            const densityMap = {
                dense: { wrapper: "mb-2", inputHeight: "h-[30px]", padding: "px-2 py-0.5", fontSize: "text-xs", labelMb: "mb-0.5", labelSize: "text-xs" },
                compact: { wrapper: "mb-4", inputHeight: "h-[36px]", padding: "px-3 py-1.5", fontSize: "text-sm", labelMb: "mb-1", labelSize: "text-sm" },
                default: { wrapper: "mb-6", inputHeight: "h-[50px]", padding: "px-4 py-3", fontSize: "text-lg", labelMb: "mb-3", labelSize: "text-[1.125rem]" },
                spacious: { wrapper: "mb-10", inputHeight: "h-[64px]", padding: "px-6 py-4", fontSize: "text-xl", labelMb: "mb-4", labelSize: "text-xl" }
            };
            const d = densityMap[theme.density];
            const r = theme.radius === 'none' ? 'rounded-none' : theme.radius === 'small' ? 'rounded' : theme.radius === 'large' ? 'rounded-2xl' : 'rounded-xl';
            
            // Dynamic Classes based on Theme Type
            const inputBorderClass = isType2 
                ? 'border-gray-300 focus:border-[#e61126] focus:ring-[#e61126]' 
                : 'border-sw-teal focus:border-sw-teal focus:ring-sw-teal';
            
            const inputTextClass = isType2 ? 'text-[#0b3239]' : 'text-sw-teal';
            const labelTextClass = isType2 ? 'text-[#0b3239]' : 'text-sw-teal';
            const errorHover = isType2 ? 'hover:border-[#e61126]' : 'hover:border-sw-teal';

            const baseClasses = \`w-full \${d.inputHeight} \${d.padding} \${d.fontSize} border \${inputBorderClass} \${r} focus:outline-none focus:shadow-input-focus focus:ring-1 transition-all bg-white \${inputTextClass} placeholder-gray-400 font-sans\`;
            const errorClasses = error ? "border-sw-error bg-[#fff6f5] focus:border-sw-error focus:ring-1 focus:ring-sw-error" : errorHover;

            const Label = () => (
                <label className={\`block font-bold \${labelTextClass} \${d.labelSize} \${d.labelMb}\`}>
                    {element.label}
                    {element.required && <span className="text-sw-red ml-1">*</span>}
                </label>
            );
            
            const ErrorMsg = () => error ? <p className="text-sm text-sw-red mt-2 font-medium flex items-center gap-2"><Icons.Alert />{error}</p> : null;

            if (element.type === 'static') {
                 const isReflection = element.staticDataSource === 'field';
                 let displayContent = value;
                 if (isReflection) {
                    if (value === true || value === 'true') displayContent = 'Yes';
                    else if (value === false || value === 'false') displayContent = 'No';
                 } else {
                    displayContent = element.description || element.label;
                 }
                 
                 return (
                    <div className={\`prose max-w-none \${d.wrapper}\`}>
                        {element.label && element.label !== 'New Field' && <label className={\`block font-bold \${labelTextClass} \${d.labelSize} \${d.labelMb}\`}>{element.label}</label>}
                        <div className={\`font-sans whitespace-pre-wrap \${labelTextClass}\`}>{displayContent}</div>
                    </div>
                 );
            }
            
            if (element.type === 'select') {
                const options = element.options ? (Array.isArray(element.options) ? element.options : String(element.options).split(',')) : [];
                return (
                    <div className={d.wrapper}>
                        <Label />
                        <select disabled={disabled} className={\`\${baseClasses} \${errorClasses}\`} value={value || ''} onChange={(e) => onChange(e.target.value)} onBlur={onBlur}>
                            <option value="">Please Select...</option>
                            {options.map((opt, i) => <option key={i} value={String(opt).trim()}>{String(opt).trim()}</option>)}
                        </select>
                        <ErrorMsg />
                    </div>
                );
            }
            
            if (element.type === 'radio') {
                const options = element.options ? (Array.isArray(element.options) ? element.options : String(element.options).split(',')) : [];
                const radioSelectedClass = isType2 ? 'bg-[#e61126] text-white' : 'bg-sw-teal text-white';
                return (
                    <div className={d.wrapper}>
                        <Label />
                        <div className="flex w-full flex-wrap bg-gray-100 p-1 rounded-lg gap-1 border border-gray-200">
                             {options.map((opt, i) => {
                                const label = String(opt).trim();
                                const isSelected = value === label;
                                return (
                                    <label key={i} className={\`cursor-pointer transition-all rounded-md flex-1 flex items-center justify-center text-center select-none py-2 text-sm \${isSelected ? \`\${radioSelectedClass} font-bold shadow-md\` : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'}\`}>
                                        <input type="radio" name={element.id} value={label} checked={isSelected} onChange={(e) => onChange(e.target.value)} className="hidden"/>
                                        {label}
                                    </label>
                                );
                             })}
                        </div>
                        <ErrorMsg />
                    </div>
                );
            }

            if (element.type === 'checkbox') {
                 const checkActive = isType2 ? 'bg-[#e61126] border-[#e61126]' : 'bg-sw-teal border-sw-teal';
                 const checkInactive = isType2 ? 'border-[#e61126] bg-white' : 'border-sw-teal bg-white';
                 return (
                    <div className={d.wrapper}>
                        <label className={\`flex items-center gap-3 cursor-pointer p-3 border \${inputBorderClass} \${r} hover:bg-opacity-5 transition-colors bg-white\`}>
                            <div className={\`w-6 h-6 border rounded flex items-center justify-center \${value === true || value === 'true' ? checkActive : checkInactive}\`}>
                                {(value === true || value === 'true') && <span className="text-white"><Icons.Check/></span>}
                            </div>
                            <input type="checkbox" checked={value === 'true' || value === true} onChange={(e) => onChange(e.target.checked)} className="hidden" />
                            <span className={\`font-bold \${labelTextClass}\`}>{element.label}</span>
                        </label>
                        <ErrorMsg />
                    </div>
                 );
            }
            
            if (element.type === 'repeater') {
                const columns = element.columns || [];
                const rows = Array.isArray(value) ? value : [];
                const handleAdd = () => onChange([...rows, {}]);
                const handleRemove = (idx) => { const n = [...rows]; n.splice(idx, 1); onChange(n); };
                const handleRowChange = (idx, field, val) => { const n = [...rows]; n[idx] = { ...n[idx], [field]: val }; onChange(n); };
                
                const headerBg = isType2 ? 'bg-[#ffe2e8]' : 'bg-sw-lightGray';
                
                return (
                    <div className={d.wrapper}>
                        <Label />
                        <div className={\`border \${isType2 ? 'border-gray-300' : 'border-sw-teal/30'} rounded-lg overflow-hidden bg-white shadow-sm\`}>
                            <div className={\`\${headerBg} border-b border-gray-200 grid gap-2 px-4 py-2\`} style={{ gridTemplateColumns: \`repeat(\${columns.length}, 1fr) 40px\` }}>
                                {columns.map(c => <div key={c.id} className={\`text-xs font-bold uppercase \${isType2 ? 'text-[#e61126]' : 'text-gray-500'}\`}>{c.label}</div>)}
                                <div></div>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {rows.map((row, rIdx) => (
                                    <div key={rIdx} className="grid gap-2 px-4 py-2 items-start" style={{ gridTemplateColumns: \`repeat(\${columns.length}, 1fr) 40px\` }}>
                                        {columns.map(c => (
                                            <div key={c.id}>
                                                {c.type === 'select' ? (
                                                    <select className="w-full text-xs p-2 border border-gray-200 rounded" value={row[c.id] || ''} onChange={(e) => handleRowChange(rIdx, c.id, e.target.value)}>
                                                        <option value="">Select...</option>
                                                        {(c.options || []).map((o, i) => <option key={i} value={o}>{o}</option>)}
                                                    </select>
                                                ) : (
                                                    <input type={c.type} className="w-full text-xs p-2 border border-gray-200 rounded" value={row[c.id] || ''} onChange={(e) => handleRowChange(rIdx, c.id, e.target.value)} />
                                                )}
                                            </div>
                                        ))}
                                        <button onClick={() => handleRemove(rIdx)} className="text-gray-400 hover:text-sw-red p-2"><Icons.Trash/></button>
                                    </div>
                                ))}
                                {rows.length === 0 && <div className="p-4 text-center text-sm text-gray-400 italic">No items.</div>}
                            </div>
                            <div className="bg-gray-50 border-t border-gray-200 p-2">
                                <button onClick={handleAdd} className="w-full py-2 border border-dashed border-gray-300 rounded text-xs font-bold text-gray-500 hover:text-sw-teal hover:border-sw-teal flex items-center justify-center gap-2"><Icons.Plus/> Add Item</button>
                            </div>
                        </div>
                    </div>
                );
            }

            return (
                <div className={d.wrapper}>
                    <Label />
                    {element.type === 'textarea' ? (
                        <textarea disabled={disabled} className={\`\${baseClasses} \${errorClasses} h-auto min-h-[120px]\`} value={value || ''} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} />
                    ) : (
                        <div className="relative w-full">
                            {element.type === 'currency' && <span className={\`absolute left-2 top-0 bottom-0 flex items-center font-bold \${isType2 ? 'text-[#e61126]' : 'text-sw-teal'}\`}>£</span>}
                            <input 
                                type={element.type === 'number' || element.type === 'currency' ? 'number' : element.type === 'date' ? 'date' : 'text'} 
                                disabled={disabled} 
                                className={\`\${baseClasses} \${errorClasses} \${element.type === 'currency' ? 'pl-8' : ''}\`} 
                                value={value || ''} 
                                onChange={(e) => onChange(e.target.value)} 
                                onBlur={onBlur} 
                            />
                        </div>
                    )}
                    <ErrorMsg />
                </div>
            );
        };

        const App = () => {
            const [currentStageIdx, setCurrentStageIdx] = useState(0);
            const [formData, setFormData] = useState({});
            const [formErrors, setFormErrors] = useState({});
            const [isCompleted, setIsCompleted] = useState(false);
            
            const isType2 = THEME.mode === 'type2';

            const currentStage = PROCESS_DEF.stages[currentStageIdx];
            const visibleSections = currentStage.sections.filter(sec => isSectionVisible(sec, formData));

            const handleNext = () => {
                const errors = {};
                let isValid = true;
                visibleSections.forEach(sec => {
                    sec.elements.forEach(el => {
                        if (isElementVisible(el, formData)) {
                            if (isElementRequired(el, formData) && (formData[el.id] === undefined || formData[el.id] === '')) {
                                errors[el.id] = "This field is required";
                                isValid = false;
                            }
                            const valMsg = validateValue(el, formData[el.id]);
                            if (valMsg) {
                                errors[el.id] = valMsg;
                                isValid = false;
                            }
                        }
                    });
                });
                setFormErrors(errors);
                
                if (isValid) {
                    if (currentStageIdx < PROCESS_DEF.stages.length - 1) {
                        setCurrentStageIdx(prev => prev + 1);
                        window.scrollTo(0, 0);
                    } else {
                        setIsCompleted(true);
                    }
                }
            };
            
            // Dynamic Classes
            const stageHeaderClass = isType2 ? 'bg-[#e61126] text-white' : 'bg-sw-teal text-white';
            const btnPrimaryClass = isType2 ? 'bg-[#0b3239] hover:bg-[#062126] text-white' : 'bg-sw-teal text-white hover:bg-sw-tealHover';

            if (isCompleted) {
                return (
                    <div className={\`min-h-screen \${isType2 ? 'bg-[#e0e0e0]' : 'bg-[#fafafa]'}\`}>
                         <header className="bg-white border-b border-gray-200 px-8 py-4 sticky top-0 z-50 shadow-sm flex items-center justify-between">
                             <div className="flex items-center gap-6">
                                <img src="https://www.lloydsbankinggroup.com/assets/images/our-brands/scottish-widows/sw-logo-1000x5501.png" alt="Scottish Widows" className="h-12" />
                                <div className="h-8 w-px bg-gray-200"></div>
                                <h1 className={\`text-lg font-serif font-bold \${isType2 ? 'text-[#0b3239]' : 'text-sw-teal'}\`}>{PROCESS_DEF.name}</h1>
                             </div>
                         </header>
                         <div className="max-w-4xl mx-auto py-12 px-6 flex items-center justify-center min-h-[60vh]">
                            <div className={\`w-full \${stageHeaderClass} p-12 rounded-2xl shadow-2xl text-center space-y-8\`}>
                                <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto text-sw-purpleLight">
                                    <Icons.Check width={40} height={40} />
                                </div>
                                <h1 className="text-4xl font-serif">Process Completed</h1>
                                <p className="text-lg opacity-80">Thank you for testing this prototype.</p>
                                <button onClick={() => window.location.reload()} className="px-8 py-3 bg-white text-sw-teal font-bold rounded-full hover:bg-sw-purpleLight transition-colors shadow-lg">Restart Prototype</button>
                            </div>
                        </div>
                    </div>
                );
            }

            return (
                <div className={\`min-h-screen \${isType2 ? 'bg-[#e0e0e0]' : 'bg-[#fafafa]'}\`}>
                    <header className="bg-white border-b border-gray-200 px-8 py-4 sticky top-0 z-50 shadow-sm flex items-center justify-between">
                         <div className="flex items-center gap-6">
                            <img src="https://www.lloydsbankinggroup.com/assets/images/our-brands/scottish-widows/sw-logo-1000x5501.png" alt="Scottish Widows" className="h-12" />
                            <div className="h-8 w-px bg-gray-200"></div>
                            <h1 className={\`text-lg font-serif font-bold \${isType2 ? 'text-[#0b3239]' : 'text-sw-teal'}\`}>{PROCESS_DEF.name}</h1>
                         </div>
                         <div className="text-xs font-mono text-gray-400">PROTOTYPE MODE</div>
                    </header>

                    <div className="max-w-5xl mx-auto py-12 px-6">
                        {/* Breadcrumbs */}
                        <nav className="flex items-center space-x-2 mb-12 text-sm overflow-x-auto pb-2 scrollbar-thin">
                            {PROCESS_DEF.stages.map((s, i) => {
                                const isPast = i < currentStageIdx;
                                const isCurrent = i === currentStageIdx;
                                return (
                                    <React.Fragment key={s.id}>
                                        <div className={\`flex items-center gap-2 whitespace-nowrap \${isCurrent ? (isType2 ? 'text-[#e61126] font-bold' : 'text-sw-teal font-bold') : isPast ? 'text-gray-500' : 'text-gray-400'}\`}>
                                            <div className={\`w-6 h-6 rounded-full flex items-center justify-center text-xs border transition-colors \${
                                                isPast ? (isType2 ? 'bg-[#e61126] text-white border-[#e61126]' : 'bg-sw-teal text-white border-sw-teal') :
                                                isCurrent ? (isType2 ? 'bg-white text-[#e61126] border-[#e61126] ring-4 ring-[#e61126]/10' : 'bg-white text-sw-teal border-sw-teal ring-4 ring-sw-teal/10') :
                                                'bg-white text-gray-400 border-gray-300'
                                            }\`}>
                                                {isPast ? <Icons.Check width={12} height={12} strokeWidth={3} /> : i + 1}
                                            </div>
                                            <span>{s.title}</span>
                                        </div>
                                        {i < PROCESS_DEF.stages.length - 1 && (
                                            <div className="text-gray-300 px-2"><Icons.ChevronRight width={16} height={16} /></div>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </nav>

                        <div className={\`bg-white shadow-card rounded-2xl border overflow-hidden min-h-[600px] relative \${isType2 ? 'border-[#e0e0e0]' : 'border-gray-100'}\`}>
                            <div className={\`p-6 \${stageHeaderClass}\`}>
                                <h3 className="text-xl font-bold">{currentStage.title}</h3>
                            </div>
                            
                            <div className="p-8 space-y-8">
                                {visibleSections.map(section => (
                                    <div key={section.id}>
                                        <h4 className={\`font-bold border-b border-gray-100 pb-2 mb-6 uppercase text-sm tracking-wide \${isType2 ? 'text-[#e61126]' : 'text-gray-800'}\`}>{section.title}</h4>
                                        <div className={\`grid gap-x-8 gap-y-2 \${section.layout === '2col' ? 'grid-cols-2' : section.layout === '3col' ? 'grid-cols-3' : 'grid-cols-1'}\`}>
                                            {section.elements.filter(el => isElementVisible(el, formData)).map(el => (
                                                <RenderElement
                                                    key={el.id}
                                                    element={{...el, required: isElementRequired(el, formData)}} 
                                                    value={formData[el.id]}
                                                    onChange={(val) => {
                                                        setFormData(prev => ({...prev, [el.id]: val}));
                                                        if (formErrors[el.id]) setFormErrors(prev => { const n = {...prev}; delete n[el.id]; return n; });
                                                    }}
                                                    onBlur={() => {
                                                        const msg = validateValue(el, formData[el.id]);
                                                        if (msg) setFormErrors(prev => ({...prev, [el.id]: msg}));
                                                    }}
                                                    error={formErrors[el.id]}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                {visibleSections.length === 0 && <div className="text-center py-10 text-gray-400 italic">No visible sections in this stage based on current data.</div>}
                            </div>

                            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                                <button 
                                    onClick={() => setCurrentStageIdx(prev => Math.max(0, prev - 1))}
                                    disabled={currentStageIdx === 0}
                                    className="px-6 py-2 rounded-lg font-bold text-gray-500 hover:text-sw-teal disabled:opacity-30"
                                >
                                    Back
                                </button>
                                <button 
                                    onClick={handleNext}
                                    className={\`px-8 py-3 rounded-full font-bold shadow-lg transition-all flex items-center gap-2 \${btnPrimaryClass}\`}
                                >
                                    {currentStageIdx === PROCESS_DEF.stages.length - 1 ? 'Submit' : 'Next Step'}
                                    <Icons.ArrowRight />
                                </button>
                            </div>
                        </div>
                        
                        <div className="mt-8 space-y-4">
                            {PROCESS_DEF.stages.flatMap(s => s.sections).filter(s => s.variant === 'summary' && isSectionVisible(s, formData)).map(summarySec => (
                                <div key={summarySec.id} className={\`\${isType2 ? 'bg-white border-[#e0e0e0]' : 'bg-sw-teal/5 border-sw-teal/20'} border rounded-xl p-6\`}>
                                    <h4 className={\`text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2 \${isType2 ? 'text-[#e61126]' : 'text-sw-teal'}\`}>
                                        <Icons.PanelBottom /> {summarySec.title}
                                    </h4>
                                    <div className={\`grid gap-4 \${summarySec.layout === '2col' ? 'grid-cols-2' : summarySec.layout === '3col' ? 'grid-cols-3' : 'grid-cols-1'}\`}>
                                        {summarySec.elements.filter(el => isElementVisible(el, formData)).map(el => (
                                            <RenderElement key={el.id} element={el} value={formData[el.id]} onChange={()=>{}} disabled />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            );
        };

        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<App />);
    </script>
</body>
</html>`;
};