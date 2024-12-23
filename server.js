import express from 'express';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Konfigurasi Puppeteer yang dioptimalkan untuk Vercel
const getPuppeteerOptions = async () => ({
    args: [
        ...chromium.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--disable-web-security'
    ],
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: true,
    ignoreHTTPSErrors: true
});

// Improved scraping route
app.post('/scrape', async (req, res) => {
    const { url } = req.body;
    
    if (!url || !url.startsWith('https://iconscout.com/')) {
        return res.status(400).json({ error: 'Invalid URL. Must be an IconScout URL.' });
    }
    
    let browser;
    try {
        browser = await puppeteer.launch(await getPuppeteerOptions());
        const page = await browser.newPage();
        
        // Set longer timeout and additional headers
        await page.setDefaultNavigationTimeout(60000);
        await page.setExtraHTTPHeaders({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        });

        await page.goto(url, { 
            waitUntil: 'networkidle0',
            timeout: 60000 
        });

        // Wait for content to load
        await page.waitForSelector('section.px-sm-7.p-5.results_vcd2w', {
            timeout: 30000
        });

        // Extract image URLs with error handling
        const imageUrls = await page.evaluate(() => {
            const images = document.querySelectorAll('section.px-sm-7.p-5.results_vcd2w picture.thumb_PdMgf img');
            if (!images.length) {
                throw new Error('No images found on the page');
            }
            return Array.from(images).map(img => img.src);
        });

        if (!imageUrls.length) {
            throw new Error('No images were extracted');
        }

        res.json({ images: imageUrls });
    } catch (error) {
        console.error('Scraping error:', error);
        res.status(500).json({ 
            error: 'Failed to scrape images',
            details: error.message 
        });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
});

// Improved download route
app.post('/download', async (req, res) => {
    const { imageUrl } = req.body;
    
    if (!imageUrl) {
        return res.status(400).json({ error: 'Image URL is required' });
    }

    try {
        const response = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const buffer = await response.buffer();
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', 'attachment');
        res.send(buffer);
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ 
            error: 'Download failed',
            details: error.message 
        });
    }
});

export default app;