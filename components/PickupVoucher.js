'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export default function PickupVoucher({ orderNumber, pickupToken, pickupLocationLabel }) {
  const [qrDataUrl, setQrDataUrl] = useState(null);

  useEffect(() => {
    if (!pickupToken) return;
    const url = `${window.location.origin}/loja/adm/${pickupToken}`;
    QRCode.toDataURL(url, { width: 240, margin: 1, color: { dark: '#111827', light: '#ffffff' } })
      .then(setQrDataUrl)
      .catch((err) => console.error('Error generating QR code:', err));
  }, [pickupToken]);

  if (!pickupToken) return null;

  return (
    <div className="mt-8 bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl p-6 text-left">
      <h3 className="text-lg font-bold text-gray-900 mb-1 text-center">Voucher de retirada</h3>
      <p className="text-sm text-gray-500 mb-5 text-center">
        Apresente este QR Code no local de retirada — é ele que confirma a entrega do seu pedido.
      </p>

      <div className="flex justify-center mb-5">
        {qrDataUrl ? (
          <img src={qrDataUrl} alt="QR Code de retirada" className="w-48 h-48 rounded-xl border border-gray-200 bg-white p-2" />
        ) : (
          <div className="w-48 h-48 rounded-xl border border-gray-200 bg-white animate-pulse" />
        )}
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between border-b border-gray-200 pb-2">
          <span className="text-gray-500">Pedido</span>
          <span className="font-semibold text-gray-900">#{orderNumber}</span>
        </div>
        {pickupLocationLabel && (
          <div className="flex justify-between border-b border-gray-200 pb-2">
            <span className="text-gray-500">Local</span>
            <span className="font-semibold text-gray-900 text-right">{pickupLocationLabel}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-gray-500">Código</span>
          <span className="font-mono text-xs text-gray-700 break-all text-right">{pickupToken}</span>
        </div>
      </div>
    </div>
  );
}
