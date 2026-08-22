export type NavSubItem = { key: string; name: string; path: string };

export type NavItemConfig = {
  key: string;
  name: string;
  path?: string;
  subItems?: NavSubItem[];
};

export const navItems: NavItemConfig[] = [
  {
    key: "dashboard",
    name: "Dashboard",
    path: "/",
  },
  {
    key: "transactions",
    name: "Transaksi",
    path: "/transactions",
  },
  {
    key: "uploadStatement",
    name: "Upload e-Statement",
    subItems: [
      { key: "uploadNew", name: "Upload Baru", path: "/upload" },
      { key: "uploadHistory", name: "Riwayat Upload", path: "/upload/riwayat" },
    ],
  },
  {
    key: "accounts",
    name: "Rekening",
    subItems: [
      { key: "bankAccounts", name: "Rekening Bank", path: "/bank-accounts" },
      { key: "digitalWallet", name: "Dompet Digital", path: "/wallets" },
    ],
  },
  {
    key: "categories",
    name: "Kategori",
    path: "/categories",
  },
];

export const othersItems: NavItemConfig[] = [
  {
    key: "calendar",
    name: "Kalender",
    path: "/calendar",
  },
];

/** Flatten semua menu jadi list datar untuk keperluan search */
export const ALL_MENUS = [...navItems, ...othersItems].flatMap((item) => {
  if (item.subItems) {
    return item.subItems.map((sub) => ({
      key: sub.key,
      name: sub.name,
      path: sub.path,
      groupKey: item.key,
      group: item.name,
    }));
  }
  return item.path
    ? [{ key: item.key, name: item.name, path: item.path, groupKey: item.key, group: item.name }]
    : [];
});
