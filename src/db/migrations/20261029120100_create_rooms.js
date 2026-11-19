exports.up = async function (knex) {
    await knex.schema.createTable("rooms", table => {
        table.increments("id").primary();
        table.integer("building_id").notNullable()
            .references("id").inTable("buildings")
            .onDelete("RESTRICT");
        table.string("name", 100).notNullable();
        table.integer("capacity").notNullable();
        table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

        table.unique(["building_id", "name"], { indexName: "rooms_building_id_name_unique" });
        table.check("?? > 0", ["capacity"], "rooms_capacity_positive");
    });
};

exports.down = async function (knex) {
    await knex.schema.dropTable("rooms");
};
