import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import webpush from "npm:web-push@3.6.7";
const corsHeaders = {
  "Access-Control-Allow-Origin":
    "https://allanakuba0804-hash.github.io",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS"
};

const SUPABASE_URL =
  Deno.env.get("SUPABASE_URL")!;

const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const VAPID_PUBLIC_KEY =
  Deno.env.get("VAPID_PUBLIC_KEY")!;

const VAPID_PRIVATE_KEY =
  Deno.env.get("VAPID_PRIVATE_KEY")!;


webpush.setVapidDetails(
  "mailto:admin@lapaksukasuka.com",
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);


Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders
    });
  }

  try {

    // ==============================
    // BACA BODY
    // ==============================

    const rawBody =
      await req.text();

    console.log(
      "RAW BODY:",
      rawBody
    );


    if (!rawBody.trim()) {

      return new Response(
        JSON.stringify({
          success: false,
          error: "Body kosong"
        }),
        {
          status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type":
            "application/json"
        }
        }
      );
    }


    let body;

    try {

      body =
        JSON.parse(rawBody);

    } catch {

      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Body bukan JSON"
        }),
        {
          status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type":
            "application/json"
        }
        }
      );
    }


    // ==============================
    // DATA ORDER
    // ==============================

    const order =
      body.record ||
      body.new ||
      body;


    console.log(
      "ORDER:",
      order
    );


    if (!order.id) {

      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Data order tidak ditemukan"
        }),
        {
          status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type":
            "application/json"
        }
        }
      );
    }


    // ==============================
    // AMBIL SUBSCRIPTION
    // ==============================

    const eventType =
      body.event || "new_order";

    let subscriptionUrl =
      SUPABASE_URL +
      "/rest/v1/push_subscriptions?select=*";

    if (
      eventType === "status_changed" ||
      eventType === "completed"
    ) {

      const orderCode =
        order.order_code;

      if (!orderCode) {

        return new Response(
          JSON.stringify({
            success: false,
            error: "order_code tidak ditemukan"
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          }
        );
      }

      subscriptionUrl =
        SUPABASE_URL +
        "/rest/v1/push_subscriptions" +
        "?select=*" +
        "&order_code=eq." +
        encodeURIComponent(orderCode);
    }

    const response =
      await fetch(
        subscriptionUrl,
        {
          headers: {
            apikey:
              SUPABASE_SERVICE_ROLE_KEY,

            Authorization:
              "Bearer " +
              SUPABASE_SERVICE_ROLE_KEY
          }
        }
      );

    if (!response.ok) {

      const text =
        await response.text();

      throw new Error(
        "Gagal mengambil subscription: " +
        text
      );
    }

    const subscriptions =
      await response.json();

    console.log(
      "EVENT:",
      eventType
    );

    console.log(
      "ORDER CODE:",
      order.order_code
    );

    console.log(
      "JUMLAH SUBSCRIPTION:",
      subscriptions.length
    );
    // ==============================
    // ISI NOTIFIKASI
    // ==============================

    const nama =
      order.customer_name ||
      "Customer";


    const total =
      Number(
        order.total || 0
      ).toLocaleString(
        "id-ID"
      );


    const kode =
      order.order_code ||
      order.id;

let notification;

if (eventType === "status_changed") {

  let title = "";
  let message = "";

  if (order.status === "Diproses") {

    title = "🔄 Pesanan Diproses";

    message =
      nama +
      "\nPesanan #" +
      kode +
      " sedang diproses oleh toko.";

  } else if (order.status === "Dikirim") {

    title = "🛵 Pesanan Dikirim";

    message =
      nama +
      "\nPesanan #" +
      kode +
      " sedang diantar.";

  } else if (order.status === "Selesai") {

    title = "✅ Pesanan Selesai";

    message =
      nama +
      "\nPesanan #" +
      kode +
      " telah selesai.";

  } else {

    title = "🔔 Status Pesanan";

    message =
      nama +
      "\nPesanan #" +
      kode +
      "\nStatus: " +
      order.status;
  }

  notification =
    JSON.stringify({

      title: title,

      body: message,

      data: {

        url:
          "https://allanakuba0804-hash.github.io/lapak-suka-suka/status.html"
      }
    });


} else if (eventType === "completed") {

  notification =
    JSON.stringify({

      title:
        "✅ Pesanan Selesai!",

      body:
        nama +
        "\nPesanan #" +
        kode +
        " telah dikonfirmasi selesai oleh customer.",

      data: {

        url:
          "https://allanakuba0804-hash.github.io/lapak-suka-suka/admin.html"
      }
    });


} else {

  notification =
    JSON.stringify({

      title:
        "🔔 Pesanan Baru!",

      body:
        nama +
        "\nPesanan #" +
        kode +
        "\nTotal: Rp " +
        total,

      data: {

        url:
          "https://allanakuba0804-hash.github.io/lapak-suka-suka/admin.html"
      }
    });

}
    // ==============================
    // KIRIM PUSH
    // ==============================

    let berhasil = 0;

    let gagal = 0;


    for (
      const subscription
      of subscriptions
    ) {

      try {

        await webpush.sendNotification(

          {
            endpoint:
              subscription.endpoint,

            keys: {

              p256dh:
                subscription.p256dh,

              auth:
                subscription.auth
            }
          },

          notification
        );


        berhasil++;


        console.log(
          "NOTIF TERKIRIM"
        );


      } catch (error) {

        gagal++;


        console.error(
          "GAGAL KIRIM:",
          error
        );
      }
    }


    // ==============================
    // SELESAI
    // ==============================

    return new Response(

      JSON.stringify({

        success: true,

        order_id:
          order.id,

        subscriptions:
          subscriptions.length,

        berhasil,

        gagal

      }),

      {
        status: 200,

        headers: {
          ...corsHeaders,
          "Content-Type":
            "application/json"
        }
      }
    );


  } catch (error) {

    console.error(
      "ERROR FUNCTION:",
      error
    );


    return new Response(

      JSON.stringify({

        success: false,

        error:
          String(error)

      }),

      {
        status: 500,

      headers: {
        ...corsHeaders,
        "Content-Type":
          "application/json"
      }
      }
    );
  }

});