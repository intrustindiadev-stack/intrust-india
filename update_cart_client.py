import re

with open('app/(customer)/shop/cart/CartClient.jsx', 'r') as f:
    content = f.read()

old_gateway = """      } else if (paymentMode === 'gateway') {
        const { data, error: rpcError } = await supabase.rpc("draft_cart_orders", { p_customer_id: userId });
        if (rpcError) throw rpcError;
        if (data.success) {
          await initiatePayment({
            amount: (data.total_paise / 100).toFixed(2),
            payerName: profile.full_name || 'User',
            payerEmail: profile.email,
            payerMobile: profile.phone,
            udf1: "CART_CHECKOUT",
            udf2: data.group_id,
            onSuccess: () => {
              setOrderSuccess(true);
              setTimeout(() => router.push("/orders?success=true"), 3000);
            },
            onFailure: (msg) => setError(msg || "Payment failed")
          });
          return;
        } else {
          setError(data.message || "Checkout initialization failed");
        }
      }"""

new_gateway = """      } else if (paymentMode === 'gateway') {
        // draft_cart_orders is now executed server-side inside initiatePayment route
        await initiatePayment({
          amount: (finalPayable / 100).toFixed(2), // Pass estimated amount; server determines canonical amount
          payerName: profile.full_name || 'User',
          payerEmail: profile.email,
          payerMobile: profile.phone,
          udf1: "CART_CHECKOUT",
          udf2: "", // Server will generate group_id and override this
          onSuccess: () => {
            setOrderSuccess(true);
            setTimeout(() => router.push("/orders?success=true"), 3000);
          },
          onFailure: (msg) => setError(msg || "Payment failed")
        });
        return;
      }"""

if old_gateway in content:
    content = content.replace(old_gateway, new_gateway)
    with open('/home/i4yush/.gemini/antigravity-ide/brain/59fcfe52-acab-457b-a685-977a6a687061/scratch/CartClient_updated.jsx', 'w') as f:
        f.write(content)
    print("Gateway success")
else:
    print("Gateway old block not found!")
