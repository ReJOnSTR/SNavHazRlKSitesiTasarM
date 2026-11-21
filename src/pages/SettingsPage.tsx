import { useState } from "react"
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  KeyRound,
  Mail,
  Menu,
  Moon,
  Sun,
  Trash2,
  UserCheck,
} from "lucide-react"
import { TopbarTitle, TopbarTools } from "./PageHeader"
import {
  deleteUserAccount,
  updateUserEmail,
  updateUserPassword,
  updateUserProfile,
  type UserAccount,
} from "../services/db"

type SettingsPageProps = {
  user: UserAccount
  theme: "light" | "dark"
  onToggleTheme: () => void
  onMenu: () => void
  onUserUpdated: (user: UserAccount) => void
  onAccountDeleted: () => void
  onNotify: (message: string) => void
}

type ActiveSection = "profile" | "email" | "password" | "delete" | null

function getUserInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "Ö"
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("tr-TR") ?? "")
    .join("")
}

export default function SettingsPage({
  user,
  theme,
  onToggleTheme,
  onMenu,
  onUserUpdated,
  onAccountDeleted,
  onNotify,
}: SettingsPageProps) {
  const [activeSection, setActiveSection] = useState<ActiveSection>(null)

  const [name, setName] = useState(user.name)
  const [branch, setBranch] = useState(user.branch)
  const [profileError, setProfileError] = useState("")

  const [newEmail, setNewEmail] = useState(user.email)
  const [emailPassword, setEmailPassword] = useState("")
  const [emailError, setEmailError] = useState("")

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")

  const [deletePassword, setDeletePassword] = useState("")
  const [deleteError, setDeleteError] = useState("")

  const toggleSection = (section: Exclude<ActiveSection, null>) => {
    setProfileError("")
    setEmailError("")
    setPasswordError("")
    setDeleteError("")
    setActiveSection((prev) => (prev === section ? null : section))
  }

  const handleSaveProfile = (event: React.FormEvent) => {
    event.preventDefault()
    setProfileError("")
    try {
      const updated = updateUserProfile(user.id, { name, branch })
      onUserUpdated(updated)
      setActiveSection(null)
      onNotify("Profil bilgileri güncellendi")
    } catch (err) {
      setProfileError(
        err instanceof Error ? err.message : "Profil güncellenemedi.",
      )
    }
  }

  const handleSaveEmail = async (event: React.FormEvent) => {
    event.preventDefault()
    setEmailError("")
    try {
      const updated = await updateUserEmail(user.id, {
        newEmail,
        currentPassword: emailPassword,
      })
      setEmailPassword("")
      onUserUpdated(updated)
      setActiveSection(null)
      onNotify("E-posta adresi güncellendi")
    } catch (err) {
      setEmailError(
        err instanceof Error ? err.message : "E-posta güncellenemedi.",
      )
    }
  }

  const handleSavePassword = async (event: React.FormEvent) => {
    event.preventDefault()
    setPasswordError("")
    if (newPassword !== confirmPassword) {
      setPasswordError("Yeni şifreler birbiriyle eşleşmiyor.")
      return
    }
    try {
      const updated = await updateUserPassword(user.id, {
        currentPassword,
        newPassword,
      })
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      onUserUpdated(updated)
      setActiveSection(null)
      onNotify("Şifreniz başarıyla güncellendi")
    } catch (err) {
      setPasswordError(
        err instanceof Error ? err.message : "Şifre güncellenemedi.",
      )
    }
  }

  const handleDeleteAccount = async (event: React.FormEvent) => {
    event.preventDefault()
    setDeleteError("")
    try {
      await deleteUserAccount(user.id, deletePassword)
      onAccountDeleted()
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Hesap silinemedi.",
      )
    }
  }

  return (
    <div className="page-view">
      <header className="topbar">
        <button
          className="icon-button mobile-menu-button"
          type="button"
          aria-label="Menüyü aç"
          onClick={onMenu}
        >
          <Menu size={20} />
        </button>
        <TopbarTitle title="Hesap ve Ayarlar" />
        <TopbarTools />
      </header>

      <div className="page-scroll">
        <div className="settings-shell">
          <div className="page-intro">
            <div>
              <span className="page-eyebrow">Hesap yönetimi</span>
              <h1>Ayarlar</h1>
              <p>
                Profil bilgilerinizi, e-posta adresinizi, şifrenizi ve hesap
                tercihlerinizi buradan yönetebilirsiniz.
              </p>
            </div>
          </div>

          <div className="settings-container">
          <div className="settings-account-bar">
            <div className="settings-account-meta">
              <div className="settings-avatar" aria-hidden="true">
                {getUserInitials(user.name)}
              </div>
              <div className="settings-account-text">
                <strong>{user.name}</strong>
                <span>{user.email}</span>
              </div>
            </div>
            <span className="settings-branch-pill">
              {user.branch || "Öğretmen"}
            </span>
          </div>

          <section className="settings-group" aria-label="Hesap Bilgileri">
            <h2 className="settings-group-title">Hesap Bilgileri</h2>
            <div className="settings-list">
              <div className="settings-item">
                <div className="settings-row">
                  <div className="settings-row-left">
                    <span className="settings-card-icon">
                      <UserCheck size={17} />
                    </span>
                    <div className="settings-row-text">
                      <h3>Profil bilgileri</h3>
                      <p>
                        Ad Soyad ve Branş ·{" "}
                        <strong>
                          {user.name} · {user.branch || "Öğretmen"}
                        </strong>
                      </p>
                    </div>
                  </div>
                  <div className="settings-row-right">
                    <button
                      className="button button-secondary settings-row-btn"
                      type="button"
                      aria-expanded={activeSection === "profile"}
                      onClick={() => toggleSection("profile")}
                    >
                      {activeSection === "profile" ? "Kapat" : "Düzenle"}
                      {activeSection === "profile" ? (
                        <ChevronDown size={14} />
                      ) : (
                        <ChevronRight size={14} />
                      )}
                    </button>
                  </div>
                </div>

                {activeSection === "profile" && (
                  <form className="settings-panel" onSubmit={handleSaveProfile}>
                    <div className="settings-form-grid">
                      <label className="settings-field">
                        <span>Ad Soyad</span>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                        />
                      </label>
                      <label className="settings-field">
                        <span>Branş</span>
                        <input
                          type="text"
                          value={branch}
                          onChange={(e) => setBranch(e.target.value)}
                          placeholder="Örn. Matematik"
                        />
                      </label>
                    </div>
                    {profileError && (
                      <p className="settings-error">{profileError}</p>
                    )}
                    <div className="settings-card-actions">
                      <button
                        className="button button-secondary"
                        type="button"
                        onClick={() => {
                          setName(user.name)
                          setBranch(user.branch)
                          setProfileError("")
                          setActiveSection(null)
                        }}
                      >
                        Vazgeç
                      </button>
                      <button className="button button-primary" type="submit">
                        Kaydet
                      </button>
                    </div>
                  </form>
                )}
              </div>

              <div className="settings-item">
                <div className="settings-row">
                  <div className="settings-row-left">
                    <span className="settings-card-icon">
                      <Mail size={17} />
                    </span>
                    <div className="settings-row-text">
                      <h3>E-posta adresi</h3>
                      <p>
                        Giriş ve bildirim e-postası ·{" "}
                        <strong>{user.email}</strong>
                      </p>
                    </div>
                  </div>
                  <div className="settings-row-right">
                    <button
                      className="button button-secondary settings-row-btn"
                      type="button"
                      aria-expanded={activeSection === "email"}
                      onClick={() => toggleSection("email")}
                    >
                      {activeSection === "email" ? "Kapat" : "Değiştir"}
                      {activeSection === "email" ? (
                        <ChevronDown size={14} />
                      ) : (
                        <ChevronRight size={14} />
                      )}
                    </button>
                  </div>
                </div>

                {activeSection === "email" && (
                  <form
                    className="settings-panel"
                    onSubmit={(e) => void handleSaveEmail(e)}
                  >
                    <div className="settings-form-grid">
                      <label className="settings-field">
                        <span>Yeni e-posta adresi</span>
                        <input
                          type="email"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          required
                        />
                      </label>
                      <label className="settings-field">
                        <span>Mevcut şifreniz (doğrulama)</span>
                        <input
                          type="password"
                          value={emailPassword}
                          onChange={(e) => setEmailPassword(e.target.value)}
                          placeholder="••••••"
                          required
                        />
                      </label>
                    </div>
                    {emailError && <p className="settings-error">{emailError}</p>}
                    <div className="settings-card-actions">
                      <button
                        className="button button-secondary"
                        type="button"
                        onClick={() => {
                          setNewEmail(user.email)
                          setEmailPassword("")
                          setEmailError("")
                          setActiveSection(null)
                        }}
                      >
                        Vazgeç
                      </button>
                      <button className="button button-primary" type="submit">
                        E-postayı güncelle
                      </button>
                    </div>
                  </form>
                )}
              </div>

              <div className="settings-item">
                <div className="settings-row">
                  <div className="settings-row-left">
                    <span className="settings-card-icon">
                      <KeyRound size={17} />
                    </span>
                    <div className="settings-row-text">
                      <h3>Şifre ve güvenlik</h3>
                      <p>
                        Hesap şifrenizi sıfırlayın veya değiştirin ·{" "}
                        <strong>••••••••</strong>
                      </p>
                    </div>
                  </div>
                  <div className="settings-row-right">
                    <button
                      className="button button-secondary settings-row-btn"
                      type="button"
                      aria-expanded={activeSection === "password"}
                      onClick={() => toggleSection("password")}
                    >
                      {activeSection === "password" ? "Kapat" : "Şifreyi değiştir"}
                      {activeSection === "password" ? (
                        <ChevronDown size={14} />
                      ) : (
                        <ChevronRight size={14} />
                      )}
                    </button>
                  </div>
                </div>

                {activeSection === "password" && (
                  <form
                    className="settings-panel"
                    onSubmit={(e) => void handleSavePassword(e)}
                  >
                    <div className="settings-form-grid">
                      <label className="settings-field settings-field-full">
                        <span>Mevcut şifre</span>
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          required
                        />
                      </label>
                      <label className="settings-field">
                        <span>Yeni şifre</span>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          minLength={4}
                          required
                        />
                      </label>
                      <label className="settings-field">
                        <span>Yeni şifre (tekrar)</span>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          minLength={4}
                          required
                        />
                      </label>
                    </div>
                    {passwordError && (
                      <p className="settings-error">{passwordError}</p>
                    )}
                    <div className="settings-card-actions">
                      <button
                        className="button button-secondary"
                        type="button"
                        onClick={() => {
                          setCurrentPassword("")
                          setNewPassword("")
                          setConfirmPassword("")
                          setPasswordError("")
                          setActiveSection(null)
                        }}
                      >
                        Vazgeç
                      </button>
                      <button className="button button-primary" type="submit">
                        Şifreyi güncelle
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </section>

          <section
            className="settings-group"
            aria-label="Uygulama Tercihleri"
          >
            <h2 className="settings-group-title">Uygulama Tercihleri</h2>
            <div className="settings-list">
              <div className="settings-item">
                <div className="settings-row">
                  <div className="settings-row-left">
                    <span className="settings-card-icon">
                      {theme === "dark" ? <Moon size={17} /> : <Sun size={17} />}
                    </span>
                    <div className="settings-row-text">
                      <h3>Görünüm teması</h3>
                      <p>
                        Arayüz renk modu ·{" "}
                        <strong>
                          {theme === "dark"
                            ? "Karanlık tema aktif"
                            : "Açık tema aktif"}
                        </strong>
                      </p>
                    </div>
                  </div>
                  <div className="settings-row-right">
                    <button
                      className="button button-secondary"
                      type="button"
                      onClick={onToggleTheme}
                    >
                      {theme === "dark"
                        ? "Açık temaya geç"
                        : "Karanlık temaya geç"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="settings-group" aria-label="Tehlikeli Bölge">
            <h2 className="settings-group-title">Tehlikeli Bölge</h2>
            <div className="settings-list danger">
              <div className="settings-item">
                <div className="settings-row">
                  <div className="settings-row-left">
                    <span className="settings-card-icon danger">
                      <AlertTriangle size={17} />
                    </span>
                    <div className="settings-row-text">
                      <h3>Hesabı kalıcı olarak sil</h3>
                      <p>
                        Hesabınızı, tüm sınavlarınızı ve soru bankanızı kalıcı
                        olarak siler.
                      </p>
                    </div>
                  </div>
                  <div className="settings-row-right">
                    <button
                      className="button settings-danger-btn settings-row-btn"
                      type="button"
                      aria-expanded={activeSection === "delete"}
                      onClick={() => toggleSection("delete")}
                    >
                      <Trash2 size={14} />
                      {activeSection === "delete" ? "Vazgeç" : "Hesabı sil"}
                    </button>
                  </div>
                </div>

                {activeSection === "delete" && (
                  <form
                    className="settings-panel"
                    onSubmit={(e) => void handleDeleteAccount(e)}
                  >
                    <label className="settings-field">
                      <span>Onaylamak için şifrenizi girin</span>
                      <input
                        type="password"
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        placeholder="Mevcut şifreniz"
                        required
                      />
                    </label>
                    {deleteError && (
                      <p className="settings-error">{deleteError}</p>
                    )}
                    <div className="settings-card-actions">
                      <button
                        className="button button-secondary"
                        type="button"
                        onClick={() => {
                          setDeletePassword("")
                          setDeleteError("")
                          setActiveSection(null)
                        }}
                      >
                        Vazgeç
                      </button>
                      <button
                        className="button settings-danger-btn"
                        type="submit"
                      >
                        <Trash2 size={14} />
                        Hesabı kalıcı olarak sil
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </section>
          </div>
        </div>
      </div>
    </div>
  )
}
