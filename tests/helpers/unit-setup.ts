import { TEST_ENV } from "./env";

// Unit tests get the same configuration values but never touch a database: point DATABASE_URL at
// a closed port so any accidental connection fails loudly instead of using real data.
Object.assign(process.env, TEST_ENV, { DATABASE_URL: "postgres://unit-tests-have-no-database@127.0.0.1:1/none" });
