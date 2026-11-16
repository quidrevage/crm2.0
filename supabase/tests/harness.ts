import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, "..", "migrations");

export type Row = Record<string, unknown>;

/**
 * A throw-away in-memory Postgres with the real migrations applied.
 * It checks the SQL and the access rules without Docker or a cloud project.
 * It is not Supabase itself: Auth, Storage and the API gateway are stubbed (see prelude.sql).
 */
export async function createDatabase() {
  const db = new PGlite({ extensions: { pg_trgm } });
  await db.exec(readFileSync(join(here, "prelude.sql"), "utf8"));
  for (const file of readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort()) {
    try {
      await db.exec(readFileSync(join(migrationsDir, file), "utf8"));
    } catch (error) {
      throw new Error(`Migration ${file} failed: ${(error as Error).message}`);
    }
  }

  async function reset() {
    await db.exec(`reset role; select set_config('request.jwt.claims', '', false);`);
  }

  /** Runs SQL as the database owner (what the Supabase dashboard or the Auth service would do). */
  async function asOwner<T extends Row = Row>(sql: string, params: unknown[] = []) {
    await reset();
    return (await db.query<T>(sql, params)).rows;
  }

  /** Runs SQL the way the API does for a signed-in user: role `authenticated` plus JWT claims. */
  async function asUser<T extends Row = Row>(userId: string, sql: string, params: unknown[] = []) {
    await reset();
    await db.query(`select set_config('request.jwt.claims', $1, false)`, [JSON.stringify({ sub: userId, role: "authenticated" })]);
    await db.exec(`set role authenticated`);
    try {
      return (await db.query<T>(sql, params)).rows;
    } finally {
      await reset();
    }
  }

  /** Runs SQL as an anonymous visitor (no session). */
  async function asAnon<T extends Row = Row>(sql: string, params: unknown[] = []) {
    await reset();
    await db.exec(`set role anon`);
    try {
      return (await db.query<T>(sql, params)).rows;
    } finally {
      await reset();
    }
  }

  /** Simulates the Auth service creating an account. */
  async function createAuthUser(email: string, metadata: Record<string, string> = {}) {
    const rows = await asOwner<{ id: string }>(`insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`, [email, JSON.stringify(metadata)]);
    return rows[0].id;
  }

  return { db, asOwner, asUser, asAnon, createAuthUser };
}

export type TestDatabase = Awaited<ReturnType<typeof createDatabase>>;
