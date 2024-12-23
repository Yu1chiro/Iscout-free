let currentPageNumber = 1;

function updateURL(pageNumber) {
    const urlInput = document.getElementById('urlInput');
    const baseUrl = urlInput.value.split('?')[0];
    return `${baseUrl}?page=${pageNumber}`;
}

function changePage(direction) {
    if (direction === 'next') {
        currentPageNumber++;
    } else if (direction === 'prev' && currentPageNumber > 1) {
        currentPageNumber--;
    }
    
    document.getElementById('currentPage').textContent = `Page ${currentPageNumber}`;
    document.getElementById('prevButton').disabled = currentPageNumber === 1;
    
    const newUrl = updateURL(currentPageNumber);
    document.getElementById('urlInput').value = newUrl;
    scrapeImages();
}

async function scrapeImages() {
    const urlInput = document.getElementById('urlInput');
    const loadingState = document.getElementById('loadingState');
    const resultsGrid = document.getElementById('resultsGrid');
    const paginationControls = document.getElementById('paginationControls');

    if (!urlInput.value) {
        alert('Mohon masukkan URL yang valid');
        return;
    }

    loadingState.classList.remove('hidden');
    resultsGrid.innerHTML = '';

    try {
        const response = await fetch('/scrape', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: urlInput.value })
        });

        const data = await response.json();
        
        loadingState.classList.add('hidden');
        paginationControls.classList.remove('hidden');

        data.images.forEach(imageUrl => {
            const imgContainer = document.createElement('div');
            imgContainer.className = 'relative group';
            
            const imgWrapper = document.createElement('div');
            imgWrapper.className = 'aspect-square rounded-lg overflow-hidden shadow-md relative';
            
            const img = document.createElement('img');
            img.src = imageUrl;
            img.className = 'w-full h-full object-cover transition-transform duration-300 group-hover:scale-110';
            
            const downloadButton = document.createElement('button');
            downloadButton.className = 'absolute bottom-4 right-4 bg-blue-600 text-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-blue-700';
            downloadButton.innerHTML = '<i class="fas fa-download"></i>';
            downloadButton.onclick = () => downloadImage(imageUrl);
            
            const overlay = document.createElement('div');
            overlay.className = 'absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity duration-300';
            
            imgWrapper.appendChild(img);
            imgWrapper.appendChild(overlay);
            imgWrapper.appendChild(downloadButton);
            imgContainer.appendChild(imgWrapper);
            resultsGrid.appendChild(imgContainer);
        });
    } catch (error) {
        console.error('Error:', error);
        loadingState.classList.add('hidden');
        alert('Terjadi kesalahan saat mengambil gambar');
    }
}

async function downloadImage(url) {
    try {
        const response = await fetch('/download', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ imageUrl: url })
        });
        
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        
        const filename = url.split('/').pop().split('?')[0] || 'image.jpg';
        link.setAttribute('download', filename);
        
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
        console.error('Error downloading image:', error);
        alert('Gagal mengunduh gambar. Silakan coba lagi.');
    }
}

document.getElementById('urlInput').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        scrapeImages();
    }
});
