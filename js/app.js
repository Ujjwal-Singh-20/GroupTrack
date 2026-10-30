/**
 * GroupTrack - Main Application Orchestrator
 * Integrates:
 *  - StorageManager (Sections & persistence) & SheetMapper (Dynamic Ingestion)
 *  - StudentRoster (Checklists) & GroupEngine (Cards, Stepper & Timeline)
 *  - ExportManager (Status CSV, Backups & Print Report)
 */

(function () {
  'use strict';

  // DOM Elements
  const els = {
    // Header & Section Tabs
    sectionTabsList: document.getElementById('section-tabs-list'),
    btnAddSection: document.getElementById('btn-add-section'),
    btnUpload: document.getElementById('btn-upload'),
    fileInput: document.getElementById('file-uploader'),
    btnSampleData: document.getElementById('btn-sample-data'),
    btnDataMenu: document.getElementById('btn-data-menu'),
    dataDropdown: document.getElementById('data-dropdown'),
    btnClearSection: document.getElementById('btn-clear-section'),

    // Top Metric Badges
    statStudents: document.getElementById('stat-total-students'),
    statUnassigned: document.getElementById('stat-unassigned'),
    statGroups: document.getElementById('stat-groups'),
    statReviews: document.getElementById('stat-reviews'),

    // Print Header
    printSectionName: document.getElementById('print-section-name'),
    printDate: document.getElementById('print-date'),
  };

  // Toast Notification System
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(6px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 260);
    }, 2800);
  }

  // Multi-Section Tab Rendering
  function renderSectionTabs() {
    if (!els.sectionTabsList) return;
    els.sectionTabsList.innerHTML = '';

    const sections = window.StorageManager.getSections();
    const activeSec = window.StorageManager.getActiveSection();

    sections.forEach((sec) => {
      const tab = document.createElement('div');
      const isActive = activeSec && activeSec.id === sec.id;
      tab.className = `section-tab ${isActive ? 'active' : ''}`;
      tab.dataset.sectionId = sec.id;

      tab.innerHTML = `
        <span class="tab-label">${escapeHtml(sec.name)}</span>
        <span class="tab-count">${sec.groups ? sec.groups.length : 0}</span>
        <div class="tab-actions">
          <button class="tab-opt-btn btn-rename-tab" title="Rename section">✏️</button>
          ${sections.length > 1 ? '<button class="tab-opt-btn btn-del-tab danger" title="Delete section">&times;</button>' : ''}
        </div>
      `;

      // Click to switch section
      tab.addEventListener('click', (e) => {
        if (e.target.closest('.tab-actions')) return;
        if (sec.id !== activeSec.id) {
          window.StorageManager.setActiveSection(sec.id);
          window.StudentRoster.clearSelection();
          refreshAll();
          showToast(`Switched to ${sec.name}`, 'info');
        }
      });

      // Rename section
      const renameBtn = tab.querySelector('.btn-rename-tab');
      if (renameBtn) {
        renameBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const newName = prompt(`Enter new name for "${sec.name}":`, sec.name);
          if (newName && newName.trim()) {
            window.StorageManager.renameSection(sec.id, newName.trim());
            renderSectionTabs();
            updatePrintHeader();
            showToast('Section renamed', 'success');
          }
        });
      }

      // Delete section
      const delBtn = tab.querySelector('.btn-del-tab');
      if (delBtn) {
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const confirmed = confirm(`Are you sure you want to delete "${sec.name}" and all its records?`);
          if (confirmed) {
            const res = window.StorageManager.deleteSection(sec.id);
            if (res.success) {
              refreshAll();
              showToast('Section removed', 'info');
            } else {
              showToast(res.message, 'error');
            }
          }
        });
      }

      els.sectionTabsList.appendChild(tab);
    });

    updatePrintHeader();
  }

  // Add new section
  function handleAddSection() {
    const name = prompt('Enter name for the new section (e.g. "Section B" or "CSE-02"):');
    if (name !== null) {
      const newSec = window.StorageManager.addSection(name.trim());
      window.StudentRoster.clearSelection();
      refreshAll();
      showToast(`Created ${newSec.name}`, 'success');
    }
  }

  // Update Metrics
  function updateMetrics() {
    const students = window.StorageManager.getStudents();
    const groups = window.StorageManager.getGroups();

    const totalStudents = students.length;
    const unassigned = students.filter((s) => !s.groupId).length;
    const totalGroups = groups.length;
    const totalReviews = groups.reduce((acc, g) => acc + (g.reviewCount || 0), 0);

    if (els.statStudents) els.statStudents.textContent = totalStudents;
    if (els.statUnassigned) els.statUnassigned.textContent = unassigned;
    if (els.statGroups) els.statGroups.textContent = totalGroups;
    if (els.statReviews) els.statReviews.textContent = totalReviews;
  }

  function updatePrintHeader() {
    const sec = window.StorageManager.getActiveSection();
    if (els.printSectionName && sec) {
      els.printSectionName.textContent = sec.name;
    }
    if (els.printDate) {
      els.printDate.textContent = new Date().toLocaleDateString();
    }
  }

  // Refresh entire UI
  function refreshAll() {
    renderSectionTabs();
    window.StudentRoster.render();
    window.GroupEngine.render();
    updateMetrics();
  }
  window.refreshAllData = refreshAll;

  // Load realistic sample data into active section
  function loadSampleData() {
    const samples = [
      { roll: 'CS201', name: 'Aarav Sharma', dept: 'Computer Science' },
      { roll: 'CS202', name: 'Priya Patel', dept: 'Computer Science' },
      { roll: 'CS203', name: 'Rohan Verma', dept: 'Computer Science' },
      { roll: 'CS204', name: 'Ananya Iyer', dept: 'Computer Science' },
      { roll: 'CS205', name: 'Vikram Singh', dept: 'Computer Science' },
      { roll: 'CS206', name: 'Sneha Reddy', dept: 'Computer Science' },
      { roll: 'CS207', name: 'Aditya Roy', dept: 'Computer Science' },
      { roll: 'CS208', name: 'Ishita Sen', dept: 'Computer Science' },
      { roll: 'CS209', name: 'Kabir Mehta', dept: 'Computer Science' },
      { roll: 'CS210', name: 'Diya Nair', dept: 'Computer Science' },
      { roll: 'CS211', name: 'Arjun Das', dept: 'Computer Science' },
      { roll: 'CS212', name: 'Meera Joshi', dept: 'Computer Science' },
    ];

    const added = window.StorageManager.addStudents(samples);

    // If no groups exist in active section, form an initial demo group
    const groups = window.StorageManager.getGroups();
    const students = window.StorageManager.getStudents();
    if (groups.length === 0 && students.length >= 3) {
      const demoMembers = students.slice(0, 3);
      window.StorageManager.saveGroup({
        name: 'Group 01',
        projectTitle: 'Smart Campus Navigation System',
        projectIdea: 'AR mobile interface to help visitors and freshmen locate labs, classrooms and facilities.',
        status: 'In Progress',
        score: '88/100',
        nextDeadline: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        memberIds: demoMembers.map((m) => m.id),
        reviewCount: 2,
        reviews: [
          {
            id: 'rev_1',
            date: new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0],
            notes: 'Project abstract approved. Advised to focus on indoor beacon positioning.',
            status: 'Approved',
          },
          {
            id: 'rev_2',
            date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
            notes: 'Demonstrated Figma prototype and campus map schema. On track.',
            status: 'In Progress',
          },
        ],
      });
    }

    refreshAll();
    showToast(`Loaded ${added} sample students into this section`, 'success');
  }

  // Event Handlers
  function initEvents() {
    // Add section
    if (els.btnAddSection) {
      els.btnAddSection.addEventListener('click', handleAddSection);
    }

    // Sheet Upload trigger
    if (els.btnUpload && els.fileInput) {
      els.btnUpload.addEventListener('click', () => els.fileInput.click());
      els.fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          window.SheetMapper.processFile(file, (addedCount, totalCount) => {
            refreshAll();
            showToast(`Imported ${addedCount} new students (${totalCount} in file)`, 'success');
          });
        }
        e.target.value = '';
      });
    }

    // Sample data button
    if (els.btnSampleData) {
      els.btnSampleData.addEventListener('click', loadSampleData);
    }

    // Data dropdown toggle
    if (els.btnDataMenu && els.dataDropdown) {
      els.btnDataMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        els.btnDataMenu.parentElement.classList.toggle('open');
      });

      document.addEventListener('click', (e) => {
        if (!els.dataDropdown.contains(e.target) && e.target !== els.btnDataMenu) {
          els.btnDataMenu.parentElement.classList.remove('open');
        }
      });
    }

    // Clear active section
    if (els.btnClearSection) {
      els.btnClearSection.addEventListener('click', () => {
        const sec = window.StorageManager.getActiveSection();
        if (confirm(`Clear all students and project groups in "${sec.name}"?`)) {
          window.StorageManager.clearActiveSectionData();
          window.StudentRoster.clearSelection();
          refreshAll();
          showToast(`Cleared data for ${sec.name}`, 'info');
        }
      });
    }

    // Link Group Creation Trigger to GroupEngine
    window.StudentRoster.setOnCreateGroup((selectedIds) => {
      window.GroupEngine.openGroupModal(null, selectedIds);
    });

    // Notify data changed
    window.GroupEngine.setOnDataChanged(() => {
      window.StudentRoster.render();
      updateMetrics();
      renderSectionTabs();
    });

    // Keyboard ESC listener
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        window.SheetMapper.hide();
        window.GroupEngine.hideGroupModal();
        window.GroupEngine.hideReviewModal();
        window.GroupEngine.hideHistoryModal();
      }
    });

    // Window Drag & Drop for Excel / CSV
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', (e) => {
      e.preventDefault();
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        window.SheetMapper.processFile(e.dataTransfer.files[0], (addedCount, totalCount) => {
          refreshAll();
          showToast(`Imported ${addedCount} new students`, 'success');
        });
      }
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // App Initialization
  function init() {
    initEvents();
    refreshAll();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
