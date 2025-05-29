"use client";

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      console.error("Splitwise authentication error:", error);
      router.push('/login?error=splitwise_auth_failed');
      return;
    }

    if (code) {
      router.push('/');
    } else {
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