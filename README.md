# MyWellness JSON Link Extractor (Userscript)

## Overview

This userscript is designed for users of `v1.mywellness.com` who want direct access to the "Cardio Log Details" JSON data for their individual workout sessions. It automatically runs on `PerformedExerciseDetail` pages, extracts the workout's unique ID and a session-specific authentication token, and presents them along with a convenient direct link in an overlay on the page.

**⚠️ Important:** This script helps you access *your own data* more easily. The extracted token and the generated link are **sensitive** and can grant access to your workout details without further authentication. **Do not share the generated link or token with anyone.**

## Features

*   **Automatic Detection:** Scans the workout detail page for `physicalActivityAnalyticsId` and `EU.currentUser` JSON data.
*   **Token Extraction:** Parses the `EU.currentUser` JSON to find a session-specific authentication token.
*   **Direct Link Generation:** Combines the extracted ID and token to create a direct URL to the workout's `CardioLog` details.
*   **Informative Overlay:** Displays the extracted ID, token, and the generated link in a non-intrusive overlay on the top-right of the page.
*   **Status Indicators:** Provides visual cues (colors) on the overlay to indicate the status of extraction (pending, found, not found, error).
*   **Clipboard Integration:** (If supported by your userscript manager) Allows easy copying of the extracted values.

## Installation

This script requires a browser extension that supports userscripts, such as Tampermonkey or Greasemonkey.

1.  **Install a Userscript Manager:**
    *   **Tampermonkey (Recommended):** [Chrome](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo), [Firefox](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/), [Edge](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpbldcldadghiehpelpjccoNBj)
    *   **Greasemonkey:** [Firefox](https://addons.mozilla.org/en-US/firefox/addon/greasemonkey/)
    *   **Violentmonkey:** [Chrome/Edge](https://chrome.google.com/webstore/detail/violentmonkey/jfgspchsidctwcFKRppjopocajclstrn), [Firefox](https://addons.mozilla.org/en-US/firefox/addon/violentmonkey/)

2.  **Install the Script:**

    You have two primary ways to install the `.user.js` file:

    *   **From a Raw Link (Recommended for GitHub):**
        1.  Navigate to the `MyWellness_JSON_Link_Extractor.user.js` file in this repository (or wherever you host the raw file).
        2.  Click on the "Raw" button.
        3.  Your userscript manager should detect the file and prompt you to install it. Follow the on-screen instructions.

    *   **Copy-Paste Method:**
        1.  Open the `MyWellness_JSON_Link_Extractor.user.js` file in a text editor or copy its content directly from GitHub.
        2.  Open your userscript manager's dashboard (e.g., click the Tampermonkey icon, then "Dashboard").
        3.  Look for an option to "Create a new script" or similar (usually represented by a `+` icon).
        4.  Paste the entire content of the `.user.js` file into the editor that appears, overwriting any default template code.
        5.  Save the script (e.g., File > Save or Ctrl+S/Cmd+S).

## Usage

1.  **Navigate to a Workout Detail Page:**
    Open your web browser and go to `v1.mywellness.com` and then to any `PerformedExerciseDetail` page (e.g., `https://v1.mywellness.com/.../PerformedExerciseDetail/5101037...`).

2.  **Observe the Overlay:**
    Shortly after the page loads (the script uses `document-idle` to wait for page content), a small overlay box will appear in the top-right corner of your browser window.

3.  **Monitor Status:**
    The overlay will update as it attempts to find and extract the required values.
    *   **Pending (Orange):** Values are being searched for.
    *   **Found (Green):** A value has been successfully extracted.
    *   **Not Found / Error (Red):** The script failed to find or extract a value.

4.  **Access the Link:**
    Once both the "Physical Activity ID" and "Extracted Token" are found, the "Cardio Log Link" will become active and clickable. Click it to open the raw JSON details for that workout in a new tab.

## Important Considerations

*   **Security & Privacy:** This script interacts with and extracts session-specific data from MyWellness. While it does *not* send this data anywhere external, the extracted token and generated link *are sensitive*. Treat them as you would your login credentials.
*   **Unofficial Tool:** This script is an independent community tool and is **not affiliated with, endorsed by, or supported by MyWellness or Technogym**.
*   **Website Changes:** MyWellness.com's website structure or JavaScript variables may change at any time, which could break this script's functionality. If the script stops working, it may need updates.
*   **Browser Compatibility:** While designed for common userscript managers, slight variations in browser or extension behavior might occur.
*   **Purpose:** The primary purpose of this script is to facilitate access to raw workout data for personal analysis or import into other tools. It is not intended for any unauthorized access or activities.

## Troubleshooting

*   **Overlay not appearing:**
    *   Ensure your userscript manager is enabled for `mywellness.com`.
    *   Verify you are on a `PerformedExerciseDetail` page (`@match` rule in the script).
    *   Check your browser's developer console (F12) for any JavaScript errors.
*   **Values show "Searching..." or "Not Found":**
    *   The script might be running before all necessary page elements are loaded. The `document-idle` and polling logic tries to mitigate this.
    *   MyWellness.com's page structure for embedding these variables might have changed.
    *   Check the browser console for specific errors or `console.log` messages from the script for clues.
*   **Link is broken or shows "Awaiting...":**
    *   Ensure both the "Physical Activity ID" and "Extracted Token" are successfully found. If either is missing, the link cannot be generated.
    *   The format of the `CardioLog` URL on MyWellness's side might have changed.
