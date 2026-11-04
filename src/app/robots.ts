import type { MetadataRoute } from "next";
import { allowIndexing, siteUrl } from "@/shared/urls";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: allowIndexing()
      ? { userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] }
      : { userAgent: "*", disallow: "/" },
    sitemap: new URL("/sitemap.xml", siteUrl()).toString(),
  };
}
