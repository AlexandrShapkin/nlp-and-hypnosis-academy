export const cardUrl = (slug: string) => `/topics/${slug}`;
export const pageUrl = (slug: string) =>
  slug === "home"
    ? "/"
    : slug === "privacy" || slug === "terms"
      ? `/${slug}`
      : `/pages/${slug}`;
export const siteUrl = () => process.env.SITE_URL || "http://localhost:8080";
export const allowIndexing = () => {
  try {
    const url = new URL(siteUrl());
    return (
      process.env.SEO_ALLOW_INDEXING === "true" &&
      url.protocol === "https:" &&
      !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    );
  } catch {
    return false;
  }
};
