"use client";

import * as React from "react";

/**
 * Login layout: prevents scroll and constrains content to viewport.
 */
export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  React.useEffect(() => {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="h-dvh min-h-dvh max-h-dvh overflow-hidden">
      {children}
    </div>
  );
}
