# iCloud Mail DNS Configuration for oweable.com

## DNS Records to Add in Vercel Dashboard

**Location:** Vercel Dashboard → Your Project → Settings → Domains → DNS Records

---

## MX Records (Mail Exchange)

### Record 1
- **Type:** `MX`
- **Name/Host:** `@` (or leave blank)
- **Value/Target:** `mx01.mail.icloud.com.`
- **Priority:** `10`
- **TTL:** Automatic (or 3600)

### Record 2
- **Type:** `MX`
- **Name/Host:** `@` (or leave blank)
- **Value/Target:** `mx02.mail.icloud.com.`
- **Priority:** `10`
- **TTL:** Automatic (or 3600)

---

## TXT Records

### Apple Domain Verification
- **Type:** `TXT`
- **Name/Host:** `@` (or leave blank)
- **Value:** `apple-domain=XY9t8t4YOhaXsF8K`
- **TTL:** Automatic (or 3600)

### SPF Record (Sender Policy Framework)
- **Type:** `TXT`
- **Name/Host:** `@` (or leave blank)
- **Value:** `v=spf1 include:icloud.com ~all`
- **TTL:** Automatic (or 3600)

---

## CNAME Record (DKIM)

### DKIM Signature
- **Type:** `CNAME`
- **Name/Host:** `sig1._domainkey`
- **Value/Target:** `sig1.dkim.www.oweable.com.at.icloudmailadmin.com.`
- **TTL:** Automatic (or 3600)

---

## Steps to Add in Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your **Oweable** project
3. Click **Settings** tab
4. Click **Domains** in the left sidebar
5. Find `oweable.com` in your domain list
6. Click on the domain or look for **DNS Records** section
7. Click **Add Record** for each record above
8. Fill in the Type, Name, Value, and other fields as specified
9. Save each record

---

## Important Notes

⚠️ **Propagation Time:** DNS changes can take up to 24-48 hours to propagate globally, though usually it's much faster (minutes to a few hours).

⚠️ **Existing Records:** If you have existing MX records, you may need to remove or update them to avoid conflicts.

⚠️ **SPF Conflicts:** If you already have an SPF record, you'll need to merge them. You cannot have multiple SPF records. The format would be:
```
v=spf1 include:icloud.com include:other-service.com ~all
```

✅ **Verification:** After adding these records, you can verify them using:
- [MX Toolbox](https://mxtoolbox.com/)
- [Google Admin Toolbox - Check MX](https://toolbox.googleapps.com/apps/checkmx/)
- Command line: `dig oweable.com MX` or `nslookup -type=MX oweable.com`

---

## Quick Copy-Paste Summary

```
MX    @    mx01.mail.icloud.com.    Priority: 10
MX    @    mx02.mail.icloud.com.    Priority: 10
TXT   @    apple-domain=XY9t8t4YOhaXsF8K
TXT   @    v=spf1 include:icloud.com ~all
CNAME sig1._domainkey    sig1.dkim.www.oweable.com.at.icloudmailadmin.com.
```

---

**Generated:** 2026-04-25  
**Domain:** oweable.com  
**Service:** iCloud Mail
