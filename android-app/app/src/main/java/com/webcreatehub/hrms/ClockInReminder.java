package com.webcreatehub.hrms;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import androidx.core.app.NotificationCompat;

import java.util.Calendar;

/** Daily clock-in reminder at the employee's own work start, even if the app is closed. */
public final class ClockInReminder {
    static final String PREFS = "clock_in_reminder";
    static final String KEY_ENABLED = "enabled";
    static final String KEY_HOUR = "hour";
    static final String KEY_MINUTE = "minute";
    static final String KEY_CLOCKED_IN_DATE = "clocked_in_date";
    static final String ACTION_REMIND = "com.webcreatehub.hrms.CLOCK_IN_REMINDER";
    private static final String CHANNEL_ID = "clock_in_reminder";
    private static final int ALARM_REQUEST = 4100;
    private static final int NOTIFICATION_ID = 4101;

    private ClockInReminder() {}

    static void schedule(Context context, int hour, int minute) {
        if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
            return;
        }
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        prefs.edit()
            .putBoolean(KEY_ENABLED, true)
            .putInt(KEY_HOUR, hour)
            .putInt(KEY_MINUTE, minute)
            .apply();
        arm(context, hour, minute);
    }

    static void markClockedInToday(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        prefs.edit().putString(KEY_CLOCKED_IN_DATE, todayKey()).apply();
        if (!prefs.getBoolean(KEY_ENABLED, false)) {
            return;
        }
        arm(context, prefs.getInt(KEY_HOUR, 10), prefs.getInt(KEY_MINUTE, 0));
    }

    static void rescheduleFromPrefs(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        if (!prefs.getBoolean(KEY_ENABLED, false)) {
            return;
        }
        arm(context, prefs.getInt(KEY_HOUR, 10), prefs.getInt(KEY_MINUTE, 0));
    }

    static void show(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        if (todayKey().equals(prefs.getString(KEY_CLOCKED_IN_DATE, ""))) {
            arm(context, prefs.getInt(KEY_HOUR, 10), prefs.getInt(KEY_MINUTE, 0));
            return;
        }
        int hour = prefs.getInt(KEY_HOUR, 10);
        int minute = prefs.getInt(KEY_MINUTE, 0);
        String timeLabel = formatTime(hour, minute);

        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Clock-in reminder",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Reminder at your work start time");
            manager.createNotificationChannel(channel);
        }

        Intent open = new Intent(context, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent content = PendingIntent.getActivity(
            context,
            0,
            open,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_clock)
            .setContentTitle("Time to clock in")
            .setContentText("Your work start is " + timeLabel + ". Open WCH HRMS and clock in.")
            .setStyle(new NotificationCompat.BigTextStyle().bigText(
                "Your work start is " + timeLabel + ". Open WCH HRMS and clock in."
            ))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(content);

        manager.notify(NOTIFICATION_ID, builder.build());
        arm(context, hour, minute);
    }

    private static void arm(Context context, int hour, int minute) {
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarms == null) {
            return;
        }
        PendingIntent pending = pending(context);
        alarms.cancel(pending);

        long when = nextTrigger(context, hour, minute);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarms.canScheduleExactAlarms()) {
            alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, when, pending);
            return;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, when, pending);
        } else {
            alarms.setExact(AlarmManager.RTC_WAKEUP, when, pending);
        }
    }

    private static long nextTrigger(Context context, int hour, int minute) {
        Calendar when = Calendar.getInstance();
        when.set(Calendar.HOUR_OF_DAY, hour);
        when.set(Calendar.MINUTE, minute);
        when.set(Calendar.SECOND, 0);
        when.set(Calendar.MILLISECOND, 0);
        String clockedIn = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(KEY_CLOCKED_IN_DATE, "");
        boolean alreadyIn = todayKey().equals(clockedIn);
        if (alreadyIn || when.getTimeInMillis() <= System.currentTimeMillis()) {
            when.add(Calendar.DAY_OF_YEAR, 1);
        }
        return when.getTimeInMillis();
    }

    private static PendingIntent pending(Context context) {
        Intent intent = new Intent(context, ClockInReminderReceiver.class);
        intent.setAction(ACTION_REMIND);
        return PendingIntent.getBroadcast(
            context,
            ALARM_REQUEST,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    private static String todayKey() {
        Calendar now = Calendar.getInstance();
        return now.get(Calendar.YEAR)
            + "-"
            + pad(now.get(Calendar.MONTH) + 1)
            + "-"
            + pad(now.get(Calendar.DAY_OF_MONTH));
    }

    private static String formatTime(int hour, int minute) {
        int display = hour % 12;
        if (display == 0) {
            display = 12;
        }
        return display + ":" + pad(minute) + (hour < 12 ? " AM" : " PM");
    }

    private static String pad(int value) {
        return value < 10 ? "0" + value : String.valueOf(value);
    }
}
