const send = () => {
  // Skip localhost and extension pages
  if (
    location.hostname === "localhost" ||
    location.protocol === "chrome-extension:"
  ) {
    return;
  }

  chrome.runtime.sendMessage({
    type: "PAGE_CONTEXT",
    hostname: location.hostname,
    url: location.href,
    isCheckout: /checkout|cart|payment|subscribe|plan/i.test(location.href),
  });
};

send();
addEventListener("popstate", send);
addEventListener("hashchange", send);
