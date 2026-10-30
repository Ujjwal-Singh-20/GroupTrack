# GroupTrack - Student Project & Review Tracker

A fast, minimalist, desktop-friendly application designed for faculty and project guides to manage multi-section student project groups, track project ideas, and log progress reviews with zero bloated text and reduced eye strain.

---

## Key Features

1. **Multi-Section Tabs**:
   - Manage distinct sections (e.g., *Section A*, *Section B*, *Batch 2026*).
   - Easily add, rename, or switch sections. Each section maintains its own independent roster, project groups, and review logs.

2. **Dynamic Sheet Column Mapper**:
   - Upload any Excel (`.xlsx`, `.xls`) or `.csv` student roster.
   - Intelligent column mapper previews the first 3 rows and lets you match *Roll No / ID*, *Student Name*, *Department*, and *Email* columns regardless of header naming or column sequence.

3. **Pastel Minimalist Dark Canvas UI**:
   - High-contrast, dark slate canvas (`#0b0f19`, `#111827`) paired with soft pastel indicators:
     - 🟣 **Pastel Lavender**: Active tabs & Ideation stage
     - 🔵 **Pastel Sky**: Roll numbers & In Progress stage
     - 🟡 **Pastel Amber**: Unassigned students & Needs Changes
     - 🟢 **Pastel Mint**: Approved & Review counters
   - Clear typography and zero glare, designed for comfort during long evaluation sessions.

4. **1-Click Review Check-In Engine**:
   - **`+` / `-` Stepper Buttons**: Instantly tally review check-ins in one click.
   - **`+ Log Review` Modal**: Record specific review dates, student demonstrations, and action items.
   - **Review History**: Timeline view displaying past check-in logs chronologically.

5. **Status Matrix Export & Print Report**:
   - **Export CSV**: One-click download of the complete status matrix (`Group Name`, `Members`, `Project Title`, `Idea`, `Reviews Count`, `Score`, `Last Feedback`).
   - **Print / Save as PDF**: Clean, printer-friendly summary layout via `Ctrl+P`.
   - **JSON Backup & Restore**: Safe full-database export and restore.

---

## How to Run

### Method 1: Direct in Browser (Zero Installation)
Simply double-click `index.html` in your file explorer. The application runs immediately in Chrome, Edge, Firefox, or Safari, persisting data locally.

### Method 2: Standalone Desktop Application (`.exe`)
For a dedicated desktop experience without browser chrome:
1. Navigate to the `desktop/` directory.
2. Run `build_exe.bat` (or compile via `pyinstaller` using `launcher.py`).
3. The resulting standalone executable will be located at `desktop/dist/GroupTrack.exe` (~12 MB, <40 MB RAM).

---

## Project Structure

```
├── index.html                 # Main UI shell, section tabs, and modals
├── style.css                  # Pastel dark canvas design system and @media print rules
├── sample_students.csv        # Sample student roster for testing
├── xlsx.full.min.js           # Offline Excel/CSV parser
│
├── js/
│   ├── storage.js             # Multi-section data models & local persistence
│   ├── mapper.js              # Dynamic sheet uploader & column mapping modal
│   ├── roster.js              # Student checklist panel & multi-select logic
│   ├── groups.js              # Group cards, review steppers & timeline logger
│   ├── export.js              # CSV status matrix generator & printable views
│   └── app.js                 # Application orchestrator
│
└── desktop/
    ├── launcher.py            # Lightweight WebView2 native desktop wrapper
    ├── build_exe.bat          # One-click PyInstaller build script
    └── requirements.txt       # Python dependencies (pywebview, pyinstaller)
```
