import Dropdown from "./Dropdown"
import MathInput, { MathText } from "./MathInput"
import {
  AlignLeft,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BookOpen,
  BookOpenText,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  Clock3,
  Copy,
  Download,
  FileCheck2,
  FileText,
  FolderOpen,
  GripVertical,
  Heading,
  House,
  Info,
  LayoutTemplate,
  Lightbulb,
  ListChecks,
  LoaderCircle,
  Menu,
  Moon,
  MoreHorizontal,
  Palette,
  PanelRight,
  PencilLine,
  Plus,
  Printer,
  ScanLine,
  Search,
  Settings2,
  Sun,
  Sigma,
  Sparkles,
  Trash2,
  Image as ImageIcon,
  UploadCloud,
  UserRound,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react"
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import BankPage, { type BankQuestion } from "./pages/BankPage"
import ExamsPage from "./pages/ExamsPage"
import { TopbarTitle, TopbarTools } from "./pages/PageHeader"
import TemplatesPage, {
  baseDesign,
  fontOptions,
  type TemplateDesign,
} from "./pages/TemplatesPage"

type QuestionKind = "multiple" | "trueFalse" | "fillBlank" | "classic"
type ContentKind = "section" | "text" | "formula" | "info" | "example"
type QuestionType = QuestionKind | ContentKind
type InfoVariant = "Bilgi" | "Hatırlatma" | "Dikkat"

const questionKinds: QuestionKind[] = [
  "multiple",
  "trueFalse",
  "fillBlank",
  "classic",
]
const contentKinds: ContentKind[] = [
  "section",
  "text",
  "formula",
  "info",
  "example",
]
const isContentType = (type: QuestionType): type is ContentKind =>
  (contentKinds as string[]).includes(type)

const contentDescriptions: Record<ContentKind, string> = {
  section: "A, B, C bölüm yönergesi",
  text: "Konu anlatımı / okuma metni",
  formula: "Kesir, üs, kök içeren formül",
  info: "Bilgi, hatırlatma, dikkat",
  example: "Örnek soru ve çözümü",
}
type Difficulty = "Kolay" | "Orta" | "Zor"
type MobileTab = "questions" | "paper" | "settings"
type AppView = "home" | "editor" | "exams" | "bank" | "templates"
type InspectorTab = "info" | "design"

type PaperDesign = TemplateDesign

const defaultDesign: PaperDesign = baseDesign

const accentOptions = [
  "#1f2937",
  "#126b57",
  "#1d4ed8",
  "#0e7490",
  "#7c3aed",
  "#be185d",
  "#9a3412",
  "#b45309",
]
type PdfStep = "closed" | "upload" | "scanning" | "select"

type Question = {
  id: number
  type: QuestionType
  prompt: string
  points: number
  difficulty: Difficulty
  options?: string[]
  correctAnswer: string
  source?: string
  title?: string
  formula?: string
  variant?: InfoVariant
  /** Optional lead text (öncül) printed before the question stem */
  lead?: string
  /** Optional image (data URL) printed above the question stem */
  image?: string
  imageSize?: QuestionImageSize
}

type QuestionImageSize = "small" | "medium" | "full"

type ExamMeta = {
  title: string
  school: string
  grade: string
  subject: string
  topic: string
  duration: number
  date: string
  academicYear: string
  term: "1" | "2"
  examNo: "1" | "2" | "3"
  teacher: string
}

const questionTypeLabels: Record<QuestionType, string> = {
  multiple: "Çoktan seçmeli",
  trueFalse: "Doğru / yanlış",
  fillBlank: "Boşluk doldurma",
  classic: "Klasik",
  section: "Bölüm başlığı",
  text: "Konu anlatımı",
  formula: "Formül",
  info: "Bilgi kutusu",
  example: "Örnek çözüm",
}

const initialQuestions: Question[] = [
  {
    id: 101,
    type: "section",
    prompt: "A. Aşağıdaki soruları dikkatlice okuyarak cevaplayınız.",
    points: 0,
    difficulty: "Orta",
    correctAnswer: "",
  },
  {
    id: 102,
    type: "formula",
    title: "Hatırlatma — Orantı",
    formula: "[a/b] = [c/d]  ⇒  a · d = b · c",
    prompt: "İçler çarpımı dışlar çarpımına eşittir.",
    points: 0,
    difficulty: "Orta",
    correctAnswer: "",
  },
  {
    id: 1,
    type: "multiple",
    prompt:
      "Bir sınıftaki kız öğrencilerin erkek öğrencilere oranı 3/5'tir. Sınıfta 15 erkek öğrenci olduğuna göre kız öğrenci sayısı kaçtır?",
    points: 20,
    difficulty: "Kolay",
    options: ["6", "9", "12", "25"],
    correctAnswer: "B",
  },
  {
    id: 2,
    type: "fillBlank",
    prompt:
      "Bir haritada 4 cm ile gösterilen uzaklık gerçekte 12 km ise, aynı haritada 7 cm ile gösterilen uzaklık gerçekte ______ km'dir.",
    points: 20,
    difficulty: "Orta",
    correctAnswer: "21",
  },
  {
    id: 3,
    type: "trueFalse",
    prompt: "İki çokluğun oranı değişmiyorsa bu iki çokluk doğru orantılıdır.",
    points: 15,
    difficulty: "Kolay",
    correctAnswer: "Doğru",
  },
  {
    id: 4,
    type: "classic",
    prompt:
      "Bir tarifte 6 kişilik kek için 450 gram un kullanılıyor. Aynı tarifi 10 kişi için hazırlamak isteyen Ece'nin kaç gram un kullanması gerektiğini orantı kurarak gösteriniz.",
    points: 25,
    difficulty: "Orta",
    correctAnswer: "450 / 6 = x / 10, x = 750 gram",
  },
]

const pdfQuestions: Omit<Question, "id">[] = [
  {
    type: "multiple",
    prompt:
      "Bir kutudaki kırmızı bilyelerin mavi bilyelere oranı 4/3'tür. Kutuda 12 kırmızı bilye varsa kaç mavi bilye vardır?",
    points: 10,
    difficulty: "Kolay",
    options: ["6", "8", "9", "16"],
    correctAnswer: "C",
    source: "Sayfa 2",
  },
  {
    type: "trueFalse",
    prompt: "5/8 oranı ile 15/24 oranı birbirine eşittir.",
    points: 10,
    difficulty: "Orta",
    correctAnswer: "Doğru",
    source: "Sayfa 3",
  },
  {
    type: "classic",
    prompt:
      "18 litre boya ile 72 m² duvar boyanıyor. 120 m² duvar için gereken boya miktarını bulunuz.",
    points: 20,
    difficulty: "Zor",
    correctAnswer: "30 litre",
    source: "Sayfa 4",
  },
]

const createQuestion = (type: QuestionType, id: number): Question => {
  const shared = { id, points: 10, difficulty: "Orta" as Difficulty }
  const content = { id, points: 0, difficulty: "Orta" as Difficulty }

  if (type === "section") {
    return {
      ...content,
      type,
      prompt: "B. Aşağıdaki soruları cevaplayınız.",
      correctAnswer: "",
    }
  }

  if (type === "text") {
    return {
      ...content,
      type,
      title: "Konu Anlatımı: Oran",
      prompt:
        "İki çokluğun bölme işlemiyle karşılaştırılmasına oran denir. a ve b çokluklarının oranı [a/b] ya da a : b biçiminde gösterilir.\nOranı alınan çokluklar aynı birimden olmalıdır.",
      correctAnswer: "",
    }
  }

  if (type === "formula") {
    return {
      ...content,
      type,
      title: "Formül",
      formula: "[a/b] = [c/d]  ⇒  a · d = b · c",
      prompt: "Formülün açıklamasını buraya yazın.",
      correctAnswer: "",
    }
  }

  if (type === "info") {
    return {
      ...content,
      type,
      variant: "Hatırlatma",
      title: "Hatırlatma",
      prompt:
        "Doğru orantılı iki çokluktan biri artarken diğeri de aynı oranda artar.",
      correctAnswer: "",
    }
  }

  if (type === "example") {
    return {
      ...content,
      type,
      title: "Örnek",
      prompt: "3 kalem 12 TL ise 5 kalem kaç TL'dir?",
      correctAnswer: "[3/12] = [5/x]  ⇒  3x = 60  ⇒  x = 20 TL",
    }
  }

  if (type === "multiple") {
    return {
      ...shared,
      type,
      prompt: "Yeni çoktan seçmeli sorununuzu buraya yazın.",
      options: ["A seçeneği", "B seçeneği", "C seçeneği", "D seçeneği"],
      correctAnswer: "A",
    }
  }

  if (type === "trueFalse") {
    return {
      ...shared,
      type,
      prompt: "Yeni doğru / yanlış ifadenizi buraya yazın.",
      correctAnswer: "Doğru",
    }
  }

  if (type === "fillBlank") {
    return {
      ...shared,
      type,
      prompt: "Boşluk doldurma sorunuzu ______ işaretiyle yazın.",
      correctAnswer: "Örnek cevap",
    }
  }

  return {
    ...shared,
    type,
    prompt: "Yeni klasik sorunuzu buraya yazın.",
    correctAnswer: "Örnek cevap",
  }
}

function AppLogo() {
  return (
    <div className="brand-mark" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  )
}

function TypeIcon({ type }: { type: QuestionType }) {
  if (type === "multiple") return <ListChecks size={17} />
  if (type === "trueFalse") return <CheckCircle2 size={17} />
  if (type === "fillBlank") return <AlignLeft size={17} />
  if (type === "section") return <Heading size={17} />
  if (type === "text") return <BookOpenText size={17} />
  if (type === "formula") return <Sigma size={17} />
  if (type === "info") return <Info size={17} />
  if (type === "example") return <Lightbulb size={17} />
  return <PencilLine size={17} />
}

function App() {
  const [examMeta, setExamMeta] = useState<ExamMeta>({
    title: "7. Sınıf Matematik — Oran ve Orantı",
    school: "Atatürk Ortaokulu",
    grade: "7/A",
    subject: "Matematik",
    topic: "Oran ve Orantı",
    duration: 40,
    date: "20 Mayıs 2025",
    academicYear: "2024–2025",
    term: "2",
    examNo: "1",
    teacher: "",
  })
  const [questions, setQuestions] = useState<Question[]>(initialQuestions)
  const [selectedQuestionId, setSelectedQuestionId] = useState<number | null>(
    null,
  )
  const [showAnswerKey, setShowAnswerKey] = useState(false)
  const [view, setView] = useState<AppView>("home")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 1260,
  )
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("info")
  const [design, setDesign] = useState<PaperDesign>(defaultDesign)
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("sinav-atolyesi-tema")
    if (saved === "light" || saved === "dark") return saved
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light"
  })

  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)

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
    document.documentElement.dataset.theme = theme
    localStorage.setItem("sinav-atolyesi-tema", theme)
  }, [theme])
  const [previewOpen, setPreviewOpen] = useState(false)
  const [inspectorOpen, setInspectorOpen] = useState(false)
  const [mobileTab, setMobileTab] = useState<MobileTab>("paper")
  const [toast, setToast] = useState("")
  const [pdfStep, setPdfStep] = useState<PdfStep>("closed")
  const [pdfName, setPdfName] = useState("")
  const [pdfError, setPdfError] = useState("")
  const [pdfExporting, setPdfExporting] = useState(false)
  const [selectedPdfQuestions, setSelectedPdfQuestions] = useState<number[]>([
    0, 1,
  ])
  const closeModalRef = useRef<HTMLButtonElement>(null)

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

  const notify = (message: string) => setToast(message)

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
    // Some embedded browsers don't dispatch afterprint.
    window.setTimeout(cleanup, 1500)
  }

  const handleDownloadPdf = async () => {
    if (pdfExporting) return
    const stack = getOutputStack()
    const pages = stack
      ? Array.from(stack.querySelectorAll<HTMLElement>("article.exam-paper"))
      : []
    if (!stack || pages.length === 0) {
      notify("PDF'e aktarılacak sınav sayfası bulunamadı")
      return
    }

    setPdfExporting(true)
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

      const safeName =
        examMeta.title
          .trim()
          .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "")
          .replace(/\s+/g, "-")
          .slice(0, 90) || "sinav"
      pdf.save(`${safeName}.pdf`)
      notify("PDF indirildi")
    } catch (error) {
      console.error("PDF export failed", error)
      notify("PDF oluşturulamadı. Lütfen yeniden deneyin.")
    } finally {
      stack.classList.remove("pdf-exporting")
      setPdfExporting(false)
    }
  }

  const addQuestion = (type: QuestionType) => {
    const question = createQuestion(type, nextId())
    setQuestions((current) => [...current, question])
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
    setQuestions(remaining)
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
    setQuestions(updated)
    setSelectedQuestionId(copy.id)
    notify("Soru çoğaltıldı")
  }

  const moveQuestion = (id: number, direction: -1 | 1) => {
    const index = questions.findIndex((question) => question.id === id)
    const target = index + direction
    if (target < 0 || target >= questions.length) return
    const updated = [...questions]
    ;[updated[index], updated[target]] = [updated[target], updated[index]]
    setQuestions(updated)
  }

  const closePdfModal = () => {
    setPdfStep("closed")
    setPdfError("")
    setPdfName("")
  }

  const handlePdfFile = (file?: File) => {
    if (!file) return
    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      setPdfError("Lütfen PDF formatında bir dosya seçin.")
      return
    }
    setPdfError("")
    setPdfName(file.name)
    setPdfStep("scanning")
    window.setTimeout(() => setPdfStep("select"), 1100)
  }

  const importPdfQuestions = () => {
    if (selectedPdfQuestions.length === 0) return
    let id = nextId()
    const imported = selectedPdfQuestions.map((index) => ({
      ...pdfQuestions[index],
      options: pdfQuestions[index].options
        ? [...pdfQuestions[index].options!]
        : undefined,
      id: id++,
    }))
    setQuestions((current) => [...current, ...imported])
    setSelectedQuestionId(imported[0].id)
    closePdfModal()
    notify(`${imported.length} soru PDF'den sınava eklendi`)
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
    const added = items.map((item) => ({
      ...item,
      options: item.options ? [...item.options] : undefined,
      id: id++,
    }))
    setQuestions((current) => [...current, ...added])
    setSelectedQuestionId(added[0]?.id ?? null)
    goTo("editor", `${added.length} soru sınava eklendi`)
  }

  const openPdfInEditor = () => {
    goTo("editor")
    setPdfStep("upload")
  }

  // Collapsing: fade labels out first, then shrink — avoids squashed text mid-animation.
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
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") {
        event.preventDefault()
        toggleDesktopSidebar()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

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
          onClick={() => goTo("editor", "Yeni sınav taslağı açıldı")}
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
                  <strong>Selin Aksoy</strong>
                  <span>selin.aksoy@okul.k12.tr</span>
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
                    notify("Yardım merkezi yakında")
                  }}
                >
                  <CircleHelp size={16} />
                  <span>Yardım merkezi</span>
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
              <span className="avatar">SA</span>
              <span className="profile-text">
                <strong>Selin Aksoy</strong>
                <span>Matematik öğretmeni</span>
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
            onMenu={() => setMobileSidebarOpen(true)}
            onOpen={() => goTo("editor")}
            onNew={() => goTo("editor", "Yeni sınav taslağı açıldı")}
            onPdf={openPdfInEditor}
            onNotify={notify}
          />
        ) : view === "bank" ? (
          <BankPage
            onMenu={() => setMobileSidebarOpen(true)}
            onAdd={addBankQuestions}
          />
        ) : view === "templates" ? (
          <TemplatesPage
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
              />
            )}
            onUse={(nextDesign, name) => {
              setDesign(nextDesign)
              setSelectedQuestionId(null)
              setInspectorTab("design")
              goTo("editor", `“${name}” şablonu uygulandı`)
            }}
          />
        ) : view === "home" ? (
          <HomeView
            onMenu={() => setMobileSidebarOpen(true)}
            onNewExam={() => goTo("editor", "Yeni sınav taslağı açıldı")}
            onPdf={openPdfInEditor}
            onTemplate={() => goTo("templates")}
            onOpenExam={() => goTo("editor")}
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
                <div className="save-status">
                  <Check size={14} />
                  <span>Kaydedildi</span>
                </div>
                <button
                  className="button button-secondary preview-button"
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                >
                  <ScanLine size={17} />
                  <span>Önizle</span>
                </button>
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
                  <span>{pdfExporting ? "PDF hazırlanıyor" : "PDF indir"}</span>
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
                  onClick={() => setPdfStep("upload")}
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
                    <FileCheck2 size={16} />
                    <span>
                      {questions.length} soru · {totalPoints} puan
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
                    <button type="button">
                      %100
                      <ChevronDown size={14} />
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
                    onSelectQuestion={openQuestion}
                    design={design}
                    onSelectExam={selectExam}
                    onMove={moveQuestion}
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
                      onDelete={() => removeQuestion(selectedQuestion.id)}
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
                        showAnswerKey={showAnswerKey}
                        onUpdate={(updates) =>
                          setExamMeta((current) => ({ ...current, ...updates }))
                        }
                        onToggleAnswerKey={setShowAnswerKey}
                      />
                    ) : (
                      <DesignInspector
                        design={design}
                        onUpdate={(updates) =>
                          setDesign((current) => ({ ...current, ...updates }))
                        }
                        onReset={() => setDesign(defaultDesign)}
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
          fileName={pdfName}
          error={pdfError}
          selected={selectedPdfQuestions}
          closeRef={closeModalRef}
          onClose={closePdfModal}
          onFile={handlePdfFile}
          onSelectedChange={setSelectedPdfQuestions}
          onImport={importPdfQuestions}
          onReset={() => {
            setPdfStep("upload")
            setPdfName("")
          }}
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
                {pdfExporting ? "PDF hazırlanıyor" : "PDF indir"}
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

function ArrowRightIcon() {
  return <span className="arrow-right">→</span>
}

// A4 = 210 x 297 mm. Pages are laid out at 720px width and scaled to fit.
const PAGE_WIDTH = 720
const PAGE_HEIGHT = Math.round((PAGE_WIDTH * 297) / 210)

type PaperPage = { cols: number[][] }

type ExamPaperProps = {
  examMeta: ExamMeta
  questions: Question[]
  selectedQuestionId: number | null
  totalPoints: number
  showAnswerKey: boolean
  preview?: boolean
  design: PaperDesign
  onSelectQuestion: (id: number) => void
  onSelectExam: () => void
  onMove: (id: number, direction: -1 | 1) => void
  onDuplicate: (id: number) => void
  onDelete: (id: number) => void
  maxPages?: number
}

function ExamPaper({
  examMeta,
  questions,
  selectedQuestionId,
  totalPoints,
  showAnswerKey,
  preview,
  design,
  onSelectQuestion,
  onSelectExam,
  onMove,
  onDuplicate,
  onDelete,
  maxPages,
}: ExamPaperProps) {
  const paperClass = [
    "exam-paper",
    `template-${design.template}`,
    `size-${design.fontSize}`,
    `spacing-${design.spacing}`,
    `options-${design.optionLayout}`,
    `font-${design.fontFamily}`,
    `frame-${design.pageBorder}`,
    `num-${design.numberStyle}`,
    `logo-${design.logoSize}`,
    design.columns === 2 ? "two-columns" : "",
    design.dividers ? "with-dividers" : "",
  ].join(" ")
  const paperStyle = {
    "--paper-accent": design.accent,
    "--wm-opacity": design.watermarkOpacity / 100,
    "--pad": `${((design.margin ?? 15) * PAGE_WIDTH) / 210}px`,
  } as React.CSSProperties
  const questionItems = questions.filter((item) => !isContentType(item.type))
  let counter = 0
  const numbering = questions.map((item) =>
    isContentType(item.type) ? 0 : ++counter,
  )
  const gradeLevel = examMeta.grade.match(/\d+/)?.[0] ?? ""

  const hasLogo = Boolean(design.logo)
  const initials = examMeta.school
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .slice(0, 2)
    .map((word) => word[0].toLocaleUpperCase("tr"))
    .join("")
  // Designed templates always show a crest: the uploaded logo or a monogram.
  const crest = (
    <span className={`logo-slot ${hasLogo ? "has-image" : "monogram"}`}>
      {hasLogo ? (
        <img src={design.logo} alt="Okul logosu" />
      ) : (
        <b>{initials || "S"}</b>
      )}
    </span>
  )
  // Official-style templates only show a logo when one was uploaded.
  const logoCell = hasLogo ? crest : null
  const yearLabel = examMeta.academicYear?.trim() || "2024–2025"
  const examLabel = `${examMeta.term ?? "2"}. Dönem ${examMeta.examNo ?? "1"}. Yazılı`
  const bookletBadge =
    design.booklet && design.booklet !== "none" ? (
      <span className="booklet-badge">
        <small>Kitapçık</small>
        <b>{design.booklet}</b>
      </span>
    ) : null
  const studentFields = (
    <div className="d-student">
      <label>
        <span>Adı Soyadı</span>
        <i />
      </label>
      <label>
        <span>Sınıf / No</span>
        <i />
      </label>
      <label className="d-score">
        <span>Puan</span>
        <i />
      </label>
    </div>
  )
  const examTitle = `${examMeta.subject} Dersi`
  const examSubtitle = `${examMeta.topic} · ${examLabel}`

  const watermark =
    design.watermark === "none" ? null : (
      <div className="paper-watermark" aria-hidden="true">
        {design.watermark === "logo" && design.logo ? (
          <img src={design.logo} alt="" />
        ) : (
          <span>{design.watermarkText}</span>
        )}
      </div>
    )

  const header = (
    <button
      className={`paper-header ${hasLogo ? "has-logo" : ""}`}
      type="button"
      onClick={onSelectExam}
      disabled={preview}
    >
      {design.template === "elegant" ? (
        <div className="d-head elegant-head">
          {bookletBadge}
          {crest}
          {design.showSchoolHeader && (
            <span className="d-school">{examMeta.school}</span>
          )}
          <span className="d-ornament" aria-hidden="true">
            <i />
            <b />
            <i />
          </span>
          <h1>{examTitle}</h1>
          <p className="d-sub">{examSubtitle}</p>
          <div className="d-meta">
            <span>{yearLabel}</span>
            <span>{examMeta.grade}</span>
            <span>{examMeta.date}</span>
            <span>{examMeta.duration} dakika</span>
            <span>{totalPoints} puan</span>
          </div>
          {design.showStudentBox && studentFields}
        </div>
      ) : design.template === "bold" ? (
        <div className="d-head bold-head">
          <div className="bold-banner">
            {crest}
            <div>
              {design.showSchoolHeader && (
                <span className="d-school">
                  {examMeta.school} · {yearLabel}
                </span>
              )}
              <h1>{examTitle}</h1>
              <p className="d-sub">{examSubtitle}</p>
            </div>
            <dl>
              <div>
                <dt>Sınıf</dt>
                <dd>{examMeta.grade}</dd>
              </div>
              <div>
                <dt>Süre</dt>
                <dd>{examMeta.duration} dk</dd>
              </div>
              <div>
                <dt>Toplam</dt>
                <dd>{totalPoints} p</dd>
              </div>
              {bookletBadge && (
                <div className="bold-booklet">
                  <dt>Kitapçık</dt>
                  <dd>{design.booklet}</dd>
                </div>
              )}
            </dl>
          </div>
          {design.showStudentBox && studentFields}
        </div>
      ) : design.template === "playful" ? (
        <div className="d-head playful-head">
          <div className="playful-card">
            {crest}
            <div>
              {design.showSchoolHeader && (
                <span className="d-school">{examMeta.school}</span>
              )}
              <h1>{examMeta.topic}</h1>
              <p className="d-sub">
                {examMeta.subject} · {examMeta.grade} · {examMeta.date}
              </p>
            </div>
            {bookletBadge}
            <span className="playful-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          </div>
          {design.showStudentBox && studentFields}
        </div>
      ) : design.template === "academic" ? (
        <div className="d-head academic-head">
          <div className="academic-grid">
            {crest}
            <div className="academic-center">
              {design.showSchoolHeader && (
                <>
                  <span className="d-school-top">
                    T.C. Millî Eğitim Bakanlığı · {yearLabel}
                  </span>
                  <span className="d-school">{examMeta.school}</span>
                </>
              )}
              <h1>{examTitle}</h1>
              <p className="d-sub">{examSubtitle}</p>
            </div>
            <table className="academic-info">
              <tbody>
                <tr>
                  <th>Tarih</th>
                  <td>{examMeta.date}</td>
                </tr>
                <tr>
                  <th>Süre</th>
                  <td>{examMeta.duration} dk</td>
                </tr>
                <tr>
                  <th>Sınıf</th>
                  <td>{examMeta.grade}</td>
                </tr>
                {bookletBadge && (
                  <tr>
                    <th>Kitapçık</th>
                    <td>{design.booklet}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {design.showStudentBox && studentFields}
        </div>
      ) : design.template === "classic" ? (
        <div className="meb-head">
          <div
            className={`meb-grid ${hasLogo || bookletBadge ? "has-side" : ""}`}
          >
            <div className="meb-side">{logoCell}</div>
            <div className="meb-title">
              {design.showSchoolHeader && (
                <>
                  <span className="meb-year">
                    {yearLabel} Eğitim-Öğretim Yılı
                  </span>
                  <span className="meb-school">
                    {examMeta.school.toLocaleUpperCase("tr")}
                  </span>
                </>
              )}
              <strong>
                {gradeLevel && `${gradeLevel}. Sınıf `}
                {examMeta.subject} Dersi
              </strong>
              <span className="meb-exam">
                {examLabel} Sınavı
                <i>{examMeta.topic}</i>
              </span>
            </div>
            <div className="meb-side end">{bookletBadge}</div>
          </div>
          {design.showStudentBox && (
            <table className="meb-info">
              <tbody>
                <tr>
                  <th>Adı Soyadı</th>
                  <td />
                  <th>Numarası</th>
                  <td className="narrow" />
                  <td className="score-cell" rowSpan={2}>
                    <span>Puan</span>
                  </td>
                </tr>
                <tr>
                  <th>Sınıfı</th>
                  <td>{examMeta.grade}</td>
                  <th>Tarih</th>
                  <td className="narrow">
                    {examMeta.date} · {examMeta.duration} dk
                  </td>
                </tr>
              </tbody>
            </table>
          )}
          <p className="meb-instruction">
            Soruların puan değerleri yanlarında belirtilmiştir. Cevaplarınızı
            sorunun altındaki boşluğa okunaklı biçimde yazınız.
          </p>
        </div>
      ) : design.template === "lgs" ? (
        <div className="lgs-head">
          <div className="lgs-band">
            <span className="lgs-logo">{logoCell}</span>
            <span className="lgs-meta">
              <b>{examMeta.grade}</b>
              {examMeta.date}
            </span>
            <strong>{examMeta.subject.toLocaleUpperCase("tr")}</strong>
            <span className="lgs-meta end">
              <b>{questionItems.length} soru</b>
              {examMeta.duration} dakika
            </span>
            <span className="lgs-booklet">{bookletBadge}</span>
          </div>
          {design.showSchoolHeader && (
            <p className="lgs-school">
              <span>{examMeta.school}</span>
              <span>{examMeta.topic}</span>
              <span>{examLabel}</span>
            </p>
          )}
          {design.showStudentBox && (
            <div className="lgs-student">
              <span>Adı Soyadı</span>
              <i />
              <span>Numarası</span>
              <i />
            </div>
          )}
          <p className="lgs-instr">
            <b>Açıklama</b>
            Bu testte {questionItems.length} soru vardır. Cevaplarınızı cevap
            kâğıdındaki ilgili alana işaretleyiniz.
          </p>
        </div>
      ) : (
        <div className="min-head">
          <div className="min-top">
            <div className="min-titles">
              {design.showSchoolHeader && (
                <span className="min-school">
                  {examMeta.school} · {yearLabel}
                </span>
              )}
              <h1>{examMeta.subject}</h1>
              <p>
                {examMeta.topic} · {examMeta.grade}
              </p>
            </div>
            {(bookletBadge || logoCell) && (
              <div className="min-side">
                {bookletBadge}
                {logoCell}
              </div>
            )}
          </div>
          {design.showStudentBox && (
            <div className="min-student">
              <span>Adı Soyadı</span>
              <i />
              <span>Sınıf / No</span>
              <i className="short" />
              <span>Tarih</span>
              <b>{examMeta.date}</b>
            </div>
          )}
          <div className="min-note">
            <span>Her soruyu dikkatlice okuyunuz.</span>
            <strong>
              {examMeta.duration} dakika · {totalPoints} puan
            </strong>
          </div>
        </div>
      )}
    </button>
  )

  const runningHead = (
    <div className="paper-running-head">
      <span>
        {examMeta.subject} · {examMeta.topic}
      </span>
      <span>
        {examMeta.grade}
        {bookletBadge && ` · Kitapçık ${design.booklet}`}
      </span>
    </div>
  )

  // Per-question score grid and signature, shown once at the end of the exam.
  const scored = questions
    .map((question, index) => ({ question, number: numbering[index] }))
    .filter((item) => item.number > 0)
  const scoreChunks: typeof scored[] = []
  for (let start = 0; start < scored.length; start += 12) {
    scoreChunks.push(scored.slice(start, start + 12))
  }
  const showScoreTable = design.showScoreTable && scored.length > 0
  const closing =
    questions.length > 0 && (showScoreTable || design.showSignature) ? (
      <div className="paper-closing">
        {showScoreTable && (
          <div className="paper-score-table">
            {scoreChunks.map((chunk, chunkIndex) => {
              const isLast = chunkIndex === scoreChunks.length - 1
              const pad = Array.from({ length: 12 - chunk.length })
              return (
                <table key={chunkIndex}>
                  <tbody>
                    <tr>
                      <th>Soru</th>
                      {chunk.map((item) => (
                        <td key={item.question.id}>{item.number}</td>
                      ))}
                      {scored.length > 12 &&
                        pad.map((_, i) => <td className="pad" key={i} />)}
                      <td className={isLast ? "total" : "total spacer"}>
                        {isLast && "Toplam"}
                      </td>
                    </tr>
                    <tr>
                      <th>Puan</th>
                      {chunk.map((item) => (
                        <td key={item.question.id}>{item.question.points}</td>
                      ))}
                      {scored.length > 12 &&
                        pad.map((_, i) => <td className="pad" key={i} />)}
                      <td className={isLast ? "total" : "total spacer"}>
                        {isLast && totalPoints}
                      </td>
                    </tr>
                    <tr className="earned">
                      <th>Aldığı</th>
                      {chunk.map((item) => (
                        <td key={item.question.id} />
                      ))}
                      {scored.length > 12 &&
                        pad.map((_, i) => <td className="pad" key={i} />)}
                      <td className={isLast ? "total" : "total spacer"} />
                    </tr>
                  </tbody>
                </table>
              )
            })}
          </div>
        )}
        {design.showSignature && (
          <div className="paper-signature">
            <span className="sig-name">
              {examMeta.teacher?.trim() || "\u00a0"}
            </span>
            <i />
            <span className="sig-role">Ders Öğretmeni</span>
          </div>
        )}
      </div>
    ) : null

  const answerPages = (() => {
    const result: typeof questionItems[] = []
    let page: typeof questionItems = []
    let used = 0

    questionItems.forEach((question) => {
      const answer = question.correctAnswer?.trim() || "—"
      const weight = Math.min(
        4,
        Math.max(
          1,
          question.type === "classic" ? 2 : Math.ceil(answer.length / 65),
        ),
      )
      if (page.length > 0 && used + weight > 14) {
        result.push(page)
        page = []
        used = 0
      }
      page.push(question)
      used += weight
    })

    if (page.length > 0 || result.length === 0) result.push(page)
    return result
  })()

  const answerKeyLogo = ["elegant", "bold", "playful", "academic"].includes(
    design.template,
  )
    ? crest
    : logoCell

  const renderQuestion = (question: Question, index: number) => (
    <div
      data-m="q"
      className={`paper-question ${
        selectedQuestionId === question.id ? "selected" : ""
      } block-${question.type} ${
        isContentType(question.type) ? "is-content" : ""
      }`}
      key={question.id}
      onClick={() => !preview && onSelectQuestion(question.id)}
      role={preview ? undefined : "button"}
      tabIndex={preview ? undefined : 0}
      onKeyDown={(event) => {
        if (!preview && (event.key === "Enter" || event.key === " ")) {
          onSelectQuestion(question.id)
        }
      }}
    >
      {!preview && (
        <div className="question-actions">
          <GripVertical size={16} className="drag-icon" />
          <button
            type="button"
            aria-label="Soruyu yukarı taşı"
            disabled={index === 0}
            onClick={(event) => {
              event.stopPropagation()
              onMove(question.id, -1)
            }}
          >
            <ArrowUp size={14} />
          </button>
          <button
            type="button"
            aria-label="Soruyu aşağı taşı"
            disabled={index === questions.length - 1}
            onClick={(event) => {
              event.stopPropagation()
              onMove(question.id, 1)
            }}
          >
            <ArrowDown size={14} />
          </button>
          <button
            type="button"
            aria-label="Soruyu çoğalt"
            onClick={(event) => {
              event.stopPropagation()
              onDuplicate(question.id)
            }}
          >
            <Copy size={14} />
          </button>
          <button
            type="button"
            aria-label="Soruyu sil"
            onClick={(event) => {
              event.stopPropagation()
              onDelete(question.id)
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
      {isContentType(question.type) ? (
        <ContentBlockView block={question} />
      ) : (
        <div className="question-line">
          <span className="question-number">{numbering[index]}.</span>
          <div className="question-content">
            {question.lead && (
              <p className="question-lead">
                <MathText text={question.lead} />
              </p>
            )}
            {question.image && (
              <img
                className={`question-image size-${question.imageSize ?? "medium"}`}
                src={question.image}
                alt=""
                onLoad={() => setImagesLoaded((count) => count + 1)}
              />
            )}
            <p>
              <MathText text={question.prompt} />
            </p>
            {question.type === "multiple" && question.options && (
              <div
                className={`paper-options ${
                  // Long choices don't fit side by side; stack them.
                  question.options.some(
                    (option) =>
                      option.length > (design.columns === 2 ? 18 : 34),
                  )
                    ? "is-long"
                    : ""
                }`}
              >
                {question.options.map((option, optionIndex) => (
                  <span key={`${question.id}-${optionIndex}`}>
                    <b>{String.fromCharCode(65 + optionIndex)}</b>
                    <MathText text={option} />
                  </span>
                ))}
              </div>
            )}
            {question.type === "trueFalse" && (
              <div className="true-false-options">
                <span>Doğru</span>
                <span>Yanlış</span>
              </div>
            )}
            {question.type === "fillBlank" && (
              <div className="answer-line short" />
            )}
            {question.type === "classic" && (
              <div className="classic-answer-lines">
                <i />
                <i />
                <i />
              </div>
            )}
          </div>
          {design.showPoints && (
            <span className="question-points">({question.points} p.)</span>
          )}
        </div>
      )}
    </div>
  )

  // Measure every block off-screen, then pack blocks into fixed A4 pages.
  const measureRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const [pages, setPages] = useState<PaperPage[]>([
    { cols: [questions.map((_, index) => index)] },
  ])
  const [zoom, setZoom] = useState(1)
  const [fontsReady, setFontsReady] = useState(0)
  // Question images change block heights once loaded; re-measure pages then.
  const [imagesLoaded, setImagesLoaded] = useState(0)

  useEffect(() => {
    document.fonts?.ready.then(() => setFontsReady((value) => value + 1))
  }, [])

  useLayoutEffect(() => {
    const root = measureRef.current
    if (!root) return
    const article = root.querySelector("article")
    if (!article) return
    const outer = (element: Element | null) => {
      if (!element) return 0
      const style = getComputedStyle(element)
      return (
        (element as HTMLElement).offsetHeight +
        parseFloat(style.marginTop) +
        parseFloat(style.marginBottom)
      )
    }
    const articleStyle = getComputedStyle(article)
    const body =
      PAGE_HEIGHT -
      parseFloat(articleStyle.paddingTop) -
      parseFloat(articleStyle.paddingBottom)
    const column = root.querySelector(".paper-col")
    const gap = column ? parseFloat(getComputedStyle(column).rowGap) || 0 : 0
    const heights = Array.from(root.querySelectorAll("[data-m='q']")).map(outer)
    const columnCount = design.columns === 2 ? 2 : 1
    const emptyCols = () =>
      Array.from({ length: columnCount }, () => [] as number[])

    const result: PaperPage[] = []
    let current: PaperPage = { cols: emptyCols() }
    let used = Array(columnCount).fill(0) as number[]
    let col = 0
    let capacity = body - outer(root.querySelector("[data-m='header']"))
    const runningCapacity =
      body - outer(root.querySelector("[data-m='running']"))

    heights.forEach((height, index) => {
      let need = used[col] === 0 ? height : height + gap
      if (used[col] > 0 && used[col] + need > capacity) {
        if (col < columnCount - 1) {
          col += 1
        } else {
          result.push(current)
          current = { cols: emptyCols() }
          used = Array(columnCount).fill(0)
          col = 0
          capacity = runningCapacity
        }
        need = height
      }
      current.cols[col].push(index)
      used[col] += need
    })

    // The closing block (score table + signature) sits below every column of
    // the last page; start a fresh page when it doesn't fit.
    const closingHeight = outer(root.querySelector("[data-m='closing']"))
    if (closingHeight > 0 && heights.length > 0) {
      const lastUsed = Math.max(...used)
      if (lastUsed + closingHeight > capacity) {
        result.push(current)
        current = { cols: emptyCols() }
      }
    }

    result.push(current)

    setPages((previous) =>
      JSON.stringify(previous) === JSON.stringify(result) ? previous : result,
    )
  }, [questions, design, examMeta, totalPoints, fontsReady, imagesLoaded])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const observer = new ResizeObserver(([entry]) => {
      setZoom(Math.min(1, entry.contentRect.width / PAGE_WIDTH))
    })
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [])

  const renderColumns = (cols: number[][]) => (
    <div className="paper-questions">
      {cols.map((indices, colIndex) => (
        <div className="paper-col" key={colIndex}>
          {/* Page layout is measured after render, so it can briefly hold
              indices of just-deleted questions; skip those. */}
          {indices
            .filter((index) => index < questions.length)
            .map((index) => renderQuestion(questions[index], index))}
        </div>
      ))}
    </div>
  )

  return (
    <div className="paper-viewport" ref={viewportRef}>
      <div className="paper-stack" style={{ zoom }}>
        {pages.slice(0, maxPages).map((page, pageIndex) => (
          <div className="paper-page-wrap" key={pageIndex}>
            <div className="page-label">
              Sayfa {pageIndex + 1} / {pages.length}
            </div>
            <article className={paperClass} style={paperStyle} lang="tr">
              {watermark}
              {pageIndex === 0 ? header : runningHead}
              {questions.length === 0
                ? pageIndex === 0 && (
                    <div className="paper-questions">
                      <div className="paper-empty">
                        <FileText size={28} />
                        <strong>Henüz soru eklenmedi</strong>
                        <span>
                          Sol panelden bir soru türü seçerek başlayın.
                        </span>
                      </div>
                    </div>
                  )
                : renderColumns(page.cols)}
              {pageIndex === pages.length - 1 && closing}
              <footer className="paper-footer">
                <span>
                  {design.template === "lgs" && pageIndex < pages.length - 1
                    ? "Diğer sayfaya geçiniz."
                    : design.footerNote}
                </span>
                <span>
                  {pageIndex + 1} / {pages.length}
                </span>
              </footer>
            </article>
          </div>
        ))}

        {showAnswerKey &&
          !maxPages &&
          answerPages.map((answerPage, answerPageIndex) => (
            <div className="paper-page-wrap" key={`answers-${answerPageIndex}`}>
              <div className="page-label">
                Cevap anahtarı {answerPageIndex + 1} / {answerPages.length}
              </div>
              <article
                className={`${paperClass} answer-key-paper`}
                style={paperStyle}
                lang="tr"
              >
                {watermark}
                <header className="answer-key-header">
                  {answerKeyLogo && (
                    <div className="answer-key-logo">{answerKeyLogo}</div>
                  )}
                  <div className="answer-key-title">
                    {design.showSchoolHeader && <span>{examMeta.school}</span>}
                    <h1>Cevap Anahtarı</h1>
                    <p>
                      {examMeta.subject} · {examMeta.topic} · {examMeta.grade}
                    </p>
                  </div>
                  <div className="answer-key-meta">
                    <span>{examLabel}</span>
                    <b>{questionItems.length} soru</b>
                    <strong>{totalPoints} puan</strong>
                  </div>
                </header>

                <div className="answer-key-list">
                  {answerPage.length === 0 ? (
                    <div className="answer-key-empty">
                      Cevabı gösterilecek soru bulunmuyor.
                    </div>
                  ) : (
                    answerPage.map((question) => {
                      const questionIndex = questionItems.findIndex(
                        (item) => item.id === question.id,
                      )
                      const answer = question.correctAnswer?.trim() || "—"
                      const isLong =
                        question.type === "classic" || answer.length > 45
                      return (
                        <div
                          className={`answer-key-item ${
                            isLong ? "is-long" : ""
                          }`}
                          key={question.id}
                        >
                          <span className="answer-key-number">
                            {questionIndex + 1}
                          </span>
                          <div className="answer-key-content">
                            <small>{questionTypeLabels[question.type]}</small>
                            <p>
                              <MathText text={answer} />
                            </p>
                          </div>
                          <strong>{question.points} p</strong>
                        </div>
                      )
                    })
                  )}
                </div>

                {answerPageIndex === answerPages.length - 1 && (
                  <div className="answer-key-summary">
                    <span>Toplam değerlendirme puanı</span>
                    <strong>{totalPoints}</strong>
                  </div>
                )}

                <footer className="paper-footer answer-key-footer">
                  <span>Öğretmen nüshası · {yearLabel}</span>
                  <span>
                    Cevap anahtarı {answerPageIndex + 1} / {answerPages.length}
                  </span>
                </footer>
              </article>
            </div>
          ))}
      </div>

      <div className="paper-measure" ref={measureRef} aria-hidden="true" inert>
        <article className={paperClass} style={paperStyle} lang="tr">
          <div data-m="header">{header}</div>
          <div data-m="running">{runningHead}</div>
          <div className="paper-questions">
            <div className="paper-col">
              {questions.map((question, index) =>
                renderQuestion(question, index),
              )}
            </div>
          </div>
          {closing && <div data-m="closing">{closing}</div>}
        </article>
      </div>
    </div>
  )
}

function FormField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="form-field">
      <span>{label}</span>
      {children}
    </label>
  )
}

function ChoiceGroup<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T
  options: {
    value: T
    label: string
  }[]
  onChange: (value: T) => void
}) {
  return (
    <div className="segmented-control" data-count={options.length}>
      {options.map((option) => (
        <button
          className={value === option.value ? "active" : ""}
          key={String(option.value)}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="toggle-row compact">
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <i />
    </label>
  )
}

const templateOptions: {
  value: PaperDesign["template"]
  label: string
  description: string
}[] = [
  {
    value: "classic",
    label: "MEB yazılı",
    description: "Bilgi tablosu, puan kutusu",
  },
  { value: "lgs", label: "LGS test", description: "Başlık bandı, çift sütun" },
  { value: "minimal", label: "Sade", description: "Çalışma kâğıdı düzeni" },
  {
    value: "elegant",
    label: "Zarif",
    description: "Ortalı arma, serif başlık",
  },
  { value: "bold", label: "Kurumsal", description: "Koyu başlık bandı" },
  { value: "playful", label: "Etkinlik", description: "Yuvarlak, renkli kart" },
  { value: "academic", label: "Akademik", description: "Logo + bilgi tablosu" },
]

function ContentBlockView({ block }: { block: Question }) {
  if (block.type === "section") {
    return (
      <h3 className="block-section-title">
        <MathText text={block.prompt} />
      </h3>
    )
  }

  if (block.type === "formula") {
    return (
      <div className="formula-block">
        {block.title && <span className="block-label">{block.title}</span>}
        <div className="formula-display">
          <MathText text={block.formula ?? ""} />
        </div>
        {block.prompt && (
          <p>
            <MathText text={block.prompt} />
          </p>
        )}
      </div>
    )
  }

  if (block.type === "info") {
    const variant = block.variant ?? "Bilgi"
    return (
      <aside className={`info-block info-${variant}`}>
        <span className="info-badge">
          {variant === "Dikkat" ? "!" : variant === "Bilgi" ? "i" : "★"}
        </span>
        <div>
          <strong>{block.title || variant}</strong>
          <p>
            <MathText text={block.prompt} />
          </p>
        </div>
      </aside>
    )
  }

  if (block.type === "example") {
    return (
      <div className="example-block">
        <span className="block-label">{block.title || "Örnek"}</span>
        <p>
          <MathText text={block.prompt} />
        </p>
        {block.correctAnswer && (
          <div className="example-solution">
            <b>Çözüm:</b> <MathText text={block.correctAnswer} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="text-block">
      {block.title && <h4>{block.title}</h4>}
      {block.prompt.split("\n").map((paragraph, index) => (
        <p key={index}>
          <MathText text={paragraph} />
        </p>
      ))}
    </div>
  )
}

const formulaSnippets = [
  { label: "Kesir", value: "[a/b]" },
  { label: "Üs", value: "x^2" },
  { label: "Alt indis", value: "a_1" },
  { label: "Kök", value: "√{x}" },
  { label: "·", value: " · " },
  { label: "÷", value: " ÷ " },
  { label: "≤", value: " ≤ " },
  { label: "≥", value: " ≥ " },
  { label: "≠", value: " ≠ " },
  { label: "π", value: "π" },
  { label: "⇒", value: "  ⇒  " },
]

const formulaLibrary = [
  { name: "Orantı", formula: "[a/b] = [c/d]  ⇒  a · d = b · c" },
  { name: "Yüzde", formula: "Yüzde değer = [Sayı · Yüzde/100]" },
  { name: "Dikdörtgen alanı", formula: "A = a · b" },
  { name: "Dairenin alanı", formula: "A = π · r^2" },
  { name: "Çemberin çevresi", formula: "Ç = 2 · π · r" },
  { name: "Pisagor", formula: "a^2 + b^2 = c^2" },
  { name: "Ortalama", formula: "x̄ = [x_1 + x_2 + … + x_n/n]" },
]

function ContentInspector({
  block,
  onUpdate,
  onDelete,
}: {
  block: Question
  onUpdate: (updates: Partial<Question>) => void
  onDelete: () => void
}) {
  const formulaRef = useRef<HTMLInputElement>(null)

  const insertSnippet = (snippet: string) => {
    const input = formulaRef.current
    const current = block.formula ?? ""
    const start = input?.selectionStart ?? current.length
    const end = input?.selectionEnd ?? current.length
    const next = current.slice(0, start) + snippet + current.slice(end)
    onUpdate({ formula: next })
    requestAnimationFrame(() => {
      input?.focus()
      input?.setSelectionRange(start + snippet.length, start + snippet.length)
    })
  }

  return (
    <div className="inspector-content">
      <div className="block-type-pill">
        <TypeIcon type={block.type} />
        <span>{questionTypeLabels[block.type]}</span>
      </div>

      {block.type === "section" && (
        <FormField label="Bölüm yönergesi">
          <textarea
            rows={3}
            value={block.prompt}
            onChange={(event) => onUpdate({ prompt: event.target.value })}
          />
        </FormField>
      )}

      {block.type === "info" && (
        <FormField label="Kutu türü">
          <ChoiceGroup<InfoVariant>
            value={block.variant ?? "Bilgi"}
            options={[
              { value: "Bilgi", label: "Bilgi" },
              { value: "Hatırlatma", label: "Hatırlatma" },
              { value: "Dikkat", label: "Dikkat" },
            ]}
            onChange={(variant) =>
              onUpdate({
                variant,
                title:
                  !block.title ||
                  ["Bilgi", "Hatırlatma", "Dikkat"].includes(block.title)
                    ? variant
                    : block.title,
              })
            }
          />
        </FormField>
      )}

      {block.type !== "section" && (
        <FormField label="Başlık">
          <input
            value={block.title ?? ""}
            onChange={(event) => onUpdate({ title: event.target.value })}
          />
        </FormField>
      )}

      {block.type === "formula" && (
        <>
          <FormField label="Formül">
            <input
              className="formula-input"
              ref={formulaRef}
              value={block.formula ?? ""}
              onChange={(event) => onUpdate({ formula: event.target.value })}
            />
          </FormField>
          <div className="snippet-row" aria-label="Sembol ekle">
            {formulaSnippets.map((snippet) => (
              <button
                key={snippet.label}
                type="button"
                onClick={() => insertSnippet(snippet.value)}
              >
                {snippet.label}
              </button>
            ))}
          </div>
          <div className="formula-preview">
            <span>Önizleme</span>
            <div className="formula-display">
              <MathText text={block.formula ?? ""} />
            </div>
          </div>
          <div className="design-group">
            <span className="group-label">Formül kütüphanesi</span>
            <div className="formula-library">
              {formulaLibrary.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() =>
                    onUpdate({ formula: item.formula, title: item.name })
                  }
                >
                  <strong>{item.name}</strong>
                  <span>
                    <MathText text={item.formula} />
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {block.type !== "section" && (
        <FormField
          label={
            block.type === "formula"
              ? "Açıklama"
              : block.type === "example"
                ? "Örnek soru"
                : "Metin"
          }
        >
          <MathInput
            multiline
            rows={block.type === "text" ? 8 : 4}
            value={block.prompt}
            onChange={(prompt) => onUpdate({ prompt })}
          />
        </FormField>
      )}

      {block.type === "example" && (
        <FormField label="Çözüm">
          <MathInput
            multiline
            rows={3}
            label="Çözüm"
            value={block.correctAnswer}
            onChange={(correctAnswer) => onUpdate({ correctAnswer })}
          />
        </FormField>
      )}

      {block.type === "text" && (
        <p className="math-hint">Yeni paragraf için satır başı yapın.</p>
      )}

      <button
        className="delete-question-button"
        type="button"
        onClick={onDelete}
      >
        <Trash2 size={17} />
        Bloğu sil
      </button>
    </div>
  )
}

function LogoWatermarkFields({
  design,
  onUpdate,
}: {
  design: PaperDesign
  onUpdate: (updates: Partial<PaperDesign>) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const readLogo = (file?: File) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => onUpdate({ logo: String(reader.result) })
    reader.readAsDataURL(file)
  }

  return (
    <div className="design-group">
      <span className="group-label">Logo ve filigran</span>
      <div className="logo-picker">
        <div className="logo-preview">
          {design.logo ? (
            <img src={design.logo} alt="Yüklenen logo" />
          ) : (
            <ImageIcon size={18} />
          )}
        </div>
        <div>
          <button
            className="button button-secondary"
            type="button"
            onClick={() => fileRef.current?.click()}
          >
            <UploadCloud size={14} />
            {design.logo ? "Değiştir" : "Logo yükle"}
          </button>
          {design.logo && (
            <button
              className="link-remove"
              type="button"
              onClick={() =>
                onUpdate({
                  logo: "",
                  watermark:
                    design.watermark === "logo" ? "none" : design.watermark,
                })
              }
            >
              Kaldır
            </button>
          )}
          <small>Şeffaf PNG · arka plan ve çerçeve eklenmez</small>
        </div>
        <input
          ref={fileRef}
          className="sr-only"
          type="file"
          accept="image/png,.png"
          onChange={(event) => {
            readLogo(event.target.files?.[0])
            event.target.value = ""
          }}
        />
      </div>
      <FormField label="Logo boyutu">
        <ChoiceGroup
          value={design.logoSize}
          options={[
            { value: "small", label: "S" },
            { value: "medium", label: "M" },
            { value: "large", label: "L" },
          ]}
          onChange={(logoSize) => onUpdate({ logoSize })}
        />
      </FormField>
      <span className="group-label">Filigran</span>
      <ChoiceGroup
        value={design.watermark}
        options={[
          { value: "none", label: "Filigran yok" },
          { value: "text", label: "Yazı" },
          { value: "logo", label: "Logo" },
        ]}
        onChange={(watermark) => {
          if (watermark === "logo" && !design.logo) {
            fileRef.current?.click()
          }
          onUpdate({ watermark })
        }}
      />
      {design.watermark === "text" && (
        <input
          className="watermark-input"
          value={design.watermarkText}
          maxLength={24}
          aria-label="Filigran yazısı"
          onChange={(event) => onUpdate({ watermarkText: event.target.value })}
        />
      )}
      {design.watermark !== "none" && (
        <label className="range-field">
          <span>Görünürlük</span>
          <input
            type="range"
            min={3}
            max={25}
            value={design.watermarkOpacity}
            onChange={(event) =>
              onUpdate({ watermarkOpacity: Number(event.target.value) })
            }
          />
          <b>%{design.watermarkOpacity}</b>
        </label>
      )}
    </div>
  )
}

function DesignInspector({
  design,
  onUpdate,
  onReset,
}: {
  design: PaperDesign
  onUpdate: (updates: Partial<PaperDesign>) => void
  onReset: () => void
}) {
  return (
    <div className="inspector-content">
      <div className="design-group">
        <span className="group-label">Şablon</span>
        <div className="template-grid">
          {templateOptions.map((option) => (
            <button
              className={`template-card ${
                design.template === option.value ? "active" : ""
              }`}
              key={option.value}
              type="button"
              aria-pressed={design.template === option.value}
              onClick={() => onUpdate({ template: option.value })}
            >
              <span className={`template-thumb thumb-${option.value}`}>
                <i />
                <i />
                <i />
                <i />
              </span>
              <strong>{option.label}</strong>
              <small>{option.description}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="design-group">
        <span className="group-label">Vurgu rengi</span>
        <div className="swatches">
          {accentOptions.map((color) => (
            <button
              className={design.accent === color ? "active" : ""}
              key={color}
              type="button"
              aria-label={`Vurgu rengi ${color}`}
              aria-pressed={design.accent === color}
              style={{ background: color }}
              onClick={() => onUpdate({ accent: color })}
            >
              {design.accent === color && <Check size={13} />}
            </button>
          ))}
          <label
            className={`swatch-custom ${
              accentOptions.includes(design.accent) ? "" : "active"
            }`}
            title="Özel renk"
          >
            <input
              type="color"
              value={design.accent}
              aria-label="Özel vurgu rengi"
              onChange={(event) => onUpdate({ accent: event.target.value })}
            />
          </label>
        </div>
      </div>

      <FormField label="Yazı boyutu">
        <ChoiceGroup
          value={design.fontSize}
          options={[
            { value: "small", label: "Küçük" },
            { value: "normal", label: "Normal" },
            { value: "large", label: "Büyük" },
          ]}
          onChange={(fontSize) => onUpdate({ fontSize })}
        />
      </FormField>
      <FormField label="Satır aralığı">
        <ChoiceGroup
          value={design.spacing}
          options={[
            { value: "compact", label: "Sıkı" },
            { value: "normal", label: "Normal" },
            { value: "relaxed", label: "Geniş" },
          ]}
          onChange={(spacing) => onUpdate({ spacing })}
        />
      </FormField>
      <div className="form-row">
        <FormField label="Sütun">
          <ChoiceGroup
            value={design.columns}
            options={[
              { value: 1, label: "Tek" },
              { value: 2, label: "Çift" },
            ]}
            onChange={(columns) => onUpdate({ columns })}
          />
        </FormField>
        <FormField label="Şıklar">
          <ChoiceGroup
            value={design.optionLayout}
            options={[
              { value: "grid", label: "Izgara" },
              { value: "list", label: "Alt alta" },
            ]}
            onChange={(optionLayout) => onUpdate({ optionLayout })}
          />
        </FormField>
      </div>

      <FormField label="Yazı tipi">
        <Dropdown<PaperDesign["fontFamily"]>
          label="Yazı tipi"
          value={design.fontFamily}
          options={fontOptions.map((font) => ({
            value: font.value,
            label: font.label,
            icon: <span className={`font-sample font-${font.value}`}>Aa</span>,
          }))}
          onChange={(fontFamily) => onUpdate({ fontFamily })}
        />
      </FormField>
      <FormField label="Soru numarası">
        <ChoiceGroup
          value={design.numberStyle}
          options={[
            { value: "plain", label: "1." },
            { value: "circle", label: "Daire" },
            { value: "box", label: "Kutu" },
          ]}
          onChange={(numberStyle) => onUpdate({ numberStyle })}
        />
      </FormField>
      <FormField label="Sayfa çerçevesi">
        <ChoiceGroup
          value={design.pageBorder}
          options={[
            { value: "none", label: "Yok" },
            { value: "thin", label: "İnce" },
            { value: "double", label: "Çift" },
          ]}
          onChange={(pageBorder) => onUpdate({ pageBorder })}
        />
      </FormField>

      <label className="range-field margin-field">
        <span>Kenar boşluğu</span>
        <input
          type="range"
          min={8}
          max={25}
          value={design.margin}
          onChange={(event) => onUpdate({ margin: Number(event.target.value) })}
        />
        <b>{design.margin} mm</b>
      </label>

      <div className="design-group toggles">
        <span className="group-label">Kâğıt öğeleri</span>
        <ToggleRow
          title="Soru ayırıcı çizgiler"
          description="Sorular arasında ince çizgi"
          checked={design.dividers}
          onChange={(dividers) => onUpdate({ dividers })}
        />
        <ToggleRow
          title="Okul başlığı"
          description="T.C., okul adı ve öğretim yılı"
          checked={design.showSchoolHeader}
          onChange={(showSchoolHeader) => onUpdate({ showSchoolHeader })}
        />
        <ToggleRow
          title="Öğrenci bilgi kutusu"
          description="Ad, sınıf, tarih ve süre alanı"
          checked={design.showStudentBox}
          onChange={(showStudentBox) => onUpdate({ showStudentBox })}
        />
        <ToggleRow
          title="Soru puanları"
          description="Her sorunun yanında puan"
          checked={design.showPoints}
          onChange={(showPoints) => onUpdate({ showPoints })}
        />
        <ToggleRow
          title="Puan tablosu"
          description="Son sayfada soru bazlı puan çizelgesi"
          checked={design.showScoreTable}
          onChange={(showScoreTable) => onUpdate({ showScoreTable })}
        />
        <ToggleRow
          title="Öğretmen imzası"
          description="Son sayfada ad ve imza alanı"
          checked={design.showSignature}
          onChange={(showSignature) => onUpdate({ showSignature })}
        />
      </div>

      <div className="design-group">
        <span className="group-label">Kitapçık türü</span>
        <ChoiceGroup<PaperDesign["booklet"]>
          value={design.booklet}
          options={[
            { value: "none", label: "Yok" },
            { value: "A", label: "A" },
            { value: "B", label: "B" },
          ]}
          onChange={(booklet) => onUpdate({ booklet })}
        />
      </div>

      <LogoWatermarkFields design={design} onUpdate={onUpdate} />

      <FormField label="Alt bilgi notu">
        <input
          value={design.footerNote}
          onChange={(event) => onUpdate({ footerNote: event.target.value })}
        />
      </FormField>

      <button className="reset-design-button" type="button" onClick={onReset}>
        Varsayılan tasarıma dön
      </button>
    </div>
  )
}

const recentExams = [
  {
    title: "7. Sınıf Matematik — Oran ve Orantı",
    meta: "4 soru · 80 puan",
    date: "Bugün",
    status: "Taslak",
  },
  {
    title: "7/B Tam Sayılarla İşlemler Yazılısı",
    meta: "12 soru · 100 puan",
    date: "Dün",
    status: "Hazır",
  },
  {
    title: "Rasyonel Sayılar Kısa Sınav",
    meta: "8 soru · 50 puan",
    date: "12 Mayıs",
    status: "Yazdırıldı",
  },
  {
    title: "Cebirsel İfadeler Çalışma Kâğıdı",
    meta: "10 soru · 100 puan",
    date: "8 Mayıs",
    status: "Hazır",
  },
]

function HomeView({
  onMenu,
  onNewExam,
  onPdf,
  onTemplate,
  onOpenExam,
  onAllExams,
}: {
  onMenu: () => void
  onNewExam: () => void
  onPdf: () => void
  onTemplate: () => void
  onOpenExam: () => void
  onAllExams: () => void
}) {
  return (
    <div className="home-view">
      <header className="home-topbar">
        <button
          className="icon-button mobile-menu"
          type="button"
          aria-label="Menüyü aç"
          onClick={onMenu}
        >
          <Menu size={20} />
        </button>
        <TopbarTitle title="Ana sayfa" />
        <label className="home-search">
          <Search size={16} />
          <input placeholder="Sınav veya soru ara" aria-label="Ara" />
        </label>
        <TopbarTools />
      </header>

      <div className="home-scroll">
        <section className="home-hero">
          <div>
            <p className="eyebrow">Hoş geldin, Selin Hoca</p>
            <h1>Bugün hangi sınavı hazırlıyoruz?</h1>
            <p>
              Sorularını ekle, kâğıt tasarımını seç ve dakikalar içinde
              yazdırmaya hazır bir sınav oluştur.
            </p>
            <div className="hero-actions">
              <button
                className="button button-primary large"
                type="button"
                onClick={onNewExam}
              >
                <Plus size={18} />
                Yeni sınav oluştur
              </button>
              <button
                className="button button-secondary large"
                type="button"
                onClick={onPdf}
              >
                <UploadCloud size={18} />
                PDF'den aktar
              </button>
            </div>
          </div>
          <div className="hero-paper" aria-hidden="true">
            <div className="hero-sheet back" />
            <div className="hero-sheet">
              <span className="sheet-title" />
              <span className="sheet-sub" />
              <span className="sheet-box" />
              {[0, 1, 2].map((row) => (
                <div className="sheet-question" key={row}>
                  <b>{row + 1}.</b>
                  <span />
                  <span className="short" />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="quick-actions" aria-label="Hızlı başlangıç">
          <button type="button" onClick={onNewExam}>
            <span className="qa-icon">
              <FileText size={20} />
            </span>
            <strong>Boş sınav</strong>
            <small>Sıfırdan soru ekleyerek başla</small>
            <ChevronRight size={17} />
          </button>
          <button type="button" onClick={onPdf}>
            <span className="qa-icon">
              <ScanLine size={20} />
            </span>
            <strong>PDF'den soru al</strong>
            <small>Mevcut dokümandan soruları seç</small>
            <ChevronRight size={17} />
          </button>
          <button type="button" onClick={onTemplate}>
            <span className="qa-icon">
              <Palette size={20} />
            </span>
            <strong>Kâğıt şablonu seç</strong>
            <small>Klasik, modern veya sade tasarım</small>
            <ChevronRight size={17} />
          </button>
        </section>

        <div className="home-grid">
          <section className="home-card recent-card">
            <div className="home-card-header">
              <h2>Son sınavlar</h2>
              <button type="button" onClick={onAllExams}>
                Tümünü gör
              </button>
            </div>
            <ul>
              {recentExams.map((exam) => (
                <li key={exam.title}>
                  <button type="button" onClick={onOpenExam}>
                    <span className="recent-icon">
                      <FileText size={17} />
                    </span>
                    <span className="recent-text">
                      <strong>{exam.title}</strong>
                      <small>{exam.meta}</small>
                    </span>
                    <span className={`status status-${exam.status}`}>
                      {exam.status}
                    </span>
                    <span className="recent-date">{exam.date}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <aside className="home-side">
            <section className="home-card stats-card">
              <h2>Bu ay</h2>
              <div className="stats">
                <div>
                  <strong>12</strong>
                  <span>Hazırlanan sınav</span>
                </div>
                <div>
                  <strong>248</strong>
                  <span>Soru havuzunda</span>
                </div>
                <div>
                  <strong>9 dk</strong>
                  <span>Ortalama hazırlık</span>
                </div>
              </div>
            </section>
            <section className="home-card tip-card">
              <Sparkles size={18} />
              <div>
                <strong>İpucu</strong>
                <p>
                  Editörde “Kâğıt tasarımı” ile şablon, yazı boyutu ve sütun
                  düzenini tek tıkla değiştirebilirsin.
                </p>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}

function ExamInspector({
  examMeta,
  showAnswerKey,
  onUpdate,
  onToggleAnswerKey,
}: {
  examMeta: ExamMeta
  showAnswerKey: boolean
  onUpdate: (updates: Partial<ExamMeta>) => void
  onToggleAnswerKey: (value: boolean) => void
}) {
  return (
    <div className="inspector-content">
      <div className="info-callout">
        <Sparkles size={17} />
        <p>Buradaki değişiklikler sınav kâğıdına anında yansır.</p>
      </div>
      <FormField label="Sınav başlığı">
        <input
          value={examMeta.title}
          onChange={(event) => onUpdate({ title: event.target.value })}
        />
      </FormField>
      <FormField label="Okul adı">
        <input
          value={examMeta.school}
          onChange={(event) => onUpdate({ school: event.target.value })}
        />
      </FormField>
      <div className="form-row">
        <FormField label="Sınıf">
          <input
            value={examMeta.grade}
            onChange={(event) => onUpdate({ grade: event.target.value })}
          />
        </FormField>
        <FormField label="Süre">
          <div className="suffix-input">
            <input
              min="1"
              type="number"
              value={examMeta.duration}
              onChange={(event) =>
                onUpdate({ duration: Number(event.target.value) })
              }
            />
            <span>dk.</span>
          </div>
        </FormField>
      </div>
      <FormField label="Ders">
        <input
          value={examMeta.subject}
          onChange={(event) => onUpdate({ subject: event.target.value })}
        />
      </FormField>
      <FormField label="Konu">
        <input
          value={examMeta.topic}
          onChange={(event) => onUpdate({ topic: event.target.value })}
        />
      </FormField>
      <FormField label="Tarih">
        <input
          value={examMeta.date}
          onChange={(event) => onUpdate({ date: event.target.value })}
        />
      </FormField>
      <FormField label="Öğretim yılı">
        <input
          value={examMeta.academicYear}
          placeholder="2024–2025"
          onChange={(event) => onUpdate({ academicYear: event.target.value })}
        />
      </FormField>
      <div className="form-row">
        <FormField label="Dönem">
          <Dropdown<ExamMeta["term"]>
            label="Dönem"
            value={examMeta.term}
            options={[
              { value: "1", label: "1. Dönem" },
              { value: "2", label: "2. Dönem" },
            ]}
            onChange={(term) => onUpdate({ term })}
          />
        </FormField>
        <FormField label="Yazılı">
          <Dropdown<ExamMeta["examNo"]>
            label="Yazılı"
            value={examMeta.examNo}
            options={[
              { value: "1", label: "1. Yazılı" },
              { value: "2", label: "2. Yazılı" },
              { value: "3", label: "3. Yazılı" },
            ]}
            onChange={(examNo) => onUpdate({ examNo })}
          />
        </FormField>
      </div>
      <FormField label="Ders öğretmeni">
        <input
          value={examMeta.teacher}
          placeholder="Ad Soyad (imza alanında görünür)"
          onChange={(event) => onUpdate({ teacher: event.target.value })}
        />
      </FormField>
      <label className="toggle-row">
        <span>
          <strong>Cevap anahtarı sayfası</strong>
          <small>Şablona uygun öğretmen nüshasını çıktının sonuna ekle</small>
        </span>
        <input
          type="checkbox"
          checked={showAnswerKey}
          onChange={(event) => onToggleAnswerKey(event.target.checked)}
        />
        <i />
      </label>
    </div>
  )
}

function QuestionLeadFields({
  question,
  onUpdate,
}: {
  question: Question
  onUpdate: (updates: Partial<Question>) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const hasLead = question.lead !== undefined
  const readImage = (file?: File) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => onUpdate({ image: String(reader.result) })
    reader.readAsDataURL(file)
  }

  return (
    <div className="question-lead-fields">
      {hasLead && (
        <div className="form-field">
          <span className="field-head">
            Giriş metni (öncül)
            <button
              className="link-remove"
              type="button"
              onClick={() => onUpdate({ lead: undefined })}
            >
              Kaldır
            </button>
          </span>
          <MathInput
            multiline
            rows={4}
            label="Giriş metni"
            value={question.lead ?? ""}
            onChange={(lead) => onUpdate({ lead })}
          />
          <small className="field-hint">
            Sorudan önce okunacak metin: okuma parçası, senaryo veya öncüller.
          </small>
        </div>
      )}

      {question.image && (
        <div className="form-field">
          <span className="field-head">
            Soru görseli
            <button
              className="link-remove"
              type="button"
              onClick={() =>
                onUpdate({ image: undefined, imageSize: undefined })
              }
            >
              Kaldır
            </button>
          </span>
          <div className="question-image-preview">
            <img src={question.image} alt="Soru görseli önizlemesi" />
            <button
              className="button button-secondary"
              type="button"
              onClick={() => fileRef.current?.click()}
            >
              <UploadCloud size={14} />
              Değiştir
            </button>
          </div>
          <ChoiceGroup
            value={question.imageSize ?? "medium"}
            options={[
              { value: "small", label: "Küçük" },
              { value: "medium", label: "Orta" },
              { value: "full", label: "Tam" },
            ]}
            onChange={(imageSize) => onUpdate({ imageSize })}
          />
        </div>
      )}

      {(!hasLead || !question.image) && (
        <div className="lead-add-row">
          {!hasLead && (
            <button
              className="lead-add-button"
              type="button"
              onClick={() => onUpdate({ lead: "" })}
            >
              <Plus size={13} />
              Giriş metni
            </button>
          )}
          {!question.image && (
            <button
              className="lead-add-button"
              type="button"
              onClick={() => fileRef.current?.click()}
            >
              <ImageIcon size={13} />
              Görsel ekle
            </button>
          )}
        </div>
      )}

      <input
        ref={fileRef}
        className="sr-only"
        type="file"
        accept="image/*"
        onChange={(event) => {
          readImage(event.target.files?.[0])
          event.target.value = ""
        }}
      />
    </div>
  )
}

function QuestionInspector({
  question,
  onUpdate,
  onUpdateOption,
  onDelete,
}: {
  question: Question
  onUpdate: (updates: Partial<Question>) => void
  onUpdateOption: (index: number, value: string) => void
  onDelete: () => void
}) {
  return (
    <div className="inspector-content">
      <FormField label="Soru türü">
        <Dropdown
          label="Soru türü"
          value={question.type}
          options={questionKinds.map((type) => ({
            value: type,
            label: questionTypeLabels[type],
            icon: <TypeIcon type={type} />,
          }))}
          onChange={(type) =>
            onUpdate({
              type,
              options:
                type === "multiple"
                  ? (question.options ?? [
                      "A seçeneği",
                      "B seçeneği",
                      "C seçeneği",
                      "D seçeneği",
                    ])
                  : undefined,
            })
          }
        />
      </FormField>

      <QuestionLeadFields question={question} onUpdate={onUpdate} />

      <FormField label="Soru metni">
        <MathInput
          multiline
          rows={5}
          label="Soru metni"
          value={question.prompt}
          onChange={(prompt) => onUpdate({ prompt })}
        />
      </FormField>

      {question.type === "multiple" && question.options && (
        <fieldset className="options-fieldset">
          <legend>
            Seçenekler
            <small>Doğru cevabı soldaki daireden seçin</small>
          </legend>
          {question.options.map((option, index) => {
            const letter = String.fromCharCode(65 + index)
            return (
              <div
                className={`option-row ${
                  question.correctAnswer === letter ? "is-correct" : ""
                }`}
                key={index}
              >
                <label
                  className="option-radio"
                  title="Doğru cevap olarak işaretle"
                >
                  <input
                    name="correct-answer"
                    type="radio"
                    checked={question.correctAnswer === letter}
                    onChange={() => onUpdate({ correctAnswer: letter })}
                  />
                  <span>{letter}</span>
                </label>
                <MathInput
                  compact
                  label={`${letter} seçeneği`}
                  value={option}
                  onChange={(value) => onUpdateOption(index, value)}
                />
                <button
                  className="option-remove"
                  type="button"
                  aria-label={`${letter} seçeneğini sil`}
                  disabled={question.options!.length <= 2}
                  onClick={() => {
                    const options = question.options!.filter(
                      (_, i) => i !== index,
                    )
                    const correct = question.correctAnswer.charCodeAt(0) - 65
                    const nextCorrect =
                      correct === index
                        ? "A"
                        : correct > index
                          ? String.fromCharCode(64 + correct)
                          : question.correctAnswer
                    onUpdate({ options, correctAnswer: nextCorrect })
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            )
          })}
          {question.options.length < 8 && (
            <button
              className="option-add"
              type="button"
              onClick={() =>
                onUpdate({
                  options: [
                    ...question.options!,
                    `${String.fromCharCode(65 + question.options!.length)} seçeneği`,
                  ],
                })
              }
            >
              <Plus size={14} />
              Seçenek ekle
              <span>{question.options.length} / 8</span>
            </button>
          )}
        </fieldset>
      )}

      {question.type === "trueFalse" ? (
        <FormField label="Doğru cevap">
          <div className="segmented-control">
            {["Doğru", "Yanlış"].map((answer) => (
              <button
                className={question.correctAnswer === answer ? "active" : ""}
                key={answer}
                type="button"
                onClick={() => onUpdate({ correctAnswer: answer })}
              >
                {answer}
              </button>
            ))}
          </div>
        </FormField>
      ) : (
        question.type !== "multiple" && (
          <FormField label="Örnek cevap">
            <MathInput
              multiline
              rows={3}
              label="Örnek cevap"
              value={question.correctAnswer}
              onChange={(correctAnswer) => onUpdate({ correctAnswer })}
            />
          </FormField>
        )
      )}

      <div className="form-row">
        <FormField label="Puan">
          <input
            min="0"
            type="number"
            value={question.points}
            onChange={(event) =>
              onUpdate({ points: Number(event.target.value) })
            }
          />
        </FormField>
        <FormField label="Zorluk">
          <Dropdown<Difficulty>
            label="Zorluk"
            value={question.difficulty}
            options={(["Kolay", "Orta", "Zor"] as Difficulty[]).map(
              (level) => ({
                value: level,
                label: level,
                icon: <span className={`dropdown-dot dot-${level}`} />,
              }),
            )}
            onChange={(difficulty) => onUpdate({ difficulty })}
          />
        </FormField>
      </div>

      <button
        className="delete-question-button"
        type="button"
        onClick={onDelete}
      >
        <Trash2 size={17} />
        Soruyu sil
      </button>
    </div>
  )
}

type PdfModalProps = {
  step: PdfStep
  fileName: string
  error: string
  selected: number[]
  closeRef: React.RefObject<HTMLButtonElement | null>
  onClose: () => void
  onFile: (file?: File) => void
  onSelectedChange: (indexes: number[]) => void
  onImport: () => void
  onReset: () => void
}

function PdfImportModal({
  step,
  fileName,
  error,
  selected,
  closeRef,
  onClose,
  onFile,
  onSelectedChange,
  onImport,
  onReset,
}: PdfModalProps) {
  const toggle = (index: number) => {
    onSelectedChange(
      selected.includes(index)
        ? selected.filter((item) => item !== index)
        : [...selected, index],
    )
  }

  return (
    <div className="modal-backdrop">
      <section
        className="pdf-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pdf-title"
      >
        <header className="modal-header">
          <div>
            <span className="modal-icon">
              <FolderOpen size={20} />
            </span>
            <div>
              <h2 id="pdf-title">PDF'den soru aktar</h2>
              <p>Dosyandaki soruları seçerek sınava ekle.</p>
            </div>
          </div>
          <button
            className="icon-button"
            type="button"
            aria-label="Pencereyi kapat"
            onClick={onClose}
            ref={closeRef}
          >
            <X size={19} />
          </button>
        </header>

        {step === "upload" && (
          <div className="upload-step">
            <label className="drop-zone">
              <span className="upload-orbit">
                <UploadCloud size={27} />
              </span>
              <strong>PDF dosyanı buraya bırak</strong>
              <p>veya bilgisayarından bir dosya seç</p>
              <span className="fake-file-button">Dosya seç</span>
              <small>En fazla 25 MB · Yalnızca PDF</small>
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={(event) => onFile(event.target.files?.[0])}
              />
            </label>
            {error && <p className="file-error">{error}</p>}
          </div>
        )}

        {step === "scanning" && (
          <div className="scanning-step">
            <div className="scanning-visual">
              <FileText size={43} />
              <span className="scan-beam" />
            </div>
            <LoaderCircle className="spinner" size={23} />
            <h3>Sorular taranıyor</h3>
            <p>{fileName}</p>
            <small>Sayfa düzeni ve soru tipleri algılanıyor…</small>
          </div>
        )}

        {step === "select" && (
          <>
            <div className="detected-summary">
              <div>
                <FileCheck2 size={18} />
                <span>
                  <strong>{fileName}</strong>
                  <small>4 sayfa · 3 soru algılandı</small>
                </span>
              </div>
              <button type="button" onClick={onReset}>
                Dosyayı değiştir
              </button>
            </div>
            <div className="detected-list">
              <div className="detected-list-header">
                <span>Algılanan sorular</span>
                <button
                  type="button"
                  onClick={() =>
                    onSelectedChange(
                      selected.length === pdfQuestions.length ? [] : [0, 1, 2],
                    )
                  }
                >
                  {selected.length === pdfQuestions.length
                    ? "Seçimi kaldır"
                    : "Tümünü seç"}
                </button>
              </div>
              {pdfQuestions.map((question, index) => (
                <label
                  className={`detected-question ${
                    selected.includes(index) ? "selected" : ""
                  }`}
                  key={question.prompt}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(index)}
                    onChange={() => toggle(index)}
                  />
                  <span className="custom-check">
                    <Check size={13} />
                  </span>
                  <div>
                    <div className="detected-meta">
                      <span>{question.source}</span>
                      <span>{questionTypeLabels[question.type]}</span>
                      <span>{question.difficulty}</span>
                    </div>
                    <p>{question.prompt}</p>
                  </div>
                </label>
              ))}
            </div>
            <footer className="modal-footer">
              <span>{selected.length} soru seçildi</span>
              <div>
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={onClose}
                >
                  Vazgeç
                </button>
                <button
                  className="button button-primary"
                  type="button"
                  disabled={selected.length === 0}
                  onClick={onImport}
                >
                  <Plus size={17} />
                  Seçilenleri ekle
                </button>
              </div>
            </footer>
          </>
        )}
      </section>
    </div>
  )
}

export default App
