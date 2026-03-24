// track visits
(async function () {
  try {
    const params = new URLSearchParams({
      appId:
        window.location.pathname.split("/").filter(Boolean)[0] || "unknown",
      t: Date.now(),
    });
    await fetch(
      `https://apphub-analytics-server-production.up.railway.app/track.gif?${params.toString()}`,
    );
  } catch (err) {
    console.error(err);
  }
})();
