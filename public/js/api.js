(function () {
  async function apiFetch(url, options) {
    const requestOptions = { ...options };
    const headers = new Headers(requestOptions.headers || {});
    const token = localStorage.getItem('token');

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    requestOptions.headers = headers;
    const response = await fetch(url, requestOptions);

    if (response.status === 401) {
      logout();
    }

    return response;
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    window.location.assign('/login.html');
  }

  window.apiFetch = apiFetch;
  window.logout = logout;
})();
