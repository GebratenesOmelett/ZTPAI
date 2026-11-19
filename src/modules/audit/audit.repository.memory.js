function createAuditRepository(state) {
    let nextId = Math.max(0, ...state.auditLog.map(e => e.id)) + 1;

    return {
        async create({ eventType, payload, createdAt }) {
            state.auditLog.push({ id: nextId++, eventType, payload: structuredClone(payload), createdAt });
        },
        async list({ eventType, page, limit }) {
            const filtered = state.auditLog
                .filter(e => eventType === undefined || e.eventType === eventType)
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt) || b.id - a.id);

            return { items: filtered.slice((page - 1) * limit, page * limit), total: filtered.length };
        }
    };
}

module.exports = { createAuditRepository };
