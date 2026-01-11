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
      <div className="flex justify-center items-center min-h-[calc(100dvh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen flex flex-col items-center justify-center p-8 animate-fade-in">
        <div className="flex flex-col items-center text-center max-w-xs">
          <div className="mb-10 transition-transform duration-1000">
            <Logo className="w-32 h-32 mx-auto" />
          </div>
          <h1 className="text-4xl font-black text-gray-900 dark:text-white leading-tight tracking-tighter mb-4">
            Split Smarter.
          </h1>
          <p className="text-gray-400 dark:text-gray-500 font-bold text-sm mb-12 uppercase tracking-widest leading-relaxed">
            AI-Powered Itemized <br /> Bill Splitting
          </p>
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
          <p className="mt-8 text-[10px] font-bold text-gray-300 dark:text-slate-700 uppercase tracking-[0.2em]">
            Powered by AI
          </p>
        </div>
      </div>
    </>
  );
}

export default function LoginPage() {
  const fallbackUI = (
    <div className="flex justify-center items-center min-h-[calc(100dvh-8rem)]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <React.Suspense fallback={fallbackUI}>
      <LoginContent />
    </React.Suspense>
  );
}