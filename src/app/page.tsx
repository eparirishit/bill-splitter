"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from "next/navigation";
import {
  AppFlow,
  Step,
  BillData,
  BillItem,
  User,
  Group
} from '@/types';
import { StepProgress } from '@/components/bill-splitter/StepProgress';
import { GroupSelector } from '@/components/bill-splitter/GroupSelector';
import { ItemSplitter } from '@/components/bill-splitter/ItemSplitter';
import { ReviewScreen } from '@/components/bill-splitter/ReviewScreen';
import { ProfileOverlay } from '@/components/bill-splitter/ProfileOverlay';
import { FeedbackOverlay } from '@/components/bill-splitter/FeedbackOverlay';
import { DashboardView } from '@/components/bill-splitter/DashboardView';
import { AdminPanel } from '@/components/bill-splitter/AdminPanel';
import { Logo } from '@/components/icons/logo';
import { SplitwiseLogoIcon } from "@/components/icons/SplitwiseLogoIcon";
import { useAuth } from '@/hooks/use-auth';
import { SplitwiseService } from '@/services/splitwise';
import { extractReceiptData } from '@/ai/extract-receipt-data';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { AnalyticsClientService } from '@/services/analytics-client';

// MOCK CONSTANTS (Fallbacks)
const DEFAULT_BILL: BillData = {
  id: '',
  storeName: '',
  date: new Date().toISOString().split('T')[0],
  items: [],
  tax: 0,
  discount: 0,
  otherCharges: 0,
  total: 0,
  currency: 'USD',
  notes: '',
  payerId: '',
  groupId: null,
  selectedMemberIds: [],
  source: AppFlow.NONE
};

function BillSplitterFlow() {
  const router = useRouter();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: isAuthLoading, login, logout } = useAuth();

  // App State
  const [flow, setFlow] = useState<AppFlow>(AppFlow.NONE);
  const [currentStep, setCurrentStep] = useState<Step>(Step.FLOW_SELECTION);
  const [billData, setBillData] = useState<BillData>({ ...DEFAULT_BILL, id: Math.random().toString(36).substr(2, 9) });
  const [originalBillData, setOriginalBillData] = useState<string>('');
  const [originalExtraction, setOriginalExtraction] = useState<any>(null); // Store original AI extraction for correction tracking
  const [receiptId, setReceiptId] = useState<string | null>(null); // Store receipt ID from tracking
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  // Theme State
  const [darkMode, setDarkMode] = useState<boolean>(false);

  // Data State
  const [authUser, setAuthUser] = useState<any>(null); // To store current user details
  const [groups, setGroups] = useState<Group[]>([]);
  const [friends, setFriends] = useState<User[]>([]);
  const [history, setHistory] = useState<any[]>([]); // Using any for history items for now to match structure
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // ------------------------------------------------------------------
  // Effects
  // ------------------------------------------------------------------

  // Initialize Theme
  useEffect(() => {
    // Check local storage or preference
    const isDark = localStorage.getItem('bill_splitter_theme') === 'dark' ||
      (!localStorage.getItem('bill_splitter_theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setDarkMode(isDark);
  }, []);

  // Update Theme
  useEffect(() => {
    const el = document.documentElement;
    if (darkMode) el.classList.add('dark');
    else el.classList.remove('dark');
    localStorage.setItem('bill_splitter_theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Load Groups and Friends when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const loadData = async () => {
        setIsLoadingData(true);
        try {
          const [fetchedGroups, fetchedFriends, fetchedUser] = await Promise.all([
            SplitwiseService.getRecentGroups(),
            SplitwiseService.getFriends(),
            SplitwiseService.getCurrentUser()
          ]);

          setAuthUser(fetchedUser);

          // Check admin status
          if (fetchedUser?.id) {
            try {
              const adminStatus = await AnalyticsClientService.checkAdminStatus(fetchedUser.id);
              setIsAdmin(adminStatus);
            } catch (error) {
              console.warn('Failed to check admin status:', error);
              setIsAdmin(false);
            }
          }

          // Map to new UI types
          const mappedGroups: Group[] = fetchedGroups.map(g => ({
            id: g.id,
            name: g.name,
            members: g.members.map(m => ({
              id: m.id,
              name: `${m.first_name} ${m.last_name || ''}`.trim(),
              email: m.email,
              avatar: m.picture?.medium || `https://ui-avatars.com/api/?name=${m.first_name}&background=random`
            }))
          }));

          const mappedFriends: User[] = fetchedFriends.map(f => ({
            id: f.id,
            name: `${f.first_name || ''} ${f.last_name || ''}`.trim() || f.email || 'Unknown',
            email: f.email || undefined,
            avatar: f.picture?.medium || `https://ui-avatars.com/api/?name=${f.first_name || 'F'}&background=random`
          }));

          setGroups(mappedGroups);
          setFriends(mappedFriends);
        } catch (error) {
          console.error("Failed to load Splitwise data", error);
          toast({
            title: "Data Load Error",
            description: "Could not fetch groups or friends. Please check connection.",
            variant: "destructive"
          });
        } finally {
          setIsLoadingData(false);
        }
      };

      loadData();
    }
  }, [isAuthenticated, toast]);

  // Load History
  useEffect(() => {
    const loadHistory = async () => {
      // Try to load from database if authenticated
      if (isAuthenticated && authUser?.id) {
        try {
          const historyResponse = await AnalyticsClientService.getExpenseHistory(
            authUser.id.toString(),
            5, // Limit to last 5 transactions
            0
          );
          
          if (historyResponse?.data && historyResponse.data.length > 0) {
            // Map database records to history format
            const mappedHistory = historyResponse.data.map(item => ({
              id: item.id,
              storeName: item.store_name,
              date: item.date,
              total: item.total,
              source: item.source
            }));
            setHistory(mappedHistory);
            
            // Also update localStorage as backup
            localStorage.setItem('bill_splitter_history', JSON.stringify(mappedHistory));
            return;
          }
        } catch (error) {
          console.warn('Failed to load history from database:', error);
          // Fall through to localStorage
        }
      }
      
      // Fallback to localStorage
      const savedHistory = localStorage.getItem('bill_splitter_history');
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        // Limit to 5 items
        setHistory(parsed.slice(0, 5));
      }
    };

    loadHistory();
  }, [isAuthenticated, authUser]);

  // Auth Redirect
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated && currentStep !== Step.AUTH) {
      // Allow staying on AUTH step if managed there to avoid loop
      // But if we are deeper, redirect or show auth
    }
  }, [isAuthenticated, isAuthLoading, currentStep]);


  // ------------------------------------------------------------------
  // Handlers
  // ------------------------------------------------------------------

  const handleLogin = () => {
    // Direct redirect to API which handles Splitwise OAuth
    login();
  };

  const startNewSplit = () => {
    setFlow(AppFlow.NONE);
    setCurrentStep(Step.FLOW_SELECTION);
    setBillData({ ...DEFAULT_BILL, id: Math.random().toString(36).substr(2, 9) });
    setPreviewImage(null);
    setOriginalBillData('');
    setOriginalExtraction(null);
    setReceiptId(null);
    setShowFeedback(false);
  };

  const handleEditHistorical = (item: any) => {
    // For now, restoring history is complex as we don't save full BillData yet. 
    // Just simple restore if possible or ignore.
    toast({ title: "History View", description: "Viewing details is not fully implemented yet." });
  };

  const calculateSplits = () => {
    const selectedMembers = [...friends, ...groups.flatMap(g => g.members)].filter(u => billData.selectedMemberIds.includes(u.id));
    // Deduplicate
    const uniqueMembers = Array.from(new Map(selectedMembers.map(item => [item.id, item])).values());

    const splits: Record<string, number> = {};
    uniqueMembers.forEach(m => (splits[m.id] = 0));

    billData.items.forEach(item => {
      // Logic duplicated from ReviewScreen for backend payload preparation
      if (item.splitType === 'quantity' && item.quantityAssignments) {
        const totalUnits = (Object.values(item.quantityAssignments) as number[]).reduce((a, b) => a + b, 0);
        if (totalUnits > 0) {
          const unitPrice = item.price / totalUnits;
          (Object.entries(item.quantityAssignments) as [string, number][]).forEach(([mId, units]) => {
            if (splits[mId] !== undefined) splits[mId] += unitPrice * units;
          });
        } else {
          // Fallback
          const share = item.price / item.splitMemberIds.length;
          item.splitMemberIds.forEach(mId => { if (splits[mId] !== undefined) splits[mId] += share; });
        }
      } else {
        const share = item.price / (item.splitMemberIds.length || 1);
        item.splitMemberIds.forEach(mId => {
          if (splits[mId] !== undefined) splits[mId] += share;
        });
      }
    });

    const subtotal = billData.items.reduce((s, i) => s + i.price, 0);
    const overhead = (billData.tax + billData.otherCharges - billData.discount);

    if (subtotal > 0) {
      Object.keys(splits).forEach(mId => {
        const proportion = splits[mId] / subtotal;
        splits[mId] += overhead * proportion;
      });
    } else if (uniqueMembers.length > 0) {
      Object.keys(splits).forEach(mId => {
        splits[mId] += overhead / uniqueMembers.length;
      });
    }

    return { splits, uniqueMembers, totalAmount: subtotal + overhead };
  };

  const handleFinishSplit = async () => {
    setIsProcessing(true);
    try {
      const { splits, uniqueMembers, totalAmount } = calculateSplits();

      // Format for Splitwise Service
      // We need to pass all users involved, including the current user (payer)
      // expense-payload.ts logic expects "users" array and "customAmounts" map.

      const payloadUsers = uniqueMembers.map(m => ({
        id: parseInt(m.id), // Splitwise IDs are numbers usually, but our interface uses strings. Ensure safe conversion.
        first_name: m.name.split(' ')[0],
        last_name: m.name.split(' ').slice(1).join(' ')
      }));

      // Ensure currentUser is in the list if not already (for payer logic)
      // Assuming existing service handles "user owes 0/paid full" correctly if passed in users list.

      const expenseData = {
        cost: totalAmount,
        description: billData.storeName || "Bill Split",
        group_id: billData.groupId ? parseInt(billData.groupId) : 0,
        split_equally: false, // We always calculate custom amounts here
        users: payloadUsers,
        customAmounts: splits
      };

      const payload = SplitwiseService.formatExpensePayload(expenseData);

      // Override the payer info: The payer paid full cost, owed their split.
      // formatExpensePayload sets payer as first user in list usually involved in paying?
      // Wait, SplitwiseService.formatExpensePayload assumes first user in 'users' array is payer if split_equally is true?
      // Let's check formatExpensePayload:
      // "payload[`users__${index}__paid_share`] = index === 0 ? expenseData.cost.toFixed(2) : '0.00';"
      // Correct. So we must ensure the Payer is at index 0 of the users array passed to it.

      // Re-order users so Payer is first
      const payerId = billData.payerId || authUser?.id || uniqueMembers[0]?.id; // Fallback

      if (payerId) {
        const payerIndex = expenseData.users.findIndex(u => u.id.toString() === payerId.toString());
        if (payerIndex > -1) {
          const [payer] = expenseData.users.splice(payerIndex, 1);
          expenseData.users.unshift(payer);
        }
      }

      // Track corrections if original extraction exists and user is authenticated
      if (originalExtraction && receiptId && authUser?.id && flow === AppFlow.SCAN) {
        try {
          // Compare original extraction with current billData to detect modifications
          const userModifications: {
            items?: Array<{ name: string; price: number }>;
            taxes?: number;
            otherCharges?: number;
            totalCost?: number;
          } = {};

          // Check for item modifications
          const modifiedItems: Array<{ name: string; price: number }> = [];
          billData.items.forEach((item, index) => {
            const originalItem = originalExtraction.items[index];
            if (originalItem) {
              const nameChanged = originalItem.name !== item.name;
              const priceChanged = Math.abs(originalItem.price - item.price) > 0.01;
              if (nameChanged || priceChanged) {
                modifiedItems.push({
                  name: item.name,
                  price: item.price
                });
              }
            } else {
              // New item added
              modifiedItems.push({
                name: item.name,
                price: item.price
              });
            }
          });

          // Check if items were removed (original had more items)
          if (originalExtraction.items.length > billData.items.length) {
            // Items were removed, include all current items as modifications
            userModifications.items = billData.items.map(item => ({
              name: item.name,
              price: item.price
            }));
          } else if (modifiedItems.length > 0) {
            userModifications.items = modifiedItems;
          }

          // Check for tax modifications
          if (Math.abs((originalExtraction.taxes || 0) - billData.tax) > 0.01) {
            userModifications.taxes = billData.tax;
          }

          // Check for other charges modifications
          if (Math.abs((originalExtraction.otherCharges || 0) - billData.otherCharges) > 0.01) {
            userModifications.otherCharges = billData.otherCharges;
          }

          // Check for total cost modifications
          if (Math.abs(originalExtraction.totalCost - totalAmount) > 0.01) {
            userModifications.totalCost = totalAmount;
          }

          // Only track if there are actual modifications
          if (userModifications.items?.length > 0 || 
              userModifications.taxes !== undefined || 
              userModifications.otherCharges !== undefined || 
              userModifications.totalCost !== undefined) {
            await AnalyticsClientService.trackCorrections(
              receiptId,
              authUser.id.toString(),
              originalExtraction,
              userModifications
            );
          }
        } catch (error) {
          console.warn('Failed to track corrections:', error);
          // Don't block the flow if correction tracking fails
        }
      }

      const formattedPayload = SplitwiseService.formatExpensePayload(expenseData);

      // Add detailed notes
      formattedPayload.details = billData.notes;

      const splitwiseResponse = await SplitwiseService.createExpense(formattedPayload);
      const splitwiseExpenseId = splitwiseResponse?.expenses?.[0]?.id?.toString() || null;

      // Save to database if user is authenticated
      if (authUser?.id) {
        try {
          const selectedGroup = groups.find(g => g.id === billData.groupId);
          await AnalyticsClientService.saveExpenseHistory({
            userId: authUser.id.toString(),
            storeName: billData.storeName || "Bill Split",
            date: billData.date,
            total: totalAmount,
            source: flow === AppFlow.SCAN ? 'scan' : 'manual',
            groupId: billData.groupId || undefined,
            groupName: selectedGroup?.name || undefined,
            splitwiseExpenseId: splitwiseExpenseId || undefined
          });
        } catch (error) {
          console.warn('Failed to save expense to database:', error);
          // Don't block the flow if database save fails
        }
      }

      // Save to localStorage as fallback
      const newHistoryItem = {
        id: billData.id,
        storeName: billData.storeName,
        date: billData.date,
        total: totalAmount,
        source: flow
      };

      setHistory(prev => {
        const filtered = prev.filter(h => h.id !== newHistoryItem.id);
        const updated = [newHistoryItem, ...filtered].slice(0, 5);
        localStorage.setItem('bill_splitter_history', JSON.stringify(updated));
        return updated;
      });

      setCurrentStep(Step.SUCCESS);

    } catch (error) {
      console.error("Sync failed", error);
      toast({
        title: "Sync Failed",
        description: "Could not create expense in Splitwise. " + (error as Error).message,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please upload an image smaller than 10MB", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setPreviewImage(base64);
      setIsProcessing(true);

      const extractionStartTime = Date.now();

      try {
        // Call Server Action to extract receipt data
        const extracted = await extractReceiptData({ photoDataUri: base64 });
        const processingTimeMs = Date.now() - extractionStartTime;

        // Store original extraction for correction tracking
        const originalExtractionData = {
          storeName: extracted.storeName || '',
          date: extracted.date,
          items: extracted.items.map(item => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity || 1
          })),
          totalCost: extracted.totalCost,
          taxes: extracted.taxes || 0,
          otherCharges: extracted.otherCharges || 0,
          discount: extracted.discount || 0
        };
        setOriginalExtraction(originalExtractionData);

        // Update bill data
        setBillData(prev => ({
          ...prev,
          storeName: extracted.storeName || 'New Expense',
          date: extracted.date || new Date().toISOString().split('T')[0],
          tax: extracted.taxes || 0,
          total: extracted.totalCost || 0,
          items: extracted.items.map(item => ({
            id: Math.random().toString(36).substr(2, 9),
            name: item.name,
            price: item.price,
            quantity: item.quantity || 1,
            splitType: 'equally',
            splitMemberIds: prev.selectedMemberIds.length > 0 ? prev.selectedMemberIds : [], // Don't have members yet usually
          })),
          otherCharges: extracted.otherCharges || 0,
          discount: extracted.discount || 0,
          source: AppFlow.SCAN
        }));

        // Track receipt processing if user is authenticated
        if (authUser?.id) {
          try {
            // Upload image first
            const formData = new FormData();
            formData.append('file', file);
            formData.append('userId', authUser.id.toString());

            const uploadResponse = await fetch('/api/analytics/upload-image', {
              method: 'POST',
              body: formData
            });

            if (uploadResponse.ok) {
              const uploadData = await uploadResponse.json();
              
              // Track receipt processing
              const trackedReceiptId = await AnalyticsClientService.trackReceiptProcessing({
                userId: authUser.id.toString(),
                aiExtraction: originalExtractionData,
                processingTimeMs,
                aiModelVersion: extracted.aiMetadata?.modelName || 'unknown',
                aiProvider: extracted.aiMetadata?.provider,
                aiModelName: extracted.aiMetadata?.modelName,
                aiTokensUsed: extracted.aiMetadata?.tokensUsed,
                aiProcessingTimeMs: extracted.aiMetadata?.processingTimeMs,
                existingImageUrl: uploadData.imageUrl,
                existingImageHash: uploadData.imageHash,
                originalFilename: file.name,
                fileSize: file.size
              });

              if (trackedReceiptId) {
                setReceiptId(trackedReceiptId);
              }
            }
          } catch (error) {
            console.warn('Failed to track receipt processing:', error);
            // Don't block the flow if tracking fails
          }
        }

        setCurrentStep(Step.GROUP_SELECTION);
        setShowFeedback(true);
      } catch (err) {
        console.error("Extraction error:", err);
        toast({
          title: "Scan Failed",
          description: "Could not automatically read receipt. Switching to manual entry.",
          variant: "destructive"
        });
        setBillData(prev => ({ ...prev, source: AppFlow.SCAN })); // Keep scan source but empty data
        setCurrentStep(Step.GROUP_SELECTION);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFeedback = async (type: 'accurate' | 'needs_fix') => {
    if (receiptId && authUser?.id) {
      try {
        await AnalyticsClientService.submitFeedback({
          receiptId,
          userId: authUser.id.toString(),
          feedback: {
            accuracy_rating: type === 'accurate' ? 5 : 2, // 5 for accurate, 2 for needs_fix
            helpful: type === 'accurate',
            comments: type === 'accurate' ? 'Receipt extraction was accurate' : 'Receipt extraction needs improvement'
          }
        });
      } catch (error) {
        console.warn('Failed to submit feedback:', error);
        // Don't block the flow if feedback submission fails
      }
    }
    setShowFeedback(false);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  // Combined list of all available users for selection components
  const allUsers = [
    ...(authUser ? [authUser] : []),
    ...friends,
    ...groups.flatMap(g => g.members)
  ];
  // Deduplicate for passing to components
  const uniqueAllUsers = Array.from(new Map(allUsers.map(item => [item.id, item])).values());

  // Analytics
  const analytics = {
    totalVolume: history.reduce((sum, h) => sum + (h.total || 0), 0),
    monthlyVolume: history
      .filter(h => {
        const d = new Date(h.date);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum, h) => sum + (h.total || 0), 0),
    scanCount: history.filter(h => h.source === AppFlow.SCAN).length,
    manualCount: history.filter(h => h.source === AppFlow.MANUAL).length
  };

  // ------------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------------

  if (isAuthLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Logo className="w-20 h-20" />
      </div>
    );
  }

  // If not authenticated, the Layout header handles login button, or we can show a splash here
  // But ideally useAuth ensures we have user eventually or redirect.
  // For this design, let's show the Splash if no auth, mimicking App.tsx
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 animate-fade-in">
        <div className="flex flex-col items-center text-center max-w-xs">
          <div className="mb-10 transition-transform duration-1000">
            <Logo className="w-32 h-32" />
          </div>
          <h1 className="text-4xl font-black text-gray-900 dark:text-white leading-tight tracking-tighter mb-4">
            Split Smarter.
          </h1>
          <p className="text-gray-400 dark:text-gray-500 font-bold text-sm mb-12 uppercase tracking-widest leading-relaxed">
            AI-Powered Itemized <br /> Bill Splitting
          </p>
          <button
            onClick={handleLogin}
            className="w-full py-5 px-8 bg-splitwise text-white rounded-[2rem] font-black text-base shadow-xl shadow-emerald-200/40 dark:shadow-none transition-all active:scale-95 flex items-center justify-center gap-3"
          >
            <SplitwiseLogoIcon className="h-5 w-5" />
            Join with Splitwise
          </button>
          <p className="mt-8 text-[10px] font-bold text-gray-300 dark:text-slate-700 uppercase tracking-[0.2em]">
            Powered by Gemini
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-md mx-auto bg-[#fcfcfd] dark:bg-slate-900 flex flex-col relative pb-32">
      <StepProgress currentStep={currentStep} />

      {/* Profile Overlay */}
      <ProfileOverlay
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        user={authUser}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        onLogout={logout}
        onAdminClick={isAdmin ? () => setShowAdmin(true) : undefined}
      />

      {/* Feedback Overlay */}
      <FeedbackOverlay isOpen={showFeedback} onFeedback={handleFeedback} />

      <main className="flex-1 overflow-x-hidden">
        {showAdmin && isAdmin ? (
          <div className="p-6">
            <AdminPanel history={history} onBack={() => setShowAdmin(false)} />
          </div>
        ) : (
          <>
            {currentStep === Step.FLOW_SELECTION && (
              <DashboardView
                user={authUser}
                greeting={getGreeting()}
                analytics={analytics}
                history={history}
                onProfileClick={() => setShowProfile(true)}
                onScanClick={() => { 
              setFlow(AppFlow.SCAN); 
              setCurrentStep(Step.UPLOAD);
              setOriginalExtraction(null);
              setReceiptId(null);
            }}
            onManualClick={() => { 
              setFlow(AppFlow.MANUAL); 
              setBillData({ ...DEFAULT_BILL, id: Math.random().toString(36).substr(2, 9), source: AppFlow.MANUAL }); 
              setCurrentStep(Step.GROUP_SELECTION);
              setOriginalExtraction(null);
              setReceiptId(null);
            }}
            onHistoryItemClick={handleEditHistorical}
              />
            )}

            {currentStep === Step.UPLOAD && (
          <div className="flex flex-col items-center gap-8 p-8 animate-slide-up h-full">
            <div className="text-center">
              <h2 className="text-3xl font-black text-gray-900 dark:text-white">Digitize Bill</h2>
              <p className="text-sm font-medium text-gray-400 mt-2">AI will extract items automatically</p>
            </div>

            <div className="w-full max-w-sm aspect-[4/5] bg-white dark:bg-slate-800 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-[3rem] flex flex-col items-center justify-center relative overflow-hidden group shadow-2xl transition-all">
              {isProcessing && <div className="scanner-line"></div>}

              {previewImage ? (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 relative">
                  {isProcessing && (
                    <div className="absolute inset-0 z-10 pointer-events-none opacity-30 mix-blend-overlay"
                      style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '15px 15px' }}></div>
                  )}

                  <img src={previewImage} className={`max-w-full max-h-full object-contain rounded-2xl transition-all duration-1000 ${isProcessing ? 'opacity-40 blur-[3px] scale-95 brightness-50' : 'opacity-100'}`} />

                  {isProcessing && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-30">
                      <div className="relative">
                        <Logo className="w-24 h-24 animate-pulse" />
                        <div className="absolute inset-0 rounded-full bg-indigo-500/30 blur-2xl animate-pulse"></div>
                      </div>
                      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl px-10 py-3 rounded-full shadow-2xl border border-indigo-100 dark:border-indigo-900">
                        <p className="font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.4em] text-[10px] animate-pulse">Analyzing...</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <label className="flex flex-col items-center cursor-pointer p-12 text-center w-full h-full justify-center">
                  <div className="w-24 h-24 bg-indigo-50 dark:bg-indigo-900/30 rounded-[2.5rem] flex items-center justify-center text-indigo-500 mb-6 transition-transform group-hover:scale-110 shadow-inner">
                    <i className="fas fa-file-invoice-dollar text-4xl"></i>
                  </div>
                  <span className="font-black text-gray-900 dark:text-white text-xl">Upload Receipt</span>
                  <p className="text-xs text-gray-400 font-bold mt-2 uppercase tracking-widest max-w-[150px]">Supports Images & PDF</p>
                  <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleFileSelect} />
                </label>
              )}
            </div>
          </div>
        )}

            {currentStep === Step.GROUP_SELECTION && (
          <div className="p-8 animate-slide-up">
            <GroupSelector
              selectedGroupId={billData.groupId}
              selectedMemberIds={billData.selectedMemberIds}
              onChange={(g, m) => setBillData(prev => ({ ...prev, groupId: g, selectedMemberIds: m }))}
              groups={groups}
              friends={uniqueAllUsers}
            />
          </div>
        )}

            {currentStep === Step.ITEM_SPLITTING && (
          <div className="p-8 animate-slide-up">
            <ItemSplitter
              items={billData.items}
              selectedMembers={uniqueAllUsers.filter(u => billData.selectedMemberIds.includes(u.id))}
              tax={billData.tax}
              discount={billData.discount}
              otherCharges={billData.otherCharges}
              flow={flow}
              onChange={(items, tax, discount, other) => setBillData(prev => ({ ...prev, items, tax, discount, otherCharges: other }))}
            />
          </div>
        )}

            {currentStep === Step.REVIEW && (
          <div className="p-8 animate-slide-up">
            <ReviewScreen
              billData={billData}
              onUpdate={(updates) => setBillData(prev => ({ ...prev, ...updates }))}
              members={uniqueAllUsers}
              groups={groups}
              authUserId={authUser?.id}
            />
          </div>
        )}

            {currentStep === Step.SUCCESS && (
              <div className="fixed inset-0 bg-white dark:bg-slate-900 z-50 flex flex-col items-center justify-center p-12">
                <div className="w-28 h-28 bg-emerald-50 dark:bg-emerald-900/20 rounded-[2.5rem] flex items-center justify-center text-emerald-500 text-5xl mb-8 relative">
                  <i className="fas fa-check"></i>
                  <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-ping"></div>
                </div>
                <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">Split Synced!</h2>
                <p className="text-center text-gray-400 mt-4 max-w-[240px]">Expenses and group balances have been updated in Splitwise.</p>
                <button onClick={startNewSplit} className="mt-14 w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-lg shadow-xl shadow-indigo-100 dark:shadow-none active:scale-95 transition-transform">Start New Split</button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer Navigation */}
      {currentStep > Step.FLOW_SELECTION && currentStep < Step.SUCCESS && (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-[#fcfcfd] dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 p-6 safe-bottom flex gap-4 z-40 shadow-[0_-20px_40px_rgba(0,0,0,0.12)]">
          <button
            disabled={isProcessing}
            onClick={() => currentStep === Step.UPLOAD || (currentStep === Step.GROUP_SELECTION && flow === AppFlow.MANUAL) ? setCurrentStep(Step.FLOW_SELECTION) : setCurrentStep(prev => prev - 1)}
            style={{ outline: 'none', boxShadow: 'none', WebkitTapHighlightColor: 'transparent' }}
            className="flex-1 py-4 bg-gray-50 dark:bg-slate-800 text-gray-500 font-bold rounded-2xl disabled:opacity-50 transition-all active:scale-95 focus:outline-none focus:ring-0"
          >
            Back
          </button>
          <button
            disabled={isProcessing || (currentStep === Step.UPLOAD && !previewImage) || (currentStep === Step.GROUP_SELECTION && billData.selectedMemberIds.length === 0)}
            onClick={() => {
              if (currentStep === Step.REVIEW) {
                handleFinishSplit();
              } else if (currentStep === Step.GROUP_SELECTION) {
                // When moving to item splitting, ensure all items are assigned to all selected members by default
                setBillData(prev => ({
                  ...prev,
                  items: prev.items.map(item => ({
                    ...item,
                    splitMemberIds: prev.selectedMemberIds
                  }))
                }));
                setCurrentStep(prev => prev + 1);
              } else {
                setCurrentStep(prev => prev + 1);
              }
            }}
            style={{ outline: 'none', boxShadow: 'none', WebkitTapHighlightColor: 'transparent' }}
            className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 dark:shadow-none transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 focus:outline-none focus:ring-0"
          >
            {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
            {currentStep === Step.REVIEW ? 'Sync & Finish' : 'Continue'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function BillSplitterPage() {
  return <BillSplitterFlow />;
}
