import {
  PublishedPage,
  publishedPageMetadata,
} from "@/components/public/PublishedPage";
export const dynamic = "force-dynamic";
export async function generateMetadata() {
  return publishedPageMetadata("terms");
}
export default function Terms() {
  return <PublishedPage slug="terms" />;
}
