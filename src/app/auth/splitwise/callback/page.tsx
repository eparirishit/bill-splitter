// filepath: /Users/rishit.epari/Documents/repos/studio-36iw9/src/app/auth/splitwise/callback/page.tsx
"use client";

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { handleSplitwiseOAuthCallback } from '@/services/splitwise'; // Adjust path as needed

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    // const state = searchParams.get('state'); // If you used a state parameter

    if (code) {
      handleSplitwiseOAuthCallback(code)
        .then((success) => {
          if (success) {
            // Redirect to a protected page or dashboard
            router.push('/dashboard'); // Or wherever appropriate
          } else {
            // Handle auth failure - redirect to login or show error
            router.push('/login?error=splitwise_auth_failed');
          }
        })
        .catch(error => {
          console.error("Splitwise callback error:", error);
          router.push('/login?error=splitwise_callback_error');
        });
    } else {
      // No code found, redirect or show error
      console.error("No authorization code found in callback.");
      router.push('/login?error=splitwise_no_code');
    }
  }, [router, searchParams]);

  return <div>Processing Splitwise authentication...</div>;
}

export default function SplitwiseCallbackPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <CallbackContent />
        </Suspense>
    );
}