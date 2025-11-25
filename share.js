document.addEventListener('DOMContentLoaded', () => {
    const shareButton = document.getElementById('share-btn');
    const shareFallback = document.getElementById('share-fallback');
    const copyLinkBtn = document.getElementById('copy-link-btn');
    
    // Data to share
    const shareData = {
        title: document.title,
        text: document.querySelector('meta[name="description"]')?.content || 'Check out this free tool!',
        url: window.location.href
    };

    // If native share is supported (Mobile / Modern Browsers)
    if (navigator.share) {
        if(shareButton) {
            shareButton.style.display = 'inline-flex';
            shareButton.addEventListener('click', async () => {
                try {
                    await navigator.share(shareData);
                } catch (err) {
                    console.log('Share canceled');
                }
            });
        }
    } else {
        // Fallback for desktop without native share
        if(shareFallback) {
            shareFallback.style.display = 'flex';
        }
    }

    // Copy Link Logic
    if (copyLinkBtn) {
        copyLinkBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(window.location.href).then(() => {
                const originalText = copyLinkBtn.innerText;
                copyLinkBtn.innerText = 'Copied!';
                setTimeout(() => {
                    copyLinkBtn.innerText = originalText;
                }, 2000);
            });
        });
    }
});
