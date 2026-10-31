// Supabase Edge Function: send-reminders
// Runs every minute (pg_cron) and sends Web Push for appointments / checklist alarms.
// Also answers {test:true} from the app (logged-in user) to send a test notification.
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SB_SERVICE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON = Deno.env.get("CRON_SECRET") || "";
webpush.setVapidDetails(
  Deno.env.get("VAPID_SUBJECT") || "mailto:admin@mahdavan.club",
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!,
);
const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

function toMin(t) { const p = String(t || "0:0").split(":"); return (+p[0] || 0) * 60 + (+p[1] || 0); }
function tehranNow() {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const p = {}; for (const x of f.formatToParts(new Date())) p[x.type] = x.value;
  return { today: `${p.year}-${p.month}-${p.day}`, now: (+p.hour) * 60 + (+p.minute) };
}
function computeAlerts(data, today, now) {
  const n = Object.assign({ on: true, appt: true, task: true, lead: 0 }, (data && data.settings && data.settings.notif) || {});
  const out = []; if (!n.on) return out;
  if (n.appt) for (const a of (data.appts || [])) {
    if (a.status !== "scheduled" || a.date !== today) continue;
    const lead = +n.lead || 0, trig = toMin(a.start) - lead;
    if (now >= trig && now < Math.min(toMin(a.end), trig + 20)) out.push({
      key: `a|${a.id}|${a.date}|${a.start}|${lead}`, title: "مهدوان کلاب",
      body: lead > 0 ? `نوبت ${a.customer_name} تا ${lead} دقیقه دیگر (${a.start})` : `نوبت ${a.customer_name} رسید (${a.start})`,
    });
  }
  if (n.task) for (const t of (data.tasks || [])) {
    if (!t.alarm || t.done) continue;
    const p = String(t.alarm).split(" ");
    const diff = Math.round((Date.parse(today) - Date.parse(p[0])) / 864e5) * 1440 + now - toMin(p[1]);
    if (diff >= 0 && diff < 30) out.push({ key: `t|${t.id}|${t.alarm}`, title: "یادآوری چک‌لیست", body: t.text });
  }
  return out;
}
async function sendTo(subs, payload) {
  let ok = 0;
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 3600, urgency: "high" });
      ok++;
    } catch (e) {
      if (e && (e.statusCode === 404 || e.statusCode === 410)) await sb.from("push_subs").delete().eq("endpoint", s.endpoint);
    }
  }));
  return ok;
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  let body = {}; try { body = await req.json(); } catch (_) {}
  // --- test from the app (logged-in user) ---
  if (body && body.test) {
    const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: u } = await sb.auth.getUser(jwt);
    if (!u || !u.user) return json({ error: "ورود لازم است" }, 401);
    const { data: subs } = await sb.from("push_subs").select("*").eq("user_id", u.user.id);
    if (!subs || !subs.length) return json({ sent: 0, error: "اشتراکی برای این گوشی ثبت نشده" });
    const n = await sendTo(subs, { title: "مهدوان کلاب", body: "اعلان واقعی کار می‌کند ✓", tag: "test" + Date.now() });
    return json({ sent: n });
  }
  // --- cron run ---
  if (!CRON || req.headers.get("x-cron-secret") !== CRON) return json({ error: "unauthorized" }, 401);
  const { today, now } = tehranNow();
  const { data: subsAll } = await sb.from("push_subs").select("*");
  const byUser = {}; for (const s of (subsAll || [])) (byUser[s.user_id] ||= []).push(s);
  const ids = Object.keys(byUser); let sent = 0;
  if (ids.length) {
    const { data: rows } = await sb.from("app_data").select("user_id,data").in("user_id", ids);
    for (const r of (rows || [])) {
      for (const al of computeAlerts(r.data || {}, today, now)) {
        const { data: ins } = await sb.from("push_sent").upsert({ key: `${r.user_id}|${al.key}`, user_id: r.user_id }, { onConflict: "key", ignoreDuplicates: true }).select();
        if (ins && ins.length) sent += await sendTo(byUser[r.user_id], { title: al.title, body: al.body, tag: al.key });
      }
    }
  }
  await sb.from("push_sent").delete().lt("sent_at", new Date(Date.now() - 3 * 864e5).toISOString());
  return json({ ok: true, today, now, users: ids.length, sent });
});
