'use client';

import React from 'react';

interface FeedbackOverlayProps {
    isOpen: boolean;
    onFeedback: (type: 'accurate' | 'needs_fix') => void;
}

export function FeedbackOverlay({ isOpen, onFeedback }: FeedbackOverlayProps) {
    return (
        <div className={`fixed top-4 left-4 right-4 z-[60] transition-all duration-700 transform ${isOpen ? 'translate-y-0 opacity-100' : '-translate-y-32 opacity-0'}`}>
            <div className="w-fit mx-auto glass dark:bg-slate-800/95 border border-indigo-100/50 dark:border-indigo-900/50 rounded-full pl-6 pr-2 py-2 shadow-2xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                        <i className="fas fa-wand-magic-sparkles text-indigo-500 text-xs"></i>
                    </div>
                    <span className="text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest">Extraction Quality?</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => onFeedback('accurate')}
                        className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center gap-2 hover:bg-emerald-100 transition-all active:scale-95"
                    >
                        <i className="fas fa-thumbs-up text-xs"></i>
                        <span className="text-[10px] font-black uppercase tracking-tighter">Accurate</span>
                    </button>
                    <button
                        onClick={() => onFeedback('needs_fix')}
                        className="px-4 py-2 bg-rose-50 dark:bg-rose-900/10 text-rose-500 dark:text-rose-400 rounded-full flex items-center gap-2 hover:bg-rose-100 transition-all active:scale-95"
                    >
                        <i className="fas fa-thumbs-down text-xs"></i>
                        <span className="text-[10px] font-black uppercase tracking-tighter">Inaccurate</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
