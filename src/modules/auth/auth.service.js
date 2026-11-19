const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { ConflictError, UnauthorizedError, NotFoundError } = require("../../errors/AppError");
const { ROLE } = require("../users/users.roles");

const BCRYPT_ROUNDS = 12;
const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing", BCRYPT_ROUNDS);

function createAuthService({ runInTransaction, jwtSecret, jwtExpiresIn }) {
    async function register({ email, password }) {
        const existing = await runInTransaction(({ users }) => users.findByEmail(email));
        if (existing) throw new ConflictError("Email already registered", "EMAIL_TAKEN");

        const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
        return runInTransaction(({ users }) => users.create({ email, passwordHash, role: ROLE.USER }));
    }

    async function login({ email, password }) {
        const user = await runInTransaction(({ users }) => users.findByEmail(email));
        const passwordOk = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
        if (!user || !passwordOk) {
            throw new UnauthorizedError("Invalid email or password", "INVALID_CREDENTIALS");
        }

        const accessToken = jwt.sign(
            { role: user.role },
            jwtSecret,
            { subject: String(user.id), expiresIn: jwtExpiresIn, algorithm: "HS256" }
        );

        return { accessToken, tokenType: "Bearer", expiresIn: jwtExpiresIn };
    }

    async function getCurrentUser(currentUser) {
        return runInTransaction(async ({ users }) => {
            const user = await users.findById(currentUser.id);
            if (!user) throw new NotFoundError("User");
            return user;
        });
    }

    return { register, login, getCurrentUser };
}

module.exports = { createAuthService, BCRYPT_ROUNDS };
