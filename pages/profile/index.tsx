import { useState, useEffect } from "react";
import AppLayout from "@components/layout/AppLayout";
import PageBreadcrumb from "@components/common/PageBreadCrumb";
import PageMeta from "@components/common/PageMeta";
import Toast from "@components/ui/toast/Toast";
import { useToast } from "@lib/hooks/useToast";
import axiosGlobal from "@/services/AxiosGlobal";

interface UserProfile { id: string; name: string; email: string; role: string; createdAt: string; }

export default function ProfilePage() {
  const { toastState, fire, close } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editName, setEditName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axiosGlobal.get("/user/profile")
      .then((res) => {
        setProfile(res.data.user);
        setEditName(res.data.user.name);
      })
      .catch(() => fire("error", "Gagal memuat profil"))
      .finally(() => setLoading(false));
  }, [fire]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword && newPassword !== confirmPassword) {
      fire("error", "Password baru tidak cocok");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, string> = { name: editName };
      if (newPassword) { payload.currentPassword = currentPassword; payload.newPassword = newPassword; }
      const res = await axiosGlobal.put("/user/profile", payload);
      setProfile(res.data.user);
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      fire("success", "Profil berhasil diperbarui", { duration: 3000 });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Gagal memperbarui profil";
      fire("error", msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <PageMeta title="Profil | MyFinance" description="Kelola informasi akun Anda" />
      <PageBreadcrumb pageTitle="Profil" />

      <div className="max-w-2xl space-y-6">
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
              <div className="h-16 w-16 rounded-full bg-brand-500 flex items-center justify-center text-white text-2xl font-bold shrink-0">
                {profile.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">{profile.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{profile.email}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  Role: <span className="capitalize">{profile.role}</span> · Bergabung: {new Date(profile.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}
                </p>
              </div>
            </div>
          ) : null}

          <form onSubmit={handleSave} className="space-y-5">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-800 pb-3">Informasi Akun</h4>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Nama</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-white/90 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email</label>
              <input
                type="email"
                value={profile?.email ?? ""}
                disabled
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400 cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-gray-400">Email tidak dapat diubah</p>
            </div>

            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-800 pb-3 pt-2">Ubah Password <span className="text-gray-400 font-normal">(opsional)</span></h4>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Password Lama</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Kosongkan jika tidak ingin ubah password"
                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-white/90 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Password Baru</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min. 8 karakter" className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-white/90 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Konfirmasi Password</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Ulangi password baru" className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-white/90 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500" />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving || loading}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 px-6 py-2.5 text-sm font-medium text-white transition-colors"
              >
                {saving && <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
                Simpan Perubahan
              </button>
            </div>
          </form>
        </div>
      </div>

      <Toast {...toastState} onClose={close} />
    </AppLayout>
  );
}
