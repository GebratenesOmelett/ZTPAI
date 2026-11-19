const STATUSES = ["CONFIRMED", "CANCELLED"];

exports.up = async function (knex) {
    await knex.schema.createTable("reservations", table => {
        table.increments("id").primary();
        table.integer("room_id").notNullable()
            .references("id").inTable("rooms")
            .onDelete("RESTRICT");
        table.string("reserved_by", 100).notNullable();
        table.integer("participants").notNullable();
        table.timestamp("start_time", { useTz: true }).notNullable();
        table.timestamp("end_time", { useTz: true }).notNullable();
        table.string("status", 20).notNullable().defaultTo("CONFIRMED");
        table.timestamp("cancelled_at", { useTz: true }).nullable();
        table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

        table.check("?? > 0", ["participants"], "reservations_participants_positive");
        table.check("?? > ??", ["end_time", "start_time"], "reservations_end_after_start");
        table.check(
            `?? IN (${STATUSES.map(() => "?").join(", ")})`,
            ["status", ...STATUSES],
            "reservations_status_allowed"
        );
        table.check(
            "(?? = 'CANCELLED') = (?? IS NOT NULL)",
            ["status", "cancelled_at"],
            "reservations_cancelled_at_matches_status"
        );

        table.index(["room_id", "start_time", "end_time"], "reservations_room_time_confirmed_idx", {
            predicate: knex.whereRaw("status = 'CONFIRMED'")
        });
    });
};

exports.down = async function (knex) {
    await knex.schema.dropTable("reservations");
};
