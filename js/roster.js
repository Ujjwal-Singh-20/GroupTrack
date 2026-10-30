/**
 * GroupTrack - Student Roster & Checkbox Selection Component
 * Modules:
 *  - Renders student roster for the active section
 *  - High-performance filtering (All, Unassigned, Assigned) & instant search
 *  - Checkbox multi-selection for group bundling
 *  - Select All / Clear shortcuts and group creation trigger
 *  - Full CRUD operations: Manual Add, Edit, and Delete student
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
      this.initModalEvents();
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

      // CRUD Modal DOM elements
      this.btnAddStudent = document.getElementById('btn-manual-add-student');
      this.modalStudent = document.getElementById('modal-student');
      this.modalStudentClose = document.getElementById('modal-student-close');
      this.modalStudentTitle = document.getElementById('modal-student-title');
      this.btnCancelStudent = document.getElementById('btn-cancel-student');
      this.formStudent = document.getElementById('form-student');

      this.inputStudentId = document.getElementById('student-id-input');
      this.inputRoll = document.getElementById('student-roll-input');
      this.inputName = document.getElementById('student-name-input');
      this.inputDept = document.getElementById('student-dept-input');
      this.inputEmail = document.getElementById('student-email-input');

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

    initModalEvents() {
      if (this.btnAddStudent) {
        this.btnAddStudent.addEventListener('click', () => this.openAddModal());
      }

      if (this.modalStudentClose) {
        this.modalStudentClose.addEventListener('click', () => this.closeModal());
      }

      if (this.btnCancelStudent) {
        this.btnCancelStudent.addEventListener('click', () => this.closeModal());
      }

      if (this.modalStudent) {
        this.modalStudent.addEventListener('click', (e) => {
          if (e.target === this.modalStudent) this.closeModal();
        });
      }

      if (this.formStudent) {
        this.formStudent.addEventListener('submit', (e) => this.handleSaveStudent(e));
      }

      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.modalStudent && this.modalStudent.style.display === 'flex') {
          this.closeModal();
        }
      });
    }

    openAddModal() {
      if (!this.modalStudent) return;
      if (this.modalStudentTitle) this.modalStudentTitle.textContent = 'Add Student';
      if (this.formStudent) this.formStudent.reset();
      if (this.inputStudentId) this.inputStudentId.value = '';

      this.modalStudent.style.display = 'flex';
      setTimeout(() => {
        if (this.inputRoll) this.inputRoll.focus();
      }, 50);
    }

    openEditModal(studentId) {
      if (!this.modalStudent) return;
      const students = window.StorageManager.getStudents();
      const s = students.find((item) => item.id === studentId);
      if (!s) return;

      if (this.modalStudentTitle) this.modalStudentTitle.textContent = 'Edit Student';
      if (this.inputStudentId) this.inputStudentId.value = s.id;
      if (this.inputRoll) this.inputRoll.value = s.roll || '';
      if (this.inputName) this.inputName.value = s.name || '';
      if (this.inputDept) this.inputDept.value = s.dept || '';
      if (this.inputEmail) this.inputEmail.value = s.email || '';

      this.modalStudent.style.display = 'flex';
      setTimeout(() => {
        if (this.inputName) this.inputName.focus();
      }, 50);
    }

    closeModal() {
      if (!this.modalStudent) return;
      this.modalStudent.style.display = 'none';
      if (this.formStudent) this.formStudent.reset();
      if (this.inputStudentId) this.inputStudentId.value = '';
    }

    handleSaveStudent(e) {
      e.preventDefault();

      const studentId = this.inputStudentId ? this.inputStudentId.value.trim() : '';
      const roll = this.inputRoll ? this.inputRoll.value.trim() : '';
      const name = this.inputName ? this.inputName.value.trim() : '';
      const dept = this.inputDept ? this.inputDept.value.trim() : '';
      const email = this.inputEmail ? this.inputEmail.value.trim() : '';

      if (!roll || !name) {
        if (typeof window.showToast === 'function') {
          window.showToast('Roll number and name are required', 'error');
        } else {
          alert('Roll number and name are required');
        }
        return;
      }

      if (studentId) {
        // Update existing student
        const res = window.StorageManager.updateStudent(studentId, { roll, name, dept, email });
        if (!res.success) {
          if (typeof window.showToast === 'function') {
            window.showToast(res.message, 'error');
          } else {
            alert(res.message);
          }
          return;
        }
        if (typeof window.showToast === 'function') {
          window.showToast(`Updated student "${name}"`, 'success');
        }
      } else {
        // Create new student
        const res = window.StorageManager.addSingleStudent({ roll, name, dept, email });
        if (!res.success) {
          if (typeof window.showToast === 'function') {
            window.showToast(res.message, 'error');
          } else {
            alert(res.message);
          }
          return;
        }
        if (typeof window.showToast === 'function') {
          window.showToast(`Added student "${name}"`, 'success');
        }
      }

      this.closeModal();

      if (typeof window.refreshAllData === 'function') {
        window.refreshAllData();
      } else {
        this.render();
        if (window.GroupEngine) window.GroupEngine.render();
      }
    }

    handleDeleteStudent(studentId) {
      const students = window.StorageManager.getStudents();
      const s = students.find((item) => item.id === studentId);
      if (!s) return;

      const groupNote = s.groupId
        ? '\n\nNote: This student will also be removed from their assigned project group.'
        : '';
      const confirmDelete = window.confirm(
        `Are you sure you want to delete student "${s.name}" (${s.roll})?${groupNote}`
      );
      if (!confirmDelete) return;

      const res = window.StorageManager.deleteStudent(studentId);
      if (res && res.success) {
        if (this.selectedIds.has(studentId)) {
          this.selectedIds.delete(studentId);
        }
        if (typeof window.showToast === 'function') {
          window.showToast(`Student "${s.name}" deleted`, 'info');
        }
        if (typeof window.refreshAllData === 'function') {
          window.refreshAllData();
        } else {
          this.render();
          if (window.GroupEngine) window.GroupEngine.render();
        }
      } else {
        const errorMsg = res ? res.message : 'Failed to delete student';
        if (typeof window.showToast === 'function') {
          window.showToast(errorMsg, 'error');
        } else {
          alert(errorMsg);
        }
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
            <span class="empty-subtitle">Use "+ Add Student" or upload a sheet above</span>
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
          <div class="student-item-actions">
            <button type="button" class="btn-icon-subtle btn-edit-student" title="Edit ${this.escapeHtml(s.name)}" data-id="${s.id}">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 20h9"/>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
            </button>
            <button type="button" class="btn-icon-subtle danger btn-delete-student" title="Delete ${this.escapeHtml(s.name)}" data-id="${s.id}">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        `;

        // Action buttons listeners
        const editBtn = item.querySelector('.btn-edit-student');
        if (editBtn) {
          editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openEditModal(s.id);
          });
        }

        const delBtn = item.querySelector('.btn-delete-student');
        if (delBtn) {
          delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleDeleteStudent(s.id);
          });
        }

        // Toggle checkbox on clicking item row
        item.addEventListener('click', (e) => {
          if (e.target.closest('.student-item-actions')) return;
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
