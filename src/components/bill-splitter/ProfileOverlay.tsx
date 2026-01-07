'use client';

import React from 'react';

interface ProfileOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    user: {
        first_name?: string;
        last_name?: string;
        email?: string;
        picture?: { medium?: string };
    } | null;
    darkMode: boolean;
    onToggleDarkMode: () => void;
    onLogout: () => void;
    onAdminClick?: () => void;
}

export function ProfileOverlay({
    isOpen,
    onClose,
    user,
    darkMode,
    onToggleDarkMode,
    onLogout,
    onAdminClick
}: ProfileOverlayProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] animate-fade-in flex justify-center">
            <div className="absolute inset-0 bg-slate-900/60" onClick={onClose}></div>
            <div className="absolute bottom-0 w-full max-w-md bg-white dark:bg-slate-900 rounded-t-[3rem] p-8 animate-slide-up shadow-2xl">
                <div className="w-12 h-1.5 bg-gray-100 dark:bg-slate-800 rounded-full mx-auto mb-8"></div>
                <div className="flex items-center gap-6 mb-10">
                    <img
                        src={user?.picture?.medium || 'https://ui-avatars.com/api/?background=random'}
                        className="w-20 h-20 rounded-[2rem] shadow-xl border-4 border-white dark:border-slate-800 object-cover"
                        alt="Profile"
                    />
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white">
                            {user?.first_name} {user?.last_name}
                        </h2>
                        <p className="text-sm font-bold text-gray-400 dark:text-gray-500">{user?.email}</p>
                    </div>
                </div>
                <div className="space-y-4 mb-10">
                <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800 rounded-[1.5rem]">
                        <div className="flex items-center gap-4">
                            <i className="fas fa-moon text-indigo-500"></i>
                            <span className="font-bold text-gray-700 dark:text-slate-200">Dark Mode</span>
                        </div>
                        <button
                            onClick={onToggleDarkMode}
                            className={`w-12 h-6 min-w-[3rem] !h-6 !min-h-0 !p-0 shrink-0 block rounded-full transition-colors relative focus:outline-none focus:ring-0 focus:ring-offset-0 ${darkMode ? 'bg-indigo-600' : 'bg-slate-300'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${darkMode ? 'left-7' : 'left-1'}`}></div>
                        </button>
                    </div>
                    {onAdminClick && (
                        <button
                            onClick={() => { onAdminClick(); onClose(); }}
                            className="w-full flex items-center justify-between p-5 bg-indigo-50 dark:bg-indigo-900/30 rounded-[1.5rem] hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors active:scale-95"
                        >
                            <div className="flex items-center gap-4">
                                <i className="fas fa-user-shield text-indigo-600 dark:text-indigo-400"></i>
                                <span className="font-bold text-indigo-600 dark:text-indigo-400">Admin Console</span>
                            </div>
                            <i className="fas fa-chevron-right text-indigo-400 dark:text-indigo-500"></i>
                        </button>
                    )}                    
                </div>
                <button
                    onClick={() => { onLogout(); onClose(); }}
                    className="w-full py-5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-[1.5rem] font-black text-lg active:scale-95 transition-transform"
                >
                    Logout Session
                </button>
            </div>
        </div>
    );
}
