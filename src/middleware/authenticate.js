const jwt = require("jsonwebtoken");
const { UnauthorizedError } = require("../errors/AppError");

function authenticate(jwtSecret) {
    return (req, res, next) => {
        const header = req.get("Authorization");
        if (!header || !header.startsWith("Bearer ")) {
            return next(new UnauthorizedError());
        }

        const token = header.slice("Bearer ".length).trim();
        if (!token) {
            return next(new UnauthorizedError());
        }

        try {
            const payload = jwt.verify(token, jwtSecret, { algorithms: ["HS256"] });
            req.user = { id: Number(payload.sub), role: payload.role };
            next();
        } catch (err) {
            if (err.name === "TokenExpiredError") {
                return next(new UnauthorizedError("Token expired", "TOKEN_EXPIRED"));
            }
            next(new UnauthorizedError("Invalid token"));
        }
    };
}

module.exports = authenticate;
