// === CONFIGURATION ===
const { SHEET_ID, SHEET_NAME, ANALYTICS_URL } = window.APP_CONFIG;
const SHEET_URL = `https://opensheet.vercel.app/${SHEET_ID}/${SHEET_NAME}`;

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

function formatDate(date) {
  return date.toISOString().split("T")[0];
}

// --- Simple Device Detection ---
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

// --- Analytics ---
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

// --- Load Devotional ---
function loadDevotional(dateObj) {
  const dateISO = formatDate(dateObj);

  fetch(SHEET_URL)
    .then(res => res.json())
    .then(rows => {
      if (!Array.isArray(rows)) throw new Error("Invalid sheet data");

      // Normalize dates for comparison
      const todayData = rows.find(r => {
        if (!r.date) return false;
        const normalized = new Date(r.date).toISOString().split("T")[0];
        return normalized === dateISO;
      });

      dateEl.textContent = dateObj.toLocaleDateString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric"
      });

      prayersEl.innerHTML = "";

      const progressLabel = document.querySelector(".progress-label");
      const progressFill = document.querySelector(".progress-bar-fill");

      // Reset progress bar
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

// --- Navigation ---
prevBtn.addEventListener("click", () => {
  currentDate.setDate(currentDate.getDate() - 1);
  loadDevotional(currentDate);
});
nextBtn.addEventListener("click", () => {
  currentDate.setDate(currentDate.getDate() + 1);
  loadDevotional(currentDate);
});

// --- Date Picker Jump (mobile-safe) ---
jumpBtn.addEventListener("click", () => {
  const selectedDate = jumpDateInput.value; // "YYYY-MM-DD"
  if (!selectedDate) return;

  const [year, month, day] = selectedDate.split("-").map(Number);
  currentDate = new Date(year, month - 1, day);
  if (isNaN(currentDate)) return;
  loadDevotional(currentDate);
});

// --- Enter key support ---
jumpDateInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") jumpBtn.click();
});

// --- Complete Button ---
completeBtn.addEventListener("click", () => {
  const dateISO = formatDate(currentDate);
  localStorage.setItem(dateISO, "completed");
  completeBtn.disabled = true;
  statusEl.textContent = "✅ Completed for this day!";
  sendAnalytics("completed");
});

// --- Initial Load ---
loadDevotional(currentDate);
