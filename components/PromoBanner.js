export default function PromoBanner() {
  return (
    <section className="py-6 md:py-10 bg-white">
      <div className="container mx-auto px-4">
        <a href="/categoria/promocoes" className="block">
          <img
            src="https://image.chewy.com/catalog/general/images/moe/069446ea-6e11-767f-8000-5bc2e51230c3._SY336_.jpeg"
            alt="Promoção especial"
            className="w-full h-auto rounded-2xl shadow-md hover:shadow-xl transition-shadow duration-300 object-cover"
            style={{ maxHeight: '200px' }}
            loading="lazy"
          />
        </a>
      </div>
    </section>
  );
}
