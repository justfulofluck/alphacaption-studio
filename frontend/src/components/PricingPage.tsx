import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Check, Loader2, Zap } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/api/config";
import { useNavigate } from 'react-router-dom';

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

                        alert(`Success! ${verifyRes.data.credits_added} credits added. New balance: ${verifyRes.data.new_balance} mins.`);
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
        <div className="container mx-auto px-4 py-16">
            <div className="text-center mb-16">
                <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
                <p className="text-muted-foreground text-lg">Pick the best plan for your transcription needs</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {plans.map((plan) => (
                    <div key={plan.id} className="bg-card border rounded-2xl p-8 flex flex-col shadow-sm hover:shadow-md transition-shadow">
                        <div className="mb-8">
                            <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-bold">Rs. {plan.price}</span>
                                <span className="text-muted-foreground">/{plan.validity_days} days</span>
                            </div>
                        </div>

                        <ul className="space-y-4 mb-8 flex-1">
                            <li className="flex items-center gap-3">
                                <div className="bg-primary/10 p-1 rounded-full text-primary">
                                    <Check size={16} />
                                </div>
                                <span>{plan.credits_included} Minutes of AI Transcription</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <div className="bg-primary/10 p-1 rounded-full text-primary">
                                    <Check size={16} />
                                </div>
                                <span>Automatic Caption Alignment</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <div className="bg-primary/10 p-1 rounded-full text-primary">
                                    <Check size={16} />
                                </div>
                                <span>Export to .SRT</span>
                            </li>
                        </ul>

                        <Button
                            onClick={() => handlePurchase(plan.id)}
                            className="w-full font-bold group"
                            disabled={purchaseLoading !== null}
                        >
                            {purchaseLoading === plan.id ? (
                                <Loader2 className="animate-spin mr-2" size={18} />
                            ) : (
                                <Zap size={18} className="mr-2 group-hover:fill-current" />
                            )}
                            {purchaseLoading === plan.id ? "Processing..." : `Buy ${plan.name} Plan`}
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
}
