const bcrypt = require("bcryptjs");

const BCRYPT_ROUNDS = 12;

const USERS = [
    { email: "admin@example.com", password: "admin-password-123", role: "ADMIN", created_at: "2026-10-01T08:00:00Z" },
    { email: "anna.nowak@example.com", password: "user-password-123", role: "USER", created_at: "2026-10-02T08:00:00Z" },
    { email: "piotr.wisniewski@example.com", password: "user-password-123", role: "USER", created_at: "2026-10-03T08:00:00Z" },
    { email: "katarzyna.zielinska@example.com", password: "user-password-123", role: "USER", created_at: "2026-10-04T08:00:00Z" }
];

exports.seed = async function (knex) {
    await knex.raw("TRUNCATE audit_log, reservations, rooms, buildings, users RESTART IDENTITY CASCADE");

    for (const { password, ...user } of USERS) {
        const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
        await knex("users").insert({ ...user, password_hash: passwordHash });
    }
};
