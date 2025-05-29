"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { AppIcon } from "@/components/icons/app-icon";
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
      <div className="flex flex-col items-center justify-center min-h-[calc(100dvh-8rem)] px-4 py-8 animate-fade-in">
        <div className="mb-8 text-center">
          <AppIcon className="h-16 w-16 text-primary mx-auto mb-3" />
          <img className="hidden sm:block"  src="/assets/bill-splitter-logo.svg" width={300}/>
          <p className="text-muted-foreground mt-1">Simplify shared expenses.</p>
        </div>

        <div className="w-full max-w-xs space-y-4">
          <Button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-md tap-scale"
            size="lg"
          >
            {isRedirecting ? ( 
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <SplitwiseLogoIcon className="mr-2 h-5 w-5" />
            )}
            Continue with Splitwise
          </Button>
        </div>

        <p className="mt-12 text-center text-xs text-muted-foreground">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
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