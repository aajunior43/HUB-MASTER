import { notFound } from "next/navigation";
import { calculators } from "@/calculators/registry";
import { CalculatorView } from "@/components/CalculatorView";

export function generateStaticParams() {
  return Object.values(calculators).map((calc) => ({ slug: calc.slug }));
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const calc = Object.values(calculators).find((c) => c.slug === slug);
  if (!calc) return notFound();
  return <CalculatorView meta={calc} />;
}