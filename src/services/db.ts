import { defaultDesign } from "../data/examDefaults"
import type {
  ExamMeta,
  PaperDesign,
  Question,
  QuestionImageSize,
  StudentGrade,
} from "../types/exam"
import type { BankDifficulty, BankQuestionType } from "../pages/BankPage"

export type UserAccount = {
  id: string
  name: string
  email: string
  branch: string
  passwordHash: string
  createdAt: string
}

export type StoredExam = {
  id: string
  userId: string
  status: "Taslak" | "Hazır" | "Yazdırıldı"
  updatedAt: string
  examMeta: ExamMeta
  questions: Question[]
  design: PaperDesign
  grades?: StudentGrade[]
}

export type StoredBankItem = {
  id: string
  userId: string
  topic: string
  type: BankQuestionType
  difficulty: BankDifficulty
  points: number
  prompt: string
  options?: string[]
  correctAnswer: string
  used: number
  source?: string
  lead?: string
  leadBold?: boolean
  leadColor?: string
  promptBold?: boolean
  promptColor?: string
  image?: string
  imageSize?: QuestionImageSize
  imageRawWidth?: number
  sourceFontPx?: number
  imageScale?: number
  optionLayout?: "inherit" | "grid" | "inline" | "list"
  solutionSpace?: "none" | "lines" | "box" | "grid"
  solutionHeight?: number
}

export type StoredCustomTemplate = {
  id: string
  userId?: string
  name: string
  category: "Yazılı" | "Test" | "Çalışma kâğıdı" | "Şablonlarım"
  description: string
  badge?: string
  accent?: string
  features: string[]
  design: PaperDesign
}

const USERS_KEY = "sinav-atolyesi-db-users"
const SESSION_KEY = "sinav-atolyesi-db-session"
const EXAMS_KEY = "sinav-atolyesi-db-exams"
const BANK_KEY = "sinav-atolyesi-db-bank"
const TEMPLATES_KEY = "sinav-atolyesi-sablonlarim"

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function syncToExactNativeSqlite(): void {
  if (typeof window === "undefined" || typeof window.postMessage !== "function") return
  try {
    const payload = {
      __sinavAtolyesiSync: true,
      users: readJson<UserAccount[]>(USERS_KEY, []),
      sessionUserId: localStorage.getItem(SESSION_KEY) ?? "",
      exams: readJson<StoredExam[]>(EXAMS_KEY, []),
      bank: readJson<StoredBankItem[]>(BANK_KEY, []),
      templates: readJson<StoredCustomTemplate[]>(TEMPLATES_KEY, []),
    }
    window.postMessage(JSON.stringify(payload), "*")
  } catch {
    // Ignore postMessage errors outside Exact host
  }
}

function writeJson<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value))
  syncToExactNativeSqlite()
}

export async function hashPassword(
  password: string,
  salt: string,
): Promise<string> {
  const input = `${salt}:${password}`
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const data = new TextEncoder().encode(input)
    const digest = await crypto.subtle.digest("SHA-256", data)
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  }
  let h1 = 0x811c9dc5
  for (let i = 0; i < input.length; i += 1) {
    h1 = Math.imul(h1 ^ input.charCodeAt(i), 0x01000193) >>> 0
  }
  return h1.toString(16).padStart(8, "0")
}

export function getCurrentUser(): UserAccount | null {
  const sessionId = localStorage.getItem(SESSION_KEY)
  if (!sessionId) return null
  const users = readJson<UserAccount[]>(USERS_KEY, [])
  return users.find((u) => u.id === sessionId) ?? null
}

export async function registerUser(input: {
  name: string
  email: string
  password: string
  branch: string
}): Promise<UserAccount> {
  const name = input.name.trim()
  const email = input.email.trim().toLowerCase()
  const branch = input.branch.trim() || "Öğretmen"
  if (!name || !email || input.password.length < 4) {
    throw new Error("Ad, geçerli e-posta ve en az 4 karakterli şifre girin.")
  }

  const users = readJson<UserAccount[]>(USERS_KEY, [])
  if (users.some((u) => u.email === email)) {
    throw new Error("Bu e-posta adresiyle kayıtlı bir hesap zaten var.")
  }

  const user: UserAccount = {
    id: crypto.randomUUID(),
    name,
    email,
    branch,
    passwordHash: await hashPassword(input.password, email),
    createdAt: new Date().toISOString(),
  }
  writeJson(USERS_KEY, [...users, user])
  localStorage.setItem(SESSION_KEY, user.id)
  syncToExactNativeSqlite()
  return user
}

export async function loginUser(input: {
  email: string
  password: string
}): Promise<UserAccount> {
  const email = input.email.trim().toLowerCase()
  const users = readJson<UserAccount[]>(USERS_KEY, [])
  const user = users.find((u) => u.email === email)
  if (!user) {
    throw new Error("E-posta veya şifre hatalı.")
  }
  const hash = await hashPassword(input.password, email)
  if (user.passwordHash !== hash) {
    throw new Error("E-posta veya şifre hatalı.")
  }
  localStorage.setItem(SESSION_KEY, user.id)
  syncToExactNativeSqlite()
  return user
}

export function logoutUser(): void {
  localStorage.removeItem(SESSION_KEY)
  syncToExactNativeSqlite()
}

export function listUserExams(userId: string): StoredExam[] {
  return readJson<StoredExam[]>(EXAMS_KEY, [])
    .filter((exam) => exam.userId === userId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function createEmptyExam(user: UserAccount): StoredExam {
  const today = new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date())

  const exam: StoredExam = {
    id: crypto.randomUUID(),
    userId: user.id,
    status: "Taslak",
    updatedAt: new Date().toISOString(),
    examMeta: {
      title: "Yeni Sınav",
      school: "",
      grade: "",
      subject: user.branch || "",
      topic: "",
      duration: 40,
      date: today,
      academicYear: "2025–2026",
      term: "1",
      examNo: "1",
      teacher: user.name,
      targetPoints: 100,
    },
    questions: [],
    design: { ...defaultDesign },
  }
  const all = readJson<StoredExam[]>(EXAMS_KEY, [])
  writeJson(EXAMS_KEY, [exam, ...all])
  return exam
}

export function saveUserExam(exam: StoredExam): void {
  const all = readJson<StoredExam[]>(EXAMS_KEY, [])
  const idx = all.findIndex((item) => item.id === exam.id)
  const updated: StoredExam = {
    ...exam,
    updatedAt: new Date().toISOString(),
  }
  if (idx >= 0) {
    all[idx] = updated
  } else {
    all.unshift(updated)
  }
  writeJson(EXAMS_KEY, all)
}

export function duplicateUserExam(userId: string, examId: string): StoredExam | null {
  const all = readJson<StoredExam[]>(EXAMS_KEY, [])
  const source = all.find((item) => item.id === examId && item.userId === userId)
  if (!source) return null
  const copy: StoredExam = {
    ...source,
    id: crypto.randomUUID(),
    status: "Taslak",
    updatedAt: new Date().toISOString(),
    examMeta: {
      ...source.examMeta,
      title: `${source.examMeta.title} (kopya)`,
    },
    questions: source.questions.map((q) => ({
      ...q,
      options: q.options ? [...q.options] : undefined,
    })),
    design: { ...source.design },
  }
  writeJson(EXAMS_KEY, [copy, ...all])
  return copy
}

export function deleteUserExam(userId: string, examId: string): void {
  const all = readJson<StoredExam[]>(EXAMS_KEY, [])
  writeJson(
    EXAMS_KEY,
    all.filter((item) => !(item.id === examId && item.userId === userId)),
  )
}

export function listUserBank(userId: string): StoredBankItem[] {
  return readJson<StoredBankItem[]>(BANK_KEY, []).filter(
    (item) => item.userId === userId,
  )
}

export function addBankItem(
  userId: string,
  item: Omit<StoredBankItem, "id" | "userId" | "used">,
): StoredBankItem {
  const created: StoredBankItem = {
    ...item,
    id: crypto.randomUUID(),
    userId,
    used: 0,
  }
  const all = readJson<StoredBankItem[]>(BANK_KEY, [])
  writeJson(BANK_KEY, [created, ...all])
  return created
}

export function deleteBankItem(userId: string, id: string): void {
  const all = readJson<StoredBankItem[]>(BANK_KEY, [])
  writeJson(
    BANK_KEY,
    all.filter((item) => !(item.id === id && item.userId === userId)),
  )
}

export function incrementBankUsage(
  userId: string,
  ids: string[],
): StoredBankItem[] {
  const all = readJson<StoredBankItem[]>(BANK_KEY, [])
  if (ids.length === 0) {
    return all.filter((item) => item.userId === userId)
  }
  const idSet = new Set(ids)
  const next = all.map((item) =>
    item.userId === userId && idSet.has(item.id)
      ? { ...item, used: (item.used ?? 0) + 1 }
      : item,
  )
  writeJson(BANK_KEY, next)
  return next.filter((item) => item.userId === userId)
}

export function listUserTemplates(userId: string): StoredCustomTemplate[] {
  return readJson<StoredCustomTemplate[]>(TEMPLATES_KEY, []).filter(
    (item) => !item.userId || item.userId === userId,
  )
}

export function saveUserTemplates(
  userId: string,
  items: StoredCustomTemplate[],
): void {
  const all = readJson<StoredCustomTemplate[]>(TEMPLATES_KEY, [])
  const others = userId
    ? all.filter((item) => item.userId && item.userId !== userId)
    : []
  const owned = items.map((item) => ({
    ...item,
    ...(userId ? { userId } : {}),
  }))
  writeJson(TEMPLATES_KEY, [...owned, ...others])
}

export function updateUserProfile(
  userId: string,
  input: { name: string; branch: string },
): UserAccount {
  const name = input.name.trim()
  const branch = input.branch.trim() || "Öğretmen"
  if (!name) {
    throw new Error("Ad soyad alanı boş bırakılamaz.")
  }
  const users = readJson<UserAccount[]>(USERS_KEY, [])
  const idx = users.findIndex((u) => u.id === userId)
  if (idx < 0) throw new Error("Kullanıcı hesabı bulunamadı.")
  const updated: UserAccount = { ...users[idx], name, branch }
  users[idx] = updated
  writeJson(USERS_KEY, users)
  return updated
}

export async function updateUserEmail(
  userId: string,
  input: { newEmail: string; currentPassword: string },
): Promise<UserAccount> {
  const newEmail = input.newEmail.trim().toLowerCase()
  if (!newEmail || !newEmail.includes("@")) {
    throw new Error("Geçerli bir e-posta adresi girin.")
  }
  const users = readJson<UserAccount[]>(USERS_KEY, [])
  const idx = users.findIndex((u) => u.id === userId)
  if (idx < 0) throw new Error("Kullanıcı hesabı bulunamadı.")
  const user = users[idx]
  const currentHash = await hashPassword(input.currentPassword, user.email)
  if (user.passwordHash !== currentHash) {
    throw new Error("Mevcut şifreniz hatalı.")
  }
  if (users.some((u) => u.id !== userId && u.email === newEmail)) {
    throw new Error("Bu e-posta adresi başka bir hesap tarafından kullanılıyor.")
  }
  // Re-hash password with the new email salt so future logins match
  const nextHash = await hashPassword(input.currentPassword, newEmail)
  const updated: UserAccount = {
    ...user,
    email: newEmail,
    passwordHash: nextHash,
  }
  users[idx] = updated
  writeJson(USERS_KEY, users)
  return updated
}

export async function updateUserPassword(
  userId: string,
  input: { currentPassword: string; newPassword: string },
): Promise<UserAccount> {
  if (input.newPassword.length < 4) {
    throw new Error("Yeni şifre en az 4 karakter olmalıdır.")
  }
  const users = readJson<UserAccount[]>(USERS_KEY, [])
  const idx = users.findIndex((u) => u.id === userId)
  if (idx < 0) throw new Error("Kullanıcı hesabı bulunamadı.")
  const user = users[idx]
  const currentHash = await hashPassword(input.currentPassword, user.email)
  if (user.passwordHash !== currentHash) {
    throw new Error("Mevcut şifreniz hatalı.")
  }
  const nextHash = await hashPassword(input.newPassword, user.email)
  const updated: UserAccount = { ...user, passwordHash: nextHash }
  users[idx] = updated
  writeJson(USERS_KEY, users)
  return updated
}

export async function deleteUserAccount(
  userId: string,
  password: string,
): Promise<void> {
  const users = readJson<UserAccount[]>(USERS_KEY, [])
  const user = users.find((u) => u.id === userId)
  if (!user) throw new Error("Kullanıcı hesabı bulunamadı.")
  const hash = await hashPassword(password, user.email)
  if (user.passwordHash !== hash) {
    throw new Error("Şifreniz hatalı; hesap silinemedi.")
  }
  writeJson(
    USERS_KEY,
    users.filter((u) => u.id !== userId),
  )
  const exams = readJson<StoredExam[]>(EXAMS_KEY, [])
  writeJson(
    EXAMS_KEY,
    exams.filter((exam) => exam.userId !== userId),
  )
  const bank = readJson<StoredBankItem[]>(BANK_KEY, [])
  writeJson(
    BANK_KEY,
    bank.filter((item) => item.userId !== userId),
  )
  const remainingUsers = users.filter((u) => u.id !== userId)
  const templates = readJson<StoredCustomTemplate[]>(TEMPLATES_KEY, [])
  writeJson(
    TEMPLATES_KEY,
    remainingUsers.length === 0
      ? []
      : templates.filter((item) => item.userId && item.userId !== userId),
  )
  localStorage.removeItem(SESSION_KEY)
  syncToExactNativeSqlite()
}
