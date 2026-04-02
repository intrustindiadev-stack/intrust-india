import { Inter, Outfit, Poppins, Sora, DM_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/contexts/AuthContext";
import { ThemeProvider } from '@/lib/contexts/ThemeContext';
import PWAInstallPrompt from '@/components/ui/PWAInstallPrompt';
import StructuredData from "@/components/seo/StructuredData";
import { Toaster } from 'react-hot-toast';


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
    default: "INTRUST | Gift Cards, NFC & Smart E-commerce",
    template: "%s | INTRUST"
  },
  description: "INTRUST is India's premium platform for Gift Cards, innovative NFC solutions, and a curated e-commerce experience. Discover a faster, smarter way to shop and share.",
  keywords: ["gift cards india", "nfc cards india", "digital gifting", "nfc solutions", "premium ecommerce", "InTrust India", "smart shopping"],
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
    title: "INTRUST | Premium Gift Cards & NFC Tech",
    description: "The next generation of e-commerce. Instant gift cards and innovative NFC products delivered with speed and style across India.",
    url: "https://www.intrustindia.com",
    siteName: "InTrust India",
    images: [
      {
        url: "/icon.png",
        width: 1200,
        height: 630,
        alt: "InTrust India - Gift Cards & NFC",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "INTRUST | Gift Cards & NFC Innovations",
    description: "Shop premium gift cards and state-of-the-art NFC solutions with INTRUST India.",
    images: ["/og-image.png"],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "INTRUST",
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
};

export const viewport = {
  themeColor: "#171A21",
  width: "device-width",
  initialScale: 1,
};


export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable} ${poppins.variable} ${sora.variable} ${dmSans.variable}`}>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Material+Icons+Round&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <AuthProvider>
            <StructuredData />
            {children}
            <Toaster position="top-center" reverseOrder={false} />
            <PWAInstallPrompt />
          </AuthProvider>
        </ThemeProvider>

      </body>
    </html>
  );
}