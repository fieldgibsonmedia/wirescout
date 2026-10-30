// When a user's daily digest is due: Monday to Friday, once their chosen time has passed in their time zone,
// and only once a day. A run that GitHub skips is caught up by the next one, but never the next day.

// How far back a digest looks: the first one, or the first after a long break.
export const MAX_LOOKBACK_DAYS = 7;

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

// The date ("2026-10-30"), weekday ("Fri") and time ("07:15") at that moment in the time zone.
export function localParts(date, timeZone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: safeTimeZone(timeZone),
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    weekday: parts.weekday,
    time: `${parts.hour}:${parts.minute}`,
  };
}

// The app saves the browser's time zone; London if it's one this server doesn't know.
export function safeTimeZone(timeZone) {
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone });
    return timeZone;
  } catch {
    return "Europe/London";
  }
}

// profile: digest_time ("07:15:00", or null when the digest is off), time_zone, last_digest_at.
export function isDue(profile, now) {
  if (!profile.digest_time) return false;

  const today = localParts(now, profile.time_zone);
  if (!WEEKDAYS.includes(today.weekday)) return false;
  if (today.time < profile.digest_time.slice(0, 5)) return false;

  return !profile.last_digest_at || localParts(new Date(profile.last_digest_at), profile.time_zone).date < today.date;
}

// The digest lists the stories found after this moment.
export function since(profile, now) {
  const earliest = new Date(now.getTime() - MAX_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const last = profile.last_digest_at ? new Date(profile.last_digest_at) : null;
  return last && last > earliest ? last : earliest;
}
