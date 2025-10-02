(function () {
  // Set BLOCK_BACKUP to false if you want to allow quiz backup events,
  // i.e. if you want canvas to "save progress" during quiz in case of connection issues
  const BLOCK_BACKUP = true;
  const blockedStrings = ["events", "simple_response"];

  if (BLOCK_BACKUP) blockedStrings.push("backup");

  // intercept XMLHttpRequest
  const originalXHR = window.XMLHttpRequest;
  window.XMLHttpRequest = function () {
    const xhr = new originalXHR();
    const originalOpen = xhr.open;
    const originalSend = xhr.send;

    let requestMethod, requestUrl;

    xhr.open = function (method, url, ...args) {
      requestMethod = method;
      requestUrl = url;
      return originalOpen.call(this, method, url, ...args);
    };

    xhr.send = function (data) {
      const isBlocked = blockedStrings.some((str) => requestUrl.includes(str));

      if (isBlocked) {
        console.log(`🚫 Canvas tracking request blocked: ${requestUrl}`, {
          method: requestMethod,
          url: requestUrl,
          data: data,
        });

        // fake a successful 204 No Content response
        // https://github.com/instructure/canvas-lms/blob/master/ui/shared/quiz-log-auditing/jquery/event_manager.js#L113-L133
        setTimeout(() => {
          // Set response properties for 204 No Content
          Object.defineProperty(xhr, "readyState", { value: 4, writable: false });
          Object.defineProperty(xhr, "status", { value: 204, writable: false });
          Object.defineProperty(xhr, "statusText", { value: "No Content", writable: false });
          Object.defineProperty(xhr, "responseText", { value: "", writable: false });
          Object.defineProperty(xhr, "response", { value: "", writable: false });

          if (xhr.onreadystatechange) xhr.onreadystatechange();
          if (xhr.onload) xhr.onload();
        }, 10);

        return;
      }

      return originalSend.call(this, data);
    };

    return xhr;
  };

  function clearQlaEvents() {
    localStorage.removeItem("qla_events");
    console.log("✅ qla_events cleared from localStorage.");
  }

  document.addEventListener("DOMContentLoaded", function () {
    const submitButton = document.getElementById("submit_quiz_button");
    if (submitButton) {
      submitButton.addEventListener("click", clearQlaEvents);
    }
  });

  console.log("⚡ Canvas Quiz Blocker is active");
})();
