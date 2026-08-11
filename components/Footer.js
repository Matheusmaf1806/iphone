'use client';
import { useAffiliate } from '../contexts/AffiliateContext';
import Logo from './Logo';
import { SITE_NAME } from '../lib/siteConfig';

export default function Footer() {
  const affiliate = useAffiliate();
  return (
    <footer className="bg-gray-100 mt-16 md:mt-24 border-t border-gray-200 fade-in-section">
      <div className="container mx-auto py-12 px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          <div>
            <Logo src={affiliate.logo} name={affiliate.name} imgClassName="h-20 mb-4" textClassName="text-2xl font-bold tracking-tight text-gray-900 block mb-4" fallbackImage="dark" />
            <p className="text-gray-600 text-sm">
              iPhone e produtos Apple parcelados em reais, com retirada pessoal
              em Orlando na sua próxima viagem. Originais, lacrados e com nota fiscal americana.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-lg text-gray-900 mb-4">
              Institucional
            </h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="#"
                  className="text-gray-600 text-sm hover:opacity-80"
                >
                  Sobre Nós
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-600 text-sm hover:opacity-80"
                >
                  Política de Privacidade
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-600 text-sm hover:opacity-80"
                >
                  Termos de Uso
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-lg text-gray-900 mb-4">Ajuda</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="#"
                  className="text-gray-600 text-sm hover:opacity-80"
                >
                  Dúvidas Frequentes
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-600 text-sm hover:opacity-80"
                >
                  Entregas e Prazos
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-600 text-sm hover:opacity-80"
                >
                  Fale Conosco
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-lg text-gray-900 mb-4">Siga-nos</h4>
            <div className="flex space-x-4">
              <a
                href="#"
                className="text-gray-600 text-xl hover:opacity-80"
              >
                <i className="fab fa-instagram"></i>
              </a>
              <a
                href="#"
                className="text-gray-600 text-xl hover:opacity-80"
              >
                <i className="fab fa-facebook"></i>
              </a>
              <a
                href="#"
                className="text-gray-600 text-xl hover:opacity-80"
              >
                <i className="fab fa-whatsapp"></i>
              </a>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-gray-200 py-4">
        <div className="flex items-center justify-center gap-3">
          <span className="text-sm font-bold tracking-tight text-gray-800">{SITE_NAME}</span>
          <p className="text-xs text-gray-600">
            &copy; {new Date().getFullYear()} Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
