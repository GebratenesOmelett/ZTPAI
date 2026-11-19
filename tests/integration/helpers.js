const request = require("supertest");
const bcrypt = require("bcryptjs");
const config = require("../../src/config");
const db = require("../../src/db/knex");
const { createApp } = require("../../src/app");
const { createKnexUnitOfWork } = require("../../src/db/unitOfWork.knex");

const NOW = new Date("2026-11-01T12:00:00Z");
const PASSWORD = "test-password-123";

const ADMIN = { id: 1, email: "admin@example.com" };
const ANNA = { id: 2, email: "anna@example.com" };
const PIOTR = { id: 3, email: "piotr@example.com" };

let passwordHash;

function createTestApp() {
    const { runInTransaction } = createKnexUnitOfWork(db);
    const app = createApp({ config, runInTransaction, now: () => NOW });
    return { app, runInTransaction };
}

async function prepareDatabase() {
    await db.migrate.latest();
    passwordHash = await bcrypt.hash(PASSWORD, 4);
}

async function resetDatabase() {
    await db.raw("TRUNCATE reservations, rooms, buildings, users RESTART IDENTITY CASCADE");
    await db("users").insert([
        { email: ADMIN.email, password_hash: passwordHash, role: "ADMIN" },
        { email: ANNA.email, password_hash: passwordHash, role: "USER" },
        { email: PIOTR.email, password_hash: passwordHash, role: "USER" }
    ]);
    await db("buildings").insert({ name: "Budynek A", address: "ul. Testowa 1, Kraków" });
    await db("rooms").insert([
        { building_id: 1, name: "101", capacity: 10 },
        { building_id: 1, name: "102", capacity: 20 }
    ]);
}

async function login(app, email) {
    const res = await request(app).post("/api/auth/login").send({ email, password: PASSWORD }).expect(200);
    return res.body.accessToken;
}

function booking(start, end, extra = {}) {
    return { roomId: 1, participants: 5, startTime: `2026-12-01T${start}:00Z`, endTime: `2026-12-01T${end}:00Z`, ...extra };
}

module.exports = { db, NOW, ADMIN, ANNA, PIOTR, createTestApp, prepareDatabase, resetDatabase, login, booking };
