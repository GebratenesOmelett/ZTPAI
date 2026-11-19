function toRoom(row) {
    if (!row) return null;
    return {
        id: row.id,
        name: row.name,
        capacity: row.capacity,
        building: { id: row.building_id, name: row.building_name }
    };
}

function createRoomsKnexRepository(db) {
    function roomsWithBuilding() {
        return db("rooms as room")
            .join("buildings as building", "building.id", "room.building_id")
            .select(
                "room.id",
                "room.name",
                "room.capacity",
                "building.id as building_id",
                "building.name as building_name"
            );
    }

    return {
        async list({ buildingId } = {}) {
            const rows = await roomsWithBuilding()
                .modify(qb => {
                    if (buildingId) qb.where("room.building_id", buildingId);
                })
                .orderBy("room.id");
            return rows.map(toRoom);
        },
        async findById(id) {
            return toRoom(await roomsWithBuilding().where("room.id", id).first());
        },
        async lockById(id) {
            await db("rooms").where({ id }).forUpdate().first();
        },
        async create({ buildingId, name, capacity }) {
            const [row] = await db("rooms")
                .insert({ building_id: buildingId, name, capacity })
                .returning("id");
            return this.findById(row.id);
        }
    };
}

module.exports = { createRoomsKnexRepository };
