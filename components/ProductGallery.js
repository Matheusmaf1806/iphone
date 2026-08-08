'use client';

import { useState } from 'react';

export default function ProductGallery({ images = [] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  // Placeholder se não houver imagens
  const defaultImages = [{
    src: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23f3f4f6" width="400" height="400"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="24" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3ESem imagem%3C/text%3E%3C/svg%3E',
    alt: 'Produto sem imagem'
  }];

  const displayImages = images && images.length > 0 ? images : defaultImages;

  const setMainImage = (index) => {
    setCurrentIndex(index);
  };

  const openLightbox = () => {
    setIsOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    setIsOpen(false);
    document.body.style.overflow = '';
  };

  const nextImage = () => {
    setCurrentIndex((currentIndex + 1) % displayImages.length);
  };

  const prevImage = () => {
    setCurrentIndex((currentIndex - 1 + displayImages.length) % displayImages.length);
  };

  return (
    <>
      <div className="w-full lg:sticky top-28 self-start fade-in-section">
        <div
          className="main-image-container bg-gray-100 border border-gray-200 shadow-sm"
          onClick={openLightbox}
        >
          <img
            src={displayImages[currentIndex]?.src}
            alt={displayImages[currentIndex]?.alt || 'Produto'}
            className="main-image"
          />
        </div>
        {displayImages.length > 1 && (
          <div className="thumbnail-container mt-4">
            <div className="thumbnail-wrapper flex gap-2 justify-start overflow-x-auto">
              {displayImages.map((image, index) => (
                <img
                  key={index}
                  src={image.src}
                  alt={image.alt}
                  className={`thumbnail w-16 h-16 md:w-20 md:h-20 object-cover flex-shrink-0 ${
                    currentIndex === index ? 'active' : ''
                  }`}
                  onClick={() => setMainImage(index)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4"
          onClick={closeLightbox}
        >
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white text-3xl z-10"
          >
            &times;
          </button>
          {displayImages.length > 1 && (
            <div className="relative w-full h-full flex items-center justify-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  prevImage();
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-black bg-opacity-50 rounded-full p-2 text-2xl"
              >
                <i className="fas fa-chevron-left"></i>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  nextImage();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-black bg-opacity-50 rounded-full p-2 text-2xl"
              >
                <i className="fas fa-chevron-right"></i>
              </button>
              <img
                src={displayImages[currentIndex]?.src}
                alt=""
                className="max-w-full max-h-full object-contain transition-transform duration-300"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
          {displayImages.length === 1 && (
            <img
              src={displayImages[currentIndex]?.src}
              alt=""
              className="max-w-full max-h-full object-contain transition-transform duration-300"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}
    </>
  );
}
