const ROLES = ["USER", "ADMIN"];

exports.up = async function (knex) {
    await knex.schema.createTable("users", table => {
        table.increments("id").primary();
        table.string("email", 254).notNullable().unique({ indexName: "users_email_unique" });
        table.string("password_hash", 100).notNullable();
        table.string("role", 20).notNullable().defaultTo("USER");
        table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

        table.check(
            `?? IN (${ROLES.map(() => "?").join(", ")})`,
            ["role", ...ROLES],
            "users_role_check"
        );
    });
};

exports.down = async function (knex) {
    await knex.schema.dropTable("users");
};
