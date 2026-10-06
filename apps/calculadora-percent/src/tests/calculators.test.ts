import { describe, it, expect } from "vitest";
import {
  percentageOf,
  whatPercent,
  increasePercent,
  discountPercent,
  variationPercent,
  fractionToPercent,
  cumulativePercent,
  reversePercentage,
  simpleInterest,
  compoundInterest,
  marginAndMarkup,
  percentToDecimal,
  decimalToPercent,
  percentToFraction,
  fractionToPercentConverter,
  distribution,
} from "@/calculators";

describe("calculators", () => {
  it("percentageOf", () => {
    const { result } = percentageOf(10, 250);
    expect(result).toBe(25);
  });
  it("whatPercent", () => {
    const { result } = whatPercent(25, 250);
    expect(result).toBe(10);
  });
  it("increasePercent", () => {
    const { result } = increasePercent(100, 150);
    expect(result).toBe(50);
  });
  it("discountPercent", () => {
    const { result } = discountPercent(200, 150);
    expect(result).toBe(25);
  });
  it("variationPercent", () => {
    const { result } = variationPercent(100, 90);
    expect(result).toBe(-10);
  });
  it("fractionToPercent", () => {
    const { result } = fractionToPercent(1, 4);
    expect(result).toBe(25);
  });
  it("cumulativePercent", () => {
    const { result } = cumulativePercent(100, [10, -5]);
    expect(Number(result.toFixed(2))).toBe(104.5);
  });
  it("reversePercentage", () => {
    const { result } = reversePercentage(95, -5);
    expect(Number(result.toFixed(2))).toBe(100);
  });
  it("simpleInterest", () => {
    const { result } = simpleInterest(1000, 10, 2);
    expect(result).toBe(1200);
  });
  it("compoundInterest", () => {
    const { result } = compoundInterest(1000, 10, 2);
    expect(Number(result.toFixed(2))).toBe(1210);
  });
  it("marginAndMarkup", () => {
    const { margin, markup } = marginAndMarkup(60, 100);
    expect(margin).toBe(40);
    expect(markup).toBe(66.66666666666666);
  });
  it("converters", () => {
    expect(percentToDecimal(10)).toBe(0.1);
    expect(decimalToPercent(0.1)).toBe(10);
    const frac = percentToFraction(12.5);
    expect(frac.numerator / frac.denominator).toBeCloseTo(0.125, 6);
    expect(fractionToPercentConverter(1, 4)).toBe(25);
  });
  it("distribution", () => {
    const { valid, parts } = distribution(200, [25, 25, 50]);
    expect(valid).toBe(true);
    expect(parts).toEqual([50, 50, 100]);
  });
});