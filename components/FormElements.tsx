import React from 'react';
import { ElementDefinition, VisualTheme } from '../types';

interface FormElementProps {
  element: ElementDefinition;
  value: any;
  onChange: (val: any) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
  theme?: VisualTheme;
}

export const RenderElement: React.FC<FormElementProps> = ({ element, value, onChange, onBlur, error, disabled, theme = { density: 'default', radius: 'medium' } }) => {
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

  const d = densityConfig[theme.density];
  const r = radiusConfig[theme.radius];

  // Base input class construction
  const baseClasses = `w-full ${d.inputHeight} ${d.padding} ${d.fontSize} border border-sw-teal ${r} focus:outline-none focus:shadow-input-focus transition-all bg-white text-sw-teal placeholder-gray-400 font-sans`;
  const errorClasses = error ? "border-sw-error bg-[#fff6f5] focus:border-sw-error focus:ring-1 focus:ring-sw-error" : "hover:border-sw-teal";

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
      <div className={`prose prose-teal text-sw-teal max-w-none ${d.wrapper}`}>
        {/* Show label if it exists and isn't the default 'New Field' which might be distracting for pure text */}
        {element.label && element.label !== 'New Field' && (
             <label className={`block font-bold text-sw-teal ${d.labelSize} ${d.labelMb}`}>
                {element.label}
             </label>
        )}
        
        {isReflection ? (
             <div className={`w-full px-0 ${d.fontSize} text-gray-800 ${r} min-h-[${theme.density === 'dense' ? '30px' : '50px'}] flex items-center`}>
                {displayContent ? (
                    <span>{displayContent}</span>
                ) : (
                    <span className="text-gray-400 italic opacity-60">Empty value</span>
                )}
             </div>
        ) : (
            <p className={`font-sans ${d.fontSize} whitespace-pre-wrap`}>{displayContent}</p>
        )}
      </div>
    );
  }

  const Label = () => (
    <label className={`block font-bold text-sw-teal ${d.labelSize} ${d.labelMb}`}>
      {element.label}
      {element.required && <span className="text-sw-red ml-1" title="Required">*</span>}
    </label>
  );

  const ErrorMsg = () => error ? <p className="text-sm text-sw-red mt-2 font-medium flex items-center gap-2 before:content-[''] before:bg-[url('https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/alert-circle.svg')] before:w-4 before:h-4">{error}</p> : null;

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
              <span className={`absolute left-2 top-0 bottom-0 flex items-center text-sw-teal font-bold ${d.fontSize}`}>£</span>
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
              className={`${baseClasses} ${errorClasses} appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%2716%27%20height%3D%2716%27%20fill%3D%27none%27%3E%3Cpath%20fill%3D%27%230b3239%27%20d%3D%27M3.766%204.212h8.468c.613%200%20.965.703.587%201.173l-4.234%205.293a.75.75%200%200%201-1.174%200L3.18%205.385c-.378-.47-.026-1.173.587-1.173z%27%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[length:16px] bg-[position:calc(100%-12px)_center]`}
              value={value || ''}
              onChange={handleChange}
              onBlur={onBlur}
            >
              <option value="">Please Select...</option>
              {options.map((opt, idx) => {
                const label = String(opt).trim();
                return <option key={idx} value={label}>{label}</option>;
              })}
            </select>
          </div>
          <ErrorMsg />
        </div>
      );
    case 'radio':
      const radioOpts = element.options ? (Array.isArray(element.options) ? element.options : String(element.options).split(',')) : [];
      return (
        <div className={`${d.wrapper} group`}>
          <Label />
           {/* Segmented Control Style */}
          <div className="inline-flex flex-wrap bg-gray-100 p-1 rounded-lg gap-1 border border-gray-200">
            {radioOpts.map((opt, idx) => {
              const label = String(opt).trim();
              const isSelected = value === label;
              return (
                <label key={idx} className={`
                    cursor-pointer transition-all rounded-md flex items-center justify-center text-center select-none relative
                    ${theme.density === 'dense' ? 'px-3 py-1 text-xs' : theme.density === 'compact' ? 'px-4 py-1.5 text-sm' : 'px-5 py-2 text-sm'}
                    ${isSelected 
                        ? 'bg-sw-red text-white font-bold shadow-md' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
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
        return (
            <div className={`${d.wrapper} group`}>
                <label className={`flex items-center gap-3 cursor-pointer group/checkbox ${d.checkboxWrapper} border border-sw-teal ${r} hover:bg-sw-teal/5 transition-colors`}>
                    <div className={`${d.checkboxSize} border ${radiusConfig.small} flex items-center justify-center ${value === true || value === 'true' ? 'bg-sw-teal border-sw-teal' : 'border-sw-teal bg-white'}`}>
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
                     <span className={`${d.fontSize} font-bold text-sw-text`}>
                        {element.label}
                        {element.required && <span className="text-sw-red ml-1">*</span>}
                    </span>
                </label>
                 <ErrorMsg />
            </div>
        )
    default:
      return <div className="text-sw-red p-4 border border-sw-red bg-[#fff6f5] rounded-xl">Unknown type: {element.type}</div>;
  }
};