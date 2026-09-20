import moment from 'moment-timezone';

// Default timezone for Ethiopia
export const DEFAULT_TIMEZONE = 'Africa/Addis_Ababa';

// Ethiopian time offset (UTC+3)
export const ETHIOPIA_OFFSET = '+03:00';

export interface TimezoneOption {
  value: string;
  label: string;
  labelAm: string;
}

// Timezone list for user selection
export const SUPPORTED_TIMEZONES: TimezoneOption[] = [
  { value: 'Africa/Addis_Ababa', label: 'Addis Ababa (ET) - UTC+3', labelAm: 'አዲስ አበባ (ኢት) - ዩቲሲ+3' },
  { value: 'Africa/Nairobi', label: 'Nairobi (EAT) - UTC+3', labelAm: 'ናይሮቢ (ኢኤቲ) - ዩቲሲ+3' },
  { value: 'Africa/Cairo', label: 'Cairo (EET) - UTC+2', labelAm: 'ካይሮ (ኢኢቲ) - ዩቲሲ+2' },
  { value: 'Europe/London', label: 'London (GMT/BST)', labelAm: 'ለንደን (ጂኤምቲ/ቢኤስቲ)' },
  { value: 'America/New_York', label: 'New York (EST/EDT)', labelAm: 'ኒው ዮርክ (ኢኤስቲ/ኢዲቲ)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST) - UTC+4', labelAm: 'ዱባይ (ጂኤስቲ) - ዩቲሲ+4' }
];

// Format date with timezone
export function formatDateWithTimezone(date: any, timezone: string = DEFAULT_TIMEZONE, format: string = 'YYYY-MM-DD HH:mm:ss'): string {
  return moment(date).tz(timezone).format(format);
}

// Get current time in Ethiopia
export function getCurrentEthiopiaTime(): moment.Moment {
  return moment().tz(DEFAULT_TIMEZONE);
}

export interface MatchTimeDetails {
  date: string;
  time: string;
  full: string;
  relative: string;
  dayName: string;
  dayNameAm: string;
}

// Format match time for display
export function formatMatchTime(matchDate: any, timezone: string = DEFAULT_TIMEZONE): MatchTimeDetails {
  const m = moment(matchDate).tz(timezone);
  return {
    date: m.format('YYYY-MM-DD'),
    time: m.format('HH:mm'),
    full: m.format('YYYY-MM-DD HH:mm:ss'),
    relative: m.fromNow(),
    dayName: m.format('dddd'),
    dayNameAm: getAmharicDayName(m.day())
  };
}

// Get Amharic day names
export function getAmharicDayName(dayIndex: number): string {
  const days: { [key: number]: string } = {
    0: 'እሑድ',
    1: 'ሰኞ',
    2: 'ማክሰኞ',
    3: 'ረቡዕ',
    4: 'ሐሙስ',
    5: 'ዓርብ',
    6: 'ቅዳሜ'
  };
  return days[dayIndex] || '';
}

// Get Amharic month names
export function getAmharicMonthName(monthIndex: number): string {
  const months: { [key: number]: string } = {
    0: 'ጥር',
    1: 'የካቲት',
    2: 'መጋቢት',
    3: 'ሚያዚያ',
    4: 'ግንቦት',
    5: 'ሰኔ',
    6: 'ሐምሌ',
    7: 'ነሐሴ',
    8: 'መስከረም',
    9: 'ጥቅምት',
    10: 'ህዳር',
    11: 'ታህሳስ'
  };
  return months[monthIndex] || '';
}

// Convert numbers to Amharic
export function toAmharicNumber(number: number | string): string {
  const amharicDigits = ['፩', '፪', '፫', '፬', '፭', '፮', '፯', '፰', '፱', '፲'];
  return number.toString().split('').map(d => {
    const val = parseInt(d);
    if (!isNaN(val) && val >= 1 && val <= 10) return amharicDigits[val - 1];
    if (d === '0') return '0'; // placeholder for 0 or keep as is
    return d;
  }).join('');
}
