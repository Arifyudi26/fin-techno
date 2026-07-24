import { useState, useEffect, useRef } from "react";
import AppLayout from "@components/layout/AppLayout";
import PageBreadcrumb from "@components/common/PageBreadCrumb";
import PageMeta from "@components/common/PageMeta";
import Toast from "@components/ui/toast/Toast";
import { useToast } from "@lib/hooks/useToast";
import axiosGlobal from "@/services/AxiosGlobal";
import useAuthStore from "@/store/authStore";
import { useAvatarUrl, invalidateAvatarCache } from "@lib/hooks/useAvatarUrl";
import { useI18n } from "@lib/i18n";
import TelegramConnect from "@components/UserProfile/TelegramConnect";

interface UserProfile { id: string; name: string; email: string; role: string; avatar?: string | null; createdAt: string; }
interface UserStats { bankAccountCount: number; walletCount: number; uploadCount: number; transactionCount: number; }

export default function ProfilePage() {
  const { t } = useI18n();
  const { toastState, fire, close } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [editName, setEditName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const avatarObjectUrl = useAvatarUrl();

  useEffect(() => {
    axiosGlobal.get("/user/profile")
      .then((res) => {
        setProfile(res.data.user);
        setStats(res.data.stats);
        setEditName(res.data.user.name);
      })
      .catch(() => fire("error", t.profile.errorLoad))
      .finally(() => setLoading(false));
  }, [fire]);

  const { setName, setAvatar } = useAuthStore();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      fire("error", t.profile.errorAvatarFormat);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      fire("error", t.profile.errorAvatarSize);
      return;
    }

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axiosGlobal.post("/user/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setProfile((prev) => prev ? { ...prev, avatar: res.data.user.avatar } : prev);
      setAvatar(res.data.user.avatar);
      invalidateAvatarCache();
      fire("success", t.profile.avatarUpdated, { duration: 3000 });
    } catch {
      fire("error", t.profile.errorAvatar);
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword && newPassword !== confirmPassword) {
      fire("error", t.profile.errorPasswordMismatch);
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, string> = { name: editName };
      if (newPassword) { payload.currentPassword = currentPassword; payload.newPassword = newPassword; }
      const res = await axiosGlobal.put("/user/profile", payload);
      setProfile(res.data.user);
      setName(res.data.user.name);
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      fire("success", t.profile.profileUpdated, { duration: 3000 });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? t.profile.errorLoad;
      fire("error", msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <PageMeta title={`${t.profile.title} | Fin-Techno`} description={t.profile.description} />
      <PageBreadcrumb pageTitle={t.profile.pageTitle} />

      <div className="space-y-6">
        {/* Stats cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: t.profile.bankAccounts, value: stats?.bankAccountCount, icon: "M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" },
            { label: t.profile.wallets, value: stats?.walletCount, icon: "M2 6h20v14H2zM2 10h20" },
            { label: t.profile.totalUploads, value: stats?.uploadCount, icon: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" },
            { label: t.profile.transactions, value: stats?.transactionCount, icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
          ].map(({ label, value, icon }) => (
            <div key={label} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-4">
              <div className="flex items-center gap-2 mb-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-brand-500 shrink-0">
                  <path d={icon} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
              </div>
              <p className="text-2xl font-bold text-gray-800 dark:text-white/90">
                {loading ? "—" : (value ?? 0)}
              </p>
            </div>
          ))}
        </div>

        {/* Profile card & Telegram - Side by side on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Profile card */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-6">
          {loading ? (
            <div className="space-y-4 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-gray-200 dark:bg-gray-700" />
                <div className="space-y-2"><div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" /><div className="h-3 w-48 rounded bg-gray-200 dark:bg-gray-700" /></div>
              </div>
            </div>
          ) : profile ? (
            <div className="flex items-center gap-4 mb-6">
              <div className="relative shrink-0">
                <div className="h-16 w-16 rounded-full overflow-hidden bg-brand-500 flex items-center justify-center text-white text-2xl font-bold">
                  {avatarObjectUrl ? (
                    <img src={avatarObjectUrl} alt={profile.name} className="object-cover w-full h-full" />
                  ) : (
                    profile.name.charAt(0).toUpperCase()
                  )}
                  
                </div>
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-brand-500 hover:bg-brand-600 border-2 border-white dark:border-gray-900 flex items-center justify-center transition-colors disabled:opacity-50"
                  title={t.profile.avatarTitle}
                >
                  {uploadingAvatar ? (
                    <svg className="animate-spin" width="10" height="10" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
                      <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                      <path d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828a4 4 0 01-1.414.828l-3.414.586.586-3.414A4 4 0 019 13z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">{profile.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{profile.email}</p>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${profile.role === "admin" ? "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"}`}>
                    {profile.role === "admin" ? t.profile.admin : t.profile.user}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {t.profile.joinedAt} {new Date(profile.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          <form onSubmit={handleSave} className="space-y-5">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-800 pb-3">{t.profile.accountInfo}</h4>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t.profile.nameLabel}</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-white/90 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t.profile.emailLabel}</label>
              <input
                type="email"
                value={profile?.email ?? ""}
                disabled
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400 cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-gray-400">{t.profile.emailNote}</p>
            </div>

            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-800 pb-3 pt-2">{t.profile.changePassword} <span className="text-gray-400 font-normal">{t.profile.changePasswordOptional}</span></h4>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t.profile.oldPassword}</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={t.profile.oldPasswordPlaceholder}
                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-white/90 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t.profile.newPassword}</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={t.profile.newPasswordPlaceholder} className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-white/90 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t.profile.confirmPassword}</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder={t.profile.confirmPasswordPlaceholder} className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-white/90 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500" />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving || loading}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 px-6 py-2.5 text-sm font-medium text-white transition-colors"
              >
                {saving && <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
                {t.common.saveChanges}
              </button>
            </div>
          </form>
          </div>

          {/* Telegram Bot */}
          <TelegramConnect />
        </div>
      </div>

      <Toast {...toastState} onClose={close} />
    </AppLayout>
  );
}
