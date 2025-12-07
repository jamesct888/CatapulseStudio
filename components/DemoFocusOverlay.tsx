
import React, { useState, useEffect } from 'react';

interface DemoFocusOverlayProps {
  area: string;
  highlightId: string | null;
}

export const DemoFocusOverlay: React.FC<DemoFocusOverlayProps> = ({ area, highlightId }) => {
  const [style, setStyle] = useState<React.CSSProperties>({});
  const [isVisible, setIsVisible] = useState(false);

  // Auto-scroll to highlighted element
  useEffect(() => {
      if (highlightId) {
          const timer = setTimeout(() => {
              const el = document.getElementById(highlightId);
              if (el) {
                  // Changed from 'center' to 'nearest' to avoid jarring jumps (simulated zooming)
                  el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
              }
          }, 100); 
          return () => clearTimeout(timer);
      }
  }, [highlightId]);

  useEffect(() => {
    const updatePosition = () => {
        let targetRect: DOMRect | null = null;

        // 1. Try to find specific highlighted element
        if (highlightId) {
            const el = document.getElementById(highlightId);
            if (el) {
                const rect = el.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    targetRect = rect;
                }
            }
        }

        // 2. If no specific element, fall back to area
        if (!targetRect && area !== 'none' && area !== 'modal' && area !== 'full') {
            let el: Element | null = null;
            
            if (area === 'sidebar') {
                el = document.querySelector('.w-80'); // Common class for sidebar
            } 
            else if (area === 'copilot') {
                 // Try specific ID first
                 el = document.getElementById('sidebar-copilot');
                 if (!el) {
                     // Fallback to bottom of sidebar
                     const sidebar = document.querySelector('.w-80');
                     if (sidebar) {
                         const sbRect = sidebar.getBoundingClientRect();
                         targetRect = {
                             left: sbRect.left,
                             top: sbRect.bottom - 250,
                             width: sbRect.width,
                             height: 250,
                             right: sbRect.right,
                             bottom: sbRect.bottom,
                             x: sbRect.left,
                             y: sbRect.bottom - 250,
                             toJSON: () => {}
                         } as DOMRect;
                     }
                 }
            }
            else if (area === 'panel') {
                el = document.getElementById('panel');
            }
            else if (area === 'canvas') {
                el = document.getElementById('canvas');
            }

            if (el && !targetRect) {
                targetRect = el.getBoundingClientRect();
            }
        }

        if (targetRect) {
            setStyle({
                left: targetRect.left,
                top: targetRect.top,
                width: targetRect.width,
                height: targetRect.height,
                position: 'fixed'
            });
            setIsVisible(true);
        } else {
            setIsVisible(false);
        }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    
    // Polling handles layout shifts/animations that events might miss
    const interval = setInterval(updatePosition, 50);

    return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
        clearInterval(interval);
    };
  }, [area, highlightId]);

  if (!isVisible) return null;

  return (
    <div 
      className="z-[90] pointer-events-none transition-all duration-300 ease-out border-4 border-sw-red/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.3)] rounded-lg"
      style={style}
    />
  );
};
