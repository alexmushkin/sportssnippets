document.addEventListener('DOMContentLoaded', () => {
    const track = document.getElementById('rolodexTrack');
    const arrowDown = document.getElementById('scrollArrowDown');
    const arrowUp = document.getElementById('scrollArrowUp');

    // Config
    const visibleCount = 3;
    let cards = [];
    let totalCards = 0;
    let currentIndex = 0;

    // Height Calculation
    const itemStep = 260;

    function updateArrows() {
        if (currentIndex === 0) {
            arrowUp.classList.add('hidden');
        } else {
            arrowUp.classList.remove('hidden');
        }

        if (currentIndex + visibleCount >= totalCards) {
            arrowDown.classList.add('hidden');
        } else {
            arrowDown.classList.remove('hidden');
        }
    }

    arrowDown.addEventListener('click', () => {
        if (currentIndex + visibleCount < totalCards) {
            currentIndex += visibleCount;
            updateScroll();
        }
    });

    arrowUp.addEventListener('click', () => {
        if (currentIndex > 0) {
            currentIndex -= visibleCount;
            if (currentIndex < 0) currentIndex = 0;
            updateScroll();
        }
    });

    function updateScroll() {
        const translateValue = -(currentIndex * itemStep);
        track.style.transform = `translateY(${translateValue}px)`;
        updateArrows();
    }

    // Fetch and render logic
    fetch('this-week-articles.json')
        .then(response => response.json())
        .then(articles => {
            renderRolodex(articles);
            if (articles.length > 0) {
                loadArticle(articles[0]);
            }
        })
        .catch(error => console.error("Error loading articles:", error));

    function renderRolodex(articles) {
        track.innerHTML = '';
        articles.forEach((article, index) => {
            const card = document.createElement('div');
            card.className = index === 0 ? 'rolodex-card feature-card' : 'rolodex-card';
            card.innerHTML = `
                <div class="card-image-slot" style="background-image: url('${article.thumbnailImage}');"></div>
                <div class="card-nameplate">
                    <span class="nameplate-main">${article.title}</span>
                    <span class="nameplate-sub">${article.subtitle}</span>
                </div>
                <div class="card-description-overlay">
                    ${article.description}
                    <div class="card-stats-area">${article.thumbnailStats}</div>
                </div>
            `;
            card.addEventListener('click', () => {
                document.querySelectorAll('.rolodex-card').forEach(c => c.classList.remove('feature-card'));
                card.classList.add('feature-card');
                loadArticle(article);
            });
            track.appendChild(card);
        });
        cards = document.querySelectorAll('.rolodex-card');
        totalCards = cards.length;
        updateArrows();
    }

    function loadArticle(article) {
        const mainContent = document.getElementById('mainContentArea');
        
        fetch(article.markdownFile)
            .then(response => response.text())
            .then(markdown => {
                let statsHtml = '';
                if (article.mainStats && article.mainStats.length > 0) {
                    statsHtml = `<div class="card-header-stats" style="width: 100%; justify-content: center; box-sizing: border-box; border-radius: 4px; margin-bottom: 20px;">` + 
                        article.mainStats.map(stat => `<span class="stat-item">${stat}</span>`).join('') + 
                        `</div>`;
                }

                mainContent.innerHTML = `
                    <div class="main-card-scrollable sports-card main-feature-card" style="display: flex; flex-direction: column; align-items: center; border: none; box-shadow: none; background: transparent; margin: 0; max-width: 750px;">
                        ${statsHtml}
                        <h2 style="color: #FF5722; font-family: 'Courier New', monospace; font-size: 1.45rem; text-transform: uppercase; margin-bottom: 20px; text-align: center; align-self: center; padding-top: 10px; width: 100%;">${article.mainHeader}</h2>
                        <div class="card-body" style="padding: 10px 0 40px 0; font-family: 'Courier New', monospace; font-size: 1.1rem; line-height: 1.6; text-align: center; white-space: pre-wrap; color: #000; width: 100%;"></div>
                    </div>
                `;
                // Set raw text to perfectly match homepage
                mainContent.querySelector('.card-body').textContent = markdown;
            })
            .catch(error => console.error("Error loading markdown:", error));
    }
});
