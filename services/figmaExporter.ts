
import { ProcessDefinition } from '../types';

export const generateFigmaSVG = (processDef: ProcessDefinition): string => {
  // Helper to escape XML special characters
  const escapeXml = (unsafe: string | undefined): string => {
    if (!unsafe) return '';
    return String(unsafe)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
  };

  // Constants for Layout
  const STAGE_WIDTH = 400;
  const STAGE_GAP = 100;
  const SECTION_PADDING = 24;
  const EL_HEIGHT = 60;
  const EL_GAP = 16;
  const HEADER_HEIGHT = 80;
  
  // Colors (Catapulse Brand)
  const COL_TEAL = '#0b3239';
  const COL_BG = '#F9FAFB';
  const COL_STROKE = '#E5E7EB';
  const COL_TEXT = '#111827';
  const COL_TEXT_LIGHT = '#6B7280';

  let svgContent = '';
  let currentStageX = 0;
  let maxHeight = 800;

  // Header
  const title = `<text x="0" y="-100" font-family="Arial" font-size="48" font-weight="bold" fill="${COL_TEAL}">${escapeXml(processDef.name)}</text>`;
  const desc = `<text x="0" y="-60" font-family="Arial" font-size="20" fill="${COL_TEXT_LIGHT}">${escapeXml(processDef.description)}</text>`;
  
  // Iterate Stages
  processDef.stages.forEach((stage, i) => {
    let currentY = HEADER_HEIGHT;
    let stageContent = '';

    // Stage Title Background
    stageContent += `<rect x="${currentStageX}" y="0" width="${STAGE_WIDTH}" height="${HEADER_HEIGHT}" fill="${COL_TEAL}" rx="8" />`;
    stageContent += `<text x="${currentStageX + 24}" y="50" font-family="Arial" font-size="24" font-weight="bold" fill="white">${i+1}. ${escapeXml(stage.title)}</text>`;

    // Stage Body Background (Placeholder height, fixed at end)
    const bodyStartY = HEADER_HEIGHT;
    
    // Iterate Sections
    stage.sections.forEach(section => {
      const sectionY = currentY + 20;
      let elY = sectionY + 50;

      // Section Title
      stageContent += `<text x="${currentStageX + SECTION_PADDING}" y="${sectionY + 20}" font-family="Arial" font-size="14" font-weight="bold" fill="${COL_TEXT_LIGHT}" letter-spacing="1">
        ${escapeXml(section.title.toUpperCase())}
      </text>`;
      stageContent += `<line x1="${currentStageX + SECTION_PADDING}" y1="${sectionY + 30}" x2="${currentStageX + STAGE_WIDTH - SECTION_PADDING}" y2="${sectionY + 30}" stroke="${COL_STROKE}" stroke-width="1" />`;

      // Iterate Elements
      section.elements.forEach(el => {
        // Label
        stageContent += `<text x="${currentStageX + SECTION_PADDING}" y="${elY}" font-family="Arial" font-size="14" font-weight="bold" fill="${COL_TEAL}">
          ${escapeXml(el.label)} ${el.required ? '*' : ''}
        </text>`;

        // Input Box
        const inputY = elY + 8;
        let inputVisual = '';

        if (el.type === 'textarea') {
            inputVisual = `<rect x="${currentStageX + SECTION_PADDING}" y="${inputY}" width="${STAGE_WIDTH - (SECTION_PADDING*2)}" height="80" fill="white" stroke="${COL_TEAL}" stroke-width="1" rx="4" />`;
            elY += 80 + 20 + EL_GAP;
        } else if (el.type === 'checkbox') {
            inputVisual = `<rect x="${currentStageX + SECTION_PADDING}" y="${inputY}" width="24" height="24" fill="white" stroke="${COL_TEAL}" stroke-width="1" rx="4" />`;
            elY += 24 + 20 + EL_GAP;
        } else if (el.type === 'radio') {
             // Simulate radio group
             inputVisual = `<rect x="${currentStageX + SECTION_PADDING}" y="${inputY}" width="${STAGE_WIDTH - (SECTION_PADDING*2)}" height="40" fill="#F3F4F6" rx="4" />`;
             // Add fake options
             const opts = el.options ? (Array.isArray(el.options) ? el.options : String(el.options).split(',')) : ['Option 1', 'Option 2'];
             opts.slice(0,3).forEach((opt, idx) => {
                 inputVisual += `<text x="${currentStageX + SECTION_PADDING + 16 + (idx * 80)}" y="${inputY + 25}" font-family="Arial" font-size="12" fill="${COL_TEXT}">${escapeXml(String(opt).trim())}</text>`;
             });
             elY += 40 + 20 + EL_GAP;
        } else {
            // Standard Text/Select/Date
            inputVisual = `<rect x="${currentStageX + SECTION_PADDING}" y="${inputY}" width="${STAGE_WIDTH - (SECTION_PADDING*2)}" height="48" fill="white" stroke="${COL_TEAL}" stroke-width="1" rx="4" />`;
            
            if (el.type === 'select') {
                // Add chevron
                inputVisual += `<path d="M${currentStageX + STAGE_WIDTH - SECTION_PADDING - 20} ${inputY + 20} L${currentStageX + STAGE_WIDTH - SECTION_PADDING - 15} ${inputY + 28} L${currentStageX + STAGE_WIDTH - SECTION_PADDING - 10} ${inputY + 20}" fill="none" stroke="${COL_TEAL}" stroke-width="2"/>`;
            }
            if (el.type === 'date') {
                 inputVisual += `<text x="${currentStageX + STAGE_WIDTH - SECTION_PADDING - 30}" y="${inputY + 30}" font-family="Arial" font-size="16">📅</text>`;
            }
            
            elY += 48 + 20 + EL_GAP;
        }

        stageContent += inputVisual;
      });

      currentY = elY + 20;
    });

    // Draw Stage container background behind content (except header)
    const stageHeight = currentY;
    if (stageHeight > maxHeight) maxHeight = stageHeight;
    
    // Backdrop
    const backdrop = `<rect x="${currentStageX}" y="${HEADER_HEIGHT}" width="${STAGE_WIDTH}" height="${stageHeight - HEADER_HEIGHT}" fill="${COL_BG}" stroke="${COL_STROKE}" stroke-width="1" rx="0" />`;
    
    svgContent += backdrop + stageContent;
    
    currentStageX += STAGE_WIDTH + STAGE_GAP;
  });

  const totalWidth = currentStageX;
  const totalHeight = maxHeight + 200;

  return `
    <svg width="${totalWidth}" height="${totalHeight}" viewBox="-50 -150 ${totalWidth + 100} ${totalHeight + 100}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&amp;display=swap');
        </style>
      </defs>
      <rect x="-50" y="-150" width="${totalWidth + 100}" height="${totalHeight + 100}" fill="white" />
      ${title}
      ${desc}
      ${svgContent}
    </svg>
  `;
};
