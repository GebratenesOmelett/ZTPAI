const { PG_ERROR } = require("../../db/pgErrorCodes");

const DEFAULT_ROOMS = [
    { id: 1, buildingId: 1, name: "101", capacity: 30 },
    { id: 2, buildingId: 1, name: "102", capacity: 20 },
    { id: 3, buildingId: 1, name: "201", capacity: 12 },
    { id: 4, buildingId: 2, name: "101", capacity: 25 },
    { id: 5, buildingId: 2, name: "Aula", capacity: 120 }
];

function createRoomsRepository(state) {
    let nextRoomId = Math.max(0, ...state.rooms.map(r => r.id)) + 1;

    function toRoom(room) {
        const building = state.buildings.find(b => b.id === room.buildingId);
        return {
            id: room.id,
            name: room.name,
            capacity: room.capacity,
            building: { id: building.id, name: building.name }
        };
    }

    return {
        async list({ buildingId } = {}) {
            return state.rooms
                .filter(r => buildingId === undefined || r.buildingId === buildingId)
                .map(toRoom);
        },
        async findById(id) {
            const room = state.rooms.find(r => r.id === id);
            return room ? toRoom(room) : null;
        },
        async lockById() {},
        async create({ buildingId, name, capacity }) {
            if (state.rooms.some(r => r.buildingId === buildingId && r.name === name)) {
                throw Object.assign(new Error("Duplicate room name in building"), { code: PG_ERROR.UNIQUE_VIOLATION });
            }
            const room = { id: nextRoomId++, buildingId, name, capacity };
            state.rooms.push(room);
            return toRoom(room);
        }
    };
}

module.exports = { createRoomsRepository, DEFAULT_ROOMS };
