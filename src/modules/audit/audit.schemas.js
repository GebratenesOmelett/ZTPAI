const { z } = require("zod");
const { EVENT } = require("../../events/eventTypes");

const listAuditLogQuery = z.object({
    eventType: z.enum(Object.values(EVENT)).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20)
});

module.exports = { listAuditLogQuery };
