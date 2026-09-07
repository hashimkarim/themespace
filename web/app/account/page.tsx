import { ThemeSpace } from "@/components/themespace";
export const metadata = {
  title: "Your account — ThemeSpace",
  robots: { index: false, follow: false },
};
export default function Page() {
  return <ThemeSpace initialView="account" />;
}
