// === CONFIGURATION ===
const SHEET_ID = "1dC6pjjA_fW_1ZzAQjGX04WSa1c7aryG8leR4U1aB76o"; // replace with your Sheet ID
const SHEET_NAME = "Devotionals"; // exact tab name
const SHEET_URL = `https://opensheet.vercel.app/${SHEET_ID}/${SHEET_NAME}`;
const ANALYTICS_URL = "https://script.google.com/macros/s/AKfycbw3oKElpBiZ3fMkY9EJL3wd6LpmsOO1bCvTUDCRbg8EZIm0loXs_oX5uaLj4Cz1sXUo/exec"; // replace with your Apps Script URL

// === ELEMENTS ===
const dateEl = document.getElementById("date");
const titleEl = document.getElementById("title");
const scripturesEl = document.getElementById("scriptures");
const messageEl = document.getElementById("message");
const prayersEl = document.getElementById("prayers");
const completeBtn = document.getElementById("completeBtn");
const statusEl = document.getElementById("status");

const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const jumpDateInput = document.getElementById("jumpDate");
const jumpBtn = document.getElementById("jumpBtn");

let currentDate = new Date();

// === UTILITIES ===
function formatDateYYYYMMDD(date) {
  return date.getFullYear() + "-" +
         String(date.getMonth() + 1).padStart(2, "0") + "-" +
         String(date.getDate()).padStart(2, "0");
}

function getSimpleDevice() {
  const ua = navigator.userAgent;
  if (/Mobi|Android/i.test(ua)) return "Mobile";
  if (/iPad|Tablet/i.test(ua)) return "Tablet";
  if (/Chrome/i.test(ua)) return "Chrome";
  if (/Firefox/i.test(ua)) return "Firefox";
  if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return "Safari";
  if (/Edge/i.test(ua)) return "Edge";
  return "Other";
}

// Normalize sheet date (YYYY-MM-DD or MM/DD/YYYY)
function normalizeSheetDate(sheetDate) {
  if (!sheetDate) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(sheetDate)) return sheetDate.split("T")[0];
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(sheetDate)) {
    const [m, d, y] = sheetDate.split("/").map(Number);
    return `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  }
  return null;
}

// --- ANALYTICS ---
function sendAnalytics(actionType) {
  const devotionalDate = formatDateYYYYMMDD(currentDate);
  const device = getSimpleDevice();

  fetch(ANALYTICS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      devotional_date: devotionalDate,
      action: actionType,
      device: device
    })
  }).catch(err => console.warn("Analytics failed:", err));
}

// --- LOAD DEVOTIONAL ---
function loadDevotional(dateObj) {
  const dateISO = formatDateYYYYMMDD(dateObj);

  fetch(SHEET_URL)
    .then(res => res.json())
    .then(rows => {
      if (!Array.isArray(rows)) throw new Error("Invalid sheet data");

      const todayData = rows.find(r => {
        const sheetDateStr = normalizeSheetDate(r.date);
        return sheetDateStr === dateISO;
      });

      dateEl.textContent = dateObj.toLocaleDateString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric"
      });

      prayersEl.innerHTML = "";

      const progressLabel = document.querySelector(".progress-label");
      const progressFill = document.querySelector(".progress-bar-fill");

      progressLabel.textContent = "Progress: 0%";
      progressFill.style.width = "0%";
      progressFill.style.backgroundColor = "#2c6cb8";

      if (!todayData) {
        titleEl.textContent = "No devotional found for this date.";
        scripturesEl.textContent = "";
        messageEl.textContent = "";
        completeBtn.disabled = true;
        statusEl.textContent = "";
        return;
      }

      titleEl.textContent = todayData.title;
      scripturesEl.textContent = "📖 " + todayData.scriptures;
      messageEl.textContent = todayData.message;

      const standardPlan = [
        { activity: "Please tick after you complete this daily plan", minutes: "" },
        { activity: "Praise", minutes: 5 },
        { activity: "Bible Reading", minutes: 20 },
        { activity: "Prayer based on the Bible reading", minutes: 5 },
        { activity: "General Prayer Points", minutes: 10 },
        { activity: "Personal Prayer Points", minutes: 10 },
        { activity: "Worship", minutes: 4 },
        { activity: "Memory Verse", minutes: 2 },
        { activity: "Confession of the Word", minutes: 2 },
        { activity: "Waiting on God", minutes: 2 }
      ];

      const header = document.createElement("h4");
      header.textContent = "✅ Daily Plan Checklist";
      header.style.marginTop = "15px";
      header.style.fontWeight = "bold";
      prayersEl.appendChild(header);

      const savedProgress = JSON.parse(localStorage.getItem(`${dateISO}-plan`) || "{}");

      function updateProgress() {
        const total = standardPlan.filter(i => i.minutes).length;
        const completed = Object.values(savedProgress).filter(Boolean).length;
        const percent = Math.round((completed / total) * 100);

        progressLabel.textContent = `Progress: ${percent}%`;
        progressFill.style.width = `${percent}%`;
        progressFill.style.backgroundColor = percent === 100 ? "#28a745" : "#2c6cb8";

        if (percent === 100 && !localStorage.getItem(dateISO)) {
          statusEl.textContent = "🎉 Ready to mark complete!";
          statusEl.classList.add("ready");
          setTimeout(() => statusEl.classList.remove("ready"), 800);
          completeBtn.disabled = false;
        } else if (localStorage.getItem(dateISO) === "completed") {
          statusEl.textContent = "✅ Completed for this day!";
          completeBtn.disabled = true;
        } else {
          statusEl.textContent = "";
          completeBtn.disabled = true;
        }
      }

      standardPlan.forEach((item, index) => {
        const li = document.createElement("li");
        if (item.minutes) {
          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.checked = savedProgress[index] || false;

          checkbox.addEventListener("change", () => {
            savedProgress[index] = checkbox.checked;
            localStorage.setItem(`${dateISO}-plan`, JSON.stringify(savedProgress));
            updateProgress();
          });

          li.appendChild(checkbox);
          li.appendChild(document.createTextNode(` ${item.activity} – ${item.minutes} mins`));
        } else {
          li.textContent = item.activity;
        }

        prayersEl.appendChild(li);
      });

      updateProgress();
      sendAnalytics("viewed");
    })
    .catch(err => {
      console.error("Error loading data:", err);
      titleEl.textContent = "Could not load daily devotional data.";
    });
}

// --- NAVIGATION ---
prevBtn.addEventListener("click", () => {
  currentDate.setDate(currentDate.getDate() - 1);
  loadDevotional(currentDate);
});
nextBtn.addEventListener("click", () => {
  currentDate.setDate(currentDate.getDate() + 1);
  loadDevotional(currentDate);
});

// --- DATE PICKER JUMP ---
jumpBtn.addEventListener("click", () => {
  const selectedDate = jumpDateInput.value;
  if (!selectedDate) return;
  const [year, month, day] = selectedDate.split("-").map(Number);
  currentDate = new Date(year, month - 1, day);
  loadDevotional(currentDate);
});
jumpDateInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") jumpBtn.click();
});

// --- COMPLETE BUTTON ---
completeBtn.addEventListener("click", () => {
  const dateISO = formatDateYYYYMMDD(currentDate);
  localStorage.setItem(dateISO, "completed");
  completeBtn.disabled = true;
  statusEl.textContent = "✅ Completed for this day!";
  sendAnalytics("completed");
});

// --- INITIAL LOAD ---
loadDevotional(currentDate);
