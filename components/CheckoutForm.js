'use client';
import { useAffiliate } from '../contexts/AffiliateContext';
import { useCart } from '../contexts/CartContext';
import { useCustomer } from '../contexts/CustomerContext';
import { useRouter } from 'next/navigation';

import { useState, useMemo, useEffect, useRef } from 'react';
import { calculateAllPrices, resolveCostPriceBRL } from '../lib/pricing';

// Cópia local da função pura de lib/installmentFees.js — não dá pra importar o módulo
// original aqui porque ele também importa lib/supabase/server.js (next/headers), que
// quebra em componente client. Mantém a mesma lógica: taxa exata se cadastrada, senão
// a taxa cadastrada mais próxima abaixo.
function getFeeForInstallments(feesMap, installments) {
  if (feesMap[installments] != null) return feesMap[installments];
  const known = Object.keys(feesMap).map(Number).sort((a, b) => a - b);
  if (known.length === 0) return 0;
  const lower = known.filter((n) => n <= installments).pop();
  if (lower != null) return feesMap[lower];
  return feesMap[known[0]];
}

export default function CheckoutForm({ config, installmentFees = {} }) {
  const affiliate = useAffiliate();
  const { cart, clearCart } = useCart();
  const { customer } = useCustomer();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState(null);
  const paypalRef = useRef(null);
  const [paypalLoaded, setPaypalLoaded] = useState(false);
  const [formData, setFormData] = useState({
    // Dados pessoais
    fullName: '',
    email: '',
    phone: '',
    cpf: '',
    // Retirada em Orlando
    travelDate: '',
    pickupLocation: '',
    travelNotes: '',
    termsAccepted: false,
    // Pagamento
    paymentMethod: '',
    cardNumber: '',
    cardName: '',
    cardExpiry: '',
    cardCVV: '',
  });

  const [errors, setErrors] = useState({});

  // Estados para cupom
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');

  // PIX / Asaas
  const [pixData, setPixData] = useState(null);

  // Nº de parcelas escolhido pro pagamento no cartão — a taxa do cartão cresce por
  // parcela (installment_fees, valores reais do gateway), diferente da taxa fixa
  // única usada no resto do site.
  const [installments, setInstallments] = useState(1);
  const availableInstallments = useMemo(() => {
    const known = Object.keys(installmentFees).map(Number).sort((a, b) => a - b);
    return known.length > 0 ? known : [1];
  }, [installmentFees]);
  // Só usa o número de parcelas escolhido quando o método é "Cartão" (onde existe o
  // seletor) — no botão "Pagar com PayPal" não há seleção de parcelas, então usa
  // sempre a taxa de 1x (a mais baixa da tabela), pra bater com o que é
  // efetivamente autorizado em /api/payments/paypal/create-order.
  const effectiveInstallments = formData.paymentMethod === 'credit-card' ? installments : 1;
  const cardFeePercentage = useMemo(
    () => getFeeForInstallments(installmentFees, effectiveInstallments),
    [installmentFees, effectiveInstallments]
  );

  // Comissão do afiliado editável no checkout (por item)
  const [itemMarginOverrides, setItemMarginOverrides] = useState({});
  const [prevMarginOverrides, setPrevMarginOverrides] = useState({});
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [modalMarginInputs, setModalMarginInputs] = useState({});

  // PayPal CardFields (cartão de crédito)
  const [cardFieldsReady, setCardFieldsReady] = useState(false);
  const cardFieldsInstanceRef = useRef(null);
  const orderPayloadRef = useRef({ items: [], affiliateId: null, coupon: null });

  // Redirect if cart is empty
  useEffect(() => {
    if (cart.length === 0 && !orderResult) {
      router.push('/');
    }
  }, [cart, orderResult, router]);

  // Pré-preencher formulário com dados do usuário logado
  useEffect(() => {
    if (!customer) return;
    setFormData(prev => ({
      ...prev,
      fullName: customer.name || prev.fullName,
      email: customer.email || prev.email,
      phone: customer.phone || prev.phone,
      cpf: customer.cpf || prev.cpf,
    }));
  }, [customer]);

  // Load PayPal SDK (usado para PayPal Buttons e CardFields de cartão)
  useEffect(() => {
    const needsPayPal = formData.paymentMethod === 'paypal' || formData.paymentMethod === 'credit-card';
    if (needsPayPal && !paypalLoaded) {
      const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
      if (!clientId) return;

      const existingScript = document.querySelector('script[src*="paypal.com/sdk"]');
      if (existingScript) {
        setPaypalLoaded(true);
        return;
      }

      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=BRL&intent=capture&components=buttons,card-fields`;
      script.async = true;
      script.onload = () => setPaypalLoaded(true);
      document.body.appendChild(script);
    }
  }, [formData.paymentMethod, paypalLoaded]);

  // Use cart items directly from CartContext
  const cartItems = cart;

  // Calcular preços dos itens baseado no afiliado e método de pagamento
  const itemsWithPrices = useMemo(() => {
    return cartItems.map(item => {
      // If item has cost_price, recalculate with proper margins
      if (item.costPrice || item.cost_price) {
        const rawCostPrice = item.costPrice || item.cost_price;
        // Custo pode estar cadastrado em dólar (SKU ou produto simples) — precisa
        // passar pela mesma conversão de câmbio + imposto de importação usada na
        // página do produto antes de entrar na cascata de margens, senão o resumo
        // do checkout (e o valor cobrado no cartão/PayPal) fica muito menor que o
        // preço real exibido na página do produto.
        const costCurrency = item.costCurrency || item.cost_currency || 'BRL';
        const importTaxPercentage = item.importTaxPercentage ?? item.import_tax_percentage ?? null;
        const costPrice = resolveCostPriceBRL({
          costPrice: rawCostPrice,
          costCurrency,
          importTaxPercentage,
          usdBrlRate: config.usdBrlRate,
          defaultImportTaxPercentage: config.defaultImportTaxPercentage,
        });
        const supplierMargin = item.supplierMarginPercentage || item.supplier_margin_percentage || 10;
        const affiliateMargin = (itemMarginOverrides[item.lineId] !== undefined)
          ? itemMarginOverrides[item.lineId]
          : (item.customMarkup !== undefined && item.customMarkup !== ''
            ? parseFloat(item.customMarkup)
            : (affiliate?.commission_percentage || config.defaultAffiliateMargin));

        const prices = calculateAllPrices({
          costPrice,
          supplierMarginPercentage: supplierMargin,
          affiliateMarginPercentage: affiliateMargin,
          cardFeePercentage,
        });

        return {
          ...item,
          pixPrice: prices.pixPrice,
          cardPrice: prices.finalPrice,
          breakdown: prices,
        };
      }

      // Fallback: reverse-engineer netPrice from stored pixPrice + original margin
      const originalMargin = (item.customMarkup !== undefined && item.customMarkup !== '')
        ? parseFloat(item.customMarkup)
        : (affiliate?.commission_percentage || config.defaultAffiliateMargin);
      const basePixPrice = item.pixPrice || item.price || 0;
      const netPrice = basePixPrice * (1 - originalMargin / 100);
      const affiliateMargin = (itemMarginOverrides[item.lineId] !== undefined)
        ? itemMarginOverrides[item.lineId]
        : originalMargin;
      const newPixPrice = netPrice / (1 - affiliateMargin / 100);
      const newCardPrice = newPixPrice / (1 - cardFeePercentage / 100);
      return {
        ...item,
        pixPrice: parseFloat(newPixPrice.toFixed(2)),
        cardPrice: parseFloat(newCardPrice.toFixed(2)),
        breakdown: { netPrice, pixPrice: newPixPrice },
      };
    });
  }, [cartItems, affiliate, config, itemMarginOverrides, cardFeePercentage]);

  // Calcular totais baseado no método de pagamento
  const pricing = useMemo(() => {
    const isPix = formData.paymentMethod === 'pix';
    const isPaypal = formData.paymentMethod === 'paypal';

    const subtotal = itemsWithPrices.reduce((sum, item) => {
      // PayPal uses the same price as card
      const price = isPix ? item.pixPrice : item.cardPrice;
      return sum + (price * item.quantity);
    }, 0);

    // Aplicar desconto do cupom se houver
    let couponDiscount = 0;
    if (appliedCoupon && appliedCoupon.discount_amount) {
      couponDiscount = appliedCoupon.discount_amount;
    }

    const subtotalAfterCoupon = subtotal - couponDiscount;
    const pixDiscount = isPix ? subtotalAfterCoupon * (config.pixDiscountPercentage / 100) : 0;
    const total = subtotalAfterCoupon - pixDiscount;

    return {
      subtotal,
      couponDiscount,
      subtotalAfterCoupon,
      pixDiscount,
      total,
      isPix,
      isPaypal,
    };
  }, [itemsWithPrices, formData.paymentMethod, config, appliedCoupon]);

  // Total do cartão pra cada número de parcelas disponível, pra o cliente comparar
  // antes de escolher — a taxa (e portanto o total) cresce por parcela, então não dá
  // pra mostrar só o valor da parcela atual sem contexto do total de cada opção.
  const installmentOptions = useMemo(() => {
    const pixSubtotal = itemsWithPrices.reduce((sum, item) => sum + item.pixPrice * item.quantity, 0);
    const afterCoupon = pixSubtotal - pricing.couponDiscount;
    return availableInstallments.map((n) => {
      const fee = getFeeForInstallments(installmentFees, n);
      const total = fee < 100 ? afterCoupon / (1 - fee / 100) : afterCoupon;
      return {
        n,
        fee,
        total: parseFloat(total.toFixed(2)),
        value: parseFloat((total / n).toFixed(2)),
      };
    });
  }, [itemsWithPrices, pricing.couponDiscount, availableInstallments, installmentFees]);

  // Payload de itens enviado tanto pra criação da cobrança PayPal (create-order)
  // quanto pra criação do pedido (orders/create) — o mesmo formato nos dois casos
  // garante que o servidor recalcule exatamente o mesmo valor nas duas pontas.
  const buildOrderItemsPayload = () => itemsWithPrices.map(item => ({
    productId: item.id,
    variantId: item.variantId || null,
    sku: item.sku || null,
    attributes: item.attributes || null,
    quantity: item.quantity,
    costPrice: item.costPrice || item.cost_price || 0,
    supplierMarginPercentage: item.supplierMarginPercentage || item.supplier_margin_percentage || 10,
    customMarkup: (itemMarginOverrides[item.lineId] !== undefined)
      ? itemMarginOverrides[item.lineId]
      : (item.customMarkup !== undefined ? parseFloat(item.customMarkup) : null),
  }));

  // Render PayPal buttons
  useEffect(() => {
    if (formData.paymentMethod === 'paypal' && paypalLoaded && paypalRef.current && window.paypal) {
      paypalRef.current.innerHTML = '';
      window.paypal.Buttons({
        style: {
          layout: 'vertical',
          color: 'gold',
          shape: 'rect',
          label: 'pay',
        },
        createOrder: async () => {
          // O valor cobrado é recalculado no servidor a partir dos itens do
          // carrinho — nunca confiamos num total calculado no navegador pra
          // autorizar a cobrança (ver /api/payments/paypal/create-order).
          const res = await fetch('/api/payments/paypal/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              items: buildOrderItemsPayload(),
              affiliateId: affiliate?.affiliateId || affiliate?.id || null,
              coupon: appliedCoupon ? { discount_amount: appliedCoupon.discount_amount } : null,
              installments: 1,
            }),
          });
          const data = await res.json();
          if (!data.paypalOrderId) throw new Error(data.error || 'Falha ao criar pedido');
          return data.paypalOrderId;
        },
        onApprove: async (data, actions) => {
          const details = await actions.order.capture();
          await submitOrder('paypal', details.id);
        },
        onError: (err) => {
          console.error('PayPal error:', err);
          setErrors({ general: 'Erro no pagamento PayPal. Tente novamente.' });
        },
      }).render(paypalRef.current);
    }
  }, [formData.paymentMethod, paypalLoaded, pricing?.total]);

  // Manter ref atualizada para usar no callback do PayPal CardFields (a instância é
  // criada uma vez pelo efeito abaixo, então o createOrder precisa ler o carrinho/
  // afiliado/cupom mais recentes por ref em vez de fechar sobre valores do render em
  // que a instância foi montada).
  orderPayloadRef.current = {
    items: buildOrderItemsPayload(),
    affiliateId: affiliate?.affiliateId || affiliate?.id || null,
    coupon: appliedCoupon ? { discount_amount: appliedCoupon.discount_amount } : null,
    installments,
  };

  // Inicializar PayPal CardFields para cartão de crédito
  useEffect(() => {
    if (formData.paymentMethod !== 'credit-card' || !paypalLoaded) return;
    if (!window.paypal?.CardFields) return;

    // Destruir instância anterior se existir
    if (cardFieldsInstanceRef.current) {
      try { cardFieldsInstanceRef.current.close(); } catch (_) {}
      cardFieldsInstanceRef.current = null;
    }
    setCardFieldsReady(false);

    const cardFields = window.paypal.CardFields({
      createOrder: async () => {
        // O valor cobrado é recalculado no servidor a partir dos itens do carrinho
        // (ver /api/payments/paypal/create-order) — nunca confiamos num total
        // calculado no navegador pra autorizar a cobrança.
        const res = await fetch('/api/payments/paypal/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderPayloadRef.current),
        });
        const data = await res.json();
        if (!data.paypalOrderId) throw new Error(data.error || 'Falha ao criar pedido');
        return data.paypalOrderId;
      },
      onApprove: async ({ orderID }) => {
        try {
          const captureRes = await fetch('/api/payments/paypal/capture-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paypalOrderId: orderID }),
          });
          const captureData = await captureRes.json();
          if (captureData.success) {
            await submitOrder('credit-card', captureData.transactionId || orderID);
          } else {
            setErrors({ general: captureData.error || 'Pagamento não aprovado. Tente novamente.' });
            setIsSubmitting(false);
          }
        } catch (err) {
          console.error('PayPal capture error:', err);
          setErrors({ general: 'Erro ao processar pagamento. Tente novamente.' });
          setIsSubmitting(false);
        }
      },
      onError: (err) => {
        console.error('PayPal CardFields error:', err);
        setErrors({ general: 'Erro no cartão. Verifique os dados e tente novamente.' });
        setIsSubmitting(false);
      },
    });

    if (cardFields.isEligible()) {
      Promise.all([
        cardFields.NameField({ placeholder: 'Nome como no cartão' }).render('#paypal-card-name'),
        cardFields.NumberField({ placeholder: '0000 0000 0000 0000' }).render('#paypal-card-number'),
        cardFields.ExpiryField({ placeholder: 'MM/AA' }).render('#paypal-card-expiry'),
        cardFields.CVVField({ placeholder: '000' }).render('#paypal-card-cvv'),
      ])
        .then(() => {
          cardFieldsInstanceRef.current = cardFields;
          setCardFieldsReady(true);
        })
        .catch((err) => console.error('CardFields render error:', err));
    } else {
      setErrors({ general: 'Pagamento com cartão via PayPal não disponível. Use outro método.' });
    }
  }, [formData.paymentMethod, paypalLoaded]);

  // Polling de status do PIX (a cada 5s enquanto estiver na tela de pagamento)
  useEffect(() => {
    if (currentStep !== 4 || !pixData?.chargeId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/payments/asaas/check-status?chargeId=${pixData.chargeId}`);
        const data = await res.json();
        if (data.confirmed) {
          clearInterval(interval);
          clearCart();
          setCurrentStep(5);
        }
      } catch (err) {
        console.error('PIX status check error:', err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [currentStep, pixData?.chargeId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Limpar erro do campo quando o usuário começar a digitar
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const formatPhone = (value) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
  };

  const formatCPF = (value) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`;
    if (cleaned.length <= 9) return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6)}`;
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9, 11)}`;
  };

  const formatCardNumber = (value) => {
    const cleaned = value.replace(/\D/g, '');
    const groups = cleaned.match(/.{1,4}/g) || [];
    return groups.join(' ').slice(0, 19);
  };

  const validateStep1 = () => {
    const newErrors = {};
    if (!formData.fullName) newErrors.fullName = 'Nome completo é obrigatório';
    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email válido é obrigatório';
    if (!formData.phone || formData.phone.replace(/\D/g, '').length < 10) newErrors.phone = 'Telefone válido é obrigatório';
    if (!formData.cpf || formData.cpf.replace(/\D/g, '').length !== 11) newErrors.cpf = 'CPF válido é obrigatório';
    return newErrors;
  };

  const validateStep2 = () => {
    const newErrors = {};
    if (!formData.travelDate) newErrors.travelDate = 'Data prevista da viagem é obrigatória';
    if (formData.travelDate && new Date(formData.travelDate) < new Date(new Date().toDateString())) {
      newErrors.travelDate = 'A data da viagem precisa ser futura';
    }
    if (!formData.pickupLocation) newErrors.pickupLocation = 'Selecione o local de retirada';
    if (!formData.termsAccepted) newErrors.termsAccepted = 'Você precisa confirmar que leu e concorda com os termos de retirada';
    return newErrors;
  };

  const validateStep3 = () => {
    const newErrors = {};
    if (!formData.paymentMethod) newErrors.paymentMethod = 'Selecione um método de pagamento';
    // Cartão: validação feita pelo PayPal CardFields SDK
    // PIX e PayPal: não precisam de campos adicionais
    return newErrors;
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError('Digite um código de cupom');
      return;
    }

    setCouponLoading(true);
    setCouponError('');

    try {
      const response = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: couponCode.trim(),
          affiliate_id: affiliate?.affiliateId || affiliate?.id || null,
          cart_items: cart.map(item => ({
            product_id: item.id,
            quantity: item.quantity
          }))
        })
      });

      const data = await response.json();

      if (response.ok && data.valid) {
        setAppliedCoupon(data);
        setCouponError('');
      } else {
        setCouponError(data.error || 'Cupom inválido');
        setAppliedCoupon(null);
      }
    } catch (error) {
      console.error('Erro ao validar cupom:', error);
      setCouponError('Erro ao validar cupom');
      setAppliedCoupon(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
  };

  const handlePixSelect = async () => {
    setFormData(prev => ({ ...prev, paymentMethod: 'pix' }));
    setErrors({});
    await submitOrder('pix');
  };

  const handleNextStep = () => {
    let newErrors = {};

    if (currentStep === 1) newErrors = validateStep1();
    if (currentStep === 2) newErrors = validateStep2();
    if (currentStep === 3) newErrors = validateStep3();

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const submitOrder = async (paymentMethod, paypalTransactionId) => {
    setIsSubmitting(true);
    setErrors({});

    try {
      const method = paymentMethod || formData.paymentMethod;
      const orderData = {
        customer: {
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          cpf: formData.cpf,
        },
        pickup: {
          travelDate: formData.travelDate,
          pickupLocation: formData.pickupLocation,
          travelNotes: formData.travelNotes,
          termsAccepted: formData.termsAccepted,
        },
        payment: {
          method,
          paypalTransactionId: paypalTransactionId || null,
          installments: method === 'credit-card' ? installments : 1,
        },
        items: buildOrderItemsPayload(),
        affiliateId: affiliate?.affiliateId || affiliate?.id || null,
        coupon: appliedCoupon ? {
          id: appliedCoupon.coupon.id,
          code: appliedCoupon.coupon.code,
          discount_amount: appliedCoupon.discount_amount
        } : null,
      };

      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      const data = await response.json();

      if (data.success) {
        setOrderResult(data.data);

        // Salvar dados do cliente no perfil para próximas compras
        if (customer) {
          fetch('/api/customer/update-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phone: formData.phone,
              cpf: formData.cpf,
            }),
          }).catch(err => console.error('Error saving profile:', err));
        }

        if (method === 'pix') {
          // Criar cobrança PIX real no Asaas
          try {
            const pixRes = await fetch('/api/payments/asaas/create-pix', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderId: data.data.orderId,
                amount: data.data.total,
                customer: {
                  name: formData.fullName,
                  email: formData.email,
                  phone: formData.phone,
                  cpf: formData.cpf,
                },
              }),
            });
            const pixResult = await pixRes.json();
            if (pixResult.success) {
              setPixData(pixResult.data);
            } else {
              console.error('Asaas PIX error:', pixResult.error);
            }
          } catch (err) {
            console.error('Error calling Asaas PIX:', err);
          }
          setCurrentStep(4);
        } else {
          // Clear cart and show success
          clearCart();
          setCurrentStep(5);
        }
      } else {
        setErrors({ general: data.error || 'Erro ao processar pedido' });
      }
    } catch (error) {
      console.error('Error submitting order:', error);
      setErrors({ general: 'Erro ao processar pedido. Tente novamente.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validateStep3();

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // PayPal Buttons tem fluxo próprio
    if (formData.paymentMethod === 'paypal') {
      return;
    }

    // Cartão de crédito via PayPal CardFields
    if (formData.paymentMethod === 'credit-card') {
      if (!cardFieldsInstanceRef.current) {
        setErrors({ general: 'Campos do cartão não carregados. Aguarde e tente novamente.' });
        return;
      }
      setIsSubmitting(true);
      try {
        await cardFieldsInstanceRef.current.submit();
      } catch (err) {
        console.error('CardFields submit error:', err);
        setErrors({ general: 'Dados do cartão inválidos. Verifique e tente novamente.' });
        setIsSubmitting(false);
      }
      return;
    }

    // PIX é tratado pelo clique no botão PIX
    if (formData.paymentMethod === 'pix') {
      return;
    }
  };

  const steps = [
    { number: 1, title: 'Dados Pessoais', icon: 'fa-user' },
    { number: 2, title: 'Retirada', icon: 'fa-plane-departure' },
    { number: 3, title: 'Pagamento', icon: 'fa-credit-card' },
  ];

  const pickupLocations = [
    { value: 'international-drive', label: 'International Drive, Orlando' },
    { value: 'orlando-outlets', label: 'Orlando International Premium Outlets' },
    { value: 'a-combinar', label: 'A combinar por WhatsApp após a compra' },
  ];

  return (
    <>
    <div className="container mx-auto px-4">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-600 mb-8">
        <a href="/" className="transition-colors" style={{ color: affiliate.buttonColor || '#0043f7' }}>
          Início
        </a>
        <i className="fas fa-chevron-right text-xs"></i>
        <a href="/carrinho" className="transition-colors" style={{ color: affiliate.buttonColor || '#0043f7' }}>
          Carrinho
        </a>
        <i className="fas fa-chevron-right text-xs"></i>
        <span className="text-gray-900 font-medium">Checkout</span>
      </nav>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-center">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all ${
                    currentStep >= step.number
                      ? ' text-black shadow-lg'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  <i className={`fas ${step.icon}`}></i>
                </div>
                <span
                  className={`text-xs mt-2 font-medium ${
                    currentStep >= step.number ? 'text-gray-900' : 'text-gray-500'
                  }`}
                >
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-16 md:w-32 h-1 mx-2 transition-all ${
                    currentStep > step.number ? '' : 'bg-gray-200'
                  }`}
                ></div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className={`grid ${currentStep <= 3 ? 'lg:grid-cols-3' : ''} gap-8`}>
        {/* Formulário */}
        <div className={currentStep <= 3 ? 'lg:col-span-2' : ''}>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Dados Pessoais */}
            {currentStep === 1 && (
              <div className="bg-white rounded-2xl p-6 md:p-8 shadow-md">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                  <i className="fas fa-user " style={{ color: affiliate.buttonColor || '#0043f7' }}></i>
                  Dados Pessoais
                </h2>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border-2 ${
                        errors.fullName ? 'border-red-500' : 'border-gray-200'
                      } rounded-xl focus:outline-none  transition-colors`}
                      placeholder="Seu nome completo"
                    />
                    {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border-2 ${
                        errors.email ? 'border-red-500' : 'border-gray-200'
                      } rounded-xl focus:outline-none  transition-colors`}
                      placeholder="seu@email.com"
                    />
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Telefone *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={(e) => {
                        const formatted = formatPhone(e.target.value);
                        setFormData(prev => ({ ...prev, phone: formatted }));
                      }}
                      className={`w-full px-4 py-3 border-2 ${
                        errors.phone ? 'border-red-500' : 'border-gray-200'
                      } rounded-xl focus:outline-none  transition-colors`}
                      placeholder="(00) 00000-0000"
                    />
                    {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      CPF *
                    </label>
                    <input
                      type="text"
                      name="cpf"
                      value={formData.cpf}
                      onChange={(e) => {
                        const formatted = formatCPF(e.target.value);
                        setFormData(prev => ({ ...prev, cpf: formatted }));
                      }}
                      className={`w-full px-4 py-3 border-2 ${
                        errors.cpf ? 'border-red-500' : 'border-gray-200'
                      } rounded-xl focus:outline-none  transition-colors`}
                      placeholder="000.000.000-00"
                    />
                    {errors.cpf && <p className="text-red-500 text-xs mt-1">{errors.cpf}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Retirada em Orlando */}
            {currentStep === 2 && (
              <div className="bg-white rounded-2xl p-6 md:p-8 shadow-md">
                <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                  <i className="fas fa-plane-departure " style={{ color: affiliate.buttonColor || '#0043f7' }}></i>
                  Retirada em Orlando
                </h2>
                <p className="text-sm text-gray-500 mb-6">
                  Não há entrega no Brasil: você retira o aparelho pessoalmente na sua viagem, mediante passaporte e passagem aérea.
                </p>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data prevista da retirada *
                    </label>
                    <input
                      type="date"
                      name="travelDate"
                      value={formData.travelDate}
                      onChange={handleInputChange}
                      min={new Date().toISOString().split('T')[0]}
                      className={`w-full px-4 py-3 border-2 ${
                        errors.travelDate ? 'border-red-500' : 'border-gray-200'
                      } rounded-xl focus:outline-none transition-colors`}
                    />
                    {errors.travelDate && <p className="text-red-500 text-xs mt-1">{errors.travelDate}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Local de retirada *
                    </label>
                    <select
                      name="pickupLocation"
                      value={formData.pickupLocation}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border-2 ${
                        errors.pickupLocation ? 'border-red-500' : 'border-gray-200'
                      } rounded-xl focus:outline-none transition-colors`}
                    >
                      <option value="">Selecione</option>
                      {pickupLocations.map(loc => (
                        <option key={loc.value} value={loc.value}>{loc.label}</option>
                      ))}
                    </select>
                    {errors.pickupLocation && <p className="text-red-500 text-xs mt-1">{errors.pickupLocation}</p>}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Observações da viagem (opcional)
                    </label>
                    <textarea
                      name="travelNotes"
                      value={formData.travelNotes}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none transition-colors"
                      placeholder="Ex: número do voo, hotel, melhor horário para contato em Orlando..."
                    />
                  </div>
                </div>

                <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-xs text-amber-800 leading-relaxed">
                    <i className="fas fa-info-circle mr-1"></i>
                    O aparelho é retirado pessoalmente por quem comprou, mediante passaporte e passagem aérea, e
                    entra no Brasil dentro da sua cota pessoal de bagagem de viajante. Valores acima da cota estão
                    sujeitos a imposto de importação, e é sua responsabilidade declarar quando exigido pela Receita
                    Federal. Este pedido é limitado a 1 unidade por CPF por viagem.
                  </p>
                </div>

                <label className="mt-4 flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="termsAccepted"
                    checked={formData.termsAccepted}
                    onChange={(e) => setFormData(prev => ({ ...prev, termsAccepted: e.target.checked }))}
                    className="mt-1 w-4 h-4 rounded"
                    style={{ accentColor: affiliate.buttonColor || '#0043f7' }}
                  />
                  <span className="text-sm text-gray-700">
                    Li e estou de acordo com as condições de retirada em Orlando acima. *
                  </span>
                </label>
                {errors.termsAccepted && <p className="text-red-500 text-xs mt-1">{errors.termsAccepted}</p>}
              </div>
            )}

            {/* Step 3: Pagamento */}
            {currentStep === 3 && (
              <div className="bg-white rounded-2xl p-6 md:p-8 shadow-md">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                  <i className="fas fa-credit-card " style={{ color: affiliate.buttonColor || '#0043f7' }}></i>
                  Forma de Pagamento
                </h2>

                {errors.general && (
                  <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6">
                    <div className="flex items-center gap-3">
                      <i className="fas fa-exclamation-circle text-red-500 text-xl"></i>
                      <p className="text-red-700 font-medium">{errors.general}</p>
                    </div>
                  </div>
                )}

                {/* Métodos de Pagamento */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <button
                    type="button"
                    onClick={handlePixSelect}
                    disabled={isSubmitting}
                    className={`p-4 border-2 rounded-xl transition-all text-center disabled:opacity-70 ${
                      formData.paymentMethod === 'pix'
                        ? ''
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    style={formData.paymentMethod === 'pix' ? {
                      borderColor: '#22c55e',
                      backgroundColor: '#f0fdf4'
                    } : {}}
                  >
                    {isSubmitting && formData.paymentMethod === 'pix' ? (
                      <i className="fas fa-spinner fa-spin text-2xl text-green-500 mb-2"></i>
                    ) : (
                      <i className="fas fa-qrcode text-2xl text-green-500 mb-2"></i>
                    )}
                    <p className="font-bold text-gray-900 text-sm">PIX</p>
                    <p className="text-[10px] text-green-600 font-semibold">{config.pixDiscountPercentage}% OFF</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'paypal' }))}
                    className={`p-4 border-2 rounded-xl transition-all text-center ${
                      formData.paymentMethod === 'paypal'
                        ? ''
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    style={formData.paymentMethod === 'paypal' ? {
                      borderColor: '#0070ba',
                      backgroundColor: '#f0f7ff'
                    } : {}}
                  >
                    <i className="fab fa-paypal text-2xl text-blue-600 mb-2"></i>
                    <p className="font-bold text-gray-900 text-sm">PayPal</p>
                    <p className="text-[10px] text-gray-500">Rápido e seguro</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'credit-card' }))}
                    className={`p-4 border-2 rounded-xl transition-all text-center ${
                      formData.paymentMethod === 'credit-card'
                        ? ''
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    style={formData.paymentMethod === 'credit-card' ? {
                      borderColor: affiliate.buttonColor || '#0043f7',
                      backgroundColor: `${affiliate.buttonColor || '#0043f7'}15`
                    } : {}}
                  >
                    <i className="fas fa-credit-card text-2xl mb-2" style={{ color: affiliate.buttonColor || '#0043f7' }}></i>
                    <p className="font-bold text-gray-900 text-sm">Cartão</p>
                    <p className="text-[10px] text-gray-500">Até 21x s/ juros</p>
                  </button>
                </div>

                {errors.paymentMethod && (
                  <p className="text-red-500 text-sm mb-4">{errors.paymentMethod}</p>
                )}

                {/* Campos do Cartão via PayPal CardFields */}
                {formData.paymentMethod === 'credit-card' && (
                  <div className="mt-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Número de parcelas
                      </label>
                      <select
                        value={installments}
                        onChange={(e) => setInstallments(parseInt(e.target.value, 10))}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none transition-colors"
                      >
                        {installmentOptions.map((opt) => (
                          <option key={opt.n} value={opt.n}>
                            {opt.n}x de R$ {opt.value.toFixed(2).replace('.', ',')} — total R$ {opt.total.toFixed(2).replace('.', ',')}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        O valor total sobe conforme o número de parcelas — reflete o custo real do parcelamento sem juros pro cliente.
                      </p>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-3">
                      <i className="fab fa-paypal text-xl text-blue-600"></i>
                      <p className="text-sm text-gray-700">
                        Seus dados são processados com segurança pelo PayPal.
                      </p>
                    </div>

                    {!cardFieldsReady && paypalLoaded && (
                      <div className="text-center py-4 text-gray-500">
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Carregando campos do cartão...
                      </div>
                    )}

                    <div style={{ display: cardFieldsReady ? 'block' : 'none' }}>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Nome no Cartão *
                          </label>
                          <div
                            id="paypal-card-name"
                            className="w-full px-1 py-1 border-2 border-gray-200 rounded-xl min-h-[50px]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Número do Cartão *
                          </label>
                          <div
                            id="paypal-card-number"
                            className="w-full px-1 py-1 border-2 border-gray-200 rounded-xl min-h-[50px]"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Validade *
                            </label>
                            <div
                              id="paypal-card-expiry"
                              className="w-full px-1 py-1 border-2 border-gray-200 rounded-xl min-h-[50px]"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              CVV *
                            </label>
                            <div
                              id="paypal-card-cvv"
                              className="w-full px-1 py-1 border-2 border-gray-200 rounded-xl min-h-[50px]"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* PIX Info */}
                {formData.paymentMethod === 'pix' && (
                  <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 text-center">
                    {isSubmitting ? (
                      <>
                        <i className="fas fa-spinner fa-spin text-5xl text-green-500 mb-3"></i>
                        <p className="text-gray-700 font-semibold mb-1">Gerando QR Code PIX...</p>
                        <p className="text-sm text-gray-600">Aguarde um instante.</p>
                      </>
                    ) : (
                      <>
                        <i className="fas fa-qrcode text-5xl text-green-500 mb-3"></i>
                        <p className="text-gray-700 font-semibold mb-1">Pagamento instantâneo via PIX</p>
                        <p className="text-sm text-gray-600 mb-3">
                          O QR Code está sendo gerado...
                        </p>
                        <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 font-bold text-sm px-4 py-2 rounded-full">
                          <i className="fas fa-tag"></i>
                          {config.pixDiscountPercentage}% de desconto aplicado
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* PayPal */}
                {formData.paymentMethod === 'paypal' && (
                  <div className="mt-6">
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 text-center mb-4">
                      <i className="fab fa-paypal text-5xl text-blue-600 mb-3"></i>
                      <p className="text-gray-700 font-semibold mb-1">
                        Pague com PayPal
                      </p>
                      <p className="text-sm text-gray-600">
                        Clique no botão abaixo para pagar de forma segura com sua conta PayPal.
                      </p>
                    </div>
                    <div ref={paypalRef} className="min-h-[150px] flex items-center justify-center">
                      {!paypalLoaded && (
                        <div className="text-center text-gray-500">
                          <i className="fas fa-spinner fa-spin text-2xl mb-2"></i>
                          <p className="text-sm">Carregando PayPal...</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: PIX Payment QR Code */}
            {currentStep === 4 && orderResult && (
              <div className="bg-white rounded-2xl p-6 md:p-8 shadow-md text-center">
                <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-qrcode text-3xl text-green-600"></i>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Pagamento via PIX</h2>
                <p className="text-gray-600 mb-6">Pedido #{orderResult.orderId} criado com sucesso!</p>

                {/* QR Code real do Asaas */}
                <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl p-8 mb-6 max-w-sm mx-auto">
                  {pixData?.qrCodeImage ? (
                    <>
                      <div className="bg-white p-4 rounded-xl shadow-sm inline-block mb-3">
                        <img
                          src={`data:image/png;base64,${pixData.qrCodeImage}`}
                          alt="QR Code PIX"
                          className="w-48 h-48 mx-auto"
                        />
                      </div>
                      <p className="text-xs text-gray-500">Escaneie o QR Code com o app do seu banco</p>
                    </>
                  ) : (
                    <div className="py-8 text-gray-400">
                      <i className="fas fa-spinner fa-spin text-3xl mb-3"></i>
                      <p className="text-sm">Gerando QR Code...</p>
                    </div>
                  )}
                </div>

                {/* PIX Copia e Cola */}
                {pixData?.copyPasteCode && (
                  <div className="bg-gray-100 rounded-xl p-4 mb-6 max-w-md mx-auto">
                    <label className="block text-xs font-bold text-gray-700 mb-2">
                      <i className="fas fa-copy mr-1"></i>
                      PIX Copia e Cola
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={pixData.copyPasteCode}
                        className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-mono truncate"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(pixData.copyPasteCode);
                          alert('Código PIX copiado!');
                        }}
                        className="px-4 py-2 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition-colors text-xs"
                      >
                        Copiar
                      </button>
                    </div>
                  </div>
                )}

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 max-w-md mx-auto">
                  <div className="flex items-start gap-3">
                    <i className="fas fa-clock text-amber-500 mt-0.5"></i>
                    <div className="text-left">
                      <p className="text-sm font-bold text-amber-800">Pague em até 30 minutos</p>
                      <p className="text-xs text-amber-700">Após esse prazo, o pedido será cancelado automaticamente.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-6 max-w-md mx-auto flex items-center gap-2">
                  <i className="fas fa-sync-alt fa-spin text-blue-500 text-sm"></i>
                  <p className="text-xs text-blue-700">Aguardando confirmação do pagamento automaticamente...</p>
                </div>

                <div className="flex justify-between items-center bg-gray-50 rounded-xl p-4 max-w-md mx-auto mb-6">
                  <span className="font-bold text-gray-700">Total a pagar:</span>
                  <span className="text-2xl font-bold text-green-600">
                    R$ {(orderResult.total || pricing.total).toFixed(2).replace('.', ',')}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    clearCart();
                    router.push('/');
                  }}
                  className="px-8 py-3 rounded-xl font-bold text-white transition-all hover:shadow-lg"
                  style={{ backgroundColor: affiliate.buttonColor || '#0043f7' }}
                >
                  Já realizei o pagamento
                </button>
              </div>
            )}

            {/* Step 5: Success */}
            {currentStep === 5 && (
              <div className="bg-white rounded-2xl p-8 md:p-12 shadow-md text-center">
                <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <i className="fas fa-check text-4xl text-green-600"></i>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-3">Pedido Realizado!</h2>
                <p className="text-gray-600 mb-2">
                  Seu pedido #{orderResult?.orderId} foi criado com sucesso.
                </p>
                <p className="text-gray-500 text-sm mb-8">
                  Você receberá um email com os detalhes do pedido e as instruções para a retirada em Orlando.
                </p>
                <button
                  onClick={() => router.push('/')}
                  className="px-8 py-3 rounded-xl font-bold text-white transition-all hover:shadow-lg"
                  style={{ backgroundColor: affiliate.buttonColor || '#0043f7' }}
                >
                  Voltar à Loja
                </button>
              </div>
            )}

            {/* Botões de Navegação */}
            {currentStep <= 3 && (
              <div className="flex gap-4">
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(currentStep - 1)}
                    className="flex-1 bg-gray-200 text-gray-700 font-bold py-4 rounded-xl hover:bg-gray-300 transition-colors"
                  >
                    Voltar
                  </button>
                )}
                {currentStep < 3 ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="flex-1 bg-black font-bold py-4 rounded-xl hover:bg-gray-800 transition-colors"
                    style={{ color: affiliate.buttonColor || '#0043f7' }}
                  >
                    Continuar
                  </button>
                ) : formData.paymentMethod !== 'paypal' && formData.paymentMethod !== 'pix' ? (
                  <button
                    type="submit"
                    disabled={
                      isSubmitting ||
                      (formData.paymentMethod === 'credit-card' && !cardFieldsReady)
                    }
                    className="flex-1 font-bold py-4 rounded-xl hover:shadow-lg transition-all disabled:opacity-50 text-white"
                    style={{ background: `linear-gradient(to right, ${affiliate.buttonColor || '#0043f7'}, ${affiliate.buttonHover || '#0036c6'})` }}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <i className="fas fa-spinner fa-spin"></i>
                        Processando...
                      </span>
                    ) : formData.paymentMethod === 'credit-card' && !cardFieldsReady ? (
                      <span className="flex items-center justify-center gap-2">
                        <i className="fas fa-spinner fa-spin"></i>
                        Carregando...
                      </span>
                    ) : (
                      'Finalizar Pedido'
                    )}
                  </button>
                ) : null}
              </div>
            )}
          </form>
        </div>

        {/* Resumo do Pedido */}
        {currentStep <= 3 && (
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl p-6 shadow-md sticky top-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Resumo do Pedido</h3>

            {/* Itens */}
            <div className="space-y-4 mb-6">
              {itemsWithPrices.map(item => {
                const price = pricing.isPix ? item.pixPrice : item.cardPrice;
                const itemTotal = price * item.quantity;

                return (
                  <div key={item.lineId} className="flex gap-4">
                    <img
                      src={item.image_url || item.image}
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-gray-900">{item.name}</h4>
                      <p className="text-xs text-gray-600">Qtd: {item.quantity}</p>
                      <p className="text-sm font-bold " style={{ color: affiliate.buttonColor || '#0043f7' }}>
                        R$ {itemTotal.toFixed(2).replace('.', ',')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Cupom */}
            <div className="mb-6">
              {!appliedCoupon ? (
                <>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Código do cupom"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      onKeyPress={(e) => e.key === 'Enter' && handleApplyCoupon()}
                      className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-xl focus:outline-none transition-colors text-sm"
                      disabled={couponLoading}
                    />
                    <button
                      onClick={handleApplyCoupon}
                      disabled={couponLoading}
                      className="bg-gray-200 text-gray-700 font-bold px-4 rounded-xl hover:bg-gray-300 transition-colors text-sm disabled:opacity-50"
                    >
                      {couponLoading ? 'Validando...' : 'Aplicar'}
                    </button>
                  </div>
                  {couponError && (
                    <p className="text-red-500 text-xs mt-2">{couponError}</p>
                  )}
                </>
              ) : (
                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <i className="fas fa-tag text-green-600"></i>
                      <div>
                        <p className="text-sm font-bold text-green-800">{appliedCoupon.coupon.code}</p>
                        <p className="text-xs text-green-600">-R$ {appliedCoupon.discount_amount.toFixed(2)}</p>
                      </div>
                    </div>
                    <button
                      onClick={handleRemoveCoupon}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Totais */}
            <div className="space-y-2 mb-6 pb-6 border-b-2 border-gray-200">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold">R$ {pricing.subtotal.toFixed(2).replace('.', ',')}</span>
              </div>
              {pricing.couponDiscount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Desconto Cupom ({appliedCoupon?.coupon.code})</span>
                  <span className="font-semibold">- R$ {pricing.couponDiscount.toFixed(2).replace('.', ',')}</span>
                </div>
              )}
              {pricing.pixDiscount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Desconto PIX ({config.pixDiscountPercentage}%)</span>
                  <span className="font-semibold">- R$ {pricing.pixDiscount.toFixed(2).replace('.', ',')}</span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center text-lg font-bold">
              <span>Total</span>
              <span className=" text-2xl" style={{ color: affiliate.buttonColor || '#0043f7' }}>R$ {pricing.total.toFixed(2).replace('.', ',')}</span>
            </div>

            {/* Comissão do Afiliado — só aparece quando o usuário logado é dono desta loja */}
            {customer?.affiliateId && customer.affiliateId === affiliate?.affiliateId && affiliate?.affiliateId !== 'default' && (
              <div className="mt-4 pt-4 border-t-2 border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-gray-700 flex items-center gap-1">
                    <i className="fas fa-percentage text-xs" style={{ color: affiliate.buttonColor || '#0043f7' }}></i>
                    Sua comissão
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const inputs = {};
                      cartItems.forEach(item => {
                        const current = itemMarginOverrides[item.lineId] !== undefined
                          ? itemMarginOverrides[item.lineId]
                          : (item.customMarkup !== undefined && item.customMarkup !== ''
                            ? parseFloat(item.customMarkup)
                            : (affiliate?.commission_percentage || config.defaultAffiliateMargin));
                        inputs[item.lineId] = String(current);
                      });
                      setModalMarginInputs(inputs);
                      setPrevMarginOverrides({ ...itemMarginOverrides });
                      setShowCommissionModal(true);
                    }}
                    className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                  >
                    <i className="fas fa-pencil-alt"></i>
                    Editar por item
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Total estimado</span>
                  <span className="text-sm font-semibold text-gray-700">
                    ≈ R$ {itemsWithPrices.reduce((sum, item) => {
                      return sum + (item.breakdown.pixPrice - item.breakdown.netPrice) * item.quantity;
                    }, 0).toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>
            )}

            {/* Segurança */}
            <div className="mt-6 pt-6 border-t-2 border-gray-200">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <i className="fas fa-lock text-green-500"></i>
                <span>Pagamento 100% seguro</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <i className="fas fa-plane-departure " style={{ color: affiliate.buttonColor || '#0043f7' }}></i>
                <span>Retirada pessoal em Orlando</span>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>

    {/* Modal de Comissão por Item */}
    {showCommissionModal && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-gray-900">Comissão por Item</h2>
            <button
              type="button"
              onClick={() => setShowCommissionModal(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>

          <div className="space-y-4">
            {cartItems.map(item => {
              const rawInput = modalMarginInputs[item.lineId] ?? String(affiliate?.commission_percentage || config.defaultAffiliateMargin);
              const marginVal = parseFloat(rawInput);
              const valid = !isNaN(marginVal) && marginVal >= 0 && marginVal < 100;
              const rawCostPrice = item.costPrice || item.cost_price;
              const costPrice = rawCostPrice
                ? resolveCostPriceBRL({
                    costPrice: rawCostPrice,
                    costCurrency: item.costCurrency || item.cost_currency || 'BRL',
                    importTaxPercentage: item.importTaxPercentage ?? item.import_tax_percentage ?? null,
                    usdBrlRate: config.usdBrlRate,
                    defaultImportTaxPercentage: config.defaultImportTaxPercentage,
                  })
                : rawCostPrice;
              const supplierMargin = item.supplierMarginPercentage || item.supplier_margin_percentage || 10;

              let previewPix = 0, previewCard = 0, commissionUnit = 0;
              if (costPrice && valid) {
                const netPrice = costPrice / (1 - supplierMargin / 100);
                previewPix = netPrice / (1 - marginVal / 100);
                previewCard = previewPix / (1 - cardFeePercentage / 100);
                commissionUnit = previewPix - netPrice;
              } else {
                const originalMargin = (item.customMarkup !== undefined && item.customMarkup !== '')
                  ? parseFloat(item.customMarkup)
                  : (affiliate?.commission_percentage || config.defaultAffiliateMargin);
                const basePixPrice = item.pixPrice || item.price || 0;
                const netPrice = basePixPrice * (1 - originalMargin / 100);
                const effectiveMargin = valid ? marginVal : originalMargin;
                previewPix = netPrice / (1 - effectiveMargin / 100);
                previewCard = previewPix / (1 - cardFeePercentage / 100);
                commissionUnit = previewPix - netPrice;
              }

              return (
                <div key={item.lineId} className="border-2 border-gray-100 rounded-xl p-4">
                  <div className="flex gap-3 mb-3">
                    <img
                      src={item.image_url || item.image}
                      alt={item.name}
                      className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-gray-900 truncate">{item.name}</h4>
                      <p className="text-xs text-gray-500">Qtd: {item.quantity}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm text-gray-600">Comissão:</span>
                    <input
                      type="number"
                      min="0"
                      max="80"
                      step="0.5"
                      value={rawInput}
                      onChange={(e) => {
                        const newVal = e.target.value;
                        setModalMarginInputs(prev => ({ ...prev, [item.lineId]: newVal }));
                        const parsed = parseFloat(newVal);
                        if (!isNaN(parsed) && parsed >= 0 && parsed < 100) {
                          setItemMarginOverrides(prev => ({ ...prev, [item.lineId]: parsed }));
                        }
                      }}
                      className="w-20 px-2 py-1 border-2 border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:border-blue-400"
                    />
                    <span className="text-sm text-gray-600">%</span>
                  </div>

                  {(previewPix > 0 || previewCard > 0) && (
                    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 flex items-center gap-1">
                          <i className="fas fa-qrcode text-xs text-green-500"></i>
                          PIX (total)
                        </span>
                        <span className="font-bold text-green-600">
                          R$ {(previewPix * item.quantity).toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 flex items-center gap-1">
                          <i className="fas fa-credit-card text-xs text-blue-500"></i>
                          21x cartão
                        </span>
                        <span className="font-bold text-blue-600">
                          R$ {((previewCard * item.quantity) / 21).toFixed(2).replace('.', ',')}/mês
                        </span>
                      </div>
                      {commissionUnit > 0 && (
                        <div className="flex justify-between text-sm border-t border-gray-200 pt-2 mt-1">
                          <span className="text-gray-500">Sua comissão</span>
                          <span className="font-bold" style={{ color: affiliate.buttonColor || '#0043f7' }}>
                            ≈ R$ {(commissionUnit * item.quantity).toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={() => {
                setItemMarginOverrides(prevMarginOverrides);
                setShowCommissionModal(false);
              }}
              className="flex-1 py-3 border-2 border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => setShowCommissionModal(false)}
              className="flex-1 py-3 text-white font-bold rounded-xl transition-colors"
              style={{ backgroundColor: affiliate.buttonColor || '#0043f7' }}
            >
              Aplicar
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
