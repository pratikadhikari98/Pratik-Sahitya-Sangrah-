# 📖 प्रतीक साहित्य संग्रह

नेपाली कविता, लेख र गजलको डिजिटल संग्रह — मोबाइलमा राम्रोसँग चल्ने, GitHub Pages मा होस्ट गर्न मिल्ने website।

---

## 🚀 GitHub मा कसरी राख्ने (पहिलो पटक Setup)

### १. GitHub Account बनाउनुस् (नभए)
[github.com](https://github.com) मा गएर free account बनाउनुस्।

### २. नयाँ Repository बनाउनुस्
1. GitHub मा लगइन गरेपछि माथि दायाँ `+` → **New repository** क्लिक गर्नुस्
2. Repository नाम राख्नुस् — जस्तै `sahitya-sangrah`
3. **Public** select गर्नुस् (GitHub Pages free मा चलाउन Public हुनुपर्छ)
4. **Create repository** थिच्नुस्

### ३. आफ्नो Files Upload गर्नुस्
1. नयाँ बनेको repository पेजमा **"uploading an existing file"** लिंकमा क्लिक गर्नुस्
2. यो ZIP भित्रका **सबै फाइल र folder** (index.html, css/, js/, data/, covers/ सबै) drag-and-drop गर्नुस्
   - ⚠️ ZIP फाइल सिधै upload नगर्नुस् — पहिले extract गरेर भित्रका फाइलहरू मात्र upload गर्नुस्
3. तल **Commit changes** बटन थिच्नुस्

### ४. GitHub Pages सक्रिय गर्नुस्
1. Repository मा माथि **Settings** ट्याबमा जानुस्
2. बायाँतिर **Pages** मेनुमा क्लिक गर्नुस्
3. **Branch** मा `main` select गरेर **Save** थिच्नुस्
4. १-२ मिनेटपछि माथि एउटा हरियो बक्समा यस्तो URL देखिनेछ:
   ```
   https://yourusername.github.io/sahitya-sangrah/
   ```
5. यही link नै तपाईंको website हो — यो जसलाई पनि पठाउन सकिन्छ 🎉

> 📱 मोबाइलबाटै यो सबै काम गर्न सकिन्छ — GitHub app वा browser बाटै।

---

## ✍️ नयाँ कविता / लेख / गजल कसरी थप्ने

सबै रचना **एउटै फाइलमा** राखिएको छ:

```
data/kavita.js
```

यो फाइल खोलेर, माथिको जस्तै ढाँचामा नयाँ entry थप्नुस्:

```js
{
  id: "k025",                         // ← हरेक रचनाको फरक-फरक ID (k024, k025...)
  title: "तपाईंको शीर्षक",
  category: "kavita",                  // ← kavita | lekh | gazal मध्ये एक
  tags: ["ट्याग१", "ट्याग२"],          // ← खोज्दा/फिल्टर गर्दा देखिने ट्याग
  cover: "covers/yourimage.jpg",       // ← फोटो नभए "" खाली राख्नुस्
  coverEmoji: "🌸",                    // ← फोटो नभएको बेला यो emoji देखिन्छ
  date: "2025-06-30",                  // ← YYYY-MM-DD ढाँचामा मिति
  readTime: "५ मिनेट",                  // ← वा "शार्दूलविक्रीडितम्" जस्तो छन्द नाम पनि राख्न सकिन्छ
  featured: false,                     // ← true राख्दा होमपेजको माथिल्लो slider मा देखिन्छ
  content: `
तपाईंको कविता/लेख/गजलको पूरा पाठ यहाँ लेख्नुस्।

लाइन छोड्न चाहनुभए खाली लाइन राख्नुस्,
यसरी नै हरेक paragraph छुट्टिन्छ।
  `
},
```

### ध्यान दिनुपर्ने कुरा:
- **हरेक entry पछि comma (`,`)** राख्नुस् — अन्तिम entry बाहेक
- **`id`** हरेक रचनाको फरक हुनुपर्छ — दोहोरिनु हुँदैन
- **`category`** मा यी ३ value मात्र मान्य छन्: `kavita`, `lekh`, `gazal`
- **`content`** लेख्दा backtick (`` ` ``) भित्रै सबै लेख्नुस् — यसले multi-line टेक्स्ट allow गर्छ

### फोटो थप्ने तरिका
1. आफ्नो फोटो `covers/` folder भित्र राख्नुस् (jpg, png जुनसुकै)
2. `cover:` field मा त्यही file नाम लेख्नुस् — जस्तै `"covers/mero-photo.jpg"`
3. फोटो नराख्ने हो भने `cover: ""` खाली राखे `coverEmoji` मात्र देखिन्छ

### थपेपछि GitHub मा कसरी update गर्ने
1. GitHub repository मा गएर `data/kavita.js` फाइल खोल्नुस्
2. माथि दायाँ ✏️ (pencil) icon थिच्नुस्
3. परिवर्तन गरेको content paste गर्नुस्
4. तल **Commit changes** थिच्नुस्
5. १-२ मिनेटमा website मा आफैं update हुन्छ — कुनै अरू काम गर्नुपर्दैन

---

## 🎨 थिम र Layout बदल्ने (User को लागि)

Website को ⋮ (3-dots) मेनुमा गएर:
- **रङ थिम** — Kalika theme (नीलो रङ, animated header)
- **लेआउट** — Grid / List / Magazine / Compact मध्ये छनोट गर्न सकिन्छ
- **Dark/Light mode** — 🌙/☀️ बटनबाट

यी preference मोबाइलमा नै save हुन्छन् (localStorage), अर्को पटक खोल्दा पनि कायम रहन्छन्।

---

## 📁 Project Structure (छोटो जानकारी)

| Folder/File | के छ |
|---|---|
| `index.html` | मुख्य होमपेज |
| `about.html` | "बारेमा" पेज |
| `data/kavita.js` | **सबै रचना यहाँ** — नयाँ थप्ने मुख्य ठाउँ |
| `data/about.js` | बारेमा पेजको जानकारी (नाम, quote, contact link) |
| `data/description.js` | About फोटो तलको description |
| `covers/` | सबै cover फोटोहरू |
| `css/style.css` | सबै design/theme/layout CSS |
| `js/app.js` | Card देखाउने, search, filter जस्ता logic |
| `js/wheel.js` | About पेजको घुम्ने wheel + clock |
| `manifest.json` | PWA (installable app) settings |

---

## 🔗 आफ्नो Domain जोड्ने (Optional)

आफ्नै domain (जस्तै `pratiksahitya.com`) राख्नुपरे:
1. Repository मा `CNAME` नामको फाइल छ — त्यहाँ आफ्नो domain नाम लेख्नुस्
2. आफ्नो domain provider (जस्तै GoDaddy, Namecheap) मा DNS settings मा GitHub Pages को IP/CNAME थप्नुस्
3. विस्तृत जानकारी: [GitHub Pages custom domain docs](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)

---

बनाएको: **प्रतीक** — कवि • लेखक • विचारक
