import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/dashboard", "/essays", "/settings", "/library", "/admin", "/sign-in"] },
  };
}
