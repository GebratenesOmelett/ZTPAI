const { PG_ERROR } = require("../../db/pgErrorCodes");

const DEFAULT_BUILDINGS = [
    { id: 1, name: "Budynek A", address: "ul. Warszawska 24, Kraków" },
    { id: 2, name: "Budynek B", address: "ul. Podchorążych 1, Kraków" },
    { id: 3, name: "Budynek C", address: "ul. Długa 5, Kraków" }
];

function createBuildingsRepository(state) {
    let nextBuildingId = Math.max(0, ...state.buildings.map(b => b.id)) + 1;

    function toBuilding(building) {
        return {
            id: building.id,
            name: building.name,
            address: building.address,
            roomsCount: state.rooms.filter(r => r.buildingId === building.id).length
        };
    }

    return {
        async list() {
            return state.buildings.map(toBuilding);
        },
        async findById(id) {
            const building = state.buildings.find(b => b.id === id);
            return building ? toBuilding(building) : null;
        },
        async create({ name, address }) {
            if (state.buildings.some(b => b.name === name)) {
                throw Object.assign(new Error("Duplicate building name"), { code: PG_ERROR.UNIQUE_VIOLATION });
            }
            const building = { id: nextBuildingId++, name, address };
            state.buildings.push(building);
            return toBuilding(building);
        }
    };
}

module.exports = { createBuildingsRepository, DEFAULT_BUILDINGS };
