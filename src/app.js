const express = require("express");
const swaggerUi = require("swagger-ui-express");
const openapiDocument = require("./docs/openapi.json");
const requestLogger = require("./middleware/requestLogger");
const authenticate = require("./middleware/authenticate");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");
const { noopEventBus } = require("./events/eventBus");
const { createAuthService } = require("./modules/auth/auth.service");
const { createAuthController } = require("./modules/auth/auth.controller");
const { createAuthRouter } = require("./modules/auth/auth.routes");
const { createBuildingsService } = require("./modules/buildings/buildings.service");
const { createBuildingsController } = require("./modules/buildings/buildings.controller");
const { createBuildingsRouter } = require("./modules/buildings/buildings.routes");
const { createRoomsService } = require("./modules/rooms/rooms.service");
const { createRoomsController } = require("./modules/rooms/rooms.controller");
const { createRoomsRouter } = require("./modules/rooms/rooms.routes");
const { createReservationsService } = require("./modules/reservations/reservations.service");
const { createReservationsController } = require("./modules/reservations/reservations.controller");
const { createReservationsRouter } = require("./modules/reservations/reservations.routes");
const { createAuditService } = require("./modules/audit/audit.service");
const { createAuditController } = require("./modules/audit/audit.controller");
const { createAdminRouter } = require("./modules/audit/audit.routes");

function createApp({ config, runInTransaction, eventBus = noopEventBus, now }) {
    const app = express();

    app.use(requestLogger);
    app.use(express.json());

    const requireAuth = authenticate(config.JWT_SECRET);

    const authService = createAuthService({
        runInTransaction,
        jwtSecret: config.JWT_SECRET,
        jwtExpiresIn: config.JWT_EXPIRES_IN
    });
    const authController = createAuthController(authService);

    const buildingsService = createBuildingsService({ runInTransaction });
    const buildingsController = createBuildingsController(buildingsService);

    const roomsService = createRoomsService({ runInTransaction });
    const roomsController = createRoomsController(roomsService);

    const reservationsService = createReservationsService({ runInTransaction, eventBus, now });
    const reservationsController = createReservationsController(reservationsService);

    const auditService = createAuditService({ runInTransaction });
    const auditController = createAuditController(auditService);

    app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openapiDocument));
    app.use("/api/auth", createAuthRouter(authController, requireAuth));
    app.use("/api/buildings", requireAuth, createBuildingsRouter(buildingsController));
    app.use("/api/rooms", requireAuth, createRoomsRouter(roomsController));
    app.use("/api/reservations", requireAuth, createReservationsRouter(reservationsController));
    app.use("/api/admin", requireAuth, createAdminRouter(auditController));

    app.use(notFound);
    app.use(errorHandler);

    return app;
}

module.exports = { createApp };
