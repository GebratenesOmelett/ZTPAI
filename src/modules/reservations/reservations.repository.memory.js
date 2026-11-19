const { PG_ERROR } = require("../../db/pgErrorCodes");

const DEFAULT_RESERVATIONS = [
    {
        id: 1, roomId: 1, userId: 2, participants: 20,
        startTime: "2026-11-10T10:00:00Z", endTime: "2026-11-10T12:00:00Z",
        status: "CONFIRMED", createdAt: "2026-10-27T08:00:00Z", cancelledAt: null
    },
    {
        id: 2, roomId: 1, userId: 2, participants: 15,
        startTime: "2026-11-10T12:00:00Z", endTime: "2026-11-10T13:00:00Z",
        status: "CONFIRMED", createdAt: "2026-10-27T09:00:00Z", cancelledAt: null
    },
    {
        id: 3, roomId: 2, userId: 3, participants: 10,
        startTime: "2026-11-12T09:00:00Z", endTime: "2026-11-12T11:00:00Z",
        status: "CANCELLED", createdAt: "2026-10-26T12:00:00Z", cancelledAt: "2026-10-28T10:00:00Z"
    },
    {
        id: 4, roomId: 4, userId: 3, participants: 4,
        startTime: "2026-01-10T10:00:00Z", endTime: "2026-01-10T12:00:00Z",
        status: "CONFIRMED", createdAt: "2026-01-05T08:00:00Z", cancelledAt: null
    },
    {
        id: 5, roomId: 5, userId: 4, participants: 80,
        startTime: "2026-11-15T14:00:00Z", endTime: "2026-11-15T16:00:00Z",
        status: "CONFIRMED", createdAt: "2026-10-28T15:00:00Z", cancelledAt: null
    }
];

function toTime(value) {
    return new Date(value).getTime();
}

function overlaps(a, b) {
    return toTime(a.startTime) <= toTime(b.endTime)
        && toTime(b.startTime) <= toTime(a.endTime);
}

function createReservationsRepository(state) {
    let nextReservationId = Math.max(0, ...state.reservations.map(r => r.id)) + 1;

    function toReservation(reservation) {
        const room = state.rooms.find(r => r.id === reservation.roomId);
        const building = state.buildings.find(b => b.id === room.buildingId);
        const user = state.users.find(u => u.id === reservation.userId);
        return {
            id: reservation.id,
            room: { id: room.id, name: room.name, building: { id: building.id, name: building.name } },
            user: { id: user.id, email: user.email },
            participants: reservation.participants,
            startTime: reservation.startTime,
            endTime: reservation.endTime,
            status: reservation.status,
            createdAt: reservation.createdAt,
            cancelledAt: reservation.cancelledAt
        };
    }

    function findConfirmedOverlap(candidate) {
        return state.reservations.some(r =>
            r.roomId === candidate.roomId && r.status === "CONFIRMED" && overlaps(r, candidate)
        );
    }

    function sortValue(reservation, field) {
        return field === "participants" ? reservation.participants : toTime(reservation[field]);
    }

    return {
        async findById(id) {
            const reservation = state.reservations.find(r => r.id === id);
            return reservation ? toReservation(reservation) : null;
        },
        async create(data) {
            if (data.status === "CONFIRMED" && findConfirmedOverlap(data)) {
                throw Object.assign(new Error("Overlapping reservation"), { code: PG_ERROR.EXCLUSION_VIOLATION });
            }
            const reservation = { id: nextReservationId++, cancelledAt: null, createdAt: new Date(), ...data };
            state.reservations.push(reservation);
            return toReservation(reservation);
        },
        async updateStatus(id, status, { cancelledAt = null } = {}) {
            const reservation = state.reservations.find(r => r.id === id);
            Object.assign(reservation, { status, cancelledAt });
            return toReservation(reservation);
        },
        async hasConfirmedOverlap({ roomId, startTime, endTime }) {
            return findConfirmedOverlap({ roomId, startTime, endTime });
        },
        async list({ userId, roomId, buildingId, status, from, to, page, limit, sort }) {
            const desc = sort.startsWith("-");
            const field = desc ? sort.slice(1) : sort;

            const filtered = state.reservations.filter(r =>
                (userId === undefined || r.userId === userId) &&
                (roomId === undefined || r.roomId === roomId) &&
                (buildingId === undefined || state.rooms.find(room => room.id === r.roomId).buildingId === buildingId) &&
                (status === undefined || r.status === status) &&
                (to === undefined || toTime(r.startTime) < toTime(to)) &&
                (from === undefined || toTime(r.endTime) > toTime(from))
            );

            const sorted = filtered.sort((a, b) => {
                const diff = sortValue(a, field) - sortValue(b, field);
                return (desc ? -diff : diff) || a.id - b.id;
            });

            const items = sorted.slice((page - 1) * limit, page * limit).map(toReservation);
            return { items, total: filtered.length };
        }
    };
}

module.exports = { createReservationsRepository, DEFAULT_RESERVATIONS };
