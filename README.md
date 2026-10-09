# 🌿 MissMate — "What Did I Miss?"
> **Catch up on 150+ unread college group chat messages in 5 seconds.**  
> Built for students, hackathons, and busy team leaders.

---

## 💡 The Problem & The Solution
- **The Problem:** College students often wake up or return from class to find dozens or hundreds of unread messages in WhatsApp, Discord, or Telegram project groups. Critical deadlines, room changes, and assigned tasks get buried beneath casual chatter and memes.
- **The Solution:** **MissMate** extracts what really matters:
  - 🚨 **High-Priority & Urgent Announcements** (Room changes, exam updates, deadline shifts)
  - 📅 **Deadlines & Dates** (Submission times, meetings, exam dates)
  - ✅ **Action Items & Assigned Tasks** (Who needs to do what, with interactive checkboxes)
  - 📝 **Executive Catch-Up Digest** (3-bullet high-level summary + active participants + top topics)
  - 🔒 **100% Local & Private:** No external servers, no AI API keys required, zero data uploaded. Everything runs securely right inside your browser.

---

## ✨ Features
1. **Multi-Format Chat Parser:**
   - Supports WhatsApp exports (`[10/10/24, 2:15 PM] Alex: ...` or `10/10/24, 2:15 PM - Alex: ...`), Discord/Slack (`Alex [2:15 PM]: ...`), Telegram, or plain `Name: Message` lines.
2. **Instant Demo Presets:**
   - 💻 **CS Project Sprint:** High-stress deadline panic, API endpoints, peer evaluation forms.
   - 🎪 **College Fest Logistics:** Sponsorship approvals, volunteer lists, vendor deposits.
   - 📚 **Calculus Exam Prep:** Rescheduled exam date, formula sheets, room numbers.
3. **Smart Priority Classifier:**
   - Color-coded badges for **High Priority** (urgent/critical), **Actionable/Notice** (tasks, schedules), and **General Chat**.
4. **Interactive Action Items Checklist:**
   - Tasks are parsed with assigned members (e.g., `@David`, `Priya`, `Everyone`).
   - Click checkboxes to mark tasks as completed in real time.
   - **"Copy Tasks"** button exports a markdown checklist for your notes or Notion.
5. **Timeline & Deadlines:**
   - Automatically detects times (`11:59 PM`, `6:00 PM`), relative dates (`tomorrow`, `this Friday`), and absolute dates (`Oct 14`).
6. **Prioritized Message Feed with Live Filter & Search:**
   - Filter by tabs: *All*, *🚨 Urgent Only*, *📌 Actionable*, *💬 General*.
   - Instant search bar to quickly find specific keywords or sender names.

---

## 🚀 How to Open and Run MissMate (Step-by-Step for Beginners)

You don't need to install anything! MissMate runs in any modern web browser (Edge, Chrome, Firefox, Brave, Safari).

### Method 1: The Quickest Way (Double-Click)
1. Open your File Explorer and navigate to your folder:
   ```
   c:\Users\vaish\OneDrive\Desktop\missmate
   ```
2. Find the file named **`index.html`**.
3. **Double-click** `index.html` (or right-click → **Open with** → **Microsoft Edge** or **Google Chrome**).
4. MissMate will open instantly!

---

### Method 2: From the Terminal / PowerShell
If you have a terminal open in this folder, you can open it with a single command:
```powershell
Start-Process "index.html"
```
Or to run a local web server using Python (included on your PC):
```powershell
python -m http.server 8000
```
Then open your browser and go to: `http://localhost:8000`

---

## 🎯 How to Test During a Hackathon Demo

1. **Click "Load Demo Chat"** or click one of the preset pills (**💻 CS Project**, **🎪 College Fest**, **📚 Calculus Exam**).
2. Click **"Analyze Messages"**.
3. Watch the dashboard populate instantly:
   - Check the **Stats Cards** (Total messages, Urgent count, Action items, Deadlines).
   - Read the **Executive Catch-Up Summary** with 3 structured bullets.
   - Click the checkboxes in the **Action Items** list to show interactive task management.
   - Click the **"🚨 Urgent Only"** tab to filter out the noise and show only critical notices.
   - Click **"Copy Summary"** to demonstrate clipboard integration.
4. Click **"Clear"** to reset and paste your own real group chat!

---

## 📁 File Structure
- [`index.html`](file:///c:/Users/vaish/OneDrive/Desktop/missmate/index.html) — Modern dashboard UI with soft green accents and responsive layout.
- [`styles.css`](file:///c:/Users/vaish/OneDrive/Desktop/missmate/styles.css) — Custom design system with soft emerald palette, cards, badges, and animations.
- [`sample-data.js`](file:///c:/Users/vaish/OneDrive/Desktop/missmate/sample-data.js) — Realistic college chat presets for live demos.
- [`analyzer.js`](file:///c:/Users/vaish/OneDrive/Desktop/missmate/analyzer.js) — 100% client-side parser, deadline detector, task extractor, and summarizer.
- [`app.js`](file:///c:/Users/vaish/OneDrive/Desktop/missmate/app.js) — Event management, interactive checklist, filters, search, and clipboard actions.

---

## 🏆 Hackathon Pitch Tips
> *"College group chats are chaotic. MissMate solves FOMO and missed deadlines with zero cloud dependencies. It's lightning-fast, private, free to run, and works directly in any browser."*
