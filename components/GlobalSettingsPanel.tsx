
import React from 'react';
import { VisualTheme } from '../types';
import { Palette, Info, X } from 'lucide-react';

interface GlobalSettingsPanelProps {
  visualTheme: VisualTheme;
  onUpdateTheme: (theme: VisualTheme) => void;
  onClose: () => void;
  panelWidth: number;
  onResizeStart: () => void;
}

export const GlobalSettingsPanel: React.FC<GlobalSettingsPanelProps> = ({ 
  visualTheme, 
  onUpdateTheme, 
  onClose,
  panelWidth,
  onResizeStart
}) => {
  const labelClass = "block text-xs font-bold text-sw-teal uppercase mb-2 tracking-wide";

  return (
    <div id="panel-settings" style={{ width: panelWidth }} className="h-full flex flex-col bg-white border-l border-gray-200 shadow-2xl z-40 relative">
       <div 
          className="absolute left-0 top-0 bottom-0 w-1.5 bg-transparent hover:bg-sw-teal/20 cursor-col-resize z-50 transition-colors"
          onMouseDown={onResizeStart}
       ></div>

       <div className="p-8 border-b border-gray-100 flex items-start justify-between gap-4">
           <div>
              <h2 className="font-serif font-bold text-2xl text-sw-teal">Global Settings</h2>
              <p className="text-xs text-gray-400 mt-1">Application Styling & Themes</p>
           </div>
           <button onClick={onClose} className="text-gray-300 hover:text-gray-500">
               <X size={20} />
           </button>
       </div>

       <div className="p-8 space-y-8 flex-1 overflow-y-auto">
           {/* Theme Mode Selector */}
           <div className="space-y-4">
               <label className={labelClass}>Color Theme</label>
               <div className="grid grid-cols-2 gap-3">
                   <button 
                      id="btn-theme-type1"
                      onClick={() => onUpdateTheme({ ...visualTheme, mode: 'type1' })}
                      className={`p-4 rounded-xl border flex flex-col items-center gap-3 transition-all ${visualTheme.mode === 'type1' ? 'border-sw-teal bg-sw-lightGray text-sw-teal ring-1 ring-sw-teal' : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'}`}
                   >
                       <div className="w-12 h-8 bg-sw-teal border border-sw-teal rounded flex items-center justify-center shadow-sm">
                           <Palette size={16} className="text-white" />
                       </div>
                       <span className="text-xs font-bold">Type 1 (Teal)</span>
                   </button>
                   <button 
                      id="btn-theme-type2"
                      onClick={() => onUpdateTheme({ ...visualTheme, mode: 'type2' })}
                      className={`p-4 rounded-xl border flex flex-col items-center gap-3 transition-all ${visualTheme.mode === 'type2' ? 'border-[#e61126] bg-[#e0e0e0] text-[#e61126] ring-1 ring-[#e61126]' : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'}`}
                   >
                       <div className="w-12 h-8 bg-[#e61126] border border-[#e61126] rounded flex items-center justify-center shadow-sm">
                           <Palette size={16} className="text-white" />
                       </div>
                       <span className="text-xs font-bold">Type 2 (Red/Pink)</span>
                   </button>
                   <button 
                      id="btn-theme-type3"
                      onClick={() => onUpdateTheme({ ...visualTheme, mode: 'type3' })}
                      className={`p-4 rounded-xl border flex flex-col items-center gap-3 transition-all col-span-2 ${visualTheme.mode === 'type3' ? 'border-[#006a4d] bg-[#f1f1f1] text-[#006a4d] ring-1 ring-[#006a4d]' : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'}`}
                   >
                       <div className="w-12 h-8 bg-[#006a4d] border border-[#006a4d] rounded flex items-center justify-center shadow-sm">
                           <Palette size={16} className="text-white" />
                       </div>
                       <span className="text-xs font-bold">Type 3 (Green)</span>
                   </button>
               </div>
           </div>

           {/* Density Selector */}
           <div className="space-y-4">
               <label className={labelClass}>Screen Density</label>
               <div className="grid grid-cols-2 gap-2">
                  {['dense', 'compact', 'default', 'spacious'].map((d) => (
                      <button
                          key={d}
                          id={`btn-density-${d}`}
                          onClick={() => onUpdateTheme({ ...visualTheme, density: d as any })}
                          className={`px-3 py-2 text-xs font-bold rounded-lg border capitalize transition-all ${visualTheme.density === d ? 'bg-sw-teal text-white border-sw-teal' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                      >
                          {d}
                      </button>
                  ))}
               </div>
           </div>

           {/* Radius Selector */}
           <div className="space-y-4">
               <label className={labelClass}>Corner Radius</label>
               <div className="flex gap-2">
                  {['none', 'small', 'medium', 'large'].map((r) => (
                      <button
                          key={r}
                          onClick={() => onUpdateTheme({ ...visualTheme, radius: r as any })}
                          className={`flex-1 px-3 py-2 text-xs font-bold rounded-lg border capitalize transition-all ${visualTheme.radius === r ? 'bg-sw-teal text-white border-sw-teal' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                      >
                          {r}
                      </button>
                  ))}
               </div>
           </div>

           <div className="pt-6 border-t border-gray-100">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex gap-3 text-sm text-blue-700">
                  <Info className="shrink-0" size={18} />
                  <p>These settings affect the Preview mode and exported HTML prototypes.</p>
              </div>
           </div>
       </div>
    </div>
  );
}
