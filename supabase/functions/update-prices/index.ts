import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch all active commodities
    const { data: commodities, error: commError } = await supabase
      .from("commodities")
      .select("*")
      .eq("is_active", true);

    if (commError) throw commError;

    const commUpdates: Promise<any>[] = [];
    const priceHistoryRows: { commodity_id: string; price: number; recorded_at: string }[] = [];

    for (const c of commodities || []) {
      const oldPrice = Number(c.current_price);
      // Random fluctuation: -4% to +4% for agricultural commodities
      const changePct = (Math.random() - 0.5) * 8;
      const newPrice = Math.max(0.01, Number((oldPrice * (1 + changePct / 100)).toFixed(2)));
      const change = Number((newPrice - Number(c.previous_price)).toFixed(2));
      const changePercent = Number(c.previous_price) > 0
        ? Number(((change / Number(c.previous_price)) * 100).toFixed(2))
        : 0;

      commUpdates.push(
        supabase.from("commodities").update({
          current_price: newPrice,
          change,
          change_percent: changePercent,
        }).eq("id", c.id)
      );

      priceHistoryRows.push({
        commodity_id: c.id,
        price: newPrice,
        recorded_at: new Date().toISOString(),
      });
    }

    // Fetch all active high-risk assets
    const { data: assets, error: assetError } = await supabase
      .from("high_risk_assets")
      .select("*")
      .eq("is_active", true);

    if (assetError) throw assetError;

    const assetUpdates: Promise<any>[] = [];

    for (const a of assets || []) {
      const oldPrice = Number(a.current_price);
      // Larger fluctuation: -8% to +8% for high-risk assets
      const changePct = (Math.random() - 0.48) * 16;
      const newPrice = Math.max(0.01, Number((oldPrice * (1 + changePct / 100)).toFixed(2)));
      const change = Number((newPrice - oldPrice).toFixed(2));
      const changePercent = oldPrice > 0
        ? Number(((change / oldPrice) * 100).toFixed(2))
        : 0;

      assetUpdates.push(
        supabase.from("high_risk_assets").update({
          current_price: newPrice,
          change,
          change_percent: changePercent,
        }).eq("id", a.id)
      );
    }

    // Apply all updates in parallel
    await Promise.all([...commUpdates, ...assetUpdates]);

    // Insert price history for commodities
    if (priceHistoryRows.length > 0) {
      await supabase.from("price_history").insert(priceHistoryRows);
    }

    return new Response(
      JSON.stringify({
        success: true,
        commodities_updated: commUpdates.length,
        assets_updated: assetUpdates.length,
        price_history_records: priceHistoryRows.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
