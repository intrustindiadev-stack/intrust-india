import { Inter, Outfit, Poppins } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/contexts/AuthContext";
import { ThemeProvider } from '@/lib/contexts/ThemeContext';
import PWAInstallPrompt from '@/components/ui/PWAInstallPrompt';
import StructuredData from "@/components/seo/StructuredData";


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

export const metadata = {
  metadataBase: new URL("https://www.intrustindia.com"),
  title: {
    default: "INTRUST",
    template: "%s | INTRUST"
  },
  description: "InTrust India offers instant personal loans, business loans, and gold loans with fast approval. Manage your investments, insurance, and payments in one secure platform.",
  keywords: ["personal loan india", "business loan bhopal", "gold loan india", "instant loan approval india", "financial services india", "InTrust India"],
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
    title: "InTrust India | Financial Services & Instant Loans",
    description: "Secure and fast financial services including personal and business loans. Your trusted partner for financial growth in India.",
    url: "https://www.intrustindia.com",
    siteName: "InTrust India",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "InTrust India - Financial Services",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "InTrust India | Instant Loans & Financial Services",
    description: "Get instant loans and manage your finances securely with InTrust India.",
    images: ["/og-image.png"],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "InTrust India",
  },
  category: "finance",
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
    <html lang="en" className={`${inter.variable} ${outfit.variable} ${poppins.variable}`}>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Material+Icons+Round&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <AuthProvider>
            <StructuredData />
            {children}
            <PWAInstallPrompt />
          </AuthProvider>
        </ThemeProvider>

      </body>
    </html>
  );
}