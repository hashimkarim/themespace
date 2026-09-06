import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ThemeSpace } from "@/components/themespace";
import { presets } from "@/lib/theme";
import { database, toPublished } from "@/lib/store";
export const dynamic = "force-dynamic";
async function findEntry(id: string) {
  const preset = presets.find((t) => `preset-${t.id}` === id);
  if (preset) return { id, theme: preset, version: 1, preset: true };
  const db = await database();
  const row = await db
    .prepare(
      "SELECT id, body, version, published_at FROM published_themes WHERE id = ?",
    )
    .bind(id)
    .first<{
      id: string;
      body: string;
      version: number;
      published_at: string;
    }>();
  return row ? toPublished(row) : null;
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const entry = await findEntry((await params).id);
  if (!entry) return { title: "Theme not found — ThemeSpace" };
  const title = `${entry.theme.name} — ThemeSpace`,
    description = entry.theme.description;
  return {
    title,
    description,
    openGraph: { title, description, images: [] },
    twitter: { title, description, card: "summary", images: [] },
  };
}
export default async function ThemePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const entry = await findEntry((await params).id);
  if (!entry) notFound();
  return <ThemeSpace initialView="theme" initialEntry={entry} />;
}
