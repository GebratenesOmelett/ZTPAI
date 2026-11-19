exports.seed = async function (knex) {
    await knex("buildings").insert([
        { name: "Budynek A", address: "ul. Warszawska 24, Kraków" },
        { name: "Budynek B", address: "ul. Podchorążych 1, Kraków" },
        { name: "Budynek C", address: "ul. Długa 5, Kraków" }
    ]);

    await knex("rooms").insert([
        { building_id: 1, name: "101", capacity: 30 },
        { building_id: 1, name: "102", capacity: 20 },
        { building_id: 1, name: "201", capacity: 12 },
        { building_id: 2, name: "101", capacity: 25 },
        { building_id: 2, name: "Aula", capacity: 120 }
    ]);

    await knex("reservations").insert([
        {
            room_id: 1, user_id: 2, participants: 20,
            start_time: "2026-11-10T10:00:00Z", end_time: "2026-11-10T12:00:00Z",
            status: "CONFIRMED", created_at: "2026-10-27T08:00:00Z"
        },
        {
            room_id: 1, user_id: 2, participants: 15,
            start_time: "2026-11-10T12:00:00Z", end_time: "2026-11-10T13:00:00Z",
            status: "CONFIRMED", created_at: "2026-10-27T09:00:00Z"
        },
        {
            room_id: 2, user_id: 3, participants: 10,
            start_time: "2026-11-12T09:00:00Z", end_time: "2026-11-12T11:00:00Z",
            status: "CANCELLED", created_at: "2026-10-26T12:00:00Z", cancelled_at: "2026-10-28T10:00:00Z"
        },
        {
            room_id: 4, user_id: 3, participants: 4,
            start_time: "2026-01-10T10:00:00Z", end_time: "2026-01-10T12:00:00Z",
            status: "CONFIRMED", created_at: "2026-01-05T08:00:00Z"
        },
        {
            room_id: 5, user_id: 4, participants: 80,
            start_time: "2026-11-15T14:00:00Z", end_time: "2026-11-15T16:00:00Z",
            status: "CONFIRMED", created_at: "2026-10-28T15:00:00Z"
        }
    ]);
};
