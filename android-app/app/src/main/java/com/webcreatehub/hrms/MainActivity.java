package com.webcreatehub.hrms;

import android.annotation.SuppressLint;
import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.Settings;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.activity.OnBackPressedCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.FileProvider;

import java.io.File;
import java.util.List;

public class MainActivity extends AppCompatActivity {
    private static final String APP_HOST = "hrms.webcreatehub.com";
    private static final String APP_URL = "https://" + APP_HOST;
    private static final String APP_LOGIN_URL = APP_URL + "/login?native=1";
    private static final String CHROME_MOBILE_UA =
        "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 "
            + "(KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36";
    private static final String UPDATE_APK_NAME = "WCH-HRMS-update.apk";

    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;
    private long updateDownloadId = -1L;
    private String pendingUpdateUrl = null;
    private boolean mainFrameRecovering = false;

    private final ActivityResultLauncher<Intent> fileChooser = registerForActivityResult(
        new ActivityResultContracts.StartActivityForResult(),
        result -> {
            Uri[] uris = WebChromeClient.FileChooserParams.parseResult(result.getResultCode(), result.getData());
            if (filePathCallback != null) {
                filePathCallback.onReceiveValue(uris);
                filePathCallback = null;
            }
        }
    );

    private final BroadcastReceiver downloadReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            long id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1L);
            if (id != updateDownloadId || id < 0) {
                return;
            }
            installDownloadedUpdate();
        }
    };

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        webView = findViewById(R.id.webView);

        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(webView, true);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setUserAgentString(CHROME_MOBILE_UA);
        // Drop a cached login page that still sends sign-in out to Chrome.
        webView.clearCache(true);

        webView.addJavascriptInterface(new NativeBridge(), "WchHrmsApp");

        IntentFilter filter = new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(downloadReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(downloadReceiver, filter);
        }

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (!request.isForMainFrame()) {
                    return false;
                }
                Uri uri = request.getUrl();
                String scheme = uri.getScheme() == null ? "" : uri.getScheme();

                if ("wchhrms".equalsIgnoreCase(scheme)) {
                    handleAppDeepLink(uri);
                    return true;
                }

                if ("intent".equalsIgnoreCase(scheme)) {
                    return handleIntentUrl(view, uri);
                }

                if ("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme)) {
                    return false;
                }

                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                mainFrameRecovering = false;
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request == null || !request.isForMainFrame()) {
                    return;
                }
                if (mainFrameRecovering) {
                    mainFrameRecovering = false;
                    view.post(() -> view.loadDataWithBaseURL(
                        APP_URL,
                        "<html><body style=\"font-family:sans-serif;background:#111;color:#fff;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center;padding:24px\">"
                            + "<div><p>WCH HRMS could not open this screen.</p>"
                            + "<p><a style=\"color:#fff\" href=\"" + APP_LOGIN_URL + "\">Try again</a></p></div></body></html>",
                        "text/html",
                        "UTF-8",
                        null
                    ));
                    return;
                }
                mainFrameRecovering = true;
                view.post(() -> view.loadUrl(APP_LOGIN_URL));
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(
                WebView view,
                ValueCallback<Uri[]> callback,
                FileChooserParams params
            ) {
                if (filePathCallback != null) {
                    filePathCallback.onReceiveValue(null);
                }
                filePathCallback = callback;
                try {
                    fileChooser.launch(params.createIntent());
                    return true;
                } catch (Exception ignored) {
                    filePathCallback = null;
                    return false;
                }
            }
        });

        webView.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> {
            if (url != null && url.toLowerCase().contains(".apk")) {
                startApkUpdate(url);
                return;
            }
            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
            request.setMimeType(mimeType);
            String cookie = CookieManager.getInstance().getCookie(url);
            if (cookie != null) {
                request.addRequestHeader("Cookie", cookie);
            }
            request.addRequestHeader("User-Agent", userAgent);
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            request.setDestinationInExternalPublicDir(
                Environment.DIRECTORY_DOWNLOADS,
                URLUtil.guessFileName(url, contentDisposition, mimeType)
            );
            DownloadManager manager = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
            manager.enqueue(request);
            Toast.makeText(this, "Downloading…", Toast.LENGTH_SHORT).show();
        });

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack();
                } else {
                    setEnabled(false);
                    getOnBackPressedDispatcher().onBackPressed();
                }
            }
        });

        if (savedInstanceState == null) {
            if (!handleLaunchIntent(getIntent())) {
                webView.loadUrl(APP_LOGIN_URL);
            }
        } else {
            webView.restoreState(savedInstanceState);
        }
    }

    @Override
    protected void onDestroy() {
        try {
            unregisterReceiver(downloadReceiver);
        } catch (Exception ignored) {
            // already unregistered
        }
        super.onDestroy();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleLaunchIntent(intent);
    }

    private boolean handleLaunchIntent(Intent intent) {
        if (intent == null || intent.getData() == null) {
            return false;
        }
        Uri uri = intent.getData();
        if ("wchhrms".equalsIgnoreCase(uri.getScheme())) {
            handleAppDeepLink(uri);
            return true;
        }
        if (APP_HOST.equalsIgnoreCase(uri.getHost())) {
            String url = uri.toString();
            if (!url.contains("native=1")) {
                url += (url.contains("?") ? "&" : "?") + "native=1";
            }
            webView.loadUrl(url);
            return true;
        }
        return false;
    }

    private void handleAppDeepLink(Uri uri) {
        String host = uri.getHost() == null ? "" : uri.getHost();
        if (!"oauth".equalsIgnoreCase(host)) {
            webView.loadUrl(APP_LOGIN_URL);
            return;
        }
        if (uri.getQueryParameter("error") != null) {
            webView.loadUrl(APP_URL + "/login?native=1&google_error=1");
            return;
        }
        String handoff = uri.getQueryParameter("handoff");
        if (handoff != null && !handoff.isEmpty()) {
            webView.loadUrl(APP_URL + "/auth/google/callback?handoff=" + Uri.encode(handoff) + "&native=1");
            return;
        }
        // Legacy: full credential in query (may be truncated — prefer handoff).
        String credential = uri.getQueryParameter("credential");
        if (credential == null || credential.isEmpty()) {
            webView.loadUrl(APP_URL + "/login?native=1&google_error=1");
            return;
        }
        String callback = APP_URL + "/auth/google/callback?native=1#id_token=" + Uri.encode(credential);
        webView.loadUrl(callback);
    }

    private boolean handleIntentUrl(WebView view, Uri uri) {
        try {
            Intent parsed = Intent.parseUri(uri.toString(), Intent.URI_INTENT_SCHEME);
            Uri data = parsed.getData();
            if (data != null) {
                String host = data.getHost() == null ? "" : data.getHost().toLowerCase();
                if (isAppOrGoogleHost(host) || APP_HOST.equalsIgnoreCase(host)) {
                    view.loadUrl(data.toString());
                    return true;
                }
            }
            String fallback = parsed.getStringExtra("browser_fallback_url");
            if (fallback != null && !fallback.isEmpty()) {
                view.loadUrl(fallback);
                return true;
            }
        } catch (Exception ignored) {
            // swallow
        }
        return true;
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (pendingUpdateUrl != null
            && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            && getPackageManager().canRequestPackageInstalls()) {
            String url = pendingUpdateUrl;
            pendingUpdateUrl = null;
            startApkUpdate(url);
        }
    }

    private void openGoogleOAuth(String url) {
        webView.loadUrl(url);
    }

    private void startApkUpdate(String url) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            && !getPackageManager().canRequestPackageInstalls()) {
            pendingUpdateUrl = url;
            Toast.makeText(
                this,
                "Allow “Install unknown apps” for WCH HRMS, then return here",
                Toast.LENGTH_LONG
            ).show();
            openUnknownSourcesSettings();
            return;
        }

        try {
            File dir = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
            if (dir == null) {
                Toast.makeText(this, "Could not start update download", Toast.LENGTH_LONG).show();
                return;
            }
            if (!dir.exists()) {
                //noinspection ResultOfMethodCallIgnored
                dir.mkdirs();
            }
            File existing = new File(dir, UPDATE_APK_NAME);
            if (existing.exists()) {
                //noinspection ResultOfMethodCallIgnored
                existing.delete();
            }

            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
            request.setMimeType("application/vnd.android.package-archive");
            request.setTitle("WCH HRMS Update");
            request.setDescription("Downloading update…");
            request.addRequestHeader("User-Agent", CHROME_MOBILE_UA);
            String cookie = CookieManager.getInstance().getCookie(url);
            if (cookie != null) {
                request.addRequestHeader("Cookie", cookie);
            }
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            request.setDestinationInExternalFilesDir(this, Environment.DIRECTORY_DOWNLOADS, UPDATE_APK_NAME);

            DownloadManager manager = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
            updateDownloadId = manager.enqueue(request);
            Toast.makeText(this, "Downloading update…", Toast.LENGTH_SHORT).show();
        } catch (Exception e) {
            Toast.makeText(this, "Could not start update download", Toast.LENGTH_LONG).show();
        }
    }

    private void openUnknownSourcesSettings() {
        Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
        intent.setData(Uri.parse("package:" + getPackageName()));
        List<ResolveInfo> matches = getPackageManager().queryIntentActivities(intent, 0);
        for (ResolveInfo info : matches) {
            if (info.activityInfo == null) {
                continue;
            }
            String pkg = info.activityInfo.packageName == null ? "" : info.activityInfo.packageName;
            if (pkg.contains("chrome") || pkg.contains("browser")) {
                continue;
            }
            if (pkg.contains("settings") || pkg.contains("permissioncontroller") || pkg.contains("packageinstaller")) {
                intent.setClassName(pkg, info.activityInfo.name);
                break;
            }
        }
        try {
            startActivity(intent);
        } catch (Exception e) {
            Toast.makeText(
                this,
                "In Settings, allow Install unknown apps for WCH HRMS, then tap Update again",
                Toast.LENGTH_LONG
            ).show();
        }
    }

    private void installDownloadedUpdate() {
        DownloadManager manager = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
        DownloadManager.Query query = new DownloadManager.Query();
        query.setFilterById(updateDownloadId);
        try (Cursor cursor = manager.query(query)) {
            if (cursor == null || !cursor.moveToFirst()) {
                return;
            }
            int statusIndex = cursor.getColumnIndex(DownloadManager.COLUMN_STATUS);
            if (statusIndex < 0 || cursor.getInt(statusIndex) != DownloadManager.STATUS_SUCCESSFUL) {
                Toast.makeText(this, "Update download failed", Toast.LENGTH_LONG).show();
                return;
            }
        }

        File dir = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
        if (dir == null) {
            Toast.makeText(this, "Update file not found", Toast.LENGTH_LONG).show();
            return;
        }
        File apk = new File(dir, UPDATE_APK_NAME);
        if (!apk.exists()) {
            Toast.makeText(this, "Update file not found", Toast.LENGTH_LONG).show();
            return;
        }

        Uri apkUri = FileProvider.getUriForFile(
            this,
            getPackageName() + ".fileprovider",
            apk
        );
        Intent install = new Intent(Intent.ACTION_VIEW);
        install.setDataAndType(apkUri, "application/vnd.android.package-archive");
        install.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        install.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        String installer = resolvePackageInstaller(install);
        if (installer != null) {
            install.setPackage(installer);
            grantUriPermission(installer, apkUri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
        }
        try {
            startActivity(install);
        } catch (Exception e) {
            Toast.makeText(this, "Open the downloaded APK from Notifications to install", Toast.LENGTH_LONG).show();
        }
    }

    private String resolvePackageInstaller(Intent install) {
        List<ResolveInfo> matches = getPackageManager().queryIntentActivities(install, 0);
        String[] preferred = new String[] {
            "com.google.android.packageinstaller",
            "com.android.packageinstaller",
            "com.samsung.android.packageinstaller",
            "com.miui.packageinstaller"
        };
        for (String pkg : preferred) {
            for (ResolveInfo info : matches) {
                if (info.activityInfo != null && pkg.equals(info.activityInfo.packageName)) {
                    return pkg;
                }
            }
        }
        for (ResolveInfo info : matches) {
            if (info.activityInfo == null || info.activityInfo.packageName == null) {
                continue;
            }
            String pkg = info.activityInfo.packageName;
            if (pkg.contains("chrome") || pkg.contains("browser")) {
                continue;
            }
            if (pkg.contains("packageinstaller")) {
                return pkg;
            }
        }
        return null;
    }

    private static boolean isAppOrGoogleHost(String host) {
        return host.endsWith("webcreatehub.com")
            || host.equals("accounts.google.com")
            || host.endsWith(".google.com")
            || host.endsWith(".google.co.in")
            || host.endsWith(".gstatic.com")
            || host.endsWith(".googleapis.com")
            || host.endsWith(".googleusercontent.com")
            || host.endsWith(".youtube.com");
    }

    public class NativeBridge {
        @JavascriptInterface
        public boolean isNativeApp() {
            return true;
        }

        @JavascriptInterface
        public String getPlatform() {
            return "android";
        }

        @JavascriptInterface
        public int getVersionCode() {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    return (int) getPackageManager()
                        .getPackageInfo(getPackageName(), PackageManager.PackageInfoFlags.of(0))
                        .getLongVersionCode();
                }
                //noinspection deprecation
                return getPackageManager().getPackageInfo(getPackageName(), 0).versionCode;
            } catch (Exception e) {
                return 0;
            }
        }

        @JavascriptInterface
        public String getVersionName() {
            try {
                return getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
            } catch (Exception e) {
                return "";
            }
        }

        @JavascriptInterface
        public void openUpdate(String url) {
            if (url == null || url.trim().isEmpty()) {
                return;
            }
            runOnUiThread(() -> startApkUpdate(url.trim()));
        }

        @JavascriptInterface
        public void startGoogleOAuth(String url) {
            if (url == null || url.trim().isEmpty()) {
                return;
            }
            runOnUiThread(() -> openGoogleOAuth(url.trim()));
        }

        @JavascriptInterface
        public void scheduleClockInReminder(String workStart) {
            int[] parts = parseClock(workStart);
            if (parts == null) {
                return;
            }
            runOnUiThread(() -> ClockInReminder.schedule(MainActivity.this, parts[0], parts[1]));
        }

        @JavascriptInterface
        public void markClockedInToday() {
            ClockInReminder.markClockedInToday(MainActivity.this);
        }
    }

    private static int[] parseClock(String value) {
        if (value == null) {
            return null;
        }
        String[] parts = value.trim().split(":");
        if (parts.length < 2) {
            return null;
        }
        try {
            int hour = Integer.parseInt(parts[0]);
            int minute = Integer.parseInt(parts[1]);
            if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
                return null;
            }
            return new int[] { hour, minute };
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    @Override
    protected void onSaveInstanceState(@NonNull Bundle outState) {
        super.onSaveInstanceState(outState);
        webView.saveState(outState);
    }
}
