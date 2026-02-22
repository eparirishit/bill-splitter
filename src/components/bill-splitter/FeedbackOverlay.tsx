'use client';

import React from 'react';

interface FeedbackOverlayProps {
    isOpen: boolean;
    onFeedback: (type: 'accurate' | 'needs_fix') => void;
}

export function FeedbackOverlay({ isOpen, onFeedback }: FeedbackOverlayProps) {
    return (
        <div className={`fixed top-4 left-0 right-0 px-4 z-[60] transition-all duration-700 transform ${isOpen ? 'translate-y-0 opacity-100' : '-translate-y-32 opacity-0'}`}>
            <div className="max-w-md mx-auto w-fit glass border-primary/10 rounded-full pl-4 pr-1.5 py-1.5 shadow-2xl flex items-center justify-between gap-2 sm:gap-4 overflow-hidden">
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <i className="fas fa-wand-magic-sparkles text-primary text-xs"></i>
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">Extraction Quality?</span>
                </div>
                <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                    <button
                        onClick={() => onFeedback('accurate')}
                        className="px-3 py-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center gap-1.5 hover:bg-emerald-500/20 transition-all active:scale-95"
                    >
                        <i className="fas fa-thumbs-up text-[10px]"></i>
                        <span className="text-[9px] font-black uppercase tracking-tighter">Yes</span>
                    </button>
                    <button
                        onClick={() => onFeedback('needs_fix')}
                        className="px-3 py-2 bg-destructive/10 text-destructive rounded-full flex items-center gap-1.5 hover:bg-destructive/20 transition-all active:scale-95"
                    >
                        <i className="fas fa-thumbs-down text-[10px]"></i>
                        <span className="text-[9px] font-black uppercase tracking-tighter">No</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
