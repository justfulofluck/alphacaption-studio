import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Check, Loader2, Zap } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/api/config";
import { useNavigate, useSearchParams } from 'react-router-dom';

interface Plan {
    id: number;
    name: string;
    price: number;
    credits_included: number;
    validity_days: number;
}

interface RazorpayOrderResponse {
    key: string;
    order_id: string;
    amount: number;
    currency: string;
    plan: Plan;
}

interface RazorpayPaymentResponse {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
}

interface RazorpayOptions {
    key: string;
    amount: number;
    currency: string;
    name: string;
    description: string;
    order_id: string;
    handler: (response: RazorpayPaymentResponse) => void;
    theme?: {
        color?: string;
    };
    modal?: {
        ondismiss?: () => void;
    };
    config?: {
        display?: {
            blocks?: Record<string, {
                name: string;
                instruments: Array<{ method: 'upi' | 'card' }>;
            }>;
            hide?: Array<{ method: string }>;
            sequence?: string[];
            preferences?: {
                show_default_blocks?: boolean;
            };
        };
    };
}

declare global {
    interface Window {
        Razorpay?: new (options: RazorpayOptions) => { open: () => void };
    }
}

const loadRazorpayCheckout = () => {
    return new Promise<boolean>((resolve) => {
        if (window.Razorpay) {
            resolve(true);
            return;
        }

        const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
        if (existingScript) {
            existingScript.addEventListener('load', () => resolve(true), { once: true });
            existingScript.addEventListener('error', () => resolve(false), { once: true });
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

export default function PricingPage() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [purchaseLoading, setPurchaseLoading] = useState<number | null>(null);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const highlightPlanId = searchParams.get('plan');
    const highlightedRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (highlightedRef.current) {
            highlightedRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [plans, highlightPlanId]);

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/api/payment/plans`);
                setPlans(res.data);
            } catch (err) {
                console.error("Error fetching plans:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchPlans();
    }, []);

    const handlePurchase = async (planId: number) => {
        const token = localStorage.getItem('auth_token');
        if (!token) {
            navigate('/login');
            return;
        }

        setPurchaseLoading(planId);
        try {
            const isLoaded = await loadRazorpayCheckout();
            if (!isLoaded || !window.Razorpay) {
                alert("Unable to load Razorpay Checkout. Please check your connection and try again.");
                setPurchaseLoading(null);
                return;
            }

            const orderRes = await axios.post<RazorpayOrderResponse>(`${API_BASE_URL}/api/payment/create-order`, {
                plan_id: planId
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const order = orderRes.data;
            const checkout = new window.Razorpay({
                key: order.key || import.meta.env.VITE_RAZORPAY_KEY_ID,
                amount: order.amount,
                currency: order.currency,
                name: "VCaptiona",
                description: `${order.plan.name} Plan`,
                order_id: order.order_id,
                handler: async (response) => {
                    try {
                        const verifyRes = await axios.post(`${API_BASE_URL}/api/payment/verify`, response, {
                            headers: { Authorization: `Bearer ${token}` }
                        });

                        alert(`Success! ${verifyRes.data.credits_added} credits added. New balance: ${verifyRes.data.new_balance} credits.`);
                        navigate('/dashboard');
                    } catch (err: any) {
                        alert(err.response?.data?.error || "Payment verification failed");
                    } finally {
                        setPurchaseLoading(null);
                    }
                },
                theme: {
                    color: "#111827"
                },
                modal: {
                    ondismiss: () => setPurchaseLoading(null)
                },
                config: {
                    display: {
                        blocks: {
                            upi: {
                                name: "UPI",
                                instruments: [
                                    { method: "upi" }
                                ]
                            },
                            cards: {
                                name: "Cards",
                                instruments: [
                                    { method: "card" }
                                ]
                            }
                        },
                        hide: [
                            { method: "emi" },
                            { method: "netbanking" },
                            { method: "wallet" },
                            { method: "paylater" },
                            { method: "cardless_emi" }
                        ],
                        sequence: ["block.upi", "block.cards"],
                        preferences: {
                            show_default_blocks: false
                        }
                    }
                }
            });

            checkout.open();
        } catch (err: any) {
            alert(err.response?.data?.error || "Purchase failed");
            setPurchaseLoading(null);
        }
    };

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="animate-spin text-primary" size={40} />
            </div>
        );
    }

    return (
        <div className="container mx-auto px-6 py-6 max-w-[1400px] h-full flex flex-col justify-center">
            <div className="text-center mb-8">
                <h1 className="text-4xl font-black mb-2 premium-text-gradient tracking-tight">Choose Your Plan</h1>
                <p className="text-[#A1A1A1] text-sm font-medium max-w-xl mx-auto leading-relaxed">
                    Pick the power level that fits your workflow.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
                {plans.map((plan) => {
                    const isHighlighted = highlightPlanId && String(plan.id) === highlightPlanId;
                    return (
                    <div
                        key={plan.id}
                        ref={isHighlighted ? highlightedRef : null}
                        className={`bg-[#1A1A1A] border border-[#262626] p-6 rounded-2xl flex flex-col shadow-2xl relative overflow-hidden group transition-all duration-500 ${isHighlighted ? 'ring-2 ring-[#FF7A00] scale-[1.02] shadow-[0_0_40px_rgba(255,122,0,0.4)]' : ''}`}
                    >
                        {/* Decorative glow */}
                        <div className="absolute -top-16 -right-16 size-32 bg-[#FF7A00]/5 blur-[40px] rounded-full group-hover:bg-[#FF7A00]/10 transition-all" />
                        
                        <div className="mb-6 relative">
                            <div className="flex items-baseline gap-1 mt-4">
                                <span className="text-3xl font-black text-white tracking-tighter">₹{plan.price}</span>
                                <span className="text-[#A1A1A1] text-[9px] font-bold uppercase tracking-widest">/ {plan.validity_days}d</span>
                            </div>
                        </div>

                        <ul className="space-y-3 mb-8 flex-1 relative">
                            <li className="flex items-start gap-3">
                                <div className="mt-1 size-4 rounded-full bg-[#FF7A00]/10 border border-[#FF7A00]/20 flex items-center justify-center text-[#FF7A00]">
                                    <Check size={10} strokeWidth={4} />
                                </div>
                                <span className="text-[#A1A1A1] text-xs font-semibold">
                                    <span className="text-white font-black">{plan.credits_included}cr</span> Transcription
                                </span>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="mt-1 size-4 rounded-full bg-[#FF7A00]/10 border border-[#FF7A00]/20 flex items-center justify-center text-[#FF7A00]">
                                    <Check size={10} strokeWidth={4} />
                                </div>
                                <span className="text-[#A1A1A1] text-xs font-semibold">
                                    Validity: <span className="text-white font-black">{plan.validity_days} Days</span>
                                </span>
                            </li>
                        </ul>

                        <Button
                            onClick={() => handlePurchase(plan.id)}
                            className="w-full bg-[#FF7A00] hover:bg-[#e66c00] text-black font-black uppercase tracking-widest transition-all h-11 rounded-lg relative z-10 text-[9px]"
                            disabled={purchaseLoading !== null}
                        >
                            {purchaseLoading === plan.id ? (
                                <Loader2 className="animate-spin mr-2" size={14} />
                            ) : (
                                <Zap size={14} className="mr-2 fill-white/20" />
                            )}
                            {purchaseLoading === plan.id ? "..." : `Activate Plan`}
                        </Button>
                    </div>
                    );
                })}
            </div>

            <div className="mt-10 text-center">
                <p className="text-[#A1A1A1] font-mono text-[9px] font-bold uppercase tracking-[0.2em]">
                    SECURE PAYMENTS VIA RAZORPAY
                </p>
            </div>
        </div>
    );
}
