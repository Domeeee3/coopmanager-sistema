import type { DateValue } from '@internationalized/date';
import { parseDate } from '@internationalized/date';
import { Calendar, DateField, DatePicker as HeroDatePicker, Label } from '@heroui/react';
import { cn } from '@/shared/lib/utils';

interface DatePickerProps {
  /** Fecha ISO (YYYY-MM-DD) o cadena vacía. */
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}

function toDateValue(value: string): DateValue | null {
  if (!value) return null;

  try {
    return parseDate(value);
  } catch {
    return null;
  }
}

export function DatePicker({ value, onChange, label = 'Fecha', className }: DatePickerProps) {
  return (
    <HeroDatePicker
      className={cn('w-full', className)}
      value={toDateValue(value)}
      onChange={(date) => onChange(date?.toString() ?? '')}
    >
      <Label>{label}</Label>
      <DateField.Group fullWidth>
        <DateField.Prefix className="pointer-events-auto">
          <HeroDatePicker.Trigger aria-label={`Seleccionar ${label.toLowerCase()}`}>
            <HeroDatePicker.TriggerIndicator />
          </HeroDatePicker.Trigger>
        </DateField.Prefix>
        <DateField.Input>
          {(segment) => (
            <DateField.Segment
              segment={segment}
              className={segment.type === 'literal' ? 'text-foreground/70' : 'text-foreground'}
            />
          )}
        </DateField.Input>
      </DateField.Group>
      <HeroDatePicker.Popover>
        <Calendar aria-label={label}>
          <Calendar.Header>
            <Calendar.YearPickerTrigger>
              <Calendar.YearPickerTriggerHeading />
              <Calendar.YearPickerTriggerIndicator />
            </Calendar.YearPickerTrigger>
            <Calendar.NavButton slot="previous" />
            <Calendar.NavButton slot="next" />
          </Calendar.Header>
          <Calendar.Grid>
            <Calendar.GridHeader>
              {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
            </Calendar.GridHeader>
            <Calendar.GridBody>{(date) => <Calendar.Cell date={date} />}</Calendar.GridBody>
          </Calendar.Grid>
          <Calendar.YearPickerGrid>
            <Calendar.YearPickerGridBody>
              {({ year }) => <Calendar.YearPickerCell year={year} />}
            </Calendar.YearPickerGridBody>
          </Calendar.YearPickerGrid>
        </Calendar>
      </HeroDatePicker.Popover>
    </HeroDatePicker>
  );
}
