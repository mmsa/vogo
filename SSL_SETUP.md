# SSL Certificate Setup (HTTPS) for VogPlus.ai

Complete guide to enable HTTPS with free Let's Encrypt SSL certificates.

---

## 🎯 Goal

Enable HTTPS for all domains:
- ✅ `https://vogplus.ai`
- ✅ `https://www.vogplus.ai`
- ✅ `https://app.vogplus.ai`

---

## 📋 Prerequisites

- ✅ DNS records configured in GoDaddy
- ✅ DNS propagated (domains resolve to your EC2 IP)
- ✅ Nginx installed and running
- ✅ HTTP (port 80) working
- ✅ SSH access to EC2

---

## Step 1: Verify DNS is Working

Before installing SSL, ensure HTTP works:

```bash
# Test from your local machine
curl -I http://vogplus.ai
curl -I http://www.vogplus.ai
curl -I http://app.vogplus.ai
```

All should return HTTP 200 or 301. If not, wait for DNS propagation.

---

## Step 2: SSH into Your EC2 Instance

```bash
ssh -i /path/to/your-key.pem ubuntu@YOUR_EC2_IP
```

---

## Step 3: Install Certbot (if not already installed)

```bash
# Update package list
sudo apt update

# Install Certbot for Nginx
sudo apt install -y certbot python3-certbot-nginx
```

---

## Step 4: Stop any conflicting services (if needed)

```bash
# Check what's using port 80
sudo lsof -i :80

# If needed, temporarily stop Nginx
# (Certbot will start it again)
sudo systemctl stop nginx
```

---

## Step 5: Obtain SSL Certificate for Landing Page

```bash
sudo certbot --nginx -d vogplus.ai -d www.vogplus.ai
```

**You'll be asked:**

1. **Email address:** Enter your email for renewal notifications
   ```
   Enter email address (used for urgent renewal and security notices):
   you@example.com
   ```

2. **Terms of Service:** Type `Y` to agree
   ```
   (A)gree/(C)ancel: A
   ```

3. **Share email with EFF:** Type `N` (optional)
   ```
   (Y)es/(N)o: N
   ```

4. **Redirect HTTP to HTTPS:** Type `2` (recommended)
   ```
   1: No redirect - Keep HTTP
   2: Redirect - Make all requests redirect to secure HTTPS
   Select: 2
   ```

**Expected Output:**
```
Congratulations! You have successfully enabled HTTPS!

Your certificate and chain have been saved at:
/etc/letsencrypt/live/vogplus.ai/fullchain.pem

Your key file has been saved at:
/etc/letsencrypt/live/vogplus.ai/privkey.pem

Your certificate will expire on 2025-04-15.
```

---

## Step 6: Obtain SSL Certificate for App Subdomain

```bash
sudo certbot --nginx -d app.vogplus.ai
```

Follow the same prompts as above (email, agree, redirect).

**Expected Output:**
```
Congratulations! You have successfully enabled HTTPS!

Your certificate and chain have been saved at:
/etc/letsencrypt/live/app.vogplus.ai/fullchain.pem
```

---

## Step 7: Verify SSL Certificates

```bash
# List all certificates
sudo certbot certificates
```

**Expected Output:**
```
Found the following certs:
  Certificate Name: vogplus.ai
    Domains: vogplus.ai www.vogplus.ai
    Expiry Date: 2025-04-15
    Certificate Path: /etc/letsencrypt/live/vogplus.ai/fullchain.pem
    
  Certificate Name: app.vogplus.ai
    Domains: app.vogplus.ai
    Expiry Date: 2025-04-15
    Certificate Path: /etc/letsencrypt/live/app.vogplus.ai/fullchain.pem
```

---

## Step 8: Test HTTPS in Browser

Open your browser and test:

1. **Landing Page:**
   - `https://www.vogplus.ai` ✅ Green lock
   - `https://vogplus.ai` ✅ Redirects to www
   - `http://www.vogplus.ai` ✅ Redirects to HTTPS

2. **Main App:**
   - `https://app.vogplus.ai` ✅ Green lock
   - `https://app.vogplus.ai/api/healthz` ✅ Returns JSON

3. **Check Certificate Details:**
   - Click the **lock icon** in browser address bar
   - Should show: **"Issued by: Let's Encrypt"**
   - Valid until: ~3 months from now

---

## Step 9: Test SSL Configuration

### 9.1 Test with OpenSSL

```bash
# Test landing page
openssl s_client -connect www.vogplus.ai:443 -servername www.vogplus.ai < /dev/null

# Test app
openssl s_client -connect app.vogplus.ai:443 -servername app.vogplus.ai < /dev/null
```

Look for:
```
Verify return code: 0 (ok)
```

### 9.2 Test with SSL Labs

Go to: [https://www.ssllabs.com/ssltest/](https://www.ssllabs.com/ssltest/)

1. Enter: `www.vogplus.ai`
2. Click **"Submit"**
3. Wait for results (3-5 minutes)
4. **Target Grade:** A or A+

Repeat for `app.vogplus.ai`

---

## Step 10: Configure Auto-Renewal

Certbot automatically sets up renewal. Let's verify:

```bash
# Check renewal timer
sudo systemctl status certbot.timer
```

**Expected Output:**
```
● certbot.timer - Run certbot twice daily
     Loaded: loaded
     Active: active (waiting)
```

### Test Auto-Renewal

```bash
# Dry run (test without actually renewing)
sudo certbot renew --dry-run
```

**Expected Output:**
```
Congratulations, all simulated renewals succeeded:
  /etc/letsencrypt/live/vogplus.ai/fullchain.pem (success)
  /etc/letsencrypt/live/app.vogplus.ai/fullchain.pem (success)
```

---

## Step 11: Review Nginx Configuration

Certbot automatically updated your Nginx config. Let's verify:

```bash
# Check landing page config
sudo nano /etc/nginx/sites-available/vogplus-landing
```

You should see Certbot added these lines:

```nginx
server {
    listen 443 ssl;
    server_name vogplus.ai www.vogplus.ai;
    
    ssl_certificate /etc/letsencrypt/live/vogplus.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/vogplus.ai/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    
    # ... rest of config
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name vogplus.ai www.vogplus.ai;
    return 301 https://$host$request_uri;
}
```

---

## 🔧 Advanced: Improve SSL Security (Optional)

### Enable HSTS (HTTP Strict Transport Security)

Edit your Nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/vogplus-full
```

Add this inside each `server` block (HTTPS only):

```nginx
# Add to HTTPS server blocks
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
```

Test and reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Enable OCSP Stapling

Add to HTTPS server blocks:

```nginx
ssl_stapling on;
ssl_stapling_verify on;
ssl_trusted_certificate /etc/letsencrypt/live/vogplus.ai/chain.pem;
```

---

## 📊 SSL Configuration Summary

After setup, your configuration is:

| Domain             | HTTP (80)       | HTTPS (443)    | Certificate       |
|--------------------|-----------------|----------------|-------------------|
| vogplus.ai         | → HTTPS (301)   | ✅ Active      | Let's Encrypt     |
| www.vogplus.ai     | → HTTPS (301)   | ✅ Active      | Let's Encrypt     |
| app.vogplus.ai     | → HTTPS (301)   | ✅ Active      | Let's Encrypt     |

**Certificate Features:**
- ✅ Free (Let's Encrypt)
- ✅ Auto-renewing (every 60 days)
- ✅ Trusted by all browsers
- ✅ 90-day validity (auto-renewed at 60 days)
- ✅ Grade A/A+ SSL Labs rating

---

## ⚠️ Troubleshooting

### Issue 1: "Unable to find a matching server block"

**Cause:** Nginx config not found or incorrect domain

**Fix:**
```bash
# List Nginx configs
ls -la /etc/nginx/sites-available/
ls -la /etc/nginx/sites-enabled/

# Ensure symlink exists
sudo ln -sf /etc/nginx/sites-available/vogplus-full /etc/nginx/sites-enabled/

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

---

### Issue 2: "Connection timed out" on port 443

**Cause:** Firewall blocking HTTPS

**Fix:**
```bash
# Check Security Group in AWS
# Ensure port 443 is open to 0.0.0.0/0

# Check UFW (if enabled)
sudo ufw allow 443/tcp
sudo ufw reload
```

---

### Issue 3: "Certificate has expired"

**Cause:** Auto-renewal failed

**Fix:**
```bash
# Manually renew
sudo certbot renew --force-renewal

# Check renewal service
sudo systemctl status certbot.timer

# Enable if not active
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

---

### Issue 4: "NET::ERR_CERT_COMMON_NAME_INVALID"

**Cause:** Accessing domain not in certificate

**Fix:**
Ensure you obtained cert for all domains:
```bash
# Check certificates
sudo certbot certificates

# If domain missing, add it:
sudo certbot --nginx -d missing-domain.com
```

---

### Issue 5: Mixed content warnings

**Cause:** Page loads HTTPS but references HTTP resources

**Fix:**
1. Check browser console for mixed content errors
2. Update hardcoded HTTP URLs to HTTPS
3. Use protocol-relative URLs: `//example.com/style.css`

---

## 🔄 Manual Renewal (If Needed)

```bash
# Renew all certificates
sudo certbot renew

# Renew specific certificate
sudo certbot renew --cert-name vogplus.ai

# Force renewal (even if not expiring soon)
sudo certbot renew --force-renewal

# After renewal, reload Nginx
sudo systemctl reload nginx
```

---

## 📅 Certificate Lifecycle

```
Day 0:   Certificate issued (90-day validity)
Day 60:  Certbot attempts auto-renewal
Day 65:  Retry if first attempt failed
Day 70:  Retry if second attempt failed
Day 85:  Email warning sent
Day 90:  Certificate expires (site shows security warning)
```

**Best Practice:** Monitor renewal emails and check status monthly:

```bash
# Check expiry dates
sudo certbot certificates

# Check renewal logs
sudo journalctl -u certbot.timer
```

---

## ✅ Success Checklist

Verify everything is working:

- [ ] `https://www.vogplus.ai` - Green lock, no warnings
- [ ] `https://app.vogplus.ai` - Green lock, no warnings
- [ ] `http://www.vogplus.ai` - Redirects to HTTPS
- [ ] `http://app.vogplus.ai` - Redirects to HTTPS
- [ ] SSL Labs grade A or A+
- [ ] Auto-renewal timer active
- [ ] No mixed content warnings
- [ ] Certificate valid for 90 days
- [ ] Email notifications configured

---

## 🎉 You're Done!

Your site is now fully secured with HTTPS:

```
🔒 Landing Page:  https://www.vogplus.ai
🔒 Main App:      https://app.vogplus.ai  
🔄 Auto-Renewal:  Every 60 days
📧 Notifications: To your email
⭐ SSL Grade:     A/A+
```

**Your users will see:**
- Green lock icon in browser
- "Secure" or "Connection is secure" message
- No security warnings
- Trusted SSL certificate

Congratulations! 🎊

