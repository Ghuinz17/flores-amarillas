document.addEventListener('DOMContentLoaded', () => {
    const starsContainer = document.getElementById('starsContainer');
    const bouquetBtn = document.getElementById('bouquetBtn');
    const messageCard = document.getElementById('messageCard');

    // Generar estrellas aleatorias en el fondo
    const starCount = 60;
    for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.classList.add('star');
        
        // Posición aleatoria, tamaño y duración de parpadeo
        star.style.top = `${Math.random() * 100}%`;
        star.style.left = `${Math.random() * 100}%`;
        const size = `${Math.random() * 3 + 1}px`;
        star.style.width = size;
        star.style.height = size;
        star.style.animationDuration = `${Math.random() * 3 + 1}s`;
        star.style.animationDelay = `${Math.random() * 2}s`;
        
        starsContainer.appendChild(star);
    }

    // Iniciar el ramo cerrado
    bouquetBtn.classList.add('initial');

    let opened = false;

    // Efecto al hacer clic en el ramo
    bouquetBtn.addEventListener('click', () => {
        // Abrir flores
        bouquetBtn.classList.remove('initial');
        
        // Mostrar la tarjeta con retraso
        setTimeout(() => {
            messageCard.classList.add('show');
        }, 500);

        // Ocultar texto de ayuda una vez abierto
        const hint = bouquetBtn.querySelector('.hint-text');
        if (hint) hint.style.display = 'none';

        // Lanzar pétalos mágicos flotantes por primera vez
        if (!opened) {
            createPetals();
            opened = true;
        }
    });

    // Función para generar pétalos cayendo
    function createPetals() {
        for (let i = 0; i < 25; i++) {
            setTimeout(() => {
                const petal = document.createElement('div');
                petal.classList.add('floating-petal');
                
                // Posición inicial cerca del ramo
                const rect = bouquetBtn.getBoundingClientRect();
                petal.style.left = `${rect.left + rect.width / 2 + (Math.random() * 100 - 50)}px`;
                petal.style.top = `${rect.top + 50}px`;
                
                // Tamaño aleatorio del pétalo
                const size = Math.random() * 10 + 8;
                petal.style.width = `${size}px`;
                petal.style.height = `${size * 1.4}px`;
                
                // Duración de caída aleatoria
                const duration = Math.random() * 3 + 2;
                petal.style.animationDuration = `${duration}s`;
                
                document.body.appendChild(petal);
                
                // Limpiar del DOM al terminar la animación
                setTimeout(() => {
                    petal.remove();
                }, duration * 1000);
            }, i * 150);
        }
    }
});