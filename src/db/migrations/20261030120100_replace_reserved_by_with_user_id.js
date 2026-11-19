const bcrypt = require("bcryptjs");
const { randomBytes } = require("node:crypto");

const BCRYPT_ROUNDS = 12;

function emailFromReservedBy(reservedBy) {
    const value = reservedBy.trim().toLowerCase();
    if (value.includes("@")) return value;

    const localPart = value
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/ł/g, "l")
        .replace(/[^a-z0-9]+/g, ".")
        .replace(/^\.+|\.+$/g, "");
    return `${localPart || "user"}@example.com`;
}

exports.up = async function (knex) {
    await knex.schema.alterTable("reservations", table => {
        table.integer("user_id").references("id").inTable("users").onDelete("RESTRICT");
    });

    const rows = await knex("reservations").distinct("reserved_by");
    for (const { reserved_by: reservedBy } of rows) {
        const email = emailFromReservedBy(reservedBy);

        let user = await knex("users").where({ email }).first("id");
        if (!user) {
            const passwordHash = await bcrypt.hash(randomBytes(32).toString("hex"), BCRYPT_ROUNDS);
            [user] = await knex("users")
                .insert({ email, password_hash: passwordHash, role: "USER" })
                .returning("id");
        }

        await knex("reservations").where({ reserved_by: reservedBy }).update({ user_id: user.id });
    }

    await knex.schema.alterTable("reservations", table => {
        table.dropNullable("user_id");
        table.dropColumn("reserved_by");
        table.index(["user_id"], "reservations_user_id_idx");
    });
};

exports.down = async function (knex) {
    await knex.schema.alterTable("reservations", table => {
        table.string("reserved_by", 100);
    });

    await knex.raw("UPDATE reservations SET reserved_by = users.email FROM users WHERE users.id = reservations.user_id");

    await knex.schema.alterTable("reservations", table => {
        table.dropNullable("reserved_by");
        table.dropColumn("user_id");
    });
};
