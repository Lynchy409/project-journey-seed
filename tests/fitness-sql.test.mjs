import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("fitness migration: atomic RPCs, retry safety, additive compatibility and two-user RLS", async () => {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE authenticated;
    CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO authenticated;
    GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
    CREATE FUNCTION public.update_updated_at_column() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
    CREATE TABLE workouts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL,date date NOT NULL,name text NOT NULL,kind text NOT NULL DEFAULT 'gym',notes text,media jsonb DEFAULT '[]',created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());
    CREATE TABLE exercise_sets(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL,workout_id uuid REFERENCES workouts(id) ON DELETE CASCADE,exercise text,weight numeric,reps int,set_index int);
    CREATE TABLE goals(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL,title text);
    CREATE TABLE checkins(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL,date date);
    CREATE TABLE routines(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL,name text);
    CREATE TABLE routine_logs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL,routine_id uuid REFERENCES routines(id),name text,date date,seconds int);
    CREATE TABLE little_wins(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL,title text,pillar text);
    CREATE TABLE win_logs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL,win_id uuid REFERENCES little_wins(id),title text,pillar text,date date);
    DO $$ DECLARE t text; BEGIN
      FOREACH t IN ARRAY ARRAY['workouts','exercise_sets','goals','checkins','routines','routine_logs','little_wins','win_logs'] LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
        EXECUTE format('GRANT ALL ON %I TO authenticated',t);
        EXECUTE format('CREATE POLICY own ON %I FOR ALL TO authenticated USING(auth.uid()=user_id) WITH CHECK(auth.uid()=user_id)',t);
      END LOOP;
    END $$;
    INSERT INTO workouts(id,user_id,date,name) VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','2026-10-20','Legacy row');
  `);
  const migration = await readFile(
    new URL("../supabase/migrations/20261025200000_fitness_workspace.sql", import.meta.url),
    "utf8",
  );
  await db.exec(migration);
  await db.exec(migration); // Safe reconciliation of an already-applied additive migration.
  await db.exec(`CREATE TABLE driver_logs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, date date NOT NULL, driver_key text NOT NULL, evidence text NOT NULL, UNIQUE(user_id,date,driver_key));
    GRANT ALL ON driver_logs TO authenticated;
    ALTER TABLE driver_logs ENABLE ROW LEVEL SECURITY;
    CREATE POLICY own ON driver_logs FOR ALL TO authenticated USING(auth.uid()=user_id) WITH CHECK(auth.uid()=user_id);`);
  await db.exec(await readFile(new URL('../drizzle/migrations/0005_training_log_atomic_edits.sql',import.meta.url),'utf8'));
  assert.equal((await db.query("SELECT name,details FROM workouts")).rows[0].name, "Legacy row");
  await db.exec(`SET ROLE authenticated; SET test.uid='11111111-1111-4111-8111-111111111111';`);
  const task = (
    await db.query(
      `INSERT INTO fitness_tasks(user_id,date,slot,title,source_key) VALUES(auth.uid(),'2026-10-25','strength','Strength','test') RETURNING id`,
    )
  ).rows[0].id;
  const workout = { name: "Bench", date: "2026-10-25", kind: "gym", details: { slot: "strength" } };
  const sets = [
    {
      exercise: "Bench press",
      weight: 70,
      reps: 5,
      seconds: null,
      load_type: "external",
      side: "both",
      rest_seconds: 90,
    },
  ];
  const wid = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const save = (id, w = workout, ss = sets, t = task) =>
    db.query("SELECT save_fitness_workout($1::uuid,$2::jsonb,$3::jsonb,$4::uuid)", [
      id,
      JSON.stringify(w),
      JSON.stringify(ss),
      t,
    ]);
  await save(wid);
  await save(wid);
  assert.equal((await db.query("SELECT count(*)::int n FROM exercise_sets")).rows[0].n, 1);
  assert.equal(
    (await db.query("SELECT status FROM fitness_tasks WHERE id=$1", [task])).rows[0].status,
    "done",
  );
  await assert.rejects(
    save("cccccccc-cccc-4ccc-8ccc-cccccccccccc", workout, [{ ...sets[0], weight: -1 }], null),
  );
  await assert.rejects(
    save("cccccccc-cccc-4ccc-8ccc-cccccccccccc", workout, [{ ...sets[0], reps: 2.5 }], null),
  );
  await assert.rejects(
    save(
      "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      workout,
      [{ ...sets[0], load_type: "made-up" }],
      null,
    ),
  );
  await assert.rejects(
    save(
      "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      { ...workout, details: { slot: "strength", distance_m: -5 } },
      [],
      null,
    ),
  );
  assert.equal(
    (await db.query("SELECT count(*)::int n FROM workouts")).rows[0].n,
    2,
    "invalid sets roll back the session insert",
  );
  await assert.rejects(db.query("SELECT move_fitness_task($1,'2026-10-26',null)", [task]));
  await db.query("SELECT delete_fitness_workout($1)", [wid]);
  assert.equal(
    (await db.query("SELECT status,workout_id FROM fitness_tasks WHERE id=$1", [task])).rows[0]
      .status,
    "planned",
  );
  assert.equal((await db.query("SELECT count(*)::int n FROM exercise_sets")).rows[0].n, 0);
  const second = (
    await db.query(
      `INSERT INTO fitness_tasks(user_id,date,slot,title,source_key) VALUES(auth.uid(),'2026-10-27','cardio','Cardio','second') RETURNING id`,
    )
  ).rows[0].id;
  await db.query("SELECT move_fitness_task($1,'2026-10-26',null)", [task]);
  await db.query("SELECT move_fitness_task($1,'2026-10-26',$2)", [task, second]);
  assert.equal(
    (await db.query("SELECT date::text date FROM fitness_tasks WHERE id=$1", [task])).rows[0].date,
    "2026-10-27",
  );
  const routine = (
    await db.query("INSERT INTO routines(user_id,name) VALUES(auth.uid(),'Recovery') RETURNING id")
  ).rows[0].id;
  await save(
    wid,
    { ...workout, details: { slot: "recovery", duration_seconds: 60, routine_id: routine } },
    [],
    null,
  );
  await save(
    wid,
    { ...workout, details: { slot: "recovery", duration_seconds: 60, routine_id: routine } },
    [],
    null,
  );
  assert.equal((await db.query("SELECT count(*)::int n FROM routine_logs")).rows[0].n, 1);
  const win = (
    await db.query(
      "INSERT INTO little_wins(user_id,title,pillar) VALUES(auth.uid(),'Plank','fitness') RETURNING id",
    )
  ).rows[0].id;
  const winWorkout = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
  await save(winWorkout, { ...workout, details: { slot: "strength", win_id: win } }, sets, null);
  await save(winWorkout, { ...workout, details: { slot: "strength", win_id: win } }, sets, null);
  assert.equal((await db.query("SELECT count(*)::int n FROM win_logs")).rows[0].n, 1);
  await db.query("SELECT delete_fitness_workout($1)", [winWorkout]);
  assert.equal((await db.query("SELECT count(*)::int n FROM win_logs")).rows[0].n, 0);
  const mixedId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  const mixed = {name:'Strength · Fitness · Recovery',date:'2026-10-30',kind:'sprints', details:{slot:'strength',completed_slots:['strength','cardio','recovery'],duration_seconds:900,distance_m:10,rounds:10}};
  for (const slot of ['strength','cardio','recovery']) await db.query(`INSERT INTO fitness_tasks(user_id,date,slot,title,source_key) VALUES(auth.uid(),'2026-10-30',$1,$1,$1)`,[slot]);
  const commit = (w=mixed,ss=[{...sets[0],weight:2.5}],edit=false)=>db.query('SELECT commit_training_log($1,$2,$3,$4)',[mixedId,JSON.stringify(w),JSON.stringify(ss),edit]);
  await commit(); await commit();
  assert.equal((await db.query('SELECT count(*)::int n FROM exercise_sets WHERE workout_id=$1',[mixedId])).rows[0].n,1);
  assert.equal((await db.query("SELECT count(*)::int n FROM fitness_tasks WHERE date='2026-10-30' AND status='done'")).rows[0].n,3);
  assert.deepEqual((await db.query('SELECT driver_key FROM driver_logs ORDER BY driver_key')).rows.map(r=>r.driver_key),['recovery','sprint','strength']);
  await commit(mixed,[{...sets[0],weight:82.5}],true);
  assert.equal(Number((await db.query('SELECT weight FROM exercise_sets WHERE workout_id=$1',[mixedId])).rows[0].weight),82.5);
  await assert.rejects(commit(mixed,[{...sets[0],weight:-1}],true));
  assert.equal(Number((await db.query('SELECT weight FROM exercise_sets WHERE workout_id=$1',[mixedId])).rows[0].weight),82.5,'failed edits retain previous sets');
  assert.equal((await db.query('SELECT count(*)::int n FROM driver_logs')).rows[0].n,3,'editing never grants duplicate daily XP');
  await db.query('SELECT delete_fitness_workout($1)',[mixedId]);
  await db.query('DELETE FROM driver_logs WHERE evidence LIKE $1',[`[workout:${mixedId}]%`]);
  const template = (
    await db.query(
      "INSERT INTO fitness_templates(user_id,name,kind,slot) VALUES(auth.uid(),'Owned','gym','strength') RETURNING id",
    )
  ).rows[0].id;
  const plan = (
    await db.query(
      "INSERT INTO fitness_plans(user_id,name,kind) VALUES(auth.uid(),'Owned plan','skills') RETURNING id",
    )
  ).rows[0].id;
  await db.exec(`SET test.uid='22222222-2222-4222-8222-222222222222'`);
  for (const table of [
    "fitness_tasks",
    "fitness_templates",
    "fitness_plans",
    "workouts",
    "routine_logs",
  ])
    assert.equal(
      (await db.query(`SELECT count(*)::int n FROM ${table}`)).rows[0].n,
      0,
      `${table} hides the first user's records`,
    );
  assert.equal(
    (await db.query("UPDATE fitness_plans SET name='Stolen' WHERE id=$1 RETURNING id", [plan])).rows
      .length,
    0,
  );
  await assert.rejects(
    db.query(
      "INSERT INTO fitness_tasks(user_id,date,slot,title,source_key,template_id) VALUES(auth.uid(),'2026-10-25','strength','Cross user','cross',$1)",
      [template],
    ),
  );
  await assert.rejects(
    save(
      "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      { ...workout, details: { slot: "strength", related_workout_id: wid } },
      sets,
      null,
    ),
  );
  await assert.rejects(db.query("SELECT delete_fitness_workout($1)", [wid]));
  await db.exec(`RESET ROLE;`);
  assert.equal((await db.query("SELECT count(*)::int n FROM workouts")).rows[0].n, 2);
  await db.close();
});
