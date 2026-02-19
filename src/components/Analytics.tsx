"use client";

import Script from "next/script";
import { Analytics as VercelAnalytics } from "@vercel/analytics/react";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export function Analytics() {
  return (
    <>
      {/* Vercel Analytics - works automatically, no config needed */}
      <VercelAnalytics />
      
      {/* Google Analytics - requires NEXT_PUBLIC_GA_ID env var */}
      {GA_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_ID}', { 
                page_path: window.location.pathname,
                send_page_view: true
              });
            `}
          </Script>
        </>
      )}
    </>
  );
}
