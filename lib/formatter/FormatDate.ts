export const formatDate = (isoString: string) => {
  const date = new Date(isoString);

  const day = date.toLocaleString("id-ID", { day: "2-digit" });
  const month = date.toLocaleString("id-ID", { month: "long" });
  const year = date.toLocaleString("id-ID", { year: "numeric" });
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${day} ${month} ${year} ${hours}:${minutes}:${seconds}`;
};
