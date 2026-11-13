(function () {
  const page = document.querySelector('[data-page]');
  if (!page) {
    return;
  }

  const seededCompanyId = 1;
  const statuses = ['Shortlisted', 'Selected', 'Rejected'];
  const pageMessage = document.getElementById('page-message');

  document.querySelectorAll('[data-logout]').forEach(button => {
    button.addEventListener('click', window.logout);
  });

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

  function addCell(row, value) {
    const cell = document.createElement('td');
    cell.textContent = value === null || value === undefined ? '' : String(value);
    row.appendChild(cell);
    return cell;
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

  function formatBranches(value) {
    const branches = typeof value === 'string' ? JSON.parse(value) : value;
    if (!Array.isArray(branches) || branches.some(branch => typeof branch !== 'string')) {
      throw new Error('A drive has invalid eligible branch details.');
    }
    return branches.join(', ');
  }

  async function fetchCompanyDrives() {
    const data = await readResponse(await window.apiFetch('/api/drives'));
    return data.drives.filter(drive => Number(drive.companyId) === seededCompanyId);
  }

  async function loadDashboard() {
    showMessage('', false);
    try {
      const companyRequest = window.apiFetch(`/api/companies/${seededCompanyId}`).then(readResponse);
      const drivesRequest = fetchCompanyDrives();
      const applicationsRequest = window.apiFetch('/api/applications').then(readResponse);
      const [companyData, drives, applicationData] = await Promise.all([
        companyRequest,
        drivesRequest,
        applicationsRequest
      ]);
      document.getElementById('company-name').textContent = companyData.company.name;
      document.getElementById('drive-count').textContent = drives.length;
      document.getElementById('application-count').textContent = applicationData.applications.length;
    } catch (error) {
      showMessage(error.message || 'Could not load the company dashboard.', true);
    }
  }

  async function loadDrives() {
    showMessage('', false);
    const table = document.getElementById('drives-table');
    try {
      const drives = await fetchCompanyDrives();
      table.replaceChildren();
      for (const drive of drives) {
        const row = document.createElement('tr');
        addCell(row, drive.driveId);
        addCell(row, formatDate(drive.driveDate));
        addCell(row, drive.minCgpa);
        addCell(row, formatBranches(drive.eligibleBranches));
        table.appendChild(row);
      }
      if (drives.length === 0) {
        showMessage('Your company has no placement drives yet.', false);
      }
    } catch (error) {
      showMessage(error.message || 'Could not load your drives.', true);
    }
  }

  async function updateStatus(application, select) {
    const status = select.value;
    if (!status) {
      return;
    }

    select.disabled = true;
    showMessage('', false);
    try {
      const result = await readResponse(await window.apiFetch(
        `/api/applications/${application.applicationId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status })
        }
      ));
      showMessage(result.message || 'Application status updated successfully.', false);
      await loadApplications(false);
    } catch (error) {
      select.value = statuses.includes(application.status) ? application.status : '';
      select.disabled = false;
      showMessage(error.message || 'Could not update the application status.', true);
    }
  }

  async function loadApplications(clearMessage = true) {
    if (clearMessage) {
      showMessage('', false);
    }
    const table = document.getElementById('applications-table');
    try {
      const data = await readResponse(await window.apiFetch('/api/applications'));
      table.replaceChildren();
      for (const application of data.applications) {
        const row = document.createElement('tr');
        addCell(row, application.studentName);
        addCell(row, application.branch);
        addCell(row, application.cgpa);
        addCell(row, formatDate(application.driveDate));
        addCell(row, application.status);

        const statusCell = document.createElement('td');
        const select = document.createElement('select');
        select.setAttribute('aria-label', `Change status for ${application.studentName}`);
        select.add(new Option('Change status', ''));
        for (const status of statuses) {
          select.add(new Option(status, status));
        }
        select.value = statuses.includes(application.status) ? application.status : '';
        select.addEventListener('change', () => updateStatus(application, select));
        statusCell.appendChild(select);
        row.appendChild(statusCell);
        table.appendChild(row);
      }
      if (data.applications.length === 0) {
        showMessage('There are no applications to your drives yet.', false);
      }
    } catch (error) {
      showMessage(error.message || 'Could not load applications.', true);
    }
  }

  if (page.dataset.page === 'dashboard') {
    loadDashboard();
  } else if (page.dataset.page === 'drives') {
    document.getElementById('refresh-drives').addEventListener('click', loadDrives);
    loadDrives();
  } else if (page.dataset.page === 'applications') {
    document.getElementById('refresh-applications').addEventListener('click', loadApplications);
    loadApplications();
  }
})();
