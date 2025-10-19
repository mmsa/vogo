# GoDaddy DNS Setup Guide for VogPlus.ai

Complete step-by-step guide to configure your domain in GoDaddy.

---

## 🎯 Goal

Configure DNS so that:
- `vogplus.ai` → Redirects to `www.vogplus.ai` (Landing page)
- `www.vogplus.ai` → Landing page (Static site)
- `app.vogplus.ai` → Main application (React + FastAPI)

---

## 📋 Prerequisites

- Domain `vogplus.ai` registered in GoDaddy
- AWS EC2 Elastic IP address (from AWS setup)
  - Example: `54.123.45.67`

---

## Step 1: Log into GoDaddy

1. Go to [https://www.godaddy.com](https://www.godaddy.com)
2. Click **"Sign In"** (top right)
3. Enter your credentials
4. Navigate to **"My Products"**

---

## Step 2: Access DNS Management

1. Find your domain `vogplus.ai` in the list
2. Click the **"DNS"** button next to it
3. You'll see the DNS Management page with existing records

---

## Step 3: Delete Default Records (Optional but Recommended)

**⚠️ IMPORTANT:** Before adding new records, remove conflicting ones.

Look for and **DELETE** these default records if they exist:
- Any `A` record for `@` (root domain)
- Any `CNAME` record for `www`
- Any `CNAME` record for `@`
- Any parked domain records

**How to delete:**
1. Click the **pencil icon** or **three dots** next to the record
2. Select **"Delete"**
3. Confirm

---

## Step 4: Add DNS Records

Click **"Add"** or **"Add New Record"** and add these records **exactly as shown**:

### Record 1: Root Domain (@)

```
Type:     A
Name:     @
Value:    YOUR_EC2_ELASTIC_IP    (e.g., 54.123.45.67)
TTL:      600 seconds (or 10 minutes)
```

**This makes:** `vogplus.ai` point to your server

---

### Record 2: WWW Subdomain

```
Type:     A
Name:     www
Value:    YOUR_EC2_ELASTIC_IP    (e.g., 54.123.45.67)
TTL:      600 seconds
```

**This makes:** `www.vogplus.ai` point to your server

---

### Record 3: App Subdomain

```
Type:     A
Name:     app
Value:    YOUR_EC2_ELASTIC_IP    (e.g., 54.123.45.67)
TTL:      600 seconds
```

**This makes:** `app.vogplus.ai` point to your server

---

## Step 5: Verify Your Configuration

After adding all records, your DNS Management page should look like this:

| Type | Name | Value               | TTL  |
|------|------|---------------------|------|
| A    | @    | 54.123.45.67        | 600  |
| A    | www  | 54.123.45.67        | 600  |
| A    | app  | 54.123.45.67        | 600  |

---

## Step 6: Save Changes

1. Click **"Save"** or **"Save Changes"** button
2. GoDaddy will confirm the changes

---

## Step 7: Wait for DNS Propagation

DNS changes take time to propagate globally:

- **Minimum:** 15-30 minutes
- **Average:** 1-2 hours
- **Maximum:** 24-48 hours (rare)

---

## Step 8: Test Your Configuration

### 8.1 Check DNS Propagation

Use online tools to check if DNS has propagated:

1. **WhatsMyDNS:** [https://www.whatsmydns.net/](https://www.whatsmydns.net/)
   - Enter: `vogplus.ai`
   - Type: `A`
   - Check if your EC2 IP shows up

2. **DNS Checker:** [https://dnschecker.org/](https://dnschecker.org/)
   - Enter: `www.vogplus.ai`
   - Should show your EC2 IP worldwide

3. **Terminal Check:**
   ```bash
   # Check root domain
   nslookup vogplus.ai
   
   # Check www
   nslookup www.vogplus.ai
   
   # Check app subdomain
   nslookup app.vogplus.ai
   ```

All should return your Elastic IP: `54.123.45.67`

---

### 8.2 Test HTTP Access (Before SSL)

Once DNS propagates, test HTTP access:

```bash
# Test landing page
curl -I http://vogplus.ai
curl -I http://www.vogplus.ai

# Test app
curl -I http://app.vogplus.ai

# Test backend API
curl http://app.vogplus.ai/api/healthz
```

**Expected Results:**
- Landing: HTTP 301 (redirect) or HTTP 200
- App: HTTP 200
- API: `{"status":"ok"}`

---

### 8.3 Test HTTPS Access (After SSL Setup)

After running Certbot on your EC2:

```bash
# Test landing page
curl -I https://vogplus.ai          # Should redirect to www
curl -I https://www.vogplus.ai      # Should return 200

# Test app
curl -I https://app.vogplus.ai
curl https://app.vogplus.ai/api/healthz
```

---

## Step 9: Test in Browser

Open your browser and visit:

1. **Landing Page:**
   - `http://vogplus.ai` → Should redirect to `https://www.vogplus.ai`
   - `https://www.vogplus.ai` → Should show landing page

2. **Main App:**
   - `https://app.vogplus.ai` → Should show your React app
   - `https://app.vogplus.ai/api/healthz` → Should show `{"status":"ok"}`

3. **Test "Get Started" Button:**
   - Click it from landing page
   - Should navigate to `https://app.vogplus.ai/register`

---

## 🔧 Advanced Configuration (Optional)

### Add CAA Records (Recommended for Security)

CAA records specify which Certificate Authorities can issue SSL certificates for your domain.

```
Type:     CAA
Name:     @
Tag:      issue
Value:    letsencrypt.org
TTL:      600
```

This tells browsers that only Let's Encrypt can issue SSL certificates for `vogplus.ai`.

---

### Add Email Records (If using email)

If you want to use email with your domain (e.g., `contact@vogplus.ai`):

1. **Use GoDaddy Email:** Follow GoDaddy's email setup wizard
2. **Use Google Workspace:** Add MX records provided by Google
3. **Use Amazon SES:** Add MX and TXT records provided by AWS

---

## 📊 DNS Record Reference

### Complete DNS Setup (Summary)

| Type | Name | Value             | Purpose                    |
|------|------|-------------------|----------------------------|
| A    | @    | 54.123.45.67      | Root domain                |
| A    | www  | 54.123.45.67      | Landing page (www)         |
| A    | app  | 54.123.45.67      | Main application           |
| CAA  | @    | letsencrypt.org   | SSL security (optional)    |

---

## ⚠️ Common Issues and Fixes

### Issue 1: "DNS_PROBE_FINISHED_NXDOMAIN"

**Cause:** DNS not propagated yet or wrong IP

**Fix:**
1. Wait longer (up to 24 hours)
2. Verify IP address is correct
3. Check records in GoDaddy
4. Flush your local DNS:
   ```bash
   # macOS
   sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder
   
   # Windows
   ipconfig /flushdns
   
   # Linux
   sudo systemd-resolve --flush-caches
   ```

---

### Issue 2: "ERR_CONNECTION_REFUSED"

**Cause:** Nginx not running or firewall blocking

**Fix:**
1. SSH into EC2: `ssh -i key.pem ubuntu@54.123.45.67`
2. Check Nginx: `sudo systemctl status nginx`
3. Check security group allows HTTP (80) and HTTPS (443)
4. Check firewall: `sudo ufw status`

---

### Issue 3: "ERR_SSL_PROTOCOL_ERROR"

**Cause:** SSL certificate not installed

**Fix:**
1. SSH into EC2
2. Run Certbot:
   ```bash
   sudo certbot --nginx -d vogplus.ai -d www.vogplus.ai
   sudo certbot --nginx -d app.vogplus.ai
   ```
3. Select "Redirect HTTP to HTTPS"

---

### Issue 4: Works on `www` but not root domain

**Cause:** Nginx redirect not configured

**Fix:**
Check Nginx config has this redirect:
```nginx
if ($host = vogplus.ai) {
    return 301 $scheme://www.vogplus.ai$request_uri;
}
```

---

### Issue 5: DNS changes not visible

**Cause:** Your computer is caching old DNS

**Fix:**
1. Use incognito/private browser mode
2. Try from mobile phone (different network)
3. Use [https://www.whatsmydns.net/](https://www.whatsmydns.net/)
4. Wait 1-2 more hours

---

## 🔍 Verification Checklist

Before considering setup complete, verify:

- [ ] `nslookup vogplus.ai` returns your EC2 IP
- [ ] `nslookup www.vogplus.ai` returns your EC2 IP
- [ ] `nslookup app.vogplus.ai` returns your EC2 IP
- [ ] `https://vogplus.ai` redirects to `https://www.vogplus.ai`
- [ ] `https://www.vogplus.ai` shows landing page
- [ ] `https://app.vogplus.ai` shows main app
- [ ] `https://app.vogplus.ai/api/healthz` returns `{"status":"ok"}`
- [ ] SSL certificates show green lock in browser
- [ ] "Get Started" button navigates correctly
- [ ] No browser security warnings

---

## 📞 Need Help?

### Check DNS Status
```bash
# Quick check all domains
for domain in vogplus.ai www.vogplus.ai app.vogplus.ai; do
  echo "Checking $domain..."
  nslookup $domain
  echo "---"
done
```

### GoDaddy Support
- Phone: Check their website for your region
- Live Chat: Available in GoDaddy account
- Help Center: [https://www.godaddy.com/help](https://www.godaddy.com/help)

---

## ✅ Success!

Once all checks pass, your domain is fully configured:

```
🌐 Landing Page:  https://www.vogplus.ai
🚀 Main App:      https://app.vogplus.ai
🔒 SSL:           Enabled and auto-renewing
```

**Next Steps:**
1. Share your landing page: `https://www.vogplus.ai`
2. Publish Chrome extension
3. Update landing page with extension link
4. Start marketing! 🎉

