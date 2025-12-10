import {
  addDays,
  addMonths,
  addYears,
  differenceInSeconds,
  endOfMonth,
  endOfWeek,
  endOfYear,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";
import { PeriodType } from "@prisma/client";

export type PeriodBounds = {
  periodType: PeriodType;
  start: Date;
  end: Date;
};

export function getPeriodBounds(
  periodType: PeriodType,
  reference = new Date(),
  options: { weekStartsOn?: 0 | 1 } = {},
): PeriodBounds {
  const weekStartsOn = options.weekStartsOn ?? 1;
  switch (periodType) {
    case PeriodType.WEEK: {
      const start = startOfWeek(reference, { weekStartsOn });
      const end = endOfWeek(reference, { weekStartsOn });
      return { periodType, start, end };
    }
    case PeriodType.FORTNIGHT: {
      const start = startOfWeek(reference, { weekStartsOn });
      const end = addDays(start, 13);
      return { periodType, start, end: endOfWeek(end, { weekStartsOn }) };
    }
    case PeriodType.MONTH: {
      const start = startOfMonth(reference);
      const end = endOfMonth(reference);
      return { periodType, start, end };
    }
    case PeriodType.YEAR: {
      const start = startOfYear(reference);
      const end = endOfYear(reference);
      return { periodType, start, end };
    }
    default:
      return getPeriodBounds(PeriodType.WEEK, reference, options);
  }
}

export function getPreviousPeriod(bounds: PeriodBounds): PeriodBounds {
  switch (bounds.periodType) {
    case PeriodType.WEEK:
      return getPeriodBounds(PeriodType.WEEK, addDays(bounds.start, -1));
    case PeriodType.FORTNIGHT:
      return getPeriodBounds(PeriodType.FORTNIGHT, addDays(bounds.start, -1));
    case PeriodType.MONTH:
      return getPeriodBounds(PeriodType.MONTH, addMonths(bounds.start, -1));
    case PeriodType.YEAR:
      return getPeriodBounds(PeriodType.YEAR, addYears(bounds.start, -1));
    default:
      return getPeriodBounds(bounds.periodType, addDays(bounds.start, -1));
  }
}

export function periodSeconds(bounds: PeriodBounds) {
  return differenceInSeconds(bounds.end, bounds.start);
}
