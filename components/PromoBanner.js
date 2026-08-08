// Banner padrão (usado quando não há banner configurado no banco)
const DEFAULT_IMAGE = '/Banner-Site/BANNER%20EM%20LINHA.png';

export default function PromoBanner({ image }) {
  return (
    <section className="py-6 md:py-10 bg-white">
      <div className="container mx-auto px-4">
        <a href="/categoria/promocoes" className="block">
          <img
            src={image || DEFAULT_IMAGE}
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
