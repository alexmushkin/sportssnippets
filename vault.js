document.addEventListener('DOMContentLoaded', () => {
    const track = document.getElementById('carousel-track');
    const searchInput = document.getElementById('vault-search');

    // --- FETCH AND POPULATE CAROUSEL ---
    fetch('articles.json')
        .then(response => response.json())
        .then(articles => {
            populateCarousel(articles);
            setupSearch(articles);
            initAnimationTrigger();
        })
        .catch(err => console.error("Could not load articles:", err));

    function createCard(articleConfig) {
        const card = document.createElement('div');
        card.className = 'card';
        card.setAttribute('title', `Click to read: ${articleConfig.title}`);

        // Background Layer (Can add image here later)
        const bgLayer = document.createElement('div');
        bgLayer.className = 'card-bg';
        if (articleConfig.image) {
            bgLayer.style.backgroundImage = `url(${articleConfig.image})`;
            bgLayer.style.backgroundSize = 'cover';
        }
        card.appendChild(bgLayer);

        // Title text
        const titleLayer = document.createElement('div');
        titleLayer.className = 'card-title';
        titleLayer.textContent = articleConfig.title;
        card.appendChild(titleLayer);

        // Hover Pausing
        card.addEventListener('mouseenter', () => {
            track.classList.add('hover-paused');
        });
        card.addEventListener('mouseleave', () => {
            track.classList.remove('hover-paused');
        });

        // Click to navigate
        card.addEventListener('click', (e) => {
            e.stopPropagation();
            if (articleConfig.link) {
                window.location.href = articleConfig.link;
            }
        });

        return card;
    }

    function populateCarousel(articles) {
        // We need the visual track to be long enough.
        // If there are very few articles, duplicate them internally to pad the length.
        let baseArticles = [...articles];
        while (baseArticles.length < 10) {
            baseArticles = [...baseArticles, ...articles];
        }

        // To make the left CSS animation (-50%) loop perfectly, 
        // we must append exactly two identical sets of the base sequence.
        const fullSequence = [...baseArticles, ...baseArticles];

        fullSequence.forEach(article => {
            track.appendChild(createCard(article));
        });
    }

    // --- ENHANCED NAVIGATION ---
    function setupSearch(articles) {
        if (searchInput) {
            searchInput.disabled = false;
            searchInput.style.opacity = "1";

            // Note: Since cards are now dynamic and repeated, search might just navigate directly.
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const query = e.target.value.trim().toLowerCase();
                    const match = articles.find(a => a.title.toLowerCase().includes(query));
                    if (match && match.link) {
                        window.location.href = match.link;
                    }
                }
            });
        }
    }

    // --- SCROLL ARROW LOGIC (HOVER BASED) ---
    const arrowRight = document.getElementById('scroll-arrow-right');
    const arrowLeft = document.getElementById('scroll-arrow-left');

    if (track) {
        let isScrolling = false;
        let scrollDirection = 0;
        let lastTimestamp = 0;
        let currentOffset = 0;

        function step(timestamp) {
            if (!isScrolling) return;
            if (!lastTimestamp) lastTimestamp = timestamp;
            const dt = (timestamp - lastTimestamp) / 1000;
            lastTimestamp = timestamp;

            let animation = track.getAnimations()[0];
            if (animation) {
                // Determine current duration based on CSS or default to 60000ms
                const duration = animation.effect.getTiming().duration || 60000;
                
                // Advance the playhead in milliseconds
                // scrollDirection determines speed multiplier. E.g. 5.0 -> 5x speed
                let newTime = animation.currentTime + (scrollDirection * dt * 1000 * 5);
                
                // Wrap around logic
                if (newTime >= duration) newTime -= duration;
                if (newTime < 0) newTime += duration;
                
                animation.currentTime = newTime;
            }

            requestAnimationFrame(step);
        }

        const startScrolling = (dir) => {
            isScrolling = true;
            scrollDirection = dir;
            lastTimestamp = performance.now();
            requestAnimationFrame(step);
        };

        const stopScrolling = () => {
            isScrolling = false;
        };

        if (arrowRight) {
            arrowRight.addEventListener('mouseenter', () => startScrolling(1));  // Speed up forward
            arrowRight.addEventListener('mouseleave', stopScrolling);
        }

        if (arrowLeft) {
            arrowLeft.addEventListener('mouseenter', () => startScrolling(-2)); // Reverse scroll
            arrowLeft.addEventListener('mouseleave', stopScrolling);
        }
    }

    // --- ANIMATION TRIGGER LOGIC ---
    function initAnimationTrigger() {
        const triggerPoint = window.innerWidth * 0.60;
        const silenceThreshold = window.innerWidth * 0.50;
        const cards = document.querySelectorAll('.card');

        // Initial Scan
        cards.forEach(card => {
            const rect = card.getBoundingClientRect();
            if (rect.left < silenceThreshold) {
                card.classList.add('animation-silenced');
            }
        });

        // Continuous Loop
        function checkCenterFocus() {
            const dynamicTrigger = window.innerWidth * 0.60;

            cards.forEach(card => {
                const rect = card.getBoundingClientRect();

                if (rect.left < dynamicTrigger) {
                    if (!card.classList.contains('animation-silenced')) {
                        if (!card.classList.contains('in-center')) {
                            card.classList.add('in-center');
                        }
                    }
                } else {
                    if (card.classList.contains('in-center')) {
                        card.classList.remove('in-center');
                    }
                    if (card.classList.contains('animation-silenced')) {
                        card.classList.remove('animation-silenced');
                    }
                }
            });
            requestAnimationFrame(checkCenterFocus);
        }

        requestAnimationFrame(checkCenterFocus);
    }
});
