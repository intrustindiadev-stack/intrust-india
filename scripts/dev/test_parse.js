function parseComponents(components = []) {
    let bodyText = '';
    let headerText = '';
    let headerFormat = 'TEXT';
    let footerText = '';
    const variables = [];
    let buttons = [];

    for (const comp of components) {
        const type = comp.type?.toLowerCase();

        if (type === 'body') {
            bodyText = comp.text || '';
            const matches = [];
            const re = /\{\{(\d+)\}\}/g;
            let m;
            while ((m = re.exec(bodyText)) !== null) {
                const pos = parseInt(m[1], 10);
                if (!matches.includes(pos)) matches.push(pos);
            }
            matches.sort((a, b) => a - b).forEach((pos, idx) => {
                variables.push({
                    key: `var_${pos}`,
                    position: pos,
                    placeholderToken: `{{${pos}}}`,
                    label: `Variable ${pos}`,
                    placeholder: `Enter value for {{${pos}}}`,
                    required: true,
                    defaultFromContact: null
                });
            });
        }
    }

    return { bodyText, variables };
}

function normalizeOmniflowTemplate(raw) {
    let comps = raw.components || [];
    if (typeof comps === 'string') {
        try { comps = JSON.parse(comps); } catch (e) { comps = []; }
    }
    return parseComponents(comps);
}

const raw = {
  "components": "[{\"type\":\"BODY\",\"text\":\"\\u26a0\\ufe0f *Low Wallet Balance Alert*\\n\\nYour InTrust wallet balance has dropped below \\u20b950.\\nCurrent Balance: \\u20b9{{1}}\\n\\nTop up now to ensure uninterrupted services and purchases.\",\"example\":{\"body_text\":[[\"Balance\"]]}}]"
};

console.log(JSON.stringify(normalizeOmniflowTemplate(raw), null, 2));
