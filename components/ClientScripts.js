'use client';

import { useEffect } from 'react';

export default function ClientScripts() {
  useEffect(() => {
    // Fade-in animations on scroll
    const fadeInSections = document.querySelectorAll('.fade-in-section');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          }
        });
      },
      { threshold: 0.1 }
    );

    fadeInSections.forEach((section) => observer.observe(section));

    return () => {
      fadeInSections.forEach((section) => observer.unobserve(section));
    };
  }, []);

  return null;
}
