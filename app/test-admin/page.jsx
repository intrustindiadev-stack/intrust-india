'use client';

import { testAdminClient } from '../(admin)/admin/giftcards/test-admin';
import { useState } from 'react';

export default function TestAdminPage() {
    const [result, setResult] = useState(null);
    const [testing, setTesting] = useState(false);

    async function runTest() {
        setTesting(true);
        setResult(null);

        const testResult = await testAdminClient();
        setResult(testResult);
        setTesting(false);
    }

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-8">Test Admin Client</h1>

                <div className="bg-white rounded-xl p-6 shadow-lg mb-6">
                    <button
                        onClick={runTest}
                        disabled={testing}
                        className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        {testing ? '🔄 Testing...' : '🧪 Test Admin Client Connection'}
                    </button>
                </div>

                {result && (
                    <div className={`rounded-xl p-6 shadow-lg ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                        <h2 className="text-xl font-bold mb-4">
                            {result.success ? '✅ Success' : '❌ Failed'}
                        </h2>
                        <pre className="bg-white p-4 rounded-lg overflow-auto text-sm">
                            {JSON.stringify(result, null, 2)}
                        </pre>
                    </div>
                )}

                <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-yellow-900 mb-2">🔧 Troubleshooting</h3>
                    <p className="text-yellow-800 mb-4">
                        If the test fails, try these steps:
                    </p>
                    <ol className="list-decimal list-inside text-yellow-800 space-y-2">
                        <li>Stop the dev server (Ctrl+C in terminal)</li>
                        <li>Restart it with: <code className="bg-yellow-100 px-2 py-1 rounded">npm run dev</code></li>
                        <li>Hard refresh this page (Ctrl+Shift+R)</li>
                        <li>Click the test button again</li>
                    </ol>
                </div>
            </div>
        </div>
    );
}
