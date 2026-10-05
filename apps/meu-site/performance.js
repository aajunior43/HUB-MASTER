// Performance Optimizations
(function() {
    'use strict';

    // Lazy Loading Implementation
    const lazyLoad = () => {
        const lazyElements = document.querySelectorAll('.lazy-load');
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const element = entry.target;
                    element.classList.add('loaded');
                    observer.unobserve(element);
                }
            });
        });

        lazyElements.forEach(element => {
            imageObserver.observe(element);
        });
    };

    // Debounce function for performance
    const debounce = (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    };

    // Optimize scroll events
    const optimizeScrollEvents = () => {
        let ticking = false;
        
        const updateScrollEffects = () => {
            // Reduced scroll effects for performance
            const scrolled = window.pageYOffset > 50;
            const header = document.querySelector('.header');
            if (header) {
                header.classList.toggle('scrolled', scrolled);
            }
            ticking = false;
        };

        const requestTick = () => {
            if (!ticking) {
                requestAnimationFrame(updateScrollEffects);
                ticking = true;
            }
        };

        window.addEventListener('scroll', requestTick, { passive: true });
    };

    // Reduce animations on low-end devices
    const optimizeForDevice = () => {
        const isLowEndDevice = navigator.hardwareConcurrency <= 2 || 
                              navigator.deviceMemory <= 2;
        
        if (isLowEndDevice) {
            document.documentElement.style.setProperty('--animation-duration', '0.1s');
            document.documentElement.style.setProperty('--transition-duration', '0.1s');
        }
    };

    // Preload critical resources
    const preloadCriticalResources = () => {
        const criticalImages = [
            // Add critical image paths here
        ];

        criticalImages.forEach(src => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'image';
            link.href = src;
            document.head.appendChild(link);
        });
    };

    // Initialize optimizations
    const init = () => {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                lazyLoad();
                optimizeScrollEvents();
                optimizeForDevice();
                preloadCriticalResources();
            });
        } else {
            lazyLoad();
            optimizeScrollEvents();
            optimizeForDevice();
            preloadCriticalResources();
        }
    };

    init();

    // Export for global use
    window.PerformanceOptimizer = {
        debounce,
        lazyLoad
    };
})();