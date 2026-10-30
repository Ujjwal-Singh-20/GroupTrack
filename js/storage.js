/**
 * GroupTrack - Storage & Multi-Section State Engine
 * Modules:
 *  - Multi-section schema management (Section A, Section B, etc.)
 *  - Isolated student rosters & group datasets per section
 *  - Auto-persistence with LocalStorage and schema migration
 *  - JSON backup and restore pipelines
 */

(function (window) {
  'use strict';

  const STORAGE_KEY = 'grouptrack_multisection_v2';

  // Default initial section structure
  function createDefaultState() {
    const defaultSecId = 'sec_' + Date.now();
    return {
      version: 2,
      activeSectionId: defaultSecId,
      sections: [
        {
          id: defaultSecId,
          name: 'Section A',
          createdAt: new Date().toISOString(),
          students: [],
          groups: [],
        },
      ],
    };
  }

  class StorageManager {
    constructor() {
      this.state = this.load();
    }

    // Load from LocalStorage or initialize
    load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return createDefaultState();
        const parsed = JSON.parse(raw);
        if (!parsed.sections || !Array.isArray(parsed.sections) || parsed.sections.length === 0) {
          return createDefaultState();
        }
        if (!parsed.activeSectionId || !parsed.sections.some((s) => s.id === parsed.activeSectionId)) {
          parsed.activeSectionId = parsed.sections[0].id;
        }
        return parsed;
      } catch (err) {
        console.error('[StorageManager] Failed to parse local storage, resetting to default.', err);
        return createDefaultState();
      }
    }

    // Save current state
    save() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      } catch (err) {
        console.error('[StorageManager] Failed to write to localStorage:', err);
      }
    }

    // --- Section Management ---
    getSections() {
      return this.state.sections;
    }

    getActiveSection() {
      let sec = this.state.sections.find((s) => s.id === this.state.activeSectionId);
      if (!sec) {
        sec = this.state.sections[0];
        this.state.activeSectionId = sec ? sec.id : null;
      }
      return sec;
    }

    setActiveSection(sectionId) {
      if (this.state.sections.some((s) => s.id === sectionId)) {
        this.state.activeSectionId = sectionId;
        this.save();
        return true;
      }
      return false;
    }

    addSection(name) {
      const cleanName = (name || '').trim() || `Section ${String.fromCharCode(65 + this.state.sections.length)}`;
      const newSec = {
        id: 'sec_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        name: cleanName,
        createdAt: new Date().toISOString(),
        students: [],
        groups: [],
      };
      this.state.sections.push(newSec);
      this.state.activeSectionId = newSec.id;
      this.save();
      return newSec;
    }

    renameSection(sectionId, newName) {
      const sec = this.state.sections.find((s) => s.id === sectionId);
      if (!sec) return false;
      sec.name = (newName || '').trim() || sec.name;
      this.save();
      return true;
    }

    deleteSection(sectionId) {
      if (this.state.sections.length <= 1) {
        return { success: false, message: 'You must have at least one section.' };
      }
      this.state.sections = this.state.sections.filter((s) => s.id !== sectionId);
      if (this.state.activeSectionId === sectionId) {
        this.state.activeSectionId = this.state.sections[0].id;
      }
      this.save();
      return { success: true };
    }

    // --- Student Management (Scoped to Active Section) ---
    getStudents() {
      const sec = this.getActiveSection();
      return sec ? sec.students : [];
    }

    addStudents(studentList) {
      const sec = this.getActiveSection();
      if (!sec) return 0;

      const existingRolls = new Set(sec.students.map((s) => String(s.roll || '').trim().toLowerCase()));
      let added = 0;

      studentList.forEach((stu) => {
        const rollKey = String(stu.roll || '').trim().toLowerCase();
        if (rollKey && !existingRolls.has(rollKey)) {
          existingRolls.add(rollKey);
          sec.students.push({
            id: 'stu_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
            roll: String(stu.roll || '').trim(),
            name: String(stu.name || '').trim(),
            email: String(stu.email || '').trim(),
            dept: String(stu.dept || '').trim(),
            groupId: null,
          });
          added++;
        }
      });

      this.save();
      return added;
    }

    setStudentGroup(studentId, groupId) {
      const sec = this.getActiveSection();
      if (!sec) return;
      const s = sec.students.find((stu) => stu.id === studentId);
      if (s) {
        s.groupId = groupId;
        this.save();
      }
    }

    // --- Group Management (Scoped to Active Section) ---
    getGroups() {
      const sec = this.getActiveSection();
      return sec ? sec.groups : [];
    }

    saveGroup(groupData) {
      const sec = this.getActiveSection();
      if (!sec) return null;

      if (groupData.id) {
        // Update existing group
        const existingIdx = sec.groups.findIndex((g) => g.id === groupData.id);
        if (existingIdx !== -1) {
          const oldGroup = sec.groups[existingIdx];

          // Unassign students removed from this group
          (oldGroup.memberIds || []).forEach((oldId) => {
            if (!groupData.memberIds.includes(oldId)) {
              const stu = sec.students.find((s) => s.id === oldId);
              if (stu) stu.groupId = null;
            }
          });

          // Assign students added to this group
          groupData.memberIds.forEach((newId) => {
            const stu = sec.students.find((s) => s.id === newId);
            if (stu) stu.groupId = groupData.id;
          });

          sec.groups[existingIdx] = {
            ...oldGroup,
            ...groupData,
            updatedAt: new Date().toISOString(),
          };
          this.save();
          return sec.groups[existingIdx];
        }
      }

      // Create brand new group
      const newGroupId = 'grp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
      const newGroup = {
        id: newGroupId,
        name: groupData.name || `Group ${sec.groups.length + 1}`,
        projectTitle: groupData.projectTitle || 'Untitled Project',
        projectIdea: groupData.projectIdea || '',
        status: groupData.status || 'Ideation',
        score: groupData.score || '',
        nextDeadline: groupData.nextDeadline || '',
        memberIds: groupData.memberIds || [],
        reviewCount: groupData.reviewCount || 0,
        reviews: groupData.reviews || [],
        createdAt: new Date().toISOString(),
      };

      // Mark assigned students
      newGroup.memberIds.forEach((mId) => {
        const stu = sec.students.find((s) => s.id === mId);
        if (stu) stu.groupId = newGroupId;
      });

      sec.groups.push(newGroup);
      this.save();
      return newGroup;
    }

    deleteGroup(groupId) {
      const sec = this.getActiveSection();
      if (!sec) return false;

      const group = sec.groups.find((g) => g.id === groupId);
      if (!group) return false;

      // Free members
      (group.memberIds || []).forEach((mId) => {
        const stu = sec.students.find((s) => s.id === mId);
        if (stu) stu.groupId = null;
      });

      sec.groups = sec.groups.filter((g) => g.id !== groupId);
      this.save();
      return true;
    }

    // --- Review Check-In Management ---
    addReview(groupId, reviewEntry) {
      const sec = this.getActiveSection();
      if (!sec) return null;

      const group = sec.groups.find((g) => g.id === groupId);
      if (!group) return null;

      if (!group.reviews) group.reviews = [];

      const newReview = {
        id: 'rev_' + Date.now(),
        date: reviewEntry.date || new Date().toISOString().split('T')[0],
        notes: (reviewEntry.notes || '').trim(),
        status: reviewEntry.status || group.status,
      };

      group.reviews.push(newReview);
      group.reviewCount = group.reviews.length;
      if (reviewEntry.status) {
        group.status = reviewEntry.status;
      }

      this.save();
      return newReview;
    }

    stepReviewCount(groupId, delta) {
      const sec = this.getActiveSection();
      if (!sec) return 0;

      const group = sec.groups.find((g) => g.id === groupId);
      if (!group) return 0;

      const current = group.reviewCount || 0;
      const next = Math.max(0, current + delta);
      group.reviewCount = next;

      if (delta > 0) {
        if (!group.reviews) group.reviews = [];
        group.reviews.push({
          id: 'rev_' + Date.now(),
          date: new Date().toISOString().split('T')[0],
          notes: `Quick check-in tally (Count: ${next})`,
          status: group.status,
        });
      }

      this.save();
      return next;
    }

    // --- Backup & Restore ---
    getFullBackup() {
      return {
        ...this.state,
        exportedAt: new Date().toISOString(),
      };
    }

    restoreFullBackup(data) {
      if (!data || !Array.isArray(data.sections) || data.sections.length === 0) {
        throw new Error('Invalid backup schema');
      }
      this.state = data;
      this.save();
    }

    clearActiveSectionData() {
      const sec = this.getActiveSection();
      if (sec) {
        sec.students = [];
        sec.groups = [];
        this.save();
      }
    }
  }

  // Expose globally
  window.StorageManager = new StorageManager();
})(window);
