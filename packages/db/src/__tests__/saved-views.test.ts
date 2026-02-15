import { describe, it, expect, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import {
  createSavedView,
  listSavedViews,
  getSavedView,
  updateSavedView,
  deleteSavedView,
} from "../queries/saved-views.js";
import { INITIAL_SCHEMA_SQL, FTS5_MIGRATION_SQL } from "../migration-sql.js";

async function applyMigration(db: D1Database) {
  const allSql = INITIAL_SCHEMA_SQL + "\n" + FTS5_MIGRATION_SQL;
  const statements = allSql
    .split(";")
    .map((s) => s.trim())
    .filter(
      (s) =>
        s.length > 0 &&
        !s.startsWith("--") &&
        !s.match(/^--/) &&
        s.includes(" ")
    );

  for (const stmt of statements) {
    await db.prepare(stmt).run();
  }
}

describe("saved-views queries", () => {
  beforeEach(async () => {
    await applyMigration(env.FOCUS_DB);
  });

  it("creates and retrieves a saved view", async () => {
    const view = await createSavedView(env.FOCUS_DB, {
      name: "Newsletters",
      query_ast_json:
        '{"filters":[{"field":"type","operator":"eq","value":"email"}],"combinator":"and"}',
      is_system: 1,
      pinned_order: 1,
    });

    expect(view.id).toBeDefined();
    expect(view.name).toBe("Newsletters");
    expect(view.is_system).toBe(1);
    expect(view.pinned_order).toBe(1);

    const fetched = await getSavedView(env.FOCUS_DB, view.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.name).toBe("Newsletters");
  });

  it("lists all non-deleted saved views", async () => {
    await createSavedView(env.FOCUS_DB, {
      name: "View 1",
      query_ast_json: '{"filters":[],"combinator":"and"}',
      pinned_order: 2,
    });
    await createSavedView(env.FOCUS_DB, {
      name: "View 2",
      query_ast_json: '{"filters":[],"combinator":"and"}',
      pinned_order: 1,
    });

    const views = await listSavedViews(env.FOCUS_DB);
    expect(views).toHaveLength(2);
    // Should be ordered by pinned_order ASC
    expect(views[0].name).toBe("View 2");
    expect(views[1].name).toBe("View 1");
  });

  it("updates a saved view", async () => {
    const view = await createSavedView(env.FOCUS_DB, {
      name: "Original",
      query_ast_json: '{"filters":[],"combinator":"and"}',
    });

    await updateSavedView(env.FOCUS_DB, view.id, { name: "Renamed" });

    const fetched = await getSavedView(env.FOCUS_DB, view.id);
    expect(fetched!.name).toBe("Renamed");
  });

  it("soft deletes a saved view", async () => {
    const view = await createSavedView(env.FOCUS_DB, {
      name: "To Delete",
      query_ast_json: '{"filters":[],"combinator":"and"}',
    });

    await deleteSavedView(env.FOCUS_DB, view.id);

    const fetched = await getSavedView(env.FOCUS_DB, view.id);
    expect(fetched).toBeNull();

    const all = await listSavedViews(env.FOCUS_DB);
    expect(all).toHaveLength(0);
  });

  it("returns null for nonexistent view", async () => {
    const fetched = await getSavedView(env.FOCUS_DB, "nonexistent");
    expect(fetched).toBeNull();
  });
});
