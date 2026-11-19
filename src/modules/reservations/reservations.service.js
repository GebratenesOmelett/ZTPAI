const { NotFoundError, ConflictError, ValidationError, ForbiddenError } = require("../../errors/AppError");
const { ROLE } = require("../users/users.roles");
const { noopEventBus } = require("../../events/eventBus");
const { EVENT } = require("../../events/eventTypes");

const MINUTE_MS = 60 * 1000;
const MIN_DURATION_MS = 15 * MINUTE_MS;
const MAX_DURATION_MS = 8 * 60 * MINUTE_MS;

const STATUS = {
    CONFIRMED: "CONFIRMED",
    CANCELLED: "CANCELLED"
};

const ALLOWED_TRANSITIONS = {
    CONFIRMED: ["CANCELLED"],
    CANCELLED: []
};

function toTime(value) {
    return new Date(value).getTime();
}

function isAdmin(currentUser) {
    return currentUser.role === ROLE.ADMIN;
}

async function findAccessibleReservation(reservations, id, currentUser) {
    const reservation = await reservations.findById(id);
    if (!reservation || (!isAdmin(currentUser) && reservation.user.id !== currentUser.id)) {
        throw new NotFoundError("Reservation");
    }
    return reservation;
}

function createReservationsService({ runInTransaction, eventBus = noopEventBus, now = () => new Date() }) {
    function assertValidTimeRange({ startTime, endTime }) {
        const start = toTime(startTime);
        const end = toTime(endTime);
        const details = [];

        if (end <= start) {
            details.push({ location: "body", field: "endTime", message: "endTime must be after startTime" });
        } else if (end - start < MIN_DURATION_MS) {
            details.push({ location: "body", field: "endTime", message: "Reservation must last at least 15 minutes" });
        } else if (end - start > MAX_DURATION_MS) {
            details.push({ location: "body", field: "endTime", message: "Reservation cannot last longer than 8 hours" });
        }

        if (start < now().getTime()) {
            details.push({ location: "body", field: "startTime", message: "startTime cannot be in the past" });
        }

        if (details.length > 0) throw new ValidationError(details);
    }

    async function createReservation(input, currentUser) {
        assertValidTimeRange(input);

        const reservation = await runInTransaction(async ({ rooms, reservations }) => {
            const room = await rooms.findById(input.roomId);
            if (!room) throw new NotFoundError("Room");

            if (input.participants > room.capacity) {
                throw new ConflictError("Room capacity exceeded", "ROOM_CAPACITY_EXCEEDED");
            }

            await rooms.lockById(input.roomId);

            const { roomId, startTime, endTime } = input;
            if (await reservations.hasConfirmedOverlap({ roomId, startTime, endTime })) {
                throw new ConflictError("Room is already booked in this time slot", "ROOM_ALREADY_BOOKED");
            }

            return reservations.create({
                ...input,
                userId: currentUser.id,
                status: STATUS.CONFIRMED
            });
        });

        eventBus.publish(EVENT.RESERVATION_CREATED, {
            reservationId: reservation.id,
            roomId: reservation.room.id,
            userId: reservation.user.id,
            startTime: new Date(reservation.startTime).toISOString(),
            endTime: new Date(reservation.endTime).toISOString()
        });

        return reservation;
    }

    async function cancelReservation(id, currentUser) {
        let changed = false;

        const reservation = await runInTransaction(async ({ reservations }) => {
            const current = await findAccessibleReservation(reservations, id, currentUser);

            if (current.status === STATUS.CANCELLED) return current;

            if (!ALLOWED_TRANSITIONS[current.status].includes(STATUS.CANCELLED)) {
                throw new ConflictError(
                    `Cannot change status from ${current.status} to ${STATUS.CANCELLED}`,
                    "INVALID_STATUS_TRANSITION"
                );
            }

            if (toTime(current.startTime) <= now().getTime()) {
                throw new ConflictError("Reservation has already started", "RESERVATION_ALREADY_STARTED");
            }

            changed = true;
            return reservations.updateStatus(id, STATUS.CANCELLED, { cancelledAt: now() });
        });

        if (changed) {
            eventBus.publish(EVENT.RESERVATION_CANCELLED, {
                reservationId: reservation.id,
                roomId: reservation.room.id,
                userId: reservation.user.id,
                cancelledBy: currentUser.id
            });
        }

        return reservation;
    }

    async function getReservation(id, currentUser) {
        return runInTransaction(({ reservations }) => findAccessibleReservation(reservations, id, currentUser));
    }

    async function listReservations(query, currentUser) {
        if (!isAdmin(currentUser) && query.userId !== undefined) {
            throw new ForbiddenError("Only ADMIN can filter reservations by userId");
        }
        const filters = isAdmin(currentUser) ? query : { ...query, userId: currentUser.id };

        return runInTransaction(async ({ reservations }) => {
            const { items, total } = await reservations.list(filters);
            return {
                items,
                meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) }
            };
        });
    }

    return { createReservation, cancelReservation, getReservation, listReservations };
}

module.exports = { createReservationsService, MIN_DURATION_MS, MAX_DURATION_MS };
