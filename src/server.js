const config = require("./config");
const { createApp } = require("./app");
const { createKnexUnitOfWork } = require("./db/unitOfWork.knex");
const { createMemoryUnitOfWork } = require("./db/unitOfWork.memory");
const { createEventBus } = require("./events/eventBus");
const { registerAuditListeners } = require("./events/auditListeners");
const { registerNotificationListeners } = require("./events/notificationListeners");

const db = config.REPOSITORY === "memory" ? null : require("./db/knex");
const unitOfWork = db ? createKnexUnitOfWork(db) : createMemoryUnitOfWork();

const eventBus = createEventBus();
registerAuditListeners(eventBus, unitOfWork.runInTransaction);
registerNotificationListeners(eventBus, unitOfWork.runInTransaction);

const app = createApp({ config, runInTransaction: unitOfWork.runInTransaction, eventBus });

const server = app.listen(config.PORT, err => {
    if (err) {
        console.error(`Cannot start server on port ${config.PORT}: ${err.message}`);
        process.exit(1);
    }
    console.log(`Server running on http://localhost:${config.PORT} (repository: ${config.REPOSITORY})`);
});

let shuttingDown = false;

function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`${signal} received, shutting down`);

    server.close(async () => {
        if (db) await db.destroy();
        console.log("HTTP server closed, database connections released");
        process.exit(0);
    });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
