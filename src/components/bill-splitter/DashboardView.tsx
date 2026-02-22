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
    drafts?: any[]; // FlowStateSnapshot[]
    onProfileClick: () => void;
    onAdminClick?: () => void;
    onScanClick: () => void;
    onManualClick: () => void;
    onHistoryItemClick: (item: HistoryItem) => void;
    onDraftClick?: (draft: any) => void;
}

export function DashboardView({
    user,
    greeting,
    analytics,
    history,
    drafts = [],
    onProfileClick,
    onAdminClick,
    onScanClick,
    onManualClick,
    onHistoryItemClick,
    onDraftClick
}: DashboardViewProps) {
    return (
        <div className="flex flex-col gap-6 p-6 animate-slide-up">
            {/* Header */}
            <header className="flex items-center justify-between pt-4">
                <div className="flex items-center gap-3">
                    <Logo className="w-12 h-12" />
                    <div className="flex flex-col">
                        <p className="text-muted-foreground font-bold text-[10px] leading-tight uppercase tracking-widest">{greeting}</p>
                        <h2 className="text-xl font-black text-foreground tracking-tight">{user?.first_name || 'User'}</h2>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={onProfileClick} className="w-12 h-12 rounded-[1.25rem] overflow-hidden border border-border shadow-xl transition-all active:scale-90 hover:scale-105 relative bg-muted focus:ring-0 focus:ring-offset-0 focus:outline-none">
                        <img
                            src={user?.picture?.medium || 'https://ui-avatars.com/api/?background=random'}
                            className="w-full h-full object-cover absolute inset-0"
                            alt="Profile"
                        />
                    </button>
                </div>
            </header>

            {/* Quick Actions */}
            <div className="flex flex-col gap-4 mt-2">
                <button
                    onClick={onScanClick}
                    className="w-full py-8 px-8 bg-primary text-primary-foreground rounded-[2.5rem] shadow-2xl shadow-primary/10 flex items-center gap-6 relative overflow-hidden group active:scale-[0.98] transition-all"
                >
                    <div className="absolute top-[-20%] right-[-10%] w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-1000"></div>
                    <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center relative z-10 backdrop-blur-md shrink-0">
                        <i className="fas fa-camera text-white text-2xl"></i>
                    </div>
                    <div className="relative z-10 text-left">
                        <h3 className="font-black text-2xl leading-tight">Scan Receipt</h3>
                        <p className="text-primary-foreground/80 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Instant AI Extraction</p>
                    </div>
                </button>

                <button
                    onClick={onManualClick}
                    className="w-full py-8 px-8 bg-card text-card-foreground rounded-[2.5rem] border border-border shadow-lg flex items-center gap-6 active:scale-[0.98] transition-all hover:border-primary/20 group"
                >
                    <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors shrink-0">
                        <i className="fas fa-keyboard text-muted-foreground text-2xl group-hover:text-primary transition-colors"></i>
                    </div>
                    <div className="text-left">
                        <h3 className="font-black text-2xl leading-tight">Manual Split</h3>
                        <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Quick Manual Setup</p>
                    </div>
                </button>
            </div>

            {/* Dashboard Analytics */}
            <section className="mt-2">
                <div className="flex items-center justify-between mb-4 px-1">
                    <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Dashboard Analytics</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-card text-card-foreground p-5 rounded-[2rem] border border-border shadow-sm">
                        <div className="flex justify-between items-start mb-1">
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Spent</p>
                            <i className="fas fa-coins text-amber-500 text-[10px]"></i>
                        </div>
                        <p className="text-xl font-black tracking-tighter">${analytics.totalVolume.toFixed(0)}</p>
                    </div>

                    <div className="bg-card text-card-foreground p-5 rounded-[2rem] border border-border shadow-sm">
                        <div className="flex justify-between items-start mb-1">
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Monthly</p>
                            <i className="fas fa-calendar-alt text-primary text-[10px]"></i>
                        </div>
                        <p className="text-xl font-black tracking-tighter">${analytics.monthlyVolume.toFixed(0)}</p>
                    </div>

                    <div className="bg-card text-card-foreground p-5 rounded-[2rem] border border-border shadow-sm">
                        <div className="flex justify-between items-start mb-1">
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">OCR Scans</p>
                            <i className="fas fa-camera text-emerald-500 text-[10px]"></i>
                        </div>
                        <p className="text-xl font-black tracking-tighter">{analytics.scanCount}</p>
                    </div>

                    <div className="bg-card text-card-foreground p-5 rounded-[2rem] border border-border shadow-sm">
                        <div className="flex justify-between items-start mb-1">
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Manual</p>
                            <i className="fas fa-keyboard text-purple-500 text-[10px]"></i>
                        </div>
                        <p className="text-xl font-black tracking-tighter">{analytics.manualCount}</p>
                    </div>
                </div>
            </section>

            {/* Unfinished Drafts */}
            {drafts.length > 0 && (
                <section className="mt-2 animate-fade-in">
                    <div className="flex items-center justify-between mb-4 px-1">
                        <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Drafts (Unfinished)</h3>
                        <span className="text-[8px] font-bold text-amber-500 uppercase tracking-widest bg-amber-500/10 px-2 py-0.5 rounded-full">Restore Anytime</span>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                        {drafts.slice(0, 3).map((draft, idx) => (
                            <button
                                key={draft.billId || idx}
                                onClick={() => onDraftClick?.(draft)}
                                className="w-full p-4 bg-card border border-border rounded-2xl flex items-center justify-between group hover:border-primary/30 transition-all active:scale-[0.98]"
                            >
                                <div className="flex items-center gap-4 text-left">
                                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                                        <i className={`fas ${draft.flow === 'SCAN' ? 'fa-file-invoice-dollar' : 'fa-keyboard'} text-sm`}></i>
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-foreground leading-tight">{draft.storeName || 'Untitled Split'}</p>
                                        <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1">
                                            {new Date(draft.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {Math.round((draft.currentStep / 4) * 100)}% Complete
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-foreground">${(draft.totalAmount || 0).toFixed(2)}</p>
                                    <p className="text-[8px] font-black text-primary uppercase tracking-tighter mt-1 group-hover:underline">Resume →</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {/* Recent Activity */}
            {history.length > 0 && (
                <section className="mt-2">
                    <div className="flex items-center justify-between mb-4 px-1">
                        <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Recent Activity</h3>
                    </div>
                    <div className="bg-card text-card-foreground rounded-[2.5rem] border border-border overflow-hidden shadow-sm">
                        {history.slice(0, 4).map((item, idx) => (
                            <div
                                key={item.id + idx}
                                className="group p-3 sm:p-4 bg-transparent hover:bg-accent flex items-center justify-between transition-all border-b border-border last:border-none"
                            >
                                <div 
                                    onClick={() => onHistoryItemClick(item)}
                                    className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 cursor-pointer active:bg-accent -m-3 sm:-m-4 p-3 sm:p-4 rounded-xl"
                                >
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-[10px] sm:text-xs shadow-sm group-hover:scale-110 transition-transform flex-shrink-0">
                                        {item.storeName ? item.storeName.charAt(0).toUpperCase() : 'E'}
                                    </div>
                                    <div className="flex-1 min-w-0 overflow-hidden">
                                        <p className="text-xs sm:text-sm font-bold text-foreground leading-tight truncate" title={item.storeName || 'Unnamed Split'}>{item.storeName || 'Unnamed Split'}</p>
                                        <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1">
                                            <p className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-tighter whitespace-nowrap">{new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                                            <span className="w-0.5 h-0.5 sm:w-1 sm:h-1 rounded-full bg-muted flex-shrink-0"></span>
                                            <span className="text-[8px] sm:text-[9px] font-bold text-primary uppercase tracking-tighter whitespace-nowrap">{item.source}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 ml-2">
                                    <div className="text-right">
                                        <p className="text-base sm:text-lg font-black text-foreground tracking-tighter whitespace-nowrap">${item.total?.toFixed(2) || '0.00'}</p>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onHistoryItemClick(item);
                                        }}
                                        className="!w-6 !h-6 sm:!w-7 sm:!h-7 !min-h-0 !p-0 rounded-lg bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors active:scale-90 flex-shrink-0"
                                        aria-label="Edit expense"
                                    >
                                        <i className="fas fa-edit text-[9px] sm:text-[10px]"></i>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
