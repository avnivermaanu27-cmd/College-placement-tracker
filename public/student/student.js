(function () {
  const page = document.querySelector('[data-page]');
  if (!page) {
    return;
  }

  document.querySelectorAll('[data-logout]').forEach(button => {
    button.addEventListener('click', window.logout);
  });

  const pageMessage = document.getElementById('page-message');

  async function readResponse(response) {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || 'The request could not be completed.');
    }
    return data;
  }

  function showMessage(text, isError) {
    if (!pageMessage) {
      return;
    }
    pageMessage.textContent = text;
    pageMessage.className = isError ? 'message' : 'message success';
  }

  function formatBranches(value) {
    const branches = typeof value === 'string' ? JSON.parse(value) : value;
    if (!Array.isArray(branches) || branches.some(branch => typeof branch !== 'string')) {
      throw new Error('A drive has invalid eligible branch details.');
    }
    return branches;
  }

  function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? 'Date unavailable'
      : new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(date);
  }

  function addCell(row, value) {
    const cell = document.createElement('td');
    cell.textContent = value === null || value === undefined ? '' : String(value);
    row.appendChild(cell);
    return cell;
  }

  async function loadProfile() {
    return readResponse(await window.apiFetch('/api/students/me')).then(data => data.student);
  }

  async function loadDashboard() {
    try {
      const student = await loadProfile();
      document.getElementById('student-name').textContent = student.name;
      document.getElementById('student-branch').textContent = student.branch;
      document.getElementById('student-cgpa').textContent = Number(student.cgpa).toFixed(2);
      document.getElementById('student-placed').textContent = student.isPlaced ? 'Placed' : 'Not placed';
    } catch (error) {
      showMessage(error.message || 'Could not load your profile.', true);
    }
  }

  async function loadProfileForm() {
    const form = document.getElementById('profile-form');
    try {
      const student = await loadProfile();
      form.elements.name.value = student.name || '';
      form.elements.email.value = student.email || '';
      form.elements.branch.value = student.branch || '';
      form.elements.skills.value = student.skills || '';
      form.elements.cgpa.value = student.cgpa;
    } catch (error) {
      showMessage(error.message || 'Could not load your profile.', true);
      form.querySelector('button[type="submit"]').disabled = true;
    }

    form.addEventListener('submit', async event => {
      event.preventDefault();
      showMessage('', false);
      const button = document.getElementById('save-profile');
      button.disabled = true;
      try {
        const result = await readResponse(await window.apiFetch('/api/students/me', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.elements.name.value.trim(),
            branch: form.elements.branch.value.trim(),
            cgpa: Number(form.elements.cgpa.value),
            skills: form.elements.skills.value.trim()
          })
        }));
        form.elements.name.value = result.student.name;
        form.elements.branch.value = result.student.branch;
        form.elements.skills.value = result.student.skills || '';
        form.elements.cgpa.value = result.student.cgpa;
        showMessage(result.message || 'Profile updated successfully.', false);
      } catch (error) {
        showMessage(error.message || 'Could not update your profile.', true);
      } finally {
        button.disabled = false;
      }
    });
  }

  async function loadDrives() {
    showMessage('', false);
    const table = document.getElementById('drives-table');
    try {
      const drivesRequest = window.apiFetch('/api/drives').then(readResponse);
      const profileRequest = loadProfile();
      const [driveData, student] = await Promise.all([drivesRequest, profileRequest]);
      table.replaceChildren();
      for (const drive of driveData.drives) {
        const branches = formatBranches(drive.eligibleBranches);
        const isEligible = Number(student.cgpa) >= Number(drive.minCgpa) &&
          branches.includes(student.branch);
        const row = document.createElement('tr');
        addCell(row, drive.companyName);
        addCell(row, formatDate(drive.driveDate));
        addCell(row, drive.minCgpa);
        addCell(row, branches.join(', '));
        addCell(row, drive.skills);
        addCell(row, isEligible ? 'Looks eligible' : 'Not eligible');

        const actionCell = document.createElement('td');
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = 'Apply';
        button.setAttribute('aria-label', `Apply to ${drive.companyName}`);
        button.addEventListener('click', () => applyToDrive(drive.driveId, button));
        actionCell.appendChild(button);
        row.appendChild(actionCell);
        table.appendChild(row);
      }
      if (driveData.drives.length === 0) {
        showMessage('There are no placement drives yet.', false);
      }
    } catch (error) {
      showMessage(error.message || 'Could not load placement drives.', true);
    }
  }

  async function applyToDrive(driveId, button) {
    showMessage('', false);
    button.disabled = true;
    try {
      const result = await readResponse(await window.apiFetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driveId })
      }));
      showMessage(result.message || 'Application submitted successfully.', false);
    } catch (error) {
      showMessage(error.message || 'Could not submit your application.', true);
    } finally {
      button.disabled = false;
    }
  }

  async function loadApplications() {
    showMessage('', false);
    const table = document.getElementById('applications-table');
    try {
      const data = await readResponse(await window.apiFetch('/api/applications'));
      table.replaceChildren();
      for (const application of data.applications) {
        const row = document.createElement('tr');
        addCell(row, application.companyName);
        addCell(row, formatDate(application.driveDate));
        addCell(row, formatDate(application.appliedAt));
        addCell(row, application.status);
        table.appendChild(row);
      }
      if (data.applications.length === 0) {
        showMessage('You have not applied to any drives yet.', false);
      }
    } catch (error) {
      showMessage(error.message || 'Could not load your applications.', true);
    }
  }

  if (page.dataset.page === 'dashboard') {
    loadDashboard();
  } else if (page.dataset.page === 'profile') {
    loadProfileForm();
  } else if (page.dataset.page === 'drives') {
    document.getElementById('refresh-drives').addEventListener('click', loadDrives);
    loadDrives();
  } else if (page.dataset.page === 'applications') {
    document.getElementById('refresh-applications').addEventListener('click', loadApplications);
    loadApplications();
  }
})();
