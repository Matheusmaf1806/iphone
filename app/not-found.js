import Header from '../components/Header';
import Footer from '../components/Footer';

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="container mx-auto p-4 md:p-8 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-8xl mb-6">📱</div>
          <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">
            Ops! Página não encontrada
          </h2>
          <p className="text-gray-600 mb-8">
            Essa página não existe ou foi movida. Não encontramos o que você procura.
          </p>
          <a
            href="/"
            className="inline-block bg-brand-yellow text-black font-bold py-3 px-8 rounded-lg hover-bg-custom-yellow transition-all"
          >
            Voltar para a página inicial
          </a>
        </div>
      </main>
      <Footer />
    </>
  );
}
