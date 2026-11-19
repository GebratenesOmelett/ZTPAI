const config = require("./config");
const { createApp } = require("./app");
const { createKnexUnitOfWork } = require("./db/unitOfWork.knex");
const { createMemoryUnitOfWork } = require("./db/unitOfWork.memory");

const unitOfWork = config.REPOSITORY === "memory"
    ? createMemoryUnitOfWork()
    : createKnexUnitOfWork(require("./db/knex"));

const app = createApp({ config, runInTransaction: unitOfWork.runInTransaction });

app.listen(config.PORT, err => {
    if (err) {
        console.error(`Cannot start server on port ${config.PORT}: ${err.message}`);
        process.exit(1);
    }
    console.log(`Server running on http://localhost:${config.PORT} (repository: ${config.REPOSITORY})`);
});
