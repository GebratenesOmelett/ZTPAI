const express = require("express");
const validate = require("../../middleware/validate");
const authorize = require("../../middleware/authorize");
const { ROLE } = require("../users/users.roles");
const { idParams, createBuildingBody } = require("./buildings.schemas");

function createBuildingsRouter(buildingsController) {
    const router = express.Router();

    router.get("/", buildingsController.list);
    router.post("/", authorize(ROLE.ADMIN), validate({ body: createBuildingBody }), buildingsController.create);
    router.get("/:id", validate({ params: idParams }), buildingsController.getById);
    router.get("/:id/rooms", validate({ params: idParams }), buildingsController.listRooms);

    return router;
}

module.exports = { createBuildingsRouter };
