import { z } from "zod";
export const seoSchema = z.object({
  title: z.string().max(160).optional(),
  description: z.string().max(320).optional(),
  noindex: z.boolean().default(false),
  ogImageId: z.string().optional(),
});
export const slugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(100);
export const safeUrlSchema = z
  .string()
  .max(2000)
  .refine((value) => {
    if (/[\u0000-\u0020\\]/.test(value)) return false;
    if (/^\/(?!\/)/.test(value)) return true;
    try {
      const url = new URL(value);
      return (
        url.protocol === "https:" &&
        Boolean(url.hostname) &&
        !url.username &&
        !url.password
      );
    } catch {
      return false;
    }
  }, "Use a local path or valid HTTPS URL");
export const cardTypes = [
  "area",
  "service",
  "testimonial",
  "metric",
  "credential",
  "topic",
  "article",
  "event",
  "faq",
] as const;
export const blockTypes = [
  "hero",
  "metrics",
  "about",
  "card_grid",
  "service_list",
  "testimonials",
  "contact_form",
  "rich_text",
  "faq",
  "cta",
  "media_gallery",
  "legal_text",
  "footer",
] as const;
export const blockSchema = z.object({
  id: z.string(),
  key: slugSchema,
  type: z.enum(blockTypes),
  heading: z.string().max(300).default(""),
  body: z.string().max(20000).default(""),
  eyebrow: z.string().max(200).optional(),
  imageId: z.string().optional(),
  visible: z.boolean().default(true),
  variant: z.enum(["default", "soft", "contrast"]).default("default"),
  data: z
    .record(
      z.string(),
      z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
    )
    .default({}),
});
export const cardSchema = z.object({
  type: z.enum(cardTypes).default("topic"),
  order: z.number().int().min(0).max(10000).default(0),
  slug: slugSchema,
  title: z.string().trim().min(1).max(300),
  summary: z.string().max(2000).default(""),
  body: z.string().max(50000).default(""),
  mediaIds: z.array(z.string()).default([]),
  sectionId: z.string().optional(),
  showInNavigation: z.boolean().default(true),
  navigationLabel: z.string().max(100).optional(),
  navigationGroup: z.enum(["primary", "footer"]).default("primary"),
  anchor: z.string().optional(),
  variant: z.enum(["default", "soft", "contrast"]).default("default"),
  seo: seoSchema.default({ noindex: false }),
});
export const pageSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(1).max(300),
  body: z.string().max(50000).default(""),
  sections: z.array(blockSchema).default([]),
  showInNavigation: z.boolean().default(false),
  navigationLabel: z.string().max(100).optional(),
  navigationGroup: z.enum(["primary", "footer"]).default("primary"),
  seo: seoSchema.default({ noindex: false }),
});
export const themeSchema = z.object({
  background: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  surface: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  text: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  muted: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  primary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  border: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  fontBody: z.enum(["sans", "serif"]),
  fontHeading: z.enum(["sans", "serif"]),
  fontScale: z.number().min(0.9).max(1.3),
  contentWidth: z.number().min(900).max(1440),
  sectionSpacing: z.number().min(40).max(140),
  cardGap: z.number().min(12).max(48),
  radius: z.number().min(0).max(40),
  buttonVariant: z.enum(["solid", "outline"]),
  heroVariant: z.enum(["split", "centered"]),
  shadow: z.enum(["none", "soft"]),
  borderStyle: z.enum(["solid", "none"]),
  headingWeight: z.enum(["400", "500", "600", "700"]),
});
export const defaultTheme: Theme = {
  background: "#f7f5ef",
  surface: "#ffffff",
  text: "#203c37",
  muted: "#52665d",
  primary: "#255e50",
  accent: "#dfb977",
  border: "#d4ddd5",
  fontBody: "sans",
  fontHeading: "serif",
  fontScale: 1,
  contentWidth: 1200,
  sectionSpacing: 88,
  cardGap: 24,
  radius: 20,
  buttonVariant: "solid",
  heroVariant: "split",
  shadow: "soft",
  borderStyle: "solid",
  headingWeight: "500",
};
export type CardDraft = z.infer<typeof cardSchema>;
export type PageDraft = z.infer<typeof pageSchema>;
export type Block = z.infer<typeof blockSchema>;
export type Theme = z.infer<typeof themeSchema>;
export type Seo = z.infer<typeof seoSchema>;
export type Entity<T> = {
  id: string;
  version: number;
  state: "draft" | "published" | "unpublished";
  draft: T;
  published: T | null;
};
export type PublicCard = CardDraft & { id: string; publishedAt?: string };
export type PublicPage = PageDraft & { id: string; publishedAt?: string };
export type NavigationItem = {
  id: string;
  label: string;
  href: string;
  group: "primary" | "footer";
  order: number;
  visible: boolean;
  target?: {
    kind: "card" | "page" | "section" | "external";
    id?: string;
    url?: string;
  };
  automatic?: boolean;
};
export type MediaAsset = {
  id: string;
  url: string;
  alt: string;
  caption: string;
  credit: string;
  width: number;
  height: number;
};
export const settingsSchema = z.object({
  siteTitle: z.string().trim().min(1).max(150),
  description: z.string().max(500),
  brandLabel: z.string().max(150),
  phone: z.string().max(100),
  email: z.union([z.literal(""), z.email()]),
  bookingLabel: z.string().max(100),
  bookingUrl: safeUrlSchema,
  footerText: z.string().max(5000),
  legalText: z.string().max(5000),
  privacyVersion: z.string().trim().min(1).max(50),
  socialUrl: z.union([z.literal(""), safeUrlSchema]),
  seo: seoSchema,
});
export type Settings = z.infer<typeof settingsSchema>;
export type PublishedHome = {
  page: PublicPage;
  cards: PublicCard[];
  settings: Settings;
  navigation: NavigationItem[];
  theme: Theme;
  media: MediaAsset[];
};
