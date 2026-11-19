const fs = require("node:fs");
const path = require("node:path");
const { parseEnv } = require("node:util");

function readDotEnv() {
    try {
        return parseEnv(fs.readFileSync(path.join(__dirname, "..", ".env"), "utf8"));
    } catch {
        return {};
    }
}

function testDatabaseUrl() {
    if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;

    const developmentUrl = readDotEnv().DATABASE_URL;
    if (!developmentUrl) return "postgres://postgres:postgres@localhost:5432/ztpai_test";

    const url = new URL(developmentUrl);
    url.pathname = `${url.pathname}_test`;
    return url.toString();
}

const databaseUrl = testDatabaseUrl();
if (!new URL(databaseUrl).pathname.endsWith("_test")) {
    throw new Error(`Refusing to run tests on a non-test database: ${new URL(databaseUrl).pathname}`);
}

process.env.NODE_ENV = "test";
process.env.DATABASE_URL = databaseUrl;
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123";
process.env.JWT_EXPIRES_IN = "15m";
process.env.REPOSITORY = "knex";
