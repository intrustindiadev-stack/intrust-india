# Wholesale Partner Logos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 6 custom partner placeholder graphics with high-resolution, official transparent PNG brand logos in the public partners directory.

**Architecture:** Use PowerShell Invoke-WebRequest to fetch the authentic images from Wikipedia Commons/trusted repositories directly into `/public/partners/`, verifying that each logo resolves cleanly.

**Tech Stack:** Next.js static asset serving, PowerShell

---

### Task 1: Sourcing and Downloading Brand Logo Assets

**Files:**
- Create/Overwrite: `public/partners/ajio.png`
- Create/Overwrite: `public/partners/nykaa.png`
- Create/Overwrite: `public/partners/tata-cliq.png`
- Create/Overwrite: `public/partners/reliance.png`
- Create/Overwrite: `public/partners/amazon.png`
- Create/Overwrite: `public/partners/flipkart.png`

- [ ] **Step 1: Download AJIO Logo**
  Run command:
  ```powershell
  Invoke-WebRequest -Uri "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Ajio_Logo.svg/320px-Ajio_Logo.svg.png" -OutFile "public/partners/ajio.png" -UserAgent "Mozilla/5.0"
  ```
  Expected: Logo downloaded successfully and saved as `public/partners/ajio.png`.

- [ ] **Step 2: Download NYKAA Logo**
  Run command:
  ```powershell
  Invoke-WebRequest -Uri "https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/Nykaa_New_Logo.svg/320px-Nykaa_New_Logo.svg.png" -OutFile "public/partners/nykaa.png" -UserAgent "Mozilla/5.0"
  ```
  Expected: Logo downloaded successfully and saved as `public/partners/nykaa.png`.

- [ ] **Step 3: Download TATA CLiQ Logo**
  Run command:
  ```powershell
  Invoke-WebRequest -Uri "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Tata_CLiQ_logo.svg/320px-Tata_CLiQ_logo.svg.png" -OutFile "public/partners/tata-cliq.png" -UserAgent "Mozilla/5.0"
  ```
  Expected: Logo downloaded successfully and saved as `public/partners/tata-cliq.png`.

- [ ] **Step 4: Download RELIANCE Logo**
  Run command:
  ```powershell
  Invoke-WebRequest -Uri "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Reliance_Retail_logo.svg/320px-Reliance_Retail_logo.svg.png" -OutFile "public/partners/reliance.png" -UserAgent "Mozilla/5.0"
  ```
  Expected: Logo downloaded successfully and saved as `public/partners/reliance.png`.

- [ ] **Step 5: Download AMAZON Logo**
  Run command:
  ```powershell
  Invoke-WebRequest -Uri "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Amazon_logo.svg/320px-Amazon_logo.svg.png" -OutFile "public/partners/amazon.png" -UserAgent "Mozilla/5.0"
  ```
  Expected: Logo downloaded successfully and saved as `public/partners/amazon.png`.

- [ ] **Step 6: Download FLIPKART Logo**
  Run command:
  ```powershell
  Invoke-WebRequest -Uri "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Flipkart_logo.svg/320px-Flipkart_logo.svg.png" -OutFile "public/partners/flipkart.png" -UserAgent "Mozilla/5.0"
  ```
  Expected: Logo downloaded successfully and saved as `public/partners/flipkart.png`.

- [ ] **Step 7: Commit downloaded assets**
  Run command:
  ```bash
  git add public/partners/*.png
  git commit -m "style: replace partner graphics with real official transparent logos"
  ```

---

### Task 2: Verifying Next.js Production Compilation and Assets Loading

**Files:**
- Modify: None (pure verification)

- [ ] **Step 1: Run production Next.js build**
  Run command:
  ```bash
  npm run build
  ```
  Expected: Build finishes with `0` errors.

- [ ] **Step 2: Commit after build verification**
  Run command:
  ```bash
  git commit --allow-empty -m "chore: verify successful production build with new logo assets"
  ```
