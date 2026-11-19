const SORT_COLUMNS = {
    startTime: "reservation.start_time",
    createdAt: "reservation.created_at",
    participants: "reservation.participants"
};

function toReservation(row) {
    if (!row) return null;
    return {
        id: row.id,
        room: {
            id: row.room_id,
            name: row.room_name,
            building: { id: row.building_id, name: row.building_name }
        },
        user: { id: row.user_id, email: row.user_email },
        participants: row.participants,
        startTime: row.start_time,
        endTime: row.end_time,
        status: row.status,
        createdAt: row.created_at,
        cancelledAt: row.cancelled_at
    };
}

function createReservationsKnexRepository(db) {
    function reservationsWithRoom() {
        return db("reservations as reservation")
            .join("rooms as room", "room.id", "reservation.room_id")
            .join("buildings as building", "building.id", "room.building_id")
            .join("users as user", "user.id", "reservation.user_id");
    }

    function selectColumns(qb) {
        return qb.select(
            "reservation.id",
            "reservation.participants",
            "reservation.start_time",
            "reservation.end_time",
            "reservation.status",
            "reservation.created_at",
            "reservation.cancelled_at",
            "room.id as room_id",
            "room.name as room_name",
            "building.id as building_id",
            "building.name as building_name",
            "user.id as user_id",
            "user.email as user_email"
        );
    }

    return {
        async findById(id) {
            const row = await reservationsWithRoom()
                .modify(selectColumns)
                .where("reservation.id", id)
                .first();
            return toReservation(row);
        },
        async create({ roomId, userId, participants, startTime, endTime, status }) {
            const [row] = await db("reservations")
                .insert({
                    room_id: roomId,
                    user_id: userId,
                    participants,
                    start_time: startTime,
                    end_time: endTime,
                    status
                })
                .returning("id");
            return this.findById(row.id);
        },
        async updateStatus(id, status, { cancelledAt = null } = {}) {
            await db("reservations").where({ id }).update({ status, cancelled_at: cancelledAt });
            return this.findById(id);
        },
        async hasConfirmedOverlap({ roomId, startTime, endTime }) {
            const row = await db("reservations")
                .where({ room_id: roomId, status: "CONFIRMED" })
                .where("start_time", "<", endTime)
                .where("end_time", ">", startTime)
                .first("id");
            return Boolean(row);
        },
        async list({ userId, roomId, buildingId, status, from, to, page, limit, sort }) {
            const base = reservationsWithRoom().modify(qb => {
                if (userId) qb.where("reservation.user_id", userId);
                if (roomId) qb.where("reservation.room_id", roomId);
                if (buildingId) qb.where("room.building_id", buildingId);
                if (status) qb.where("reservation.status", status);
                if (to) qb.where("reservation.start_time", "<", to);
                if (from) qb.where("reservation.end_time", ">", from);
            });

            const desc = sort.startsWith("-");
            const column = SORT_COLUMNS[desc ? sort.slice(1) : sort];

            const [rows, { count }] = await Promise.all([
                base.clone()
                    .modify(selectColumns)
                    .orderBy(column, desc ? "desc" : "asc")
                    .orderBy("reservation.id", "asc")
                    .limit(limit)
                    .offset((page - 1) * limit),
                base.clone().count({ count: "*" }).first()
            ]);

            return { items: rows.map(toReservation), total: Number(count) };
        }
    };
}

module.exports = { createReservationsKnexRepository };
