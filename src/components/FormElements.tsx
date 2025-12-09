

import React from 'react';
import { ElementDefinition, VisualTheme } from '../types';
import { Plus, Trash2 } from 'lucide-react';

interface FormElementProps {
  element: ElementDefinition;
  value: any;
  onChange: (val: any) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
  theme?: VisualTheme;
}

export const RenderElement: React.FC<FormElementProps> = ({ element, value, onChange, onBlur, error, disabled, theme = { mode: 'type1', density: 'default', radius: 'medium' } }) => {
  // Style Configuration Maps
  const densityConfig = {
    dense: {
      wrapper: "mb-2",
      inputHeight: "h-[30px]",
      padding: "px-2 py-0.5",
      fontSize: "text-xs",
      labelMb: "mb-0.5",
      labelSize: "text-xs",
      radioGap: "gap-1 mt-1",
      radioSize: "w-3 h-3",
      radioDot: "w-1.5 h-1.5",
      checkboxWrapper: "p-1.5",
      checkboxSize: "w-3 h-3",
      iconSize: "w-2.5 h-2.5"
    },
    compact: {
      wrapper: "mb-4",
      inputHeight: "h-[36px]",
      padding: "px-3 py-1.5",
      fontSize: "text-sm",
      labelMb: "mb-1",
      labelSize: "text-sm",
      radioGap: "gap-2 mt-2",
      radioSize: "w-4 h-4",
      radioDot: "w-2 h-2",
      checkboxWrapper: "p-2",
      checkboxSize: "w-4 h-4",
      iconSize: "w-3 h-3"
    },
    default: {
      wrapper: "mb-6",
      inputHeight: "h-[50px]",
      padding: "px-4 py-3",
      fontSize: "text-lg",
      labelMb: "mb-3",
      labelSize: "text-[1.125rem]",
      radioGap: "gap-3 mt-4",
      radioSize: "w-6 h-6",
      radioDot: "w-3 h-3",
      checkboxWrapper: "p-3",
      checkboxSize: "w-6 h-6",
      iconSize: "w-4 h-4"
    },
    spacious: {
      wrapper: "mb-10",
      inputHeight: "h-[64px]",
      padding: "px-6 py-4",
      fontSize: "text-xl",
      labelMb: "mb-4",
      labelSize: "text-xl",
      radioGap: "gap-5 mt-5",
      radioSize: "w-8 h-8",
      radioDot: "w-4 h-4",
      checkboxWrapper: "p-5",
      checkboxSize: "w-8 h-8",
      iconSize: "w-5 h-5"
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
  // Backgrounds: All use white inputs generally
  const inputBgClass = 'bg-white';
  
  // Text
  const inputTextClass = isType2 
    ? 'text-[#0b3239] placeholder-gray-400' 
    : isType3 
        ? 'text-[#323233] placeholder-gray-400'
        : 'text-sw-teal placeholder-gray-400';
  
  // Borders
  const inputBorderClass = isType2 
    ? 'border-gray-300 focus:border-[#e61126] focus:ring-[#e61126]' 
    : isType3
        ? 'border-gray-300 focus:border-[#006a4d] focus:ring-[#006a4d]'
        : 'border-sw-teal focus:border-sw-teal focus:ring-sw-teal';
    
  // Label Text
  const labelTextClass = isType2 
    ? 'text-[#0b3239]' 
    : isType3 
        ? 'text-[#006a4d]' 
        : 'text-sw-teal';
  
  // Static Text
  const staticTextClass = isType2 
    ? 'text-[#0b3239]' 
    : isType3 
        ? 'text-[#323233]' 
        : 'text-sw-teal';

  // Error State Hover
  const errorHoverClass = isType2 
    ? "hover:border-[#e61126]" 
    : isType3 
        ? "hover:border-[#006a4d]" 
        : "hover:border-sw-teal";

  const d = densityConfig[theme.density];
  const r = radiusConfig[theme.radius];

  // Base input class construction
  const baseClasses = `w-full ${d.inputHeight} ${d.padding} ${d.fontSize} border ${inputBorderClass} ${r} focus:outline-none focus:shadow-input-focus focus:ring-1 transition-all ${inputBgClass} ${inputTextClass} font-sans`;
  // Assuming Error Red is somewhat universal, Type 3 specifies #c04318, we can stick with sw-error (#db0f30) or override. Let's override for Type 3.
  const errorColorText = isType3 ? 'text-[#c04318]' : 'text-sw-red';
  const errorBorderBg = isType3 ? 'border-[#c04318] bg-[#fff6f5] focus:border-[#c04318] focus:ring-[#c04318]' : 'border-sw-error bg-[#fff6f5] focus:border-sw-error focus:ring-sw-error';

  const errorClasses = error 
    ? `${errorBorderBg} ${errorColorText} focus:ring-1` 
    : errorHoverClass;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  if (element.type === 'static') {
    const isReflection = element.staticDataSource === 'field';
    // Format value for display if it's a reflection
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
        {/* Show label if it exists and isn't the default 'New Field' which might be distracting for pure text */}
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

  const Label = () => (
    <label className={`block font-bold ${labelTextClass} ${d.labelSize} ${d.labelMb}`}>
      {element.label}
      {element.required && <span className={`${errorColorText} ml-1`} title="Required">*</span>}
    </label>
  );

  const ErrorMsg = () => error ? <p className={`text-sm ${errorColorText} mt-2 font-medium flex items-center gap-2 before:content-[''] before:bg-[url('https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/alert-circle.svg')] before:w-4 before:h-4`}>{error}</p> : null;

  switch (element.type) {
    case 'text':
    case 'email':
      return (
        <div className={`${d.wrapper} group`}>
          <Label />
          <input
            type={element.type === 'email' ? 'email' : 'text'}
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
            {element.type === 'currency' && (
              <span className={`absolute left-2 top-0 bottom-0 flex items-center font-bold ${d.fontSize} ${isType2 ? 'text-[#e61126]' : isType3 ? 'text-[#006a4d]' : 'text-sw-teal'}`}>£</span>
            )}
            <input
              type="number"
              disabled={disabled}
              className={`${baseClasses} ${errorClasses} ${element.type === 'currency' ? (theme.density === 'dense' ? 'pl-5' : 'pl-8') : ''}`}
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
                const label = String(opt).trim();
                return <option key={idx} value={label} className="text-gray-900">{label}</option>;
              })}
            </select>
          </div>
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
           {/* Segmented Control Style */}
          <div className={`flex w-full flex-wrap p-1 rounded-lg gap-1 border ${radioContainerClass}`}>
            {radioOpts.map((opt, idx) => {
              const label = String(opt).trim();
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
                    onBlur={onBlur} // Less common for radio but kept for consistency
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
            onChange([...rows, {}]); // Add empty object
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
                                                <option value="" className="text-gray-500">Select...</option>
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

    default:
      return <div className="text-sw-red p-4 border border-sw-red bg-[#fff6f5] rounded-xl">Unknown type: {element.type}</div>;
  }
};