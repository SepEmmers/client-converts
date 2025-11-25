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
            // On mobile, we might want to show the button differently
            shareButton.style.display = 'flex';
            shareButton.addEventListener('click', async () => {
                try {
                    await navigator.share(shareData);
                } catch (err) {
                    console.log('Share canceled');
                }
            });
        }
    } else {
        // Fallback for desktop
        if(shareFallback) {
            shareFallback.style.display = 'flex';
        }
        // Hide the native button if not supported
        if(shareButton) {
            shareButton.style.display = 'none';
        }
    }

    // Copy Link Logic
    if (copyLinkBtn) {
        copyLinkBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(window.location.href).then(() => {
                const originalHTML = copyLinkBtn.innerHTML;
                copyLinkBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg> Copied!`;
                copyLinkBtn.classList.add('copied');
                
                setTimeout(() => {
                    copyLinkBtn.innerHTML = originalHTML;
                    copyLinkBtn.classList.remove('copied');
                }, 2000);
            });
        });
    }
});
