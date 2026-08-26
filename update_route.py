import re

with open('app/api/sabpaisa/initiate/route.js', 'r') as f:
    content = f.read()

old_block = """        if (udf1 === 'CART_CHECKOUT') {
            const { data: group, error: groupErr } = await supabaseAdmin
                .from('shopping_order_groups')
                .select('total_amount_paise')
                .eq('id', udf2)
                .single();
            if (groupErr || !group) {
                return failResponse(400, 'Invalid or missing order group ID.', correlationId, groupErr);
            }
            canonicalAmountPaise = group.total_amount_paise;
        }"""

new_block = """        if (udf1 === 'CART_CHECKOUT') {
            // Execute the RPC server-side to guarantee atomicity and shield from client network blockers
            const { data: draftData, error: draftErr } = await supabaseContextClient.rpc("draft_cart_orders", { p_customer_id: user.id });
            
            if (draftErr) {
                return failResponse(500, 'Failed to create order draft.', correlationId, draftErr);
            }
            if (!draftData || !draftData.success) {
                return failResponse(400, draftData?.message || 'Failed to create order draft.', correlationId);
            }
            
            udf2 = draftData.group_id;
            orderData.udf2 = udf2; // Override incoming udf2 with the newly generated group ID
            canonicalAmountPaise = draftData.total_paise;
        }"""

if old_block in content:
    content = content.replace(old_block, new_block)
    with open('/home/i4yush/.gemini/antigravity-ide/brain/59fcfe52-acab-457b-a685-977a6a687061/scratch/initiate_route_updated.js', 'w') as f:
        f.write(content)
    print("Success")
else:
    print("Old block not found!")
