'use client';

import { PeriodType } from '@prisma/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs } from './ui/tabs';

const tabOptions = [
  { label: 'Week', value: PeriodType.WEEK },
  { label: 'Fortnight', value: PeriodType.FORTNIGHT },
  { label: 'Month', value: PeriodType.MONTH },
  { label: 'Year', value: PeriodType.YEAR },
];

export function PeriodTabs({ active }: { active: PeriodType }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <Tabs
      options={tabOptions}
      active={active}
      onChange={(value) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('period', value);
        router.push(`/dashboard?${params.toString()}`);
      }}
    />
  );
}
