import { addDays, format, getDay, isWeekend, parseISO, subDays } from 'date-fns';
import { HolidayRule } from './types';

/**
 * Calcula a data da Páscoa para um determinado ano utilizando o algoritmo de Butcher-Meeus.
 */
function getEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; // 0-indexed (2 = março, 3 = abril)
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month, day));
}

/**
 * Retorna o conjunto de feriados nacionais brasileiros (fixos e móveis) formatados como 'YYYY-MM-DD'.
 */
export function getBrazilianHolidays(year: number): Set<string> {
  const holidays = new Set<string>();

  // Feriados Nacionais Fixos
  const fixed = [
    `${year}-01-01`, // Confraternização Universal
    `${year}-04-21`, // Tiradentes
    `${year}-05-01`, // Dia do Trabalhador
    `${year}-09-07`, // Independência do Brasil
    `${year}-10-12`, // Nossa Senhora Aparecida
    `${year}-11-02`, // Finados
    `${year}-11-15`, // Proclamação da República
    `${year}-11-20`, // Dia Nacional de Zumbi e da Consciência Negra (Lei 14.759)
    `${year}-12-25`, // Natal
  ];

  fixed.forEach((dateStr) => holidays.add(dateStr));

  // Feriados Nacionais Móveis baseados na Páscoa
  const easter = getEasterSunday(year);

  // Carnaval: terça-feira, 47 dias antes da Páscoa
  const carnival = subDays(easter, 47);
  holidays.add(format(carnival, 'yyyy-MM-dd'));

  // Sexta-feira Santa: 2 dias antes da Páscoa
  const goodFriday = subDays(easter, 2);
  holidays.add(format(goodFriday, 'yyyy-MM-dd'));

  // Corpus Christi: 60 dias após a Páscoa
  const corpusChristi = addDays(easter, 60);
  holidays.add(format(corpusChristi, 'yyyy-MM-dd'));

  return holidays;
}

/**
 * Verifica se a data é um dia útil (não é sábado, domingo nem feriado nacional).
 */
export function isBusinessDay(date: Date): boolean {
  const dayOfWeek = getDay(date);
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false;
  }

  const year = date.getUTCFullYear();
  const holidays = getBrazilianHolidays(year);
  const formatted = format(date, 'yyyy-MM-dd');
  return !holidays.has(formatted);
}

/**
 * Ajusta a data de vencimento de acordo com a regra de feriados.
 * - POSTPONE: Empurra para o primeiro dia útil seguinte.
 * - PRECEDE: Antecipa para o dia útil imediatamente anterior.
 * - EXACT_DATE: Mantém a data original, mesmo que seja feriado ou final de semana.
 */
export function adjustDueDate(dateOrStr: Date | string, rule: HolidayRule): string {
  const date = typeof dateOrStr === 'string' ? parseISO(dateOrStr) : new Date(dateOrStr);

  if (rule === 'EXACT_DATE') {
    return format(date, 'yyyy-MM-dd');
  }

  let adjusted = new Date(date);

  if (rule === 'POSTPONE') {
    while (!isBusinessDay(adjusted)) {
      adjusted = addDays(adjusted, 1);
    }
  } else if (rule === 'PRECEDE') {
    while (!isBusinessDay(adjusted)) {
      adjusted = subDays(adjusted, 1);
    }
  }

  return format(adjusted, 'yyyy-MM-dd');
}

/**
 * Gera as datas base de parcelas mensais a partir de uma data inicial.
 */
export function generateMonthlyDates(startDateStr: string, count: number): string[] {
  const baseDate = parseISO(startDateStr);
  const dates: string[] = [];

  const targetDay = baseDate.getDate();

  for (let i = 1; i <= count; i++) {
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth() + i;

    // Lida com virada de ano e quantidade de dias no mês (ex: 31 de janeiro -> 28/29 de fevereiro)
    const newDate = new Date(year, month, 1);
    const lastDayOfMonth = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0).getDate();
    const resolvedDay = Math.min(targetDay, lastDayOfMonth);

    newDate.setDate(resolvedDay);
    dates.push(format(newDate, 'yyyy-MM-dd'));
  }

  return dates;
}
