'use client';

import React from 'react';

interface ProfileOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    user: {
        id?: string;
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
    const [showFeedback, setShowFeedback] = React.useState(false);
    const [feedbackMessage, setFeedbackMessage] = React.useState('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [submitStatus, setSubmitStatus] = React.useState<'idle' | 'success' | 'error'>('idle');

    const handleFeedbackSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitStatus('idle');

        try {
            const response = await fetch('/api/feedback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: feedbackMessage,
                    user: user ? {
                        id: user.id || undefined,
                        email: user.email,
                        first_name: user.first_name,
                        last_name: user.last_name
                    } : undefined
                }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setSubmitStatus('success');
                setFeedbackMessage('');
                setTimeout(() => {
                    setSubmitStatus('idle');
                    setShowFeedback(false);
                }, 2000);
            } else {
                console.error('Feedback submission failed:', data.error || 'Unknown error');
                setSubmitStatus('error');
            }
        } catch (error) {
            console.error('Error submitting feedback:', error);
            setSubmitStatus('error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] animate-fade-in flex justify-center">
            <div className="absolute inset-0 bg-slate-900/60" onClick={onClose}></div>
            <div className={`absolute bottom-0 w-full max-w-md bg-white dark:bg-slate-900 rounded-t-[3rem] p-8 pb-10 animate-slide-up shadow-2xl transition-all duration-300 flex flex-col ${showFeedback ? 'h-[85vh]' : ''}`}>
                <div className="w-12 h-1.5 bg-gray-100 dark:bg-slate-800 rounded-full mx-auto mb-8 shrink-0"></div>

                {!showFeedback ? (
                    <>
                        <div className="flex items-center gap-6 mb-10 shrink-0">
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
                        <div className="space-y-4 mb-10 overflow-y-auto flex-1 min-h-0">
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

                            <button
                                onClick={() => setShowFeedback(true)}
                                className="w-full flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800 rounded-[1.5rem] hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors active:scale-95"
                            >
                                <div className="flex items-center gap-4">
                                    <i className="fas fa-comment-alt text-indigo-500"></i>
                                    <span className="font-bold text-gray-700 dark:text-slate-200">Feedback & Support</span>
                                </div>
                                <i className="fas fa-chevron-right text-gray-400"></i>
                            </button>

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
                            className="w-full py-5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-[1.5rem] font-black text-lg active:scale-95 transition-transform shrink-0"
                        >
                            Logout Session
                        </button>
                    </>
                ) : (
                    <div className="h-full flex flex-col min-h-0">
                        <div className="flex items-center gap-4 mb-8 shrink-0">
                            <button
                                onClick={() => setShowFeedback(false)}
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                <i className="fas fa-arrow-left"></i>
                            </button>
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white">Feedback & Support</h2>
                        </div>

                        <form onSubmit={handleFeedbackSubmit} className="flex-1 flex flex-col min-h-0">
                            <div className="space-y-4 shrink-0 mb-6">
                                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl border border-indigo-100 dark:border-indigo-800/50 flex items-start gap-3">
                                    <i className="fas fa-magic text-indigo-500 mt-1"></i>
                                    <p className="text-sm font-medium text-indigo-900 dark:text-indigo-200">
                                        Tell us what's on your mind. Our AI will automatically categorize your feedback for the right team.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4 flex-1 flex flex-col min-h-0 mb-6">
                                <label className="block text-sm font-bold text-gray-500 uppercase tracking-wider shrink-0">Message</label>
                                <textarea
                                    value={feedbackMessage}
                                    onChange={(e) => setFeedbackMessage(e.target.value)}
                                    placeholder="Tell us what's on your mind..."
                                    className="w-full flex-1 p-5 bg-slate-50 dark:bg-slate-800 rounded-[1.5rem] resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700 dark:text-slate-200 min-h-[120px]"
                                    required
                                ></textarea>
                            </div>

                            {submitStatus === 'success' && (
                                <div className="p-4 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl font-bold text-center animate-fade-in mb-4 shrink-0">
                                    <i className="fas fa-check-circle mr-2"></i>
                                    Feedback submitted successfully!
                                </div>
                            )}

                            {submitStatus === 'error' && (
                                <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl font-bold text-center animate-fade-in mb-4 shrink-0">
                                    <i className="fas fa-exclamation-circle mr-2"></i>
                                    Something went wrong. Please try again.
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isSubmitting || !feedbackMessage.trim()}
                                className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-lg shadow-xl shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shrink-0"
                            >
                                {isSubmitting ? 'Sending...' : 'Submit Feedback'}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
