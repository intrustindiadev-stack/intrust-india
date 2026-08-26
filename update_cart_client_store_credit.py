import re

with open('/home/i4yush/.gemini/antigravity-ide/brain/59fcfe52-acab-457b-a685-977a6a687061/scratch/CartClient_updated.jsx', 'r') as f:
    content = f.read()

old_sc = """      } else if (paymentMode === 'store_credit') {
        const { data: draftData, error: draftErr } = await supabase.rpc("draft_cart_orders", { p_customer_id: userId });
        if (draftErr) throw draftErr;
        if (!draftData.success) {
          setError(draftData.message || "Failed to create order draft");
          return;
        }

        const groupId = draftData.group_id;

        const merchantItem = cartItems.find(i => !i.is_platform_item);
        let merchantId = null;
        if (merchantItem?.inventory_id) {
          const { data: invRow } = await supabase
            .from('merchant_inventory')
            .select('merchant_id')
            .eq('id', merchantItem.inventory_id)
            .single();
          if (invRow) merchantId = invRow.merchant_id;
        }

        if (!merchantId) {
          setError("Could not identify merchant for store credit.");
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch('/api/shopping/request-store-credit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({
            groupId,
            merchantId,
            durationDays: storeCreditDuration,
            amountPaise: draftData.total_paise,
          })
        });"""

new_sc = """      } else if (paymentMode === 'store_credit') {
        // draft_cart_orders is now executed server-side inside request-store-credit route
        const merchantItem = cartItems.find(i => !i.is_platform_item);
        let merchantId = null;
        if (merchantItem?.inventory_id) {
          const { data: invRow } = await supabase
            .from('merchant_inventory')
            .select('merchant_id')
            .eq('id', merchantItem.inventory_id)
            .single();
          if (invRow) merchantId = invRow.merchant_id;
        }

        if (!merchantId) {
          setError("Could not identify merchant for store credit.");
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch('/api/shopping/request-store-credit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({
            // Server will execute draft_cart_orders and generate the groupId internally
            merchantId,
            durationDays: storeCreditDuration,
          })
        });"""

if old_sc in content:
    content = content.replace(old_sc, new_sc)
    with open('/home/i4yush/.gemini/antigravity-ide/brain/59fcfe52-acab-457b-a685-977a6a687061/scratch/CartClient_updated.jsx', 'w') as f:
        f.write(content)
    print("Store Credit success")
else:
    print("Store Credit old block not found!")
