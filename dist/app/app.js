(() => {
  "use strict";

  const RATINGS = [
    { value: 100, label: "Strongly agree", short: "Strongly agree", icon: "▲" },
    { value: 75, label: "Agree", short: "Agree", icon: "+" },
    { value: 50, label: "Don't care / Unsure", short: "Unsure", icon: "−" },
    { value: 25, label: "Disagree", short: "Disagree", icon: "−" },
    { value: 0, label: "Strongly disagree", short: "Strongly disagree", icon: "▼" }
  ];

  const STATUS_LABELS = {
    confirmed2026: "Confirmed 2026 policy",
    standingCurrent: "Standing/current policy"
  };

  const PARTY_COLOURS = {
    National: "#21578c",
    Labour: "#b32e29",
    ACT: "#c49517",
    "Green Party": "#34734a",
    "New Zealand First": "#393b3f",
    "Te Pāti Māori": "#7d2926",
    "Opportunity Party": "#337a7d"
  };

  const state = {
    dataset: null,
    policies: [],
    responses: {},
    selectedPolicyID: null,
    query: "",
    filters: { parties: new Set(), topics: new Set(), statuses: new Set(), unansweredOnly: false },
    activeView: "policies"
  };

  const el = id => document.getElementById(id);
  const escapeHTML = value => String(value ?? "").replace(/[&<>'"]/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[character]);

  const store = {
    db: null,
    fallbackKey: "policy-match-web-responses-v1",
    async open() {
      if (!("indexedDB" in window)) return;
      this.db = await new Promise((resolve, reject) => {
        const request = indexedDB.open("PolicyMatch", 1);
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains("appState")) {
            request.result.createObjectStore("appState");
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    },
    async load() {
      try {
        await this.open();
        if (!this.db) throw new Error("IndexedDB unavailable");
        return await new Promise((resolve, reject) => {
          const request = this.db.transaction("appState").objectStore("appState").get("responses");
          request.onsuccess = () => resolve(request.result || {});
          request.onerror = () => reject(request.error);
        });
      } catch (_) {
        try { return JSON.parse(localStorage.getItem(this.fallbackKey) || "{}"); } catch (_) { return {}; }
      }
    },
    async save(responses) {
      try {
        if (!this.db) await this.open();
        if (!this.db) throw new Error("IndexedDB unavailable");
        await new Promise((resolve, reject) => {
          const request = this.db.transaction("appState", "readwrite").objectStore("appState").put(responses, "responses");
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      } catch (_) {
        localStorage.setItem(this.fallbackKey, JSON.stringify(responses));
      }
    }
  };

  function responseFor(policyID) {
    return state.responses[policyID] || null;
  }

  function ratingFor(policyID) {
    const rating = responseFor(policyID)?.rating;
    return Number.isFinite(rating) ? rating : null;
  }

  function activePolicies() {
    return state.policies.filter(policy => policy.lifecycleStatus === "active");
  }

  function ratedCount() {
    return activePolicies().filter(policy => ratingFor(policy.id) !== null).length;
  }

  function partyColour(party) {
    return PARTY_COLOURS[party] || "#566166";
  }

  function filteredPolicies() {
    const query = state.query.trim().toLocaleLowerCase("en-NZ");
    const { parties, topics, statuses, unansweredOnly } = state.filters;
    return activePolicies().filter(policy => {
      if (parties.size && !parties.has(policy.party)) return false;
      if (topics.size && !topics.has(policy.topic)) return false;
      if (statuses.size && !statuses.has(policy.policyStatus)) return false;
      if (unansweredOnly && ratingFor(policy.id) !== null) return false;
      if (query && !`${policy.title} ${policy.summary}`.toLocaleLowerCase("en-NZ").includes(query)) return false;
      return true;
    });
  }

  function renderRatingControl(policyID, detail = false) {
    const selected = ratingFor(policyID);
    const buttons = RATINGS.map(rating => `
      <button type="button" class="rating-button${selected === rating.value ? " is-selected" : ""}" data-rate="${rating.value}"
        aria-label="${escapeHTML(rating.label)}" aria-pressed="${selected === rating.value}">
        <span aria-hidden="true">${rating.icon}</span>${escapeHTML(rating.short)}
      </button>`).join("");
    return `<div class="rating-control${detail ? " detail-rating" : ""}" data-policy-id="${escapeHTML(policyID)}">
      <div class="rating-options" role="group" aria-label="Your view">${buttons}</div>
      ${selected !== null ? '<button type="button" class="clear-response">Clear response</button>' : ""}
    </div>`;
  }

  function policyCard(policy) {
    return `<article class="policy-card${state.selectedPolicyID === policy.id ? " is-selected" : ""}" style="--party:${partyColour(policy.party)}" data-card-id="${escapeHTML(policy.id)}">
      <div class="policy-card-top">
        <span class="party-mark">${escapeHTML(policy.party)}</span>
        <span class="topic">${escapeHTML(policy.topic)}</span>
      </div>
      <button type="button" class="policy-open" data-open-policy="${escapeHTML(policy.id)}" aria-label="Open ${escapeHTML(policy.title)}">
        <h2>${escapeHTML(policy.title)}</h2>
        <p>${escapeHTML(policy.summary)}</p>
      </button>
      ${renderRatingControl(policy.id)}
    </article>`;
  }

  function renderList() {
    const policies = filteredPolicies();
    el("policy-list").innerHTML = policies.map(policyCard).join("");
    el("policy-list").hidden = policies.length === 0;
    el("empty-state").hidden = policies.length !== 0;
    el("list-summary").textContent = `${policies.length} ${policies.length === 1 ? "policy" : "policies"} shown`;

    el("policy-list").querySelectorAll("[data-open-policy]").forEach(button => {
      button.addEventListener("click", () => selectPolicy(button.dataset.openPolicy));
    });
    bindRatingControls(el("policy-list"));
    updateProgress();
  }

  function policyDetailMarkup(policy) {
    const response = responseFor(policy.id);
    return `<div class="policy-detail-content" style="--party:${partyColour(policy.party)}">
      <header class="detail-head">
        <div class="detail-head-row">
          <span class="party-mark">${escapeHTML(policy.party)}</span>
          <span class="topic">${escapeHTML(policy.topic)}</span>
        </div>
        <h2>${escapeHTML(policy.title)}</h2>
        <span class="status-label">${escapeHTML(STATUS_LABELS[policy.policyStatus] || policy.policyStatus)}</span>
      </header>
      <section class="detail-section">
        <h3>Policy summary</h3>
        <p>${escapeHTML(policy.summary)}</p>
        <a class="source-link" href="${escapeHTML(policy.sourceURL)}" target="_blank" rel="noopener noreferrer">Open original source <span aria-hidden="true">↗</span></a>
      </section>
      <section class="detail-section">
        <h3>Your view</h3>
        <p>Unanswered policies are excluded from party percentages.</p>
        ${renderRatingControl(policy.id, true)}
      </section>
      <section class="detail-section">
        <label for="notes-${escapeHTML(policy.id)}"><h3>Your notes</h3></label>
        <textarea class="detail-notes" id="notes-${escapeHTML(policy.id)}" data-notes-for="${escapeHTML(policy.id)}" placeholder="Add a private note…">${escapeHTML(response?.notes || "")}</textarea>
      </section>
      <section class="detail-section">
        <dl class="detail-meta"><dt>Announced or verified</dt><dd>${escapeHTML(formatDate(policy.dateAnnouncedOrVerified))}</dd></dl>
        <p class="method-note">The source link, wording, date and status come from the approved policy dataset.</p>
      </section>
    </div>`;
  }

  function selectPolicy(policyID) {
    const policy = state.policies.find(item => item.id === policyID);
    if (!policy) return;
    state.selectedPolicyID = policyID;
    if (window.matchMedia("(max-width: 840px)").matches) {
      el("mobile-policy-detail").innerHTML = policyDetailMarkup(policy);
      bindDetail(el("mobile-policy-detail"));
      el("mobile-detail-dialog").showModal();
    } else {
      el("detail-placeholder").hidden = true;
      el("policy-detail").hidden = false;
      el("policy-detail").innerHTML = policyDetailMarkup(policy);
      bindDetail(el("policy-detail"));
    }
    document.querySelectorAll(".policy-card").forEach(card => card.classList.toggle("is-selected", card.dataset.cardId === policyID));
  }

  function bindRatingControls(container) {
    container.querySelectorAll(".rating-control").forEach(control => {
      const policyID = control.dataset.policyId;
      control.querySelectorAll("[data-rate]").forEach(button => {
        button.addEventListener("click", () => setRating(policyID, Number(button.dataset.rate)));
      });
      control.querySelector(".clear-response")?.addEventListener("click", () => setRating(policyID, null));
    });
  }

  function bindDetail(container) {
    bindRatingControls(container);
    container.querySelector("[data-notes-for]")?.addEventListener("input", event => {
      setNotes(event.target.dataset.notesFor, event.target.value);
    });
  }

  async function setRating(policyID, rating) {
    const existing = responseFor(policyID) || { notes: "" };
    if (rating === null && !existing.notes?.trim()) {
      delete state.responses[policyID];
    } else {
      state.responses[policyID] = { ...existing, rating, updatedAt: new Date().toISOString() };
    }
    await persist("Response saved");
    renderList();
    if (state.selectedPolicyID) refreshSelectedDetail();
    renderScores();
    updateAbout();
  }

  let notesSaveTimer;
  function setNotes(policyID, notes) {
    const existing = responseFor(policyID) || { rating: null };
    if (!notes.trim() && existing.rating === null) {
      delete state.responses[policyID];
    } else {
      state.responses[policyID] = { ...existing, notes, updatedAt: new Date().toISOString() };
    }
    clearTimeout(notesSaveTimer);
    notesSaveTimer = setTimeout(async () => {
      await persist("Note saved", false);
      updateProgress();
      updateAbout();
    }, 300);
  }

  async function persist(message, announce = true) {
    try {
      await store.save(state.responses);
      if (announce) showToast(message);
    } catch (_) {
      showToast("Your response could not be saved");
    }
  }

  function refreshSelectedDetail() {
    const policy = state.policies.find(item => item.id === state.selectedPolicyID);
    if (!policy) return;
    if (el("mobile-detail-dialog").open) {
      el("mobile-policy-detail").innerHTML = policyDetailMarkup(policy);
      bindDetail(el("mobile-policy-detail"));
    } else {
      el("policy-detail").innerHTML = policyDetailMarkup(policy);
      bindDetail(el("policy-detail"));
    }
  }

  function scoreParties() {
    const groups = new Map();
    activePolicies().forEach(policy => {
      if (!groups.has(policy.party)) groups.set(policy.party, []);
      groups.get(policy.party).push(policy);
    });
    return [...groups.entries()].map(([party, policies]) => {
      const ratings = policies.map(policy => ratingFor(policy.id)).filter(value => value !== null);
      const breakdown = Object.fromEntries(RATINGS.map(rating => [rating.value, ratings.filter(value => value === rating.value).length]));
      return {
        party,
        ratedCount: ratings.length,
        listedCount: policies.length,
        percentage: ratings.length ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length : null,
        breakdown
      };
    }).sort((a, b) => {
      if (a.percentage === null && b.percentage !== null) return 1;
      if (a.percentage !== null && b.percentage === null) return -1;
      if (a.percentage !== b.percentage) return (b.percentage ?? 0) - (a.percentage ?? 0);
      return a.party.localeCompare(b.party, "en-NZ");
    });
  }

  function renderScores() {
    if (!state.dataset) return;
    const count = ratedCount();
    const total = activePolicies().length;
    el("match-total").textContent = `${count} of ${total} policies rated`;
    el("score-list").innerHTML = scoreParties().map((score, index) => {
      const hasScore = score.percentage !== null;
      const breakdown = RATINGS.map(rating => `<div><span>${escapeHTML(rating.label)}</span><strong>${score.breakdown[rating.value]}</strong></div>`).join("");
      return `<details class="score-card" style="--party:${partyColour(score.party)}">
        <summary>
          <div class="score-row">
            <span class="rank" aria-label="${hasScore ? `Rank ${index + 1}` : "Not ranked"}">${hasScore ? index + 1 : "–"}</span>
            <div class="score-party"><span class="party-mark">${escapeHTML(score.party)}</span><span class="score-count">${score.ratedCount} of ${score.listedCount} policies rated</span></div>
            <span class="score-value">${hasScore ? `${Math.round(score.percentage)}%` : "—"}</span>
            <span class="progress-track" aria-label="${hasScore ? `${Math.round(score.percentage)} percent match` : "Not rated"}"><span style="width:${score.percentage || 0}%"></span></span>
          </div>
        </summary>
        <div class="breakdown">${breakdown}</div>
      </details>`;
    }).join("");
  }

  function updateProgress() {
    if (!state.dataset) return;
    const count = ratedCount();
    const total = activePolicies().length;
    el("progress-copy").textContent = `${count} / ${total} active policies rated`;
    el("header-status").textContent = `${count} rated · Responses stay in this browser`;
  }

  function updateAbout() {
    if (!state.dataset) return;
    const count = ratedCount();
    el("about-rated-count").textContent = count;
    el("clear-all-button").disabled = Object.keys(state.responses).length === 0;
  }

  function formatDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return value || "—";
    const [year, month, day] = value.split("-").map(Number);
    return new Intl.DateTimeFormat("en-NZ", { day: "numeric", month: "long", year: "numeric" }).format(new Date(year, month - 1, day));
  }

  function activeFilterCount() {
    const filters = state.filters;
    return filters.parties.size + filters.topics.size + filters.statuses.size + (filters.unansweredOnly ? 1 : 0);
  }

  function renderFilterOptions() {
    const unique = key => [...new Set(activePolicies().map(policy => policy[key]))].sort((a, b) => a.localeCompare(b, "en-NZ"));
    renderChecks("party-filters", unique("party"), "party", state.filters.parties, value => value);
    renderChecks("status-filters", unique("policyStatus"), "status", state.filters.statuses, value => STATUS_LABELS[value] || value);
    renderChecks("topic-filters", unique("topic"), "topic", state.filters.topics, value => value);
    el("unanswered-only").checked = state.filters.unansweredOnly;
  }

  function renderChecks(containerID, values, group, selected, labelFor) {
    el(containerID).innerHTML = values.map((value, index) => `<label>
      <input type="checkbox" data-filter-group="${group}" value="${escapeHTML(value)}" ${selected.has(value) ? "checked" : ""}>
      <span>${escapeHTML(labelFor(value))}</span>
    </label>`).join("");
  }

  function syncFiltersFromDialog() {
    state.filters.parties = checkedValues("party");
    state.filters.topics = checkedValues("topic");
    state.filters.statuses = checkedValues("status");
    state.filters.unansweredOnly = el("unanswered-only").checked;
    updateFilterBadge();
    renderList();
  }

  function checkedValues(group) {
    return new Set([...document.querySelectorAll(`[data-filter-group="${group}"]:checked`)].map(input => input.value));
  }

  function updateFilterBadge() {
    const count = activeFilterCount();
    el("filter-count").hidden = count === 0;
    el("filter-count").textContent = count;
  }

  function clearSearchAndFilters() {
    state.query = "";
    el("policy-search").value = "";
    state.filters = { parties: new Set(), topics: new Set(), statuses: new Set(), unansweredOnly: false };
    renderFilterOptions();
    updateFilterBadge();
    renderList();
  }

  function showView(view) {
    state.activeView = view;
    document.querySelectorAll(".view").forEach(section => {
      const isActive = section.id === `${view}-view`;
      section.hidden = !isActive;
      section.classList.toggle("is-active", isActive);
    });
    document.querySelectorAll(".tab-bar [data-view]").forEach(button => {
      const isActive = button.dataset.view === view;
      button.classList.toggle("is-active", isActive);
      if (isActive) button.setAttribute("aria-current", "page"); else button.removeAttribute("aria-current");
    });
    if (view === "match") renderScores();
    if (view === "about") updateAbout();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  let toastTimer;
  function showToast(message) {
    clearTimeout(toastTimer);
    el("toast").textContent = message;
    el("toast").hidden = false;
    toastTimer = setTimeout(() => { el("toast").hidden = true; }, 1600);
  }

  function bindStaticEvents() {
    el("policy-search").addEventListener("input", event => {
      state.query = event.target.value;
      renderList();
    });
    el("filter-button").addEventListener("click", () => {
      renderFilterOptions();
      el("filter-dialog").showModal();
    });
    el("filter-dialog").addEventListener("close", syncFiltersFromDialog);
    el("clear-filters").addEventListener("click", () => {
      state.filters = { parties: new Set(), topics: new Set(), statuses: new Set(), unansweredOnly: false };
      renderFilterOptions();
    });
    el("empty-clear").addEventListener("click", clearSearchAndFilters);
    document.querySelectorAll(".tab-bar [data-view]").forEach(button => button.addEventListener("click", () => showView(button.dataset.view)));
    el("mobile-detail-close").addEventListener("click", () => el("mobile-detail-dialog").close());
    el("clear-all-button").addEventListener("click", () => el("clear-dialog").showModal());
    el("clear-dialog").addEventListener("close", async () => {
      if (el("clear-dialog").returnValue !== "confirm") return;
      state.responses = {};
      await persist("All responses cleared");
      renderList();
      renderScores();
      updateAbout();
      if (state.selectedPolicyID) refreshSelectedDetail();
    });
  }

  async function start() {
    bindStaticEvents();
    try {
      const [datasetResponse, responses] = await Promise.all([fetch("policies.json", { cache: "no-cache" }), store.load()]);
      if (!datasetResponse.ok) throw new Error("Policy data request failed");
      state.dataset = await datasetResponse.json();
      state.policies = state.dataset.policies || [];
      state.responses = responses && typeof responses === "object" ? responses : {};

      el("data-date").textContent = formatDate(state.dataset.dataLastUpdated);
      el("data-version").textContent = state.dataset.datasetVersion;
      el("data-count").textContent = state.policies.length;
      renderFilterOptions();
      renderList();
      renderScores();
      updateAbout();
    } catch (error) {
      el("header-status").textContent = "Policy data unavailable";
      el("policy-list").innerHTML = `<div class="empty-state"><h2>Policy data unavailable</h2><p>Please refresh the page and try again.</p></div>`;
      el("list-summary").textContent = "Could not load policies";
      console.error(error);
    }
  }

  start();
})();
