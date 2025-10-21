// === CONFIGURATION ===
const SHEET_ID = "1dC6pjjA_fW_1ZzAQjGX04WSa1c7aryG8leR4U1aB76o";  // <-- replace this
const SHEET_NAME = "Devotionals";         // sheet/tab name
const SHEET_URL = `https://opensheet.vercel.app/${SHEET_ID}/${SHEET_NAME}`;
const ANALYTICS_URL = "https://script.google.com/macros/s/AKfycbw3oKElpBiZ3fMkY9EJL3wd6LpmsOO1bCvTUDCRbg8EZIm0loXs_oX5uaLj4Cz1sXUo/exec"; // replace

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

// === DATE STATE ===
let currentDate = new Date();
function formatDate(date) {
  return date.toISOString().split("T")[0];
}

// === SIMPLIFIED DEVICE DETECTION ===
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

// === ANALYTICS FUNCTION ===
function sendAnalytics(actionType) {
  const devotionalDate = formatDate(currentDate);
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

// === LOAD DEVOTIONAL ===
function loadDevotional(dateObj) {
  const dateISO = formatDate(dateObj);

  fetch(SHEET_URL)
    .then(res => res.json())
    .then(rows => {
      if (!Array.isArray(rows)) throw new Error("Invalid sheet data");

      const todayData = rows.find(r => r.date === dateISO);

      dateEl.textContent = dateObj.toLocaleDateString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric"
      });

      prayersEl.innerHTML = "";

      const progressLabel = document.querySelector(".progress-label");
      const progressFill = document.querySelector(".progress-bar-fill");

      // Reset progress bar
      progressLabel.textContent = "Progress: 0%";
      progressFill.style.width = "0%";

      if (!todayData) {
        titleEl.textContent = "No devotional found for this date.";
        scripturesEl.textContent = "";
        messageEl.textContent = "";
        prayersEl.innerHTML = "";
        completeBtn.disabled = true;
        statusEl.textContent = "";
        return;
      }

      titleEl.textContent = todayData.title;
      scripturesEl.textContent = "📖 " + todayData.scriptures;
      messageEl.textContent = todayData.message;

      // Standard daily plan
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

      // Load saved progress from localStorage
      const savedProgress = JSON.parse(localStorage.getItem(`${dateISO}-plan`) || "{}");

      // Helper function: update progress
      function updateProgress() {
        const total = standardPlan.filter(i => i.minutes).length;
        const completed = Object.values(savedProgress).filter(Boolean).length;
        const percent = Math.round((completed / total) * 100);
        progressLabel.textContent = `Progress: ${percent}%`;
        progressFill.style.width = `${percent}%`;
      }

      // Build checklist
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

      // Initialize progress bar
      updateProgress();

      // Completion status
      if (localStorage.getItem(dateISO) === "completed") {
        completeBtn.disabled = true;
        statusEl.textContent = "✅ Completed for this day!";
      } else {
        completeBtn.disabled = false;
        statusEl.textContent = "";
      }

      // Send view analytics
      sendAnalytics("viewed");
    })
    .catch(err => {
      console.error("Error loading data:", err);
      titleEl.textContent = "Could not load daily devotional data.";
    });
}


// === NAVIGATION ===
prevBtn.addEventListener("click", () => {
  currentDate.setDate(currentDate.getDate() - 1);
  loadDevotional(currentDate);
});
nextBtn.addEventListener("click", () => {
  currentDate.setDate(currentDate.getDate() + 1);
  loadDevotional(currentDate);
});

// === JUMP TO DATE ===
jumpBtn.addEventListener("click", () => {
  const selectedDate = jumpDateInput.value;
  if (!selectedDate) return;
  currentDate = new Date(selectedDate);
  loadDevotional(currentDate);
});

// === COMPLETE BUTTON ===
completeBtn.addEventListener("click", () => {
  const dateISO = formatDate(currentDate);
  localStorage.setItem(dateISO, "completed");
  completeBtn.disabled = true;
  statusEl.textContent = "✅ Completed for this day!";
  sendAnalytics("completed");
});

// === INITIAL LOAD ===
loadDevotional(currentDate);
