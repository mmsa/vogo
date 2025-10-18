const send = () =>
  chrome.runtime.sendMessage({
    type: "PAGE_CONTEXT",
    hostname: location.hostname,
    url: location.href,
    isCheckout: /checkout|cart|payment|subscribe|plan/i.test(location.href)
  });

send();
addEventListener("popstate", send);
addEventListener("hashchange", send);

