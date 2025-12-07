
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

  const deleteSection = (id: string) => {
    if (!processDef) return;
    const newDef = { ...processDef };
    newDef.stages.forEach(stg => {
        stg.sections = stg.sections.filter(s => s.id !== id);
    });
    setProcessDef(newDef);
  };

  const deleteElement = (id: string) => {
    if (!processDef) return;
    const newDef = { ...processDef };
    newDef.stages.forEach(stg => {
        stg.sections.forEach(sec => {
            sec.elements = sec.elements.filter(e => e.id !== id);
        });
    });
    setProcessDef(newDef);
  };

  return {
    processDef,
    setProcessDef,
    updateStage,
    updateSection,
    updateElement,
    deleteSection,
    deleteElement
  };
};
