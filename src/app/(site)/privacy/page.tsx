import {
  PublishedPage,
  publishedPageMetadata,
} from "@/components/public/PublishedPage";
export const dynamic = "force-dynamic";
export async function generateMetadata() {
  return publishedPageMetadata("privacy");
}
export default function Privacy() {
  return <PublishedPage slug="privacy" />;
}
