import express from 'express';
import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static('public'));

app.post('/scrape', async (req, res) => {
    const { url } = req.body;
    
    if (!url || !url.startsWith('https://iconscout.com/')) {
        return res.status(400).json({ error: 'Invalid URL. Must be an IconScout URL.' });
    }

    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        
        // Navigate to the URL
        await page.goto(url, { waitUntil: 'networkidle0' });

        // Wait for the results container to load
        await page.waitForSelector('section.px-sm-7.p-5.results_vcd2w');

        // Extract all image URLs
        const imageUrls = await page.evaluate(() => {
            const images = document.querySelectorAll('section.px-sm-7.p-5.results_vcd2w picture.thumb_PdMgf img');
            return Array.from(images).map(img => img.src);
        });

        await browser.close();

        res.json({ images: imageUrls });
    } catch (error) {
        console.error('Scraping error:', error);
        res.status(500).json({ error: 'Failed to scrape images' });
    }
});

// Endpoint baru untuk mengunduh gambar
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

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});