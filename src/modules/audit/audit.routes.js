const express = require("express");
const validate = require("../../middleware/validate");
const authorize = require("../../middleware/authorize");
const { ROLE } = require("../users/users.roles");
const { listAuditLogQuery } = require("./audit.schemas");

function createAdminRouter(auditController) {
    const router = express.Router();

    router.get("/audit-log", authorize(ROLE.ADMIN), validate({ query: listAuditLogQuery }), auditController.list);

    return router;
}

module.exports = { createAdminRouter };
