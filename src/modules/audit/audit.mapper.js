function toAuditLogEntryResponse(entry) {
    return {
        id: entry.id,
        eventType: entry.eventType,
        payload: entry.payload,
        createdAt: new Date(entry.createdAt).toISOString()
    };
}

module.exports = { toAuditLogEntryResponse };
