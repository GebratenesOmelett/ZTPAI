const { createUsersRepository, DEFAULT_USERS } = require("../modules/users/users.repository.memory");
const { createBuildingsRepository, DEFAULT_BUILDINGS } = require("../modules/buildings/buildings.repository.memory");
const { createRoomsRepository, DEFAULT_ROOMS } = require("../modules/rooms/rooms.repository.memory");
const { createReservationsRepository, DEFAULT_RESERVATIONS } = require("../modules/reservations/reservations.repository.memory");

function createMemoryUnitOfWork(seed = {}) {
    const state = {
        users: structuredClone(seed.users ?? DEFAULT_USERS),
        buildings: structuredClone(seed.buildings ?? DEFAULT_BUILDINGS),
        rooms: structuredClone(seed.rooms ?? DEFAULT_ROOMS),
        reservations: structuredClone(seed.reservations ?? DEFAULT_RESERVATIONS)
    };

    const repositories = {
        users: createUsersRepository(state),
        buildings: createBuildingsRepository(state),
        rooms: createRoomsRepository(state),
        reservations: createReservationsRepository(state)
    };

    return { repositories, runInTransaction: fn => fn(repositories) };
}

module.exports = { createMemoryUnitOfWork };
