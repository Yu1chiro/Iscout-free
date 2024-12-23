import express from 'express';
import puppeteer from 'puppeteer-core';
import chrome from '@sparticuz/chromium';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Serve index.html for the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Scraping route
app.post('/scrape', async (req, res) => {
    const { url } = req.body;
    
    if (!url || !url.startsWith('https://iconscout.com/')) {
        return res.status(400).json({ error: 'Invalid URL' });
    }
    
    try {
        const browser = await puppeteer.launch({
            args: [
                ...chrome.args,
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage'
            ],
            executablePath: await chrome.executablePath(),
            headless: chrome.headless,
            ignoreHTTPSErrors: true
        });

        const page = await browser.newPage();
        
        // Set strict timeout
        await page.setDefaultNavigationTimeout(15000);
        await page.setDefaultTimeout(15000);
        
        await page.goto(url, { waitUntil: 'networkidle0' });
        
        const imageUrls = await page.evaluate(() => {
            const images = document.querySelectorAll('section.px-sm-7.p-5.results_vcd2w picture.thumb_PdMgf img');
            return Array.from(images).map(img => img.src);
        });
        
        await browser.close();
        
        return res.status(200).json({ images: imageUrls });
    } catch (error) {
        console.error('Scraping error:', error);
        return res.status(500).json({ 
            error: 'Scraping failed',
            details: error.message 
        });
    }
});

// Download route
app.post('/download', async (req, res) => {
    try {
        const { imageUrl } = req.body;
        const response = await fetch(imageUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const buffer = await response.buffer();
        
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Content-Disposition', 'attachment');
        res.send(buffer);
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: 'Download failed' });
    }
});

export default app;
