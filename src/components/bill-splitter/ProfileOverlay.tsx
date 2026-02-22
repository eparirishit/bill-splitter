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
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose}></div>
            <div className={`absolute bottom-0 w-full max-w-md bg-card text-card-foreground rounded-t-[3rem] p-8 pb-10 animate-slide-up shadow-2xl transition-all duration-300 flex flex-col ${showFeedback ? 'h-[85vh]' : ''}`}>
                <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-8 shrink-0"></div>

                {!showFeedback ? (
                    <>
                        <div className="flex items-center gap-6 mb-10 shrink-0">
                            <img
                                src={user?.picture?.medium || 'https://ui-avatars.com/api/?background=random'}
                                className="w-20 h-20 rounded-[2rem] shadow-xl border-4 border-card object-cover"
                                alt="Profile"
                            />
                            <div>
                                <h2 className="text-2xl font-black text-foreground">
                                    {user?.first_name} {user?.last_name}
                                </h2>
                                <p className="text-sm font-bold text-muted-foreground">{user?.email}</p>
                            </div>
                        </div>
                        <div className="space-y-4 mb-10 overflow-y-auto flex-1 min-h-0">
                            <div className="flex items-center justify-between p-5 bg-muted rounded-[1.5rem]">
                                <div className="flex items-center gap-4">
                                    <i className="fas fa-moon text-primary"></i>
                                    <span className="font-bold text-foreground">Dark Mode</span>
                                </div>
                                <button
                                    onClick={onToggleDarkMode}
                                    className={`w-12 h-6 min-w-[3rem] !h-6 !min-h-0 !p-0 shrink-0 block rounded-full transition-colors relative focus:outline-none focus:ring-0 focus:ring-offset-0 ${darkMode ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${darkMode ? 'left-7' : 'left-1'}`}></div>
                                </button>
                            </div>

                            <button
                                onClick={() => setShowFeedback(true)}
                                className="w-full flex items-center justify-between p-5 bg-muted rounded-[1.5rem] hover:bg-accent transition-colors active:scale-95"
                            >
                                <div className="flex items-center gap-4">
                                    <i className="fas fa-comment-alt text-primary"></i>
                                    <span className="font-bold text-foreground">Feedback & Support</span>
                                </div>
                                <i className="fas fa-chevron-right text-muted-foreground"></i>
                            </button>

                            {onAdminClick && (
                                <button
                                    onClick={() => { onAdminClick(); onClose(); }}
                                    className="w-full flex items-center justify-between p-5 bg-primary/10 rounded-[1.5rem] hover:bg-primary/20 transition-colors active:scale-95"
                                >
                                    <div className="flex items-center gap-4">
                                        <i className="fas fa-user-shield text-primary"></i>
                                        <span className="font-bold text-primary">Admin Console</span>
                                    </div>
                                    <i className="fas fa-chevron-right text-primary"></i>
                                </button>
                            )}
                        </div>
                        <button
                            onClick={() => { onLogout(); onClose(); }}
                            className="w-full py-5 bg-destructive/10 text-destructive rounded-[1.5rem] font-black text-lg active:scale-95 transition-transform shrink-0"
                        >
                            Logout Session
                        </button>
                    </>
                ) : (
                    <div className="h-full flex flex-col min-h-0">
                        <div className="flex items-center gap-4 mb-8 shrink-0">
                            <button
                                onClick={() => setShowFeedback(false)}
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-muted text-muted-foreground hover:bg-accent transition-colors"
                            >
                                <i className="fas fa-arrow-left"></i>
                            </button>
                            <h2 className="text-2xl font-black text-foreground">Feedback & Support</h2>
                        </div>

                        <form onSubmit={handleFeedbackSubmit} className="flex-1 flex flex-col min-h-0">
                            <div className="space-y-4 shrink-0 mb-6">
                                <div className="p-4 bg-primary/10 rounded-xl border border-primary/20 flex items-start gap-3">
                                    <i className="fas fa-magic text-primary mt-1"></i>
                                    <p className="text-sm font-medium text-primary">
                                        Tell us what's on your mind. Our AI will automatically categorize your feedback for the right team.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4 flex-1 flex flex-col min-h-0 mb-6">
                                <label className="block text-sm font-bold text-muted-foreground uppercase tracking-wider shrink-0">Message</label>
                                <textarea
                                    value={feedbackMessage}
                                    onChange={(e) => setFeedbackMessage(e.target.value)}
                                    placeholder="Tell us what's on your mind..."
                                    className="w-full flex-1 p-5 bg-muted rounded-[1.5rem] resize-none focus:outline-none focus:ring-2 focus:ring-primary text-foreground min-h-[120px]"
                                    required
                                ></textarea>
                            </div>

                            {submitStatus === 'success' && (
                                <div className="p-4 bg-green-500/10 text-green-500 rounded-xl font-bold text-center animate-fade-in mb-4 shrink-0">
                                    <i className="fas fa-check-circle mr-2"></i>
                                    Feedback submitted successfully!
                                </div>
                            )}

                            {submitStatus === 'error' && (
                                <div className="p-4 bg-destructive/10 text-destructive rounded-xl font-bold text-center animate-fade-in mb-4 shrink-0">
                                    <i className="fas fa-exclamation-circle mr-2"></i>
                                    Something went wrong. Please try again.
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isSubmitting || !feedbackMessage.trim()}
                                className="w-full py-5 bg-primary text-primary-foreground rounded-[1.5rem] font-black text-lg shadow-xl shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shrink-0"
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
