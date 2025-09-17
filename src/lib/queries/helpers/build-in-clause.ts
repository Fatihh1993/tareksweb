export function buildInClause(paramBase: string, values: string[]) {
    if (!values || values.length === 0) return { sql: '', params: {} };
    const placeholders = values.map((_, i) => `@${paramBase}${i}`).join(', ');
    const params: Record<string, unknown> = {};
    values.forEach((v, i) => (params[`${paramBase}${i}`] = v));
    return { sql: `(${placeholders})`, params };
}