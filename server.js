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
        console.error('Invalid URL received:', url);
        return res.status(400).json({ error: 'Invalid URL. Must be an IconScout URL.' });
    }

    try {
        const browser = await puppeteer.launch({ headless: true }); // Headless harus benar-benar diaktifkan
        const page = await browser.newPage();
        
        await page.goto(url, { waitUntil: 'networkidle0' });

        // Periksa apakah elemen yang diharapkan benar-benar ada
        const resultsSelector = 'section.px-sm-7.p-5.results_vcd2w';
        const isResultsLoaded = await page.$(resultsSelector);

        if (!isResultsLoaded) {
            console.error('Results container not found on the page:', url);
            await browser.close();
            return res.status(404).json({ error: 'Results container not found on the page' });
        }

        // Extract image URLs
        const imageUrls = await page.evaluate(() => {
            const images = document.querySelectorAll('section.px-sm-7.p-5.results_vcd2w picture.thumb_PdMgf img');
            return Array.from(images).map(img => img.src);
        });

        console.log('Scraped image URLs:', imageUrls);
        await browser.close();

        res.json({ images: imageUrls });
    } catch (error) {
        console.error('Scraping error:', error.message);
        res.status(500).json({ error: 'Failed to scrape images' });
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
