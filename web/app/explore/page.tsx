import { ThemeSpace } from "@/components/themespace";
export const metadata = {
  title: "Explore themes — ThemeSpace",
  description:
    "Find a palette that feels like you. Discover and remix themes for your apps and projects.",
};
export default function Explore() {
  return <ThemeSpace initialView="explore" />;
}
