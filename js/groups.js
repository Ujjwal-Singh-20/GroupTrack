/**
 * GroupTrack - Project Groups & Review Tracker Engine
 * Modules:
 *  - Renders project group cards with pastel status indicators
 *  - Quick stepper (+ / -) for instant review check-in counts
 *  - Modal for logging detailed review feedback & milestones
 *  - Chronological review history timeline viewer
 *  - Create & Edit group modals with member detachment
 */

(function (window) {
  'use strict';

  class GroupEngine {
    constructor() {
      this.searchQuery = '';
      this.statusFilter = 'all';
      this.currentModalMemberIds = [];
      this.onDataChanged = null;

      this.initDom();
    }

    initDom() {
      this.container = document.getElementById('groups-container');
      this.badgeTotal = document.getElementById('groups-badge');
      this.searchInput = document.getElementById('search-groups');
      this.statusFilterSelect = document.getElementById('filter-group-status');
      this.btnManualNewGroup = document.getElementById('btn-manual-new-group');

      // Group Modal elements
      this.modalGroup = document.getElementById('modal-group');
      this.modalGroupTitle = document.getElementById('modal-group-title');
      this.modalGroupClose = document.getElementById('modal-group-close');
      this.formGroup = document.getElementById('form-group');
      this.formGroupId = document.getElementById('form-group-id');
      this.inputGroupName = document.getElementById('group-name-input');
      this.inputGroupStatus = document.getElementById('group-status-input');
      this.inputProjectTitle = document.getElementById('group-project-title');
      this.inputProjectIdea = document.getElementById('group-project-idea');
      this.inputGroupScore = document.getElementById('group-score');
      this.inputNextDeadline = document.getElementById('group-next-deadline');
      this.modalMembersList = document.getElementById('modal-members-list');
      this.modalMemberCount = document.getElementById('modal-member-count');
      this.btnCancelGroup = document.getElementById('btn-cancel-group');

      // Review Modal elements
      this.modalReview = document.getElementById('modal-review');
      this.modalReviewClose = document.getElementById('modal-review-close');
      this.formReview = document.getElementById('form-review');
      this.reviewGroupId = document.getElementById('review-group-id');
      this.reviewTargetGroup = document.getElementById('review-target-group-name');
      this.reviewTargetProject = document.getElementById('review-target-project-name');
      this.reviewDate = document.getElementById('review-date');
      this.reviewStatus = document.getElementById('review-status-update');
      this.reviewNotes = document.getElementById('review-notes');
      this.btnCancelReview = document.getElementById('btn-cancel-review');

      // History Modal elements
      this.modalHistory = document.getElementById('modal-history');
      this.modalHistoryClose = document.getElementById('modal-history-close');
      this.historyTitle = document.getElementById('history-modal-title');
      this.historyTimeline = document.getElementById('history-timeline');
      this.btnCloseHistory = document.getElementById('btn-close-history');
      this.btnHistoryAddNew = document.getElementById('btn-history-add-new');

      // Listeners
      if (this.searchInput) {
        this.searchInput.addEventListener('input', (e) => {
          this.searchQuery = e.target.value.trim().toLowerCase();
          this.render();
        });
      }

      if (this.statusFilterSelect) {
        this.statusFilterSelect.addEventListener('change', (e) => {
          this.statusFilter = e.target.value;
          this.render();
        });
      }

      if (this.btnManualNewGroup) {
        this.btnManualNewGroup.addEventListener('click', () => {
          const selected = window.StudentRoster ? window.StudentRoster.getSelectedStudentIds() : [];
          this.openGroupModal(null, selected);
        });
      }

      // Group modal events
      if (this.modalGroupClose) this.modalGroupClose.addEventListener('click', () => this.hideGroupModal());
      if (this.btnCancelGroup) this.btnCancelGroup.addEventListener('click', () => this.hideGroupModal());
      if (this.formGroup) this.formGroup.addEventListener('submit', (e) => this.handleSaveGroup(e));

      // Review modal events
      if (this.modalReviewClose) this.modalReviewClose.addEventListener('click', () => this.hideReviewModal());
      if (this.btnCancelReview) this.btnCancelReview.addEventListener('click', () => this.hideReviewModal());
      if (this.formReview) this.formReview.addEventListener('submit', (e) => this.handleSaveReview(e));

      // History modal events
      if (this.modalHistoryClose) this.modalHistoryClose.addEventListener('click', () => this.hideHistoryModal());
      if (this.btnCloseHistory) this.btnCloseHistory.addEventListener('click', () => this.hideHistoryModal());
    }

    setOnDataChanged(cb) {
      this.onDataChanged = cb;
    }

    notifyChange() {
      if (typeof this.onDataChanged === 'function') {
        this.onDataChanged();
      }
    }

    // --- Render Groups ---
    render() {
      if (!this.container) return;
      this.container.innerHTML = '';

      const groups = window.StorageManager.getGroups();
      const students = window.StorageManager.getStudents();
      const studentMap = new Map();
      students.forEach((s) => studentMap.set(s.id, s));

      if (this.badgeTotal) this.badgeTotal.textContent = groups.length;

      const filtered = groups.filter((g) => {
        if (this.statusFilter !== 'all' && g.status !== this.statusFilter) return false;
        if (this.searchQuery) {
          const matchTitle = (g.projectTitle || '').toLowerCase().includes(this.searchQuery);
          const matchName = (g.name || '').toLowerCase().includes(this.searchQuery);
          const matchIdea = (g.projectIdea || '').toLowerCase().includes(this.searchQuery);
          const matchMember = (g.memberIds || []).some((id) => {
            const s = studentMap.get(id);
            return s && (s.name.toLowerCase().includes(this.searchQuery) || s.roll.toLowerCase().includes(this.searchQuery));
          });
          return matchTitle || matchName || matchIdea || matchMember;
        }
        return true;
      });

      if (groups.length === 0) {
        this.container.innerHTML = `
          <div class="empty-state" style="grid-column: 1 / -1; min-height: 260px;">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <p>No project groups formed in this section</p>
            <span class="empty-subtitle">Select students with checkboxes on the left and click "Create Group".</span>
          </div>`;
        return;
      }

      if (filtered.length === 0) {
        this.container.innerHTML = `
          <div class="empty-state" style="grid-column: 1 / -1;">
            <p>No matching groups found</p>
            <span class="empty-subtitle">Try adjusting your search query or status filter</span>
          </div>`;
        return;
      }

      const frag = document.createDocumentFragment();

      filtered.forEach((g) => {
        const card = document.createElement('div');
        card.className = 'group-card';
        card.dataset.groupId = g.id;

        const members = (g.memberIds || []).map((id) => studentMap.get(id)).filter(Boolean);

        let lastFeedbackSnippet = 'No review notes yet';
        if (g.reviews && g.reviews.length > 0) {
          const latest = g.reviews[g.reviews.length - 1];
          lastFeedbackSnippet = `${latest.date ? latest.date + ': ' : ''}${latest.notes}`;
        }

        card.innerHTML = `
          <!-- Card Header -->
          <div class="group-header">
            <div class="group-title-badge">
              <span class="group-name-text">${this.escapeHtml(g.name)}</span>
              <span class="status-badge" data-status="${this.escapeHtml(g.status || 'Ideation')}" title="Click to cycle status">
                ${this.escapeHtml(g.status || 'Ideation')}
              </span>
            </div>

            <div class="card-actions">
              <button class="btn-icon btn-edit-group" title="Edit Group">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <button class="btn-icon danger btn-delete-group" title="Dissolve Group">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Project Title & Scope -->
          <div class="project-info-block">
            <div class="project-title-text">${this.escapeHtml(g.projectTitle || 'Untitled Project')}</div>
            <div class="project-idea-text">${this.escapeHtml(g.projectIdea || 'No description added yet.')}</div>
          </div>

          <!-- Members Section -->
          <div class="group-members-section">
            <div class="section-label">Members (${members.length})</div>
            <div class="members-chips">
              ${
                members.length > 0
                  ? members
                      .map(
                        (m) => `
                      <div class="member-chip" title="${this.escapeHtml(m.email || '')}">
                        <span class="roll">${this.escapeHtml(m.roll)}</span>
                        <span>${this.escapeHtml(m.name)}</span>
                        <span class="remove-member" data-member-id="${m.id}" title="Remove member">&times;</span>
                      </div>`
                      )
                      .join('')
                  : '<span style="font-size:0.75rem; color:var(--text-muted); font-style:italic;">No members assigned</span>'
              }
            </div>
          </div>

          <!-- Review & Progress Tracker -->
          <div class="review-tracker-box">
            <div class="review-tally">
              <span class="review-tally-number">${g.reviewCount || 0}</span>
              <span class="review-tally-label">Reviews Shown</span>
            </div>

            <div class="review-controls">
              <button class="stepper-btn btn-step-down" title="Decrease count">-</button>
              <button class="stepper-btn btn-step-up" title="Increase count">+</button>
              <button class="btn-log-review" title="Log feedback notes">+ Log Review</button>
              <button class="btn-history-link" title="View timeline">History</button>
            </div>
          </div>

          <!-- Footer: Grade / Deadline / Latest Note -->
          <div class="group-card-footer">
            <div class="quick-grade">
              ${g.score ? `<span class="grade-pill">${this.escapeHtml(g.score)}</span>` : '<span style="color:var(--text-muted); font-size:0.7rem;">Unscored</span>'}
              ${g.nextDeadline ? `<span class="deadline-tag" title="Next Milestone">Next: ${this.escapeHtml(g.nextDeadline)}</span>` : ''}
            </div>
            <div class="last-review-note" title="${this.escapeHtml(lastFeedbackSnippet)}">
              ${this.escapeHtml(lastFeedbackSnippet)}
            </div>
          </div>
        `;

        this.attachCardEvents(card, g);
        frag.appendChild(card);
      });

      this.container.appendChild(frag);
    }

    attachCardEvents(card, group) {
      // Status badge cycle
      const statusBadge = card.querySelector('.status-badge');
      statusBadge.addEventListener('click', () => {
        const statuses = ['Ideation', 'In Progress', 'Needs Changes', 'Approved', 'Completed'];
        const nextIdx = (statuses.indexOf(group.status || 'Ideation') + 1) % statuses.length;
        group.status = statuses[nextIdx];
        window.StorageManager.saveGroup(group);
        this.render();
        this.notifyChange();
      });

      // Member removal
      card.querySelectorAll('.remove-member').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const memberId = btn.dataset.memberId;
          group.memberIds = (group.memberIds || []).filter((id) => id !== memberId);
          window.StorageManager.setStudentGroup(memberId, null);
          window.StorageManager.saveGroup(group);
          this.render();
          this.notifyChange();
        });
      });

      // Stepper
      const btnUp = card.querySelector('.btn-step-up');
      btnUp.addEventListener('click', () => {
        window.StorageManager.stepReviewCount(group.id, 1);
        this.render();
        this.notifyChange();
      });

      const btnDown = card.querySelector('.btn-step-down');
      btnDown.addEventListener('click', () => {
        window.StorageManager.stepReviewCount(group.id, -1);
        this.render();
        this.notifyChange();
      });

      // Log Review Modal
      const btnLog = card.querySelector('.btn-log-review');
      btnLog.addEventListener('click', () => this.openReviewModal(group));

      // History
      const btnHist = card.querySelector('.btn-history-link');
      btnHist.addEventListener('click', () => this.openHistoryModal(group));

      // Edit
      const btnEdit = card.querySelector('.btn-edit-group');
      btnEdit.addEventListener('click', () => this.openGroupModal(group));

      // Delete
      const btnDel = card.querySelector('.btn-delete-group');
      btnDel.addEventListener('click', () => {
        if (confirm(`Dissolve "${group.name}"? Members will be set to unassigned.`)) {
          window.StorageManager.deleteGroup(group.id);
          this.render();
          this.notifyChange();
        }
      });
    }

    // --- Group Create/Edit Modal ---
    openGroupModal(existingGroup = null, preselectedIds = []) {
      this.formGroup.reset();

      if (existingGroup) {
        this.modalGroupTitle.textContent = `Edit ${existingGroup.name}`;
        this.formGroupId.value = existingGroup.id;
        this.inputGroupName.value = existingGroup.name;
        this.inputGroupStatus.value = existingGroup.status || 'Ideation';
        this.inputProjectTitle.value = existingGroup.projectTitle || '';
        this.inputProjectIdea.value = existingGroup.projectIdea || '';
        this.inputGroupScore.value = existingGroup.score || '';
        this.inputNextDeadline.value = existingGroup.nextDeadline || '';
        this.currentModalMemberIds = [...(existingGroup.memberIds || [])];
      } else {
        const count = window.StorageManager.getGroups().length + 1;
        this.modalGroupTitle.textContent = 'Create Project Group';
        this.formGroupId.value = '';
        this.inputGroupName.value = `Group ${String(count).padStart(2, '0')}`;
        this.inputGroupStatus.value = 'Ideation';
        this.inputProjectTitle.value = '';
        this.inputProjectIdea.value = '';
        this.inputGroupScore.value = '';
        this.inputNextDeadline.value = '';
        this.currentModalMemberIds = [...preselectedIds];
      }

      this.renderModalMembersChips();
      this.modalGroup.style.display = 'flex';
      this.inputProjectTitle.focus();
    }

    renderModalMembersChips() {
      this.modalMembersList.innerHTML = '';
      this.modalMemberCount.textContent = this.currentModalMemberIds.length;

      if (this.currentModalMemberIds.length === 0) {
        this.modalMembersList.innerHTML = '<span style="font-size:0.75rem; color:var(--text-muted); font-style:italic;">No students bundled yet. Check students on the left panel!</span>';
        return;
      }

      const students = window.StorageManager.getStudents();
      const map = new Map();
      students.forEach((s) => map.set(s.id, s));

      this.currentModalMemberIds.forEach((id) => {
        const s = map.get(id);
        if (!s) return;

        const chip = document.createElement('div');
        chip.className = 'member-chip';
        chip.innerHTML = `
          <span class="roll">${this.escapeHtml(s.roll)}</span>
          <span>${this.escapeHtml(s.name)}</span>
          <span class="remove-member" title="Remove">&times;</span>
        `;
        chip.querySelector('.remove-member').addEventListener('click', () => {
          this.currentModalMemberIds = this.currentModalMemberIds.filter((mId) => mId !== id);
          this.renderModalMembersChips();
        });
        this.modalMembersList.appendChild(chip);
      });
    }

    handleSaveGroup(e) {
      e.preventDefault();
      const id = this.formGroupId.value;
      const name = this.inputGroupName.value.trim();
      const title = this.inputProjectTitle.value.trim();
      const idea = this.inputProjectIdea.value.trim();
      const status = this.inputGroupStatus.value;
      const score = this.inputGroupScore.value.trim();
      const nextDeadline = this.inputNextDeadline.value;

      if (!name || !title) {
        alert('Please fill in Group Name and Project Title.');
        return;
      }

      const payload = {
        name,
        projectTitle: title,
        projectIdea: idea,
        status,
        score,
        nextDeadline,
        memberIds: this.currentModalMemberIds,
      };

      if (id) {
        payload.id = id;
      }

      window.StorageManager.saveGroup(payload);

      // If created with preselected students, clear selection
      if (!id && window.StudentRoster) {
        window.StudentRoster.clearSelection();
      }

      this.hideGroupModal();
      this.render();
      this.notifyChange();
    }

    hideGroupModal() {
      if (this.modalGroup) this.modalGroup.style.display = 'none';
      this.currentModalMemberIds = [];
    }

    // --- Review Log Modal ---
    openReviewModal(group) {
      this.formReview.reset();
      this.reviewGroupId.value = group.id;
      this.reviewTargetGroup.textContent = group.name;
      this.reviewTargetProject.textContent = group.projectTitle || 'Untitled Project';
      this.reviewDate.value = new Date().toISOString().split('T')[0];
      this.reviewStatus.value = group.status || '';
      this.modalReview.style.display = 'flex';
      this.reviewNotes.focus();
    }

    handleSaveReview(e) {
      e.preventDefault();
      const gId = this.reviewGroupId.value;
      const date = this.reviewDate.value || new Date().toISOString().split('T')[0];
      const notes = this.reviewNotes.value.trim();
      const status = this.reviewStatus.value;

      if (!notes) {
        alert('Please enter notes or feedback for this review.');
        return;
      }

      window.StorageManager.addReview(gId, { date, notes, status });
      this.hideReviewModal();
      this.render();
      this.notifyChange();
    }

    hideReviewModal() {
      if (this.modalReview) this.modalReview.style.display = 'none';
    }

    // --- Review History Modal ---
    openHistoryModal(group) {
      this.historyTitle.textContent = `${group.name} - Review Timeline`;
      this.historyTimeline.innerHTML = '';

      const reviews = group.reviews || [];
      if (reviews.length === 0) {
        this.historyTimeline.innerHTML = '<div style="color:var(--text-muted); font-size:0.85rem; padding:10px 0;">No reviews logged yet for this group.</div>';
      } else {
        reviews.forEach((r, idx) => {
          const item = document.createElement('div');
          item.className = 'timeline-item';
          item.innerHTML = `
            <div class="timeline-header">
              <span class="timeline-count">Review #${idx + 1}</span>
              <span class="timeline-date">${this.escapeHtml(r.date || 'Recent')}</span>
            </div>
            <div class="timeline-notes">${this.escapeHtml(r.notes || '')}</div>
            ${r.status ? `<div class="timeline-status-tag">Status: ${this.escapeHtml(r.status)}</div>` : ''}
          `;
          this.historyTimeline.appendChild(item);
        });
      }

      this.btnHistoryAddNew.onclick = () => {
        this.hideHistoryModal();
        this.openReviewModal(group);
      };

      this.modalHistory.style.display = 'flex';
    }

    hideHistoryModal() {
      if (this.modalHistory) this.modalHistory.style.display = 'none';
    }

    escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
  }

  window.GroupEngine = new GroupEngine();
})(window);
