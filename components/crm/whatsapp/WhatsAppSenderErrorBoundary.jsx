'use client';

import React, { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Error Boundary for WhatsApp Sender components to catch render failures
 * gracefully and provide a retry mechanism.
 */
export default class WhatsAppSenderErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('[WhatsAppSenderErrorBoundary] Render error caught:', error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
        if (this.props.onReset) {
            this.props.onReset();
        }
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl flex flex-col items-center justify-center text-center space-y-3 my-4">
                    <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                        <AlertTriangle size={24} />
                    </div>
                    <div className="space-y-1">
                        <h4 className="text-base font-bold text-slate-900">WhatsApp Interface Error</h4>
                        <p className="text-sm text-slate-500 max-w-md">
                            {this.state.error?.message || 'An unexpected error occurred while rendering the WhatsApp template tool.'}
                        </p>
                    </div>
                    <button
                        onClick={this.handleReset}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                    >
                        <RefreshCw size={16} />
                        Try Again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
