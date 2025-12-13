
import React from 'react';

export const AppFooter: React.FC = () => {
    return (
        <footer className="bg-white border-t border-gray-200 px-4 py-1.5 flex justify-between items-center text-[10px] text-gray-400 z-50 shrink-0">
            <div className="flex gap-4">
                <span><strong className="text-gray-600">Catapulse Studio</strong> v1.2.1</span>
                <span className="hidden sm:inline">Build: {new Date().toISOString().split('T')[0]}</span>
            </div>
            <div className="flex gap-4">
                <span className="hidden sm:inline">Environment: <strong>Production</strong></span>
                <span>User: <strong>Demo User</strong></span>
            </div>
        </footer>
    );
};
