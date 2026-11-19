const { createUsersKnexRepository } = require("../modules/users/users.repository.knex");
const { createBuildingsKnexRepository } = require("../modules/buildings/buildings.repository.knex");
const { createRoomsKnexRepository } = require("../modules/rooms/rooms.repository.knex");
const { createReservationsKnexRepository } = require("../modules/reservations/reservations.repository.knex");
const { createAuditKnexRepository } = require("../modules/audit/audit.repository.knex");

function createKnexRepositories(db) {
    return {
        users: createUsersKnexRepository(db),
        buildings: createBuildingsKnexRepository(db),
        rooms: createRoomsKnexRepository(db),
        reservations: createReservationsKnexRepository(db),
        auditLog: createAuditKnexRepository(db)
    };
}

function createKnexUnitOfWork(db) {
    return {
        runInTransaction: fn => db.transaction(trx => fn(createKnexRepositories(trx)))
    };
}

module.exports = { createKnexRepositories, createKnexUnitOfWork };
