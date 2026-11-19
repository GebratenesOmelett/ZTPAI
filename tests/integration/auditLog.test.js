const request = require("supertest");
const { createEventBus } = require("../../src/events/eventBus");
const { registerAuditListeners } = require("../../src/events/auditListeners");
const { registerNotificationListeners } = require("../../src/events/notificationListeners");
const { createKnexUnitOfWork } = require("../../src/db/unitOfWork.knex");
const { db, ADMIN, ANNA, PIOTR, createTestApp, prepareDatabase, resetDatabase, login, booking, waitFor } = require("./helpers");

const { runInTransaction } = createKnexUnitOfWork(db);
const logger = { log: jest.fn(), error: jest.fn() };
const eventBus = createEventBus({ logger });
registerAuditListeners(eventBus, runInTransaction);
registerNotificationListeners(eventBus, runInTransaction, logger);
const { app } = createTestApp({ eventBus });

beforeAll(prepareDatabase);
beforeEach(async () => {
    await resetDatabase();
    jest.clearAllMocks();
});
afterAll(() => db.destroy());

const countAuditRows = async () => Number((await db("audit_log").count({ count: "*" }).first()).count);

describe("Audit log", () => {
    test("create -> failed collision -> ADMIN cancels -> second cancel: two events, newest first", async () => {
        const annaToken = await login(app, ANNA.email);
        const piotrToken = await login(app, PIOTR.email);
        const adminToken = await login(app, ADMIN.email);
        const auth = token => ({ Authorization: `Bearer ${token}` });

        const { body: created } = await request(app).post("/api/reservations").set(auth(annaToken)).send(booking("10:00", "12:00")).expect(201);
        await request(app).post("/api/reservations").set(auth(piotrToken)).send(booking("11:00", "13:00")).expect(409);
        await request(app).patch(`/api/reservations/${created.id}/cancel`).set(auth(adminToken)).expect(200);
        await request(app).patch(`/api/reservations/${created.id}/cancel`).set(auth(adminToken)).expect(200);

        await waitFor(async () => (await countAuditRows()) === 2 && logger.log.mock.calls.length === 1);

        const res = await request(app).get("/api/admin/audit-log").set(auth(adminToken)).expect(200);
        expect(res.body.meta).toEqual({ page: 1, limit: 20, total: 2, totalPages: 1 });
        expect(res.body.data.map(e => e.eventType)).toEqual(["reservation.cancelled", "reservation.created"]);
        expect(res.body.data[0].payload).toEqual({ reservationId: created.id, roomId: 1, userId: ANNA.id, cancelledBy: ADMIN.id });
        expect(res.body.data[1].payload).toEqual({
            reservationId: created.id, roomId: 1, userId: ANNA.id,
            startTime: "2026-12-01T10:00:00.000Z", endTime: "2026-12-01T12:00:00.000Z"
        });

        const filtered = await request(app).get("/api/admin/audit-log?eventType=reservation.created").set(auth(adminToken)).expect(200);
        expect(filtered.body.data).toHaveLength(1);

        expect(logger.log).toHaveBeenCalledWith(expect.stringContaining(`[notification] to: ${ANNA.email}`));
        expect(logger.error).not.toHaveBeenCalled();
    });

    test("owner cancelling own reservation does not send a notification", async () => {
        const annaToken = await login(app, ANNA.email);
        const { body: created } = await request(app).post("/api/reservations").set("Authorization", `Bearer ${annaToken}`).send(booking("10:00", "12:00")).expect(201);

        await request(app).patch(`/api/reservations/${created.id}/cancel`).set("Authorization", `Bearer ${annaToken}`).expect(200);
        await waitFor(async () => (await countAuditRows()) === 2);

        expect(logger.log).not.toHaveBeenCalled();
    });

    test("GET /api/admin/audit-log is ADMIN only", async () => {
        const annaToken = await login(app, ANNA.email);

        const res = await request(app).get("/api/admin/audit-log").set("Authorization", `Bearer ${annaToken}`);

        expect(res.status).toBe(403);
    });

    test("failing listener does not affect the API response", async () => {
        const failingLogger = { error: jest.fn() };
        const failingBus = createEventBus({ logger: failingLogger });
        failingBus.subscribe("reservation.created", () => { throw new Error("audit log is down"); });
        const { app: failingApp } = createTestApp({ eventBus: failingBus });
        const token = await login(failingApp, ANNA.email);

        await request(failingApp).post("/api/reservations").set("Authorization", `Bearer ${token}`).send(booking("10:00", "12:00")).expect(201);
        await waitFor(() => failingLogger.error.mock.calls.length === 1);

        expect(failingLogger.error).toHaveBeenCalledWith("[event:reservation.created] handler failed", expect.any(Error));
    });
});
