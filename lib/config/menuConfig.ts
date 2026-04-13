export type NavSubItem = { name: string; path: string };

export type NavItemConfig = {
  name: string;
  path?: string;
  subItems?: NavSubItem[];
};

export const navItems: NavItemConfig[] = [
  {
    name: "Dashboard",
    path: "/",
  },
  {
    name: "Transaksi",
    path: "/transactions",
  },
  {
    name: "Upload e-Statement",
    subItems: [
      { name: "Upload Baru", path: "/upload" },
      { name: "Riwayat Upload", path: "/upload/riwayat" },
    ],
  },
  {
    name: "Rekening",
    subItems: [
      { name: "Rekening Bank", path: "/bank-accounts" },
      { name: "Dompet Digital", path: "/wallets" },
    ],
  },
  {
    name: "Kategori",
    path: "/categories",
  },
];

export const othersItems: NavItemConfig[] = [
  {
    name: "Kalender",
    path: "/calendar",
  },
];

/** Flatten semua menu jadi list datar untuk keperluan search */
export const ALL_MENUS = [...navItems, ...othersItems].flatMap((item) => {
  if (item.subItems) {
    return item.subItems.map((sub) => ({
      name: sub.name,
      path: sub.path,
      group: item.name,
    }));
  }
  return item.path
    ? [{ name: item.name, path: item.path, group: item.name }]
    : [];
});
