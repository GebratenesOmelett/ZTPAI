const express = require("express");
const validate = require("../../middleware/validate");
const authorize = require("../../middleware/authorize");
const { ROLE } = require("../users/users.roles");
const { idParams, createRoomBody } = require("./rooms.schemas");

function createRoomsRouter(roomsController) {
    const router = express.Router();

    router.get("/", roomsController.list);
    router.post("/", authorize(ROLE.ADMIN), validate({ body: createRoomBody }), roomsController.create);
    router.get("/:id", validate({ params: idParams }), roomsController.getById);

    return router;
}

module.exports = { createRoomsRouter };
