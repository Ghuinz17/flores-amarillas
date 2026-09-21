document.addEventListener('DOMContentLoaded', () => {
    const starsContainer = document.getElementById('starsContainer');
    const bouquetBtn = document.getElementById('bouquetBtn');
    const messageCard = document.getElementById('messageCard');

    // 1. Generar estrellas aleatorias
    const starCount = 80;
    for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.classList.add('star');
        star.style.top = `${Math.random() * 100}%`;
        star.style.left = `${Math.random() * 100}%`;
        const size = `${Math.random() * 2 + 1}px`;
        star.style.width = size;
        star.style.height = size;
        star.style.animationDuration = `${Math.random() * 3 + 2}s`;
        star.style.animationDelay = `${Math.random() * 2}s`;
        starsContainer.appendChild(star);
    }

    let opened = false;

    // 2. Efecto al hacer clic en el área de la flor
    bouquetBtn.addEventListener('click', () => {
        // Activar animación de desaparición
        bouquetBtn.classList.add('clicked');
        
        // Mostrar la tarjeta con retraso
        setTimeout(() => {
            messageCard.classList.add('show');
        }, 700);

        // Lanzar pétalos mágicos flotantes
        if (!opened) {
            createPetals();
            opened = true;
        }
    });

    // Función para generar pétalos cayendo
    function createPetals() {
        for (let i = 0; i < 35; i++) {
            setTimeout(() => {
                const petal = document.createElement('div');
                petal.classList.add('floating-petal');
                
                // Posición inicial cerca del centro de la pantalla
                const posX = Math.random() * window.innerWidth;
                const posY = window.innerHeight * 0.2; // Cerca de donde estaba la flor
                petal.style.left = `${posX}px`;
                petal.style.top = `${posY}px`;
                
                const size = Math.random() * 12 + 10;
                petal.style.width = `${size}px`;
                petal.style.height = `${size * 1.4}px`;
                
                const duration = Math.random() * 4 + 3;
                petal.style.animationDuration = `${duration}s`;
                
                document.body.appendChild(petal);
                
                setTimeout(() => {
                    petal.remove();
                }, duration * 1000);
            }, i * 80);
        }
    }
});