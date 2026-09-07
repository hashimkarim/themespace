import { notFound } from "next/navigation";
import { ThemeSpace } from "@/components/themespace";

export const metadata = {
  title: "Your account — ThemeSpace",
  robots: { index: false, follow: false },
};

export default async function Page({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  const { path } = await params;
  if (path !== "sign-in" && path !== "sign-up") notFound();
  return <ThemeSpace initialView="account" />;
}
