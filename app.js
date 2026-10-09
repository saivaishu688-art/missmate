/**
 * MissMate - Application Controller & Interactive UI
 * Handles event listeners, rendering, filtering, copy actions, and state.
 */

document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const chatInput = document.getElementById("chatInput");
  const lineCountEl = document.getElementById("lineCount");
  const charCountEl = document.getElementById("charCount");
  const btnAnalyze = document.getElementById("btnAnalyze");
  const btnClear = document.getElementById("btnClear");
  const btnDemo = document.getElementById("btnDemo");
  const presetButtons = document.querySelectorAll(".btn-preset");

  // Dashboard & Stats Elements
  const resultsDashboard = document.getElementById("resultsDashboard");
  const statTotalMessages = document.getElementById("statTotalMessages");
  const statUrgent = document.getElementById("statUrgent");
  const statActionItems = document.getElementById("statActionItems");
  const statDeadlines = document.getElementById("statDeadlines");

  // Digest Elements
  const digestMainFocus = document.getElementById("digestMainFocus");
  const digestCriticalNotice = document.getElementById("digestCriticalNotice");
  const digestNextSteps = document.getElementById("digestNextSteps");
  const summaryTimeSaved = document.getElementById("summaryTimeSaved");
  const topicPillsContainer = document.getElementById("topicPillsContainer");
  const participantPillsContainer = document.getElementById("participantPillsContainer");

  // Lists & Counters
  const actionItemsList = document.getElementById("actionItemsList");
  const badgeActionCount = document.getElementById("badgeActionCount");
  const deadlinesList = document.getElementById("deadlinesList");
  const badgeDeadlineCount = document.getElementById("badgeDeadlineCount");
  const messagesList = document.getElementById("messagesList");

  // Copy Buttons
  const btnCopySummary = document.getElementById("btnCopySummary");
  const btnCopyTasks = document.getElementById("btnCopyTasks");

  // Feed Controls
  const filterTabs = document.querySelectorAll(".filter-tab");
  const feedSearch = document.getElementById("feedSearch");
  const toastContainer = document.getElementById("toastContainer");

  // Application State
  let currentAnalysis = null;
  let activeFilter = "all";
  let currentSearchQuery = "";
  let demoIndex = 0;
  const demoKeys = ["cs_project", "fest_committee", "exam_prep"];

  // ==========================================
  // Helper Utilities
  // ==========================================

  function escapeHTML(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color: #10b981;">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      <span>${escapeHTML(message)}</span>
    `;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(40px)";
      toast.style.transition = "all 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  function updateInputStats() {
    const text = chatInput.value;
    const lines = text.trim() ? text.split(/\r?\n/).length : 0;
    const chars = text.length;
    lineCountEl.textContent = `${lines} ${lines === 1 ? 'line' : 'lines'}`;
    charCountEl.textContent = `${chars.toLocaleString()} characters`;
  }

  function getInitials(name) {
    if (!name) return "U";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  // ==========================================
  // Analysis & Render Logic
  // ==========================================

  function runAnalysis() {
    const rawText = chatInput.value.trim();

    if (!rawText) {
      // Auto-load demo if empty to assist beginner users
      loadPreset("cs_project");
      showToast("Loaded sample CS Project chat for demonstration!");
      return;
    }

    // 1. Parse raw text into structured messages
    const messages = ChatAnalyzer.parseMessages(rawText);

    if (messages.length === 0) {
      showToast("No valid messages found. Check format and try again.", "error");
      return;
    }

    // 2. Extract Deadlines
    const deadlines = ChatAnalyzer.extractDeadlines(messages);

    // 3. Extract Action Items
    const actionItems = ChatAnalyzer.extractActionItems(messages);

    // 4. Generate High-Level Summary
    const summary = ChatAnalyzer.generateSummary(messages, deadlines, actionItems);

    currentAnalysis = {
      messages,
      deadlines,
      actionItems,
      summary
    };

    // Render all dashboard sections
    renderDashboard();

    // Reveal dashboard & smooth scroll
    resultsDashboard.style.display = "block";
    resultsDashboard.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderDashboard() {
    if (!currentAnalysis) return;

    const { messages, deadlines, actionItems, summary } = currentAnalysis;

    // 1. Render Top Stats
    statTotalMessages.textContent = summary.stats.totalMessages;
    statUrgent.textContent = summary.stats.urgentCount;
    statActionItems.textContent = summary.stats.actionItemCount;
    statDeadlines.textContent = summary.stats.deadlineCount;
    summaryTimeSaved.textContent = `⏱️ ~${summary.stats.timeSavedMinutes} mins reading saved`;

    // 2. Render 3-Bullet Digest
    digestMainFocus.textContent = summary.digest.primarySubject;
    digestCriticalNotice.textContent = summary.digest.criticalNotice;
    digestNextSteps.textContent = summary.digest.nextStepNotice;

    // 3. Render Topic Pills
    topicPillsContainer.innerHTML = "";
    if (summary.topKeywords.length > 0) {
      summary.topKeywords.forEach(kw => {
        const chip = document.createElement("span");
        chip.className = "topic-chip";
        chip.textContent = `#${kw}`;
        topicPillsContainer.appendChild(chip);
      });
    } else {
      topicPillsContainer.innerHTML = '<span class="topic-chip">General</span>';
    }

    // 4. Render Active Members
    participantPillsContainer.innerHTML = "";
    summary.participants.slice(0, 5).forEach(p => {
      const chip = document.createElement("span");
      chip.className = "participant-chip";
      chip.textContent = `${p.name} (${p.count})`;
      participantPillsContainer.appendChild(chip);
    });

    // 5. Render Action Items
    renderActionItems(actionItems);

    // 6. Render Deadlines
    renderDeadlines(deadlines);

    // 7. Render Messages Feed
    renderMessagesFeed();
  }

  function renderActionItems(actionItems) {
    badgeActionCount.textContent = actionItems.length;
    actionItemsList.innerHTML = "";

    if (actionItems.length === 0) {
      actionItemsList.innerHTML = `
        <div class="empty-state">
          <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <polyline points="9 11 12 14 22 4"></polyline>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
          </svg>
          <p>No direct action items or tasks detected.</p>
        </div>
      `;
      return;
    }

    actionItems.forEach(item => {
      const card = document.createElement("div");
      card.className = `action-item-card ${item.completed ? 'completed' : ''}`;
      card.dataset.itemId = item.id;

      card.innerHTML = `
        <input type="checkbox" class="action-checkbox" ${item.completed ? 'checked' : ''} aria-label="Mark task done">
        <div class="action-content">
          <div class="action-top-row">
            <span class="assignee-tag">${escapeHTML(item.assignee)}</span>
            <span class="msg-time">${escapeHTML(item.timestamp)}</span>
          </div>
          <div class="task-text">${escapeHTML(item.task)}</div>
          <div class="task-context">From ${escapeHTML(item.sender)}: "${escapeHTML(item.fullMessage.slice(0, 80))}${item.fullMessage.length > 80 ? '...' : ''}"</div>
        </div>
      `;

      // Interactive checkbox toggle
      const checkbox = card.querySelector(".action-checkbox");
      checkbox.addEventListener("change", (e) => {
        item.completed = e.target.checked;
        card.classList.toggle("completed", item.completed);
      });

      actionItemsList.appendChild(card);
    });
  }

  function renderDeadlines(deadlines) {
    badgeDeadlineCount.textContent = deadlines.length;
    deadlinesList.innerHTML = "";

    if (deadlines.length === 0) {
      deadlinesList.innerHTML = `
        <div class="empty-state">
          <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <p>No upcoming dates or deadlines detected in this chat.</p>
        </div>
      `;
      return;
    }

    deadlines.forEach(d => {
      const card = document.createElement("div");
      card.className = `deadline-card ${d.isUrgent ? 'urgent-deadline' : ''}`;

      card.innerHTML = `
        <div class="deadline-icon-box">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        </div>
        <div class="deadline-details">
          <div class="deadline-time-tag">
            <span>${escapeHTML(d.timePhrase)}</span>
            <span class="deadline-type-pill">${escapeHTML(d.type)}</span>
          </div>
          <p class="deadline-quote">"${escapeHTML(d.fullMessage)}"</p>
          <div class="deadline-sender">Mentioned by <strong>${escapeHTML(d.sender)}</strong> • ${escapeHTML(d.timestamp)}</div>
        </div>
      `;

      deadlinesList.appendChild(card);
    });
  }

  function renderMessagesFeed() {
    if (!currentAnalysis) return;

    messagesList.innerHTML = "";
    const msgs = currentAnalysis.summary.prioritizedMessages;

    // Filter by Tab and Search
    const filtered = msgs.filter(m => {
      const matchesFilter = (activeFilter === "all") || (m.priority.level === activeFilter);
      const matchesSearch = !currentSearchQuery || 
        m.text.toLowerCase().includes(currentSearchQuery) ||
        m.sender.toLowerCase().includes(currentSearchQuery);
      return matchesFilter && matchesSearch;
    });

    if (filtered.length === 0) {
      messagesList.innerHTML = `
        <div class="empty-state">
          <p>No messages match the current filter or search criteria.</p>
        </div>
      `;
      return;
    }

    filtered.forEach(m => {
      const card = document.createElement("div");
      card.className = `msg-card ${m.priority.level}`;

      const tagsHtml = m.priority.tags.map(t => `<span class="badge ${m.priority.badgeClass}">${escapeHTML(t)}</span>`).join("");

      card.innerHTML = `
        <div class="msg-header-row">
          <div class="sender-identity">
            <div class="sender-avatar">${getInitials(m.sender)}</div>
            <span class="sender-name">${escapeHTML(m.sender)}</span>
            <span class="msg-time">${escapeHTML(m.rawTimestamp)}</span>
          </div>
          <div class="msg-badges">
            <span class="badge ${m.priority.badgeClass}">${m.priority.badgeLabel}</span>
            ${tagsHtml}
          </div>
        </div>
        <div class="msg-text-content">${escapeHTML(m.text)}</div>
      `;

      messagesList.appendChild(card);
    });
  }

  // ==========================================
  // Presets & Demo Loader
  // ==========================================

  function loadPreset(presetKey) {
    const preset = SAMPLE_PRESETS[presetKey];
    if (preset) {
      chatInput.value = preset.text;
      updateInputStats();
      runAnalysis();
      showToast(`Loaded "${preset.title}"`);
    }
  }

  // ==========================================
  // Event Handlers
  // ==========================================

  // Live char & line counts
  chatInput.addEventListener("input", updateInputStats);

  // Analyze Button
  btnAnalyze.addEventListener("click", runAnalysis);

  // Clear Button
  btnClear.addEventListener("click", () => {
    chatInput.value = "";
    updateInputStats();
    resultsDashboard.style.display = "none";
    currentAnalysis = null;
    showToast("Everything cleared.");
    chatInput.focus();
  });

  // Demo Cycle Button
  btnDemo.addEventListener("click", () => {
    const key = demoKeys[demoIndex % demoKeys.length];
    demoIndex++;
    loadPreset(key);
  });

  // Preset quick buttons
  presetButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const presetKey = btn.dataset.preset;
      loadPreset(presetKey);
    });
  });

  // Filter Tabs
  filterTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      filterTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      activeFilter = tab.dataset.filter;
      renderMessagesFeed();
    });
  });

  // Search in feed
  feedSearch.addEventListener("input", (e) => {
    currentSearchQuery = e.target.value.trim().toLowerCase();
    renderMessagesFeed();
  });

  // Copy Executive Summary
  btnCopySummary.addEventListener("click", () => {
    if (!currentAnalysis) return;
    const { summary } = currentAnalysis;
    const textToCopy = `📌 MissMate Catch-Up Summary\n` +
      `----------------------------------------\n` +
      `1. Main Focus: ${summary.digest.primarySubject}\n` +
      `2. Critical Alert: ${summary.digest.criticalNotice}\n` +
      `3. Next Steps: ${summary.digest.nextStepNotice}\n` +
      `----------------------------------------\n` +
      `Messages: ${summary.stats.totalMessages} | Action Items: ${summary.stats.actionItemCount} | Deadlines: ${summary.stats.deadlineCount}`;

    navigator.clipboard.writeText(textToCopy)
      .then(() => showToast("Executive summary copied to clipboard!"))
      .catch(() => showToast("Failed to copy to clipboard", "error"));
  });

  // Copy Action Items Checklist
  btnCopyTasks.addEventListener("click", () => {
    if (!currentAnalysis || currentAnalysis.actionItems.length === 0) {
      showToast("No action items to copy.");
      return;
    }

    const tasksText = currentAnalysis.actionItems.map(item => {
      const statusMark = item.completed ? "[x]" : "[ ]";
      return `- ${statusMark} ${item.task} (Assigned: ${item.assignee})`;
    }).join("\n");

    const header = `✅ MissMate Action Items Checklist:\n` + tasksText;

    navigator.clipboard.writeText(header)
      .then(() => showToast("Action items copied as markdown checklist!"))
      .catch(() => showToast("Failed to copy to clipboard", "error"));
  });

  // Update initial line & char counts
  updateInputStats();
});
