/** Employee sign-in must not call into the Android shell. Older builds open a system screen that Chrome shows as "This page couldn't load". */
export function ClockInReminderSync() {
  return null;
}
