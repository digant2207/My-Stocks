# ⏰ GitHub Token Expiration & Renewal Guide

**Expiration Date:** `December 6, 2026`  
**Services Affected:** 
- `My-Stocks` (cron-job.org)
- `indian-stock-analyzer` (cron-job.org)

---

## Option A: Make it Never Expire (Permanent Fix - Recommended)
If you do not want to repeat this process every 90 days:
1. Go to **[GitHub Personal Access Tokens](https://github.com/settings/tokens)**.
2. Click on your `cron-job-scanner` token (or click **Generate new token (classic)**).
3. Set **Expiration** to **`No expiration`**.
4. Check **`workflow`** scope.
5. Click **Generate / Save**.
6. Paste the new token into cron-job.org for both jobs.  
*Now it will run automatically forever with zero maintenance.*

---

## Option B: Renewing Before December 6, 2026
If you prefer keeping expiration active, renew it between **December 1 and December 5**:

### Step 1: Regenerate Token on GitHub
1. Open **[GitHub Tokens Settings](https://github.com/settings/tokens)**.
2. Find `cron-job-scanner` in the list and click its name.
3. Click the **Regenerate token** button.
4. Set the new expiration (e.g., another 90 days or 1 year) and click **Regenerate token**.
5. Copy the newly generated token (`ghp_...`).

### Step 2: Update in cron-job.org
1. Open **[cron-job.org Console](https://console.cron-job.org/)**.
2. For each job (`Stock Market Scanner` and `Indian Stock Analyzer`):
   - Click the three dots `...` or **Edit**.
   - Go to the **Advanced** tab.
   - In **Headers**, find `Authorization`.
   - Replace the old token with the new one:
     ```text
     Bearer ghp_YOUR_NEW_TOKEN_HERE
     ```
   - Click **Save**.
