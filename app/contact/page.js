'use client';

import PageHero from '@/components/ui/PageHero';
import ContactForm from '@/components/contact/ContactForm';
import Footer from '@/components/layout/Footer';
import Navbar from '@/components/layout/Navbar';
import { motion } from 'framer-motion';
import { Mail, MapPin, Phone, Clock, ExternalLink } from 'lucide-react';

export default function ContactPage() {
    const contactInfo = [
        {
            icon: Phone,
            title: "Talk to Sales",
            details: ["Interested in our merchant solutions? Just pick up the phone to chat with a member of our sales team."],
            linkText: "1800-203-0052",
            action: "tel:18002030052",
            color: "bg-blue-50 text-blue-600"
        },
        {
            icon: Mail,
            title: "Contact Support",
            details: ["Sometimes you need a little help. Don't worry, we're here for you. Shoot us an email anytime."],
            linkText: "info@intrustindia.com",
            action: "mailto:info@intrustindia.com",
            color: "bg-purple-50 text-purple-600"
        },
        {
            icon: MapPin,
            title: "Visit Headquarters",
            details: ["Come say hello at our HQ. TF-312/MM09, Ashima Mall, Narmadapuram Rd, Danish Nagar, Bhopal, MP 462026."],
            linkText: "View on Google Maps",
            action: "https://maps.app.goo.gl/intrustbhopal",
            color: "bg-amber-50 text-amber-600"
        }
    ];

    return (
        <div className="min-h-screen bg-[#FAFAFA] dark:bg-gray-900">
            <Navbar />

            <PageHero
                title="Get in Touch"
                subtitle="We'd love to hear from you. Our friendly team is always here to chat."
                variant="contact"
            />

            <div className="max-w-7xl mx-auto px-6 -mt-20 relative z-10 mb-20">
                <div className="grid lg:grid-cols-5 gap-8 lg:gap-12">

                    {/* Left Column: Info & Map */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Contact Cards */}
                        <div className="space-y-4">
                            {contactInfo.map((item, index) => (
                                <motion.a
                                    key={index}
                                    href={item.action}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2 + (index * 0.1) }}
                                    className="block p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all duration-300 group"
                                >
                                    <div className="flex gap-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${item.color} group-hover:scale-110 transition-transform duration-300`}>
                                            <item.icon size={24} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-1">{item.title}</h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 leading-relaxed">{item.details}</p>
                                            <span className="text-sm font-semibold text-[#7A93AC] group-hover:text-[#171A21] transition-colors flex items-center gap-1">
                                                {item.linkText} <ExternalLink size={14} />
                                            </span>
                                        </div>
                                    </div>
                                </motion.a>
                            ))}
                        </div>

                        {/* Styled Map Container */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="bg-white dark:bg-gray-800 p-2 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700"
                        >
                            <div className="rounded-xl overflow-hidden h-64 relative group">
                                <iframe
                                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d29341.251502878356!2d77.4181652069092!3d23.182736102755452!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x397c43970668176f%3A0x6e33b64a351a4ed9!2sINTRUST%20FINANCIAL%20SERVICES%20(INDIA)%20PVT%20LTD!5e0!3m2!1sen!2sin!4v1775679291628!5m2!1sen!2sin"
                                    width="100%"
                                    height="100%"
                                    style={{ border: 0 }}
                                    allowFullScreen=""
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                    className="group-hover:scale-105 transition-transform duration-700"
                                ></iframe>

                                <div className="absolute top-4 right-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-white/50 dark:border-gray-700 text-xs font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Open Now
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Right Column: Form */}
                    <motion.div
                        className="lg:col-span-3"
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.8 }}
                    >
                        <ContactForm />
                    </motion.div>

                </div>
            </div>

            <Footer />
        </div>
    );
}