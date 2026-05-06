import { Inter, Outfit, Poppins, Sora, DM_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/contexts/AuthContext";
import { ThemeProvider } from '@/lib/contexts/ThemeContext';
import PWAInstallPrompt from '@/components/ui/PWAInstallPrompt';
import StructuredData from "@/components/seo/StructuredData";
import { Toaster } from 'react-hot-toast';
import { ConfettiProvider } from '@/components/ui/ConfettiProvider';
import { ChatProvider } from '@/components/chat/ChatProvider';
import ChatBubble from '@/components/chat/ChatBubble';
import ChatWindow from '@/components/chat/ChatWindow';
import ErrorBoundary from '@/components/error/ErrorBoundary';


const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  metadataBase: new URL("https://www.intrustindia.com"),
  title: {
    default: "InTrust India | E-commerce, Gift Cards & NFC Solutions",
    template: "%s | InTrust India"
  },
  description: "InTrust India offers gift cards, NFC smart cards, and a curated e-commerce experience. Trusted by 10,000+ customers across India.",
  keywords: [
    "gift cards india",
    "nfc smart card india",
    "digital gifting india",
    "intrust india",
    "intrustindia.com",
    "online shopping india",
    "bill payment app india",
    "premium ecommerce india"
  ],
  authors: [{ name: "InTrust India" }],
  creator: "InTrust India",
  publisher: "InTrust India",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "InTrust India | Gift Cards & NFC",
    description: "Purchase gift cards, NFC solutions, and enjoy a curated e-commerce experience across India.",
    url: "https://www.intrustindia.com",
    siteName: "InTrust India",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "InTrust India - Gift Cards & NFC Solutions",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "InTrust India | Gift Cards & NFC",
    description: "Gift cards, NFC innovations, and premium e-commerce — all in one place with InTrust India.",
    images: ["/logo.png"],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "InTrust",
  },
  category: "ecommerce",
  icons: {
    icon: "/icon.png",
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "URKYF9Wrn34sDz_K6Zs4Z9_lO3J-Y-E4Sg-p-1w4",
  },
};

export const viewport = {
  themeColor: "#171A21",
  width: "device-width",
  initialScale: 1,
};


export default function RootLayout({ children }) {
  return (
    <html lang="en-IN" className={`${inter.variable} ${outfit.variable} ${poppins.variable} ${sora.variable} ${dmSans.variable}`}>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Material+Icons+Round&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        <ConfettiProvider>
          <ThemeProvider>
            <AuthProvider>
              <ChatProvider>
                <StructuredData />
                <ErrorBoundary>
                  {children}
                </ErrorBoundary>
                <ChatBubble />
                <ChatWindow />
                <Toaster position="top-center" reverseOrder={false} />
                <PWAInstallPrompt />
              </ChatProvider>
            </AuthProvider>
          </ThemeProvider>
        </ConfettiProvider>
      </body>
    </html>
  );
}