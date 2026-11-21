import {
  BookOpen,
  BookOpenText,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileCode2,
  FileText,
  FileType2,
  House,
  LayoutTemplate,
  LoaderCircle,
  LogOut,
  Menu,
  Moon,
  MoreHorizontal,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRight,
  Plus,
  Printer,
  Redo2,
  ScanLine,
  Settings,
  Settings2,
  Sun,
  Undo2,
  UploadCloud,
  Users,
  X,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import AuthView from "./components/AuthView"
import ExamPaper from "./components/ExamPaper"
import GradingModal from "./components/GradingModal"
import HomeView from "./components/HomeView"
import SettingsPage from "./pages/SettingsPage"
import {
  ContentInspector,
  DesignInspector,
  ExamInspector,
  QuestionInspector,
} from "./components/Inspectors"
import PdfImportModal from "./components/PdfImportModal"
import TypeIcon from "./components/TypeIcon"
import {
  PAGE_HEIGHT,
  PAGE_WIDTH,
  contentDescriptions,
  contentKinds,
  createQuestion,
  defaultDesign,
  emptyExamMeta,
  isContentType,
  questionKinds,
  questionTypeLabels,
} from "./data/examDefaults"
import BankPage, { type BankDifficulty, type BankQuestion, type BankQuestionType } from "./pages/BankPage"
import ExamsPage from "./pages/ExamsPage"
import TemplatesPage from "./pages/TemplatesPage"
import {
  addBankItem,
  createEmptyExam,
  deleteBankItem,
  deleteUserExam,
  duplicateUserExam,
  getCurrentUser,
  incrementBankUsage,
  listUserBank,
  listUserExams,
  logoutUser,
  saveUserExam,
  syncToExactNativeSqlite,
  type StoredBankItem,
  type StoredExam,
  type UserAccount,
} from "./services/db"
import type {
  AppView,
  DetectedPdfQuestion,
  ExamMeta,
  ExamSnapshot,
  InspectorTab,
  MobileTab,
  PaperDesign,
  PdfStep,
  Question,
  QuestionType,
  SavedPdfEntry,
  StudentGrade,
} from "./types/exam"
import {
  exportExamDocx,
  exportExamJson,
  parseExamJson,
  sanitizeFileName,
  shuffleBookletQuestions,
} from "./utils/examUtils"

function AppLogo() {
  return (
    <div className="brand-mark" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  )
}

function ArrowRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M6 3.5L10.5 8L6 12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function cloneSnapshot(snapshot: ExamSnapshot): ExamSnapshot {
  return {
    examMeta: { ...snapshot.examMeta },
    questions: snapshot.questions.map((q) => ({
      ...q,
      options: q.options ? [...q.options] : undefined,
    })),
    design: { ...snapshot.design },
  }
}

export default function App() {
  const [user, setUser] = useState<UserAccount | null>(() => getCurrentUser())
  const [exams, setExams] = useState<StoredExam[]>(() =>
    user ? listUserExams(user.id) : [],
  )
  const [bankItems, setBankItems] = useState<StoredBankItem[]>(() =>
    user ? listUserBank(user.id) : [],
  )
  const [activeExamId, setActiveExamId] = useState<string | null>(null)

  const [examMeta, setExamMeta] = useState<ExamMeta>(emptyExamMeta)
  const [questions, setQuestions] = useState<Question[]>([])
  const [design, setDesign] = useState<PaperDesign>(defaultDesign)

  // Undo / Redo history stacks
  const [past, setPast] = useState<ExamSnapshot[]>([])
  const [future, setFuture] = useState<ExamSnapshot[]>([])

  const pushHistory = useCallback(
    (snapshot: ExamSnapshot) => {
      setPast((prev) => [...prev.slice(-29), cloneSnapshot(snapshot)])
      setFuture([])
    },
    [],
  )

  const commitState = useCallback(
    (next: {
      examMeta?: ExamMeta
      questions?: Question[]
      design?: PaperDesign
    }) => {
      pushHistory({ examMeta, questions, design })
      if (next.examMeta) setExamMeta(next.examMeta)
      if (next.questions) setQuestions(next.questions)
      if (next.design) setDesign(next.design)
    },
    [design, examMeta, pushHistory, questions],
  )

  const [selectedQuestionId, setSelectedQuestionId] = useState<number | null>(null)
  const [grades, setGrades] = useState<StudentGrade[]>([])
  const [gradingOpen, setGradingOpen] = useState(false)
  const [dualBookletPayload, setDualBookletPayload] = useState<{
    questionsA: Question[]
    questionsB: Question[]
  } | null>(null)
  const dualExportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (user) {
      syncToExactNativeSqlite()
    }
  }, [user])

  useEffect(() => {
    if (!user) return
    if (!activeExamId) {
      const hasDraftContent =
        questions.length > 0 ||
        examMeta.title.trim() !== "" ||
        examMeta.subject.trim() !== "" ||
        examMeta.school.trim() !== ""
      if (!hasDraftContent) return
      const created = createEmptyExam(user)
      const draftExam: StoredExam = {
        ...created,
        examMeta: {
          ...created.examMeta,
          ...examMeta,
          title: examMeta.title.trim() || created.examMeta.title,
          teacher: examMeta.teacher.trim() || created.examMeta.teacher,
        },
        questions,
        design,
        grades,
        updatedAt: new Date().toISOString(),
      }
      saveUserExam(draftExam)
      setActiveExamId(draftExam.id)
      setExams((prev) => [
        draftExam,
        ...prev.filter((item) => item.id !== draftExam.id),
      ])
      return
    }
    const currentExam = exams.find((item) => item.id === activeExamId)
    if (!currentExam) return
    const updated: StoredExam = {
      ...currentExam,
      examMeta,
      questions,
      design,
      grades,
      updatedAt: new Date().toISOString(),
    }
    saveUserExam(updated)
    setExams((prev) =>
      prev.map((item) => (item.id === activeExamId ? updated : item)),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examMeta, questions, design, grades])

  const handleAuth = (loggedUser: UserAccount) => {
    setUser(loggedUser)
    setExams(listUserExams(loggedUser.id))
    setBankItems(listUserBank(loggedUser.id))
    setActiveExamId(null)
    setView("home")
  }

  const handleLogout = () => {
    logoutUser()
    setUser(null)
    setExams([])
    setBankItems([])
    setActiveExamId(null)
    setQuestions([])
    setExamMeta(emptyExamMeta)
    setProfileMenuOpen(false)
  }

  const startNewExam = () => {
    if (!user) return
    const created = createEmptyExam(user)
    setExams((prev) => [created, ...prev])
    setActiveExamId(created.id)
    setExamMeta(created.examMeta)
    setQuestions(created.questions)
    setDesign(created.design)
    setGrades(created.grades ?? [])
    setPast([])
    setFuture([])
    setSelectedQuestionId(null)
    setView("editor")
    setMobileSidebarOpen(false)
    setToast("Yeni boş sınav oluşturuldu")
  }

  const openExamById = (id: string) => {
    const found = exams.find((item) => item.id === id)
    if (!found) return
    setActiveExamId(found.id)
    setExamMeta(found.examMeta)
    setQuestions(found.questions)
    setDesign(found.design)
    setGrades(found.grades ?? [])
    setPast([])
    setFuture([])
    setSelectedQuestionId(null)
    setView("editor")
    setMobileSidebarOpen(false)
  }

  const handleDuplicateExam = (id: string) => {
    if (!user) return
    const copy = duplicateUserExam(user.id, id)
    if (!copy) return
    setExams((prev) => [copy, ...prev])
    setToast("Sınav kopyalandı")
  }

  const handleDeleteExam = (id: string) => {
    if (!user) return
    deleteUserExam(user.id, id)
    setExams((prev) => prev.filter((item) => item.id !== id))
    if (activeExamId === id) {
      setActiveExamId(null)
      setQuestions([])
      setExamMeta(emptyExamMeta)
    }
    setToast("Sınav silindi")
  }

  const handleCreateBankItem = (
    item: Omit<StoredBankItem, "id" | "userId" | "used">,
  ) => {
    if (!user) return
    const created = addBankItem(user.id, item)
    setBankItems((prev) => [created, ...prev])
    setToast("Soru bankasına kaydedildi")
  }

  const handleDeleteBankItem = (id: string) => {
    if (!user) return
    deleteBankItem(user.id, id)
    setBankItems((prev) => prev.filter((item) => item.id !== id))
    setToast("Soru bankasından silindi")
  }
  const [showAnswerKey, setShowAnswerKey] = useState(false)
  const [showOpticalForm, setShowOpticalForm] = useState(false)
  const [view, setView] = useState<AppView>("home")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 1260,
  )
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("info")
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("sinav-atolyesi-tema")
    if (saved === "light" || saved === "dark") return saved
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light"
  })

  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const exportMenuRef = useRef<HTMLDivElement>(null)
  const jsonInputRef = useRef<HTMLInputElement>(null)

  const [previewOpen, setPreviewOpen] = useState(false)
  const [inspectorOpen, setInspectorOpen] = useState(false)
  const [mobileTab, setMobileTab] = useState<MobileTab>("paper")
  const [toast, setToast] = useState("")

  const [pdfStep, setPdfStep] = useState<PdfStep>("closed")
  const [pdfLibrary, setPdfLibrary] = useState<SavedPdfEntry[]>([])
  const [activePdfId, setActivePdfId] = useState<string | null>(null)
  const [pdfError, setPdfError] = useState("")
  const [pdfExporting, setPdfExporting] = useState(false)
  const [pdfProgress, setPdfProgress] = useState("")
  const closeModalRef = useRef<HTMLButtonElement>(null)

  const notify = useCallback((message: string) => setToast(message), [])

  const handleUndo = useCallback(() => {
    if (past.length === 0) return
    const previous = past[past.length - 1]
    setFuture((prev) => [cloneSnapshot({ examMeta, questions, design }), ...prev])
    setPast((prev) => prev.slice(0, -1))
    setExamMeta(previous.examMeta)
    setQuestions(previous.questions)
    setDesign(previous.design)
    notify("Değişiklik geri alındı")
  }, [design, examMeta, notify, past, questions])

  const handleRedo = useCallback(() => {
    if (future.length === 0) return
    const next = future[0]
    setPast((prev) => [...prev, cloneSnapshot({ examMeta, questions, design })])
    setFuture((prev) => prev.slice(1))
    setExamMeta(next.examMeta)
    setQuestions(next.questions)
    setDesign(next.design)
    notify("Değişiklik yinelendi")
  }, [design, examMeta, future, notify, questions])

  useEffect(() => {
    if (!profileMenuOpen) return
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent) {
        if (event.key === "Escape") setProfileMenuOpen(false)
        return
      }
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setProfileMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", close)
    document.addEventListener("keydown", close)
    return () => {
      document.removeEventListener("mousedown", close)
      document.removeEventListener("keydown", close)
    }
  }, [profileMenuOpen])

  useEffect(() => {
    if (!exportMenuOpen) return
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent) {
        if (event.key === "Escape") setExportMenuOpen(false)
        return
      }
      if (!exportMenuRef.current?.contains(event.target as Node)) {
        setExportMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", close)
    document.addEventListener("keydown", close)
    return () => {
      document.removeEventListener("mousedown", close)
      document.removeEventListener("keydown", close)
    }
  }, [exportMenuOpen])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem("sinav-atolyesi-tema", theme)
  }, [theme])

  const selectedQuestion = questions.find(
    (question) => question.id === selectedQuestionId,
  )
  const totalPoints = useMemo(
    () =>
      questions.reduce(
        (total, question) =>
          isContentType(question.type) ? total : total + question.points,
        0,
      ),
    [questions],
  )
  const scoredCount = useMemo(
    () => questions.filter((q) => !isContentType(q.type)).length,
    [questions],
  )

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(""), 2800)
    return () => window.clearTimeout(timeout)
  }, [toast])

  useEffect(() => {
    if (pdfStep === "closed") return
    closeModalRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePdfModal()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [pdfStep])

  const nextId = () =>
    Math.max(0, ...questions.map((question) => question.id)) + 1

  const getOutputStack = () =>
    (previewOpen
      ? document.querySelector(".preview-scroll .paper-stack")
      : document.querySelector(
          ".paper-scroll .paper-stack",
        )) as HTMLElement | null

  const handlePrint = () => {
    const stack = getOutputStack()
    if (!stack) {
      notify("Yazdırılacak sınav sayfası bulunamadı")
      return
    }

    document.querySelector(".print-host")?.remove()
    const host = document.createElement("div")
    host.className = "print-host"
    const cleanStack = stack.cloneNode(true) as HTMLElement
    cleanStack.classList.add("print-target")
    cleanStack.style.zoom = "1"
    cleanStack
      .querySelectorAll(".question-actions")
      .forEach((item) => item.remove())
    cleanStack.querySelectorAll(".paper-question.selected").forEach((item) => {
      item.classList.remove("selected")
      item.removeAttribute("role")
      item.removeAttribute("tabindex")
    })
    host.append(cleanStack)
    document.body.append(host)
    document.body.classList.add("printing-paper")

    const cleanup = () => {
      host.remove()
      document.body.classList.remove("printing-paper")
      window.removeEventListener("afterprint", cleanup)
    }
    window.addEventListener("afterprint", cleanup)
    window.print()
    window.setTimeout(cleanup, 1500)
  }

  const exportPagesToPdf = async (
    pages: HTMLElement[],
    stack: HTMLElement,
    fileSuffix = "",
    successMessage = "PDF indirildi",
  ) => {
    if (pdfExporting) return
    if (pages.length === 0) {
      notify("PDF'e aktarılacak sayfa bulunamadı")
      return
    }

    setPdfExporting(true)
    setPdfProgress(`0 / ${pages.length}`)
    stack.classList.add("pdf-exporting")
    try {
      await document.fonts?.ready
      await Promise.all(
        pages.flatMap((page) =>
          Array.from(page.querySelectorAll("img")).map((image) =>
            image.complete
              ? Promise.resolve()
              : image.decode().catch(() => undefined),
          ),
        ),
      )

      const [{ toPng }, { jsPDF }] = await Promise.all([
        import("html-to-image"),
        import("jspdf"),
      ])
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      })

      for (let index = 0; index < pages.length; index += 1) {
        setPdfProgress(`${index + 1} / ${pages.length}`)
        if (index > 0) pdf.addPage("a4", "portrait")
        const dataUrl = await toPng(pages[index], {
          width: PAGE_WIDTH,
          height: PAGE_HEIGHT,
          pixelRatio: 2,
          backgroundColor: "#ffffff",
          cacheBust: true,
          style: {
            boxShadow: "none",
            margin: "0",
          },
          filter: (node) =>
            !(node instanceof Element) ||
            !node.classList.contains("question-actions"),
        })
        pdf.addImage(dataUrl, "PNG", 0, 0, 210, 297, undefined, "FAST")
      }

      const safeName = sanitizeFileName(examMeta.title)
      pdf.save(`${safeName}${fileSuffix}.pdf`)
      notify(successMessage)
    } catch (error) {
      console.error("PDF export failed", error)
      notify("PDF oluşturulamadı. Lütfen yeniden deneyin.")
    } finally {
      stack.classList.remove("pdf-exporting")
      setPdfExporting(false)
      setPdfProgress("")
    }
  }

  const handleDownloadPdf = async () => {
    const stack = getOutputStack()
    const pages = stack
      ? Array.from(stack.querySelectorAll<HTMLElement>("article.exam-paper"))
      : []
    await exportPagesToPdf(pages, stack as HTMLElement)
  }

  const handleDownloadAnswerKeyPdf = async () => {
    const stack = getOutputStack()
    const pages = stack
      ? Array.from(
          stack.querySelectorAll<HTMLElement>("article.answer-key-paper"),
        )
      : []
    if (!stack || pages.length === 0) {
      notify("Cevap anahtarı sayfası görünür değil")
      return
    }
    await exportPagesToPdf(
      pages,
      stack,
      "-cevap-anahtari",
      "Cevap anahtarı PDF olarak indirildi",
    )
  }

  const handleDownloadDualBookletPdf = async () => {
    if (pdfExporting) return
    if (questions.length === 0) {
      notify("Önce sınava soru ekleyin")
      return
    }
    const questionsA = questions
    const questionsB = shuffleBookletQuestions(questions, true)
    setDualBookletPayload({ questionsA, questionsB })
    try {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() => window.setTimeout(resolve, 160)),
        ),
      )
      const stage = dualExportRef.current
      if (!stage) {
        notify("Kitapçık önizlemesi hazırlanamadı")
        return
      }
      const pages = Array.from(
        stage.querySelectorAll<HTMLElement>(
          "article.exam-paper, article.answer-key-paper",
        ),
      )
      await exportPagesToPdf(
        pages,
        stage,
        "-A-B-kitapcik",
        "A ve B kitapçıkları PDF olarak indirildi",
      )
    } finally {
      setDualBookletPayload(null)
    }
  }

  const handleDownloadDocx = async () => {
    try {
      await exportExamDocx(examMeta, questions, showAnswerKey)
      notify("Word (.docx) dosyası indirildi")
    } catch (error) {
      console.error("DOCX export failed", error)
      notify("Word dosyası oluşturulamadı")
    }
  }

  const handleImportJsonFile = async (file?: File) => {
    if (!file) return
    try {
      const text = await file.text()
      const snapshot = parseExamJson(text)
      commitState(snapshot)
      setSelectedQuestionId(null)
      notify("Sınav yedeği içe aktarıldı")
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "JSON dosyası okunamadı",
      )
    }
  }

  const addQuestion = (type: QuestionType) => {
    const question = createQuestion(type, nextId())
    commitState({ questions: [...questions, question] })
    setSelectedQuestionId(question.id)
    setInspectorOpen(true)
    setMobileTab("paper")
    notify(
      isContentType(type)
        ? `${questionTypeLabels[type]} bloğu eklendi`
        : `${questionTypeLabels[type]} sorusu eklendi`,
    )
  }

  const updateQuestion = (updates: Partial<Question>) => {
    if (selectedQuestionId === null) return
    setQuestions((current) =>
      current.map((question) =>
        question.id === selectedQuestionId
          ? { ...question, ...updates }
          : question,
      ),
    )
  }

  const updateOption = (index: number, value: string) => {
    if (!selectedQuestion?.options) return
    const options = [...selectedQuestion.options]
    options[index] = value
    updateQuestion({ options })
  }

  const removeQuestion = (id: number) => {
    const currentIndex = questions.findIndex((question) => question.id === id)
    const remaining = questions.filter((question) => question.id !== id)
    commitState({ questions: remaining })
    if (selectedQuestionId === id) {
      const replacement =
        remaining[Math.min(currentIndex, remaining.length - 1)] ?? null
      setSelectedQuestionId(replacement?.id ?? null)
    }
    notify("Soru sınavdan kaldırıldı")
  }

  const duplicateQuestion = (id: number) => {
    const source = questions.find((question) => question.id === id)
    if (!source) return
    const copy = {
      ...source,
      id: nextId(),
      options: source.options ? [...source.options] : undefined,
    }
    const sourceIndex = questions.findIndex((question) => question.id === id)
    const updated = [...questions]
    updated.splice(sourceIndex + 1, 0, copy)
    commitState({ questions: updated })
    setSelectedQuestionId(copy.id)
    notify("Soru çoğaltıldı")
  }

  const moveQuestion = (id: number, direction: -1 | 1) => {
    const index = questions.findIndex((question) => question.id === id)
    const target = index + direction
    if (target < 0 || target >= questions.length) return
    const updated = [...questions]
    ;[updated[index], updated[target]] = [updated[target], updated[index]]
    commitState({ questions: updated })
  }

  const reorderQuestion = (fromId: number, toId: number) => {
    const fromIndex = questions.findIndex((q) => q.id === fromId)
    const toIndex = questions.findIndex((q) => q.id === toId)
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return
    const updated = [...questions]
    const [moved] = updated.splice(fromIndex, 1)
    updated.splice(toIndex, 0, moved)
    commitState({ questions: updated })
    notify("Soru sırası güncellendi")
  }

  const handleShuffleBooklet = (
    nextBooklet: "A" | "B",
    shuffleOptions: boolean,
  ) => {
    const shuffled = shuffleBookletQuestions(questions, shuffleOptions)
    commitState({
      questions: shuffled,
      design: { ...design, booklet: nextBooklet },
    })
    notify(`${nextBooklet} kitapçığı için sorular karıştırıldı`)
  }

  const closePdfModal = () => {
    setPdfStep("closed")
    setPdfError("")
  }

  const handlePdfFiles = (files?: FileList | File[] | null) => {
    if (!files || files.length === 0) return
    const incoming = Array.from(files)
    const valid: SavedPdfEntry[] = []

    for (const file of incoming) {
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        setPdfError("Lütfen yalnızca PDF formatında dosyalar seçin.")
        continue
      }
      if (file.size > 25 * 1024 * 1024) {
        setPdfError("Her bir PDF dosyası en fazla 25 MB olabilir.")
        continue
      }
      valid.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: file.name,
        file,
      })
    }

    if (valid.length === 0) return
    setPdfError("")
    setPdfLibrary((prev) => {
      const existingKeys = new Set(prev.map((item) => `${item.name}-${item.file.size}`))
      const fresh = valid.filter((item) => !existingKeys.has(`${item.name}-${item.file.size}`))
      const next = [...prev, ...fresh]
      const target = fresh[0] ?? prev.find((item) => `${item.name}-${item.file.size}` === `${valid[0].name}-${valid[0].file.size}`) ?? next[0]
      if (target) setActivePdfId(target.id)
      return next
    })
    setPdfStep("crop")
  }

  const handleRemoveSavedPdf = (id: string) => {
    setPdfLibrary((prev) => {
      const next = prev.filter((item) => item.id !== id)
      if (next.length === 0) {
        setActivePdfId(null)
        setPdfStep("upload")
      } else if (activePdfId === id) {
        setActivePdfId(next[0].id)
      }
      return next
    })
  }

  const handlePdfPageChange = (pdfId: string, page: number) => {
    setPdfLibrary((prev) =>
      prev.map((item) =>
        item.id === pdfId ? { ...item, lastPage: page } : item,
      ),
    )
  }

  const importCroppedPdfQuestions = (items: DetectedPdfQuestion[]) => {
    if (items.length === 0) return
    let id = nextId()
    const imported = items.map((item) => ({
      ...item,
      options: item.options ? [...item.options] : undefined,
      id: id++,
    }))
    commitState({ questions: [...questions, ...imported] })
    if (imported[0]) setSelectedQuestionId(imported[0].id)
    closePdfModal()
    notify(`${imported.length} görsel soru PDF'den sınava eklendi`)
  }

  const openQuestion = (id: number) => {
    setSelectedQuestionId(id)
    setInspectorOpen(true)
  }

  const selectExam = () => {
    setSelectedQuestionId(null)
    setInspectorTab("info")
    setInspectorOpen(true)
  }

  const openDesign = () => {
    setSelectedQuestionId(null)
    setInspectorTab("design")
    setInspectorOpen(true)
    setMobileTab("settings")
  }

  const goTo = (next: AppView, message?: string) => {
    setView(next)
    setMobileSidebarOpen(false)
    if (message) notify(message)
  }

  const addBankQuestions = (items: BankQuestion[]) => {
    let id = nextId()
    const added: Question[] = items.map(({ bankId: _bankId, ...item }) => ({
      ...item,
      options: item.options ? [...item.options] : undefined,
      id: id++,
    }))
    const bankIds = items
      .map((item) => item.bankId)
      .filter((itemId): itemId is string => Boolean(itemId))
    if (user && bankIds.length > 0) {
      setBankItems(incrementBankUsage(user.id, bankIds))
    }
    commitState({ questions: [...questions, ...added] })
    setSelectedQuestionId(added[0]?.id ?? null)
    goTo("editor", `${added.length} soru sınava eklendi`)
  }

  const openPdfInEditor = () => {
    goTo("editor")
    setPdfStep(pdfLibrary.length > 0 ? "crop" : "upload")
  }

  const [sidebarClosing, setSidebarClosing] = useState(false)
  const collapseTimer = useRef<number | undefined>(undefined)
  const collapsedRef = useRef(sidebarCollapsed)
  collapsedRef.current = sidebarCollapsed
  const toggleDesktopSidebar = () => {
    window.clearTimeout(collapseTimer.current)
    if (collapsedRef.current) {
      setSidebarClosing(false)
      setSidebarCollapsed(false)
      return
    }
    setSidebarClosing(true)
    collapseTimer.current = window.setTimeout(() => {
      setSidebarCollapsed(true)
      setSidebarClosing(false)
    }, 80)
  }

  const toggleSidebar = () => {
    if (mobileSidebarOpen) setMobileSidebarOpen(false)
    else toggleDesktopSidebar()
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const mod = event.ctrlKey || event.metaKey
      if (!mod) return
      const key = event.key.toLowerCase()
      if (key === "b") {
        event.preventDefault()
        toggleDesktopSidebar()
      } else if (key === "z" && view === "editor") {
        const target = event.target as HTMLElement | null
        if (
          target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable)
        ) {
          return
        }
        event.preventDefault()
        if (event.shiftKey) handleRedo()
        else handleUndo()
      } else if (key === "y" && view === "editor") {
        event.preventDefault()
        handleRedo()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [handleRedo, handleUndo, view])

  const targetPoints = examMeta.targetPoints ?? 100

  if (!user) {
    return <AuthView onAuth={handleAuth} />
  }

  const userInitials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toLocaleUpperCase("tr"))
    .join("")

  return (
    <div
      className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""} ${
        sidebarClosing ? "sidebar-closing" : ""
      } ${mobileSidebarOpen ? "sidebar-mobile-open" : ""}`}
    >
      <aside className="main-sidebar" aria-label="Kenar menü">
        <div className="brand">
          <AppLogo />
          <div className="brand-name">
            <strong>Sınav</strong>
            <span>Atölyesi</span>
          </div>
        </div>

        <button
          className="new-exam-button"
          type="button"
          title="Yeni sınav"
          onClick={startNewExam}
        >
          <Plus size={18} />
          <span>Yeni sınav</span>
        </button>

        <nav className="primary-nav" aria-label="Ana navigasyon">
          <button
            className={`nav-item ${view === "home" ? "active" : ""}`}
            type="button"
            title="Ana sayfa"
            onClick={() => goTo("home")}
          >
            <House size={19} />
            <span>Ana sayfa</span>
          </button>
          <button
            className={`nav-item ${
              view === "exams" || view === "editor" ? "active" : ""
            }`}
            type="button"
            title="Sınavlarım"
            onClick={() => goTo("exams")}
          >
            <FileText size={19} />
            <span>Sınavlarım</span>
          </button>
          <button
            className={`nav-item ${view === "bank" ? "active" : ""}`}
            type="button"
            title="Soru bankası"
            onClick={() => goTo("bank")}
          >
            <BookOpen size={19} />
            <span>Soru bankası</span>
          </button>
          <button
            className={`nav-item ${view === "templates" ? "active" : ""}`}
            type="button"
            title="Şablonlar"
            onClick={() => goTo("templates")}
          >
            <LayoutTemplate size={19} />
            <span>Şablonlar</span>
          </button>
        </nav>

        <div className="sidebar-bottom">
          <button
            className="nav-item sidebar-toggle"
            type="button"
            title={`${
              sidebarCollapsed ? "Menüyü genişlet" : "Menüyü daralt"
            } (Ctrl+B)`}
            aria-label={sidebarCollapsed ? "Menüyü genişlet" : "Menüyü daralt"}
            aria-expanded={!sidebarCollapsed}
            onClick={toggleSidebar}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen size={19} />
            ) : (
              <PanelLeftClose size={19} />
            )}
            <span>Menüyü daralt</span>
          </button>
          <div className="profile-wrap" ref={profileMenuRef}>
            {profileMenuOpen && (
              <div className="profile-menu" role="menu">
                <div className="profile-menu-head">
                  <strong>{user.name}</strong>
                  <span>{user.email}</span>
                </div>
                <button
                  className="profile-menu-item"
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={theme === "dark"}
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                  {theme === "dark" ? <Moon size={16} /> : <Sun size={16} />}
                  <span>Karanlık tema</span>
                  <i
                    className={`mini-switch ${theme === "dark" ? "on" : ""}`}
                  />
                </button>
                <button
                  className="profile-menu-item"
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setProfileMenuOpen(false)
                    goTo("settings")
                  }}
                >
                  <Settings size={16} />
                  <span>Hesap ayarları</span>
                </button>
                <button
                  className="profile-menu-item"
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                >
                  <LogOut size={16} />
                  <span>Çıkış yap</span>
                </button>
              </div>
            )}
            <button
              className="teacher-profile"
              type="button"
              aria-haspopup="menu"
              aria-expanded={profileMenuOpen}
              title="Hesap menüsü"
              onClick={() => setProfileMenuOpen((open) => !open)}
            >
              <span className="avatar">{userInitials || "Ö"}</span>
              <span className="profile-text">
                <strong>{user.name}</strong>
                <span>{user.branch} öğretmeni</span>
              </span>
              <MoreHorizontal size={18} />
            </button>
          </div>
        </div>
      </aside>
      {mobileSidebarOpen && (
        <button
          className="sidebar-backdrop"
          type="button"
          aria-label="Menüyü kapat"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <main className="workspace">
        {view === "exams" ? (
          <ExamsPage
            exams={exams}
            onMenu={() => setMobileSidebarOpen(true)}
            onOpen={openExamById}
            onNew={startNewExam}
            onDuplicate={handleDuplicateExam}
            onDelete={handleDeleteExam}
            onPdf={openPdfInEditor}
            onNotify={notify}
          />
        ) : view === "bank" ? (
          <BankPage
            items={bankItems}
            onMenu={() => setMobileSidebarOpen(true)}
            onCreate={handleCreateBankItem}
            onDelete={handleDeleteBankItem}
            onAdd={addBankQuestions}
          />
        ) : view === "templates" ? (
          <TemplatesPage
            userId={user.id}
            onMenu={() => setMobileSidebarOpen(true)}
            current={design}
            renderPreview={(previewDesign) => (
              <ExamPaper
                examMeta={examMeta}
                questions={questions}
                selectedQuestionId={null}
                totalPoints={totalPoints}
                showAnswerKey={false}
                preview
                maxPages={1}
                design={previewDesign}
                onSelectQuestion={() => undefined}
                onSelectExam={() => undefined}
                onMove={() => undefined}
                onDuplicate={() => undefined}
                onDelete={() => undefined}
              />
            )}
            renderInspector={(draft, onChange) => (
              <DesignInspector
                design={draft}
                onUpdate={(updates) => onChange({ ...draft, ...updates })}
                onReset={() => onChange(defaultDesign)}
                onNotify={notify}
              />
            )}
            onUse={(nextDesign, name) => {
              commitState({ design: nextDesign })
              setSelectedQuestionId(null)
              setInspectorTab("design")
              goTo("editor", `“${name}” şablonu uygulandı`)
            }}
          />
        ) : view === "settings" ? (
          <SettingsPage
            user={user}
            theme={theme}
            onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
            onMenu={() => setMobileSidebarOpen(true)}
            onUserUpdated={(updated) => setUser(updated)}
            onAccountDeleted={() => {
              setUser(null)
              setExams([])
              setBankItems([])
              setActiveExamId(null)
              setProfileMenuOpen(false)
              notify("Hesabınız ve tüm verileriniz silindi")
            }}
            onNotify={notify}
          />
        ) : view === "home" ? (
          <HomeView
            user={user}
            exams={exams}
            bankCount={bankItems.length}
            onMenu={() => setMobileSidebarOpen(true)}
            onNewExam={startNewExam}
            onPdf={openPdfInEditor}
            onTemplate={() => goTo("templates")}
            onOpenExam={openExamById}
            onAllExams={() => goTo("exams")}
          />
        ) : (
          <>
            <header className="topbar">
              <div className="topbar-left">
                <button
                  className="icon-button mobile-menu"
                  type="button"
                  onClick={() => setMobileSidebarOpen(true)}
                >
                  <Menu size={20} />
                  <span className="sr-only">Menüyü aç</span>
                </button>
                <div className="title-area">
                  <div className="breadcrumb">
                    Sınavlarım <span>/</span> Yeni sınav
                  </div>
                  <input
                    aria-label="Sınav adı"
                    className="exam-title-input"
                    value={examMeta.title}
                    onChange={(event) =>
                      setExamMeta({ ...examMeta, title: event.target.value })
                    }
                  />
                </div>
              </div>
              <div className="topbar-actions">
                <div className="history-buttons">
                  <button
                    className="icon-button"
                    type="button"
                    title="Geri al (Ctrl+Z)"
                    aria-label="Geri al"
                    disabled={past.length === 0}
                    onClick={handleUndo}
                  >
                    <Undo2 size={17} />
                  </button>
                  <button
                    className="icon-button"
                    type="button"
                    title="Yinele (Ctrl+Shift+Z)"
                    aria-label="Yinele"
                    disabled={future.length === 0}
                    onClick={handleRedo}
                  >
                    <Redo2 size={17} />
                  </button>
                </div>
                <button
                  className="button button-secondary preview-button"
                  type="button"
                  onClick={() => setGradingOpen(true)}
                >
                  <Users size={17} />
                  <span>Not girişi{grades.length > 0 ? ` (${grades.length})` : ""}</span>
                </button>
                <button
                  className="button button-secondary preview-button"
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                >
                  <ScanLine size={17} />
                  <span>Önizle</span>
                </button>
                <div className="export-dropdown-wrap" ref={exportMenuRef}>
                  <button
                    className="button button-secondary"
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={exportMenuOpen}
                    onClick={() => setExportMenuOpen((open) => !open)}
                  >
                    <FileType2 size={17} />
                    <span>Dışa aktar</span>
                  </button>
                  {exportMenuOpen && (
                    <div className="export-menu" role="menu">
                      <button
                        type="button"
                        role="menuitem"
                        disabled={pdfExporting}
                        onClick={() => {
                          setExportMenuOpen(false)
                          void handleDownloadDualBookletPdf()
                        }}
                      >
                        <Download size={16} />
                        <span>A + B Kitapçık PDF indir</span>
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setExportMenuOpen(false)
                          void handleDownloadDocx()
                        }}
                      >
                        <FileText size={16} />
                        <span>Word (.docx) indir</span>
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setExportMenuOpen(false)
                          exportExamJson({ examMeta, questions, design })
                          notify("JSON yedeği indirildi")
                        }}
                      >
                        <FileCode2 size={16} />
                        <span>JSON yedek indir</span>
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setExportMenuOpen(false)
                          jsonInputRef.current?.click()
                        }}
                      >
                        <UploadCloud size={16} />
                        <span>JSON yedekten yükle</span>
                      </button>
                    </div>
                  )}
                  <input
                    ref={jsonInputRef}
                    className="sr-only"
                    type="file"
                    accept=".json,application/json"
                    onChange={(event) => {
                      void handleImportJsonFile(event.target.files?.[0])
                      event.target.value = ""
                    }}
                  />
                </div>
                <button
                  className="button button-primary"
                  type="button"
                  disabled={pdfExporting}
                  onClick={handleDownloadPdf}
                >
                  {pdfExporting ? (
                    <LoaderCircle className="spin" size={17} />
                  ) : (
                    <Download size={17} />
                  )}
                  <span>
                    {pdfExporting
                      ? `Hazırlanıyor (${pdfProgress})`
                      : "PDF indir"}
                  </span>
                </button>
                <button
                  className="icon-button inspector-toggle"
                  type="button"
                  aria-label="Ayarlar panelini aç"
                  onClick={() => setInspectorOpen(true)}
                >
                  <PanelRight size={19} />
                </button>
              </div>
            </header>

            <div className="editor-layout">
              <section
                className={`question-tools ${
                  mobileTab === "questions" ? "mobile-active" : ""
                }`}
              >
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">İçerik</p>
                    <h2>Soru ekle</h2>
                  </div>
                  <span className="count-badge">{questions.length}</span>
                </div>
                <p className="panel-description">
                  Bir soru türü seçerek sınavına ekle.
                </p>

                <div className="question-type-grid">
                  {questionKinds.map((type) => (
                    <button
                      className="question-type-card"
                      key={type}
                      type="button"
                      onClick={() => addQuestion(type)}
                    >
                      <span className="type-icon">
                        <TypeIcon type={type} />
                      </span>
                      <span>{questionTypeLabels[type]}</span>
                      <Plus size={15} />
                    </button>
                  ))}
                </div>

                <div className="panel-section-title content-title">
                  <div>
                    <BookOpenText size={16} />
                    <span>İçerik blokları</span>
                  </div>
                </div>
                <div className="content-block-list">
                  {contentKinds.map((type) => (
                    <button
                      className="content-block-button"
                      key={type}
                      type="button"
                      onClick={() => addQuestion(type)}
                    >
                      <span className="type-icon">
                        <TypeIcon type={type} />
                      </span>
                      <span>
                        <strong>{questionTypeLabels[type]}</strong>
                        <small>{contentDescriptions[type]}</small>
                      </span>
                      <Plus size={15} />
                    </button>
                  ))}
                </div>

                <button
                  className="pdf-import-card"
                  type="button"
                  onClick={() => setPdfStep(pdfLibrary.length > 0 ? "crop" : "upload")}
                >
                  <span className="pdf-icon">
                    <UploadCloud size={20} />
                  </span>
                  <span>
                    <strong>PDF'den soru aktar</strong>
                    <small>Dosyanı yükle, soruları seç</small>
                  </span>
                  <ArrowRightIcon />
                </button>
              </section>

              <section
                className={`canvas-area ${
                  mobileTab === "paper" ? "mobile-active" : ""
                }`}
              >
                <div className="canvas-toolbar">
                  <div className="document-status">
                    <CheckCircle2 size={16} />
                    <span>
                      {scoredCount} soru · {totalPoints} / {targetPoints} puan
                    </span>
                  </div>
                  <div className="canvas-actions">
                    <button
                      className={
                        inspectorTab === "design" && !selectedQuestion
                          ? "active"
                          : ""
                      }
                      type="button"
                      onClick={openDesign}
                    >
                      <Palette size={16} />
                      <span>Kâğıt tasarımı</span>
                    </button>
                    <button
                      className={showAnswerKey ? "active" : ""}
                      type="button"
                      onClick={() => setShowAnswerKey((current) => !current)}
                    >
                      <ClipboardCheck size={16} />
                      <span>Cevap anahtarı</span>
                    </button>
                    <button type="button" onClick={handlePrint}>
                      <Printer size={16} />
                      <span>Yazdır</span>
                    </button>
                  </div>
                </div>

                <div className="paper-scroll">
                  <ExamPaper
                    examMeta={examMeta}
                    questions={questions}
                    selectedQuestionId={selectedQuestionId}
                    totalPoints={totalPoints}
                    showAnswerKey={showAnswerKey}
                    showOpticalForm={showOpticalForm}
                    onSelectQuestion={openQuestion}
                    design={design}
                    onSelectExam={selectExam}
                    onMove={moveQuestion}
                    onReorder={reorderQuestion}
                    onDuplicate={duplicateQuestion}
                    onDelete={removeQuestion}
                  />
                </div>
              </section>

              <aside
                className={`inspector ${
                  inspectorOpen || mobileTab === "settings" ? "open" : ""
                } ${mobileTab === "settings" ? "mobile-active" : ""}`}
              >
                <div className="inspector-header">
                  <div>
                    <p className="eyebrow">Düzenle</p>
                    <h2>
                      {selectedQuestion
                        ? isContentType(selectedQuestion.type)
                          ? `${questionTypeLabels[selectedQuestion.type]} ayarları`
                          : "Soru ayarları"
                        : inspectorTab === "design"
                          ? "Kâğıt tasarımı"
                          : "Sınav ayarları"}
                    </h2>
                  </div>
                  <button
                    className="icon-button inspector-close"
                    type="button"
                    aria-label="Ayarlar panelini kapat"
                    onClick={() => setInspectorOpen(false)}
                  >
                    <X size={18} />
                  </button>
                </div>

                {selectedQuestion ? (
                  isContentType(selectedQuestion.type) ? (
                    <ContentInspector
                      block={selectedQuestion}
                      onUpdate={updateQuestion}
                      onDelete={() => removeQuestion(selectedQuestion.id)}
                    />
                  ) : (
                    <QuestionInspector
                      question={selectedQuestion}
                      onUpdate={updateQuestion}
                      onUpdateOption={updateOption}
                      onSaveToBank={() =>
                        handleCreateBankItem({
                          topic: examMeta.topic || "Genel",
                          type: selectedQuestion.type as BankQuestionType,
                          difficulty: selectedQuestion.difficulty as BankDifficulty,
                          points: selectedQuestion.points,
                          prompt: selectedQuestion.prompt,
                          options: selectedQuestion.options
                            ? [...selectedQuestion.options]
                            : undefined,
                          correctAnswer: selectedQuestion.correctAnswer,
                          source: selectedQuestion.source,
                          lead: selectedQuestion.lead,
                          leadBold: selectedQuestion.leadBold,
                          leadColor: selectedQuestion.leadColor,
                          promptBold: selectedQuestion.promptBold,
                          promptColor: selectedQuestion.promptColor,
                          image: selectedQuestion.image,
                          imageSize: selectedQuestion.imageSize,
                          imageRawWidth: selectedQuestion.imageRawWidth,
                          sourceFontPx: selectedQuestion.sourceFontPx,
                          imageScale: selectedQuestion.imageScale,
                          optionLayout: selectedQuestion.optionLayout,
                          solutionSpace: selectedQuestion.solutionSpace,
                          solutionHeight: selectedQuestion.solutionHeight,
                        })
                      }
                      onDelete={() => removeQuestion(selectedQuestion.id)}
                      onNotify={notify}
                    />
                  )
                ) : (
                  <>
                    <div className="inspector-tabs" role="tablist">
                      <button
                        className={inspectorTab === "info" ? "active" : ""}
                        type="button"
                        role="tab"
                        aria-selected={inspectorTab === "info"}
                        onClick={() => setInspectorTab("info")}
                      >
                        <Settings2 size={15} />
                        Bilgiler
                      </button>
                      <button
                        className={inspectorTab === "design" ? "active" : ""}
                        type="button"
                        role="tab"
                        aria-selected={inspectorTab === "design"}
                        onClick={() => setInspectorTab("design")}
                      >
                        <Palette size={15} />
                        Tasarım
                      </button>
                    </div>
                    {inspectorTab === "info" ? (
                      <ExamInspector
                        examMeta={examMeta}
                        questions={questions}
                        totalPoints={totalPoints}
                        showAnswerKey={showAnswerKey}
                        showOpticalForm={showOpticalForm}
                        booklet={design.booklet}
                        onUpdate={(updates) =>
                          setExamMeta((current) => ({ ...current, ...updates }))
                        }
                        onToggleAnswerKey={setShowAnswerKey}
                        onToggleOpticalForm={setShowOpticalForm}
                        onShuffleBooklet={handleShuffleBooklet}
                        onDownloadAnswerKeyPdf={handleDownloadAnswerKeyPdf}
                        onDownloadDualBookletPdf={handleDownloadDualBookletPdf}
                      />
                    ) : (
                      <DesignInspector
                        design={design}
                        onUpdate={(updates) =>
                          setDesign((current) => ({ ...current, ...updates }))
                        }
                        onReset={() => {
                          commitState({ design: defaultDesign })
                          notify("Varsayılan tasarıma dönüldü")
                        }}
                        onNotify={notify}
                      />
                    )}
                  </>
                )}
              </aside>
              {inspectorOpen && (
                <button
                  className="drawer-backdrop"
                  type="button"
                  aria-label="Ayarlar panelini kapat"
                  onClick={() => setInspectorOpen(false)}
                />
              )}
            </div>

            <nav className="mobile-tabs" aria-label="Editör bölümleri">
              <button
                className={mobileTab === "questions" ? "active" : ""}
                type="button"
                onClick={() => setMobileTab("questions")}
              >
                <Plus size={18} />
                Sorular
              </button>
              <button
                className={mobileTab === "paper" ? "active" : ""}
                type="button"
                onClick={() => setMobileTab("paper")}
              >
                <FileText size={18} />
                Kâğıt
              </button>
              <button
                className={mobileTab === "settings" ? "active" : ""}
                type="button"
                onClick={() => setMobileTab("settings")}
              >
                <Settings2 size={18} />
                Ayarlar
              </button>
            </nav>
          </>
        )}
      </main>

      {pdfStep !== "closed" && (
        <PdfImportModal
          step={pdfStep}
          pdfLibrary={pdfLibrary}
          activePdfId={activePdfId}
          error={pdfError}
          closeRef={closeModalRef}
          onClose={closePdfModal}
          onSelectPdf={setActivePdfId}
          onRemovePdf={handleRemoveSavedPdf}
          onPageChange={handlePdfPageChange}
          onFiles={handlePdfFiles}
          onImportCropped={importCroppedPdfQuestions}
        />
      )}

      {previewOpen && (
        <div className="preview-overlay" role="dialog" aria-modal="true">
          <div className="preview-header">
            <div>
              <span className="preview-kicker">Baskı önizleme</span>
              <strong>{examMeta.title}</strong>
            </div>
            <div>
              <button
                className="button button-primary"
                type="button"
                disabled={pdfExporting}
                onClick={handleDownloadPdf}
              >
                {pdfExporting ? (
                  <LoaderCircle className="spin" size={17} />
                ) : (
                  <Download size={17} />
                )}
                {pdfExporting
                  ? `Hazırlanıyor (${pdfProgress})`
                  : "PDF indir"}
              </button>
              <button
                className="button button-secondary"
                type="button"
                onClick={handlePrint}
              >
                <Printer size={17} />
                Yazdır
              </button>
              <button
                className="icon-button"
                type="button"
                aria-label="Önizlemeyi kapat"
                onClick={() => setPreviewOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
          </div>
          <div className="preview-scroll">
            <ExamPaper
              examMeta={examMeta}
              questions={questions}
              selectedQuestionId={null}
              totalPoints={totalPoints}
              showAnswerKey={showAnswerKey}
              showOpticalForm={showOpticalForm}
              preview
              design={design}
              onSelectQuestion={() => undefined}
              onSelectExam={() => undefined}
              onMove={() => undefined}
              onDuplicate={() => undefined}
              onDelete={() => undefined}
            />
          </div>
        </div>
      )}

      {dualBookletPayload && (
        <div
          ref={dualExportRef}
          className="dual-export-stage"
          aria-hidden="true"
        >
          <ExamPaper
            examMeta={examMeta}
            questions={dualBookletPayload.questionsA}
            selectedQuestionId={null}
            totalPoints={totalPoints}
            showAnswerKey
            showOpticalForm={showOpticalForm}
            preview
            design={{ ...design, booklet: "A" }}
            onSelectQuestion={() => undefined}
            onSelectExam={() => undefined}
            onMove={() => undefined}
            onDuplicate={() => undefined}
            onDelete={() => undefined}
          />
          <ExamPaper
            examMeta={examMeta}
            questions={dualBookletPayload.questionsB}
            selectedQuestionId={null}
            totalPoints={totalPoints}
            showAnswerKey
            showOpticalForm={showOpticalForm}
            preview
            design={{ ...design, booklet: "B" }}
            onSelectQuestion={() => undefined}
            onSelectExam={() => undefined}
            onMove={() => undefined}
            onDuplicate={() => undefined}
            onDelete={() => undefined}
          />
        </div>
      )}

      <GradingModal
        open={gradingOpen}
        examTitle={examMeta.title}
        questions={questions}
        grades={grades}
        onClose={() => setGradingOpen(false)}
        onChange={setGrades}
      />

      <div
        className={`toast ${toast ? "visible" : ""}`}
        role="status"
        aria-live="polite"
      >
        <CheckCircle2 size={18} />
        <span>{toast}</span>
      </div>
    </div>
  )
}
