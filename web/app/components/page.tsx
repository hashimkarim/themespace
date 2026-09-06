import { ThemeSpace } from "@/components/themespace";
export const metadata = { title: "Components — ThemeSpace" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ library?: string }>;
}) {
  const { library } = await searchParams;
  return (
    <ThemeSpace
      initialView="components"
      initialLibrary={library === "shadcn" ? "shadcn" : "design-system"}
    />
  );
}
