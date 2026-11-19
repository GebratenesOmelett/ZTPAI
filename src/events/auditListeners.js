const { EVENT } = require("./eventTypes");

function registerAuditListeners(eventBus, runInTransaction) {
    const save = event => runInTransaction(({ auditLog }) => auditLog.create({
        eventType: event.name,
        payload: event.payload,
        createdAt: event.occurredAt
    }));

    for (const eventType of Object.values(EVENT)) {
        eventBus.subscribe(eventType, save);
    }
}

module.exports = { registerAuditListeners };
