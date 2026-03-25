let photoUrls = [];
let observationId = null;

Object.defineProperty(String.prototype, 'capitalize', {
  value: function() {
    return this.replace(/\b\w/g, function(char) {
      return char.toUpperCase();
    });
  },
  enumerable: false
});

function getExtensionFromUrl(url) {
  try {
    const pathname = new URL(url).pathname;
    const filename = pathname.split("/").pop() || "";
    const parts = filename.split(".");
    return parts.length > 1 ? parts.pop().toLowerCase() : "";
  } catch {
    return "";
  }
}

function generateFigureCaptionJs({id, user, license, commonName}) {
  const licenseMap = {
    cc0: 'CC0 1.0',
    'cc-by': 'CC BY 4.0',
    'cc-by-nc': 'CC BY-NC 4.0',
    'cc-by-sa': 'CC BY-SA 4.0',
    'cc-by-nd': 'CC BY-ND 4.0',
    'cc-by-nc-nd': 'CC BY-NC-ND 4.0',
    'cc-by-nc-sa': 'CC BY-NC-SA 4.0',
  };

  const licenseKey = license.toLowerCase();
  const licenseName =
    licenseKey === 'cc0'
      ? 'CC0 1.0'
      : licenseMap[licenseKey] || license.toUpperCase();

  const licenseUrl =
    licenseKey === 'cc0'
      ? 'https://creativecommons.org/publicdomain/zero/1.0/'
      : `https://creativecommons.org/licenses/${licenseKey.replace(/^cc-/, '')}/4.0/`;

  return `
<figure>
  <figcaption>
    Figure X.X.X: \"<a href="https://www.inaturalist.org/observations/${id}" target="_blank" rel="noopener noreferrer">${commonName.capitalize()}</a>\", by
    <a href="https://www.inaturalist.org/users/${user.id}" target="_blank" rel="noopener noreferrer">
      ${user.login.capitalize()}
    </a>,
    <a href="${licenseUrl}" target="_blank" rel="noopener noreferrer">
      ${licenseName}
    </a>.
  </figcaption>
</figure>
  `
    .replace(/\s+/g, ' ')
    .trim();
}

async function displayAlert(message) {
  const alert = document.getElementById("alertBox");
  alert.textContent = message;
  alert.classList.remove("d-none");

  setTimeout(function() {
    alert.textContent = "";
    alert.classList.add("d-none");
  }, 5000);
}

copyButton.addEventListener("click", function() {
  const output = document.getElementById("output");
  output.disabled = false; // Enable textarea to allow selection
  output.select();
  output.setSelectionRange(0, 99999);
  document.execCommand("copy");
  output.disabled = true; // Re-disable textarea after copying

  displayAlert("Attribution HTML code has been copied to clipboard!");

});



downloadButton.addEventListener("click", function() {
  for (const [index, url] of photoUrls.entries()) {
        const fileExt = getExtensionFromUrl(url) || "jpg";
        const filename = `oer_inaturalist_${observationId}_photo_${index + 1}.${fileExt}`;
        downloadImage(url, filename);
      }
      displayAlert("The original observation image(s) will begin downloading shortly...");
});

async function downloadImage(imageUrl, filename = "image.jpg") {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error("Download failed:", error);
  }
}

function clientSideLimits(input, maxLength = 20) {
  return input
    .slice(0, maxLength)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ""); // Remove problematic chars
}

document
  .getElementById("observationForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();
    // const url = clientSideLimits(document.getElementById('observationId').value);
    observationId = document.getElementById("observationId").value;
    const status = document.getElementById("status");
    const attributionOutput = document.getElementById("outputDiv");
    const attributionField = document.getElementById("output");
    status.textContent = "Generating... This may take a few seconds.";
    status.classList.remove("d-none");

    try {
      const headers = new Headers();

      const response = await fetch(
        `https://api.inaturalist.org/v1/observations/${observationId}`,
        { method: "GET", headers: headers, redirect: "follow" },
      );

      if (!response.ok) {
        console.error("API request failed:", response.statusText);
        return;
      }

      const data = await response.json();
      const observation = data.results[0];

      photoUrls = observation.photos.map((photo) => {
        const rawUrl = photo.url;

        return rawUrl.replace("square", "original");
      });

      console.log("Photo URLs:", photoUrls);

      const species =
        observation.species_guess ||
        (observation.taxon?.name ?? "Unknown Species");
      const licenses = observation.photos.map((p) => p.license_code || "none");

      const safeCommonName = observation.taxon?.preferred_common_name || "Unknown Common Name";
      
      console.log(safeCommonName);
      console.log(observation.user.login, observation.user.id);
      console.log(`Observation ID: ${observationId}`);
      console.log(`Species: ${species}`);
      console.log(`Licenses: ${licenses.join(", ")}`);
      console.log(`Number of photos: ${photoUrls.length}`);

      const attribution = generateFigureCaptionJs(
        {id: observationId, 
          user: observation.user, 
          license: licenses[0], 
          commonName: safeCommonName});

      status.textContent = `Complete! This observation has ${photoUrls.length} image(s).`;
      attributionField.value = attribution;
      attributionOutput.classList.remove("d-none");
      attributionField.style.height = attributionField.scrollHeight + 5 + "px";
      
      console.log("Generated Attribution HTML:", attribution);
    } catch (err) {
      status.textContent =
        "It seems we ran into an issue while processing your request. Please double-check the Observation ID you provided and try again in ~30 seconds - " +
        err.message;
    }
  });
