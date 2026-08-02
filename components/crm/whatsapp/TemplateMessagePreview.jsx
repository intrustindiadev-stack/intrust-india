'use client';

import React from 'react';

/**
 * Shared, React-safe WhatsApp template message preview renderer.
 * 
 * Parses template text into segments, replacing tokens ({{1}}, {{name}}, etc.)
 * with variable values or highlighted placeholder tokens.
 * Preserves line breaks safely without using dangerouslySetInnerHTML.
 */
export default function TemplateMessagePreview({
    text = '',
    variables = [],
    variableValues = {},
    highlightPlaceholders = true,
    className = ''
}) {
    if (!text) {
        return <span className="text-slate-400 italic text-xs">No message text available</span>;
    }

    // Map variable key or position to value
    const getValueForToken = (tokenContent, tokenIndex) => {
        // tokenContent could be "1", "2", "name", "topic", etc.
        const cleanKey = tokenContent.trim();
        
        // 1. Direct key match in variableValues
        if (variableValues[cleanKey] !== undefined && variableValues[cleanKey] !== '') {
            return { resolved: true, value: variableValues[cleanKey] };
        }

        // 2. Position-based numeric index match (e.g. {{1}} -> 1st variable in array)
        if (!isNaN(cleanKey)) {
            const pos = parseInt(cleanKey, 10);
            const varObj = variables[pos - 1];
            if (varObj && variableValues[varObj.key] !== undefined && variableValues[varObj.key] !== '') {
                return { resolved: true, value: variableValues[varObj.key] };
            }
        }

        // 3. Match variable by index fallback
        const varByIndex = variables[tokenIndex];
        if (varByIndex && variableValues[varByIndex.key] !== undefined && variableValues[varByIndex.key] !== '') {
            return { resolved: true, value: variableValues[varByIndex.key] };
        }

        return { resolved: false, token: `{{${cleanKey}}}` };
    };

    // Regex to split by {{...}}
    const pattern = /\{\{([^}]+)\}\}/g;
    const lines = text.split('\n');

    return (
        <div className={`whitespace-pre-wrap font-sans text-sm text-slate-800 leading-relaxed ${className}`}>
            {lines.map((line, lineIdx) => {
                let lastIdx = 0;
                const lineElements = [];
                let match;
                let tokenCount = 0;

                // Reset pattern state for each line
                pattern.lastIndex = 0;

                while ((match = pattern.exec(line)) !== null) {
                    const matchStart = match.index;
                    const matchEnd = pattern.lastIndex;
                    const tokenContent = match[1];

                    // Push preceding text segment
                    if (matchStart > lastIdx) {
                        lineElements.push(line.substring(lastIdx, matchStart));
                    }

                    // Resolve token value
                    const { resolved, value, token } = getValueForToken(tokenContent, tokenCount);

                    if (resolved) {
                        lineElements.push(
                            <span
                                key={`token-${lineIdx}-${tokenCount}`}
                                className="font-semibold text-slate-900 bg-emerald-50 text-emerald-900 px-1 py-0.5 rounded border border-emerald-200/80"
                            >
                                {value}
                            </span>
                        );
                    } else if (highlightPlaceholders) {
                        lineElements.push(
                            <span
                                key={`token-${lineIdx}-${tokenCount}`}
                                className="font-mono text-xs font-medium text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 inline-block my-0.5"
                            >
                                {token}
                            </span>
                        );
                    } else {
                        lineElements.push(token);
                    }

                    tokenCount++;
                    lastIdx = matchEnd;
                }

                // Push remaining line text
                if (lastIdx < line.length) {
                    lineElements.push(line.substring(lastIdx));
                }

                return (
                    <React.Fragment key={`line-${lineIdx}`}>
                        {lineIdx > 0 && <br />}
                        {lineElements}
                    </React.Fragment>
                );
            })}
        </div>
    );
}
