import type { Metadata, Viewport } from 'next'
import { DM_Sans } from 'next/font/google'
import './globals.css'
import { AppProvider } from '@/lib/AppContext'
import ClientRuntimeFixes from '@/components/ClientRuntimeFixes'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700', '800'],
})

export const metadata: Metadata = {
  title: 'inyourtask',
  description: 'Smart task management platform with AI assistant',
  icons: {
    icon: '/pavicon.png',
    apple: '/pavicon.png',
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#3d6ba3',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Suppress Chrome extension errors IMMEDIATELY
              (function() {
                // Override console.error
                const _err = console.error;
                console.error = function(...args) {
                  const msg = String(args[0] || '');
                  if (msg.includes('runtime.lastError') || 
                      msg.includes('message port closed') ||
                      msg.includes('clickup') ||
                      msg.includes('chrome-ext') ||
                      msg.includes('inject_main')) return;
                  _err.apply(console, args);
                };
                
                // Override console.warn
                const _warn = console.warn;
                console.warn = function(...args) {
                  const msg = String(args[0] || '');
                  if (msg.includes('React DevTools') || 
                      msg.includes('Download the React')) return;
                  _warn.apply(console, args);
                };

                // Suppress unhandled rejections from extensions
                window.addEventListener('unhandledrejection', function(e) {
                  const msg = String(e.reason || '');
                  if (msg.includes('runtime.lastError') || 
                      msg.includes('message port') ||
                      msg.includes('clickup')) {
                    e.preventDefault();
                  }
                });

                // Suppress global errors from extensions
                window.addEventListener('error', function(e) {
                  const msg = String(e.message || '');
                  if (msg.includes('runtime.lastError') || 
                      msg.includes('message port') ||
                      msg.includes('clickup') ||
                      msg.includes('inject_main')) {
                    e.preventDefault();
                  }
                });
              })();
            `,
          }}
        />
      </head>
      <body className={dmSans.className} suppressHydrationWarning>
        <AppProvider>
          <ClientRuntimeFixes />
          {children}
        </AppProvider>
      </body>
    </html>
  )
}
