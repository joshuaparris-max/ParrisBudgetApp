import { Decimal } from "@prisma/client/runtime/library";

export type RolloverInput = {
  budget: number;
  carryIn: number;
  actualSpend: number;
};

export type RolloverResult = {
  available: number;
  variance: number;
  carryOut: number;
};

export function calculateRollover({ budget, carryIn, actualSpend }: RolloverInput): RolloverResult {
  const available = budget + carryIn;
  const variance = budget - actualSpend;
  const carryOut = carryIn + variance;
  return { available, variance, carryOut };
}

export function toNumber(value: Decimal | number | null | undefined) {
  if (!value) return 0;
  if (typeof value === "number") return value;
  return Number(value);
}
