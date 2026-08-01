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

    const response =
      await fetch(
        SUPABASE_URL +
        "/rest/v1/push_subscriptions?select=*",
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


const eventType =
  body.event || "new_order";

let notification;

if (eventType === "completed") {

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