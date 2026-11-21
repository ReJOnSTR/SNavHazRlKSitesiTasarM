import type { Answer, Database, Sources, SQLCommand, Storage } from './app.contract.d.ts';

const DB = 'app:/data/sinav.db';
export const grants = `sqlite.open ${DB}`;

async function initSchema(db: Database): Promise<void> {
  const questionCols = await db.query('PRAGMA table_info(questions)');
  const hasLeadCol = questionCols.rows.some((row) => String(row[1]) === 'lead');
  const examCols = await db.query('PRAGMA table_info(exams)');
  const hasSchoolCol = examCols.rows.some((row) => String(row[1]) === 'school');
  const templateTable = await db.query(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'custom_templates'",
  );
  const hasTemplatesTable = templateTable.rows.length > 0;

  if (
    (questionCols.rows.length > 0 && !hasLeadCol) ||
    (examCols.rows.length > 0 && !hasSchoolCol) ||
    !hasTemplatesTable
  ) {
    await db.execute('DROP TABLE IF EXISTS custom_templates');
    await db.execute('DROP TABLE IF EXISTS questions');
    await db.execute('DROP TABLE IF EXISTS exams');
    await db.execute('DROP TABLE IF EXISTS bank_questions');
    await db.execute('DROP TABLE IF EXISTS sessions');
    await db.execute('DROP TABLE IF EXISTS users');
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      branch TEXT NOT NULL DEFAULT 'Matematik',
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      user_id TEXT NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS exams (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      school TEXT NOT NULL DEFAULT '',
      grade TEXT NOT NULL DEFAULT '',
      subject TEXT NOT NULL DEFAULT '',
      topic TEXT NOT NULL DEFAULT '',
      duration INTEGER NOT NULL DEFAULT 40,
      exam_date TEXT NOT NULL DEFAULT '',
      academic_year TEXT NOT NULL DEFAULT '',
      term TEXT NOT NULL DEFAULT '1',
      exam_no TEXT NOT NULL DEFAULT '1',
      teacher TEXT NOT NULL DEFAULT '',
      target_points INTEGER,
      status TEXT NOT NULL DEFAULT 'Taslak',
      updated_at TEXT NOT NULL,
      meta_json TEXT NOT NULL DEFAULT '{}',
      design_json TEXT NOT NULL DEFAULT '{}'
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      exam_id TEXT NOT NULL,
      q_type TEXT NOT NULL DEFAULT 'classic',
      prompt TEXT NOT NULL,
      lead TEXT NOT NULL DEFAULT '',
      lead_bold INTEGER NOT NULL DEFAULT 0,
      lead_color TEXT NOT NULL DEFAULT '',
      prompt_bold INTEGER NOT NULL DEFAULT 0,
      prompt_color TEXT NOT NULL DEFAULT '',
      points INTEGER NOT NULL DEFAULT 10,
      difficulty TEXT NOT NULL DEFAULT 'Orta',
      source TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL DEFAULT '',
      formula TEXT NOT NULL DEFAULT '',
      variant TEXT NOT NULL DEFAULT '',
      options_json TEXT NOT NULL DEFAULT '[]',
      correct_answer TEXT NOT NULL DEFAULT '',
      image TEXT NOT NULL DEFAULT '',
      image_size TEXT NOT NULL DEFAULT '',
      image_raw_width INTEGER,
      source_font_px REAL,
      image_scale INTEGER,
      option_layout TEXT NOT NULL DEFAULT '',
      solution_space TEXT NOT NULL DEFAULT '',
      solution_height INTEGER,
      data_json TEXT NOT NULL DEFAULT '{}',
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS bank_questions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      topic TEXT NOT NULL DEFAULT '',
      q_type TEXT NOT NULL DEFAULT 'classic',
      difficulty TEXT NOT NULL DEFAULT 'Orta',
      points INTEGER NOT NULL DEFAULT 10,
      prompt TEXT NOT NULL,
      lead TEXT NOT NULL DEFAULT '',
      image TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT '',
      options_json TEXT NOT NULL DEFAULT '[]',
      correct_answer TEXT NOT NULL DEFAULT '',
      used INTEGER NOT NULL DEFAULT 0,
      data_json TEXT NOT NULL DEFAULT '{}'
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS custom_templates (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT '',
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Şablonlarım',
      description TEXT NOT NULL DEFAULT '',
      badge TEXT NOT NULL DEFAULT '',
      accent TEXT NOT NULL DEFAULT '',
      features_json TEXT NOT NULL DEFAULT '[]',
      design_json TEXT NOT NULL DEFAULT '{}'
    )
  `);
}

let dbQueue: Promise<unknown> = Promise.resolve();
let schemaReady = false;

function useDb<T>(
  storage: Storage,
  work: (db: Database) => Promise<T>,
): Promise<T> {
  const run = async () => {
    const db = await storage.sqlite.open(DB);
    try {
      if (!schemaReady) {
        await initSchema(db);
        schemaReady = true;
      }
      return await work(db);
    } finally {
      await db.close();
    }
  };
  const next = dbQueue.then(run, run);
  dbQueue = next.catch(() => undefined);
  return next;
}

type SyncUser = {
  id: string;
  name?: string;
  email?: string;
  branch?: string;
  passwordHash?: string;
  createdAt?: string;
};

type SyncQuestion = {
  id?: string | number;
  type?: string;
  prompt?: string;
  lead?: string;
  leadBold?: boolean;
  leadColor?: string;
  promptBold?: boolean;
  promptColor?: string;
  points?: number;
  difficulty?: string;
  source?: string;
  title?: string;
  formula?: string;
  variant?: string;
  options?: string[];
  correctAnswer?: string;
  image?: string;
  imageSize?: string;
  imageRawWidth?: number;
  sourceFontPx?: number;
  imageScale?: number;
  optionLayout?: string;
  solutionSpace?: string;
  solutionHeight?: number;
};

type SyncExam = {
  id: string;
  userId?: string;
  status?: string;
  updatedAt?: string;
  examMeta?: {
    title?: string;
    school?: string;
    grade?: string;
    subject?: string;
    topic?: string;
    duration?: number;
    date?: string;
    academicYear?: string;
    term?: string;
    examNo?: string;
    teacher?: string;
    targetPoints?: number;
  };
  questions?: SyncQuestion[];
  design?: Record<string, unknown>;
};

type SyncBankItem = {
  id: string;
  userId?: string;
  topic?: string;
  type?: string;
  difficulty?: string;
  points?: number;
  prompt?: string;
  lead?: string;
  image?: string;
  source?: string;
  options?: string[];
  correctAnswer?: string;
  used?: number;
};

type SyncCustomTemplate = {
  id: string;
  userId?: string;
  name?: string;
  category?: string;
  description?: string;
  badge?: string;
  accent?: string;
  features?: string[];
  design?: Record<string, unknown>;
};

type SyncPayload = {
  __sinavAtolyesiSync?: boolean;
  users?: SyncUser[];
  sessionUserId?: string;
  exams?: SyncExam[];
  bank?: SyncBankItem[];
  templates?: SyncCustomTemplate[];
};

const optNum = (val: unknown): number | null =>
  typeof val === 'number' && Number.isFinite(val) ? val : null;

const sources: Sources = {
  initDb: (_args, _store, storage) =>
    useDb(storage, async () => ({ ok: true, error: '' })),

  syncFromWeb: ([payload], _store, storage) =>
    useDb(storage, async (db) => {
      let data: SyncPayload;
      try {
        data = JSON.parse(String(payload)) as SyncPayload;
      } catch {
        return { ok: true, error: '' };
      }
      if (!data || !data.__sinavAtolyesiSync) {
        return { ok: true, error: '' };
      }

      const users = Array.isArray(data.users) ? data.users : [];
      const exams = Array.isArray(data.exams) ? data.exams : [];
      const bank = Array.isArray(data.bank) ? data.bank : [];
      const templates = Array.isArray(data.templates) ? data.templates : [];
      const sessionUserId = String(data.sessionUserId ?? '').trim();

      const commands: SQLCommand[] = [
        { sql: 'DELETE FROM custom_templates' },
        { sql: 'DELETE FROM questions' },
        { sql: 'DELETE FROM exams' },
        { sql: 'DELETE FROM bank_questions' },
        { sql: 'DELETE FROM sessions' },
        { sql: 'DELETE FROM users' },
      ];

      for (const u of users) {
        commands.push({
          sql: 'INSERT INTO users (id, name, email, branch, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          params: [
            String(u.id),
            String(u.name ?? ''),
            String(u.email ?? ''),
            String(u.branch ?? 'Öğretmen'),
            String(u.passwordHash ?? ''),
            String(u.createdAt ?? ''),
          ],
        });
      }

      if (sessionUserId) {
        commands.push({
          sql: 'INSERT OR REPLACE INTO sessions (id, user_id) VALUES (1, ?)',
          params: [sessionUserId],
        });
      }

      for (const exam of exams) {
        const examId = String(exam.id);
        const meta = exam.examMeta ?? {};
        commands.push({
          sql: `
            INSERT INTO exams (
              id, user_id, title, school, grade, subject, topic, duration,
              exam_date, academic_year, term, exam_no, teacher, target_points,
              status, updated_at, meta_json, design_json
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          params: [
            examId,
            String(exam.userId ?? ''),
            String(meta.title ?? 'Yeni Sınav'),
            String(meta.school ?? ''),
            String(meta.grade ?? ''),
            String(meta.subject ?? ''),
            String(meta.topic ?? ''),
            Number(meta.duration ?? 40),
            String(meta.date ?? ''),
            String(meta.academicYear ?? ''),
            String(meta.term ?? '1'),
            String(meta.examNo ?? '1'),
            String(meta.teacher ?? ''),
            optNum(meta.targetPoints),
            String(exam.status ?? 'Taslak'),
            String(exam.updatedAt ?? ''),
            JSON.stringify(meta),
            JSON.stringify(exam.design ?? {}),
          ],
        });

        const qs = Array.isArray(exam.questions) ? exam.questions : [];
        for (let i = 0; i < qs.length; i += 1) {
          const q = qs[i];
          const qId = `${examId}:${String(q.id ?? i)}:${i}`;
          commands.push({
            sql: `
              INSERT INTO questions (
                id, exam_id, q_type, prompt, lead, lead_bold, lead_color,
                prompt_bold, prompt_color, points, difficulty, source, title,
                formula, variant, options_json, correct_answer, image,
                image_size, image_raw_width, source_font_px, image_scale,
                option_layout, solution_space, solution_height, data_json, sort_order
              )
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            params: [
              qId,
              examId,
              String(q.type ?? 'classic'),
              String(q.prompt ?? ''),
              String(q.lead ?? ''),
              q.leadBold ? 1 : 0,
              String(q.leadColor ?? ''),
              q.promptBold === false ? 0 : 1,
              String(q.promptColor ?? ''),
              Number(q.points ?? 10),
              String(q.difficulty ?? 'Orta'),
              String(q.source ?? ''),
              String(q.title ?? ''),
              String(q.formula ?? ''),
              String(q.variant ?? ''),
              JSON.stringify(Array.isArray(q.options) ? q.options : []),
              String(q.correctAnswer ?? ''),
              String(q.image ?? ''),
              String(q.imageSize ?? ''),
              optNum(q.imageRawWidth),
              optNum(q.sourceFontPx),
              optNum(q.imageScale),
              String(q.optionLayout ?? ''),
              String(q.solutionSpace ?? ''),
              optNum(q.solutionHeight),
              JSON.stringify(q),
              i,
            ],
          });
        }
      }

      for (const b of bank) {
        commands.push({
          sql: `
            INSERT INTO bank_questions (
              id, user_id, topic, q_type, difficulty, points, prompt,
              lead, image, source, options_json, correct_answer, used, data_json
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          params: [
            String(b.id),
            String(b.userId ?? ''),
            String(b.topic ?? ''),
            String(b.type ?? 'classic'),
            String(b.difficulty ?? 'Orta'),
            Number(b.points ?? 10),
            String(b.prompt ?? ''),
            String(b.lead ?? ''),
            String(b.image ?? ''),
            String(b.source ?? ''),
            JSON.stringify(Array.isArray(b.options) ? b.options : []),
            String(b.correctAnswer ?? ''),
            Number(b.used ?? 0),
            JSON.stringify(b),
          ],
        });
      }

      for (const tpl of templates) {
        commands.push({
          sql: `
            INSERT INTO custom_templates (
              id, user_id, name, category, description, badge, accent,
              features_json, design_json
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          params: [
            String(tpl.id),
            String(tpl.userId ?? sessionUserId ?? ''),
            String(tpl.name ?? 'Adsız şablon'),
            String(tpl.category ?? 'Şablonlarım'),
            String(tpl.description ?? ''),
            String(tpl.badge ?? ''),
            String(tpl.accent ?? ''),
            JSON.stringify(Array.isArray(tpl.features) ? tpl.features : []),
            JSON.stringify(tpl.design ?? {}),
          ],
        });
      }

      try {
        await db.transaction(commands);
        return { ok: true, error: '' };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : 'SQLite sync failed',
        };
      }
    }),
};

export const answer: Answer = (source, args, store, storage, native) =>
  sources[source](args, store, storage, native);
