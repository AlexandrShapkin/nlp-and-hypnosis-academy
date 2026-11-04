import {
  PublishedPage,
  publishedPageMetadata,
} from "@/components/public/PublishedPage";
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  return publishedPageMetadata((await params).slug);
}
export default async function Page({ params }: Props) {
  return <PublishedPage slug={(await params).slug} />;
}
