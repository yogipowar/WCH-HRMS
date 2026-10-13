package com.webcreatehub.hrms;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class ClockInBootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || !Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
            return;
        }
        ClockInReminder.rescheduleFromPrefs(context);
    }
}
