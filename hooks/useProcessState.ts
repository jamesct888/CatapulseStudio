
import { useState } from 'react';
import { ProcessDefinition, ElementDefinition, SectionDefinition, StageDefinition } from '../types';

export const useProcessState = () => {
  const [processDef, setProcessDef] = useState<ProcessDefinition | null>(null);

  // --- CRUD Operations ---

  const updateStage = (updated: StageDefinition) => {
    if (!processDef) return;
    const newDef = { ...processDef };
    const idx = newDef.stages.findIndex(s => s.id === updated.id);
    if (idx !== -1) newDef.stages[idx] = updated;
    setProcessDef(newDef);
  };

  const updateSection = (updated: SectionDefinition) => {
    if (!processDef) return;
    const newDef = { ...processDef };
    newDef.stages.forEach(stg => {
      const idx = stg.sections.findIndex(s => s.id === updated.id);
      if (idx !== -1) stg.sections[idx] = updated;
    });
    setProcessDef(newDef);
  };

  const updateElement = (updated: ElementDefinition) => {
    if (!processDef) return;
    const newDef = { ...processDef };
    newDef.stages.forEach(stg => {
      stg.sections.forEach(sec => {
        const idx = sec.elements.findIndex(e => e.id === updated.id);
        if (idx !== -1) sec.elements[idx] = updated;
      });
    });
    setProcessDef(newDef);
  };

  const deleteStage = (id: string) => {
    if (!processDef) return;
    const newDef = { ...processDef };
    newDef.stages = newDef.stages.filter(s => s.id !== id);
    setProcessDef(newDef);
  };

  const deleteSection = (sectionId: string, stageId?: string) => {
    if (!processDef) return;
    const newDef = { ...processDef };

    if (stageId) {
      // Scoped Deletion: Remove only from the specific stage (Fixes duplicate ref issue)
      const stage = newDef.stages.find(s => s.id === stageId);
      if (stage) {
        stage.sections = stage.sections.filter(s => s.id !== sectionId);
      }
    } else {
      // Global Deletion (Fallback)
      newDef.stages.forEach(stg => {
        stg.sections = stg.sections.filter(s => s.id !== sectionId);
      });
    }
    setProcessDef(newDef);
  };

  const deleteElement = (elementId: string, sectionId?: string | null, stageId?: string | null) => {
    if (!processDef) return;
    const newDef = { ...processDef };

    if (stageId && sectionId) {
      // Scoped Deletion: Remove only from specific section in specific stage
      const stage = newDef.stages.find(s => s.id === stageId);
      const section = stage?.sections.find(s => s.id === sectionId);
      if (section) {
        section.elements = section.elements.filter(e => e.id !== elementId);
      }
    } else {
      // Global Deletion (Fallback)
      newDef.stages.forEach(stg => {
        stg.sections.forEach(sec => {
          sec.elements = sec.elements.filter(e => e.id !== elementId);
        });
      });
    }
    setProcessDef(newDef);
  };

  // --- Sanitization Helper ---
  const sanitizeProcessDef = (def: ProcessDefinition): ProcessDefinition => {
    // 1. Ensure basics exist
    const clean = { ...def };
    if (!clean.stages) clean.stages = [];

    // 2. Deep Clean Stages
    clean.stages = clean.stages.map(stg => {
      const cleanStage = { ...stg };
      if (!cleanStage.sections) cleanStage.sections = [];

      // Clean Sections
      cleanStage.sections = cleanStage.sections.map(sec => {
        const cleanSection = { ...sec };
        if (!cleanSection.elements) cleanSection.elements = [];

        // Clean Elements
        cleanSection.elements = cleanSection.elements.map(el => {
          const cleanEl = { ...el };
          // Ensure properties that might be undefined in older versions
          if (!cleanEl.options) cleanEl.options = [];
          return cleanEl;
        });

        return cleanSection;
      });

      return cleanStage;
    });

    return clean;
  };

  const setProcessDefSafe = (def: ProcessDefinition | null) => {
    if (def) {
      setProcessDef(sanitizeProcessDef(def));
    } else {
      setProcessDef(null);
    }
  };

  return {
    processDef,
    setProcessDef: setProcessDefSafe,
    updateStage,
    updateSection,
    updateElement,
    deleteStage,
    deleteSection,
    deleteElement
  };
};
