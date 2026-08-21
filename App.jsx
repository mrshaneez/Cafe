import { useState, useEffect, useMemo, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

// ---------- Menu (preloaded) ----------
const MENU_RAW = {
  "Breakfast": [["Mashuni with Roshi/Disk",49],["Kulhimas with Roshi/Disk",49],["Maldivian All-Taste Breakfast",75],["Continental Breakfast",55],["Sunrise Breakfast",80]],
  "Super Healthy Segment": [["Avocado Breakfast",75],["Banana Chia Seed Breakfast",85],["Salmon Fish with Asparagus",200],["Healthy Veg & Grilled Chicken with Avocado",95]],
  "Curry, Paratha & Roshi": [["Veg Curry",45],["Chicken Curry",55],["Fish Curry",50],["Dhal Curry",39],["Beef Curry",65],["Egg Curry",45],["Beef Fry",65],["Chicken Fry",55],["Paratha",10],["Chapati",8],["Roshi",4],["Disk Roshi",10],["Mutton Curry",65]],
  "Omelette": [["Mix Omelette",20],["Plain Omelette",15],["Fried Egg",6],["Boiled Egg",6]],
  "Soup": [["Hot & Sour Veg",69],["Hot & Sour Chicken",79],["Hot & Sour Mix",89],["Cream of Chicken",95],["Noodles Soup",75],["Cream of Mushroom",79]],
  "Salad": [["Mixed Vegetable Salad",49],["Dynasty Special Chicken Salad",110],["Chicken Caesar Salad",110],["Tuna Caesar Salad",95]],
  "Koththu": [["Tuna Koththu",65],["Chicken Koththu",69],["Beef Koththu",79],["Chicken Cheese Koththu",89],["Valhomas Koththu",65],["Mix Koththu",85]],
  "Noodles": [["Tuna Noodles",65],["Chicken Noodles",69],["Beef Noodles",79],["Valhomas Noodles",65],["Mix Noodles",85],["Baami Goreng",85],["Veg Fried Noodles",65]],
  "Rice": [["Tuna Fried Rice",65],["Chicken Fried Rice",69],["Beef Fried Rice",79],["Veg Fried Rice",65],["Nasi Goreng",85],["Grilled Fish (Mashed Potato/Rice)",80],["Grilled Chicken (Mashed Potato/Rice)",85],["Garlic Chicken & Garlic Rice",110],["Plain Rice",30],["Garlic Rice",49]],
  "Pasta": [["Chicken Pasta",85],["Chicken Arrabbiata",95],["White Sauce Pasta",95],["Bolognese",89],["Aglio Olio",75],["Chicken Aglio Olio",85],["Carbonara Baked",99]],
  "Dynasty Special": [["Chicken Cheesy Fry",79],["Beef Cheesy Fry",85],["Chicken Steak & Garlic Rice",85],["Tuna Steak & Garlic Rice",69]],
  "Submarine & Sandwich": [["Chicken Submarine",85],["Beef Submarine",89],["Tuna Submarine",75],["Dynasty Chicken Submarine",89],["Club Sandwich (Tuna)",80],["Club Sandwich (Chicken)",85],["Club Sandwich (Beef)",90],["Dynasty Club Sandwich",89],["Tuna Sandwich",50],["Chicken Sandwich",55],["Beef Sandwich",60],["Chicken Burger",80],["Beef Burger",85],["Grill Chicken Burger",85],["Chicken Zinger Burger",85],["French Fries (Medium)",39],["French Fries (Large)",49],["Chicken & Chips",69],["Fish & Chips",69]],
  "Keema Noodles": [["Chicken Keema Noodles",85],["Beef Keema Noodles",90],["Egg Keema Noodles",75],["Veg Keema Noodles",70]],
  "Thukpa": [["Chicken Thukpa",85],["Beef Thukpa",90],["Egg Thukpa",75],["Veg Thukpa",70],["Mix Thukpa",95]],
  "Newari Khaja Set": [["Veg Khaja Set",90],["Chicken Khaja Set",110],["Buff Khaja Set",130]],
  "Lemon Dynasty Special Platter": [["Nanglo Food Platter",349],["Sukuti Khaja Set",130],["Momo & Current Combo",80]],
  "Nepali Thali Set": [["Veg Thali",110],["Chicken Thali",120],["Beef Thali",150],["Mutton Thali",150],["Fish Thali",120]],
  "Nepali Dhido Set": [["Nepali Veg Dhido Set",110],["Nepali Chicken Dhido Set",120],["Nepali Fish Dhido Set",120],["Nepali Mutton Dhido Set",150],["Nepali Beef Dhido Set",150],["Nepali Sukuti Dhido Set",150]],
};
const DEFAULT_MENU = Object.entries(MENU_RAW).flatMap(([cat, items]) => items.map(([name, price]) => ({ cat, name, price })));
const EXP_CATS = ["Ingredients", "Rent", "Utilities", "Wages", "Packaging", "Maintenance", "Other"];
const STORE_KEY = "lemon-dynasty-data";
const appStorage = {
  async get(k) { const v = localStorage.getItem(k); return v == null ? null : { key: k, value: v }; },
  async set(k, v) { localStorage.setItem(k, v); return { key: k, value: v }; },
};
const API_KEY_STORE = "ld-anthropic-key";
const getApiKey = () => localStorage.getItem(API_KEY_STORE) || "";
const API_HEADERS = () => ({ "Content-Type": "application/json", "x-api-key": getApiKey(), "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" });

// ---------- Helpers ----------
const todayStr = () => new Date().toISOString().slice(0, 10);
const monthOf = (d) => d.slice(0, 7);
const fmt = (n) => "MVR " + (Math.round(n * 100) / 100).toLocaleString();
const uid = () => Math.random().toString(36).slice(2, 9);
const dayLabel = (d) => new Date(d + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short" });

const EMPTY = { menu: DEFAULT_MENU, sales: [], expenses: [], inventory: [], staff: [], bills: [], shopping: [], recurring: [], money: { cashOpen: 0, bankOpen: 0, moves: [] }, users: [], sessionUserId: null, ingredients: [], recipes: [], costTarget: 0.3 };
const advance = (d, f) => {
  const dt = new Date(d + "T00:00:00");
  if (f === "daily") dt.setDate(dt.getDate() + 1);
  else if (f === "weekly") dt.setDate(dt.getDate() + 7);
  else dt.setMonth(dt.getMonth() + 1);
  return dt.toISOString().slice(0, 10);
};
function balances(data) {
  const money = data.money || { cashOpen: 0, bankOpen: 0, moves: [] };
  const calc = (acct) => {
    let b = acct === "cash" ? Number(money.cashOpen || 0) : Number(money.bankOpen || 0);
    data.sales.forEach((x) => { if ((x.pay || "cash") === acct) b += x.qty * x.price; });
    data.expenses.forEach((e) => { if ((e.from || "cash") === acct) b -= Number(e.amount); });
    (money.moves || []).forEach((m) => { if (m.to === acct) b += Number(m.amount); if (m.from === acct) b -= Number(m.amount); });
    return b;
  };
  return { cash: calc("cash"), bank: calc("bank") };
}

export default function LemonDynastyManager() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [saved, setSaved] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const r = await appStorage.get(STORE_KEY);
        setData(r ? { ...EMPTY, ...JSON.parse(r.value) } : { ...EMPTY });
      } catch { setData({ ...EMPTY }); }
    })();
  }, []);

  const postedRef = useRef(false);
  useEffect(() => {
    if (!data || postedRef.current) return;
    postedRef.current = true;
    const rec = data.recurring || [];
    if (!rec.length) return;
    const t = todayStr();
    const newExp = [];
    const upd = rec.map((r) => {
      let next = r.next, g = 0;
      while (next <= t && g < 400) {
        newExp.push({ id: uid(), date: next, cat: r.cat, amount: Number(r.amount), note: r.note || "", recId: r.id, from: r.from || "cash" });
        next = advance(next, r.freq); g += 1;
      }
      return { ...r, next };
    });
    if (newExp.length) update({ expenses: [...data.expenses, ...newExp], recurring: upd });
  }, [data]);

  const update = (patch) => {
    setData((prev) => {
      const next = { ...prev, ...patch };
      appStorage.set(STORE_KEY, JSON.stringify(next)).then(() => {
        setSaved("Saved");
        setTimeout(() => setSaved(""), 1200);
      }).catch(() => setSaved("Save failed"));
      return next;
    });
  };

  if (!data) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#F3F6F3" }}>
      <div className="text-sm" style={{ color: "#11433D", fontFamily: "'DM Sans', sans-serif" }}>Opening the ledger…</div>
    </div>
  );

  const dark = data.theme === "dark";
  const today = todayStr();
  const todayRevenue = data.sales.filter((s) => s.date === today).reduce((a, s) => a + s.qty * s.price, 0);
  const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const yestRevenue = data.sales.filter((s) => s.date === yest).reduce((a, s) => a + s.qty * s.price, 0);

  const users = data.users || [];
  const me = users.find((u) => u.id === data.sessionUserId) || null;
  const needSetup = users.length === 0;
  const ACCESS = {
    admin: ["home", "sales", "bills", "money", "stock", "staff", "recipes", "advisor"],
    manager: ["home", "sales", "bills", "money", "stock", "staff", "recipes", "advisor"],
    staff: ["sales", "bills", "stock"],
  };
  const allowed = me ? (ACCESS[me.role] || ACCESS.staff) : [];
  const activeTab = allowed.includes(tab) ? tab : (allowed[0] || "sales");

  const tabs = [
    ["home", "Home"], ["sales", "Sales"], ["bills", "Bills"], ["money", "Money"], ["stock", "Stock"], ["staff", "Staff"], ["recipes", "Cost"], ["advisor", "AI"],
  ];

  return (
    <div className={"ldm min-h-screen pb-6" + (dark ? " ldm-dark" : "")} style={{ background: "var(--bg)", color: "var(--ink)", fontFamily: "'DM Sans', ui-sans-serif, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=DM+Sans:wght@400;500;700&display=swap');
        .ldm{--bg:#F3F6F3;--card:#FFFFFF;--ink:#16241F;--green:#11433D;--red:#B33A36;--redbg:#FBEAE9;--border:#DCE5DE;--inbrd:#C9D6CC;--inbg:#FBFDFB;--chip:#EDF3EE;--mut:#6E7F74;--mut2:#8A9A90}
        .ldm-dark{--bg:#0E1613;--card:#151F1A;--ink:#E6EEE8;--green:#7FC5AC;--red:#E4736F;--redbg:#33201F;--border:#25322B;--inbrd:#31413A;--inbg:#0F1813;--chip:#1D2822;--mut:#94A79B;--mut2:#7C9084}
        .ldm-dark input,.ldm-dark select,.ldm-dark textarea{color:#E6EEE8;color-scheme:dark}
        .disp{font-family:'Space Grotesk',sans-serif}
        input,select,textarea{outline:none}
        input:focus,select:focus,textarea:focus,button:focus-visible{box-shadow:0 0 0 2px #F3C623}
        @media (prefers-reduced-motion: reduce){*{transition:none!important}}`}</style>

      {/* Today strip — signature ledger bar */}
      <div style={{ background: "#11433D" }} className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            {me && <button onClick={() => setMenuOpen(true)} aria-label="Open menu" className="text-2xl leading-none mt-1 disp" style={{ color: "#F3C623" }}>☰</button>}
          <div>
            <div className="text-xs uppercase tracking-widest" style={{ color: "#9DBBB0" }}>Lemon Dynasty · {dayLabel(today)}</div>
            <div className="disp text-3xl font-bold" style={{ color: "#F3C623" }}>{fmt(todayRevenue)}</div>
            <div className="text-xs" style={{ color: "#9DBBB0" }}>
              today's takings · yesterday {fmt(yestRevenue)}
            </div>
          </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-3">
              {me && <button onClick={() => update({ sessionUserId: null })} className="text-xs" style={{ color: "#9DBBB0" }}>{me.name} · log out</button>}
              <button onClick={() => update({ theme: dark ? "light" : "dark" })} aria-label="Toggle dark mode" className="text-base" style={{ color: "#F3C623" }}>{dark ? "\u2600\uFE0E" : "\u263E"}</button>
            </div>
            <div className="text-xs" style={{ color: "#F3C623" }}>{saved}</div>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 max-w-2xl mx-auto">
        {needSetup ? (
          <Setup onCreate={(name, pin) => { const id = uid(); update({ users: [{ id, name, pin, role: "admin" }], sessionUserId: id }); }} />
        ) : !me ? (
          <Login users={users} onLogin={(id) => update({ sessionUserId: id })} />
        ) : (
        <>
        {activeTab === "home" && <Home data={data} go={setTab} update={update} />}
        {activeTab === "sales" && <Sales data={data} update={update} />}
        {activeTab === "money" && <Money data={data} update={update} />}
        {activeTab === "recipes" && <Recipes data={data} update={update} />}
        {activeTab === "stock" && <Stock data={data} update={update} />}
        {activeTab === "staff" && <Staff data={data} update={update} me={me} />}
        {activeTab === "bills" && <Bills data={data} update={update} />}
        {activeTab === "advisor" && <Advisor data={data} />}
        </>
        )}
      </div>

      {/* Bottom nav */}
      {me && menuOpen && (
        <div className="fixed inset-0" style={{ zIndex: 50 }}>
          <div onClick={() => setMenuOpen(false)} className="absolute inset-0" style={{ background: "rgba(0,0,0,0.45)" }} />
          <div className="absolute top-0 bottom-0 left-0 p-4 overflow-y-auto" style={{ width: 230, background: "var(--card)", borderRight: "1px solid var(--border)" }}>
            <div className="disp font-bold text-lg mb-0.5" style={{ color: "var(--green)" }}>🍋 Lemon Dynasty</div>
            <div className="text-xs mb-4" style={{ color: "var(--mut)" }}>{me.name} · {me.role}</div>
            {tabs.filter(([k]) => allowed.includes(k)).map(([k, label]) => (
              <button key={k} onClick={() => { setTab(k); setMenuOpen(false); }} className="block w-full text-left px-3 py-2.5 rounded-lg disp font-medium mb-1"
                style={{ background: activeTab === k ? "var(--chip)" : "transparent", color: activeTab === k ? "var(--green)" : "var(--ink)", borderLeft: activeTab === k ? "3px solid #F3C623" : "3px solid transparent" }}>
                {({ home: "Dashboard", sales: "Sales", bills: "Bills & purchases", money: "Money & P&L", stock: "Stock", staff: "Staff & users", recipes: "Recipe costing", advisor: "AI advisor" })[k] || label}
              </button>
            ))}
            <button onClick={() => { setMenuOpen(false); update({ sessionUserId: null }); }} className="block w-full text-left px-3 py-2.5 rounded-lg disp font-medium mt-3" style={{ color: "var(--red)", borderTop: "1px solid var(--border)" }}>Log out</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Shared UI ----------
function Card({ title, children, right, onClick }) {
  return (
    <div onClick={onClick} className={"rounded-xl p-4 mb-4" + (onClick ? " cursor-pointer" : "")} style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
      {title && (
        <div className="flex items-center justify-between mb-3">
          <div className="disp font-bold text-sm uppercase tracking-wide" style={{ color: "var(--green)" }}>{title}</div>
          <div className="flex items-center gap-2">
            {right}
            {onClick && <span className="disp font-bold" style={{ color: "#F3C623" }}>›</span>}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
const inputCls = "w-full rounded-lg px-3 py-2 text-sm border";
const inputStyle = { borderColor: "var(--inbrd)", background: "var(--inbg)" };
function Btn({ children, onClick, tone = "dark", disabled }) {
  const styles = tone === "dark" ? { background: "#11433D", color: "#F3C623" } : tone === "lemon" ? { background: "#F3C623", color: "#16241F" } : { background: "var(--redbg)", color: "var(--red)" };
  return <button onClick={onClick} disabled={disabled} className="rounded-lg px-3 py-2 text-sm font-medium disp disabled:opacity-50" style={styles}>{children}</button>;
}

// ---------- Home ----------
function Home({ data, go, update }) {
  const [msg, setMsg] = useState("");
  const [showRestore, setShowRestore] = useState(false);
  const [restoreText, setRestoreText] = useState("");
  const [rep, setRep] = useState({ kind: "sales", period: "month" });
  const today = todayStr();
  const month = monthOf(today);
  const mSales = data.sales.filter((s) => monthOf(s.date) === month);
  const revenue = mSales.reduce((a, s) => a + s.qty * s.price, 0);
  const tSales = data.sales.filter((s) => s.date === today);
  const todayItems = tSales.reduce((a, s) => a + s.qty, 0);
  const mExp = data.expenses.filter((e) => monthOf(e.date) === month);
  const expTotal = mExp.reduce((a, e) => a + Number(e.amount), 0);
  const expByCat = EXP_CATS.map((c) => [c, mExp.filter((e) => e.cat === c).reduce((a, e) => a + Number(e.amount), 0)]).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const staffCost = data.staff.reduce((a, s) => a + Number(s.salary || 0), 0);
  const profit = revenue - expTotal - staffCost;
  const margin = revenue > 0 ? profit / revenue : 0;

  const dailyMap = {};
  mSales.forEach((s) => { dailyMap[s.date] = (dailyMap[s.date] || 0) + s.qty * s.price; });
  const sellingDays = Object.keys(dailyMap).length;
  const avgDay = sellingDays ? revenue / sellingDays : 0;
  const best = Object.entries(dailyMap).sort((a, b) => b[1] - a[1])[0];

  const unpaid = data.bills.filter((b) => !b.paid);
  const unpaidTotal = unpaid.reduce((a, b) => a + Number(b.amount), 0);
  const toBuy = data.shopping.filter((s) => !s.done).length;
  const bals = balances(data);
  const lowStock = data.inventory.filter((i) => Number(i.qty) <= Number(i.min));

  const roles = useMemo(() => {
    const m = {};
    data.staff.forEach((s) => { m[s.role] = m[s.role] || { n: 0, cost: 0 }; m[s.role].n += 1; m[s.role].cost += Number(s.salary || 0); });
    return Object.entries(m).sort((a, b) => b[1].n - a[1].n);
  }, [data.staff]);

  const catOf = useMemo(() => { const m = {}; data.menu.forEach((x) => { m[x.name] = x.cat; }); return m; }, [data.menu]);
  const catRev = useMemo(() => {
    const m = {};
    mSales.forEach((s) => { const c = catOf[s.name] || "Other"; m[c] = (m[c] || 0) + s.qty * s.price; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [data.sales]);
  const catMax = catRev.length ? catRev[0][1] : 0;

  const mix = useMemo(() => {
    const m = {};
    mSales.forEach((s) => { m[s.name] = m[s.name] || { qty: 0, rev: 0 }; m[s.name].qty += s.qty; m[s.name].rev += s.qty * s.price; });
    return Object.entries(m).sort((a, b) => b[1].qty - a[1].qty);
  }, [data.sales]);
  const top = mix.slice(0, 5);
  const slow = mix.length > 5 ? mix.slice(-3).reverse() : [];

  const days = [...Array(14)].map((_, i) => {
    const d = new Date(Date.now() - (13 - i) * 86400000).toISOString().slice(0, 10);
    return { day: dayLabel(d), rev: data.sales.filter((s) => s.date === d).reduce((a, s) => a + s.qty * s.price, 0) };
  });

  const shareText = async (t, okMsg) => {
    try { if (navigator.share) { await navigator.share({ text: t }); return; } throw new Error(); }
    catch { try { await navigator.clipboard.writeText(t); setMsg(okMsg || "Copied \u2014 paste it into WhatsApp."); } catch { setMsg(t); } }
  };
  const daySummary = () => {
    const todayRev = tSales.reduce((a, s) => a + s.qty * s.price, 0);
    return `Lemon Dynasty \u2014 ${dayLabel(today)}\nTakings: ${fmt(todayRev)} (${todayItems} items)` +
      (top.length ? `\nTop: ${top.slice(0, 3).map(([n, v]) => `${n} ${v.qty}\u00d7`).join(", ")}` : "") +
      (unpaidTotal ? `\nUnpaid bills: ${fmt(unpaidTotal)}` : "");
  };
  const buildReport = (kind, period) => {
    const PER = { today: "Today", "7d": "Last 7 days", month: "This month", lastmonth: "Last month", all: "All time" };
    const lastM = () => { const parts = monthOf(today).split("-"); const y = Number(parts[0]); const m = Number(parts[1]); return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`; };
    const inP = (d) => {
      if (!d) return false;
      if (period === "all") return true;
      if (period === "today") return d === today;
      if (period === "7d") return d >= new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10) && d <= today;
      if (period === "month") return monthOf(d) === monthOf(today);
      if (period === "lastmonth") return monthOf(d) === lastM();
      return true;
    };
    const cap = (arr) => arr.length > 40 ? arr.slice(0, 40).concat([`\u2026 and ${arr.length - 40} more`]) : arr;
    const head = (label) => `Lemon Dynasty \u2014 ${label} (${PER[period]})\n`;
    if (kind === "sales") {
      const rows = data.sales.filter((x) => inP(x.date));
      const rev = rows.reduce((a, x) => a + x.qty * x.price, 0);
      const n = rows.reduce((a, x) => a + x.qty, 0);
      const cash = rows.filter((x) => (x.pay || "cash") === "cash").reduce((a, x) => a + x.qty * x.price, 0);
      const byI = {}; rows.forEach((x) => { byI[x.name] = byI[x.name] || { q: 0, r: 0 }; byI[x.name].q += x.qty; byI[x.name].r += x.qty * x.price; });
      const byD = {}; rows.forEach((x) => { byD[x.date] = (byD[x.date] || 0) + x.qty * x.price; });
      return head("Sales") + `Revenue: ${fmt(rev)} \u00b7 ${n} items\nCash ${fmt(cash)} \u00b7 Bank ${fmt(rev - cash)}\n\nBy item:\n` +
        cap(Object.entries(byI).sort((a, b) => b[1].r - a[1].r).map(([k, v]) => `- ${k} \u00d7${v.q} \u2014 ${fmt(v.r)}`)).join("\n") +
        `\n\nBy day:\n` + cap(Object.entries(byD).sort().map(([d, v]) => `- ${dayLabel(d)} \u2014 ${fmt(v)}`)).join("\n");
    }
    if (kind === "expenses") {
      const rows = data.expenses.filter((e) => inP(e.date));
      const tot = rows.reduce((a, e) => a + Number(e.amount), 0);
      const byC = {}; rows.forEach((e) => { byC[e.cat] = (byC[e.cat] || 0) + Number(e.amount); });
      return head("Expenses") + `Total: ${fmt(tot)}\n\nBy category:\n` +
        Object.entries(byC).sort((a, b) => b[1] - a[1]).map(([k, v]) => `- ${k} \u2014 ${fmt(v)}`).join("\n") +
        `\n\nEntries:\n` + cap(rows.map((e) => `- ${dayLabel(e.date)} \u00b7 ${e.cat}${e.note ? " \u00b7 " + e.note : ""} \u2014 ${fmt(e.amount)} (${e.from || "cash"})`)).join("\n");
    }
    if (kind === "bills") {
      const un = data.bills.filter((b) => !b.paid);
      const pd = data.bills.filter((b) => b.paid && inP(b.paidDate || b.date));
      return head("Bills") + `Unpaid (${un.length}): ${fmt(un.reduce((a, b) => a + Number(b.amount), 0))}\n` +
        cap(un.map((b) => `- ${b.supplier} \u00b7 ${dayLabel(b.date)} \u2014 ${fmt(b.amount)}`)).join("\n") +
        `\n\nPaid in period (${pd.length}): ${fmt(pd.reduce((a, b) => a + Number(b.amount), 0))}\n` +
        cap(pd.map((b) => `- ${b.supplier} \u00b7 ${dayLabel(b.paidDate || b.date)} \u2014 ${fmt(b.amount)}`)).join("\n");
    }
    if (kind === "stock") {
      return head("Stock (current)") + `${data.inventory.length} items \u00b7 ${lowStock.length} low\n\n` +
        cap(data.inventory.map((i) => `- ${i.name}: ${i.qty} ${i.unit}${Number(i.qty) <= Number(i.min) ? " (LOW)" : ""}`)).join("\n");
    }
    if (kind === "salaries") {
      return head("Salaries (current)") + `Team of ${data.staff.length} \u00b7 ${fmt(staffCost)}/mo\n\nBy role:\n` +
        roles.map(([r, v]) => `- ${r} \u00d7${v.n} \u2014 ${fmt(v.cost)}/mo`).join("\n") +
        `\n\nPeople:\n` + cap(data.staff.map((x) => `- ${x.name} \u00b7 ${x.role} \u00b7 ${x.shift} \u2014 ${fmt(x.salary)}/mo`)).join("\n");
    }
    const money = data.money || { moves: [] };
    const mvs = (money.moves || []).filter((m) => inP(m.date));
    return head("Money") + `Cash in hand: ${fmt(bals.cash)}\nIn bank: ${fmt(bals.bank)}\n\nMovements:\n` +
      (mvs.length ? cap(mvs.map((m) => `- ${dayLabel(m.date)} \u00b7 ${m.from && m.to ? m.from + " \u2192 " + m.to : m.to ? "+ " + m.to : "\u2212 " + m.from}${m.note ? " \u00b7 " + m.note : ""} \u2014 ${fmt(m.amount)}`)).join("\n") : "(none in period)");
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Kpi label="Revenue this month" value={fmt(revenue)} onClick={() => go("money")} />
        <Kpi label="Net profit" value={fmt(profit)} accent={profit >= 0 ? "var(--green)" : "var(--red)"} sub={revenue > 0 ? Math.round(margin * 100) + "% margin" : ""} onClick={() => go("money")} />
        <Kpi label="Expenses + wages" value={fmt(expTotal + staffCost)} onClick={() => go("money")} />
        <Kpi label="Avg per selling day" value={fmt(avgDay)} sub={best ? "best: " + dayLabel(best[0]) + " " + fmt(best[1]) : ""} onClick={() => go("sales")} />
      </div>

      <Card title="Last 14 days" onClick={() => go("sales")} right={<span className="text-xs" style={{ color: "var(--mut)" }}>{todayItems} items sold today</span>}>
        {days.every((d) => d.rev === 0) ? (
          <Empty text="No sales logged yet. Add today's sales in the Sales tab and this chart fills in." />
        ) : (
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={days} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="#E5EDE7" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={2} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => fmt(v)} />
                <Line type="monotone" dataKey="rev" stroke="#3E8E75" strokeWidth={2} dot={{ r: 2, fill: "#F3C623", stroke: "#3E8E75" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <Kpi label="Unpaid bills" value={fmt(unpaidTotal)} accent={unpaidTotal ? "var(--red)" : "var(--green)"} sub={unpaid.length + " bill" + (unpaid.length === 1 ? "" : "s")} onClick={() => go("bills")} />
        <Kpi label="To buy" value={String(toBuy)} sub="on purchase list" onClick={() => go("bills")} />
        <Kpi label="Low stock" value={String(lowStock.length)} accent={lowStock.length ? "var(--red)" : "var(--green)"} sub={data.inventory.length + " items tracked"} onClick={() => go("stock")} />
        <Kpi label="Team" value={String(data.staff.length)} sub={fmt(staffCost) + "/mo"} onClick={() => go("staff")} />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <Kpi label="Cash in hand" value={fmt(bals.cash)} accent={bals.cash < 0 ? "var(--red)" : "var(--green)"} onClick={() => go("money")} />
        <Kpi label="In bank" value={fmt(bals.bank)} accent={bals.bank < 0 ? "var(--red)" : "var(--green)"} onClick={() => go("money")} />
      </div>

      <Card title="Team by role" onClick={() => go("staff")}>
        {roles.length === 0 ? <Empty text="Add your team in the Staff tab to see the breakdown by role." /> :
          roles.map(([role, v]) => (
            <div key={role} className="flex justify-between py-1.5 text-sm" style={{ borderBottom: "1px dashed var(--border)" }}>
              <span>{role}</span>
              <span><span className="disp font-bold">{v.n}</span><span className="text-xs ml-2" style={{ color: "var(--mut)" }}>{fmt(v.cost)}/mo</span></span>
            </div>
          ))}
      </Card>

      <Card title="Revenue by category" onClick={() => go("sales")}>
        {catRev.length === 0 ? <Empty text="Category breakdown appears once sales are logged." /> :
          catRev.map(([c, v]) => (
            <div key={c} className="py-1">
              <div className="flex justify-between text-sm mb-0.5">
                <span>{c}</span><span className="disp font-bold">{fmt(v)}</span>
              </div>
              <div className="rounded-full" style={{ background: "var(--chip)", height: 6 }}>
                <div className="rounded-full" style={{ background: "#F3C623", height: 6, width: (catMax ? Math.max(4, Math.round((v / catMax) * 100)) : 0) + "%" }} />
              </div>
            </div>
          ))}
      </Card>

      <Card title="Top sellers this month" onClick={() => go("sales")}>
        {top.length === 0 ? <Empty text="Top sellers appear once sales are logged." /> :
          top.map(([name, v], i) => (
            <div key={name} className="flex justify-between py-1.5 text-sm" style={{ borderBottom: i < top.length - 1 ? "1px dashed var(--border)" : "none" }}>
              <span className="flex-1">{name}</span>
              <span className="disp font-bold mx-2">{v.qty}×</span>
              <span className="disp" style={{ color: "var(--mut)" }}>{fmt(v.rev)}</span>
            </div>
          ))}
      </Card>

      {slow.length > 0 && (
        <Card title="Slowest sellers" onClick={() => go("advisor")}>
          {slow.map(([name, v]) => (
            <div key={name} className="flex justify-between py-1 text-sm" style={{ color: "var(--mut)" }}>
              <span>{name}</span><span className="disp">{v.qty}× · {fmt(v.rev)}</span>
            </div>
          ))}
          <div className="text-xs mt-2" style={{ color: "var(--mut2)" }}>Ask the AI tab how to move these — or whether to drop them.</div>
        </Card>
      )}

      {expByCat.length > 0 && (
        <Card title="Where the money went" onClick={() => go("money")}>
          {expByCat.map(([c, v]) => <Row key={c} label={c} value={fmt(v)} />)}
          {staffCost > 0 && <Row label="Staff wages" value={fmt(staffCost)} />}
        </Card>
      )}

      {lowStock.length > 0 && (
        <Card title="Running low" onClick={() => go("stock")}>
          {lowStock.map((i) => (
            <div key={i.id} className="flex justify-between py-1 text-sm" style={{ color: "var(--red)" }}>
              <span>{i.name}</span><span>{i.qty} {i.unit} left</span>
            </div>
          ))}
        </Card>
      )}

      <Card title="Share reports & backup">
        <div className="grid grid-cols-2 gap-2 mb-2">
          <select className={inputCls} style={inputStyle} value={rep.kind} onChange={(e) => setRep({ ...rep, kind: e.target.value })}>
            <option value="sales">Sales</option>
            <option value="expenses">Expenses</option>
            <option value="bills">Bills</option>
            <option value="stock">Stock</option>
            <option value="salaries">Salaries</option>
            <option value="money">Money</option>
          </select>
          <select className={inputCls} style={inputStyle} value={rep.period} onChange={(e) => setRep({ ...rep, period: e.target.value })}>
            <option value="today">Today</option>
            <option value="7d">Last 7 days</option>
            <option value="month">This month</option>
            <option value="lastmonth">Last month</option>
            <option value="all">All time</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          <Btn tone="lemon" onClick={() => shareText(buildReport(rep.kind, rep.period), "Report copied \u2014 paste it into WhatsApp.")}>Share report</Btn>
          <Btn onClick={async () => { const t = buildReport(rep.kind, rep.period); try { await navigator.clipboard.writeText(t); setMsg("Report copied."); } catch { setMsg(t); } }}>Copy</Btn>
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn onClick={() => shareText(daySummary(), "Day summary copied \u2014 paste it into WhatsApp.")}>Today's summary</Btn>
          <Btn onClick={async () => {
            try { await navigator.clipboard.writeText(JSON.stringify(data)); setMsg("Backup copied. Paste it somewhere safe (Notes, email) \u2014 you can restore from it anytime."); }
            catch { setMsg("Couldn't copy automatically on this device."); }
          }}>Copy backup</Btn>
          <Btn onClick={() => { setShowRestore(!showRestore); setMsg(""); }}>Restore</Btn>
        </div>
        {showRestore && (
          <div className="mt-2">
            <textarea rows={3} placeholder="Paste a backup here…" className={inputCls + " mb-2"} style={inputStyle} value={restoreText} onChange={(e) => setRestoreText(e.target.value)} />
            <Btn onClick={() => {
              try {
                const d = JSON.parse(restoreText);
                if (!d || typeof d !== "object" || !Array.isArray(d.sales)) throw new Error();
                update({ ...d });
                setMsg("Backup restored."); setShowRestore(false); setRestoreText("");
              } catch { setMsg("That doesn't look like a valid backup."); }
            }}>Restore this backup</Btn>
          </div>
        )}
        {msg && <div className="text-xs mt-2 whitespace-pre-wrap" style={{ color: "var(--green)" }}>{msg}</div>}
      </Card>
    </div>
  );
}
function Kpi({ label, value, accent = "var(--green)", sub, onClick }) {
  return (
    <div onClick={onClick} className={"rounded-xl p-3" + (onClick ? " cursor-pointer" : "")} style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
      <div className="flex justify-between text-xs mb-1" style={{ color: "var(--mut)" }}>
        <span>{label}</span>
        {onClick && <span className="disp font-bold" style={{ color: "#F3C623" }}>›</span>}
      </div>
      <div className="disp text-xl font-bold" style={{ color: accent }}>{value}</div>
      {sub ? <div className="text-xs mt-0.5" style={{ color: "var(--mut2)" }}>{sub}</div> : null}
    </div>
  );
}
function Empty({ text }) {
  return <div className="text-sm py-3" style={{ color: "var(--mut)" }}>{text}</div>;
}

// ---------- Sales ----------
function Sales({ data, update }) {
  const [date, setDate] = useState(todayStr());
  const [item, setItem] = useState(data.menu[0]?.name || "");
  const [qty, setQty] = useState(1);
  const [search, setSearch] = useState("");
  const [pay, setPay] = useState("cash");
  const dayRows = data.sales.filter((s) => s.date === date);
  const dayTotal = dayRows.reduce((a, s) => a + s.qty * s.price, 0);

  const favs = useMemo(() => {
    const m = {};
    data.sales.forEach((s) => { m[s.name] = (m[s.name] || 0) + s.qty; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([n]) => n);
  }, [data.sales]);
  const results = search.trim() ? data.menu.filter((m) => m.name.toLowerCase().includes(search.trim().toLowerCase())).slice(0, 8) : [];

  const quick = (name) => {
    const m = data.menu.find((x) => x.name === name);
    if (!m) return;
    update({ sales: [...data.sales, { id: uid(), date, name: m.name, price: m.price, qty: 1, pay }] });
  };

  const add = () => {
    const m = data.menu.find((x) => x.name === item);
    if (!m || qty < 1) return;
    update({ sales: [...data.sales, { id: uid(), date, name: m.name, price: m.price, qty: Number(qty), pay }] });
    setQty(1);
  };
  const remove = (id) => update({ sales: data.sales.filter((s) => s.id !== id) });

  return (
    <div>
      <Card title="Log a sale">
        <div className="flex gap-1.5 mb-3">
          {[["cash", "Cash"], ["bank", "Bank transfer"]].map(([v, l]) => (
            <button key={v} onClick={() => setPay(v)} className="text-xs px-3 py-1.5 rounded-full disp font-medium" style={{ background: pay === v ? "#F3C623" : "var(--chip)", color: pay === v ? "#16241F" : "var(--green)" }}>{l}</button>
          ))}
        </div>
        {favs.length > 0 && (
          <div className="mb-3">
            <div className="text-xs mb-1.5" style={{ color: "var(--mut)" }}>Quick add (+1):</div>
            <div className="flex flex-wrap gap-1.5">
              {favs.map((n) => (
                <button key={n} onClick={() => quick(n)} className="text-xs px-2 py-1.5 rounded-full disp font-medium" style={{ background: "var(--chip)", color: "var(--green)" }}>+ {n}</button>
              ))}
            </div>
          </div>
        )}
        <input placeholder="Search the menu…" className={inputCls + " mb-2"} style={inputStyle} value={search} onChange={(e) => setSearch(e.target.value)} />
        {results.length > 0 && (
          <div className="mb-2 rounded-lg" style={{ border: "1px solid var(--border)" }}>
            {results.map((m) => (
              <div key={m.name} className="flex items-center justify-between px-3 py-2 text-sm" style={{ borderBottom: "1px dashed var(--border)" }}>
                <span className="flex-1">{m.name} <span style={{ color: "var(--mut)" }}>— {m.price}</span></span>
                <button onClick={() => { quick(m.name); setSearch(""); }} className="text-xs px-2 py-1 rounded-lg disp font-bold" style={{ background: "#F3C623", color: "#16241F" }}>+1</button>
              </div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <input type="date" className={inputCls} style={inputStyle} value={date} onChange={(e) => setDate(e.target.value)} />
          <input type="number" min="1" className={inputCls} style={inputStyle} value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Qty" />
        </div>
        <select className={inputCls + " mb-2"} style={inputStyle} value={item} onChange={(e) => setItem(e.target.value)}>
          {Object.keys(MENU_RAW).map((cat) => (
            <optgroup key={cat} label={cat}>
              {data.menu.filter((m) => m.cat === cat).map((m) => <option key={m.name} value={m.name}>{m.name} — {m.price}</option>)}
            </optgroup>
          ))}
        </select>
        <Btn onClick={add} tone="lemon">Add sale</Btn>
      </Card>
      <Card title={`Sales on ${dayLabel(date)}`} right={<span className="disp font-bold text-sm">{fmt(dayTotal)}</span>}>
        {dayRows.length === 0 ? <Empty text="Nothing logged for this day yet." /> :
          dayRows.map((s) => (
            <div key={s.id} className="flex items-center justify-between py-1.5 text-sm" style={{ borderBottom: "1px dashed var(--border)" }}>
              <span className="flex-1">{s.name}{(s.pay || "cash") === "bank" ? <span className="text-xs ml-1" style={{ color: "var(--mut)" }}>· bank</span> : null}</span>
              <span className="disp font-bold mx-2">{s.qty}× {fmt(s.qty * s.price)}</span>
              <button onClick={() => remove(s.id)} className="text-xs" style={{ color: "var(--red)" }}>Remove</button>
            </div>
          ))}
      </Card>
    </div>
  );
}

// ---------- Money (expenses + P&L) ----------
function Money({ data, update }) {
  const [month, setMonth] = useState(monthOf(todayStr()));
  const [form, setForm] = useState({ date: todayStr(), cat: "Ingredients", amount: "", note: "", freq: "Once", from: "cash" });
  const money = data.money || { cashOpen: 0, bankOpen: 0, moves: [] };
  const bals = balances(data);
  const [mv, setMv] = useState({ kind: "c2b", amount: "", note: "" });
  const doMove = () => {
    const a = Number(mv.amount);
    if (!a || a <= 0) return;
    const map = { c2b: ["cash", "bank"], b2c: ["bank", "cash"], addc: [null, "cash"], takec: ["cash", null], addb: [null, "bank"], takeb: ["bank", null] };
    const [from, to] = map[mv.kind];
    update({ money: { ...money, moves: [...(money.moves || []), { id: uid(), date: todayStr(), from, to, amount: a, note: mv.note }] } });
    setMv({ ...mv, amount: "", note: "" });
  };

  const mSales = data.sales.filter((s) => monthOf(s.date) === month);
  const revenue = mSales.reduce((a, s) => a + s.qty * s.price, 0);
  const mExp = data.expenses.filter((e) => monthOf(e.date) === month);
  const byCat = EXP_CATS.map((c) => [c, mExp.filter((e) => e.cat === c).reduce((a, e) => a + Number(e.amount), 0)]).filter(([, v]) => v > 0);
  const expTotal = mExp.reduce((a, e) => a + Number(e.amount), 0);
  const staffCost = data.staff.reduce((a, s) => a + Number(s.salary || 0), 0);
  const profit = revenue - expTotal - staffCost;

  const add = () => {
    if (!form.amount || Number(form.amount) <= 0) return;
    if (form.freq !== "Once") {
      const freq = form.freq.toLowerCase();
      const rid = uid(); const entries = []; let next = form.date; let g = 0;
      while (next <= todayStr() && g < 400) {
        entries.push({ id: uid(), date: next, cat: form.cat, amount: Number(form.amount), note: form.note, recId: rid, from: form.from });
        next = advance(next, freq); g += 1;
      }
      update({
        recurring: [...(data.recurring || []), { id: rid, cat: form.cat, amount: Number(form.amount), note: form.note, freq, next, from: form.from }],
        expenses: [...data.expenses, ...entries],
      });
    } else {
      update({ expenses: [...data.expenses, { id: uid(), date: form.date, cat: form.cat, amount: Number(form.amount), note: form.note, from: form.from }] });
    }
    setForm({ ...form, amount: "", note: "", freq: "Once", from: "cash" });
  };
  const remove = (id) => update({ expenses: data.expenses.filter((e) => e.id !== id) });

  return (
    <div>
      <Card title="Cash & bank">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Kpi label="Cash in hand" value={fmt(bals.cash)} accent={bals.cash < 0 ? "var(--red)" : "var(--green)"} />
          <Kpi label="In bank" value={fmt(bals.bank)} accent={bals.bank < 0 ? "var(--red)" : "var(--green)"} />
        </div>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <select className={inputCls} style={inputStyle} value={mv.kind} onChange={(e) => setMv({ ...mv, kind: e.target.value })}>
            <option value="c2b">Deposit cash → bank</option>
            <option value="b2c">Withdraw bank → cash</option>
            <option value="addc">Add to cash</option>
            <option value="takec">Take from cash</option>
            <option value="addb">Add to bank</option>
            <option value="takeb">Take from bank</option>
          </select>
          <input type="number" placeholder="Amount (MVR)" className={inputCls} style={inputStyle} value={mv.amount} onChange={(e) => setMv({ ...mv, amount: e.target.value })} />
        </div>
        <input placeholder="Note (e.g. owner drawing, capital in)" className={inputCls + " mb-2"} style={inputStyle} value={mv.note} onChange={(e) => setMv({ ...mv, note: e.target.value })} />
        <Btn tone="lemon" onClick={doMove}>Record movement</Btn>
        {(money.moves || []).length > 0 && (
          <div className="mt-3 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
            {(money.moves || []).slice(-5).reverse().map((m) => (
              <div key={m.id} className="flex items-center justify-between py-1 text-sm">
                <span className="flex-1" style={{ color: "var(--mut)" }}>{dayLabel(m.date)} · {m.from && m.to ? `${m.from} \u2192 ${m.to}` : m.to ? `+ ${m.to}` : `\u2212 ${m.from}`}{m.note ? ` \u00b7 ${m.note}` : ""}</span>
                <span className="disp font-bold mx-2">{fmt(m.amount)}</span>
                <button onClick={() => update({ money: { ...money, moves: money.moves.filter((x) => x.id !== m.id) } })} className="text-xs" style={{ color: "var(--red)" }}>✕</button>
              </div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
          <div>
            <div className="text-xs mb-1" style={{ color: "var(--mut)" }}>Opening cash</div>
            <input type="number" className={inputCls} style={inputStyle} value={money.cashOpen ?? 0} onChange={(e) => update({ money: { ...money, cashOpen: Number(e.target.value || 0) } })} />
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: "var(--mut)" }}>Opening bank</div>
            <input type="number" className={inputCls} style={inputStyle} value={money.bankOpen ?? 0} onChange={(e) => update({ money: { ...money, bankOpen: Number(e.target.value || 0) } })} />
          </div>
        </div>
      </Card>

      <Card title="Add an expense">
        <div className="grid grid-cols-2 gap-2 mb-2">
          <input type="date" className={inputCls} style={inputStyle} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <select className={inputCls} style={inputStyle} value={form.cat} onChange={(e) => setForm({ ...form, cat: e.target.value })}>
            {EXP_CATS.map((c) => <option key={c}>{c}</option>)}
          </select>
          <input type="number" placeholder="Amount (MVR)" className={inputCls} style={inputStyle} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <input placeholder="Note (optional)" className={inputCls} style={inputStyle} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <select className={inputCls} style={inputStyle} value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })}>
            <option value="cash">Paid from cash</option>
            <option value="bank">Paid from bank</option>
          </select>
          <select className={inputCls} style={inputStyle} value={form.freq} onChange={(e) => setForm({ ...form, freq: e.target.value })}>
            {[["Once", "Doesn't repeat"], ["Daily", "Repeats daily"], ["Weekly", "Repeats weekly"], ["Monthly", "Repeats monthly"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <Btn onClick={add} tone="lemon">Add expense</Btn>
        <div className="text-xs mt-2" style={{ color: "var(--mut)" }}>Repeating expenses are added to the log automatically each day/week/month, starting from the date above.</div>
      </Card>

      {(data.recurring || []).length > 0 && (
        <Card title="Repeating expenses">
          {data.recurring.map((r) => (
            <div key={r.id} className="flex items-center justify-between py-1.5 text-sm" style={{ borderBottom: "1px dashed var(--border)" }}>
              <span className="flex-1">{r.cat}{r.note ? ` · ${r.note}` : ""}
                <div className="text-xs" style={{ color: "var(--mut)" }}>{r.freq} · next {dayLabel(r.next)}</div>
              </span>
              <span className="disp font-bold mx-2">{fmt(r.amount)}</span>
              <button onClick={() => update({ recurring: data.recurring.filter((x) => x.id !== r.id) })} className="text-xs" style={{ color: "var(--red)" }}>Stop</button>
            </div>
          ))}
          <div className="text-xs mt-2" style={{ color: "var(--mut)" }}>Stopping a repeat keeps the entries already in the log.</div>
        </Card>
      )}

      <Card title="Profit & loss" right={<input type="month" className="rounded-lg px-2 py-1 text-xs border" style={inputStyle} value={month} onChange={(e) => setMonth(e.target.value)} />}>
        <Row label="Revenue" value={fmt(revenue)} bold />
        {byCat.map(([c, v]) => <Row key={c} label={c} value={"− " + fmt(v)} />)}
        <Row label="Staff wages (monthly)" value={"− " + fmt(staffCost)} />
        <div className="mt-2 pt-2" style={{ borderTop: "2px solid var(--green)" }}>
          <Row label="Net profit" value={fmt(profit)} bold accent={profit >= 0 ? "var(--green)" : "var(--red)"} />
        </div>
      </Card>

      <Card title="Expense log">
        {mExp.length === 0 ? <Empty text="No expenses recorded for this month." /> :
          mExp.map((e) => (
            <div key={e.id} className="flex items-center justify-between py-1.5 text-sm" style={{ borderBottom: "1px dashed var(--border)" }}>
              <span className="flex-1">{dayLabel(e.date)} · {e.cat}{e.recId ? " \u21BB" : ""}{e.note ? ` · ${e.note}` : ""}</span>
              <span className="disp font-bold mx-2">{fmt(e.amount)}</span>
              <button onClick={() => remove(e.id)} className="text-xs" style={{ color: "var(--red)" }}>Remove</button>
            </div>
          ))}
      </Card>
    </div>
  );
}
function Row({ label, value, bold, accent }) {
  return (
    <div className="flex justify-between py-1 text-sm">
      <span className={bold ? "font-bold" : ""}>{label}</span>
      <span className={"disp " + (bold ? "font-bold" : "")} style={{ color: accent || "var(--ink)" }}>{value}</span>
    </div>
  );
}

// ---------- Stock ----------
function Stock({ data, update }) {
  const [form, setForm] = useState({ name: "", unit: "kg", qty: "", min: "" });
  const add = () => {
    if (!form.name) return;
    update({ inventory: [...data.inventory, { id: uid(), ...form, qty: Number(form.qty || 0), min: Number(form.min || 0) }] });
    setForm({ name: "", unit: "kg", qty: "", min: "" });
  };
  const adjust = (id, d) => update({ inventory: data.inventory.map((i) => i.id === id ? { ...i, qty: Math.max(0, Number(i.qty) + d) } : i) });
  const remove = (id) => update({ inventory: data.inventory.filter((i) => i.id !== id) });

  return (
    <div>
      <Card title="Add stock item">
        <div className="grid grid-cols-2 gap-2 mb-2">
          <input placeholder="Item (e.g. Tuna)" className={inputCls} style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select className={inputCls} style={inputStyle} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
            {["kg", "g", "L", "ml", "pcs", "packs"].map((u) => <option key={u}>{u}</option>)}
          </select>
          <input type="number" placeholder="Qty on hand" className={inputCls} style={inputStyle} value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} />
          <input type="number" placeholder="Reorder level" className={inputCls} style={inputStyle} value={form.min} onChange={(e) => setForm({ ...form, min: e.target.value })} />
        </div>
        <Btn onClick={add} tone="lemon">Add item</Btn>
      </Card>
      <Card title="Stock on hand">
        {data.inventory.length === 0 ? <Empty text="Add your key ingredients — the app flags anything at or below its reorder level." /> :
          data.inventory.map((i) => {
            const low = Number(i.qty) <= Number(i.min);
            return (
              <div key={i.id} className="flex items-center justify-between py-2 text-sm" style={{ borderBottom: "1px dashed var(--border)" }}>
                <div className="flex-1">
                  <span style={{ color: low ? "var(--red)" : "var(--ink)" }}>{i.name}</span>
                  {low && <span className="ml-2 text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--redbg)", color: "var(--red)" }}>Low</span>}
                  <div className="text-xs" style={{ color: "var(--mut)" }}>reorder at {i.min} {i.unit}</div>
                </div>
                <button onClick={() => adjust(i.id, -1)} className="w-8 h-8 rounded-lg disp font-bold" style={{ background: "var(--chip)" }}>−</button>
                <span className="disp font-bold w-16 text-center">{i.qty} {i.unit}</span>
                <button onClick={() => adjust(i.id, 1)} className="w-8 h-8 rounded-lg disp font-bold" style={{ background: "var(--chip)" }}>+</button>
                <button onClick={() => remove(i.id)} className="text-xs ml-2" style={{ color: "var(--red)" }}>✕</button>
              </div>
            );
          })}
      </Card>
    </div>
  );
}

// ---------- Staff ----------
function Staff({ data, update, me }) {
  const [form, setForm] = useState({ name: "", role: "Cook", shift: "Morning (6am–2pm)", salary: "" });
  const [uform, setUform] = useState({ name: "", pin: "", role: "staff" });
  const [resetId, setResetId] = useState(null);
  const [newPin, setNewPin] = useState("");
  const [umsg, setUmsg] = useState("");
  const usersList = data.users || [];
  const adminCount = usersList.filter((u) => u.role === "admin").length;
  const addUser = () => {
    if (!uform.name.trim() || uform.pin.length < 4) { setUmsg("Name and a PIN of at least 4 digits are required."); return; }
    update({ users: [...usersList, { id: uid(), name: uform.name.trim(), pin: uform.pin, role: uform.role }] });
    setUform({ name: "", pin: "", role: "staff" }); setUmsg("");
  };
  const setRole = (u, role) => {
    if (u.role === "admin" && role !== "admin" && adminCount <= 1) { setUmsg("There must always be at least one admin."); return; }
    update({ users: usersList.map((x) => x.id === u.id ? { ...x, role } : x) }); setUmsg("");
  };
  const removeUser = (u) => {
    if (u.id === me.id) { setUmsg("You can't remove yourself while logged in."); return; }
    if (u.role === "admin" && adminCount <= 1) { setUmsg("You can't remove the only admin."); return; }
    update({ users: usersList.filter((x) => x.id !== u.id) }); setUmsg("");
  };
  const savePin = (u) => {
    if (newPin.length < 4) { setUmsg("PIN needs at least 4 digits."); return; }
    update({ users: usersList.map((x) => x.id === u.id ? { ...x, pin: newPin } : x) });
    setResetId(null); setNewPin(""); setUmsg("");
  };
  const total = data.staff.reduce((a, s) => a + Number(s.salary || 0), 0);
  const add = () => {
    if (!form.name || !form.salary) return;
    update({ staff: [...data.staff, { id: uid(), ...form, salary: Number(form.salary) }] });
    setForm({ ...form, name: "", salary: "" });
  };
  const remove = (id) => update({ staff: data.staff.filter((s) => s.id !== id) });

  return (
    <div>
      {me && me.role === "admin" && (
        <Card title="Users & access">
          {usersList.map((u) => (
            <div key={u.id} className="py-2 text-sm" style={{ borderBottom: "1px dashed var(--border)" }}>
              <div className="flex items-center gap-2">
                <span className="flex-1">{u.name}{u.id === me.id ? " (you)" : ""}</span>
                <select className="rounded-lg px-2 py-1 text-xs border" style={inputStyle} value={u.role} onChange={(e) => setRole(u, e.target.value)}>
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="staff">Staff</option>
                </select>
                <button onClick={() => { setResetId(resetId === u.id ? null : u.id); setNewPin(""); }} className="text-xs" style={{ color: "var(--green)" }}>PIN</button>
                <button onClick={() => removeUser(u)} className="text-xs" style={{ color: "var(--red)" }}>✕</button>
              </div>
              {resetId === u.id && (
                <div className="flex gap-2 mt-2">
                  <input type="password" inputMode="numeric" placeholder="New PIN" className={inputCls} style={inputStyle} value={newPin} onChange={(e) => setNewPin(e.target.value)} />
                  <Btn onClick={() => savePin(u)} tone="lemon">Save</Btn>
                </div>
              )}
            </div>
          ))}
          <div className="grid grid-cols-3 gap-2 mt-3 mb-2">
            <input placeholder="Name" className={inputCls} style={inputStyle} value={uform.name} onChange={(e) => setUform({ ...uform, name: e.target.value })} />
            <input type="password" inputMode="numeric" placeholder="PIN" className={inputCls} style={inputStyle} value={uform.pin} onChange={(e) => setUform({ ...uform, pin: e.target.value })} />
            <select className={inputCls} style={inputStyle} value={uform.role} onChange={(e) => setUform({ ...uform, role: e.target.value })}>
              <option value="staff">Staff</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <Btn onClick={addUser}>Add user</Btn>
          {umsg && <div className="text-xs mt-2" style={{ color: "var(--red)" }}>{umsg}</div>}
          <div className="text-xs mt-2" style={{ color: "var(--mut)" }}>Admin: everything + user management. Manager: everything except users. Staff: Sales, Bills and Stock only.</div>
        </Card>
      )}

      <Card title="Add staff member">
        <div className="grid grid-cols-2 gap-2 mb-2">
          <input placeholder="Name" className={inputCls} style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select className={inputCls} style={inputStyle} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {["Cook", "Chef", "Waiter", "Cashier", "Cleaner", "Manager", "Delivery"].map((r) => <option key={r}>{r}</option>)}
          </select>
          <select className={inputCls} style={inputStyle} value={form.shift} onChange={(e) => setForm({ ...form, shift: e.target.value })}>
            {["Morning (6am–2pm)", "Evening (2pm–10pm)", "Night (10pm–6am)", "Full day", "Split shift"].map((s) => <option key={s}>{s}</option>)}
          </select>
          <input type="number" placeholder="Monthly salary (MVR)" className={inputCls} style={inputStyle} value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} />
        </div>
        <Btn onClick={add} tone="lemon">Add staff</Btn>
      </Card>
      <Card title="Team" right={<span className="disp font-bold text-sm">{fmt(total)}/mo</span>}>
        {data.staff.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {Object.entries(data.staff.reduce((m, s) => { m[s.role] = (m[s.role] || 0) + 1; return m; }, {})).map(([role, n]) => (
              <span key={role} className="text-xs px-2 py-1 rounded-full disp font-medium" style={{ background: "var(--chip)", color: "var(--green)" }}>{role} × {n}</span>
            ))}
          </div>
        )}
        {data.staff.length === 0 ? <Empty text="Add your team to include wages in the P&L and get staffing advice." /> :
          data.staff.map((s) => (
            <div key={s.id} className="flex items-center justify-between py-1.5 text-sm" style={{ borderBottom: "1px dashed var(--border)" }}>
              <span className="flex-1">{s.name} · {s.role}<div className="text-xs" style={{ color: "var(--mut)" }}>{s.shift}</div></span>
              <span className="disp font-bold mx-2">{fmt(s.salary)}</span>
              <button onClick={() => remove(s.id)} className="text-xs" style={{ color: "var(--red)" }}>Remove</button>
            </div>
          ))}
      </Card>
    </div>
  );
}

// ---------- Recipe costing ----------
function Recipes({ data, update }) {
  const ings = data.ingredients || [];
  const recs = data.recipes || [];
  const target = Number(data.costTarget || 0.3);
  const [ingForm, setIngForm] = useState({ name: "", buy: "", price: "", qty: "", unit: "g" });
  const [item, setItem] = useState(data.menu[0] ? data.menu[0].name : "");
  const [line, setLine] = useState({ ingId: "", qty: "" });

  const unitCost = (i) => (Number(i.qty) > 0 ? Number(i.price) / Number(i.qty) : 0);
  const costOf = (r) => r.lines.reduce((a, l) => { const i = ings.find((x) => x.id === l.ingId); return a + (i ? unitCost(i) * Number(l.qty) : 0); }, 0);
  const menuPrice = (name) => { const m = data.menu.find((x) => x.name === name); return m ? m.price : 0; };
  const rec = recs.find((r) => r.itemName === item);
  const cost = rec ? costOf(rec) : 0;
  const price = menuPrice(item);
  const fc = price > 0 && cost > 0 ? cost / price : 0;

  const addIng = () => {
    if (!ingForm.name.trim() || !ingForm.price || !ingForm.qty) return;
    update({ ingredients: [...ings, { id: uid(), name: ingForm.name.trim(), buy: ingForm.buy, price: Number(ingForm.price), qty: Number(ingForm.qty), unit: ingForm.unit }] });
    setIngForm({ name: "", buy: "", price: "", qty: "", unit: ingForm.unit });
  };
  const removeIng = (id) => update({
    ingredients: ings.filter((i) => i.id !== id),
    recipes: recs.map((r) => ({ ...r, lines: r.lines.filter((l) => l.ingId !== id) })).filter((r) => r.lines.length > 0),
  });
  const addLine = () => {
    if (!line.ingId || !line.qty || Number(line.qty) <= 0) return;
    const nl = { ingId: line.ingId, qty: Number(line.qty) };
    update({ recipes: rec ? recs.map((r) => r.itemName === item ? { ...r, lines: [...r.lines, nl] } : r) : [...recs, { id: uid(), itemName: item, lines: [nl] }] });
    setLine({ ingId: line.ingId, qty: "" });
  };
  const removeLine = (idx) => update({ recipes: recs.map((r) => r.itemName === item ? { ...r, lines: r.lines.filter((_, i) => i !== idx) } : r).filter((r) => r.lines.length > 0) });

  const costed = recs.map((r) => ({ r, c: costOf(r), p: menuPrice(r.itemName) })).sort((a, b) => (b.p > 0 ? b.c / b.p : 0) - (a.p > 0 ? a.c / a.p : 0));

  return (
    <div>
      <Card title="Ingredient prices">
        <div className="grid grid-cols-2 gap-2 mb-2">
          <input placeholder="Ingredient (e.g. Chicken)" className={inputCls} style={inputStyle} value={ingForm.name} onChange={(e) => setIngForm({ ...ingForm, name: e.target.value })} />
          <input placeholder="How you buy it (1 kg)" className={inputCls} style={inputStyle} value={ingForm.buy} onChange={(e) => setIngForm({ ...ingForm, buy: e.target.value })} />
          <input type="number" placeholder="Purchase price (MVR)" className={inputCls} style={inputStyle} value={ingForm.price} onChange={(e) => setIngForm({ ...ingForm, price: e.target.value })} />
          <div className="flex gap-2">
            <input type="number" placeholder="Qty" className={inputCls} style={inputStyle} value={ingForm.qty} onChange={(e) => setIngForm({ ...ingForm, qty: e.target.value })} />
            <select className={inputCls} style={inputStyle} value={ingForm.unit} onChange={(e) => setIngForm({ ...ingForm, unit: e.target.value })}>
              {["g", "kg", "ml", "L", "each", "slice"].map((u) => <option key={u}>{u}</option>)}
            </select>
          </div>
        </div>
        <Btn tone="lemon" onClick={addIng}>Add ingredient</Btn>
        <div className="text-xs mt-2" style={{ color: "var(--mut)" }}>Example: Chicken, "1 kg", 140, qty 1000, unit g → MVR 0.14 per g.</div>
        {ings.length > 0 && (
          <div className="mt-3 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
            {ings.map((i) => (
              <div key={i.id} className="flex items-center justify-between py-1.5 text-sm" style={{ borderBottom: "1px dashed var(--border)" }}>
                <span className="flex-1">{i.name}{i.buy ? <span className="text-xs ml-1" style={{ color: "var(--mut)" }}>· {i.buy}</span> : null}</span>
                <span className="disp mx-2" style={{ color: "var(--mut)" }}>{fmt(unitCost(i))} / {i.unit}</span>
                <button onClick={() => removeIng(i.id)} className="text-xs" style={{ color: "var(--red)" }}>✕</button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Cost a menu item">
        <select className={inputCls + " mb-2"} style={inputStyle} value={item} onChange={(e) => setItem(e.target.value)}>
          {Object.keys(MENU_RAW).map((cat) => (
            <optgroup key={cat} label={cat}>
              {data.menu.filter((m) => m.cat === cat).map((m) => <option key={m.name} value={m.name}>{m.name} — {m.price}</option>)}
            </optgroup>
          ))}
        </select>
        {(rec ? rec.lines : []).map((l, idx) => {
          const i = ings.find((x) => x.id === l.ingId);
          return (
            <div key={idx} className="flex items-center justify-between py-1.5 text-sm" style={{ borderBottom: "1px dashed var(--border)" }}>
              <span className="flex-1">{i ? i.name : "?"} · {l.qty} {i ? i.unit : ""}</span>
              <span className="disp font-bold mx-2">{fmt(i ? unitCost(i) * Number(l.qty) : 0)}</span>
              <button onClick={() => removeLine(idx)} className="text-xs" style={{ color: "var(--red)" }}>✕</button>
            </div>
          );
        })}
        <div className="flex gap-2 mt-2 mb-2">
          <select className={inputCls} style={inputStyle} value={line.ingId} onChange={(e) => setLine({ ...line, ingId: e.target.value })}>
            <option value="">Ingredient…</option>
            {ings.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
          </select>
          <input type="number" placeholder="Qty" className={inputCls} style={inputStyle} value={line.qty} onChange={(e) => setLine({ ...line, qty: e.target.value })} />
          <Btn tone="lemon" onClick={addLine}>Add</Btn>
        </div>
        {ings.length === 0 && <Empty text="Add your ingredient prices above first, then build the recipe here." />}
        {cost > 0 && (
          <div className="mt-2 pt-2" style={{ borderTop: "2px solid var(--green)" }}>
            <Row label="Ingredient cost" value={fmt(cost)} bold />
            <Row label="Selling price" value={fmt(price)} />
            <Row label="Food cost" value={price > 0 ? Math.round(fc * 1000) / 10 + "%" : "—"} accent={fc > 0.35 ? "var(--red)" : "var(--green)"} />
            <Row label="Gross profit" value={fmt(price - cost)} bold />
            <div className="flex items-center justify-between py-1 text-sm">
              <span className="flex items-center gap-2">Suggested price @
                <input type="number" className="rounded-lg px-2 py-0.5 text-xs border w-14" style={inputStyle} value={Math.round(target * 100)} onChange={(e) => update({ costTarget: Number(e.target.value || 30) / 100 })} />%
              </span>
              <span className="disp font-bold">{fmt(target > 0 ? cost / target : 0)}</span>
            </div>
          </div>
        )}
      </Card>

      {costed.length > 0 && (
        <Card title="Costed menu">
          {costed.map(({ r, c, p }) => (
            <div key={r.id} onClick={() => setItem(r.itemName)} className="flex items-center justify-between py-1.5 text-sm cursor-pointer" style={{ borderBottom: "1px dashed var(--border)" }}>
              <span className="flex-1">{r.itemName}</span>
              <span className="disp mx-2" style={{ color: "var(--mut)" }}>{fmt(c)} / {fmt(p)}</span>
              <span className="disp font-bold" style={{ color: p > 0 && c / p > 0.35 ? "var(--red)" : "var(--green)" }}>{p > 0 ? Math.round((c / p) * 100) + "%" : "—"}</span>
            </div>
          ))}
          <div className="text-xs mt-2" style={{ color: "var(--mut)" }}>Cost / price · food cost %. Red means above 35%. The AI's price suggestions now use these real costs.</div>
        </Card>
      )}
    </div>
  );
}

// ---------- Setup & Login ----------
function Setup({ onCreate }) {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [err, setErr] = useState("");
  const go = () => {
    if (!name.trim()) { setErr("Enter your name."); return; }
    if (pin.length < 4) { setErr("PIN needs at least 4 digits."); return; }
    if (pin !== pin2) { setErr("PINs don't match."); return; }
    onCreate(name.trim(), pin);
  };
  return (
    <Card title="Create the admin account">
      <div className="text-xs mb-3" style={{ color: "var(--mut)" }}>First time here — create the owner (admin) account. The admin can add more users and give them roles.</div>
      <input placeholder="Your name" className={inputCls + " mb-2"} style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} />
      <div className="grid grid-cols-2 gap-2 mb-2">
        <input type="password" inputMode="numeric" placeholder="Choose a PIN" className={inputCls} style={inputStyle} value={pin} onChange={(e) => setPin(e.target.value)} />
        <input type="password" inputMode="numeric" placeholder="Repeat PIN" className={inputCls} style={inputStyle} value={pin2} onChange={(e) => setPin2(e.target.value)} />
      </div>
      <Btn tone="lemon" onClick={go}>Create admin</Btn>
      {err && <div className="text-xs mt-2" style={{ color: "var(--red)" }}>{err}</div>}
    </Card>
  );
}
function Login({ users, onLogin }) {
  const [sel, setSel] = useState(users[0] ? users[0].id : "");
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const go = () => {
    const u = users.find((x) => x.id === sel);
    if (!u || u.pin !== pin) { setErr("Wrong PIN."); setPin(""); return; }
    onLogin(u.id);
  };
  return (
    <Card title="Who's working?">
      <select className={inputCls + " mb-2"} style={inputStyle} value={sel} onChange={(e) => { setSel(e.target.value); setErr(""); }}>
        {users.map((u) => <option key={u.id} value={u.id}>{u.name} · {u.role}</option>)}
      </select>
      <div className="flex gap-2">
        <input type="password" inputMode="numeric" placeholder="PIN" className={inputCls} style={inputStyle} value={pin} onChange={(e) => setPin(e.target.value)} />
        <Btn tone="lemon" onClick={go}>Log in</Btn>
      </div>
      {err && <div className="text-xs mt-2" style={{ color: "var(--red)" }}>{err}</div>}
    </Card>
  );
}

// ---------- AI Advisor ----------
const ACTIONS = [
  { id: "sales", label: "How do I improve sales?", search: false,
    prompt: "You are advising a small cafe in the Maldives called Lemon Dynasty (Maldivian + Nepali menu). Using the data provided, give practical, specific advice to increase sales: what is selling, what is not, combos/upsells, timing, and 3 concrete actions for this week. Be concise and use plain language." },
  { id: "price", label: "Suggest best prices", search: false,
    prompt: "You are a restaurant pricing analyst. Using the menu (prices in MVR) and sales mix provided, identify items that look under-priced or over-priced relative to their category and popularity, and suggest specific new prices with a one-line reason each. Keep local affordability in mind (casual cafe in Malé, Maldives). Present as a short list of 'item: current → suggested — reason'." },
  { id: "staff", label: "Ideal staffing & shifts", search: false,
    prompt: "You are a restaurant operations advisor. Using the daily revenue pattern, sales volume, and current team provided, suggest the ideal number of staff and a shift plan (morning/evening) for this cafe, flagging over- or under-staffing and estimated monthly wage impact in MVR. Be specific and concise." },
  { id: "recipes", label: "New recipe ideas from trends", search: true,
    prompt: "You are a menu development consultant. Search the web for current cafe/restaurant food trends relevant to South Asia and the Maldives in 2026. Then, considering this cafe's existing Maldivian + Nepali menu (provided), suggest 5 new menu items that fit their kitchen and customers, each with a suggested price in MVR and a one-line pitch. Avoid duplicating existing items." },
];

function buildSummary(data) {
  const month = monthOf(todayStr());
  const mSales = data.sales.filter((s) => monthOf(s.date) === month);
  const mix = {};
  mSales.forEach((s) => { mix[s.name] = (mix[s.name] || 0) + s.qty; });
  const sorted = Object.entries(mix).sort((a, b) => b[1] - a[1]);
  const daily = {};
  data.sales.slice(-500).forEach((s) => { daily[s.date] = (daily[s.date] || 0) + s.qty * s.price; });
  return JSON.stringify({
    currency: "MVR",
    menu: data.menu.map((m) => `${m.cat}|${m.name}|${m.price}`),
    topSellersThisMonth: sorted.slice(0, 15),
    slowSellers: sorted.slice(-10),
    itemsNeverSold: data.menu.filter((m) => !mix[m.name]).slice(0, 30).map((m) => m.name),
    dailyRevenue: daily,
    monthRevenue: mSales.reduce((a, s) => a + s.qty * s.price, 0),
    expensesThisMonth: data.expenses.filter((e) => monthOf(e.date) === month).map((e) => `${e.cat}:${e.amount}`),
    staff: data.staff.map((s) => `${s.role}|${s.shift}|${s.salary}/mo`),
    lowStock: data.inventory.filter((i) => Number(i.qty) <= Number(i.min)).map((i) => i.name),
    recipeCostsMVR: (data.recipes || []).map((r) => {
      const c = r.lines.reduce((a, l) => { const i = (data.ingredients || []).find((x) => x.id === l.ingId); return a + (i && Number(i.qty) > 0 ? (Number(i.price) / Number(i.qty)) * Number(l.qty) : 0); }, 0);
      return `${r.itemName}:${Math.round(c * 100) / 100}`;
    }),
  });
}

function Advisor({ data }) {
  const [keyIn, setKeyIn] = useState(getApiKey());
  const [keySaved, setKeySaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState("");
  const [title, setTitle] = useState("");
  const [q, setQ] = useState("");
  const hasSales = data.sales.length > 0;

  const ask = async (promptText, useSearch, label) => {
    setBusy(true); setOut(""); setTitle(label);
    try {
      const body = {
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [{ role: "user", content: promptText + "\n\nRestaurant data:\n" + buildSummary(data) }],
      };
      if (useSearch) body.tools = [{ type: "web_search_20250305", name: "web_search" }];
      const text = await callClaude(body);
      setOut(text || "No answer came back. Try again in a moment.");
    } catch (e) {
      setOut("The advisor couldn't answer" + (e && e.message ? ` (${e.message})` : "") + ". Try again in a moment.");
    }
    setBusy(false);
  };

  return (
    <div>
      <Card title="AI settings">
        <div className="text-xs mb-2" style={{ color: "var(--mut)" }}>AI features run on your own Anthropic API key (create one at console.anthropic.com). It's stored only in this browser — never in the website code.</div>
        <div className="flex gap-2">
          <input type="password" placeholder="sk-ant-..." className={inputCls} style={inputStyle} value={keyIn} onChange={(e) => { setKeyIn(e.target.value); setKeySaved(false); }} />
          <Btn tone="lemon" onClick={() => { localStorage.setItem(API_KEY_STORE, keyIn.trim()); setKeySaved(true); }}>Save</Btn>
        </div>
        {keySaved && <div className="text-xs mt-2" style={{ color: "var(--green)" }}>Key saved on this device.</div>}
      </Card>
      {!hasSales && <Card><Empty text="Tip: the advice gets much sharper once you've logged a few days of sales." /></Card>}
      <Card title="Ask the advisor">
        <div className="grid grid-cols-1 gap-2 mb-3">
          {ACTIONS.map((a) => (
            <Btn key={a.id} onClick={() => ask(a.prompt, a.search, a.label)} disabled={busy}>{a.label}</Btn>
          ))}
        </div>
        <div className="flex gap-2">
          <input placeholder="Or ask your own question…" className={inputCls} style={inputStyle} value={q} onChange={(e) => setQ(e.target.value)} />
          <Btn tone="lemon" disabled={busy || !q.trim()} onClick={() => ask("You are a practical advisor for a small Maldivian cafe. Answer this owner question using their data: " + q, false, q)}>Ask</Btn>
        </div>
      </Card>
      {(busy || out) && (
        <Card title={title || "Advice"}>
          {busy ? <Empty text="Thinking through your numbers…" /> :
            out.split(/\n+/).map((p, i) => <p key={i} className="text-sm mb-2 whitespace-pre-wrap">{p}</p>)}
        </Card>
      )}
    </div>
  );
}

// ---------- Bills & Purchases (WhatsApp import) ----------
async function callClaude(body) {
  if (!getApiKey()) throw new Error("no API key \u2014 open the AI tab and save your Anthropic API key under AI settings");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers: API_HEADERS(), body: JSON.stringify(body),
  });
  const textBody = await res.text();
  let d;
  try { d = JSON.parse(textBody); } catch {
    throw new Error("service replied " + res.status + ": " + textBody.slice(0, 140));
  }
  if (d.type === "error" || d.error) {
    const m = d.error && (d.error.message || d.error);
    throw new Error("service error: " + (typeof m === "string" ? m : JSON.stringify(m || d).slice(0, 140)));
  }
  return (d.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
}

// Pull JSON out of a model reply even if it's wrapped in prose or code fences
function extractJSON(raw) {
  const o = raw.indexOf("{"), a = raw.indexOf("[");
  const start = o === -1 ? a : a === -1 ? o : Math.min(o, a);
  const end = Math.max(raw.lastIndexOf("}"), raw.lastIndexOf("]"));
  if (start === -1 || end <= start) throw new Error("no readable data in the reply");
  return JSON.parse(raw.slice(start, end + 1));
}

// Downscale photos before sending — full-size phone photos are too large for the API.
// Loads via data URL (more compatible than blob URLs in this environment) and falls back
// to sending the original file if the browser can't decode it but the API can.
function imageToB64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error("couldn't open that file"));
    r.onload = () => {
      const dataUrl = r.result;
      const img = new Image();
      img.onload = () => {
        try {
          const max = 1400;
          const scale = Math.min(1, max / Math.max(img.width, img.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve({ b64: canvas.toDataURL("image/jpeg", 0.85).split(",")[1], mt: "image/jpeg" });
        } catch { resolve(null); }
      };
      img.onerror = () => {
        const mt = ((dataUrl.match(/^data:([^;]+)/) || [])[1] || file.type || "").toLowerCase();
        const b64 = dataUrl.split(",")[1];
        if (["image/jpeg", "image/png", "image/webp", "image/gif"].includes(mt) && b64 && b64.length < 4800000) resolve({ b64, mt });
        else resolve(null);
      };
      img.src = dataUrl;
    };
    r.readAsDataURL(file);
  });
}

function Bills({ data, update }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [diag, setDiag] = useState("");

  const testAI = async () => {
    setBusy(true); setDiag("Testing…");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: API_HEADERS(),
        body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, messages: [{ role: "user", content: "Reply with exactly: OK" }] }),
      });
      const t = await res.text();
      setDiag(`Status ${res.status} — ${t.slice(0, 220)}`);
    } catch (e) { setDiag("Network error: " + (e && e.message ? e.message : "request blocked")); }
    setBusy(false);
  };

  const addLinesDirect = () => {
    const lines = text.split(/\n+/).map((s) => s.trim()).filter(Boolean);
    if (!lines.length) return;
    update({ shopping: [...data.shopping, ...lines.map((n) => ({ id: uid(), name: n, done: false }))] });
    setOk(`Added ${lines.length} lines to the purchase list (without AI).`);
    setErr(""); setText("");
  };
  const [form, setForm] = useState({ date: todayStr(), supplier: "", items: "", amount: "" });
  const [shopItem, setShopItem] = useState("");

  const unpaid = data.bills.filter((b) => !b.paid);
  const paid = data.bills.filter((b) => b.paid);
  const unpaidTotal = unpaid.reduce((a, b) => a + Number(b.amount), 0);

  const parseText = async () => {
    if (!text.trim()) return;
    setBusy(true); setErr(""); setOk("");
    try {
      const raw = await callClaude({
        model: "claude-sonnet-4-6", max_tokens: 1000,
        messages: [{ role: "user", content: `Messages copied from a cafe's supplier/purchasing WhatsApp group. Today is ${todayStr()}. Classify the content into:\n- "buy": items to order/purchase (a shopping list), each as one short string like "Potato 25 kg"\n- "bills": actual bills or payments that mention a supplier or a total amount, each as an array ["YYYY-MM-DD","supplier","short item summary", amount number in MVR (0 if not stated)]\nRespond with ONLY minified JSON, no markdown, no spaces: {"buy":[…],"bills":[…]}. Use empty arrays if none.\n\nMessages:\n${text}` }],
      });
      const o = extractJSON(raw);
      const buy = Array.isArray(o.buy) ? o.buy : [];
      const billRows = Array.isArray(o.bills) ? o.bills : [];
      if (!buy.length && !billRows.length) { setErr("No purchases found in that text."); }
      else {
        update({
          shopping: [...data.shopping, ...buy.map((n) => ({ id: uid(), name: String(n), done: false }))],
          bills: [...data.bills, ...billRows.map((b) => ({ id: uid(), date: b[0] || todayStr(), supplier: b[1] || "Unknown", items: b[2] || "", amount: Number(b[3]) || 0, paid: false }))],
        });
        setOk("Added " + [buy.length ? buy.length + " items to the purchase list" : "", billRows.length ? billRows.length + (billRows.length > 1 ? " bills" : " bill") : ""].filter(Boolean).join(" and ") + ".");
        setText("");
      }
    } catch (e) { setErr("Couldn't read that. Try pasting a smaller chunk at a time" + (e && e.message ? ` (${e.message})` : "") + "."); }
    setBusy(false);
  };

  const parseImages = async (fileList) => {
    const files = Array.from(fileList || []).slice(0, 6);
    if (!files.length) return;
    setBusy(true); setErr(""); setOk("");
    const added = []; const fails = [];
    for (let i = 0; i < files.length; i++) {
      if (files.length > 1) setOk(`Reading photo ${i + 1} of ${files.length}\u2026`);
      try {
        const picked = await imageToB64(files[i]);
        if (!picked) throw new Error("unsupported format");
        const raw = await callClaude({
          model: "claude-sonnet-4-6", max_tokens: 1000,
          messages: [{ role: "user", content: [
            { type: "image", source: { type: "base64", media_type: picked.mt, data: picked.b64 } },
            { type: "text", text: `This is a photo of a supplier bill/receipt/invoice (or a handwritten purchase note) from a cafe's WhatsApp purchasing group. Today is ${todayStr()}. Respond with ONLY a JSON object, no markdown: {"date":"YYYY-MM-DD","supplier":"name or Unknown","items":"short summary of items","amount": total as a number (0 if unreadable)}.` },
          ] }],
        });
        const b = extractJSON(raw);
        added.push({ id: uid(), date: b.date || todayStr(), supplier: b.supplier || "Unknown", items: b.items || "", amount: Number(b.amount) || 0, paid: false });
      } catch (e) {
        fails.push(files[i].name || `photo ${i + 1}`);
      }
    }
    if (added.length) {
      update({ bills: [...data.bills, ...added] });
      setOk(`Added ${added.length} bill${added.length > 1 ? "s" : ""}` + (fails.length ? ` \u00b7 couldn't read: ${fails.join(", ")}` : "") + ". Check the details below and fix anything misread.");
    } else {
      setOk("");
      setErr("Couldn't read " + (files.length > 1 ? "those photos" : "that photo") + ". Try clearer, straight-on shots \u2014 or screenshots if the photos are in HEIC format.");
    }
    setBusy(false);
  };

  const addManual = () => {
    if (!form.supplier && !form.amount) return;
    update({ bills: [...data.bills, { id: uid(), ...form, amount: Number(form.amount) || 0, paid: false }] });
    setForm({ date: todayStr(), supplier: "", items: "", amount: "" });
  };

  const markPaid = (bill, from) => {
    const expId = uid();
    update({
      bills: data.bills.map((b) => b.id === bill.id ? { ...b, paid: true, paidDate: todayStr(), expId } : b),
      expenses: [...data.expenses, { id: expId, date: todayStr(), cat: "Ingredients", amount: Number(bill.amount), note: "Bill: " + bill.supplier, from: from || "cash" }],
    });
  };
  const unpay = (bill) => update({
    bills: data.bills.map((b) => b.id === bill.id ? { ...b, paid: false, paidDate: null, expId: null } : b),
    expenses: data.expenses.filter((e) => e.id !== bill.expId),
  });
  const removeBill = (bill) => update({
    bills: data.bills.filter((b) => b.id !== bill.id),
    expenses: bill.expId ? data.expenses.filter((e) => e.id !== bill.expId) : data.expenses,
  });

  // Purchase (shopping) list
  const addShop = () => {
    if (!shopItem.trim()) return;
    update({ shopping: [...data.shopping, { id: uid(), name: shopItem.trim(), done: false }] });
    setShopItem("");
  };
  const addLowStock = () => {
    const existing = new Set(data.shopping.map((s) => s.name.toLowerCase()));
    const lows = data.inventory.filter((i) => Number(i.qty) <= Number(i.min) && !existing.has(i.name.toLowerCase()));
    if (lows.length) update({ shopping: [...data.shopping, ...lows.map((i) => ({ id: uid(), name: i.name, done: false }))] });
  };
  const toggleShop = (id) => update({ shopping: data.shopping.map((s) => s.id === id ? { ...s, done: !s.done } : s) });
  const clearDone = () => update({ shopping: data.shopping.filter((s) => !s.done) });

  return (
    <div>
      <Card title="Bring in from WhatsApp">
        <div className="text-xs mb-2" style={{ color: "var(--mut)" }}>
          In your purchase group: long-press → copy messages (or Export chat), then paste below. Or snap the bill with your camera, or upload saved photos (up to 6 at once).
        </div>
        <textarea rows={4} placeholder="Paste WhatsApp messages here…" className={inputCls + " mb-2"} style={inputStyle} value={text} onChange={(e) => setText(e.target.value)} />
        <div className="flex gap-2 items-center flex-wrap">
          <Btn onClick={parseText} disabled={busy || !text.trim()}>{busy ? "Reading…" : "Extract purchases"}</Btn>
          <label className="rounded-lg px-3 py-2 text-sm font-medium disp cursor-pointer" style={{ background: "#F3C623", color: "#16241F", opacity: busy ? 0.5 : 1 }}>
            📷 Take photo
            <input type="file" accept="image/*" capture="environment" className="hidden" disabled={busy} onChange={(e) => { parseImages(e.target.files); e.target.value = ""; }} />
          </label>
          <label className="rounded-lg px-3 py-2 text-sm font-medium disp cursor-pointer" style={{ background: "#F3C623", color: "#16241F", opacity: busy ? 0.5 : 1 }}>
            Upload photos
            <input type="file" accept="image/*" multiple className="hidden" disabled={busy} onChange={(e) => { parseImages(e.target.files); e.target.value = ""; }} />
          </label>
        </div>
        {err && <div className="text-xs mt-2" style={{ color: "var(--red)" }}>{err}</div>}
        {err && text.trim() && (
          <div className="mt-2"><Btn onClick={addLinesDirect}>Add these lines to purchase list without AI</Btn></div>
        )}
        {ok && <div className="text-xs mt-2" style={{ color: "var(--green)" }}>{ok}</div>}
        <div className="mt-3 pt-2 flex items-center justify-between" style={{ borderTop: "1px solid var(--border)" }}>
          <button onClick={testAI} disabled={busy} className="text-xs font-medium disp" style={{ color: "var(--green)" }}>Test AI connection</button>
          <span className="text-xs" style={{ color: "var(--mut2)" }}>web v3</span>
        </div>
        {diag && <div className="text-xs mt-2 p-2 rounded" style={{ background: "var(--chip)", color: "var(--ink)", fontFamily: "monospace", wordBreak: "break-all" }}>{diag}</div>}
      </Card>

      <Card title="Unpaid bills" right={<span className="disp font-bold text-sm" style={{ color: unpaidTotal ? "var(--red)" : "var(--green)" }}>{fmt(unpaidTotal)}</span>}>
        {unpaid.length === 0 ? <Empty text="No unpaid bills. Paste group messages or upload a bill photo above." /> :
          unpaid.map((b) => (
            <div key={b.id} className="py-2 text-sm" style={{ borderBottom: "1px dashed var(--border)" }}>
              <div className="flex items-center justify-between">
                <span className="font-medium">{b.supplier}</span>
                <span className="disp font-bold">{fmt(b.amount)}</span>
              </div>
              <div className="text-xs mb-1.5" style={{ color: "var(--mut)" }}>{dayLabel(b.date)}{b.items ? ` · ${b.items}` : ""}</div>
              <div className="flex gap-2">
                <Btn onClick={() => markPaid(b, "cash")} tone="lemon">Paid · cash</Btn>
                <Btn onClick={() => markPaid(b, "bank")}>Paid · bank</Btn>
                <button onClick={() => removeBill(b)} className="text-xs" style={{ color: "var(--red)" }}>Remove</button>
              </div>
            </div>
          ))}
        <div className="grid grid-cols-2 gap-2 mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
          <input type="date" className={inputCls} style={inputStyle} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <input placeholder="Supplier" className={inputCls} style={inputStyle} value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
          <input placeholder="Items" className={inputCls} style={inputStyle} value={form.items} onChange={(e) => setForm({ ...form, items: e.target.value })} />
          <input type="number" placeholder="Amount (MVR)" className={inputCls} style={inputStyle} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        </div>
        <div className="mt-2"><Btn onClick={addManual}>Add bill manually</Btn></div>
      </Card>

      {paid.length > 0 && (
        <Card title="Paid bills">
          {paid.map((b) => (
            <div key={b.id} className="flex items-center justify-between py-1.5 text-sm" style={{ borderBottom: "1px dashed var(--border)" }}>
              <span className="flex-1" style={{ color: "var(--mut)" }}>{b.supplier} · {dayLabel(b.date)}</span>
              <span className="disp font-bold mx-2">{fmt(b.amount)}</span>
              <button onClick={() => unpay(b)} className="text-xs mr-2" style={{ color: "var(--mut)" }}>Unmark</button>
              <button onClick={() => removeBill(b)} className="text-xs" style={{ color: "var(--red)" }}>✕</button>
            </div>
          ))}
          <div className="text-xs mt-2" style={{ color: "var(--mut)" }}>Paid bills are added to your expenses automatically, so the P&L stays correct.</div>
        </Card>
      )}

      <Card title="Purchase list" right={<button onClick={addLowStock} className="text-xs font-medium disp" style={{ color: "var(--green)" }}>+ Add low-stock items</button>}>
        <div className="flex gap-2 mb-2">
          <input placeholder="Add something to buy…" className={inputCls} style={inputStyle} value={shopItem} onChange={(e) => setShopItem(e.target.value)} />
          <Btn tone="lemon" onClick={addShop}>Add</Btn>
        </div>
        {data.shopping.length === 0 ? <Empty text="Your buying list is empty." /> :
          data.shopping.map((s) => (
            <div key={s.id} className="flex items-center gap-2 py-1.5 text-sm" style={{ borderBottom: "1px dashed var(--border)" }}>
              <input type="checkbox" checked={s.done} onChange={() => toggleShop(s.id)} />
              <span className="flex-1" style={{ textDecoration: s.done ? "line-through" : "none", color: s.done ? "var(--mut2)" : "var(--ink)" }}>{s.name}</span>
            </div>
          ))}
        {data.shopping.some((s) => s.done) && <div className="mt-2"><button onClick={clearDone} className="text-xs" style={{ color: "var(--red)" }}>Clear bought items</button></div>}
      </Card>
    </div>
  );
}
