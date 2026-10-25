import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { randomUUID } from "node:crypto";

test("Spanish full migration chain, owner isolation, atomic completion and optimistic revisions", async (t) => {
  const db = new PGlite();
  const first = "11111111-1111-4111-8111-111111111111",
    second = "22222222-2222-4222-8222-222222222222";
  const one = async (sql, args = []) => (await db.query(sql, args)).rows[0];
  const as = async (id) => db.exec(`RESET ROLE; SET ROLE authenticated; SET test.uid='${id}'`);
  try {
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb DEFAULT '{}');
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
      GRANT USAGE ON SCHEMA auth TO authenticated,anon;
      GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated,anon;
      CREATE SCHEMA storage; CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id text,name text);
      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
      GRANT USAGE ON SCHEMA storage TO authenticated; GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO authenticated;
    `);
    for (const file of (await readdir(new URL("../supabase/migrations/", import.meta.url)))
      .filter((name) => name.endsWith(".sql"))
      .sort())
      await db.exec(
        await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), "utf8"),
      );
    const migration = await readFile(
      new URL("../supabase/migrations/20261025220000_spanish_workspace.sql", import.meta.url),
      "utf8",
    );
    await db.exec(migration); // Reapplication is additive and does not erase rows.
    await db.query(
      "INSERT INTO auth.users(id,email) VALUES($1,'one@example.test'),($2,'two@example.test')",
      [first, second],
    );
    await as(first);
    const put = async (kind, key, data, id = randomUUID(), revision = 0) =>
      one("SELECT * FROM put_spanish_item($1,$2,$3,$4::jsonb,$5)", [
        id,
        kind,
        key,
        JSON.stringify(data),
        revision,
      ]);
    const activity = async (
      id,
      task,
      payload = { notes: "Three key points", source: "self_reported" },
    ) =>
      one("SELECT record_spanish_activity($1,'2026-10-25','listen',600,$2::jsonb,$3) id", [
        id,
        JSON.stringify(payload),
        task,
      ]);
    let profile, task;
    await t.test("profile round-trip, exact retry and stale-edit rejection", async () => {
      profile = await put("profile", "main", { goal: "Natural conversations" });
      assert.equal(profile.revision, 1);
      assert.equal((await put("profile", "main", profile.data, profile.id)).id, profile.id);
      assert.equal((await put("profile", "main", profile.data, randomUUID())).id, profile.id);
      const changed = await put("profile", "main", { goal: "Tell stories" }, profile.id, 1);
      assert.equal(changed.revision, 2);
      assert.equal((await put("profile", "main", changed.data, profile.id, 1)).revision, 2);
      await assert.rejects(
        put("profile", "main", { goal: "Stale edit" }, profile.id, 1),
        /changed/,
      );
      assert.equal(
        (await one("SELECT data FROM spanish_items WHERE id=$1", [profile.id])).data.goal,
        "Tell stories",
      );
    });
    await t.test(
      "activity and linked task complete atomically, retries do not duplicate",
      async () => {
        task = await put("task", "2026-10-25:0", {
          date: "2026-10-25",
          action: "listen",
          status: "planned",
        });
        const id = randomUUID();
        await activity(id, task.id);
        await activity(id, task.id);
        assert.equal((await one("SELECT count(*)::int n FROM spanish_activities")).n, 1);
        assert.equal(
          (
            await one("SELECT data->>'status' status,revision FROM spanish_items WHERE id=$1", [
              task.id,
            ])
          ).status,
          "done",
        );
        await assert.rejects(
          activity(id, task.id, { notes: "Different evidence" }),
          /different evidence/,
        );
        await assert.rejects(activity(randomUUID(), task.id), /planned task/);
        assert.equal((await one("SELECT count(*)::int n FROM spanish_activities")).n, 1);
      },
    );
    await t.test(
      "mismatched date/kind, bad duration and non-task references fail without side effects",
      async () => {
        const planned = await put("task", "another", {
          date: "2026-10-26",
          action: "listen",
          status: "planned",
        });
        await assert.rejects(activity(randomUUID(), planned.id));
        await assert.rejects(activity(randomUUID(), profile.id));
        await assert.rejects(
          db.query("SELECT record_spanish_activity($1,'2026-10-25','listen',-1,'{}',null)", [
            randomUUID(),
          ]),
        );
        await assert.rejects(
          db.query(
            "INSERT INTO spanish_activities(user_id,date,kind,task_id) VALUES(auth.uid(),'2026-10-25','practice',$1)",
            [task.id],
          ),
        );
        assert.equal(
          (await one("SELECT data->>'status' status FROM spanish_items WHERE id=$1", [planned.id]))
            .status,
          "planned",
        );
      },
    );
    await t.test(
      "second user cannot see/edit/delete first user's data or link a foreign task",
      async () => {
        await as(second);
        assert.equal((await one("SELECT count(*)::int n FROM spanish_items")).n, 0);
        assert.equal((await one("SELECT count(*)::int n FROM spanish_activities")).n, 0);
        assert.equal(
          (
            await db.query("UPDATE spanish_items SET data='{}' WHERE id=$1 RETURNING id", [
              profile.id,
            ])
          ).rows.length,
          0,
        );
        assert.equal(
          (await db.query("DELETE FROM spanish_items WHERE id=$1 RETURNING id", [profile.id])).rows
            .length,
          0,
        );
        await assert.rejects(activity(randomUUID(), task.id));
        await assert.rejects(
          db.query("INSERT INTO spanish_items(user_id,kind,key) VALUES($1,'profile','foreign')", [
            first,
          ]),
        );
        await put("profile", "main", { goal: "Second user" });
        assert.equal((await one("SELECT count(*)::int n FROM spanish_items")).n, 1);
        await as(first);
        assert.equal(
          (await one("SELECT data->>'goal' goal FROM spanish_items WHERE id=$1", [profile.id]))
            .goal,
          "Tell stories",
        );
      },
    );
    await t.test("anonymous access denied and existing application tables retained", async () => {
      await db.exec("RESET ROLE; SET ROLE anon; SET test.uid=''");
      await assert.rejects(db.query("SELECT * FROM spanish_items"));
      await assert.rejects(
        db.query("SELECT * FROM put_spanish_item($1,'profile','main','{}',0)", [randomUUID()]),
      );
      await db.exec("RESET ROLE");
      for (const name of [
        "trades",
        "market_inspections",
        "workouts",
        "fitness_tasks",
        "learning_progress",
        "flashcards",
      ])
        assert.equal((await one("SELECT to_regclass($1) name", [name])).name, name);
    });
    await t.test(
      "reapplying the additive migration preserves existing application and Spanish rows",
      async () => {
        const profilesBefore = (await db.query("SELECT * FROM profiles ORDER BY id")).rows;
        const spanishBefore = (await db.query("SELECT * FROM spanish_items ORDER BY id")).rows;
        const activitiesBefore = (await db.query("SELECT * FROM spanish_activities ORDER BY id"))
          .rows;
        assert.equal(profilesBefore.length, 2);
        assert(spanishBefore.length > 0 && activitiesBefore.length > 0);
        await db.exec(migration);
        assert.deepEqual(
          (await db.query("SELECT * FROM profiles ORDER BY id")).rows,
          profilesBefore,
        );
        assert.deepEqual(
          (await db.query("SELECT * FROM spanish_items ORDER BY id")).rows,
          spanishBefore,
        );
        assert.deepEqual(
          (await db.query("SELECT * FROM spanish_activities ORDER BY id")).rows,
          activitiesBefore,
        );
      },
    );
  } finally {
    await db.close();
  }
});
