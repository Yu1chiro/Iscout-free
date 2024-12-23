import express from 'express';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const initPuppeteer = async () => {
    // Konfigurasi khusus untuk Vercel Production
    const options = {
        args: [
            ...chromium.args,
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--single-process', // Penting untuk Vercel
            '--no-zygote' // Penting untuk Vercel
        ],
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
        defaultViewport: {
            width: 1920,
            height: 1080
        }
    };

    return await puppeteer.launch(options);
};

app.post('/scrape', async (req, res) => {
    const { url } = req.body;
    let browser = null;
    let page = null;

    try {
        console.log('Initiating scraping process for URL:', url);
        
        if (!url || !url.startsWith('https://iconscout.com/')) {
            throw new Error('Invalid IconScout URL');
        }

        browser = await initPuppeteer();
        console.log('Browser initialized successfully');

        page = await browser.newPage();
        
        // Konfigurasi page untuk environment production
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        await page.setRequestInterception(true);
        page.on('request', (request) => {
            if (['image', 'stylesheet', 'font'].includes(request.resourceType())) {
                request.abort();
            } else {
                request.continue();
            }
        });

        console.log('Navigating to URL...');
        await page.goto(url, { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });

        console.log('Waiting for content to load...');
        await page.waitForSelector('section.px-sm-7.p-5.results_vcd2w', {
            timeout: 15000
        });

        const imageUrls = await page.evaluate(() => {
            const images = document.querySelectorAll('section.px-sm-7.p-5.results_vcd2w picture.thumb_PdMgf img');
            return Array.from(images).map(img => img.src);
        });

        console.log(`Found ${imageUrls.length} images`);

        if (!imageUrls.length) {
            throw new Error('No images found on the page');
        }

        res.json({ 
            success: true,
            images: imageUrls,
            count: imageUrls.length
        });

    } catch (error) {
        console.error('Detailed scraping error:', {
            message: error.message,
            stack: error.stack,
            url: url
        });

        res.status(500).json({
            success: false,
            error: 'Scraping failed',
            details: error.message,
            timestamp: new Date().toISOString()
        });

    } finally {
        if (page) await page.close();
        if (browser) await browser.close();
        console.log('Browser session cleaned up');
    }
});

app.post('/download', async (req, res) => {
    const { imageUrl } = req.body;

    try {
        const response = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 15000
        });

        if (!response.ok) {
            throw new Error(`Download failed with status: ${response.status}`);
        }

        const buffer = await response.buffer();
        
        res.setHeader('Content-Type', response.headers.get('content-type') || 'image/jpeg');
        res.setHeader('Content-Disposition', 'attachment');
        res.send(buffer);

    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({
            success: false,
            error: 'Download failed',
            details: error.message
        });
    }
});

export default app;