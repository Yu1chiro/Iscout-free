import express from 'express';
import puppeteer from 'puppeteer-core';
import chrome from '@sparticuz/chromium';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

app.post('/scrape', async (req, res) => {
    const { url } = req.body;
    
    if (!url || !url.startsWith('https://iconscout.com/')) {
        return res.status(400).json({ error: 'Invalid URL. Must be an IconScout URL.' });
    }
    
    try {
        // Konfigurasi khusus untuk Vercel
        const browser = await puppeteer.launch({
            args: chrome.args,
            defaultViewport: chrome.defaultViewport,
            executablePath: await chrome.executablePath(),
            headless: true,
            ignoreHTTPSErrors: true
        });
        
        const page = await browser.newPage();
        
        // Tambahkan timeout yang lebih pendek
        await page.goto(url, { 
            waitUntil: 'networkidle0',
            timeout: 25000 
        });
        
        // Gunakan timeout yang lebih pendek untuk selector
        await page.waitForSelector('section.px-sm-7.p-5.results_vcd2w', {
            timeout: 20000
        });
        
        const imageUrls = await page.evaluate(() => {
            const images = document.querySelectorAll('section.px-sm-7.p-5.results_vcd2w picture.thumb_PdMgf img');
            return Array.from(images).map(img => img.src);
        });
        
        await browser.close();
        
        res.json({ images: imageUrls });
    } catch (error) {
        console.error('Scraping error:', error);
        res.status(500).json({ error: 'Failed to scrape images: ' + error.message });
    }
});

app.post('/download', async (req, res) => {
    try {
        const { imageUrl } = req.body;
        
        const response = await fetch(imageUrl);
        const buffer = await response.buffer();
        
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Content-Disposition', 'attachment');
        res.send(buffer);
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: 'Failed to download image' });
    }
});

export default app;