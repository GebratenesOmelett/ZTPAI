const express = require("express");
const validate = require("../../middleware/validate");
const { registerBody, loginBody } = require("./auth.schemas");

function createAuthRouter(authController, requireAuth) {
    const router = express.Router();

    router.post("/register", validate({ body: registerBody }), authController.register);
    router.post("/login", validate({ body: loginBody }), authController.login);
    router.get("/me", requireAuth, authController.me);

    return router;
}

module.exports = { createAuthRouter };
