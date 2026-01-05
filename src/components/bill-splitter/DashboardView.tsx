'use client';

import React from 'react';
import { Logo } from '@/components/icons/logo';
import { AppFlow, Step, BillData } from '@/types';

interface AnalyticsData {
    totalVolume: number;
    monthlyVolume: number;
    scanCount: number;
    manualCount: number;
}

interface HistoryItem {
    id: string;
    storeName: string;
    date: string;
    total: number;
    source: 'scan' | 'manual';
}

interface DashboardViewProps {
    user: {
        first_name?: string;
        picture?: { medium?: string };
    } | null;
    greeting: string;
    analytics: AnalyticsData;
    history: HistoryItem[];
    onProfileClick: () => void;
    onScanClick: () => void;
    onManualClick: () => void;
    onHistoryItemClick: (item: HistoryItem) => void;
}

export function DashboardView({
    user,
    greeting,
    analytics,
    history,
    onProfileClick,
    onScanClick,
    onManualClick,
    onHistoryItemClick
}: DashboardViewProps) {
    return (
        <div className="flex flex-col gap-6 p-6 animate-slide-up">
            {/* Header */}
            <header className="flex items-center justify-between pt-4">
                <div className="flex items-center gap-3">
                    <Logo className="w-12 h-12" />
                    <div className="flex flex-col">
                        <p className="text-gray-400 dark:text-gray-500 font-bold text-[10px] leading-tight uppercase tracking-widest">{greeting}</p>
                        <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">{user?.first_name || 'User'}</h2>
                    </div>
                </div>
                <button onClick={onProfileClick} className="w-12 h-12 rounded-[1.25rem] overflow-hidden border border-white dark:border-slate-800 shadow-xl transition-all active:scale-90 hover:scale-105 relative bg-gray-100 dark:bg-slate-800 focus:ring-0 focus:ring-offset-0 focus:outline-none">
                    <img
                        src={user?.picture?.medium || 'https://ui-avatars.com/api/?background=random'}
                        className="w-full h-full object-cover absolute inset-0"
                        alt="Profile"
                    />
                </button>
            </header>

            {/* Quick Actions */}
            <div className="flex flex-col gap-4 mt-2">
                <button
                    onClick={onScanClick}
                    className="w-full py-8 px-8 bg-indigo-600 dark:bg-indigo-700 rounded-[2.5rem] shadow-2xl shadow-indigo-100 dark:shadow-none flex items-center gap-6 relative overflow-hidden group active:scale-[0.98] transition-all"
                >
                    <div className="absolute top-[-20%] right-[-10%] w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-1000"></div>
                    <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center relative z-10 backdrop-blur-md shrink-0">
                        <i className="fas fa-camera text-white text-2xl"></i>
                    </div>
                    <div className="relative z-10 text-left">
                        <h3 className="text-white font-black text-2xl leading-tight">Scan Receipt</h3>
                        <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Instant AI Extraction</p>
                    </div>
                </button>

                <button
                    onClick={onManualClick}
                    className="w-full py-8 px-8 bg-white dark:bg-slate-800 rounded-[2.5rem] border border-gray-100 dark:border-slate-800 shadow-lg flex items-center gap-6 active:scale-[0.98] transition-all hover:border-indigo-100 dark:hover:border-indigo-900 group"
                >
                    <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-700 flex items-center justify-center group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 transition-colors shrink-0">
                        <i className="fas fa-keyboard text-gray-400 dark:text-slate-500 text-2xl group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors"></i>
                    </div>
                    <div className="text-left">
                        <h3 className="text-gray-900 dark:text-white font-black text-2xl leading-tight">Manual Split</h3>
                        <p className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Quick Manual Setup</p>
                    </div>
                </button>
            </div>

            {/* Dashboard Analytics */}
            <section className="mt-2">
                <div className="flex items-center justify-between mb-4 px-1">
                    <h3 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Dashboard Analytics</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-sm">
                        <div className="flex justify-between items-start mb-1">
                            <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Spent</p>
                            <i className="fas fa-coins text-amber-500 text-[10px]"></i>
                        </div>
                        <p className="text-xl font-black text-gray-900 dark:text-white tracking-tighter">${analytics.totalVolume.toFixed(0)}</p>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-5 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-sm">
                        <div className="flex justify-between items-start mb-1">
                            <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Monthly</p>
                            <i className="fas fa-calendar-alt text-indigo-500 text-[10px]"></i>
                        </div>
                        <p className="text-xl font-black text-gray-900 dark:text-white tracking-tighter">${analytics.monthlyVolume.toFixed(0)}</p>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-5 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-sm">
                        <div className="flex justify-between items-start mb-1">
                            <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">OCR Scans</p>
                            <i className="fas fa-camera text-emerald-500 text-[10px]"></i>
                        </div>
                        <p className="text-xl font-black text-gray-900 dark:text-white tracking-tighter">{analytics.scanCount}</p>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-5 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-sm">
                        <div className="flex justify-between items-start mb-1">
                            <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Manual</p>
                            <i className="fas fa-keyboard text-purple-500 text-[10px]"></i>
                        </div>
                        <p className="text-xl font-black text-gray-900 dark:text-white tracking-tighter">{analytics.manualCount}</p>
                    </div>
                </div>
            </section>

            {/* Recent Activity */}
            {history.length > 0 && (
                <section className="mt-2">
                    <div className="flex items-center justify-between mb-4 px-1">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Recent Activity</h3>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-gray-100 dark:border-slate-800 overflow-hidden shadow-sm">
                        {history.slice(0, 4).map((item, idx) => (
                            <div
                                key={item.id + idx}
                                onClick={() => onHistoryItemClick(item)}
                                className="group p-5 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-700/30 flex items-center justify-between transition-all cursor-pointer border-b border-gray-50 dark:border-slate-700 last:border-none active:bg-gray-100 dark:active:bg-slate-700"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-slate-900 border border-indigo-100/50 dark:border-slate-700 flex items-center justify-center text-indigo-500 font-black text-xs shadow-sm group-hover:scale-110 transition-transform">
                                        {item.storeName ? item.storeName.charAt(0).toUpperCase() : 'E'}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{item.storeName || 'Unnamed Split'}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{new Date(item.date).toLocaleDateString()}</p>
                                            <span className="w-1 h-1 rounded-full bg-gray-200"></span>
                                            <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-tighter">{item.source}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-black text-gray-900 dark:text-white tracking-tighter">${item.total?.toFixed(2) || '0.00'}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
