# SQLite ব্যবহার নির্দেশিকা (বাংলা)

> **⚠️ Status — SQLite removed (2026-08-25)**
>
> The SQLite engine has been removed ahead of a migration to PostgreSQL. No
> database is configured: `DB_ENABLED=false`, `/api/admin/*` answers 503
> `DATABASE_UNAVAILABLE`, and the public transcription API is unaffected.
> This document describes the *previous* SQLite setup and is kept for
> reference until the PostgreSQL schema replaces it.
>
> Archived artefacts: `DevelopmentFiles/backups/sqlite-archive-20260825/`

> **সবচেয়ে জরুরি কথাটি প্রথমেই:**
> অ্যাপ্লিকেশন চালানোর জন্য আপনাকে **SQLite শিখতে হবে না**। কোড নিজেই
> ডাটাবেসের সব কাজ করে। এই ডকুমেন্টটি তখনই লাগবে যখন আপনি **নিজে ভেতরে
> উঁকি দিয়ে দেখতে চাইবেন** — ঠিক যেমন গাড়ি চালাতে ইঞ্জিন খোলা লাগে না।

---

## ১. SQLite আসলে কী?

MySQL ছিল একটি **আলাদা প্রোগ্রাম** (সার্ভার) — সেটি চালু রাখতে হতো, পোর্ট
লাগত, ইউজারনেম-পাসওয়ার্ড লাগত।

SQLite একটি **ফাইল**। শুধু একটিমাত্র ফাইল:

```
WebApplication/server/data/inwebtools.db
```

তুলনাটা এভাবে ভাবুন:

| | MySQL | SQLite |
|---|---|---|
| কী জিনিস | আলাদা সার্ভার প্রোগ্রাম | শুধু একটি ফাইল |
| চালু করতে হয়? | হ্যাঁ, প্রতিবার | **না** — এমনিতেই কাজ করে |
| পোর্ট | 3306 | **নেই** |
| পাসওয়ার্ড | লাগে | **লাগে না** |
| ব্যাকআপ | জটিল কমান্ড | **ফাইল কপি** |

**তাই আপনার করণীয় কিছুই নেই।** সার্ভার চালু করলেই ডাটাবেস চলে।

---

## ২. দৈনন্দিন কাজে যা যথেষ্ট

### সবচেয়ে সহজ পথ: অ্যাডমিন ড্যাশবোর্ড

ব্রাউজারে খুলুন — **http://localhost:5173/AdminDashboard**

এখানে সব তথ্য সুন্দর টেবিল ও চার্টে দেখা যায়। **৯৯% ক্ষেত্রে এটুকুই যথেষ্ট।**
কোনো কমান্ড, কোনো SQL লাগে না।

---

## ৩. টার্মিনাল থেকে দেখতে চাইলে (SQL ছাড়াই)

আপনার জন্য একটি সহজ স্ক্রিপ্ট বানিয়ে রেখেছি। SQL জানার দরকার নেই — শুধু
নাম ধরে কমান্ড দিন।

প্রথমে প্রজেক্ট ফোল্ডারে যান:

```bash
cd /home/user
```

### সারসংক্ষেপ দেখুন

```bash
./DevelopmentFiles/scripts/db.sh
```

ফলাফল:

```
  iNWebTools database — /home/user/WebApplication/server/data/inwebtools.db
  100K on disk

┌──────────────────┬───────┐
│       what       │ count │
├──────────────────┼───────┤
│ conversions      │ 3     │
│ visitor sessions │ 41    │
│ admin accounts   │ 1     │
│ audit entries    │ 20    │
│ system errors    │ 0     │
│ settings         │ 2     │
└──────────────────┴───────┘
```

### সব কমান্ডের তালিকা

| কমান্ড | কী দেখায় |
|---|---|
| `./DevelopmentFiles/scripts/db.sh` | সারসংক্ষেপ (প্রতিটি টেবিলে কত সারি) |
| `... db.sh conversions` | সর্বশেষ ২০টি অডিও রূপান্তর |
| `... db.sh online` | গত ৫ মিনিটে সক্রিয় ভিজিটর |
| `... db.sh visitors` | সর্বশেষ ২০ জন ভিজিটর |
| `... db.sh errors` | সর্বশেষ ২০টি এরর |
| `... db.sh admins` | অ্যাডমিন অ্যাকাউন্ট (পাসওয়ার্ড কখনো দেখায় না) |
| `... db.sh audit` | অ্যাডমিনের সাম্প্রতিক কাজকর্ম |
| `... db.sh settings` | সেটিংস |
| `... db.sh tables` | টেবিলের তালিকা |
| `... db.sh backup` | নিরাপদ ব্যাকআপ |
| `... db.sh help` | সাহায্য |

### উদাহরণ

```bash
./DevelopmentFiles/scripts/db.sh conversions
```

```
┌─────────────────────┬─────────┬──────────┬──────┬───────┬──────┐
│      when_utc       │ status  │   file   │ lang │ chars │  ms  │
├─────────────────────┼─────────┼──────────┼──────┼───────┼──────┤
│ 2026-08-25 04:49:04 │ success │ tone.wav │ auto │ 1     │ 1051 │
│ 2026-08-25 04:13:42 │ success │ jfk.wav  │ bn   │ 108   │ 1248 │
└─────────────────────┴─────────┴──────────┴──────┴───────┴──────┘
```

> 🔒 **নিশ্চিন্ত থাকুন:** `backup` ছাড়া প্রতিটি কমান্ড **read-only** — শুধু
> পড়তে পারে, লিখতে পারে না। ভুল করেও ডাটা মুছে ফেলা **অসম্ভব**। পরীক্ষা করে
> দেখা হয়েছে: মোছার চেষ্টা করলে `attempt to write a readonly database` বলে
> আটকে দেয়।

---

## ৪. ব্যাকআপ নেওয়া (গুরুত্বপূর্ণ)

```bash
./DevelopmentFiles/scripts/db.sh backup
```

এটি `backup-2026-08-25-1430.db` নামে একটি ফাইল তৈরি করবে। ব্যস — **এটাই
সম্পূর্ণ ব্যাকআপ**।

ফিরিয়ে আনতে চাইলে: সার্ভার বন্ধ করে ফাইলটি
`WebApplication/server/data/inwebtools.db` নামে কপি করে দিন।

> ⚠️ সার্ভার চালু থাকা অবস্থায় সাধারণ `cp` দিয়ে কপি করবেন না — ফাইল অসম্পূর্ণ
> হতে পারে। উপরের `backup` কমান্ডটি চালু অবস্থাতেও নিরাপদ।

---

## ৫. যদি SQL শিখতে চান (ঐচ্ছিক)

শুধু আগ্রহ থাকলেই — কাজের জন্য দরকার নেই।

```bash
./DevelopmentFiles/scripts/db.sh shell
```

এতে একটি প্রম্পট খুলবে (read-only, তাই নিরাপদ):

```
sqlite> .tables                          -- টেবিলের তালিকা
sqlite> SELECT COUNT(*) FROM conversion_logs;
sqlite> .quit                            -- বেরিয়ে আসা
```

অথবা এক লাইনেই:

```bash
./DevelopmentFiles/scripts/db.sh sql "SELECT status, COUNT(*) FROM conversion_logs GROUP BY status;"
```

### সবচেয়ে দরকারি ৫টি SQL

| SQL | অর্থ |
|---|---|
| `SELECT * FROM conversion_logs;` | সব সারি দেখাও |
| `SELECT COUNT(*) FROM visitor_sessions;` | কতগুলো সারি আছে |
| `... WHERE status = 'failed';` | শুধু ব্যর্থগুলো |
| `... ORDER BY created_at DESC;` | নতুন থেকে পুরনো |
| `... LIMIT 10;` | মাত্র ১০টি |

---

## ৬. গ্রাফিক্যাল টুল (মাউস দিয়ে দেখতে চাইলে)

কমান্ড লাইন পছন্দ না হলে **DB Browser for SQLite** ব্যবহার করতে পারেন —
বিনামূল্যে, Windows/Mac/Linux-এ চলে: <https://sqlitebrowser.org/>

ইনস্টল করে `inwebtools.db` ফাইলটি খুললেই Excel-এর মতো টেবিল দেখতে পাবেন।

---

## ৭. সমস্যা হলে

| সমস্যা | সমাধান |
|---|---|
| `sqlite3: command not found` | `sudo apt-get install -y sqlite3` |
| `No database at ...` | সার্ভার একবার চালু করুন — ফাইল নিজে তৈরি হবে |
| `database is locked` | দ্বিতীয় কোনো প্রোগ্রাম লিখছে; বন্ধ করুন |
| ডাটাবেস নতুন করে শুরু করতে চাই | সার্ভার বন্ধ করে `rm WebApplication/server/data/inwebtools.db*` — **সব ডাটা মুছে যাবে**, আগে ব্যাকআপ নিন |

---

## ৮. মনে রাখার মতো তিনটি কথা

1. **ডাটাবেস চালু করা লাগে না** — এটি ফাইল, সার্ভার নয়।
2. **দেখার সহজতম পথ** — ব্রাউজারে `/AdminDashboard`।
3. **ব্যাকআপ = একটি কমান্ড** — `./DevelopmentFiles/scripts/db.sh backup`।

আরও প্রযুক্তিগত বিবরণ: [`DATABASE.md`](./DATABASE.md) (ইংরেজি)।
