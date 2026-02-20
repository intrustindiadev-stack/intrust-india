import '../app/globals.css';
import { Inter, Outfit, Poppins } from "next/font/google";

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

export default function MyApp({ Component, pageProps }) {
    return (
        <div className={`${inter.variable} ${outfit.variable} ${poppins.variable} font-sans antialiased`}>
            <Component {...pageProps} />
        </div>
    );
}
