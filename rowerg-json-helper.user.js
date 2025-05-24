// ==UserScript==
// @name         MyWellness JSON Link Extractor (v3)
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  Finds physicalActivityAnalyticsId, raw EU.currentUser JSON, extracts a token, displays results in an overlay, and adds a Cardio Log link.
// @author       Your Name
// @match        https://v1.mywellness.com/*PerformedExerciseDetail*
// @grant        GM_setClipboard
// @grant        GM_addStyle
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    console.log("MyWellness Multi-Value Finder (v2.2): Script started.");

    // --- Style Helper ---
    function applyGlobalStyle(css) {
        try {
            if (typeof GM_addStyle !== "undefined") {
                GM_addStyle(css);
                // console.log("MyWellness Finder: Styles applied using GM_addStyle."); // Less verbose
                return;
            } else if (typeof GM !== "undefined" && typeof GM.addStyle !== "undefined") {
                GM.addStyle(css); // For Greasemonkey 4+
                // console.log("MyWellness Finder: Styles applied using GM.addStyle."); // Less verbose
                return;
            }
        } catch (e) {
            console.warn("MyWellness Finder: Error trying GM_addStyle or GM.addStyle. Falling back.", e);
        }

        try {
            const head = document.getElementsByTagName('head')[0];
            if (!head) {
                console.error("MyWellness Finder: Cannot apply styles, <head> element not found.");
                return;
            }
            const styleElement = document.createElement('style');
            styleElement.type = 'text/css';
            styleElement.appendChild(document.createTextNode(css));
            head.appendChild(styleElement);
            // console.log("MyWellness Finder: Styles applied using fallback method (manual <style> tag)."); // Less verbose
        } catch (e) {
            console.error("MyWellness Finder: Error applying styles using fallback method.", e);
        }
    }


    // --- Overlay UI ---
    let overlay, statusSpan, activityIdSpan, currentUserSpan, tokenSpan, cardioLogLinkSpan;

    function createOverlay() {
        if (document.getElementById('mw-finder-overlay-container')) {
            console.log("MyWellness Finder: Overlay already exists.");
            return;
        }

        const css = `
            #mw-finder-overlay-container {
                position: fixed;
                top: 10px;
                right: 10px;
                width: 800px;
                background-color: #f9f9f9;
                border: 1px solid #ccc;
                border-radius: 5px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                z-index: 99999;
                font-family: Arial, sans-serif;
                font-size: 13px;
                color: #333;
                padding: 0;
            }
            #mw-finder-overlay-header {
                background-color: #eee;
                padding: 8px 10px;
                font-weight: bold;
                border-bottom: 1px solid #ccc;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-top-left-radius: 5px;
                border-top-right-radius: 5px;
            }
            #mw-finder-overlay-content {
                padding: 10px;
                max-height: 350px; /* Increased max-height slightly */
                overflow-y: auto;
                text-align: left;
            }
            #mw-finder-overlay-content p {
                margin: 5px 0;
                word-break: break-all;
            }
            #mw-finder-overlay-content strong {
                color: #555;
            }
            #mw-finder-overlay-content a { /* Style for the generated link */
                color: #0066cc;
                text-decoration: underline;
            }
            #mw-finder-overlay-content a:hover {
                color: #004C99;
            }
            #mw-finder-overlay-close {
                cursor: pointer;
                background: none;
                border: none;
                font-size: 1.2em;
                font-weight: bold;
                color: #777;
                width: 30px;
                text-align: center;
                align-items: center;
  							padding: 0px 0px;
                
            }
            #mw-finder-overlay-close:hover {
                color: #333;
            }
            .mw-finder-value-found { color: green; }
            .mw-finder-value-not-found { color: red; }
            .mw-finder-value-pending { color: orange; }
        `;
        applyGlobalStyle(css);

        overlay = document.createElement('div');
        overlay.id = 'mw-finder-overlay-container';

        const header = document.createElement('div');
        header.id = 'mw-finder-overlay-header';
        header.innerHTML = '<span>MyWellness JSON Link Extractor (v3)</span>'; // Updated version

        const closeButton = document.createElement('button');
        closeButton.id = 'mw-finder-overlay-close';
        closeButton.title = 'Close Overlay';
        closeButton.innerHTML = '×';
        closeButton.onclick = () => {
            if (overlay) overlay.style.display = 'none';
            console.log("MyWellness Finder: Overlay closed by user.");
        };
        header.appendChild(closeButton);

        const content = document.createElement('div');
        content.id = 'mw-finder-overlay-content';

        statusSpan = document.createElement('span');
        statusSpan.className = 'mw-finder-value-pending';
        statusSpan.textContent = 'Initializing...';
        const statusP = document.createElement('p');
        statusP.innerHTML = '<strong>Status:</strong> ';
        statusP.appendChild(statusSpan);

        activityIdSpan = document.createElement('span');
        activityIdSpan.className = 'mw-finder-value-pending';
        activityIdSpan.textContent = 'Searching...';
        const activityIdP = document.createElement('p');
        activityIdP.innerHTML = '<strong>Physical Activity ID:</strong> ';
        activityIdP.appendChild(activityIdSpan);

        tokenSpan = document.createElement('span');
        tokenSpan.className = 'mw-finder-value-pending';
        tokenSpan.textContent = 'Awaiting EU.currentUser...';
        const tokenP = document.createElement('p');
        tokenP.innerHTML = '<strong>Extracted Token:</strong> ';
        tokenP.appendChild(tokenSpan);

        // ADDED: Cardio Log Link UI elements
        cardioLogLinkSpan = document.createElement('span');
        cardioLogLinkSpan.className = 'mw-finder-value-pending';
        cardioLogLinkSpan.textContent = 'Awaiting ID & Token...';
        const cardioLogLinkP = document.createElement('p');
        cardioLogLinkP.innerHTML = '<strong>Cardio Log Link:</strong> ';
        cardioLogLinkP.appendChild(cardioLogLinkSpan);

        content.appendChild(statusP);
        content.appendChild(activityIdP);
        content.appendChild(tokenP);
        content.appendChild(cardioLogLinkP); // ADDED

        overlay.appendChild(header);
        overlay.appendChild(content);
        document.body.appendChild(overlay);
        console.log("MyWellness Finder: Overlay created.");
    }

    function updateOverlay(field, value, found = true) {
        if (!statusSpan || !activityIdSpan || !tokenSpan || !cardioLogLinkSpan) {
            console.warn("MyWellness Finder: Overlay elements not ready for update on field:", field);
            const contentDiv = document.getElementById('mw-finder-overlay-content');
            if (contentDiv) {
                statusSpan = contentDiv.querySelector('p:nth-child(1) span');
                activityIdSpan = contentDiv.querySelector('p:nth-child(2) span');
                tokenSpan = contentDiv.querySelector('p:nth-child(3) span');
                if (!cardioLogLinkSpan) cardioLogLinkSpan = contentDiv.querySelector('p:nth-child(4) span');
            }
            if (!statusSpan) {
                 console.error("MyWellness Finder: Critical - Overlay spans still not found for update.");
                 return;
            }
        }

        let span;
        let textValue = value;

        switch(field) {
            case 'status':
                span = statusSpan;
                break;
            case 'activityId':
                span = activityIdSpan;
                break;
            case 'token':
                span = tokenSpan;
                break;
            default:
                // console.warn("MyWellness Finder: Unknown field for overlay update:", field); // Can be noisy if link updates separately
                return;
        }

        if (span) {
            span.textContent = textValue;
            if (field !== 'status') {
                span.className = found ? 'mw-finder-value-found' : 'mw-finder-value-not-found';
                if (!found && textValue.toLowerCase().includes('searching') || textValue.toLowerCase().includes('awaiting')) {
                    span.className = 'mw-finder-value-pending';
                }
            } else {
                if (typeof value === 'string') {
                    if (value.includes("Stopped") || value.includes("Error") || value.includes("Not found") || value.includes("Failed")) {
                        span.className = 'mw-finder-value-not-found';
                    } else if (value.includes("found") || value.includes("Completed") || value.includes("Extracted")) {
                        span.className = 'mw-finder-value-found';
                    } else {
                        span.className = 'mw-finder-value-pending';
                    }
                }
            }
        } else {
            // console.warn(`MyWellness Finder: Span not found for overlay field "${field}" during update.`); // Can be noisy
        }
    }

    // --- Main Logic ---
    let attempts = 0;
    const maxAttempts = 10;
    const delayBetweenAttempts = 1000;
    let intervalId = null;

    let foundPhysicalActivityId = null;
    let foundCurrentUserJSONString = null;
    let extractedToken = null;

    // ADDED: Function to generate and display the Cardio Log link
    function generateAndDisplayCardioLogLink() {
        if (!cardioLogLinkSpan) {
            const contentDiv = document.getElementById('mw-finder-overlay-content');
            if (contentDiv) {
                 cardioLogLinkSpan = contentDiv.querySelector('p:nth-child(5) span');
            }
            if (!cardioLogLinkSpan) {
                console.warn("MyWellness Finder: cardioLogLinkSpan DOM element not available. Will retry.");
                return;
            }
        }

        const idValid = foundPhysicalActivityId && typeof foundPhysicalActivityId === 'string' && foundPhysicalActivityId.length > 0;
        const tokenValid = extractedToken && typeof extractedToken === 'string' && extractedToken.length > 0;

        if (idValid && tokenValid) {
            const linkUrl = `https://services.mywellness.com/Training/CardioLog/${foundPhysicalActivityId}/Details?_c=en-GB&token=${extractedToken}`;
            
            const linkAnchor = document.createElement('a');
            linkAnchor.href = linkUrl;
            linkAnchor.textContent = "Open Cardio Log Details";
            linkAnchor.target = "_blank";

            cardioLogLinkSpan.innerHTML = '';
            cardioLogLinkSpan.appendChild(linkAnchor);
            cardioLogLinkSpan.className = 'mw-finder-value-found'; 
            // console.log("MyWellness Finder: Cardio Log link generated:", linkUrl); // Less verbose
        } else {
            let statusText;
            let statusClass = 'mw-finder-value-pending';

            if (!idValid && (!extractedToken || (typeof extractedToken === 'string' && extractedToken.length === 0) ) ) {
                if (extractedToken === "") { statusText = "Awaiting ID (Token was empty)."; statusClass = 'mw-finder-value-not-found'; }
                else if (foundCurrentUserJSONString && extractedToken === null) { statusText = "Awaiting ID (Token extraction error)."; statusClass = 'mw-finder-value-not-found'; }
                else { statusText = "Awaiting ID & Token..."; }
            } else if (!idValid) {
                statusText = "Awaiting Activity ID...";
            } else { // ID is valid, so token must be the issue
                if (extractedToken === "") { statusText = "Token extraction resulted in empty string."; statusClass = 'mw-finder-value-not-found';}
                else if (foundCurrentUserJSONString && extractedToken === null) { statusText = "Token extraction error (see console)."; statusClass = 'mw-finder-value-not-found'; }
                else if (!foundCurrentUserJSONString && extractedToken === null) { statusText = "Awaiting Token (User JSON needed)..."; }
                else { statusText = "Awaiting Token..."; }
            }
            
            cardioLogLinkSpan.textContent = statusText;
            cardioLogLinkSpan.className = statusClass;
        }
    }

    function findValuesInPage() {
        console.log(`MyWellness Finder: Attempt ${attempts + 1}/${maxAttempts} to find values...`);
        updateOverlay('status', `Polling... Attempt ${attempts + 1}/${maxAttempts}`);

        const scripts = document.getElementsByTagName('script');
        const regexActivityId = /window\.physicalActivityAnalyticsId\s*=\s*'([a-f0-9]+)';/i;
        const regexCurrentUserJSON = /EU\.currentUser\s*=\s*JSON\.parse\('(.+?)'\);/;

        for (let i = 0; i < scripts.length; i++) {
            const scriptContent = scripts[i].textContent;
            if (!scriptContent) continue;

            if (!foundPhysicalActivityId) {
                const matchActivityId = scriptContent.match(regexActivityId);
                if (matchActivityId && matchActivityId[1]) {
                    foundPhysicalActivityId = matchActivityId[1];
                    console.log("MyWellness Finder: Found physicalActivityAnalyticsId in script:", foundPhysicalActivityId);
                    updateOverlay('activityId', foundPhysicalActivityId, true);
                }
            }

            if (!foundCurrentUserJSONString) {
                const matchCurrentUser = scriptContent.match(regexCurrentUserJSON);
                if (matchCurrentUser && matchCurrentUser[1]) {
                    foundCurrentUserJSONString = matchCurrentUser[1];
                    console.log("MyWellness Finder: Found raw EU.currentUser JSON string (length):", foundCurrentUserJSONString.length);
                    updateOverlay('currentUser', foundCurrentUserJSONString, true);
                    // console.log("raw EU.currentUser JSON string:", foundCurrentUserJSONString); // Very verbose

                    console.log("MyWellness Finder: Found raw EU.currentUser JSON string:", foundCurrentUserJSONString);


                    updateOverlay('token', 'Extracting...', false);
                    const keywordToken = "token";
                    const keywordCulture = "culture";

                    const tokenPos = foundCurrentUserJSONString.indexOf(keywordToken);
                    const culturePos = foundCurrentUserJSONString.indexOf(keywordCulture);

                    if (tokenPos !== -1 && culturePos !== -1 && tokenPos < culturePos) {
                        const startExtractionIndex = tokenPos + 5;
                        const endExtractionIndex = culturePos;
                        let betweenString = foundCurrentUserJSONString.substring(startExtractionIndex, endExtractionIndex);
                        let tempProcessedString = betweenString.trim(); // Trim whitespace
                      
												extractedToken = betweenString.replace(/[^a-zA-Z0-9.]/g, '');

                        if (extractedToken.length > 0) {
                          console.log("MyWellness Finder: Final extracted token:", extractedToken);
                          updateOverlay('token', extractedToken, true);
                        } else {
                          extractedToken = ""; // Ensure it's empty string on failure
                          console.warn("MyWellness Finder: Token extraction failed or resulted in empty string (fallback logic).");
                          updateOverlay('token', 'Extraction failed (format/length)', false);
                        }
                        
                    } else {
                        let errorMsg = `Could not extract token: `;
                        if (tokenPos === -1) errorMsg += `Keyword  not found. `;
                        if (culturePos === -1) errorMsg += `Keyword  not found. `;
                        if (tokenPos !== -1 && culturePos !== -1 && tokenPos >= culturePos) {
                            errorMsg += `1 was not found before 2.`;
                        }
                        console.warn("MyWellness Finder: " + errorMsg);
                        updateOverlay('token', 'Keywords error (see console)', false);
                        extractedToken = null; // Explicitly null on keyword error
                    }
                }
            }
            if (foundPhysicalActivityId && foundCurrentUserJSONString) break;
        }

        if (!foundPhysicalActivityId && typeof window.physicalActivityAnalyticsId === 'string') {
            const directId = window.physicalActivityAnalyticsId;
            if (/^[a-f0-9]+$/i.test(directId)) {
                foundPhysicalActivityId = directId;
                console.log("MyWellness Finder: Found physicalActivityAnalyticsId on window object:", foundPhysicalActivityId);
                updateOverlay('activityId', foundPhysicalActivityId, true);
            }
        }

        if (attempts < maxAttempts) {
            if (!foundPhysicalActivityId) updateOverlay('activityId', 'Searching...', false);
            if (!foundCurrentUserJSONString) updateOverlay('currentUser', 'Searching...', false);
            // Token status is handled during its extraction logic or if EU.currentUser is missing
        }

        generateAndDisplayCardioLogLink(); // Call after each attempt to find values

        // Return true if core data for link is potentially found (token extraction attempted)
        return (foundPhysicalActivityId && foundCurrentUserJSONString && extractedToken !== null);
    }

    function pollForValues() {
        if (findValuesInPage()) {
            console.log("MyWellness Finder: Target values processing complete. Stopping polling.");
            updateOverlay('status', 'Completed: Values processed.'); // Generic completion
            if (intervalId) clearInterval(intervalId);

            // Final updates based on what was found
            if (foundPhysicalActivityId) updateOverlay('activityId', foundPhysicalActivityId, true);
            else updateOverlay('activityId', 'Not Found', false);

            if (foundCurrentUserJSONString) updateOverlay('currentUser', foundCurrentUserJSONString, true);
            else updateOverlay('currentUser', 'Not Found', false);

            if (extractedToken && extractedToken.length > 0) updateOverlay('token', extractedToken, true);
            else if (foundCurrentUserJSONString) updateOverlay('token', extractedToken === "" ? 'Empty/Failed' : 'Extraction Error', false);
            else updateOverlay('token', 'Not Searched (User JSON missing)', false);
            
            generateAndDisplayCardioLogLink(); // Ensure final state for link
            return;
        }

        attempts++;
        if (attempts >= maxAttempts) {
            if (intervalId) clearInterval(intervalId);
            let msg = "Stopped after " + maxAttempts + " attempts. ";
            let summary = [];

            if (foundPhysicalActivityId) summary.push("Activity ID: FOUND"); else summary.push("Activity ID: NOT FOUND");
            updateOverlay('activityId', foundPhysicalActivityId ? foundPhysicalActivityId : 'Not Found', !!foundPhysicalActivityId);

            if (foundCurrentUserJSONString) {
                summary.push("User JSON: FOUND");
                updateOverlay('currentUser', foundCurrentUserJSONString, true);
                if (extractedToken && extractedToken.length > 0) {
                    summary.push("Token: EXTRACTED");
                    updateOverlay('token', extractedToken, true);
                } else {
                    summary.push(extractedToken === "" ? "Token: EMPTY/FAILED" : "Token: EXTRACTION ERROR");
                    updateOverlay('token', extractedToken === "" ? 'Empty/Failed' : 'Extraction Error', false);
                }
            } else {
                summary.push("User JSON: NOT FOUND");
                updateOverlay('currentUser', 'Not Found', false);
                summary.push("Token: NOT SEARCHED");
                updateOverlay('token', 'Not Searched (User JSON missing)', false);
            }
            console.warn("MyWellness Finder: " + msg + summary.join('; '));
            updateOverlay('status', "Stopped: Max attempts. " + summary.join('; '));
            generateAndDisplayCardioLogLink(); // Ensure final state for link on max attempts
        }
    }

    function initializeSearch() {
        updateOverlay('status', 'Starting initial scan...');
        setTimeout(() => {
            if (!findValuesInPage()) { 
                if (attempts < maxAttempts) {
                    console.log("MyWellness Finder: Initial scan incomplete. Starting polling.");
                    intervalId = setInterval(pollForValues, delayBetweenAttempts);
                } else { // Should only happen if maxAttempts is 0 or 1
                    pollForValues(); // Finalize status
                }
            } else {
                 console.log("MyWellness Finder: All essential values processed on initial scan.");
                 // Call pollForValues to run through the finalization logic for overlay.
                 if (intervalId) clearInterval(intervalId); // Should not be set.
                 pollForValues(); 
            }
        }, 300);
    }

    // --- Script Execution ---
    if (document.readyState === 'loading') {
        // console.log("MyWellness Finder: DOM not ready, deferring execution."); // Less verbose
        document.addEventListener('DOMContentLoaded', function() {
            // console.log("MyWellness Finder: DOMContentLoaded, proceeding."); // Less verbose
            createOverlay();
            initializeSearch();
        });
    } else {
        // console.log("MyWellness Finder: DOM ready, proceeding."); // Less verbose
        createOverlay();
        initializeSearch();
    }

})();
