package com.webcreatehub.hrms;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class ClockInReminderReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || !ClockInReminder.ACTION_REMIND.equals(intent.getAction())) {
            return;
        }
        ClockInReminder.show(context);
    }
}
