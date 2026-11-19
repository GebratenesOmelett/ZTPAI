const { PG_ERROR } = require("../../db/pgErrorCodes");

const DEFAULT_USERS = [
    {
        id: 1, email: "admin@example.com", role: "ADMIN", createdAt: "2026-10-01T08:00:00Z",
        passwordHash: "$2b$12$8.6Zr1.AXcIww6l5Np7fZeit4i3p04DM8HgRBGBfb4xuxinEsKrq."
    },
    {
        id: 2, email: "anna.nowak@example.com", role: "USER", createdAt: "2026-10-02T08:00:00Z",
        passwordHash: "$2b$12$yPeVxGGhZnC/fYmav1RrGug/IdDTvgw6NBWn1I6z/ayWSUDdxnHbW"
    },
    {
        id: 3, email: "piotr.wisniewski@example.com", role: "USER", createdAt: "2026-10-03T08:00:00Z",
        passwordHash: "$2b$12$LH0YHEMmgUZK/cBGcSZkLufRjIEJTmg6SLuuu0jzKFzV7Pyh8y7SS"
    },
    {
        id: 4, email: "katarzyna.zielinska@example.com", role: "USER", createdAt: "2026-10-04T08:00:00Z",
        passwordHash: "$2b$12$b.2EciSs6nPenJAKp8AeieOfthBvZLzPsHCF3ayUv0tqRLa/WckfS"
    }
];

function createUsersRepository(state) {
    let nextUserId = Math.max(0, ...state.users.map(u => u.id)) + 1;

    return {
        async findById(id) {
            return state.users.find(u => u.id === id) ?? null;
        },
        async findByEmail(email) {
            return state.users.find(u => u.email === email) ?? null;
        },
        async create({ email, passwordHash, role }) {
            if (state.users.some(u => u.email === email)) {
                throw Object.assign(new Error("Duplicate email"), {
                    code: PG_ERROR.UNIQUE_VIOLATION,
                    constraint: "users_email_unique"
                });
            }
            const user = { id: nextUserId++, email, passwordHash, role, createdAt: new Date() };
            state.users.push(user);
            return user;
        }
    };
}

module.exports = { createUsersRepository, DEFAULT_USERS };
