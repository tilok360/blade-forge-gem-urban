package com.savepress.launcher;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.Drawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.Settings;
import android.text.Editable;
import android.text.InputType;
import android.text.TextWatcher;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.BaseAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ListView;
import android.widget.TextView;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

import rikka.shizuku.Shizuku;

public class MainActivity extends Activity {
    private static final int TREE = 41;
    private static final int INK = Color.parseColor("#1C1612");
    private static final int PAPER = Color.parseColor("#F4EFE6");
    private static final int MUTED = Color.parseColor("#8A7564");
    private static final int COPPER = Color.parseColor("#C4784A");
    private static final int LINE = Color.parseColor("#E4D8C8");

    private final List<Game> games = new ArrayList<Game>();
    private final List<Game> shown = new ArrayList<Game>();
    private GameAdapter gamesAdapter;
    private FieldAdapter fieldAdapter;

    private TextView status;
    private EditText search;
    private ListView list;
    private LinearLayout editorBar;
    private TextView editorTitle;
    private EditText moneyBox;
    private Button saveButton;
    private Button stampButton;
    private Bulldozer bulldozer;

    private String activePkg;
    private String activeLabel;
    private Finder.Hit activeHit;
    private SaveText.Doc activeDoc;
    private boolean awaitingReturn;
    private boolean showOther;
    private boolean wrapped;
    private String query = "";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        buildUi();
        loadGames();
        wireShizuku();
        if (!getSharedPreferences("savepress", MODE_PRIVATE).getBoolean("ok", false)) {
            new AlertDialog.Builder(this)
                    .setTitle("Single-player saves")
                    .setMessage("Savepress launches a game and edits that game's save on this phone. Not banks, wallets, or online games.")
                    .setPositiveButton("OK", (d, w) -> getSharedPreferences("savepress", MODE_PRIVATE).edit().putBoolean("ok", true).apply())
                    .setCancelable(false)
                    .show();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        refreshStatus();
        if (!awaitingReturn || activePkg == null) return;
        awaitingReturn = false;
        final String pkg = activePkg;
        final String label = activeLabel;
        setStatus("Back from " + label + ". Reading the save…");
        new Thread(() -> {
            Finder.Hit found = Finder.pick(this, pkg);
            runOnUiThread(() -> openHit(pkg, label, found));
        }).start();
    }

    @Override
    public void onBackPressed() {
        if (editorBar.getVisibility() == View.VISIBLE) {
            showLauncher();
            return;
        }
        super.onBackPressed();
    }

    @Override
    protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request != TREE || result != RESULT_OK || data == null || data.getData() == null || activePkg == null) return;
        Uri tree = data.getData();
        getContentResolver().takePersistableUriPermission(tree,
                data.getFlags() & (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION));
        Finder.rememberTree(this, activePkg, tree);
        final String pkg = activePkg;
        final String label = activeLabel;
        new Thread(() -> {
            Finder.Hit chosen = Finder.pick(this, pkg);
            runOnUiThread(() -> {
                if (chosen == null) setStatus("No progress save in that folder.");
                else openHit(pkg, label, chosen);
            });
        }).start();
    }

    private void buildUi() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(PAPER);
        int pad = dp(16);
        root.setPadding(pad, dp(20), pad, pad);

        TextView title = text("Savepress", 28, INK);
        title.setTypeface(Typeface.SERIF);
        root.addView(title);

        status = text("Loading games…", 14, MUTED);
        status.setPadding(0, dp(6), 0, dp(8));
        root.addView(status);

        LinearLayout actions = row();
        actions.addView(button("Allow Shizuku", false, v -> allowShizuku()));
        actions.addView(button("Open Shizuku", true, v -> openShizuku()));
        root.addView(actions);

        search = new EditText(this);
        search.setHint("Search games");
        search.setSingleLine(true);
        search.setBackgroundColor(Color.WHITE);
        search.setPadding(dp(12), dp(10), dp(12), dp(10));
        search.addTextChangedListener(new TextWatcher() {
            public void beforeTextChanged(CharSequence s, int a, int b, int c) {}
            public void onTextChanged(CharSequence s, int a, int b, int c) {
                query = s.toString().toLowerCase(Locale.US);
                applyFilter();
            }
            public void afterTextChanged(Editable s) {}
        });
        root.addView(search, match());

        editorBar = new LinearLayout(this);
        editorBar.setOrientation(LinearLayout.VERTICAL);
        editorBar.setVisibility(View.GONE);
        editorTitle = text("", 20, INK);
        editorTitle.setTypeface(Typeface.SERIF);
        editorTitle.setPadding(0, dp(8), 0, dp(6));
        editorBar.addView(editorTitle);
        moneyBox = new EditText(this);
        moneyBox.setHint("Max 200 million");
        moneyBox.setText("200000000");
        moneyBox.setSingleLine(true);
        moneyBox.setInputType(InputType.TYPE_CLASS_NUMBER);
        moneyBox.setBackgroundColor(Color.WHITE);
        moneyBox.setPadding(dp(12), dp(10), dp(12), dp(10));
        editorBar.addView(moneyBox, match());
        LinearLayout edits = row();
        edits.addView(button("Pick 1", false, v -> pickOne()));
        stampButton = button("Give all", false, v -> stamp());
        edits.addView(stampButton);
        editorBar.addView(edits);
        LinearLayout edits2 = row();
        saveButton = button("Save into game", false, v -> saveBack());
        edits2.addView(saveButton);
        edits2.addView(button("Play", true, v -> playAgain()));
        editorBar.addView(edits2);
        LinearLayout extra = row();
        extra.addView(button("Pick folder", true, v -> pickFolder()));
        extra.addView(button("Other fields", true, v -> {
            showOther = !showOther;
            if (fieldAdapter != null) fieldAdapter.notifyDataSetChanged();
            if (bulldozer != null) {
                setStatus(showOther
                        ? "Other fields are open. Tickets, gear, research, and profile are listed under the gifts."
                        : "Showing cash, gold, gems, and the gift rings. Tap Other fields for the rest.");
            }
        }));
        extra.addView(button("Games", true, v -> showLauncher()));
        editorBar.addView(extra);
        root.addView(editorBar);

        list = new ListView(this);
        list.setDivider(new android.graphics.drawable.ColorDrawable(LINE));
        list.setDividerHeight(dp(1));
        list.setOnItemClickListener((parent, view, position, id) -> {
            if (editorBar.getVisibility() == View.VISIBLE) {
                editField(position);
                return;
            }
            if (position < 0 || position >= shown.size()) return;
            launchGame(shown.get(position));
        });
        root.addView(list, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));
        setContentView(root);
    }

    private void wireShizuku() {
        try {
            Shizuku.addBinderReceivedListenerSticky(() -> runOnUiThread(this::refreshStatus));
            Shizuku.addRequestPermissionResultListener((code, grant) -> runOnUiThread(this::refreshStatus));
        } catch (Throwable ignored) {
            /* Shizuku isn't installed */
        }
    }

    private void loadGames() {
        PackageManager pm = getPackageManager();
        Intent probe = new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER);
        List<ResolveInfo> infos = pm.queryIntentActivities(probe, 0);
        games.clear();
        for (ResolveInfo info : infos) {
            if (info.activityInfo == null) continue;
            String pkg = info.activityInfo.packageName;
            if (getPackageName().equals(pkg)) continue;
            String label = info.loadLabel(pm).toString();
            Drawable icon = info.loadIcon(pm);
            boolean system = (info.activityInfo.applicationInfo.flags & ApplicationInfo.FLAG_SYSTEM) != 0;
            games.add(new Game(label, pkg, icon, system));
        }
        Collections.sort(games, new Comparator<Game>() {
            @Override
            public int compare(Game a, Game b) {
                return a.label.compareToIgnoreCase(b.label);
            }
        });
        gamesAdapter = new GameAdapter();
        list.setAdapter(gamesAdapter);
        applyFilter();
        refreshStatus();
    }

    private void launchGame(Game game) {
        if (blocked(game.pkg)) {
            setStatus("Savepress won't open banking or login apps.");
            return;
        }
        activePkg = game.pkg;
        activeLabel = game.label;
        bulldozer = null;
        setStatus("Opening the save for " + game.label + "…");
        if ("io.supercent.bulldozermasters".equals(game.pkg)) {
            new Thread(() -> {
                Bulldozer loaded = Bulldozer.load(game.pkg);
                runOnUiThread(() -> {
                    if (loaded == null) {
                        setStatus(Shell.shizukuReady()
                                ? "Could not read UserData. Allow Shizuku, then tap the game again."
                                : "Tap Allow Shizuku, then tap the game again.");
                        return;
                    }
                    bulldozer = loaded;
                    activeDoc = null;
                    showEditor();
                });
            }).start();
            return;
        }
        new Thread(() -> {
            Finder.Hit chosen = Finder.pick(this, game.pkg);
            runOnUiThread(() -> {
                activePkg = game.pkg;
                activeLabel = game.label;
                if (chosen == null) {
                    if (!Shell.shizukuReady()) {
                        setStatus("Tap Allow Shizuku, then tap " + game.label + " again. Cash is in the UserData file.");
                        return;
                    }
                    setStatus("Could not read UserData, where coin is stored. Allow Shizuku, then tap the game again.");
                    return;
                }
                openHit(game.pkg, game.label, chosen);
            });
        }).start();
    }

    private void play(String pkg) {
        Intent launch = getPackageManager().getLaunchIntentForPackage(pkg);
        if (launch == null) {
            setStatus("That game has no launcher.");
            return;
        }
        awaitingReturn = true;
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        startActivity(launch);
    }

    private void openHit(String pkg, String label, Finder.Hit hit) {
        activePkg = pkg;
        activeLabel = label;
        activeHit = hit;
        if (hit == null) {
            showLauncher();
            setStatus("No cash file for " + label + ". Analytics logs are ignored. The money may be private game data.");
            return;
        }
        new Thread(() -> {
            try {
                byte[] bytes = hit.uri ? Shell.readUri(this, Uri.parse(hit.key)) : Shell.readPath(hit.key);
                String decoded = Codec.decodeBody(bytes);
                wrapped = decoded != null;
                SaveText.Doc doc = wrapped ? SaveText.parse(decoded, hit.name) : SaveText.parseBytes(bytes, hit.name);
                runOnUiThread(() -> {
                    if (doc == null) {
                        showLauncher();
                        setStatus(hit.name + " isn't JSON, preferences, or key=value.");
                        return;
                    }
                    if (doc.encrypted || (!doc.writable && doc.fields.isEmpty())) {
                        showLauncher();
                        setStatus(doc.warning != null ? doc.warning : (hit.name + " looks encrypted. Savepress won't change it."));
                        return;
                    }
                    activeDoc = doc;
                    showOther = false;
                    showEditor();
                });
            } catch (Exception e) {
                runOnUiThread(() -> setStatus(e.getMessage() == null ? "Couldn't read the save." : e.getMessage()));
            }
        }).start();
    }

    private void showEditor() {
        search.setVisibility(View.GONE);
        editorBar.setVisibility(View.VISIBLE);
        if (bulldozer != null) {
            editorTitle.setText(activeLabel + " · cash, gems, gear");
            stampButton.setText("Give all");
            moneyBox.setText("200000000");
            fieldAdapter = new FieldAdapter();
            list.setAdapter(fieldAdapter);
            setStatus("Type an amount. Pick 1 changes one line. Give all fills everything. Then Save, then Play.");
            return;
        }
        stampButton.setText("Give all");
        editorTitle.setText(activeLabel + " · " + (activeHit == null ? "save" : Codec.logicalName(activeHit.name)));
        fieldAdapter = new FieldAdapter();
        list.setAdapter(fieldAdapter);
        int moneyFields = 0;
        boolean checksum = false;
        for (SaveText.Field field : activeDoc.fields) {
            if ("money".equals(field.role)) moneyFields++;
            if (field.warning != null) checksum = true;
        }
        if (moneyFields == 0) showOther = true;
        String statusText = moneyFields == 0
                ? "This screen is Savepress, not the game. Tap a number, then Save into the game, then Play."
                : "Cash fields are ranked by how sure Savepress is. Type an amount, tap Give all, then Save into the game, then Play.";
        if (activeDoc.warning != null) statusText = activeDoc.warning + " " + statusText;
        else if (checksum) statusText = "A checksum sits next to a currency field. Changing the amount may not stick until the hash is updated too. " + statusText;
        if (!activeDoc.writable) statusText = activeDoc.warning != null ? activeDoc.warning : "This file is listed but won't be rewritten.";
        setStatus(statusText);
        if (!"binary".equals(activeDoc.format) && moneyFields > 0) {
            moneyBox.setText("999999999");
            moneyBox.setHint("Safe max 999999999");
        }
    }

    private void showLauncher() {
        editorBar.setVisibility(View.GONE);
        search.setVisibility(View.VISIBLE);
        activeDoc = null;
        bulldozer = null;
        list.setAdapter(gamesAdapter);
        refreshStatus();
    }

    private void editField(int position) {
        if (fieldAdapter == null) return;
        if (bulldozer != null) {
            if (position < 0 || position >= BulldozerText.rows(bulldozer.files, showOther).size()) return;
            BulldozerText.Row row = BulldozerText.rows(bulldozer.files, showOther).get(position);
            EditText input = new EditText(this);
            input.setInputType(InputType.TYPE_CLASS_NUMBER);
            input.setText(row.value);
            input.setSelection(input.getText().length());
            new AlertDialog.Builder(this)
                    .setTitle(row.title)
                    .setMessage("This changes only " + row.title + ".")
                    .setView(input)
                    .setPositiveButton("Set", (d, w) -> {
                        String raw = input.getText().toString().trim().replace(",", "");
                        if (!BulldozerText.setOne(bulldozer.files, row, raw)) {
                            setStatus("Enter a number up to 200 million.");
                            return;
                        }
                        fieldAdapter.notifyDataSetChanged();
                        setStatus(row.title + " set to " + raw + ". Save into the game.");
                    })
                    .setNegativeButton("Cancel", null)
                    .show();
            return;
        }
        if (activeDoc == null) return;
        if (position < 0 || position >= fieldAdapter.getCount()) return;
        SaveText.Field field = (SaveText.Field) fieldAdapter.getItem(position);
        EditText input = new EditText(this);
        input.setInputType(InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_FLAG_DECIMAL | InputType.TYPE_NUMBER_FLAG_SIGNED);
        input.setText(field.shown());
        input.setSelection(input.getText().length());
        new AlertDialog.Builder(this)
                .setTitle(field.key)
                .setMessage("Type the new amount")
                .setView(input)
                .setPositiveButton("Set", (d, w) -> {
                    if (!SaveText.setNumber(field, input.getText().toString())) {
                        setStatus("Enter a number.");
                        return;
                    }
                    fieldAdapter.notifyDataSetChanged();
                    setStatus(field.key + " set to " + field.shown() + ". Save into the game.");
                })
                .setNegativeButton("Cancel", null)
                .show();
    }

    private void pickOne() {
        if (moneyBox == null) return;
        String raw = moneyBox.getText().toString().trim().replace(",", "");
        if (!raw.matches("\\d+") || raw.length() > 9 || Long.parseLong(raw) > 200_000_000L) {
            setStatus("Type an amount up to 200 million, then Pick 1.");
            return;
        }
        if (bulldozer != null) {
            final java.util.List<BulldozerText.Row> rows = BulldozerText.rows(bulldozer.files, true);
            String[] labels = new String[rows.size()];
            for (int i = 0; i < rows.size(); i++) labels[i] = rows.get(i).line();
            new AlertDialog.Builder(this)
                    .setTitle("Pick 1")
                    .setItems(labels, (d, which) -> {
                        BulldozerText.Row row = rows.get(which);
                        if (!BulldozerText.setOne(bulldozer.files, row, raw)) {
                            setStatus("Couldn't change " + row.title + ".");
                            return;
                        }
                        if (fieldAdapter != null) fieldAdapter.notifyDataSetChanged();
                        setStatus(row.title + " set to " + raw + ". Nothing else changed. Save into the game.");
                    })
                    .setNegativeButton("Cancel", null)
                    .show();
            return;
        }
        if (activeDoc == null) return;
        final java.util.List<SaveText.Field> fields = new java.util.ArrayList<SaveText.Field>();
        for (SaveText.Field field : activeDoc.fields) {
            if (field.shown().matches("-?\\d+(\\.\\d+)?")) fields.add(field);
        }
        if (fields.isEmpty()) {
            setStatus("No number to change in this file.");
            return;
        }
        String[] labels = new String[fields.size()];
        for (int i = 0; i < fields.size(); i++) labels[i] = fields.get(i).key + "  " + fields.get(i).shown();
        new AlertDialog.Builder(this)
                .setTitle("Pick 1")
                .setItems(labels, (d, which) -> {
                    SaveText.Field field = fields.get(which);
                    if (!SaveText.setNumber(field, raw)) {
                        setStatus("Enter a number.");
                        return;
                    }
                    if (fieldAdapter != null) fieldAdapter.notifyDataSetChanged();
                    setStatus(field.key + " set to " + raw + ". Nothing else changed. Save into the game.");
                })
                .setNegativeButton("Cancel", null)
                .show();
    }

    private void stamp() {
        if (moneyBox == null) return;
        String raw = moneyBox.getText().toString().trim().replace(",", "");
        long money;
        try {
            money = Long.parseLong(raw);
        } catch (NumberFormatException e) {
            setStatus("Enter an amount.");
            return;
        }
        if (money < 0) {
            setStatus("Enter an amount.");
            return;
        }
        if (money > 200_000_000L) money = 200_000_000L;
        if (bulldozer != null) {
            BulldozerText.giveAll(bulldozer.files, Long.toString(money));
            if (fieldAdapter != null) fieldAdapter.notifyDataSetChanged();
            setStatus("Filled to " + money + ". Save into the game, then Play.");
            return;
        }
        if (activeDoc == null) return;
        if (!activeDoc.writable) {
            setStatus(activeDoc.warning != null ? activeDoc.warning : "Savepress won't change this file.");
            return;
        }
        if (money > SaveText.SAFE_MONEY) money = SaveText.SAFE_MONEY;
        int n = SaveText.stamp(activeDoc, money, 10);
        if (fieldAdapter != null) fieldAdapter.notifyDataSetChanged();
        setStatus(n == 0
                ? "No money or currency field in this file. Tap a number yourself."
                : "Set " + n + " amount" + (n == 1 ? "" : "s") + " to " + money + ". Save into the game.");
    }

    private void saveBack() {
        if (bulldozer != null) {
            saveButton.setEnabled(false);
            new Thread(() -> {
                try {
                    bulldozer.save();
                    runOnUiThread(() -> {
                        saveButton.setEnabled(true);
                        setStatus("Wrote cash, gems, tickets, jewelry, upgrades, and equipment. Play the game.");
                    });
                } catch (Exception e) {
                    runOnUiThread(() -> {
                        saveButton.setEnabled(true);
                        setStatus(e.getMessage() == null ? "Couldn't write the save." : e.getMessage());
                    });
                }
            }).start();
            return;
        }
        if (activeDoc == null || activeHit == null) return;
        if (!activeDoc.writable) {
            setStatus(activeDoc.warning != null ? activeDoc.warning : "Savepress won't change this file, so it stays intact.");
            return;
        }
        final String text = activeDoc.render();
        final Finder.Hit hit = activeHit;
        final SaveText.Doc doc = activeDoc;
        final boolean wrap = wrapped;
        saveButton.setEnabled(false);
        new Thread(() -> {
            try {
                byte[] data;
                if (wrap) data = Codec.encodeBody(text);
                else if ("binary".equals(doc.format) && doc.originalBytes != null) data = doc.renderBytes();
                else data = text.getBytes(StandardCharsets.UTF_8);
                if (hit.uri) {
                    backupUri(hit, wrap ? Codec.encodeBody(doc.original == null ? text : doc.original)
                            : (doc.originalBytes != null ? doc.originalBytes : (doc.original == null ? data : doc.original.getBytes(StandardCharsets.UTF_8))));
                    Shell.writeUri(this, Uri.parse(hit.key), data);
                } else Shell.writePath(hit.key, data);
                if (wrap && !hit.uri && "UserData".equals(Codec.logicalName(hit.name))) writeBigCoin(hit.key);
                runOnUiThread(() -> {
                    saveButton.setEnabled(true);
                    setStatus("Wrote the save. The original is kept as a .bak file. Open the game again to see it.");
                });
            } catch (Exception e) {
                runOnUiThread(() -> {
                    saveButton.setEnabled(true);
                    setStatus(e.getMessage() == null ? "Couldn't write the save." : e.getMessage());
                });
            }
        }).start();
    }

    private void writeBigCoin(String userDataPath) {
        String amount = moneyBox == null ? "" : moneyBox.getText().toString().trim();
        if (!amount.matches("\\d+")) return;
        java.io.File parent = new java.io.File(userDataPath).getParentFile();
        if (parent == null) return;
        String sibling = new java.io.File(parent, Codec.encodeName("UserData_BigCoin")).getAbsolutePath();
        try {
            Shell.readPath(sibling);
            Shell.writePath(sibling, Codec.encodeBody(amount));
        } catch (Exception ignored) {
            /* no separate big-coin file */
        }
    }


    private void backupUri(Finder.Hit hit, byte[] original) {
        if (original == null || hit == null) return;
        try {
            java.io.File dir = getExternalFilesDir("backups");
            if (dir == null) dir = getFilesDir();
            if (!dir.exists() && !dir.mkdirs()) return;
            String name = Codec.logicalName(hit.name);
            if (name == null || name.isEmpty()) name = "save";
            java.io.File bak = new java.io.File(dir, name + ".bak");
            if (bak.exists()) return;
            try (java.io.FileOutputStream out = new java.io.FileOutputStream(bak)) {
                out.write(original);
            }
        } catch (Exception ignored) {
            /* best-effort backup */
        }
    }

    private void playAgain() {
        if (activePkg != null) play(activePkg);
    }

    private void pickFolder() {
        if (activePkg == null) {
            setStatus("Tap a game first, then pick its folder if it wasn't found.");
            return;
        }
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION
                | Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION
                | Intent.FLAG_GRANT_PREFIX_URI_PERMISSION);
        startActivityForResult(intent, TREE);
    }

    private void allowShizuku() {
        try {
            if (!Shizuku.pingBinder()) {
                setStatus("Shizuku isn't running. Open it and start the service, then come back.");
                return;
            }
            if (Shizuku.checkSelfPermission() == PackageManager.PERMISSION_GRANTED) {
                setStatus("Shizuku is allowed. Tap a game.");
                return;
            }
            Shizuku.requestPermission(1);
        } catch (Throwable t) {
            setStatus("Install Shizuku, start it, then tap Allow.");
        }
    }

    private void openShizuku() {
        Intent launch = getPackageManager().getLaunchIntentForPackage("moe.shizuku.privileged.api");
        if (launch != null) {
            startActivity(launch);
            return;
        }
        startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("https://shizuku.rikka.app/")));
    }

    private void refreshStatus() {
        if (editorBar.getVisibility() == View.VISIBLE) return;
        boolean files = Build.VERSION.SDK_INT < 30 || Environment.isExternalStorageManager();
        if (Shell.shizukuReady()) setStatus(shown.size() + " games. Tap one. Shizuku can see its folder.");
        else if (files) setStatus(shown.size() + " games. Tap one. If the save stays hidden, start Shizuku.");
        else setStatus(shown.size() + " games. Start Shizuku so Savepress can see game folders.");
    }

    private void applyFilter() {
        shown.clear();
        for (Game game : games) {
            if (query.isEmpty()
                    || game.label.toLowerCase(Locale.US).contains(query)
                    || game.pkg.toLowerCase(Locale.US).contains(query)) {
                shown.add(game);
            }
        }
        if (gamesAdapter != null) gamesAdapter.notifyDataSetChanged();
        refreshStatus();
    }

    private void setStatus(String message) {
        status.setText(message);
    }

    private boolean blocked(String pkg) {
        String lower = pkg.toLowerCase(Locale.US);
        String[] words = {"bank", "wallet", "paypal", "venmo", "cashapp", "coinbase", "binance", "authenticator", "1password", "bitwarden"};
        for (String word : words) if (lower.contains(word)) return true;
        return false;
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private TextView text(String value, int sp, int color) {
        TextView view = new TextView(this);
        view.setText(value);
        view.setTextSize(sp);
        view.setTextColor(color);
        return view;
    }

    private Button button(String label, boolean quiet, View.OnClickListener click) {
        Button button = new Button(this);
        button.setText(label);
        button.setAllCaps(false);
        button.setTextColor(quiet ? INK : Color.WHITE);
        button.setBackgroundColor(quiet ? LINE : COPPER);
        button.setMinHeight(dp(48));
        button.setOnClickListener(click);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1);
        params.setMargins(dp(4), dp(4), dp(4), dp(4));
        button.setLayoutParams(params);
        return button;
    }

    private LinearLayout row() {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER_VERTICAL);
        return row;
    }

    private LinearLayout.LayoutParams match() {
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        params.topMargin = dp(8);
        return params;
    }

    private static final class Game {
        final String label;
        final String pkg;
        final Drawable icon;
        final boolean system;

        Game(String label, String pkg, Drawable icon, boolean system) {
            this.label = label;
            this.pkg = pkg;
            this.icon = icon;
            this.system = system;
        }
    }

    private final class GameAdapter extends BaseAdapter {
        public int getCount() { return shown.size(); }
        public Object getItem(int i) { return shown.get(i); }
        public long getItemId(int i) { return i; }
        public View getView(int i, View convert, ViewGroup parent) {
            LinearLayout row = convert instanceof LinearLayout ? (LinearLayout) convert : new LinearLayout(MainActivity.this);
            row.setOrientation(LinearLayout.HORIZONTAL);
            row.setGravity(Gravity.CENTER_VERTICAL);
            row.setMinimumHeight(dp(56));
            row.setPadding(0, dp(8), 0, dp(8));
            row.removeAllViews();
            Game game = shown.get(i);
            ImageView icon = new ImageView(MainActivity.this);
            icon.setImageDrawable(game.icon);
            LinearLayout.LayoutParams iconBox = new LinearLayout.LayoutParams(dp(40), dp(40));
            iconBox.rightMargin = dp(12);
            row.addView(icon, iconBox);
            LinearLayout words = new LinearLayout(MainActivity.this);
            words.setOrientation(LinearLayout.VERTICAL);
            TextView name = text(game.label, 16, INK);
            TextView pkg = text(game.pkg, 12, MUTED);
            words.addView(name);
            words.addView(pkg);
            row.addView(words);
            return row;
        }
    }

    private final class FieldAdapter extends BaseAdapter {
        private List<SaveText.Field> visible() {
            List<SaveText.Field> out = new ArrayList<SaveText.Field>();
            if (bulldozer != null || activeDoc == null) return out;
            for (SaveText.Field field : activeDoc.fields) {
                if (!showOther && !"money".equals(field.role)) continue;
                out.add(field);
            }
            Collections.sort(out, (a, b) -> {
                int byConf = Integer.compare(b.confidence, a.confidence);
                if (byConf != 0) return byConf;
                if ("coin".equals(a.key) && !"coin".equals(b.key)) return -1;
                if ("coin".equals(b.key) && !"coin".equals(a.key)) return 1;
                return a.path.compareTo(b.path);
            });
            return out;
        }
        public int getCount() {
            if (bulldozer != null) return BulldozerText.rows(bulldozer.files, showOther).size();
            return visible().size();
        }
        public Object getItem(int i) {
            if (bulldozer != null) return BulldozerText.rows(bulldozer.files, showOther).get(i);
            return visible().get(i);
        }
        public long getItemId(int i) { return i; }
        public View getView(int i, View convert, ViewGroup parent) {
            if (bulldozer != null) {
                BulldozerText.Row row = BulldozerText.rows(bulldozer.files, showOther).get(i);
                LinearLayout col = new LinearLayout(MainActivity.this);
                col.setOrientation(LinearLayout.VERTICAL);
                col.setPadding(0, dp(10), 0, dp(10));
                col.addView(text(row.title, 16, INK));
                StringBuilder under = new StringBuilder();
                if (row.id != null && row.id.length() > 0) under.append(row.id);
                if (row.kind != null && row.kind.length() > 0) {
                    if (under.length() > 0) under.append("  ");
                    under.append(row.kind);
                }
                if (under.length() > 0) under.append('\n');
                if (row.value != null) under.append(row.value);
                col.addView(text(under.toString(), 13, MUTED));
                return col;
            }
            SaveText.Field field = visible().get(i);
            LinearLayout col = new LinearLayout(MainActivity.this);
            col.setOrientation(LinearLayout.VERTICAL);
            col.setPadding(0, dp(10), 0, dp(10));
            TextView name = text(SaveText.fieldLabel(field), 16, INK);
            StringBuilder bodyText = new StringBuilder();
            if (field.key != null) bodyText.append(field.key);
            if (field.path != null && field.path.length() > 0) {
                if (bodyText.length() > 0) bodyText.append("  ");
                bodyText.append(field.path);
            }
            if ("money".equals(field.role) && field.confidence > 0) {
                bodyText.append('\n').append(SaveText.confidenceLabel(field.confidence));
            }
            if (field.warning != null) bodyText.append('\n').append(field.warning);
            if (activeHit != null && activeHit.name != null) bodyText.append('\n').append(activeHit.name);
            bodyText.append('\n');
            if (field.changed()) {
                bodyText.append(field.literal).append(" -> ").append(field.shown());
            } else {
                bodyText.append(field.literal);
            }
            bodyText.append('\n').append("Tap to change");
            TextView body = text(bodyText.toString(), 13, MUTED);
            col.addView(name);
            col.addView(body);
            return col;
        }
    }
}
