
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ElementDefinition, VisualTheme } from '../types';
import { Plus, Trash2, X, ChevronDown, Check, Calculator } from 'lucide-react';
import { evaluateCalculation } from '../utils/logic';

interface FormElementProps {
  element: ElementDefinition;
  value: any;
  onChange: (val: any) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
  theme?: VisualTheme;
  // We need the full formData context to calculate values
  formData?: any;
  // Props passed by ModePreview for debug/logic features
  hoveredFieldId?: string | null;
  setHoveredFieldId?: (id: string | null) => void;
  allElements?: ElementDefinition[];
}

const getOptionLabel = (opt: any): string => {
  if (typeof opt === 'string') return opt;
  if (typeof opt === 'object' && opt !== null) {
    return opt.label || opt.value || JSON.stringify(opt);
  }
  return String(opt);
};

export const RenderElement: React.FC<FormElementProps> = ({ element, value, onChange, onBlur, error, disabled, theme = { mode: 'type1', density: 'default', radius: 'medium' }, formData }) => {
  // --- RUNTIME SELF-HEALING ---
  // If the data has an invalid type (e.g. 'textInput'), map it to a valid one on the fly.
  let effectiveType = element.type;
  const rawType = (element.type || '').toLowerCase();

  const typeMap: Record<string, string> = {
    'textinput': 'text',
    'string': 'text',
    'textfield': 'text',
    'input': 'text',
    'bool': 'checkbox',
    'boolean': 'checkbox',
    'dropdown': 'select',
    'option': 'select',
    'checklist': 'checkbox',
    'int': 'number',
    'integer': 'number',
    'float': 'number',
    'money': 'currency',
    'calc': 'calculated',
    'formula': 'calculated'
  };

  if (typeMap[rawType]) {
    effectiveType = typeMap[rawType] as any;
  }
  // ---------------------------

  // Style Configuration Maps
  const densityConfig = {
    dense: {
      wrapper: "mb-2",
      inputHeight: "min-h-[30px]",
      padding: "px-2 py-0.5",
      fontSize: "text-xs",
      labelMb: "mb-0.5",
      labelSize: "text-xs",
      radioGap: "gap-1 mt-1",
      radioSize: "w-3 h-3",
      radioDot: "w-1.5 h-1.5",
      checkboxWrapper: "p-1.5",
      checkboxSize: "w-3 h-3",
      iconSize: "w-2.5 h-2.5",
      chipGap: "gap-1",
      chipText: "text-[10px]",
      chipPad: "px-1.5 py-0.5"
    },
    compact: {
      wrapper: "mb-4",
      inputHeight: "min-h-[36px]",
      padding: "px-3 py-1.5",
      fontSize: "text-sm",
      labelMb: "mb-1",
      labelSize: "text-sm",
      radioGap: "gap-2 mt-2",
      radioSize: "w-4 h-4",
      radioDot: "w-2 h-2",
      checkboxWrapper: "p-2",
      checkboxSize: "w-4 h-4",
      iconSize: "w-3 h-3",
      chipGap: "gap-1.5",
      chipText: "text-xs",
      chipPad: "px-2 py-0.5"
    },
    default: {
      wrapper: "mb-6",
      inputHeight: "min-h-[50px]",
      padding: "px-4 py-3",
      fontSize: "text-lg",
      labelMb: "mb-3",
      labelSize: "text-[1.125rem]",
      radioGap: "gap-3 mt-4",
      radioSize: "w-6 h-6",
      radioDot: "w-3 h-3",
      checkboxWrapper: "p-3",
      checkboxSize: "w-6 h-6",
      iconSize: "w-4 h-4",
      chipGap: "gap-2",
      chipText: "text-sm",
      chipPad: "px-3 py-1"
    },
    spacious: {
      wrapper: "mb-10",
      inputHeight: "min-h-[64px]",
      padding: "px-6 py-4",
      fontSize: "text-xl",
      labelMb: "mb-4",
      labelSize: "text-xl",
      radioGap: "gap-5 mt-5",
      radioSize: "w-8 h-8",
      radioDot: "w-4 h-4",
      checkboxWrapper: "p-5",
      checkboxSize: "w-8 h-8",
      iconSize: "w-5 h-5",
      chipGap: "gap-3",
      chipText: "text-base",
      chipPad: "px-4 py-2"
    }
  };

  const radiusConfig = {
    none: "rounded-none",
    small: "rounded",
    medium: "rounded-xl",
    large: "rounded-2xl"
  };

  const isType2 = theme.mode === 'type2';
  const isType3 = theme.mode === 'type3';

  // --- THEME COLOR CLASSES ---
  const inputBgClass = 'bg-white';

  const inputTextClass = isType2
    ? 'text-sw-teal placeholder-gray-400'
    : isType3
      ? 'text-[#323233] placeholder-gray-400'
      : 'text-sw-teal placeholder-gray-400';

  const inputBorderClass = isType2
    ? 'border-gray-300 focus:border-sw-red focus:ring-sw-red'
    : isType3
      ? 'border-gray-300 focus:border-[#006a4d] focus:ring-[#006a4d]'
      : 'border-sw-teal focus:border-sw-teal focus:ring-sw-teal';

  const labelTextClass = isType2
    ? 'text-sw-teal'
    : isType3
      ? 'text-[#006a4d]'
      : 'text-sw-teal';

  const staticTextClass = isType2
    ? 'text-sw-teal'
    : isType3
      ? 'text-[#323233]'
      : 'text-sw-teal';

  const errorHoverClass = isType2
    ? "hover:border-sw-red"
    : isType3
      ? "hover:border-[#006a4d]"
      : "hover:border-sw-teal";

  const d = densityConfig[theme.density];
  const r = radiusConfig[theme.radius];

  const baseClasses = `w-full ${d.inputHeight} ${d.padding} ${d.fontSize} border ${inputBorderClass} ${r} focus:outline-none focus:shadow-input-focus focus:ring-1 transition-all ${inputBgClass} ${inputTextClass} font-sans`;

  const errorColorText = isType3 ? 'text-[#c04318]' : 'text-sw-red';
  const errorBorderBg = isType3 ? 'border-[#c04318] bg-[#fff6f5] focus:border-[#c04318] focus:ring-[#c04318]' : 'border-sw-error bg-[#fff6f5] focus:border-sw-error focus:ring-sw-error';

  const errorClasses = error
    ? `${errorBorderBg} ${errorColorText} focus:ring-1`
    : errorHoverClass;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const Label = () => (
    <label className={`block font-bold ${labelTextClass} ${d.labelSize} ${d.labelMb}`}>
      {element.label}
      {element.required && <span className={`${errorColorText} ml-1`} title="Required">*</span>}
    </label>
  );

  const ErrorMsg = () => error ? <p className={`text-sm ${errorColorText} mt-2 font-medium flex items-center gap-2 before:content-[''] before:bg-[url('https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/alert-circle.svg')] before:w-4 before:h-4`}>{error}</p> : null;

  const getOptionLabel = (opt: any): string => {
    if (typeof opt === 'string') return opt;
    if (typeof opt === 'number') return String(opt);
    if (opt && typeof opt === 'object') {
      return opt.label || opt.value || opt.text || JSON.stringify(opt);
    }
    return '';
  };

  // --- Specific Render Logic based on EFFECTIVE Type ---

  if (effectiveType === 'calculated') {
    // Calculate value if formData is present
    useEffect(() => {
      if (formData && element.calculation) {
        const calculatedValue = evaluateCalculation(element.calculation, formData);
        // Only trigger change if value is different to avoid infinite loops
        if (calculatedValue !== value) {
          onChange(calculatedValue);
        }
      }
    }, [formData, element.calculation]); // Re-run when dependencies change

    // Calculate value for display (Independent of onChange for read-only modes)
    const displayValue = useMemo(() => {
      if (formData && element.calculation) {
        return evaluateCalculation(element.calculation, formData);
      }
      return value;
    }, [formData, element.calculation, value]);

    return (
      <div className={`${d.wrapper} group`}>
        <Label />
        <div className="relative w-full">
          <span className={`absolute left-0 top-0 bottom-0 flex items-center ${isType2 ? 'text-[#e61126]' : isType3 ? 'text-[#006a4d]' : 'text-sw-teal'}`}>
            <Calculator size={theme.density === 'dense' ? 14 : 18} />
          </span>
          <input
            type="text"
            readOnly
            className={`w-full ${d.inputHeight} ${d.padding} ${d.fontSize} pl-8 bg-transparent ${isType2 ? 'text-[#e61126]' : isType3 ? 'text-[#006a4d]' : 'text-sw-teal'} font-mono font-bold border-none focus:ring-0 cursor-default`}
            value={displayValue !== undefined && displayValue !== '' ? displayValue : ''}
            placeholder="0.00"
          />
        </div>
        <ErrorMsg />
      </div>
    );
  }

  if (effectiveType === 'static') {
    const isReflection = element.staticDataSource === 'field';
    let displayContent = value;
    if (isReflection) {
      if (typeof value === 'boolean' || value === 'true' || value === 'false') {
        displayContent = value === true || value === 'true' ? 'Yes' : 'No';
      } else if (value === undefined || value === null || value === '') {
        displayContent = '';
      }
    } else {
      displayContent = element.description || element.label;
    }

    return (
      <div className={`prose max-w-none ${d.wrapper}`}>
        {element.label && element.label !== 'New Field' && (
          <label className={`block font-bold ${labelTextClass} ${d.labelSize} ${d.labelMb}`}>
            {element.label}
          </label>
        )}
        {isReflection ? (
          <div className={`w-full px-0 ${d.fontSize} ${staticTextClass} ${r} min-h-[${theme.density === 'dense' ? '30px' : '50px'}] flex items-center`}>
            {displayContent ? (
              <span>{displayContent}</span>
            ) : (
              <span className={`italic opacity-60 text-gray-400`}>Empty value</span>
            )}
          </div>
        ) : (
          <p className={`font-sans ${d.fontSize} whitespace-pre-wrap ${staticTextClass}`}>{displayContent}</p>
        )}
      </div>
    );
  }

  // --- Shared List Styles ---
  const listContainerClass = isType2 || isType3 ? 'border-gray-300 bg-white' : 'border-sw-teal/30 bg-white';
  const listHeaderClass = isType2
    ? 'bg-[#ffe2e8] border-gray-200'
    : isType3
      ? 'bg-[#f1f1f1] border-gray-200'
      : 'bg-sw-lightGray border-gray-200';

  const listHeaderLabelClass = isType2
    ? 'text-[#e61126]'
    : isType3
      ? 'text-[#006a4d]'
      : 'text-gray-500';

  const listInputClass = isType2
    ? 'bg-white border-gray-300 focus:border-[#e61126] text-[#0b3239]'
    : isType3
      ? 'bg-white border-gray-300 focus:border-[#006a4d] text-[#323233]'
      : 'bg-white border-gray-200 focus:border-sw-teal text-sw-text';

  // --- Standard Inputs ---
  switch (effectiveType) {
    case 'text':
    case 'email':
      return (
        <div className={`${d.wrapper} group`}>
          <Label />
          <input
            type={effectiveType === 'email' ? 'email' : 'text'}
            disabled={disabled}
            className={`${baseClasses} ${errorClasses}`}
            value={value || ''}
            onChange={handleChange}
            onBlur={onBlur}
            placeholder={element.description}
          />
          <ErrorMsg />
        </div>
      );
    case 'number':
    case 'currency':
      return (
        <div className={`${d.wrapper} group`}>
          <Label />
          <div className="relative w-full">
            {effectiveType === 'currency' && (
              <span className={`absolute left-2 top-0 bottom-0 flex items-center font-bold ${d.fontSize} ${isType2 ? 'text-[#e61126]' : isType3 ? 'text-[#006a4d]' : 'text-sw-teal'}`}>£</span>
            )}
            <input
              type="number"
              disabled={disabled}
              step={effectiveType === 'currency' ? "0.01" : undefined}
              className={`${baseClasses} ${errorClasses} ${effectiveType === 'currency' ? (theme.density === 'dense' ? 'pl-5' : 'pl-8') : ''}`}
              value={value || ''}
              onChange={handleChange}
              onBlur={onBlur}
            />
          </div>
          <ErrorMsg />
        </div>
      );
    case 'textarea':
      return (
        <div className={`${d.wrapper} group`}>
          <Label />
          <textarea
            rows={theme.density === 'dense' ? 2 : 4}
            disabled={disabled}
            className={`${baseClasses} ${errorClasses} h-auto ${theme.density === 'dense' ? 'min-h-[60px]' : 'min-h-[120px]'}`}
            value={value || ''}
            onChange={handleChange}
            onBlur={onBlur}
            placeholder={element.description}
          />
          <ErrorMsg />
        </div>
      );
    case 'date':
      return (
        <div className={`${d.wrapper} group`}>
          <Label />
          <input
            type="date"
            disabled={disabled}
            className={`${baseClasses} ${errorClasses}`}
            value={value || ''}
            onChange={handleChange}
            onBlur={onBlur}
          />
          <ErrorMsg />
        </div>
      );
    case 'datetime':
      return (
        <div className={`${d.wrapper} group`}>
          <Label />
          <input
            type="datetime-local"
            disabled={disabled}
            className={`${baseClasses} ${errorClasses}`}
            value={value || ''}
            onChange={handleChange}
            onBlur={onBlur}
          />
          <ErrorMsg />
        </div>
      );
    case 'select':
      const options = element.options ? (Array.isArray(element.options) ? element.options : String(element.options).split(',')) : [];
      return (
        <div className={`${d.wrapper} group`}>
          <Label />
          <div className="relative w-full">
            <select
              disabled={disabled}
              className={`${baseClasses} ${errorClasses}`}
              value={value || ''}
              onChange={handleChange}
              onBlur={onBlur}
            >
              <option value="" className="text-gray-500">Please Select...</option>
              {options.map((opt, idx) => {
                const label = getOptionLabel(opt);
                return <option key={idx} value={label} className="text-gray-900">{label}</option>;
              })}
            </select>
          </div>
          <ErrorMsg />
        </div>
      );
    case 'multiselect':
      const msOptions = element.options ? (Array.isArray(element.options) ? element.options : String(element.options).split(',')) : [];
      const selectedValues = Array.isArray(value) ? value : value ? [value] : [];
      const [isOpen, setIsOpen] = useState(false);
      const wrapperRef = useRef<HTMLDivElement>(null);

      const toggleOption = (opt: string) => {
        const newValues = selectedValues.includes(opt)
          ? selectedValues.filter((v: string) => v !== opt)
          : [...selectedValues, opt];
        onChange(newValues);
      };

      const removeValue = (e: React.MouseEvent, opt: string) => {
        e.stopPropagation();
        const newValues = selectedValues.filter((v: string) => v !== opt);
        onChange(newValues);
      };

      useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
          if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
            setIsOpen(false);
          }
        }
        if (isOpen) {
          document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
          document.removeEventListener("mousedown", handleClickOutside);
        };
      }, [isOpen]);

      const chipBg = isType2 ? 'bg-[#e61126]' : isType3 ? 'bg-[#006a4d]' : 'bg-sw-teal';
      const activeItemBg = isType2 ? 'bg-[#ffe2e8] text-[#e61126]' : isType3 ? 'bg-[#f1f1f1] text-[#006a4d]' : 'bg-sw-teal/10 text-sw-teal';

      return (
        <div className={`${d.wrapper} group relative ${isOpen ? 'z-30' : ''}`} ref={wrapperRef}>
          <Label />
          <div
            className={`${baseClasses} ${errorClasses} h-auto flex flex-wrap items-center ${d.chipGap} cursor-pointer relative pr-8`}
            onClick={() => !disabled && setIsOpen(!isOpen)}
          >
            {selectedValues.length === 0 && (
              <span className="text-gray-400 pointer-events-none select-none">Select options...</span>
            )}
            {selectedValues.map((val: string) => (
              <span key={val} className={`${chipBg} text-white rounded-md ${d.chipPad} ${d.chipText} font-bold flex items-center gap-1 shadow-sm`}>
                {val}
                {!disabled && (
                  <span onClick={(e) => removeValue(e, val)} className="cursor-pointer hover:text-gray-200">
                    <X size={12} />
                  </span>
                )}
              </span>
            ))}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
              <ChevronDown size={16} />
            </div>
          </div>

          {isOpen && !disabled && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
              {msOptions.map((opt, idx) => {
                const label = getOptionLabel(opt);
                const isSelected = selectedValues.includes(label);
                return (
                  <div
                    key={idx}
                    onClick={() => toggleOption(label)}
                    className={`px-4 py-2 text-sm cursor-pointer flex items-center justify-between transition-colors ${isSelected ? activeItemBg : 'hover:bg-gray-50 text-gray-700'}`}
                  >
                    <span>{label}</span>
                    {isSelected && <Check size={14} />}
                  </div>
                );
              })}
              {msOptions.length === 0 && <div className="p-3 text-center text-gray-400 text-sm">No options defined</div>}
            </div>
          )}
          <ErrorMsg />
        </div>
      );

    case 'radio':
      const radioOpts = element.options ? (Array.isArray(element.options) ? element.options : String(element.options).split(',')) : [];
      const radioContainerClass = isType2 || isType3 ? 'bg-white border-gray-300' : 'bg-gray-100 border-gray-200';
      const radioUnselectedClass = 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50';
      const radioSelectedClass = isType2
        ? 'bg-[#e61126] text-white'
        : isType3
          ? 'bg-[#006a4d] text-white'
          : 'bg-sw-red text-white';

      return (
        <div className={`${d.wrapper} group`}>
          <Label />
          <div className={`flex w-full flex-wrap p-1 rounded-lg gap-1 border ${radioContainerClass}`}>
            {radioOpts.map((opt, idx) => {
              const label = getOptionLabel(opt);
              const isSelected = value === label;
              return (
                <label key={idx} className={`
                    cursor-pointer transition-all rounded-md flex-1 flex items-center justify-center text-center select-none relative
                    ${theme.density === 'dense' ? 'py-1 text-xs' : theme.density === 'compact' ? 'py-1.5 text-sm' : 'py-2 text-sm'}
                    ${isSelected
                    ? `${radioSelectedClass} font-bold shadow-md`
                    : radioUnselectedClass
                  }
                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                `}>
                  <input
                    type="radio"
                    name={element.id}
                    value={label}
                    checked={isSelected}
                    onChange={handleChange}
                    onBlur={onBlur}
                    disabled={disabled}
                    className="hidden"
                  />
                  {label}
                </label>
              );
            })}
          </div>
          <ErrorMsg />
        </div>
      );
    case 'checkbox':
      const checkWrapperClass = isType2 ? 'border-gray-300 hover:bg-[#ffe2e8] bg-white' : isType3 ? 'border-gray-300 hover:bg-[#f1f1f1] bg-white' : 'border-sw-teal hover:bg-sw-teal/5 bg-white';
      const checkTextClass = isType2 || isType3 ? 'text-[#0b3239]' : 'text-sw-text';
      const checkSquareClass = isType2 ? 'border-[#e61126] bg-white' : isType3 ? 'border-[#006a4d] bg-white' : 'border-sw-teal bg-white';
      const checkSquareActive = isType2 ? 'bg-[#e61126] border-[#e61126]' : isType3 ? 'bg-[#006a4d] border-[#006a4d]' : 'bg-sw-red border-sw-red';

      return (
        <div className={`${d.wrapper} group`}>
          <label className={`flex items-center gap-3 cursor-pointer group/checkbox ${d.checkboxWrapper} border ${r} transition-colors ${checkWrapperClass}`}>
            <div className={`${d.checkboxSize} border ${radiusConfig.small} flex items-center justify-center ${(value === true || value === 'true') ? checkSquareActive : checkSquareClass}`}>
              {(value === true || value === 'true') && (
                <svg className={`${d.iconSize} text-white`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <input
              type="checkbox"
              checked={value === 'true' || value === true}
              onChange={(e) => onChange(e.target.checked)}
              onBlur={onBlur}
              className="hidden"
            />
            <span className={`${d.fontSize} font-bold ${checkTextClass}`}>
              {element.label}
              {element.required && <span className={`${errorColorText} ml-1`}>*</span>}
            </span>
          </label>
          <ErrorMsg />
        </div>
      );

    case 'repeater':
      const columns = element.columns || [];
      const rows = Array.isArray(value) ? value : [];

      const handleAddRow = () => {
        onChange([...rows, {}]);
      };

      const handleRemoveRow = (index: number) => {
        const newRows = [...rows];
        newRows.splice(index, 1);
        onChange(newRows);
      };

      const handleRowChange = (index: number, field: string, val: any) => {
        const newRows = [...rows];
        newRows[index] = { ...newRows[index], [field]: val };
        onChange(newRows);
      };



      return (
        <div className={`${d.wrapper} group`}>
          <Label />
          <div className={`border rounded-lg overflow-hidden shadow-sm ${listContainerClass}`}>
            {/* Header */}
            <div className={`border-b grid gap-2 px-4 py-2 ${listHeaderClass}`} style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr) 40px` }}>
              {columns.map(col => (
                <div key={col.id} className={`text-xs font-bold uppercase tracking-wide ${listHeaderLabelClass}`}>
                  {col.label}
                </div>
              ))}
              <div className={`text-xs font-bold uppercase ${listHeaderLabelClass}`}></div>
            </div>

            {/* Rows */}
            <div className={`divide-y divide-gray-100`}>
              {rows.map((row, rowIdx) => (
                <div key={rowIdx} className="grid gap-2 px-4 py-2 items-start" style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr) 40px` }}>
                  {columns.map(col => (
                    <div key={col.id}>
                      {col.type === 'select' ? (
                        <select
                          disabled={disabled}
                          className={`w-full text-xs p-2 border rounded outline-none focus:ring-1 ${listInputClass}`}
                          value={row[col.id] || ''}
                          onChange={(e) => handleRowChange(rowIdx, col.id, e.target.value)}
                        >
                          <option value="">Select...</option>
                          {col.options?.map((opt, i) => (
                            <option key={i} value={opt} className="text-gray-900">{opt}</option>
                          ))}
                        </select>
                      ) : col.type === 'checkbox' ? (
                        <input
                          type="checkbox"
                          disabled={disabled}
                          checked={row[col.id] === true}
                          onChange={(e) => handleRowChange(rowIdx, col.id, e.target.checked)}
                          className="mt-2"
                        />
                      ) : (
                        <input
                          type={col.type}
                          disabled={disabled}
                          className={`w-full text-xs p-2 border rounded outline-none focus:ring-1 ${listInputClass}`}
                          value={row[col.id] || ''}
                          onChange={(e) => handleRowChange(rowIdx, col.id, e.target.value)}
                          placeholder={col.label}
                        />
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => handleRemoveRow(rowIdx)}
                    disabled={disabled}
                    className="text-gray-400 hover:text-sw-red p-2 transition-colors flex justify-center"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {rows.length === 0 && (
                <div className={`p-8 text-center text-sm italic text-gray-400 bg-gray-50/50`}>
                  No items added yet.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className={`border-t p-2 ${isType2 ? 'bg-gray-50 border-gray-200' : 'bg-gray-50 border-gray-200'}`}>
              <button
                onClick={handleAddRow}
                disabled={disabled}
                className={`w-full py-2 border border-dashed rounded text-xs font-bold transition-all flex items-center justify-center gap-2 
                                ${isType2
                    ? 'border-gray-300 text-gray-500 hover:border-[#e61126] hover:text-[#e61126] hover:bg-white'
                    : isType3
                      ? 'border-gray-300 text-gray-500 hover:border-[#006a4d] hover:text-[#006a4d] hover:bg-white'
                      : 'border-gray-300 text-gray-500 hover:border-sw-teal hover:text-sw-teal hover:bg-white'
                  }`}
              >
                <Plus size={14} /> Add {element.label || 'Item'}
              </button>
            </div>
          </div>
          <ErrorMsg />
        </div>
      );

    case 'manage_requirements':

      const mrDocs = element.options ? (Array.isArray(element.options) ? element.options : String(element.options).split(',')) : [];
      const mrRows = Array.isArray(value) ? value : [];
      const mrColumns = [
        { id: 'docName', label: 'Document Name' },
        { id: 'party', label: 'Party' },
        { id: 'method', label: 'Request Method' },
        { id: 'status', label: 'Status' },
        { id: 'targetDate', label: 'Target Date' }
      ];

      const handleAddMrRow = () => {
        onChange([...mrRows, {}]);
      };

      const handleRemoveMrRow = (index: number) => {
        const newRows = [...mrRows];
        newRows.splice(index, 1);
        onChange(newRows);
      };

      const handleMrRowChange = (index: number, field: string, val: any) => {
        const newRows = [...mrRows];
        newRows[index] = { ...newRows[index], [field]: val };
        onChange(newRows);
      };

      return (
        <div className={`${d.wrapper} group`}>
          <Label />
          <div className={`border rounded-lg overflow-hidden shadow-sm ${listContainerClass}`}>
            {/* Header */}
            <div className={`border-b grid gap-2 px-4 py-2 ${listHeaderClass}`} style={{ gridTemplateColumns: `3fr 2fr 1.5fr 2fr 1.5fr 40px` }}>
              {mrColumns.map(col => (
                <div key={col.id} className={`text-xs font-bold uppercase tracking-wide ${listHeaderLabelClass}`}>
                  {col.label}
                </div>
              ))}
              <div className={`text-xs font-bold uppercase ${listHeaderLabelClass}`}></div>
            </div>

            {/* Rows */}
            <div className={`divide-y divide-gray-100`}>
              {mrRows.map((row: any, rowIdx: number) => (
                <div key={rowIdx} className="grid gap-2 px-4 py-2 items-start" style={{ gridTemplateColumns: `3fr 2fr 1.5fr 2fr 1.5fr 40px` }}>
                  {/* Document Name */}
                  <div>
                    <select
                      disabled={disabled}
                      className={`w-full text-xs p-2 border rounded outline-none focus:ring-1 ${listInputClass}`}
                      value={row.docName || ''}
                      onChange={(e) => handleMrRowChange(rowIdx, 'docName', e.target.value)}
                    >
                      <option value="">Select Document...</option>
                      {mrDocs.map((opt: any, i: number) => {
                        const label = getOptionLabel(opt);
                        return <option key={i} value={label} className="text-gray-900">{label}</option>;
                      })}
                    </select>
                  </div>

                  {/* Party */}
                  <div>
                    <input
                      type="text"
                      disabled={disabled}
                      className={`w-full text-xs p-2 border rounded outline-none focus:ring-1 ${listInputClass}`}
                      value={row.party || ''}
                      onChange={(e) => handleMrRowChange(rowIdx, 'party', e.target.value)}
                      placeholder="Party Name"
                    />
                  </div>

                  {/* Method */}
                  <div>
                    <select
                      disabled={disabled}
                      className={`w-full text-xs p-2 border rounded outline-none focus:ring-1 ${listInputClass}`}
                      value={row.method || ''}
                      onChange={(e) => handleMrRowChange(rowIdx, 'method', e.target.value)}
                    >
                      <option value="">Method...</option>
                      <option value="Email">Email</option>
                      <option value="Post">Post</option>
                      <option value="Telephone">Telephone</option>
                    </select>
                  </div>

                  {/* Status */}
                  <div>
                    <select
                      disabled={disabled}
                      className={`w-full text-xs p-2 border rounded outline-none focus:ring-1 ${listInputClass}`}
                      value={row.status || ''}
                      onChange={(e) => handleMrRowChange(rowIdx, 'status', e.target.value)}
                    >
                      <option value="">Status...</option>
                      <option value="Awaiting send">Awaiting send</option>
                      <option value="Sent - Awaiting response">Sent - Awaiting response</option>
                      <option value="Received">Received</option>
                    </select>
                  </div>

                  {/* Target Date */}
                  <div>
                    <input
                      type="date"
                      disabled={disabled}
                      className={`w-full text-xs p-2 border rounded outline-none focus:ring-1 ${listInputClass}`}
                      value={row.targetDate || ''}
                      onChange={(e) => handleMrRowChange(rowIdx, 'targetDate', e.target.value)}
                    />
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => handleRemoveMrRow(rowIdx)}
                    disabled={disabled}
                    className="text-gray-400 hover:text-sw-red p-2 transition-colors flex justify-center"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {mrRows.length === 0 && (
                <div className={`p-8 text-center text-sm italic text-gray-400 bg-gray-50/50`}>
                  No requirements added yet.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className={`border-t p-2 ${isType2 ? 'bg-gray-50 border-gray-200' : 'bg-gray-50 border-gray-200'}`}>
              <button
                onClick={handleAddMrRow}
                disabled={disabled}
                className={`w-full py-2 border border-dashed rounded text-xs font-bold transition-all flex items-center justify-center gap-2 
                                ${isType2
                    ? 'border-gray-300 text-gray-500 hover:border-[#e61126] hover:text-[#e61126] hover:bg-white'
                    : isType3
                      ? 'border-gray-300 text-gray-500 hover:border-[#006a4d] hover:text-[#006a4d] hover:bg-white'
                      : 'border-gray-300 text-gray-500 hover:border-sw-teal hover:text-sw-teal hover:bg-white'
                  }`}
              >
                <Plus size={14} /> Add Requirement
              </button>
            </div>
          </div>
          <ErrorMsg />
        </div>
      );

    default:
      return <div className="text-sw-red p-4 border border-sw-red bg-[#fff6f5] rounded-xl">Unknown type: {element.type}</div>;
  }
};
