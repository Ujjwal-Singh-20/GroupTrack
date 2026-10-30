/**
 * GroupTrack - Storage & Multi-Section State Engine
 * Modules:
 *  - Multi-section schema management (Section A, Section B, etc.)
 *  - Triple-Tier Persistence:
 *      1. Direct Hard-Drive Disk Storage (%APPDATA%\GroupTrack\database.json) via Python Bridge
 *      2. LocalStorage (Dual-Key Migration)
 *      3. IndexedDB (Persistent Database Mirror)
 *  - Backward compatibility auto-migration from previous versions
 *  - JSON backup and restore pipelines
 */

(function (window) {
  'use strict';

  const STORAGE_KEY_V2 = 'grouptrack_multisection_v2';
  const STORAGE_KEY_V1 = 'group_track_data_v1';
  const DB_NAME = 'GroupTrackDB';
  const DB_STORE = 'app_state';

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
      this.initIndexedDB();
      this.initDesktopBridge();
    }

    // Connect to Python Desktop App Disk Bridge
    initDesktopBridge() {
      const syncWithDisk = async () => {
        if (window.pywebview && window.pywebview.api && window.pywebview.api.load_from_disk) {
          try {
            const diskJson = await window.pywebview.api.load_from_disk();
            if (diskJson) {
              const parsed = JSON.parse(diskJson);
              if (parsed && Array.isArray(parsed.sections) && parsed.sections.length > 0) {
                this.state = parsed;
                this.saveDirect(this.state);
                // Trigger full UI refresh
                if (typeof window.refreshAllData === 'function') {
                  window.refreshAllData();
                } else {
                  if (window.StudentRoster) window.StudentRoster.render();
                  if (window.GroupEngine) window.GroupEngine.render();
                }
                return;
              }
            }
            // If disk file doesn't exist yet, save initial state to disk
            this.save();
          } catch (e) {
            console.warn('[StorageManager] Desktop bridge load error:', e);
          }
        }
      };

      if (window.pywebview) {
        syncWithDisk();
      } else {
        window.addEventListener('pywebviewready', syncWithDisk);
      }
    }

    // Load from LocalStorage with backward compatibility migration
    load() {
      try {
        // 1. Try V2 multi-section key
        const rawV2 = localStorage.getItem(STORAGE_KEY_V2);
        if (rawV2) {
          const parsed = JSON.parse(rawV2);
          if (parsed && Array.isArray(parsed.sections) && parsed.sections.length > 0) {
            if (!parsed.activeSectionId || !parsed.sections.some((s) => s.id === parsed.activeSectionId)) {
              parsed.activeSectionId = parsed.sections[0].id;
            }
            return parsed;
          }
          if (parsed && (Array.isArray(parsed.students) || Array.isArray(parsed.groups))) {
            return this.migrateFromV1(parsed);
          }
        }

        // 2. Try V1 flat key (backward compatibility with earlier version)
        const rawV1 = localStorage.getItem(STORAGE_KEY_V1);
        if (rawV1) {
          const parsedV1 = JSON.parse(rawV1);
          if (parsedV1 && (Array.isArray(parsedV1.students) || Array.isArray(parsedV1.groups))) {
            const migrated = this.migrateFromV1(parsedV1);
            this.saveDirect(migrated);
            return migrated;
          }
        }

        return createDefaultState();
      } catch (err) {
        console.error('[StorageManager] Failed to read from localStorage:', err);
        return createDefaultState();
      }
    }

    migrateFromV1(v1Data) {
      const defaultSecId = 'sec_' + Date.now();
      const students = Array.isArray(v1Data.students) ? v1Data.students : [];
      const groups = Array.isArray(v1Data.groups) ? v1Data.groups : [];

      return {
        version: 2,
        activeSectionId: defaultSecId,
        sections: [
          {
            id: defaultSecId,
            name: 'Section A',
            createdAt: new Date().toISOString(),
            students: students,
            groups: groups,
          },
        ],
      };
    }

    saveDirect(dataState) {
      try {
        const json = JSON.stringify(dataState);
        localStorage.setItem(STORAGE_KEY_V2, json);

        const sec = dataState.sections && dataState.sections[0];
        if (sec) {
          localStorage.setItem(
            STORAGE_KEY_V1,
            JSON.stringify({
              students: sec.students || [],
              groups: sec.groups || [],
              lastSaved: new Date().toISOString(),
            })
          );
        }
      } catch (e) {
        console.error('[StorageManager] saveDirect error:', e);
      }
    }

    // Save current state (Writes to LocalStorage, IndexedDB, and Native Hard Drive)
    save() {
      try {
        this.saveDirect(this.state);
        this.persistToIndexedDB(this.state);

        // Native Hard Drive persistence via Python bridge
        if (window.pywebview && window.pywebview.api && window.pywebview.api.save_to_disk) {
          window.pywebview.api.save_to_disk(JSON.stringify(this.state, null, 2));
        }
      } catch (err) {
        console.error('[StorageManager] Failed to write to storage:', err);
      }
    }

    // --- IndexedDB Mirroring ---
    initIndexedDB() {
      if (!window.indexedDB) return;
      try {
        const req = window.indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(DB_STORE)) {
            db.createObjectStore(DB_STORE);
          }
        };
        req.onsuccess = (e) => {
          this.idb = e.target.result;
          this.checkIndexedDBFallback();
        };
      } catch (err) {
        console.warn('[StorageManager] IndexedDB not available:', err);
      }
    }

    persistToIndexedDB(stateObj) {
      if (!this.idb) return;
      try {
        const tx = this.idb.transaction(DB_STORE, 'readwrite');
        const store = tx.objectStore(DB_STORE);
        store.put(stateObj, 'current_state');
      } catch (e) {
        console.warn('[StorageManager] IndexedDB put error:', e);
      }
    }

    checkIndexedDBFallback() {
      if (!this.idb) return;
      try {
        const tx = this.idb.transaction(DB_STORE, 'readonly');
        const store = tx.objectStore(DB_STORE);
        const req = store.get('current_state');
        req.onsuccess = () => {
          const dbState = req.result;
          const activeSec = this.getActiveSection();
          const isLocalStorageEmpty =
            !activeSec || (activeSec.students.length === 0 && activeSec.groups.length === 0);

          if (dbState && Array.isArray(dbState.sections) && isLocalStorageEmpty) {
            console.log('[StorageManager] Restored data from IndexedDB mirror.');
            this.state = dbState;
            this.saveDirect(this.state);
            if (typeof window.refreshAllData === 'function') {
              window.refreshAllData();
            } else {
              if (window.StudentRoster) window.StudentRoster.render();
              if (window.GroupEngine) window.GroupEngine.render();
            }
          }
        };
      } catch (e) {
        console.warn('[StorageManager] checkIndexedDBFallback error:', e);
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

    addSingleStudent(studentData) {
      const sec = this.getActiveSection();
      if (!sec) return { success: false, message: 'No active section' };

      const roll = String(studentData.roll || '').trim();
      const name = String(studentData.name || '').trim();
      if (!roll || !name) {
        return { success: false, message: 'Roll number and student name are required' };
      }

      const rollKey = roll.toLowerCase();
      const exists = sec.students.some((s) => String(s.roll || '').trim().toLowerCase() === rollKey);
      if (exists) {
        return { success: false, message: `Roll number "${roll}" already exists in this section` };
      }

      const newStudent = {
        id: 'stu_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        roll: roll,
        name: name,
        email: String(studentData.email || '').trim(),
        dept: String(studentData.dept || '').trim(),
        groupId: null,
      };

      sec.students.push(newStudent);
      this.save();
      return { success: true, student: newStudent };
    }

    updateStudent(studentId, updatedData) {
      const sec = this.getActiveSection();
      if (!sec) return { success: false, message: 'No active section' };

      const stu = sec.students.find((s) => s.id === studentId);
      if (!stu) return { success: false, message: 'Student not found' };

      const newRoll = String(updatedData.roll || '').trim();
      const newName = String(updatedData.name || '').trim();
      if (!newRoll || !newName) {
        return { success: false, message: 'Roll number and student name are required' };
      }

      const rollKey = newRoll.toLowerCase();
      const duplicate = sec.students.some(
        (s) => s.id !== studentId && String(s.roll || '').trim().toLowerCase() === rollKey
      );
      if (duplicate) {
        return { success: false, message: `Another student already has roll number "${newRoll}"` };
      }

      stu.roll = newRoll;
      stu.name = newName;
      if (updatedData.email !== undefined) stu.email = String(updatedData.email || '').trim();
      if (updatedData.dept !== undefined) stu.dept = String(updatedData.dept || '').trim();

      this.save();
      return { success: true, student: stu };
    }

    deleteStudent(studentId) {
      const sec = this.getActiveSection();
      if (!sec) return { success: false, message: 'No active section' };

      const stuIdx = sec.students.findIndex((s) => s.id === studentId);
      if (stuIdx === -1) return { success: false, message: 'Student not found' };

      const stu = sec.students[stuIdx];

      // If student was assigned to a group, remove from group's memberIds
      if (stu.groupId) {
        const grp = sec.groups.find((g) => g.id === stu.groupId);
        if (grp && Array.isArray(grp.memberIds)) {
          grp.memberIds = grp.memberIds.filter((id) => id !== studentId);
        }
      }

      sec.students.splice(stuIdx, 1);
      this.save();
      return { success: true };
    }

    // --- Group Management (Scoped to Active Section) ---
    getGroups() {
      const sec = this.getActiveSection();
      return sec ? sec.groups : [];
    }

    saveGroup(groupData) {
      const sec = this.getActiveSection();
      if (!sec) return null;

      const memberIds = Array.isArray(groupData.memberIds) ? groupData.memberIds : [];

      if (groupData.id) {
        // Update existing group
        const existingIdx = sec.groups.findIndex((g) => g.id === groupData.id);
        if (existingIdx !== -1) {
          const oldGroup = sec.groups[existingIdx];
          const oldMembers = Array.isArray(oldGroup.memberIds) ? oldGroup.memberIds : [];

          // Unassign students removed from this group
          oldMembers.forEach((oldId) => {
            if (!memberIds.includes(oldId)) {
              const stu = sec.students.find((s) => s.id === oldId);
              if (stu) stu.groupId = null;
            }
          });

          // Assign students added to this group
          memberIds.forEach((newId) => {
            const stu = sec.students.find((s) => s.id === newId);
            if (stu) stu.groupId = groupData.id;
          });

          sec.groups[existingIdx] = {
            ...oldGroup,
            ...groupData,
            memberIds: memberIds,
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
        memberIds: memberIds,
        reviewCount: groupData.reviewCount || 0,
        reviews: groupData.reviews || [],
        createdAt: new Date().toISOString(),
      };

      // Mark assigned students
      memberIds.forEach((mId) => {
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
