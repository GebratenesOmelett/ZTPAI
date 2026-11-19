const { EVENT } = require("./eventTypes");

function registerNotificationListeners(eventBus, runInTransaction, logger = console) {
    eventBus.subscribe(EVENT.RESERVATION_CANCELLED, async ({ payload }) => {
        if (payload.cancelledBy === payload.userId) return;

        const owner = await runInTransaction(({ users }) => users.findById(payload.userId));
        if (!owner) return;

        logger.log(`[notification] to: ${owner.email} - your reservation #${payload.reservationId} (room ${payload.roomId}) was cancelled by an administrator (user ${payload.cancelledBy})`);
    });
}

module.exports = { registerNotificationListeners };
