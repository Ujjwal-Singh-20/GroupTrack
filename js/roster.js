/**
 * GroupTrack - Student Roster & Checkbox Selection Component
 * Modules:
 *  - Renders student roster for the active section
 *  - High-performance filtering (All, Unassigned, Assigned) & instant search
 *  - Checkbox multi-selection for group bundling
 *  - Select All / Clear shortcuts and group creation trigger
 */

(function (window) {
  'use strict';

  class StudentRoster {
    constructor() {
      this.selectedIds = new Set();
      this.currentFilter = 'all'; // 'all' | 'unassigned' | 'assigned'
      this.searchQuery = '';
      this.onCreateGroupTrigger = null;

      this.initDom();
    }

    initDom() {
      this.container = document.getElementById('student-list-container');
      this.badgeTotal = document.getElementById('students-badge');
      this.searchInput = document.getElementById('search-students');
      this.clearSearchBtn = document.getElementById('clear-search-student');
      this.filterPills = document.querySelectorAll('.student-filter-pill');

      this.btnSelectAll = document.getElementById('btn-select-all');
      this.btnDeselectAll = document.getElementById('btn-deselect-all');
      this.btnCreateGroup = document.getElementById('btn-create-group-selected');
      this.selectedCountSpan = document.getElementById('selected-count');

      // Search input listener
      if (this.searchInput) {
        this.searchInput.addEventListener('input', (e) => {
          this.searchQuery = e.target.value.trim().toLowerCase();
          if (this.clearSearchBtn) {
            this.clearSearchBtn.style.display = this.searchQuery ? 'block' : 'none';
          }
          this.render();
        });
      }

      if (this.clearSearchBtn) {
        this.clearSearchBtn.addEventListener('click', () => {
          this.searchInput.value = '';
          this.searchQuery = '';
          this.clearSearchBtn.style.display = 'none';
          this.render();
        });
      }

      // Filter pills
      if (this.filterPills) {
        this.filterPills.forEach((pill) => {
          pill.addEventListener('click', () => {
            this.filterPills.forEach((p) => p.classList.remove('active'));
            pill.classList.add('active');
            this.currentFilter = pill.dataset.filter;
            this.render();
          });
        });
      }

      // Selection actions
      if (this.btnSelectAll) {
        this.btnSelectAll.addEventListener('click', () => this.selectAllFiltered());
      }
      if (this.btnDeselectAll) {
        this.btnDeselectAll.addEventListener('click', () => this.clearSelection());
      }
      if (this.btnCreateGroup) {
        this.btnCreateGroup.addEventListener('click', () => {
          if (this.selectedIds.size > 0 && typeof this.onCreateGroupTrigger === 'function') {
            this.onCreateGroupTrigger(Array.from(this.selectedIds));
          }
        });
      }
    }

    setOnCreateGroup(callback) {
      this.onCreateGroupTrigger = callback;
    }

    getSelectedStudentIds() {
      return Array.from(this.selectedIds);
    }

    clearSelection() {
      this.selectedIds.clear();
      this.updateSelectionUi();
    }

    selectAllFiltered() {
      const students = window.StorageManager.getStudents();
      students.forEach((s) => {
        if (this.currentFilter === 'unassigned' && s.groupId) return;
        if (this.currentFilter === 'assigned' && !s.groupId) return;
        if (this.searchQuery) {
          const matchName = (s.name || '').toLowerCase().includes(this.searchQuery);
          const matchRoll = (s.roll || '').toLowerCase().includes(this.searchQuery);
          if (!matchName && !matchRoll) return;
        }
        this.selectedIds.add(s.id);
      });
      this.updateSelectionUi();
    }

    toggleStudent(id) {
      if (this.selectedIds.has(id)) {
        this.selectedIds.delete(id);
      } else {
        this.selectedIds.add(id);
      }
      this.updateSelectionUi();
    }

    updateSelectionUi() {
      const count = this.selectedIds.size;
      if (this.selectedCountSpan) this.selectedCountSpan.textContent = count;
      if (this.btnCreateGroup) this.btnCreateGroup.disabled = count === 0;

      const items = this.container.querySelectorAll('.student-item');
      items.forEach((item) => {
        const id = item.dataset.id;
        const isSelected = this.selectedIds.has(id);
        item.classList.toggle('selected', isSelected);
        const chk = item.querySelector('.student-checkbox');
        if (chk) chk.checked = isSelected;
      });
    }

    render() {
      if (!this.container) return;
      this.container.innerHTML = '';

      const students = window.StorageManager.getStudents();
      const groups = window.StorageManager.getGroups();

      // Build group name lookup
      const groupMap = new Map();
      groups.forEach((g) => groupMap.set(g.id, g.name));

      // Filter
      const filtered = students.filter((s) => {
        if (this.currentFilter === 'unassigned' && s.groupId) return false;
        if (this.currentFilter === 'assigned' && !s.groupId) return false;
        if (this.searchQuery) {
          const matchName = (s.name || '').toLowerCase().includes(this.searchQuery);
          const matchRoll = (s.roll || '').toLowerCase().includes(this.searchQuery);
          const matchDept = (s.dept || '').toLowerCase().includes(this.searchQuery);
          return matchName || matchRoll || matchDept;
        }
        return true;
      });

      if (this.badgeTotal) this.badgeTotal.textContent = students.length;

      if (students.length === 0) {
        this.container.innerHTML = `
          <div class="empty-state">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            <p>No students in this section</p>
            <span class="empty-subtitle">Upload a sheet or load sample students above</span>
          </div>`;
        this.updateSelectionUi();
        return;
      }

      if (filtered.length === 0) {
        this.container.innerHTML = `
          <div class="empty-state">
            <p>No matching students</p>
            <span class="empty-subtitle">Try adjusting your search or filter</span>
          </div>`;
        this.updateSelectionUi();
        return;
      }

      const frag = document.createDocumentFragment();

      filtered.forEach((s) => {
        const isSelected = this.selectedIds.has(s.id);
        const isAssigned = !!s.groupId;
        const groupName = isAssigned ? groupMap.get(s.groupId) || 'Assigned' : 'Unassigned';

        const item = document.createElement('div');
        item.className = `student-item ${isSelected ? 'selected' : ''} ${isAssigned ? 'is-assigned' : ''}`;
        item.dataset.id = s.id;

        item.innerHTML = `
          <input type="checkbox" class="student-checkbox" ${isSelected ? 'checked' : ''} />
          <div class="student-info">
            <div class="student-name-row">
              <span class="student-name" title="${this.escapeHtml(s.name)}">${this.escapeHtml(s.name)}</span>
              <span class="student-roll">${this.escapeHtml(s.roll)}</span>
            </div>
            <div class="student-meta">
              <span class="student-grp-tag ${isAssigned ? 'assigned' : 'unassigned'}">
                ${this.escapeHtml(groupName)}
              </span>
              ${s.dept ? `<span class="student-dept-tag">${this.escapeHtml(s.dept)}</span>` : ''}
            </div>
          </div>
        `;

        item.addEventListener('click', (e) => {
          if (e.target.tagName !== 'INPUT') {
            const chk = item.querySelector('.student-checkbox');
            if (chk) chk.checked = !chk.checked;
          }
          this.toggleStudent(s.id);
        });

        frag.appendChild(item);
      });

      this.container.appendChild(frag);
      this.updateSelectionUi();
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

  window.StudentRoster = new StudentRoster();
})(window);
