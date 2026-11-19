const express = require("express");
const validate = require("../../middleware/validate");
const { idParams, createReservationBody, listReservationsQuery } = require("./reservations.schemas");

function createReservationsRouter(reservationsController) {
    const router = express.Router();

    router.get("/", validate({ query: listReservationsQuery }), reservationsController.list);
    router.post("/", validate({ body: createReservationBody }), reservationsController.create);
    router.get("/:id", validate({ params: idParams }), reservationsController.getById);
    router.patch("/:id/cancel", validate({ params: idParams }), reservationsController.cancel);

    return router;
}

module.exports = { createReservationsRouter };
