const { AppError } = require("../errors/AppError");
const { PG_ERROR } = require("../db/pgErrorCodes");

const DB_ERRORS = {
    [PG_ERROR.UNIQUE_VIOLATION]: { status: 409, code: "UNIQUE_VIOLATION", message: "Resource already exists" },
    [PG_ERROR.FOREIGN_KEY_VIOLATION]: { status: 409, code: "FOREIGN_KEY_VIOLATION", message: "Related resource does not exist or is still in use" },
    [PG_ERROR.CHECK_VIOLATION]: { status: 400, code: "CHECK_VIOLATION", message: "Data violates a database constraint" },
    [PG_ERROR.EXCLUSION_VIOLATION]: { status: 409, code: "ROOM_ALREADY_BOOKED", message: "Room is already booked in this time slot" }
};

const CONSTRAINT_ERRORS = {
    users_email_unique: { status: 409, code: "EMAIL_TAKEN", message: "Email already registered" }
};

function errorHandler(err, req, res, next) {
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            error: {
                code: err.code,
                message: err.message,
                ...(err.details && { details: err.details }),
                requestId: req.id
            }
        });
    }

    if (err.type === "entity.parse.failed") {
        return res.status(400).json({
            error: {
                code: "INVALID_JSON",
                message: "Request body is not valid JSON",
                requestId: req.id
            }
        });
    }

    const dbError = CONSTRAINT_ERRORS[err.constraint] ?? DB_ERRORS[err.code];
    if (dbError) {
        return res.status(dbError.status).json({
            error: {
                code: dbError.code,
                message: dbError.message,
                requestId: req.id
            }
        });
    }

    console.error(`[${req.id}]`, err);
    res.status(500).json({
        error: {
            code: "INTERNAL_ERROR",
            message: "Internal server error",
            requestId: req.id
        }
    });
}

module.exports = errorHandler;
