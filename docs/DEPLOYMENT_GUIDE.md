# 🚀 Portfolio Website Deployment Guide

This comprehensive guide will walk you through deploying your modern portfolio website from development to production, including domain setup and cloud services.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Cloud Storage Setup](#cloud-storage-setup)
5. [Email Configuration](#email-configuration)
6. [Frontend Deployment](#frontend-deployment)
7. [Backend Deployment](#backend-deployment)
8. [Domain & DNS Setup](#domain--dns-setup)
9. [SSL Certificate](#ssl-certificate)
10. [Performance Optimization](#performance-optimization)
11. [Monitoring & Analytics](#monitoring--analytics)
12. [Maintenance](#maintenance)

## 🔧 Prerequisites

Before starting, ensure you have:

- Node.js (v18 or higher)
- Git
- A GitHub account
- A credit card for cloud services (most have free tiers)

## 🌍 Environment Setup

### 1. Local Development Setup

```bash
# Clone your repository
git clone <your-repo-url>
cd your-portfolio-website

# Install frontend dependencies
cd frontend
# No npm install needed for vanilla JS/HTML/CSS

# Install backend dependencies
cd ../backend
npm install

# Copy environment file
cp .env.example .env
```

### 2. Environment Variables

Edit the `.env` file with your configuration:

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=your-mongodb-connection-string
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
# ... other variables
```

## 🗄️ Database Setup

### Option 1: MongoDB Atlas (Recommended)

1. **Create MongoDB Atlas Account**
   - Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Sign up for free account
   - Create a new cluster (M0 Sandbox is free)

2. **Configure Database**
   ```bash
   # Create database user
   # Go to Database Access > Add New Database User
   # Username: portfolio-user
   # Password: Generate secure password
   
   # Whitelist IP addresses
   # Go to Network Access > Add IP Address
   # Add: 0.0.0.0/0 (for all IPs) or specific deployment IPs
   ```

3. **Get Connection String**
   ```
   mongodb+srv://username:password@cluster.mongodb.net/portfolio
   ```

### Option 2: Local MongoDB

```bash
# Install MongoDB locally
# macOS
brew tap mongodb/brew
brew install mongodb-community@7.0

# Ubuntu
sudo apt install mongodb

# Start MongoDB
brew services start mongodb/brew/mongodb-community
# or
sudo systemctl start mongod
```

## ☁️ Cloud Storage Setup

### Cloudflare R2 (Recommended - Cost Effective)

1. **Create Cloudflare Account**
   - Sign up at [Cloudflare](https://www.cloudflare.com)
   - Go to R2 Object Storage

2. **Create R2 Bucket**
   ```bash
   # Bucket name: portfolio-assets
   # Region: Auto (Cloudflare chooses optimal)
   ```

3. **Generate API Keys**
   - Go to R2 > Manage R2 API tokens
   - Create API token with R2 permissions
   - Note down: Account ID, Access Key ID, Secret Access Key

4. **Configure Custom Domain (Optional)**
   - Add custom domain to bucket for better URLs
   - Example: `assets.pranavbadgi.com`

### Alternative: Firebase Storage

1. **Create Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Create new project

2. **Enable Storage**
   - Go to Storage > Get Started
   - Choose production mode

3. **Get Configuration**
   - Go to Project Settings > General
   - Add web app and copy config

## 📧 Email Configuration

### Gmail SMTP (Free)

1. **Enable 2-Factor Authentication**
   - Go to Google Account settings
   - Enable 2FA

2. **Generate App Password**
   - Go to Google Account > Security > App passwords
   - Generate password for "Mail"
   - Use this in EMAIL_PASS environment variable

3. **Configure Environment**
   ```env
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your.email@gmail.com
   EMAIL_PASS=your-app-password
   ```

### Alternative: SendGrid, Mailgun, or AWS SES

- **SendGrid**: Free tier (100 emails/day)
- **Mailgun**: Free tier (5,000 emails/month)
- **AWS SES**: Pay per use, very cheap

## 🌐 Frontend Deployment

### Option 1: Vercel (Recommended for Static Sites)

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy**
   ```bash
   cd frontend
   vercel
   
   # Follow prompts:
   # - Link to existing project or create new
   # - Choose framework: Other
   # - Build command: (leave empty for static sites)
   # - Output directory: . (current directory)
   ```

3. **Custom Domain**
   - Go to Vercel dashboard
   - Add domain in project settings
   - Follow DNS configuration

### Option 2: Netlify

1. **Manual Deploy**
   - Go to [Netlify](https://www.netlify.com)
   - Drag and drop your `frontend` folder

2. **Git Integration**
   - Connect your GitHub repository
   - Set build settings:
     - Build command: (empty for static)
     - Publish directory: `frontend`

### Option 3: GitHub Pages

1. **Enable GitHub Pages**
   - Go to repository settings
   - Enable Pages from main branch `/frontend`

2. **Custom Domain**
   - Add CNAME file in frontend folder
   - Configure DNS

## 🚀 Backend Deployment

### Option 1: Railway (Recommended - Simple & Free Tier)

1. **Create Account**
   - Sign up at [Railway](https://railway.app)
   - Connect GitHub account

2. **Deploy**
   ```bash
   # Connect repository
   # Railway will auto-detect Node.js
   # Set start command: npm start
   # Set root directory: backend
   ```

3. **Environment Variables**
   - Add all variables from your `.env` file
   - Set `NODE_ENV=production`

### Option 2: Heroku

1. **Install Heroku CLI**
   ```bash
   # Install CLI
   npm install -g heroku
   
   # Login
   heroku login
   ```

2. **Deploy**
   ```bash
   cd backend
   
   # Create Heroku app
   heroku create your-portfolio-api
   
   # Set environment variables
   heroku config:set NODE_ENV=production
   heroku config:set MONGODB_URI=your-connection-string
   # ... add all other env vars
   
   # Deploy
   git subtree push --prefix backend heroku main
   ```

### Option 3: DigitalOcean App Platform

1. **Create Account**
   - Sign up at [DigitalOcean](https://www.digitalocean.com)

2. **Create App**
   - Choose GitHub repository
   - Detect Node.js service
   - Set environment variables

### Option 4: VPS (Advanced)

1. **Create VPS**
   - DigitalOcean Droplet
   - AWS EC2
   - Linode

2. **Server Setup**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PM2
   sudo npm install -g pm2
   
   # Install Nginx
   sudo apt install nginx
   ```

3. **Deploy Application**
   ```bash
   # Clone repository
   git clone your-repo
   cd your-portfolio/backend
   
   # Install dependencies
   npm install --production
   
   # Start with PM2
   pm2 start server.js --name portfolio-backend
   pm2 startup
   pm2 save
   ```

4. **Nginx Configuration**
   ```nginx
   # /etc/nginx/sites-available/portfolio
   server {
       listen 80;
       server_name api.pranavbadgi.com;
       
       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

## 🌐 Domain & DNS Setup

### 1. Purchase Domain

**Recommended Registrars:**
- [Namecheap](https://www.namecheap.com) - Good prices, good support
- [Google Domains](https://domains.google.com) - Simple interface
- [Cloudflare Registrar](https://www.cloudflare.com/products/registrar/) - At-cost pricing

### 2. DNS Configuration

Example DNS records for `pranavbadgi.com`:

```
Type    Name    Value                           TTL
A       @       [Your frontend hosting IP]      300
A       www     [Your frontend hosting IP]      300
CNAME   api     your-backend-url.railway.app    300
CNAME   assets  your-account-id.r2.dev          300
```

**Using Cloudflare (Recommended):**
1. Add domain to Cloudflare
2. Update nameservers at registrar
3. Configure DNS records
4. Enable proxy (orange cloud) for main domain
5. Disable proxy for API subdomain if needed

## 🔒 SSL Certificate

### Automatic SSL (Most Hosting Providers)

Most modern hosting providers (Vercel, Netlify, Railway) provide automatic SSL certificates via Let's Encrypt.

### Manual SSL with Let's Encrypt (VPS)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d pranavbadgi.com -d www.pranavbadgi.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## ⚡ Performance Optimization

### 1. Frontend Optimization

```html
<!-- Compress images -->
<img src="image.webp" alt="Description" loading="lazy">

<!-- Minify CSS/JS -->
<!-- Use tools like Parcel, Webpack, or online minifiers -->

<!-- Enable caching headers -->
<meta http-equiv="Cache-Control" content="public, max-age=31536000">
```

### 2. Backend Optimization

```javascript
// Enable compression
app.use(compression());

// Set cache headers
app.use(express.static('public', {
  maxAge: '1y',
  etag: false
}));

// Database optimization
// Add indexes to frequently queried fields
// Use MongoDB Atlas auto-indexing
```

### 3. CDN Setup

**Cloudflare CDN (Free):**
1. Add domain to Cloudflare
2. Enable proxy (orange cloud)
3. Configure caching rules
4. Enable auto-minification

### 4. Image Optimization

```javascript
// In your upload route
const sharp = require('sharp');

// Optimize images
const optimizedBuffer = await sharp(buffer)
  .resize(1920, null, { withoutEnlargement: true })
  .webp({ quality: 85 })
  .toBuffer();
```

## 📊 Monitoring & Analytics

### 1. Google Analytics

```html
<!-- Add to your HTML head -->
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

### 2. Backend Monitoring

```bash
# PM2 monitoring
pm2 monit

# Health check endpoint
curl https://api.pranavbadgi.com/api/health
```

### 3. Uptime Monitoring

**Free Services:**
- [UptimeRobot](https://uptimerobot.com)
- [Pingdom](https://www.pingdom.com)
- [StatusCake](https://www.statuscake.com)

## 🔧 Maintenance

### 1. Regular Updates

```bash
# Update dependencies
npm update

# Security audit
npm audit fix

# Update Node.js
# Check latest LTS version
```

### 2. Backup Strategy

```bash
# Database backup (MongoDB Atlas)
# Use Atlas backup feature (automated)

# Code backup
# Git repository (already backed up)

# File storage backup
# Cloudflare R2 has built-in redundancy
```

### 3. Monitoring Logs

```bash
# PM2 logs
pm2 logs

# System logs
sudo journalctl -u nginx
sudo journalctl -f
```

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   # Check connection string
   # Verify IP whitelist
   # Check credentials
   ```

2. **Email Not Sending**
   ```bash
   # Verify SMTP settings
   # Check app password
   # Test with curl
   ```

3. **Images Not Loading**
   ```bash
   # Check CORS settings
   # Verify bucket permissions
   # Check file paths
   ```

4. **SSL Certificate Issues**
   ```bash
   # Check domain propagation
   # Verify DNS settings
   # Renew certificate
   ```

## 📝 Deployment Checklist

### Pre-Deployment
- [ ] All environment variables configured
- [ ] Database connection tested
- [ ] Email functionality tested
- [ ] Image upload working
- [ ] All links working locally
- [ ] Mobile responsiveness checked
- [ ] Performance tested

### Deployment
- [ ] Frontend deployed
- [ ] Backend deployed
- [ ] Database connected
- [ ] Environment variables set
- [ ] DNS configured
- [ ] SSL certificate active

### Post-Deployment
- [ ] All pages loading correctly
- [ ] Contact form working
- [ ] Images loading from CDN
- [ ] Analytics tracking
- [ ] Monitoring setup
- [ ] Backup strategy in place

## 💡 Cost Breakdown

### Free Tier Options
- **Hosting**: Vercel/Netlify (Frontend), Railway (Backend)
- **Database**: MongoDB Atlas (512MB)
- **Storage**: Cloudflare R2 (10GB)
- **Email**: Gmail SMTP (Limited)
- **Domain**: $10-15/year
- **SSL**: Free (Let's Encrypt)

**Total Monthly Cost: ~$1-2** (just domain cost)

### Paid Tier (Recommended for Production)
- **Hosting**: $5-10/month
- **Database**: $9/month (MongoDB Atlas M10)
- **Storage**: $1-5/month
- **Email**: $10/month (SendGrid Pro)
- **Monitoring**: $5/month
- **Domain**: $10-15/year

**Total Monthly Cost: ~$30-40**

## 🆘 Support & Resources

- **Documentation**: Keep this guide updated
- **Community**: Stack Overflow, Discord servers
- **Monitoring**: Set up alerts for downtime
- **Backup**: Regular automated backups

---

**Congratulations! 🎉** Your portfolio website is now live and ready to showcase your work to the world!

Remember to:
- Update content regularly
- Monitor performance
- Keep dependencies updated
- Backup important data
- Collect user feedback

Good luck with your portfolio! 🚀