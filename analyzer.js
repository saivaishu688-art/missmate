/**
 * MissMate - Core Rule-Based Chat Analyzer
 * 100% Client-Side, Zero External API dependencies, Pure JavaScript.
 */

const ChatAnalyzer = {
  /**
   * Parse raw text into structured message objects.
   * Handles WhatsApp, Discord, Slack, Telegram, and standard "Name: text" formats.
   */
  parseMessages(rawText) {
    if (!rawText || !rawText.trim()) return [];

    const lines = rawText.split(/\r?\n/);
    const messages = [];
    let currentMsg = null;

    // Pattern 1: [10/10/24, 2:15 PM] Alex Rivera: text or [10/10/24, 14:15:00] Alex: text
    const patternBracket = /^\[?(\d{1,2}[./-]\d{1,2}[./-]\d{2,4}(?:,\s*|\s+)\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?)\]?\s*(?:-\s*)?([^:]+):\s*(.*)$/;
    
    // Pattern 2: 10/11/24, 10:00 AM - Ananya Rao: text (WhatsApp standard export without brackets)
    const patternStandard = /^(\d{1,2}[./-]\d{1,2}[./-]\d{2,4}(?:,\s*|\s+)\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?)\s*-\s*([^:]+):\s*(.*)$/;

    // Pattern 3: Alex Rivera [2:15 PM]: text
    const patternDiscord = /^([^:\[\]]+?)\s*\[(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?)\]:\s*(.*)$/;

    // Pattern 4: Simple Name: text
    const patternSimple = /^([A-Z][a-zA-Z0-9_\s]{1,30}):\s*(.*)$/;

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      let match = trimmed.match(patternBracket);
      if (match) {
        if (currentMsg) messages.push(currentMsg);
        currentMsg = {
          id: messages.length + 1,
          rawTimestamp: match[1].trim(),
          sender: match[2].trim(),
          text: match[3].trim(),
          lineNum: index + 1
        };
        return;
      }

      match = trimmed.match(patternStandard);
      if (match) {
        if (currentMsg) messages.push(currentMsg);
        currentMsg = {
          id: messages.length + 1,
          rawTimestamp: match[1].trim(),
          sender: match[2].trim(),
          text: match[3].trim(),
          lineNum: index + 1
        };
        return;
      }

      match = trimmed.match(patternDiscord);
      if (match) {
        if (currentMsg) messages.push(currentMsg);
        currentMsg = {
          id: messages.length + 1,
          rawTimestamp: match[2].trim(),
          sender: match[1].trim(),
          text: match[3].trim(),
          lineNum: index + 1
        };
        return;
      }

      match = trimmed.match(patternSimple);
      if (match && !trimmed.toLowerCase().startsWith("http")) {
        if (currentMsg) messages.push(currentMsg);
        currentMsg = {
          id: messages.length + 1,
          rawTimestamp: "No timestamp",
          sender: match[1].trim(),
          text: match[2].trim(),
          lineNum: index + 1
        };
        return;
      }

      // If it's a continuation line of previous message
      if (currentMsg) {
        currentMsg.text += " " + trimmed;
      } else {
        // Fallback: standalone line without sender
        currentMsg = {
          id: messages.length + 1,
          rawTimestamp: "No timestamp",
          sender: "Note / Announcement",
          text: trimmed,
          lineNum: index + 1
        };
      }
    });

    if (currentMsg) {
      messages.push(currentMsg);
    }

    return messages;
  },

  /**
   * Determine priority level and reasons for each message.
   * Levels: 'urgent' | 'important' | 'general'
   */
  classifyPriority(message) {
    const text = message.text;
    const lower = text.toLowerCase();

    const urgentKeywords = [
      "urgent", "asap", "mandatory", "emergency", "critical",
      "deadline moved", "rescheduled", "cancelled", "canceled",
      "important notice", "attention", "last chance", "due today",
      "due tonight", "exam", "viva", "test tomorrow", "penalty"
    ];

    const importantKeywords = [
      "deadline", "due", "submit", "submission", "assignment",
      "meeting", "sync", "meet at", "presentation", "review",
      "rubric", "syllabus", "attendance", "invoice", "payment",
      "deposit", "volunteer", "schedule", "register", "fill out",
      "google meet", "zoom", "hall", "room", "venue"
    ];

    const lowKeywords = [
      "lol", "haha", "lmao", "ok", "okay", "roger", "cool", "np",
      "no problem", "thanks", "thank you", "nice", "sounds good",
      "see ya", "gg", "got it", "yep", "yeah", "k"
    ];

    let score = 0;
    const tags = [];

    // Check urgent triggers
    for (const kw of urgentKeywords) {
      if (lower.includes(kw)) {
        score += 5;
        tags.push(kw.toUpperCase());
      }
    }

    // Check all-caps words (e.g. URGENT, ATTENDANCE IS MANDATORY)
    const upperMatches = text.match(/\b[A-Z]{4,}\b/g);
    if (upperMatches) {
      const meaningfulCaps = upperMatches.filter(w => !["HTTP", "HTTPS", "HTML", "REST", "JSON", "IEEE"].includes(w));
      if (meaningfulCaps.length > 0) {
        score += 3;
        tags.push("CAPS ALERT");
      }
    }

    // Check multiple exclamation marks
    if (/!{2,}/.test(text)) {
      score += 2;
    }

    // Check important triggers
    for (const kw of importantKeywords) {
      if (lower.includes(kw)) {
        score += 2;
        if (!tags.includes(kw)) tags.push(kw);
      }
    }

    // Check @mentions
    if (/@\w+/.test(text)) {
      score += 2;
      tags.push("Direct Mention");
    }

    // Penalty for trivial chatter
    if (text.length < 25) {
      for (const kw of lowKeywords) {
        if (lower === kw || lower.startsWith(kw + " ") || lower.endsWith(" " + kw)) {
          score -= 4;
        }
      }
    }

    let level = "general";
    let badgeClass = "badge-general";
    let badgeLabel = "General Chat";

    if (score >= 4 || tags.some(t => ["URGENT", "MANDATORY", "CRITICAL", "EXAM", "CAPS ALERT"].includes(t))) {
      level = "urgent";
      badgeClass = "badge-urgent";
      badgeLabel = "🚨 High Priority";
    } else if (score >= 2 || tags.length > 0) {
      level = "important";
      badgeClass = "badge-important";
      badgeLabel = "📌 Actionable / Notice";
    }

    return {
      level,
      score,
      badgeClass,
      badgeLabel,
      tags: [...new Set(tags)].slice(0, 3)
    };
  },

  /**
   * Extract dates, times, and deadlines with contextual keywords.
   */
  extractDeadlines(messages) {
    const deadlines = [];

    // Date/Time matching regexes
    const timeRegex = /(?:\b(?:at|by|before|around)\s+)?\b(?:1[0-2]|0?[1-9])(?::[0-5][0-9])?\s*(?:[AaPp][Mm]|noon|midnight)\b/i;
    const dayRegex = /\b(?:this\s+|next\s+)?(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|tonight|tomorrow(?:\s+morning|\s+afternoon|\s+evening|\s+night)?|today)\b/i;
    const dateRegex = /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*,\s*\d{4})?\b|\b\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\b|\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/i;

    const triggerWords = [
      "deadline", "due", "submit", "submission", "turn in", "rescheduled to",
      "scheduled for", "meeting", "meet at", "call", "sync", "session",
      "before", "by", "until", "last date", "ends at"
    ];

    messages.forEach(msg => {
      const text = msg.text;
      const lower = text.toLowerCase();

      // Check if message contains temporal or deadline signals
      const hasTrigger = triggerWords.some(w => lower.includes(w));
      const hasTime = timeRegex.test(text);
      const hasDay = dayRegex.test(text);
      const hasDate = dateRegex.test(text);

      if ((hasTrigger && (hasTime || hasDay || hasDate)) || (hasDay && hasTime) || (hasDate && hasTime)) {
        // Extract time snippet
        const timeMatch = text.match(timeRegex);
        const dayMatch = text.match(dayRegex);
        const dateMatch = text.match(dateRegex);

        const temporalParts = [];
        if (dayMatch) temporalParts.push(dayMatch[0].trim());
        if (dateMatch) temporalParts.push(dateMatch[0].trim());
        if (timeMatch) temporalParts.push(timeMatch[0].trim());

        const temporalPhrase = temporalParts.join(" ") || "Specific date mentioned";

        // Determine category
        let type = "Schedule / Event";
        let icon = "calendar";
        if (lower.includes("submit") || lower.includes("due") || lower.includes("deadline") || lower.includes("turn in")) {
          type = "Submission Deadline";
          icon = "clock-alert";
        } else if (lower.includes("meet") || lower.includes("call") || lower.includes("sync") || lower.includes("zoom")) {
          type = "Meeting / Call";
          icon = "video";
        } else if (lower.includes("exam") || lower.includes("test") || lower.includes("quiz") || lower.includes("viva")) {
          type = "Exam / Academic";
          icon = "graduation-cap";
        }

        // Relative urgency
        const isUrgent = lower.includes("urgent") || lower.includes("today") || lower.includes("tonight") || lower.includes("tomorrow") || lower.includes("asap");

        deadlines.push({
          id: deadlines.length + 1,
          timePhrase: temporalPhrase,
          type,
          icon,
          isUrgent,
          sender: msg.sender,
          fullMessage: text,
          timestamp: msg.rawTimestamp,
          messageId: msg.id
        });
      }
    });

    return deadlines;
  },

  /**
   * Extract Action Items & Delegated Tasks.
   */
  extractActionItems(messages) {
    const actionItems = [];

    // Patterns for actionable sentences
    const actionPatterns = [
      // Pattern 1: @Someone please / can you / finish / submit
      {
        regex: /@([a-zA-Z0-9_]+)\s+(?:can you|please|could you|make sure to|remember to)\s+([^.!?]+)/i,
        handler: (match, msg) => ({
          assignee: `@${match[1]}`,
          task: match[2].trim(),
          source: msg
        })
      },
      // Pattern 2: @Someone finish / submit / send / review
      {
        regex: /@([a-zA-Z0-9_]+)\s+(?:finish|submit|send|review|complete|push|upload|prepare|bring|order|email|call)\s+([^.!?]+)/i,
        handler: (match, msg) => ({
          assignee: `@${match[1]}`,
          task: `${match[0].replace(/@\w+\s+/, "").trim()}`,
          source: msg
        })
      },
      // Pattern 3: "I will do / take care of / finish / submit"
      {
        regex: /\bI\s+(?:will|'ll)\s+(?:take care of|finish|complete|write|create|prepare|push|submit|upload|scan|email|call|visit|do|handle)\s+([^.!?]+)/i,
        handler: (match, msg) => ({
          assignee: msg.sender,
          task: `I will ${match[0].replace(/\bI\s+(?:will|'ll)\s+/i, "").trim()}`,
          source: msg
        })
      },
      // Pattern 4: "Everyone must / You must / Attendance is mandatory / Remember to / Don't forget to / Make sure to"
      {
        regex: /\b(?:everyone must|all members must|you must|make sure to|don't forget to|remember to|please remember to)\s+([^.!?]+)/i,
        handler: (match, msg) => ({
          assignee: "Everyone / All Members",
          task: match[1].trim(),
          source: msg
        })
      },
      // Pattern 5: "Can someone please / Who can"
      {
        regex: /\b(?:can someone|could someone|who can)\s+(?:please\s+)?([^.!?]+)/i,
        handler: (match, msg) => ({
          assignee: "Needs Volunteer",
          task: match[1].trim(),
          source: msg
        })
      }
    ];

    messages.forEach(msg => {
      const text = msg.text;

      actionPatterns.forEach(rule => {
        const match = text.match(rule.regex);
        if (match) {
          const item = rule.handler(match, msg);

          // Clean up task text
          let cleanTask = item.task
            .replace(/^(please|to)\s+/i, "")
            .trim();
          
          // Capitalize first letter
          if (cleanTask.length > 0) {
            cleanTask = cleanTask.charAt(0).toUpperCase() + cleanTask.slice(1);
          }

          // Avoid duplicate task in the same message
          const exists = actionItems.some(a => a.messageId === msg.id && a.task.toLowerCase().slice(0, 20) === cleanTask.toLowerCase().slice(0, 20));
          if (!exists && cleanTask.length > 5) {
            actionItems.push({
              id: actionItems.length + 1,
              assignee: item.assignee,
              task: cleanTask,
              sender: msg.sender,
              fullMessage: msg.text,
              timestamp: msg.rawTimestamp,
              messageId: msg.id,
              completed: false
            });
          }
        }
      });
    });

    return actionItems;
  },

  /**
   * Generate an executive high-level summary of the group conversation.
   * Completely grounded in the parsed messages, strictly rule-based without hallucinations.
   */
  generateSummary(messages, deadlines, actionItems) {
    if (messages.length === 0) {
      return null;
    }

    // 1. Participant statistics
    const participantCounts = {};
    messages.forEach(m => {
      participantCounts[m.sender] = (participantCounts[m.sender] || 0) + 1;
    });

    const sortedParticipants = Object.entries(participantCounts)
      .sort((a, b) => b[1] - a[1]);
    const topContributor = sortedParticipants[0] ? sortedParticipants[0][0] : "None";
    const totalParticipants = Object.keys(participantCounts).length;

    // 2. High priority & urgent messages count
    const prioritized = messages.map(m => ({
      ...m,
      priority: this.classifyPriority(m)
    }));

    const urgentList = prioritized.filter(m => m.priority.level === "urgent");
    const importantList = prioritized.filter(m => m.priority.level === "important");

    // 3. Time span estimation
    let timeRange = "Single session";
    const validTimestamps = messages.filter(m => m.rawTimestamp !== "No timestamp");
    if (validTimestamps.length > 1) {
      timeRange = `${validTimestamps[0].rawTimestamp} → ${validTimestamps[validTimestamps.length - 1].rawTimestamp}`;
    }

    // 4. Topic keyword extraction
    const stopWords = new Set([
      "the", "and", "a", "an", "to", "for", "in", "on", "of", "with", "at",
      "by", "this", "that", "it", "is", "are", "was", "were", "we", "you",
      "i", "my", "our", "your", "can", "will", "what", "how", "all", "so",
      "have", "has", "do", "did", "from", "hey", "guys", "team", "yeah", "yes",
      "no", "not", "but", "also", "just", "about", "like", "let's", "lets"
    ]);

    const wordCounts = {};
    messages.forEach(m => {
      const words = m.text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/);
      words.forEach(w => {
        if (w.length > 3 && !stopWords.has(w)) {
          wordCounts[w] = (wordCounts[w] || 0) + 1;
        }
      });
    });

    const topKeywords = Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(entry => entry[0]);

    // 5. Build 3-bullet Catch-Up Digest
    // Bullet 1: Primary Chat Objective / Activity
    let primarySubject = "General discussion and updates";
    if (deadlines.some(d => d.type === "Submission Deadline")) {
      primarySubject = "Urgent project submission and upcoming assignment deadlines";
    } else if (deadlines.some(d => d.type === "Exam / Academic")) {
      primarySubject = "Upcoming exam schedule, syllabus revisions, and study sessions";
    } else if (deadlines.some(d => d.type === "Meeting / Call")) {
      primarySubject = "Meeting coordination, schedule planning, and logistics";
    } else if (actionItems.length > 2) {
      primarySubject = "Task delegation and responsibilities across group members";
    }

    // Bullet 2: Critical alerts or earliest deadlines
    let criticalNotice = "No critical alerts or sudden deadline shifts detected.";
    if (urgentList.length > 0) {
      const topUrgent = urgentList[0];
      criticalNotice = `${topUrgent.sender}: "${topUrgent.text.slice(0, 110)}${topUrgent.text.length > 110 ? '...' : ''}"`;
    } else if (deadlines.length > 0) {
      const topDeadline = deadlines[0];
      criticalNotice = `Key date: ${topDeadline.timePhrase} (${topDeadline.type}) - mentioned by ${topDeadline.sender}`;
    }

    // Bullet 3: Key Decisions & Next steps
    let nextStepNotice = "Team members are in agreement; no pending assignments outstanding.";
    if (actionItems.length > 0) {
      const summaryTasks = actionItems.slice(0, 2).map(a => `${a.assignee}: ${a.task.slice(0, 45)}...`).join(" | ");
      nextStepNotice = `${actionItems.length} active action items logged (${summaryTasks})`;
    } else if (deadlines.length > 0) {
      nextStepNotice = `Upcoming milestone scheduled for ${deadlines[0].timePhrase}.`;
    }

    // Read time saved estimation (~180 words per minute average reading speed)
    const totalWords = messages.reduce((acc, m) => acc + m.text.split(/\s+/).length, 0);
    const timeSavedMinutes = Math.max(1, Math.ceil(totalWords / 150));

    return {
      stats: {
        totalMessages: messages.length,
        totalParticipants,
        urgentCount: urgentList.length,
        actionItemCount: actionItems.length,
        deadlineCount: deadlines.length,
        topContributor,
        timeRange,
        timeSavedMinutes
      },
      topKeywords,
      participants: sortedParticipants.map(([name, count]) => ({
        name,
        count,
        percent: Math.round((count / messages.length) * 100)
      })),
      digest: {
        primarySubject,
        criticalNotice,
        nextStepNotice
      },
      prioritizedMessages: prioritized
    };
  }
};
