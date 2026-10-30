/**
 * GroupTrack - Export, Reporting & Print Generator
 * Modules:
 *  - Generates comprehensive Group Status CSV matrices (for faculty submission)
 *  - Full JSON backup & restore pipelines
 *  - Print Summary View formatting and printing
 */

(function (window) {
  'use strict';

  class ExportManager {
    constructor() {
      this.initDom();
    }

    initDom() {
      this.btnExportCsv = document.getElementById('btn-export-csv');
      this.btnExportAllCsv = document.getElementById('btn-export-all-csv');
      this.btnExportJson = document.getElementById('btn-export-json');
      this.btnImportJson = document.getElementById('btn-import-json-trigger');
      this.jsonFileInput = document.getElementById('json-file-input');
      this.btnPrintSummary = document.getElementById('btn-print-summary');

      if (this.btnExportCsv) {
        this.btnExportCsv.addEventListener('click', () => this.exportCurrentSectionCsv());
      }
      if (this.btnExportAllCsv) {
        this.btnExportAllCsv.addEventListener('click', () => this.exportAllSectionsCsv());
      }
      if (this.btnExportJson) {
        this.btnExportJson.addEventListener('click', () => this.exportBackupJson());
      }
      if (this.btnImportJson && this.jsonFileInput) {
        this.btnImportJson.addEventListener('click', () => this.jsonFileInput.click());
        this.jsonFileInput.addEventListener('change', (e) => this.handleRestoreJson(e));
      }
      if (this.btnPrintSummary) {
        this.btnPrintSummary.addEventListener('click', () => this.triggerPrintReport());
      }
    }

    // Export active section to CSV
    exportCurrentSectionCsv() {
      const sec = window.StorageManager.getActiveSection();
      if (!sec || sec.groups.length === 0) {
        alert('No project groups available in this section to export.');
        return;
      }

      this.downloadCsvForSections([sec], `${sec.name.replace(/\s+/g, '_')}_Groups_Status.csv`);
    }

    // Export all sections to CSV
    exportAllSectionsCsv() {
      const sections = window.StorageManager.getSections();
      if (!sections || sections.every((s) => s.groups.length === 0)) {
        alert('No project groups found across any section to export.');
        return;
      }

      this.downloadCsvForSections(sections, `All_Sections_Groups_Status_${new Date().toISOString().split('T')[0]}.csv`);
    }

    downloadCsvForSections(sections, filename) {
      const rows = [
        [
          'Section',
          'Group Name',
          'Status',
          'Project Title',
          'Project Idea',
          'Reviews Count',
          'Score/Grade',
          'Next Milestone Date',
          'Members (Roll & Name)',
          'Last Review Date',
          'Last Review Feedback',
        ],
      ];

      sections.forEach((sec) => {
        const studentMap = new Map();
        sec.students.forEach((s) => studentMap.set(s.id, s));

        sec.groups.forEach((g) => {
          const membersStr = (g.memberIds || [])
            .map((id) => {
              const s = studentMap.get(id);
              return s ? `${s.roll} - ${s.name}` : '';
            })
            .filter(Boolean)
            .join('; ');

          let lastDate = '';
          let lastNotes = '';
          if (g.reviews && g.reviews.length > 0) {
            const latest = g.reviews[g.reviews.length - 1];
            lastDate = latest.date || '';
            lastNotes = latest.notes || '';
          }

          rows.push([
            sec.name,
            g.name,
            g.status || 'Ideation',
            g.projectTitle || 'Untitled Project',
            g.projectIdea || '',
            g.reviewCount || 0,
            g.score || 'N/A',
            g.nextDeadline || '',
            membersStr,
            lastDate,
            lastNotes,
          ]);
        });
      });

      const csvContent = rows
        .map((row) =>
          row
            .map((cell) => {
              const str = String(cell !== undefined && cell !== null ? cell : '');
              return `"${str.replace(/"/g, '""')}"`;
            })
            .join(',')
        )
        .join('\r\n');

      this.downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
    }

    // Full JSON Backup
    exportBackupJson() {
      const backup = window.StorageManager.getFullBackup();
      const jsonStr = JSON.stringify(backup, null, 2);
      const filename = `grouptrack_full_backup_${new Date().toISOString().split('T')[0]}.json`;
      this.downloadFile(jsonStr, filename, 'application/json');
    }

    handleRestoreJson(e) {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const parsed = JSON.parse(evt.target.result);
          window.StorageManager.restoreFullBackup(parsed);
          alert('Full backup restored successfully!');
          window.location.reload();
        } catch (err) {
          console.error('[ExportManager] Restore error:', err);
          alert('Failed to restore backup: Invalid JSON format.');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    }

    // Printable status view
    triggerPrintReport() {
      window.print();
    }

    downloadFile(content, fileName, mimeType) {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }

  window.ExportManager = new ExportManager();
})(window);
