# অ্যাডমিন প্যানেলে লগইন (বাংলা)

> **⚠️ Status — SQLite removed (2026-08-25)**
>
> The SQLite engine has been removed ahead of a migration to PostgreSQL. No
> database is configured: `DB_ENABLED=false`, `/api/admin/*` answers 503
> `DATABASE_UNAVAILABLE`, and the public transcription API is unaffected.
> This document describes the *previous* SQLite setup and is kept for
> reference until the PostgreSQL schema replaces it.
>
> Archived artefacts: `DevelopmentFiles/backups/sqlite-archive-20260825/`

## 🔑 লগইন তথ্য

| | |
|---|---|
| **ঠিকানা** | http://localhost:5173/AdminDashboard |
| **ইউজারনেম** | `admin` |
| **পাসওয়ার্ড** | `~/.a2t_adminpass` ফাইলে রাখা আছে |
| **রোল** | `owner` (সর্বোচ্চ অনুমতি) |

পাসওয়ার্ড দেখতে টার্মিনালে চালান:

```bash
cat ~/.a2t_adminpass
```

> ⚠️ পাসওয়ার্ডটি এখানে সরাসরি লেখা হয়নি **ইচ্ছাকৃতভাবে** — এই ফাইলটি Git-এ
> কমিট হয়, আর কমিট করা পাসওয়ার্ড চিরকাল ইতিহাসে থেকে যায়।

---

## পাসওয়ার্ডটি কোথা থেকে এলো?

অ্যাডমিন ড্যাশবোর্ড প্রথম তৈরির সময় একটি র‍্যান্ডম পাসওয়ার্ড বানিয়ে
`~/.a2t_adminpass` ফাইলে রাখা হয়েছিল, এবং সেটি `server/.env`-এর
`ADMIN_BOOTSTRAP_PASSWORD`-এ বসানো হয়েছিল। সার্ভার প্রথমবার চালু হওয়ার সময়
ওই মান দিয়ে `admin` অ্যাকাউন্টটি তৈরি হয়।

**ডাটাবেসে মূল পাসওয়ার্ড নেই** — শুধু bcrypt হ্যাশ (cost 12) আছে। তাই
`~/.a2t_adminpass` ফাইলটিই একমাত্র কপি।

---

## 🔒 নিরাপত্তা: এখনই যা করা উচিত

### ১. পাসওয়ার্ড বদলে নিন

স্বয়ংক্রিয়ভাবে তৈরি পাসওয়ার্ডটি চ্যাট ইতিহাসে ও ফাইলে রয়ে গেছে। নিজের
পছন্দের পাসওয়ার্ড দিন:

**ড্যাশবোর্ড → Security → Admin Access → Change password**

### ২. সিক্রেট ফাইলের পারমিশন যাচাই করুন

```bash
ls -l ~/.a2t_adminpass ~/.a2t_dbpass ~/.gh_token
```

তিনটিই `-rw-------` (`600`) হওয়া উচিত। না হলে:

```bash
chmod 600 ~/.a2t_adminpass ~/.a2t_dbpass ~/.gh_token
```

> `npm ci` বা কিছু ইনস্টল স্ক্রিপ্ট চালানোর পর পারমিশন বদলে যেতে দেখা গেছে —
> মাঝে মাঝে যাচাই করে নেওয়া ভালো।

### ৩. প্রোডাকশনে যাওয়ার আগে বাধ্যতামূলক

| কী | কেন |
|---|---|
| নতুন `ADMIN_BOOTSTRAP_PASSWORD` | ডেভেলপমেন্টের পাসওয়ার্ড লাইভে যাবে না |
| নতুন `JWT_SECRET` | `openssl rand -base64 48` |
| `CORS_ORIGIN` সেট করা | নয়তো যেকোনো সাইট API কল করতে পারবে |
| `TRUST_PROXY=true` | Nginx-এর পেছনে থাকলে, নয়তো `req.ip` ভুল আসবে |

---

## 👤 নতুন অ্যাকাউন্ট তৈরি করা

ড্যাশবোর্ডে "নতুন ব্যবহারকারী যোগ করুন" বলে কোনো পেজ নেই, তাই এই স্ক্রিপ্টটি
ব্যবহার করুন:

```bash
cd /home/user
node DevelopmentFiles/scripts/create-admin.mjs <ইউজারনেম> [রোল]
```

উদাহরণ:

```bash
node DevelopmentFiles/scripts/create-admin.mjs iNWEB owner
```

স্ক্রিপ্টটি পাসওয়ার্ড **গোপনে** জিজ্ঞেস করবে — টাইপ করার সময় স্ক্রিনে দেখা
যাবে না, এবং শেল ইতিহাসেও থাকবে না।

```
  Database : /home/user/WebApplication/server/data/inwebtools.db
  Username : iNWEB
  Role     : owner
  Action   : CREATE

  New password (hidden):
  Confirm password     :

  ✓ Created: iNWEB (owner)
```

**রোল তিনটি:**

| রোল | অনুমতি |
|---|---|
| `owner` | সর্বোচ্চ — সব সেটিংস বদলানো ও সব দেখা |
| `admin` | সেটিংস বদলাতে পারবে |
| `viewer` | শুধু দেখতে পারবে |

### টার্মিনালে ইনপুট দেওয়া সম্ভব না হলে

স্বয়ংক্রিয় পরিবেশে (CI, স্ক্রিপ্ট) লুকানো প্রম্পট কাজ করে না। তখন
`--generate` ব্যবহার করুন — একটি র‍্যান্ডম পাসওয়ার্ড তৈরি হয়ে **একবারই**
দেখানো হবে:

```bash
node DevelopmentFiles/scripts/create-admin.mjs iNWEB owner --generate
```

> ⚠️ এভাবে তৈরি পাসওয়ার্ড টার্মিনালের ইতিহাসে থেকে যায়। লগইন করার পর
> **Security → Admin Access** থেকে বদলে নেওয়া উচিত।

**নোট:**
- একই ইউজারনেম দিলে অ্যাকাউন্টটি **আপডেট** হবে (পাসওয়ার্ড/রোল বদলাবে) — তাই
  পাসওয়ার্ড রিসেট করতেও এটি ব্যবহার করা যায়。
- পাসওয়ার্ড অন্তত **৬ অক্ষর** হতে হবে (`MIN_ADMIN_PASSWORD_LENGTH` দিয়ে
  পরিবর্তনযোগ্য — প্রোডাকশনে বাড়ানো উচিত)。
- প্রতিটি তৈরি/আপডেট `admin_audit_log`-এ রেকর্ড হয়。

---

## পাসওয়ার্ড ভুলে গেলে

ডাটাবেসে হ্যাশ থাকে, তাই পুরনো পাসওয়ার্ড **উদ্ধার করা যায় না**। তবে রিসেট করা যায়:

```bash
# ১. সার্ভার বন্ধ করুন
# ২. অ্যাডমিন অ্যাকাউন্টটি মুছুন
cd /home/user/WebApplication/server
sqlite3 data/inwebtools.db "DELETE FROM admin_users WHERE username='admin';"

# ৩. .env-এ নতুন পাসওয়ার্ড বসান
#    ADMIN_BOOTSTRAP_PASSWORD=নতুন-পাসওয়ার্ড

# ৪. সার্ভার চালু করুন — অ্যাকাউন্টটি নতুন পাসওয়ার্ডে আবার তৈরি হবে
```

> ⚠️ এতে ওই অ্যাডমিনের অডিট ইতিহাস (`admin_audit_log`) মুছবে না — সেটি
> আলাদা টেবিলে থাকে, ইচ্ছাকৃতভাবে।

---

## লগইন কাজ করছে কিনা পরীক্ষা

```bash
IP=$(hostname -I | awk '{print $1}')
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"username\":\"admin\",\"password\":\"$(cat ~/.a2t_adminpass)\"}" \
  "http://$IP:5173/api/admin/auth/login"
```

`"success": true` এলে ঠিক আছে।

---

## সমস্যা হলে

| সমস্যা | কারণ ও সমাধান |
|---|---|
| `INVALID_CREDENTIALS` | পাসওয়ার্ড ভুল — `cat ~/.a2t_adminpass` দেখুন |
| `TOO_MANY_ATTEMPTS` | ৫ বার ভুল হয়েছে; ১৫ মিনিট অপেক্ষা করুন |
| `AUTH_NOT_CONFIGURED` | `.env`-এ `JWT_SECRET` নেই বা ৩২ অক্ষরের কম |
| `DATABASE_UNAVAILABLE` | সার্ভার চালু হয়নি বা DB ফাইল পড়া যাচ্ছে না |
| লগইন পেজই আসছে না | সার্ভার চালু আছে? `npm run dev` |

আরও তথ্য: [`SQLITE_GUIDE_BN.md`](./SQLITE_GUIDE_BN.md) ও
[`SECURITY_AUDIT.md`](./SECURITY_AUDIT.md)।
