/**
 * Normalizes raw template response into a unified UI model.
 * Preserves header, footer, and buttons from the Omniflow API.
 */
export function normalizeTemplate(raw) {
    if (!raw) return null;

    const rawVars = Array.isArray(raw.variables) ? raw.variables : [];
    const normalizedVars = rawVars.map((v, idx) => ({
        key: v.key || `var_${idx + 1}`,
        position: v.position || idx + 1,
        placeholderToken: `{{${idx + 1}}}`,
        label: v.label || `Variable ${idx + 1}`,
        placeholder: v.placeholder || `Enter ${v.label || `Variable ${idx + 1}`}`,
        required: v.required !== false,
        defaultFromContact: v.defaultFromContact || null,
        example: v.example || v.placeholder || ''
    }));

    return {
        id: raw.id || raw.name,
        name: raw.name || raw.id,
        title: raw.title || raw.name || 'Untitled Template',
        description: raw.description || '',
        text: raw.text || raw.body || '',
        // Preserve structured fields from the API
        header: raw.header || null,
        footer: raw.footer || null,
        buttons: Array.isArray(raw.buttons) ? raw.buttons : [],
        language: raw.language || 'en',
        category: raw.category || 'UTILITY',
        status: raw.status || 'APPROVED',
        variables: normalizedVars
    };
}
