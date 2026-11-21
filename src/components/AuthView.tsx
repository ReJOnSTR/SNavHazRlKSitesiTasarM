import { LogIn, UserPlus } from "lucide-react"
import { useState } from "react"
import { loginUser, registerUser, type UserAccount } from "../services/db"

export default function AuthView({
  onAuth,
}: {
  onAuth: (user: UserAccount) => void
}) {
  const [mode, setMode] = useState<"login" | "register">("login")
  const [name, setName] = useState("")
  const [branch, setBranch] = useState("Matematik")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (submitting) return
    setError("")
    setSubmitting(true)
    try {
      const user =
        mode === "register"
          ? await registerUser({ name, email, password, branch })
          : await loginUser({ email, password })
      onAuth(user)
    } catch (err) {
      setError(err instanceof Error ? err.message : "İşlem başarısız.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div>
            <strong>Sınav Atölyesi</strong>
            <span>Öğretmen Çalışma Alanı</span>
          </div>
        </div>

        <h1>{mode === "login" ? "Hesabına giriş yap" : "Yeni öğretmen hesabı"}</h1>
        <p className="auth-sub">
          {mode === "login"
            ? "Sınavlarına ve soru bankana erişmek için giriş yap."
            : "Sınavlarını ve soru bankanı kişisel alanında saklamak için kayıt ol."}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === "register" && (
            <>
              <label className="form-field">
                <span>Ad Soyad</span>
                <input
                  required
                  value={name}
                  placeholder="Örn. Selin Aksoy"
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label className="form-field">
                <span>Branş</span>
                <input
                  value={branch}
                  placeholder="Örn. Matematik"
                  onChange={(e) => setBranch(e.target.value)}
                />
              </label>
            </>
          )}

          <label className="form-field">
            <span>E-posta</span>
            <input
              required
              type="email"
              value={email}
              placeholder="ornek@okul.k12.tr"
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label className="form-field">
            <span>Şifre</span>
            <input
              required
              minLength={4}
              type="password"
              value={password}
              placeholder="En az 4 karakter"
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {error && <p className="auth-error">{error}</p>}

          <button
            className="button button-primary large auth-submit"
            type="submit"
            disabled={submitting}
          >
            {mode === "login" ? <LogIn size={17} /> : <UserPlus size={17} />}
            <span>
              {mode === "login" ? "Giriş yap" : "Kayıt ol"}
            </span>
          </button>
        </form>

        <button
          className="auth-switch"
          type="button"
          onClick={() => {
            setError("")
            setMode((m) => (m === "login" ? "register" : "login"))
          }}
        >
          {mode === "login"
            ? "Hesabın yok mu? Yeni hesap oluştur"
            : "Zaten hesabın var mı? Giriş yap"}
        </button>
      </div>
    </div>
  )
}
