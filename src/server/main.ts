import { createPool } from "../db.js";
import { migrate } from "../migrate.js";
import { createApp } from "./app.js";

const pool = createPool();
await migrate(pool);
const port = Number(process.env.PORT ?? 3000);
createApp(pool).listen(port, () => console.log(`Roofline server on :${port}`));
