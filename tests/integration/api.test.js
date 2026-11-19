const request = require("supertest");
const { db, ADMIN, ANNA, PIOTR, createTestApp, prepareDatabase, resetDatabase, login, booking } = require("./helpers");

const { app } = createTestApp();

beforeAll(prepareDatabase);
beforeEach(resetDatabase);
afterAll(() => db.destroy());

function createReservation(token, body) {
    return request(app).post("/api/reservations").set("Authorization", `Bearer ${token}`).send(body);
}

describe("Auth API", () => {
    test("register + login + GET /api/auth/me", async () => {
        const registered = await request(app)
            .post("/api/auth/register")
            .send({ email: "Jan.Kowalski@example.com", password: "bardzo-dlugie-haslo" })
            .expect(201);
        expect(registered.body).toEqual({ id: 4, email: "jan.kowalski@example.com", role: "USER", createdAt: expect.any(String) });

        const loggedIn = await request(app)
            .post("/api/auth/login")
            .send({ email: "jan.kowalski@example.com", password: "bardzo-dlugie-haslo" })
            .expect(200);
        expect(loggedIn.body).toMatchObject({ tokenType: "Bearer", expiresIn: "15m" });

        const me = await request(app)
            .get("/api/auth/me")
            .set("Authorization", `Bearer ${loggedIn.body.accessToken}`)
            .expect(200);
        expect(me.body).toEqual(registered.body);

        const row = await db("users").where({ email: "jan.kowalski@example.com" }).first();
        expect(row.password_hash).toMatch(/^\$2[aby]\$12\$/);
    });

    test("401 without token", async () => {
        const res = await request(app).get("/api/reservations");

        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe("UNAUTHORIZED");
    });
});

describe("Reservations API", () => {
    test("POST /api/reservations -> 201, Location header and row in the database", async () => {
        const token = await login(app, ANNA.email);

        const res = await createReservation(token, booking("10:00", "12:00"));

        expect(res.status).toBe(201);
        expect(res.headers.location).toBe(`/api/reservations/${res.body.id}`);
        expect(res.body.user).toEqual({ id: ANNA.id, email: ANNA.email });

        const row = await db("reservations").where({ id: res.body.id }).first();
        expect(row).toMatchObject({ room_id: 1, user_id: ANNA.id, participants: 5, status: "CONFIRMED" });
        expect(row.start_time.toISOString()).toBe("2026-12-01T10:00:00.000Z");
    });

    test("400 with field details for invalid body", async () => {
        const token = await login(app, ANNA.email);

        const res = await createReservation(token, { roomId: 1, participants: 0, startTime: "2026-12-01T10:00:00Z" });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("VALIDATION_ERROR");
        expect(res.body.error.details).toEqual(expect.arrayContaining([
            expect.objectContaining({ location: "body", field: "participants" }),
            expect.objectContaining({ location: "body", field: "endTime" })
        ]));
        expect(await db("reservations").count({ count: "*" }).first()).toEqual({ count: "0" });
    });

    test("403 for USER creating a room", async () => {
        const token = await login(app, ANNA.email);

        const res = await request(app)
            .post("/api/rooms")
            .set("Authorization", `Bearer ${token}`)
            .send({ buildingId: 1, name: "301", capacity: 8 });

        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe("FORBIDDEN");
        expect(await db("rooms").where({ name: "301" }).first()).toBeUndefined();
    });

    test("404 for USER fetching someone else's reservation, 200 for ADMIN", async () => {
        const piotrToken = await login(app, PIOTR.email);
        const annaToken = await login(app, ANNA.email);
        const adminToken = await login(app, ADMIN.email);
        const { body: created } = await createReservation(piotrToken, booking("10:00", "12:00"));

        const asAnna = await request(app).get(`/api/reservations/${created.id}`).set("Authorization", `Bearer ${annaToken}`);
        const asAdmin = await request(app).get(`/api/reservations/${created.id}`).set("Authorization", `Bearer ${adminToken}`);

        expect(asAnna.status).toBe(404);
        expect(asAnna.body.error.code).toBe("NOT_FOUND");
        expect(asAdmin.status).toBe(200);
    });

    test("409 ROOM_ALREADY_BOOKED for overlapping reservation", async () => {
        const annaToken = await login(app, ANNA.email);
        const piotrToken = await login(app, PIOTR.email);
        await createReservation(annaToken, booking("10:00", "12:00")).expect(201);

        const res = await createReservation(piotrToken, booking("11:00", "13:00"));

        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe("ROOM_ALREADY_BOOKED");
        expect(await db("reservations").where({ room_id: 1, status: "CONFIRMED" }).count({ count: "*" }).first()).toEqual({ count: "1" });
    });

    test("touching reservations are allowed (SQL overlap uses strict comparison)", async () => {
        const token = await login(app, ANNA.email);
        await createReservation(token, booking("10:00", "12:00")).expect(201);

        await createReservation(token, booking("12:00", "13:00")).expect(201);
        await createReservation(token, booking("09:00", "10:00")).expect(201);
    });

    test("pagination: meta.total and number of items for limit smaller than the number of rows", async () => {
        const token = await login(app, ANNA.email);
        for (const [start, end] of [["08:00", "09:00"], ["10:00", "11:00"], ["12:00", "13:00"]]) {
            await createReservation(token, booking(start, end)).expect(201);
        }

        const firstPage = await request(app).get("/api/reservations?limit=2").set("Authorization", `Bearer ${token}`).expect(200);
        const secondPage = await request(app).get("/api/reservations?limit=2&page=2").set("Authorization", `Bearer ${token}`).expect(200);

        expect(firstPage.body.meta).toEqual({ page: 1, limit: 2, total: 3, totalPages: 2 });
        expect(firstPage.body.data).toHaveLength(2);
        expect(secondPage.body.data).toHaveLength(1);
        expect(secondPage.body.data[0].startTime).toBe("2026-12-01T12:00:00.000Z");
    });
});
