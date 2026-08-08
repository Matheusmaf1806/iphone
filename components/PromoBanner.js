export default function PromoBanner() {
  return (
    <section className="py-6 md:py-10 bg-white">
      <div className="container mx-auto px-4">
        <a
          href="/categoria/promocoes"
          className="block rounded-2xl shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #0071e3, #1d1d1f)', maxHeight: '200px' }}
        >
          <div className="flex items-center justify-center gap-4 px-6 py-8 md:py-10 text-center">
            <i className="fas fa-tags text-white text-2xl md:text-3xl"></i>
            <div>
              <p className="text-white font-bold text-lg md:text-2xl">Ofertas da semana em iPhone e acessórios</p>
              <p className="text-white text-opacity-80 text-sm md:text-base mt-1">Parcelamento facilitado, retirada em Orlando</p>
            </div>
          </div>
        </a>
      </div>
    </section>
  );
}
