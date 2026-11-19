function toEntry(row) {
    return {
        id: Number(row.id),
        eventType: row.event_type,
        payload: row.payload,
        createdAt: row.created_at
    };
}

function createAuditKnexRepository(db) {
    return {
        async create({ eventType, payload, createdAt }) {
            await db("audit_log").insert({ event_type: eventType, payload, created_at: createdAt });
        },
        async list({ eventType, page, limit }) {
            const base = db("audit_log").modify(qb => {
                if (eventType) qb.where("event_type", eventType);
            });

            const [rows, { count }] = await Promise.all([
                base.clone()
                    .select("id", "event_type", "payload", "created_at")
                    .orderBy("created_at", "desc")
                    .orderBy("id", "desc")
                    .limit(limit)
                    .offset((page - 1) * limit),
                base.clone().count({ count: "*" }).first()
            ]);

            return { items: rows.map(toEntry), total: Number(count) };
        }
    };
}

module.exports = { createAuditKnexRepository };
