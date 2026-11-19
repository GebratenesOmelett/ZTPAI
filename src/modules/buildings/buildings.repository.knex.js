function toBuilding(row) {
    if (!row) return null;
    return {
        id: row.id,
        name: row.name,
        address: row.address,
        roomsCount: Number(row.rooms_count)
    };
}

function createBuildingsKnexRepository(db) {
    function buildingsWithRoomsCount() {
        return db("buildings as building")
            .leftJoin("rooms as room", "room.building_id", "building.id")
            .select("building.id", "building.name", "building.address")
            .count({ rooms_count: "room.id" })
            .groupBy("building.id");
    }

    return {
        async list() {
            const rows = await buildingsWithRoomsCount().orderBy("building.id");
            return rows.map(toBuilding);
        },
        async findById(id) {
            return toBuilding(await buildingsWithRoomsCount().where("building.id", id).first());
        },
        async create({ name, address }) {
            const [row] = await db("buildings").insert({ name, address }).returning("id");
            return this.findById(row.id);
        }
    };
}

module.exports = { createBuildingsKnexRepository };
