# Hugging Face টোকেন তৈরি — সম্পূর্ণ গাইড (A to Z)

> iNWebTools প্রকল্পের জন্য। যাচাই করা হয়েছে: ২৫ আগস্ট ২০২৬।

---

## এক নজরে (তাড়া থাকলে)

| ধাপ | কাজ                                                         |
| --- | ----------------------------------------------------------- |
| ১   | https://huggingface.co/join — অ্যাকাউন্ট খুলুন              |
| ২   | ইমেইল ভেরিফাই করুন (**বাধ্যতামূলক**)                        |
| ৩   | https://huggingface.co/settings/tokens/new?preset=inference |
| ৪   | নাম দিন `iNWebTools` → **Create token**                     |
| ৫   | টোকেন কপি করুন (**একবারই দেখাবে**)                          |
| ৬   | `WebApplication/server/.env`-এ `HF_FREE_API_TOKEN=...` বসান |

---

## ধাপ ১ — অ্যাকাউন্ট তৈরি

👉 **https://huggingface.co/join**

- Email, Username, Password দিন
- ইতিমধ্যে অ্যাকাউন্ট থাকলে: https://huggingface.co/login

## ধাপ ২ — ইমেইল ভেরিফিকেশন ⚠️

Hugging Face একটি ভেরিফিকেশন মেইল পাঠাবে। **এটি নিশ্চিত না করলে টোকেন তৈরির বাটন নিষ্ক্রিয় (grayed out) থাকবে** — অনেকেই এখানে আটকে যান, কারণ পেজটি দেখা গেলেও বাটন কাজ করে না।

Inbox-এ না পেলে Spam/Promotions দেখুন।

## ধাপ ৩ — টোকেন পেজে যান

### সবচেয়ে সহজ পথ (প্রস্তাবিত)

👉 **https://huggingface.co/settings/tokens/new?preset=inference**

এই লিংকটি **Inference preset** সহ পেজ খোলে — প্রয়োজনীয় অনুমতিগুলো আগে থেকেই টিক করা থাকে।

### ম্যানুয়াল পথ

1. https://huggingface.co/settings/tokens
2. **+ Create new token**
3. উপরে টাইপ বাছাই: **Fine-grained** (প্রোডাকশনের জন্য প্রস্তাবিত)

## ধাপ ৪ — টোকেনের ধরন বাছাই

| ধরন              | কখন ব্যবহার                 | iNWebTools-এর জন্য      |
| ---------------- | --------------------------- | ----------------------- |
| **Fine-grained** | প্রোডাকশন; নির্দিষ্ট অনুমতি | ✅ **এটাই বাছুন**       |
| **Read**         | শুধু মডেল ডাউনলোড           | ⚠️ চলতে পারে, কম নিরাপদ |
| **Write**        | মডেল আপলোড/পুশ              | ❌ অপ্রয়োজনীয় ঝুঁকি   |

Fine-grained কেন — টোকেন ফাঁস হলে ক্ষতির পরিধি সীমিত থাকে, এবং এটি আপনার সব রিপোর অ্যাক্সেস শেয়ার করে না।

## ধাপ ৫ — অনুমতি (সবচেয়ে গুরুত্বপূর্ণ ধাপ) 🔴

**Name:** `iNWebTools` (প্রতি অ্যাপে আলাদা টোকেন রাখুন — একটি বাতিল করলে অন্যগুলো অক্ষত থাকে)

### অবশ্যই টিক দিতে হবে

```
☑  Make calls to Inference Providers
```

> ⚠️ **এই একটি অনুমতি না দিলে API রিকোয়েস্ট প্রত্যাখ্যাত হবে।** iNWebTools-এ তখন
> `HF_AUTH_FAILED` বা `UPSTREAM_ERROR` দেখাবে। preset লিংক ব্যবহার করলে এটি
> স্বয়ংক্রিয়ভাবে টিক থাকে।

### ঐচ্ছিক

```
☐  Make calls to your Inference Endpoints    (dedicated endpoint ব্যবহার করলে)
☐  Read access to public gated repos         (gated মডেল ব্যবহার করলে)
```

Whisper পাবলিক মডেল, তাই সাধারণত এগুলো লাগে না।

### যা কখনো দেবেন না

```
✗  Write access to repos
✗  Manage billing / Delete repos
```

## ধাপ ৬ — টোকেন কপি করুন ⚠️

**Create token** চাপার পর একটি পপআপে টোকেন দেখাবে:

```
hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

> 🔴 **টোকেনটি জীবনে একবারই দেখানো হয়।** পপআপ বন্ধ করলে চিরতরে মাস্ক হয়ে যাবে।
> হারালে নতুন টোকেন বানানো ছাড়া উপায় নেই।

**Copy** চেপে নিরাপদ জায়গায় রাখুন (password manager বা সরাসরি `.env`)।

## ধাপ ৭ — iNWebTools-এ বসান

`WebApplication/server/.env` ফাইলে:

```env
HF_FREE_API_TOKEN=hf_আপনার_আসল_টোকেন
HF_MODEL=openai/whisper-large-v3-turbo
HF_API_BASE_URL=https://router.huggingface.co/hf-inference/models
```

`npm run dev` চালু থাকলে nodemon নিজেই রিলোড করবে।

### যাচাই করুন

```bash
curl -s http://localhost:5000/health | grep transcriptionReady
```

- `"transcriptionReady": true` → ✅ কাজ করছে (হেডারের পিল **সবুজ** হবে)
- `"transcriptionReady": false` → টোকেন পড়া যায়নি

---

## খরচ ও ফ্রি টিয়ার 💰

| অ্যাকাউন্ট        | মাসিক ক্রেডিট               |
| ----------------- | --------------------------- |
| **Free**          | **$0.10** (পরিবর্তনসাপেক্ষ) |
| PRO               | $2.00                       |
| Team / Enterprise | $2.00 প্রতি সিট             |

- ক্রেডিট **প্রতি মাসে** রিসেট হয়
- Hugging Face প্রোভাইডারের রেটেই চার্জ করে, **কোনো অতিরিক্ত ফি নেই**
- ক্রেডিট শেষ হলে API বন্ধ হবে, যতক্ষণ না অতিরিক্ত ক্রেডিট কেনেন
- খরচ দেখুন: https://huggingface.co/settings/billing

> **বাস্তব প্রত্যাশা:** ফ্রি $0.10 দিয়ে অল্প কিছু অডিও ট্রান্সক্রিপশন হবে — ডেমো ও
> টেস্টিংয়ের জন্য যথেষ্ট, নিয়মিত প্রোডাকশন ব্যবহারের জন্য নয়।

---

## মডেলের প্রাপ্যতা (যাচাইকৃত)

`openai/whisper-large-v3-turbo` — API দিয়ে পরীক্ষা করা হয়েছে:

| প্রোভাইডার       | অবস্থা  | টাস্ক                        |
| ---------------- | ------- | ---------------------------- |
| **hf-inference** | ✅ live | automatic-speech-recognition |
| deepinfra        | ✅ live | automatic-speech-recognition |

`openai/whisper-large-v3` (non-turbo) আরও বেশি প্রোভাইডারে আছে: fal-ai,
together, replicate, hf-inference, deepinfra।

---

## ⚠️ এন্ডপয়েন্ট পরিবর্তনের সতর্কতা

পুরনো টিউটোরিয়ালে `api-inference.huggingface.co` দেখবেন। **সেটি অচল**:

```
router.huggingface.co/hf-inference/models/...  → 401  ✅ সঠিক
api-inference.huggingface.co/models/...        → সংযোগ ব্যর্থ  ❌
```

iNWebTools-এ ইতিমধ্যে সঠিক URL সেট করা আছে (কমিট `a39bb9a`)।

> **আরেকটি ফাঁদ:** `router.huggingface.co/v1/models` তালিকায় ১৩১টি মডেল আছে কিন্তু
> **একটিও Whisper নেই** — ওই OpenAI-সদৃশ `/v1` সারফেসটি চ্যাট মডেলের জন্য।
> অডিওর জন্য `hf-inference/models` পথই সঠিক।

---

## সমস্যা সমাধান

| উপসর্গ                       | কারণ                     | সমাধান                                               |
| ---------------------------- | ------------------------ | ---------------------------------------------------- |
| বাটন grayed out              | ইমেইল ভেরিফাই হয়নি      | মেইল নিশ্চিত করুন                                    |
| `HF_TOKEN_MISSING` (503)     | সার্ভার টোকেন পড়েনি     | `.env`-এ নাম ঠিক আছে? সার্ভার রিস্টার্ট              |
| `HF_AUTH_FAILED` (502)       | **Inference অনুমতি নেই** | টোকেন Edit → "Make calls to Inference Providers" টিক |
| `UPSTREAM_UNAVAILABLE` (503) | মডেল cold start          | অপেক্ষা করুন; কোড নিজেই ৩ বার রিট্রাই করে            |
| `UPSTREAM_TIMEOUT` (504)     | বড় ফাইল/ধীর মডেল        | ছোট ক্লিপ দিন                                        |
| ক্রেডিট শেষ                  | মাসিক $0.10 ফুরিয়েছে    | billing পেজে ক্রেডিট কিনুন বা মাস ঘোরার অপেক্ষা      |

---

## নিরাপত্তা নিয়ম 🔒

1. **`.env` কখনো কমিট করবেন না** — আমাদের `.gitignore`-এ সুরক্ষিত আছে
2. **প্রতি অ্যাপে আলাদা টোকেন** — একটি ফাঁস হলে শুধু সেটাই বাতিল করবেন
3. **টোকেন চ্যাটে/স্ক্রিনশটে দেখাবেন না**
4. **ফাঁস হলে সাথে সাথে বাতিল করুন:** https://huggingface.co/settings/tokens → Delete/Refresh

অন্য কারো টোকেন ফাঁস হতে দেখলে (অ্যাকাউন্টে অধিকার ছাড়াই) বাতিল করা যায়:

```bash
curl -X POST "https://huggingface.co/api/credentials/revoke" \
  -H "Content-Type: application/json" \
  -d "{\"credentials\": [\"${LEAKED_HF_TOKEN}\"]}"
```

---

## দরকারি লিংক

| কাজ                 | লিংক                                                         |
| ------------------- | ------------------------------------------------------------ |
| টোকেন তৈরি (preset) | https://huggingface.co/settings/tokens/new?preset=inference  |
| টোকেন তালিকা        | https://huggingface.co/settings/tokens                       |
| সাইন আপ             | https://huggingface.co/join                                  |
| বিলিং ও খরচ         | https://huggingface.co/settings/billing                      |
| Inference ব্যবহার   | https://huggingface.co/settings/inference-providers/overview |
| Whisper মডেল        | https://huggingface.co/openai/whisper-large-v3-turbo         |
| অফিসিয়াল ডকস       | https://huggingface.co/docs/hub/security-tokens              |
