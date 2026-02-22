"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Logo } from "@/components/icons/logo";
import { SplitwiseLogoIcon } from "@/components/icons/SplitwiseLogoIcon";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoading: isAuthLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [isRedirecting, setIsRedirecting] = React.useState(false);

  React.useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, isAuthLoading, router]);

  React.useEffect(() => {
    const error = searchParams.get('error');
    const description = searchParams.get('description');
    if (error) {
      toast({
        title: "Login Failed",
        description: description || `An error occurred: ${error}. Please try again.`,
        variant: "destructive",
      });
      router.replace('/login', { scroll: false });
    }
  }, [searchParams, toast, router]);

  const handleLogin = () => {
    setIsRedirecting(true);
    login();
  };

  const isLoading = isAuthLoading || isRedirecting;

  if (isAuthLoading || (!isAuthLoading && isAuthenticated)) {
    return (
      <div className="h-dvh flex justify-center items-center overflow-hidden">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="h-dvh overflow-hidden flex flex-col items-center justify-center p-6 sm:p-8 animate-fade-in">
        <div className="flex flex-col items-center text-center max-w-xs flex-shrink-0">
          <div className="mb-3 sm:mb-4 transition-transform duration-1000">
            <Logo className="w-24 h-24 sm:w-32 sm:h-32 mx-auto" />
          </div>
          <div className="mb-6 sm:mb-10">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-900 dark:text-white mb-4 sm:mb-6">
              <span className="font-black">Split</span><span className="bg-clip-text text-transparent bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700">Scan</span>
            </h1>
            <div className="flex items-center justify-center gap-4">
              <div className="h-[1px] w-6 bg-gray-100 dark:bg-slate-800"></div>
              <p className="text-gray-400 dark:text-slate-500 font-bold uppercase tracking-[0.4em] text-[10px] whitespace-nowrap">
                Splitting made intelligent
              </p>
              <div className="h-[1px] w-6 bg-gray-100 dark:bg-slate-800"></div>
            </div>
          </div>
          <Button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full py-5 px-8 bg-splitwise text-white rounded-[2rem] font-black text-base shadow-xl shadow-emerald-200/40 dark:shadow-none transition-all active:scale-95 flex items-center justify-center gap-3"
            size="lg"
          >
            {isRedirecting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <SplitwiseLogoIcon className="h-5 w-5" />
            )}
            Join with Splitwise
          </Button>
        </div>
      </div>
    </>
  );
}

export default function LoginPage() {
  const fallbackUI = (
    <div className="h-dvh flex justify-center items-center overflow-hidden">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <React.Suspense fallback={fallbackUI}>
      <LoginContent />
    </React.Suspense>
  );
}