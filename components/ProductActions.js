'use client';

import { useState } from 'react';
import { useCart } from '../contexts/CartContext';
import { useAffiliate } from '../contexts/AffiliateContext';
import Loader from './Loader';

export default function ProductActions({ product }) {
  const [quantity, setQuantity] = useState(1);
  const [cep, setCep] = useState('');
  const [shippingResults, setShippingResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const { addToCart: addToCartContext, setIsOpen } = useCart();
  const affiliate = useAffiliate();

  const changeQuantity = (amount) => {
    const newValue = quantity + amount;
    if (newValue >= 1) {
      setQuantity(newValue);
    }
  };

  const addToCart = () => {
    // Adicionar ao carrinho via context
    addToCartContext(product, quantity);

    // Abrir o drawer do carrinho automaticamente
    setTimeout(() => {
      setIsOpen(true);
    }, 100);
  };

  const calculateShipping = () => {
    if (!cep) {
      alert('Por favor, digite um CEP.');
      return;
    }

    setLoading(true);
    setShippingResults(null);

    // Simular chamada de API
    setTimeout(() => {
      setShippingResults([
        {
          name: 'Entrega Normal',
          time: 'Receba em até 5 dias úteis',
          price: 'R$ 15,00',
        },
        {
          name: 'Entrega Expressa',
          time: 'Receba em até 2 dias úteis',
          price: 'R$ 25,00',
        },
      ]);
      setLoading(false);
    }, 1500);
  };

  const totalPrice = product.price * quantity;
  const installmentValue = totalPrice / (product.installments || 1);

  return (
    <>
      {/* Preço dinâmico */}
      <div className="mb-6">
        <p className="text-4xl font-bold text-gray-900 mb-2">
          R$ {totalPrice.toFixed(2).replace('.', ',')}
        </p>
        {product.installments > 1 && (
          <p className="text-sm text-gray-600">
            ou em até{' '}
            <span className="font-bold">
              {product.installments}x de R${' '}
              {installmentValue.toFixed(2).replace('.', ',')}
            </span>{' '}
            sem juros
          </p>
        )}
        {quantity > 1 && (
          <p className="text-sm text-gray-500 mt-1">
            {quantity}x R$ {product.price.toFixed(2).replace('.', ',')} por unidade
          </p>
        )}
      </div>

      <div className="mb-4">
        <label
          htmlFor="quantity"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Quantidade
        </label>
        <div className="flex rounded-lg shadow-md overflow-hidden">
          {/* Quantity Selector */}
          <div className="flex items-center border border-r-0 border-gray-300 bg-white rounded-l-lg">
            <button
              onClick={() => changeQuantity(-1)}
              className="px-4 h-full text-lg font-semibold text-gray-600 hover:bg-gray-100 transition-colors focus:outline-none"
            >
              -
            </button>
            <input
              type="number"
              id="quantity"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              min="1"
              className="quantity-input w-16 text-center bg-transparent text-gray-900 font-bold text-lg focus:outline-none h-full border-l border-r border-gray-300"
            />
            <button
              onClick={() => changeQuantity(1)}
              className="px-4 h-full text-lg font-semibold text-gray-600 hover:bg-gray-100 transition-colors focus:outline-none"
            >
              +
            </button>
          </div>
          {/* Add to Cart Button */}
          <button
            onClick={addToCart}
            className="flex-grow font-bold text-base py-3 px-6 transition-all action-button rounded-r-lg"
            style={{
              backgroundColor: affiliate.buttonColor || '#0071e3',
              color: affiliate.buttonTextColor || '#000000',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = affiliate.buttonHover || '#0058b3';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = affiliate.buttonColor || '#0071e3';
            }}
          >
            Adicionar ao Carrinho
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 mt-4">
        <button
          className="w-full bg-brand-dark font-bold py-3 px-6 rounded-lg shadow-md hover:opacity-90 transition-all transform hover:scale-105 action-button"
          style={{ color: affiliate.buttonColor || '#0071e3' }}
        >
          Comprar Agora
        </button>
      </div>

      <div className="mt-8 border-t border-gray-200 pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Calcular frete e prazo
        </h3>
        <div className="flex space-x-2">
          <input
            type="text"
            id="cep-input"
            placeholder="Digite seu CEP"
            value={cep}
            onChange={(e) => setCep(e.target.value)}
            className="flex-grow bg-gray-100 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-custom-yellow"
          />
          <button
            onClick={calculateShipping}
            className="bg-gray-800 text-white font-semibold py-2 px-4 rounded-md hover:bg-black transition-colors"
          >
            Calcular
          </button>
        </div>
        {loading && (
          <div className="mt-4 flex justify-center">
            <Loader size="sm" />
          </div>
        )}
        {shippingResults && !loading && (
          <div className="mt-4 space-y-2">
            {shippingResults.map((result, index) => (
              <div
                key={index}
                className="border rounded-md p-3 flex justify-between items-center bg-gray-50"
              >
                <div>
                  <p className="font-bold">{result.name}</p>
                  <p className="text-sm text-gray-600">{result.time}</p>
                </div>
                <p className="font-bold text-custom-yellow">{result.price}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
