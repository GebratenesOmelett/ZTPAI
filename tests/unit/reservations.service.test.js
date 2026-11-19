const { createReservationsService } = require("../../src/modules/reservations/reservations.service");
const { createMemoryUnitOfWork } = require("../../src/db/unitOfWork.memory");

const admin = { id: 1, role: "ADMIN" };
const owner = { id: 2, role: "USER" };
const otherUser = { id: 3, role: "USER" };

const NOW = new Date("2026-11-01T12:00:00Z");

const USERS = [
    { id: 1, email: "admin@example.com", role: "ADMIN", passwordHash: "-", createdAt: NOW },
    { id: 2, email: "owner@example.com", role: "USER", passwordHash: "-", createdAt: NOW },
    { id: 3, email: "other@example.com", role: "USER", passwordHash: "-", createdAt: NOW }
];
const BUILDINGS = [{ id: 1, name: "Budynek A", address: "ul. Testowa 1, Kraków" }];
const ROOMS = [
    { id: 1, buildingId: 1, name: "101", capacity: 10 },
    { id: 2, buildingId: 1, name: "102", capacity: 10 }
];

const at = time => `2026-12-01T${time}:00Z`;

function reservation(id, { roomId = 1, userId = owner.id, startTime, endTime, status = "CONFIRMED", cancelledAt = null }) {
    return { id, roomId, userId, participants: 5, startTime, endTime, status, cancelledAt, createdAt: NOW };
}

function booking(start, end, extra = {}) {
    return { roomId: 1, participants: 5, startTime: at(start), endTime: at(end), ...extra };
}

function setup({ reservations = [], now = () => NOW } = {}) {
    const { runInTransaction } = createMemoryUnitOfWork({ users: USERS, buildings: BUILDINGS, rooms: ROOMS, reservations });
    const eventBus = { publish: jest.fn(), subscribe: jest.fn() };
    const service = createReservationsService({ runInTransaction, eventBus, now });
    return { service, eventBus };
}

const existing = reservation(1, { startTime: at("10:00"), endTime: at("12:00") });

describe("createReservation - overlapping", () => {
    test.each([
        ["partial overlap at the start", "09:00", "10:30"],
        ["partial overlap at the end", "11:30", "13:00"],
        ["new range contains the existing one", "09:00", "13:00"],
        ["new range inside the existing one", "10:30", "11:30"],
        ["identical range", "10:00", "12:00"]
    ])("rejects %s", async (_, start, end) => {
        const { service } = setup({ reservations: [existing] });

        await expect(service.createReservation(booking(start, end), otherUser))
            .rejects.toMatchObject({ statusCode: 409, code: "ROOM_ALREADY_BOOKED" });
    });

    test.each([
        ["ending exactly when the existing one starts", "09:00", "10:00"],
        ["starting exactly when the existing one ends", "12:00", "13:00"]
    ])("allows touching range: %s", async (_, start, end) => {
        const { service } = setup({ reservations: [existing] });

        await expect(service.createReservation(booking(start, end), otherUser))
            .resolves.toMatchObject({ status: "CONFIRMED" });
    });

    test("allows the same time range in another room", async () => {
        const { service } = setup({ reservations: [existing] });

        await expect(service.createReservation(booking("10:00", "12:00", { roomId: 2 }), otherUser))
            .resolves.toMatchObject({ status: "CONFIRMED", room: { id: 2 } });
    });

    test("CANCELLED reservation does not block its time range", async () => {
        const cancelled = reservation(1, { startTime: at("10:00"), endTime: at("12:00"), status: "CANCELLED", cancelledAt: NOW });
        const { service } = setup({ reservations: [cancelled] });

        await expect(service.createReservation(booking("10:00", "12:00"), otherUser))
            .resolves.toMatchObject({ status: "CONFIRMED" });
    });
});

describe("createReservation - capacity", () => {
    test("allows participants equal to room capacity", async () => {
        const { service } = setup();

        await expect(service.createReservation(booking("10:00", "11:00", { participants: 10 }), owner))
            .resolves.toMatchObject({ participants: 10 });
    });

    test("rejects capacity + 1 participants", async () => {
        const { service } = setup();

        await expect(service.createReservation(booking("10:00", "11:00", { participants: 11 }), owner))
            .rejects.toMatchObject({ statusCode: 409, code: "ROOM_CAPACITY_EXCEEDED" });
    });
});

describe("createReservation - duration and time", () => {
    test.each([
        ["exactly 15 minutes", "10:00", "10:15"],
        ["exactly 8 hours", "08:00", "16:00"]
    ])("allows %s", async (_, start, end) => {
        const { service } = setup();

        await expect(service.createReservation(booking(start, end), owner))
            .resolves.toMatchObject({ status: "CONFIRMED" });
    });

    test.each([
        ["14 minutes", "10:00", "10:14"],
        ["8 hours 1 minute", "08:00", "16:01"],
        ["end before start", "11:00", "10:00"]
    ])("rejects %s", async (_, start, end) => {
        const { service } = setup();

        await expect(service.createReservation(booking(start, end), owner))
            .rejects.toMatchObject({ statusCode: 400, code: "VALIDATION_ERROR", details: [expect.objectContaining({ field: "endTime" })] });
    });

    test("rejects start in the past", async () => {
        const { service } = setup();

        await expect(service.createReservation({ roomId: 1, participants: 5, startTime: "2026-11-01T11:00:00Z", endTime: "2026-11-01T13:00:00Z" }, owner))
            .rejects.toMatchObject({ code: "VALIDATION_ERROR", details: [expect.objectContaining({ field: "startTime" })] });
    });

    test("rejects non-existing room", async () => {
        const { service } = setup();

        await expect(service.createReservation(booking("10:00", "11:00", { roomId: 99 }), owner))
            .rejects.toMatchObject({ statusCode: 404, code: "NOT_FOUND" });
    });

    test("owner is always the current user", async () => {
        const { service } = setup();

        const created = await service.createReservation(booking("10:00", "11:00"), owner);

        expect(created.user).toEqual({ id: owner.id, email: "owner@example.com" });
    });
});

describe("cancelReservation", () => {
    test("cancels a future reservation and sets cancelledAt", async () => {
        const { service } = setup({ reservations: [existing] });

        await expect(service.cancelReservation(1, owner))
            .resolves.toMatchObject({ status: "CANCELLED", cancelledAt: NOW });
    });

    test.each([
        ["already started", "2026-11-01T11:00:00Z"],
        ["starting exactly now", "2026-11-01T12:00:00Z"]
    ])("rejects reservation %s", async (_, startTime) => {
        const started = reservation(1, { startTime, endTime: "2026-11-01T14:00:00Z" });
        const { service } = setup({ reservations: [started] });

        await expect(service.cancelReservation(1, owner))
            .rejects.toMatchObject({ statusCode: 409, code: "RESERVATION_ALREADY_STARTED" });
    });

    test("second cancellation is idempotent and keeps the original cancelledAt", async () => {
        let clock = NOW;
        const { service } = setup({ reservations: [existing], now: () => clock });

        const first = await service.cancelReservation(1, owner);
        clock = new Date("2026-11-02T09:00:00Z");
        const second = await service.cancelReservation(1, owner);

        expect(second).toMatchObject({ status: "CANCELLED", cancelledAt: first.cancelledAt });
        expect(second.cancelledAt).toEqual(NOW);
    });
});

describe("ownership", () => {
    test("other USER cannot cancel the reservation (404) and it stays CONFIRMED", async () => {
        const { service } = setup({ reservations: [existing] });

        await expect(service.cancelReservation(1, otherUser))
            .rejects.toMatchObject({ statusCode: 404, code: "NOT_FOUND" });
        await expect(service.getReservation(1, owner))
            .resolves.toMatchObject({ status: "CONFIRMED" });
    });

    test("other USER cannot get the reservation (404)", async () => {
        const { service } = setup({ reservations: [existing] });

        await expect(service.getReservation(1, otherUser))
            .rejects.toMatchObject({ statusCode: 404, code: "NOT_FOUND" });
    });

    test("ADMIN can get and cancel someone else's reservation", async () => {
        const { service } = setup({ reservations: [existing] });

        await expect(service.getReservation(1, admin)).resolves.toMatchObject({ id: 1 });
        await expect(service.cancelReservation(1, admin)).resolves.toMatchObject({ status: "CANCELLED" });
    });

    test("USER lists only own reservations, ADMIN lists all", async () => {
        const { service } = setup({
            reservations: [existing, reservation(2, { userId: otherUser.id, startTime: at("14:00"), endTime: at("15:00") })]
        });
        const query = { page: 1, limit: 20, sort: "startTime" };

        const own = await service.listReservations(query, owner);
        const all = await service.listReservations(query, admin);

        expect(own.items.map(r => r.id)).toEqual([1]);
        expect(all.meta.total).toBe(2);
    });

    test("USER cannot use the userId filter", async () => {
        const { service } = setup({ reservations: [existing] });

        await expect(service.listReservations({ page: 1, limit: 20, sort: "startTime", userId: otherUser.id }, owner))
            .rejects.toMatchObject({ statusCode: 403, code: "FORBIDDEN" });
    });
});

describe("events", () => {
    test("publishes reservation.created after successful creation", async () => {
        const { service, eventBus } = setup();

        const created = await service.createReservation(booking("10:00", "11:00"), owner);

        expect(eventBus.publish).toHaveBeenCalledTimes(1);
        expect(eventBus.publish).toHaveBeenCalledWith("reservation.created", {
            reservationId: created.id,
            roomId: 1,
            userId: owner.id,
            startTime: "2026-12-01T10:00:00.000Z",
            endTime: "2026-12-01T11:00:00.000Z"
        });
    });

    test("does not publish when creation fails", async () => {
        const { service, eventBus } = setup({ reservations: [existing] });

        await expect(service.createReservation(booking("11:00", "13:00"), otherUser)).rejects.toMatchObject({ code: "ROOM_ALREADY_BOOKED" });

        expect(eventBus.publish).not.toHaveBeenCalled();
    });

    test("publishes reservation.cancelled once, not on idempotent second cancellation", async () => {
        const { service, eventBus } = setup({ reservations: [existing] });

        await service.cancelReservation(1, admin);
        await service.cancelReservation(1, admin);

        expect(eventBus.publish).toHaveBeenCalledTimes(1);
        expect(eventBus.publish).toHaveBeenCalledWith("reservation.cancelled", {
            reservationId: 1,
            roomId: 1,
            userId: owner.id,
            cancelledBy: admin.id
        });
    });

    test("does not publish when cancellation is rejected", async () => {
        const started = reservation(1, { startTime: "2026-11-01T11:00:00Z", endTime: "2026-11-01T14:00:00Z" });
        const { service, eventBus } = setup({ reservations: [started] });

        await expect(service.cancelReservation(1, owner)).rejects.toMatchObject({ code: "RESERVATION_ALREADY_STARTED" });

        expect(eventBus.publish).not.toHaveBeenCalled();
    });
});
