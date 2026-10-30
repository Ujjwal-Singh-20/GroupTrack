/**
 * GroupTrack - Dynamic Sheet Ingestion & Column Mapper
 * Modules:
 *  - Parses Excel (.xlsx, .xls) and CSV spreadsheets safely
 *  - Opens a Dynamic Column Mapper modal when non-standard or unknown columns are uploaded
 *  - Previews sample rows so the faculty can confirm which column is Roll No, Name, etc.
 *  - Sanitizes and pushes mapped student records into active section
 */

(function (window) {
  'use strict';

  class SheetMapper {
    constructor() {
      this.rawRows = [];
      this.fileName = '';
      this.onSuccessCallback = null;

      this.initDom();
    }

    initDom() {
      this.modal = document.getElementById('modal-mapper');
      this.modalClose = document.getElementById('modal-mapper-close');
      this.btnCancel = document.getElementById('btn-mapper-cancel');
      this.btnConfirm = document.getElementById('btn-mapper-confirm');

      this.previewTable = document.getElementById('mapper-preview-table');
      this.fileInfo = document.getElementById('mapper-file-info');

      this.selectRoll = document.getElementById('mapper-select-roll');
      this.selectName = document.getElementById('mapper-select-name');
      this.selectEmail = document.getElementById('mapper-select-email');
      this.selectDept = document.getElementById('mapper-select-dept');

      if (this.modalClose) {
        this.modalClose.addEventListener('click', () => this.hide());
      }
      if (this.btnCancel) {
        this.btnCancel.addEventListener('click', () => this.hide());
      }
      if (this.btnConfirm) {
        this.btnConfirm.addEventListener('click', () => this.executeImport());
      }
    }

    // Main entry point when a file is chosen
    processFile(file, onSuccess) {
      if (!file) return;
      this.fileName = file.name;
      this.onSuccessCallback = onSuccess;

      const ext = file.name.split('.').pop().toLowerCase();
      const reader = new FileReader();

      if (ext === 'xlsx' || ext === 'xls') {
        reader.onload = (e) => {
          try {
            if (typeof XLSX === 'undefined') {
              alert('Excel parser library is not loaded. Please try uploading a CSV file.');
              return;
            }
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            this.handleParsedRows(jsonRows);
          } catch (err) {
            console.error('[SheetMapper] Excel parsing error:', err);
            alert('Failed to parse Excel file: ' + err.message);
          }
        };
        reader.readAsArrayBuffer(file);
      } else if (ext === 'csv') {
        reader.onload = (e) => {
          try {
            const text = e.target.result;
            if (typeof XLSX !== 'undefined') {
              const workbook = XLSX.read(text, { type: 'string' });
              const sheet = workbook.Sheets[workbook.SheetNames[0]];
              const jsonRows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
              this.handleParsedRows(jsonRows);
            } else {
              const rows = this.parseCSVFallback(text);
              this.handleParsedRows(rows);
            }
          } catch (err) {
            console.error('[SheetMapper] CSV parsing error:', err);
            alert('Failed to parse CSV file: ' + err.message);
          }
        };
        reader.readAsText(file);
      } else {
        alert('Unsupported file format. Please upload an Excel (.xlsx, .xls) or .csv file.');
      }
    }

    parseCSVFallback(text) {
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      return lines.map((line) => {
        const row = [];
        let inQuotes = false;
        let token = '';
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') inQuotes = !inQuotes;
          else if (char === ',' && !inQuotes) {
            row.push(token.trim());
            token = '';
          } else {
            token += char;
          }
        }
        row.push(token.trim());
        return row;
      });
    }

    handleParsedRows(rows) {
      // Filter out totally empty rows
      this.rawRows = (rows || []).filter((r) => Array.isArray(r) && r.some((c) => String(c || '').trim() !== ''));

      if (this.rawRows.length < 2) {
        alert('The uploaded sheet does not contain enough data rows.');
        return;
      }

      this.openMappingModal();
    }

    openMappingModal() {
      const headers = this.rawRows[0].map((h, idx) => ({
        index: idx,
        label: String(h || '').trim() || `Column ${idx + 1}`,
      }));

      this.fileInfo.textContent = `File: ${this.fileName} (${this.rawRows.length - 1} records detected)`;

      // Populate Dropdowns
      this.populateSelect(this.selectRoll, headers, ['roll', 'reg', 'id', 'uid', 'enroll', 'no'], 0);
      this.populateSelect(this.selectName, headers, ['name', 'student', 'candidate'], 1);
      this.populateSelect(this.selectEmail, headers, ['email', 'mail'], -1, true);
      this.populateSelect(this.selectDept, headers, ['dept', 'department', 'branch', 'section', 'course'], -1, true);

      // Render Preview Table (Top 3 data rows)
      this.renderPreviewTable(headers);

      this.modal.style.display = 'flex';
    }

    populateSelect(selectEl, headers, matchKeywords, fallbackIdx, allowNone = false) {
      selectEl.innerHTML = '';

      if (allowNone) {
        const noneOpt = document.createElement('option');
        noneOpt.value = '-1';
        noneOpt.textContent = '-- None / Skip --';
        selectEl.appendChild(noneOpt);
      }

      let detectedIdx = -1;

      headers.forEach((h) => {
        const opt = document.createElement('option');
        opt.value = h.index;
        opt.textContent = `${h.label} (Col ${h.index + 1})`;
        selectEl.appendChild(opt);

        // Auto-detection match
        const lower = h.label.toLowerCase();
        if (detectedIdx === -1 && matchKeywords.some((kw) => lower.includes(kw))) {
          detectedIdx = h.index;
        }
      });

      if (detectedIdx !== -1) {
        selectEl.value = detectedIdx;
      } else if (fallbackIdx >= 0 && fallbackIdx < headers.length) {
        selectEl.value = fallbackIdx;
      } else if (allowNone) {
        selectEl.value = '-1';
      }
    }

    renderPreviewTable(headers) {
      const thead = this.previewTable.querySelector('thead');
      const tbody = this.previewTable.querySelector('tbody');
      thead.innerHTML = '';
      tbody.innerHTML = '';

      // Header row
      const hRow = document.createElement('tr');
      headers.forEach((h) => {
        const th = document.createElement('th');
        th.textContent = h.label;
        hRow.appendChild(th);
      });
      thead.appendChild(hRow);

      // Top rows (max 3)
      const previewRows = this.rawRows.slice(1, 4);
      previewRows.forEach((row) => {
        const tr = document.createElement('tr');
        headers.forEach((h) => {
          const td = document.createElement('td');
          td.textContent = String(row[h.index] !== undefined ? row[h.index] : '');
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
    }

    executeImport() {
      const rollIdx = parseInt(this.selectRoll.value, 10);
      const nameIdx = parseInt(this.selectName.value, 10);
      const emailIdx = parseInt(this.selectEmail.value, 10);
      const deptIdx = parseInt(this.selectDept.value, 10);

      if (isNaN(rollIdx) || isNaN(nameIdx)) {
        alert('Please map both Roll No and Student Name columns.');
        return;
      }

      if (rollIdx === nameIdx) {
        alert('Roll No and Student Name cannot be the same column.');
        return;
      }

      const students = [];
      for (let i = 1; i < this.rawRows.length; i++) {
        const row = this.rawRows[i];
        if (!row || row.length === 0) continue;

        const rollVal = row[rollIdx] !== undefined ? String(row[rollIdx]).trim() : '';
        const nameVal = row[nameIdx] !== undefined ? String(row[nameIdx]).trim() : '';
        const emailVal = emailIdx >= 0 && row[emailIdx] !== undefined ? String(row[emailIdx]).trim() : '';
        const deptVal = deptIdx >= 0 && row[deptIdx] !== undefined ? String(row[deptIdx]).trim() : '';

        if (nameVal && rollVal) {
          students.push({
            roll: rollVal,
            name: nameVal,
            email: emailVal,
            dept: deptVal,
          });
        }
      }

      if (students.length === 0) {
        alert('No valid student records found with the selected column mapping.');
        return;
      }

      const count = window.StorageManager.addStudents(students);
      this.hide();

      if (typeof this.onSuccessCallback === 'function') {
        this.onSuccessCallback(count, students.length);
      }
    }

    hide() {
      if (this.modal) this.modal.style.display = 'none';
      this.rawRows = [];
    }
  }

  window.SheetMapper = new SheetMapper();
})(window);
